/**
 * useHRWorkforcePlanning - Hook for Workforce Planning & Scenario Studio
 * Phase P3: Strategic workforce planning, headcount modeling, what-if scenarios
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export interface WorkforcePlan {
  id: string;
  company_id: string;
  plan_name: string;
  description: string | null;
  time_horizon: string;
  status: string;
  start_date: string;
  end_date: string | null;
  budget_total: number;
  budget_used: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HeadcountModel {
  id: string;
  plan_id: string;
  department: string;
  role_title: string;
  current_headcount: number;
  projected_headcount: number;
  gap: number;
  hiring_priority: string;
  estimated_cost_per_hire: number;
  avg_time_to_fill_days: number;
  skill_requirements: unknown[];
  notes: string | null;
}

export interface Scenario {
  id: string;
  company_id: string;
  plan_id: string | null;
  scenario_name: string;
  scenario_type: string;
  description: string | null;
  assumptions: Record<string, unknown>;
  variables: Record<string, unknown>;
  results: Record<string, unknown>;
  impact_summary: string | null;
  probability: number;
  risk_level: string;
  status: string;
  simulated_at: string | null;
  created_at: string;
}

export interface SkillGapForecast {
  id: string;
  skill_name: string;
  skill_category: string;
  current_supply: number;
  projected_demand: number;
  gap: number;
  criticality: string;
  mitigation_strategy: string | null;
  estimated_resolution_months: number;
  market_availability: string;
}

export interface CostProjection {
  id: string;
  plan_id: string;
  scenario_id: string | null;
  period: string;
  category: string;
  amount: number;
  currency: string;
  variance_vs_budget: number;
  notes: string | null;
}

export interface WorkforcePlanningStats {
  total_plans: number;
  active_plans: number;
  total_scenarios: number;
  high_risk_scenarios: number;
  current_headcount: number;
  projected_headcount: number;
  headcount_gap: number;
  critical_hires: number;
  critical_skill_gaps: number;
  total_budget: number;
}

export interface PlanDetail {
  plan: WorkforcePlan;
  headcount: HeadcountModel[];
  scenarios: Scenario[];
  skill_gaps: SkillGapForecast[];
  cost_projections: CostProjection[];
}

export function useHRWorkforcePlanning(companyId: string) {
  const [plans, setPlans] = useState<WorkforcePlan[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null);
  const [stats, setStats] = useState<WorkforcePlanningStats | null>(null);
  const [realHeadcount, setRealHeadcount] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Record<string, unknown> | null>(null);

  const invoke = useCallback(async (action: string, params?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-strategic-planning', {
      body: { action, company_id: companyId, params }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data.data;
  }, [companyId]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke('list_plans');
      setPlans(data || []);
    } catch (err) {
      console.error('[useHRWorkforcePlanning] fetchPlans error:', err);
      toast.error('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const fetchPlanDetail = useCallback(async (planId: string) => {
    setLoading(true);
    try {
      const data = await invoke('get_plan_detail', { plan_id: planId });
      setSelectedPlan(data);
      return data;
    } catch (err) {
      console.error('[useHRWorkforcePlanning] fetchPlanDetail error:', err);
      toast.error('Error al cargar detalle del plan');
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const fetchScenarios = useCallback(async () => {
    try {
      const data = await invoke('list_scenarios');
      setScenarios(data || []);
    } catch (err) {
      console.error('[useHRWorkforcePlanning] fetchScenarios error:', err);
    }
  }, [invoke]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await invoke('get_stats');
      setStats(data);
    } catch (err) {
      console.error('[useHRWorkforcePlanning] fetchStats error:', err);
    }
  }, [invoke]);

  const simulateScenario = useCallback(async (scenarioId: string, scenario: Scenario) => {
    setAiLoading(true);
    try {
      const data = await invoke('simulate_scenario', {
        scenario_id: scenarioId,
        scenario_name: scenario.scenario_name,
        scenario_type: scenario.scenario_type,
        assumptions: scenario.assumptions,
        variables: scenario.variables,
      });
      setAiResult(data);
      toast.success('Simulación completada');
      // Refresh scenarios
      await fetchScenarios();
      return data;
    } catch (err) {
      console.error('[useHRWorkforcePlanning] simulateScenario error:', err);
      toast.error('Error en simulación');
      return null;
    } finally {
      setAiLoading(false);
    }
  }, [invoke, fetchScenarios]);

  const runWorkforceAnalysis = useCallback(async (context: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const data = await invoke('ai_workforce_analysis', context);
      setAiResult(data);
      toast.success('Análisis completado');
      return data;
    } catch (err) {
      console.error('[useHRWorkforcePlanning] runWorkforceAnalysis error:', err);
      toast.error('Error en análisis');
      return null;
    } finally {
      setAiLoading(false);
    }
  }, [invoke]);

  const runSkillGapStrategy = useCallback(async (context: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const data = await invoke('ai_skill_gap_strategy', context);
      setAiResult(data);
      toast.success('Estrategia generada');
      return data;
    } catch (err) {
      console.error('[useHRWorkforcePlanning] runSkillGapStrategy error:', err);
      toast.error('Error generando estrategia');
      return null;
    } finally {
      setAiLoading(false);
    }
  }, [invoke]);

  // Realtime for scenarios
  useEffect(() => {
    const channel = supabase
      .channel('scenarios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_scenarios' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setScenarios(prev => prev.map(s => s.id === (payload.new as Scenario).id ? payload.new as Scenario : s));
        } else if (payload.eventType === 'INSERT') {
          setScenarios(prev => [payload.new as Scenario, ...prev]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Initial load
  useEffect(() => {
    if (companyId) {
      fetchPlans();
      fetchScenarios();
      fetchStats();
    }
  }, [companyId, fetchPlans, fetchScenarios, fetchStats]);

  return {
    plans, scenarios, selectedPlan, stats,
    loading, aiLoading, aiResult,
    fetchPlans, fetchPlanDetail, fetchScenarios, fetchStats,
    simulateScenario, runWorkforceAnalysis, runSkillGapStrategy,
    setSelectedPlan, setAiResult,
  };
}
