/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Hook read-only que lee incidencias persistidas desde 3 tablas canónicas
 * y las mapea al CasuisticaState legacy mediante el adapter puro.
 *
 * INVARIANTES:
 *  - Solo lectura. Sin writes. Sin service_role.
 *  - Usa el cliente Supabase autenticado (RLS multi-tenant aplicada).
 *  - No genera comunicaciones oficiales.
 *  - No marca incidencias como aplicadas.
 *  - No se consume aún en UI (eso es C3).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPeriodBounds } from '@/lib/hr/casuisticaDates';
import { mapIncidenciasToLegacyCasuistica } from '@/lib/hr/incidenciasMapper';
import type {
  IncidenciasFetchParams,
  ITProcessRow,
  LeaveRequestRow,
  PayrollIncidentRow,
} from '@/lib/hr/incidenciasTypes';

const STALE_MS = 30_000;

function useEnabled(p: IncidenciasFetchParams): boolean {
  return Boolean(
    p.companyId &&
      p.employeeId &&
      p.periodYear > 0 &&
      p.periodMonth >= 1 &&
      p.periodMonth <= 12,
  );
}

export function useHRPayrollIncidencias(params: IncidenciasFetchParams) {
  const enabled = useEnabled(params);
  const { companyId, employeeId, periodYear, periodMonth, includePending } = params;
  const { start: periodStart, end: periodEnd } = useMemo(
    () => (enabled ? getPeriodBounds(periodYear, periodMonth) : { start: '', end: '' }),
    [enabled, periodYear, periodMonth],
  );

  const payrollQ = useQuery({
    queryKey: [
      'hr-payroll-incidents',
      companyId,
      employeeId,
      periodYear,
      periodMonth,
    ],
    enabled,
    staleTime: STALE_MS,
    queryFn: async (): Promise<PayrollIncidentRow[]> => {
      const orFilter =
        `and(period_year.eq.${periodYear},period_month.eq.${periodMonth}),` +
        `and(applies_from.lte.${periodEnd},applies_to.gte.${periodStart})`;
      const { data, error } = await supabase
        .from('erp_hr_payroll_incidents')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .is('deleted_at', null)
        .or(orFilter);
      if (error) throw error;
      return (data ?? []) as PayrollIncidentRow[];
    },
  });

  const itQ = useQuery({
    queryKey: [
      'hr-it-processes-overlap',
      companyId,
      employeeId,
      periodYear,
      periodMonth,
    ],
    enabled,
    staleTime: STALE_MS,
    queryFn: async (): Promise<ITProcessRow[]> => {
      const { data, error } = await supabase
        .from('erp_hr_it_processes')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .lte('start_date', periodEnd)
        .or(`end_date.is.null,end_date.gte.${periodStart}`)
        .neq('status', 'cancelled');
      if (error) throw error;
      return (data ?? []) as ITProcessRow[];
    },
  });

  const leaveQ = useQuery({
    queryKey: [
      'hr-leave-requests-overlap',
      companyId,
      employeeId,
      periodYear,
      periodMonth,
      includePending ?? false,
    ],
    enabled,
    staleTime: STALE_MS,
    queryFn: async (): Promise<LeaveRequestRow[]> => {
      let q = supabase
        .from('erp_hr_leave_requests')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .lte('start_date', periodEnd)
        .gte('end_date', periodStart);
      if (!includePending) {
        // Approved por defecto. Acepta workflow_status='approved' o
        // status='approved' (legacy fallback).
        q = q.or('workflow_status.eq.approved,status.eq.approved');
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LeaveRequestRow[];
    },
  });

  const payrollIncidents = payrollQ.data ?? [];
  const itProcesses = itQ.data ?? [];
  const leaveRequests = leaveQ.data ?? [];

  const mapping = useMemo(() => {
    if (!enabled) {
      return {
        legacy: {},
        flags: {},
        traces: [],
        unmapped: [],
        legalReviewRequired: false,
      };
    }
    return mapIncidenciasToLegacyCasuistica({
      payrollIncidents,
      itProcesses,
      leaveRequests,
      periodYear,
      periodMonth,
    });
  }, [enabled, payrollIncidents, itProcesses, leaveRequests, periodYear, periodMonth]);

  const isLoading = payrollQ.isLoading || itQ.isLoading || leaveQ.isLoading;
  const error = payrollQ.error ?? itQ.error ?? leaveQ.error ?? null;

  const refetch = async () => {
    await Promise.all([payrollQ.refetch(), itQ.refetch(), leaveQ.refetch()]);
  };

  return {
    payrollIncidents,
    itProcesses,
    leaveRequests,
    mapping,
    legacyCasuistica: mapping.legacy,
    isLoading,
    error,
    refetch,
  };
}

export default useHRPayrollIncidencias;
