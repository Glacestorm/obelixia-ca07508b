/**
 * useWorkforceSimulation — V2-RRHH-FASE-8
 * Connects real HR data to the workforce simulation engine.
 * Fetches baseline from erp_hr_employees + erp_hr_payrolls + erp_hr_leave_requests,
 * runs deterministic simulations, and optionally calls AI for narrative enrichment.
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
} from '@/engines/erp/hr/workforceSimulationEngine';

export { SCENARIO_CATALOG } from '@/engines/erp/hr/workforceSimulationEngine';
export type { SimulationResult, SimulationInput, WorkforceBaseline, SimulationScenarioType } from '@/engines/erp/hr/workforceSimulationEngine';

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
      // Parallel fetches for employees, payroll, and leave requests
      const [empRes, payRes, leaveRes] = await Promise.all([
        supabase
          .from('erp_hr_employees')
          .select('id, status, base_salary, hire_date')
          .eq('company_id', companyId),
        supabase
          .from('erp_hr_payrolls')
          .select('id, gross_salary, net_salary, total_cost, status')
          .eq('company_id', companyId)
          .eq('status', 'closed')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('erp_hr_leave_requests')
          .select('id, days_requested, status')
          .eq('company_id', companyId)
          .in('status', ['approved', 'taken'])
          .limit(300),
      ]);

      const employees = empRes.data || [];
      const payrolls = (payRes.data || []) as any[];
      const leaves = (leaveRes.data || []) as any[];

      const active = employees.filter(e => e.status === 'active');
      const headcount = employees.length;
      const activeCount = active.length;

      // Salary metrics from employee base_salary
      const salaries = active.map(e => e.base_salary || 0).filter(s => s > 0);
      const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
      const sortedSalaries = [...salaries].sort((a, b) => a - b);
      const medianSalary = sortedSalaries.length > 0 ? sortedSalaries[Math.floor(sortedSalaries.length / 2)] : 0;
      const totalGrossMonthly = salaries.reduce((a, b) => a + b, 0);

      // If we have payroll data, use it for more accurate cost
      let totalEmployerMonthly = totalGrossMonthly * 1.32; // default estimate
      if (payrolls.length > 0) {
        const latestPayrolls = payrolls.slice(0, activeCount); // approximate latest period
        const payrollTotalCost = latestPayrolls.reduce((s: number, p: any) => s + (p.total_cost || 0), 0);
        if (payrollTotalCost > 0) {
          totalEmployerMonthly = payrollTotalCost;
        }
      }

      // Absenteeism
      const totalDaysLost = leaves.reduce((s: number, l: any) => s + (l.days_requested || 0), 0);
      const absenteeismRate = activeCount > 0 ? Math.min(25, (totalDaysLost / (activeCount * 22)) * 100) : 0;

      // Turnover (rough: terminated / active over last year)
      const terminated = employees.filter(e => e.status === 'terminated');
      const turnoverRate = activeCount > 0 ? (terminated.length / activeCount) * 100 : 0;

      const bl: WorkforceBaseline = {
        headcount,
        activeEmployees: activeCount,
        totalGrossMonthlyCost: Math.round(totalGrossMonthly),
        totalEmployerMonthlyCost: Math.round(totalEmployerMonthly),
        avgSalary: Math.round(avgSalary),
        medianSalary: Math.round(medianSalary),
        absenteeismRate: Math.round(absenteeismRate * 10) / 10,
        totalDaysLostMonth: Math.round(totalDaysLost / 12),
        avgWorkingHoursWeek: 40, // Default for Spain
        variablePayTotal: 0,
        benefitsCostTotal: 0,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        companyId,
        snapshotDate: new Date().toISOString(),
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
      setResults(prev => [result, ...prev].slice(0, 20)); // Keep last 20
      setAiNarrative(null); // Clear previous narrative
      return result;
    } catch (err) {
      console.error('[useWorkforceSimulation] simulate error:', err);
      toast.error('Error al ejecutar simulación');
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, [baseline, fetchBaseline]);

  // ── AI Narrative enrichment ────────────────────────────────────────────

  const requestNarrative = useCallback(async (result: SimulationResult) => {
    setIsLoadingNarrative(true);
    setAiNarrative(null);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-workforce-simulation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
        throw new Error(`HTTP ${resp.status}`);
      }

      // Streaming response
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
          } catch { /* partial JSON, wait for more */ }
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
