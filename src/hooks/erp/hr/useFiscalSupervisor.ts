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
import type { PayrollPeriodFiscalData } from '@/engines/erp/hr/fiscalReconciliationEngine';
import type { Modelo145EmployeeData } from '@/engines/erp/hr/modelo145ValidationEngine';

export interface FiscalSupervisorFilters {
  companyId: string;
  periodYear: number;
  periodMonth: number;
  employeeId?: string;
  statusFilter?: FiscalCheckStatus;
}

export function useFiscalSupervisor(filters: FiscalSupervisorFilters) {
  const { companyId, periodYear, periodMonth, employeeId, statusFilter } = filters;

  // ─── Fetch payroll data (real columns: gross_salary, irpf_amount, irpf_percentage) ───
  const payrollQuery = useQuery({
    queryKey: ['fiscal-supervisor-payroll', companyId, periodYear, periodMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_payrolls')
        .select('id, employee_id, period_month, period_year, gross_salary, irpf_amount, irpf_percentage, status')
        .eq('company_id', companyId)
        .eq('period_year', periodYear)
        .eq('status', 'closed');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Fetch employees (real columns: national_id, nationality, tax_residence_country, disability_percentage) ───
  const employeesQuery = useQuery({
    queryKey: ['fiscal-supervisor-employees', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, national_id, nationality, tax_residence_country, disability_percentage, status')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 120_000,
  });

  // ─── Fetch IT processes (incidents with fiscal impact) ───
  const itProcessesQuery = useQuery({
    queryKey: ['fiscal-supervisor-it', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_hr_it_processes')
        .select('id, employee_id, process_type, start_date, end_date, status, notes')
        .eq('company_id', companyId)
        .in('status', ['active', 'confirmed', 'pending']);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Fetch payroll incidents (atrasos, regularizaciones, vacaciones, etc.) ───
  const payrollIncidentsQuery = useQuery({
    queryKey: ['fiscal-supervisor-payroll-incidents', companyId, periodYear, periodMonth],
    queryFn: async () => {
      let q = supabase
        .from('erp_hr_payroll_incidents')
        .select('id, employee_id, incident_type, concept_code, tributa_irpf, cotiza_ss, amount, description, status, applies_from, applies_to, period_month, period_year')
        .eq('company_id', companyId)
        .in('status', ['pending', 'validated', 'applied']);

      if (periodYear) q = q.eq('period_year', periodYear);
      if (periodMonth) q = q.eq('period_month', periodMonth);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Transform & run engine ───────────────────────────────
  const result = useMemo((): FiscalSupervisorResult | null => {
    if (!payrollQuery.data) return null;

    // Group payrolls by month
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

      // Use gross_salary as base IRPF, irpf_amount as retención
      payrollMonths.push({
        periodYear,
        periodMonth: month,
        perceptoresCount: new Set(filtered.map(p => p.employee_id)).size,
        perceptorIds: [...new Set(filtered.map(p => p.employee_id))],
        baseIRPF: filtered.reduce((s, p) => s + (Number(p.gross_salary) || 0), 0),
        retencionIRPF: filtered.reduce((s, p) => s + (Number(p.irpf_amount) || 0), 0),
        brutoPeriodo: filtered.reduce((s, p) => s + (Number(p.gross_salary) || 0), 0),
      });
    }

    // Build Modelo 145 data from employees
    const employees = employeesQuery.data ?? [];
    const modelo145Employees: Modelo145EmployeeData[] = employees
      .filter(e => !employeeId || e.id === employeeId)
      .map(e => ({
        employeeId: e.id,
        employeeName: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
        nif: e.national_id ?? undefined,
        discapacidadGrado: e.disability_percentage != null ? Number(e.disability_percentage) : undefined,
      }));

    // Detect international employees
    const internationalEmployees: InternationalEmployeeFlag[] = employees
      .filter(e => !employeeId || e.id === employeeId)
      .filter(e => {
        const nat = e.nationality?.toUpperCase();
        const res = e.tax_residence_country?.toUpperCase();
        return (nat && nat !== 'ES' && nat !== 'ESP') || (res && res !== 'ES' && res !== 'ESP' && !!res);
      })
      .map(e => ({
        employeeId: e.id,
        employeeName: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
        hostCountryCode: e.tax_residence_country?.toUpperCase() ?? e.nationality?.toUpperCase() ?? 'XX',
        daysWorkedAbroad: 0,
        daysInSpain: 183,
        annualGrossSalary: 0,
        isNonResident: (e.tax_residence_country?.toUpperCase() ?? 'ES') !== 'ES',
        workEffectivelyAbroad: false,
        beneficiaryIsNonResident: false,
        spouseInSpain: true,
        dependentChildrenInSpain: false,
        mainEconomicActivitiesInSpain: true,
      }));

    // Build incident flags from IT processes
    const itIncidents: ActiveIncidentFlag[] = (itProcessesQuery.data ?? [])
      .filter(i => !employeeId || i.employee_id === employeeId)
      .map(i => {
        const emp = employees.find(e => e.id === i.employee_id);
        return {
          employeeId: i.employee_id,
          employeeName: emp ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() : i.employee_id,
          incidentType: i.process_type ?? 'OTHER',
          startDate: i.start_date ?? '',
          endDate: i.end_date ?? undefined,
          affectsFiscal: true,
          affectsCotizacion: true,
          description: i.notes ?? undefined,
        };
      });

    // Build incident flags from payroll incidents (atrasos, regularizaciones, vacaciones, etc.)
    const payrollIncidents: ActiveIncidentFlag[] = (payrollIncidentsQuery.data ?? [])
      .filter(i => !employeeId || i.employee_id === employeeId)
      .filter(i => i.tributa_irpf || i.cotiza_ss)
      .map(i => {
        const emp = employees.find(e => e.id === i.employee_id);
        return {
          employeeId: i.employee_id,
          employeeName: emp ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() : i.employee_id,
          incidentType: i.incident_type ?? i.concept_code ?? 'PAYROLL_INCIDENT',
          startDate: i.applies_from ?? '',
          endDate: i.applies_to ?? undefined,
          affectsFiscal: !!i.tributa_irpf,
          affectsCotizacion: !!i.cotiza_ss,
          description: i.description ?? undefined,
        };
      });

    // Merge both incident sources
    const activeIncidents = [...itIncidents, ...payrollIncidents];

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

    // Apply status filter
    if (statusFilter) {
      return {
        ...supervisorResult,
        domains: supervisorResult.domains.map(d => ({
          ...d,
          checks: d.checks.filter(c => c.status === statusFilter),
        })),
        alerts: supervisorResult.alerts.filter(a => {
          if (statusFilter === 'critical') return a.severity === 'critical';
          if (statusFilter === 'warning') return a.severity === 'warning' || a.severity === 'high';
          if (statusFilter === 'ok') return false;
          return true;
        }),
      };
    }

    return supervisorResult;
  }, [payrollQuery.data, employeesQuery.data, itProcessesQuery.data, payrollIncidentsQuery.data, companyId, periodYear, periodMonth, employeeId, statusFilter]);

  return {
    result,
    isLoading: payrollQuery.isLoading || employeesQuery.isLoading || itProcessesQuery.isLoading || payrollIncidentsQuery.isLoading,
    error: payrollQuery.error?.message ?? employeesQuery.error?.message ?? itProcessesQuery.error?.message ?? payrollIncidentsQuery.error?.message ?? null,
    refetch: () => {
      payrollQuery.refetch();
      employeesQuery.refetch();
      itProcessesQuery.refetch();
      payrollIncidentsQuery.refetch();
    },
  };
}

export default useFiscalSupervisor;
