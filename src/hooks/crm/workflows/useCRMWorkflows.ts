import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// === TYPES ===
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type TriggerType = 'manual' | 'event' | 'schedule' | 'condition' | 'webhook';
export type NodeType = 'trigger' | 'action' | 'condition' | 'delay' | 'split' | 'merge' | 'end';

export interface CRMWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  is_template: boolean;
  template_category: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: NodeType;
  node_subtype: string | null;
  name: string;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowConnection {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string;
  target_handle: string;
  condition_label: string | null;
  created_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  trigger_data: Record<string, unknown>;
  context_data: Record<string, unknown>;
  current_node_id: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  executed_by: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  workflow_data: Record<string, unknown>;
  use_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// === HOOK ===
export function useCRMWorkflows() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedWorkflow, setSelectedWorkflow] = useState<CRMWorkflow | null>(null);

  // === FETCH WORKFLOWS ===
  const { data: workflows = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_workflows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as unknown) as CRMWorkflow[];
    }
  });

  // === FETCH TEMPLATES ===
  const { data: templates = [] } = useQuery({
    queryKey: ['crm-workflow-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_workflow_templates')
        .select('*')
        .order('use_count', { ascending: false });

      if (error) throw error;
      return (data as unknown) as WorkflowTemplate[];
    }
  });

  // === FETCH EXECUTIONS ===
  const { data: executions = [] } = useQuery({
    queryKey: ['crm-workflow-executions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_workflow_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as unknown) as WorkflowExecution[];
    }
  });

  // === CREATE WORKFLOW ===
  const createWorkflow = useMutation({
    mutationFn: async (workflow: Omit<CRMWorkflow, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
      const { data, error } = await supabase
        .from('crm_workflows')
        .insert({
          ...workflow,
          created_by: user?.id,
          trigger_config: JSON.parse(JSON.stringify(workflow.trigger_config || {}))
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CRMWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflows'] });
      toast.success('Workflow creado');
    },
    onError: (err) => {
      console.error('[useCRMWorkflows] createWorkflow error:', err);
      toast.error('Error al crear workflow');
    }
  });

  // === UPDATE WORKFLOW ===
  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMWorkflow> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.trigger_config) {
        updateData.trigger_config = JSON.parse(JSON.stringify(updates.trigger_config));
      }

      const { error } = await supabase
        .from('crm_workflows')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflows'] });
      toast.success('Workflow actualizado');
    },
    onError: (err) => {
      console.error('[useCRMWorkflows] updateWorkflow error:', err);
      toast.error('Error al actualizar workflow');
    }
  });

  // === DELETE WORKFLOW ===
  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflows'] });
      toast.success('Workflow eliminado');
    },
    onError: (err) => {
      console.error('[useCRMWorkflows] deleteWorkflow error:', err);
      toast.error('Error al eliminar workflow');
    }
  });

  // === TOGGLE STATUS ===
  const toggleWorkflowStatus = useCallback(async (id: string, newStatus: WorkflowStatus) => {
    await updateWorkflow.mutateAsync({ id, status: newStatus });
  }, [updateWorkflow]);

  // === DUPLICATE WORKFLOW ===
  const duplicateWorkflow = useCallback(async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    await createWorkflow.mutateAsync({
      name: `${workflow.name} (copia)`,
      description: workflow.description,
      status: 'draft',
      trigger_type: workflow.trigger_type,
      trigger_config: workflow.trigger_config,
      is_template: false,
      template_category: workflow.template_category,
      created_by: user?.id || null
    });
  }, [workflows, createWorkflow, user]);

  // === CREATE FROM TEMPLATE ===
  const createFromTemplate = useCallback(async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Increment use count
    await supabase
      .from('crm_workflow_templates')
      .update({ use_count: (template.use_count || 0) + 1 })
      .eq('id', templateId);

    await createWorkflow.mutateAsync({
      name: template.name,
      description: template.description,
      status: 'draft',
      trigger_type: 'manual',
      trigger_config: {},
      is_template: false,
      template_category: template.category,
      created_by: user?.id || null
    });
  }, [templates, createWorkflow, user]);

  // === STATS ===
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === 'active').length,
    draft: workflows.filter(w => w.status === 'draft').length,
    paused: workflows.filter(w => w.status === 'paused').length,
    totalExecutions: executions.length,
    successfulExecutions: executions.filter(e => e.status === 'completed').length,
    failedExecutions: executions.filter(e => e.status === 'failed').length
  };

  return {
    // Data
    workflows,
    templates,
    executions,
    selectedWorkflow,
    stats,
    isLoading,
    // Actions
    setSelectedWorkflow,
    createWorkflow: createWorkflow.mutateAsync,
    updateWorkflow: updateWorkflow.mutateAsync,
    deleteWorkflow: deleteWorkflow.mutateAsync,
    toggleWorkflowStatus,
    duplicateWorkflow,
    createFromTemplate,
    refetch
  };
}
