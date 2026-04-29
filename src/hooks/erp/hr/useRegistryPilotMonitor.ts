/**
 * B10F.5 — Read-only hook for the registry pilot monitor.
 *
 * Hard rules:
 *  - Read-only. NO writes. Only the `list_decisions` action of the
 *    edge `erp-hr-pilot-runtime-decision-log` is invoked.
 *  - Does NOT import payroll bridge, salary resolver, normalizer,
 *    payroll engine, payslip engine, agreement safety gate, or the
 *    shadow flag module.
 *  - Does NOT mutate `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
 *    `HR_REGISTRY_PILOT_MODE`, or `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
 *  - Does NOT touch the operative table `erp_hr_collective_agreements`.
 *  - Does NOT use service-role.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authSafeInvoke } from './_authSafeInvoke';
import {
  HR_REGISTRY_PILOT_MODE,
  REGISTRY_PILOT_SCOPE_ALLOWLIST,
  type RegistryPilotScope,
} from '@/engines/erp/hr/registryPilotGate';

export interface PilotDecisionLogRow {
  id: string;
  company_id: string;
  employee_id: string;
  contract_id: string;
  target_year: number;
  runtime_setting_id: string | null;
  mapping_id: string | null;
  registry_agreement_id: string | null;
  registry_version_id: string | null;
  decision_outcome: 'pilot_applied' | 'pilot_blocked' | 'pilot_fallback';
  decision_reason: string;
  comparison_summary_json: unknown;
  blockers_json: unknown;
  warnings_json: unknown;
  trace_json: unknown;
  decided_by: string | null;
  decided_at: string;
  signature_hash: string;
  created_at: string;
}

export interface RegistryPilotMonitorFilters {
  companyId?: string;
  employeeId?: string;
  contractId?: string;
  targetYear?: number;
  limit?: number;
}

export interface RegistryPilotMonitorSummary {
  applied: number;
  blocked: number;
  fallback: number;
  total: number;
}

export interface UseRegistryPilotMonitorResult {
  globalFlag: false;
  pilotMode: false;
  allowlist: readonly RegistryPilotScope[];
  logs: PilotDecisionLogRow[];
  summary: RegistryPilotMonitorSummary;
  loading: boolean;
  error: string | null;
  authRequired: boolean;
  refresh: (filters?: RegistryPilotMonitorFilters) => Promise<void>;
}

function summarize(logs: PilotDecisionLogRow[]): RegistryPilotMonitorSummary {
  let applied = 0;
  let blocked = 0;
  let fallback = 0;
  for (const l of logs) {
    if (l.decision_outcome === 'pilot_applied') applied++;
    else if (l.decision_outcome === 'pilot_blocked') blocked++;
    else if (l.decision_outcome === 'pilot_fallback') fallback++;
  }
  return { applied, blocked, fallback, total: logs.length };
}

export function useRegistryPilotMonitor(
  initialFilters?: RegistryPilotMonitorFilters,
): UseRegistryPilotMonitorResult {
  const [logs, setLogs] = useState<PilotDecisionLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async (filters?: RegistryPilotMonitorFilters) => {
    const f = filters ?? initialFilters;
    if (!f?.companyId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await authSafeInvoke<{ decisions?: PilotDecisionLogRow[] } | PilotDecisionLogRow[]>(
        'erp-hr-pilot-runtime-decision-log',
        {
          action: 'list_decisions',
          companyId: f.companyId,
          employeeId: f.employeeId,
          contractId: f.contractId,
          targetYear: f.targetYear,
          limit: f.limit ?? 50,
        },
      );
      if (r.success === false) {
        if (r.reason === 'auth_required') {
          setAuthRequired(true);
          setLogs([]);
          setError(null);
          return;
        }
        setAuthRequired(false);
        setError(r.error.code === 'UNAUTHORIZED' ? 'unauthorized' : 'list_decisions_failed');
        setLogs([]);
        return;
      }
      setAuthRequired(false);
      const payload = r.data as unknown;
      const rows = (payload && typeof payload === 'object' && 'decisions' in (payload as Record<string, unknown>)
        ? (payload as { decisions: PilotDecisionLogRow[] }).decisions
        : []) ?? [];
      setLogs(Array.isArray(rows) ? rows : []);
    } catch {
      setError('list_decisions_failed');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [initialFilters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    globalFlag: false,
    pilotMode: HR_REGISTRY_PILOT_MODE,
    allowlist: REGISTRY_PILOT_SCOPE_ALLOWLIST,
    logs,
    summary: summarize(logs),
    loading,
    error,
    authRequired,
    refresh,
  };
}

export default useRegistryPilotMonitor;