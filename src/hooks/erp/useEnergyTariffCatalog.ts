import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyTariff {
  id: string;
  supplier: string;
  tariff_name: string;
  access_tariff: string | null;
  price_p1_energy: number | null;
  price_p2_energy: number | null;
  price_p3_energy: number | null;
  price_p1_power: number | null;
  price_p2_power: number | null;
  has_permanence: boolean | null;
  notes: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface TariffFilters {
  search: string;
  supplier: string;
  isActive: string; // 'all' | 'true' | 'false'
}

const DEFAULT_FILTERS: TariffFilters = {
  search: '',
  supplier: 'all',
  isActive: 'all',
};

export function useEnergyTariffCatalog() {
  const [tariffs, setTariffs] = useState<EnergyTariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TariffFilters>(DEFAULT_FILTERS);

  const fetchTariffs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('energy_tariff_catalog')
        .select('*')
        .order('supplier', { ascending: true });

      if (filters.supplier !== 'all') query = query.eq('supplier', filters.supplier);
      if (filters.isActive === 'true') query = query.eq('is_active', true);
      if (filters.isActive === 'false') query = query.eq('is_active', false);
      if (filters.search) {
        query = query.or(
          `supplier.ilike.%${filters.search}%,tariff_name.ilike.%${filters.search}%,access_tariff.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setTariffs((data as EnergyTariff[]) || []);
    } catch (err) {
      console.error('[useEnergyTariffCatalog] fetch error:', err);
      toast.error('Error al cargar tarifas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createTariff = useCallback(async (tariff: Partial<EnergyTariff>) => {
    try {
      const { data, error } = await supabase
        .from('energy_tariff_catalog')
        .insert([tariff] as any)
        .select()
        .single();
      if (error) throw error;
      setTariffs(prev => [data as EnergyTariff, ...prev]);
      toast.success('Tarifa creada');
      return data as EnergyTariff;
    } catch (err) {
      console.error('[useEnergyTariffCatalog] create error:', err);
      toast.error('Error al crear tarifa');
      return null;
    }
  }, []);

  const updateTariff = useCallback(async (id: string, updates: Partial<EnergyTariff>) => {
    try {
      const { data, error } = await supabase
        .from('energy_tariff_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as EnergyTariff;
      setTariffs(prev => prev.map(t => t.id === id ? updated : t));
      toast.success('Tarifa actualizada');
      return updated;
    } catch (err) {
      console.error('[useEnergyTariffCatalog] update error:', err);
      toast.error('Error al actualizar tarifa');
      return null;
    }
  }, []);

  const deleteTariff = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_tariff_catalog').delete().eq('id', id);
      if (error) throw error;
      setTariffs(prev => prev.filter(t => t.id !== id));
      toast.success('Tarifa eliminada');
    } catch {
      toast.error('Error al eliminar tarifa');
    }
  }, []);

  useEffect(() => { fetchTariffs(); }, [fetchTariffs]);

  const uniqueSuppliers = [...new Set(tariffs.map(t => t.supplier).filter(Boolean))].sort();

  return {
    tariffs, loading, filters, setFilters,
    fetchTariffs, createTariff, updateTariff, deleteTariff,
    uniqueSuppliers,
  };
}
