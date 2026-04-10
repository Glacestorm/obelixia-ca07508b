/**
 * useTA2Reception — Hook for registering TA2 (TGSS response) reception
 * V2-RRHH-P1.1
 *
 * Orchestrates:
 *  - Validation of TA2 input
 *  - Update of AFI artifact status (accepted/rejected)
 *  - Persistence of confirmed_reference in registration_data
 *  - Evidence creation (external_receipt)
 *  - Ledger event (official_export_submitted)
 *  - Audit logging
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  validateTA2Input,
  buildTA2ReceptionRecord,
  type TA2ReceptionInput,
  type TA2ResponseType,
} from '@/engines/erp/hr/ta2ReceptionEngine';
import { buildEvidenceRow } from '@/engines/erp/hr/evidenceEngine';
import { buildLedgerRow } from '@/engines/erp/hr/ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TA2ReceptionResult {
  success: boolean;
  error?: string;
  artifactStatus?: string;
  evidenceId?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTA2Reception(companyId: string) {
  const { user } = useAuth();

  /**
   * Register TA2 reception — full orchestration:
   * 1. Validate input
   * 2. Update artifact status
   * 3. Update registration_data confirmed_reference
   * 4. Create evidence record
   * 5. Create ledger event
   * 6. Audit log
   */
  const registerTA2Reception = useCallback(async (
    input: Omit<TA2ReceptionInput, 'registeredBy' | 'companyId'>,
  ): Promise<TA2ReceptionResult> => {
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }

    const fullInput: TA2ReceptionInput = {
      ...input,
      companyId,
      registeredBy: user.id,
    };

    // 1. Validate
    const validation = validateTA2Input(fullInput);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    // 2. Build record
    const record = buildTA2ReceptionRecord(fullInput);

    try {
      // 3. Update artifact status
      const { error: artifactError } = await (supabase as any)
        .from('erp_hr_official_artifacts')
        .update({
          status: record.newArtifactStatus,
          metadata: {
            ta2_reference: record.tgssReference,
            ta2_reception_date: record.receptionDate,
            ta2_response_type: record.responseType,
            ta2_rejection_reason: record.rejectionReason,
            ta2_registered_by: user.id,
            ta2_registered_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.artifactId)
        .eq('company_id', companyId);

      if (artifactError) {
        console.error('[useTA2Reception] artifact update error:', artifactError);
        return { success: false, error: 'Error al actualizar estado del artefacto' };
      }

      // 4. Update registration_data confirmed_reference (if requestId provided)
      if (input.requestId && record.responseType === 'accepted') {
        await (supabase as any)
          .from('erp_hr_registration_data')
          .update({
            confirmed_reference: record.tgssReference,
            confirmed_at: new Date().toISOString(),
            registration_status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', input.requestId);
      }

      // 5. Create evidence record
      const evidenceRow = buildEvidenceRow({
        companyId,
        evidenceType: 'external_receipt',
        evidenceLabel: record.evidenceLabel,
        refEntityType: 'official_artifact',
        refEntityId: input.artifactId,
        evidenceSnapshot: record.evidenceSnapshot,
        capturedBy: user.id,
        metadata: {
          ta2_reference: record.tgssReference,
          employee_id: input.employeeId,
          response_type: record.responseType,
        },
      });

      const { data: evidenceData } = await (supabase as any)
        .from('erp_hr_evidence')
        .insert(evidenceRow)
        .select('id')
        .single();

      // 6. Create ledger event
      const ledgerRow = buildLedgerRow({
        companyId,
        eventType: 'official_export_submitted',
        eventLabel: record.ledgerEventLabel,
        entityType: 'official_artifact',
        entityId: input.artifactId,
        actorId: user.id,
        actorRole: 'hr_admin',
        payload: record.evidenceSnapshot,
        metadata: {
          process: 'alta_afi_ta2',
          employee_id: input.employeeId,
        },
      });

      await (supabase as any)
        .from('erp_hr_ledger')
        .insert(ledgerRow);

      // 7. Audit log
      await (supabase as any)
        .from('erp_hr_audit_log')
        .insert([{
          action: 'TA2_RECEPTION_REGISTERED',
          table_name: 'erp_hr_official_artifacts',
          record_id: input.artifactId,
          company_id: companyId,
          user_id: user.id,
          old_data: null,
          new_data: record.evidenceSnapshot,
          category: 'registration',
          severity: record.responseType === 'accepted' ? 'important' : 'warning',
          changed_fields: ['status', 'metadata'],
          metadata: { process: 'alta_afi_ta2', version: 'p1.1' },
        }]);

      const label = record.responseType === 'accepted' ? 'TA2 aceptado registrado' : 'TA2 rechazado registrado';
      toast.success(label);

      return {
        success: true,
        artifactStatus: record.newArtifactStatus,
        evidenceId: evidenceData?.id ?? undefined,
      };
    } catch (err) {
      console.error('[useTA2Reception] error:', err);
      toast.error('Error al registrar recepción del TA2');
      return { success: false, error: 'Error inesperado' };
    }
  }, [companyId, user]);

  return {
    registerTA2Reception,
  };
}
