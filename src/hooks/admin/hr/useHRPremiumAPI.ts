/**
 * useHRPremiumAPI - Hook for Premium API & Webhooks management
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface APIClient {
  id: string;
  name: string;
  description: string;
  api_key_prefix: string;
  scopes: string[];
  is_active: boolean;
  rate_limit_per_minute: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface WebhookSubscription {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  filters: Record<string, unknown>;
  retry_policy: { max_retries: number; backoff_ms: number };
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_time_ms: number | null;
  attempt_number: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface EventCatalogItem {
  id: string;
  event_type: string;
  category: string;
  description: string;
  payload_schema: Record<string, unknown>;
  example_payload: Record<string, unknown>;
  is_active: boolean;
}

export interface AccessLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  created_at: string;
}

export function useHRPremiumAPI(companyId?: string) {
  const [clients, setClients] = useState<APIClient[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [events, setEvents] = useState<EventCatalogItem[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const invoke = useCallback(async (action: string, params?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('hr-premium-api', {
      body: { action, params: { ...params, company_id: companyId } }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Unknown error');
    return data;
  }, [companyId]);

  // === API Clients ===
  const fetchClients = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const data = await invoke('list_api_clients');
      setClients(data.clients || []);
    } catch (err) {
      console.error('[useHRPremiumAPI] fetchClients:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, invoke]);

  const createClient = useCallback(async (params: { name: string; description?: string; scopes?: string[] }) => {
    try {
      const data = await invoke('create_api_client', params);
      toast.success('API Client creado');
      if (data.api_key) {
        toast.info(`API Key: ${data.api_key.substring(0, 20)}...`, { duration: 15000 });
      }
      await fetchClients();
      return data;
    } catch (err) {
      toast.error('Error al crear API Client');
      return null;
    }
  }, [invoke, fetchClients]);

  const revokeClient = useCallback(async (clientId: string) => {
    try {
      await invoke('revoke_api_client', { client_id: clientId });
      toast.success('API Client revocado');
      await fetchClients();
    } catch (err) {
      toast.error('Error al revocar');
    }
  }, [invoke, fetchClients]);

  // === Webhooks ===
  const fetchWebhooks = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const data = await invoke('list_webhooks');
      setWebhooks(data.webhooks || []);
    } catch (err) {
      console.error('[useHRPremiumAPI] fetchWebhooks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, invoke]);

  const createWebhook = useCallback(async (params: { name: string; url: string; events: string[] }) => {
    try {
      const data = await invoke('create_webhook', params);
      toast.success('Webhook creado');
      if (data.signing_secret) {
        toast.info(`Secret: ${data.signing_secret.substring(0, 16)}...`, { duration: 15000 });
      }
      await fetchWebhooks();
      return data;
    } catch (err) {
      toast.error('Error al crear webhook');
      return null;
    }
  }, [invoke, fetchWebhooks]);

  const updateWebhook = useCallback(async (webhookId: string, updates: Partial<WebhookSubscription>) => {
    try {
      await invoke('update_webhook', { webhook_id: webhookId, ...updates });
      toast.success('Webhook actualizado');
      await fetchWebhooks();
    } catch (err) {
      toast.error('Error al actualizar webhook');
    }
  }, [invoke, fetchWebhooks]);

  const deleteWebhook = useCallback(async (webhookId: string) => {
    try {
      await invoke('delete_webhook', { webhook_id: webhookId });
      toast.success('Webhook eliminado');
      await fetchWebhooks();
    } catch (err) {
      toast.error('Error al eliminar webhook');
    }
  }, [invoke, fetchWebhooks]);

  const testWebhook = useCallback(async (webhookId: string) => {
    try {
      const data = await invoke('test_webhook', { webhook_id: webhookId });
      if (data.test_result?.success) {
        toast.success(`Test OK — ${data.test_result.response_time_ms}ms`);
      } else {
        toast.error(`Test fallido — ${data.test_result?.error || 'Error'}`);
      }
      return data.test_result;
    } catch (err) {
      toast.error('Error al testear webhook');
      return null;
    }
  }, [invoke]);

  // === Deliveries ===
  const fetchDeliveries = useCallback(async (webhookId?: string) => {
    try {
      const data = await invoke('list_deliveries', { webhook_id: webhookId, limit: 50 });
      setDeliveries(data.deliveries || []);
    } catch (err) {
      console.error('[useHRPremiumAPI] fetchDeliveries:', err);
    }
  }, [invoke]);

  const retryDelivery = useCallback(async (deliveryId: string) => {
    try {
      await invoke('retry_delivery', { delivery_id: deliveryId });
      toast.success('Reintento iniciado');
      await fetchDeliveries();
    } catch (err) {
      toast.error('Error al reintentar');
    }
  }, [invoke, fetchDeliveries]);

  // === Events ===
  const fetchEvents = useCallback(async () => {
    try {
      const data = await invoke('list_events');
      setEvents(data.events || []);
    } catch (err) {
      console.error('[useHRPremiumAPI] fetchEvents:', err);
    }
  }, [invoke]);

  // === Access Logs ===
  const fetchAccessLogs = useCallback(async () => {
    try {
      const data = await invoke('list_access_logs', { limit: 100 });
      setAccessLogs(data.logs || []);
    } catch (err) {
      console.error('[useHRPremiumAPI] fetchAccessLogs:', err);
    }
  }, [invoke]);

  return {
    clients, webhooks, deliveries, events, accessLogs, isLoading,
    fetchClients, createClient, revokeClient,
    fetchWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook,
    fetchDeliveries, retryDelivery,
    fetchEvents, fetchAccessLogs,
  };
}

export default useHRPremiumAPI;
