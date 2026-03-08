/**
 * useHRDigitalTwin - Hook para P5: Organizational Digital Twin Completo
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface TwinInstance {
  id: string;
  company_id: string;
  twin_name: string;
  description: string | null;
  status: string;
  source_type: string;
  source_entity_id: string | null;
  config: Record<string, any>;
  last_sync_at: string | null;
  sync_frequency_minutes: number;
  divergence_score: number;
  health_score: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TwinModuleSnapshot {
  id: string;
  twin_id: string;
  module_key: string;
  module_name: string;
  version: string;
  status: string;
  snapshot_data: Record<string, any>;
  metrics: Record<string, any>;
  divergence_details: any[];
  last_sync_at: string;
  created_at: string;
}

export interface TwinMetric {
  id: string;
  twin_id: string;
  metric_type: string;
  metric_key: string;
  metric_value: number;
  unit: string;
  dimension: string | null;
  recorded_at: string;
  metadata: Record<string, any>;
}

export interface TwinExperiment {
  id: string;
  twin_id: string;
  experiment_name: string;
  description: string | null;
  experiment_type: string;
  status: string;
  parameters: Record<string, any>;
  baseline_snapshot: Record<string, any>;
  result_snapshot: Record<string, any>;
  impact_analysis: Record<string, any>;
  risk_score: number | null;
  recommendation: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TwinAlert {
  id: string;
  twin_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  module_key: string | null;
  metric_key: string | null;
  threshold_value: number | null;
  actual_value: number | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface TwinStats {
  totalTwins: number;
  activeTwins: number;
  avgHealth: number;
  avgDivergence: number;
  totalExperiments: number;
  activeAlerts: number;
}

export function useHRDigitalTwin() {
  const [twins, setTwins] = useState<TwinInstance[]>([]);
  const [modules, setModules] = useState<TwinModuleSnapshot[]>([]);
  const [experiments, setExperiments] = useState<TwinExperiment[]>([]);
  const [alerts, setAlerts] = useState<TwinAlert[]>([]);
  const [metrics, setMetrics] = useState<TwinMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TwinStats>({ totalTwins: 0, activeTwins: 0, avgHealth: 0, avgDivergence: 0, totalExperiments: 0, activeAlerts: 0 });
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // === FETCH ALL ===
  const fetchTwins = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const [twinsRes, modulesRes, experimentsRes, alertsRes, metricsRes] = await Promise.all([
        supabase.from('erp_hr_twin_instances').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('erp_hr_twin_module_snapshots').select('*').order('module_key'),
        supabase.from('erp_hr_twin_experiments').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('erp_hr_twin_alerts').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('erp_hr_twin_metrics_history').select('*').order('recorded_at', { ascending: false }).limit(50),
      ]);

      const t = (twinsRes.data || []) as unknown as TwinInstance[];
      const m = (modulesRes.data || []) as unknown as TwinModuleSnapshot[];
      const e = (experimentsRes.data || []) as unknown as TwinExperiment[];
      const a = (alertsRes.data || []) as unknown as TwinAlert[];
      const mt = (metricsRes.data || []) as unknown as TwinMetric[];

      setTwins(t);
      setModules(m);
      setExperiments(e);
      setAlerts(a);
      setMetrics(mt);

      const active = t.filter(x => x.status === 'active');
      setStats({
        totalTwins: t.length,
        activeTwins: active.length,
        avgHealth: active.length ? Math.round(active.reduce((s, x) => s + Number(x.health_score), 0) / active.length * 10) / 10 : 0,
        avgDivergence: active.length ? Math.round(active.reduce((s, x) => s + Number(x.divergence_score), 0) / active.length * 10) / 10 : 0,
        totalExperiments: e.length,
        activeAlerts: a.filter(x => !x.is_resolved).length,
      });
    } catch (err) {
      console.error('[useHRDigitalTwin] fetch error:', err);
      toast.error('Error al cargar Digital Twin');
    } finally {
      setLoading(false);
    }
  }, []);

  // === SYNC TWIN ===
  const syncTwin = useCallback(async (twinId: string) => {
    try {
      const twin = twins.find(t => t.id === twinId);
      if (!twin) return;

      const twinModules = modules.filter(m => m.twin_id === twinId);

      const { data, error } = await supabase.functions.invoke('erp-hr-strategic-planning', {
        body: { action: 'twin_sync', params: { twin, modules: twinModules } }
      });

      if (error) throw error;
      if (data?.success) {
        await supabase.from('erp_hr_twin_instances').update({
          last_sync_at: new Date().toISOString(),
          divergence_score: data.data?.divergence_score ?? twin.divergence_score,
          health_score: data.data?.health_score ?? twin.health_score,
          status: 'active',
          updated_at: new Date().toISOString(),
        }).eq('id', twinId);

        toast.success('Twin sincronizado');
        return data.data;
      }
    } catch (err) {
      console.error('[useHRDigitalTwin] sync error:', err);
      toast.error('Error al sincronizar twin');
    }
  }, [twins, modules]);

  // === RUN EXPERIMENT ===
  const runExperiment = useCallback(async (twinId: string, experimentParams: Partial<TwinExperiment>) => {
    try {
      const { data: inserted, error: insErr } = await supabase.from('erp_hr_twin_experiments').insert([{
        twin_id: twinId,
        experiment_name: experimentParams.experiment_name || 'Nuevo Experimento',
        description: experimentParams.description,
        experiment_type: experimentParams.experiment_type || 'what_if',
        status: 'running',
        parameters: experimentParams.parameters || {},
        started_at: new Date().toISOString(),
      } as any]).select().single();

      if (insErr) throw insErr;

      const { data, error } = await supabase.functions.invoke('erp-hr-strategic-planning', {
        body: { action: 'twin_experiment', params: { experiment: inserted, twin_id: twinId } }
      });

      if (error) throw error;

      if (data?.success) {
        await supabase.from('erp_hr_twin_experiments').update({
          status: 'completed',
          impact_analysis: data.data?.impact_analysis || {},
          result_snapshot: data.data?.result_snapshot || {},
          risk_score: data.data?.risk_score,
          recommendation: data.data?.recommendation,
          completed_at: new Date().toISOString(),
        }).eq('id', (inserted as any).id);

        toast.success('Experimento completado');
        return data.data;
      }
    } catch (err) {
      console.error('[useHRDigitalTwin] experiment error:', err);
      toast.error('Error al ejecutar experimento');
    }
  }, []);

  // === RESOLVE ALERT ===
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await supabase.from('erp_hr_twin_alerts').update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq('id', alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
      toast.success('Alerta resuelta');
    } catch (err) {
      toast.error('Error al resolver alerta');
    }
  }, []);

  // === AI ANALYSIS ===
  const runAIAnalysis = useCallback(async (twinId: string) => {
    setAnalyzing(true);
    try {
      const twin = twins.find(t => t.id === twinId);
      const twinModules = modules.filter(m => m.twin_id === twinId);
      const twinExperiments = experiments.filter(e => e.twin_id === twinId);
      const twinAlerts = alerts.filter(a => a.twin_id === twinId);

      const { data, error } = await supabase.functions.invoke('erp-hr-strategic-planning', {
        body: {
          action: 'twin_ai_analysis',
          params: { twin, modules: twinModules, experiments: twinExperiments, alerts: twinAlerts }
        }
      });

      if (error) throw error;
      if (data?.success) {
        setAnalysisResult(data.data);
        toast.success('Análisis IA completado');
        return data.data;
      }
    } catch (err) {
      console.error('[useHRDigitalTwin] AI analysis error:', err);
      toast.error('Error en análisis IA');
    } finally {
      setAnalyzing(false);
    }
  }, [twins, modules, experiments, alerts]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('twin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_twin_experiments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as unknown as TwinExperiment;
          setExperiments(prev => prev.some(e => e.id === n.id) ? prev : [n, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const u = payload.new as unknown as TwinExperiment;
          setExperiments(prev => prev.map(e => e.id === u.id ? u : e));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'erp_hr_twin_alerts' }, (payload) => {
        const n = payload.new as unknown as TwinAlert;
        setAlerts(prev => [n, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    twins, modules, experiments, alerts, metrics,
    loading, stats, analysisResult, analyzing,
    fetchTwins, syncTwin, runExperiment, resolveAlert, runAIAnalysis,
  };
}
