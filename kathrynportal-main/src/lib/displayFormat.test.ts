import { describe, expect, it } from "vitest";
import { formatUsdDisplay, formatUsDateDisplay } from "./displayFormat";

describe("displayFormat", () => {
  it("formats ISO dates as MM/DD/YYYY", () => {
    expect(formatUsDateDisplay("2026-07-04")).toBe("07/04/2026");
    expect(formatUsDateDisplay("2026-07-21T12:00:00.000Z").startsWith("07/")).toBe(true);
  });

  it("formats money for display without requiring $ in storage", () => {
    expect(formatUsdDisplay("12506666")).toBe("$12,506,666");
    expect(formatUsdDisplay(1250.5)).toBe("$1,250.5");
    expect(formatUsdDisplay("")).toBe("");
  });
});
