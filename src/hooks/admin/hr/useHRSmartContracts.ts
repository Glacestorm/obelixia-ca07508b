/**
 * useHRSmartContracts Hook
 * Gestión de Contratos Legales Inteligentes y Smart Contracts
 * Fase 6 del Plan Maestro RRHH Enterprise
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type ContractType = 'employment' | 'severance' | 'bonus' | 'benefits' | 'nda' | 'non_compete';
export type ContractStatus = 'draft' | 'active' | 'suspended' | 'terminated' | 'expired';
export type ConditionType = 'time_based' | 'event_based' | 'metric_based' | 'approval_based' | 'external_trigger';
export type TriggerCategory = 'temporal' | 'financial' | 'performance' | 'lifecycle' | 'compliance';

export interface ContractParty {
  role: 'employer' | 'employee' | 'witness' | 'guarantor';
  name: string;
  identifier: string;
  signatureRequired: boolean;
}

export interface SmartContractClause {
  id: string;
  name: string;
  type: 'mandatory' | 'conditional' | 'optional';
  description: string;
  automatable: boolean;
  executionLogic: string;
  dependencies: string[];
}

export interface SmartContractCondition {
  id: string;
  clauseId: string;
  type: ConditionType;
  expression: string;
  parameters: Record<string, unknown>;
}

export interface SmartContract {
  id: string;
  name: string;
  type: ContractType;
  version: string;
  status: ContractStatus;
  parties: ContractParty[];
  effectiveDate: string;
  expirationDate: string | null;
  autoRenewal: boolean;
  renewalTerms: string | null;
  clauses?: SmartContractClause[];
  conditions?: SmartContractCondition[];
  metadata?: {
    jurisdiction: string;
    governingLaw: string;
    disputeResolution: string;
    confidentialityLevel: string;
  };
}

export interface ContractTrigger {
  id: string;
  name: string;
  category: TriggerCategory;
  event: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  actions: Array<{
    sequence: number;
    type: string;
    target: string;
    parameters: Record<string, unknown>;
  }>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface SimulationResult {
  simulation: {
    id: string;
    contractId: string;
    startDate: string;
    endDate: string;
    scenario: 'optimistic' | 'realistic' | 'pessimistic';
  };
  timeline: Array<{
    date: string;
    event: string;
    clauseId: string;
    action: string;
    outcome: {
      status: 'success' | 'partial' | 'failed';
      details: string;
      financialImpact: number;
    };
  }>;
  projections: {
    totalPayments: number;
    totalObligations: number;
    netPosition: number;
    riskExposure: number;
  };
  conflicts: Array<{
    clauseIds: string[];
    type: string;
    severity: 'low' | 'medium' | 'high';
    resolution: string;
  }>;
  recommendations: Array<{
    type: string;
    description: string;
    impact: string;
  }>;
}

export interface ComplianceReport {
  complianceReport: {
    contractId: string;
    assessmentDate: string;
    overallScore: number;
    status: 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';
  };
  checks: Array<{
    id: string;
    regulation: string;
    article: string;
    requirement: string;
    status: 'pass' | 'warning' | 'fail';
    finding: string;
    remediation: string;
    deadline: string | null;
  }>;
  riskMatrix: {
    legal: { level: string; factors: string[] };
    financial: { level: string; factors: string[] };
    reputational: { level: string; factors: string[] };
    operational: { level: string; factors: string[] };
  };
  actionPlan: Array<{
    priority: number;
    action: string;
    responsible: string;
    deadline: string;
  }>;
}

export interface AuditTrail {
  auditTrail: {
    contractId: string;
    generatedAt: string;
    period: { from: string; to: string };
    hashChain: string;
  };
  events: Array<{
    id: string;
    timestamp: string;
    type: string;
    actor: { id: string; name: string; role: string };
    action: string;
    details: Record<string, unknown>;
    previousHash: string;
    currentHash: string;
    signature: string | null;
  }>;
  integrity: {
    verified: boolean;
    method: string;
    lastVerification: string;
  };
  statistics: {
    totalEvents: number;
    byType: Record<string, number>;
    byActor: Record<string, number>;
  };
}

export interface ContractMonitoring {
  monitoring: {
    contractId: string;
    checkTime: string;
    status: 'healthy' | 'warning' | 'critical' | 'inactive';
  };
  health: {
    score: number;
    uptime: string;
    lastExecution: string;
    nextExecution: string;
  };
  activeConditions: Array<{
    id: string;
    name: string;
    status: 'pending' | 'triggered' | 'completed' | 'failed';
    progress: number;
    eta: string | null;
  }>;
  upcomingEvents: Array<{
    date: string;
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  metrics: {
    executionRate: string;
    avgExecutionTime: string;
    errorRate: string;
    complianceScore: number;
  };
}

export interface ClauseExecution {
  execution: {
    id: string;
    clauseId: string;
    contractId: string;
    initiatedAt: string;
    completedAt: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  };
  preconditions: Array<{
    condition: string;
    status: 'met' | 'not_met' | 'skipped';
    details: string;
  }>;
  actions: Array<{
    sequence: number;
    type: string;
    status: string;
    result: Record<string, unknown>;
    duration: string;
  }>;
  outputs: {
    calculatedValues: Record<string, unknown>;
    generatedDocuments: string[];
    notifications: string[];
    stateChanges: string[];
  };
  nextSteps: Array<{
    clauseId: string;
    condition: string;
    scheduledFor: string;
  }>;
}

// === HOOK ===

export function useHRSmartContracts() {
  const [isLoading, setIsLoading] = useState(false);
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null);
  const [triggers, setTriggers] = useState<ContractTrigger[]>([]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const [monitoring, setMonitoring] = useState<ContractMonitoring | null>(null);
  const [execution, setExecution] = useState<ClauseExecution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === CREATE SMART CONTRACT ===
  const createSmartContract = useCallback(async (
    params: {
      name: string;
      type: ContractType;
      parties: ContractParty[];
      effectiveDate: string;
      expirationDate?: string;
      jurisdiction?: string;
    },
    context?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'create_smart_contract',
            params,
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const newContract = data.data.smartContract as SmartContract;
        if (data.data.clauses) {
          newContract.clauses = data.data.clauses;
        }
        if (data.data.conditions) {
          newContract.conditions = data.data.conditions;
        }
        setSelectedContract(newContract);
        setContracts(prev => [...prev, newContract]);
        toast.success('Smart Contract creado exitosamente');
        return newContract;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear Smart Contract';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === DEFINE CONDITIONS ===
  const defineConditions = useCallback(async (
    contractType: ContractType,
    clauses: SmartContractClause[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'define_conditions',
            params: { contractType, clauses }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Condiciones definidas correctamente');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al definir condiciones';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SET TRIGGERS ===
  const setContractTriggers = useCallback(async (
    contractDetails: SmartContract,
    criticalEvents: string[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'set_triggers',
            params: { contractDetails, criticalEvents }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const newTriggers = data.data.triggers as ContractTrigger[];
        setTriggers(newTriggers);
        toast.success('Triggers configurados correctamente');
        return newTriggers;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al configurar triggers';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SIMULATE EXECUTION ===
  const simulateExecution = useCallback(async (
    contract: SmartContract,
    period: { from: string; to: string },
    scenario: 'optimistic' | 'realistic' | 'pessimistic' = 'realistic'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'simulate_execution',
            params: { contract, period, scenario }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setSimulation(data.data as SimulationResult);
        toast.success('Simulación completada');
        return data.data as SimulationResult;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en simulación';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VALIDATE COMPLIANCE ===
  const validateCompliance = useCallback(async (
    contract: SmartContract,
    jurisdiction: string = 'ES',
    sector?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'validate_compliance',
            params: { contract, jurisdiction, sector }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setCompliance(data.data as ComplianceReport);
        toast.success('Validación de cumplimiento completada');
        return data.data as ComplianceReport;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en validación';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE AUDIT TRAIL ===
  const generateAuditTrail = useCallback(async (
    contractId: string,
    period: { from: string; to: string },
    detailed: boolean = true
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'generate_audit_trail',
            params: { contractId, period, detailed }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setAuditTrail(data.data as AuditTrail);
        toast.success('Audit trail generado');
        return data.data as AuditTrail;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar audit trail';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === MONITOR CONTRACT ===
  const monitorContract = useCallback(async (
    contractId: string,
    context?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'monitor_contract',
            params: { contractId },
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setMonitoring(data.data as ContractMonitoring);
        setLastRefresh(new Date());
        return data.data as ContractMonitoring;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en monitoreo';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EXECUTE CLAUSE ===
  const executeClause = useCallback(async (
    contractId: string,
    clauseId: string,
    executionParams?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-smart-contracts',
        {
          body: {
            action: 'execute_clause',
            params: { contractId, clauseId, executionParams }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setExecution(data.data as ClauseExecution);
        toast.success('Cláusula ejecutada correctamente');
        return data.data as ClauseExecution;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al ejecutar cláusula';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((contractId: string, intervalMs = 60000) => {
    stopAutoRefresh();
    monitorContract(contractId);
    autoRefreshInterval.current = setInterval(() => {
      monitorContract(contractId);
    }, intervalMs);
  }, [monitorContract]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // Estado
    isLoading,
    contracts,
    selectedContract,
    triggers,
    simulation,
    compliance,
    auditTrail,
    monitoring,
    execution,
    error,
    lastRefresh,
    // Acciones
    createSmartContract,
    defineConditions,
    setContractTriggers,
    simulateExecution,
    validateCompliance,
    generateAuditTrail,
    monitorContract,
    executeClause,
    setSelectedContract,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useHRSmartContracts;
