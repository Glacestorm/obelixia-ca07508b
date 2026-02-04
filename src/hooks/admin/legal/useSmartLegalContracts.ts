/**
 * useSmartLegalContracts - Fase 10
 * Hook para contratos auto-ejecutables con cláusulas programables
 * Enterprise SaaS 2025-2026
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type ClauseType = 'payment' | 'penalty' | 'renewal' | 'termination' | 'notification' | 'custom';
export type TriggerType = 'date' | 'event' | 'threshold' | 'external_data';
export type ActionType = 'payment' | 'notification' | 'status_change' | 'escalation' | 'external_call';
export type ContractStatus = 'draft' | 'active' | 'suspended' | 'terminated' | 'expired';
export type DisputeStatus = 'open' | 'under_review' | 'proposed_resolution' | 'resolved' | 'escalated';

export interface SmartContract {
  id: string;
  version: string;
  title: string;
  parties: ContractParty[];
  effectiveDate: string;
  expirationDate: string;
  jurisdiction: string[];
  programmableClauses: ProgrammableClause[];
  obligations: ContractObligation[];
  auditTrail: AuditTrailEntry;
  legalValidity: LegalValidity;
}

export interface ContractParty {
  id: string;
  role: 'issuer' | 'counterparty';
  name: string;
  identifier: string;
}

export interface ProgrammableClause {
  id: string;
  name: string;
  type: ClauseType;
  description: string;
  trigger: ClauseTrigger;
  conditions: ClauseCondition[];
  action: ClauseAction;
  isActive: boolean;
  lastExecuted?: string;
  executionCount: number;
}

export interface ClauseTrigger {
  type: TriggerType;
  config: {
    date?: string;
    eventType?: string;
    threshold?: number;
    dataSource?: string;
  };
}

export interface ClauseCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'between' | 'in';
  value: unknown;
  logicalOp?: 'AND' | 'OR';
}

export interface ClauseAction {
  type: ActionType;
  params: {
    amount?: number;
    currency?: string;
    recipient?: string;
    template?: string;
    [key: string]: unknown;
  };
}

export interface ContractObligation {
  id: string;
  party: string;
  description: string;
  deadline: string;
  status: 'pending' | 'completed' | 'overdue' | 'waived';
  linkedClauses: string[];
}

export interface AuditTrailEntry {
  createdAt: string;
  createdBy: string;
  hash: string;
  previousHash: string;
}

export interface LegalValidity {
  isValid: boolean;
  eIDASCompliant: boolean;
  electronicSignature: 'simple' | 'advanced' | 'qualified';
  timestampAuthority: string;
}

export interface ClauseExecution {
  executionId: string;
  clauseId: string;
  contractId: string;
  executedAt: string;
  triggerDetails: {
    type: string;
    triggerValue: unknown;
    triggerTimestamp: string;
  };
  conditionsEvaluated: {
    condition: string;
    result: boolean;
    actualValue: unknown;
  }[];
  actionExecuted: {
    type: string;
    status: 'success' | 'failed' | 'pending';
    result: Record<string, unknown>;
    externalReferences: ExternalReference[];
  };
  notifications: ExecutionNotification[];
  auditEntry: {
    hash: string;
    previousHash: string;
    signature: string;
  };
}

export interface ExternalReference {
  system: string;
  referenceId: string;
  status: string;
}

export interface ExecutionNotification {
  recipient: string;
  channel: 'email' | 'sms' | 'platform';
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
}

export interface ConditionVerification {
  clauseId: string;
  contractId: string;
  evaluatedAt: string;
  overallResult: boolean;
  conditions: VerifiedCondition[];
  pendingConditions: PendingCondition[];
  recommendations: ConditionRecommendation[];
  nextEvaluation: string;
}

export interface VerifiedCondition {
  id: string;
  description: string;
  expectedValue: unknown;
  actualValue: unknown;
  operator: string;
  result: boolean;
  dataSource: string;
  lastUpdated: string;
}

export interface PendingCondition {
  id: string;
  description: string;
  estimatedCompletion: string;
  dependency: string;
}

export interface ConditionRecommendation {
  condition: string;
  suggestion: string;
}

export interface Dispute {
  disputeId: string;
  contractId: string;
  status: DisputeStatus;
  initiatedBy: string;
  initiatedAt: string;
  disputeType: string;
  description: string;
  parties: DisputeParty[];
  analysis: DisputeAnalysis;
  proposedResolution: ProposedResolution;
  escalation: DisputeEscalation;
  timeline: DisputeTimelineEntry[];
}

export interface DisputeParty {
  id: string;
  name: string;
  position: string;
  evidence: DisputeEvidence[];
}

export interface DisputeEvidence {
  type: 'document' | 'log' | 'testimony';
  description: string;
  hash: string;
}

export interface DisputeAnalysis {
  relevantClauses: string[];
  contractualBasis: string;
  legalPrecedents: string[];
  riskAssessment: {
    partyA: number;
    partyB: number;
  };
}

export interface ProposedResolution {
  type: 'mediation' | 'arbitration' | 'automatic' | 'judicial';
  recommendation: string;
  actions: DisputeAction[];
  compensation: {
    required: boolean;
    amount: number;
    from: string;
    to: string;
  };
}

export interface DisputeAction {
  party: string;
  action: string;
  deadline: string;
}

export interface DisputeEscalation {
  required: boolean;
  level: 'internal' | 'mediation' | 'arbitration' | 'court';
  reason: string;
  nextSteps: string[];
}

export interface DisputeTimelineEntry {
  date: string;
  event: string;
  by: string;
}

export interface ExecutionSimulation {
  simulationId: string;
  contractId: string;
  clauseId: string;
  simulatedAt: string;
  scenarios: SimulationScenario[];
  riskAnalysis: SimulationRiskAnalysis;
  recommendations: SimulationRecommendation[];
  comparisonWithCurrent: {
    currentBehavior: string;
    proposedBehavior: string;
    improvement: string;
  };
}

export interface SimulationScenario {
  name: string;
  description: string;
  assumptions: Record<string, unknown>;
  result: {
    triggered: boolean;
    action: string;
    outcome: Record<string, unknown>;
    financialImpact: number;
  };
  probability: number;
}

export interface SimulationRiskAnalysis {
  identifiedRisks: SimulationRisk[];
  overallRiskScore: number;
}

export interface SimulationRisk {
  risk: string;
  probability: number;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface SimulationRecommendation {
  type: 'modify_condition' | 'add_clause' | 'remove_clause' | 'adjust_threshold';
  description: string;
  expectedImprovement: string;
}

export interface ContractAudit {
  auditId: string;
  contractId: string;
  auditedAt: string;
  auditor: string;
  legalCompliance: LegalComplianceAudit;
  technicalIntegrity: TechnicalIntegrityAudit;
  executionCompliance: ExecutionComplianceAudit;
  riskAssessment: AuditRiskAssessment;
  summary: AuditSummary;
}

export interface LegalComplianceAudit {
  isCompliant: boolean;
  jurisdictions: string[];
  issues: AuditIssue[];
  certificates: string[];
}

export interface AuditIssue {
  severity: 'critical' | 'major' | 'minor';
  description: string;
  remediation: string;
}

export interface TechnicalIntegrityAudit {
  hashChainValid: boolean;
  signaturesValid: boolean;
  dataConsistency: boolean;
  issues: string[];
}

export interface ExecutionComplianceAudit {
  totalClauses: number;
  executedCorrectly: number;
  executedIncorrectly: number;
  notYetTriggered: number;
  discrepancies: string[];
}

export interface AuditRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
}

export interface AuditSummary {
  score: number;
  status: 'compliant' | 'requires_attention' | 'non_compliant';
  keyFindings: string[];
  nextAuditDate: string;
}

export interface ObligationsStatus {
  contractId: string;
  lastUpdated: string;
  summary: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    waived: number;
  };
  obligations: ObligationDetail[];
  upcomingDeadlines: UpcomingDeadline[];
  overdueActions: OverdueAction[];
}

export interface ObligationDetail {
  id: string;
  party: string;
  partyName: string;
  description: string;
  type: 'payment' | 'delivery' | 'notification' | 'action';
  deadline: string;
  status: 'pending' | 'completed' | 'overdue' | 'waived';
  completedAt?: string;
  linkedClause: string;
  consequences: {
    penalty: number;
    escalation: boolean;
  };
  evidence: unknown[];
}

export interface UpcomingDeadline {
  obligationId: string;
  description: string;
  deadline: string;
  daysRemaining: number;
  priority: 'high' | 'medium' | 'low';
}

export interface OverdueAction {
  obligationId: string;
  daysOverdue: number;
  penaltyAccrued: number;
  escalationStatus: string;
}

// === HOOK ===

export function useSmartLegalContracts() {
  const [isLoading, setIsLoading] = useState(false);
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [currentContract, setCurrentContract] = useState<SmartContract | null>(null);
  const [executions, setExecutions] = useState<ClauseExecution[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [obligationsStatus, setObligationsStatus] = useState<ObligationsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const monitorInterval = useRef<NodeJS.Timeout | null>(null);

  // === CREAR SMART CONTRACT ===
  const createSmartContract = useCallback(async (
    params: {
      title: string;
      type: string;
      parties: Partial<ContractParty>[];
      terms: Record<string, unknown>;
      clauses?: Partial<ProgrammableClause>[];
    }
  ): Promise<SmartContract | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'create_smart_contract',
            context: params
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.smartContract) {
        const contract = data.data.smartContract as SmartContract;
        setContracts(prev => [...prev, contract]);
        setCurrentContract(contract);
        toast.success('Smart Contract creado correctamente');
        return contract;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear contrato';
      setError(message);
      console.error('[useSmartLegalContracts] createSmartContract error:', err);
      toast.error('Error al crear Smart Contract');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EJECUTAR CLÁUSULA ===
  const executeClause = useCallback(async (
    contractId: string,
    clauseId: string,
    context?: Record<string, unknown>
  ): Promise<ClauseExecution | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'execute_clause',
            context: { contractId },
            params: { clauseId, ...context }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.clauseExecution) {
        const execution = data.data.clauseExecution as ClauseExecution;
        setExecutions(prev => [...prev, execution]);

        if (execution.actionExecuted.status === 'success') {
          toast.success('Cláusula ejecutada correctamente');
        } else if (execution.actionExecuted.status === 'failed') {
          toast.error('Error en la ejecución de la cláusula');
        }

        return execution;
      }

      return null;
    } catch (err) {
      console.error('[useSmartLegalContracts] executeClause error:', err);
      toast.error('Error al ejecutar cláusula');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR CONDICIONES ===
  const verifyConditions = useCallback(async (
    contractId: string,
    clauseId: string
  ): Promise<ConditionVerification | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'verify_conditions',
            params: { contractId, clauseId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.conditionVerification) {
        return data.data.conditionVerification as ConditionVerification;
      }

      return null;
    } catch (err) {
      console.error('[useSmartLegalContracts] verifyConditions error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RESOLVER DISPUTA ===
  const resolveDispute = useCallback(async (
    contractId: string,
    disputeDetails: {
      type: string;
      description: string;
      evidence?: DisputeEvidence[];
    }
  ): Promise<Dispute | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'resolve_dispute',
            context: { contractId },
            params: disputeDetails
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.disputeResolution) {
        const dispute = data.data.disputeResolution as Dispute;
        setDisputes(prev => [...prev, dispute]);
        toast.info(`Disputa ${dispute.status}: ${dispute.description}`);
        return dispute;
      }

      return null;
    } catch (err) {
      console.error('[useSmartLegalContracts] resolveDispute error:', err);
      toast.error('Error al procesar disputa');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SIMULAR EJECUCIÓN ===
  const simulateExecution = useCallback(async (
    contractId: string,
    clauseId: string,
    scenarios?: Record<string, unknown>[]
  ): Promise<ExecutionSimulation | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'simulate_execution',
            context: { contractId, clauseId },
            params: { scenarios }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.simulation) {
        return data.data.simulation as ExecutionSimulation;
      }

      return null;
    } catch (err) {
      console.error('[useSmartLegalContracts] simulateExecution error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === AUDITAR CONTRATO ===
  const auditContract = useCallback(async (
    contractId: string
  ): Promise<ContractAudit | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'audit_contract',
            context: { contractId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.contractAudit) {
        const audit = data.data.contractAudit as ContractAudit;
        
        if (audit.summary.status === 'non_compliant') {
          toast.error('Contrato no cumple con requisitos');
        } else if (audit.summary.status === 'requires_attention') {
          toast.warning('Contrato requiere atención');
        } else {
          toast.success('Auditoría completada: Contrato cumple');
        }

        return audit;
      }

      return null;
    } catch (err) {
      console.error('[useSmartLegalContracts] auditContract error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER ESTADO DE OBLIGACIONES ===
  const fetchObligationsStatus = useCallback(async (
    contractId: string
  ): Promise<ObligationsStatus | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'get_obligations_status',
            context: { contractId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.obligationsStatus) {
        const status = data.data.obligationsStatus as ObligationsStatus;
        setObligationsStatus(status);
        setLastRefresh(new Date());
        return status;
      }

      return null;
    } catch (err) {
      console.error('[useSmartLegalContracts] fetchObligationsStatus error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER LOG DE EJECUCIÓN ===
  const fetchExecutionLog = useCallback(async (
    contractId: string,
    filters?: {
      clauseId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<ClauseExecution[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'smart-legal-contracts',
        {
          body: {
            action: 'get_execution_log',
            context: { contractId },
            params: filters
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.executionLog?.entries) {
        const entries = data.data.executionLog.entries as ClauseExecution[];
        setExecutions(entries);
        return entries;
      }

      return [];
    } catch (err) {
      console.error('[useSmartLegalContracts] fetchExecutionLog error:', err);
      return [];
    }
  }, []);

  // === MONITOREO DE CONTRATOS ===
  const startContractMonitoring = useCallback((
    contractId: string,
    intervalMs = 60000
  ) => {
    stopContractMonitoring();

    fetchObligationsStatus(contractId);

    monitorInterval.current = setInterval(() => {
      fetchObligationsStatus(contractId);
    }, intervalMs);
  }, [fetchObligationsStatus]);

  const stopContractMonitoring = useCallback(() => {
    if (monitorInterval.current) {
      clearInterval(monitorInterval.current);
      monitorInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopContractMonitoring();
  }, [stopContractMonitoring]);

  return {
    // State
    isLoading,
    contracts,
    currentContract,
    executions,
    disputes,
    obligationsStatus,
    error,
    lastRefresh,

    // Actions
    createSmartContract,
    executeClause,
    verifyConditions,
    resolveDispute,
    simulateExecution,
    auditContract,
    fetchObligationsStatus,
    fetchExecutionLog,
    startContractMonitoring,
    stopContractMonitoring,
    setCurrentContract
  };
}

export default useSmartLegalContracts;
