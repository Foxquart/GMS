import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { getInvoice } from "./invoice.service";

/* ─── Page geometry ──────────────────────────────────────────────────
 *
 * Every block is positioned absolutely against these constants rather than
 * against PDFKit's text cursor. The cursor is shared state: one right-aligned
 * `text()` in the totals column leaves `doc.x` there, and everything written
 * afterwards silently inherits that narrow column — which is how the totals
 * block used to drag "Payment Status", "Payments" and the terms into a 52pt
 * gutter and wrap them one word per line.
 */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const LEFT = MARGIN;
const RIGHT = PAGE.width - MARGIN;
const CONTENT_WIDTH = RIGHT - LEFT;
/** Body content stops here; the footer rule and page number own the rest. */
const BODY_BOTTOM = PAGE.height - 72;

/** Items table columns, right edges flush with the content edge. */
const COL = {
  desc: { x: LEFT, w: 236 },
  qty: { x: 292, w: 54 },
  rate: { x: 354, w: 88 },
  amount: { x: 450, w: RIGHT - 450 },
};

const INK = "#0f172a";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const RULE = "#e2e8f0";
const BAND = "#f8fafc";
const PAID = "#047857";
const DUE = "#b91c1c";

const STATUS_STYLE: Record<string, { fg: string; bg: string; label: string }> = {
  PAID: { fg: PAID, bg: "#ecfdf5", label: "PAID" },
  PARTIALLY_PAID: { fg: "#b45309", bg: "#fffbeb", label: "PARTIALLY PAID" },
  ISSUED: { fg: "#334155", bg: "#f1f5f9", label: "UNPAID" },
  CANCELLED: { fg: DUE, bg: "#fef2f2", label: "CANCELLED" },
};

const ITEM_GROUPS: Record<string, string> = {
  part: "Parts & materials",
  labour: "Labour & services",
};

/* ─── Fonts ──────────────────────────────────────────────────────────
 *
 * PDFKit's built-in Helvetica is WinAnsi-encoded and has no U+20B9, so every
 * amount on the old invoice printed as "¹4,250.00" — a garbled superscript
 * one, not a rupee sign. Inter is bundled (OFL, see assets/fonts/OFL.txt) so
 * the symbol renders on any machine that runs this server.
 *
 * If the files are ever missing from a deployment the document still builds:
 * it falls back to Helvetica and writes "Rs." instead of a symbol the font
 * cannot draw. A readable invoice beats a broken one.
 */
const FONT_DIR = path.join(process.cwd(), "src/server/assets/fonts");

type Typeface = { regular: string; medium: string; bold: string; rupee: string };

const HELVETICA: Typeface = {
  regular: "Helvetica",
  medium: "Helvetica",
  bold: "Helvetica-Bold",
  rupee: "Rs. ",
};

function loadFonts(doc: PDFKit.PDFDocument): Typeface {
  const faces = {
    regular: "Inter-Regular.ttf",
    medium: "Inter-Medium.ttf",
    bold: "Inter-Bold.ttf",
  };
  const files = Object.entries(faces).map(([n, f]) => [n, path.join(FONT_DIR, f)] as const);
  // Checked here rather than caught later: `registerFont` only records the
  // path, so a missing file would not surface until the first `font()` call,
  // half a document in and too late to fall back cleanly.
  if (!files.every(([, file]) => fs.existsSync(file))) return HELVETICA;
  for (const [name, file] of files) doc.registerFont(name, file);
  return { regular: "regular", medium: "medium", bold: "bold", rupee: "₹" };
}

/* ─── Formatting ─────────────────────────────────────────────────────
 *
 * Fixed two decimals, unlike the on-screen `currency()` in lib/format: a
 * document somebody files wants every figure in the column to align on the
 * decimal point, which is the opposite trade to a dashboard tile.
 */
