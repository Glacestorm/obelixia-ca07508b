/**
 * useHRTasksEngine — Motor unificado de tareas RRHH
 * CRUD, SLA, escalación, acciones masivas, estadísticas
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────
export type TaskCategory = 'admin_request' | 'payroll' | 'mobility' | 'document' | 'compliance' | 'integration' | 'onboarding' | 'offboarding' | 'general';
export type TaskSourceType = 'manual' | 'workflow' | 'admin_request' | 'system' | 'scheduled';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type BulkActionType = 'complete' | 'cancel' | 'reassign' | 'change_priority' | 'escalate';

export interface HRTask {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  task_type: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  assigned_role?: string;
  employee_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  parent_task_id?: string;
  due_date?: string;
  source_type?: TaskSourceType;
  source_id?: string;
  workflow_instance_id?: string;
  contract_id?: string;
  payroll_record_id?: string;
  submission_id?: string;
  assignment_id?: string;
  sla_hours?: number;
  sla_deadline?: string;
  sla_breached: boolean;
  reminder_at?: string;
  escalation_to?: string;
  escalation_at?: string;
  escalated: boolean;
  tags?: string[];
  is_bulk: boolean;
  created_by?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // joined
  subtasks?: HRTask[];
}

export interface TaskFilters {
  category?: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  assigned_role?: string;
  employee_id?: string;
  source_type?: TaskSourceType;
  sla_breached?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  sla_compliance: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  completed_today: number;
}

export interface TaskCreateData {
  company_id: string;
  title: string;
  description?: string;
  task_type?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  assigned_to?: string;
  assigned_role?: string;
  employee_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  parent_task_id?: string;
  due_date?: string;
  source_type?: TaskSourceType;
  source_id?: string;
  workflow_instance_id?: string;
  contract_id?: string;
  payroll_record_id?: string;
  submission_id?: string;
  assignment_id?: string;
  sla_hours?: number;
  escalation_to?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ── Hook ───────────────────────────────────────────────
export function useHRTasksEngine(companyId?: string) {
  const [tasks, setTasks] = useState<HRTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TaskStats | null>(null);

  // ── Fetch tasks ──
  const fetchTasks = useCallback(async (filters?: TaskFilters) => {
    if (!companyId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('hr_tasks')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      if (filters?.assigned_role) query = query.eq('assigned_role', filters.assigned_role);
      if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
      if (filters?.source_type) query = query.eq('source_type', filters.source_type);
      if (filters?.sla_breached) query = query.eq('sla_breached', true);
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`);
      if (filters?.date_from) query = query.gte('created_at', filters.date_from);
      if (filters?.date_to) query = query.lte('created_at', filters.date_to);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      setTasks((data || []) as unknown as HRTask[]);
    } catch (e) {
      console.error('[useHRTasksEngine] fetchTasks:', e);
      toast.error('Error cargando tareas');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // ── Get single task ──
  const getTask = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('hr_tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as HRTask;
  }, []);

  // ── Create task ──
  const createTask = useCallback(async (taskData: TaskCreateData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const sla_deadline = taskData.sla_hours
        ? new Date(Date.now() + taskData.sla_hours * 3600000).toISOString()
        : undefined;

      const { data, error } = await supabase
        .from('hr_tasks')
        .insert({
          ...taskData,
          task_type: taskData.task_type || taskData.category || 'general',
          category: taskData.category || 'general',
          priority: taskData.priority || 'medium',
          status: 'pending',
          sla_deadline,
          created_by: userData.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Tarea creada');
      await fetchTasks();
      return data as unknown as HRTask;
    } catch (e) {
      console.error('[useHRTasksEngine] createTask:', e);
      toast.error('Error creando tarea');
      return null;
    }
  }, [fetchTasks]);

  // ── Update task ──
  const updateTask = useCallback(async (id: string, updates: Partial<HRTask>) => {
    try {
      const { error } = await supabase
        .from('hr_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return true;
    } catch (e) {
      console.error('[useHRTasksEngine] updateTask:', e);
      toast.error('Error actualizando tarea');
      return false;
    }
  }, []);

  // ── Complete task ──
  const completeTask = useCallback(async (id: string) => {
    const ok = await updateTask(id, {
      status: 'completed' as TaskStatus,
      completed_at: new Date().toISOString(),
    });
    if (ok) toast.success('Tarea completada');
    return ok;
  }, [updateTask]);

  // ── Reassign ──
  const reassignTask = useCallback(async (id: string, assignee: string, isRole = false) => {
    const updates = isRole
      ? { assigned_role: assignee, assigned_to: undefined }
      : { assigned_to: assignee, assigned_role: undefined };
    const ok = await updateTask(id, updates as any);
    if (ok) toast.success('Tarea reasignada');
    return ok;
  }, [updateTask]);

  // ── Escalate ──
  const escalateTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task?.escalation_to) {
      toast.error('Sin destino de escalación configurado');
      return false;
    }
    const ok = await updateTask(id, {
      escalated: true,
      escalation_at: new Date().toISOString(),
      assigned_role: task.escalation_to,
      priority: 'urgent' as TaskPriority,
    });
    if (ok) toast.success('Tarea escalada');
    return ok;
  }, [tasks, updateTask]);

  // ── Bulk action ──
  const bulkAction = useCallback(async (taskIds: string[], action: BulkActionType, params?: Record<string, unknown>) => {
    try {
      let updates: Record<string, unknown> = {};
      switch (action) {
        case 'complete':
          updates = { status: 'completed', completed_at: new Date().toISOString() };
          break;
        case 'cancel':
          updates = { status: 'cancelled' };
          break;
        case 'reassign':
          updates = params?.role
            ? { assigned_role: params.role }
            : { assigned_to: params?.assignee };
          break;
        case 'change_priority':
          updates = { priority: params?.priority };
          break;
        case 'escalate':
          updates = { escalated: true, escalation_at: new Date().toISOString(), priority: 'urgent' };
          break;
      }

      const { error } = await supabase
        .from('hr_tasks')
        .update({ ...updates, updated_at: new Date().toISOString(), is_bulk: true } as any)
        .in('id', taskIds);

      if (error) throw error;
      toast.success(`${taskIds.length} tareas actualizadas`);
      await fetchTasks();
      return true;
    } catch (e) {
      console.error('[useHRTasksEngine] bulkAction:', e);
      toast.error('Error en acción masiva');
      return false;
    }
  }, [fetchTasks]);

  // ── SLA checks ──
  const checkSLABreaches = useCallback(async () => {
    if (!companyId) return;
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('hr_tasks')
        .select('id')
        .eq('company_id', companyId)
        .eq('sla_breached', false)
        .not('sla_deadline', 'is', null)
        .lt('sla_deadline', now)
        .in('status', ['pending', 'in_progress']);

      if (error) throw error;
      if (data && data.length > 0) {
        const ids = data.map(d => d.id);
        await supabase
          .from('hr_tasks')
          .update({ sla_breached: true } as any)
          .in('id', ids);
        setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, sla_breached: true } : t));
      }
    } catch (e) {
      console.error('[useHRTasksEngine] checkSLABreaches:', e);
    }
  }, [companyId]);

  // ── Stats ──
  const fetchStats = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('hr_tasks')
        .select('status, priority, category, sla_breached, completed_at, created_at')
        .eq('company_id', companyId);

      if (error) throw error;
      const all = (data || []) as any[];
      const today = new Date().toISOString().slice(0, 10);

      const s: TaskStats = {
        total: all.length,
        pending: all.filter(t => t.status === 'pending').length,
        in_progress: all.filter(t => t.status === 'in_progress').length,
        completed: all.filter(t => t.status === 'completed').length,
        overdue: all.filter(t => t.sla_breached).length,
        sla_compliance: 0,
        by_category: {},
        by_priority: {},
        completed_today: all.filter(t => t.completed_at?.startsWith(today)).length,
      };

      const withSLA = all.filter(t => t.sla_breached !== null && t.sla_breached !== undefined);
      s.sla_compliance = withSLA.length > 0
        ? Math.round((withSLA.filter(t => !t.sla_breached).length / withSLA.length) * 100)
        : 100;

      all.forEach(t => {
        const cat = t.category || 'general';
        s.by_category[cat] = (s.by_category[cat] || 0) + 1;
        s.by_priority[t.priority || 'medium'] = (s.by_priority[t.priority || 'medium'] || 0) + 1;
      });

      setStats(s);
    } catch (e) {
      console.error('[useHRTasksEngine] fetchStats:', e);
    }
  }, [companyId]);

  // ── Realtime ──
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('hr-tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as unknown as HRTask;
          if (n.company_id === companyId) {
            setTasks(prev => [n, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const u = payload.new as unknown as HRTask;
          setTasks(prev => prev.map(t => t.id === u.id ? u : t));
        } else if (payload.eventType === 'DELETE') {
          const d = payload.old as any;
          setTasks(prev => prev.filter(t => t.id !== d.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  return {
    tasks,
    loading,
    stats,
    fetchTasks,
    getTask,
    createTask,
    updateTask,
    completeTask,
    reassignTask,
    escalateTask,
    bulkAction,
    checkSLABreaches,
    fetchStats,
  };
}
