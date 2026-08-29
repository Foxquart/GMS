import { describe, expect, it } from "vitest";
import { currencyFit } from "./format";

const HERO = { lines: 2, emPerLine: 4.4 };
const SMALL = { lines: 1, emPerLine: 5.2 };

describe("currencyFit", () => {
  it("keeps the exact figure while it fits the lines available", () => {
    expect(currencyFit(12500, SMALL)).toBe("₹12,500.00");
    // Too wide for one line, but two lines of hero numeral hold it in full.
    expect(currencyFit(1092000, HERO)).toBe("₹10,92,000.00");
  });

  it("falls back to Indian short form when the figure would not fit", () => {
    expect(currencyFit(1092000, SMALL)).toBe("₹10.92 lakh");
    expect(currencyFit(12345678, SMALL)).toBe("₹1.23 crore");
  });

  it("rolls over to crore rather than printing a three-digit lakh", () => {
    expect(currencyFit(9999999, SMALL)).toBe("₹1.00 crore");
    expect(currencyFit(9990000, SMALL)).toBe("₹99.90 lakh");
  });

  it("has no shorter honest form below a lakh, so it keeps the full figure", () => {
    expect(currencyFit(99999, SMALL)).toBe("₹99,999.00");
  });

  it("carries the sign through the short form", () => {
    expect(currencyFit(-1092000, SMALL)).toBe("-₹10.92 lakh");
  });

  it("treats null as zero", () => {
    expect(currencyFit(null, SMALL)).toBe("₹0.00");
  });
});
