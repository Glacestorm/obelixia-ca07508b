import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export interface WellbeingAssessment {
  id: string;
  employee_id: string;
  assessment_type: string;
  overall_score: number;
  dimensions: Record<string, number>;
  burnout_risk: string;
  engagement_level: number;
  stress_level: number;
  satisfaction_level: number;
  work_life_balance: number;
  notes?: string;
  assessed_by: string;
  created_at: string;
}

export interface WellbeingSurvey {
  id: string;
  title: string;
  description?: string;
  survey_type: string;
  status: string;
  questions: any[];
  anonymized: boolean;
  frequency: string;
  total_responses: number;
  response_rate: number;
  results_summary: Record<string, any>;
  created_at: string;
}

export interface WellnessProgram {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  provider?: string;
  budget: number;
  currency: string;
  max_participants: number;
  current_participants: number;
  satisfaction_score: number;
  benefits: string[];
  created_at: string;
}

export interface BurnoutAlert {
  id: string;
  employee_id: string;
  risk_level: string;
  risk_score: number;
  contributing_factors: string[];
  recommended_actions: string[];
  status: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface WellbeingKPI {
  id: string;
  period: string;
  enps_score: number;
  engagement_index: number;
  burnout_rate: number;
  absenteeism_rate: number;
  avg_satisfaction: number;
  avg_stress: number;
  avg_work_life_balance: number;
  wellness_adoption: number;
  survey_participation: number;
  created_at: string;
}

export interface WellbeingAIAnalysis {
  overallHealth: string;
  healthScore: number;
  keyFindings: Array<{ area: string; finding: string; impact: string }>;
  burnoutRiskAnalysis: { trend: string; hotspots: string[]; rootCauses: string[] };
  recommendations: Array<{ priority: number; action: string; expectedImpact: string; timeframe: string }>;
  programGaps: string[];
  engagementDrivers: Array<{ driver: string; score: number; trend: string }>;
  predictedTurnoverRisk: number;
}

export interface WellbeingStats {
  totalAssessments: number;
  activeSurveys: number;
  activePrograms: number;
  criticalAlerts: number;
  avgEngagement: number;
  avgSatisfaction: number;
  burnoutRate: number;
  enpsScore: number;
}

// === HOOK ===
export function useHRWellbeingEnterprise() {
  const [assessments, setAssessments] = useState<WellbeingAssessment[]>([]);
  const [surveys, setSurveys] = useState<WellbeingSurvey[]>([]);
  const [programs, setPrograms] = useState<WellnessProgram[]>([]);
  const [burnoutAlerts, setBurnoutAlerts] = useState<BurnoutAlert[]>([]);
  const [kpis, setKpis] = useState<WellbeingKPI[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<WellbeingAIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const invoke = useCallback(async (action: string, params?: any) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-wellbeing-enterprise', {
      body: { action, params }
    });
    if (error) throw error;
    return data;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s, p, b, k] = await Promise.all([
        invoke('list_assessments'),
        invoke('list_surveys'),
        invoke('list_programs'),
        invoke('list_burnout_alerts'),
        invoke('get_kpis'),
      ]);
      if (a?.data) setAssessments(a.data);
      if (s?.data) setSurveys(s.data);
      if (p?.data) setPrograms(p.data);
      if (b?.data) setBurnoutAlerts(b.data);
      if (k?.data) setKpis(k.data);
    } catch (err) {
      console.error('[useHRWellbeingEnterprise] fetchAll:', err);
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const runAIAnalysis = useCallback(async () => {
    setAiLoading(true);
    try {
      const result = await invoke('ai_wellbeing_analysis', {});
      if (result?.data) {
        setAiAnalysis(result.data);
        toast.success('Análisis IA completado');
        return result.data;
      }
    } catch (err) {
      console.error('[useHRWellbeingEnterprise] AI analysis:', err);
      toast.error('Error en análisis IA');
    } finally {
      setAiLoading(false);
    }
    return null;
  }, [invoke]);

  const acknowledgeAlert = useCallback(async (id: string) => {
    try {
      await invoke('acknowledge_alert', { id, acknowledged_by: 'current_user' });
      setBurnoutAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
      toast.success('Alerta reconocida');
    } catch (err) {
      toast.error('Error al reconocer alerta');
    }
  }, [invoke]);

  const resolveAlert = useCallback(async (id: string, notes: string) => {
    try {
      await invoke('resolve_alert', { id, resolution_notes: notes });
      setBurnoutAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
      toast.success('Alerta resuelta');
    } catch (err) {
      toast.error('Error al resolver alerta');
    }
  }, [invoke]);

  const seedDemo = useCallback(async () => {
    setLoading(true);
    try {
      await invoke('seed_demo');
      toast.success('Datos demo generados');
      await fetchAll();
    } catch (err) {
      toast.error('Error al generar datos demo');
    } finally {
      setLoading(false);
    }
  }, [invoke, fetchAll]);

  // Stats
  const stats: WellbeingStats = {
    totalAssessments: assessments.length,
    activeSurveys: surveys.filter(s => s.status === 'active').length,
    activePrograms: programs.filter(p => p.status === 'active').length,
    criticalAlerts: burnoutAlerts.filter(a => (a.risk_level === 'critical' || a.risk_level === 'high') && a.status === 'active').length,
    avgEngagement: kpis.length > 0 ? kpis[0].engagement_index : 0,
    avgSatisfaction: kpis.length > 0 ? kpis[0].avg_satisfaction : 0,
    burnoutRate: kpis.length > 0 ? kpis[0].burnout_rate : 0,
    enpsScore: kpis.length > 0 ? kpis[0].enps_score : 0,
  };

  // Realtime for burnout alerts
  useEffect(() => {
    const channel = supabase
      .channel('wellbeing-burnout-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_burnout_alerts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setBurnoutAlerts(prev => [payload.new as BurnoutAlert, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setBurnoutAlerts(prev => prev.map(a => a.id === (payload.new as any).id ? payload.new as BurnoutAlert : a));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    assessments, surveys, programs, burnoutAlerts, kpis,
    aiAnalysis, stats, loading, aiLoading,
    fetchAll, runAIAnalysis, acknowledgeAlert, resolveAlert, seedDemo,
  };
}
