/**
 * useAdminPortal — CRUD hook for HR Admin Portal (requests, comments, activity)
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// === TYPES ===
export type AdminRequestType =
  | 'employee_registration' | 'contract_modification' | 'schedule_change'
  | 'salary_change' | 'monthly_incidents' | 'sick_leave' | 'work_accident'
  | 'unpaid_leave' | 'birth_leave' | 'vacation' | 'termination'
  | 'settlement' | 'company_certificate' | 'document_submission';

export type AdminRequestStatus =
  | 'draft' | 'submitted' | 'reviewing' | 'pending_approval'
  | 'approved' | 'in_progress' | 'completed' | 'returned' | 'rejected' | 'cancelled';

export interface AdminRequest {
  id: string;
  employee_id: string;
  company_id: string;
  request_type: AdminRequestType;
  request_subtype: string | null;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  workflow_instance_id: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  attachments: any[];
  metadata: Record<string, any>;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee_name?: string;
}

export interface AdminRequestComment {
  id: string;
  request_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  is_internal: boolean;
  attachments: any[];
  created_at: string;
}

export interface AdminRequestActivity {
  id: string;
  request_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AdminPortalFilters {
  status?: string;
  request_type?: string;
  priority?: string;
  search?: string;
}

const REQUEST_TYPE_LABELS: Record<AdminRequestType, string> = {
  employee_registration: 'Alta de empleado',
  contract_modification: 'Modificación contractual',
  schedule_change: 'Cambio de jornada',
  salary_change: 'Cambio salarial',
  monthly_incidents: 'Incidencias mensuales',
  sick_leave: 'IT / Baja médica',
  work_accident: 'Accidente de trabajo',
  unpaid_leave: 'Permiso no retribuido',
  birth_leave: 'Nacimiento / Paternidad / Maternidad',
  vacation: 'Vacaciones',
  termination: 'Baja del trabajador',
  settlement: 'Finiquito',
  company_certificate: 'Certificado de empresa',
  document_submission: 'Envío de documentación',
};

export function getRequestTypeLabel(type: string): string {
  return REQUEST_TYPE_LABELS[type as AdminRequestType] || type;
}

function generateReference(): string {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `ADM-${datePart}-${rand}`;
}

export function useAdminPortal(companyId: string) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdminRequest | null>(null);
  const [comments, setComments] = useState<AdminRequestComment[]>([]);
  const [activity, setActivity] = useState<AdminRequestActivity[]>([]);

  // === FETCH REQUESTS ===
  const fetchRequests = useCallback(async (filters?: AdminPortalFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('hr_admin_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.request_type) query = query.eq('request_type', filters.request_type);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.search) query = query.or(`subject.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      setRequests((data || []) as AdminRequest[]);
    } catch (err) {
      console.error('[useAdminPortal] fetchRequests:', err);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // === CREATE REQUEST ===
  const createRequest = useCallback(async (data: {
    employee_id: string;
    request_type: AdminRequestType;
    request_subtype?: string;
    subject: string;
    description?: string;
    priority?: string;
    metadata?: Record<string, any>;
    attachments?: any[];
    status?: AdminRequestStatus;
  }) => {
    if (!user?.id) { toast.error('Inicia sesión'); return null; }
    try {
      const ref = generateReference();
      const { data: row, error } = await supabase
        .from('hr_admin_requests')
        .insert([{
          employee_id: data.employee_id,
          company_id: companyId,
          request_type: data.request_type,
          request_subtype: data.request_subtype || null,
          subject: data.subject,
          description: data.description || null,
          priority: data.priority || 'normal',
          status: data.status || 'submitted',
          metadata: data.metadata || {},
          attachments: data.attachments || [],
          reference_number: ref,
        }] as any)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('hr_admin_request_activity').insert([{
        request_id: (row as any).id,
        action: 'created',
        actor_id: user.id,
        actor_name: user.email || 'Usuario',
        new_value: data.status || 'submitted',
        metadata: { request_type: data.request_type, reference: ref },
      }] as any);

      toast.success(`Solicitud ${ref} creada`);
      await fetchRequests();
      return row as AdminRequest;
    } catch (err) {
      console.error('[useAdminPortal] createRequest:', err);
      toast.error('Error al crear solicitud');
      return null;
    }
  }, [companyId, user, fetchRequests]);

  // === UPDATE STATUS ===
  const updateStatus = useCallback(async (id: string, newStatus: AdminRequestStatus, comment?: string) => {
    if (!user?.id) return false;
    try {
      const req = requests.find(r => r.id === id);
      const oldStatus = req?.status || 'unknown';

      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'completed' || newStatus === 'rejected') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user.id;
      }

      const { error } = await supabase.from('hr_admin_requests').update(updates).eq('id', id);
      if (error) throw error;

      await supabase.from('hr_admin_request_activity').insert([{
        request_id: id,
        action: 'status_changed',
        actor_id: user.id,
        actor_name: user.email || 'Usuario',
        old_value: oldStatus,
        new_value: newStatus,
      }] as any);

      if (comment) {
        await supabase.from('hr_admin_request_comments').insert([{
          request_id: id,
          author_id: user.id,
          author_name: user.email || 'Usuario',
          content: comment,
          is_internal: true,
        }] as any);
      }

      toast.success(`Estado actualizado a ${newStatus}`);
      await fetchRequests();
      if (detail?.id === id) await fetchDetail(id);
      return true;
    } catch (err) {
      console.error('[useAdminPortal] updateStatus:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [user, requests, detail, fetchRequests]);

  // === ASSIGN REQUEST ===
  const assignRequest = useCallback(async (id: string, assignedTo: string, assigneeName: string) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase.from('hr_admin_requests').update({ assigned_to: assignedTo } as any).eq('id', id);
      if (error) throw error;

      await supabase.from('hr_admin_request_activity').insert([{
        request_id: id,
        action: 'assigned',
        actor_id: user.id,
        actor_name: user.email || 'Usuario',
        new_value: assigneeName,
      }] as any);

      toast.success(`Asignado a ${assigneeName}`);
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('[useAdminPortal] assignRequest:', err);
      return false;
    }
  }, [user, fetchRequests]);

  // === ADD COMMENT ===
  const addComment = useCallback(async (requestId: string, content: string, isInternal: boolean = false) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase.from('hr_admin_request_comments').insert([{
        request_id: requestId,
        author_id: user.id,
        author_name: user.email || 'Usuario',
        content,
        is_internal: isInternal,
      }] as any);
      if (error) throw error;

      await supabase.from('hr_admin_request_activity').insert([{
        request_id: requestId,
        action: 'commented',
        actor_id: user.id,
        actor_name: user.email || 'Usuario',
        metadata: { is_internal: isInternal },
      }] as any);

      if (detail?.id === requestId) await fetchDetail(requestId);
      return true;
    } catch (err) {
      console.error('[useAdminPortal] addComment:', err);
      toast.error('Error al añadir comentario');
      return false;
    }
  }, [user, detail]);

  // === FETCH DETAIL ===
  const fetchDetail = useCallback(async (id: string) => {
    try {
      const [reqRes, commRes, actRes] = await Promise.all([
        supabase.from('hr_admin_requests').select('*').eq('id', id).single(),
        supabase.from('hr_admin_request_comments').select('*').eq('request_id', id).order('created_at', { ascending: true }),
        supabase.from('hr_admin_request_activity').select('*').eq('request_id', id).order('created_at', { ascending: false }),
      ]);

      if (reqRes.error) throw reqRes.error;
      setDetail(reqRes.data as AdminRequest);
      setComments((commRes.data || []) as AdminRequestComment[]);
      setActivity((actRes.data || []) as AdminRequestActivity[]);
    } catch (err) {
      console.error('[useAdminPortal] fetchDetail:', err);
      toast.error('Error al cargar detalle');
    }
  }, []);

  // === GENERATE TASKS ===
  const generateTasks = useCallback(async (requestId: string) => {
    const req = requests.find(r => r.id === requestId) || detail;
    if (!req || !user?.id) return;

    const tasksByType: Record<string, string[]> = {
      employee_registration: ['Crear ficha de empleado', 'Generar contrato', 'Iniciar checklist onboarding'],
      contract_modification: ['Actualizar contrato vigente', 'Notificar a nóminas'],
      schedule_change: ['Actualizar jornada en contrato', 'Recalcular nómina'],
      salary_change: ['Actualizar salario en ficha', 'Recalcular nómina'],
      termination: ['Iniciar offboarding', 'Calcular finiquito', 'Tramitar baja'],
      settlement: ['Calcular finiquito', 'Generar documento finiquito'],
      sick_leave: ['Registrar incidencia de baja', 'Calcular complemento IT'],
      work_accident: ['Registrar incidencia', 'Crear parte de accidente', 'Iniciar investigación'],
      company_certificate: ['Generar certificado desde plantilla'],
    };

    const tasks = tasksByType[req.request_type] || [];
    if (tasks.length === 0) return;

    try {
      for (const title of tasks) {
        await supabase.from('hr_tasks').insert([{
          company_id: companyId,
          employee_id: req.employee_id,
          title,
          description: `Tarea generada automáticamente desde solicitud ${req.reference_number || req.id}`,
          status: 'pending',
          priority: req.priority,
          category: 'admin_request',
          metadata: { source_request_id: req.id, request_type: req.request_type },
        }] as any);
      }

      await supabase.from('hr_admin_request_activity').insert([{
        request_id: requestId,
        action: 'task_generated',
        actor_id: user.id,
        actor_name: 'Sistema',
        metadata: { tasks_count: tasks.length, tasks },
      }] as any);

      toast.success(`${tasks.length} tareas generadas`);
      if (detail?.id === requestId) await fetchDetail(requestId);
    } catch (err) {
      console.error('[useAdminPortal] generateTasks:', err);
      toast.error('Error al generar tareas');
    }
  }, [requests, detail, companyId, user, fetchDetail]);

  // === STATS ===
  const stats = {
    total: requests.length,
    draft: requests.filter(r => r.status === 'draft').length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    reviewing: requests.filter(r => r.status === 'reviewing').length,
    pending_approval: requests.filter(r => r.status === 'pending_approval').length,
    approved: requests.filter(r => r.status === 'approved').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  // === INITIAL FETCH ===
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // === REALTIME ===
  useEffect(() => {
    const channel = supabase
      .channel('hr-admin-portal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_admin_requests', filter: `company_id=eq.${companyId}` }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchRequests]);

  return {
    requests, loading, detail, comments, activity, stats,
    fetchRequests, createRequest, updateStatus, assignRequest,
    addComment, fetchDetail, generateTasks, setDetail,
  };
}
