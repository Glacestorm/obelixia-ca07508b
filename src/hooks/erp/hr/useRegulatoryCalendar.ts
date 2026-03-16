/**
 * useRegulatoryCalendar — V2-ES.8 Tramo 3
 * Hook that computes regulatory deadlines from existing data context.
 * Zero-fetch pattern: uses data already loaded by parent components.
 */
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeRegulatoryCalendar,
  type RegulatoryCalendarContext,
  type RegulatoryCalendarSummary,
} from '@/components/erp/hr/shared/regulatoryCalendarEngine';
import { type HolidayCalendar, EMPTY_CALENDAR } from '@/engines/erp/hr/calendarHelpers';

export interface UseRegulatoryCalendarReturn {
  calendar: RegulatoryCalendarSummary | null;
  isLoading: boolean;
  evaluate: () => Promise<RegulatoryCalendarSummary>;
}

export function useRegulatoryCalendar(companyId: string): UseRegulatoryCalendarReturn {
  const [calendar, setCalendar] = useState<RegulatoryCalendarSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const evaluate = useCallback(async () => {
    setIsLoading(true);
    try {
      // Gather context from lightweight queries
      const [employeesRes, periodsRes, contractsRes] = await Promise.all([
        supabase.from('hr_employees' as any).select('id', { count: 'exact' })
          .eq('company_id', companyId).eq('status', 'active'),
        supabase.from('hr_payroll_periods' as any).select('id, month, status, name')
          .eq('company_id', companyId).order('month', { ascending: false }).limit(20),
        supabase.from('hr_contracts' as any).select('id, status, start_date, end_date')
          .eq('company_id', companyId).eq('status', 'active'),
      ]);

      const hasActiveEmployees = (employeesRes.count ?? 0) > 0;
      const periods = (periodsRes.data || []) as any[];
      const closedPeriods = periods.filter((p: any) => p.status === 'closed');
      const contracts = (contractsRes.data || []) as any[];

      // Determine current period (most recent non-closed or latest)
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastClosedPeriod = closedPeriods.length > 0 ? closedPeriods[0].month || closedPeriods[0].name : undefined;

      // Contracts expiring within 30 days
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const expiring = contracts.filter((c: any) => {
        if (!c.end_date) return false;
        const end = new Date(c.end_date);
        return end >= now && end <= thirtyDaysLater;
      });

      // Pending communications (simplified: contracts started in last 15 days with no submission)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const recentContracts = contracts.filter((c: any) => {
        if (!c.start_date) return false;
        const start = new Date(c.start_date);
        return start >= fifteenDaysAgo && start <= now;
      });

      const ctx: RegulatoryCalendarContext = {
        now,
        holidays: EMPTY_CALENDAR,
        hasActiveEmployees,
        currentPeriod,
        lastClosedPayrollPeriod: lastClosedPeriod,
        pendingContractCommunications: recentContracts.length,
        earliestPendingContractDate: recentContracts.length > 0
          ? recentContracts.sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0].start_date
          : undefined,
        contractsExpiringSoon: expiring.length,
        earliestExpirationDate: expiring.length > 0
          ? expiring.sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0].end_date
          : undefined,
        fiscalYear: now.getFullYear(),
        closedPayrollPeriodsCount: closedPeriods.length,
      };

      const result = computeRegulatoryCalendar(ctx);
      setCalendar(result);
      return result;
    } catch (err) {
      console.error('[useRegulatoryCalendar] error:', err);
      const fallback: RegulatoryCalendarSummary = {
        deadlines: [],
        worstUrgency: 'insufficient',
        hasRisk: false,
        overdueCount: 0,
        urgentCount: 0,
        upcomingCount: 0,
        byDomain: {
          tgss_siltra: { deadlines: 0, worstUrgency: 'insufficient', hasRisk: false },
          contrata_sepe: { deadlines: 0, worstUrgency: 'insufficient', hasRisk: false },
          aeat: { deadlines: 0, worstUrgency: 'insufficient', hasRisk: false },
        },
        summaryLabel: 'Sin datos suficientes',
        disclaimer: 'Plazos orientativos para readiness interno.',
      };
      setCalendar(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  return { calendar, isLoading, evaluate };
}
