/**
 * CRM Advanced Analytics Hook
 * Dashboards ejecutivos, análisis predictivo, reportería automatizada
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CRMDashboard {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  dashboard_type: 'executive' | 'sales' | 'marketing' | 'support';
  layout_config: Record<string, unknown>;
  widgets: Record<string, unknown>[];
  filters: Record<string, unknown>;
  refresh_interval_seconds: number;
  is_default: boolean;
  is_shared: boolean;
  shared_with_roles: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMWidget {
  id: string;
  dashboard_id: string;
  widget_type: 'metric' | 'chart' | 'table' | 'funnel' | 'heatmap' | 'cohort' | 'forecast';
  title: string;
  description: string | null;
  data_source: string;
  query_config: Record<string, unknown>;
  visualization_config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  refresh_independently: boolean;
  cache_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface CRMCalculatedMetric {
  id: string;
  company_id: string;
  metric_name: string;
  metric_key: string;
  description: string | null;
  category: 'sales' | 'marketing' | 'support' | 'revenue';
  calculation_formula: string | null;
  data_sources: string[];
  aggregation_type: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
  unit: string | null;
  current_value: number | null;
  previous_value: number | null;
  target_value: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  trend_percentage: number | null;
  period_type: string;
  calculated_at: string | null;
  sparkline_data: number[];
  breakdown_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CRMPredictiveAnalysis {
  id: string;
  company_id: string;
  analysis_type: 'churn_risk' | 'deal_forecast' | 'lead_conversion' | 'revenue_prediction';
  entity_type: 'contact' | 'deal' | 'account' | 'campaign';
  entity_id: string | null;
  prediction_score: number | null;
  confidence_level: number | null;
  risk_factors: Array<{ factor: string; impact: number; description: string }>;
  opportunity_factors: Array<{ factor: string; impact: number; description: string }>;
  recommended_actions: Array<{ action: string; priority: string; expected_impact: number }>;
  model_version: string | null;
  predicted_outcome: Record<string, unknown>;
  predicted_value: number | null;
  predicted_date: string | null;
  actual_outcome: Record<string, unknown> | null;
  was_accurate: boolean | null;
  analyzed_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface CRMCohortAnalysis {
  id: string;
  company_id: string;
  cohort_type: 'acquisition' | 'conversion' | 'retention' | 'revenue';
  cohort_period: 'weekly' | 'monthly' | 'quarterly';
  cohort_date: string;
  period_index: number;
  total_entities: number | null;
  active_entities: number | null;
  metric_value: number | null;
  retention_rate: number | null;
  cumulative_value: number | null;
  segmentation: Record<string, unknown>;
  calculated_at: string;
  created_at: string;
}

export interface CRMFunnelAnalysis {
  id: string;
  company_id: string;
  funnel_name: string;
  funnel_type: 'sales' | 'marketing' | 'onboarding' | 'support';
  analysis_period_start: string | null;
  analysis_period_end: string | null;
  stages: Array<{
    name: string;
    count: number;
    conversion_rate: number;
    avg_time_in_stage: number;
  }>;
  total_entered: number | null;
  total_converted: number | null;
  overall_conversion_rate: number | null;
  average_time_to_convert: string | null;
  drop_off_analysis: Record<string, unknown>;
  bottleneck_stage: string | null;
  recommendations: string[];
  compared_to_previous: Record<string, unknown>;
  calculated_at: string;
  created_at: string;
}

export interface AnalyticsContext {
  companyId: string;
  timeRange?: { start: string; end: string };
  entityType?: string;
  filters?: Record<string, unknown>;
}

export function useCRMAdvancedAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboards, setDashboards] = useState<CRMDashboard[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<CRMDashboard | null>(null);
  const [widgets, setWidgets] = useState<CRMWidget[]>([]);
  const [metrics, setMetrics] = useState<CRMCalculatedMetric[]>([]);
  const [predictions, setPredictions] = useState<CRMPredictiveAnalysis[]>([]);
  const [cohorts, setCohorts] = useState<CRMCohortAnalysis[]>([]);
  const [funnels, setFunnels] = useState<CRMFunnelAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH DASHBOARDS ===
  const fetchDashboards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = supabase as any;
      const { data, error: fetchError } = await client
        .from('crm_analytics_dashboards')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDashboards(data || []);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useCRMAdvancedAnalytics] fetchDashboards error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH METRICS ===
  const fetchMetrics = useCallback(async (category?: string) => {
    try {
      const client = supabase as any;
      let query = client.from('crm_calculated_metrics').select('*');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error: fetchError } = await query.order('metric_name');

      if (fetchError) throw fetchError;
      setMetrics(data || []);
      return data;
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] fetchMetrics error:', err);
      return null;
    }
  }, []);

  // === FETCH PREDICTIONS ===
  const fetchPredictions = useCallback(async (analysisType?: string) => {
    try {
      const client = supabase as any;
      let query = client.from('crm_predictive_analytics').select('*');
      
      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }
      
      const { data, error: fetchError } = await query
        .order('analyzed_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setPredictions(data || []);
      return data;
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] fetchPredictions error:', err);
      return null;
    }
  }, []);

  // === FETCH COHORTS ===
  const fetchCohorts = useCallback(async (cohortType?: string) => {
    try {
      const client = supabase as any;
      let query = client.from('crm_cohort_analysis').select('*');
      
      if (cohortType) {
        query = query.eq('cohort_type', cohortType);
      }
      
      const { data, error: fetchError } = await query
        .order('cohort_date', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setCohorts(data || []);
      return data;
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] fetchCohorts error:', err);
      return null;
    }
  }, []);

  // === FETCH FUNNELS ===
  const fetchFunnels = useCallback(async (funnelType?: string) => {
    try {
      const client = supabase as any;
      let query = client.from('crm_funnel_analysis').select('*');
      
      if (funnelType) {
        query = query.eq('funnel_type', funnelType);
      }
      
      const { data, error: fetchError } = await query
        .order('calculated_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setFunnels(data || []);
      return data;
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] fetchFunnels error:', err);
      return null;
    }
  }, []);

  // === AI ANALYSIS ===
  const generateAIAnalysis = useCallback(async (
    analysisType: 'executive_summary' | 'trend_analysis' | 'predictions' | 'recommendations',
    context: AnalyticsContext
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'crm-advanced-analytics',
        {
          body: {
            action: analysisType,
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setLastRefresh(new Date());
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] generateAIAnalysis error:', err);
      toast.error('Error al generar análisis IA');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE DASHBOARD ===
  const createDashboard = useCallback(async (dashboard: Partial<CRMDashboard>) => {
    try {
      const client = supabase as any;
      const { data, error: insertError } = await client
        .from('crm_analytics_dashboards')
        .insert([dashboard])
        .select()
        .single();

      if (insertError) throw insertError;

      setDashboards(prev => [data, ...prev]);
      toast.success('Dashboard creado');
      return data;
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] createDashboard error:', err);
      toast.error('Error al crear dashboard');
      return null;
    }
  }, []);

  // === UPDATE DASHBOARD ===
  const updateDashboard = useCallback(async (
    dashboardId: string,
    updates: Partial<CRMDashboard>
  ) => {
    try {
      const client = supabase as any;
      const { error: updateError } = await client
        .from('crm_analytics_dashboards')
        .update(updates)
        .eq('id', dashboardId);

      if (updateError) throw updateError;

      setDashboards(prev => prev.map(d => 
        d.id === dashboardId ? { ...d, ...updates } : d
      ));
      
      if (activeDashboard?.id === dashboardId) {
        setActiveDashboard(prev => prev ? { ...prev, ...updates } : null);
      }

      return true;
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] updateDashboard error:', err);
      toast.error('Error al actualizar dashboard');
      return false;
    }
  }, [activeDashboard]);

  // === RUN PREDICTIVE ANALYSIS ===
  const runPredictiveAnalysis = useCallback(async (
    analysisType: CRMPredictiveAnalysis['analysis_type'],
    entityType: CRMPredictiveAnalysis['entity_type'],
    entityId?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'crm-advanced-analytics',
        {
          body: {
            action: 'run_prediction',
            analysisType,
            entityType,
            entityId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        await fetchPredictions(analysisType);
        toast.success('Análisis predictivo completado');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] runPredictiveAnalysis error:', err);
      toast.error('Error en análisis predictivo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPredictions]);

  // === GENERATE FUNNEL ANALYSIS ===
  const generateFunnelAnalysis = useCallback(async (
    funnelType: CRMFunnelAnalysis['funnel_type'],
    periodStart: string,
    periodEnd: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'crm-advanced-analytics',
        {
          body: {
            action: 'analyze_funnel',
            funnelType,
            periodStart,
            periodEnd
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        await fetchFunnels(funnelType);
        toast.success('Análisis de funnel completado');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] generateFunnelAnalysis error:', err);
      toast.error('Error en análisis de funnel');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunnels]);

  // === GENERATE COHORT ANALYSIS ===
  const generateCohortAnalysis = useCallback(async (
    cohortType: CRMCohortAnalysis['cohort_type'],
    cohortPeriod: CRMCohortAnalysis['cohort_period']
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'crm-advanced-analytics',
        {
          body: {
            action: 'analyze_cohorts',
            cohortType,
            cohortPeriod
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        await fetchCohorts(cohortType);
        toast.success('Análisis de cohortes completado');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      console.error('[useCRMAdvancedAnalytics] generateCohortAnalysis error:', err);
      toast.error('Error en análisis de cohortes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCohorts]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 300000) => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    
    fetchDashboards();
    fetchMetrics();
    
    autoRefreshInterval.current = setInterval(() => {
      fetchDashboards();
      fetchMetrics();
    }, intervalMs);
  }, [fetchDashboards, fetchMetrics]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    dashboards,
    activeDashboard,
    widgets,
    metrics,
    predictions,
    cohorts,
    funnels,
    error,
    lastRefresh,
    // Setters
    setActiveDashboard,
    // Actions
    fetchDashboards,
    fetchMetrics,
    fetchPredictions,
    fetchCohorts,
    fetchFunnels,
    generateAIAnalysis,
    createDashboard,
    updateDashboard,
    runPredictiveAnalysis,
    generateFunnelAnalysis,
    generateCohortAnalysis,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useCRMAdvancedAnalytics;
