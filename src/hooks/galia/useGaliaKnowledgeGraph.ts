/**
 * useGaliaKnowledgeGraph - Hook para el grafo de conocimiento LEADER
 * Sistema de inteligencia semántica y navegación de normativa
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface KnowledgeNode {
  id: string;
  type: 'normativa' | 'procedimiento' | 'concepto' | 'entidad' | 'requisito';
  title: string;
  label?: string;
  excerpt?: string;
  fullDescription?: string;
  source?: {
    document: string;
    article?: string;
    url?: string;
  };
  relevanceScore?: number;
  relatedNodes?: string[];
  tags?: string[];
  group?: string;
  size?: number;
  color?: string;
  metadata?: {
    source?: string;
    date?: string;
    status?: 'vigente' | 'derogada' | 'pendiente';
  };
  keyArticles?: Array<{
    number: string;
    title: string;
    summary: string;
    obligations?: string[];
  }>;
  practicalImplications?: {
    forBeneficiaries?: string[];
    forTechnicians?: string[];
    forGAL?: string[];
  };
  deadlines?: Array<{
    description: string;
    date?: string;
    recurring?: boolean;
  }>;
  penalties?: string[];
  lastModified?: string;
  sourceUrl?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: 'modifica' | 'desarrolla' | 'deroga' | 'complementa' | 'requiere' | 'referencia' | 'implementa' | 'excepciona';
  weight?: number;
  dashed?: boolean;
  description?: string;
  strength?: number;
  bidirectional?: boolean;
  effectiveDate?: string;
}

export interface KnowledgeCluster {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
}

export interface GraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters?: KnowledgeCluster[];
  statistics?: {
    totalNodes: number;
    totalEdges: number;
    avgConnections: number;
    mostConnected?: string;
  };
}

export interface SearchResult {
  results: KnowledgeNode[];
  totalResults: number;
  suggestedQueries?: string[];
  knowledgeContext?: string;
}

export interface ExtractedEntity {
  id: string;
  type: 'normativa' | 'concepto' | 'entidad' | 'requisito' | 'plazo' | 'importe';
  text: string;
  normalizedText: string;
  context: string;
  confidence: number;
  position?: { start: number; end: number };
}

export interface DocumentAnalysis {
  documentAnalysis: {
    type: string;
    mainTopic: string;
    summary: string;
  };
  extractedEntities: ExtractedEntity[];
  suggestedLinks?: Array<{
    entityId: string;
    linkedKnowledgeNode: string;
    relationshipType: string;
  }>;
  riskIndicators?: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  completenessScore?: number;
}

export type KnowledgeCategory = 'normativa' | 'procedimiento' | 'concepto' | 'entidad' | 'requisito';

// === HOOK ===
export function useGaliaKnowledgeGraph() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);

  // Cache para evitar llamadas repetidas
  const cache = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  const getCached = useCallback(<T>(key: string): T | null => {
    const cached = cache.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
    cache.current.delete(key);
    return null;
  }, []);

  const setCache = useCallback((key: string, data: unknown) => {
    cache.current.set(key, { data, timestamp: Date.now() });
  }, []);

  // === BÚSQUEDA SEMÁNTICA ===
  const search = useCallback(async (
    query: string,
    category?: KnowledgeCategory
  ): Promise<SearchResult | null> => {
    const cacheKey = `search:${query}:${category || 'all'}`;
    const cached = getCached<SearchResult>(cacheKey);
    if (cached) {
      setSearchResults(cached);
      return cached;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-knowledge-graph',
        {
          body: {
            action: 'search',
            query,
            category
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const results: SearchResult = {
          results: data.data.results || [],
          totalResults: data.data.totalResults || 0,
          suggestedQueries: data.data.suggestedQueries,
          knowledgeContext: data.data.knowledgeContext
        };
        setSearchResults(results);
        setCache(cacheKey, results);
        return results;
      }

      throw new Error('Error en búsqueda semántica');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en búsqueda', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCached, setCache]);

  // === OBTENER RELACIONES ===
  const getRelations = useCallback(async (
    nodeId: string,
    depth: number = 2
  ): Promise<KnowledgeEdge[] | null> => {
    const cacheKey = `relations:${nodeId}:${depth}`;
    const cached = getCached<KnowledgeEdge[]>(cacheKey);
    if (cached) return cached;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-knowledge-graph',
        {
          body: {
            action: 'get_relations',
            nodeId,
            depth
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const relations = data.data.relations || [];
        setCache(cacheKey, relations);
        return relations;
      }

      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaKnowledgeGraph] getRelations error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCached, setCache]);

  // === DETALLES DE NODO ===
  const getNodeDetails = useCallback(async (nodeId: string): Promise<KnowledgeNode | null> => {
    const cacheKey = `node:${nodeId}`;
    const cached = getCached<KnowledgeNode>(cacheKey);
    if (cached) {
      setSelectedNode(cached);
      return cached;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-knowledge-graph',
        {
          body: {
            action: 'get_node_details',
            nodeId
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data.data.node) {
        const node = data.data.node as KnowledgeNode;
        setSelectedNode(node);
        setCache(cacheKey, node);
        return node;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error obteniendo detalles', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCached, setCache]);

  // === ANALIZAR DOCUMENTO ===
  const analyzeDocument = useCallback(async (
    documentContent: string
  ): Promise<DocumentAnalysis | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-knowledge-graph',
        {
          body: {
            action: 'analyze_document',
            documentContent
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const analysis = data.data as DocumentAnalysis;
        setDocumentAnalysis(analysis);
        toast.success('Documento analizado', {
          description: `${analysis.extractedEntities?.length || 0} entidades extraídas`
        });
        return analysis;
      }

      throw new Error('Error analizando documento');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error en análisis', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER DATOS DEL GRAFO ===
  const getGraphData = useCallback(async (
    category?: KnowledgeCategory
  ): Promise<GraphData | null> => {
    const cacheKey = `graph:${category || 'all'}`;
    const cached = getCached<GraphData>(cacheKey);
    if (cached) {
      setGraphData(cached);
      return cached;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-knowledge-graph',
        {
          body: {
            action: 'get_graph_data',
            category
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        const graph: GraphData = {
          nodes: data.data.nodes || [],
          edges: data.data.edges || [],
          clusters: data.data.clusters,
          statistics: data.data.statistics
        };
        setGraphData(graph);
        setCache(cacheKey, graph);
        return graph;
      }

      throw new Error('Error obteniendo datos del grafo');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error cargando grafo', { description: message });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCached, setCache]);

  // === LIMPIAR SELECCIÓN ===
  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // === LIMPIAR CACHÉ ===
  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  return {
    // Estado
    isLoading,
    error,
    searchResults,
    graphData,
    selectedNode,
    documentAnalysis,
    // Acciones
    search,
    getRelations,
    getNodeDetails,
    analyzeDocument,
    getGraphData,
    clearSelection,
    clearCache,
    setSelectedNode
  };
}

export default useGaliaKnowledgeGraph;