const money = (type: Typeface, n: string | number | null | undefined) => {
  const v = Number(n ?? 0);
  const abs = Math.abs(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${v < 0 ? "-" : ""}${type.rupee}${abs}`;
};

/** Quantities are stored as numeric(10,2); "1.00 pcs" of a silencer is noise. */
const qty = (n: string | number) =>
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** 0–999 in words. */
function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }
  if (n > 0) parts.push(ONES[n]);
  return parts.join(" ");
}

/**
 * The total spelled out, in the Indian system (crore/lakh) — the line a
 * customer or an auditor checks the figures against, and the reason a
 * tampered digit is easy to spot.
 */
export function amountInWords(value: number, symbolName = "Rupees"): string {
  const rounded = Math.round(Math.abs(Number(value) || 0) * 100);
  const whole = Math.floor(rounded / 100);
  const paise = rounded % 100;

  const groups: Array<[number, string]> = [
    [Math.floor(whole / 10000000), "Crore"],
    [Math.floor(whole / 100000) % 100, "Lakh"],
    [Math.floor(whole / 1000) % 100, "Thousand"],
    [whole % 1000, ""],
  ];
  const spoken = groups
    .filter(([n]) => n > 0)
    .map(([n, unit]) => `${underThousand(n)}${unit ? ` ${unit}` : ""}`)
    .join(" ");

  const head = `${symbolName} ${spoken || "Zero"}`;
  const tail = paise > 0 ? ` and ${underThousand(paise)} Paise` : "";
  return `${head}${tail} Only`;
}

/* ─── Drawing helpers ────────────────────────────────────────────────
 * Each takes an explicit y and returns the y it ended at, so the layout below
 * reads as a single top-to-bottom flow with no hidden cursor.
 */

function rule(doc: PDFKit.PDFDocument, y: number, color = RULE, x1 = LEFT, x2 = RIGHT) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(0.75).strokeColor(color).stroke().restore();
}

/** A filled capsule — the status stamp in the header, and nothing else. */
function badge(doc: PDFKit.PDFDocument, type: Typeface, text: string, style: { fg: string; bg: string }, right: number, y: number) {
  doc.font(type.bold).fontSize(8);
  const w = doc.widthOfString(text, { characterSpacing: 0.6 }) + 18;
  const h = 17;
  doc.save().roundedRect(right - w, y, w, h, 8.5).fill(style.bg).restore();
  doc
    .fillColor(style.fg)
    .text(text, right - w, y + 5, { width: w, align: "center", characterSpacing: 0.6 });
  return y + h;
}

export type InvoiceData = Awaited<ReturnType<typeof getInvoice>>;

export async function buildInvoicePdf(invoiceId: string): Promise<Buffer> {
  return renderInvoicePdf(await getInvoice(invoiceId));
}

/**
 * The document itself, taking the data rather than an id so the layout can be
 * rendered and inspected without a database.
 */
export async function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const { invoice, customer, vehicle, job, items, payments: paymentList, business } = data;

  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const type = loadFonts(doc);
  const amt = (n: string | number | null | undefined) => money(type, n);

  const name = business?.businessName ?? "My Garage";
  const status = STATUS_STYLE[invoice.status] ?? STATUS_STYLE.ISSUED;

  /* ─── Header ───────────────────────────────────────────────────── */
  let y = MARGIN;
  const metaX = 330;
  const metaW = RIGHT - metaX;

  doc.font(type.bold).fontSize(19).fillColor(INK).text(name, LEFT, y, { width: 268 });
  let leftY = doc.y + 3;
  doc.font(type.regular).fontSize(9).fillColor(MUTED);
  if (business?.businessAddress) {
    doc.text(business.businessAddress, LEFT, leftY, { width: 250, lineGap: 1.5 });
    leftY = doc.y;
  }
  if (business?.businessPhone) {
    doc.text(business.businessPhone, LEFT, leftY, { width: 250 });
    leftY = doc.y;
  }

  doc.font(type.bold).fontSize(22).fillColor(INK)
    .text("INVOICE", metaX, y, { width: metaW, align: "right", characterSpacing: 1 });
  let metaY = doc.y + 6;
  const metaRow = (label: string, value: string) => {
    doc.font(type.regular).fontSize(9).fillColor(MUTED)
      .text(label, metaX, metaY, { width: metaW - 118, align: "right" });
    doc.font(type.medium).fontSize(9).fillColor(INK)
      .text(value, RIGHT - 116, metaY, { width: 116, align: "right" });
    metaY += 14;
  };
  metaRow("Invoice no.", invoice.invoiceNumber);
  metaRow("Date", shortDate(invoice.createdAt));
  if (job) metaRow("Job card", job.jobNumber);
  metaY = badge(doc, type, status.label, status, RIGHT, metaY + 2);

  y = Math.max(leftY, metaY) + 16;
  rule(doc, y);
  y += 18;

  /* ─── Bill to / vehicle ────────────────────────────────────────────
   * Two columns. The vehicle used to be a fourth line inside the customer
   * block, which read as part of the address.
   */
  const colW = (CONTENT_WIDTH - 24) / 2;
  const rightColX = LEFT + colW + 24;
  const heading = (text: string, x: number) =>
    doc.font(type.bold).fontSize(7.5).fillColor(FAINT)
      .text(text.toUpperCase(), x, y, { width: colW, characterSpacing: 1 });

  heading("Billed to", LEFT);
  if (vehicle) heading("Vehicle", rightColX);
  const bodyY = y + 14;

  doc.font(type.medium).fontSize(11).fillColor(INK).text(customer?.name ?? "—", LEFT, bodyY, { width: colW });
  let custY = doc.y + 2;
  doc.font(type.regular).fontSize(9.5).fillColor(MUTED);
  if (customer?.phone) {
    doc.text(customer.phone, LEFT, custY, { width: colW });
    custY = doc.y;
  }
  if (customer?.address) {
    doc.text(customer.address, LEFT, custY, { width: colW, lineGap: 1.5 });
    custY = doc.y;
  }

  let vehY = bodyY;
  if (vehicle) {
    const title = vehicle.vehicleName || vehicle.vehicleType || "Vehicle";
    doc.font(type.medium).fontSize(11).fillColor(INK).text(title, rightColX, vehY, { width: colW });
    vehY = doc.y + 2;
    doc.font(type.regular).fontSize(9.5).fillColor(MUTED);
    if (vehicle.registrationNumber) {
      doc.text(vehicle.registrationNumber, rightColX, vehY, { width: colW, characterSpacing: 0.5 });
      vehY = doc.y;
    }
    if (vehicle.vehicleName && vehicle.vehicleType) {
      doc.text(vehicle.vehicleType, rightColX, vehY, { width: colW });
      vehY = doc.y;
    }
  }

  y = Math.max(custY, vehY) + 22;

  /* ─── Items table ──────────────────────────────────────────────── */
  const tableHeader = (top: number) => {
    doc.save().rect(LEFT, top, CONTENT_WIDTH, 22).fill(BAND).restore();
    doc.font(type.bold).fontSize(7.5).fillColor(MUTED);
    const ty = top + 7.5;
    doc.text("DESCRIPTION", COL.desc.x + 8, ty, { width: COL.desc.w, characterSpacing: 0.8 });
    doc.text("QTY", COL.qty.x, ty, { width: COL.qty.w, align: "right", characterSpacing: 0.8 });
    doc.text("RATE", COL.rate.x, ty, { width: COL.rate.w, align: "right", characterSpacing: 0.8 });
    doc.text("AMOUNT", COL.amount.x, ty, { width: COL.amount.w - 8, align: "right", characterSpacing: 0.8 });
    return top + 22;
  };

  /** Starts a new page and repeats the table header, so page 2 has columns. */
  const ensure = (needed: number, repeatHeader: boolean) => {
    if (y + needed <= BODY_BOTTOM) return;
    doc.addPage();
    y = MARGIN;
    if (repeatHeader) y = tableHeader(y) + 4;
  };

  y = tableHeader(y) + 4;

  const groups = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const key = item.itemType ?? "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const showGroupHeadings = groups.size > 1;

  doc.font(type.regular).fontSize(9.5);
  for (const [key, groupItems] of groups) {
    if (showGroupHeadings) {
      ensure(20, true);
      doc.font(type.bold).fontSize(7.5).fillColor(FAINT).text(
        (ITEM_GROUPS[key] ?? key).toUpperCase(),
        COL.desc.x + 8,
        y + 6,
        { width: COL.desc.w, characterSpacing: 0.8 },
      );
      y += 19;
    }

    for (const item of groupItems) {
      doc.font(type.regular).fontSize(9.5);
      // Measured, not assumed: a long part name wraps to two or three lines
      // and the row has to grow with it or the next row lands on top of it.
      const descH = doc.heightOfString(item.description, { width: COL.desc.w - 8, lineGap: 1.5 });
      const rowH = Math.max(descH, 12) + 13;
      ensure(rowH, true);

      const textY = y + 6.5;
      doc.fillColor(INK).text(item.description, COL.desc.x + 8, textY, { width: COL.desc.w - 8, lineGap: 1.5 });
      doc.fillColor(MUTED).text(qty(item.quantity), COL.qty.x, textY, { width: COL.qty.w, align: "right" });
      doc.text(amt(item.unitPrice), COL.rate.x, textY, { width: COL.rate.w, align: "right" });
      doc.font(type.medium).fillColor(INK)
        .text(amt(item.totalPrice), COL.amount.x, textY, { width: COL.amount.w - 8, align: "right" });

      y += rowH;
      rule(doc, y, "#f1f5f9");
    }
  }

  if (!items?.length) {
    doc.font(type.regular).fontSize(9.5).fillColor(FAINT)
      .text("No line items on this invoice.", COL.desc.x + 8, y + 8, { width: CONTENT_WIDTH });
    y += 30;
  }

  /* ─── Totals ───────────────────────────────────────────────────── */
  const totalsW = 232;
  const totalsX = RIGHT - totalsW;
  const dueAmount = Number(invoice.dueAmount);
  const hasDiscount = Number(invoice.discount) > 0;
  // Height of the whole block, so it is never split across a page break.
  ensure(64 + (hasDiscount ? 16 : 0) + 46, false);
  y += 10;
  const totalsTop = y;

  const totalsRow = (
    label: string,
    value: string,
    opts: { strong?: boolean; color?: string } = {},
  ) => {
    const size = opts.strong ? 12 : 9.5;
    doc.font(opts.strong ? type.bold : type.regular).fontSize(size).fillColor(opts.strong ? INK : MUTED)
      .text(label, totalsX, y, { width: 110 });
    doc.font(opts.strong ? type.bold : type.medium).fontSize(size).fillColor(opts.color ?? INK)
      .text(value, totalsX + 110, y, { width: totalsW - 110, align: "right" });
    y += opts.strong ? 20 : 16;
  };

  totalsRow("Subtotal", amt(invoice.subtotal));
  if (hasDiscount) totalsRow("Discount", `- ${amt(invoice.discount)}`);
  rule(doc, y + 2, RULE, totalsX, RIGHT);
  y += 9;
  totalsRow("Total", amt(invoice.total), { strong: true });
  totalsRow("Paid", amt(invoice.paidAmount), { color: PAID });

  // The balance is the number the customer is looking for, so when there is
  // one it gets a band of its own rather than being the fifth grey row.
  if (dueAmount > 0) {
    doc.save().rect(totalsX, y - 4, totalsW, 24).fill("#fef2f2").restore();
    doc.font(type.bold).fontSize(10).fillColor(DUE).text("Balance due", totalsX + 10, y + 3, { width: 110 });
    // Right edge flush with the column, not inset by the band's padding: the
    // figure has to line up with the Total above it.
    doc.font(type.bold).fontSize(10).fillColor(DUE)
      .text(amt(invoice.dueAmount), totalsX + 110, y + 3, { width: totalsW - 110, align: "right" });
    y += 30;
  } else {
    totalsRow("Balance due", amt(invoice.dueAmount));
  }

  // Amount in words sits to the LEFT of the totals column, anchored to the top
  // of that block, so it fills space the old layout wasted and costs no extra
  // height unless it is the taller of the two.
  doc.font(type.bold).fontSize(7.5).fillColor(FAINT)
    .text("AMOUNT IN WORDS", LEFT, totalsTop + 2, { width: 250, characterSpacing: 1 });
  doc.font(type.medium).fontSize(9.5).fillColor(INK)
    .text(amountInWords(Number(invoice.total)), LEFT, doc.y + 4, { width: 250, lineGap: 2 });
  y = Math.max(y, doc.y) + 20;

  /* ─── Payments ─────────────────────────────────────────────────── */
  if (paymentList?.length) {
    ensure(34 + paymentList.length * 16, false);
    rule(doc, y);
    y += 12;
    doc.font(type.bold).fontSize(7.5).fillColor(FAINT)
      .text("PAYMENTS RECEIVED", LEFT, y, { width: 250, characterSpacing: 1 });
    y += 15;
    for (const p of paymentList) {
      ensure(16, false);
      doc.font(type.regular).fontSize(9.5).fillColor(MUTED);
      doc.text(shortDate(p.createdAt), LEFT, y, { width: 100 });
      doc.text(p.paymentMethod.replace(/_/g, " "), LEFT + 108, y, { width: 160 });
      doc.font(type.medium).fillColor(INK)
        .text(amt(p.amount), COL.amount.x, y, { width: COL.amount.w - 8, align: "right" });
      y += 16;
    }
    y += 6;
  }

  /* ─── Notes and terms ──────────────────────────────────────────── */
  const note = (label: string, body: string) => {
    const h = doc.font(type.regular).fontSize(8.5).heightOfString(body, { width: CONTENT_WIDTH, lineGap: 1.5 });
    ensure(h + 26, false);
    doc.font(type.bold).fontSize(7.5).fillColor(FAINT)
      .text(label, LEFT, y, { width: CONTENT_WIDTH, characterSpacing: 1 });
    doc.font(type.regular).fontSize(8.5).fillColor(MUTED)
      .text(body, LEFT, doc.y + 3, { width: CONTENT_WIDTH, lineGap: 1.5 });
    y = doc.y + 12;
  };

  if (invoice.notes) note("NOTES", invoice.notes);
  if (business?.invoiceTerms) note("TERMS", business.invoiceTerms);

  /* ─── Footer, stamped on every page once the count is known ────── */
  const range = doc.bufferedPageRange();
  const fy = PAGE.height - 54;
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // The footer deliberately sits below the bottom margin. PDFKit reacts to
    // text past that boundary by starting a *new* page — which is how a
    // one-page invoice came out as three, each carrying one more footer.
    doc.page.margins.bottom = 0;
    rule(doc, fy, RULE);
    doc.font(type.regular).fontSize(8).fillColor(FAINT);
    doc.text(`${invoice.invoiceNumber} · ${name}`, LEFT, fy + 9, {
      width: CONTENT_WIDTH - 100,
      lineBreak: false,
    });
    doc.text(`Page ${i + 1} of ${range.count}`, RIGHT - 100, fy + 9, {
      width: 100,
      align: "right",
      lineBreak: false,
    });
  }

  doc.end();
  return done;
}
