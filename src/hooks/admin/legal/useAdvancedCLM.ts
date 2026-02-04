/**
 * useAdvancedCLM - Fase 10
 * Hook para Contract Lifecycle Management avanzado
 * Negociación, firma electrónica y clause library
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type ContractStatus = 'draft' | 'review' | 'negotiation' | 'approval' | 'signing' | 'active' | 'expired' | 'terminated';
export type SignatureType = 'simple' | 'advanced' | 'qualified';
export type ApprovalStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';

export interface Contract {
  id: string;
  type: string;
  title: string;
  version: string;
  status: ContractStatus;
  parties: ContractParty[];
  terms: ContractTerms;
  sections: ContractSection[];
  annexes: ContractAnnex[];
  metadata: ContractMetadata;
}

export interface ContractParty {
  role: 'issuer' | 'counterparty';
  type: 'company' | 'individual';
  name: string;
  identifier: string;
  address: string;
  representative?: {
    name: string;
    position: string;
    powers: string;
  };
}

export interface ContractTerms {
  effectiveDate: string;
  duration: string;
  renewalTerms: string;
  terminationNotice: number;
  jurisdiction: string;
  governingLaw: string;
}

export interface ContractSection {
  id: string;
  title: string;
  order: number;
  content: string;
  clauses: ContractClause[];
}

export interface ContractClause {
  id: string;
  clauseLibraryId?: string;
  name: string;
  text: string;
  type: 'standard' | 'custom' | 'negotiable';
  riskLevel: 'low' | 'medium' | 'high';
  isRequired: boolean;
  alternatives: string[];
}

export interface ContractAnnex {
  id: string;
  title: string;
  type: 'schedule' | 'exhibit' | 'appendix';
  content: string;
}

export interface ContractMetadata {
  createdAt: string;
  createdBy: string;
  language: 'es' | 'en' | 'ca';
  template: string;
  tags: string[];
}

export interface ClauseLibrary {
  categories: ClauseCategory[];
  clauses: LibraryClause[];
  recentlyUsed: string[];
  recommended: string[];
}

export interface ClauseCategory {
  name: string;
  description: string;
  clauseCount: number;
}

export interface LibraryClause {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  contractTypes: string[];
  jurisdictions: string[];
  text: string;
  variables: ClauseVariable[];
  riskLevel: 'low' | 'medium' | 'high';
  isStandard: boolean;
  isNegotiable: boolean;
  alternatives: ClauseAlternative[];
  legalBasis: string;
  lastUpdated: string;
  usageCount: number;
  approvalStatus: 'approved' | 'pending' | 'deprecated';
}

export interface ClauseVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  default?: unknown;
}

export interface ClauseAlternative {
  id: string;
  name: string;
  text: string;
  difference: string;
  riskChange: 'increase' | 'decrease' | 'neutral';
}

export interface NegotiationSession {
  clauseId: string;
  clauseName: string;
  currentText: string;
  negotiationRound: number;
  positions: NegotiationPosition[];
  analysis: NegotiationAnalysis;
  recommendations: NegotiationRecommendation[];
  fallbackPositions: FallbackPosition[];
  deadlockResolution: {
    suggestedMediation: boolean;
    alternativeApproaches: string[];
  };
}

export interface NegotiationPosition {
  party: string;
  proposedText: string;
  rationale: string;
  redLines: string[];
  flexibility: 'low' | 'medium' | 'high';
}

export interface NegotiationAnalysis {
  keyDifferences: string[];
  riskComparison: {
    partyA: { current: number; proposed: number };
    partyB: { current: number; proposed: number };
  };
  marketBenchmark: string;
}

export interface NegotiationRecommendation {
  option: number;
  text: string;
  acceptability: {
    partyA: number;
    partyB: number;
  };
  riskBalance: 'balanced' | 'favors_a' | 'favors_b';
  rationale: string;
}

export interface FallbackPosition {
  level: number;
  text: string;
  conditions: string;
}

export interface Playbook {
  id: string;
  name: string;
  contractType: string;
  version: string;
  createdAt: string;
  overview: PlaybookOverview;
  clauseStrategies: ClauseStrategy[];
  overallStrategy: OverallStrategy;
  escalationPath: EscalationStep[];
}

export interface PlaybookOverview {
  objective: string;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  priorityClauses: string[];
  dealBreakers: string[];
}

export interface ClauseStrategy {
  clauseId: string;
  clauseName: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  initialPosition: {
    text: string;
    rationale: string;
  };
  acceptableRange: {
    minimum: string;
    maximum: string;
  };
  fallbackPositions: FallbackPosition[];
  redLines: string[];
  tradingChips: string[];
  negotiationTips: string[];
}

export interface OverallStrategy {
  approach: 'collaborative' | 'competitive' | 'mixed';
  priorityOrder: string[];
  tradingMatrix: {
    give: string;
    get: string;
  }[];
}

export interface EscalationStep {
  level: number;
  trigger: string;
  action: string;
  approver: string;
}

export interface ApprovalWorkflow {
  contractId: string;
  contractTitle: string;
  currentStatus: ApprovalStatus;
  submittedAt: string;
  submittedBy: string;
  approvalSteps: ApprovalStep[];
  currentStep: number;
  pendingApprovers: string[];
  timeline: TimelineEntry[];
  notifications: NotificationStatus;
  delegations: Delegation[];
}

export interface ApprovalStep {
  stepId: string;
  stepName: string;
  order: number;
  type: 'sequential' | 'parallel';
  approvers: Approver[];
  requiredApprovals: 'all' | 'any' | number;
  deadline: string;
  slaStatus: 'on_track' | 'at_risk' | 'breached';
}

export interface Approver {
  userId: string;
  userName: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  decidedAt?: string;
  comments?: string;
  signature?: string;
}

export interface TimelineEntry {
  timestamp: string;
  event: string;
  by: string;
  details: string;
}

export interface NotificationStatus {
  remindersSent: number;
  nextReminder: string;
  escalationTriggered: boolean;
}

export interface Delegation {
  from: string;
  to: string;
  reason: string;
  validUntil: string;
}

export interface SignaturePreparation {
  contractId: string;
  documentId: string;
  signatureType: SignatureType;
  eIDASLevel: string;
  status: 'preparing' | 'ready' | 'in_progress' | 'completed';
  signatories: Signatory[];
  document: DocumentInfo;
  legalRequirements: LegalRequirements;
  signatureProvider: SignatureProvider;
  completionEstimate: string;
}

export interface Signatory {
  order: number;
  party: string;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signatureFields: SignatureField[];
  authentication: {
    method: 'email' | 'sms' | 'id_document' | 'certificate';
    verified: boolean;
  };
  status: 'pending' | 'notified' | 'viewed' | 'signed' | 'declined';
  signedAt?: string;
}

export interface SignatureField {
  fieldId: string;
  page: number;
  position: { x: number; y: number };
  type: 'signature' | 'initials' | 'date' | 'text';
}

export interface DocumentInfo {
  title: string;
  pages: number;
  hash: string;
  format: string;
  size: number;
}

export interface LegalRequirements {
  witnessRequired: boolean;
  notarizationRequired: boolean;
  timestampRequired: boolean;
  archivalPeriod: number;
}

export interface SignatureProvider {
  name: 'DocuSign' | 'Adobe Sign' | 'Internal';
  envelopeId: string;
  status: string;
}

export interface VersionComparison {
  contractId: string;
  version1: VersionInfo;
  version2: VersionInfo;
  summary: ComparisonSummary;
  changes: VersionChange[];
  riskAnalysis: VersionRiskAnalysis;
  approvalRequired: {
    required: boolean;
    reason: string;
    suggestedApprovers: string[];
  };
}

export interface VersionInfo {
  version: string;
  date: string;
  author: string;
}

export interface ComparisonSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  significantChanges: number;
}

export interface VersionChange {
  id: string;
  type: 'added' | 'deleted' | 'modified';
  section: string;
  clause: string;
  originalText: string;
  newText: string;
  significance: 'minor' | 'moderate' | 'major';
  riskImpact: {
    direction: 'increase' | 'decrease' | 'neutral';
    magnitude: 'low' | 'medium' | 'high';
  };
  legalImplication: string;
  requiresReview: boolean;
}

export interface VersionRiskAnalysis {
  overallRiskChange: number;
  criticalChanges: string[];
  recommendations: string[];
}

export interface ObligationsExtraction {
  contractId: string;
  extractedAt: string;
  parties: string[];
  obligations: ExtractedObligation[];
  calendar: ObligationCalendarEntry[];
  riskAssessment: ObligationRiskAssessment;
}

export interface ExtractedObligation {
  id: string;
  party: string;
  type: 'payment' | 'delivery' | 'service' | 'notification' | 'compliance' | 'other';
  description: string;
  sourceClause: string;
  sourceSection: string;
  deadline: {
    type: 'fixed_date' | 'relative' | 'recurring' | 'on_demand';
    date?: string;
    reference?: string;
    frequency?: string;
  };
  conditions: ObligationCondition[];
  value?: {
    amount: number;
    currency: string;
    calculation: string;
  };
  consequences: {
    penalty?: string;
    termination: boolean;
    other?: string;
  };
  status: 'pending' | 'active' | 'completed' | 'overdue';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ObligationCondition {
  type: 'precedent' | 'subsequent';
  description: string;
}

export interface ObligationCalendarEntry {
  date: string;
  obligations: string[];
  type: 'deadline' | 'milestone' | 'review';
}

export interface ObligationRiskAssessment {
  highRiskObligations: string[];
  totalExposure: number;
  recommendations: string[];
}

export interface ContractRiskAnalysis {
  contractId: string;
  analyzedAt: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risksByCategory: Record<string, CategoryRisk>;
  clauseRisks: ClauseRisk[];
  counterpartyRisk: CounterpartyRisk;
  complianceRisks: ComplianceRisks;
  recommendations: RiskRecommendation[];
}

export interface CategoryRisk {
  score: number;
  risks: RiskItem[];
}

export interface RiskItem {
  id: string;
  description: string;
  clause: string;
  probability: number;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ClauseRisk {
  clauseId: string;
  clauseName: string;
  riskScore: number;
  issues: string[];
  recommendations: string[];
}

export interface CounterpartyRisk {
  score: number;
  factors: string[];
  dueDiligence: {
    completed: boolean;
    findings: string[];
  };
}

export interface ComplianceRisks {
  regulations: string[];
  gaps: string[];
  remediation: string[];
}

export interface RiskRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedRiskReduction: number;
}

// === HOOK ===

export function useAdvancedCLM() {
  const [isLoading, setIsLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [clauseLibrary, setClauseLibrary] = useState<ClauseLibrary | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [signaturePreparation, setSignaturePreparation] = useState<SignaturePreparation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === CREAR CONTRATO ===
  const createContract = useCallback(async (
    params: {
      type: string;
      title: string;
      parties: Partial<ContractParty>[];
      terms: Partial<ContractTerms>;
      template?: string;
    }
  ): Promise<Contract | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'create_contract',
            context: params
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.contract) {
        const contract = data.data.contract as Contract;
        setContracts(prev => [...prev, contract]);
        setCurrentContract(contract);
        toast.success('Contrato creado correctamente');
        return contract;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear contrato';
      setError(message);
      console.error('[useAdvancedCLM] createContract error:', err);
      toast.error('Error al crear contrato');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === NEGOCIAR CLÁUSULA ===
  const negotiateClause = useCallback(async (
    contractId: string,
    clauseId: string,
    proposedText: string,
    rationale: string
  ): Promise<NegotiationSession | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'negotiate_clause',
            context: { contractId },
            params: { clauseId, proposedText, rationale }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.negotiation) {
        return data.data.negotiation as NegotiationSession;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] negotiateClause error:', err);
      toast.error('Error en la negociación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER BIBLIOTECA DE CLÁUSULAS ===
  const fetchClauseLibrary = useCallback(async (
    filters?: {
      category?: string;
      contractType?: string;
      jurisdiction?: string;
    }
  ): Promise<ClauseLibrary | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'get_clause_library',
            params: filters
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.clauseLibrary) {
        const library = data.data.clauseLibrary as ClauseLibrary;
        setClauseLibrary(library);
        setLastRefresh(new Date());
        return library;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] fetchClauseLibrary error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SUGERIR CLÁUSULAS ===
  const suggestClauses = useCallback(async (
    contractType: string,
    riskProfile: 'conservative' | 'balanced' | 'aggressive'
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'suggest_clauses',
            params: { contractType, riskProfile }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.suggestions) {
        return data.data.suggestions;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] suggestClauses error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREAR PLAYBOOK ===
  const createPlaybook = useCallback(async (
    contractType: string,
    params: Partial<PlaybookOverview>
  ): Promise<Playbook | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'create_playbook',
            params: { contractType, ...params }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.playbook) {
        toast.success('Playbook creado correctamente');
        return data.data.playbook as Playbook;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] createPlaybook error:', err);
      toast.error('Error al crear playbook');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GESTIONAR APROBACIÓN ===
  const trackApproval = useCallback(async (
    contractId: string
  ): Promise<ApprovalWorkflow | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'track_approval',
            context: { contractId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.approvalWorkflow) {
        const workflow = data.data.approvalWorkflow as ApprovalWorkflow;
        setApprovalWorkflow(workflow);
        return workflow;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] trackApproval error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PREPARAR FIRMA ===
  const prepareSignature = useCallback(async (
    contractId: string,
    signatureType: SignatureType,
    signatories: Partial<Signatory>[]
  ): Promise<SignaturePreparation | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'prepare_signature',
            context: { contractId },
            params: { signatureType, signatories }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.signaturePreparation) {
        const preparation = data.data.signaturePreparation as SignaturePreparation;
        setSignaturePreparation(preparation);
        toast.success('Preparación de firma iniciada');
        return preparation;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] prepareSignature error:', err);
      toast.error('Error al preparar firma');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === COMPARAR VERSIONES ===
  const compareVersions = useCallback(async (
    contractId: string,
    version1: string,
    version2: string
  ): Promise<VersionComparison | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'compare_versions',
            params: { contractId, version1, version2 }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.versionComparison) {
        return data.data.versionComparison as VersionComparison;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] compareVersions error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EXTRAER OBLIGACIONES ===
  const extractObligations = useCallback(async (
    contractId: string
  ): Promise<ObligationsExtraction | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'extract_obligations',
            context: { contractId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.obligationsExtraction) {
        return data.data.obligationsExtraction as ObligationsExtraction;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] extractObligations error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANÁLISIS DE RIESGOS ===
  const analyzeRisks = useCallback(async (
    contractId: string
  ): Promise<ContractRiskAnalysis | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'advanced-clm-engine',
        {
          body: {
            action: 'get_risk_analysis',
            context: { contractId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.riskAnalysis) {
        return data.data.riskAnalysis as ContractRiskAnalysis;
      }

      return null;
    } catch (err) {
      console.error('[useAdvancedCLM] analyzeRisks error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === REFRESH AUTOMÁTICO ===
  const startAutoRefresh = useCallback((contractId: string, intervalMs = 60000) => {
    stopAutoRefresh();

    trackApproval(contractId);

    refreshInterval.current = setInterval(() => {
      trackApproval(contractId);
    }, intervalMs);
  }, [trackApproval]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    contracts,
    currentContract,
    clauseLibrary,
    approvalWorkflow,
    signaturePreparation,
    error,
    lastRefresh,

    // Actions
    createContract,
    negotiateClause,
    fetchClauseLibrary,
    suggestClauses,
    createPlaybook,
    trackApproval,
    prepareSignature,
    compareVersions,
    extractObligations,
    analyzeRisks,
    startAutoRefresh,
    stopAutoRefresh,
    setCurrentContract
  };
}

export default useAdvancedCLM;
