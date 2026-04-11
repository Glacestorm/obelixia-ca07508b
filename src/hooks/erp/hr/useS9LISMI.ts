/**
 * useS9LISMI — Hook for LISMI/LGD disability quota compliance
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeLISMIQuota, ALTERNATIVE_MEASURE_LABELS } from '@/engines/erp/hr/s9ComplianceEngine';
import type { LISMIQuotaResult, AlternativeMeasure } from '@/types/s9-compliance';

interface EmployeeDisabilityRow {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  disability_percentage: number | null;
  work_center_id: string | null;
}

export function useS9LISMI(companyId: string) {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['s9-lismi-employees', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_employees')
        .select('id, first_name, last_name, status, disability_percentage, work_center_id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (error) { console.error('[useS9LISMI]', error); return []; }
      return (data ?? []) as EmployeeDisabilityRow[];
    },
    enabled: !!companyId,
  });

  const quota = useMemo<LISMIQuotaResult>(() => {
    if (!employees) return computeLISMIQuota(0, 0);
    const total = employees.length;
    const disabled = employees.filter(e => (e.disability_percentage ?? 0) >= 33).length;
    return computeLISMIQuota(total, disabled);
  }, [employees]);

  const disabledEmployees = useMemo(() => {
    return (employees ?? []).filter(e => (e.disability_percentage ?? 0) >= 33);
  }, [employees]);

  const byWorkCenter = useMemo(() => {
    if (!employees) return [];
    const map = new Map<string, { total: number; disabled: number }>();
    for (const e of employees) {
      const wc = e.work_center_id || 'sin_centro';
      if (!map.has(wc)) map.set(wc, { total: 0, disabled: 0 });
      const g = map.get(wc)!;
      g.total++;
      if ((e.disability_percentage ?? 0) >= 33) g.disabled++;
    }
    return Array.from(map.entries()).map(([wcId, data]) => ({
      workCenterId: wcId,
      ...data,
      quota: computeLISMIQuota(data.total, data.disabled),
    }));
  }, [employees]);

  return {
    quota,
    disabledEmployees,
    byWorkCenter,
    isLoading,
    alternativeMeasureLabels: ALTERNATIVE_MEASURE_LABELS,
  };
}
