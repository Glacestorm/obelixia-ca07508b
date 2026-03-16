/**
 * @migration Sprint 3 — Moved to src/engines/erp/hr/calendarHelpers.ts
 * This file is a compatibility re-export. Import from '@/engines/erp/hr/calendarHelpers' instead.
 */
export {
  toDateKey,
  isWeekend,
  isNonWorkingDay,
  addBusinessDays,
  addCalendarDays,
  endOfMonth,
  endOfNextMonth,
  countBusinessDaysBetween,
  nextBusinessDay,
  daysUntil,
  EMPTY_CALENDAR,
} from '@/engines/erp/hr/calendarHelpers';
export type { HolidayCalendar } from '@/engines/erp/hr/calendarHelpers';
