/**
 * Money for the screen. Paise appear only when there *are* paise.
 *
 * A workshop bills in whole rupees almost every time, so a fixed two decimals
 * spends six glyphs per figure saying "and no paise" — width the stat tiles do
 * not have, and the direct cause of the dashboard's largest figure breaking
 * mid-group into "₹1,72," / "000.00". An amount that genuinely carries paise
 * still prints both digits, so nothing is ever silently rounded away.
 *
 * The invoice PDF keeps its own fixed-2dp formatter (pdf.service.ts) on
 * purpose: a document somebody files wants every column to align, which is the
 * opposite trade to a tile that has to fit.
 */
export const currency = (n: string | number | null | undefined) => {
  const v = Number(n ?? 0);
  // The magnitude is formatted on its own so the sign can be placed ahead of
  // the symbol. Left to `toLocaleString`, a negative renders as "₹-10,92,000",
  // which disagrees with the short form below and reads as a typo either way.
  const abs = Math.abs(v);
  const hasPaise = Math.round(abs * 100) % 100 !== 0;
  return (
    (v < 0 ? "-₹" : "₹") +
    abs.toLocaleString("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
};

/**
 * Rough rendered width of a figure, in em of the `.numeral` face: digits and
 * the rupee sign are near-monospace at ~0.6em (less the -0.03em tracking),
 * group separators about half that. Good to a few percent, which is all the
 * decision below needs.
 */
const figureEm = (s: string) =>
  [...s].reduce((w, c) => w + (c === "," || c === "." ? 0.27 : 0.57), 0);

/** Two decimals, minus the ones that are only padding: 2.00 → "2", 1.70 → "1.7". */
const trimZeros = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");

/**
 * Money sized to the tile it has to live in, always on ONE line.
 *
 * The exact figure wins while it fits; past that it switches to the Indian
 * short form rather than wrapping or being ellipsed. A rounded number read
 * across the counter beats an exact one broken mid-group — "₹1,72," over
 * "000.00" is worse than useless, because it reads as two numbers.
 *
 * `em` is the width available in em of the `.numeral` face at its *narrowest*
 * render: a 320px phone, where the numeral has hit its rem floor while the
 * tile is still shrinking. Size the budget there and every wider screen is
 * free.
 */
export const currencyFit = (
  n: string | number | null | undefined,
  { em = 3.8 }: { em?: number } = {},
) => {
  const full = currency(n);
  if (figureEm(full) <= em) return full;

  const v = Number(n ?? 0);
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  // Abbreviated, not spelled out. "₹10.92 lakh" measures wider than the
  // "₹10,92,000" it was meant to shorten, so it never fit the tile it exists
  // for; "L" and "Cr" are how these amounts get written in India anyway.
  //
  // The crore threshold sits just under a crore, not on it: ₹99,99,999 rounds
  // to "100L" at two decimals, and a unit that has to count past 99 is the
  // wrong unit.
  if (abs >= 9.995e6) return `${sign}₹${trimZeros(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trimZeros(abs / 1e5)}L`;
  // Below a lakh there is no shorter honest form, and none is needed: the
  // widest figure in that range, ₹99,999, already fits the smallest tile.
  return full;
};

/**
 * A share of a total, as a whole percent.
 *
 * Returns "—" rather than a number when there is no total to be a share of.
 * Without that guard every breakdown row on a quiet day prints "NaN%", which
 * is how a page stops being trusted.
 */
export const pct = (part: number | null | undefined, total: number | null | undefined) => {
  const t = Number(total ?? 0);
  if (!(t > 0)) return "—";
  return `${Math.round((Number(part ?? 0) / t) * 100)}%`;
};

/** The same share as a 0–100 number, for bar widths. Never NaN. */
export const share = (part: number | null | undefined, total: number | null | undefined) => {
  const t = Number(total ?? 0);
  if (!(t > 0)) return 0;
  return Math.min(100, Math.max(0, (Number(part ?? 0) / t) * 100));
};

/**
 * How long a job took, from opening to completion.
 *
 * Hours below a day, days above — "38h" is arithmetic the reader has to do,
 * "1.6 days" is the answer. `null` means no completed job in the period, and
 * prints as an absence rather than as zero: "0h" would be a claim that work is
 * instant.
 */
export const turnaround = (hours: number | null | undefined) => {
  if (hours == null || !Number.isFinite(hours)) return "—";
  const h = Math.max(0, hours);
  if (h < 24) return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)}h`;
  const days = h / 24;
  return `${days < 10 ? days.toFixed(1).replace(/\.0$/, "") : Math.round(days)} days`;
};

/**
 * The tail of a document number: "INV-2026-000007" → "#000007".
 *
 * Sequences restart every year and the year lives in the part being dropped,
 * so this is only safe on a row that shows a date beside the reference — the
 * dashboard lists, not a page where the number stands alone. Anything that is
 * not PREFIX-YEAR-SEQUENCE comes back untouched, which covers hand-entered and
 * legacy references as well as a re-configured invoice prefix.
 */
export const shortRef = (ref: string | null | undefined) => {
  if (!ref) return "";
  // The prefix is a setting and may itself contain hyphens ("GST-INV"), so it
  // is matched loosely; only the trailing -YEAR-SEQUENCE is required.
  const m = /^[A-Za-z][\w-]*-\d{4}-(\d+)$/.exec(ref);
  return m ? `#${m[1]}` : ref;
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * A date in a list of recent things: "01 Sep", but "01 Sep 2025" once the year
 * stops being obvious.
 *
 * The year is the least useful glyph group in "01 Sep 2026" when everything on
 * screen was raised this week — but dropping it unconditionally would make a
 * two-year-old invoice read as this year's, so it comes back the moment it
 * carries information.
 */
export const formatDateCompact = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const VEHICLE_TYPES = ["CAR", "BIKE", "SCOOTY", "AUTO", "OTHER"] as const;

export const vehicleTypeLabel = (t: string | null | undefined) => {
  if (!t) return "—";
  const map: Record<string, string> = {
    CAR: "Car",
    BIKE: "Bike",
    SCOOTY: "Scooty",
    AUTO: "Auto",
    OTHER: "Other",
  };
  return map[t] ?? t;
};

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export const paymentMethodLabel = (m: string | null | undefined) => {
  if (!m) return "—";
  const map: Record<string, string> = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
    OTHER: "Other",
  };
  return map[m] ?? m;
};

export const jobStatusLabel = (s: string | null | undefined) => {
  if (!s) return "—";
  const map: Record<string, string> = {
    OPEN: "Open",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[s] ?? s;
};

export const invoiceStatusLabel = (s: string | null | undefined) => {
  if (!s) return "—";
  const map: Record<string, string> = {
    ISSUED: "Issued",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };
  return map[s] ?? s;
};