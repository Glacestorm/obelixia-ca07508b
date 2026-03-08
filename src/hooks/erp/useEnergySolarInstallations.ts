/**
 * useEnergySolarInstallations - CRUD for solar/self-consumption installations
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SolarInstallation {
  id: string;
  case_id: string;
  company_id: string;
  supply_id: string | null;
  installed_power_kwp: number;
  installation_date: string | null;
  modality: string;
  has_battery: boolean;
  battery_capacity_kwh: number | null;
  inverter_brand: string | null;
  inverter_power_kw: number | null;
  installer_company: string | null;
  financing_type: string;
  monthly_estimated_savings: number;
  monthly_real_savings: number;
  annual_self_consumption_kwh: number;
  annual_surplus_kwh: number;
  annual_compensation_eur: number;
  grid_dependency_pct: number;
  maintenance_contract: boolean;
  maintenance_cost_annual: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEnergySolarInstallations(caseId: string | null, companyId?: string) {
  const [installations, setInstallations] = useState<SolarInstallation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInstallations = useCallback(async () => {
    if (!caseId) { setInstallations([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_solar_installations')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInstallations((data || []) as SolarInstallation[]);
    } catch (err) {
      console.error('[useEnergySolarInstallations] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const createInstallation = useCallback(async (values: Partial<SolarInstallation>) => {
    if (!caseId || !companyId) return null;
    try {
      const { data, error } = await supabase
        .from('energy_solar_installations')
        .insert([{ ...values, case_id: caseId, company_id: companyId }] as any)
        .select()
        .single();
      if (error) throw error;
      const inst = data as SolarInstallation;
      setInstallations(prev => [inst, ...prev]);
      toast.success('Instalación solar registrada');
      return inst;
    } catch (err) {
      toast.error('Error al crear instalación');
      return null;
    }
  }, [caseId, companyId]);

  const updateInstallation = useCallback(async (id: string, values: Partial<SolarInstallation>) => {
    try {
      const { data, error } = await supabase
        .from('energy_solar_installations')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as SolarInstallation;
      setInstallations(prev => prev.map(i => i.id === id ? updated : i));
      toast.success('Instalación actualizada');
      return updated;
    } catch (err) {
      toast.error('Error al actualizar');
      return null;
    }
  }, []);

  const deleteInstallation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('energy_solar_installations').delete().eq('id', id);
      if (error) throw error;
      setInstallations(prev => prev.filter(i => i.id !== id));
      toast.success('Instalación eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  }, []);

  useEffect(() => { fetchInstallations(); }, [fetchInstallations]);

  return { installations, loading, fetchInstallations, createInstallation, updateInstallation, deleteInstallation };
}
