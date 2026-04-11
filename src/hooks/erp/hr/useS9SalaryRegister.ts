/**
 * useS9SalaryRegister — Hook for RD 902/2020 Salary Register
 * Supports optional VPT enrichment (S9.4)
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateSalaryRegisterData, generateVPTEnrichedRegister, type VPTEnrichmentMap, type EnrichedPayrollRecord } from '@/engines/erp/hr/s9ComplianceEngine';
import type { SalaryRegisterReport, VPTEnrichedSalaryReport } from '@/types/s9-compliance';

interface PayrollRow {
  id: string;
  employee_id: string;
  period: string;
  gross_salary: number;
  base_salary: number;
  status: string;
}

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  professional_category: string | null;
  position_id?: string | null;
}

export function useS9SalaryRegister(companyId: string, period?: string, enableVPT = false) {
  const targetPeriod = period || new Date().toISOString().slice(0, 7);

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['s9-salary-register-employees', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, first_name, last_name, gender, professional_category, position_id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (error) { console.error('[useS9SalaryRegister] employees', error); return []; }
      return (data ?? []) as EmployeeRow[];
    },
    enabled: !!companyId,
  });

  const { data: payrolls, isLoading: loadingPayrolls } = useQuery({
    queryKey: ['s9-salary-register-payrolls', companyId, targetPeriod],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_payrolls')
        .select('id, employee_id, period, gross_salary, base_salary, status')
        .eq('company_id', companyId)
        .eq('period', targetPeriod)
        .in('status', ['closed', 'paid']);
      if (error) { console.error('[useS9SalaryRegister] payrolls', error); return []; }
      return (data ?? []) as PayrollRow[];
    },
    enabled: !!companyId,
  });

  // VPT data — only fetched when enrichment is enabled
  const { data: vptValuations, isLoading: loadingVPT } = useQuery({
    queryKey: ['s9-salary-register-vpt', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .select('position_id, total_score')
        .eq('company_id', companyId)
        .eq('status', 'approved');
      if (error) { console.error('[useS9SalaryRegister] vpt', error); return []; }
      return (data ?? []) as Array<{ position_id: string; total_score: number }>;
    },
    enabled: !!companyId && enableVPT,
  });

  const report = useMemo<SalaryRegisterReport | null>(() => {
    if (!employees?.length || !payrolls?.length) return null;

    const empMap = new Map(employees.map(e => [e.id, e]));
    const records = payrolls
      .filter(p => empMap.has(p.employee_id))
      .map(p => {
        const emp = empMap.get(p.employee_id)!;
        return {
          employeeId: p.employee_id,
          gender: emp.gender === 'female' ? 'F' : emp.gender === 'male' ? 'M' : (emp.gender || 'M'),
          groupOrCategory: emp.professional_category || 'Sin categoría',
          concept: 'Salario bruto',
          amount: p.gross_salary || 0,
        };
      });

    if (records.length === 0) return null;
    return generateSalaryRegisterData(records, targetPeriod);
  }, [employees, payrolls, targetPeriod]);

  // VPT-enriched report (only when enableVPT is true)
  const vptReport = useMemo<VPTEnrichedSalaryReport | null>(() => {
    if (!enableVPT || !employees?.length || !payrolls?.length) return null;

    const empMap = new Map(employees.map(e => [e.id, e]));
    const records: EnrichedPayrollRecord[] = payrolls
      .filter(p => empMap.has(p.employee_id))
      .map(p => {
        const emp = empMap.get(p.employee_id)!;
        return {
          employeeId: p.employee_id,
          gender: emp.gender === 'female' ? 'F' : emp.gender === 'male' ? 'M' : (emp.gender || 'M'),
          groupOrCategory: emp.professional_category || 'Sin categoría',
          concept: 'Salario bruto',
          amount: p.gross_salary || 0,
          positionId: emp.position_id,
        };
      });

    if (records.length === 0) return null;

    const vptMap: VPTEnrichmentMap = {};
    for (const v of (vptValuations ?? [])) {
      vptMap[v.position_id] = Number(v.total_score);
    }

    return generateVPTEnrichedRegister(records, targetPeriod, vptMap);
  }, [enableVPT, employees, payrolls, vptValuations, targetPeriod]);

  return {
    report,
    vptReport,
    isLoading: loadingEmployees || loadingPayrolls || (enableVPT && loadingVPT),
    period: targetPeriod,
    employeeCount: employees?.length ?? 0,
    payrollCount: payrolls?.length ?? 0,
    hasVPTData: (vptValuations?.length ?? 0) > 0,
  };
}
