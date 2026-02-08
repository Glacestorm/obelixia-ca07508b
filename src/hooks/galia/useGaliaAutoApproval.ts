/**
 * useGaliaAutoApproval - Hook para sistema de aprobación semi-automática
 * Pre-aprobación de expedientes con validación humana en 24h
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface CriterionResult {
  criterion: string;
  passed: boolean;
  details: string;
  weight: number;
}

export interface EligibilityResult {
  expedienteId: string;
  eligible: boolean;
  score: number;
  criteriaResults: CriterionResult[];
  missingDocuments: string[];
  recommendations: string[];
  autoApprovalPossible: boolean;
  expiresAt: string;
  reasoning?: string;
}

export interface PreApprovalResult {
  preApprovalId: string;
  status: 'pending_confirmation' | 'confirmed' | 'rejected' | 'expired';
  eligibilityScore: number;
  assignmentRecommendation: {
    tecnicoId: string | null;
    reason: string;
  };
  validationChecklist: Array<{
    item: string;
    priority: 'high' | 'medium' | 'low';
    automated: boolean;
  }>;
  expirationWarning: string;
  notificationsSent: string[];
}

export interface PendingApproval {
  id: string;
  expedienteId: string;
  beneficiario: string;
  importeSolicitado: number;
  preApprovedAt: string;
  expiresAt: string;
  hoursRemaining: number;
  priority: 'urgent' | 'normal' | 'low';
  assignedTecnico: string | null;
  eligibilityScore: number;
}

export interface PendingApprovalsResult {
  pendingApprovals: PendingApproval[];
  summary: {
    total: number;
    expiringSoon: number;
    unassigned: number;
  };
  alerts: string[];
}

export interface ConfirmationResult {
  confirmed: boolean;
  expedienteId: string;
  finalStatus: 'aprobado' | 'rechazado' | 'pendiente';
  confirmationCode: string;
  confirmedBy: string;
  confirmedAt: string;
  notificationsSent: {
    beneficiario: boolean;
    sistema: boolean;
  };
  nextSteps: string[];
}

export interface RejectionResult {
  rejected: boolean;
  expedienteId: string;
  reason: string;
  rejectedBy: string;
  rejectedAt: string;
  canResubmit: boolean;
  subsanationDeadline?: string;
  recommendations: string[];
  appealInfo: {
    canAppeal: boolean;
    deadline: string;
    procedure: string;
  };
}

// === HOOK ===
export function useGaliaAutoApproval() {
  const [isLoading, setIsLoading] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [preApproval, setPreApproval] = useState<PreApprovalResult | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === VERIFICAR ELEGIBILIDAD ===
  const checkEligibility = useCallback(async (expedienteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-auto-approval', {
        body: {
          action: 'check_eligibility',
          expediente_id: expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as EligibilityResult;
        setEligibility(result);
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al verificar elegibilidad';
      setError(message);
      console.error('[useGaliaAutoApproval] checkEligibility error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PRE-APROBAR ===
  const preApprove = useCallback(async (expedienteId: string, tecnicoId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-auto-approval', {
        body: {
          action: 'pre_approve',
          expediente_id: expedienteId,
          tecnico_id: tecnicoId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as PreApprovalResult;
        setPreApproval(result);
        toast.success('Expediente pre-aprobado. Validación requerida en 24h.');
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al pre-aprobar';
      setError(message);
      console.error('[useGaliaAutoApproval] preApprove error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CONFIRMAR APROBACIÓN ===
  const confirmApproval = useCallback(async (expedienteId: string, tecnicoId: string, reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-auto-approval', {
        body: {
          action: 'confirm_approval',
          expediente_id: expedienteId,
          tecnico_id: tecnicoId,
          reason
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as ConfirmationResult;
        toast.success('Aprobación confirmada');
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al confirmar';
      setError(message);
      console.error('[useGaliaAutoApproval] confirmApproval error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RECHAZAR ===
  const reject = useCallback(async (expedienteId: string, tecnicoId: string, reason: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-auto-approval', {
        body: {
          action: 'reject',
          expediente_id: expedienteId,
          tecnico_id: tecnicoId,
          reason
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as RejectionResult;
        toast.info('Pre-aprobación rechazada');
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al rechazar';
      setError(message);
      console.error('[useGaliaAutoApproval] reject error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER PENDIENTES ===
  const fetchPendingApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-auto-approval', {
        body: {
          action: 'get_pending'
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as PendingApprovalsResult;
        setPendingApprovals(result);
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener pendientes';
      setError(message);
      console.error('[useGaliaAutoApproval] fetchPendingApprovals error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RESET ===
  const reset = useCallback(() => {
    setEligibility(null);
    setPreApproval(null);
    setPendingApprovals(null);
    setError(null);
  }, []);

  return {
    // Estado
    isLoading,
    error,
    eligibility,
    preApproval,
    pendingApprovals,
    // Acciones
    checkEligibility,
    preApprove,
    confirmApproval,
    reject,
    fetchPendingApprovals,
    reset,
  };
}

export default useGaliaAutoApproval;
