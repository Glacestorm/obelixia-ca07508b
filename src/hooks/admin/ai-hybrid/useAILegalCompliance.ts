/**
 * Hook para integración de cumplimiento legal con IA
 * Valida operaciones contra GDPR/LOPDGDD antes de procesamiento
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface LegalValidation {
  isAllowed: boolean;
  requiresConsent: boolean;
  consentType: 'explicit' | 'implicit' | 'none';
  legalBasis: string[];
  applicableRegulations: string[];
  warnings: string[];
  blockingIssues: string[];
  dataRetentionDays: number;
  crossBorderAllowed: boolean;
  crossBorderConditions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RegulationInfo {
  code: string;
  name: string;
  articles: string[];
  description: string;
}

export interface ApplicableRegulations {
  regulations: RegulationInfo[];
  jurisdiction: string[];
}

export interface ConsentStatus {
  hasConsent: boolean;
  consentDate?: string;
  consentType?: string;
  expiresAt?: string;
}

export interface LegalValidationContext {
  operationType: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  dataFields?: string[];
  destinationCountry?: string;
  providerType?: 'local' | 'external';
  userId?: string;
}

// === HOOK ===
export function useAILegalCompliance() {
  const [lastValidation, setLastValidation] = useState<LegalValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState<Array<{
    context: LegalValidationContext;
    result: LegalValidation;
    timestamp: Date;
  }>>([]);

  // === VALIDATE OPERATION ===
  const validateAIOperation = useCallback(async (
    context: LegalValidationContext
  ): Promise<LegalValidation> => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-legal-validator', {
        body: {
          action: 'validate_operation',
          operation_type: context.operationType,
          data_classification: context.dataClassification,
          data_fields: context.dataFields || [],
          destination_country: context.destinationCountry,
          user_id: context.userId,
          context: {
            provider_type: context.providerType,
          },
        },
      });

      if (error) throw error;

      const validation: LegalValidation = {
        isAllowed: data?.data?.is_allowed ?? true,
        requiresConsent: data?.data?.requires_consent ?? false,
        consentType: data?.data?.consent_type ?? 'none',
        legalBasis: data?.data?.legal_basis ?? [],
        applicableRegulations: data?.data?.applicable_regulations ?? [],
        warnings: data?.data?.warnings ?? [],
        blockingIssues: data?.data?.blocking_issues ?? [],
        dataRetentionDays: data?.data?.data_retention_days ?? 365,
        crossBorderAllowed: data?.data?.cross_border_allowed ?? true,
        crossBorderConditions: data?.data?.cross_border_conditions ?? [],
        riskLevel: data?.data?.risk_level ?? 'low',
      };

      setLastValidation(validation);
      setValidationHistory(prev => [{
        context,
        result: validation,
        timestamp: new Date(),
      }, ...prev.slice(0, 99)]);

      // Show appropriate toast based on result
      if (!validation.isAllowed) {
        toast.error('Operación bloqueada por restricciones legales');
      } else if (validation.warnings.length > 0) {
        toast.warning(`Advertencias: ${validation.warnings.length}`);
      }

      return validation;
    } catch (err) {
      console.error('[useAILegalCompliance] validateAIOperation error:', err);
      // Return safe default that blocks operation on error
      const fallback: LegalValidation = {
        isAllowed: false,
        requiresConsent: true,
        consentType: 'explicit',
        legalBasis: [],
        applicableRegulations: ['GDPR', 'LOPDGDD'],
        warnings: [],
        blockingIssues: ['Error de validación - operación bloqueada por precaución'],
        dataRetentionDays: 0,
        crossBorderAllowed: false,
        crossBorderConditions: [],
        riskLevel: 'critical',
      };
      setLastValidation(fallback);
      return fallback;
    } finally {
      setIsValidating(false);
    }
  }, []);

  // === GET APPLICABLE REGULATIONS ===
  const getApplicableRegulations = useCallback(async (
    classification: string,
    country?: string,
    crossBorder?: boolean
  ): Promise<ApplicableRegulations> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-legal-validator', {
        body: {
          action: 'get_applicable_regulations',
          data_classification: classification,
          context: {
            country,
            cross_border: crossBorder,
          },
        },
      });

      if (error) throw error;

      return {
        regulations: data?.data?.regulations ?? [],
        jurisdiction: data?.data?.jurisdiction ?? [],
      };
    } catch (err) {
      console.error('[useAILegalCompliance] getApplicableRegulations error:', err);
      return { regulations: [], jurisdiction: [] };
    }
  }, []);

  // === CHECK CONSENT ===
  const checkConsent = useCallback(async (
    userId: string,
    classification: string
  ): Promise<ConsentStatus> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-legal-validator', {
        body: {
          action: 'check_consent',
          user_id: userId,
          data_classification: classification,
        },
      });

      if (error) throw error;

      return {
        hasConsent: data?.data?.has_consent ?? false,
        consentDate: data?.data?.consent_date,
        consentType: data?.data?.consent_type,
        expiresAt: data?.data?.expires_at,
      };
    } catch (err) {
      console.error('[useAILegalCompliance] checkConsent error:', err);
      return { hasConsent: false };
    }
  }, []);

  // === LOG GDPR EVENT ===
  const logGDPREvent = useCallback(async (
    event: {
      userId?: string;
      operationType: string;
      dataClassification: string;
      context?: Record<string, any>;
    }
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-legal-validator', {
        body: {
          action: 'log_gdpr_event',
          user_id: event.userId,
          operation_type: event.operationType,
          data_classification: event.dataClassification,
          context: event.context,
        },
      });

      if (error) throw error;
      return data?.data?.logged ?? false;
    } catch (err) {
      console.error('[useAILegalCompliance] logGDPREvent error:', err);
      return false;
    }
  }, []);

  // === QUICK VALIDATION FOR ROUTING ===
  const canProcessExternally = useCallback(async (
    classification: string,
    destinationCountry?: string
  ): Promise<boolean> => {
    const validation = await validateAIOperation({
      operationType: 'ai_processing',
      dataClassification: classification as any,
      destinationCountry,
      providerType: 'external',
    });

    return validation.isAllowed && validation.crossBorderAllowed;
  }, [validateAIOperation]);

  // === GET RISK LEVEL COLOR ===
  const getRiskLevelColor = useCallback((level: LegalValidation['riskLevel']): string => {
    const colors: Record<string, string> = {
      low: 'text-emerald-500',
      medium: 'text-amber-500',
      high: 'text-orange-500',
      critical: 'text-red-500',
    };
    return colors[level] || 'text-muted-foreground';
  }, []);

  // === GET RISK LEVEL BADGE ===
  const getRiskLevelBadgeVariant = useCallback((level: LegalValidation['riskLevel']): 
    'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'secondary',
      medium: 'outline',
      high: 'default',
      critical: 'destructive',
    };
    return variants[level] || 'outline';
  }, []);

  return {
    // State
    lastValidation,
    isValidating,
    validationHistory,

    // Actions
    validateAIOperation,
    getApplicableRegulations,
    checkConsent,
    logGDPREvent,
    canProcessExternally,

    // Helpers
    getRiskLevelColor,
    getRiskLevelBadgeVariant,
  };
}

export default useAILegalCompliance;
