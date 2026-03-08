/**
 * useHRAnalyticsBIPremium — P12
 * Cross-module Analytics & BI Premium for the HR Enterprise Suite
 * Aggregates real data from all 11 premium phases into executive KPIs,
 * trend analysis, and AI-powered predictive insights.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────

export interface BIKpi {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendPercent: number;
  module: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
}

export interface BITrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface BITrendSeries {
  id: string;
  label: string;
  module: string;
  color: string;
  data: BITrendPoint[];
}

export interface BIModuleHealth {
  module: string;
  label: string;
  score: number;            // 0-100
  activeItems: number;
  pendingItems: number;
  alerts: number;
  lastActivity: string;
}

export interface BICrossModuleInsight {
  id: string;
  type: 'correlation' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  relatedModules: string[];
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  suggestedAction?: string;
}

export interface BIExecutiveReport {
  id: string;
  title: string;
  generatedAt: string;
  sections: {
    title: string;
    content: string;
    type: 'text' | 'kpi' | 'chart' | 'table';
  }[];
}

export interface BIDashboardData {
  kpis: BIKpi[];
  trends: BITrendSeries[];
  moduleHealth: BIModuleHealth[];
  insights: BICrossModuleInsight[];
  riskScore: number;
  complianceScore: number;
  fairnessScore: number;
  securityScore: number;
  overallHealth: number;
}

// ── Module metadata ──────────────────────────────────────────────

export const PREMIUM_MODULES = [
  { key: 'security', label: 'Security & SoD', color: '#ef4444' },
  { key: 'ai_governance', label: 'AI Governance', color: '#8b5cf6' },
  { key: 'workforce', label: 'Workforce Planning', color: '#3b82f6' },
  { key: 'fairness', label: 'Fairness Engine', color: '#10b981' },
  { key: 'digital_twin', label: 'Digital Twin', color: '#06b6d4' },
  { key: 'legal_engine', label: 'Legal Engine', color: '#f59e0b' },
  { key: 'cnae', label: 'CNAE Intelligence', color: '#ec4899' },
  { key: 'role_exp', label: 'Role Experience', color: '#6366f1' },
  { key: 'orchestration', label: 'Orquestación', color: '#14b8a6' },
  { key: 'compliance', label: 'Compliance Auto', color: '#f97316' },
  { key: 'analytics', label: 'Analytics BI', color: '#0ea5e9' },
] as const;

// ── Hook ─────────────────────────────────────────────────────────

export function useHRAnalyticsBIPremium() {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<BIDashboardData | null>(null);
  const [executiveReport, setExecutiveReport] = useState<BIExecutiveReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch real counts from DB tables ───────────────────────────

  const fetchRealMetrics = useCallback(async (companyId: string) => {
    // Use (supabase as any) for premium tables not yet in generated types
    const db = supabase as any;
    const queries = await Promise.allSettled([
      // Security
      db.from('erp_hr_data_classifications').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_sod_violations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
      // AI Governance
      db.from('erp_hr_ai_models').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_ai_decisions').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      // Workforce
      db.from('erp_hr_workforce_plans').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_scenarios').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      // Fairness
      db.from('erp_hr_pay_equity_analyses').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_justice_cases').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
      // Digital Twin
      db.from('erp_hr_twin_instances').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_twin_experiments').select('id', { count: 'exact', head: true }),
      // Legal Engine
      db.from('erp_hr_legal_templates').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_legal_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      // CNAE
      db.from('erp_hr_cnae_profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      // Compliance
      db.from('erp_hr_compliance_frameworks').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_compliance_audits').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      db.from('erp_hr_compliance_alerts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
      // Orchestration
      db.from('erp_hr_orchestration_rules').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
      db.from('erp_hr_orchestration_log').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    ]);

    const counts = queries.map(r => {
      if (r.status === 'fulfilled' && r.value?.count != null) return r.value.count;
      return 0;
    });

    return {
      dataClassifications: counts[0],
      openSoDViolations: counts[1],
      aiModels: counts[2],
      aiDecisions: counts[3],
      workforcePlans: counts[4],
      scenarios: counts[5],
      payEquityAnalyses: counts[6],
      openJusticeCases: counts[7],
      twinInstances: counts[8],
      twinExperiments: counts[9],
      legalTemplates: counts[10],
      legalContracts: counts[11],
      cnaeProfiles: counts[12],
      complianceFrameworks: counts[13],
      complianceAudits: counts[14],
      openComplianceAlerts: counts[15],
      activeOrchRules: counts[16],
      orchLogEntries: counts[17],
    };
  }, []);

  // ── Fetch AI-powered insights ──────────────────────────────────

  const fetchAIInsights = useCallback(async (
    companyId: string,
    realMetrics: Record<string, number>
  ) => {
    const { data, error: fnError } = await supabase.functions.invoke(
      'hr-analytics-bi',
      {
        body: {
          action: 'generate_dashboard',
          companyId,
          realMetrics,
        }
      }
    );

    if (fnError) throw fnError;
    if (!data?.success) throw new Error('Invalid AI response');
    return data.data as BIDashboardData;
  }, []);

  // ── Main refresh ───────────────────────────────────────────────

  const refresh = useCallback(async (companyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const realMetrics = await fetchRealMetrics(companyId);
      const aiData = await fetchAIInsights(companyId, realMetrics);
      setDashboard(aiData);
      setLastRefresh(new Date());
      return aiData;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      console.error('[useHRAnalyticsBIPremium] refresh error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchRealMetrics, fetchAIInsights]);

  // ── Executive report ───────────────────────────────────────────

  const generateExecutiveReport = useCallback(async (companyId: string) => {
    try {
      const realMetrics = await fetchRealMetrics(companyId);

      const { data, error: fnError } = await supabase.functions.invoke(
        'hr-analytics-bi',
        {
          body: {
            action: 'executive_report',
            companyId,
            realMetrics,
            currentDashboard: dashboard,
          }
        }
      );

      if (fnError) throw fnError;
      if (data?.success) {
        setExecutiveReport(data.data as BIExecutiveReport);
        toast.success('Informe ejecutivo generado');
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRAnalyticsBIPremium] report error:', err);
      toast.error('Error al generar informe');
      return null;
    }
  }, [dashboard, fetchRealMetrics]);

  // ── Predictive analysis ────────────────────────────────────────

  const runPredictiveAnalysis = useCallback(async (
    companyId: string,
    focusArea: string
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'hr-analytics-bi',
        {
          body: {
            action: 'predictive_analysis',
            companyId,
            focusArea,
            currentDashboard: dashboard,
          }
        }
      );

      if (fnError) throw fnError;
      if (data?.success) {
        toast.success('Análisis predictivo completado');
        return data.data as BICrossModuleInsight[];
      }
      return null;
    } catch (err) {
      console.error('[useHRAnalyticsBIPremium] predict error:', err);
      toast.error('Error en análisis predictivo');
      return null;
    }
  }, [dashboard]);

  // ── Auto-refresh ───────────────────────────────────────────────

  const startAutoRefresh = useCallback((companyId: string, intervalMs = 120000) => {
    stopAutoRefresh();
    refresh(companyId);
    autoRef.current = setInterval(() => refresh(companyId), intervalMs);
  }, [refresh]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRef.current) {
      clearInterval(autoRef.current);
      autoRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAutoRefresh(), [stopAutoRefresh]);

  return {
    isLoading,
    dashboard,
    executiveReport,
    error,
    lastRefresh,
    refresh,
    generateExecutiveReport,
    runPredictiveAnalysis,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useHRAnalyticsBIPremium;
