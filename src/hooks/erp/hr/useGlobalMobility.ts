/**
 * useGlobalMobility — Global Mobility / Expatriates hook
 * CRUD for assignments, documents, cost projections, audit log
 * Realtime subscription on hr_mobility_assignments
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// ============ TYPES ============

export type AssignmentType =
  | 'long_term' | 'short_term' | 'commuter'
  | 'permanent_transfer' | 'business_travel_extended' | 'rotational';

export type AssignmentStatus =
  | 'draft' | 'planned' | 'pre_assignment' | 'active'
  | 'extending' | 'repatriating' | 'completed' | 'cancelled';

export type CompensationApproach =
  | 'tax_equalization' | 'tax_protection' | 'laissez_faire' | 'ad_hoc';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DocumentType =
  | 'visa' | 'work_permit' | 'residence_permit' | 'a1_certificate'
  | 'tax_residency_cert' | 'assignment_letter' | 'cost_projection'
  | 'repatriation_agreement' | 'social_security_cert' | 'medical_clearance'
  | 'relocation_contract';

export type DocumentStatus =
  | 'pending' | 'applied' | 'approved' | 'active'
  | 'expiring_soon' | 'expired' | 'renewed' | 'rejected';

export type AuditAction =
  | 'created' | 'status_changed' | 'extended' | 'document_added'
  | 'cost_updated' | 'repatriation_started' | 'completed' | 'cancelled';

export interface AllowancePackage {
  housing?: number;
  cola?: number;
  hardship?: number;
  education?: number;
  relocation?: number;
  home_leave?: number;
  tax_preparation?: number;
  language_training?: number;
  settling_in?: number;
  [key: string]: number | undefined;
}

export interface MobilityAssignment {
  id: string;
  company_id: string;
  employee_id: string;
  assignment_type: AssignmentType;
  status: AssignmentStatus;
  home_country_code: string;
  host_country_code: string;
  home_legal_entity_id?: string | null;
  host_legal_entity_id?: string | null;
  payroll_country_code: string;
  tax_residence_country: string;
  ss_regime_country: string;
  start_date: string;
  end_date?: string | null;
  actual_end_date?: string | null;
  currency_code: string;
  compensation_approach: CompensationApproach;
  split_payroll: boolean;
  shadow_payroll: boolean;
  hypothetical_tax?: number | null;
  allowance_package: AllowancePackage;
  total_monthly_cost?: number | null;
  risk_level: RiskLevel;
  job_title_host?: string | null;
  reporting_to?: string | null;
  assignment_letter_ref?: string | null;
  days_in_host?: number | null;
  pe_risk_flag: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MobilityDocument {
  id: string;
  assignment_id: string;
  document_type: DocumentType;
  document_name: string;
  country_code: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  status: DocumentStatus;
  file_url?: string | null;
  reference_number?: string | null;
  alert_days_before: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface MobilityCostProjection {
  id: string;
  assignment_id: string;
  projection_year: number;
  base_salary_home: number;
  base_salary_host: number;
  housing_allowance: number;
  cola_allowance: number;
  hardship_allowance: number;
  education_allowance: number;
  relocation_cost: number;
  home_leave_flights: number;
  tax_equalization_cost: number;
  ss_cost_home: number;
  ss_cost_host: number;
  medical_insurance: number;
  other_benefits: number;
  total_annual_cost: number;
  currency_code: string;
  exchange_rate: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface MobilityAuditEntry {
  id: string;
  assignment_id: string;
  action: AuditAction;
  actor_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
}

export interface MobilityStats {
  totalActive: number;
  totalPlanned: number;
  countriesInvolved: number;
  expiringDocuments: number;
  totalMonthlyCost: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byRisk: Record<string, number>;
}

export interface AssignmentFilters {
  status?: AssignmentStatus;
  assignment_type?: AssignmentType;
  home_country_code?: string;
  host_country_code?: string;
  risk_level?: RiskLevel;
  employee_id?: string;
}

// ============ VALID TRANSITIONS ============

const VALID_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['pre_assignment', 'cancelled'],
  pre_assignment: ['active', 'cancelled'],
  active: ['extending', 'repatriating', 'cancelled'],
  extending: ['active', 'repatriating', 'cancelled'],
  repatriating: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ============ HOOK ============

export function useGlobalMobility(companyId: string) {
  const [assignments, setAssignments] = useState<MobilityAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MobilityStats | null>(null);

  // --- Fetch assignments ---
  const fetchAssignments = useCallback(async (filters?: AssignmentFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('hr_mobility_assignments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.assignment_type) query = query.eq('assignment_type', filters.assignment_type);
      if (filters?.home_country_code) query = query.eq('home_country_code', filters.home_country_code);
      if (filters?.host_country_code) query = query.eq('host_country_code', filters.host_country_code);
      if (filters?.risk_level) query = query.eq('risk_level', filters.risk_level);
      if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);

      const { data, error } = await query;
      if (error) throw error;
      setAssignments((data || []) as unknown as MobilityAssignment[]);
      return data as unknown as MobilityAssignment[];
    } catch (err) {
      console.error('[useGlobalMobility] fetchAssignments:', err);
      toast.error('Error cargando asignaciones');
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // --- Get single assignment with docs + costs ---
  const getAssignment = useCallback(async (id: string) => {
    try {
      const [assignRes, docsRes, costsRes] = await Promise.all([
        supabase.from('hr_mobility_assignments').select('*').eq('id', id).single(),
        supabase.from('hr_mobility_documents').select('*').eq('assignment_id', id).order('created_at', { ascending: false }),
        supabase.from('hr_mobility_cost_projections').select('*').eq('assignment_id', id).order('projection_year', { ascending: true }),
      ]);
      if (assignRes.error) throw assignRes.error;
      return {
        assignment: assignRes.data as unknown as MobilityAssignment,
        documents: (docsRes.data || []) as unknown as MobilityDocument[],
        costProjections: (costsRes.data || []) as unknown as MobilityCostProjection[],
      };
    } catch (err) {
      console.error('[useGlobalMobility] getAssignment:', err);
      toast.error('Error cargando asignación');
      return null;
    }
  }, []);

  // --- Create assignment ---
  const createAssignment = useCallback(async (data: Partial<MobilityAssignment>) => {
    try {
      const { allowance_package, metadata, ...rest } = data;
      const insertPayload = {
        ...rest,
        company_id: companyId,
        allowance_package: (allowance_package ?? {}) as unknown as Json,
        metadata: (metadata ?? null) as unknown as Json,
      };
      const { data: result, error } = await supabase
        .from('hr_mobility_assignments')
        .insert([insertPayload] as any) // Partial→Insert boundary: required fields come from caller
        .select()
        .single();
      if (error) throw error;

      // Audit
      await supabase.from('hr_mobility_audit_log').insert([{
        assignment_id: result.id,
        action: 'created',
        new_value: result as unknown as Json,
      }]);

      toast.success('Asignación creada');
      await fetchAssignments();
      return result as unknown as MobilityAssignment;
    } catch (err) {
      console.error('[useGlobalMobility] createAssignment:', err);
      toast.error('Error creando asignación');
      return null;
    }
  }, [companyId, fetchAssignments]);

  // --- Update assignment ---
  const updateAssignment = useCallback(async (id: string, updates: Partial<MobilityAssignment>) => {
    try {
      const { data: old } = await supabase.from('hr_mobility_assignments').select('*').eq('id', id).single();
      const { allowance_package, metadata, ...rest } = updates;
      const updatePayload: Record<string, unknown> = { ...rest };
      if (allowance_package !== undefined) updatePayload.allowance_package = allowance_package as unknown as Json;
      if (metadata !== undefined) updatePayload.metadata = metadata as unknown as Json;

      const { data: result, error } = await supabase
        .from('hr_mobility_assignments')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('hr_mobility_audit_log').insert([{
        assignment_id: id,
        action: 'status_changed',
        old_value: old as unknown as Json,
        new_value: result as unknown as Json,
      }]);

      toast.success('Asignación actualizada');
      await fetchAssignments();
      return result as unknown as MobilityAssignment;
    } catch (err) {
      console.error('[useGlobalMobility] updateAssignment:', err);
      toast.error('Error actualizando asignación');
      return null;
    }
  }, [fetchAssignments]);

  // --- Update status with validation ---
  const updateStatus = useCallback(async (id: string, newStatus: AssignmentStatus) => {
    const current = assignments.find(a => a.id === id);
    if (!current) return null;

    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) {
      toast.error(`Transición no permitida: ${current.status} → ${newStatus}`);
      return null;
    }

    const updates: Partial<MobilityAssignment> = { status: newStatus };
    if (newStatus === 'completed') updates.actual_end_date = new Date().toISOString().split('T')[0];

    return updateAssignment(id, updates);
  }, [assignments, updateAssignment]);

  // --- Documents ---
  const fetchDocuments = useCallback(async (assignmentId: string) => {
    const { data, error } = await supabase
      .from('hr_mobility_documents')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as unknown as MobilityDocument[];
  }, []);

  const addDocument = useCallback(async (doc: Partial<MobilityDocument>) => {
    try {
      const { metadata, ...rest } = doc;
      const insertPayload = {
        ...rest,
        metadata: (metadata ?? null) as unknown as Json,
      };
      const { data, error } = await supabase
        .from('hr_mobility_documents')
        .insert([insertPayload] as any) // Partial→Insert boundary: required fields come from caller
        .select()
        .single();
      if (error) throw error;

      await supabase.from('hr_mobility_audit_log').insert([{
        assignment_id: doc.assignment_id,
        action: 'document_added',
        new_value: data as unknown as Json,
      }]);

      toast.success('Documento añadido');
      return data as unknown as MobilityDocument;
    } catch (err) {
      console.error('[useGlobalMobility] addDocument:', err);
      toast.error('Error añadiendo documento');
      return null;
    }
  }, []);

  const updateDocument = useCallback(async (id: string, updates: Partial<MobilityDocument>) => {
    try {
      const { metadata, ...rest } = updates;
      const updatePayload: Record<string, unknown> = { ...rest };
      if (metadata !== undefined) updatePayload.metadata = metadata as unknown as Json;

      const { error } = await supabase
        .from('hr_mobility_documents')
        .update(updatePayload)
        .eq('id', id);
      if (error) throw error;
      toast.success('Documento actualizado');
      return true;
    } catch (err) {
      console.error('[useGlobalMobility] updateDocument:', err);
      toast.error('Error actualizando documento');
      return false;
    }
  }, []);

  // --- Cost projections ---
  const fetchCostProjection = useCallback(async (assignmentId: string, year?: number) => {
    let query = supabase
      .from('hr_mobility_cost_projections')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('projection_year', { ascending: true });
    if (year) query = query.eq('projection_year', year);
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return (data || []) as unknown as MobilityCostProjection[];
  }, []);

  const upsertCostProjection = useCallback(async (projection: Partial<MobilityCostProjection>) => {
    try {
      const { metadata, ...rest } = projection;
      const upsertPayload = {
        ...rest,
        metadata: (metadata ?? null) as unknown as Json,
      };
      const { data, error } = await supabase
        .from('hr_mobility_cost_projections')
        .upsert([upsertPayload] as any, { onConflict: 'assignment_id,projection_year' }) // Partial→Insert boundary
        .select()
        .single();
      if (error) throw error;

      await supabase.from('hr_mobility_audit_log').insert([{
        assignment_id: projection.assignment_id,
        action: 'cost_updated',
        new_value: data as unknown as Json,
      }]);

      toast.success('Proyección de coste guardada');
      return data as unknown as MobilityCostProjection;
    } catch (err) {
      console.error('[useGlobalMobility] upsertCostProjection:', err);
      toast.error('Error guardando proyección');
      return null;
    }
  }, []);

  // --- Stats ---
  const getStats = useCallback(async (): Promise<MobilityStats> => {
    const all = assignments.length > 0 ? assignments : (await fetchAssignments()) || [];
    const active = all.filter(a => a.status === 'active');
    const planned = all.filter(a => a.status === 'planned' || a.status === 'pre_assignment');

    const countries = new Set<string>();
    all.forEach(a => { countries.add(a.home_country_code); countries.add(a.host_country_code); });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    all.forEach(a => {
      byType[a.assignment_type] = (byType[a.assignment_type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      byRisk[a.risk_level] = (byRisk[a.risk_level] || 0) + 1;
    });

    // Expiring docs
    const { data: expiringDocs } = await supabase
      .from('hr_mobility_documents')
      .select('id')
      .lte('expiry_date', new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .not('status', 'in', '("expired","renewed")');

    const s: MobilityStats = {
      totalActive: active.length,
      totalPlanned: planned.length,
      countriesInvolved: countries.size,
      expiringDocuments: expiringDocs?.length || 0,
      totalMonthlyCost: active.reduce((sum, a) => sum + (a.total_monthly_cost || 0), 0),
      byType,
      byStatus,
      byRisk,
    };
    setStats(s);
    return s;
  }, [assignments, fetchAssignments]);

  // --- Expiring documents ---
  const getExpiringDocuments = useCallback(async (days: number = 60) => {
    const futureDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('hr_mobility_documents')
      .select('*')
      .lte('expiry_date', futureDate)
      .gte('expiry_date', today)
      .not('status', 'in', '("expired","renewed")');
    if (error) { console.error(error); return []; }
    return (data || []) as unknown as MobilityDocument[];
  }, []);

  // --- Audit log ---
  const fetchAuditLog = useCallback(async (assignmentId: string) => {
    const { data, error } = await supabase
      .from('hr_mobility_audit_log')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as unknown as MobilityAuditEntry[];
  }, []);

  // --- Realtime ---
  useEffect(() => {
    const channel = supabase
      .channel('hr-mobility-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hr_mobility_assignments',
        filter: `company_id=eq.${companyId}`,
      }, () => {
        fetchAssignments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchAssignments]);

  // --- Initial fetch ---
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // --- Delete assignment (draft/cancelled only) ---
  const deleteAssignment = useCallback(async (id: string) => {
    const current = assignments.find(a => a.id === id);
    if (!current || !['draft', 'cancelled'].includes(current.status)) {
      toast.error('Solo se pueden eliminar asignaciones en borrador o canceladas');
      return false;
    }
    try {
      const { error } = await supabase
        .from('hr_mobility_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Asignación eliminada');
      await fetchAssignments();
      return true;
    } catch (err) {
      console.error('[useGlobalMobility] deleteAssignment:', err);
      toast.error('Error eliminando asignación');
      return false;
    }
  }, [assignments, fetchAssignments]);

  return {
    assignments,
    loading,
    stats,
    fetchAssignments,
    getAssignment,
    createAssignment,
    updateAssignment,
    updateStatus,
    deleteAssignment,
    fetchDocuments,
    addDocument,
    updateDocument,
    fetchCostProjection,
    upsertCostProjection,
    getStats,
    getExpiringDocuments,
    fetchAuditLog,
    VALID_TRANSITIONS,
  };
}
