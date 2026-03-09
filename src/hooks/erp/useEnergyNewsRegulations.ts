import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyNewsItem {
  id: string;
  title: string;
  source_name: string;
  source_url: string | null;
  source_type: string;
  category: string;
  published_at: string | null;
  summary: string | null;
  tags: string[];
  is_verified: boolean;
  verified_source: boolean;
  ingestion_method: string;
  ai_summary: string | null;
  created_at: string;
}

export interface EnergyRegulation {
  id: string;
  title: string;
  source_name: string;
  source_url: string | null;
  category: string;
  regulation_code: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  summary: string | null;
  tags: string[];
  importance: string;
  is_active: boolean;
  verified: boolean;
  ingestion_method: string;
  ai_summary: string | null;
  created_at: string;
}

export function useEnergyNewsRegulations() {
  const [news, setNews] = useState<EnergyNewsItem[]>([]);
  const [regulations, setRegulations] = useState<EnergyRegulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-news-ingestion', {
        body: { action: 'list', filters: { limit: 30 } },
      });
      if (error) throw error;
      if (data?.success) {
        setNews((data.news || []) as EnergyNewsItem[]);
        setRegulations((data.regulations || []) as EnergyRegulation[]);
      }
    } catch (err) {
      console.error('[useEnergyNewsRegulations] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchNews = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-news-ingestion', {
        body: { action: 'search_news', query },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`${data.results?.length || 0} resultados encontrados`);
        await fetchAll(); // Refresh after persist
        return data.results || [];
      }
      return [];
    } catch (err) {
      console.error('[useEnergyNewsRegulations] search error:', err);
      toast.error('Error en búsqueda');
      return [];
    } finally {
      setSearching(false);
    }
  }, [fetchAll]);

  const addRegulation = useCallback(async (reg: {
    title: string;
    source_name: string;
    source_url?: string;
    category?: string;
    regulation_code?: string;
    effective_date?: string;
    summary?: string;
    tags?: string[];
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('energy-news-ingestion', {
        body: { action: 'ingest_regulation', regulation: reg },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Normativa registrada');
        await fetchAll();
        return data.regulation;
      }
      return null;
    } catch (err) {
      toast.error('Error al registrar normativa');
      return null;
    }
  }, [fetchAll]);

  const enrichRegulation = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('energy-news-ingestion', {
        body: { action: 'enrich', entry_id: id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Normativa enriquecida con IA');
        await fetchAll();
      }
    } catch (err) {
      toast.error('Error al enriquecer');
    }
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    news, regulations, loading, searching,
    fetchAll, searchNews, addRegulation, enrichRegulation,
  };
}
