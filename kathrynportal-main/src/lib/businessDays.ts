/** Local-date helpers for timeline offsets and weekend rules (no UTC drift). */

export type WeekendAdjustResult = {
  date: string;
  adjusted: boolean;
  note?: string;
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

/** Sat → Friday; Sun → Monday. */
export function adjustOffWeekend(iso: string): WeekendAdjustResult {
  const d = parseLocalDate(iso);
  if (!d) return { date: iso, adjusted: false };

  const dow = d.getDay();
  if (dow === 6) {
    d.setDate(d.getDate() - 1);
    return {
      date: formatIsoDate(d),
      adjusted: true,
      note: "Adjusted from Saturday to Friday",
    };
  }
  if (dow === 0) {
    d.setDate(d.getDate() + 1);
    return {
      date: formatIsoDate(d),
      adjusted: true,
      note: "Adjusted from Sunday to Monday",
    };
  }
  return { date: iso, adjusted: false };
}

export function addCalendarDays(iso: string, days: number): string | null {
  const d = parseLocalDate(iso);
  if (!d || !Number.isFinite(days)) return null;
  d.setDate(d.getDate() + days);
  return formatIsoDate(d);
}

/** Count forward; weekends are skipped, not counted. */
export function addBusinessDays(iso: string, days: number): string | null {
  const d = parseLocalDate(iso);
  if (!d || !Number.isFinite(days) || days < 0) return null;
  if (days === 0) return formatIsoDate(d);

  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return formatIsoDate(d);
}

export function normalizeTimelineDate(iso: string): WeekendAdjustResult {
  const trimmed = iso.trim();
  if (!trimmed) return { date: "", adjusted: false };
  return adjustOffWeekend(trimmed);
}
