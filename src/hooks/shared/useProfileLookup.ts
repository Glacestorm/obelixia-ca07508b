/**
 * useProfileLookup — S9.21p
 *
 * Helper compartido para resolver `user_id` (UUID) a etiqueta visible
 * (`full_name` → `email` → fallback estable). Diseñado para ser robusto
 * frente a perfiles inexistentes y para no romper la UI bajo ningún caso.
 *
 * Estrategia: una sola query batch a `profiles` por todos los IDs solicitados,
 * con cache local en el hook (no react-query para minimizar dependencias).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileMin {
  id: string;
  full_name: string | null;
  email: string | null;
}

const profileCache = new Map<string, ProfileMin | null>();

function shortIdFallback(id: string): string {
  const s = (id || '').replace(/-/g, '');
  return `Usuario ${s.slice(0, 8)}…`;
}

/**
 * Resuelve un userId puntual a etiqueta visible. Devuelve siempre un string
 * estable y nunca rompe la UI:
 *   - id null/undefined → "Sistema"
 *   - perfil cargado    → full_name || email || fallback
 *   - perfil ausente    → fallback "Usuario XXXXXXXX…"
 */
export function useProfileLabel(userId: string | null | undefined): {
  label: string;
  loading: boolean;
} {
  const { labels, loading } = useProfileLookup(userId ? [userId] : []);
  if (!userId) return { label: 'Sistema', loading: false };
  return { label: labels[userId] ?? shortIdFallback(userId), loading };
}

/**
 * Resuelve un conjunto de userIds a etiquetas. Ideal para tablas/listas.
 * Garantiza que cualquier id solicitado tendrá entrada (con fallback si
 * el perfil no existe).
 */
export function useProfileLookup(userIds: Array<string | null | undefined>): {
  labels: Record<string, string>;
  loading: boolean;
  resolve: (id: string | null | undefined) => string;
} {
  const cleanIds = useMemo(
    () => Array.from(new Set(userIds.filter((x): x is string => !!x))),
    [userIds],
  );

  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const id of cleanIds) {
      const cached = profileCache.get(id);
      if (cached !== undefined) {
        initial[id] = cached
          ? (cached.full_name || cached.email || shortIdFallback(id))
          : shortIdFallback(id);
      }
    }
    return initial;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const missing = cleanIds.filter((id) => !profileCache.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', missing);

        if (cancelled) return;

        const found = new Set<string>();
        if (!error && data) {
          for (const row of data as ProfileMin[]) {
            profileCache.set(row.id, row);
            found.add(row.id);
          }
        }
        // IDs no encontrados → cache como null (evita refetch indefinido)
        for (const id of missing) {
          if (!found.has(id)) profileCache.set(id, null);
        }

        setLabels((prev) => {
          const next = { ...prev };
          for (const id of cleanIds) {
            const cached = profileCache.get(id);
            next[id] = cached
              ? (cached.full_name || cached.email || shortIdFallback(id))
              : shortIdFallback(id);
          }
          return next;
        });
      } catch (err) {
        // Robustez: nunca romper UI por fallo de fetch
        console.warn('[useProfileLookup] fetch error (non-fatal):', err);
        if (!cancelled) {
          setLabels((prev) => {
            const next = { ...prev };
            for (const id of missing) next[id] = shortIdFallback(id);
            return next;
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [cleanIds]);

  const resolve = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return 'Sistema';
      return labels[id] ?? shortIdFallback(id);
    },
    [labels],
  );

  return { labels, loading, resolve };
}

export default useProfileLookup;
