/**
 * useS9RetributiveAudit — Hook for downstream retributive audit (S9.4)
 * Composes payroll + employees + VPT approved → audit report
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeRetributiveAudit, type VPTEnrichmentMap, type AuditEmployeeRecord } from '@/engines/erp/hr/s9ComplianceEngine';
import type { RetributiveAuditReport } from '@/types/s9-compliance';

export function useS9RetributiveAudit(companyId: string, period?: string) {
  const targetPeriod = period || new Date().toISOString().slice(0, 7);

  // Fetch employees with position
  const { data: employees, isLoading: loadingEmps } = useQuery({
    queryKey: ['s9-ret-audit-employees', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, first_name, last_name, gender, professional_category, position_id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (error) { console.error('[useS9RetributiveAudit] employees', error); return []; }
      return (data ?? []) as Array<{
        id: string; gender: string | null; professional_category: string | null; position_id: string | null;
      }>;
    },
    enabled: !!companyId,
  });

  // Fetch payrolls for period
  const { data: payrolls, isLoading: loadingPay } = useQuery({
    queryKey: ['s9-ret-audit-payrolls', companyId, targetPeriod],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_payrolls')
        .select('id, employee_id, gross_salary')
        .eq('company_id', companyId)
        .eq('period', targetPeriod)
        .in('status', ['closed', 'paid']);
      if (error) { console.error('[useS9RetributiveAudit] payrolls', error); return []; }
      return (data ?? []) as Array<{ id: string; employee_id: string; gross_salary: number }>;
    },
    enabled: !!companyId,
  });

  // Fetch approved VPT valuations
  const { data: vptValuations, isLoading: loadingVPT } = useQuery({
    queryKey: ['s9-ret-audit-vpt', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .select('position_id, total_score')
        .eq('company_id', companyId)
        .eq('status', 'approved');
      if (error) { console.error('[useS9RetributiveAudit] vpt', error); return []; }
      return (data ?? []) as Array<{ position_id: string; total_score: number }>;
    },
    enabled: !!companyId,
  });

  const report = useMemo<RetributiveAuditReport | null>(() => {
    if (!employees?.length || !payrolls?.length) return null;

    // Build VPT map
    const vptMap: VPTEnrichmentMap = {};
    for (const v of (vptValuations ?? [])) {
      vptMap[v.position_id] = Number(v.total_score);
    }

    // Build employee records
    const empMap = new Map(employees.map(e => [e.id, e]));
    const records: AuditEmployeeRecord[] = payrolls
      .filter(p => empMap.has(p.employee_id))
      .map(p => {
        const emp = empMap.get(p.employee_id)!;
        return {
          employeeId: p.employee_id,
          gender: emp.gender === 'female' ? 'F' : emp.gender === 'male' ? 'M' : (emp.gender || 'M'),
          groupOrCategory: emp.professional_category || 'Sin categoría',
          salary: p.gross_salary || 0,
          positionId: emp.position_id,
        };
      });

    if (records.length === 0) return null;
    return computeRetributiveAudit(records, vptMap, targetPeriod);
  }, [employees, payrolls, vptValuations, targetPeriod]);

  const hasVPTData = (vptValuations?.length ?? 0) > 0;

  return {
    report,
    isLoading: loadingEmps || loadingPay || loadingVPT,
    period: targetPeriod,
    hasVPTData,
    employeeCount: employees?.length ?? 0,
    payrollCount: payrolls?.length ?? 0,
    vptCount: vptValuations?.length ?? 0,
  };
}
