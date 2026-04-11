/**
 * usePayrollPreflight — P1.7
 * Aggregates data from existing hooks/engines to feed payrollPreflightEngine.
 * Zero new business logic — pure aggregation layer.
 */
import { useMemo, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildPreflightResult, type PreflightInput, type PreflightResult } from '@/engines/erp/hr/payrollPreflightEngine';

export interface UsePayrollPreflightReturn {
  preflight: PreflightResult | null;
  isLoading: boolean;
  evaluate: (periodId?: string) => Promise<void>;
}

export function usePayrollPreflight(companyId: string): UsePayrollPreflightReturn {
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const evaluate = useCallback(async (periodId?: string) => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Fetch period + incidents + run status in parallel
      const [periodRes, incidentRes, runsRes, terminationRes] = await Promise.all([
        supabase
          .from('erp_hr_payroll_periods' as any)
          .select('id, status, metadata')
          .eq('company_id', companyId)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('erp_hr_incidents' as any)
          .select('id, status')
          .eq('company_id', companyId)
          .limit(500),
        supabase
          .from('erp_hr_payroll_runs' as any)
          .select('id, status')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('erp_hr_employees' as any)
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'terminated'),
      ]);

      const period = periodRes.data as any;
      const incidents = (incidentRes.data || []) as any[];
      const latestRun = runsRes.data as any;
      const hasTerminations = (terminationRes.count ?? 0) > 0;

      // Derive incident counts
      const incidentCounts = {
        total: incidents.length,
        pending: incidents.filter((i: any) => i.status === 'pending').length,
        validated: incidents.filter((i: any) => i.status === 'validated').length,
        applied: incidents.filter((i: any) => i.status === 'applied').length,
      };

      // Check artifacts from metadata or defaults
      const meta = (period?.metadata || {}) as any;

      const input: PreflightInput = {
        periodStatus: period?.status || 'draft',
        incidentCounts,
        latestRunStatus: latestRun?.status || null,
        preCloseBlockers: meta.pre_close_blockers ?? 0,
        preCloseWarnings: meta.pre_close_warnings ?? 0,
        paymentPhase: meta.payment_phase || 'not_applicable',

        // SS — derive from metadata flags
        fanGenerated: !!meta.fan_generated,
        fanSubmitted: !!meta.fan_submitted,
        rlcConfirmed: !!meta.rlc_confirmed,
        rntConfirmed: !!meta.rnt_confirmed,
        craGenerated: !!meta.cra_generated,
        craSubmitted: !!meta.cra_submitted,
        ssAllConfirmed: !!meta.ss_all_confirmed,

        // Fiscal
        modelo145Updated: !!meta.modelo145_updated,
        irpfCalculated: !!meta.irpf_calculated,
        modelo111Generated: !!meta.modelo111_generated,
        modelo111Submitted: !!meta.modelo111_submitted,
        modelo190Generated: !!meta.modelo190_generated,

        // Archive
        closurePackageCreated: !!meta.closure_package_created,

        // Offboarding
        hasTerminations,
        terminationBajaCompleted: !!meta.termination_baja_completed,
        terminationAFICompleted: !!meta.termination_afi_completed,
        terminationFiniquitoCompleted: !!meta.termination_finiquito_completed,
        terminationCertificadoCompleted: !!meta.termination_certificado_completed,

        // Regulatory deadlines (simplified — real data from regulatory calendar)
        regulatoryDeadlines: buildDefaultDeadlines(now),
        now,
      };

      const result = buildPreflightResult(input);
      setPreflight(result);
    } catch (err) {
      console.error('[usePayrollPreflight] error:', err);
      // Return minimal result on error
      const fallbackInput: PreflightInput = {
        periodStatus: 'draft',
        incidentCounts: { total: 0, pending: 0, validated: 0, applied: 0 },
        latestRunStatus: null,
        preCloseBlockers: 0, preCloseWarnings: 0,
        paymentPhase: 'not_applicable',
        fanGenerated: false, fanSubmitted: false,
        rlcConfirmed: false, rntConfirmed: false,
        craGenerated: false, craSubmitted: false, ssAllConfirmed: false,
        modelo145Updated: false, irpfCalculated: false,
        modelo111Generated: false, modelo111Submitted: false, modelo190Generated: false,
        closurePackageCreated: false,
        hasTerminations: false,
        regulatoryDeadlines: [],
        now: new Date(),
      };
      setPreflight(buildPreflightResult(fallbackInput));
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  return { preflight, isLoading, evaluate };
}

/** Default regulatory deadlines based on Spanish normative calendar */
function buildDefaultDeadlines(now: Date): PreflightInput['regulatoryDeadlines'] {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed = previous month's deadlines
  const nextMonth = month + 1; // current period deadlines

  return [
    {
      id: 'tgss_cotizacion',
      label: 'Cotización TGSS (último día hábil)',
      deadline: new Date(year, nextMonth, 0).toISOString().split('T')[0], // last day of current month
      domain: 'ss_bases',
    },
    {
      id: 'modelo_111',
      label: 'Modelo 111 (día 20)',
      deadline: `${year}-${String(nextMonth + 1).padStart(2, '0')}-20`,
      domain: 'irpf_111',
    },
  ];
}
