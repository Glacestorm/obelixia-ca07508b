/**
 * useFiscalSupervisor — G1.2 Hook
 * Connects real Supabase data to the fiscal supervisor engine.
 * Filters: empresa, periodo (year+month), empleado, estado.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  runFiscalSupervisor,
  type FiscalSupervisorInput,
  type FiscalSupervisorResult,
  type FiscalCheckStatus,
  type InternationalEmployeeFlag,
  type ActiveIncidentFlag,
} from '@/engines/erp/hr/fiscalSupervisorEngine';
import type { PayrollPeriodFiscalData, Modelo111FiscalData } from '@/engines/erp/hr/fiscalReconciliationEngine';
import type { Modelo145EmployeeData } from '@/engines/erp/hr/modelo145ValidationEngine';
import type { ReconciliationTotals } from '@/engines/erp/hr/cotizacionReconciliationEngine';

export interface FiscalSupervisorFilters {
  companyId: string;
  periodYear: number;
  periodMonth: number;
  employeeId?: string;
  statusFilter?: FiscalCheckStatus;
}

export function useFiscalSupervisor(filters: FiscalSupervisorFilters) {
  const { companyId, periodYear, periodMonth, employeeId, statusFilter } = filters;

  // ─── Fetch payroll data ───────────────────────────────────
  const payrollQuery = useQuery({
    queryKey: ['fiscal-supervisor-payroll', companyId, periodYear, periodMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_payrolls')
        .select('id, employee_id, period_month, period_year, base_irpf, retencion_irpf, total_devengos, status')
        .eq('company_id', companyId)
        .eq('period_year', periodYear)
        .eq('status', 'closed');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Fetch employees (for 145 + international) ────────────
  const employeesQuery = useQuery({
    queryKey: ['fiscal-supervisor-employees', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, nif, situacion_familiar, discapacidad_grado, is_active, nationality, country_of_residence')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 120_000,
  });

  // ─── Fetch incidents ──────────────────────────────────────
  const incidentsQuery = useQuery({
    queryKey: ['fiscal-supervisor-incidents', companyId, periodYear, periodMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_incidences')
        .select('id, employee_id, type, start_date, end_date, status, description')
        .eq('company_id', companyId)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Transform & run engine ───────────────────────────────
  const result = useMemo((): FiscalSupervisorResult | null => {
    if (!payrollQuery.data) return null;

    // Group payrolls by month for the selected year
    const payrollsByMonth = new Map<number, typeof payrollQuery.data>();
    for (const p of payrollQuery.data) {
      const month = p.period_month;
      if (!payrollsByMonth.has(month)) payrollsByMonth.set(month, []);
      payrollsByMonth.get(month)!.push(p);
    }

    // Build PayrollPeriodFiscalData per month
    const payrollMonths: PayrollPeriodFiscalData[] = [];
    for (const [month, payrolls] of payrollsByMonth) {
      const filtered = employeeId
        ? payrolls.filter(p => p.employee_id === employeeId)
        : payrolls;

      if (filtered.length === 0) continue;

      payrollMonths.push({
        periodYear,
        periodMonth: month,
        perceptoresCount: new Set(filtered.map(p => p.employee_id)).size,
        perceptorIds: [...new Set(filtered.map(p => p.employee_id).filter((id): id is string => !!id))],
        baseIRPF: filtered.reduce((s, p) => s + (Number(p.base_irpf) || 0), 0),
        retencionIRPF: filtered.reduce((s, p) => s + (Number(p.retencion_irpf) || 0), 0),
        brutoPeriodo: filtered.reduce((s, p) => s + (Number(p.total_devengos) || 0), 0),
      });
    }

    // Build Modelo 145 data from employees
    const modelo145Employees: Modelo145EmployeeData[] = (employeesQuery.data ?? [])
      .filter(e => !employeeId || e.id === employeeId)
      .map(e => ({
        employeeId: e.id,
        employeeName: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
        nif: e.nif ?? undefined,
        situacionFamiliar: (e.situacion_familiar as 1 | 2 | 3) ?? undefined,
        discapacidadGrado: e.discapacidad_grado != null ? Number(e.discapacidad_grado) : undefined,
      }));

    // Detect international employees (non-Spanish nationality or non-ES residence)
    const internationalEmployees: InternationalEmployeeFlag[] = (employeesQuery.data ?? [])
      .filter(e => !employeeId || e.id === employeeId)
      .filter(e => {
        const nat = e.nationality?.toUpperCase();
        const res = e.country_of_residence?.toUpperCase();
        return (nat && nat !== 'ES' && nat !== 'ESP') || (res && res !== 'ES' && res !== 'ESP');
      })
      .map(e => ({
        employeeId: e.id,
        employeeName: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
        hostCountryCode: e.country_of_residence?.toUpperCase() ?? e.nationality?.toUpperCase() ?? 'XX',
        daysWorkedAbroad: 0, // would come from mobility data
        daysInSpain: 183, // conservative default
        annualGrossSalary: 0,
        isNonResident: (e.country_of_residence?.toUpperCase() ?? 'ES') !== 'ES',
        workEffectivelyAbroad: false,
        beneficiaryIsNonResident: false,
        spouseInSpain: true,
        dependentChildrenInSpain: false,
        mainEconomicActivitiesInSpain: true,
      }));

    // Build incident flags
    const FISCAL_TYPES = new Set(['IT', 'AT', 'MAT', 'PAT', 'ERE', 'ERTE', 'VACACIONES_NO_DISFRUTADAS', 'REGULARIZACION', 'ATRASOS']);
    const activeIncidents: ActiveIncidentFlag[] = (incidentsQuery.data ?? [])
      .filter(i => !employeeId || i.employee_id === employeeId)
      .map(i => {
        const empName = employeesQuery.data?.find(e => e.id === i.employee_id);
        return {
          employeeId: i.employee_id,
          employeeName: empName ? `${empName.first_name ?? ''} ${empName.last_name ?? ''}`.trim() : i.employee_id,
          incidentType: i.type ?? 'OTHER',
          startDate: i.start_date ?? '',
          endDate: i.end_date ?? undefined,
          affectsFiscal: FISCAL_TYPES.has(i.type ?? ''),
          affectsCotizacion: FISCAL_TYPES.has(i.type ?? ''),
          description: i.description ?? undefined,
        };
      });

    const input: FiscalSupervisorInput = {
      companyId,
      periodYear,
      periodMonth,
      payrollMonths: payrollMonths.length > 0 ? payrollMonths : undefined,
      modelo145Employees: modelo145Employees.length > 0 ? modelo145Employees : undefined,
      internationalEmployees: internationalEmployees.length > 0 ? internationalEmployees : undefined,
      activeIncidents: activeIncidents.length > 0 ? activeIncidents : undefined,
    };

    const supervisorResult = runFiscalSupervisor(input);

    // Apply status filter if provided
    if (statusFilter) {
      return {
        ...supervisorResult,
        domains: supervisorResult.domains.map(d => ({
          ...d,
          checks: d.checks.filter(c => c.status === statusFilter),
        })),
        alerts: supervisorResult.alerts.filter(a => {
          // Map alert severity to check status for filtering
          if (statusFilter === 'critical') return a.severity === 'critical';
          if (statusFilter === 'warning') return a.severity === 'warning' || a.severity === 'high';
          if (statusFilter === 'ok') return false;
          return true;
        }),
      };
    }

    return supervisorResult;
  }, [payrollQuery.data, employeesQuery.data, incidentsQuery.data, companyId, periodYear, periodMonth, employeeId, statusFilter]);

  return {
    result,
    isLoading: payrollQuery.isLoading || employeesQuery.isLoading || incidentsQuery.isLoading,
    error: payrollQuery.error?.message ?? employeesQuery.error?.message ?? incidentsQuery.error?.message ?? null,
    refetch: () => {
      payrollQuery.refetch();
      employeesQuery.refetch();
      incidentsQuery.refetch();
    },
  };
}

export default useFiscalSupervisor;
