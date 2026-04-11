/**
 * useAEATResponse — Hook for registering AEAT response reception
 * P1.5R: Mirrors useSiltraResponse pattern for Modelo 111 / 190
 *
 * Orchestrates:
 *  - Validation of AEAT response input
 *  - Update of 111/190 artifact status
 *  - Evidence creation (external_receipt)
 *  - Ledger event (official_export_submitted)
 *  - Audit logging
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  validateAEATInput,
  buildAEATResponseRecord,
  type AEATResponseInput,
} from '@/engines/erp/hr/aeatResponseEngine';
import { buildEvidenceRow } from '@/engines/erp/hr/evidenceEngine';
import { buildLedgerRow } from '@/engines/erp/hr/ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AEATResponseResult {
  success: boolean;
  error?: string;
  artifactStatus?: string;
  evidenceId?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAEATResponse(companyId: string) {
  const { user } = useAuth();

  const registerAEATResponse = useCallback(async (
    input: Omit<AEATResponseInput, 'registeredBy' | 'companyId'>,
  ): Promise<AEATResponseResult> => {
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }

    const fullInput: AEATResponseInput = {
      ...input,
      companyId,
      registeredBy: user.id,
    };

    // 1. Validate
    const validation = validateAEATInput(fullInput);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    // 2. Build record
    const record = buildAEATResponseRecord(fullInput);

    try {
      // 3. Update artifact status
      const { error: artifactError } = await (supabase as any)
        .from('erp_hr_official_artifacts')
        .update({
          status: record.newArtifactStatus,
          metadata: {
            aeat_reference: record.aeatReference,
            aeat_csv_code: record.csvCode,
            aeat_reception_date: record.receptionDate,
            aeat_response_type: record.responseType,
            aeat_rejection_reason: record.rejectionReason,
            aeat_registered_by: user.id,
            aeat_registered_at: new Date().toISOString(),
            artifact_type: record.artifactType,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.artifactId)
        .eq('company_id', companyId);

      if (artifactError) {
        console.error('[useAEATResponse] artifact update error:', artifactError);
        return { success: false, error: 'Error al actualizar estado del artefacto' };
      }

      // 4. Create evidence record
      const periodLabel = input.artifactType === 'modelo_111'
        ? (input.periodicity === 'mensual' ? `M${input.period}/${input.fiscalYear}` : `${input.period}T/${input.fiscalYear}`)
        : `Ejercicio ${input.fiscalYear}`;

      const evidenceRow = buildEvidenceRow({
        companyId,
        evidenceType: 'external_receipt',
        evidenceLabel: record.evidenceLabel,
        refEntityType: 'official_artifact',
        refEntityId: input.artifactId,
        evidenceSnapshot: record.evidenceSnapshot,
        capturedBy: user.id,
        metadata: {
          aeat_reference: record.aeatReference,
          artifact_type: record.artifactType,
          response_type: record.responseType,
          period: periodLabel,
          process: 'aeat_fiscal',
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
          process: 'aeat_fiscal',
          artifact_type: record.artifactType,
          fiscal_year: input.fiscalYear,
          period: input.period,
        },
      });

      await (supabase as any)
        .from('erp_hr_ledger')
        .insert(ledgerRow);

      // 6. Audit log
      await (supabase as any)
        .from('erp_hr_audit_log')
        .insert([{
          action: `AEAT_${record.artifactType.toUpperCase()}_RESPONSE_REGISTERED`,
          table_name: 'erp_hr_official_artifacts',
          record_id: input.artifactId,
          company_id: companyId,
          user_id: user.id,
          old_data: null,
          new_data: record.evidenceSnapshot,
          category: 'fiscal',
          severity: record.responseType === 'rejected' ? 'warning' : 'important',
          changed_fields: ['status', 'metadata'],
          metadata: { process: 'aeat_fiscal', version: 'p1.5r' },
        }]);

      const typeLabel = record.artifactType === 'modelo_111' ? 'Modelo 111' : 'Modelo 190';
      const responseLabel = record.responseType === 'accepted' ? 'aceptado' : 'rechazado';
      toast.success(`${typeLabel} ${responseLabel} registrado`);

      return {
        success: true,
        artifactStatus: record.newArtifactStatus,
        evidenceId: evidenceData?.id ?? undefined,
      };
    } catch (err) {
      console.error('[useAEATResponse] error:', err);
      toast.error('Error al registrar respuesta AEAT');
      return { success: false, error: 'Error inesperado' };
    }
  }, [companyId, user]);

  return {
    registerAEATResponse,
  };
}
