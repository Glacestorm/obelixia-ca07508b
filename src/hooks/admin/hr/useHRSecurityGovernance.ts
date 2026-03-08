/**
 * useHRSecurityGovernance - Enterprise Security, Data Masking & SoD
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DataClassification {
  id: string;
  company_id: string;
  field_path: string;
  table_name: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
  sensitivity_level: number;
  gdpr_category: string | null;
  retention_days: number;
  requires_consent: boolean;
  requires_encryption: boolean;
  legal_basis: string | null;
  description: string | null;
  created_at: string;
}

export interface MaskingRule {
  id: string;
  company_id: string;
  field_path: string;
  table_name: string;
  masking_type: 'full' | 'partial' | 'hash' | 'tokenize' | 'redact' | 'generalize' | 'noise';
  masking_pattern: string | null;
  visible_to_roles: string[];
  applies_to_export: boolean;
  applies_to_api: boolean;
  applies_to_ui: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SoDRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  rule_type: 'exclusive' | 'conditional' | 'temporal' | 'hierarchical';
  conflicting_permissions: string[];
  conflicting_roles: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation_control: string | null;
  is_active: boolean;
  regulatory_reference: string | null;
  created_at: string;
}

export interface SoDViolation {
  id: string;
  company_id: string;
  rule_id: string | null;
  violation_type: string;
  conflicting_action_a: string;
  conflicting_action_b: string;
  detected_at: string;
  status: 'open' | 'investigating' | 'mitigated' | 'accepted' | 'resolved' | 'escalated';
  resolution: string | null;
  risk_score: number;
  metadata: Record<string, unknown>;
  erp_hr_sod_rules?: { name: string; severity: string } | null;
}

export interface SecurityIncident {
  id: string;
  company_id: string;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  affected_records: number;
  affected_tables: string[];
  source: string;
  status: string;
  containment_actions: unknown;
  detected_at: string;
  resolved_at: string | null;
}

export interface SecurityStats {
  total_classifications: number;
  active_sod_rules: number;
  open_violations: number;
  active_incidents: number;
  total_access_logs: number;
}

export interface SecurityAnalysis {
  overall_score: number;
  maturity_level: string;
  risk_areas: Array<{ area: string; risk_level: string; description: string; recommendation: string }>;
  data_protection_score: number;
  sod_compliance_score: number;
  access_control_score: number;
  incident_response_score: number;
  gdpr_compliance: { score: number; gaps: string[] };
  top_priorities: Array<{ priority: number; action: string; impact: string; effort: string }>;
  executive_summary: string;
}

export function useHRSecurityGovernance() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [classifications, setClassifications] = useState<DataClassification[]>([]);
  const [maskingRules, setMaskingRules] = useState<MaskingRule[]>([]);
  const [sodRules, setSodRules] = useState<SoDRule[]>([]);
  const [violations, setViolations] = useState<SoDViolation[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const invoke = useCallback(async (action: string, company_id: string, params?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-security-governance', {
      body: { action, company_id, params }
    });
    if (error) throw error;
    return data;
  }, []);

  const fetchAll = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const [statsRes, classRes, maskRes, sodRes, violRes, incRes] = await Promise.all([
        invoke('get_security_stats', companyId),
        invoke('list_classifications', companyId),
        invoke('list_masking_rules', companyId),
        invoke('list_sod_rules', companyId),
        invoke('list_violations', companyId),
        invoke('list_incidents', companyId),
      ]);
      if (statsRes?.success) setStats(statsRes.data);
      if (classRes?.success) setClassifications(classRes.data || []);
      if (maskRes?.success) setMaskingRules(maskRes.data || []);
      if (sodRes?.success) setSodRules(sodRes.data || []);
      if (violRes?.success) setViolations(violRes.data || []);
      if (incRes?.success) setIncidents(incRes.data || []);
    } catch (err) {
      console.error('[useHRSecurityGovernance] fetchAll error:', err);
      toast.error('Error al cargar datos de seguridad');
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const seedDemo = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const res = await invoke('seed_demo', companyId);
      if (res?.success) {
        toast.success('Datos demo de seguridad generados');
        await fetchAll(companyId);
      }
    } catch (err) {
      console.error('[useHRSecurityGovernance] seedDemo error:', err);
      toast.error('Error al generar datos demo');
    } finally {
      setLoading(false);
    }
  }, [invoke, fetchAll]);

  const runSecurityAnalysis = useCallback(async (companyId: string) => {
    setAnalyzing(true);
    try {
      const res = await invoke('ai_security_analysis', companyId, { stats, classifications_count: classifications.length, sod_rules_count: sodRules.length, open_violations: violations.filter(v => v.status === 'open').length, active_incidents: incidents.filter(i => ['open', 'investigating'].includes(i.status)).length });
      if (res?.success && res?.data) {
        setAnalysis(res.data);
        toast.success('Análisis de seguridad completado');
      }
    } catch (err) {
      console.error('[useHRSecurityGovernance] analysis error:', err);
      toast.error('Error en análisis de seguridad');
    } finally {
      setAnalyzing(false);
    }
  }, [invoke, stats, classifications, sodRules, violations, incidents]);

  // Realtime for violations and incidents
  useEffect(() => {
    const channel = supabase
      .channel('security-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'erp_hr_sod_violations' }, (payload) => {
        const v = payload.new as SoDViolation;
        setViolations(prev => [v, ...prev]);
        toast.warning(`Nueva violación SoD detectada`, { description: v.violation_type });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'erp_hr_security_incidents' }, (payload) => {
        const inc = payload.new as SecurityIncident;
        setIncidents(prev => [inc, ...prev]);
        toast.error(`Incidente de seguridad: ${inc.title}`, { description: `Severidad: ${inc.severity}` });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    loading, analyzing, stats, classifications, maskingRules, sodRules, violations, incidents, analysis,
    fetchAll, seedDemo, runSecurityAnalysis,
  };
}
