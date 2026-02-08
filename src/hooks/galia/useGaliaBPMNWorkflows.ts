/**
 * useGaliaBPMNWorkflows - Hook para flujos No-Code BPMN en GALIA
 * Gestión visual de workflows para automatización de expedientes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BPMNNode, BPMNEdge, BPMNNodeType, ProcessDefinition } from '@/types/bpmn';

// === INTERFACES ===
export interface GaliaWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'expediente' | 'convocatoria' | 'pago' | 'auditoria' | 'notificacion';
  nodes: BPMNNode[];
  edges: BPMNEdge[];
  icon: string;
  estimatedDuration: string;
}

export interface GaliaWorkflow {
  id: string;
  name: string;
  description?: string;
  entity_type: 'expediente' | 'convocatoria' | 'pago' | 'beneficiario';
  nodes: BPMNNode[];
  edges: BPMNEdge[];
  is_active: boolean;
  trigger_conditions: {
    onStatusChange?: string[];
    onDocumentUpload?: boolean;
    onDeadlineApproach?: number; // days before
    manual?: boolean;
    scheduled?: string; // cron
  };
  sla_config: Record<string, { maxDuration: number; warningAt: number }>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  entity_id: string;
  entity_type: string;
  current_node_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  started_at: string;
  completed_at?: string;
  variables: Record<string, unknown>;
  history: Array<{
    nodeId: string;
    nodeName: string;
    enteredAt: string;
    exitedAt?: string;
    actorId?: string;
  }>;
}

export interface WorkflowSuggestion {
  type: 'optimization' | 'automation' | 'compliance';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestedNodes?: Partial<BPMNNode>[];
}

export interface GaliaWorkflowContext {
  galId?: string;
  expedienteId?: string;
  workflowId?: string;
}

// === TEMPLATES PREDEFINIDOS ===
const WORKFLOW_TEMPLATES: GaliaWorkflowTemplate[] = [
  {
    id: 'tpl-instruccion-expediente',
    name: 'Instrucción de Expediente',
    description: 'Flujo completo desde recepción hasta resolución',
    category: 'expediente',
    icon: 'FileCheck',
    estimatedDuration: '15-30 días',
    nodes: [
      { id: 'start', type: 'start', label: 'Solicitud Recibida', position: { x: 50, y: 150 } },
      { id: 'validacion', type: 'task', label: 'Validación Documental', position: { x: 200, y: 150 }, config: { sla_hours: 48 } },
      { id: 'gw-docs', type: 'gateway_xor', label: '¿Documentación completa?', position: { x: 380, y: 150 } },
      { id: 'subsanacion', type: 'task', label: 'Requerimiento Subsanación', position: { x: 380, y: 280 }, config: { sla_hours: 240 } },
      { id: 'evaluacion', type: 'task', label: 'Evaluación Técnica', position: { x: 550, y: 150 }, config: { sla_hours: 120 } },
      { id: 'gw-viable', type: 'gateway_xor', label: '¿Proyecto viable?', position: { x: 720, y: 150 } },
      { id: 'propuesta', type: 'task', label: 'Propuesta Resolución', position: { x: 890, y: 150 }, config: { sla_hours: 72 } },
      { id: 'denegacion', type: 'task', label: 'Propuesta Denegación', position: { x: 720, y: 280 }, config: { sla_hours: 72 } },
      { id: 'end-ok', type: 'end', label: 'Expediente Resuelto', position: { x: 1060, y: 150 } },
      { id: 'end-ko', type: 'end', label: 'Expediente Denegado', position: { x: 890, y: 280 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'validacion' },
      { id: 'e2', source: 'validacion', target: 'gw-docs' },
      { id: 'e3', source: 'gw-docs', target: 'evaluacion', label: 'Sí', condition: 'docs_complete === true' },
      { id: 'e4', source: 'gw-docs', target: 'subsanacion', label: 'No', condition: 'docs_complete === false' },
      { id: 'e5', source: 'subsanacion', target: 'validacion' },
      { id: 'e6', source: 'evaluacion', target: 'gw-viable' },
      { id: 'e7', source: 'gw-viable', target: 'propuesta', label: 'Sí', condition: 'viable === true' },
      { id: 'e8', source: 'gw-viable', target: 'denegacion', label: 'No', condition: 'viable === false' },
      { id: 'e9', source: 'propuesta', target: 'end-ok' },
      { id: 'e10', source: 'denegacion', target: 'end-ko' },
    ],
  },
  {
    id: 'tpl-justificacion-pago',
    name: 'Justificación y Pago',
    description: 'Proceso de justificación de gastos y liberación de pagos',
    category: 'pago',
    icon: 'Banknote',
    estimatedDuration: '10-20 días',
    nodes: [
      { id: 'start', type: 'start', label: 'Solicitud Pago', position: { x: 50, y: 150 } },
      { id: 'recepcion', type: 'task', label: 'Recepción Justificantes', position: { x: 200, y: 150 }, config: { sla_hours: 24 } },
      { id: 'verificacion', type: 'task', label: 'Verificación Facturas', position: { x: 380, y: 150 }, config: { sla_hours: 72 } },
      { id: 'gw-ok', type: 'gateway_xor', label: '¿Gastos elegibles?', position: { x: 550, y: 150 } },
      { id: 'calculo', type: 'task', label: 'Cálculo Subvención', position: { x: 720, y: 150 }, config: { sla_hours: 48 } },
      { id: 'subsanar', type: 'task', label: 'Subsanación Gastos', position: { x: 550, y: 280 }, config: { sla_hours: 240 } },
      { id: 'autorizacion', type: 'task', label: 'Autorización Pago', position: { x: 890, y: 150 }, config: { sla_hours: 24 } },
      { id: 'end', type: 'end', label: 'Pago Ordenado', position: { x: 1060, y: 150 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'recepcion' },
      { id: 'e2', source: 'recepcion', target: 'verificacion' },
      { id: 'e3', source: 'verificacion', target: 'gw-ok' },
      { id: 'e4', source: 'gw-ok', target: 'calculo', label: 'Sí' },
      { id: 'e5', source: 'gw-ok', target: 'subsanar', label: 'No' },
      { id: 'e6', source: 'subsanar', target: 'verificacion' },
      { id: 'e7', source: 'calculo', target: 'autorizacion' },
      { id: 'e8', source: 'autorizacion', target: 'end' },
    ],
  },
  {
    id: 'tpl-alerta-plazo',
    name: 'Alerta de Plazos',
    description: 'Notificaciones automáticas por vencimiento de plazos',
    category: 'notificacion',
    icon: 'Bell',
    estimatedDuration: 'Automático',
    nodes: [
      { id: 'start', type: 'start', label: 'Plazo Próximo', position: { x: 50, y: 150 } },
      { id: 'check', type: 'task', label: 'Verificar Días Restantes', position: { x: 200, y: 150 } },
      { id: 'gw-dias', type: 'gateway_xor', label: 'Días restantes', position: { x: 380, y: 150 } },
      { id: 'notif-7', type: 'task', label: 'Notificación 7 días', position: { x: 550, y: 80 } },
      { id: 'notif-3', type: 'task', label: 'Notificación 3 días', position: { x: 550, y: 150 } },
      { id: 'notif-1', type: 'task', label: 'Alerta Urgente', position: { x: 550, y: 220 } },
      { id: 'escalar', type: 'task', label: 'Escalar a Supervisor', position: { x: 550, y: 290 } },
      { id: 'merge', type: 'gateway_or', label: 'Continuar', position: { x: 720, y: 150 } },
      { id: 'end', type: 'end', label: 'Notificado', position: { x: 890, y: 150 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'check' },
      { id: 'e2', source: 'check', target: 'gw-dias' },
      { id: 'e3', source: 'gw-dias', target: 'notif-7', label: '7 días' },
      { id: 'e4', source: 'gw-dias', target: 'notif-3', label: '3 días' },
      { id: 'e5', source: 'gw-dias', target: 'notif-1', label: '1 día' },
      { id: 'e6', source: 'gw-dias', target: 'escalar', label: 'Vencido' },
      { id: 'e7', source: 'notif-7', target: 'merge' },
      { id: 'e8', source: 'notif-3', target: 'merge' },
      { id: 'e9', source: 'notif-1', target: 'merge' },
      { id: 'e10', source: 'escalar', target: 'merge' },
      { id: 'e11', source: 'merge', target: 'end' },
    ],
  },
];

// === HOOK ===
export function useGaliaBPMNWorkflows() {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [workflows, setWorkflows] = useState<GaliaWorkflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [templates] = useState<GaliaWorkflowTemplate[]>(WORKFLOW_TEMPLATES);
  const [suggestions, setSuggestions] = useState<WorkflowSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Auto-refresh
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH WORKFLOWS ===
  const fetchWorkflows = useCallback(async (context?: GaliaWorkflowContext) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-bpmn-workflows',
        {
          body: {
            action: 'list_workflows',
            context,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setWorkflows(data.workflows || []);
        setLastRefresh(new Date());
        return data.workflows;
      }

      throw new Error(data?.error || 'Error al cargar workflows');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaBPMNWorkflows] fetchWorkflows error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE WORKFLOW ===
  const createWorkflow = useCallback(async (
    workflow: Omit<GaliaWorkflow, 'id' | 'created_at' | 'updated_at'>
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-bpmn-workflows',
        {
          body: {
            action: 'create_workflow',
            workflow,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Workflow creado correctamente');
        setWorkflows(prev => [data.workflow, ...prev]);
        return data.workflow;
      }

      throw new Error(data?.error || 'Error al crear workflow');
    } catch (err) {
      console.error('[useGaliaBPMNWorkflows] createWorkflow error:', err);
      toast.error('Error al crear workflow');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === UPDATE WORKFLOW ===
  const updateWorkflow = useCallback(async (
    workflowId: string,
    updates: Partial<GaliaWorkflow>
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-bpmn-workflows',
        {
          body: {
            action: 'update_workflow',
            workflowId,
            updates,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Workflow actualizado');
        setWorkflows(prev => 
          prev.map(w => w.id === workflowId ? { ...w, ...updates } : w)
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useGaliaBPMNWorkflows] updateWorkflow error:', err);
      toast.error('Error al actualizar workflow');
      return false;
    }
  }, []);

  // === EXECUTE WORKFLOW ===
  const executeWorkflow = useCallback(async (
    workflowId: string,
    entityId: string,
    entityType: string,
    variables?: Record<string, unknown>
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-bpmn-workflows',
        {
          body: {
            action: 'execute_workflow',
            workflowId,
            entityId,
            entityType,
            variables,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Workflow iniciado');
        if (data.execution) {
          setExecutions(prev => [data.execution, ...prev]);
        }
        return data.execution;
      }

      throw new Error(data?.error || 'Error al ejecutar workflow');
    } catch (err) {
      console.error('[useGaliaBPMNWorkflows] executeWorkflow error:', err);
      toast.error('Error al ejecutar workflow');
      return null;
    }
  }, []);

  // === GET AI SUGGESTIONS ===
  const getAISuggestions = useCallback(async (
    nodes: BPMNNode[],
    edges: BPMNEdge[],
    entityType: string
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-bpmn-workflows',
        {
          body: {
            action: 'get_suggestions',
            nodes,
            edges,
            entityType,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data.suggestions) {
        setSuggestions(data.suggestions);
        return data.suggestions;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaBPMNWorkflows] getAISuggestions error:', err);
      return [];
    }
  }, []);

  // === CREATE FROM TEMPLATE ===
  const createFromTemplate = useCallback((templateId: string): GaliaWorkflowTemplate | null => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;

    // Deep clone template
    return JSON.parse(JSON.stringify(template));
  }, [templates]);

  // === VALIDATE WORKFLOW ===
  const validateWorkflow = useCallback((nodes: BPMNNode[], edges: BPMNEdge[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for start node
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('El workflow debe tener un nodo de inicio');
    } else if (startNodes.length > 1) {
      errors.push('El workflow solo puede tener un nodo de inicio');
    }

    // Check for end node
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('El workflow debe tener al menos un nodo de fin');
    }

    // Check for orphan nodes
    const connectedNodes = new Set<string>();
    edges.forEach(e => {
      connectedNodes.add(e.source);
      connectedNodes.add(e.target);
    });
    
    nodes.forEach(n => {
      if (!connectedNodes.has(n.id) && n.type !== 'start' && n.type !== 'end') {
        warnings.push(`El nodo "${n.label}" no está conectado`);
      }
    });

    // Check gateway outputs
    const gateways = nodes.filter(n => n.type.startsWith('gateway'));
    gateways.forEach(gw => {
      const outputs = edges.filter(e => e.source === gw.id);
      if (outputs.length < 2) {
        warnings.push(`El gateway "${gw.label}" debería tener múltiples salidas`);
      }
    });

    // Check SLA configuration
    const tasksWithoutSLA = nodes.filter(
      n => n.type === 'task' && !n.config?.sla_hours
    );
    if (tasksWithoutSLA.length > 0) {
      warnings.push(`${tasksWithoutSLA.length} tareas sin SLA configurado`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  // === FETCH EXECUTIONS ===
  const fetchExecutions = useCallback(async (workflowId?: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-bpmn-workflows',
        {
          body: {
            action: 'list_executions',
            workflowId,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        setExecutions(data.executions || []);
        return data.executions;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaBPMNWorkflows] fetchExecutions error:', err);
      return [];
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((context: GaliaWorkflowContext, intervalMs = 60000) => {
    stopAutoRefresh();
    fetchWorkflows(context);
    autoRefreshInterval.current = setInterval(() => {
      fetchWorkflows(context);
    }, intervalMs);
  }, [fetchWorkflows]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  return {
    // State
    isLoading,
    workflows,
    executions,
    templates,
    suggestions,
    error,
    lastRefresh,
    // Actions
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    executeWorkflow,
    getAISuggestions,
    createFromTemplate,
    validateWorkflow,
    fetchExecutions,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useGaliaBPMNWorkflows;
