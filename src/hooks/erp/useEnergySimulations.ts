import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EnergyTariff } from './useEnergyTariffCatalog';

export interface SimulationConsumptionData {
  consumption_p1_kwh: number;
  consumption_p2_kwh: number;
  consumption_p3_kwh: number;
}

export interface SimulationPowerData {
  power_p1_kw: number;
  power_p2_kw: number;
}

export interface SimulationResult {
  tariff_id: string;
  supplier: string;
  tariff_name: string;
  energy_cost: number;
  power_cost: number;
  total_cost: number;
  has_permanence: boolean;
  savings_vs_current: number;
  notes: string | null;
}

export interface EnergySimulation {
  id: string;
  company_id: string;
  case_id: string | null;
  name: string;
  status: string;
  simulation_type: string;
  consumption_data: SimulationConsumptionData;
  power_data: SimulationPowerData;
  billing_days: number;
  access_tariff: string;
  results: SimulationResult[];
  best_tariff_id: string | null;
  current_cost: number;
  best_cost: number;
  savings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONSUMPTION: SimulationConsumptionData = {
  consumption_p1_kwh: 0,
  consumption_p2_kwh: 0,
  consumption_p3_kwh: 0,
};

const DEFAULT_POWER: SimulationPowerData = {
  power_p1_kw: 0,
  power_p2_kw: 0,
};

export function useEnergySimulations(companyId: string) {
  const [simulations, setSimulations] = useState<EnergySimulation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSimulations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_simulations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSimulations((data || []).map(d => ({
        ...d,
        consumption_data: (d.consumption_data as any) || DEFAULT_CONSUMPTION,
        power_data: (d.power_data as any) || DEFAULT_POWER,
        results: (d.results as any) || [],
      })) as EnergySimulation[]);
    } catch (err) {
      console.error('[useEnergySimulations] fetch error:', err);
      toast.error('Error al cargar simulaciones');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createSimulation = useCallback(async (name: string, caseId?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('energy_simulations')
        .insert([{
          company_id: companyId,
          case_id: caseId || null,
          name,
          status: 'draft',
          consumption_data: DEFAULT_CONSUMPTION,
          power_data: DEFAULT_POWER,
          created_by: userData?.user?.id || null,
        }] as any)
        .select()
        .single();
      if (error) throw error;
      const sim = {
        ...data,
        consumption_data: DEFAULT_CONSUMPTION,
        power_data: DEFAULT_POWER,
        results: [],
      } as EnergySimulation;
      setSimulations(prev => [sim, ...prev]);
      toast.success('Simulación creada');
      return sim;
    } catch (err) {
      console.error('[useEnergySimulations] create error:', err);
      toast.error('Error al crear simulación');
      return null;
    }
  }, [companyId]);

  const updateSimulation = useCallback(async (id: string, updates: Partial<EnergySimulation>) => {
    try {
      const { error } = await supabase
        .from('energy_simulations')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
      setSimulations(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      return true;
    } catch (err) {
      console.error('[useEnergySimulations] update error:', err);
      toast.error('Error al actualizar simulación');
      return false;
    }
  }, []);

  const deleteSimulation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_simulations').delete().eq('id', id);
      if (error) throw error;
      setSimulations(prev => prev.filter(s => s.id !== id));
      toast.success('Simulación eliminada');
    } catch {
      toast.error('Error al eliminar simulación');
    }
  }, []);

  /** Run simulation: calculate cost for each active tariff in catalog */
  const runSimulation = useCallback(async (
    simulationId: string,
    consumption: SimulationConsumptionData,
    power: SimulationPowerData,
    billingDays: number,
    accessTariff: string,
    currentCost?: number,
  ) => {
    try {
      // Fetch active tariffs
      let query = supabase
        .from('energy_tariff_catalog')
        .select('*')
        .eq('is_active', true);
      
      if (accessTariff !== 'all') {
        query = query.eq('access_tariff', accessTariff);
      }

      const { data: tariffs, error } = await query;
      if (error) throw error;
      if (!tariffs || tariffs.length === 0) {
        toast.error('No hay tarifas activas en el catálogo');
        return null;
      }

      const daysRatio = billingDays / 365;
      const monthRatio = billingDays / 30;

      const results: SimulationResult[] = (tariffs as EnergyTariff[]).map(t => {
        const energyCost =
          (consumption.consumption_p1_kwh * (t.price_p1_energy || 0)) +
          (consumption.consumption_p2_kwh * (t.price_p2_energy || 0)) +
          (consumption.consumption_p3_kwh * (t.price_p3_energy || 0));

        // Power cost = kW * €/kW/year * (days/365)
        const powerCost =
          (power.power_p1_kw * (t.price_p1_power || 0) * daysRatio) +
          (power.power_p2_kw * (t.price_p2_power || 0) * daysRatio);

        const totalCost = Math.round((energyCost + powerCost) * 100) / 100;

        return {
          tariff_id: t.id,
          supplier: t.supplier,
          tariff_name: t.tariff_name,
          energy_cost: Math.round(energyCost * 100) / 100,
          power_cost: Math.round(powerCost * 100) / 100,
          total_cost: totalCost,
          has_permanence: t.has_permanence || false,
          savings_vs_current: 0,
          notes: t.notes,
        };
      });

      // Sort by total cost
      results.sort((a, b) => a.total_cost - b.total_cost);

      const bestResult = results[0];
      const refCost = currentCost || 0;

      // Calculate savings vs current/reference
      results.forEach(r => {
        r.savings_vs_current = Math.round((refCost - r.total_cost) * 100) / 100;
      });

      await updateSimulation(simulationId, {
        consumption_data: consumption,
        power_data: power,
        billing_days: billingDays,
        access_tariff: accessTariff,
        results: results,
        best_tariff_id: bestResult?.tariff_id || null,
        current_cost: refCost,
        best_cost: bestResult?.total_cost || 0,
        savings: refCost > 0 ? Math.round((refCost - (bestResult?.total_cost || 0)) * 100) / 100 : 0,
        status: 'completed',
      } as any);

      toast.success(`Simulación completada: ${results.length} tarifas comparadas`);
      return results;
    } catch (err) {
      console.error('[useEnergySimulations] run error:', err);
      toast.error('Error al ejecutar simulación');
      return null;
    }
  }, [updateSimulation]);

  useEffect(() => { fetchSimulations(); }, [fetchSimulations]);

  return {
    simulations, loading,
    fetchSimulations, createSimulation, updateSimulation, deleteSimulation,
    runSimulation,
  };
}
