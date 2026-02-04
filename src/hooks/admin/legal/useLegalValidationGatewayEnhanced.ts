/**
 * useLegalValidationGatewayEnhanced - Fase 10
 * Hook para el Gateway de Validación Legal Avanzado
 * Reglas complejas, bloqueo automático y audit trail completo
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ValidationStatus = 'approved' | 'blocked' | 'pending_approval' | 'escalated';
export type ModuleType = 'hr' | 'fiscal' | 'treasury' | 'contracts' | 'purchases' | 'inventory';

export interface ValidationRule {
  id: string;
  name: string;
  module: ModuleType;
  operationType: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  autoBlock: boolean;
  jurisdictions: string[];
  priority: number;
  isActive: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches' | 'in' | 'not_in';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'block' | 'approve' | 'escalate' | 'notify' | 'audit_log' | 'require_signature';
  params?: Record<string, unknown>;
}

export interface ComplianceCheck {
  regulation: string;
  article: string;
  status: 'compliant' | 'non_compliant' | 'requires_review';
  details: string;
}

export interface EnhancedValidationResult {
  isValid: boolean;
  status: ValidationStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  appliedRules: AppliedRule[];
  complianceChecks: ComplianceCheck[];
  requiredApprovals: string[];
  blockedReason: string | null;
  warnings: string[];
  recommendations: string[];
  auditData: AuditData;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  action: string;
}

export interface AuditData {
  timestamp: string;
  hash: string;
  previousHash: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  operation: string;
  operationId: string;
  userId: string;
  userName: string;
  decision: ValidationStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  appliedRules: string[];
  complianceChecks: ComplianceCheck[];
  details: Record<string, unknown>;
  hash: string;
  previousHash: string;
  signature: string;
}

export interface AuditTrailResult {
  auditTrail: AuditEntry[];
  integrityStatus: {
    isValid: boolean;
    brokenLinks: string[];
    lastVerified: string;
  };
  statistics: {
    totalEntries: number;
    approvalRate: number;
    blockRate: number;
    escalationRate: number;
    avgRiskScore: number;
  };
}

export interface BlockingPolicy {
  id: string;
  name: string;
  description: string;
  module: string;
  triggerConditions: RuleCondition[];
  blockLevel: 'soft' | 'hard';
  overrideRequirements: {
    requiredRoles: string[];
    requiresSignature: boolean;
    requiresJustification: boolean;
  };
  notifications: {
    channel: 'email' | 'slack' | 'sms';
    recipients: string[];
  }[];
  isActive: boolean;
}

export interface RiskAssessment {
  overallScore: number;
  riskLevel: RiskLevel;
  dimensions: RiskDimension[];
  historicalTrend: {
    last30Days: number;
    last90Days: number;
    yearToDate: number;
    trend: 'improving' | 'stable' | 'worsening';
  };
  recommendations: RiskRecommendation[];
  complianceGaps: ComplianceGap[];
}

export interface RiskDimension {
  name: string;
  score: number;
  weight: number;
  factors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  mitigation: string;
}

export interface RiskRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedImpact: string;
}

export interface ComplianceGap {
  regulation: string;
  gap: string;
  severity: string;
  remediation: string;
}

export interface ComplianceMatrix {
  generatedAt: string;
  overallScore: number;
  byJurisdiction: Record<string, JurisdictionCompliance>;
  byModule: Record<string, ModuleCompliance>;
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
  upcomingDeadlines: ComplianceDeadline[];
}

export interface JurisdictionCompliance {
  score: number;
  regulations: RegulationStatus[];
}

export interface RegulationStatus {
  name: string;
  code: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  lastAudit: string;
  gaps: string[];
}

export interface ModuleCompliance {
  score: number;
  criticalItems: string[];
  actionRequired: string[];
}

export interface ComplianceDeadline {
  regulation: string;
  deadline: string;
  action: string;
}

// === HOOK ===

export function useLegalValidationGatewayEnhanced() {
  const [isLoading, setIsLoading] = useState(false);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [blockingPolicies, setBlockingPolicies] = useState<BlockingPolicy[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [complianceMatrix, setComplianceMatrix] = useState<ComplianceMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === VALIDAR OPERACIÓN ===
  const validateOperation = useCallback(async (
    context: {
      companyId: string;
      module: ModuleType;
      operation: string;
      operationType: string;
      entityId?: string;
      entityType?: string;
      amount?: number;
      jurisdictions?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<EnhancedValidationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'validate_operation',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as EnhancedValidationResult;

        if (result.status === 'blocked') {
          toast.error(`Operación bloqueada: ${result.blockedReason || 'Validación fallida'}`);
        } else if (result.status === 'escalated') {
          toast.warning('Operación escalada para revisión');
        } else if (result.status === 'pending_approval') {
          toast.info('Operación pendiente de aprobación');
        }

        return result;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de validación';
      setError(message);
      console.error('[useLegalValidationGatewayEnhanced] validateOperation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREAR REGLA ===
  const createRule = useCallback(async (
    params: Partial<ValidationRule>
  ): Promise<ValidationRule | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'create_rule',
            params
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.rule) {
        const newRule = data.data.rule as ValidationRule;
        setValidationRules(prev => [...prev, newRule]);
        toast.success('Regla creada correctamente');
        return newRule;
      }

      return null;
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] createRule error:', err);
      toast.error('Error al crear regla');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER AUDIT TRAIL ===
  const fetchAuditTrail = useCallback(async (
    companyId: string,
    dateFrom?: string,
    dateTo?: string,
    module?: ModuleType
  ): Promise<AuditTrailResult | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'get_audit_trail',
            context: { companyId },
            params: { dateFrom, dateTo, module }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as AuditTrailResult;
        setAuditTrail(result.auditTrail);
        setLastRefresh(new Date());
        return result;
      }

      return null;
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] fetchAuditTrail error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER POLÍTICAS DE BLOQUEO ===
  const fetchBlockingPolicies = useCallback(async (
    companyId: string
  ): Promise<BlockingPolicy[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'get_blocking_policies',
            context: { companyId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.blockingPolicies) {
        const policies = data.data.blockingPolicies as BlockingPolicy[];
        setBlockingPolicies(policies);
        return policies;
      }

      return [];
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] fetchBlockingPolicies error:', err);
      return [];
    }
  }, []);

  // === OBTENER EVALUACIÓN DE RIESGOS ===
  const fetchRiskAssessment = useCallback(async (
    context: Record<string, unknown>
  ): Promise<RiskAssessment | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'get_risk_assessment',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.riskAssessment) {
        const assessment = data.data.riskAssessment as RiskAssessment;
        setRiskAssessment(assessment);
        return assessment;
      }

      return null;
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] fetchRiskAssessment error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER MATRIZ DE COMPLIANCE ===
  const fetchComplianceMatrix = useCallback(async (
    context: Record<string, unknown>
  ): Promise<ComplianceMatrix | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'get_compliance_matrix',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.complianceMatrix) {
        const matrix = data.data.complianceMatrix as ComplianceMatrix;
        setComplianceMatrix(matrix);
        return matrix;
      }

      return null;
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] fetchComplianceMatrix error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ESCALAR VALIDACIÓN ===
  const escalateValidation = useCallback(async (
    validationId: string,
    reason: string,
    priority: 'normal' | 'urgent' | 'critical'
  ): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'escalate_validation',
            params: { validationId, reason, priority }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Validación escalada correctamente');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] escalateValidation error:', err);
      toast.error('Error al escalar validación');
      return false;
    }
  }, []);

  // === VALIDACIÓN CROSS-MODULE ===
  const validateCrossModule = useCallback(async (
    context: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-validation-gateway-enhanced',
        {
          body: {
            action: 'validate_cross_module',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useLegalValidationGatewayEnhanced] validateCrossModule error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((companyId: string, intervalMs = 60000) => {
    stopAutoRefresh();
    fetchAuditTrail(companyId);
    fetchBlockingPolicies(companyId);

    autoRefreshInterval.current = setInterval(() => {
      fetchAuditTrail(companyId);
    }, intervalMs);
  }, [fetchAuditTrail, fetchBlockingPolicies]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    validationRules,
    blockingPolicies,
    auditTrail,
    riskAssessment,
    complianceMatrix,
    error,
    lastRefresh,

    // Actions
    validateOperation,
    createRule,
    fetchAuditTrail,
    fetchBlockingPolicies,
    fetchRiskAssessment,
    fetchComplianceMatrix,
    escalateValidation,
    validateCrossModule,
    startAutoRefresh,
    stopAutoRefresh
  };
}

export default useLegalValidationGatewayEnhanced;
