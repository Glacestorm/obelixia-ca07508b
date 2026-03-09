/**
 * useEnergyMibgas - Hook for real MIBGAS gas market data via Firecrawl scraping
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MibgasProduct {
  product: string;
  delivery: string;
  price_eur_mwh: number;
  category: 'index' | 'spot' | 'forward';
  market: string;
}

export interface MibgasData {
  day_ahead_es: number | null;
  month_ahead_es: number | null;
  day_ahead_pt: number | null;
  day_ahead_change: number | null;
  day_ahead_change_pct: number | null;
  products: MibgasProduct[];
  last_updated: string;
  source: 'mibgas_firecrawl';
  data_quality: 'real' | 'partial';
}

export function useEnergyMibgas() {
  const [data, setData] = useState<MibgasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMibgasData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'energy-mibgas-scraper'
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setData(fnData.data as MibgasData);
        return fnData.data as MibgasData;
      }

      const errMsg = fnData?.error || 'No data returned';
      setError(errMsg);
      toast.error(`MIBGAS: ${errMsg}`);
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useEnergyMibgas] error:', err);
      toast.error('Error al obtener datos de MIBGAS');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductsByCategory = useCallback((category: MibgasProduct['category']) => {
    return data?.products.filter(p => p.category === category) || [];
  }, [data]);

  return {
    data,
    loading,
    error,
    fetchMibgasData,
    getProductsByCategory,
  };
}
