/**
 * useWorkforceSimulation — V2-RRHH-FASE-8B
 * Connects real HR data to the workforce simulation engine.
 *
 * 8B fixes:
 * - Temporal windows for absenteeism (90 days) and turnover (12 months)
 * - Real data for variablePayTotal, benefitsCostTotal where available
 * - avgWorkingHoursWeek from contracts if available
 * - dataQuality tracking per baseline field
 * - Persistence of simulations to erp_hr_simulation_snapshots
 * - Removed phantom erp_hr_contracts from engine (now used for real hours data)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  runSimulation,
  SCENARIO_CATALOG,
  type WorkforceBaseline,
  type SimulationInput,
  type SimulationResult,
  type SimulationScenarioType,
  type DataQualityLevel,
} from '@/engines/erp/hr/workforceSimulationEngine';

export { SCENARIO_CATALOG } from '@/engines/erp/hr/workforceSimulationEngine';
export type { SimulationResult, SimulationInput, WorkforceBaseline, SimulationScenarioType, DataQualityLevel } from '@/engines/erp/hr/workforceSimulationEngine';

export function useWorkforceSimulation(companyId: string) {
  const [baseline, setBaseline] = useState<WorkforceBaseline | null>(null);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);

  // ── Fetch baseline from real data ──────────────────────────────────────

  const fetchBaseline = useCallback(async (): Promise<WorkforceBaseline | null> => {
    if (!companyId) return null;
    setIsLoadingBaseline(true);

    try {
      // 8B: temporal boundaries
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();

      // Parallel fetches
      const [empRes, payRes, leaveRes, contractRes] = await Promise.all([
        supabase
          .from('erp_hr_employees')
          .select('id, status, base_salary, hire_date, termination_date')
          .eq('company_id', companyId),
        supabase
          .from('erp_hr_payrolls')
          .select('id, gross_salary, net_salary, total_cost, status, period_month')
          .eq('company_id', companyId)
          .eq('status', 'closed')
          .order('period_month', { ascending: false })
          .limit(500),
        // 8B: windowed to last 90 days
        supabase
          .from('erp_hr_leave_requests')
          .select('id, days_requested, status, start_date')
          .eq('company_id', companyId)
          .in('status', ['approved', 'taken'])
          .gte('start_date', ninetyDaysAgo)
          .limit(500),
        // 8B: fetch employee weekly_hours if available (weekly_hours is on erp_hr_employees)
        supabase
          .from('erp_hr_employees')
          .select('id, weekly_hours')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .limit(500),
      ]);

      const employees = empRes.data || [];
      const payrolls = payRes.data || [];
      const leaves = leaveRes.data || [];
      const weeklyHoursData = contractRes.data || [];

      const active = employees.filter(e => e.status === 'active');
      const headcount = employees.length;
      const activeCount = active.length;

      // Data quality tracker
      const dataQuality: Partial<Record<keyof WorkforceBaseline, DataQualityLevel>> = {};

      // ── Salary metrics ──
      const salaries = active.map(e => e.base_salary || 0).filter(s => s > 0);
      const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
      const sortedSalaries = [...salaries].sort((a, b) => a - b);
      const medianSalary = sortedSalaries.length > 0 ? sortedSalaries[Math.floor(sortedSalaries.length / 2)] : 0;
      const totalGrossMonthly = salaries.reduce((a, b) => a + b, 0);
      dataQuality.avgSalary = salaries.length > 0 ? 'real' : 'unavailable';

      // ── Employer cost ──
      let totalEmployerMonthly = totalGrossMonthly * 1.32;
      dataQuality.totalEmployerMonthlyCost = 'estimated';
      if (payrolls.length > 0) {
        const latestPayrolls = payrolls.slice(0, activeCount);
        const payrollTotalCost = latestPayrolls.reduce((s, p) => s + (p.total_cost || 0), 0);
        if (payrollTotalCost > 0) {
          totalEmployerMonthly = payrollTotalCost;
          dataQuality.totalEmployerMonthlyCost = 'real';
        }
      }

      // ── 8B: Absenteeism with 90-day window ──
      const totalDaysLost90d = leaves.reduce((s, l) => s + (l.days_requested || 0), 0);
      const monthsInWindow = 3; // 90 days ≈ 3 months
      const totalDaysLostMonth = monthsInWindow > 0 ? Math.round(totalDaysLost90d / monthsInWindow) : 0;
      const workingDaysPerMonth = 22;
      const absenteeismRate = activeCount > 0
        ? Math.min(25, (totalDaysLostMonth / (activeCount * workingDaysPerMonth)) * 100)
        : 0;
      dataQuality.absenteeismRate = leaves.length > 0 ? 'real' : 'estimated';

      // ── 8B: Turnover with 12-month window ──
      const terminatedLast12m = employees.filter(e =>
        e.status === 'terminated' &&
        e.termination_date &&
        e.termination_date >= twelveMonthsAgo
      );
      const turnoverRate = activeCount > 0 ? (terminatedLast12m.length / activeCount) * 100 : 0;
      dataQuality.turnoverRate = terminatedLast12m.length > 0 || activeCount > 0 ? 'real' : 'estimated';

      // ── 8B: Weekly hours from contracts ──
      let avgWorkingHoursWeek = 40; // Spanish legal default
      dataQuality.avgWorkingHoursWeek = 'estimated';
      if (weeklyHoursData.length > 0) {
        const hoursValues = weeklyHoursData.map(c => c.weekly_hours).filter((h): h is number => h != null && h > 0);
        if (hoursValues.length > 0) {
          avgWorkingHoursWeek = Math.round((hoursValues.reduce((a, b) => a + b, 0) / hoursValues.length) * 10) / 10;
          dataQuality.avgWorkingHoursWeek = 'real';
        }
      }

      // ── 8B: Variable pay from payrolls (estimate from gross - base) ──
      let variablePayTotal = 0;
      dataQuality.variablePayTotal = 'unavailable';
      if (payrolls.length > 0 && salaries.length > 0) {
        const latestPayrolls = payrolls.slice(0, activeCount);
        const totalPayrollGross = latestPayrolls.reduce((s, p) => s + (p.gross_salary || 0), 0);
        const diff = totalPayrollGross - totalGrossMonthly;
        if (diff > 0) {
          variablePayTotal = Math.round(diff);
          dataQuality.variablePayTotal = 'estimated'; // inferred, not exact
        }
      }

      // Benefits: no direct source available yet
      const benefitsCostTotal = 0;
      dataQuality.benefitsCostTotal = 'unavailable';

      const bl: WorkforceBaseline = {
        headcount,
        activeEmployees: activeCount,
        totalGrossMonthlyCost: Math.round(totalGrossMonthly),
        totalEmployerMonthlyCost: Math.round(totalEmployerMonthly),
        avgSalary: Math.round(avgSalary),
        medianSalary: Math.round(medianSalary),
        absenteeismRate: Math.round(absenteeismRate * 10) / 10,
        totalDaysLostMonth,
        avgWorkingHoursWeek,
        variablePayTotal,
        benefitsCostTotal,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        companyId,
        snapshotDate: new Date().toISOString(),
        dataQuality,
      };

      setBaseline(bl);
      return bl;
    } catch (err) {
      console.error('[useWorkforceSimulation] fetchBaseline error:', err);
      toast.error('Error al cargar datos base para simulación');
      return null;
    } finally {
      setIsLoadingBaseline(false);
    }
  }, [companyId]);

  // ── Run simulation ─────────────────────────────────────────────────────

  const simulate = useCallback(async (input: SimulationInput): Promise<SimulationResult | null> => {
    let bl = baseline;
    if (!bl) {
      bl = await fetchBaseline();
    }
    if (!bl) {
      toast.error('No hay datos base disponibles para simular');
      return null;
    }

    setIsSimulating(true);
    try {
      const result = runSimulation(bl, input);
      setResults(prev => [result, ...prev].slice(0, 20));
      setAiNarrative(null);

      // 8B: persist simulation snapshot
      persistSnapshot(result).catch(err =>
        console.warn('[useWorkforceSimulation] snapshot persistence failed (non-blocking):', err)
      );

      return result;
    } catch (err) {
      console.error('[useWorkforceSimulation] simulate error:', err);
      toast.error('Error al ejecutar simulación');
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, [baseline, fetchBaseline]);

  // ── 8B: Persist snapshot ───────────────────────────────────────────────

  const persistSnapshot = useCallback(async (result: SimulationResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // NOTE: erp_hr_simulation_snapshots is NOT in generated types — table may not exist yet.
    // Cast retained as boundary: insert fails silently if table missing (non-blocking persistence).
    await (supabase.from('erp_hr_simulation_snapshots' as any) as any).insert({
      company_id: result.baseline.companyId,
      created_by: user.id,
      scenario_type: result.input.scenarioType,
      scenario_label: result.input.label,
      parameters: result.input.parameters,
      baseline_snapshot: {
        headcount: result.baseline.headcount,
        activeEmployees: result.baseline.activeEmployees,
        avgSalary: result.baseline.avgSalary,
        totalGrossMonthlyCost: result.baseline.totalGrossMonthlyCost,
        totalEmployerMonthlyCost: result.baseline.totalEmployerMonthlyCost,
        absenteeismRate: result.baseline.absenteeismRate,
        turnoverRate: result.baseline.turnoverRate,
        dataQuality: result.baseline.dataQuality,
      },
      impact_result: {
        deltaGrossMonthlyCost: result.impact.deltaGrossMonthlyCost,
        deltaEmployerMonthlyCost: result.impact.deltaEmployerMonthlyCost,
        deltaAnnualCost: result.impact.deltaAnnualCost,
        deltaHeadcount: result.impact.deltaHeadcount,
        newAvgSalary: result.impact.newAvgSalary,
        percentChangeEmployer: result.impact.percentChangeEmployer,
        operationalRisks: result.impact.operationalRisks,
      },
    });
  }, []);

  // ── AI Narrative enrichment ────────────────────────────────────────────

  const requestNarrative = useCallback(async (result: SimulationResult) => {
    setIsLoadingNarrative(true);
    setAiNarrative(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-workforce-simulation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ result }),
        },
      );

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error('Demasiadas solicitudes. Intenta más tarde.');
          return;
        }
        if (resp.status === 402) {
          toast.error('Créditos de IA insuficientes.');
          return;
        }
        if (resp.status === 403) {
          toast.error('Sin acceso a esta empresa para simulación.');
          return;
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error('No stream body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let narrative = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              narrative += content;
              setAiNarrative(narrative);
            }
          } catch { /* partial JSON */ }
        }
      }

      if (!narrative) setAiNarrative('No se pudo generar análisis narrativo.');
    } catch (err) {
      console.error('[useWorkforceSimulation] narrative error:', err);
      toast.error('Error al generar análisis IA');
    } finally {
      setIsLoadingNarrative(false);
    }
  }, []);

  // ── Clear ──────────────────────────────────────────────────────────────

  const clearResults = useCallback(() => {
    setResults([]);
    setAiNarrative(null);
  }, []);

  return {
    baseline,
    results,
    isLoadingBaseline,
    isSimulating,
    aiNarrative,
    isLoadingNarrative,
    fetchBaseline,
    simulate,
    requestNarrative,
    clearResults,
    scenarioCatalog: SCENARIO_CATALOG,
  };
}
