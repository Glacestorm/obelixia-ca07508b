/**
 * useDocumentVersionCounts — Batch query for version counts across multiple documents
 * Returns a Map<documentId, versionCount> for efficient lookup in lists.
 * Single fetch, cached via React Query.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VersionCountRow {
  document_id: string;
  count: number;
}

export function useDocumentVersionCounts(documentIds: string[]) {
  // Sort for stable query key
  const sortedIds = useMemo(() => [...documentIds].sort(), [documentIds]);
  const enabled = sortedIds.length > 0;

  const { data: countsMap = new Map<string, number>(), isLoading } = useQuery({
    queryKey: ['erp-hr-doc-version-counts', sortedIds],
    queryFn: async (): Promise<Map<string, number>> => {
      if (sortedIds.length === 0) return new Map();

      // Batch query — group by document_id
      const { data, error } = await (supabase as any)
        .from('erp_hr_document_file_versions')
        .select('document_id')
        .in('document_id', sortedIds);

      if (error) {
        console.warn('[useDocumentVersionCounts] query failed:', error.message);
        return new Map();
      }

      // Count manually since .group() is not available in PostgREST
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as { document_id: string }[]) {
        counts.set(row.document_id, (counts.get(row.document_id) || 0) + 1);
      }
      return counts;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return { countsMap, isLoading };
}
