/**
 * useGaliaExecutiveDashboard - Dashboard Ejecutivo con Insights IA
 * Fase 7: Excelencia Operacional
 * Vista ejecutiva con KPIs, tendencias y recomendaciones estratégicas
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExecutiveKPI {
  id: string;
  name: string;
  category: 'efficiency' | 'compliance' | 'financial' | 'operational' | 'impact';
  currentValue: number;
  previousValue: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  status: 'on_track' | 'at_risk' | 'off_track' | 'exceeded';
  sparklineData: number[];
  lastUpdated: string;
}

export interface StrategicInsight {
  id: string;
  insightType: 'opportunity' | 'risk' | 'recommendation' | 'trend' | 'benchmark';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  suggestedAction: string;
  dataPoints: Array<{ label: string; value: string }>;
  confidence: number;
  generatedAt: string;
  expiresAt?: string;
}

export interface PerformanceMetrics {
  period: string;
  expedientesProcessed: number;
  averageProcessingTime: number;
  approvalRate: number;
  rejectionRate: number;
  complianceScore: number;
  budgetUtilization: number;
  userSatisfaction: number;
  aiAssistedDecisions: number;
  automationRate: number;
}

export interface ComparativeAnalysis {
  metric: string;
  currentPeriod: number;
  previousPeriod: number;
  yearOverYear: number;
  benchmark: number;
  ranking: number;
  totalEntities: number;
}

export interface ExecutiveReport {
  id: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  period: { start: string; end: string };
  generatedAt: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  kpis: ExecutiveKPI[];
  insights: StrategicInsight[];
}

export interface DashboardConfig {
  refreshInterval: number;
  kpiLayout: 'grid' | 'list' | 'compact';
  showBenchmarks: boolean;
  alertThresholds: Record<string, number>;
  favoriteKPIs: string[];
}

export function useGaliaExecutiveDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [kpis, setKpis] = useState<ExecutiveKPI[]>([]);
  const [insights, setInsights] = useState<StrategicInsight[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [comparisons, setComparisons] = useState<ComparativeAnalysis[]>([]);
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load executive KPIs
  const loadKPIs = useCallback(async (period?: 'day' | 'week' | 'month' | 'quarter' | 'year') => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'load_kpis',
          period: period || 'month'
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setKpis(data.kpis || []);
        return data.kpis as ExecutiveKPI[];
      }

      throw new Error(data?.error || 'Error al cargar KPIs');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate strategic insights
  const generateInsights = useCallback(async (focus?: string[]) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'generate_insights',
          focus
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setInsights(data.insights || []);
        return data.insights as StrategicInsight[];
      }

      return [];
    } catch (err) {
      toast.error('Error al generar insights');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(async (period: { start: string; end: string }) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'get_performance_metrics',
          period
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data.metrics) {
        setMetrics(data.metrics);
        return data.metrics as PerformanceMetrics;
      }

      return null;
    } catch (err) {
      console.error('[ExecutiveDashboard] Metrics error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run comparative analysis
  const runComparativeAnalysis = useCallback(async (params?: {
    compareWith?: 'previous_period' | 'same_period_last_year' | 'benchmark';
    metrics?: string[];
  }) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'run_comparative_analysis',
          params
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setComparisons(data.comparisons || []);
        return data.comparisons as ComparativeAnalysis[];
      }

      return [];
    } catch (err) {
      toast.error('Error en análisis comparativo');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate executive report
  const generateExecutiveReport = useCallback(async (
    reportType: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  ) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'generate_executive_report',
          reportType
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data.report) {
        setReport(data.report);
        toast.success('Informe ejecutivo generado');
        return data.report as ExecutiveReport;
      }

      return null;
    } catch (err) {
      toast.error('Error al generar informe');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export report
  const exportReport = useCallback(async (
    reportId: string,
    format: 'pdf' | 'excel' | 'pptx'
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'export_report',
          reportId,
          format
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast.success('Informe exportado');
        return data.downloadUrl;
      }

      return null;
    } catch (err) {
      toast.error('Error al exportar informe');
      return null;
    }
  }, []);

  // Save dashboard configuration
  const saveConfig = useCallback(async (newConfig: Partial<DashboardConfig>) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: {
          action: 'save_config',
          config: newConfig
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setConfig(prev => prev ? { ...prev, ...newConfig } : newConfig as DashboardConfig);
        toast.success('Configuración guardada');
        return true;
      }

      return false;
    } catch (err) {
      toast.error('Error al guardar configuración');
      return false;
    }
  }, []);

  // Load dashboard configuration
  const loadConfig = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-executive-dashboard', {
        body: { action: 'load_config' }
      });

      if (fnError) throw fnError;

      if (data?.success && data.config) {
        setConfig(data.config);
        return data.config as DashboardConfig;
      }

      return null;
    } catch (err) {
      console.error('[ExecutiveDashboard] Config error:', err);
      return null;
    }
  }, []);

  // Dismiss insight
  const dismissInsight = useCallback(async (insightId: string) => {
    setInsights(prev => prev.filter(i => i.id !== insightId));
  }, []);

  // Refresh all dashboard data
  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadKPIs(),
        generateInsights(),
        runComparativeAnalysis()
      ]);
      toast.success('Dashboard actualizado');
    } catch (err) {
      toast.error('Error al actualizar dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [loadKPIs, generateInsights, runComparativeAnalysis]);

  return {
    isLoading,
    kpis,
    insights,
    metrics,
    comparisons,
    report,
    config,
    error,
    loadKPIs,
    generateInsights,
    getPerformanceMetrics,
    runComparativeAnalysis,
    generateExecutiveReport,
    exportReport,
    saveConfig,
    loadConfig,
    dismissInsight,
    refreshDashboard
  };
}

export default useGaliaExecutiveDashboard;
