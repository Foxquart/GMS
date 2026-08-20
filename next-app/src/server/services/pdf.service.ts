import PDFDocument from "pdfkit";
import { getInvoice } from "./invoice.service";

const currency = (n: string | number) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function buildInvoicePdf(invoiceId: string): Promise<Buffer> {
  const data = await getInvoice(invoiceId);
  const { invoice, customer, vehicle, job, items, payments: paymentList, business } = data;

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const name = business?.businessName ?? "My Garage";
  const addr = business?.businessAddress ?? "";
  const phone = business?.businessPhone ?? "";

  // Header
  doc.fontSize(20).fillColor("#111827").text(name, { continued: false });
  doc.fontSize(10).fillColor("#6b7280");
  if (addr) doc.text(addr);
  if (phone) doc.text(phone);
  doc.moveDown(0.5);

  // Invoice meta
  doc.fontSize(12).fillColor("#111827").text("INVOICE", { align: "right" });
  doc.fontSize(10).fillColor("#6b7280");
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, { align: "right" });
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`, { align: "right" });
  if (job) doc.text(`Job: ${job.jobNumber}`, { align: "right" });
  doc.moveDown(0.75);

  // Bill to
  doc.fontSize(11).fillColor("#111827").text("Bill To");
  doc.fontSize(10).fillColor("#374151");
  doc.text(customer?.name ?? "");
  if (customer?.phone) doc.text(customer.phone);
  if (customer?.address) doc.text(customer.address);
  if (vehicle) {
    doc.text(
      `Vehicle: ${vehicle.vehicleName || vehicle.vehicleType || ""}${
        vehicle.registrationNumber ? ` (${vehicle.registrationNumber})` : ""
      }`,
    );
  }
  doc.moveDown(0.75);

  // Items table
  const startY = doc.y;
  const colX = {
    desc: 48,
    qty: 300,
    price: 400,
    total: 490,
  };
  doc.fontSize(10).fillColor("#6b7280");
  doc.text("Description", colX.desc, startY);
  doc.text("Qty", colX.qty, startY, { width: 70, align: "right" });
  doc.text("Rate", colX.price, startY, { width: 70, align: "right" });
  doc.text("Amount", colX.total, startY, { width: 52, align: "right" });
  doc.moveTo(48, startY + 14).lineTo(547, startY + 14).strokeColor("#e5e7eb").stroke();
  doc.moveDown(0.5);

  let y = doc.y;
  doc.fontSize(10).fillColor("#111827");
  for (const item of items ?? []) {
    if (y > 700) {
      doc.addPage();
      y = doc.y;
    }
    doc.text(item.description, colX.desc, y, { width: 240 });
    doc.text(item.quantity, colX.qty, y, { width: 70, align: "right" });
    doc.text(currency(item.unitPrice), colX.price, y, { width: 70, align: "right" });
    doc.text(currency(item.totalPrice), colX.total, y, { width: 52, align: "right" });
    y += 18;
  }

  // Totals
  doc.y = Math.max(y + 8, doc.y + 8);
  doc.moveDown();
  const totalsY = doc.y;
  doc.fontSize(10);
  doc.fillColor("#374151").text("Subtotal", colX.price - 30, totalsY, { width: 170, align: "left" });
  doc.fillColor("#111827").text(currency(invoice.subtotal), colX.total, totalsY, { width: 52, align: "right" });
  let tY = totalsY + 16;
  if (Number(invoice.discount) > 0) {
    doc.fillColor("#374151").text("Discount", colX.price - 30, tY, { width: 170, align: "left" });
    doc.fillColor("#111827").text(`- ${currency(invoice.discount)}`, colX.total, tY, { width: 52, align: "right" });
    tY += 16;
  }
  doc.fontSize(12).fillColor("#111827").text("Total", colX.price - 30, tY, { width: 170, align: "left" });
  doc.text(currency(invoice.total), colX.total, tY, { width: 52, align: "right" });
  tY += 18;
  doc.fontSize(10).fillColor("#374151").text("Paid", colX.price - 30, tY, { width: 170, align: "left" });
  doc.fillColor("#059669").text(currency(invoice.paidAmount), colX.total, tY, { width: 52, align: "right" });
  tY += 16;
  doc.fillColor("#111827").text("Due", colX.price - 30, tY, { width: 170, align: "left" });
  doc.fillColor(Number(invoice.dueAmount) > 0 ? "#dc2626" : "#111827").text(
    currency(invoice.dueAmount),
    colX.total,
    tY,
    { width: 52, align: "right" },
  );

  // Status
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#6b7280").text(`Payment Status: ${invoice.status.replace("_", " ")}`);

  // Payments
  if (paymentList && paymentList.length) {
    doc.moveDown(0.75);
    doc.fontSize(11).fillColor("#111827").text("Payments");
    doc.fontSize(10).fillColor("#374151");
    for (const p of paymentList) {
      doc.text(
        `${new Date(p.createdAt).toLocaleDateString("en-IN")} — ${p.paymentMethod} — ${currency(p.amount)}`,
      );
    }
  }

  // Terms
  if (business?.invoiceTerms) {
    doc.moveDown(1);
    doc.fontSize(9).fillColor("#6b7280").text(business.invoiceTerms);
  }

  doc.end();
  return done;
}