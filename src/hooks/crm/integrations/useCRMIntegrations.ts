/**
 * Hook para gestión de integraciones CRM
 * Fase 9: Integration Hub & External APIs
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface CRMWebhook {
  id: string;
  name: string;
  description: string | null;
  webhook_type: 'incoming' | 'outgoing';
  url: string | null;
  secret_key: string | null;
  events: string[];
  headers: Record<string, string>;
  payload_template: Record<string, unknown> | null;
  is_active: boolean;
  retry_count: number;
  retry_delay_seconds: number;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMWebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  response_status: number | null;
  execution_time_ms: number | null;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  error_message: string | null;
  retry_attempt: number;
  created_at: string;
}

export interface CRMAPIKey {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  key_hash: string;
  permissions: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  allowed_ips: string[] | null;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMConnector {
  id: string;
  connector_type: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  oauth_tokens: Record<string, unknown> | null;
  sync_settings: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  last_sync_at: string | null;
  last_error: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMIntegrationEvent {
  id: string;
  event_type: string;
  event_source: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  processing_results: Record<string, unknown> | null;
  created_at: string;
}

export interface CRMSyncHistory {
  id: string;
  connector_id: string;
  sync_type: 'full' | 'incremental' | 'manual';
  direction: 'inbound' | 'outbound' | 'bidirectional';
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_details: Record<string, unknown> | null;
  created_at: string;
}

export interface IntegrationStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalApiKeys: number;
  activeApiKeys: number;
  totalConnectors: number;
  connectedConnectors: number;
  eventsToday: number;
  successRate: number;
}

// === HOOK ===

export function useCRMIntegrations() {
  const [webhooks, setWebhooks] = useState<CRMWebhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<CRMWebhookLog[]>([]);
  const [apiKeys, setApiKeys] = useState<CRMAPIKey[]>([]);
  const [connectors, setConnectors] = useState<CRMConnector[]>([]);
  const [events, setEvents] = useState<CRMIntegrationEvent[]>([]);
  const [syncHistory, setSyncHistory] = useState<CRMSyncHistory[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH WEBHOOKS ===
  const fetchWebhooks = useCallback(async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('crm_webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWebhooks(data || []);
    } catch (err) {
      console.error('[useCRMIntegrations] fetchWebhooks error:', err);
    }
  }, []);

  // === CREATE WEBHOOK ===
  const createWebhook = useCallback(async (webhook: Partial<CRMWebhook>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: createError } = await (supabase as any)
        .from('crm_webhooks')
        .insert([{
          ...webhook,
          created_by: user?.id,
          secret_key: webhook.webhook_type === 'incoming' 
            ? crypto.randomUUID().replace(/-/g, '') 
            : null
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setWebhooks(prev => [data, ...prev]);
      toast.success('Webhook creado correctamente');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear webhook';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === UPDATE WEBHOOK ===
  const updateWebhook = useCallback(async (id: string, updates: Partial<CRMWebhook>) => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('crm_webhooks')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
      toast.success('Webhook actualizado');
      return true;
    } catch (err) {
      toast.error('Error al actualizar webhook');
      return false;
    }
  }, []);

  // === DELETE WEBHOOK ===
  const deleteWebhook = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await (supabase as any)
        .from('crm_webhooks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast.success('Webhook eliminado');
      return true;
    } catch (err) {
      toast.error('Error al eliminar webhook');
      return false;
    }
  }, []);

  // === TEST WEBHOOK ===
  const testWebhook = useCallback(async (webhookId: string) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-integration-hub', {
        body: { action: 'test_webhook', webhookId }
      });

      if (fnError) throw fnError;
      
      if (data?.success) {
        toast.success('Webhook probado correctamente');
        await fetchWebhooks();
        return data.result;
      }
      
      throw new Error(data?.error || 'Test failed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al probar webhook';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchWebhooks]);

  // === FETCH WEBHOOK LOGS ===
  const fetchWebhookLogs = useCallback(async (webhookId?: string) => {
    try {
      let query = (supabase as any)
        .from('crm_webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (webhookId) {
        query = query.eq('webhook_id', webhookId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setWebhookLogs(data || []);
    } catch (err) {
      console.error('[useCRMIntegrations] fetchWebhookLogs error:', err);
    }
  }, []);

  // === FETCH API KEYS ===
  const fetchApiKeys = useCallback(async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('crm_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setApiKeys(data || []);
    } catch (err) {
      console.error('[useCRMIntegrations] fetchApiKeys error:', err);
    }
  }, []);

  // === CREATE API KEY ===
  const createApiKey = useCallback(async (apiKey: Partial<CRMAPIKey>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate a new API key
      const fullKey = `crm_${crypto.randomUUID().replace(/-/g, '')}`;
      const keyPrefix = fullKey.substring(0, 12);
      
      // Simple hash for demo (in production use proper hashing)
      const encoder = new TextEncoder();
      const data = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: created, error: createError } = await (supabase as any)
        .from('crm_api_keys')
        .insert([{
          ...apiKey,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          created_by: user?.id
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setApiKeys(prev => [created, ...prev]);
      toast.success('API Key creada correctamente');
      
      // Return the full key only on creation
      return { ...created, fullKey };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear API Key';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === REVOKE API KEY ===
  const revokeApiKey = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('crm_api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (updateError) throw updateError;
      
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
      toast.success('API Key revocada');
      return true;
    } catch (err) {
      toast.error('Error al revocar API Key');
      return false;
    }
  }, []);

  // === FETCH CONNECTORS ===
  const fetchConnectors = useCallback(async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('crm_connector_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setConnectors(data || []);
    } catch (err) {
      console.error('[useCRMIntegrations] fetchConnectors error:', err);
    }
  }, []);

  // === CREATE CONNECTOR ===
  const createConnector = useCallback(async (connector: Partial<CRMConnector>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: createError } = await (supabase as any)
        .from('crm_connector_instances')
        .insert([{
          ...connector,
          created_by: user?.id,
          status: 'disconnected'
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setConnectors(prev => [data, ...prev]);
      toast.success('Conector creado correctamente');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear conector';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CONNECT/DISCONNECT CONNECTOR ===
  const toggleConnector = useCallback(async (id: string, connect: boolean) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-integration-hub', {
        body: { 
          action: connect ? 'connect_connector' : 'disconnect_connector', 
          connectorId: id 
        }
      });

      if (fnError) throw fnError;
      
      if (data?.success) {
        await fetchConnectors();
        toast.success(connect ? 'Conector conectado' : 'Conector desconectado');
        return true;
      }
      
      throw new Error(data?.error || 'Operation failed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en operación';
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnectors]);

  // === SYNC CONNECTOR ===
  const syncConnector = useCallback(async (id: string, syncType: 'full' | 'incremental' = 'incremental') => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-integration-hub', {
        body: { action: 'sync_connector', connectorId: id, syncType }
      });

      if (fnError) throw fnError;
      
      if (data?.success) {
        await fetchConnectors();
        toast.success('Sincronización iniciada');
        return data.syncId;
      }
      
      throw new Error(data?.error || 'Sync failed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar';
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnectors]);

  // === FETCH EVENTS ===
  const fetchEvents = useCallback(async (filters?: { eventType?: string; processed?: boolean }) => {
    try {
      let query = (supabase as any)
        .from('crm_integration_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters?.processed !== undefined) {
        query = query.eq('processed', filters.processed);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setEvents(data || []);
    } catch (err) {
      console.error('[useCRMIntegrations] fetchEvents error:', err);
    }
  }, []);

  // === FETCH SYNC HISTORY ===
  const fetchSyncHistory = useCallback(async (connectorId?: string) => {
    try {
      let query = (supabase as any)
        .from('crm_sync_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (connectorId) {
        query = query.eq('connector_id', connectorId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setSyncHistory(data || []);
    } catch (err) {
      console.error('[useCRMIntegrations] fetchSyncHistory error:', err);
    }
  }, []);

  // === CALCULATE STATS ===
  const calculateStats = useCallback(async () => {
    try {
      const [webhooksData, apiKeysData, connectorsData] = await Promise.all([
        (supabase as any).from('crm_webhooks').select('id, is_active, success_count, failure_count'),
        (supabase as any).from('crm_api_keys').select('id, is_active'),
        (supabase as any).from('crm_connector_instances').select('id, status')
      ]);

      const webhooksList = webhooksData.data || [];
      const apiKeysList = apiKeysData.data || [];
      const connectorsList = connectorsData.data || [];

      const totalSuccess = webhooksList.reduce((sum: number, w: any) => sum + (w.success_count || 0), 0);
      const totalFailure = webhooksList.reduce((sum: number, w: any) => sum + (w.failure_count || 0), 0);
      const successRate = totalSuccess + totalFailure > 0 
        ? Math.round((totalSuccess / (totalSuccess + totalFailure)) * 100) 
        : 100;

      setStats({
        totalWebhooks: webhooksList.length,
        activeWebhooks: webhooksList.filter((w: any) => w.is_active).length,
        totalApiKeys: apiKeysList.length,
        activeApiKeys: apiKeysList.filter((k: any) => k.is_active).length,
        totalConnectors: connectorsList.length,
        connectedConnectors: connectorsList.filter((c: any) => c.status === 'connected').length,
        eventsToday: 0, // Would need date filter
        successRate
      });
    } catch (err) {
      console.error('[useCRMIntegrations] calculateStats error:', err);
    }
  }, []);

  // === EMIT EVENT ===
  const emitEvent = useCallback(async (
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-integration-hub', {
        body: { 
          action: 'emit_event', 
          eventType,
          entityType,
          entityId,
          payload
        }
      });

      if (fnError) throw fnError;
      return data?.success;
    } catch (err) {
      console.error('[useCRMIntegrations] emitEvent error:', err);
      return false;
    }
  }, []);

  // === INITIAL LOAD ===
  useEffect(() => {
    fetchWebhooks();
    fetchApiKeys();
    fetchConnectors();
    calculateStats();
  }, [fetchWebhooks, fetchApiKeys, fetchConnectors, calculateStats]);

  return {
    // Data
    webhooks,
    webhookLogs,
    apiKeys,
    connectors,
    events,
    syncHistory,
    stats,
    isLoading,
    error,
    // Webhook actions
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchWebhookLogs,
    // API Key actions
    fetchApiKeys,
    createApiKey,
    revokeApiKey,
    // Connector actions
    fetchConnectors,
    createConnector,
    toggleConnector,
    syncConnector,
    // Event actions
    fetchEvents,
    fetchSyncHistory,
    emitEvent,
    calculateStats
  };
}

export default useCRMIntegrations;
