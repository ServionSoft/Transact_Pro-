/** Local-date helpers for timeline offsets and weekend/holiday rules (no UTC drift). */

import { isUsFederalHoliday } from "./usFederalHolidays";

export type WeekendAdjustResult = {
  date: string;
  adjusted: boolean;
  note?: string;
  /** Why the date moved, when adjusted. */
  reason?: "weekend" | "holiday";
};

function parseLocalDate(iso: string): Date | null {
  const trimmed = iso.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWeekend(iso: string): boolean {
  const d = parseLocalDate(iso);
  if (!d) return false;
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

/** A business day is a weekday that is not an observed US federal holiday. */
export function isBusinessDay(iso: string): boolean {
  const d = parseLocalDate(iso);
  if (!d) return false;
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !isUsFederalHoliday(iso);
}

/**
 * Moves a date forward to the next business day when it lands on a weekend or
 * an observed federal holiday (e.g. Saturday → Monday, July 4 → next open day).
 */
export function adjustToBusinessDay(iso: string): WeekendAdjustResult {
  const start = parseLocalDate(iso);
  if (!start) return { date: iso, adjusted: false };

  const cursor = new Date(start);
  let hitWeekend = false;
  let hitHoliday = false;

  // Roll forward until we land on an open business day.
  // Guard the loop generously; a run of holidays/weekends is only a few days.
  for (let i = 0; i < 14; i += 1) {
    const current = formatIsoDate(cursor);
    const dow = cursor.getDay();
    if (dow === 0 || dow === 6) {
      hitWeekend = true;
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    if (isUsFederalHoliday(current)) {
      hitHoliday = true;
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    break;
  }

  const adjustedDate = formatIsoDate(cursor);
  if (adjustedDate === iso) return { date: iso, adjusted: false };

  const reason: "weekend" | "holiday" = hitHoliday ? "holiday" : "weekend";
  return {
    date: adjustedDate,
    adjusted: true,
    reason,
    note:
      reason === "holiday"
        ? "Adjusted to next business day (holiday)"
        : "Adjusted to next business day (weekend)",
  };
}

/** @deprecated Use {@link adjustToBusinessDay}. Retained for compatibility; now forward-only. */
export const adjustOffWeekend = adjustToBusinessDay;

export function addCalendarDays(iso: string, days: number): string | null {
  const d = parseLocalDate(iso);
  if (!d || !Number.isFinite(days)) return null;
  d.setDate(d.getDate() + days);
  return formatIsoDate(d);
}

/** Count forward; weekends and observed federal holidays are skipped, not counted. */
export function addBusinessDays(iso: string, days: number): string | null {
  const d = parseLocalDate(iso);
  if (!d || !Number.isFinite(days) || days < 0) return null;
  if (days === 0) return formatIsoDate(d);

  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !isUsFederalHoliday(formatIsoDate(d))) remaining -= 1;
  }
  return formatIsoDate(d);
}

export function normalizeTimelineDate(iso: string): WeekendAdjustResult {
  const trimmed = iso.trim();
  if (!trimmed) return { date: "", adjusted: false };
  return adjustToBusinessDay(trimmed);
}
