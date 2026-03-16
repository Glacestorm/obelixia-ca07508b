/**
 * useHRHolidayCalendar — Lectura cacheada de festivos laborales
 * V2-ES.4 Paso 6.1: Calendario laboral configurable con fallback a solo fines de semana
 *
 * REGLAS:
 * - Cache largo (datos casi estáticos)
 * - Devuelve Set<string> para lookup O(1) en calendarHelpers
 * - Fallback a EMPTY_CALENDAR si no hay festivos o falla la query
 * - Preparado para filtro por company_id y region_code
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_CALENDAR, type HolidayCalendar } from '@/engines/erp/hr/calendarHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export type HolidayScope = 'national' | 'regional' | 'local' | 'company';

export interface HolidayEntry {
  id: string;
  company_id: string | null;
  holiday_date: string;
  name: string;
  scope: HolidayScope;
  country_code: string;
  region_code: string | null;
  is_active: boolean;
  notes: string | null;
  year: number;
  created_at: string;
}

export interface HolidayCalendarContext {
  year?: number;
  companyId?: string | null;
  regionCode?: string | null;
  countryCode?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRHolidayCalendar(ctx?: HolidayCalendarContext) {
  const year = ctx?.year ?? new Date().getFullYear();
  const companyId = ctx?.companyId ?? null;
  const regionCode = ctx?.regionCode ?? null;
  const countryCode = ctx?.countryCode ?? 'ES';

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['erp-hr-holiday-calendar', year, companyId, regionCode, countryCode],
    queryFn: async (): Promise<HolidayEntry[]> => {
      let query = (supabase as any)
        .from('erp_hr_holiday_calendar')
        .select('*')
        .eq('is_active', true)
        .eq('year', year)
        .eq('country_code', countryCode);

      // National holidays always included; also include company/region if specified
      // We fetch all matching and filter client-side for simplicity
      const { data, error } = await query.order('holiday_date', { ascending: true });

      if (error) {
        console.warn('[useHRHolidayCalendar] Query failed, using empty calendar:', error.message);
        return [];
      }

      // Filter: include national + matching region + matching company
      return ((data ?? []) as HolidayEntry[]).filter(h => {
        if (h.scope === 'national') return true;
        if (h.scope === 'regional' && regionCode && h.region_code === regionCode) return true;
        if (h.scope === 'local' && regionCode && h.region_code === regionCode) return true;
        if (h.scope === 'company' && companyId && h.company_id === companyId) return true;
        return false;
      });
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  /** Set<string> of 'YYYY-MM-DD' for O(1) lookup in calendarHelpers */
  const holidaySet: HolidayCalendar = useMemo(() => {
    if (entries.length === 0) return EMPTY_CALENDAR;
    return new Set(entries.map(e => e.holiday_date));
  }, [entries]);

  /** Human-readable label for the active calendar scope */
  const calendarLabel = useMemo(() => {
    if (entries.length === 0) return 'Base';
    const hasRegional = entries.some(e => e.scope === 'regional' || e.scope === 'local');
    const hasCompany = entries.some(e => e.scope === 'company');
    if (hasCompany) return 'Empresa';
    if (hasRegional) return regionCode ?? 'Regional';
    return 'Nacional';
  }, [entries, regionCode]);

  return {
    /** Raw holiday entries for display purposes */
    entries,
    /** Set<string> for calendarHelpers — pass directly to addBusinessDays, countBusinessDaysBetween, etc. */
    holidaySet,
    /** 'Base' | 'Nacional' | region code | 'Empresa' */
    calendarLabel,
    /** Number of holidays loaded */
    holidayCount: entries.length,
    /** Loading state */
    isLoading,
  };
}
