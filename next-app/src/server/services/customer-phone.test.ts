import { describe, expect, it, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { customers } from "@/server/db/schema";
import { resetBusinessData } from "@/test/helpers";
import {
  createCustomer,
  getCustomerDetail,
  listCustomers,
  updateCustomer,
} from "@/server/services/customer.service";

/**
 * A phone number is no longer required to put someone in the registry.
 *
 * The thing worth pinning down is not that the column is nullable — it is that
 * there is exactly ONE representation of "no phone". While the column was NOT
 * NULL, "no phone" had to be a blank string, and a blank string survives every
 * `if (customer.phone)` guard in the UI: it renders as an empty line where the
 * number should be, and builds a `tel:` link that opens the dialler with
 * nothing in it. Null and "" must not both be reachable.
 */
describe("optional customer phone", () => {
  beforeAll(async () => {
    await resetBusinessData();
  });

  it("creates a customer with no phone at all", async () => {
    const row = await createCustomer({ name: "Walk-in cash customer" });
    expect(row.phone).toBeNull();
  });

  it("stores a blank phone as null, not as an empty string", async () => {
    // Three ways the UI can hand over "nothing", all landing on the same value.
    for (const given of ["", "   ", null]) {
      const row = await createCustomer({ name: `Blank ${JSON.stringify(given)}`, phone: given });
      expect(row.phone).toBeNull();
    }
  });

  it("clears a phone back to null on update rather than blanking it", async () => {
    const row = await createCustomer({ name: "Had a number", phone: "98765 43210" });
    expect(row.phone).toBe("98765 43210");

    const cleared = await updateCustomer(row.id, { phone: "" });
    expect(cleared.phone).toBeNull();

    // And an update that does not mention the phone leaves it alone.
    const renamed = await updateCustomer(cleared.id, { name: "Still no number" });
    expect(renamed.phone).toBeNull();
  });

  it("trims a phone rather than storing the operator's stray spaces", async () => {
    const row = await createCustomer({ name: "Padded", phone: "  98765 43210  " });
    expect(row.phone).toBe("98765 43210");
  });

  it("lists and opens a phone-less customer without failing", async () => {
    const row = await createCustomer({ name: "Zarina Begum" });

    // The list query ORs a phone LIKE against a name LIKE. A NULL phone makes
    // that side of the OR NULL, not false — which is fine, but only because
    // the name side can still match. This is the search that would break.
    const byName = await listCustomers({ q: "zarina" });
    expect(byName.map((c: { id: string }) => c.id)).toContain(row.id);

    const detail = await getCustomerDetail(row.id);
    expect(detail.customer.phone).toBeNull();
  });

  it("never leaves a blank-string phone reachable in the table", async () => {
    // The invariant the whole change rests on, asserted against the storage
    // itself rather than through a service that might be normalising on read.
    const blanks = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.phone, ""));
    expect(blanks).toEqual([]);
  });
});
