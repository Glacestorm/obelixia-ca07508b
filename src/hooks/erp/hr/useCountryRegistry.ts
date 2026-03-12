/**
 * useCountryRegistry - Hook for Global HR Country Registry, Policies & Extensions
 * Fase G1: Core infrastructure for multi-country HR
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ==================== TYPES ====================

export interface CountryRegistryEntry {
  id: string;
  company_id: string;
  country_code: string;
  country_name: string;
  is_enabled: boolean;
  currency_code: string;
  language_code: string;
  timezone: string;
  date_format: string;
  nif_format: string | null;
  nif_label: string;
  fiscal_year_start: number;
  social_security_system: string | null;
  labor_law_framework: string | null;
  min_wage_annual: number | null;
  max_working_hours_week: number;
  min_vacation_days: number;
  probation_max_days: number | null;
  notice_period_default_days: number | null;
  severance_formula: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CountryPolicy {
  id: string;
  company_id: string;
  country_code: string;
  policy_type: string;
  policy_key: string;
  policy_value: Record<string, unknown>;
  scope_level: 'country' | 'entity' | 'center' | 'employee';
  scope_entity_id: string | null;
  scope_center_id: string | null;
  priority: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  description: string | null;
  legal_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeExtension {
  id: string;
  company_id: string;
  employee_id: string;
  country_code: string;
  extension_data: Record<string, unknown>;
  tax_jurisdiction: string | null;
  social_security_number: string | null;
  local_id_number: string | null;
  local_id_type: string | null;
  tax_residence_country: string | null;
  immigration_status: string | null;
  work_permit_expiry: string | null;
  created_at: string;
  updated_at: string;
}

export interface CountryRegistryStats {
  total_countries: number;
  enabled_countries: number;
  total_policies: number;
  policy_types: string[];
  total_extensions: number;
}

export interface ComplianceAnalysis {
  overall_score: number;
  countries_analysis: Array<{
    country_code: string;
    completeness: number;
    missing_policies: string[];
    risks: string[];
  }>;
  recommendations: Array<{
    priority: string;
    area: string;
    action: string;
    legal_reference: string;
  }>;
  gaps: Array<{
    country: string;
    gap_type: string;
    description: string;
    severity: string;
  }>;
}

// ==================== HOOK ====================

export function useCountryRegistry(companyId?: string) {
  const [countries, setCountries] = useState<CountryRegistryEntry[]>([]);
  const [policies, setPolicies] = useState<CountryPolicy[]>([]);
  const [stats, setStats] = useState<CountryRegistryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error: fnError } = await supabase.functions.invoke('hr-country-registry', {
      body: { action, companyId, ...extra }
    });
    if (fnError) throw fnError;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data;
  }, [companyId]);

  // ---- Countries ----
  const fetchCountries = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await invoke('list_countries');
      setCountries(data.countries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      console.error('[useCountryRegistry] fetchCountries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, invoke]);

  const upsertCountry = useCallback(async (countryData: Partial<CountryRegistryEntry>) => {
    try {
      const data = await invoke('upsert_country', { data: countryData });
      toast.success(`País ${countryData.country_name || countryData.country_code} guardado`);
      await fetchCountries();
      return data.country;
    } catch (err) {
      toast.error('Error al guardar país');
      return null;
    }
  }, [invoke, fetchCountries]);

  const toggleCountry = useCallback(async (id: string, isEnabled: boolean) => {
    try {
      await invoke('toggle_country', { data: { id, is_enabled: isEnabled } });
      toast.success(isEnabled ? 'País habilitado' : 'País deshabilitado');
      await fetchCountries();
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  }, [invoke, fetchCountries]);

  // ---- Policies ----
  const fetchPolicies = useCallback(async (countryCode?: string, policyType?: string) => {
    if (!companyId) return;
    try {
      const data = await invoke('list_policies', {
        countryCode,
        params: policyType ? { policy_type: policyType } : undefined
      });
      setPolicies(data.policies);
      return data.policies;
    } catch (err) {
      console.error('[useCountryRegistry] fetchPolicies:', err);
      return [];
    }
  }, [companyId, invoke]);

  const upsertPolicy = useCallback(async (policyData: Partial<CountryPolicy>) => {
    try {
      const data = await invoke('upsert_policy', { data: policyData });
      toast.success('Política guardada');
      return data.policy;
    } catch (err) {
      toast.error('Error al guardar política');
      return null;
    }
  }, [invoke]);

  const resolvePolicy = useCallback(async (employeeId: string, policyType: string, policyKey: string) => {
    try {
      const data = await invoke('resolve_policy', {
        params: { employee_id: employeeId, policy_type: policyType, policy_key: policyKey }
      });
      return data.resolved_policy;
    } catch (err) {
      console.error('[useCountryRegistry] resolvePolicy:', err);
      return null;
    }
  }, [invoke]);

  // ---- Employee Extensions ----
  const getEmployeeExtension = useCallback(async (employeeId: string, countryCode = 'ES') => {
    try {
      const data = await invoke('get_employee_extension', {
        countryCode,
        params: { employee_id: employeeId }
      });
      return data.extension;
    } catch (err) {
      console.error('[useCountryRegistry] getEmployeeExtension:', err);
      return null;
    }
  }, [invoke]);

  const upsertEmployeeExtension = useCallback(async (extData: Partial<EmployeeExtension>) => {
    try {
      const data = await invoke('upsert_employee_extension', { data: extData });
      toast.success('Datos de país del empleado guardados');
      return data.extension;
    } catch (err) {
      toast.error('Error al guardar extensión');
      return null;
    }
  }, [invoke]);

  // ---- Stats & Analysis ----
  const fetchStats = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await invoke('get_stats');
      setStats(data.stats);
      return data.stats;
    } catch (err) {
      console.error('[useCountryRegistry] fetchStats:', err);
      return null;
    }
  }, [companyId, invoke]);

  const analyzeCompliance = useCallback(async (): Promise<ComplianceAnalysis | null> => {
    try {
      const data = await invoke('analyze_compliance');
      return data.analysis;
    } catch (err) {
      toast.error('Error en análisis de compliance');
      return null;
    }
  }, [invoke]);

  const seedDefaults = useCallback(async () => {
    try {
      await invoke('seed_defaults');
      toast.success('Datos de España cargados por defecto');
      await fetchCountries();
      await fetchStats();
    } catch (err) {
      toast.error('Error al cargar datos por defecto');
    }
  }, [invoke, fetchCountries, fetchStats]);

  // ---- Realtime ----
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('hr-country-registry-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_country_registry' }, () => {
        fetchCountries();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchCountries]);

  // ---- Initial load ----
  useEffect(() => {
    if (companyId) {
      fetchCountries();
      fetchStats();
    }
  }, [companyId, fetchCountries, fetchStats]);

  return {
    countries,
    policies,
    stats,
    isLoading,
    error,
    fetchCountries,
    upsertCountry,
    toggleCountry,
    fetchPolicies,
    upsertPolicy,
    resolvePolicy,
    getEmployeeExtension,
    upsertEmployeeExtension,
    fetchStats,
    analyzeCompliance,
    seedDefaults,
  };
}
