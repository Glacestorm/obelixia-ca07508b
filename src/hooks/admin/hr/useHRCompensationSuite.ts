/**
 * useHRCompensationSuite - Hook para Compensation Suite Enterprise
 * Merit Cycles, Bonus, Pay Equity, Salary Letters, Total Rewards
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ TYPES ============

export interface MeritCycle {
  id: string;
  company_id: string;
  name: string;
  fiscal_year: number;
  status: string;
  budget_percent: number;
  budget_amount: number | null;
  currency: string;
  start_date: string;
  end_date: string;
  effective_date: string | null;
  guidelines: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MeritProposal {
  id: string;
  cycle_id: string;
  company_id: string;
  employee_id: string;
  employee_name: string | null;
  department: string | null;
  position_title: string | null;
  current_salary: number;
  proposed_salary: number;
  salary_increase: number;
  increase_percent: number | null;
  current_band: string | null;
  current_compa_ratio: number | null;
  proposed_compa_ratio: number | null;
  performance_rating: string | null;
  merit_type: string;
  manager_justification: string | null;
  hr_comments: string | null;
  status: string;
  created_at: string;
}

export interface BonusCycle {
  id: string;
  company_id: string;
  name: string;
  fiscal_year: number;
  bonus_type: string;
  status: string;
  target_pool: number | null;
  actual_pool: number | null;
  currency: string;
  distribution_method: string;
  period_start: string;
  period_end: string;
  payment_date: string | null;
  created_at: string;
}

export interface SalaryLetter {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string | null;
  letter_type: string;
  effective_date: string;
  previous_salary: number | null;
  new_salary: number;
  change_percent: number | null;
  status: string;
  created_at: string;
}

export interface PayEquitySnapshot {
  id: string;
  company_id: string;
  analysis_date: string;
  gender_gap_percent: number | null;
  gender_gap_adjusted: number | null;
  median_male_salary: number | null;
  median_female_salary: number | null;
  total_employees_analyzed: number | null;
  anomalies_detected: number;
  anomalies_detail: Array<{ employee: string; issue: string; severity: string }>;
  salary_compression_score: number | null;
  compa_ratio_distribution: Record<string, number>;
  recommendations: string[];
  ai_narrative: string | null;
  created_at: string;
}

export interface CompensationStats {
  meritCycles: MeritCycle[];
  bonusCycles: BonusCycle[];
  totalLetters: number;
  latestEquity: PayEquitySnapshot | null;
}

// ============ HOOK ============

export function useHRCompensationSuite() {
  const [loading, setLoading] = useState(false);
  const [meritCycles, setMeritCycles] = useState<MeritCycle[]>([]);
  const [meritProposals, setMeritProposals] = useState<MeritProposal[]>([]);
  const [bonusCycles, setBonusCycles] = useState<BonusCycle[]>([]);
  const [salaryLetters, setSalaryLetters] = useState<SalaryLetter[]>([]);
  const [payEquitySnapshots, setPayEquitySnapshots] = useState<PayEquitySnapshot[]>([]);
  const [stats, setStats] = useState<CompensationStats | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-compensation-suite', {
      body: { action, params }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Error');
    return data.data;
  }, []);

  // ========== STATS ==========
  const fetchStats = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('get_compensation_stats', { company_id: companyId });
      setStats(data);
      return data;
    } catch (err) {
      console.error('[CompensationSuite] fetchStats error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // ========== MERIT CYCLES ==========
  const fetchMeritCycles = useCallback(async (companyId: string, fiscalYear?: number) => {
    setLoading(true);
    try {
      const data = await invoke('list_merit_cycles', { company_id: companyId, fiscal_year: fiscalYear });
      setMeritCycles(data || []);
      return data;
    } catch (err) {
      console.error('[CompensationSuite] fetchMeritCycles error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const upsertMeritCycle = useCallback(async (cycle: Partial<MeritCycle>) => {
    try {
      const data = await invoke('upsert_merit_cycle', { cycle });
      toast.success(cycle.id ? 'Ciclo actualizado' : 'Ciclo creado');
      return data;
    } catch (err) {
      toast.error('Error al guardar ciclo');
      return null;
    }
  }, [invoke]);

  // ========== MERIT PROPOSALS ==========
  const fetchMeritProposals = useCallback(async (cycleId: string, companyId?: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_merit_proposals', { cycle_id: cycleId, company_id: companyId });
      setMeritProposals(data || []);
      return data;
    } catch (err) {
      console.error('[CompensationSuite] fetchProposals error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const upsertMeritProposal = useCallback(async (proposal: Partial<MeritProposal>) => {
    try {
      const data = await invoke('upsert_merit_proposal', { proposal });
      toast.success('Propuesta guardada');
      return data;
    } catch (err) {
      toast.error('Error al guardar propuesta');
      return null;
    }
  }, [invoke]);

  const bulkCreateProposals = useCallback(async (cycleId: string, companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('bulk_create_proposals', { cycle_id: cycleId, company_id: companyId });
      toast.success(`${data?.created || 0} propuestas creadas`);
      return data;
    } catch (err) {
      toast.error('Error al crear propuestas');
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // ========== BONUS CYCLES ==========
  const fetchBonusCycles = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_bonus_cycles', { company_id: companyId });
      setBonusCycles(data || []);
      return data;
    } catch (err) {
      console.error('[CompensationSuite] fetchBonusCycles error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const upsertBonusCycle = useCallback(async (cycle: Partial<BonusCycle>) => {
    try {
      const data = await invoke('upsert_bonus_cycle', { cycle });
      toast.success(cycle.id ? 'Bonus actualizado' : 'Bonus creado');
      return data;
    } catch (err) {
      toast.error('Error al guardar bonus');
      return null;
    }
  }, [invoke]);

  // ========== SALARY LETTERS ==========
  const fetchSalaryLetters = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_salary_letters', { company_id: companyId });
      setSalaryLetters(data || []);
      return data;
    } catch (err) {
      console.error('[CompensationSuite] fetchLetters error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // ========== PAY EQUITY ==========
  const runPayEquityAnalysis = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('run_pay_equity_analysis', { company_id: companyId });
      toast.success('Análisis de equidad completado');
      return data;
    } catch (err) {
      toast.error('Error en análisis de equidad');
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const fetchPayEquitySnapshots = useCallback(async (companyId: string) => {
    try {
      const data = await invoke('list_pay_equity_snapshots', { company_id: companyId });
      setPayEquitySnapshots(data || []);
      return data;
    } catch (err) {
      return [];
    }
  }, [invoke]);

  // ========== SEED ==========
  const seedData = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('seed_compensation_data', { company_id: companyId });
      toast.success('Datos demo de compensación creados');
      return data;
    } catch (err) {
      toast.error('Error al crear datos demo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  return {
    loading,
    meritCycles,
    meritProposals,
    bonusCycles,
    salaryLetters,
    payEquitySnapshots,
    stats,
    fetchStats,
    fetchMeritCycles,
    upsertMeritCycle,
    fetchMeritProposals,
    upsertMeritProposal,
    bulkCreateProposals,
    fetchBonusCycles,
    upsertBonusCycle,
    fetchSalaryLetters,
    runPayEquityAnalysis,
    fetchPayEquitySnapshots,
    seedData,
  };
}

export default useHRCompensationSuite;
