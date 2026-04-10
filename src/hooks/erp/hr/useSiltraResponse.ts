/**
 * useSiltraResponse — Hook for registering TGSS/SILTRA response reception
 * V2-RRHH-P1.4
 *
 * Orchestrates:
 *  - Validation of SILTRA response input
 *  - Update of RLC/RNT/CRA artifact status
 *  - Evidence creation (external_receipt)
 *  - Ledger event (official_export_submitted)
 *  - Audit logging
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  validateSiltraInput,
  buildSiltraResponseRecord,
  type SiltraResponseInput,
  type SiltraArtifactType,
  type SiltraResponseType,
} from '@/engines/erp/hr/siltraResponseEngine';
import { buildEvidenceRow } from '@/engines/erp/hr/evidenceEngine';
import { buildLedgerRow } from '@/engines/erp/hr/ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SiltraResponseResult {
  success: boolean;
  error?: string;
  artifactStatus?: string;
  evidenceId?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSiltraResponse(companyId: string) {
  const { user } = useAuth();

  const registerSiltraResponse = useCallback(async (
    input: Omit<SiltraResponseInput, 'registeredBy' | 'companyId'>,
  ): Promise<SiltraResponseResult> => {
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }

    const fullInput: SiltraResponseInput = {
      ...input,
      companyId,
      registeredBy: user.id,
    };

    // 1. Validate
    const validation = validateSiltraInput(fullInput);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    // 2. Build record
    const record = buildSiltraResponseRecord(fullInput);

    try {
      // 3. Update artifact status
      const { error: artifactError } = await (supabase as any)
        .from('erp_hr_official_artifacts')
        .update({
          status: record.newArtifactStatus,
          metadata: {
            tgss_reference: record.tgssReference,
            tgss_reception_date: record.receptionDate,
            tgss_response_type: record.responseType,
            tgss_rejection_reason: record.rejectionReason,
            tgss_registered_by: user.id,
            tgss_registered_at: new Date().toISOString(),
            artifact_type: record.artifactType,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.artifactId)
        .eq('company_id', companyId);

      if (artifactError) {
        console.error('[useSiltraResponse] artifact update error:', artifactError);
        return { success: false, error: 'Error al actualizar estado del artefacto' };
      }

      // 4. Create evidence record
      const evidenceRow = buildEvidenceRow({
        companyId,
        evidenceType: 'external_receipt',
        evidenceLabel: record.evidenceLabel,
        refEntityType: 'official_artifact',
        refEntityId: input.artifactId,
        evidenceSnapshot: record.evidenceSnapshot,
        capturedBy: user.id,
        metadata: {
          tgss_reference: record.tgssReference,
          artifact_type: record.artifactType,
          response_type: record.responseType,
          period: `${input.periodMonth}/${input.periodYear}`,
          process: 'siltra_cotizacion',
        },
      });

      const { data: evidenceData } = await (supabase as any)
        .from('erp_hr_evidence')
        .insert(evidenceRow)
        .select('id')
        .single();

      // 5. Create ledger event
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
          process: 'siltra_cotizacion',
          artifact_type: record.artifactType,
          period_year: input.periodYear,
          period_month: input.periodMonth,
        },
      });

      await (supabase as any)
        .from('erp_hr_ledger')
        .insert(ledgerRow);

      // 6. Audit log
      await (supabase as any)
        .from('erp_hr_audit_log')
        .insert([{
          action: `SILTRA_${record.artifactType.toUpperCase()}_RESPONSE_REGISTERED`,
          table_name: 'erp_hr_official_artifacts',
          record_id: input.artifactId,
          company_id: companyId,
          user_id: user.id,
          old_data: null,
          new_data: record.evidenceSnapshot,
          category: 'cotizacion',
          severity: record.responseType === 'rejected' ? 'warning' : 'important',
          changed_fields: ['status', 'metadata'],
          metadata: { process: 'siltra_cotizacion', version: 'p1.4' },
        }]);

      const typeLabel = record.artifactType.toUpperCase();
      const responseLabel = record.responseType === 'accepted' ? 'aceptado'
        : record.responseType === 'confirmed' ? 'confirmado' : 'rechazado';
      toast.success(`${typeLabel} ${responseLabel} registrado`);

      return {
        success: true,
        artifactStatus: record.newArtifactStatus,
        evidenceId: evidenceData?.id ?? undefined,
      };
    } catch (err) {
      console.error('[useSiltraResponse] error:', err);
      toast.error('Error al registrar respuesta TGSS');
      return { success: false, error: 'Error inesperado' };
    }
  }, [companyId, user]);

  return {
    registerSiltraResponse,
  };
}
