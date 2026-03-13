/**
 * useAdminPortal — CRUD hook for HR Admin Portal (requests, comments, activity)
 * V2-ES.2 Paso 2: Workflow engine integration for admin requests
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// === WORKFLOW MAPPING ===
// Maps admin request types to workflow process_types for the engine
const REQUEST_TYPE_TO_PROCESS: Record<string, string> = {
  employee_registration: 'admin_employee_registration',
  contract_modification: 'admin_contract_modification',
  schedule_change: 'admin_schedule_change',
  salary_change: 'admin_salary_change',
  termination: 'admin_termination',
  settlement: 'admin_settlement',
  sick_leave: 'admin_sick_leave',
  work_accident: 'admin_work_accident',
  vacation: 'admin_vacation',
  unpaid_leave: 'admin_unpaid_leave',
  birth_leave: 'admin_birth_leave',
  company_certificate: 'admin_company_certificate',
  document_submission: 'admin_document_submission',
  monthly_incidents: 'admin_monthly_incidents',
};

// Statuses that are considered "operational" and should trigger a workflow
const WORKFLOW_TRIGGER_STATUSES: AdminRequestStatus[] = ['submitted', 'pending_approval'];

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
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);

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

  // === START WORKFLOW (idempotent, only for operational statuses) ===
  const startWorkflowForRequest = useCallback(async (request: AdminRequest) => {
    const status = request.status as AdminRequestStatus;
    if (!WORKFLOW_TRIGGER_STATUSES.includes(status)) {
      console.log(`[useAdminPortal] Skipping workflow for status=${status} (not operational)`);
      return null;
    }

    const processType = REQUEST_TYPE_TO_PROCESS[request.request_type];
    if (!processType) {
      console.log(`[useAdminPortal] No process_type mapped for request_type=${request.request_type}`);
      return null;
    }

    try {
      // Idempotency: check for existing active instance
      const { data: existing } = await supabase
        .from('erp_hr_workflow_instances')
        .select('id, status')
        .eq('entity_type', 'admin_request')
        .eq('entity_id', request.id)
        .in('status', ['in_progress', 'pending'])
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[useAdminPortal] Active workflow already exists for admin_request ${request.id}: ${existing[0].id}`);
        return existing[0];
      }

      // Start workflow via engine
      const { data: fnData, error: fnError } = await supabase.functions.invoke('erp-hr-workflow-engine', {
        body: {
          action: 'start_workflow',
          params: {
            company_id: request.company_id,
            process_type: processType,
            entity_type: 'admin_request',
            entity_id: request.id,
            entity_summary: `${request.subject} (${request.reference_number || request.id})`,
            priority: request.priority,
          }
        }
      });

      if (fnError) throw fnError;
      if (!fnData?.success) throw new Error(fnData?.error || 'Workflow start failed');

      // Link workflow_instance_id to request (best-effort)
      await supabase.from('hr_admin_requests')
        .update({ workflow_instance_id: fnData.data.id } as any)
        .eq('id', request.id);

      // Log activity
      await supabase.from('hr_admin_request_activity').insert([{
        request_id: request.id,
        action: 'workflow_started',
        actor_id: user?.id,
        actor_name: 'Sistema',
        metadata: { workflow_instance_id: fnData.data.id, process_type: processType },
      }] as any);

      console.log(`[useAdminPortal] Workflow started for admin_request ${request.id}: ${fnData.data.id}`);
      return fnData.data;
    } catch (err) {
      console.warn('[useAdminPortal] startWorkflowForRequest failed (non-blocking):', err);
      return null;
    }
  }, [user]);

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
      const finalStatus = data.status || 'submitted';
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
          status: finalStatus,
          metadata: data.metadata || {},
          attachments: data.attachments || [],
          reference_number: ref,
        }] as any)
        .select()
        .single();

      if (error) throw error;
      const newRequest = row as AdminRequest;

      // Log activity
      await supabase.from('hr_admin_request_activity').insert([{
        request_id: newRequest.id,
        action: 'created',
        actor_id: user.id,
        actor_name: user.email || 'Usuario',
        new_value: finalStatus,
        metadata: { request_type: data.request_type, reference: ref },
      }] as any);

      // V2-ES.2 Paso 2: Start workflow only if status is operational (not draft)
      if (WORKFLOW_TRIGGER_STATUSES.includes(finalStatus as AdminRequestStatus)) {
        await startWorkflowForRequest(newRequest);
      }

      toast.success(`Solicitud ${ref} creada`);
      await fetchRequests();
      return newRequest;
    } catch (err) {
      console.error('[useAdminPortal] createRequest:', err);
      toast.error('Error al crear solicitud');
      return null;
    }
  }, [companyId, user, fetchRequests, startWorkflowForRequest]);

  // === V2-ES.2 Paso 4: SYNC TASKS FROM DECISION ===
  const DECISION_TO_TASK_STATUS: Record<string, string> = {
    approved: 'in_progress',
    rejected: 'cancelled',
    returned: 'on_hold',
  };

  const syncTasksFromDecision = useCallback(async (requestId: string, decision: string) => {
    const targetStatus = DECISION_TO_TASK_STATUS[decision];
    if (!targetStatus) return;

    try {
      // Only update tasks that are linked and in transitional states (not completed/cancelled)
      const { data: linkedTasks, error: fetchErr } = await supabase
        .from('hr_tasks')
        .select('id, status')
        .eq('related_entity_type', 'admin_request')
        .eq('related_entity_id', requestId)
        .in('status', ['pending', 'in_progress']);

      if (fetchErr) throw fetchErr;
      if (!linkedTasks || linkedTasks.length === 0) return;

      const ids = linkedTasks.map(t => t.id);
      const { error: updateErr } = await supabase
        .from('hr_tasks')
        .update({ status: targetStatus, updated_at: new Date().toISOString() } as any)
        .in('id', ids);

      if (updateErr) throw updateErr;

      console.log(`[useAdminPortal] Paso 4: Synced ${ids.length} tasks to '${targetStatus}' for request ${requestId}`);
    } catch (err) {
      console.warn(`[useAdminPortal] syncTasksFromDecision failed (non-blocking) for request ${requestId}:`, err);
    }
  }, []);

  // === UPDATE STATUS ===
  const updateStatus = useCallback(async (id: string, newStatus: AdminRequestStatus, comment?: string) => {
    if (!user?.id) return false;
    try {
      const req = requests.find(r => r.id === id) || detail;
      const oldStatus = (req?.status || 'unknown') as string;

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

      // V2-ES.2 Paso 2: If transitioning from draft to operational, start workflow
      if (!WORKFLOW_TRIGGER_STATUSES.includes(oldStatus as AdminRequestStatus) &&
          WORKFLOW_TRIGGER_STATUSES.includes(newStatus)) {
        const updatedReq = req ? { ...req, status: newStatus } : null;
        if (updatedReq) {
          await startWorkflowForRequest(updatedReq as AdminRequest);
        }
      }

      // V2-ES.2 Paso 2: Best-effort sync to workflow engine if active instance exists
      if (req?.workflow_instance_id && ['approved', 'rejected', 'returned'].includes(newStatus)) {
        const decisionMap: Record<string, string> = { approved: 'approved', rejected: 'rejected', returned: 'returned' };
        try {
          await supabase.functions.invoke('erp-hr-workflow-engine', {
            body: {
              action: 'decide_step',
              params: {
                instance_id: req.workflow_instance_id,
                decision: decisionMap[newStatus] || newStatus,
                comment: comment || `Status changed to ${newStatus} from Admin Portal`,
              }
            }
          });
        } catch (syncErr) {
          console.warn('[useAdminPortal] Workflow sync failed (non-blocking):', syncErr);
        }
      }

      // V2-ES.2 Paso 4: Sync linked tasks based on decision
      await syncTasksFromDecision(id, newStatus);

      toast.success(`Estado actualizado a ${newStatus}`);
      await fetchRequests();
      if (detail?.id === id) await fetchDetail(id);
      return true;
    } catch (err) {
      console.error('[useAdminPortal] updateStatus:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [user, requests, detail, fetchRequests, startWorkflowForRequest]);

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
          // V2-ES.2 Paso 3: Structured traceability fields
          source_type: 'admin_request',
          source_id: req.id,
          related_entity_type: 'admin_request',
          related_entity_id: req.id,
          ...(req.workflow_instance_id ? { workflow_instance_id: req.workflow_instance_id } : {}),
          metadata: { source_request_id: req.id, request_type: req.request_type, reference_number: req.reference_number },
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
