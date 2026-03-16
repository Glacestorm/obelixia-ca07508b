/**
 * usePayrollIncidents — V2-ES.7 Paso 1 (enriquecido) + Paso 7 (hardened)
 * CRUD para incidencias y variables de nómina
 * Filtrado por período, empleado, año/mes y estado
 * Soporte de trazabilidad a solicitudes, tareas y documentos
 * Guards: escritura bloqueada en períodos closed/locked
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PayrollIncident, IncidentStatus } from '@/engines/erp/hr/payrollIncidentEngine';
import { deriveOperationalFlags } from '@/engines/erp/hr/payrollIncidentEngine';
import { isPeriodWritable } from '@/engines/erp/hr/payrollRunEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

export function usePayrollIncidents(companyId?: string) {
  const [incidents, setIncidents] = useState<PayrollIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { writeLedger } = useHRLedgerWriter(companyId || '', 'payroll_incidents');

  // ── Fetch ──

  const fetchByPeriod = useCallback(async (periodId: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('period_id', periodId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents((data ?? []) as unknown as PayrollIncident[]);
    } catch (err) {
      console.error('[usePayrollIncidents] fetchByPeriod:', err);
      toast.error('Error al cargar incidencias');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchByEmployee = useCallback(async (employeeId: string, periodId?: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_hr_payroll_incidents' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (periodId) query = query.eq('period_id', periodId);

      const { data, error } = await query;
      if (error) throw error;
      setIncidents((data ?? []) as unknown as PayrollIncident[]);
    } catch (err) {
      console.error('[usePayrollIncidents] fetchByEmployee:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const fetchByYearMonth = useCallback(async (year: number, month: number) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('period_year', year)
        .eq('period_month', month)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents((data ?? []) as unknown as PayrollIncident[]);
    } catch (err) {
      console.error('[usePayrollIncidents] fetchByYearMonth:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Create ──

  const createIncident = useCallback(async (incident: Partial<PayrollIncident>): Promise<PayrollIncident | null> => {
    if (!companyId) return null;
    try {
      // Guard: check period writability if period_id is provided
      if (incident.period_id) {
        const { data: periodData } = await supabase
          .from('hr_payroll_periods')
          .select('status')
          .eq('id', incident.period_id)
          .single();
        if (periodData && !isPeriodWritable(periodData.status as string)) {
          toast.error(`Período ${periodData.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden crear incidencias`);
          return null;
        }
      }
      const { data: userData } = await supabase.auth.getUser();
      // Auto-derive operational flags from type
      const flags = incident.incident_type ? deriveOperationalFlags(incident.incident_type) : {};
      const row = {
        ...flags,
        ...incident,
        company_id: companyId,
        status: 'pending',
        created_by: userData?.user?.id ?? null,
      };

      const { data, error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .insert([row] as any)
        .select()
        .single();

      if (error) throw error;
      const newIncident = data as unknown as PayrollIncident;
      setIncidents(prev => [newIncident, ...prev]);
      toast.success('Incidencia registrada');
      return newIncident;
    } catch (err) {
      console.error('[usePayrollIncidents] create:', err);
      toast.error('Error al crear incidencia');
      return null;
    }
  }, [companyId]);

  // ── Update ──

  const updateIncident = useCallback(async (id: string, updates: Partial<PayrollIncident>): Promise<boolean> => {
    try {
      // Guard: check period writability via incident's period_id
      const incident = incidents.find(i => i.id === id);
      if (incident?.period_id) {
        const { data: periodData } = await supabase
          .from('hr_payroll_periods')
          .select('status')
          .eq('id', incident.period_id)
          .single();
        if (periodData && !isPeriodWritable(periodData.status as string)) {
          toast.error(`Período ${periodData.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden modificar incidencias`);
          return false;
        }
      }
      const { error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      return true;
    } catch (err) {
      console.error('[usePayrollIncidents] update:', err);
      toast.error('Error al actualizar incidencia');
      return false;
    }
  }, [incidents]);

  // ── Validate ──

  const validateIncident = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Guard: check period writability
      const incident = incidents.find(i => i.id === id);
      if (incident?.period_id) {
        const { data: periodData } = await supabase
          .from('hr_payroll_periods')
          .select('status')
          .eq('id', incident.period_id)
          .single();
        if (periodData && !isPeriodWritable(periodData.status as string)) {
          toast.error(`Período ${periodData.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden validar incidencias`);
          return false;
        }
      }
      const { data: userData } = await supabase.auth.getUser();
      const updates = {
        status: 'validated' as IncidentStatus,
        validated_by: userData?.user?.id ?? null,
        validated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      toast.success('Incidencia validada');
      return true;
    } catch (err) {
      console.error('[usePayrollIncidents] validate:', err);
      toast.error('Error al validar');
      return false;
    }
  }, [incidents]);

  // ── Cancel ──

  const cancelIncident = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Guard: check period writability
      const incident = incidents.find(i => i.id === id);
      if (incident?.period_id) {
        const { data: periodData } = await supabase
          .from('hr_payroll_periods')
          .select('status')
          .eq('id', incident.period_id)
          .single();
        if (periodData && !isPeriodWritable(periodData.status as string)) {
          toast.error(`Período ${periodData.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden cancelar incidencias`);
          return false;
        }
      }
      const { error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .update({ status: 'cancelled' } as any)
        .eq('id', id);

      if (error) throw error;
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as IncidentStatus } : i));
      toast.success('Incidencia cancelada');
      return true;
    } catch (err) {
      console.error('[usePayrollIncidents] cancel:', err);
      toast.error('Error al cancelar');
      return false;
    }
  }, [incidents]);

  // ── Batch validate ──

  const validateAllPending = useCallback(async (periodId: string): Promise<number> => {
    if (!companyId) return 0;
    try {
      // Guard: check period writability
      const { data: periodData } = await supabase
        .from('hr_payroll_periods')
        .select('status')
        .eq('id', periodId)
        .single();
      if (periodData && !isPeriodWritable(periodData.status as string)) {
        toast.error(`Período ${periodData.status === 'locked' ? 'bloqueado' : 'cerrado'} — no se pueden validar incidencias`);
        return 0;
      }

      const { data: userData } = await supabase.auth.getUser();
      const pendingIds = incidents.filter(i => i.status === 'pending' && i.period_id === periodId).map(i => i.id);
      if (pendingIds.length === 0) return 0;

      const updates = {
        status: 'validated' as IncidentStatus,
        validated_by: userData?.user?.id ?? null,
        validated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('erp_hr_payroll_incidents' as any)
        .update(updates as any)
        .in('id', pendingIds);

      if (error) throw error;
      setIncidents(prev => prev.map(i =>
        pendingIds.includes(i.id) ? { ...i, ...updates } : i
      ));
      toast.success(`${pendingIds.length} incidencia(s) validada(s)`);
      return pendingIds.length;
    } catch (err) {
      console.error('[usePayrollIncidents] validateAll:', err);
      toast.error('Error en validación masiva');
      return 0;
    }
  }, [companyId, incidents]);

  return {
    incidents,
    isLoading,
    fetchByPeriod,
    fetchByEmployee,
    fetchByYearMonth,
    createIncident,
    updateIncident,
    validateIncident,
    cancelIncident,
    validateAllPending,
  };
}
