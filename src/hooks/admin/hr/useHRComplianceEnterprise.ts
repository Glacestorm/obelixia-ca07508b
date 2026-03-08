/**
 * useHRComplianceEnterprise - Hook para Compliance Enterprise HR
 * Fase 5: Gestión integral de compliance laboral
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface CompliancePolicy {
  id: string;
  company_id: string;
  code: string;
  title: string;
  description?: string;
  category: string;
  regulation_reference?: string;
  version: string;
  status: string;
  effective_date?: string;
  review_date?: string;
  owner_role?: string;
  risk_level: string;
  jurisdictions: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceAudit {
  id: string;
  company_id: string;
  audit_type: string;
  title: string;
  description?: string;
  scope?: string;
  lead_auditor?: string;
  status: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  findings_count: number;
  critical_findings: number;
  overall_score?: number;
  findings?: Record<string, unknown>[];
  recommendations?: Record<string, unknown>[];
  created_at: string;
}

export interface ComplianceIncident {
  id: string;
  company_id: string;
  incident_code: string;
  title: string;
  description?: string;
  category: string;
  severity: string;
  status: string;
  reported_at: string;
  resolved_at?: string;
  resolution?: string;
  root_cause?: string;
  corrective_actions?: Record<string, unknown>[];
  affected_regulations: string[];
  financial_impact?: number;
  created_at: string;
}

export interface ComplianceTraining {
  id: string;
  company_id: string;
  title: string;
  regulation_area: string;
  training_type: string;
  format: string;
  duration_hours: number;
  status: string;
  deadline?: string;
  completion_rate: number;
  total_enrolled: number;
  total_completed: number;
  certification_required: boolean;
  recurrence_months?: number;
  target_roles: string[];
  created_at: string;
}

export interface ComplianceRiskAssessment {
  id: string;
  company_id: string;
  assessment_name: string;
  assessment_type: string;
  status: string;
  overall_risk_score?: number;
  risk_level: string;
  risk_areas?: Record<string, unknown>[];
  mitigation_plan?: Record<string, unknown>[];
  next_review_date?: string;
  completed_at?: string;
  created_at: string;
}

export interface ComplianceKPI {
  id: string;
  kpi_name: string;
  category: string;
  current_value: number;
  target_value: number;
  unit: string;
  trend: string;
  period: string;
}

export interface RiskAnalysis {
  overallRiskScore: number;
  riskLevel: string;
  topRisks: Array<{ area: string; description: string; severity: string; mitigation: string }>;
  complianceGaps: Array<{ regulation: string; gap: string; urgency: string; recommendation: string }>;
  strengths: string[];
  recommendations: Array<{ priority: number; action: string; deadline: string }>;
  narrative: string;
}

export interface GapAnalysis {
  overallMaturity: number;
  maturityLevel: string;
  gaps: Array<{ regulation: string; requirement: string; gap: string; priority: string }>;
  maturityByArea: Array<{ area: string; score: number; status: string }>;
  actionPlan: Array<{ phase: number; title: string; actions: string[]; timeline: string }>;
  narrative: string;
}

export interface ComplianceStats {
  totalPolicies: number;
  activePolicies: number;
  openIncidents: number;
  criticalIncidents: number;
  avgTrainingCompletion: number;
  overallRiskScore: number;
  pendingAudits: number;
  completedAudits: number;
}

// === HOOK ===
export function useHRComplianceEnterprise(companyId: string) {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [incidents, setIncidents] = useState<ComplianceIncident[]>([]);
  const [training, setTraining] = useState<ComplianceTraining[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<ComplianceRiskAssessment[]>([]);
  const [kpis, setKpis] = useState<ComplianceKPI[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [stats, setStats] = useState<ComplianceStats>({
    totalPolicies: 0, activePolicies: 0, openIncidents: 0, criticalIncidents: 0,
    avgTrainingCompletion: 0, overallRiskScore: 0, pendingAudits: 0, completedAudits: 0,
  });

  const invoke = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-compliance-enterprise', {
      body: { action, companyId, ...extra }
    });
    if (error) throw error;
    return data;
  }, [companyId]);

  // === FETCH DASHBOARD ===
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke('get_dashboard');
      if (result?.success) {
        const d = result.data;
        setPolicies(d.policies || []);
        setAudits(d.audits || []);
        setIncidents(d.incidents || []);
        setTraining(d.training || []);
        setRiskAssessments(d.riskAssessments || []);
        setKpis(d.kpis || []);

        // Compute stats
        const activePols = (d.policies || []).filter((p: CompliancePolicy) => p.status === 'active');
        const openIncs = (d.incidents || []).filter((i: ComplianceIncident) => !['resolved', 'closed'].includes(i.status));
        const critIncs = openIncs.filter((i: ComplianceIncident) => i.severity === 'critical');
        const trainings = d.training || [];
        const avgComp = trainings.length > 0 ? trainings.reduce((s: number, t: ComplianceTraining) => s + (t.completion_rate || 0), 0) / trainings.length : 0;
        const lastRisk = (d.riskAssessments || [])[0];

        setStats({
          totalPolicies: (d.policies || []).length,
          activePolicies: activePols.length,
          openIncidents: openIncs.length,
          criticalIncidents: critIncs.length,
          avgTrainingCompletion: Math.round(avgComp),
          overallRiskScore: lastRisk?.overall_risk_score || 0,
          pendingAudits: (d.audits || []).filter((a: ComplianceAudit) => ['planned', 'in_progress'].includes(a.status)).length,
          completedAudits: (d.audits || []).filter((a: ComplianceAudit) => a.status === 'completed').length,
        });
      }
    } catch (err) {
      console.error('[useHRComplianceEnterprise] fetchDashboard:', err);
      toast.error('Error al cargar compliance');
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // === AI ACTIONS ===
  const runRiskAnalysis = useCallback(async () => {
    try {
      toast.info('Ejecutando análisis de riesgos con IA...');
      const result = await invoke('ai_risk_analysis');
      if (result?.success) {
        setRiskAnalysis(result.data);
        toast.success('Análisis de riesgos completado');
        return result.data;
      }
    } catch (err) {
      console.error('[useHRComplianceEnterprise] riskAnalysis:', err);
      toast.error('Error en análisis de riesgos');
    }
    return null;
  }, [invoke]);

  const runGapAnalysis = useCallback(async () => {
    try {
      toast.info('Ejecutando Gap Analysis con IA...');
      const result = await invoke('ai_gap_analysis');
      if (result?.success) {
        setGapAnalysis(result.data);
        toast.success('Gap Analysis completado');
        return result.data;
      }
    } catch (err) {
      console.error('[useHRComplianceEnterprise] gapAnalysis:', err);
      toast.error('Error en Gap Analysis');
    }
    return null;
  }, [invoke]);

  // === SEED ===
  const seedDemo = useCallback(async () => {
    try {
      toast.info('Generando datos demo...');
      const result = await invoke('seed_demo');
      if (result?.success) {
        toast.success('Datos demo creados');
        await fetchDashboard();
      }
    } catch (err) {
      console.error('[useHRComplianceEnterprise] seedDemo:', err);
      toast.error('Error al generar datos demo');
    }
  }, [invoke, fetchDashboard]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('compliance-incidents-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_compliance_incidents' }, () => {
        fetchDashboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboard]);

  // === INITIAL LOAD ===
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return {
    loading, policies, audits, incidents, training, riskAssessments, kpis, stats,
    riskAnalysis, gapAnalysis,
    fetchDashboard, runRiskAnalysis, runGapAnalysis, seedDemo,
  };
}

export default useHRComplianceEnterprise;
