import { describe, expect, it } from "vitest";
import {
  parseRange,
  resolveMonth,
  resolvePreset,
  resolveYear,
  toDayString,
} from "@/lib/date-range";

/** Local-time construction, so the assertions do not drift with the runner's zone. */
const at = (y: number, m: number, d: number, h = 0, mi = 0, s = 0, ms = 0) =>
  new Date(y, m, d, h, mi, s, ms);

describe("date ranges", () => {
  it("covers the whole first and last day of a range", () => {
    const r = resolveMonth(2026, 7); // August 2026

    expect(r.from).toEqual(at(2026, 7, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 7, 31, 23, 59, 59, 999));

    // The boundary that matters: an invoice raised at one second to midnight
    // on the last day is inside the month; one at midnight is not.
    expect(at(2026, 7, 31, 23, 59, 59) <= r.to).toBe(true);
    expect(at(2026, 8, 1, 0, 0, 0) <= r.to).toBe(false);
    // And the same at the bottom end.
    expect(at(2026, 7, 1, 0, 0, 0) >= r.from).toBe(true);
    expect(at(2026, 6, 31, 23, 59, 59) >= r.from).toBe(false);
  });

  it("gets month lengths right without a table of them", () => {
    expect(resolveMonth(2026, 1).to.getDate()).toBe(28); // Feb 2026
    expect(resolveMonth(2024, 1).to.getDate()).toBe(29); // Feb 2024, a leap year
    expect(resolveMonth(2026, 3).to.getDate()).toBe(30); // April
    expect(resolveMonth(2026, 11).to.getDate()).toBe(31); // December
  });

  it("rolls 'last month' back across the new year", () => {
    const inJanuary = at(2026, 0, 14, 11, 0);
    const r = resolvePreset("last-month", inJanuary);
    expect(r.from).toEqual(at(2025, 11, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2025, 11, 31, 23, 59, 59, 999));
  });

  it("puts each preset on the right calendar days", () => {
    // Wednesday 2 September 2026.
    const now = at(2026, 8, 2, 15, 30);

    const today = resolvePreset("today", now);
    expect(toDayString(today.from)).toBe("2026-09-02");
    expect(toDayString(today.to)).toBe("2026-09-02");

    const yesterday = resolvePreset("yesterday", now);
    expect(toDayString(yesterday.from)).toBe("2026-09-01");
    expect(toDayString(yesterday.to)).toBe("2026-09-01");

    // Monday-start weeks, matching the week the old periodStart used.
    const thisWeek = resolvePreset("this-week", now);
    expect(toDayString(thisWeek.from)).toBe("2026-08-31");
    expect(toDayString(thisWeek.to)).toBe("2026-09-06");

    const lastWeek = resolvePreset("last-week", now);
    expect(toDayString(lastWeek.from)).toBe("2026-08-24");
    expect(toDayString(lastWeek.to)).toBe("2026-08-30");

    const thisMonth = resolvePreset("this-month", now);
    expect(toDayString(thisMonth.from)).toBe("2026-09-01");
    expect(toDayString(thisMonth.to)).toBe("2026-09-30");

    const lastYear = resolvePreset("last-year", now);
    expect(toDayString(lastYear.from)).toBe("2025-01-01");
    expect(toDayString(lastYear.to)).toBe("2025-12-31");
  });

  it("treats a week as seven days whichever day it is asked on", () => {
    // Monday and the Sunday six days later must resolve to the same week.
    const monday = resolvePreset("this-week", at(2026, 8, 7, 9));
    const sunday = resolvePreset("this-week", at(2026, 8, 13, 22));
    expect(monday).toEqual(sunday);
    expect(toDayString(monday.from)).toBe("2026-09-07");
    expect(toDayString(monday.to)).toBe("2026-09-13");
  });

  it("swaps a reversed custom range rather than returning nothing", () => {
    // Picking the end date first is a clear intention; an empty report is a
    // worse answer than the one the person meant.
    const r = parseRange("2026-08-20", "2026-08-10")!;
    expect(toDayString(r.from)).toBe("2026-08-10");
    expect(toDayString(r.to)).toBe("2026-08-20");
    expect(r.to.getHours()).toBe(23);
  });

  it("accepts a single day as a range", () => {
    const r = parseRange("2026-08-10", "2026-08-10")!;
    expect(r.from).toEqual(at(2026, 7, 10, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 7, 10, 23, 59, 59, 999));
  });

  it("rejects unparseable and impossible dates", () => {
    expect(parseRange("", "2026-08-10")).toBeNull();
    expect(parseRange("10-08-2026", "2026-08-10")).toBeNull();
    expect(parseRange("2026-8-10", "2026-08-10")).toBeNull();
    // The Date constructor would roll this into March; it must not.
    expect(parseRange("2026-02-31", "2026-08-10")).toBeNull();
    expect(parseRange("2026-13-01", "2026-08-10")).toBeNull();
  });

  it("parses a day string in local time, not UTC", () => {
    // `new Date("2026-08-10")` is UTC midnight, which is the previous day in
    // any zone west of Greenwich — the classic off-by-one in date pickers.
    const r = parseRange("2026-08-10", "2026-08-10")!;
    expect(r.from.getDate()).toBe(10);
    expect(toDayString(r.from)).toBe("2026-08-10");
  });

  it("round-trips through toDayString", () => {
    const r = resolveYear(2025);
    expect(toDayString(r.from)).toBe("2025-01-01");
    expect(toDayString(r.to)).toBe("2025-12-31");
    expect(parseRange(toDayString(r.from), toDayString(r.to))).toEqual(r);
  });
});
