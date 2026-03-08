import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MeshFederation {
  id: string;
  federation_name: string;
  client_id: string | null;
  description: string | null;
  sync_policy: {
    default_strategy: 'lww' | 'merge' | 'manual';
    conflict_threshold: number;
    sync_interval_seconds: number;
  };
  status: string;
  node_count: number;
  total_syncs: number;
  total_conflicts: number;
  last_sync_at: string | null;
  created_at: string;
}

export interface MeshNode {
  id: string;
  federation_id: string;
  installation_id: string | null;
  node_name: string;
  node_role: 'primary' | 'replica' | 'observer';
  connection_status: 'connected' | 'disconnected' | 'syncing' | 'error';
  last_heartbeat: string | null;
  vector_clock: Record<string, number>;
  pending_operations: number;
  sync_latency_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MeshSyncLog {
  id: string;
  federation_id: string;
  origin_node_id: string | null;
  destination_node_id: string | null;
  sync_type: string;
  records_synced: number;
  conflicts_detected: number;
  conflicts_resolved: number;
  duration_ms: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface MeshConflict {
  id: string;
  federation_id: string;
  conflict_type: string;
  data_type: string;
  table_name: string | null;
  record_id: string | null;
  origin_value: Record<string, unknown>;
  destination_value: Record<string, unknown>;
  resolved_value: Record<string, unknown> | null;
  resolution_strategy: string;
  resolved_by: string;
  resolution_status: 'pending' | 'resolved' | 'escalated';
  created_at: string;
}

export function useFederatedMesh() {
  const [federations, setFederations] = useState<MeshFederation[]>([]);
  const [activeFederation, setActiveFederation] = useState<MeshFederation | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [syncLogs, setSyncLogs] = useState<MeshSyncLog[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<MeshConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const autoSyncRef = useRef<NodeJS.Timeout | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('mesh-sync-engine', {
      body: { action, ...params },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data;
  }, []);

  const fetchFederations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoke('list_federations');
      setFederations(data.federations || []);
      return data.federations;
    } catch (err) {
      console.error('[useFederatedMesh] fetchFederations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [invoke]);

  const fetchFederationStatus = useCallback(async (federationId: string) => {
    setIsLoading(true);
    try {
      const data = await invoke('get_federation_status', { federation_id: federationId });
      setActiveFederation(data.federation);
      setNodes(data.nodes || []);
      setSyncLogs(data.recent_syncs || []);
      setPendingConflicts(data.pending_conflicts || []);
      return data;
    } catch (err) {
      console.error('[useFederatedMesh] fetchStatus:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [invoke]);

  const createFederation = useCallback(async (federationData: Record<string, unknown>) => {
    try {
      const data = await invoke('create_federation', { federation_data: federationData });
      toast.success('Federación creada');
      fetchFederations();
      return data.federation;
    } catch (err) {
      console.error('[useFederatedMesh] create:', err);
      toast.error('Error al crear federación');
      return null;
    }
  }, [invoke, fetchFederations]);

  const addNode = useCallback(async (federationId: string, nodeData: Record<string, unknown>, installationId?: string) => {
    try {
      const data = await invoke('add_node', {
        federation_id: federationId,
        node_data: nodeData,
        installation_id: installationId,
      });
      toast.success('Nodo añadido a la federación');
      fetchFederationStatus(federationId);
      return data.node;
    } catch (err) {
      console.error('[useFederatedMesh] addNode:', err);
      toast.error('Error al añadir nodo');
      return null;
    }
  }, [invoke, fetchFederationStatus]);

  const syncNodes = useCallback(async (federationId: string) => {
    setIsSyncing(true);
    try {
      const data = await invoke('sync_nodes', { federation_id: federationId });
      if (data.sync_result) {
        const { records_synced, conflicts_detected } = data.sync_result;
        toast.success(`Sync completado: ${records_synced} registros, ${conflicts_detected} conflictos`);
      }
      fetchFederationStatus(federationId);
      return data.sync_result;
    } catch (err) {
      console.error('[useFederatedMesh] syncNodes:', err);
      toast.error('Error en sincronización');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [invoke, fetchFederationStatus]);

  const resolveConflict = useCallback(async (conflictId: string, resolution: Record<string, unknown>) => {
    try {
      await invoke('resolve_conflict', { conflict_id: conflictId, resolution });
      toast.success('Conflicto resuelto');
      if (activeFederation) fetchFederationStatus(activeFederation.id);
      return true;
    } catch (err) {
      console.error('[useFederatedMesh] resolveConflict:', err);
      toast.error('Error al resolver conflicto');
      return false;
    }
  }, [invoke, activeFederation, fetchFederationStatus]);

  const updateSyncPolicy = useCallback(async (federationId: string, syncPolicy: Record<string, unknown>) => {
    try {
      await invoke('update_sync_policy', { federation_id: federationId, federation_data: { sync_policy: syncPolicy } });
      toast.success('Política de sync actualizada');
      fetchFederationStatus(federationId);
    } catch (err) {
      console.error('[useFederatedMesh] updatePolicy:', err);
      toast.error('Error al actualizar política');
    }
  }, [invoke, fetchFederationStatus]);

  const startAutoSync = useCallback((federationId: string, intervalMs = 60000) => {
    stopAutoSync();
    autoSyncRef.current = setInterval(() => {
      syncNodes(federationId);
    }, intervalMs);
  }, [syncNodes]);

  const stopAutoSync = useCallback(() => {
    if (autoSyncRef.current) {
      clearInterval(autoSyncRef.current);
      autoSyncRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchFederations();
    return () => stopAutoSync();
  }, [fetchFederations, stopAutoSync]);

  return {
    federations,
    activeFederation,
    nodes,
    syncLogs,
    pendingConflicts,
    isLoading,
    isSyncing,
    fetchFederations,
    fetchFederationStatus,
    createFederation,
    addNode,
    syncNodes,
    resolveConflict,
    updateSyncPolicy,
    startAutoSync,
    stopAutoSync,
    setActiveFederation,
  };
}

export default useFederatedMesh;
