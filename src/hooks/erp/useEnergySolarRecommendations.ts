/**
 * useEnergySolarRecommendations - AI-powered solar recommendations
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SolarInstallation, SolarAnalytics } from './useEnergySolarInstallations';

export interface SolarRecommendation {
  type: 'optimization' | 'warning' | 'opportunity' | 'info';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: number | null;
}

export interface SolarRecommendationResult {
  recommendations: SolarRecommendation[];
  overallScore: number;
  summary: string;
}

export function useEnergySolarRecommendations() {
  const [result, setResult] = useState<SolarRecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (
    installations: SolarInstallation[],
    analytics: SolarAnalytics
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'energy-solar-recommendations',
        { body: { installations, analytics } }
      );
      if (fnError) throw fnError;
      if (data?.success) {
        setResult({
          recommendations: data.recommendations || [],
          overallScore: data.overallScore || 0,
          summary: data.summary || '',
        });
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener recomendaciones';
      setError(msg);
      console.error('[useEnergySolarRecommendations]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, fetchRecommendations };
}
