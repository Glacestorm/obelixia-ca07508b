/**
 * useSEPEReception — Hook for registering SEPE/Contrat@ response reception
 * V2-RRHH-P1.2
 *
 * Orchestrates:
 *  - Validation of SEPE input
 *  - Update of Contrat@ artifact status (accepted/rejected)
 *  - Persistence of sepe_communication_date + contrata_code in contract_process_data
 *  - Evidence creation (external_receipt)
 *  - Ledger event (official_export_submitted)
 *  - Audit logging
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  validateSEPEInput,
  buildSEPEReceptionRecord,
  type SEPEReceptionInput,
  type SEPEResponseType,
} from '@/engines/erp/hr/sepeReceptionEngine';
import { buildEvidenceRow } from '@/engines/erp/hr/evidenceEngine';
import { buildLedgerRow } from '@/engines/erp/hr/ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SEPEReceptionResult {
  success: boolean;
  error?: string;
  artifactStatus?: string;
  evidenceId?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSEPEReception(companyId: string) {
  const { user } = useAuth();

  const registerSEPEReception = useCallback(async (
    input: Omit<SEPEReceptionInput, 'registeredBy' | 'companyId'>,
  ): Promise<SEPEReceptionResult> => {
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }

    const fullInput: SEPEReceptionInput = {
      ...input,
      companyId,
      registeredBy: user.id,
    };

    // 1. Validate
    const validation = validateSEPEInput(fullInput);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    // 2. Build record
    const record = buildSEPEReceptionRecord(fullInput);

    try {
      // 3. Update artifact status
      const { error: artifactError } = await (supabase as any)
        .from('erp_hr_official_artifacts')
        .update({
          status: record.newArtifactStatus,
          metadata: {
            sepe_reference: record.sepeReference,
            sepe_reception_date: record.receptionDate,
            sepe_response_type: record.responseType,
            sepe_rejection_reason: record.rejectionReason,
            sepe_registered_by: user.id,
            sepe_registered_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.artifactId)
        .eq('company_id', companyId);

      if (artifactError) {
        console.error('[useSEPEReception] artifact update error:', artifactError);
        return { success: false, error: 'Error al actualizar estado del artefacto' };
      }

      // 4. Update contract_process_data (if contractProcessId provided and accepted)
      if (input.contractProcessId && record.responseType === 'accepted') {
        await (supabase as any)
          .from('erp_hr_contract_process_data')
          .update({
            sepe_communication_date: record.receptionDate,
            contrata_code: record.sepeReference,
            confirmed_reference: record.sepeReference,
            confirmed_at: new Date().toISOString(),
            contract_process_status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', input.contractProcessId);
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
          sepe_reference: record.sepeReference,
          employee_id: input.employeeId,
          response_type: record.responseType,
          process: 'contrata_sepe',
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
        afterSnapshot: record.evidenceSnapshot,
        metadata: {
          process: 'contrata_sepe',
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
          action: 'SEPE_RECEPTION_REGISTERED',
          table_name: 'erp_hr_official_artifacts',
          record_id: input.artifactId,
          company_id: companyId,
          user_id: user.id,
          old_data: null,
          new_data: record.evidenceSnapshot,
          category: 'contract',
          severity: record.responseType === 'accepted' ? 'important' : 'warning',
          changed_fields: ['status', 'metadata'],
          metadata: { process: 'contrata_sepe', version: 'p1.2' },
        }]);

      const label = record.responseType === 'accepted'
        ? 'Respuesta SEPE aceptada registrada'
        : 'Respuesta SEPE rechazada registrada';
      toast.success(label);

      return {
        success: true,
        artifactStatus: record.newArtifactStatus,
        evidenceId: evidenceData?.id ?? undefined,
      };
    } catch (err) {
      console.error('[useSEPEReception] error:', err);
      toast.error('Error al registrar respuesta SEPE');
      return { success: false, error: 'Error inesperado' };
    }
  }, [companyId, user]);

  return {
    registerSEPEReception,
  };
}
