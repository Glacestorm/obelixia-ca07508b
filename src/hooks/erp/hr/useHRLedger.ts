/**
 * useHRLedger — Hook for writing and querying the HR immutable ledger
 * V2-RRHH-FASE-2
 *
 * Provides:
 *  - recordEvent(): write a ledger entry (with auto-hash)
 *  - recordEventWithEvidence(): write ledger + evidence atomically
 *  - queryTimeline(): fetch timeline by entity, process, or period
 *  - queryByAggregate(): fetch events by aggregate (e.g., payroll run)
 *
 * Uses ledgerEngine for pure logic (hashing, row building).
 * Uses evidenceEngine for evidence row building.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildLedgerRow,
  detectChangedFields,
  LEDGER_EVENT_LABELS,
  type LedgerEventInput,
  type LedgerEventType,
} from '@/engines/erp/hr/ledgerEngine';
import {
  buildEvidenceRow,
  type EvidenceInput,
} from '@/engines/erp/hr/evidenceEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  company_id: string;
  event_type: LedgerEventType;
  event_label: string;
  entity_type: string;
  entity_id: string;
  aggregate_type: string | null;
  aggregate_id: string | null;
  process_id: string | null;
  correlation_id: string | null;
  parent_event_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  source_module: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  changed_fields: string[] | null;
  financial_impact: Record<string, unknown> | null;
  compliance_impact: Record<string, unknown> | null;
  immutable_hash: string;
  is_rectification: boolean;
  is_reopening: boolean;
  is_reversion: boolean;
  is_reemission: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TimelineQuery {
  companyId: string;
  entityType?: string;
  entityId?: string;
  aggregateType?: string;
  aggregateId?: string;
  processId?: string;
  eventTypes?: LedgerEventType[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRLedger(companyId: string) {
  const queryClient = useQueryClient();

  // ── Record a single event ──────────────────────────────────────────────

  const recordEventMutation = useMutation({
    mutationFn: async (input: LedgerEventInput): Promise<string | null> => {
      // Auto-detect changed fields if snapshots provided
      if (input.beforeSnapshot && input.afterSnapshot && !input.changedFields) {
        input.changedFields = detectChangedFields(input.beforeSnapshot, input.afterSnapshot);
      }

      // Auto-set actor from auth
      if (!input.actorId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          input.actorId = user.id;
        }
      }

      const row = await buildLedgerRow(input);

      const { data, error } = await (supabase as any)
        .from('erp_hr_ledger')
        .insert(row)
        .select('id')
        .single();

      if (error) {
        console.error('[useHRLedger] recordEvent error:', error);
        return null;
      }

      return data?.id ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-ledger', companyId] });
    },
  });

  // ── Record event + evidence together ───────────────────────────────────

  const recordEventWithEvidence = useCallback(async (
    eventInput: LedgerEventInput,
    evidenceInputs: Omit<EvidenceInput, 'companyId' | 'ledgerEventId'>[],
  ): Promise<string | null> => {
    // Record the event first
    const eventId = await recordEventMutation.mutateAsync(eventInput);
    if (!eventId) return null;

    // Then attach evidence
    if (evidenceInputs.length > 0) {
      const evidenceRows = evidenceInputs.map(ei =>
        buildEvidenceRow({
          ...ei,
          companyId: eventInput.companyId,
          ledgerEventId: eventId,
        })
      );

      const { error } = await (supabase as any)
        .from('erp_hr_evidence')
        .insert(evidenceRows);

      if (error) {
        console.error('[useHRLedger] evidence insert error:', error);
        // Event was still recorded — evidence failure is non-blocking
      }
    }

    return eventId;
  }, [recordEventMutation]);

  // ── Query timeline ─────────────────────────────────────────────────────

  const useTimeline = (query: Omit<TimelineQuery, 'companyId'>) => {
    return useQuery({
      queryKey: ['hr-ledger', companyId, 'timeline', query],
      queryFn: async (): Promise<LedgerEntry[]> => {
        let q = (supabase as any)
          .from('erp_hr_ledger')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(query.limit ?? 100);

        if (query.entityType) q = q.eq('entity_type', query.entityType);
        if (query.entityId) q = q.eq('entity_id', query.entityId);
        if (query.aggregateType) q = q.eq('aggregate_type', query.aggregateType);
        if (query.aggregateId) q = q.eq('aggregate_id', query.aggregateId);
        if (query.processId) q = q.eq('process_id', query.processId);
        if (query.eventTypes?.length) q = q.in('event_type', query.eventTypes);
        if (query.dateFrom) q = q.gte('created_at', query.dateFrom);
        if (query.dateTo) q = q.lte('created_at', query.dateTo);

        const { data, error } = await q;
        if (error) {
          console.error('[useHRLedger] timeline query error:', error);
          return [];
        }
        return (data ?? []) as LedgerEntry[];
      },
      enabled: !!companyId,
    });
  };

  // ── Convenience: record common events ──────────────────────────────────

  const recordEvent = useCallback((input: LedgerEventInput) => {
    return recordEventMutation.mutateAsync({
      ...input,
      eventLabel: input.eventLabel || LEDGER_EVENT_LABELS[input.eventType] || input.eventType,
    });
  }, [recordEventMutation]);

  return {
    recordEvent,
    recordEventWithEvidence,
    useTimeline,
    isRecording: recordEventMutation.isPending,
  };
}
