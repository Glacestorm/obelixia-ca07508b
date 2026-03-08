import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyConsumptionProfile {
  id: string;
  case_id: string;
  household_size: number | null;
  has_heat_pump: boolean;
  has_acs_aerothermal: boolean;
  has_ac_inverter: boolean;
  has_ev: boolean;
  has_induction: boolean;
  has_freezer: boolean;
  work_from_home: boolean;
  shiftable_load_pct: number | null;
  showers_start_time: string | null;
  showers_end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEnergyConsumptionProfile(caseId: string | null) {
  const [profile, setProfile] = useState<EnergyConsumptionProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!caseId) { setProfile(null); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_consumption_profiles')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      if (error) throw error;
      setProfile(data as EnergyConsumptionProfile | null);
    } catch (err) {
      console.error('[useEnergyConsumptionProfile] error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const saveProfile = useCallback(async (values: Partial<EnergyConsumptionProfile>) => {
    if (!caseId) return null;
    try {
      if (profile?.id) {
        const { data, error } = await supabase
          .from('energy_consumption_profiles').update(values).eq('id', profile.id).select().single();
        if (error) throw error;
        setProfile(data as EnergyConsumptionProfile);
        toast.success('Perfil de consumo actualizado');
        return data;
      } else {
        const { data, error } = await supabase
          .from('energy_consumption_profiles').insert([{ ...values, case_id: caseId }] as any).select().single();
        if (error) throw error;
        setProfile(data as EnergyConsumptionProfile);
        toast.success('Perfil de consumo guardado');
        return data;
      }
    } catch (err) {
      console.error('[useEnergyConsumptionProfile] save error:', err);
      toast.error('Error al guardar perfil de consumo');
      return null;
    }
  }, [caseId, profile]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { profile, loading, fetchProfile, saveProfile };
}
