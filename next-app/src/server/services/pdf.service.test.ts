import { describe, expect, it } from "vitest";
import { amountInWords, renderInvoicePdf, type InvoiceData } from "@/server/services/pdf.service";

/** `/Type /Page` appears once per page; `/Type /Pages` is the tree root. */
const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page[^s]/g) ?? []).length;

const makeData = (itemCount: number, overrides: Record<string, unknown> = {}): InvoiceData => {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: `item-${i}`,
    invoiceId: "inv",
    itemType: i % 2 === 0 ? "part" : "labour",
    description: `Line item ${i + 1} with a description long enough to wrap onto a second line`,
    quantity: "2",
    unitPrice: "150.00",
    totalPrice: "300.00",
  }));
  const subtotal = itemCount * 300;
  return {
    invoice: {
      id: "inv",
      invoiceNumber: "INV-2026-000007",
      jobId: "job",
      customerId: "cus",
      vehicleId: "veh",
      subtotal: String(subtotal),
      discount: "50",
      total: String(subtotal - 50),
      paidAmount: String(subtotal - 50),
      dueAmount: "0",
      status: "PAID",
      notes: null,
      createdAt: new Date("2026-08-29T00:00:00Z"),
      updatedAt: new Date("2026-08-29T00:00:00Z"),
      ...overrides,
    },
    customer: { id: "cus", name: "Joydeep", phone: "0987345632", address: "Agartala" },
    vehicle: { id: "veh", vehicleType: "BIKE", vehicleName: "Hero Splendor", registrationNumber: "TR01R4321" },
    job: { jobNumber: "JOB-2026-0008" },
    items,
    payments: [{ id: "p", amount: String(subtotal - 50), paymentMethod: "UPI", createdAt: new Date("2026-08-29T00:00:00Z") }],
    business: {
      businessName: "Radhe Mechanical Works",
      businessAddress: "Durjoynagar, Agartala, Tripura",
      businessPhone: "+91 98765 43210",
      invoiceTerms: "Payment due upon invoice generation.",
    },
  } as unknown as InvoiceData;
};

describe("amountInWords", () => {
  it("spells whole rupees", () => {
    expect(amountInWords(4250)).toBe("Rupees Four Thousand Two Hundred Fifty Only");
  });

  it("spells paise separately", () => {
    expect(amountInWords(1875.5)).toBe("Rupees One Thousand Eight Hundred Seventy Five and Fifty Paise Only");
  });

  it("groups in lakh and crore, not millions", () => {
    expect(amountInWords(100000)).toBe("Rupees One Lakh Only");
    expect(amountInWords(12345678)).toBe(
      "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only",
    );
  });

  it("handles zero", () => {
    expect(amountInWords(0)).toBe("Rupees Zero Only");
  });
});

describe("renderInvoicePdf", () => {
  it("renders a short invoice on a single page", async () => {
    const pdf = await renderInvoicePdf(makeData(3));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // The footer is drawn below the bottom margin. PDFKit answers text placed
    // past that boundary by starting a new page, so a regression here shows up
    // as a one-page invoice silently growing blank pages.
    expect(pageCount(pdf)).toBe(1);
  });

  it("flows a long item list onto further pages", async () => {
    const pdf = await renderInvoicePdf(makeData(60));
    expect(pageCount(pdf)).toBeGreaterThan(1);
  });

  it("renders with no line items", async () => {
    const pdf = await renderInvoicePdf(makeData(0));
    expect(pageCount(pdf)).toBe(1);
  });

  it("renders without a vehicle, job, payments or business settings", async () => {
    const data = makeData(2);
    const bare = { ...data, vehicle: null, job: undefined, payments: [], business: null } as unknown as InvoiceData;
    const pdf = await renderInvoicePdf(bare);
    expect(pageCount(pdf)).toBe(1);
  });
});
