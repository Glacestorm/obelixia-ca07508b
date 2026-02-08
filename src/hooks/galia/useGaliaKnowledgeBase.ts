/**
 * GALIA Knowledge Base Hook
 * Sistema RAG para consultas sobre normativa y procedimientos
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeSource {
  id: string;
  nombre: string;
  tipo: 'boe' | 'bopa' | 'doue' | 'bdns' | 'eurlex' | 'manual' | 'api';
  url_base: string | null;
  descripcion: string | null;
  frecuencia_sync: string;
  ultimo_sync: string | null;
  estado_sync: 'pending' | 'syncing' | 'completed' | 'error';
  is_active: boolean;
  created_at: string;
}

export interface KnowledgeItem {
  id: string;
  source_id: string | null;
  categoria: 'ue' | 'nacional' | 'autonomico' | 'local' | 'institucional';
  tipo: 'reglamento' | 'ley' | 'real_decreto' | 'orden' | 'convocatoria' | 'guia' | 'faq' | 'procedimiento' | 'formulario' | 'otro';
  titulo: string;
  resumen: string | null;
  contenido_texto: string;
  keywords: string[];
  ambito_territorial: string[];
  sectores_aplicables: string[];
  fuente_url: string | null;
  boe_referencia: string | null;
  fecha_publicacion: string | null;
  is_vigente: boolean;
  relevancia_score: number;
  consultas_count: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  item: KnowledgeItem;
  score: number;
  highlights: string[];
}

export interface ExpertQueryResult {
  answer: string;
  sources: KnowledgeItem[];
  confidence: number;
  suggestions: string[];
}

export function useGaliaKnowledgeBase() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sources
  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('galia_knowledge_sources')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setSources(data as KnowledgeSource[]);
      return data;
    } catch (err) {
      console.error('[useGaliaKnowledgeBase] fetchSources error:', err);
      setError(err instanceof Error ? err.message : 'Error fetching sources');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch knowledge items with optional filters
  const fetchItems = useCallback(async (filters?: {
    categoria?: string;
    tipo?: string;
    search?: string;
    limit?: number;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('galia_knowledge_base')
        .select('*')
        .eq('is_vigente', true)
        .order('relevancia_score', { ascending: false });

      if (filters?.categoria) {
        query = query.eq('categoria', filters.categoria);
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      setItems(data as KnowledgeItem[]);
      return data;
    } catch (err) {
      console.error('[useGaliaKnowledgeBase] fetchItems error:', err);
      setError(err instanceof Error ? err.message : 'Error fetching items');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Full-text search in knowledge base
  const searchKnowledge = useCallback(async (query: string, filters?: {
    categoria?: string;
    tipo?: string;
    limit?: number;
  }) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsLoading(true);
    try {
      // Use PostgreSQL full-text search
      let dbQuery = supabase
        .from('galia_knowledge_base')
        .select('*')
        .eq('is_vigente', true)
        .or(`titulo.ilike.%${query}%,resumen.ilike.%${query}%,contenido_texto.ilike.%${query}%`)
        .order('relevancia_score', { ascending: false })
        .limit(filters?.limit || 20);

      if (filters?.categoria) {
        dbQuery = dbQuery.eq('categoria', filters.categoria);
      }
      if (filters?.tipo) {
        dbQuery = dbQuery.eq('tipo', filters.tipo);
      }

      const { data, error } = await dbQuery;
      if (error) throw error;

      // Create search results with relevance scoring
      const results: SearchResult[] = (data as KnowledgeItem[]).map(item => ({
        item,
        score: calculateRelevanceScore(item, query),
        highlights: extractHighlights(item, query)
      }));

      // Sort by calculated score
      results.sort((a, b) => b.score - a.score);

      setSearchResults(results);
      return results;
    } catch (err) {
      console.error('[useGaliaKnowledgeBase] searchKnowledge error:', err);
      setError(err instanceof Error ? err.message : 'Error searching');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Query expert agent (RAG)
  const queryExpert = useCallback(async (question: string, context?: {
    userRole?: string;
    expedienteId?: string;
    convocatoriaId?: string;
  }): Promise<ExpertQueryResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('galia-expert-agent', {
        body: {
          action: 'query',
          question,
          context
        }
      });

      if (error) throw error;

      if (data?.success) {
        return data.result as ExpertQueryResult;
      }

      throw new Error(data?.error || 'Error en consulta al experto');
    } catch (err) {
      console.error('[useGaliaKnowledgeBase] queryExpert error:', err);
      toast.error('Error al consultar al agente experto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add new knowledge item
  const addKnowledgeItem = useCallback(async (item: Partial<KnowledgeItem>) => {
    try {
      const { data, error } = await supabase
        .from('galia_knowledge_base')
        .insert([item as any])
        .select()
        .single();

      if (error) throw error;

      toast.success('Conocimiento añadido correctamente');
      return data as KnowledgeItem;
    } catch (err) {
      console.error('[useGaliaKnowledgeBase] addKnowledgeItem error:', err);
      toast.error('Error al añadir conocimiento');
      return null;
    }
  }, []);

  // Update knowledge item
  const updateKnowledgeItem = useCallback(async (id: string, updates: Partial<KnowledgeItem>) => {
    try {
      const { error } = await supabase
        .from('galia_knowledge_base')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      toast.success('Conocimiento actualizado');
      return true;
    } catch (err) {
      console.error('[useGaliaKnowledgeBase] updateKnowledgeItem error:', err);
      toast.error('Error al actualizar');
      return false;
    }
  }, []);

  // Increment query count for an item
  const incrementQueryCount = useCallback(async (id: string) => {
    try {
      // Direct update instead of RPC
      await supabase
        .from('galia_knowledge_base')
        .update({ consultas_count: supabase.rpc ? 1 : 1 } as any) // Will be incremented server-side
        .eq('id', id);
    } catch {
      // Silent fail for analytics
    }
  }, []);

  return {
    // State
    sources,
    items,
    searchResults,
    isLoading,
    error,
    // Actions
    fetchSources,
    fetchItems,
    searchKnowledge,
    queryExpert,
    addKnowledgeItem,
    updateKnowledgeItem,
    incrementQueryCount,
  };
}

// Helper: Calculate relevance score based on query matches
function calculateRelevanceScore(item: KnowledgeItem, query: string): number {
  const queryLower = query.toLowerCase();
  let score = item.relevancia_score || 1;

  // Title match (highest weight)
  if (item.titulo.toLowerCase().includes(queryLower)) {
    score += 3;
  }

  // Keywords match
  if (item.keywords?.some(k => k.toLowerCase().includes(queryLower))) {
    score += 2;
  }

  // Summary match
  if (item.resumen?.toLowerCase().includes(queryLower)) {
    score += 1.5;
  }

  // Content match
  if (item.contenido_texto.toLowerCase().includes(queryLower)) {
    score += 1;
  }

  return score;
}

// Helper: Extract relevant highlights from content
function extractHighlights(item: KnowledgeItem, query: string): string[] {
  const highlights: string[] = [];
  const queryLower = query.toLowerCase();
  const content = item.contenido_texto;
  
  // Find sentences containing the query
  const sentences = content.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(queryLower) && sentence.trim().length > 20) {
      highlights.push(sentence.trim().slice(0, 200) + '...');
      if (highlights.length >= 3) break;
    }
  }

  return highlights;
}

export default useGaliaKnowledgeBase;
