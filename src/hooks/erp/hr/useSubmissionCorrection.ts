/**
 * useSubmissionCorrection — LM1+LM2: Industrialized correction/resend cycle
 *
 * - initiateCorrection(): mark submission as requires_correction + classify errors
 * - regenerateArtifact(): regenerate payload using appropriate adapter
 * - resubmit(): transition back to queued_for_submission
 * - getCorrectionHistory(): list correction attempts
 * - Ledger events for full traceability
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { classifyError, type ClassifiedError } from '@/engines/erp/hr/officialAdaptersEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CorrectionRecord {
  id: string;
  submissionId: string;
  attempt: number;
  errors: ClassifiedError[];
  correctionAction: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
  createdBy: string | null;
}

export interface CorrectionResult {
  success: boolean;
  error?: string;
  correctionId?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSubmissionCorrection(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  /**
   * Mark a submission as requiring correction, classify errors, and create correction task
   */
  const initiateCorrection = useCallback(async (
    submissionId: string,
    errorMessages: string[],
    organism?: string
  ): Promise<CorrectionResult> => {
    if (!user?.id) return { success: false, error: 'No autenticado' };

    setIsLoading(true);
    try {
      // 1. Classify errors
      const classifiedErrors = errorMessages.map(msg => classifyError(msg, organism));
      
      // 2. Get current attempt count
      const { data: existing } = await (supabase as any)
        .from('erp_hr_audit_log')
        .select('id')
        .eq('record_id', submissionId)
        .eq('action', 'SUBMISSION_CORRECTION_INITIATED')
        .eq('company_id', companyId);

      const attemptNumber = (existing?.length ?? 0) + 1;

      // 3. Update submission status to requires_correction
      const { error: updateError } = await (supabase as any)
        .from('hr_official_submissions')
        .update({
          status: 'requires_correction',
          metadata: {
            correction_attempt: attemptNumber,
            correction_errors: classifiedErrors,
            correction_initiated_at: new Date().toISOString(),
            correction_initiated_by: user.id,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('[useSubmissionCorrection] update error:', updateError);
        return { success: false, error: 'Error al marcar corrección' };
      }

      // 4. Audit log
      await (supabase as any)
        .from('erp_hr_audit_log')
        .insert({
          action: 'SUBMISSION_CORRECTION_INITIATED',
          table_name: 'hr_official_submissions',
          record_id: submissionId,
          company_id: companyId,
          user_id: user.id,
          new_data: {
            attempt: attemptNumber,
            errors: classifiedErrors,
            organism,
          },
          category: 'official_integration',
          severity: classifiedErrors.some(e => e.severity === 'critical') ? 'critical' : 'warning',
          changed_fields: ['status', 'metadata'],
          metadata: { process: 'submission_correction', version: 'lm2' },
        });

      // 5. Ledger event
      await (supabase as any)
        .from('erp_hr_ledger')
        .insert({
          company_id: companyId,
          event_type: 'submission_correction_initiated',
          event_label: `Corrección #${attemptNumber} iniciada`,
          entity_type: 'official_submission',
          entity_id: submissionId,
          actor_id: user.id,
          actor_role: 'hr_admin',
          after_snapshot: { errors: classifiedErrors, attempt: attemptNumber },
          metadata: { organism, process: 'submission_correction' },
        });

      toast.success(`Corrección #${attemptNumber} iniciada`);
      return { success: true, correctionId: submissionId };
    } catch (err) {
      console.error('[useSubmissionCorrection] error:', err);
      return { success: false, error: 'Error inesperado' };
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user]);

  /**
   * Mark artifact as regenerated and ready for re-submission
   */
  const regenerateArtifact = useCallback(async (
    submissionId: string,
    newPayload?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const updateData: Record<string, unknown> = {
        status: 'pending',
        updated_at: new Date().toISOString(),
      };

      if (newPayload) {
        updateData.payload = newPayload;
      }

      const { error } = await (supabase as any)
        .from('hr_official_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .eq('company_id', companyId);

      if (error) {
        console.error('[useSubmissionCorrection] regenerate error:', error);
        return false;
      }

      // Audit log
      await (supabase as any)
        .from('erp_hr_audit_log')
        .insert({
          action: 'ARTIFACT_REGENERATED',
          table_name: 'hr_official_submissions',
          record_id: submissionId,
          company_id: companyId,
          user_id: user.id,
          new_data: { hasNewPayload: !!newPayload },
          category: 'official_integration',
          severity: 'info',
          changed_fields: ['status', 'payload'],
          metadata: { process: 'submission_correction', version: 'lm2' },
        });

      toast.success('Artefacto regenerado');
      return true;
    } catch {
      return false;
    }
  }, [companyId, user]);

  /**
   * Transition submission back to queued_for_submission for resend
   */
  const resubmit = useCallback(async (submissionId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Get current attempt
      const { data: submission } = await (supabase as any)
        .from('hr_official_submissions')
        .select('metadata')
        .eq('id', submissionId)
        .single();

      const currentAttempt = (submission?.metadata as any)?.correction_attempt ?? 0;

      const { error } = await (supabase as any)
        .from('hr_official_submissions')
        .update({
          status: 'queued',
          metadata: {
            ...(submission?.metadata || {}),
            resubmission_attempt: currentAttempt,
            resubmitted_at: new Date().toISOString(),
            resubmitted_by: user.id,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .eq('company_id', companyId);

      if (error) {
        console.error('[useSubmissionCorrection] resubmit error:', error);
        return false;
      }

      // Ledger
      await (supabase as any)
        .from('erp_hr_ledger')
        .insert({
          company_id: companyId,
          event_type: 'submission_resubmitted',
          event_label: `Reenvío (intento ${currentAttempt + 1})`,
          entity_type: 'official_submission',
          entity_id: submissionId,
          actor_id: user.id,
          actor_role: 'hr_admin',
          after_snapshot: { attempt: currentAttempt + 1 },
          metadata: { process: 'submission_correction' },
        });

      toast.success('Envío reencolado para reenvío');
      return true;
    } catch {
      return false;
    }
  }, [companyId, user]);

  /**
   * Get correction history for a submission
   */
  const getCorrectionHistory = useCallback(async (
    submissionId: string
  ): Promise<CorrectionRecord[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from('erp_hr_audit_log')
        .select('*')
        .eq('record_id', submissionId)
        .in('action', ['SUBMISSION_CORRECTION_INITIATED', 'ARTIFACT_REGENERATED', 'SUBMISSION_RESUBMITTED'])
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) return [];

      return (data ?? []).map((row: any, i: number) => ({
        id: row.id,
        submissionId,
        attempt: i + 1,
        errors: row.new_data?.errors ?? [],
        correctionAction: row.action,
        status: 'completed' as const,
        createdAt: row.created_at,
        completedAt: row.created_at,
        createdBy: row.user_id,
      }));
    } catch {
      return [];
    }
  }, [companyId]);

  return {
    initiateCorrection,
    regenerateArtifact,
    resubmit,
    getCorrectionHistory,
    isLoading,
  };
}
