/**
 * useCrossModuleAnalytics Hook
 * Fase 10 - Dashboard Analítica Unificada Cross-Module
 * Enterprise SaaS 2025-2026
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export type ERPModuleId = 
  | 'hr' 
  | 'legal' 
  | 'accounting' 
  | 'treasury' 
  | 'purchasing' 
  | 'sales' 
  | 'inventory'
  | 'tax';

export interface ModuleKPI {
  id: string;
  moduleId: ERPModuleId;
  moduleName: string;
  name: string;
  value: number;
  previousValue?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  target?: number;
  achievement?: number;
  category: string;
  lastUpdated: string;
}

export interface CrossModuleCorrelation {
  id: string;
  sourceModule: ERPModuleId;
  targetModule: ERPModuleId;
  sourceMetric: string;
  targetMetric: string;
  correlationCoefficient: number;
  significance: 'high' | 'medium' | 'low';
  insight: string;
  predictiveValue: boolean;
}

export interface CrossModuleAlert {
  id: string;
  modules: ERPModuleId[];
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  suggestedAction: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface UnifiedPrediction {
  id: string;
  metric: string;
  moduleId: ERPModuleId;
  currentValue: number;
  predictedValue: number;
  predictionDate: string;
  confidence: number;
  scenario: 'optimistic' | 'baseline' | 'pessimistic';
  factors: Array<{
    name: string;
    moduleId: ERPModuleId;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  timeHorizon: string;
}

export interface ModuleSummary {
  moduleId: ERPModuleId;
  moduleName: string;
  healthScore: number;
  trend: 'improving' | 'stable' | 'declining';
  activeAlerts: number;
  pendingTasks: number;
  complianceScore: number;
  lastActivityAt: string;
}

export interface CrossModuleInsight {
  id: string;
  title: string;
  description: string;
  modules: ERPModuleId[];
  impactLevel: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  suggestedActions: string[];
  potentialSavings?: number;
  dataPoints: Record<string, unknown>;
  createdAt: string;
}

export interface ExecutiveSummary {
  overallHealthScore: number;
  trend: 'improving' | 'stable' | 'declining';
  totalRevenue: number;
  revenueGrowth: number;
  totalCosts: number;
  costReduction: number;
  employeeCount: number;
  employeeSatisfaction: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  topPriorities: string[];
  keyInsights: string[];
}

export interface CrossModuleContext {
  organizationId?: string;
  companyId?: string;
  dateRange?: { start: string; end: string };
  modules?: ERPModuleId[];
  includeCorrelations?: boolean;
  includePredictions?: boolean;
}

// === HOOK ===
export function useCrossModuleAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [moduleKPIs, setModuleKPIs] = useState<ModuleKPI[]>([]);
  const [moduleSummaries, setModuleSummaries] = useState<ModuleSummary[]>([]);
  const [correlations, setCorrelations] = useState<CrossModuleCorrelation[]>([]);
  const [alerts, setAlerts] = useState<CrossModuleAlert[]>([]);
  const [predictions, setPredictions] = useState<UnifiedPrediction[]>([]);
  const [insights, setInsights] = useState<CrossModuleInsight[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH UNIFIED DASHBOARD ===
  const fetchUnifiedDashboard = useCallback(async (context?: CrossModuleContext) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'get_unified_dashboard',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        setModuleKPIs(fnData.data?.moduleKPIs || []);
        setModuleSummaries(fnData.data?.moduleSummaries || []);
        setCorrelations(fnData.data?.correlations || []);
        setAlerts(fnData.data?.alerts || []);
        setPredictions(fnData.data?.predictions || []);
        setInsights(fnData.data?.insights || []);
        setExecutiveSummary(fnData.data?.executiveSummary || null);
        setLastRefresh(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response from Cross-Module Analytics');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useCrossModuleAnalytics] fetchUnifiedDashboard error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE CROSS-MODULE INSIGHTS ===
  const generateCrossModuleInsights = useCallback(async (context?: CrossModuleContext) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'generate_insights',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        setInsights(fnData.data?.insights || []);
        toast.success('Insights cross-module generados con IA');
        return fnData.data?.insights;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleAnalytics] generateCrossModuleInsights error:', err);
      toast.error('Error al generar insights');
      return null;
    }
  }, []);

  // === RUN UNIFIED PREDICTION ===
  const runUnifiedPrediction = useCallback(async (
    metrics: Array<{ moduleId: ERPModuleId; metricName: string }>,
    horizonDays: number = 30
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'run_prediction',
            params: { metrics, horizonDays }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        const newPredictions = fnData.data?.predictions || [];
        setPredictions(prev => {
          const metricKeys = metrics.map(m => `${m.moduleId}-${m.metricName}`);
          const filtered = prev.filter(p => !metricKeys.includes(`${p.moduleId}-${p.metric}`));
          return [...filtered, ...newPredictions];
        });
        toast.success('Predicciones unificadas generadas');
        return newPredictions;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleAnalytics] runUnifiedPrediction error:', err);
      toast.error('Error al generar predicciones');
      return null;
    }
  }, []);

  // === ANALYZE MODULE CORRELATIONS ===
  const analyzeCorrelations = useCallback(async (modules?: ERPModuleId[]) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'analyze_correlations',
            params: { modules }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        setCorrelations(fnData.data?.correlations || []);
        toast.success('Correlaciones entre módulos analizadas');
        return fnData.data?.correlations;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleAnalytics] analyzeCorrelations error:', err);
      toast.error('Error al analizar correlaciones');
      return null;
    }
  }, []);

  // === EXECUTIVE BRIEFING ===
  const generateExecutiveBriefing = useCallback(async (context?: CrossModuleContext) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'executive_briefing',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        setExecutiveSummary(fnData.data?.executiveSummary || null);
        toast.success('Briefing ejecutivo generado');
        return fnData.data?.executiveSummary;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleAnalytics] generateExecutiveBriefing error:', err);
      toast.error('Error al generar briefing');
      return null;
    }
  }, []);

  // === ASK CROSS-MODULE QUESTION ===
  const askCrossModuleQuestion = useCallback(async (
    question: string,
    context?: CrossModuleContext
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'ask_question',
            params: { question },
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        return fnData.data?.answer;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleAnalytics] askCrossModuleQuestion error:', err);
      toast.error('Error al procesar pregunta');
      return null;
    }
  }, []);

  // === EXPORT UNIFIED REPORT ===
  const exportUnifiedReport = useCallback(async (
    format: 'pdf' | 'excel' | 'pptx',
    options?: { modules?: ERPModuleId[]; includeCharts?: boolean }
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'cross-module-analytics',
        {
          body: {
            action: 'export_report',
            params: { format, ...options }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success(`Reporte unificado exportado en ${format.toUpperCase()}`);
        return fnData.data?.downloadUrl;
      }

      return null;
    } catch (err) {
      console.error('[useCrossModuleAnalytics] exportUnifiedReport error:', err);
      toast.error('Error al exportar reporte');
      return null;
    }
  }, []);

  // === ACKNOWLEDGE ALERT ===
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
    toast.success('Alerta reconocida');
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((context: CrossModuleContext, intervalMs = 120000) => {
    stopAutoRefresh();
    fetchUnifiedDashboard(context);
    autoRefreshInterval.current = setInterval(() => {
      fetchUnifiedDashboard(context);
    }, intervalMs);
  }, [fetchUnifiedDashboard]);

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

  // === COMPUTED VALUES ===
  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  
  const getModuleKPIs = useCallback((moduleId: ERPModuleId) => 
    moduleKPIs.filter(k => k.moduleId === moduleId), 
  [moduleKPIs]);

  const getModuleSummary = useCallback((moduleId: ERPModuleId) => 
    moduleSummaries.find(s => s.moduleId === moduleId),
  [moduleSummaries]);

  return {
    // State
    isLoading,
    moduleKPIs,
    moduleSummaries,
    correlations,
    alerts,
    activeAlerts,
    criticalAlerts,
    predictions,
    insights,
    executiveSummary,
    error,
    lastRefresh,
    // Actions
    fetchUnifiedDashboard,
    generateCrossModuleInsights,
    runUnifiedPrediction,
    analyzeCorrelations,
    generateExecutiveBriefing,
    askCrossModuleQuestion,
    exportUnifiedReport,
    acknowledgeAlert,
    startAutoRefresh,
    stopAutoRefresh,
    // Helpers
    getModuleKPIs,
    getModuleSummary,
  };
}

export default useCrossModuleAnalytics;
