/**
 * usePreRealApproval — V2-ES.8 Tramo 5
 * Hook for managing pre-real approval workflow for official submissions.
 * 
 * Invariants:
 * - Approval ≠ envío real
 * - isRealSubmissionBlocked() remains true
 * - All decisions are audited
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  evaluateApprovalEligibility,
  getDefaultApprovalChecklist,
  isChecklistComplete,
  isValidApprovalTransition,
  getApprovalStatusMeta,
  getSuggestedApprovalRole,
  type ApprovalStatus,
  type ApprovalRole,
  type EligibilityResult,
  type ApprovalChecklistItem,
} from '@/components/erp/hr/shared/preRealApprovalEngine';
import type {
  SubmissionDomain,
  PreparatorySubmissionStatus,
  SubmissionValidationResult,
  PayloadSnapshot,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';
import { logDryRunEvent } from '@/components/erp/hr/shared/dryRunAuditEvents';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubmissionApproval {
  id: string;
  company_id: string;
  submission_id: string;
  submission_domain: string;
  submission_type: string;
  requested_by: string;
  requested_at: string;
  request_notes: string | null;
  eligibility_snapshot: EligibilityResult | null;
  readiness_score: number;
  dry_run_count: number;
  status: ApprovalStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  decision_checklist: ApprovalChecklistItem[];
  approval_level: number;
  required_role: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RequestApprovalInput {
  submissionId: string;
  domain: SubmissionDomain;
  submissionType: string;
  submissionStatus: PreparatorySubmissionStatus;
  validationResult: SubmissionValidationResult | null;
  payloadSnapshot: PayloadSnapshot | null;
  dryRunCount: number;
  hasCertificate: boolean;
  notes?: string;
  requiredRole?: ApprovalRole;
  /** Extended eligibility context (V2-ES.8 T5 P3) */
  readinessPercent?: number;
  hasLinkedEvidence?: boolean;
  evidenceCount?: number;
  certificateStatus?: 'valid' | 'expiring' | 'expired' | 'not_configured';
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePreRealApproval(companyId: string) {
  const [approvals, setApprovals] = useState<SubmissionApproval[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Fetch approvals ──
  const fetchApprovals = useCallback(async (filters?: {
    status?: ApprovalStatus;
    submissionId?: string;
  }) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let q = supabase
        .from('erp_hr_submission_approvals' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.submissionId) q = q.eq('submission_id', filters.submissionId);

      const { data, error } = await q;
      if (error) throw error;

      setApprovals((data || []) as unknown as SubmissionApproval[]);
    } catch (err) {
      console.error('[usePreRealApproval] fetchApprovals error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Check eligibility (pure, no side effects) ──
  const checkEligibility = useCallback((input: Omit<RequestApprovalInput, 'notes' | 'requiredRole'>): EligibilityResult => {
    return evaluateApprovalEligibility({
      submissionStatus: input.submissionStatus,
      validationResult: input.validationResult,
      payloadSnapshot: input.payloadSnapshot,
      dryRunCount: input.dryRunCount,
      hasCertificate: input.hasCertificate,
      domain: input.domain,
      readinessPercent: input.readinessPercent,
      hasLinkedEvidence: input.hasLinkedEvidence,
      evidenceCount: input.evidenceCount,
      certificateStatus: input.certificateStatus,
    });
  }, []);

  // ── Request approval ──
  const requestApproval = useCallback(async (input: RequestApprovalInput): Promise<SubmissionApproval | null> => {
    if (!companyId) return null;

    // Check eligibility
    const eligibility = evaluateApprovalEligibility({
      submissionStatus: input.submissionStatus,
      validationResult: input.validationResult,
      payloadSnapshot: input.payloadSnapshot,
      dryRunCount: input.dryRunCount,
      hasCertificate: input.hasCertificate,
      domain: input.domain,
      readinessPercent: input.readinessPercent,
      hasLinkedEvidence: input.hasLinkedEvidence,
      evidenceCount: input.evidenceCount,
      certificateStatus: input.certificateStatus,
    });

    if (!eligibility.eligible) {
      toast.error('No cumple los requisitos mínimos para solicitar aprobación');
      return null;
    }

    // Check no pending approval exists
    const existingPending = approvals.find(
      a => a.submission_id === input.submissionId && a.status === 'pending_approval'
    );
    if (existingPending) {
      toast.error('Ya existe una solicitud de aprobación pendiente para este envío');
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        toast.error('Sesión requerida');
        return null;
      }

      const role = input.requiredRole || getSuggestedApprovalRole(input.domain);

      // Set expiration to 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('erp_hr_submission_approvals' as any)
        .insert([{
          company_id: companyId,
          submission_id: input.submissionId,
          submission_domain: input.domain,
          submission_type: input.submissionType,
          requested_by: userId,
          request_notes: input.notes || null,
          eligibility_snapshot: eligibility as any,
          readiness_score: input.validationResult?.score || 0,
          dry_run_count: input.dryRunCount,
          status: 'pending_approval',
          required_role: role,
          expires_at: expiresAt.toISOString(),
          metadata: {
            version: '1.0',
            phase: 'V2-ES.8-T5',
            domain: input.domain,
          },
        }])
        .select()
        .single();

      if (error) throw error;

      const approval = data as unknown as SubmissionApproval;
      setApprovals(prev => [approval, ...prev]);

      // Audit
      await logDryRunEvent('approval_requested', {
        submissionId: input.submissionId,
        domain: input.domain,
        submissionType: input.submissionType,
        score: input.validationResult?.score,
        extra: {
          approval_id: approval.id,
          required_role: role,
          eligibility_score: eligibility.score,
        },
      });

      toast.success('Solicitud de aprobación enviada');
      return approval;
    } catch (err) {
      console.error('[usePreRealApproval] requestApproval error:', err);
      toast.error('Error al solicitar aprobación');
      return null;
    }
  }, [companyId, approvals]);

  // ── Decide: approve, reject, or request correction ──
  const decide = useCallback(async (
    approvalId: string,
    decision: 'approved' | 'rejected' | 'correction_requested',
    notes: string,
    checklist?: ApprovalChecklistItem[],
  ): Promise<boolean> => {
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) {
      toast.error('Solicitud no encontrada');
      return false;
    }

    if (!isValidApprovalTransition(approval.status, decision)) {
      toast.error(`Transición no válida: ${getApprovalStatusMeta(approval.status).label} → ${getApprovalStatusMeta(decision).label}`);
      return false;
    }

    // For approval, verify checklist is complete
    if (decision === 'approved' && checklist) {
      if (!isChecklistComplete(checklist)) {
        toast.error('Debe completar todos los checks obligatorios antes de aprobar');
        return false;
      }
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { error } = await supabase
        .from('erp_hr_submission_approvals' as any)
        .update({
          status: decision,
          decided_by: userId,
          decided_at: new Date().toISOString(),
          decision_notes: notes,
          decision_checklist: (checklist || []) as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (error) throw error;

      setApprovals(prev => prev.map(a =>
        a.id === approvalId ? {
          ...a,
          status: decision,
          decided_by: userId || null,
          decided_at: new Date().toISOString(),
          decision_notes: notes,
          decision_checklist: checklist || [],
        } : a
      ));

      // Audit
      const auditAction = decision === 'approved'
        ? 'approval_granted' as const
        : decision === 'rejected'
          ? 'approval_rejected' as const
          : 'approval_correction_requested' as const;

      await logDryRunEvent(auditAction, {
        submissionId: approval.submission_id,
        domain: approval.submission_domain,
        submissionType: approval.submission_type,
        extra: {
          approval_id: approvalId,
          decision,
          notes_provided: !!notes,
          checklist_items: checklist?.length || 0,
        },
      });

      const labels: Record<string, string> = {
        approved: 'Aprobación concedida',
        rejected: 'Solicitud rechazada',
        correction_requested: 'Correcciones solicitadas',
      };
      toast.success(labels[decision]);
      return true;
    } catch (err) {
      console.error('[usePreRealApproval] decide error:', err);
      toast.error('Error al registrar decisión');
      return false;
    }
  }, [approvals]);

  // ── Cancel a pending approval ──
  const cancelApproval = useCallback(async (approvalId: string): Promise<boolean> => {
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval || approval.status !== 'pending_approval') {
      toast.error('Solo se pueden cancelar solicitudes pendientes');
      return false;
    }

    try {
      const { error } = await supabase
        .from('erp_hr_submission_approvals' as any)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (error) throw error;

      setApprovals(prev => prev.map(a =>
        a.id === approvalId ? { ...a, status: 'cancelled' as ApprovalStatus } : a
      ));

      await logDryRunEvent('approval_cancelled', {
        submissionId: approval.submission_id,
        domain: approval.submission_domain,
        extra: { approval_id: approvalId },
      });

      toast.success('Solicitud de aprobación cancelada');
      return true;
    } catch (err) {
      console.error('[usePreRealApproval] cancelApproval error:', err);
      toast.error('Error al cancelar');
      return false;
    }
  }, [approvals]);

  // ── Get pending count ──
  const pendingCount = approvals.filter(a => a.status === 'pending_approval').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const rejectedCount = approvals.filter(a => a.status === 'rejected').length;

  // ── Get approval for a specific submission ──
  const getSubmissionApproval = useCallback((submissionId: string): SubmissionApproval | null => {
    return approvals.find(a => a.submission_id === submissionId && !['cancelled', 'expired'].includes(a.status)) || null;
  }, [approvals]);

  return {
    approvals,
    isLoading,
    pendingCount,
    approvedCount,
    rejectedCount,
    fetchApprovals,
    checkEligibility,
    requestApproval,
    decide,
    cancelApproval,
    getSubmissionApproval,
  };
}
