/**
 * useS9DisconnectionDigital — Hook for Digital Disconnection compliance
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { evaluateDisconnectionCompliance } from '@/engines/erp/hr/s9ComplianceEngine';
import type { DisconnectionMetrics, DisconnectionViolation } from '@/types/s9-compliance';

interface PolicyRow {
  id: string;
  name: string;
  policy_type: string;
  rules: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
}

interface TimeEntryRow {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
}

export function useS9DisconnectionDigital(companyId: string) {
  const { data: policies, isLoading: loadingPolicies } = useQuery({
    queryKey: ['s9-disconnection-policies', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('erp_hr_disconnection_policies')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);
      if (error) { console.error('[useS9Disconnection] policies', error); return []; }
      return (data ?? []) as PolicyRow[];
    },
    enabled: !!companyId,
  });

  const { data: timeEntries, isLoading: loadingEntries } = useQuery({
    queryKey: ['s9-disconnection-time-entries', companyId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await (supabase as any)
        .from('erp_hr_time_entries')
        .select('id, employee_id, clock_in, clock_out, date')
        .eq('company_id', companyId)
        .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
        .not('clock_out', 'is', null)
        .order('date', { ascending: false })
        .limit(500);
      if (error) { console.error('[useS9Disconnection] entries', error); return []; }
      return (data ?? []) as TimeEntryRow[];
    },
    enabled: !!companyId,
  });

  const complianceData = useMemo(() => {
    if (!policies?.length || !timeEntries?.length) {
      return {
        violations: [] as DisconnectionViolation[],
        metrics: {
          totalViolations: 0,
          employeesAffected: 0,
          averageMinutesOutside: 0,
          worstDay: null,
          complianceRate: 100,
        } as DisconnectionMetrics,
      };
    }

    // Use the first active policy as default
    const mainPolicy = policies[0];
    const rules = mainPolicy.rules || {};
    const policyForEngine = {
      id: mainPolicy.id,
      startTime: (rules as any).disconnection_start || '18:00',
      endTime: (rules as any).disconnection_end || '08:00',
    };

    const entries = timeEntries.map(te => ({
      employeeId: te.employee_id,
      date: te.date,
      clockIn: te.clock_in ? new Date(te.clock_in).toTimeString().slice(0, 5) : '09:00',
      clockOut: te.clock_out ? new Date(te.clock_out).toTimeString().slice(0, 5) : '17:00',
    }));

    return evaluateDisconnectionCompliance(policyForEngine, entries);
  }, [policies, timeEntries]);

  return {
    policies: policies ?? [],
    violations: complianceData.violations,
    metrics: complianceData.metrics,
    isLoading: loadingPolicies || loadingEntries,
  };
}
