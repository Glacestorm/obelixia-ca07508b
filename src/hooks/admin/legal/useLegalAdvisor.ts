/**
 * useLegalAdvisor - Hook principal del Agente Jurídico IA
 * Fase 3: Sistema multi-agente de asesoría legal
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LegalRiskLevel } from '@/shared/legal';

// === INTERFACES ===
export interface LegalJurisdiction {
  id: string;
  code: string;
  name: string;
  country: string;
  legal_system: string;
  is_active: boolean;
}

export interface LegalAdvice {
  response: string;
  legal_basis: string[];
  recommendations: string[];
  warnings: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  jurisdiction_applied: string;
  confidence_score: number;
}

export interface ValidationResult {
  approved: boolean;
  conditions: string[];
  warnings: string[];
  blocking_issues: string[];
  legal_basis: string[];
  recommendations: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContractAnalysis {
  summary: string;
  parties: string[];
  key_terms: Array<{ term: string; analysis: string; risk: string }>;
  risks: Array<{ description: string; severity: string; mitigation: string }>;
  missing_clauses: string[];
  recommendations: string[];
  overall_risk_level: string;
  compliance_issues: string[];
}

export interface ComplianceReport {
  checks: Array<{
    regulation: string;
    status: 'compliant' | 'partial' | 'non_compliant';
    score: number;
    findings: string[];
    recommendations: string[];
  }>;
  overall_score: number;
  summary: string;
  priority_actions: string[];
}

export interface LegalPrecedent {
  id: string;
  case_reference: string;
  court: string;
  date: string;
  summary: string;
  relevance_score: number;
  key_points: string[];
  jurisdiction: string;
}

export interface RiskAssessment {
  scenario_summary: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: Array<{ factor: string; impact: string; probability: string }>;
  mitigation_strategies: string[];
  legal_exposure: string;
  recommendations: string[];
}

export interface AgentAction {
  action_type: string;
  action_data: Record<string, unknown>;
  target_entity?: string;
  jurisdictions?: string[];
}

export interface LegalContext {
  entityId?: string;
  entityType?: string;
  jurisdictions?: string[];
  legalArea?: string;
  urgency?: 'immediate' | 'standard' | 'scheduled';
}

// === HOOK ===
export function useLegalAdvisor() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [jurisdictions, setJurisdictions] = useState<LegalJurisdiction[]>([]);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Refs
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH JURISDICTIONS ===
  const fetchJurisdictions = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        { body: { action: 'get_jurisdictions' } }
      );

      if (fnError) throw fnError;
      if (data?.success && data?.jurisdictions) {
        setJurisdictions(data.jurisdictions);
      }
      return data?.jurisdictions || [];
    } catch (err) {
      console.error('[useLegalAdvisor] fetchJurisdictions error:', err);
      return [];
    }
  }, []);

  // === CONSULTA JURÍDICA GENERAL ===
  const consultLegal = useCallback(async (
    query: string,
    context?: LegalContext
  ): Promise<LegalAdvice | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'consult_legal',
            query,
            jurisdictions: context?.jurisdictions || ['ES'],
            legal_area: context?.legalArea,
            urgency: context?.urgency || 'standard',
            context: {
              entityId: context?.entityId,
              entityType: context?.entityType
            }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setLastRefresh(new Date());
        return data as LegalAdvice;
      }

      throw new Error(data?.error || 'Error en consulta jurídica');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] consultLegal error:', err);
      toast.error('Error en consulta jurídica');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VALIDAR ACCIÓN DE AGENTE ===
  const validateAgentAction = useCallback(async (
    agentId: string,
    agentType: string,
    action: AgentAction
  ): Promise<ValidationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'validate_action',
            requesting_agent: agentId,
            requesting_agent_type: agentType,
            agent_action: action,
            jurisdictions: action.jurisdictions || ['ES'],
            urgency: 'immediate'
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data as ValidationResult;
      }

      throw new Error(data?.error || 'Error en validación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] validateAgentAction error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALIZAR CONTRATO ===
  const analyzeContract = useCallback(async (
    contractText: string,
    contractType: string,
    jurisdiction: string = 'ES'
  ): Promise<ContractAnalysis | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'analyze_contract',
            contract_text: contractText,
            contract_type: contractType,
            jurisdictions: [jurisdiction]
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Análisis de contrato completado');
        return data as ContractAnalysis;
      }

      throw new Error(data?.error || 'Error en análisis');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] analyzeContract error:', err);
      toast.error('Error al analizar contrato');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR CUMPLIMIENTO ===
  const checkCompliance = useCallback(async (
    regulations: string[],
    context?: Record<string, unknown>
  ): Promise<ComplianceReport | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'check_compliance',
            regulations,
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data as ComplianceReport;
      }

      throw new Error(data?.error || 'Error en verificación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] checkCompliance error:', err);
      toast.error('Error al verificar cumplimiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === BUSCAR PRECEDENTES ===
  const findPrecedents = useCallback(async (
    caseType: string,
    jurisdiction: string,
    keywords?: string[]
  ): Promise<LegalPrecedent[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'find_precedents',
            query: caseType,
            jurisdictions: [jurisdiction],
            context: { keywords }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.precedents) {
        return data.precedents;
      }

      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] findPrecedents error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EVALUAR RIESGO LEGAL ===
  const assessRisk = useCallback(async (
    scenario: string,
    jurisdictions: string[] = ['ES']
  ): Promise<RiskAssessment | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'assess_risk',
            query: scenario,
            jurisdictions
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data as RiskAssessment;
      }

      throw new Error(data?.error || 'Error en evaluación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] assessRisk error:', err);
      toast.error('Error al evaluar riesgo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERAR DOCUMENTO LEGAL ===
  const generateDocument = useCallback(async (
    templateType: string,
    data: Record<string, unknown>,
    jurisdiction: string = 'ES'
  ): Promise<{ content: string; metadata: Record<string, unknown> } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'generate_document',
            document_type: templateType,
            document_data: data,
            jurisdictions: [jurisdiction]
          }
        }
      );

      if (fnError) throw fnError;

      if (response?.success) {
        toast.success('Documento generado correctamente');
        return {
          content: response.document_content,
          metadata: response.metadata || {}
        };
      }

      throw new Error(response?.error || 'Error en generación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] generateDocument error:', err);
      toast.error('Error al generar documento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ASESORAR AGENTE ===
  const adviseAgent = useCallback(async (
    agentId: string,
    agentType: string,
    query: string,
    context?: Record<string, unknown>
  ): Promise<LegalAdvice | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'advise_agent',
            requesting_agent: agentId,
            requesting_agent_type: agentType,
            query,
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        return data as LegalAdvice;
      }

      throw new Error(data?.error || 'Error en asesoría');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAdvisor] adviseAgent error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH RECENT QUERIES ===
  const fetchRecentQueries = useCallback(async (limit: number = 20) => {
    try {
      const { data, error: dbError } = await supabase
        .from('legal_agent_queries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError) throw dbError;
      setRecentQueries(data || []);
      return data || [];
    } catch (err) {
      console.error('[useLegalAdvisor] fetchRecentQueries error:', err);
      return [];
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    stopAutoRefresh();
    fetchRecentQueries();
    autoRefreshInterval.current = setInterval(() => {
      fetchRecentQueries();
    }, intervalMs);
  }, [fetchRecentQueries]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    fetchJurisdictions();
    return () => stopAutoRefresh();
  }, [fetchJurisdictions, stopAutoRefresh]);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    jurisdictions,
    recentQueries,
    error,
    lastRefresh,
    // Consultas
    consultLegal,
    validateAgentAction,
    analyzeContract,
    checkCompliance,
    findPrecedents,
    assessRisk,
    generateDocument,
    adviseAgent,
    // Data fetching
    fetchJurisdictions,
    fetchRecentQueries,
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useLegalAdvisor;
