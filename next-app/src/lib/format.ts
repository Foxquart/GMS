export const currency = (n: string | number | null | undefined) => {
  const v = Number(n ?? 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Rough rendered width of a figure, in em of the `.numeral` face: digits and
 * the rupee sign are near-monospace at ~0.6em (less the -0.03em tracking),
 * group separators about half that. Good to a few percent, which is all the
 * decision below needs.
 */
const figureEm = (s: string) =>
  [...s].reduce((w, c) => w + (c === "," || c === "." ? 0.27 : 0.57), 0);

/**
 * Money sized to the tile it has to live in. The exact amount wins while it
 * fits the lines available; past that the figure switches to the Indian short
 * form — "₹10.92 lakh" — rather than being ellipsed. A rounded number a
 * mechanic can read across the counter beats an exact one cut off at "₹12,34…",
 * which tells them nothing about the order of magnitude.
 *
 * `emPerLine` is the narrowest case each tile actually renders at: the numeral
 * clamps to a rem floor on small phones while the tile keeps shrinking, so the
 * tightest fit is a 320px screen, not the smallest font.
 */
export const currencyFit = (
  n: string | number | null | undefined,
  { lines = 1, emPerLine = 4.4 }: { lines?: number; emPerLine?: number } = {},
) => {
  const full = currency(n);
  if (figureEm(full) <= lines * emPerLine) return full;

  const v = Number(n ?? 0);
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  // The crore threshold sits just under a crore, not on it: ₹99,99,999 rounds
  // to "100.00 lakh" at two decimals, and a unit that has to count past 99 is
  // the wrong unit.
  if (abs >= 9.995e6) return `${sign}₹${(abs / 1e7).toFixed(2)} crore`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} lakh`;
  // Below a lakh there is no shorter honest form — thousands read fine in full.
  return full;
};

/**
 * Storage sizes, in the units an operator reads them in. Binary steps, because
 * that is what Postgres reports and what a plan's limit is quoted in; two
 * decimals only while the number is small enough for them to mean anything.
 */
export const bytes = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(v) / Math.log(1024)));
  const scaled = v / 1024 ** i;
  const decimals = i === 0 ? 0 : scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(decimals)} ${units[i]}`;
};

/** Split for a stat tile that shows the figure and its unit separately. */
export const bytesParts = (n: number | null | undefined) => {
  const [value, unit] = bytes(n).split(" ");
  return { value, unit };
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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