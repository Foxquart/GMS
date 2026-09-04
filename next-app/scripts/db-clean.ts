/**
 * Wipes every trace of testing and demo data, leaving a database a client can
 * start their real workshop on.
 *
 *   npx tsx scripts/db-clean.ts --confirm
 *   npx tsx scripts/db-clean.ts                  # dry run: counts, deletes nothing
 *   npx tsx scripts/db-clean.ts --confirm --keep-dev-logins
 *   npx tsx scripts/db-clean.ts --confirm --reset-settings
 *
 * This is NOT `seed-demo.ts --reset`. That clears business data and then
 * immediately seeds a fresh workshop's worth of fake customers, jobs and
 * invoices — the opposite of a handover.
 *
 * What survives, and why:
 *
 *   inventory_locations  SHOP and WAREHOUSE are constants this codebase
 *                        hardcodes; every stock write resolves them by code.
 *                        Deleting them does not empty the app, it breaks it.
 *   settings             The workshop's own name, phone, address and invoice
 *                        prefix. If the client has already configured these,
 *                        wiping them is data loss. `--reset-settings` restores
 *                        the placeholder row instead.
 *   users                Real accounts stay. The two seeded development logins
 *                        do not — see below.
 *   categories           Deleted, then the seven defaults are re-created, so
 *                        the client opens on the same starting point a fresh
 *                        install gives rather than an empty Inventory page.
 *
 * Job and invoice numbers are derived from the highest existing row
 * (`nextJobNumber`, `nextInvoiceNumber`), so emptying those tables restarts
 * the client's sequences at 0001 — which is what a handover wants.
 */
import { inArray, sql } from "drizzle-orm";
import { db, describeDbTarget } from "../src/server/db/connection";
import * as schema from "../src/server/db/schema";
import { seedDefaultCategories } from "../src/server/services/category.service";

const CONFIRM = process.argv.includes("--confirm");
const KEEP_DEV_LOGINS = process.argv.includes("--keep-dev-logins");
const RESET_SETTINGS = process.argv.includes("--reset-settings");

/**
 * Child tables first. These are ordered by foreign key, not alphabetically:
 * `parts` cannot go before `job_parts` references it, and `sub_categories`
 * cannot go before `parts.sub_category_id` is gone.
 */
const BUSINESS_TABLES = [
  "audit_logs",
  "system_alerts",
  "system_health_checks",
  "stock_movements",
  "stock_transfer_items",
  "stock_transfers",
  "invoice_items",
  "payments",
  "invoices",
  "job_labour",
  "job_parts",
  "jobs",
  "vehicles",
  "customers",
  "inventory_balances",
  "parts",
  "category_sub_categories",
  "sub_categories",
  "categories",
  "suppliers",
] as const;

/**
 * The logins `ensureDbSetup` creates, with passwords written in the repository.
 *
 * These are the single most important thing on this list. They are fine on a
 * developer's machine and indefensible on a client's: the credentials are in
 * version control, so anyone who can read the source can sign in as a
 * superadmin. They go unless explicitly kept.
 */
const DEV_LOGINS = ["admin@garage.com", "superadmin@garage.com"];

async function countRows(table: string): Promise<number> {
  const res: any = await db.execute(sql.raw(`select count(*)::int as c from "${table}"`));
  return Number((res.rows ?? res)[0]?.c ?? 0);
}

