/**
 * useS9SalaryRegister — Hook for RD 902/2020 Salary Register
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateSalaryRegisterData } from '@/engines/erp/hr/s9ComplianceEngine';
import type { SalaryRegisterReport } from '@/types/s9-compliance';

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
}

export function useS9SalaryRegister(companyId: string, period?: string) {
  const targetPeriod = period || new Date().toISOString().slice(0, 7);

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['s9-salary-register-employees', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, first_name, last_name, gender, professional_category')
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

  return {
    report,
    isLoading: loadingEmployees || loadingPayrolls,
    period: targetPeriod,
    employeeCount: employees?.length ?? 0,
    payrollCount: payrolls?.length ?? 0,
  };
}
