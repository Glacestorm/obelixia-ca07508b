/**
 * useHRCNAEIntelligence - Hook for CNAE-Specific HR Intelligence
 * Premium Phase 7: Sector-specific regulations, benchmarks, and AI insights
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CNAESectorProfile {
  id: string;
  company_id: string;
  cnae_code: string;
  cnae_description: string | null;
  sector_key: string | null;
  applicable_regulations: any[];
  collective_agreements: any[];
  sector_benchmarks: Record<string, any>;
  risk_profile: Record<string, any>;
  specific_requirements: any[];
  created_at: string;
}

export interface CNAEComplianceRule {
  id: string;
  company_id: string;
  cnae_code: string;
  rule_name: string;
  rule_type: string;
  description: string | null;
  legal_basis: string | null;
  severity: string;
  is_mandatory: boolean;
  status: string;
  penalty_info: Record<string, any>;
  created_at: string;
}

export interface CNAEBenchmark {
  id: string;
  company_id: string;
  cnae_code: string;
  metric_name: string;
  metric_category: string;
  sector_average: number | null;
  sector_median: number | null;
  sector_p25: number | null;
  sector_p75: number | null;
  company_value: number | null;
  deviation_percentage: number | null;
  benchmark_source: string | null;
  period: string | null;
  is_favorable: boolean | null;
}

export interface CNAERiskAssessment {
  id: string;
  company_id: string;
  cnae_code: string;
  assessment_type: string;
  risk_category: string;
  risk_level: string;
  risk_score: number;
  description: string | null;
  mitigation_actions: any[];
  impact_areas: any[];
  status: string;
  next_review_date: string | null;
  created_at: string;
}

export interface CNAEIntelligenceStats {
  totalProfiles: number;
  totalRules: number;
  totalBenchmarks: number;
  totalRisks: number;
  highRiskCount: number;
  complianceScore: number;
}

export interface CNAEIntelligenceAnalysis {
  sector_analysis: any;
  regulation_gaps: any[];
  benchmark_insights: any[];
  risk_recommendations: any[];
  action_plan: any[];
  executive_summary: string;
}

export function useHRCNAEIntelligence(companyId?: string) {
  const [profiles, setProfiles] = useState<CNAESectorProfile[]>([]);
  const [rules, setRules] = useState<CNAEComplianceRule[]>([]);
  const [benchmarks, setBenchmarks] = useState<CNAEBenchmark[]>([]);
  const [risks, setRisks] = useState<CNAERiskAssessment[]>([]);
  const [stats, setStats] = useState<CNAEIntelligenceStats>({
    totalProfiles: 0, totalRules: 0, totalBenchmarks: 0,
    totalRisks: 0, highRiskCount: 0, complianceScore: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<CNAEIntelligenceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const [profRes, rulesRes, benchRes, riskRes] = await Promise.all([
        supabase.from('erp_hr_cnae_sector_profiles').select('*').eq('company_id', companyId).order('cnae_code'),
        supabase.from('erp_hr_cnae_compliance_rules').select('*').eq('company_id', companyId).order('severity'),
        supabase.from('erp_hr_cnae_benchmarks').select('*').eq('company_id', companyId).order('metric_category'),
        supabase.from('erp_hr_cnae_risk_assessments').select('*').eq('company_id', companyId).order('risk_score', { ascending: false }),
      ]);

      const p = (profRes.data || []) as unknown as CNAESectorProfile[];
      const r = (rulesRes.data || []) as unknown as CNAEComplianceRule[];
      const b = (benchRes.data || []) as unknown as CNAEBenchmark[];
      const rk = (riskRes.data || []) as unknown as CNAERiskAssessment[];

      setProfiles(p);
      setRules(r);
      setBenchmarks(b);
      setRisks(rk);

      const highRiskCount = rk.filter(x => x.risk_level === 'critical' || x.risk_level === 'high').length;
      const mandatoryRules = r.filter(x => x.is_mandatory);
      const activeRules = mandatoryRules.filter(x => x.status === 'active');
      const complianceScore = mandatoryRules.length > 0 ? Math.round((activeRules.length / mandatoryRules.length) * 100) : 100;

      setStats({
        totalProfiles: p.length, totalRules: r.length, totalBenchmarks: b.length,
        totalRisks: rk.length, highRiskCount, complianceScore,
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[useHRCNAEIntelligence] fetchAll error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const seedDemoData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: { action: 'cnae_seed_demo', company_id: companyId }
      });
      if (error) throw error;
      toast.success('Datos demo CNAE Intelligence cargados');
      await fetchAll();
    } catch (err) {
      console.error('[useHRCNAEIntelligence] seedDemoData error:', err);
      toast.error('Error al cargar datos demo');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, fetchAll]);

  const runAIAnalysis = useCallback(async (cnaeCode?: string) => {
    if (!companyId) return null;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: {
          action: 'ai_cnae_analysis',
          company_id: companyId,
          params: {
            cnae_code: cnaeCode,
            profiles_count: profiles.length,
            rules_count: rules.length,
            benchmarks_count: benchmarks.length,
            risks_count: risks.length,
            high_risk_count: stats.highRiskCount,
            profiles_summary: profiles.map(p => ({ cnae: p.cnae_code, desc: p.cnae_description, sector: p.sector_key })),
            top_risks: risks.slice(0, 5).map(r => ({ category: r.risk_category, level: r.risk_level, score: r.risk_score })),
          }
        }
      });
      if (error) throw error;
      if (data?.success) {
        setAiAnalysis(data.data);
        // Log AI analysis
        await supabase.from('erp_hr_cnae_intelligence_log').insert({
          company_id: companyId,
          cnae_code: cnaeCode || 'all',
          analysis_type: 'sector_intelligence',
          input_context: { profiles: profiles.length, rules: rules.length },
          ai_result: data.data,
          confidence_score: data.data?.confidence || 85,
          recommendations_count: data.data?.action_plan?.length || 0,
        } as any);
        toast.success('Análisis IA CNAE completado');
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRCNAEIntelligence] runAIAnalysis error:', err);
      toast.error('Error en análisis IA');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, profiles, rules, benchmarks, risks, stats]);

  const runBenchmarkAnalysis = useCallback(async (cnaeCode: string) => {
    if (!companyId) return null;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: {
          action: 'ai_cnae_benchmarks',
          company_id: companyId,
          params: {
            cnae_code: cnaeCode,
            current_benchmarks: benchmarks.filter(b => b.cnae_code === cnaeCode),
          }
        }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Análisis de benchmarks completado');
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useHRCNAEIntelligence] runBenchmarkAnalysis error:', err);
      toast.error('Error en análisis de benchmarks');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, benchmarks]);

  // Initial fetch
  useEffect(() => {
    if (companyId) fetchAll();
  }, [companyId, fetchAll]);

  // Realtime for risk assessments
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`cnae-risks-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_cnae_risk_assessments', filter: `company_id=eq.${companyId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchAll]);

  return {
    profiles, rules, benchmarks, risks, stats,
    isLoading, aiAnalysis, isAnalyzing, lastRefresh,
    fetchAll, seedDemoData, runAIAnalysis, runBenchmarkAnalysis,
  };
}
