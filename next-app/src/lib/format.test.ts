import { describe, expect, it } from "vitest";
import { bytes, currency, currencyFit, formatDateRange } from "./format";

// The two width budgets the dashboard actually renders at, on a 320px phone.
const HERO = { em: 3.8 };
const SMALL = { em: 5.2 };

describe("currency", () => {
  it("omits paise when there are none", () => {
    expect(currency(570)).toBe("₹570");
    expect(currency(172000)).toBe("₹1,72,000");
  });

  it("prints both digits when the amount genuinely carries paise", () => {
    expect(currency(150.5)).toBe("₹150.50");
    expect(currency(99.99)).toBe("₹99.99");
  });

  it("puts the sign ahead of the symbol, not between symbol and digits", () => {
    expect(currency(-1092000)).toBe("-₹10,92,000");
  });

  it("treats null as zero", () => {
    expect(currency(null)).toBe("₹0");
  });
});

describe("currencyFit", () => {
  it("keeps the exact figure while it fits the width available", () => {
    expect(currencyFit(12500, SMALL)).toBe("₹12,500");
    // The widest figure below a lakh still fits the tighter hero budget.
    expect(currencyFit(99999, HERO)).toBe("₹99,999");
  });

  it("falls back to the Indian short form rather than overflowing", () => {
    expect(currencyFit(172000, HERO)).toBe("₹1.72L");
    expect(currencyFit(1092000, HERO)).toBe("₹10.92L");
    expect(currencyFit(12345678, SMALL)).toBe("₹1.23Cr");
  });

  it("prefers the exact figure whenever the wider budget can hold it", () => {
    // The same amounts the hero has to abbreviate fit a small tile in full,
    // because dropping the paise bought back six glyphs.
    expect(currencyFit(172000, SMALL)).toBe("₹1,72,000");
    expect(currencyFit(1092000, SMALL)).toBe("₹10,92,000");
  });

  it("drops decimals that are only padding in the short form", () => {
    expect(currencyFit(100000, HERO)).toBe("₹1L");
    expect(currencyFit(9990000, HERO)).toBe("₹99.9L");
  });

  it("rolls over to crore rather than printing a three-digit lakh", () => {
    expect(currencyFit(9999999, HERO)).toBe("₹1Cr");
    expect(currencyFit(9990000, HERO)).toBe("₹99.9L");
  });

  it("carries the sign through the short form", () => {
    expect(currencyFit(-1092000, SMALL)).toBe("-₹10.92L");
  });

  it("never returns a figure wider than the budget it was given", () => {
    // The whole point of the helper: a figure that does not fit is the bug
    // this replaces, so every order of magnitude has to come back short
    // enough for one line. `figureEm`'s own weights, inlined.
    const em = (s: string) =>
      [...s].reduce((w, c) => w + (c === "," || c === "." ? 0.27 : 0.57), 0);
    for (let v = 1; v < 1e9; v *= 3) {
      expect(em(currencyFit(v, SMALL))).toBeLessThanOrEqual(SMALL.em);
    }
  });

  it("treats null as zero", () => {
    expect(currencyFit(null, SMALL)).toBe("₹0");
  });
});

describe("formatDateRange", () => {
  const d = (y: number, m: number, day: number) => new Date(y, m, day);

  // en-IN abbreviates September as "Sept" — matching what formatDate already
  // renders everywhere else in the app.
  it("prints a single date when both ends are the same day", () => {
    expect(formatDateRange(d(2026, 8, 1), d(2026, 8, 1))).toBe("01 Sept 2026");
  });

  it("says the month once when the range sits inside one", () => {
    expect(formatDateRange(d(2026, 8, 1), d(2026, 8, 30))).toBe("01 – 30 Sept 2026");
  });

  it("says the year once when the range sits inside one", () => {
    expect(formatDateRange(d(2026, 7, 10), d(2026, 8, 5))).toBe("10 Aug – 05 Sept 2026");
  });

  it("spells both out when the range crosses a year", () => {
    expect(formatDateRange(d(2025, 11, 28), d(2026, 0, 3))).toBe("28 Dec 2025 – 03 Jan 2026");
  });

  it("treats a missing end as unknown rather than guessing", () => {
    expect(formatDateRange(null, d(2026, 8, 1))).toBe("—");
    expect(formatDateRange(d(2026, 8, 1), undefined)).toBe("—");
  });
});

describe("bytes", () => {
  it("scales to the unit an operator reads", () => {
    expect(bytes(0)).toBe("0 B");
    expect(bytes(512)).toBe("512 B");
    expect(bytes(1024)).toBe("1.00 KB");
    expect(bytes(9_895_936)).toBe("9.44 MB");
    expect(bytes(512 * 1024 ** 2)).toBe("512 MB");
    expect(bytes(1024 ** 3)).toBe("1.00 GB");
  });

  it("treats nothing and nonsense as zero rather than throwing", () => {
    expect(bytes(null)).toBe("0 B");
    expect(bytes(undefined)).toBe("0 B");
    expect(bytes(-5)).toBe("0 B");
    expect(bytes(NaN)).toBe("0 B");
  });
});
