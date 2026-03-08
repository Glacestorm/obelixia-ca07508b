import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IndexedPrice {
  id: string;
  price_date: string;
  hour: number;
  omie_price: number | null;
  peajes_price: number | null;
  pvpc_price: number | null;
  tariff_zone: string;
  source: string;
}

export function useEnergyIndexedPrices() {
  const [prices, setPrices] = useState<IndexedPrice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_indexed_prices')
        .select('*')
        .eq('price_date', date)
        .order('hour', { ascending: true });
      if (error) throw error;
      setPrices((data as IndexedPrice[]) || []);
    } catch (err) {
      console.error('[useEnergyIndexedPrices] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertPrices = useCallback(async (entries: Omit<IndexedPrice, 'id' | 'source'>[]) => {
    try {
      const { error } = await supabase
        .from('energy_indexed_prices')
        .upsert(
          entries.map(e => ({ ...e, source: 'manual' })) as any,
          { onConflict: 'price_date,hour,tariff_zone' }
        );
      if (error) throw error;
      toast.success('Precios actualizados');
      if (entries.length > 0) fetchPrices(entries[0].price_date);
    } catch (err) {
      console.error('[useEnergyIndexedPrices] upsert error:', err);
      toast.error('Error al guardar precios');
    }
  }, [fetchPrices]);

  /** Get color class for price value (c€/kWh) */
  const getPriceColor = (price: number | null): string => {
    if (price === null) return 'bg-muted';
    if (price <= 5) return 'bg-emerald-500/80 text-white';
    if (price <= 10) return 'bg-emerald-400/70 text-white';
    if (price <= 15) return 'bg-yellow-400/80 text-foreground';
    if (price <= 20) return 'bg-orange-400/80 text-white';
    return 'bg-red-500/80 text-white';
  };

  const getAveragePrice = (field: 'omie_price' | 'peajes_price' | 'pvpc_price'): number | null => {
    const valid = prices.filter(p => p[field] !== null);
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((sum, p) => sum + (p[field] || 0), 0) / valid.length) * 10) / 10;
  };

  return {
    prices, loading,
    fetchPrices, upsertPrices,
    getPriceColor, getAveragePrice,
  };
}
