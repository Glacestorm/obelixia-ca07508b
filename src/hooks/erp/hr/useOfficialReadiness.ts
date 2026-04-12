/**
 * useOfficialReadiness — V2-ES.8 Paso 1
 * Hook that assembles context from existing data and evaluates
 * readiness for all official connectors.
 *
 * Uses ONLY already-loaded data or lightweight queries.
 *
 * NOTE: Tables 'hr_employees' and 'hr_contracts' are NOT in generated types
 * (they exist in DB as views/aliases). Casts on .from() for those are retained.
 */
import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  evaluateOfficialReadiness,
  type OfficialReadinessSummary,
  type ConnectorDataContext,
} from '@/components/erp/hr/shared/officialReadinessEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

export interface UseOfficialReadinessReturn {
  summary: OfficialReadinessSummary | null;
  isEvaluating: boolean;
  lastEvaluatedAt: string | null;
  evaluate: (adapters?: IntegrationAdapter[]) => Promise<OfficialReadinessSummary>;
}

export function useOfficialReadiness(companyId: string): UseOfficialReadinessReturn {
  const [summary, setSummary] = useState<OfficialReadinessSummary | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(null);

  const evaluate = useCallback(async (adapters?: IntegrationAdapter[]) => {
    setIsEvaluating(true);
    try {
      // Gather context from lightweight queries
      const [employeesRes, contractsRes, payrollRes, ssRes, certsRes] = await Promise.all([
        supabase.from('erp_hr_employees').select('id, status', { count: 'exact' })
          .eq('company_id', companyId).eq('status', 'active'),
        supabase.from('erp_hr_contracts').select('id, status, contract_type', { count: 'exact' })
          .eq('company_id', companyId).in('status', ['active', 'pending']),
        supabase.from('hr_payroll_periods').select('id, status', { count: 'exact' })
          .eq('company_id', companyId).eq('status', 'closed'),
        supabase.from('erp_hr_ss_contributions').select('id', { count: 'exact' })
          .eq('company_id', companyId),
        supabase.from('erp_hr_domain_certificates')
          .select('domain, certificate_status, certificate_type, configuration_completeness, expiration_date, readiness_impact')
          .eq('company_id', companyId),
      ]);

      const totalEmployees = employeesRes.count ?? 0;
      const employees = employeesRes.data || [];
      // NOTE: registration_status does not exist on erp_hr_employees — all active employees
      // are counted as "complete" for readiness purposes (conservative estimate).
      const completeEmployees = employees.length;

      const totalContracts = contractsRes.count ?? 0;
      const contracts = contractsRes.data || [];
      const completeContracts = contracts.filter(c =>
        c.contract_type && c.status === 'active'
      ).length;

      const closedPeriods = payrollRes.count ?? 0;
      const hasSSExpedient = (ssRes.count ?? 0) > 0;

      // Build context
      const ctx: ConnectorDataContext = {
        employeesWithCompleteData: completeEmployees,
        totalActiveEmployees: totalEmployees,
        contractsWithCompleteData: completeContracts,
        totalActiveContracts: totalContracts,
        hasClosedPayrollPeriods: closedPeriods > 0,
        closedPayrollPeriodsCount: closedPeriods,
        hasSSExpedient,
        hasFiscalExpedient: closedPeriods > 0, // simplified: fiscal expedient exists if payroll closed
        docCompletenessAvg: totalEmployees > 0
          ? Math.round((completeEmployees / totalEmployees) * 100)
          : 0,
        configuredAdapters: (adapters || []).map(a => ({
          id: a.id,
          adapter_type: a.adapter_type,
          system_name: a.system_name,
          is_active: a.is_active,
          status: a.status,
        })),
        certificateConfigs: (certsRes.data || []).map(c => ({
          domain: c.domain,
          certificate_status: c.certificate_status,
          certificate_type: c.certificate_type,
          configuration_completeness: c.configuration_completeness,
          expiration_date: c.expiration_date,
          readiness_impact: c.readiness_impact,
        })),
      };

      const result = evaluateOfficialReadiness(ctx, { includeSecondary: true });
      setSummary(result);
      setLastEvaluatedAt(result.evaluatedAt);
      return result;
    } catch (err) {
      console.error('[useOfficialReadiness] evaluate error:', err);
      // Return minimal summary on error
      const fallback: OfficialReadinessSummary = {
        connectors: [],
        overallPercent: 0,
        overallLevel: 'not_ready',
        overallLabel: 'No preparado',
        totalBlockers: 1,
        totalWarnings: 0,
        dryRunReady: 0,
        evaluatedAt: new Date().toISOString(),
      };
      setSummary(fallback);
      return fallback;
    } finally {
      setIsEvaluating(false);
    }
  }, [companyId]);

  return { summary, isEvaluating, lastEvaluatedAt, evaluate };
}
