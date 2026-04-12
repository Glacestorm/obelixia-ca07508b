/**
 * useHRVersionRegistry — Hook for managing versioned entities
 * V2-RRHH-FASE-2
 *
 * Provides:
 *  - createVersion(): register a new version for an entity
 *  - transitionState(): change version state with validation
 *  - getVersionHistory(): fetch version chain for an entity
 *  - getCurrentVersion(): get the latest non-superseded version
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  canTransitionVersion,
  type VersionState,
} from '@/engines/erp/hr/ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VersionRecord {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  version_number: number;
  state: VersionState;
  previous_state: VersionState | null;
  content_snapshot: Record<string, unknown> | null;
  content_hash: string | null;
  parent_version_id: string | null;
  superseded_by_id: string | null;
  created_by: string | null;
  state_changed_by: string | null;
  state_changed_at: string | null;
  state_change_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHRVersionRegistry(companyId: string) {
  const queryClient = useQueryClient();

  // ── Get version history ────────────────────────────────────────────────

  const useVersionHistory = (entityType: string, entityId: string) => {
    return useQuery({
      queryKey: ['hr-versions', companyId, entityType, entityId],
      queryFn: async (): Promise<VersionRecord[]> => {
        const { data, error } = await supabase
          .from('erp_hr_version_registry')
          .select('*')
          .eq('company_id', companyId)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('version_number', { ascending: false });

        if (error) {
          console.error('[useHRVersionRegistry] queryHistory error:', error);
          return [];
        }
        return (data ?? []) as unknown as VersionRecord[];
      },
      enabled: !!companyId && !!entityId,
    });
  };

  // ── Create a new version ───────────────────────────────────────────────

  const createVersion = useCallback(async (params: {
    entityType: string;
    entityId: string;
    contentSnapshot?: Record<string, unknown>;
    contentHash?: string;
    metadata?: Record<string, unknown>;
  }): Promise<VersionRecord | null> => {
    // Get current max version number
    const { data: existing } = await supabase
      .from('erp_hr_version_registry')
      .select('id, version_number')
      .eq('company_id', companyId)
      .eq('entity_type', params.entityType)
      .eq('entity_id', params.entityId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = existing ? (existing.version_number as number) + 1 : 1;
    const parentId = existing?.id ?? null;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('erp_hr_version_registry')
      .insert({
        company_id: companyId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        version_number: nextVersion,
        state: 'draft',
        content_snapshot: (params.contentSnapshot ?? null) as unknown as Json,
        content_hash: params.contentHash ?? null,
        parent_version_id: parentId,
        created_by: user?.id ?? null,
        metadata: (params.metadata ?? {}) as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      console.error('[useHRVersionRegistry] createVersion error:', error);
      return null;
    }

    // Mark previous version as superseded if it was closed
    if (parentId && existing) {
      await supabase
        .from('erp_hr_version_registry')
        .update({ superseded_by_id: data.id })
        .eq('id', parentId);
    }

    queryClient.invalidateQueries({
      queryKey: ['hr-versions', companyId, params.entityType, params.entityId],
    });

    return data as unknown as VersionRecord;
  }, [companyId, queryClient]);

  // ── Transition state ───────────────────────────────────────────────────

  const transitionState = useCallback(async (
    versionId: string,
    newState: VersionState,
    reason: string,
    entityType?: string,
    entityId?: string,
  ): Promise<boolean> => {
    // Get current state first
    const { data: current } = await supabase
      .from('erp_hr_version_registry')
      .select('state')
      .eq('id', versionId)
      .single();

    if (!current) return false;

    const currentState = current.state as VersionState;
    if (!canTransitionVersion(currentState, newState)) {
      console.error(`[useHRVersionRegistry] Invalid transition: ${currentState} → ${newState}`);
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('erp_hr_version_registry')
      .update({
        state: newState,
        state_changed_by: user?.id ?? null,
        state_change_reason: reason,
      })
      .eq('id', versionId);

    if (error) {
      console.error('[useHRVersionRegistry] transitionState error:', error);
      return false;
    }

    if (entityType && entityId) {
      queryClient.invalidateQueries({
        queryKey: ['hr-versions', companyId, entityType, entityId],
      });
    }

    return true;
  }, [companyId, queryClient]);

  return {
    useVersionHistory,
    createVersion,
    transitionState,
  };
}
