import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { WorkflowExecution } from './useCRMWorkflows';

// === TYPES ===
export interface ExecutionContext {
  entityType?: string;
  entityId?: string;
  triggerData?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  status: string;
  stepsExecuted: number;
  error?: string;
}

// === HOOK ===
export function useCRMWorkflowExecutor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);

  // === START EXECUTION ===
  const startExecution = useMutation({
    mutationFn: async ({ workflowId, context }: { workflowId: string; context?: ExecutionContext }): Promise<ExecutionResult> => {
      // Create execution record
      const { data: execution, error: createError } = await supabase
        .from('crm_workflow_executions')
        .insert({
          workflow_id: workflowId,
          status: 'running',
          trigger_data: JSON.parse(JSON.stringify(context?.triggerData || {})),
          context_data: JSON.parse(JSON.stringify(context?.variables || {})),
          executed_by: user?.id,
          entity_type: context?.entityType,
          entity_id: context?.entityId
        } as any)
        .select()
        .single();

      if (createError) throw createError;

      setCurrentExecution(execution as unknown as WorkflowExecution);

      // Call edge function to execute workflow
      const { data, error } = await supabase.functions.invoke('crm-workflow-executor', {
        body: {
          action: 'execute',
          executionId: execution.id,
          workflowId,
          context
        }
      });

      if (error) {
        // Mark execution as failed
        await supabase
          .from('crm_workflow_executions')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        throw error;
      }

      return {
        success: data?.success || false,
        executionId: execution.id,
        status: data?.status || 'completed',
        stepsExecuted: data?.stepsExecuted || 0,
        error: data?.error
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflow-executions'] });
      if (result.success) {
        toast.success(`Workflow ejecutado (${result.stepsExecuted} pasos)`);
      } else {
        toast.warning('Workflow completado con advertencias');
      }
    },
    onError: (err) => {
      console.error('[useCRMWorkflowExecutor] startExecution error:', err);
      toast.error('Error al ejecutar workflow');
    }
  });

  // === PAUSE EXECUTION ===
  const pauseExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from('crm_workflow_executions')
        .update({ status: 'paused' })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflow-executions'] });
      toast.success('Ejecución pausada');
    }
  });

  // === RESUME EXECUTION ===
  const resumeExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke('crm-workflow-executor', {
        body: {
          action: 'resume',
          executionId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflow-executions'] });
      toast.success('Ejecución reanudada');
    }
  });

  // === CANCEL EXECUTION ===
  const cancelExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from('crm_workflow_executions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflow-executions'] });
      toast.success('Ejecución cancelada');
    }
  });

  // === RETRY FAILED EXECUTION ===
  const retryExecution = useCallback(async (executionId: string) => {
    // Get original execution
    const { data: originalExecution, error } = await supabase
      .from('crm_workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (error || !originalExecution) {
      toast.error('No se encontró la ejecución');
      return;
    }

    const exec = originalExecution as unknown as WorkflowExecution;

    // Start new execution with same context
    return startExecution.mutateAsync({
      workflowId: exec.workflow_id,
      context: {
        triggerData: exec.trigger_data,
        variables: exec.context_data,
        entityType: exec.entity_type || undefined,
        entityId: exec.entity_id || undefined
      }
    });
  }, [startExecution]);

  return {
    currentExecution,
    isExecuting: startExecution.isPending,
    // Actions
    executeWorkflow: startExecution.mutateAsync,
    pauseExecution: pauseExecution.mutateAsync,
    resumeExecution: resumeExecution.mutateAsync,
    cancelExecution: cancelExecution.mutateAsync,
    retryExecution
  };
}
