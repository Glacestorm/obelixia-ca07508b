/**
 * useOfficialIntegrationsHub — Hook for Official Integrations Hub
 * CRUD for adapters, submissions, receipts + stats + realtime
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ========== TYPES ==========

export type SubmissionStatus = 'draft' | 'validating' | 'ready' | 'sent' | 'acknowledged' | 'accepted' | 'rejected' | 'correction_required' | 'corrected' | 'cancelled' | 'expired';
export type SubmissionPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ReceiptType = 'acknowledgement' | 'acceptance' | 'rejection' | 'partial' | 'correction_required';

export interface IntegrationAdapter {
  id: string;
  country_code: string;
  company_id: string | null;
  adapter_name: string;
  adapter_type: string;
  system_name: string;
  endpoint_url: string | null;
  auth_type: string | null;
  status: string;
  last_execution_at: string | null;
  last_execution_status: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OfficialSubmission {
  id: string;
  company_id: string;
  legal_entity_id: string | null;
  country_code: string;
  adapter_id: string | null;
  submission_type: string;
  submission_subtype: string | null;
  reference_period: string | null;
  payload: Record<string, unknown>;
  file_url: string | null;
  file_format: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  attempts: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  external_reference: string | null;
  employee_id: string | null;
  contract_id: string | null;
  payroll_record_id: string | null;
  admin_request_id: string | null;
  priority: SubmissionPriority;
  response_deadline: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // joined
  adapter?: IntegrationAdapter;
  receipts?: SubmissionReceipt[];
}

export interface SubmissionReceipt {
  id: string;
  submission_id: string;
  receipt_reference: string | null;
  receipt_date: string | null;
  receipt_document_url: string | null;
  receipt_type: ReceiptType;
  receipt_file_name: string | null;
  receipt_file_size: number | null;
  validation_status: string;
  validation_errors: Record<string, unknown> | null;
  official_response: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SubmissionFilters {
  country_code?: string;
  adapter_id?: string;
  status?: SubmissionStatus;
  priority?: SubmissionPriority;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface HubStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  pending_retry: number;
  overdue: number;
}

// ========== VALID TRANSITIONS ==========

const VALID_TRANSITIONS: Record<string, SubmissionStatus[]> = {
  draft: ['validating', 'ready', 'cancelled'],
  validating: ['ready', 'draft', 'cancelled'],
  ready: ['sent', 'cancelled'],
  sent: ['acknowledged', 'accepted', 'rejected', 'cancelled', 'expired'],
  acknowledged: ['accepted', 'rejected', 'correction_required', 'expired'],
  rejected: ['corrected', 'cancelled'],
  correction_required: ['corrected', 'cancelled'],
  corrected: ['sent', 'cancelled'],
  accepted: [],
  cancelled: [],
  expired: ['corrected'],
};

// ========== HOOK ==========

export function useOfficialIntegrationsHub(companyId?: string) {
  const [adapters, setAdapters] = useState<IntegrationAdapter[]>([]);
  const [submissions, setSubmissions] = useState<OfficialSubmission[]>([]);
  const [receipts, setReceipts] = useState<SubmissionReceipt[]>([]);
  const [stats, setStats] = useState<HubStats>({ total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, pending_retry: 0, overdue: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== ADAPTERS =====
  const fetchAdapters = useCallback(async (countryCode?: string) => {
    try {
      let q = supabase.from('hr_integration_adapters').select('*').order('country_code').order('adapter_name');
      if (countryCode) q = q.eq('country_code', countryCode);
      // adapters can be global (company_id IS NULL) or company-specific
      const { data, error: e } = await q;
      if (e) throw e;
      setAdapters((data || []) as unknown as IntegrationAdapter[]);
      return data;
    } catch (err) {
      console.error('[IntegrationsHub] fetchAdapters error:', err);
      return [];
    }
  }, []);

  const updateAdapterStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { error: e } = await supabase.from('hr_integration_adapters').update({ is_active: isActive, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (e) throw e;
      setAdapters(prev => prev.map(a => a.id === id ? { ...a, is_active: isActive } : a));
      toast.success(isActive ? 'Conector activado' : 'Conector desactivado');
    } catch {
      toast.error('Error al actualizar conector');
    }
  }, []);

  // ===== SUBMISSIONS =====
  const fetchSubmissions = useCallback(async (filters?: SubmissionFilters) => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      let q = supabase.from('hr_official_submissions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);
      if (filters?.country_code) q = q.eq('country_code', filters.country_code);
      if (filters?.adapter_id) q = q.eq('adapter_id', filters.adapter_id);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.priority) q = q.eq('priority', filters.priority);
      if (filters?.employee_id) q = q.eq('employee_id', filters.employee_id);
      if (filters?.date_from) q = q.gte('created_at', filters.date_from);
      if (filters?.date_to) q = q.lte('created_at', filters.date_to);
      const { data, error: e } = await q;
      if (e) throw e;
      setSubmissions((data || []) as unknown as OfficialSubmission[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const getSubmission = useCallback(async (id: string) => {
    try {
      const [subRes, recRes] = await Promise.all([
        supabase.from('hr_official_submissions').select('*').eq('id', id).single(),
        supabase.from('hr_official_submission_receipts').select('*').eq('submission_id', id).order('created_at', { ascending: false }),
      ]);
      if (subRes.error) throw subRes.error;
      const sub = subRes.data as unknown as OfficialSubmission;
      sub.receipts = (recRes.data || []) as unknown as SubmissionReceipt[];
      return sub;
    } catch {
      toast.error('Error al cargar envío');
      return null;
    }
  }, []);

  const createSubmission = useCallback(async (data: Partial<OfficialSubmission>) => {
    if (!companyId) return null;
    try {
      const { data: res, error: e } = await supabase.from('hr_official_submissions').insert([{
        company_id: companyId,
        country_code: data.country_code || 'ES',
        adapter_id: data.adapter_id,
        submission_type: data.submission_type || 'generic',
        submission_subtype: data.submission_subtype,
        reference_period: data.reference_period,
        payload: data.payload || {},
        file_url: data.file_url,
        file_format: data.file_format,
        file_name: data.file_name,
        status: 'draft',
        attempts: 0,
        priority: data.priority || 'normal',
        employee_id: data.employee_id,
        contract_id: data.contract_id,
        payroll_record_id: data.payroll_record_id,
        admin_request_id: data.admin_request_id,
        response_deadline: data.response_deadline,
        notes: data.notes,
        legal_entity_id: data.legal_entity_id,
      } as any]).select().single();
      if (e) throw e;
      toast.success('Envío creado como borrador');
      await fetchSubmissions();
      return res as unknown as OfficialSubmission;
    } catch {
      toast.error('Error al crear envío');
      return null;
    }
  }, [companyId, fetchSubmissions]);

  const updateSubmission = useCallback(async (id: string, updates: Partial<OfficialSubmission>) => {
    try {
      const { error: e } = await supabase.from('hr_official_submissions').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (e) throw e;
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      toast.success('Envío actualizado');
      return true;
    } catch {
      toast.error('Error al actualizar envío');
      return false;
    }
  }, []);

  const changeStatus = useCallback(async (id: string, newStatus: SubmissionStatus, extra?: Partial<OfficialSubmission>) => {
    const sub = submissions.find(s => s.id === id);
    if (sub && VALID_TRANSITIONS[sub.status] && !VALID_TRANSITIONS[sub.status].includes(newStatus)) {
      toast.error(`Transición no válida: ${sub.status} → ${newStatus}`);
      return false;
    }
    const updates: any = { status: newStatus, updated_at: new Date().toISOString(), ...extra };
    if (newStatus === 'sent') {
      updates.submitted_at = new Date().toISOString();
      updates.attempts = (sub?.attempts || 0) + 1;
    }
    return updateSubmission(id, updates);
  }, [submissions, updateSubmission]);

  const markAsSent = useCallback((id: string) => changeStatus(id, 'sent'), [changeStatus]);
  const markAsAccepted = useCallback((id: string) => changeStatus(id, 'accepted'), [changeStatus]);
  const markAsRejected = useCallback((id: string, lastError?: string) => changeStatus(id, 'rejected', { last_error: lastError } as any), [changeStatus]);
  const cancelSubmission = useCallback((id: string) => changeStatus(id, 'cancelled'), [changeStatus]);

  const retrySubmission = useCallback(async (id: string) => {
    const sub = submissions.find(s => s.id === id);
    if (sub && sub.attempts >= sub.max_retries) {
      toast.error('Reintentos máximos alcanzados');
      return false;
    }
    return changeStatus(id, 'sent');
  }, [submissions, changeStatus]);

  const deleteSubmission = useCallback(async (id: string) => {
    const sub = submissions.find(s => s.id === id);
    if (sub && sub.status !== 'draft') {
      toast.error('Solo se pueden eliminar borradores');
      return false;
    }
    try {
      const { error: e } = await supabase.from('hr_official_submissions').delete().eq('id', id);
      if (e) throw e;
      setSubmissions(prev => prev.filter(s => s.id !== id));
      toast.success('Borrador eliminado');
      return true;
    } catch {
      toast.error('Error al eliminar');
      return false;
    }
  }, [submissions]);

  // ===== RECEIPTS =====
  const fetchReceipts = useCallback(async (submissionId?: string) => {
    try {
      let q = supabase.from('hr_official_submission_receipts').select('*').order('created_at', { ascending: false });
      if (submissionId) q = q.eq('submission_id', submissionId);
      const { data, error: e } = await q;
      if (e) throw e;
      setReceipts((data || []) as unknown as SubmissionReceipt[]);
      return data;
    } catch {
      return [];
    }
  }, []);

  const addReceipt = useCallback(async (submissionId: string, receiptData: Partial<SubmissionReceipt>) => {
    try {
      const { data, error: e } = await supabase.from('hr_official_submission_receipts').insert([{
        submission_id: submissionId,
        receipt_reference: receiptData.receipt_reference,
        receipt_date: receiptData.receipt_date || new Date().toISOString(),
        receipt_document_url: receiptData.receipt_document_url,
        receipt_type: receiptData.receipt_type || 'acknowledgement',
        receipt_file_name: receiptData.receipt_file_name,
        validation_status: receiptData.validation_status || 'pending',
        validation_errors: receiptData.validation_errors,
        official_response: receiptData.official_response,
      } as any]).select().single();
      if (e) throw e;
      toast.success('Acuse registrado');
      // auto-update submission status based on receipt type
      if (receiptData.receipt_type === 'acceptance') {
        await changeStatus(submissionId, 'accepted');
      } else if (receiptData.receipt_type === 'rejection') {
        await changeStatus(submissionId, 'rejected');
      } else if (receiptData.receipt_type === 'correction_required') {
        await changeStatus(submissionId, 'correction_required');
      } else {
        await changeStatus(submissionId, 'acknowledged');
      }
      return data;
    } catch {
      toast.error('Error al registrar acuse');
      return null;
    }
  }, [changeStatus]);

  // ===== STATS =====
  const getHubStats = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error: e } = await supabase.from('hr_official_submissions').select('status, next_retry_at, response_deadline').eq('company_id', companyId);
      if (e) throw e;
      const now = new Date().toISOString();
      const s: HubStats = { total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, pending_retry: 0, overdue: 0 };
      (data || []).forEach((r: any) => {
        s.total++;
        if (r.status === 'draft') s.draft++;
        if (r.status === 'sent' || r.status === 'acknowledged') s.sent++;
        if (r.status === 'accepted') s.accepted++;
        if (r.status === 'rejected' || r.status === 'correction_required') s.rejected++;
        if (r.next_retry_at && r.next_retry_at <= now) s.pending_retry++;
        if (r.response_deadline && r.response_deadline < now && !['accepted', 'rejected', 'cancelled'].includes(r.status)) s.overdue++;
      });
      setStats(s);
    } catch {
      console.error('[IntegrationsHub] getHubStats error');
    }
  }, [companyId]);

  // ===== LOAD ALL =====
  const loadAll = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      await Promise.all([fetchAdapters(), fetchSubmissions(), getHubStats()]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, fetchAdapters, fetchSubmissions, getHubStats]);

  // ===== REALTIME =====
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('hr-official-submissions-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_official_submissions' }, () => {
        fetchSubmissions();
        getHubStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchSubmissions, getHubStats]);

  return {
    adapters, submissions, receipts, stats, isLoading, error,
    fetchAdapters, updateAdapterStatus,
    fetchSubmissions, getSubmission, createSubmission, updateSubmission,
    changeStatus, markAsSent, markAsAccepted, markAsRejected, cancelSubmission, retrySubmission, deleteSubmission,
    fetchReceipts, addReceipt,
    getHubStats, loadAll,
  };
}

export default useOfficialIntegrationsHub;
