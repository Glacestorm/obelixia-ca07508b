/**
 * useHRAIGovernance - AI Governance Layer Hook
 * Model Registry, Decision Audit, Bias Detection, Explainability
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export type AIModelStatus = 'draft' | 'testing' | 'active' | 'deprecated' | 'suspended';
export type AIRiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable';
export type DecisionOutcome = 'pending' | 'accepted' | 'rejected' | 'overridden' | 'escalated';
export type BiasAuditType = 'scheduled' | 'triggered' | 'manual' | 'regulatory';
export type PolicyType = 'usage' | 'data' | 'fairness' | 'transparency' | 'accountability' | 'risk_management';

export interface AIModelEntry {
  id: string;
  company_id: string;
  model_name: string;
  model_version: string;
  model_type: string;
  provider: string;
  purpose: string;
  risk_level: AIRiskLevel;
  eu_ai_act_category: string | null;
  status: AIModelStatus;
  performance_metrics: Record<string, number>;
  bias_metrics: Record<string, unknown>;
  responsible_team: string | null;
  last_audit_at: string | null;
  next_audit_due: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIDecision {
  id: string;
  company_id: string;
  model_id: string | null;
  decision_type: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  confidence_score: number | null;
  risk_level: string;
  explanation: string | null;
  human_override: boolean;
  override_reason: string | null;
  affected_employees: string[];
  outcome_status: DecisionOutcome;
  processing_time_ms: number | null;
  created_at: string;
}

export interface AIBiasAudit {
  id: string;
  company_id: string;
  model_id: string | null;
  audit_type: BiasAuditType;
  protected_attributes: string[];
  fairness_metrics: Record<string, unknown>;
  overall_fairness_score: number | null;
  bias_detected: boolean;
  bias_details: Record<string, unknown>;
  remediation_status: string;
  created_at: string;
  completed_at: string | null;
}

export interface AIGovernancePolicy {
  id: string;
  company_id: string;
  policy_name: string;
  policy_type: PolicyType;
  description: string | null;
  rules: unknown[];
  enforcement_level: string;
  regulatory_reference: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
}

export interface AIExplainabilityReport {
  id: string;
  company_id: string;
  decision_id: string | null;
  model_id: string | null;
  report_type: string;
  explanation_method: string;
  feature_importance: unknown[];
  natural_language_explanation: string | null;
  audience: string;
  created_at: string;
}

export interface AIGovernanceStats {
  total_models: number;
  active_models: number;
  high_risk_models: number;
  total_decisions: number;
  overridden_decisions: number;
  pending_audits: number;
  active_policies: number;
  avg_fairness_score: number;
}

export interface AIGovernanceAnalysis {
  governance_maturity: number;
  eu_ai_act_compliance: { score: number; gaps: string[] };
  model_risk_distribution: Record<string, number>;
  bias_risk_summary: { models_at_risk: string[]; recommended_actions: string[] };
  transparency_score: number;
  accountability_score: number;
  recommendations: { priority: number; action: string; impact: string }[];
  executive_summary: string;
}

export function useHRAIGovernance() {
  const [models, setModels] = useState<AIModelEntry[]>([]);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [biasAudits, setBiasAudits] = useState<AIBiasAudit[]>([]);
  const [policies, setPolicies] = useState<AIGovernancePolicy[]>([]);
  const [reports, setReports] = useState<AIExplainabilityReport[]>([]);
  const [stats, setStats] = useState<AIGovernanceStats | null>(null);
  const [analysis, setAnalysis] = useState<AIGovernanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // === FETCH ALL DATA ===
  const fetchModels = useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from('erp_hr_ai_model_registry')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error && data) setModels(data as unknown as AIModelEntry[]);
  }, []);

  const fetchDecisions = useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from('erp_hr_ai_decisions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) setDecisions(data as unknown as AIDecision[]);
  }, []);

  const fetchBiasAudits = useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from('erp_hr_ai_bias_audits')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error && data) setBiasAudits(data as unknown as AIBiasAudit[]);
  }, []);

  const fetchPolicies = useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from('erp_hr_ai_governance_policies')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (!error && data) setPolicies(data as unknown as AIGovernancePolicy[]);
  }, []);

  const fetchReports = useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from('erp_hr_ai_explainability_reports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setReports(data as unknown as AIExplainabilityReport[]);
  }, []);

  const fetchAll = useCallback(async (companyId: string) => {
    setLoading(true);
    await Promise.all([
      fetchModels(companyId),
      fetchDecisions(companyId),
      fetchBiasAudits(companyId),
      fetchPolicies(companyId),
      fetchReports(companyId),
    ]);
    setLoading(false);
  }, [fetchModels, fetchDecisions, fetchBiasAudits, fetchPolicies, fetchReports]);

  // === STATS ===
  const fetchStats = useCallback(async (companyId: string) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
      body: { action: 'ai_governance_stats', company_id: companyId }
    });
    if (!error && data?.success) setStats(data.data);
  }, []);

  // === AI ANALYSIS ===
  const runGovernanceAnalysis = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
        body: {
          action: 'ai_governance_analysis',
          company_id: companyId,
          params: { models, policies, biasAudits, stats }
        }
      });
      if (error) throw error;
      if (data?.success) {
        setAnalysis(data.data);
        toast.success('Análisis de gobernanza IA completado');
      }
    } catch (err) {
      console.error('AI Governance analysis error:', err);
      toast.error('Error en análisis de gobernanza IA');
    } finally {
      setLoading(false);
    }
  }, [models, policies, biasAudits, stats]);

  // === BIAS AUDIT ===
  const runBiasAudit = useCallback(async (companyId: string, modelId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
        body: {
          action: 'ai_bias_audit',
          company_id: companyId,
          params: { model_id: modelId, models }
        }
      });
      if (error) throw error;
      if (data?.success) {
        // Save audit result
        await supabase.from('erp_hr_ai_bias_audits').insert({
          company_id: companyId,
          model_id: modelId,
          audit_type: 'manual',
          protected_attributes: data.data.protected_attributes || ['gender', 'age', 'ethnicity'],
          fairness_metrics: data.data.fairness_metrics || {},
          overall_fairness_score: data.data.overall_fairness_score,
          bias_detected: data.data.bias_detected,
          bias_details: data.data.bias_details || {},
          remediation_actions: data.data.remediation_actions || {},
          completed_at: new Date().toISOString(),
        } as any);
        await fetchBiasAudits(companyId);
        toast.success('Auditoría de sesgo completada');
      }
    } catch (err) {
      console.error('Bias audit error:', err);
      toast.error('Error en auditoría de sesgo');
    } finally {
      setLoading(false);
    }
  }, [models, fetchBiasAudits]);

  // === SEED ===
  const seedDemo = useCallback(async (companyId: string) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
      body: { action: 'ai_governance_seed', company_id: companyId }
    });
    if (!error && data?.success) {
      toast.success('Datos demo de AI Governance cargados');
      await fetchAll(companyId);
    }
  }, [fetchAll]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('ai-decisions-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'erp_hr_ai_decisions' }, (payload) => {
        const newDec = payload.new as unknown as AIDecision;
        setDecisions(prev => {
          if (prev.some(d => d.id === newDec.id)) return prev;
          return [newDec, ...prev];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    models, decisions, biasAudits, policies, reports,
    stats, analysis, loading,
    fetchAll, fetchStats, runGovernanceAnalysis, runBiasAudit, seedDemo,
  };
}

export default useHRAIGovernance;
