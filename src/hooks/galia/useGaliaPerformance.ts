/**
 * useGaliaPerformance - Hook para optimización de rendimiento
 * Caché inteligente, lazy loading y métricas
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

interface CacheConfig {
  ttl: number; // Time to live en ms
  maxEntries: number;
  staleWhileRevalidate: boolean;
}

interface PerformanceMetrics {
  cacheHitRate: number;
  averageLoadTime: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  pendingRequests: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutos
  maxEntries: 100,
  staleWhileRevalidate: true
};

export function useGaliaPerformance<T = unknown>(config?: Partial<CacheConfig>) {
  const cacheConfig = useMemo(() => ({ ...DEFAULT_CACHE_CONFIG, ...config }), [config]);
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const pendingRef = useRef<Map<string, Promise<T>>>(new Map());
  const metricsRef = useRef<PerformanceMetrics>({
    cacheHitRate: 0,
    averageLoadTime: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    pendingRequests: 0
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>(metricsRef.current);

  // === ACTUALIZAR MÉTRICAS (declarado primero para evitar referencia circular) ===
  const updateMetrics = useCallback((loadTime: number, _wasHit: boolean) => {
    const m = metricsRef.current;
    
    // Calcular promedio móvil de tiempo de carga
    m.averageLoadTime = m.totalRequests === 1 
      ? loadTime 
      : (m.averageLoadTime * (m.totalRequests - 1) + loadTime) / m.totalRequests;

    // Calcular hit rate
    m.cacheHitRate = m.totalRequests > 0 
      ? (m.cacheHits / m.totalRequests) * 100 
      : 0;

    setMetrics({ ...m });
  }, []);

  // === GENERAR CLAVE DE CACHÉ ===
  const generateCacheKey = useCallback((
    table: string,
    query?: Record<string, unknown>
  ): string => {
    return `${table}:${JSON.stringify(query || {})}`;
  }, []);

  // === VERIFICAR SI ENTRADA ES VÁLIDA ===
  const isValid = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() < entry.expiresAt;
  }, []);

  // === LIMPIAR CACHÉ EXPIRADO ===
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    let cleaned = 0;

    cacheRef.current.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        cacheRef.current.delete(key);
        cleaned++;
      }
    });

    // Si aún excede límite, eliminar entradas menos usadas
    if (cacheRef.current.size > cacheConfig.maxEntries) {
      const entries = Array.from(cacheRef.current.entries())
        .sort((a, b) => a[1].hits - b[1].hits);
      
      const toRemove = entries.slice(0, entries.length - cacheConfig.maxEntries);
      toRemove.forEach(([key]) => cacheRef.current.delete(key));
    }

    return cleaned;
  }, [cacheConfig.maxEntries]);

  // === OBTENER DE CACHÉ ===
  const getFromCache = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    
    if (!entry) return null;

    if (isValid(entry)) {
      entry.hits++;
      metricsRef.current.cacheHits++;
      return entry.data;
    }

    // Stale-while-revalidate: devolver datos antiguos mientras se actualiza
    if (cacheConfig.staleWhileRevalidate) {
      return entry.data;
    }

    cacheRef.current.delete(key);
    return null;
  }, [isValid, cacheConfig.staleWhileRevalidate]);

  // === GUARDAR EN CACHÉ ===
  const setInCache = useCallback((key: string, data: T) => {
    cleanExpiredCache();

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheConfig.ttl,
      hits: 1
    });
  }, [cleanExpiredCache, cacheConfig.ttl]);

  // === FETCH CON CACHÉ ===
  const cachedFetch = useCallback(async (
    fetchFn: () => Promise<{ data: unknown; error: unknown }>,
    cacheKey: string
  ): Promise<unknown> => {
    const startTime = performance.now();

    metricsRef.current.totalRequests++;

    // Verificar caché
    const cached = getFromCache(cacheKey);
    if (cached && !cacheConfig.staleWhileRevalidate) {
      const loadTime = performance.now() - startTime;
      updateMetrics(loadTime, true);
      return cached;
    }

    // Verificar si hay una solicitud pendiente
    const pending = pendingRef.current.get(cacheKey);
    if (pending) {
      metricsRef.current.pendingRequests++;
      return pending;
    }

    // Realizar fetch
    metricsRef.current.cacheMisses++;
    
    const fetchPromise = (async () => {
      try {
        const { data, error } = await fetchFn();
        
        if (error) throw error;
        
        if (data) {
          setInCache(cacheKey, data as T);
        }

        const loadTime = performance.now() - startTime;
        updateMetrics(loadTime, false);

        return data;
      } finally {
        pendingRef.current.delete(cacheKey);
      }
    })();

    pendingRef.current.set(cacheKey, fetchPromise as Promise<T>);

    // Si hay datos stale, devolverlos mientras se actualiza
    if (cached && cacheConfig.staleWhileRevalidate) {
      fetchPromise.catch(() => {}); // Revalidate en background
      return cached;
    }

    return fetchPromise;
  }, [getFromCache, setInCache, cacheConfig.staleWhileRevalidate, updateMetrics]);

  // (updateMetrics movido arriba para evitar uso antes de declaración)

  // === INVALIDAR CACHÉ ===
  const invalidateCache = useCallback((pattern?: string | RegExp) => {
    if (!pattern) {
      cacheRef.current.clear();
      return;
    }

    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;

    cacheRef.current.forEach((_, key) => {
      if (regex.test(key)) {
        cacheRef.current.delete(key);
      }
    });
  }, []);

  // === PREFETCH ===
  const prefetch = useCallback(async (
    fetchFn: () => Promise<{ data: unknown; error: unknown }>,
    cacheKey: string,
    priority: 'high' | 'low' = 'low'
  ) => {
    // No prefetch si ya está en caché
    if (cacheRef.current.has(cacheKey)) return;

    if (priority === 'high') {
      // Ejecutar inmediatamente
      await cachedFetch(fetchFn, cacheKey);
    } else {
      // Ejecutar cuando el navegador esté idle
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          cachedFetch(fetchFn, cacheKey);
        });
      } else {
        setTimeout(() => {
          cachedFetch(fetchFn, cacheKey);
        }, 100);
      }
    }
  }, [cachedFetch]);

  // === BATCH FETCH ===
  const batchFetch = useCallback(async (
    requests: Array<{
      fetchFn: () => Promise<{ data: unknown; error: unknown }>;
      cacheKey: string;
    }>
  ): Promise<unknown[]> => {
    return Promise.all(
      requests.map(req => cachedFetch(req.fetchFn, req.cacheKey))
    );
  }, [cachedFetch]);

  // === OBTENER TAMAÑO DE CACHÉ ===
  const getCacheSize = useCallback(() => {
    return cacheRef.current.size;
  }, []);

  // === OBTENER ESTADÍSTICAS DE CACHÉ ===
  const getCacheStats = useCallback(() => {
    let totalHits = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    cacheRef.current.forEach(entry => {
      totalHits += entry.hits;
      if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
      if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
    });

    return {
      size: cacheRef.current.size,
      totalHits,
      oldestEntry: cacheRef.current.size > 0 ? new Date(oldestEntry) : null,
      newestEntry: cacheRef.current.size > 0 ? new Date(newestEntry) : null,
      memoryEstimate: JSON.stringify([...cacheRef.current.values()]).length
    };
  }, []);

  // === LIMPIEZA PERIÓDICA ===
  useEffect(() => {
    const interval = setInterval(() => {
      cleanExpiredCache();
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [cleanExpiredCache]);

  return {
    // Funciones principales
    cachedFetch,
    invalidateCache,
    prefetch,
    batchFetch,
    // Utilidades
    getFromCache,
    setInCache,
    getCacheSize,
    getCacheStats,
    generateCacheKey,
    // Métricas
    metrics,
    // Config
    cacheConfig
  };
}

// === HOOK PARA LAZY LOADING DE COMPONENTES ===
export function useGaliaLazyLoad() {
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const registerComponent = useCallback((
    componentId: string,
    element: HTMLElement | null,
    onVisible: () => void
  ) => {
    if (!element || loadedComponents.has(componentId)) return;

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute('data-lazy-id');
              if (id && !loadedComponents.has(id)) {
                setLoadedComponents(prev => new Set([...prev, id]));
                onVisible();
              }
            }
          });
        },
        { rootMargin: '100px', threshold: 0.1 }
      );
    }

    element.setAttribute('data-lazy-id', componentId);
    observerRef.current.observe(element);

    return () => {
      observerRef.current?.unobserve(element);
    };
  }, [loadedComponents]);

  const isLoaded = useCallback((componentId: string) => {
    return loadedComponents.has(componentId);
  }, [loadedComponents]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return {
    registerComponent,
    isLoaded,
    loadedCount: loadedComponents.size
  };
}

export default useGaliaPerformance;
