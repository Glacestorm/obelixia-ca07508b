import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergySupply {
  id: string;
  case_id: string;
  cups: string | null;
  tariff_access: string | null;
  distributor: string | null;
  contracted_power_p1: number | null;
  contracted_power_p2: number | null;
  max_demand_p1: number | null;
  max_demand_p2: number | null;
  voltage_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEnergySupply(caseId: string | null) {
  const [supply, setSupply] = useState<EnergySupply | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSupply = useCallback(async () => {
    if (!caseId) { setSupply(null); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_supplies')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      if (error) throw error;
      setSupply(data as EnergySupply | null);
    } catch (err) {
      console.error('[useEnergySupply] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const saveSupply = useCallback(async (values: Partial<EnergySupply>) => {
    if (!caseId) return null;
    try {
      if (supply?.id) {
        const { data, error } = await supabase
          .from('energy_supplies')
          .update(values)
          .eq('id', supply.id)
          .select()
          .single();
        if (error) throw error;
        setSupply(data as EnergySupply);
        toast.success('Suministro actualizado');
        return data;
      } else {
        const { data, error } = await supabase
          .from('energy_supplies')
          .insert([{ ...values, case_id: caseId }] as any)
          .select()
          .single();
        if (error) throw error;
        setSupply(data as EnergySupply);
        toast.success('Suministro guardado');
        return data;
      }
    } catch (err) {
      console.error('[useEnergySupply] save error:', err);
      toast.error('Error al guardar suministro');
      return null;
    }
  }, [caseId, supply]);

  useEffect(() => { fetchSupply(); }, [fetchSupply]);

  return { supply, loading, fetchSupply, saveSupply };
}
