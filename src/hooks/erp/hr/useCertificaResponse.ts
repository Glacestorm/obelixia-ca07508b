/**
 * useCertificaResponse.ts — SEPE Certific@2 response flow
 * P1.6: Baja / Finiquito / Certificado Empresa
 * 
 * Mirrors useSiltraResponse.ts / useAEATResponse.ts pattern.
 * 
 * IMPORTANT: This handles manual registration of SEPE responses.
 * No real SEPE Certific@2 connector exists — isRealSubmissionBlocked === true.
 * The certificate artifact is a preparatory JSON payload, NOT official SEPE XML.
 * 
 * Provides:
 * - registerCertificaResponse(): validate → update status → evidence → ledger
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHRLedgerWriter } from './useHRLedgerWriter';
import {
  isValidCertificaTransition,
  CERTIFICA_STATUS_META,
  type CertificaArtifactStatus,
} from '@/engines/erp/hr/certificaArtifactEngine';

// ── Types ──

export interface CertificaResponseInput {
  /** ID of the artifact in erp_hr_official_artifacts */
  artifactId: string;
  /** Employee ID linked to this certificate */
  employeeId: string;
  /** Termination ID if available */
  terminationId?: string;
  /** Response type */
  responseType: 'accepted' | 'rejected';
  /** SEPE reference number (manual entry) */
  sepeReference?: string;
  /** Reception date */
  receptionDate: string;
  /** Rejection reason (when rejected) */
  rejectionReason?: string;
  /** Additional notes */
  notes?: string;
}

export interface CertificaResponseResult {
  success: boolean;
  newStatus: CertificaArtifactStatus;
  evidenceId: string | null;
  ledgerEventId: string | null;
  error?: string;
}

// ── Hook ──

export function useCertificaResponse(companyId: string) {
  const { writeLedgerWithEvidence } = useHRLedgerWriter(companyId, 'certifica_response');

  /**
   * Register a SEPE Certific@2 response.
   * Updates artifact status, creates evidence, and logs ledger event.
   */
  const registerCertificaResponse = useCallback(async (
    input: CertificaResponseInput,
  ): Promise<CertificaResponseResult> => {
    try {
      // 1. Validate input
      if (!input.artifactId) {
        return { success: false, newStatus: 'error', evidenceId: null, ledgerEventId: null, error: 'artifactId requerido' };
      }
      if (!input.receptionDate) {
        return { success: false, newStatus: 'error', evidenceId: null, ledgerEventId: null, error: 'Fecha de recepción requerida' };
      }
      if (input.responseType === 'rejected' && !input.rejectionReason) {
        return { success: false, newStatus: 'error', evidenceId: null, ledgerEventId: null, error: 'Motivo de rechazo requerido' };
      }

      // 2. Get current artifact status
      const { data: artifact, error: fetchError } = await (supabase as any)
        .from('erp_hr_official_artifacts')
        .select('id, status, artifact_type, employee_id')
        .eq('id', input.artifactId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !artifact) {
        return { success: false, newStatus: 'error', evidenceId: null, ledgerEventId: null, error: 'Artefacto no encontrado' };
      }

      // 3. Determine new status
      const newStatus: CertificaArtifactStatus = input.responseType === 'accepted' ? 'accepted' : 'rejected';
      const currentStatus = (artifact.status || 'sent') as CertificaArtifactStatus;

      if (!isValidCertificaTransition(currentStatus, newStatus)) {
        return {
          success: false,
          newStatus: currentStatus,
          evidenceId: null,
          ledgerEventId: null,
          error: `Transición no válida: ${currentStatus} → ${newStatus}`,
        };
      }

      // 4. Update artifact status
      const meta = CERTIFICA_STATUS_META[newStatus];
      const { error: updateError } = await (supabase as any)
        .from('erp_hr_official_artifacts')
        .update({
          status: newStatus,
          status_label: meta.label,
          status_disclaimer: meta.disclaimer,
          response_date: input.receptionDate,
          response_reference: input.sepeReference ?? null,
          response_type: input.responseType,
          rejection_reason: input.rejectionReason ?? null,
          notes: input.notes ?? null,
        })
        .eq('id', input.artifactId)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('[useCertificaResponse] update error:', updateError);
        return { success: false, newStatus: currentStatus, evidenceId: null, ledgerEventId: null, error: 'Error al actualizar artefacto' };
      }

      // 5. Create ledger event + evidence
      const ledgerEventId = await writeLedgerWithEvidence(
        {
          eventType: 'official_export_submitted',
          entityType: 'official_artifact',
          entityId: input.artifactId,
          aggregateType: 'termination',
          aggregateId: input.terminationId,
          beforeSnapshot: { status: currentStatus },
          afterSnapshot: {
            status: newStatus,
            responseType: input.responseType,
            sepeReference: input.sepeReference,
            receptionDate: input.receptionDate,
            rejectionReason: input.rejectionReason,
          },
        },
        [{
          evidenceType: 'external_receipt' as const,
          evidenceLabel: `Respuesta SEPE Certific@2 — ${input.responseType === 'accepted' ? 'Aceptado' : 'Rechazado'}`,
          refEntityType: 'official_artifact',
          refEntityId: input.artifactId,
          evidenceSnapshot: {
            artifactId: input.artifactId,
            responseType: input.responseType,
            sepeReference: input.sepeReference,
            receptionDate: input.receptionDate,
            rejectionReason: input.rejectionReason,
            notes: input.notes,
            isPreparatoryPayload: true,
          },
        }],
      );

      const label = input.responseType === 'accepted'
        ? 'Respuesta SEPE registrada: Aceptado'
        : 'Respuesta SEPE registrada: Rechazado';

      toast.success(label);

      return {
        success: true,
        newStatus,
        evidenceId: null, // evidence is created as part of writeLedgerWithEvidence
        ledgerEventId,
      };
    } catch (err) {
      console.error('[useCertificaResponse] unexpected error:', err);
      toast.error('Error al registrar respuesta SEPE');
      return { success: false, newStatus: 'error', evidenceId: null, ledgerEventId: null, error: 'Error inesperado' };
    }
  }, [companyId, writeLedgerWithEvidence]);

  return {
    registerCertificaResponse,
  };
}
