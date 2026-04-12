/**
 * useCorridorPackRepository.ts — G2.2
 * Async DB lookup for corridor packs with TS constants fallback.
 * Keeps expatriateSupervisor.ts pure/synchronous by resolving the pack
 * at the hook layer before invoking the engine.
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCorridorPack, type CorridorKnowledgePack, type PackSourceRef, type CorridorReviewTrigger } from '@/engines/erp/hr/corridorKnowledgePacks';

// ── Pack data shape as stored in pack_data JSON column ──────────────────────
/** Intermediate type for the JSON blob stored in erp_hr_corridor_packs.pack_data */
interface PackDataBlob {
  ss?: CorridorKnowledgePack['ss'];
  cdi?: CorridorKnowledgePack['cdi'];
  tax?: CorridorKnowledgePack['tax'];
  immigration?: CorridorKnowledgePack['immigration'];
  payroll?: CorridorKnowledgePack['payroll'];
  requiredDocuments?: string[];
  reviewTriggers?: string[];
}

export interface CorridorPackRow {
  id: string;
  company_id: string | null;
  canonical_code: string;
  slug: string;
  origin: string;
  destination: string;
  version: string;
  publication_status: string;
  is_active: boolean;
  confidence_score: number | null;
  maturity_level: string;
  category: string;
  review_owner: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  published_at: string | null;
  published_by: string | null;
  pack_data: Record<string, unknown>;
  sources: Record<string, unknown>[];
  internal_notes: string | null;
  officiality: string;
  automation_boundary_note: string | null;
  parent_version_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a DB row's pack_data into a CorridorKnowledgePack shape
 * compatible with the synchronous engine.
 */
function dbRowToCorridorPack(row: CorridorPackRow): CorridorKnowledgePack {
  const pd = row.pack_data as PackDataBlob;
  const sourceRefs = (Array.isArray(row.sources) ? row.sources : []) as unknown as PackSourceRef[];

  return {
    id: row.canonical_code + '-v' + row.version,
    origin: row.origin,
    destination: row.destination,
    version: row.version,
    status: row.publication_status === 'published' ? 'current' :
            row.publication_status === 'deprecated' ? 'stale' : 'review_required',
    confidenceScore: row.confidence_score ?? 0,
    lastReviewed: row.last_reviewed_at?.substring(0, 10) ?? '',
    reviewOwner: row.review_owner ?? '',
    automationBoundaryNote: row.automation_boundary_note ?? '',
    sourceRefs,
    ss: pd.ss,
    cdi: pd.cdi,
    tax: pd.tax,
    immigration: pd.immigration,
    payroll: pd.payroll,
    requiredDocuments: pd.requiredDocuments ?? [],
    reviewTriggers: (pd.reviewTriggers ?? []) as unknown as CorridorKnowledgePack['reviewTriggers'],
  };
}

/**
 * Resolve the active published pack for a corridor.
 * Priority: DB published+active pack → TS constants fallback.
 */
export function useCorridorPackRepository(companyId?: string) {
  const resolveCorridorPack = useCallback(
    async (origin: string, destination: string): Promise<CorridorKnowledgePack | null> => {
      try {
        // Query: published+active packs for this corridor
        // Prefer tenant-specific, then global
        const { data, error } = await supabase
          .from('erp_hr_corridor_packs')
          .select('*')
          .eq('origin', origin.toUpperCase())
          .eq('destination', destination.toUpperCase())
          .eq('publication_status', 'published')
          .eq('is_active', true)
          .order('company_id', { ascending: false, nullsFirst: false })
          .limit(2);

        if (error) {
          console.warn('[useCorridorPackRepository] DB error, falling back to TS constants:', error.message);
          return getCorridorPack(origin, destination);
        }

        if (data && data.length > 0) {
          // Prefer tenant pack if available
          const tenantPack = companyId
            ? data.find((r) => r.company_id === companyId)
            : null;
          const row = (tenantPack ?? data[0]) as unknown as CorridorPackRow;
          return dbRowToCorridorPack(row);
        }

        // Fallback to TS constants
        return getCorridorPack(origin, destination);
      } catch {
        return getCorridorPack(origin, destination);
      }
    },
    [companyId],
  );

  return { resolveCorridorPack, dbRowToCorridorPack };
}

/**
 * React Query hook to pre-fetch a specific corridor pack.
 */
export function useResolvedCorridorPack(
  origin: string | undefined,
  destination: string | undefined,
  companyId?: string,
) {
  const { resolveCorridorPack } = useCorridorPackRepository(companyId);

  return useQuery({
    queryKey: ['corridor-pack-resolved', companyId, origin, destination],
    queryFn: () => resolveCorridorPack(origin!, destination!),
    enabled: !!origin && !!destination,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