async function main() {
  console.log(CONFIRM ? "Cleaning for handover" : "DRY RUN — nothing will be deleted");
  // Named before anything is counted or deleted. This script is the one where
  // targeting the wrong database is unrecoverable.
  console.log(`target: ${describeDbTarget()}\n`);

  // ── What is here ────────────────────────────────────────────────────
  let total = 0;
  const present: { table: string; count: number }[] = [];
  for (const table of BUSINESS_TABLES) {
    const count = await countRows(table);
    total += count;
    if (count > 0) present.push({ table, count });
  }

  if (present.length === 0) {
    console.log("  no business data found");
  } else {
    for (const { table, count } of present) {
      console.log(`  ${table.padEnd(26)} ${String(count).padStart(7)}`);
    }
    console.log(`  ${"".padEnd(26)} ${"".padStart(7, "-")}`);
    console.log(`  ${"rows to delete".padEnd(26)} ${String(total).padStart(7)}`);
  }

  // ── Accounts ────────────────────────────────────────────────────────
  const users = await db
    .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
    .from(schema.users);

  const doomed = KEEP_DEV_LOGINS
    ? []
    : users.filter((u: any) => DEV_LOGINS.includes(u.email.toLowerCase()));
  const surviving = users.filter((u: any) => !doomed.some((d: any) => d.id === u.id));

  console.log("\naccounts:");
  for (const u of users) {
    const going = doomed.some((d: any) => d.id === u.id);
    console.log(`  ${going ? "DELETE" : "keep  "}  ${u.email.padEnd(28)} ${u.role}`);
  }

  // Handing over a database nobody can sign in to is worse than handing over
  // one with a known password still on it, so this refuses rather than
  // choosing for you.
  if (surviving.length === 0) {
    console.error(
      "\nRefusing: deleting the development logins would leave no account at all.\n" +
        "Create the client's login first:\n" +
        '  npx tsx scripts/create-user.ts owner@workshop.com "<password>" SUPERADMIN\n' +
        "or re-run with --keep-dev-logins if you really mean to ship those credentials.",
    );
    process.exit(1);
  }

  if (!CONFIRM) {
    console.log("\nRe-run with --confirm to apply. Nothing was changed.");
    return;
  }

  // ── Delete ──────────────────────────────────────────────────────────
  for (const table of BUSINESS_TABLES) {
    await db.execute(sql.raw(`delete from "${table}"`));
  }

  if (doomed.length) {
    await db.delete(schema.users).where(
      inArray(
        schema.users.id,
        doomed.map((d: any) => d.id),
      ),
    );
  }

  if (RESET_SETTINGS) {
    await db.delete(schema.settings);
    await db.insert(schema.settings).values({
      businessName: "Your Workshop",
      businessPhone: "",
      businessAddress: "",
      invoicePrefix: "INV",
      invoiceTerms: "Payment due upon invoice generation. Thank you for your business!",
    });
  }

  // The seven defaults a fresh install ships with, so Inventory is not an
  // empty page on the client's first morning. Only runs when categories are
  // empty, which they now are.
  const seeded = await seedDefaultCategories(db);

  // ── Prove it ────────────────────────────────────────────────────────
  // `categories` is excluded because it was just deliberately re-seeded with
  // the defaults; counting it here reported the seven as survivors and failed
  // a clean run.
  let left = 0;
  for (const table of BUSINESS_TABLES) {
    if (table === "categories") continue;
    left += await countRows(table);
  }
  const categoryCount = await countRows("categories");

  const locations = await db.select().from(schema.inventoryLocations);
  const settings = await db.select().from(schema.settings).limit(1);
  const remainingUsers = await db
    .select({ email: schema.users.email, role: schema.users.role })
    .from(schema.users);

  console.log("\ndone");
  console.log(`  business rows remaining   ${left}`);
  console.log(`  default categories        ${categoryCount} (seeded ${seeded})`);
  console.log(`  stock locations kept      ${locations.map((l: any) => l.code).join(", ")}`);
  console.log(`  settings row              ${settings.length ? "present" : "MISSING"}`);
  console.log(`  accounts                  ${remainingUsers.map((u: any) => u.email).join(", ")}`);

  if (left !== 0) {
    console.error("\nSome business rows survived — check the delete order above.");
    process.exit(1);
  }
  if (categoryCount === 0) {
    console.error("\nNo categories were re-seeded — the client would open on an empty Inventory.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
