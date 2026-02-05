import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { WorkflowNode, WorkflowConnection, NodeType } from './useCRMWorkflows';

// === TYPES ===
export interface NodePosition {
  x: number;
  y: number;
}

export interface BuilderNode extends WorkflowNode {
  selected?: boolean;
}

export interface BuilderConnection extends WorkflowConnection {
  animated?: boolean;
}

// === NODE CONFIGURATIONS ===
export const NODE_TYPES: Record<NodeType, { label: string; icon: string; color: string; subtypes: string[] }> = {
  trigger: {
    label: 'Trigger',
    icon: 'Zap',
    color: 'emerald',
    subtypes: ['lead_created', 'deal_updated', 'contact_created', 'task_completed', 'schedule', 'webhook', 'manual']
  },
  action: {
    label: 'Acción',
    icon: 'Play',
    color: 'blue',
    subtypes: ['send_email', 'send_notification', 'create_task', 'update_record', 'api_call', 'assign_user', 'add_tag']
  },
  condition: {
    label: 'Condición',
    icon: 'GitBranch',
    color: 'amber',
    subtypes: ['field_equals', 'field_contains', 'field_greater', 'field_less', 'custom_formula']
  },
  delay: {
    label: 'Esperar',
    icon: 'Clock',
    color: 'purple',
    subtypes: ['minutes', 'hours', 'days', 'until_date', 'until_event']
  },
  split: {
    label: 'Dividir',
    icon: 'Split',
    color: 'orange',
    subtypes: ['percentage', 'ab_test', 'random']
  },
  merge: {
    label: 'Unir',
    icon: 'Merge',
    color: 'teal',
    subtypes: ['wait_all', 'wait_any']
  },
  end: {
    label: 'Fin',
    icon: 'Flag',
    color: 'red',
    subtypes: ['success', 'failure', 'cancelled']
  }
};

