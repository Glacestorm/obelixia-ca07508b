/**
 * useCorridorPackAdmin.ts — G2.2
 * CRUD hook for corridor pack administration.
 * Critical operations (publish, duplicate, deprecate, toggle) use DB-side RPC functions.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { CorridorPackRow } from './useCorridorPackRepository';

// ── RPC result contract ──────────────────────────────────────────────────────
/** Shape returned by corridor pack RPC functions (publish, duplicate, deprecate, toggle). */
interface CorridorRpcResult {
  success: boolean;
  error?: string;
  new_pack_id?: string;
}

// ── Filter types ─────────────────────────────────────────────────────────────

export interface CorridorPackFilters {
  origin?: string;
  destination?: string;
  publicationStatus?: string;
  isActive?: boolean;
  category?: string;
  maturityLevel?: string;
  search?: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCorridorPackAdmin(companyId?: string) {
  const queryClient = useQueryClient();
  const queryKeyBase = ['corridor-packs-admin', companyId];

  // ── List packs ────────────────────────────────────────────────────────────

  const usePackList = (filters?: CorridorPackFilters) => {
    return useQuery({
      queryKey: [...queryKeyBase, 'list', filters],
      queryFn: async (): Promise<CorridorPackRow[]> => {
        let query = supabase
          .from('erp_hr_corridor_packs')
          .select('*')
          .order('origin', { ascending: true })
          .order('destination', { ascending: true })
          .order('version', { ascending: false });

        if (filters?.origin) query = query.eq('origin', filters.origin);
        if (filters?.destination) query = query.eq('destination', filters.destination);
        if (filters?.publicationStatus) query = query.eq('publication_status', filters.publicationStatus);
        if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
        if (filters?.category) query = query.eq('category', filters.category);
        if (filters?.maturityLevel) query = query.eq('maturity_level', filters.maturityLevel);

        const { data, error } = await query;
        if (error) {
          console.error('[useCorridorPackAdmin] list error:', error);
          return [];
        }
        return (data ?? []) as unknown as CorridorPackRow[];
      },
    });
  };

  // ── Get single pack ──────────────────────────────────────────────────────

  const usePackDetail = (packId: string | null) => {
    return useQuery({
      queryKey: [...queryKeyBase, 'detail', packId],
      queryFn: async (): Promise<CorridorPackRow | null> => {
        if (!packId) return null;
        const { data, error } = await supabase
          .from('erp_hr_corridor_packs')
          .select('*')
          .eq('id', packId)
          .maybeSingle();

        if (error) {
          console.error('[useCorridorPackAdmin] detail error:', error);
          return null;
        }
        return data as unknown as CorridorPackRow | null;
      },
      enabled: !!packId,
    });
  };

  // ── Update governance fields ─────────────────────────────────────────────

  const updatePackFields = useCallback(async (
    packId: string,
    updates: Partial<Pick<CorridorPackRow,
      'review_owner' | 'internal_notes' | 'confidence_score' |
      'maturity_level' | 'category' | 'officiality' |
      'automation_boundary_note' | 'next_review_at' | 'last_reviewed_at' |
      'pack_data' | 'sources'
    >>,
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    // Build update payload, stripping Record<string, unknown> fields and re-adding as Json
    const { pack_data, sources, ...safeUpdates } = updates;
    const updatePayload: Record<string, unknown> = {
      ...safeUpdates,
      updated_by: user?.id ?? null,
    };
    if (pack_data !== undefined) updatePayload.pack_data = pack_data as unknown as Json;
    if (sources !== undefined) updatePayload.sources = sources as unknown as Json;

    const { error } = await supabase
      .from('erp_hr_corridor_packs')
      .update(updatePayload as Parameters<ReturnType<typeof supabase.from<'erp_hr_corridor_packs'>>['update']>[0])
      .eq('id', packId);

    if (error) {
      console.error('[useCorridorPackAdmin] update error:', error);
      toast.error('Error al actualizar pack');
      return false;
    }

    toast.success('Pack actualizado');
    queryClient.invalidateQueries({ queryKey: queryKeyBase });
    return true;
  }, [queryClient, queryKeyBase]);

  // ── Publish (RPC) ────────────────────────────────────────────────────────

  const publishPack = useCallback(async (packId: string, reason: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('publish_corridor_pack', {
      p_pack_id: packId,
      p_reason: reason,
    });

    if (error) {
      console.error('[useCorridorPackAdmin] publish error:', error);
      toast.error('Error al publicar pack');
      return false;
    }

    const result = data as unknown as CorridorRpcResult;
    if (!result?.success) {
      toast.error(result?.error ?? 'Error al publicar');
      return false;
    }

    toast.success('Pack publicado');
    queryClient.invalidateQueries({ queryKey: queryKeyBase });
    return true;
  }, [queryClient, queryKeyBase]);

  // ── Duplicate (RPC) ──────────────────────────────────────────────────────

  const duplicatePack = useCallback(async (
    packId: string,
    newVersion: string,
    reason: string,
  ): Promise<string | null> => {
    const { data, error } = await supabase.rpc('duplicate_corridor_pack', {
      p_pack_id: packId,
      p_new_version: newVersion,
      p_reason: reason,
    });

    if (error) {
      console.error('[useCorridorPackAdmin] duplicate error:', error);
      toast.error('Error al duplicar pack');
      return null;
    }

    const result = data as unknown as CorridorRpcResult;
    if (!result?.success) {
      toast.error(result?.error ?? 'Error al duplicar');
      return null;
    }

    toast.success(`Nueva versión ${newVersion} creada`);
    queryClient.invalidateQueries({ queryKey: queryKeyBase });
    return result.new_pack_id ?? null;
  }, [queryClient, queryKeyBase]);

  // ── Deprecate (RPC) ──────────────────────────────────────────────────────

  const deprecatePack = useCallback(async (packId: string, reason: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('deprecate_corridor_pack', {
      p_pack_id: packId,
      p_reason: reason,
    });

    if (error) {
      console.error('[useCorridorPackAdmin] deprecate error:', error);
      toast.error('Error al deprecar pack');
      return false;
    }

    const result = data as unknown as CorridorRpcResult;
    if (!result?.success) {
      toast.error(result?.error ?? 'Error al deprecar');
      return false;
    }

    toast.success('Pack deprecado');
    queryClient.invalidateQueries({ queryKey: queryKeyBase });
    return true;
  }, [queryClient, queryKeyBase]);

  // ── Toggle active (RPC) ──────────────────────────────────────────────────

  const toggleActive = useCallback(async (
    packId: string,
    active: boolean,
    reason: string,
  ): Promise<boolean> => {
    const { data, error } = await supabase.rpc('toggle_corridor_pack_active', {
      p_pack_id: packId,
      p_active: active,
      p_reason: reason,
    });

    if (error) {
      console.error('[useCorridorPackAdmin] toggle error:', error);
      toast.error('Error al cambiar estado');
      return false;
    }

    const result = data as unknown as CorridorRpcResult;
    if (!result?.success) {
      toast.error(result?.error ?? 'Error al cambiar estado');
      return false;
    }

    toast.success(active ? 'Pack activado' : 'Pack desactivado');
    queryClient.invalidateQueries({ queryKey: queryKeyBase });
    return true;
  }, [queryClient, queryKeyBase]);

  // ── Audit log ────────────────────────────────────────────────────────────

  const usePackAuditLog = (packId: string | null) => {
    return useQuery({
      queryKey: [...queryKeyBase, 'audit', packId],
      queryFn: async () => {
        if (!packId) return [];
        const { data, error } = await supabase
          .from('erp_hr_audit_log')
          .select('*')
          .eq('table_name', 'erp_hr_corridor_packs')
          .eq('record_id', packId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('[useCorridorPackAdmin] audit error:', error);
          return [];
        }
        return data ?? [];
      },
      enabled: !!packId,
    });
  };

  return {
    usePackList,
    usePackDetail,
    updatePackFields,
    publishPack,
    duplicatePack,
    deprecatePack,
    toggleActive,
    usePackAuditLog,
  };
}
