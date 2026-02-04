/**
 * useLegalValidationGateway - Fase 10
 * Hook para gestionar el Gateway de Validación Legal
 * Autoridad central para validaciones pre-operación en módulos ERP
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export type ValidationRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ValidationStatus = 'pending' | 'approved' | 'rejected' | 'blocked' | 'auto_approved';
export type ModuleType = 'hr' | 'fiscal' | 'treasury' | 'contracts' | 'purchases' | 'inventory';

export interface ValidationRequest {
  id: string;
  module: ModuleType;
  operation: string;
  operationType: string;
  requestedBy: string;
  requestedByName?: string;
  status: ValidationStatus;
  riskLevel: ValidationRiskLevel;
  details: Record<string, unknown>;
  legalBasis?: string;
  jurisdictions: string[];
  validatedBy?: string;
  validationNotes?: string;
  createdAt: string;
  updatedAt: string;
  autoBlockReason?: string;
}

export interface ValidationRule {
  id: string;
  module: ModuleType;
  operationType: string;
  riskLevel: ValidationRiskLevel;
  requiresApproval: boolean;
  autoBlock: boolean;
  jurisdictions: string[];
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface ModuleConnectionStatus {
  module: ModuleType;
  isConnected: boolean;
  lastSync?: string;
  validationsToday: number;
  blockedOperations: number;
  complianceScore: number;
}

export interface GatewayStats {
  totalValidationsToday: number;
  pendingValidations: number;
  blockedOperations: number;
  avgComplianceScore: number;
  connectedModules: number;
  autoApprovedToday: number;
}

export interface ValidationContext {
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

export interface ValidationResult {
  isValid: boolean;
  status: ValidationStatus;
  riskLevel: ValidationRiskLevel;
  requiresApproval: boolean;
  validationId?: string;
  legalBasis?: string;
  warnings: string[];
  recommendations: string[];
  blockedReason?: string;
}

// === HOOK ===

export function useLegalValidationGateway() {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [gatewayEnabled, setGatewayEnabled] = useState(true);
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ValidationRequest[]>([]);
  const [moduleStatuses, setModuleStatuses] = useState<ModuleConnectionStatus[]>([]);
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === VALIDAR OPERACIÓN ===
  const validateOperation = useCallback(async (
    context: ValidationContext
  ): Promise<ValidationResult> => {
    if (!gatewayEnabled) {
      return {
        isValid: true,
        status: 'auto_approved',
        riskLevel: 'low',
        requiresApproval: false,
        warnings: ['Gateway desactivado - validación omitida'],
        recommendations: []
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'validate_operation',
            context: {
              companyId: context.companyId,
              module: context.module,
              operation: context.operation,
              operationType: context.operationType,
              entityId: context.entityId,
              entityType: context.entityType,
              amount: context.amount,
              jurisdictions: context.jurisdictions || ['ES', 'AD'],
              metadata: context.metadata
            }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result: ValidationResult = {
          isValid: data.data.isValid,
          status: data.data.status,
          riskLevel: data.data.riskLevel,
          requiresApproval: data.data.requiresApproval,
          validationId: data.data.validationId,
          legalBasis: data.data.legalBasis,
          warnings: data.data.warnings || [],
          recommendations: data.data.recommendations || [],
          blockedReason: data.data.blockedReason
        };

        if (result.status === 'blocked') {
          toast.error('Operación bloqueada por validación legal');
        } else if (result.requiresApproval) {
          toast.warning('Operación requiere aprobación legal');
        }

        return result;
      }

      // Fallback result
      return {
        isValid: true,
        status: 'auto_approved',
        riskLevel: 'low',
        requiresApproval: false,
        warnings: [],
        recommendations: []
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de validación';
      setError(message);
      console.error('[useLegalValidationGateway] validateOperation error:', err);
      
      // En caso de error, permitir operación con advertencia
      return {
        isValid: true,
        status: 'auto_approved',
        riskLevel: 'medium',
        requiresApproval: false,
        warnings: ['Error en validación - operación permitida con precaución'],
        recommendations: ['Revisar manualmente esta operación']
      };
    } finally {
      setIsLoading(false);
    }
  }, [gatewayEnabled]);

  // === APROBAR/RECHAZAR VALIDACIÓN ===
  const processValidation = useCallback(async (
    validationId: string,
    decision: 'approve' | 'reject',
    notes?: string
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'process_validation',
            params: {
              validationId,
              decision,
              notes
            }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setPendingRequests(prev =>
          prev.map(req =>
            req.id === validationId
              ? { ...req, status: decision === 'approve' ? 'approved' : 'rejected', validationNotes: notes }
              : req
          )
        );

        toast.success(`Validación ${decision === 'approve' ? 'aprobada' : 'rechazada'}`);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useLegalValidationGateway] processValidation error:', err);
      toast.error('Error al procesar validación');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH PENDING REQUESTS ===
  const fetchPendingRequests = useCallback(async (companyId: string) => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'get_pending_validations',
            context: { companyId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setPendingRequests(data.data);
        setLastRefresh(new Date());
        return data.data;
      }

      return [];
    } catch (err) {
      console.error('[useLegalValidationGateway] fetchPendingRequests error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH VALIDATION RULES ===
  const fetchValidationRules = useCallback(async (companyId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'get_validation_rules',
            context: { companyId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setValidationRules(data.data);
        return data.data;
      }

      return [];
    } catch (err) {
      console.error('[useLegalValidationGateway] fetchValidationRules error:', err);
      return [];
    }
  }, []);

  // === FETCH MODULE STATUSES ===
  const fetchModuleStatuses = useCallback(async (companyId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'get_module_connection_status',
            context: { companyId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setModuleStatuses(data.data);
        return data.data;
      }

      return [];
    } catch (err) {
      console.error('[useLegalValidationGateway] fetchModuleStatuses error:', err);
      return [];
    }
  }, []);

  // === FETCH GATEWAY STATS ===
  const fetchGatewayStats = useCallback(async (companyId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'get_gateway_stats',
            context: { companyId }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setStats(data.data);
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useLegalValidationGateway] fetchGatewayStats error:', err);
      return null;
    }
  }, []);

  // === TOGGLE RULE ===
  const toggleRule = useCallback(async (ruleId: string, isActive: boolean) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'toggle_validation_rule',
            params: { ruleId, isActive }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setValidationRules(prev =>
          prev.map(rule =>
            rule.id === ruleId ? { ...rule, isActive } : rule
          )
        );
        toast.success(`Regla ${isActive ? 'activada' : 'desactivada'}`);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useLegalValidationGateway] toggleRule error:', err);
      toast.error('Error al actualizar regla');
      return false;
    }
  }, []);

  // === TOGGLE GATEWAY ===
  const toggleGateway = useCallback((enabled: boolean) => {
    setGatewayEnabled(enabled);
    toast.info(`Gateway de validación ${enabled ? 'activado' : 'desactivado'}`);
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((companyId: string, intervalMs = 60000) => {
    stopAutoRefresh();
    fetchPendingRequests(companyId);
    fetchGatewayStats(companyId);
    
    autoRefreshInterval.current = setInterval(() => {
      fetchPendingRequests(companyId);
      fetchGatewayStats(companyId);
    }, intervalMs);
  }, [fetchPendingRequests, fetchGatewayStats]);

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

  // === RETURN ===
  return {
    // State
    isLoading,
    gatewayEnabled,
    validationRules,
    pendingRequests,
    moduleStatuses,
    stats,
    error,
    lastRefresh,
    
    // Actions
    validateOperation,
    processValidation,
    fetchPendingRequests,
    fetchValidationRules,
    fetchModuleStatuses,
    fetchGatewayStats,
    toggleRule,
    toggleGateway,
    startAutoRefresh,
    stopAutoRefresh
  };
}

export default useLegalValidationGateway;
