/**
 * useHRWorkflowEngine - Hook para el motor de workflows HR
 * Fase 2: Aprobaciones multinivel, SLA, delegación, bandeja de tareas
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowDefinition {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  process_type: string;
  version: number;
  trigger_conditions?: Record<string, unknown>;
  is_active: boolean;
  created_by?: string;
  erp_hr_workflow_steps?: WorkflowStep[];
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  definition_id: string;
  step_order: number;
  name: string;
  description?: string;
  step_type: string;
  approver_role?: string;
  approver_user_id?: string;
  sla_hours: number;
  escalation_hours?: number;
  escalation_to_role?: string;
  delegation_enabled: boolean;
  comments_required: boolean;
  conditions?: Record<string, unknown>;
  auto_approve_conditions?: Record<string, unknown>;
}

export interface WorkflowInstance {
  id: string;
  company_id: string;
  definition_id: string;
  entity_type: string;
  entity_id: string;
  entity_summary?: string;
  current_step_id?: string;
  current_step_order: number;
  status: string;
  priority: string;
  started_by: string;
  started_at: string;
  completed_at?: string;
  erp_hr_workflow_definitions?: { name: string; process_type: string };
  erp_hr_workflow_steps?: WorkflowStep;
  erp_hr_workflow_decisions?: WorkflowDecision[];
  erp_hr_workflow_sla_tracking?: SLATracking[];
  created_at: string;
}

export interface WorkflowDecision {
  id: string;
  instance_id: string;
  step_id: string;
  decision: string;
  decided_by: string;
  comment?: string;
  decision_time_seconds?: number;
  decided_at: string;
}

export interface SLATracking {
  id: string;
  instance_id: string;
  step_id: string;
  assigned_to?: string;
  assigned_role?: string;
  due_at: string;
  escalation_at?: string;
  completed_at?: string;
  breached: boolean;
  escalated: boolean;
  is_overdue?: boolean;
  is_near_breach?: boolean;
  hours_remaining?: number;
  erp_hr_workflow_instances?: any;
  erp_hr_workflow_steps?: any;
}

export interface WorkflowStats {
  total: number;
  in_progress: number;
  approved: number;
  rejected: number;
  sla_breached: number;
}

export function useHRWorkflowEngine() {
  const [loading, setLoading] = useState(false);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [inbox, setInbox] = useState<WorkflowInstance[]>([]);
  const [slaItems, setSlaItems] = useState<SLATracking[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-workflow-engine', {
      body: { action, params }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data.data;
  }, []);

  const fetchDefinitions = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_definitions', { company_id: companyId });
      setDefinitions(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando definiciones'); }
    finally { setLoading(false); }
  }, [invoke]);

  const saveDefinition = useCallback(async (def: Record<string, unknown>) => {
    try {
      await invoke('upsert_definition', def);
      toast.success('Workflow guardado');
      if (def.company_id) await fetchDefinitions(def.company_id as string);
    } catch (e) { console.error(e); toast.error('Error guardando workflow'); }
  }, [invoke, fetchDefinitions]);

  const startWorkflow = useCallback(async (params: { company_id: string; process_type: string; entity_type: string; entity_id: string; entity_summary?: string; priority?: string }) => {
    try {
      const data = await invoke('start_workflow', params);
      toast.success('Workflow iniciado');
      return data;
    } catch (e: any) { console.error(e); toast.error(e.message || 'Error iniciando workflow'); return null; }
  }, [invoke]);

  const decideStep = useCallback(async (instanceId: string, decision: string, comment?: string) => {
    try {
      await invoke('decide_step', { instance_id: instanceId, decision, comment });
      toast.success(decision === 'approved' ? 'Aprobado' : decision === 'rejected' ? 'Rechazado' : 'Decisión registrada');
    } catch (e) { console.error(e); toast.error('Error al decidir'); }
  }, [invoke]);

  const fetchInbox = useCallback(async (companyId: string, statusFilter?: string) => {
    setLoading(true);
    try {
      const data = await invoke('get_inbox', { company_id: companyId, status_filter: statusFilter || 'all' });
      setInbox(data || []);
    } catch (e) { console.error(e); toast.error('Error cargando bandeja'); }
    finally { setLoading(false); }
  }, [invoke]);

  const fetchSLAStatus = useCallback(async (companyId: string) => {
    try {
      const data = await invoke('get_sla_status', { company_id: companyId });
      setSlaItems(data || []);
    } catch (e) { console.error(e); }
  }, [invoke]);

  const fetchStats = useCallback(async (companyId: string) => {
    try {
      const data = await invoke('get_workflow_stats', { company_id: companyId });
      setStats(data);
    } catch (e) { console.error(e); }
  }, [invoke]);

  const seedWorkflows = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('seed_workflows', { company_id: companyId });
      toast.success(`${data.definitions} workflows creados con ${data.steps} pasos`);
      await fetchDefinitions(companyId);
      return data;
    } catch (e) { console.error(e); toast.error('Error generando workflows'); return null; }
    finally { setLoading(false); }
  }, [invoke, fetchDefinitions]);

  // Realtime for inbox updates
  useEffect(() => {
    const channel = supabase
      .channel('hr-workflow-instances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_workflow_instances' }, () => {
        // Refresh will be triggered by component
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    loading, definitions, inbox, slaItems, stats,
    fetchDefinitions, saveDefinition, startWorkflow, decideStep,
    fetchInbox, fetchSLAStatus, fetchStats, seedWorkflows,
  };
}
