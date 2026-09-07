import { describe, expect, it } from "vitest";
import {
  canonicalRegistration,
  isCompleteRegistration,
  parseRegistration,
} from "@/components/registration-input";

/**
 * The segmented registration field only behaves if its parser does. These are
 * the cases that decide whether an existing record opens in guided mode or
 * falls back to free text — get that wrong and editing a vehicle silently
 * rewrites its number.
 */
describe("registration parsing", () => {
  it("accepts the standard grammar however it was punctuated", () => {
    for (const written of ["TR 01 AB 1234", "TR-01-AB-1234", "tr01ab1234", "  TR01 AB1234 "]) {
      expect(parseRegistration(written)).toEqual({
        state: "TR",
        district: "01",
        series: "AB",
        number: "1234",
      });
      expect(isCompleteRegistration(written)).toBe(true);
    }
  });

  it("handles all three series lengths", () => {
    expect(parseRegistration("TR01A1234")?.series).toBe("A");
    expect(parseRegistration("TR01AB1234")?.series).toBe("AB");
    expect(parseRegistration("TR01ABC1234")?.series).toBe("ABC");
  });

  it("re-opens a half-typed number in guided mode", () => {
    // Someone saved a job with the registration only partly filled in. The
    // edit form has to show them the pieces they typed, not send them to the
    // free-text fallback.
    expect(parseRegistration("TR 01")).toEqual({
      state: "TR",
      district: "01",
      series: "",
      number: "",
    });
    expect(isCompleteRegistration("TR 01")).toBe(false);
  });

  it("refuses shapes the guided field cannot represent", () => {
    // The BH (Bharat) series is `YY BH NNNN LL` — a different grammar. Forcing
    // it into the four segments would produce a number that does not exist, so
    // it has to fall through to manual entry.
    expect(parseRegistration("22 BH 1234 AB")).toBeNull();
    // Not a real state code.
    expect(parseRegistration("XX 01 AB 1234")).toBeNull();
    // Five trailing digits, three-digit district — outside the format.
    expect(parseRegistration("TR 01 AB 12345")).toBeNull();
    expect(parseRegistration("TR 011 AB 1234")).toBeNull();
    expect(parseRegistration("")).toBeNull();
  });

  it("does not second-guess the district code", () => {
    // Published TR-code lists disagree with one another and new codes appear
    // when districts do. Shape is checked; the district is taken as given.
    expect(isCompleteRegistration("TR 47 XY 9999")).toBe(true);
  });

  it("normalises to a single dedupe-friendly form", () => {
    // `normalizeRegistration` on the server strips spaces and hyphens too, so
    // a number typed either way matches the same existing vehicle.
    expect(canonicalRegistration("tr-01 ab 1234")).toBe("TR01AB1234");
    expect(canonicalRegistration("TR 01 AB 1234")).toBe(canonicalRegistration("TR01AB1234"));
  });
});
