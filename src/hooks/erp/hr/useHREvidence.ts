/**
 * useHREvidence — Hook for querying and managing HR evidence
 * V2-RRHH-FASE-2
 *
 * Provides:
 *  - queryByEntity(): evidence linked to an entity
 *  - queryByLedgerEvent(): evidence for a specific event
 *  - queryByProcess(): evidence chain for a process
 *  - attachEvidence(): add evidence to an existing ledger event
 *  - invalidateEvidence(): mark evidence as invalid (with reason)
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildEvidenceRow, type EvidenceInput } from '@/engines/erp/hr/evidenceEngine';
import type { EvidenceType } from '@/engines/erp/hr/ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvidenceRecord {
  id: string;
  company_id: string;
  ledger_event_id: string | null;
  evidence_type: EvidenceType;
  evidence_label: string;
  ref_entity_type: string;
  ref_entity_id: string;
  document_id: string | null;
  file_version_id: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
  content_hash: string | null;
  evidence_snapshot: Record<string, unknown> | null;
  captured_at: string;
  captured_by: string | null;
  is_valid: boolean;
  invalidated_at: string | null;
  invalidation_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHREvidence(companyId: string) {
  const queryClient = useQueryClient();

  // ── Query by entity ────────────────────────────────────────────────────

  const useEvidenceByEntity = (entityType: string, entityId: string) => {
    return useQuery({
      queryKey: ['hr-evidence', companyId, 'entity', entityType, entityId],
      queryFn: async (): Promise<EvidenceRecord[]> => {
        const { data, error } = await (supabase as any)
          .from('erp_hr_evidence')
          .select('*')
          .eq('company_id', companyId)
          .eq('ref_entity_type', entityType)
          .eq('ref_entity_id', entityId)
          .order('captured_at', { ascending: false });

        if (error) {
          console.error('[useHREvidence] queryByEntity error:', error);
          return [];
        }
        return (data ?? []) as EvidenceRecord[];
      },
      enabled: !!companyId && !!entityId,
    });
  };

  // ── Query by ledger event ──────────────────────────────────────────────

  const useEvidenceByEvent = (ledgerEventId: string | null) => {
    return useQuery({
      queryKey: ['hr-evidence', companyId, 'event', ledgerEventId],
      queryFn: async (): Promise<EvidenceRecord[]> => {
        if (!ledgerEventId) return [];
        const { data, error } = await (supabase as any)
          .from('erp_hr_evidence')
          .select('*')
          .eq('company_id', companyId)
          .eq('ledger_event_id', ledgerEventId)
          .order('captured_at', { ascending: true });

        if (error) {
          console.error('[useHREvidence] queryByEvent error:', error);
          return [];
        }
        return (data ?? []) as EvidenceRecord[];
      },
      enabled: !!companyId && !!ledgerEventId,
    });
  };

  // ── Attach evidence ────────────────────────────────────────────────────

  const attachEvidence = useCallback(async (input: EvidenceInput): Promise<string | null> => {
    const row = buildEvidenceRow(input);

    const { data, error } = await (supabase as any)
      .from('erp_hr_evidence')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('[useHREvidence] attachEvidence error:', error);
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ['hr-evidence', companyId] });
    return data?.id ?? null;
  }, [companyId, queryClient]);

  // ── Invalidate evidence ────────────────────────────────────────────────

  const invalidateEvidence = useCallback(async (
    evidenceId: string,
    reason: string,
  ): Promise<boolean> => {
    const { error } = await (supabase as any)
      .from('erp_hr_evidence')
      .update({
        is_valid: false,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: reason,
      })
      .eq('id', evidenceId)
      .eq('company_id', companyId);

    if (error) {
      console.error('[useHREvidence] invalidateEvidence error:', error);
      return false;
    }

    queryClient.invalidateQueries({ queryKey: ['hr-evidence', companyId] });
    return true;
  }, [companyId, queryClient]);

  return {
    useEvidenceByEntity,
    useEvidenceByEvent,
    attachEvidence,
    invalidateEvidence,
  };
}
