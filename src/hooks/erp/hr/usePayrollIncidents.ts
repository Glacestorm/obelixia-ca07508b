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
import { validateBatchIncidents, type BatchIncidentValidationResult } from '@/engines/erp/hr/incidentPreCalcValidator';
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
        .from('erp_hr_payroll_incidents')
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
        .from('erp_hr_payroll_incidents')
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
        .from('erp_hr_payroll_incidents')
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
        .from('erp_hr_payroll_incidents')
        .insert([row])
        .select()
        .single();

      if (error) throw error;
      const newIncident = data as unknown as PayrollIncident;
      setIncidents(prev => [newIncident, ...prev]);
      toast.success('Incidencia registrada');
      // Ledger: incident created
      writeLedger({
        eventType: 'payroll_incident_created',
        entityType: 'payroll_incident',
        entityId: newIncident.id,
        afterSnapshot: {
          incident_type: newIncident.incident_type,
          employee_id: newIncident.employee_id,
          period_id: newIncident.period_id,
          status: 'pending',
        },
        aggregateType: 'payroll_period',
        aggregateId: newIncident.period_id || undefined,
      });
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
        .from('erp_hr_payroll_incidents')
        .update(updates)
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
        .from('erp_hr_payroll_incidents')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      toast.success('Incidencia validada');
      // Ledger: incident resolved (validated)
      writeLedger({
        eventType: 'payroll_incident_resolved',
        entityType: 'payroll_incident',
        entityId: id,
        beforeSnapshot: { status: 'pending' },
        afterSnapshot: { status: 'validated' },
        changedFields: ['status'],
      });
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
        .from('erp_hr_payroll_incidents')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as IncidentStatus } : i));
      toast.success('Incidencia cancelada');
      // Ledger: incident resolved (cancelled)
      writeLedger({
        eventType: 'payroll_incident_resolved',
        eventLabel: 'Incidencia cancelada',
        entityType: 'payroll_incident',
        entityId: id,
        afterSnapshot: { status: 'cancelled' },
      });
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
        .from('erp_hr_payroll_incidents')
        .update(updates)
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

  // ── Batch pre-calc validation ── P1.3

  const validateBatchPreCalc = useCallback(async (periodId: string): Promise<BatchIncidentValidationResult | null> => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase
        .from('erp_hr_payroll_incidents')
        .select('*')
        .eq('company_id', companyId)
        .eq('period_id', periodId)
        .neq('status', 'cancelled');

      if (error) throw error;

      const periodIncidents = (data ?? []) as unknown as PayrollIncident[];
      const result = validateBatchIncidents(periodIncidents);

      // Ledger: batch pre-calc validation run
      writeLedger({
        eventType: 'payroll_validation_completed' as any,
        eventLabel: 'Validación pre-cálculo de incidencias',
        entityType: 'payroll_period',
        entityId: periodId,
        afterSnapshot: {
          total_incidents: periodIncidents.length,
          errors: result.totalErrors,
          warnings: result.totalWarnings,
          is_valid: result.isValid,
        },
      });

      if (result.isValid) {
        toast.success(`Validación pre-cálculo OK: ${periodIncidents.length} incidencia(s) verificadas`);
      } else {
        toast.warning(`Validación pre-cálculo: ${result.totalErrors} error(es), ${result.totalWarnings} aviso(s)`);
      }

      return result;
    } catch (err) {
      console.error('[usePayrollIncidents] validateBatchPreCalc:', err);
      toast.error('Error en validación pre-cálculo');
      return null;
    }
  }, [companyId, writeLedger]);

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
    validateBatchPreCalc,
  };
}
