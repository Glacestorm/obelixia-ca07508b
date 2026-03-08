/**
 * useHREnterprise - Hook para gestión enterprise de RRHH
 * Fase 1: Entidades legales, centros de trabajo, org units, calendarios, roles, auditoría
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ===== INTERFACES =====

export interface HRLegalEntity {
  id: string;
  company_id: string;
  name: string;
  legal_name: string;
  tax_id?: string;
  entity_type: string;
  jurisdiction: string;
  registration_info?: Record<string, unknown>;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  ss_employer_code?: string;
  cnae_code?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HRWorkCenter {
  id: string;
  company_id: string;
  legal_entity_id?: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;
  jurisdiction: string;
  cnae_code?: string;
  ss_account_code?: string;
  phone?: string;
  email?: string;
  max_capacity?: number;
  is_headquarters: boolean;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  erp_hr_legal_entities?: { id: string; name: string };
}

export interface HROrgUnit {
  id: string;
  company_id: string;
  legal_entity_id?: string;
  parent_id?: string;
  code: string;
  name: string;
  unit_type: string;
  manager_employee_id?: string;
  cost_center?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  erp_hr_legal_entities?: { id: string; name: string };
}

export interface HRWorkCalendar {
  id: string;
  company_id: string;
  legal_entity_id?: string;
  work_center_id?: string;
  name: string;
  year: number;
  jurisdiction: string;
  weekly_hours: number;
  daily_hours: number;
  work_days: number[];
  is_default: boolean;
  is_active: boolean;
  erp_hr_calendar_entries?: HRCalendarEntry[];
  created_at: string;
  updated_at: string;
}

export interface HRCalendarEntry {
  id: string;
  calendar_id: string;
  entry_date: string;
  entry_type: string;
  name: string;
  description?: string;
  is_national: boolean;
  is_regional: boolean;
  is_local: boolean;
  hours_reduction?: number;
}

export interface HREnterpriseRole {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  priority: number;
  is_active: boolean;
  erp_hr_role_permissions?: Array<{
    id: string;
    permission_id: string;
    erp_hr_enterprise_permissions?: HRPermission;
  }>;
  created_at: string;
}

export interface HRPermission {
  id: string;
  module: string;
  action: string;
  resource?: string;
  description?: string;
  is_sensitive: boolean;
}

export interface HRAuditLogEntry {
  id: string;
  company_id?: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  changed_fields?: string[];
  category: string;
  severity: string;
  ip_address?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface HRCriticalEvent {
  id: string;
  company_id?: string;
  event_type: string;
  severity: string;
  title: string;
  description?: string;
  affected_entity_type?: string;
  affected_entity_id?: string;
  requires_action: boolean;
  action_taken?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface HREnterpriseStats {
  legal_entities: number;
  work_centers: number;
  org_units: number;
  active_employees: number;
  total_audit_events: number;
  unresolved_critical: number;
}

// ===== HOOK =====

export function useHREnterprise() {
  const [loading, setLoading] = useState(false);
  const [legalEntities, setLegalEntities] = useState<HRLegalEntity[]>([]);
  const [workCenters, setWorkCenters] = useState<HRWorkCenter[]>([]);
  const [orgUnits, setOrgUnits] = useState<HROrgUnit[]>([]);
  const [calendars, setCalendars] = useState<HRWorkCalendar[]>([]);
  const [roles, setRoles] = useState<HREnterpriseRole[]>([]);
  const [permissions, setPermissions] = useState<HRPermission[]>([]);
  const [auditLog, setAuditLog] = useState<HRAuditLogEntry[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<HRCriticalEvent[]>([]);
  const [stats, setStats] = useState<HREnterpriseStats | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-enterprise-admin', {
      body: { action, params }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data.data;
  }, []);

  // Legal Entities
  const fetchLegalEntities = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_legal_entities', { company_id: companyId });
      setLegalEntities(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando entidades legales'); }
    finally { setLoading(false); }
  }, [invoke]);

  const saveLegalEntity = useCallback(async (entity: Partial<HRLegalEntity>) => {
    try {
      await invoke('upsert_legal_entity', entity);
      toast.success(entity.id ? 'Entidad actualizada' : 'Entidad creada');
      if (entity.company_id) await fetchLegalEntities(entity.company_id);
    } catch (e) { console.error(e); toast.error('Error guardando entidad'); }
  }, [invoke, fetchLegalEntities]);

  const deleteLegalEntity = useCallback(async (id: string, companyId: string) => {
    try {
      await invoke('delete_legal_entity', { id, company_id: companyId });
      toast.success('Entidad eliminada');
      await fetchLegalEntities(companyId);
    } catch (e) { console.error(e); toast.error('Error eliminando entidad'); }
  }, [invoke, fetchLegalEntities]);

  // Work Centers
  const fetchWorkCenters = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_work_centers', { company_id: companyId });
      setWorkCenters(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando centros de trabajo'); }
    finally { setLoading(false); }
  }, [invoke]);

  const saveWorkCenter = useCallback(async (center: Partial<HRWorkCenter>) => {
    try {
      await invoke('upsert_work_center', center);
      toast.success(center.id ? 'Centro actualizado' : 'Centro creado');
      if (center.company_id) await fetchWorkCenters(center.company_id);
    } catch (e) { console.error(e); toast.error('Error guardando centro'); }
  }, [invoke, fetchWorkCenters]);

  const deleteWorkCenter = useCallback(async (id: string, companyId: string) => {
    try {
      await invoke('delete_work_center', { id, company_id: companyId });
      toast.success('Centro eliminado');
      await fetchWorkCenters(companyId);
    } catch (e) { console.error(e); toast.error('Error eliminando centro'); }
  }, [invoke, fetchWorkCenters]);

  // Org Units
  const fetchOrgUnits = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_org_units', { company_id: companyId });
      setOrgUnits(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando unidades organizativas'); }
    finally { setLoading(false); }
  }, [invoke]);

  const saveOrgUnit = useCallback(async (unit: Partial<HROrgUnit>) => {
    try {
      await invoke('upsert_org_unit', unit);
      toast.success(unit.id ? 'Unidad actualizada' : 'Unidad creada');
      if (unit.company_id) await fetchOrgUnits(unit.company_id);
    } catch (e) { console.error(e); toast.error('Error guardando unidad'); }
  }, [invoke, fetchOrgUnits]);

  // Calendars
  const fetchCalendars = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_calendars', { company_id: companyId });
      setCalendars(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando calendarios'); }
    finally { setLoading(false); }
  }, [invoke]);

  const saveCalendar = useCallback(async (calendar: Record<string, unknown>) => {
    try {
      await invoke('upsert_calendar', calendar);
      toast.success('Calendario guardado');
      if (calendar.company_id) await fetchCalendars(calendar.company_id as string);
    } catch (e) { console.error(e); toast.error('Error guardando calendario'); }
  }, [invoke, fetchCalendars]);

  // Roles & Permissions
  const fetchRoles = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_roles', { company_id: companyId });
      setRoles(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando roles'); }
    finally { setLoading(false); }
  }, [invoke]);

  const fetchPermissions = useCallback(async () => {
    try {
      const data = await invoke('list_permissions', {});
      setPermissions(data || []);
    } catch (e) { console.error(e); }
  }, [invoke]);

  const saveRole = useCallback(async (role: Record<string, unknown>) => {
    try {
      await invoke('upsert_role', role);
      toast.success('Rol guardado');
      if (role.company_id) await fetchRoles(role.company_id as string);
    } catch (e) { console.error(e); toast.error('Error guardando rol'); }
  }, [invoke, fetchRoles]);

  // Audit
  const fetchAuditLog = useCallback(async (companyId: string, filters?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const data = await invoke('query_audit_log', { company_id: companyId, ...filters });
      setAuditLog(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando auditoría'); }
    finally { setLoading(false); }
  }, [invoke]);

  const fetchCriticalEvents = useCallback(async (companyId: string, resolved?: boolean) => {
    try {
      const data = await invoke('list_critical_events', { company_id: companyId, resolved });
      setCriticalEvents(data || []);
    } catch (e) { console.error(e); }
  }, [invoke]);

  const resolveCriticalEvent = useCallback(async (id: string, actionTaken: string, companyId: string) => {
    try {
      await invoke('resolve_critical_event', { id, action_taken: actionTaken, company_id: companyId });
      toast.success('Evento resuelto');
      await fetchCriticalEvents(companyId, false);
    } catch (e) { console.error(e); toast.error('Error resolviendo evento'); }
  }, [invoke, fetchCriticalEvents]);

  // Stats
  const fetchStats = useCallback(async (companyId: string) => {
    try {
      const data = await invoke('get_enterprise_stats', { company_id: companyId });
      setStats(data);
    } catch (e) { console.error(e); }
  }, [invoke]);

  // Seed
  const seedEnterpriseData = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('seed_enterprise_data', { company_id: companyId });
      toast.success(`Datos enterprise creados: ${data.legal_entities} entidades, ${data.work_centers} centros, ${data.roles} roles`);
      return data;
    } catch (e) { console.error(e); toast.error('Error generando datos enterprise'); return null; }
    finally { setLoading(false); }
  }, [invoke]);

  return {
    loading,
    // Data
    legalEntities, workCenters, orgUnits, calendars, roles, permissions, auditLog, criticalEvents, stats,
    // Legal Entities
    fetchLegalEntities, saveLegalEntity, deleteLegalEntity,
    // Work Centers
    fetchWorkCenters, saveWorkCenter, deleteWorkCenter,
    // Org Units
    fetchOrgUnits, saveOrgUnit,
    // Calendars
    fetchCalendars, saveCalendar,
    // Roles & Permissions
    fetchRoles, fetchPermissions, saveRole,
    // Audit
    fetchAuditLog, fetchCriticalEvents, resolveCriticalEvent,
    // Stats
    fetchStats,
    // Seed
    seedEnterpriseData,
  };
}
