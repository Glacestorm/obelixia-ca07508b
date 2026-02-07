/**
 * useAIAnalytics - Hook para métricas y analytics del Sistema IA Híbrida
 * Recopila y visualiza: solicitudes, tokens, costes, latencia, errores, privacidad
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface UsageMetric {
  id?: string;
  timestamp: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  total_tokens: number;
  latency_ms: number;
  success: boolean;
  error_type: string | null;
  routing_mode: string;
  data_classification: string;
  was_anonymized: boolean;
  cost_usd: number;
}

export interface MetricsSummary {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  success_rate: number;
  error_count: number;
  local_requests: number;
  external_requests: number;
  anonymized_requests: number;
  blocked_requests: number;
}

export interface UsageOverTime {
  time: string;
  requests: number;
  tokens: number;
  cost_usd: number;
}

export interface ProviderDistribution {
  provider: string;
  requests: number;
  percentage: number;
  tokens: number;
  cost_usd: number;
}

export interface ModelRanking {
  model: string;
  requests: number;
  tokens: number;
  avg_latency_ms: number;
}

export interface PrivacyStats {
  by_classification: Array<{
    classification: string;
    count: number;
    percentage: number;
  }>;
  anonymization_rate: number;
  local_usage_rate: number;
}

export interface SavingsEstimate {
  local_requests: number;
  local_tokens?: number;
  estimated_savings_usd: number;
  external_cost_usd: number;
}

export interface AnalyticsDashboard {
  usage_over_time: UsageOverTime[];
  provider_distribution: ProviderDistribution[];
  model_ranking: ModelRanking[];
  cost_breakdown: Array<{ provider: string; cost_usd: number; percentage: number }>;
  latency_trend: Array<{ time: string; avg_latency_ms: number }>;
  privacy_stats: PrivacyStats;
  savings_estimate: SavingsEstimate;
}

export interface ProviderStats {
  provider: string;
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  success_rate: number;
}

export interface ModelStats {
  model: string;
  total_requests: number;
  total_tokens: number;
  avg_latency_ms: number;
}

export interface PrivacyIncident {
  timestamp: string;
  data_classification: string;
  was_anonymized: boolean;
  routing_mode: string;
  provider: string;
}

export interface PrivacySummary {
  total_blocked: number;
  total_anonymized: number;
  by_classification: Record<string, number>;
  total_incidents: number;
}

export type AnalyticsPeriod = 'hour' | 'day' | 'week' | 'month';

// === HOOK ===
export function useAIAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [privacyIncidents, setPrivacyIncidents] = useState<PrivacyIncident[]>([]);
  const [privacySummary, setPrivacySummary] = useState<PrivacySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === RECORD USAGE ===
  const recordUsage = useCallback(async (metric: Partial<UsageMetric>) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-analytics', {
        body: {
          action: 'record_usage',
          ...metric,
        },
      });

      if (fnError) throw fnError;
      return data?.success || false;
    } catch (err) {
      console.error('[useAIAnalytics] recordUsage error:', err);
      return false;
    }
  }, []);

  // === FETCH DASHBOARD ===
  const fetchDashboard = useCallback(async (period: AnalyticsPeriod = 'week') => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-analytics', {
        body: {
          action: 'get_dashboard',
          period,
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.dashboard) {
        setDashboard(data.dashboard);
        setLastRefresh(new Date());
        return data.dashboard;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useAIAnalytics] fetchDashboard error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH METRICS ===
  const fetchMetrics = useCallback(async (period: AnalyticsPeriod = 'day') => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-analytics', {
        body: {
          action: 'get_metrics',
          period,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setSummary(data.summary);
        setLastRefresh(new Date());
        return { metrics: data.metrics, summary: data.summary };
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useAIAnalytics] fetchMetrics error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH PROVIDER STATS ===
  const fetchProviderStats = useCallback(async (period: AnalyticsPeriod = 'month') => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-analytics', {
        body: {
          action: 'get_provider_stats',
          period,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setProviderStats(data.provider_stats || []);
        setModelStats(data.model_stats || []);
        return { providerStats: data.provider_stats, modelStats: data.model_stats };
      }

      return null;
    } catch (err) {
      console.error('[useAIAnalytics] fetchProviderStats error:', err);
      return null;
    }
  }, []);

  // === FETCH PRIVACY INCIDENTS ===
  const fetchPrivacyIncidents = useCallback(async (period: AnalyticsPeriod = 'month') => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-analytics', {
        body: {
          action: 'get_privacy_incidents',
          period,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setPrivacyIncidents(data.privacy_incidents || []);
        setPrivacySummary(data.summary || null);
        return { incidents: data.privacy_incidents, summary: data.summary };
      }

      return null;
    } catch (err) {
      console.error('[useAIAnalytics] fetchPrivacyIncidents error:', err);
      return null;
    }
  }, []);

  // === FETCH ALL DATA ===
  const fetchAllData = useCallback(async (period: AnalyticsPeriod = 'week') => {
    setIsLoading(true);
    setError(null);

    try {
      const [dashboardResult, providerResult, privacyResult] = await Promise.all([
        fetchDashboard(period),
        fetchProviderStats(period),
        fetchPrivacyIncidents(period),
      ]);

      setLastRefresh(new Date());
      
      return {
        dashboard: dashboardResult,
        providerStats: providerResult?.providerStats,
        modelStats: providerResult?.modelStats,
        privacyIncidents: privacyResult?.incidents,
        privacySummary: privacyResult?.summary,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useAIAnalytics] fetchAllData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDashboard, fetchProviderStats, fetchPrivacyIncidents]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((period: AnalyticsPeriod = 'week', intervalMs = 60000) => {
    stopAutoRefresh();
    fetchAllData(period);
    autoRefreshInterval.current = setInterval(() => {
      fetchAllData(period);
    }, intervalMs);
  }, [fetchAllData]);

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

  // === RETURN ===
  return {
    // Estado
    isLoading,
    dashboard,
    summary,
    providerStats,
    modelStats,
    privacyIncidents,
    privacySummary,
    error,
    lastRefresh,
    // Acciones
    recordUsage,
    fetchDashboard,
    fetchMetrics,
    fetchProviderStats,
    fetchPrivacyIncidents,
    fetchAllData,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useAIAnalytics;
