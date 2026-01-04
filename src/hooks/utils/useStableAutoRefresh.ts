/**
 * useStableAutoRefresh - Hook utilitario para auto-refresh ESTABLE
 * 
 * PROBLEMA RESUELTO:
 * Los hooks con startAutoRefresh que dependen de funciones como fetchData
 * causan bucles infinitos cuando se usan en useEffect de componentes, porque:
 * 
 * 1. fetchData llama setData → cambia estado
 * 2. Componente re-renderiza
 * 3. startAutoRefresh se recrea con nueva referencia
 * 4. useEffect detecta cambio → ejecuta de nuevo
 * 5. BUCLE INFINITO → "Maximum update depth exceeded"
 * 
 * SOLUCIÓN:
 * Usar refs para mantener referencias estables a las funciones que cambian,
 * sin incluirlas en las dependencias del useCallback.
 * 
 * USO EN HOOKS:
 * ```ts
 * const fetchDataRef = useRef(fetchData);
 * useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
 * 
 * const startAutoRefresh = useCallback((intervalMs = 60000) => {
 *   stopAutoRefresh();
 *   fetchDataRef.current(); // Usar ref, no la función directa
 *   intervalRef.current = setInterval(() => {
 *     fetchDataRef.current();
 *   }, intervalMs);
 * }, [stopAutoRefresh]); // Solo dependencias estables
 * ```
 * 
 * USO EN COMPONENTES:
 * ```tsx
 * const hasInitializedRef = useRef(false);
 * 
 * useEffect(() => {
 *   if (hasInitializedRef.current) return;
 *   hasInitializedRef.current = true;
 *   startAutoRefresh(90000);
 *   return () => stopAutoRefresh();
 *   // eslint-disable-next-line react-hooks/exhaustive-deps
 * }, []); // Intencionalmente vacío
 * ```
 */

import { useRef, useCallback, useEffect } from 'react';

interface UseStableAutoRefreshOptions {
  /** Función de fetch a ejecutar en cada refresh */
  fetchFn: () => Promise<void> | void;
  /** Intervalo en milisegundos (default: 60000) */
  intervalMs?: number;
  /** Ejecutar fetch inmediatamente al iniciar (default: true) */
  immediate?: boolean;
}

interface UseStableAutoRefreshReturn {
  /** Inicia el auto-refresh con las opciones configuradas */
  startAutoRefresh: (intervalMs?: number) => void;
  /** Detiene el auto-refresh */
  stopAutoRefresh: () => void;
  /** Indica si el auto-refresh está activo */
  isRefreshing: boolean;
}

/**
 * Hook para crear auto-refresh estable que no causa bucles infinitos
 */
export function useStableAutoRefresh({
  fetchFn,
  intervalMs = 60000,
  immediate = true,
}: UseStableAutoRefreshOptions): UseStableAutoRefreshReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchFnRef = useRef(fetchFn);
  const isRefreshingRef = useRef(false);

  // Mantener la referencia actualizada sin causar re-renders
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isRefreshingRef.current = false;
  }, []);

  const startAutoRefresh = useCallback((customInterval?: number) => {
    stopAutoRefresh();
    const interval = customInterval ?? intervalMs;
    
    if (immediate) {
      fetchFnRef.current();
    }
    
    intervalRef.current = setInterval(() => {
      fetchFnRef.current();
    }, interval);
    
    isRefreshingRef.current = true;
  }, [stopAutoRefresh, intervalMs, immediate]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    startAutoRefresh,
    stopAutoRefresh,
    isRefreshing: isRefreshingRef.current,
  };
}

/**
 * Hook simplificado para uso en componentes
 * Ejecuta auto-refresh solo una vez al montar
 */
export function useAutoRefreshOnMount(
  startAutoRefresh: (intervalMs?: number) => void,
  stopAutoRefresh: () => void,
  intervalMs: number = 60000
): void {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    startAutoRefresh(intervalMs);
    return () => stopAutoRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intencionalmente vacío - solo ejecutar al montar
}

export default useStableAutoRefresh;
