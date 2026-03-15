/**
 * useRegulatoryIntelligence - Hook for regulatory sources, documents & refresh
 * Reads from erp_regulatory_sources + erp_regulatory_documents + erp_regulatory_refresh_log
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RegulatorySource {
  id: string;
  code: string;
  name: string;
  source_type: string;
  url: string | null;
  issuing_body: string | null;
  country: string | null;
  territorial_scope: string;
  jurisdiction_code: string;
  domain_tags: string[];
  is_enabled: boolean;
  refresh_frequency: string;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  refresh_status: string;
  documents_found: number;
  total_refreshes: number;
  ingestion_method: string;
  entries_count: number;
  created_at: string;
}

export interface RegulatoryDocument {
  id: string;
  source_id: string | null;
  document_title: string;
  document_type: string;
  reference_code: string | null;
  issuing_body: string | null;
  territorial_scope: string;
  jurisdiction_code: string;
  publication_date: string | null;
  effective_date: string | null;
  status: string;
  summary: string | null;
  impact_summary: string | null;
  impact_domains: string[];
  impact_level: string;
  legal_area: string | null;
  tags: string[];
  source_url: string | null;
  origin_verified: boolean;
  requires_human_review: boolean;
  data_source: string;
  content_hash: string | null;
  version: number;
  change_type: string;
  created_at: string;
  updated_at: string;
  // Joined
  source_name?: string;
  source_code?: string;
}

export interface RefreshLog {
  id: string;
  source_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  documents_found: number;
  documents_new: number;
  documents_updated: number;
  documents_unchanged: number;
  error_message: string | null;
  created_at: string;
}

export function useRegulatoryIntelligence() {
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [documents, setDocuments] = useState<RegulatoryDocument[]>([]);
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSources = useCallback(async () => {
    const { data } = await supabase
      .from('erp_regulatory_sources')
      .select('*')
      .order('name');
    setSources((data as unknown as RegulatorySource[]) || []);
  }, []);

  const fetchDocuments = useCallback(async (filters?: { jurisdiction?: string; impact_level?: string; domain?: string; change_type?: string; data_source?: string }) => {
    let query = supabase
      .from('erp_regulatory_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filters?.jurisdiction) query = query.eq('jurisdiction_code', filters.jurisdiction);
    if (filters?.impact_level) query = query.eq('impact_level', filters.impact_level);
    if (filters?.domain) query = query.contains('impact_domains', [filters.domain]);
    if (filters?.change_type) query = query.eq('change_type', filters.change_type);
    if (filters?.data_source) query = query.eq('data_source', filters.data_source);

    const { data } = await query;
    const docs = (data as unknown as RegulatoryDocument[]) || [];

    const enriched = docs.map(d => {
      const src = sources.find(s => s.id === d.source_id);
      return { ...d, source_name: src?.name, source_code: src?.code };
    });

    setDocuments(enriched);
    return enriched;
  }, [sources]);

  const fetchRefreshLogs = useCallback(async (sourceId?: string) => {
    let query = supabase
      .from('erp_regulatory_refresh_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (sourceId) query = query.eq('source_id', sourceId);

    const { data } = await query;
    setRefreshLogs((data as unknown as RefreshLog[]) || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSources();
    await fetchDocuments();
    await fetchRefreshLogs();
    setLoading(false);
  }, [fetchSources, fetchDocuments, fetchRefreshLogs]);

  // Trigger backend refresh of all sources
  const triggerRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regulatory-refresh', {
        body: { action: 'refresh_all' },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Refresco completado: ${data.refreshed} fuentes procesadas`);
        await refresh();
        return data;
      }
      throw new Error('Refresh failed');
    } catch (err) {
      console.error('[useRegulatoryIntelligence] triggerRefreshAll error:', err);
      toast.error('Error al refrescar fuentes normativas');
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Trigger refresh for a single source
  const triggerRefreshSource = useCallback(async (sourceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('regulatory-refresh', {
        body: { action: 'refresh_source', source_id: sourceId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Fuente refrescada');
        await refresh();
        return data;
      }
    } catch (err) {
      console.error('[useRegulatoryIntelligence] triggerRefreshSource error:', err);
      toast.error('Error al refrescar fuente');
    }
    return null;
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stats
  const stats = {
    totalSources: sources.length,
    enabledSources: sources.filter(s => s.is_enabled).length,
    totalDocuments: documents.length,
    liveDocuments: documents.filter(d => d.data_source === 'live').length,
    seedDocuments: documents.filter(d => d.data_source === 'seed').length,
    newDocuments: documents.filter(d => d.change_type === 'new').length,
    updatedDocuments: documents.filter(d => d.change_type === 'updated').length,
    highImpact: documents.filter(d => d.impact_level === 'high' || d.impact_level === 'critical').length,
    pendingReview: documents.filter(d => d.requires_human_review).length,
    sourcesRefreshing: sources.filter(s => s.refresh_status === 'running').length,
    sourcesWithErrors: sources.filter(s => s.refresh_status === 'error').length,
    byDomain: {
      hr: documents.filter(d => d.impact_domains?.includes('hr')).length,
      legal: documents.filter(d => d.impact_domains?.includes('legal')).length,
      compliance: documents.filter(d => d.impact_domains?.includes('compliance')).length,
      fiscal: documents.filter(d => d.impact_domains?.includes('fiscal')).length,
    },
  };

  return {
    sources,
    documents,
    refreshLogs,
    loading,
    refreshing,
    stats,
    refresh,
    fetchDocuments,
    fetchRefreshLogs,
    triggerRefreshAll,
    triggerRefreshSource,
  };
}
