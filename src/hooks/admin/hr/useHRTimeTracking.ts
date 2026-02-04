/**
 * useHRTimeTracking Hook
 * Gestión de Registro Horario, Políticas de Tiempo y Desconexión Digital
 * Cumplimiento: Art. 34.9 ET, RD-ley 8/2019
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type EntryType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
export type EntrySource = 'web' | 'mobile' | 'biometric' | 'manual' | 'geolocation';

export interface TimeEntry {
  id: string;
  company_id: string | null;
  employee_id: string | null;
  entry_date: string;
  entry_type: EntryType;
  entry_time: string;
  source: EntrySource;
  geolocation: Record<string, unknown> | null;
  ip_address: string | null;
  device_info: Record<string, unknown> | null;
  notes: string | null;
  is_manual_correction: boolean | null;
  corrected_by: string | null;
  worked_hours: number | null;
  overtime_hours: number | null;
  created_at: string | null;
}

export interface TimePolicy {
  id: string;
  company_id: string | null;
  policy_name: string;
  policy_code: string | null;
  daily_hours: number | null;
  weekly_hours: number | null;
  is_flexible: boolean | null;
  flex_start_time: string | null;
  flex_end_time: string | null;
  core_hours_start: string | null;
  core_hours_end: string | null;
  break_duration_minutes: number | null;
  break_is_paid: boolean | null;
  overtime_allowed: boolean | null;
  max_daily_overtime: number | null;
  max_annual_overtime: number | null;
  overtime_compensation: string | null;
  remote_work_allowed: boolean | null;
  remote_days_per_week: number | null;
  geolocation_required: boolean | null;
  geolocation_radius_meters: number | null;
  allowed_methods: Record<string, unknown> | null;
  applies_to_departments: string[] | null;
  applies_to_positions: string[] | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DisconnectionPolicy {
  id: string;
  company_id: string | null;
  policy_name: string;
  disconnection_start: string;
  disconnection_end: string;
  effective_date: string;
  applies_weekdays: boolean | null;
  applies_weekends: boolean | null;
  applies_holidays: boolean | null;
  exception_roles: string[] | null;
  exception_situations: Record<string, unknown> | null;
  email_delay_enabled: boolean | null;
  notification_blocking: boolean | null;
  urgent_contact_method: string | null;
  communicated_to_employees: boolean | null;
  communication_date: string | null;
  awareness_training_required: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TimeTrackingStats {
  todayEntries: number;
  weeklyHours: number;
  monthlyOvertime: number;
  pendingCorrections: number;
  complianceRate: number;
}

export function useHRTimeTracking(companyId?: string, employeeId?: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [policies, setPolicies] = useState<TimePolicy[]>([]);
  const [disconnectionPolicies, setDisconnectionPolicies] = useState<DisconnectionPolicy[]>([]);
  const [stats, setStats] = useState<TimeTrackingStats>({
    todayEntries: 0,
    weeklyHours: 0,
    monthlyOvertime: 0,
    pendingCorrections: 0,
    complianceRate: 100
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch time tracking data
  const fetchTimeData = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch recent entries
      let entriesQuery = supabase
        .from('erp_hr_time_entries')
        .select('*')
        .eq('company_id', companyId)
        .gte('entry_date', weekAgo)
        .order('entry_date', { ascending: false })
        .order('entry_time', { ascending: false });

      if (employeeId) {
        entriesQuery = entriesQuery.eq('employee_id', employeeId);
      }

      const { data: entriesData, error: entriesError } = await entriesQuery.limit(100);
      if (entriesError) throw entriesError;

      // Fetch policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('erp_hr_time_policies')
        .select('*')
        .eq('company_id', companyId)
        .order('is_active', { ascending: false });

      if (policiesError) throw policiesError;

      // Fetch disconnection policies
      const { data: disconnectionData, error: disconnectionError } = await supabase
        .from('erp_hr_disconnection_policies')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (disconnectionError) throw disconnectionError;

      const typedEntries = (entriesData || []) as unknown as TimeEntry[];
      const typedPolicies = (policiesData || []) as unknown as TimePolicy[];
      const typedDisconnection = (disconnectionData || []) as unknown as DisconnectionPolicy[];

      setEntries(typedEntries);
      setPolicies(typedPolicies);
      setDisconnectionPolicies(typedDisconnection);

      // Calculate stats
      const todayEntries = typedEntries.filter(e => e.entry_date === today);
      const weeklyHours = typedEntries
        .filter(e => e.worked_hours !== null)
        .reduce((sum, e) => sum + (e.worked_hours || 0), 0);
      const monthlyOvertime = typedEntries
        .filter(e => e.overtime_hours !== null && e.overtime_hours > 0)
        .reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
      const pendingCorrections = typedEntries
        .filter(e => e.is_manual_correction && !e.corrected_by).length;

      setStats({
        todayEntries: todayEntries.length,
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        monthlyOvertime: Math.round(monthlyOvertime * 10) / 10,
        pendingCorrections,
        complianceRate: typedEntries.length > 0 ? 95 : 100 // Simplified
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar registro horario';
      setError(message);
      console.error('[useHRTimeTracking] fetchTimeData error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, employeeId]);

  // Clock in/out
  const registerEntry = useCallback(async (
    entryType: EntryType,
    source: EntrySource = 'web',
    notes?: string,
    geolocation?: Record<string, unknown>
  ) => {
    if (!companyId || !employeeId) {
      toast.error('Datos de empleado no disponibles');
      return null;
    }

    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('erp_hr_time_entries')
        .insert([{
          company_id: companyId,
          employee_id: employeeId,
          entry_date: now.toISOString().split('T')[0],
          entry_type: entryType,
          entry_time: now.toTimeString().split(' ')[0],
          source,
          notes: notes || null,
          geolocation: geolocation || null,
          is_manual_correction: false
        }])
        .select()
        .single();

      if (error) throw error;

      const typeLabels: Record<EntryType, string> = {
        clock_in: 'Entrada registrada',
        clock_out: 'Salida registrada',
        break_start: 'Inicio de pausa',
        break_end: 'Fin de pausa'
      };

      toast.success(typeLabels[entryType]);
      await fetchTimeData();
      return data as unknown as TimeEntry;
    } catch (err) {
      console.error('[useHRTimeTracking] registerEntry error:', err);
      toast.error('Error al registrar fichaje');
      return null;
    }
  }, [companyId, employeeId, fetchTimeData]);

  // Create time policy - matching actual DB schema
  const createPolicy = useCallback(async (policyData: {
    policy_name: string;
    daily_hours?: number;
    weekly_hours?: number;
    break_duration_minutes?: number;
    is_flexible?: boolean;
    core_hours_start?: string;
    core_hours_end?: string;
  }) => {
    if (!companyId) {
      toast.error('Empresa no seleccionada');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_hr_time_policies')
        .insert([{
          company_id: companyId,
          policy_name: policyData.policy_name,
          daily_hours: policyData.daily_hours || 8,
          weekly_hours: policyData.weekly_hours || 40,
          break_duration_minutes: policyData.break_duration_minutes || 30,
          is_flexible: policyData.is_flexible || false,
          core_hours_start: policyData.core_hours_start || null,
          core_hours_end: policyData.core_hours_end || null,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Política de horario creada');
      await fetchTimeData();
      return data as unknown as TimePolicy;
    } catch (err) {
      console.error('[useHRTimeTracking] createPolicy error:', err);
      toast.error('Error al crear política');
      return null;
    }
  }, [companyId, fetchTimeData]);

  // Create disconnection policy - matching actual DB schema
  const createDisconnectionPolicy = useCallback(async (policyData: {
    policy_name: string;
    disconnection_start: string;
    disconnection_end: string;
    effective_date: string;
    applies_weekends?: boolean;
    applies_holidays?: boolean;
  }) => {
    if (!companyId) {
      toast.error('Empresa no seleccionada');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('erp_hr_disconnection_policies')
        .insert([{
          company_id: companyId,
          policy_name: policyData.policy_name,
          disconnection_start: policyData.disconnection_start,
          disconnection_end: policyData.disconnection_end,
          effective_date: policyData.effective_date,
          applies_weekends: policyData.applies_weekends ?? true,
          applies_holidays: policyData.applies_holidays ?? true,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Política de desconexión creada');
      await fetchTimeData();
      return data as unknown as DisconnectionPolicy;
    } catch (err) {
      console.error('[useHRTimeTracking] createDisconnectionPolicy error:', err);
      toast.error('Error al crear política de desconexión');
      return null;
    }
  }, [companyId, fetchTimeData]);

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchTimeData();
    }
  }, [companyId, fetchTimeData]);

  return {
    entries,
    policies,
    disconnectionPolicies,
    stats,
    loading,
    error,
    fetchTimeData,
    registerEntry,
    createPolicy,
    createDisconnectionPolicy
  };
}

export default useHRTimeTracking;
