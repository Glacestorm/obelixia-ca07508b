/**
 * calendarHelpers — Utilidades de calendario para cálculos de plazos HR
 * V2-ES.4 Paso 2.3: Precisión mejorada de vencimientos
 *
 * Arquitectura preparada para festivos reales:
 * - Todas las funciones aceptan un Set<string> opcional de festivos (formato 'YYYY-MM-DD')
 * - MVP: sin festivos, solo excluye fines de semana
 * - Futuro: inyectar festivos nacionales/CCAA/empresa desde BD
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Holiday calendar — Set of 'YYYY-MM-DD' strings */
export type HolidayCalendar = Set<string>;

/** Empty calendar for MVP (no holidays loaded) */
export const EMPTY_CALENDAR: HolidayCalendar = new Set();

// ─── Core helpers ────────────────────────────────────────────────────────────

/** Format date as 'YYYY-MM-DD' for calendar lookups */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Check if a date is a weekend (Saturday=6, Sunday=0) */
export function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

/** Check if a date is a non-working day (weekend OR holiday) */
export function isNonWorkingDay(date: Date, holidays: HolidayCalendar = EMPTY_CALENDAR): boolean {
  if (isWeekend(date)) return true;
  if (holidays.size > 0 && holidays.has(toDateKey(date))) return true;
  return false;
}

/**
 * Add N business days to a date, skipping weekends and holidays.
 * Supports negative values (subtract business days).
 * If days=0, returns same date (or next business day if on non-working day).
 */
export function addBusinessDays(
  start: Date,
  days: number,
  holidays: HolidayCalendar = EMPTY_CALENDAR,
): Date {
  const result = new Date(start);

  // If 0 days, move to next business day if currently on non-working day
  if (days === 0) {
    while (isNonWorkingDay(result, holidays)) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }

  const direction = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    if (!isNonWorkingDay(result, holidays)) {
      remaining--;
    }
  }
  return result;
}

/**
 * Add N calendar days to a date.
 */
export function addCalendarDays(start: Date, days: number): Date {
  const result = new Date(start);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get last day of the month for a given date.
 */
export function endOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return result;
}

/**
 * Get last day of the NEXT month relative to a given date.
 */
export function endOfNextMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 2, 0);
  return result;
}

/**
 * Count business days between two dates (exclusive of end).
 * Useful for "how many working days until deadline".
 */
export function countBusinessDaysBetween(
  from: Date,
  to: Date,
  holidays: HolidayCalendar = EMPTY_CALENDAR,
): number {
  const start = new Date(Math.min(from.getTime(), to.getTime()));
  const end = new Date(Math.max(from.getTime(), to.getTime()));
  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1); // start exclusive

  while (cursor < end) {
    if (!isNonWorkingDay(cursor, holidays)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return from <= to ? count : -count;
}

/**
 * Get the next business day on or after a date.
 */
export function nextBusinessDay(
  date: Date,
  holidays: HolidayCalendar = EMPTY_CALENDAR,
): Date {
  const result = new Date(date);
  while (isNonWorkingDay(result, holidays)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Compute days remaining (calendar) between now and a target date.
 * Returns negative if target is in the past.
 */
export function daysUntil(target: Date, from: Date = new Date()): number {
  const diffMs = target.getTime() - from.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
