/**
 * The window a report covers.
 *
 * Reports used to anchor every figure to `periodStart()`, which floored the
 * *current* day, week, month or year — so "how much did I collect between the
 * 10th and the 20th of August" had no answer, and neither did "show me July".
 * One explicit range now drives every period figure.
 *
 * `to` is always the last millisecond of the last day in the range, never
 * `now`. That is deliberate: the report queries are written with an
 * open-at-the-top window because an upper bound of `now`, captured before the
 * queries went out, excluded rows written while the request was in flight — an
 * invoice raised as the page loaded went missing from the day's total. Ending
 * at midnight tonight preserves that, since nothing is ever created in the
 * future. Do not "tighten" this to `now`.
 */
export type DateRange = { from: Date; to: Date };

export type PresetId =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
];

const startOfDay = (d: Date) => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
};

const endOfDay = (d: Date) => {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
};

const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/** Monday-start, matching the week the old `periodStart` used. */
const startOfWeek = (d: Date) => startOfDay(addDays(d, -((d.getDay() + 6) % 7)));

/**
 * A calendar month as a range.
 *
 * `month` is 0-11. Day 0 of the *next* month is the last day of this one,
 * which is how February and the 30/31-day months take care of themselves —
 * there is no table of month lengths here and there should not be one.
 */
export function resolveMonth(year: number, month: number): DateRange {
  return {
    from: startOfDay(new Date(year, month, 1)),
    to: endOfDay(new Date(year, month + 1, 0)),
  };
}

export function resolveYear(year: number): DateRange {
  return {
    from: startOfDay(new Date(year, 0, 1)),
    to: endOfDay(new Date(year, 11, 31)),
  };
}

export function resolvePreset(id: PresetId, now = new Date()): DateRange {
  switch (id) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const d = addDays(now, -1);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    case "this-week": {
      const from = startOfWeek(now);
      return { from, to: endOfDay(addDays(from, 6)) };
    }
    case "last-week": {
      const from = addDays(startOfWeek(now), -7);
      return { from, to: endOfDay(addDays(from, 6)) };
    }
    case "this-month":
      return resolveMonth(now.getFullYear(), now.getMonth());
    case "last-month":
      // `new Date(2026, -1, 1)` is December 2025 — the rollover is the Date
      // constructor's job, not ours.
      return resolveMonth(now.getFullYear(), now.getMonth() - 1);
    case "this-year":
      return resolveYear(now.getFullYear());
    case "last-year":
      return resolveYear(now.getFullYear() - 1);
  }
}

/** `YYYY-MM-DD` → local midnight. `new Date("2026-08-10")` parses as UTC. */
function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  // Rejects 2026-02-31, which the constructor would roll into March.
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1) return null;
  if (date.getDate() !== Number(d)) return null;
  return date;
}

/**
 * A custom range from two `YYYY-MM-DD` strings.
 *
 * Reversed input is swapped rather than rejected: someone who picks the end
 * date first has expressed a perfectly clear intention, and an empty report is
 * a worse answer than the one they meant. Returns null only when a date is
 * genuinely unparseable, which the API turns into a 400.
 */
export function parseRange(from: string, to: string): DateRange | null {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return null;
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return { from: startOfDay(lo), to: endOfDay(hi) };
}

/** `YYYY-MM-DD` in local time — what the date inputs and the API exchange. */
export function toDayString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
