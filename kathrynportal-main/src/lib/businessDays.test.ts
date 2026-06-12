import { describe, expect, it } from "vitest";
import { addBusinessDays, addCalendarDays, adjustOffWeekend, isWeekend } from "./businessDays";

describe("businessDays", () => {
  it("adjusts Saturday to Friday", () => {
    const result = adjustOffWeekend("2026-06-27");
    expect(result.date).toBe("2026-06-26");
    expect(result.adjusted).toBe(true);
  });

  it("adjusts Sunday to Monday", () => {
    const result = adjustOffWeekend("2026-06-28");
    expect(result.date).toBe("2026-06-29");
    expect(result.adjusted).toBe(true);
  });

  it("leaves weekdays unchanged", () => {
    const result = adjustOffWeekend("2026-06-26");
    expect(result.date).toBe("2026-06-26");
    expect(result.adjusted).toBe(false);
  });

  it("adds calendar days", () => {
    expect(addCalendarDays("2026-06-01", 17)).toBe("2026-06-18");
  });

  it("adds business days skipping weekends", () => {
    expect(addBusinessDays("2026-06-05", 3)).toBe("2026-06-10");
  });

  it("detects weekends", () => {
    expect(isWeekend("2026-06-27")).toBe(true);
    expect(isWeekend("2026-06-26")).toBe(false);
  });
});
