/**
 * useLegalKnowledge - Hook para gestión de base de conocimiento jurídico
 * Fase 3: Sistema RAG para conocimiento legal multi-jurisdiccional
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LegalKnowledgeItem {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  knowledge_type: 'law' | 'regulation' | 'precedent' | 'doctrine' | 'template' | 'circular' | 'convention' | 'treaty';
  jurisdiction_code: string;
  legal_area: string;
  sub_area: string | null;
  reference_code: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  source_url: string | null;
  source_name: string | null;
  tags: string[];
  keywords: string[];
  is_active: boolean;
  is_verified: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSearchResult {
  items: LegalKnowledgeItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KnowledgeStats {
  total_items: number;
  by_type: Record<string, number>;
  by_jurisdiction: Record<string, number>;
  by_area: Record<string, number>;
  verified_count: number;
  active_count: number;
}

export function useLegalKnowledge() {
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<LegalKnowledgeItem[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === FETCH KNOWLEDGE BASE ===
  const fetchKnowledge = useCallback(async (filters?: {
    jurisdiction?: string;
    type?: string;
    area?: string;
    search?: string;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('legal_knowledge_base')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (filters?.jurisdiction) {
        query = query.eq('jurisdiction_code', filters.jurisdiction);
      }
      if (filters?.type) {
        query = query.eq('knowledge_type', filters.type);
      }
      if (filters?.area) {
        query = query.eq('legal_area', filters.area);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error: dbError } = await query.limit(filters?.limit || 50);

      if (dbError) throw dbError;
      
      // Map to interface
      const mappedData: LegalKnowledgeItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        knowledge_type: item.knowledge_type as LegalKnowledgeItem['knowledge_type'],
        jurisdiction_code: item.jurisdiction_code,
        legal_area: item.legal_area,
        sub_area: item.sub_area,
        reference_code: item.reference_code,
        effective_date: item.effective_date,
        expiry_date: item.expiry_date,
        source_url: item.source_url,
        source_name: item.source_name,
        tags: item.tags || [],
        keywords: item.keywords || [],
        is_active: item.is_active ?? true,
        is_verified: item.is_verified ?? false,
        view_count: item.view_count ?? 0,
        helpful_count: item.helpful_count ?? 0,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      setKnowledge(mappedData);
      return mappedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalKnowledge] fetchKnowledge error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH STATS ===
  const fetchStats = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('legal_knowledge_base')
        .select('knowledge_type, jurisdiction_code, legal_area, is_verified, is_active');

      if (dbError) throw dbError;

      const byType: Record<string, number> = {};
      const byJurisdiction: Record<string, number> = {};
      const byArea: Record<string, number> = {};
      let verifiedCount = 0;
      let activeCount = 0;

      (data || []).forEach(item => {
        byType[item.knowledge_type] = (byType[item.knowledge_type] || 0) + 1;
        byJurisdiction[item.jurisdiction_code] = (byJurisdiction[item.jurisdiction_code] || 0) + 1;
        byArea[item.legal_area] = (byArea[item.legal_area] || 0) + 1;
        if (item.is_verified) verifiedCount++;
        if (item.is_active) activeCount++;
      });

      setStats({
        total_items: data?.length || 0,
        by_type: byType,
        by_jurisdiction: byJurisdiction,
        by_area: byArea,
        verified_count: verifiedCount,
        active_count: activeCount
      });
    } catch (err) {
      console.error('[useLegalKnowledge] fetchStats error:', err);
    }
  }, []);

  // === ADD KNOWLEDGE ITEM ===
  const addKnowledgeItem = useCallback(async (item: {
    title: string;
    content: string;
    knowledge_type: string;
    jurisdiction_code: string;
    legal_area: string;
    summary?: string;
    sub_area?: string;
    reference_code?: string;
    effective_date?: string;
    source_url?: string;
    source_name?: string;
    tags?: string[];
    keywords?: string[];
  }) => {
    setIsLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('legal_knowledge_base')
        .insert([{
          title: item.title,
          content: item.content,
          knowledge_type: item.knowledge_type,
          jurisdiction_code: item.jurisdiction_code,
          legal_area: item.legal_area,
          summary: item.summary,
          sub_area: item.sub_area,
          reference_code: item.reference_code,
          effective_date: item.effective_date,
          source_url: item.source_url,
          source_name: item.source_name,
          tags: item.tags || [],
          keywords: item.keywords || [],
          is_active: true,
          is_verified: false,
          view_count: 0,
          helpful_count: 0
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Conocimiento añadido correctamente');
      await fetchKnowledge();
      return data;
    } catch (err) {
      console.error('[useLegalKnowledge] addKnowledgeItem error:', err);
      toast.error('Error al añadir conocimiento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKnowledge]);

  // === UPDATE KNOWLEDGE ITEM ===
  const updateKnowledgeItem = useCallback(async (
    id: string,
    updates: Partial<LegalKnowledgeItem>
  ) => {
    try {
      const { error: dbError } = await supabase
        .from('legal_knowledge_base')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Actualizado correctamente');
      await fetchKnowledge();
      return true;
    } catch (err) {
      console.error('[useLegalKnowledge] updateKnowledgeItem error:', err);
      toast.error('Error al actualizar');
      return false;
    }
  }, [fetchKnowledge]);

  // === VERIFY KNOWLEDGE ITEM ===
  const verifyKnowledgeItem = useCallback(async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: dbError } = await supabase
        .from('legal_knowledge_base')
        .update({
          is_verified: true,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Conocimiento verificado');
      await fetchKnowledge();
      return true;
    } catch (err) {
      console.error('[useLegalKnowledge] verifyKnowledgeItem error:', err);
      toast.error('Error al verificar');
      return false;
    }
  }, [fetchKnowledge]);

  // === DELETE KNOWLEDGE ITEM ===
  const deleteKnowledgeItem = useCallback(async (id: string) => {
    try {
      const { error: dbError } = await supabase
        .from('legal_knowledge_base')
        .update({ is_active: false })
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('Eliminado correctamente');
      await fetchKnowledge();
      return true;
    } catch (err) {
      console.error('[useLegalKnowledge] deleteKnowledgeItem error:', err);
      toast.error('Error al eliminar');
      return false;
    }
  }, [fetchKnowledge]);

  // === INCREMENT VIEW COUNT ===
  const incrementViewCount = useCallback(async (id: string) => {
    try {
      // Get current value and increment
      const { data: current } = await supabase
        .from('legal_knowledge_base')
        .select('view_count')
        .eq('id', id)
        .single();
      
      if (current) {
        await supabase
          .from('legal_knowledge_base')
          .update({ view_count: (current.view_count || 0) + 1 })
          .eq('id', id);
      }
    } catch (err) {
      console.error('[useLegalKnowledge] incrementViewCount error:', err);
    }
  }, []);

  // === MARK AS HELPFUL ===
  const markAsHelpful = useCallback(async (id: string) => {
    try {
      // Get current value and increment
      const { data: current } = await supabase
        .from('legal_knowledge_base')
        .select('helpful_count')
        .eq('id', id)
        .single();
      
      if (current) {
        await supabase
          .from('legal_knowledge_base')
          .update({ helpful_count: (current.helpful_count || 0) + 1 })
          .eq('id', id);
      }
      
      toast.success('Gracias por tu feedback');
    } catch (err) {
      console.error('[useLegalKnowledge] markAsHelpful error:', err);
    }
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchKnowledge();
    fetchStats();
  }, [fetchKnowledge, fetchStats]);

  return {
    isLoading,
    knowledge,
    stats,
    error,
    fetchKnowledge,
    fetchStats,
    addKnowledgeItem,
    updateKnowledgeItem,
    verifyKnowledgeItem,
    deleteKnowledgeItem,
    incrementViewCount,
    markAsHelpful,
  };
}

export default useLegalKnowledge;
