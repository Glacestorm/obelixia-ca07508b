/**
 * useRegulatoryIntelligence - Hook for regulatory sources & documents
 * Reads from erp_regulatory_sources + erp_regulatory_documents
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
  // Joined
  source_name?: string;
  source_code?: string;
}

export function useRegulatoryIntelligence() {
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [documents, setDocuments] = useState<RegulatoryDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSources = useCallback(async () => {
    const { data } = await supabase
      .from('erp_regulatory_sources')
      .select('*')
      .order('name');
    setSources((data as unknown as RegulatorySource[]) || []);
  }, []);

  const fetchDocuments = useCallback(async (filters?: { jurisdiction?: string; impact_level?: string; domain?: string }) => {
    let query = supabase
      .from('erp_regulatory_documents')
      .select('*')
      .order('publication_date', { ascending: false })
      .limit(50);

    if (filters?.jurisdiction) query = query.eq('jurisdiction_code', filters.jurisdiction);
    if (filters?.impact_level) query = query.eq('impact_level', filters.impact_level);
    if (filters?.domain) query = query.contains('impact_domains', [filters.domain]);

    const { data } = await query;
    const docs = (data as unknown as RegulatoryDocument[]) || [];

    // Enrich with source info
    const enriched = docs.map(d => {
      const src = sources.find(s => s.id === d.source_id);
      return { ...d, source_name: src?.name, source_code: src?.code };
    });

    setDocuments(enriched);
    return enriched;
  }, [sources]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSources();
    await fetchDocuments();
    setLoading(false);
  }, [fetchSources, fetchDocuments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stats
  const stats = {
    totalSources: sources.length,
    enabledSources: sources.filter(s => s.is_enabled).length,
    totalDocuments: documents.length,
    highImpact: documents.filter(d => d.impact_level === 'high' || d.impact_level === 'critical').length,
    pendingReview: documents.filter(d => d.requires_human_review).length,
    byDomain: {
      hr: documents.filter(d => d.impact_domains?.includes('hr')).length,
      legal: documents.filter(d => d.impact_domains?.includes('legal')).length,
      compliance: documents.filter(d => d.impact_domains?.includes('compliance')).length,
      fiscal: documents.filter(d => d.impact_domains?.includes('fiscal')).length,
    },
  };

  return { sources, documents, loading, stats, refresh, fetchDocuments };
}
