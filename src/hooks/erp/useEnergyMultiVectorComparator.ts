import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComparatorInput {
  case_id: string;
  energy_type: 'electricity' | 'gas' | 'solar' | 'mixed';
  consumption: { p1_kwh: number; p2_kwh: number; p3_kwh: number };
  power: { p1_kw: number; p2_kw: number };
  max_demand?: { p1_kw: number; p2_kw: number };
  current_cost: number;
  billing_days: number;
  access_tariff: string;
  current_supplier?: string;
  current_tariff?: string;
  has_permanence?: boolean;
  solar_kw_peak?: number;
  solar_self_consumption_pct?: number;
  battery_kwh?: number;
  gas_consumption_kwh?: number;
  gas_current_cost?: number;
}

export interface TariffResult {
  tariff_id: string;
  supplier: string;
  tariff_name: string;
  energy_cost: number;
  power_cost: number;
  total_cost: number;
  savings: number;
  savings_pct: number;
  has_permanence: boolean;
  tariff_type: string;
}

export interface ComparatorResult {
  success: boolean;
  case_id: string;
  energy_type: string;
  recommended_power: { p1_kw: number; p2_kw: number; notes: string[] };
  tariff_results: TariffResult[];
  best_tariff: TariffResult | null;
  best_without_permanence: TariffResult | null;
  solar_scenario?: {
    annual_production_kwh: number;
    self_consumption_kwh: number;
    surplus_kwh: number;
    savings_estimate: number;
    payback_years: number;
    notes: string[];
  };
  gas_scenario?: {
    gas_results: Array<{ supplier: string; tariff: string; cost: number; savings: number }>;
    best_gas: { supplier: string; cost: number; savings: number } | null;
  };
  total_annual_savings: number;
  confidence_score: number;
  data_quality: {
    has_real_market_data: boolean;
    has_real_tariff_catalog: boolean;
    has_real_consumption: boolean;
    limitations: string[];
  };
}

export function useEnergyMultiVectorComparator() {
  const [result, setResult] = useState<ComparatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = useCallback(async (input: ComparatorInput) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'energy-multi-vector-comparator',
        { body: input }
      );
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Error en comparador');

      setResult(data as ComparatorResult);
      toast.success(`Comparación completada: ${data.tariff_results?.length || 0} tarifas analizadas`);
      return data as ComparatorResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en comparador';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, runComparison };
}
