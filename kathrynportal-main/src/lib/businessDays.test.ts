import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  addCalendarDays,
  adjustToBusinessDay,
  isBusinessDay,
  isWeekend,
} from "./businessDays";

describe("businessDays", () => {
  it("moves Saturday forward to Monday", () => {
    const result = adjustToBusinessDay("2026-06-27");
    expect(result.date).toBe("2026-06-29");
    expect(result.adjusted).toBe(true);
    expect(result.reason).toBe("weekend");
  });

  it("moves Sunday forward to Monday", () => {
    const result = adjustToBusinessDay("2026-06-28");
    expect(result.date).toBe("2026-06-29");
    expect(result.adjusted).toBe(true);
  });

  it("leaves weekdays unchanged", () => {
    const result = adjustToBusinessDay("2026-06-26");
    expect(result.date).toBe("2026-06-26");
    expect(result.adjusted).toBe(false);
  });

  it("moves a federal holiday forward to the next business day", () => {
    // 2026-07-03 is the observed Independence Day (July 4 falls on Saturday).
    const result = adjustToBusinessDay("2026-07-03");
    expect(result.date).toBe("2026-07-06");
    expect(result.adjusted).toBe(true);
    expect(result.reason).toBe("holiday");
  });

  it("adds calendar days", () => {
    expect(addCalendarDays("2026-06-01", 17)).toBe("2026-06-18");
  });

  it("adds business days skipping weekends", () => {
    expect(addBusinessDays("2026-06-05", 3)).toBe("2026-06-10");
  });

  it("detects weekends and business days", () => {
    expect(isWeekend("2026-06-27")).toBe(true);
    expect(isWeekend("2026-06-26")).toBe(false);
    expect(isBusinessDay("2026-07-03")).toBe(false); // observed Independence Day
    expect(isBusinessDay("2026-06-26")).toBe(true);
  });
});