// === HOOK ===
export function useCRMWorkflowBuilder(workflowId: string | null) {
  const queryClient = useQueryClient();
  const [nodes, setNodes] = useState<BuilderNode[]>([]);
  const [connections, setConnections] = useState<BuilderConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // === FETCH NODES ===
  const { data: dbNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['crm-workflow-nodes', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      
      const { data, error } = await supabase
        .from('crm_workflow_nodes')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data as unknown) as WorkflowNode[];
    },
    enabled: !!workflowId
  });

  // === FETCH CONNECTIONS ===
  const { data: dbConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['crm-workflow-connections', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      
      const { data, error } = await supabase
        .from('crm_workflow_connections')
        .select('*')
        .eq('workflow_id', workflowId);

      if (error) throw error;
      return (data as unknown) as WorkflowConnection[];
    },
    enabled: !!workflowId
  });

  // Sync DB data to local state
  useEffect(() => {
    setNodes(dbNodes);
    setConnections(dbConnections);
    setIsDirty(false);
  }, [dbNodes, dbConnections]);

  // === ADD NODE ===
  const addNode = useCallback((type: NodeType, position: NodePosition, subtype?: string) => {
    const newNode: BuilderNode = {
      id: crypto.randomUUID(),
      workflow_id: workflowId || '',
      node_type: type,
      node_subtype: subtype || NODE_TYPES[type].subtypes[0],
      name: `${NODE_TYPES[type].label} ${nodes.length + 1}`,
      config: {},
      position_x: position.x,
      position_y: position.y,
      order_index: nodes.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setNodes(prev => [...prev, newNode]);
    setIsDirty(true);
    return newNode;
  }, [workflowId, nodes]);

  // === UPDATE NODE ===
  const updateNode = useCallback((nodeId: string, updates: Partial<BuilderNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates, updated_at: new Date().toISOString() } : node
    ));
    setIsDirty(true);
  }, []);

  // === DELETE NODE ===
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.source_node_id !== nodeId && c.target_node_id !== nodeId));
    setIsDirty(true);
  }, []);

  // === ADD CONNECTION ===
  const addConnection = useCallback((sourceId: string, targetId: string, sourceHandle = 'default', targetHandle = 'default') => {
    // Prevent duplicate connections
    const exists = connections.some(
      c => c.source_node_id === sourceId && c.target_node_id === targetId
    );
    if (exists) return null;

    const newConnection: BuilderConnection = {
      id: crypto.randomUUID(),
      workflow_id: workflowId || '',
      source_node_id: sourceId,
      target_node_id: targetId,
      source_handle: sourceHandle,
      target_handle: targetHandle,
      condition_label: null,
      created_at: new Date().toISOString()
    };

    setConnections(prev => [...prev, newConnection]);
    setIsDirty(true);
    return newConnection;
  }, [workflowId, connections]);

  // === DELETE CONNECTION ===
  const deleteConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    setIsDirty(true);
  }, []);

  // === SAVE ALL CHANGES ===
  const saveChanges = useMutation({
    mutationFn: async () => {
      if (!workflowId) throw new Error('No workflow selected');

      // Delete existing and insert new nodes
      await supabase
        .from('crm_workflow_nodes')
        .delete()
        .eq('workflow_id', workflowId);

      if (nodes.length > 0) {
        const nodesToInsert = nodes.map(n => ({
          id: n.id,
          workflow_id: workflowId,
          node_type: n.node_type,
          node_subtype: n.node_subtype,
          name: n.name,
          config: JSON.parse(JSON.stringify(n.config || {})),
          position_x: n.position_x,
          position_y: n.position_y,
          order_index: n.order_index
        }));

        const { error: nodesError } = await supabase
          .from('crm_workflow_nodes')
          .insert(nodesToInsert as any);

        if (nodesError) throw nodesError;
      }

      // Delete existing and insert new connections
      await supabase
        .from('crm_workflow_connections')
        .delete()
        .eq('workflow_id', workflowId);

      if (connections.length > 0) {
        const connectionsToInsert = connections.map(c => ({
          id: c.id,
          workflow_id: workflowId,
          source_node_id: c.source_node_id,
          target_node_id: c.target_node_id,
          source_handle: c.source_handle,
          target_handle: c.target_handle,
          condition_label: c.condition_label
        }));

        const { error: connectionsError } = await supabase
          .from('crm_workflow_connections')
          .insert(connectionsToInsert as any);

        if (connectionsError) throw connectionsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workflow-nodes', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['crm-workflow-connections', workflowId] });
      setIsDirty(false);
      toast.success('Workflow guardado');
    },
    onError: (err) => {
      console.error('[useCRMWorkflowBuilder] saveChanges error:', err);
      toast.error('Error al guardar workflow');
    }
  });

  // === VALIDATE WORKFLOW ===
  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];

    // Must have at least one trigger
    const triggers = nodes.filter(n => n.node_type === 'trigger');
    if (triggers.length === 0) {
      errors.push('El workflow debe tener al menos un trigger');
    }

    // Must have at least one action
    const actions = nodes.filter(n => n.node_type === 'action');
    if (actions.length === 0) {
      errors.push('El workflow debe tener al menos una acción');
    }

    // Check for orphan nodes (no connections)
    const connectedNodeIds = new Set([
      ...connections.map(c => c.source_node_id),
      ...connections.map(c => c.target_node_id)
    ]);

    const orphanNodes = nodes.filter(n => 
      n.node_type !== 'trigger' && !connectedNodeIds.has(n.id)
    );
    
    if (orphanNodes.length > 0) {
      errors.push(`Nodos sin conexión: ${orphanNodes.map(n => n.name).join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }, [nodes, connections]);

  // === GET SELECTED NODE ===
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return {
    // Data
    nodes,
    connections,
    selectedNode,
    selectedNodeId,
    isDirty,
    isLoading: nodesLoading || connectionsLoading,
    // Node operations
    addNode,
    updateNode,
    deleteNode,
    setSelectedNodeId,
    // Connection operations
    addConnection,
    deleteConnection,
    // Workflow operations
    saveChanges: saveChanges.mutateAsync,
    isSaving: saveChanges.isPending,
    validateWorkflow,
    // Config
    nodeTypes: NODE_TYPES
  };
}
