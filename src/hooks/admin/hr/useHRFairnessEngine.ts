/**
 * useHRFairnessEngine - P4 Fairness / Justice Engine
 * Pay equity analysis, fairness metrics, justice cases, equity action plans
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export type AnalysisType = 'gender_gap' | 'ethnicity_gap' | 'age_gap' | 'disability_gap' | 'intersectional' | 'comprehensive';
export type MetricType = 'promotion_rate' | 'hiring_rate' | 'termination_rate' | 'training_access' | 'salary_ratio' | 'bonus_distribution' | 'performance_rating';
export type ProtectedAttribute = 'gender' | 'age' | 'ethnicity' | 'disability' | 'tenure' | 'education';
export type CaseType = 'grievance' | 'discrimination_complaint' | 'harassment' | 'retaliation' | 'accommodation_request' | 'pay_dispute' | 'promotion_dispute';
export type CaseStatus = 'open' | 'investigating' | 'mediation' | 'resolved' | 'escalated' | 'closed' | 'appealed';

export interface PayEquityAnalysis {
  id: string;
  company_id: string;
  analysis_name: string;
  analysis_type: AnalysisType;
  scope: Record<string, unknown>;
  results: Record<string, unknown>;
  overall_equity_score: number;
  gap_percentage: number;
  affected_employees: number;
  remediation_cost: number;
  status: string;
  performed_by?: string;
  approved_by?: string;
  regulatory_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface FairnessMetric {
  id: string;
  company_id: string;
  metric_name: string;
  metric_type: MetricType;
  protected_attribute: ProtectedAttribute;
  group_a_label: string;
  group_a_value: number;
  group_b_label: string;
  group_b_value: number;
  disparate_impact_ratio: number;
  four_fifths_compliant: boolean;
  period_start?: string;
  period_end?: string;
  department?: string;
  created_at: string;
}

export interface JusticeCase {
  id: string;
  company_id: string;
  case_number: string;
  case_type: CaseType;
  status: CaseStatus;
  priority: string;
  title: string;
  description?: string;
  department?: string;
  resolution?: string;
  resolution_date?: string;
  days_to_resolve?: number;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquityActionPlan {
  id: string;
  company_id: string;
  plan_name: string;
  plan_type: string;
  status: string;
  target_metric?: string;
  baseline_value: number;
  target_value: number;
  current_value: number;
  actions: unknown[];
  progress_percentage: number;
  budget: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface FairnessStats {
  total_analyses: number;
  avg_equity_score: number;
  total_metrics: number;
  non_compliant_metrics: number;
  open_cases: number;
  active_plans: number;
}

export interface FairnessAnalysis {
  overall_fairness_index: number;
  pay_equity_summary: Record<string, unknown>;
  disparate_impact_alerts: unknown[];
  intersectional_risks: unknown[];
  regulatory_compliance: Record<string, unknown>;
  action_priorities: unknown[];
  executive_summary: string;
}

export function useHRFairnessEngine() {
  const [analyses, setAnalyses] = useState<PayEquityAnalysis[]>([]);
  const [metrics, setMetrics] = useState<FairnessMetric[]>([]);
  const [cases, setCases] = useState<JusticeCase[]>([]);
  const [plans, setPlans] = useState<EquityActionPlan[]>([]);
  const [stats, setStats] = useState<FairnessStats | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<FairnessAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // === FETCH DATA ===
  const fetchAnalyses = useCallback(async (companyId: string) => {
    const { data, error } = await supabase.from('erp_hr_pay_equity_analyses').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (!error && data) setAnalyses(data as unknown as PayEquityAnalysis[]);
  }, []);

  const fetchMetrics = useCallback(async (companyId: string) => {
    const { data, error } = await supabase.from('erp_hr_fairness_metrics').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (!error && data) setMetrics(data as unknown as FairnessMetric[]);
  }, []);

  const fetchCases = useCallback(async (companyId: string) => {
    const { data, error } = await supabase.from('erp_hr_justice_cases').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (!error && data) setCases(data as unknown as JusticeCase[]);
  }, []);

  const fetchPlans = useCallback(async (companyId: string) => {
    const { data, error } = await supabase.from('erp_hr_equity_action_plans').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (!error && data) setPlans(data as unknown as EquityActionPlan[]);
  }, []);

  const fetchStats = useCallback(async (companyId: string) => {
    const [aRes, mRes, ncRes, cRes, pRes] = await Promise.all([
      supabase.from('erp_hr_pay_equity_analyses').select('overall_equity_score').eq('company_id', companyId),
      supabase.from('erp_hr_fairness_metrics').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('erp_hr_fairness_metrics').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('four_fifths_compliant', false),
      supabase.from('erp_hr_justice_cases').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['open', 'investigating', 'mediation']),
      supabase.from('erp_hr_equity_action_plans').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
    ]);
    const scores = (aRes.data || []).map((a: any) => Number(a.overall_equity_score));
    const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
    setStats({
      total_analyses: scores.length,
      avg_equity_score: avg,
      total_metrics: mRes.count || 0,
      non_compliant_metrics: ncRes.count || 0,
      open_cases: cRes.count || 0,
      active_plans: pRes.count || 0,
    });
  }, []);

  const fetchAll = useCallback(async (companyId: string) => {
    setLoading(true);
    await Promise.all([fetchAnalyses(companyId), fetchMetrics(companyId), fetchCases(companyId), fetchPlans(companyId), fetchStats(companyId)]);
    setLoading(false);
  }, [fetchAnalyses, fetchMetrics, fetchCases, fetchPlans, fetchStats]);

  // === AI ANALYSIS ===
  const runFairnessAnalysis = useCallback(async (companyId: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
        body: { action: 'ai_fairness_analysis', company_id: companyId, params: { stats, metrics_count: metrics.length, cases_count: cases.length, analyses_count: analyses.length } }
      });
      if (error) throw error;
      if (data?.success) { setAiAnalysis(data.data); toast.success('Análisis de equidad completado'); }
    } catch (err) {
      console.error('Fairness analysis error:', err);
      toast.error('Error en análisis de equidad');
    } finally { setAiLoading(false); }
  }, [stats, metrics.length, cases.length, analyses.length]);

  const runPayEquityAI = useCallback(async (companyId: string, analysisType: AnalysisType) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
        body: { action: 'ai_pay_equity_analysis', company_id: companyId, params: { analysis_type: analysisType } }
      });
      if (error) throw error;
      if (data?.success) {
        // Save result
        await supabase.from('erp_hr_pay_equity_analyses').insert({
          company_id: companyId, analysis_name: `Análisis ${analysisType} - ${new Date().toLocaleDateString('es')}`,
          analysis_type: analysisType, results: data.data, overall_equity_score: data.data?.overall_equity_score || 0,
          gap_percentage: data.data?.gap_percentage || 0, affected_employees: data.data?.affected_employees || 0,
          remediation_cost: data.data?.remediation_cost || 0, status: 'completed',
          regulatory_reference: 'RD 902/2020 - Igualdad retributiva'
        } as any);
        await fetchAnalyses(companyId);
        toast.success('Análisis de equidad retributiva completado');
        return data.data;
      }
    } catch (err) {
      console.error('Pay equity AI error:', err);
      toast.error('Error en análisis retributivo');
    } finally { setAiLoading(false); }
    return null;
  }, [fetchAnalyses]);

  // === SEED ===
  const seedDemo = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
        body: { action: 'fairness_seed_demo', company_id: companyId }
      });
      if (error) throw error;
      if (data?.success) { toast.success('Datos demo de equidad generados'); await fetchAll(companyId); }
    } catch (err) {
      console.error('Seed error:', err);
      toast.error('Error generando datos demo');
    } finally { setLoading(false); }
  }, [fetchAll]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('fairness-cases-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_justice_cases' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCases(prev => [payload.new as unknown as JusticeCase, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setCases(prev => prev.map(c => c.id === (payload.new as any).id ? payload.new as unknown as JusticeCase : c));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    analyses, metrics, cases, plans, stats, aiAnalysis, loading, aiLoading,
    fetchAll, fetchStats, runFairnessAnalysis, runPayEquityAI, seedDemo,
  };
}

export default useHRFairnessEngine;
