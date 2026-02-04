/**
 * useHRContractLifecycle - Hook para Contract Lifecycle Management
 * Gestión inteligente del ciclo de vida de contratos con IA
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface ContractParty {
  role: string;
  name: string;
  obligations: string[];
}

export interface ContractRisk {
  area: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ContractAnalysis {
  contractType: 'employment' | 'commercial' | 'service' | 'nda' | 'other';
  jurisdiction: string;
  effectiveDate: string;
  expirationDate: string | null;
  autoRenewal: boolean;
  keyTerms: Array<{ term: string; value: string; section: string }>;
  parties: ContractParty[];
  criticalDates: Array<{ date: string; event: string; action: string }>;
  riskAreas: ContractRisk[];
  complianceStatus: { isCompliant: boolean; issues: string[] };
  summary: string;
}

export interface SuggestedClause {
  id: string;
  type: string;
  title: string;
  text: string;
  rationale: string;
  isRequired: boolean;
  riskIfOmitted: 'low' | 'medium' | 'high';
  alternatives: Array<{ text: string; context: string }>;
}

export interface ClauseSuggestions {
  suggestedClauses: SuggestedClause[];
  clausesByPriority: {
    essential: string[];
    recommended: string[];
    optional: string[];
  };
  jurisdictionNotes: string;
}

export interface NegotiationProposal {
  originalClause: string;
  proposedClause: string;
  rationale: string;
  expectedResistance: 'low' | 'medium' | 'high';
  fallbackPosition: string;
}

export interface NegotiationStrategy {
  negotiationStrategy: {
    priority: 'high' | 'medium' | 'low';
    approach: 'collaborative' | 'competitive' | 'compromising';
    keyObjectives: string[];
  };
  proposedChanges: NegotiationProposal[];
  concessions: {
    acceptable: string[];
    unacceptable: string[];
    conditional: Array<{ concession: string; condition: string }>;
  };
  batna: string;
  recommendedActions: string[];
}

export interface VersionChange {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  section: string;
  originalText: string | null;
  newText: string | null;
  impact: 'minor' | 'moderate' | 'significant';
  legalImplication: string;
}

export interface VersionComparison {
  comparison: {
    version1: string;
    version2: string;
    comparedAt: string;
  };
  changes: VersionChange[];
  summary: {
    totalChanges: number;
    byImpact: { minor: number; moderate: number; significant: number };
    criticalChanges: string[];
    recommendation: 'approve' | 'review' | 'reject';
  };
  redlineDocument: string;
}

export interface ContractObligation {
  id: string;
  party: string;
  description: string;
  type: 'payment' | 'delivery' | 'reporting' | 'compliance' | 'other';
  dueDate: string | null;
  isRecurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | null;
  condition: string | null;
  penalty: string | null;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ObligationsExtraction {
  obligations: ContractObligation[];
  obligationsByParty: Record<string, string[]>;
  timeline: Array<{ date: string; obligations: string[] }>;
  criticalDeadlines: Array<{ date: string; obligation: string; penalty: string }>;
  complianceChecklist: Array<{ item: string; responsible: string; deadline: string }>;
}

export interface ContractRiskItem {
  id: string;
  category: 'legal' | 'financial' | 'operational' | 'reputational' | 'compliance';
  description: string;
  likelihood: 'unlikely' | 'possible' | 'likely' | 'certain';
  impact: 'minor' | 'moderate' | 'major' | 'severe';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategy: string;
  residualRisk: 'low' | 'medium' | 'high';
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  risks: ContractRiskItem[];
  riskMatrix: {
    highLikelihoodHighImpact: string[];
    highLikelihoodLowImpact: string[];
    lowLikelihoodHighImpact: string[];
    lowLikelihoodLowImpact: string[];
  };
  recommendations: Array<{
    priority: number;
    action: string;
    expectedOutcome: string;
    resources: string;
  }>;
  approvalRecommendation: 'approve' | 'conditionalApprove' | 'reject';
  conditions: string[];
}

export interface ContractAmendment {
  amendment: {
    title: string;
    effectiveDate: string;
    referenceContract: string;
    parties: Array<{ name: string; role: string }>;
    recitals: string[];
    modifications: Array<{
      section: string;
      originalText: string;
      amendedText: string;
      rationale: string;
    }>;
    newClauses: Array<{ title: string; text: string }>;
    deletedClauses: Array<{ section: string; reason: string }>;
    generalProvisions: string[];
    signatureBlock: string;
  };
  documentText: string;
  validationChecklist: Array<{ item: string; status: 'pass' | 'fail' | 'warning' }>;
}

// === HOOK ===

export function useHRContractLifecycle() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analysis states
  const [contractAnalysis, setContractAnalysis] = useState<ContractAnalysis | null>(null);
  const [clauseSuggestions, setClauseSuggestions] = useState<ClauseSuggestions | null>(null);
  const [negotiationStrategy, setNegotiationStrategy] = useState<NegotiationStrategy | null>(null);
  const [versionComparison, setVersionComparison] = useState<VersionComparison | null>(null);
  const [obligations, setObligations] = useState<ObligationsExtraction | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [amendment, setAmendment] = useState<ContractAmendment | null>(null);

  // === ANALYZE CONTRACT ===
  const analyzeContract = useCallback(async (contractText: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'analyze_contract',
          params: { contractText }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setContractAnalysis(data.data);
        toast.success('Contrato analizado correctamente');
        return data.data as ContractAnalysis;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al analizar contrato';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SUGGEST CLAUSES ===
  const suggestClauses = useCallback(async (
    contractType: string,
    jurisdiction: string,
    context?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'suggest_clauses',
          params: { contractType, jurisdiction },
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setClauseSuggestions(data.data);
        toast.success('Cláusulas sugeridas generadas');
        return data.data as ClauseSuggestions;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sugerir cláusulas';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === NEGOTIATE TERMS ===
  const negotiateTerms = useCallback(async (params: {
    currentTerms: string;
    desiredOutcome: string;
    constraints?: string[];
    counterpartyPosition?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'negotiate_terms',
          params
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setNegotiationStrategy(data.data);
        toast.success('Estrategia de negociación generada');
        return data.data as NegotiationStrategy;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar estrategia';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === COMPARE VERSIONS ===
  const compareVersions = useCallback(async (version1Text: string, version2Text: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'compare_versions',
          params: { version1Text, version2Text }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setVersionComparison(data.data);
        toast.success('Versiones comparadas');
        return data.data as VersionComparison;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al comparar versiones';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EXTRACT OBLIGATIONS ===
  const extractObligations = useCallback(async (contractText: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'extract_obligations',
          params: { contractText }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setObligations(data.data);
        toast.success('Obligaciones extraídas');
        return data.data as ObligationsExtraction;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al extraer obligaciones';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RISK ASSESSMENT ===
  const assessRisks = useCallback(async (contractData: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'risk_assessment',
          params: { contractData }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setRiskAssessment(data.data);
        toast.success('Evaluación de riesgos completada');
        return data.data as RiskAssessment;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en evaluación de riesgos';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE AMENDMENT ===
  const generateAmendment = useCallback(async (
    originalContractId: string,
    requestedChanges: Array<{ section: string; change: string }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-clm-agent', {
        body: {
          action: 'generate_amendment',
          params: { originalContractId, requestedChanges }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setAmendment(data.data);
        toast.success('Enmienda generada');
        return data.data as ContractAmendment;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar enmienda';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CLEAR STATE ===
  const clearAnalysis = useCallback(() => {
    setContractAnalysis(null);
    setClauseSuggestions(null);
    setNegotiationStrategy(null);
    setVersionComparison(null);
    setObligations(null);
    setRiskAssessment(null);
    setAmendment(null);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    contractAnalysis,
    clauseSuggestions,
    negotiationStrategy,
    versionComparison,
    obligations,
    riskAssessment,
    amendment,
    // Actions
    analyzeContract,
    suggestClauses,
    negotiateTerms,
    compareVersions,
    extractObligations,
    assessRisks,
    generateAmendment,
    clearAnalysis,
  };
}

export default useHRContractLifecycle;
