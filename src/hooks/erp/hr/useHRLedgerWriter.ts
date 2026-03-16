/**
 * useHRLedgerWriter — Thin wrapper around useHRLedger for instrumenting existing hooks.
 * 
 * Provides fire-and-forget ledger recording with:
 *  - Auto actor detection
 *  - Source module tagging
 *  - Error swallowing (ledger failure must never block business flow)
 *  - Idempotency key support to prevent double-writes
 * 
 * V2-RRHH-FASE-2B
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildLedgerRow,
  detectChangedFields,
  LEDGER_EVENT_LABELS,
  type LedgerEventInput,
  type LedgerEventType,
} from '@/engines/erp/hr/ledgerEngine';
import { buildEvidenceRow, type EvidenceInput } from '@/engines/erp/hr/evidenceEngine';

// Track recently written events to prevent double-writes within a session
const recentEvents = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 5000;

function makeIdempotencyKey(input: Partial<LedgerEventInput>): string {
  return `${input.eventType}:${input.entityType}:${input.entityId}:${input.companyId}`;
}

function isDuplicate(key: string): boolean {
  const last = recentEvents.get(key);
  if (last && Date.now() - last < IDEMPOTENCY_WINDOW_MS) return true;
  recentEvents.set(key, Date.now());
  // Cleanup old entries
  if (recentEvents.size > 200) {
    const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
    for (const [k, v] of recentEvents) {
      if (v < cutoff) recentEvents.delete(k);
    }
  }
  return false;
}

export function useHRLedgerWriter(companyId: string, sourceModule: string) {
  const actorCacheRef = useRef<string | null>(null);

  const getActorId = useCallback(async (): Promise<string | null> => {
    if (actorCacheRef.current) return actorCacheRef.current;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      actorCacheRef.current = user?.id ?? null;
      return actorCacheRef.current;
    } catch {
      return null;
    }
  }, []);

  /**
   * Fire-and-forget ledger write. Never throws — errors are console-logged.
   */
  const writeLedger = useCallback(async (
    input: Omit<LedgerEventInput, 'companyId' | 'sourceModule'> & {
      companyId?: string;
      sourceModule?: string;
    }
  ): Promise<string | null> => {
    const fullInput: LedgerEventInput = {
      ...input,
      companyId: input.companyId ?? companyId,
      sourceModule: input.sourceModule ?? sourceModule,
      eventLabel: input.eventLabel || LEDGER_EVENT_LABELS[input.eventType] || input.eventType,
    };

    // Idempotency guard
    const key = makeIdempotencyKey(fullInput);
    if (isDuplicate(key)) {
      console.debug('[LedgerWriter] Skipped duplicate event:', key);
      return null;
    }

    try {
      // Auto-detect actor
      if (!fullInput.actorId) {
        fullInput.actorId = await getActorId() ?? undefined;
      }

      // Auto-detect changed fields
      if (fullInput.beforeSnapshot && fullInput.afterSnapshot && !fullInput.changedFields) {
        fullInput.changedFields = detectChangedFields(fullInput.beforeSnapshot, fullInput.afterSnapshot);
      }

      const row = await buildLedgerRow(fullInput);

      const { data, error } = await (supabase as any)
        .from('erp_hr_ledger')
        .insert(row)
        .select('id')
        .single();

      if (error) {
        console.error('[LedgerWriter] insert error:', error);
        return null;
      }

      return data?.id ?? null;
    } catch (err) {
      console.error('[LedgerWriter] unexpected error:', err);
      return null;
    }
  }, [companyId, sourceModule, getActorId]);

  /**
   * Write ledger event + evidence rows atomically (best-effort on evidence).
   */
  const writeLedgerWithEvidence = useCallback(async (
    input: Omit<LedgerEventInput, 'companyId' | 'sourceModule'>,
    evidenceInputs: Omit<EvidenceInput, 'companyId' | 'ledgerEventId'>[],
  ): Promise<string | null> => {
    const eventId = await writeLedger(input);
    if (!eventId || evidenceInputs.length === 0) return eventId;

    try {
      const rows = evidenceInputs.map(ei =>
        buildEvidenceRow({
          ...ei,
          companyId,
          ledgerEventId: eventId,
        })
      );

      const { error } = await (supabase as any)
        .from('erp_hr_evidence')
        .insert(rows);

      if (error) {
        console.error('[LedgerWriter] evidence insert error (non-blocking):', error);
      }
    } catch (err) {
      console.error('[LedgerWriter] evidence unexpected error:', err);
    }

    return eventId;
  }, [companyId, writeLedger]);

  /**
   * Write a version registry entry.
   */
  const writeVersion = useCallback(async (params: {
    entityType: string;
    entityId: string;
    state?: string;
    contentSnapshot?: Record<string, unknown>;
    contentHash?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string | null> => {
    try {
      // Get next version
      const { data: existing } = await (supabase as any)
        .from('erp_hr_version_registry')
        .select('id, version_number')
        .eq('company_id', companyId)
        .eq('entity_type', params.entityType)
        .eq('entity_id', params.entityId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = existing ? (existing.version_number as number) + 1 : 1;
      const actorId = await getActorId();

      const { data, error } = await (supabase as any)
        .from('erp_hr_version_registry')
        .insert({
          company_id: companyId,
          entity_type: params.entityType,
          entity_id: params.entityId,
          version_number: nextVersion,
          state: params.state ?? 'draft',
          content_snapshot: params.contentSnapshot ?? null,
          content_hash: params.contentHash ?? null,
          parent_version_id: existing?.id ?? null,
          created_by: actorId,
          metadata: params.metadata ?? {},
        })
        .select('id')
        .single();

      if (error) {
        console.error('[LedgerWriter] version insert error:', error);
        return null;
      }

      // Supersede previous version
      if (existing?.id) {
        await (supabase as any)
          .from('erp_hr_version_registry')
          .update({ superseded_by_id: data.id })
          .eq('id', existing.id);
      }

      return data?.id ?? null;
    } catch (err) {
      console.error('[LedgerWriter] version unexpected error:', err);
      return null;
    }
  }, [companyId, getActorId]);

  return {
    writeLedger,
    writeLedgerWithEvidence,
    writeVersion,
  };
}
