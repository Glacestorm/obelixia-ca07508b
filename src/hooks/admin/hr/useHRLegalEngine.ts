/**
 * useHRLegalEngine - Hook for Documentary Legal Engine Premium (P6)
 * Contract generation, clause library, compliance automation
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export interface LegalTemplate {
  id: string;
  company_id: string;
  template_name: string;
  template_type: string;
  category: string;
  jurisdiction: string;
  language: string;
  version: number;
  status: string;
  content_template: Record<string, unknown>;
  required_variables: string[];
  optional_variables: string[];
  applicable_regulations: string[];
  approval_required: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface LegalClause {
  id: string;
  company_id: string;
  clause_name: string;
  clause_type: string;
  category: string;
  content: string;
  legal_basis: string | null;
  jurisdiction: string;
  risk_level: string;
  is_mandatory: boolean;
  is_negotiable: boolean;
  applies_to_types: string[];
  version: number;
  status: string;
  tags: string[];
  created_at: string;
}

export interface LegalContract {
  id: string;
  company_id: string;
  contract_number: string;
  template_id: string | null;
  employee_name: string | null;
  employee_id: string | null;
  contract_type: string;
  status: string;
  generated_content: Record<string, unknown>;
  variables_used: Record<string, unknown>;
  compliance_score: number;
  compliance_issues: Array<Record<string, unknown>>;
  risk_assessment: Record<string, unknown>;
  effective_date: string | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheck {
  id: string;
  contract_id: string;
  check_type: string;
  rule_name: string;
  regulation_reference: string | null;
  passed: boolean;
  severity: string;
  details: string | null;
  remediation_suggestion: string | null;
  auto_fixable: boolean;
  checked_at: string;
}

export interface LegalStats {
  total_templates: number;
  total_clauses: number;
  total_contracts: number;
  draft_contracts: number;
  active_contracts: number;
  avg_compliance_score: number;
}

export interface LegalAIAnalysis {
  contract_quality?: Record<string, unknown>;
  clause_recommendations?: Array<Record<string, unknown>>;
  compliance_gaps?: Array<Record<string, unknown>>;
  executive_summary?: string;
}

export function useHRLegalEngine() {
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [clauses, setClauses] = useState<LegalClause[]>([]);
  const [contracts, setContracts] = useState<LegalContract[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [stats, setStats] = useState<LegalStats | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<LegalAIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // === FETCH TEMPLATES ===
  const fetchTemplates = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_legal_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates((data || []) as unknown as LegalTemplate[]);
    } catch (e) { console.error('fetchTemplates error:', e); }
  }, []);

  // === FETCH CLAUSES ===
  const fetchClauses = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_legal_clauses')
        .select('*')
        .eq('company_id', companyId)
        .order('category', { ascending: true });
      if (error) throw error;
      setClauses((data || []) as unknown as LegalClause[]);
    } catch (e) { console.error('fetchClauses error:', e); }
  }, []);

  // === FETCH CONTRACTS ===
  const fetchContracts = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_legal_contracts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setContracts((data || []) as unknown as LegalContract[]);
    } catch (e) { console.error('fetchContracts error:', e); }
  }, []);

  // === FETCH COMPLIANCE CHECKS ===
  const fetchComplianceChecks = useCallback(async (companyId: string, contractId?: string) => {
    try {
      let query = supabase
        .from('erp_hr_legal_compliance_checks')
        .select('*')
        .eq('company_id', companyId)
        .order('checked_at', { ascending: false });
      if (contractId) query = query.eq('contract_id', contractId);
      const { data, error } = await query.limit(200);
      if (error) throw error;
      setComplianceChecks((data || []) as unknown as ComplianceCheck[]);
    } catch (e) { console.error('fetchComplianceChecks error:', e); }
  }, []);

  // === FETCH STATS ===
  const fetchStats = useCallback(async (companyId: string) => {
    try {
      const [tplRes, clauseRes, contractRes, draftRes, activeRes] = await Promise.all([
        supabase.from('erp_hr_legal_templates').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('erp_hr_legal_clauses').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('erp_hr_legal_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('erp_hr_legal_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'draft'),
        supabase.from('erp_hr_legal_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['active', 'signed']),
      ]);
      setStats({
        total_templates: tplRes.count || 0,
        total_clauses: clauseRes.count || 0,
        total_contracts: contractRes.count || 0,
        draft_contracts: draftRes.count || 0,
        active_contracts: activeRes.count || 0,
        avg_compliance_score: 0,
      });
    } catch (e) { console.error('fetchStats error:', e); }
  }, []);

  // === LOAD ALL ===
  const loadAll = useCallback(async (companyId: string) => {
    setLoading(true);
    await Promise.all([
      fetchTemplates(companyId),
      fetchClauses(companyId),
      fetchContracts(companyId),
      fetchStats(companyId),
    ]);
    setLoading(false);
  }, [fetchTemplates, fetchClauses, fetchContracts, fetchStats]);

  // === AI: Generate Contract ===
  const aiGenerateContract = useCallback(async (companyId: string, params: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: { action: 'ai_generate_contract', company_id: companyId, params }
      });
      if (error) throw error;
      if (data?.success) {
        setAiAnalysis(data.data);
        toast.success('Contrato generado por IA');
        return data.data;
      }
    } catch (e) { console.error('aiGenerateContract error:', e); toast.error('Error generando contrato'); }
    finally { setAiLoading(false); }
    return null;
  }, []);

  // === AI: Compliance Analysis ===
  const aiComplianceAnalysis = useCallback(async (companyId: string, params: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: { action: 'ai_legal_compliance', company_id: companyId, params }
      });
      if (error) throw error;
      if (data?.success) {
        setAiAnalysis(data.data);
        toast.success('Análisis de compliance completado');
        return data.data;
      }
    } catch (e) { console.error('aiComplianceAnalysis error:', e); toast.error('Error en análisis'); }
    finally { setAiLoading(false); }
    return null;
  }, []);

  // === AI: Clause Review ===
  const aiClauseReview = useCallback(async (companyId: string, params: Record<string, unknown>) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: { action: 'ai_clause_review', company_id: companyId, params }
      });
      if (error) throw error;
      if (data?.success) {
        setAiAnalysis(data.data);
        toast.success('Revisión de cláusulas completada');
        return data.data;
      }
    } catch (e) { console.error('aiClauseReview error:', e); toast.error('Error en revisión'); }
    finally { setAiLoading(false); }
    return null;
  }, []);

  // === SEED DEMO ===
  const seedDemo = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: { action: 'legal_seed_demo', company_id: companyId }
      });
      if (error) throw error;
      toast.success('Datos demo cargados');
      await loadAll(companyId);
    } catch (e) { console.error('seedDemo error:', e); toast.error('Error cargando demo'); }
    finally { setLoading(false); }
  }, [loadAll]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('legal-contracts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_legal_contracts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new as unknown as LegalContract;
          setContracts(prev => prev.some(x => x.id === c.id) ? prev : [c, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const c = payload.new as unknown as LegalContract;
          setContracts(prev => prev.map(x => x.id === c.id ? c : x));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    templates, clauses, contracts, complianceChecks, stats, aiAnalysis,
    loading, aiLoading,
    fetchTemplates, fetchClauses, fetchContracts, fetchComplianceChecks, fetchStats,
    loadAll, aiGenerateContract, aiComplianceAnalysis, aiClauseReview, seedDemo,
  };
}
