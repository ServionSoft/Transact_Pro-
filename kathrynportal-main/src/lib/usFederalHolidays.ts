/**
 * US federal holiday calendar for timeline deadline bumping.
 *
 * Returns the *observed* holiday dates (the day offices actually close), so a
 * fixed-date holiday landing on a weekend is shifted per federal rules:
 *   - Saturday  -> observed the preceding Friday
 *   - Sunday    -> observed the following Monday
 * Floating Monday/Thursday holidays never need shifting.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(year: number, monthIndex0: number, day: number): string {
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`;
}

/** ISO for a JS Date using local calendar parts (no UTC drift). */
function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** nth (1-based) weekday in a month. weekday: 0=Sun..6=Sat. */
function nthWeekday(year: number, monthIndex0: number, weekday: number, n: number): string {
  const first = new Date(year, monthIndex0, 1);
  const shift = (weekday - first.getDay() + 7) % 7;
  return iso(year, monthIndex0, 1 + shift + (n - 1) * 7);
}

/** Last given weekday in a month. */
function lastWeekday(year: number, monthIndex0: number, weekday: number): string {
  const last = new Date(year, monthIndex0 + 1, 0);
  const shift = (last.getDay() - weekday + 7) % 7;
  return iso(year, monthIndex0, last.getDate() - shift);
}

/** Observed date for a fixed-date holiday (applies Sat->Fri, Sun->Mon). */
function observedFixed(year: number, monthIndex0: number, day: number): string {
  const d = new Date(year, monthIndex0, day);
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() - 1);
  else if (dow === 0) d.setDate(d.getDate() + 1);
  return isoFromDate(d);
}

const holidayCache = new Map<number, Set<string>>();

/** Set of observed federal-holiday ISO dates that fall within the given year. */
function observedHolidaysForYear(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const dates: string[] = [
    // New Year's Day (this year, and next year's — which may be observed on Dec 31 of this year).
    observedFixed(year, 0, 1),
    observedFixed(year + 1, 0, 1),
    nthWeekday(year, 0, 1, 3), // MLK Day — 3rd Monday of January
    nthWeekday(year, 1, 1, 3), // Presidents' Day — 3rd Monday of February
    lastWeekday(year, 4, 1), // Memorial Day — last Monday of May
    observedFixed(year, 5, 19), // Juneteenth
    observedFixed(year, 6, 4), // Independence Day
    nthWeekday(year, 8, 1, 1), // Labor Day — 1st Monday of September
    nthWeekday(year, 9, 1, 2), // Columbus / Indigenous Peoples' Day — 2nd Monday of October
    observedFixed(year, 10, 11), // Veterans Day
    nthWeekday(year, 10, 4, 4), // Thanksgiving — 4th Thursday of November
    observedFixed(year, 11, 25), // Christmas
  ];

  const set = new Set(dates.filter((d) => Number(d.slice(0, 4)) === year));
  holidayCache.set(year, set);
  return set;
}

/** True when the ISO date (YYYY-MM-DD) is an observed US federal holiday. */
export function isUsFederalHoliday(isoDate: string): boolean {
  const trimmed = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const year = Number(trimmed.slice(0, 4));
  return observedHolidaysForYear(year).has(trimmed);
}
