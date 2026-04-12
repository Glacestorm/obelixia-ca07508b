/**
 * usePayrollPreflight — P1.7C
 * Aggregates data from existing hooks/engines to feed payrollPreflightEngine.
 * Zero new business logic — pure aggregation layer.
 *
 * P1.7C: dynamic deadlines via regulatoryCalendarEngine, last-mile readiness, periodId context.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildPreflightResult,
  type PreflightInput,
  type PreflightResult,
  type LastMileStepStatus,
} from '@/engines/erp/hr/payrollPreflightEngine';
import {
  computeRegulatoryCalendar,
  type RegulatoryCalendarContext,
} from '@/components/erp/hr/shared/regulatoryCalendarEngine';
import { EMPTY_CALENDAR } from '@/engines/erp/hr/calendarHelpers';

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

      // Fetch period + incidents + run status + terminations + active employees in parallel
      // NOTE: erp_hr_incidents does NOT exist in DB — query always returns null/empty.
      // Cast retained because table is planned but not yet created. Fails silently.
      const [periodRes, incidentRes, runsRes, terminationRes, activeEmpRes, contractsRes] = await Promise.all([
        supabase
          .from('hr_payroll_periods')
          .select('id, status, metadata')
          .eq('company_id', companyId)
          .order('fiscal_year', { ascending: false })
          .order('period_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase.from('erp_hr_incidents' as any) as any)
          .select('id, status')
          .eq('company_id', companyId)
          .limit(500),
        supabase
          .from('erp_hr_payroll_runs')
          .select('id, status')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('erp_hr_employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'terminated'),
        supabase
          .from('erp_hr_employees')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active'),
        supabase
          .from('erp_hr_contracts')
          .select('id, status, start_date, end_date')
          .eq('company_id', companyId)
          .eq('status', 'active'),
      ]);

      // periodRes now returns typed hr_payroll_periods row

      const period = periodRes.data;
      const resolvedPeriodId = periodId || period?.id;
      const incidents = (incidentRes.data || []) as Array<{ id: string; status: string }>;
      const latestRun = runsRes.data;
      const hasTerminations = (terminationRes.count ?? 0) > 0;
      const hasActiveEmployees = (activeEmpRes.count ?? 0) > 0;
      const contracts = contractsRes.data || [];

      // Derive incident counts
      const incidentCounts = {
        total: incidents.length,
        pending: incidents.filter(i => i.status === 'pending').length,
        validated: incidents.filter(i => i.status === 'validated').length,
        applied: incidents.filter(i => i.status === 'applied').length,
      };

      // Check artifacts from metadata
      const meta = (period?.metadata || {}) as any;

      // ── Dynamic deadlines via regulatoryCalendarEngine ──
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Contracts expiring within 30 days
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const expiring = contracts.filter(c => {
        if (!c.end_date) return false;
        const end = new Date(c.end_date);
        return end >= now && end <= thirtyDaysLater;
      });

      // Recent contracts for pending communications
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const recentContracts = contracts.filter(c => {
        if (!c.start_date) return false;
        const start = new Date(c.start_date);
        return start >= fifteenDaysAgo && start <= now;
      });

      const calendarCtx: RegulatoryCalendarContext = {
        now,
        holidays: EMPTY_CALENDAR,
        hasActiveEmployees,
        currentPeriod,
        pendingContractCommunications: recentContracts.length,
        earliestPendingContractDate: recentContracts.length > 0
          ? recentContracts.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0].start_date
          : undefined,
        contractsExpiringSoon: expiring.length,
        earliestExpirationDate: expiring.length > 0
          ? expiring.sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())[0].end_date ?? undefined
          : undefined,
        fiscalYear: now.getFullYear(),
        closedPayrollPeriodsCount: 0,
      };

      const calendarResult = computeRegulatoryCalendar(calendarCtx);

      // Map regulatory deadlines to preflight format
      const regulatoryDeadlines = calendarResult.deadlines.map(d => ({
        id: d.id,
        label: d.label,
        deadline: d.deadlineDate.toISOString().split('T')[0],
        domain: mapRegDomainToStepDomain(d.domain),
        regulatoryBasis: d.regulatoryBasis,
      }));

      // ── Last-mile readiness (best-effort from metadata) ──
      const lastMileReadiness: Record<string, LastMileStepStatus> = {};
      const lmMeta = meta.last_mile_readiness as Record<string, any> | undefined;
      if (lmMeta) {
        for (const [key, val] of Object.entries(lmMeta)) {
          if (val && typeof val === 'object') {
            lastMileReadiness[key] = {
              handoff: val.handoff || 'unknown',
              format: val.format || 'unknown',
              credential: val.credential || 'unknown',
              sandbox: val.sandbox || 'unknown',
            };
          }
        }
      }

      const input: PreflightInput = {
        periodStatus: period?.status || 'draft',
        periodId: resolvedPeriodId,
        incidentCounts,
        latestRunStatus: latestRun?.status || null,
        preCloseBlockers: meta.pre_close_blockers ?? 0,
        preCloseWarnings: meta.pre_close_warnings ?? 0,
        paymentPhase: meta.payment_phase || 'not_applicable',

        // SS
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

        // Dynamic deadlines
        regulatoryDeadlines,
        lastMileReadiness: Object.keys(lastMileReadiness).length > 0 ? lastMileReadiness : undefined,
        now,
      };

      const result = buildPreflightResult(input);
      setPreflight(result);
    } catch (err) {
      console.error('[usePayrollPreflight] error:', err);
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

/** Map regulatory calendar domains to preflight step domains */
function mapRegDomainToStepDomain(domain: string): string {
  switch (domain) {
    case 'tgss_siltra': return 'ss_bases';
    case 'contrata_sepe': return 'ss_confirmation';
    case 'aeat': return 'irpf_111';
    default: return domain;
  }
}
