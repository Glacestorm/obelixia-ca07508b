/**
 * useEnergySolarInstallations - Full CRUD + analytics for solar/self-consumption
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
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

export interface SolarAnalytics {
  totalPowerKwp: number;
  totalEstSavingsMonth: number;
  totalRealSavingsMonth: number;
  totalSelfConsumptionKwh: number;
  totalSurplusKwh: number;
  totalCompensationEur: number;
  avgGridDependency: number;
  totalMaintenanceCost: number;
  installationsWithBattery: number;
  totalBatteryCapacity: number;
  savingsEfficiency: number; // real/estimated ratio
  selfConsumptionRatio: number; // self/(self+surplus)
  annualEstSavings: number;
  annualRealSavings: number;
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

  // === ANALYTICS ===
  const analytics: SolarAnalytics = useMemo(() => {
    const totalPowerKwp = installations.reduce((s, i) => s + (i.installed_power_kwp || 0), 0);
    const totalEstSavingsMonth = installations.reduce((s, i) => s + (i.monthly_estimated_savings || 0), 0);
    const totalRealSavingsMonth = installations.reduce((s, i) => s + (i.monthly_real_savings || 0), 0);
    const totalSelfConsumptionKwh = installations.reduce((s, i) => s + (i.annual_self_consumption_kwh || 0), 0);
    const totalSurplusKwh = installations.reduce((s, i) => s + (i.annual_surplus_kwh || 0), 0);
    const totalCompensationEur = installations.reduce((s, i) => s + (i.annual_compensation_eur || 0), 0);
    const avgGridDependency = installations.length > 0
      ? installations.reduce((s, i) => s + (i.grid_dependency_pct || 0), 0) / installations.length
      : 100;
    const totalMaintenanceCost = installations.reduce((s, i) => s + (i.maintenance_cost_annual || 0), 0);
    const installationsWithBattery = installations.filter(i => i.has_battery).length;
    const totalBatteryCapacity = installations.reduce((s, i) => s + (i.battery_capacity_kwh || 0), 0);
    const savingsEfficiency = totalEstSavingsMonth > 0 ? (totalRealSavingsMonth / totalEstSavingsMonth) * 100 : 0;
    const totalEnergy = totalSelfConsumptionKwh + totalSurplusKwh;
    const selfConsumptionRatio = totalEnergy > 0 ? (totalSelfConsumptionKwh / totalEnergy) * 100 : 0;

    return {
      totalPowerKwp,
      totalEstSavingsMonth,
      totalRealSavingsMonth,
      totalSelfConsumptionKwh,
      totalSurplusKwh,
      totalCompensationEur,
      avgGridDependency,
      totalMaintenanceCost,
      installationsWithBattery,
      totalBatteryCapacity,
      savingsEfficiency,
      selfConsumptionRatio,
      annualEstSavings: totalEstSavingsMonth * 12,
      annualRealSavings: totalRealSavingsMonth * 12,
    };
  }, [installations]);

  useEffect(() => { fetchInstallations(); }, [fetchInstallations]);

  return {
    installations,
    loading,
    analytics,
    fetchInstallations,
    createInstallation,
    updateInstallation,
    deleteInstallation,
  };
}
