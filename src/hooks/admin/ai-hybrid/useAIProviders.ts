/**
 * Hook para gestión de proveedores de IA
 * Sistema Híbrido Universal - Fase 2
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// === INTERFACES ===
export interface AIProvider {
  id: string;
  name: string;
  provider_type: 'local' | 'external' | 'hybrid';
  api_endpoint: string | null;
  requires_api_key: boolean;
  supported_models: AIModel[];
  pricing_info: PricingInfo | null;
  capabilities: string[];
  is_active: boolean;
  created_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  context_window?: number;
  max_tokens?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  cost_per_1k_input?: number;
  cost_per_1k_output?: number;
}

export interface PricingInfo {
  currency: string;
  billing_type: 'per_token' | 'per_request' | 'subscription';
  models: Record<string, { input: number; output: number }>;
}

export interface ProviderCredential {
  id: string;
  provider_id: string;
  company_id: string | null;
  workspace_id: string | null;
  is_default: boolean;
  is_active: boolean;
  credits_balance: number;
  credits_alert_threshold: number;
  last_usage_check: string | null;
  created_at: string;
  provider?: AIProvider;
}

export interface ConnectionTestResult {
  success: boolean;
  latency_ms: number;
  models_available: string[];
  error?: string;
}

// Helper to safely parse JSON fields
const parseJsonField = <T>(field: Json | null, defaultValue: T): T => {
  if (!field) return defaultValue;
  try {
    if (typeof field === 'object') return field as unknown as T;
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

// === HOOK ===
export function useAIProviders() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === FETCH PROVIDERS ===
  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = supabase as any;
      const { data, error: fetchError } = await client
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;

      const mapped: AIProvider[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        provider_type: p.provider_type as 'local' | 'external' | 'hybrid',
        api_endpoint: p.api_endpoint,
        requires_api_key: p.requires_api_key ?? true,
        supported_models: parseJsonField<AIModel[]>(p.supported_models, []),
        pricing_info: parseJsonField<PricingInfo | null>(p.pricing_info, null),
        capabilities: parseJsonField<string[]>(p.capabilities, []),
        is_active: p.is_active ?? true,
        created_at: p.created_at,
      }));

      setProviders(mapped);
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching providers';
      setError(message);
      console.error('[useAIProviders] fetchProviders error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH CREDENTIALS ===
  const fetchCredentials = useCallback(async (companyId?: string, workspaceId?: string) => {
    try {
      const client = supabase as any;
      let query = client
        .from('ai_provider_credentials')
        .select(`
          *,
          provider:ai_providers(*)
        `)
        .eq('is_active', true);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: ProviderCredential[] = (data || []).map((c: any) => ({
        id: c.id,
        provider_id: c.provider_id,
        company_id: c.company_id,
        workspace_id: c.workspace_id,
        is_default: c.is_default ?? false,
        is_active: c.is_active ?? true,
        credits_balance: Number(c.credits_balance) || 0,
        credits_alert_threshold: Number(c.credits_alert_threshold) || 10,
        last_usage_check: c.last_usage_check,
        created_at: c.created_at,
        provider: c.provider ? {
          id: c.provider.id,
          name: c.provider.name,
          provider_type: c.provider.provider_type as 'local' | 'external' | 'hybrid',
          api_endpoint: c.provider.api_endpoint,
          requires_api_key: c.provider.requires_api_key ?? true,
          supported_models: parseJsonField<AIModel[]>(c.provider.supported_models, []),
          pricing_info: parseJsonField<PricingInfo | null>(c.provider.pricing_info, null),
          capabilities: parseJsonField<string[]>(c.provider.capabilities, []),
          is_active: c.provider.is_active ?? true,
          created_at: c.provider.created_at,
        } : undefined,
      }));

      setCredentials(mapped);
      return mapped;
    } catch (err) {
      console.error('[useAIProviders] fetchCredentials error:', err);
      return [];
    }
  }, []);

  // === TEST CONNECTION ===
  const testConnection = useCallback(async (
    providerId: string,
    endpointOrApiKey?: string,
    apiKey?: string
  ): Promise<ConnectionTestResult> => {
    try {
      const startTime = Date.now();
      
      // Detect if second param is URL or API key
      const isUrl = endpointOrApiKey?.startsWith('http');
      const endpoint = isUrl ? endpointOrApiKey : undefined;
      const key = isUrl ? apiKey : endpointOrApiKey;

      const { data, error: fnError } = await supabase.functions.invoke('ai-provider-manager', {
        body: {
          action: 'test_connection',
          provider_id: providerId,
          api_endpoint: endpoint,
          api_key: key,
        },
      });

      if (fnError) throw fnError;

      const latency = Date.now() - startTime;

      return {
        success: data?.success || false,
        latency_ms: latency,
        models_available: data?.models || [],
        error: data?.error,
      };
    } catch (err) {
      return {
        success: false,
        latency_ms: 0,
        models_available: [],
        error: err instanceof Error ? err.message : 'Connection test failed',
      };
    }
  }, []);

  // === GET PROVIDER MODELS ===
  const getProviderModels = useCallback(async (
    providerId: string, 
    endpoint?: string
  ): Promise<AIModel[]> => {
    try {
      console.log(`[useAIProviders] Fetching models for ${providerId}, endpoint: ${endpoint}`);
      const { data, error: fnError } = await supabase.functions.invoke('ai-provider-manager', {
        body: {
          action: 'list_models',
          provider_id: providerId,
          api_endpoint: endpoint,
        },
      });

      if (fnError) throw fnError;

      console.log(`[useAIProviders] Models received:`, data?.models);
      return data?.models || [];
    } catch (err) {
      console.error('[useAIProviders] getProviderModels error:', err);
      return [];
    }
  }, []);

  // === ADD CREDENTIAL ===
  const addCredential = useCallback(async (
    providerId: string,
    apiKey: string,
    options?: {
      companyId?: string;
      workspaceId?: string;
      organizationId?: string;
      isDefault?: boolean;
    }
  ): Promise<ProviderCredential | null> => {
    try {
      // First test the connection
      const testResult = await testConnection(providerId, apiKey);
      if (!testResult.success) {
        toast.error(`Conexión fallida: ${testResult.error}`);
        return null;
      }

      const client = supabase as any;
      const { data, error: insertError } = await client
        .from('ai_provider_credentials')
        .insert({
          provider_id: providerId,
          api_key_encrypted: apiKey,
          company_id: options?.companyId || null,
          workspace_id: options?.workspaceId || null,
          organization_id: options?.organizationId || null,
          is_default: options?.isDefault || false,
          is_active: true,
          credits_balance: 0,
          credits_alert_threshold: 10,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Proveedor configurado correctamente');
      await fetchCredentials(options?.companyId, options?.workspaceId);
      return data as ProviderCredential;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding credential';
      toast.error(message);
      console.error('[useAIProviders] addCredential error:', err);
      return null;
    }
  }, [testConnection, fetchCredentials]);

  // === SET DEFAULT PROVIDER ===
  const setDefaultProvider = useCallback(async (
    credentialId: string,
    scope: 'company' | 'workspace'
  ): Promise<boolean> => {
    try {
      const credential = credentials.find(c => c.id === credentialId);
      if (!credential) throw new Error('Credential not found');

      const client = supabase as any;
      const scopeField = scope === 'company' ? 'company_id' : 'workspace_id';
      const scopeValue = scope === 'company' ? credential.company_id : credential.workspace_id;

      if (scopeValue) {
        await client
          .from('ai_provider_credentials')
          .update({ is_default: false })
          .eq(scopeField, scopeValue);
      }

      const { error: updateError } = await client
        .from('ai_provider_credentials')
        .update({ is_default: true })
        .eq('id', credentialId);

      if (updateError) throw updateError;

      toast.success('Proveedor por defecto actualizado');
      await fetchCredentials(credential.company_id || undefined, credential.workspace_id || undefined);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error setting default';
      toast.error(message);
      return false;
    }
  }, [credentials, fetchCredentials]);

  // === DELETE CREDENTIAL ===
  const deleteCredential = useCallback(async (credentialId: string): Promise<boolean> => {
    try {
      const client = supabase as any;
      const { error: deleteError } = await client
        .from('ai_provider_credentials')
        .delete()
        .eq('id', credentialId);

      if (deleteError) throw deleteError;

      setCredentials(prev => prev.filter(c => c.id !== credentialId));
      toast.success('Credencial eliminada');
      return true;
    } catch (err) {
      toast.error('Error al eliminar credencial');
      return false;
    }
  }, []);

  // === UPDATE PROVIDER ===
  const updateProvider = useCallback(async (
    providerId: string,
    updates: Partial<AIProvider>
  ): Promise<boolean> => {
    try {
      const client = supabase as any;
      const { error: updateError } = await client
        .from('ai_providers')
        .update({
          api_endpoint: updates.api_endpoint,
          requires_api_key: updates.requires_api_key,
          is_active: updates.is_active,
        })
        .eq('id', providerId);

      if (updateError) throw updateError;

      // Update local state
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, ...updates } : p
      ));
      
      return true;
    } catch (err) {
      console.error('[useAIProviders] updateProvider error:', err);
      toast.error('Error al actualizar proveedor');
      return false;
    }
  }, []);

  // === GET PROVIDER BY TYPE ===
  const getProvidersByType = useCallback((type: 'local' | 'external' | 'hybrid') => {
    return providers.filter(p => p.provider_type === type);
  }, [providers]);

  // === GET DEFAULT CREDENTIAL ===
  const getDefaultCredential = useCallback((companyId?: string, workspaceId?: string) => {
    return credentials.find(c => 
      c.is_default && 
      (!companyId || c.company_id === companyId) &&
      (!workspaceId || c.workspace_id === workspaceId)
    );
  }, [credentials]);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    // State
    providers,
    credentials,
    isLoading,
    error,

    // Actions
    fetchProviders,
    fetchCredentials,
    testConnection,
    getProviderModels,
    addCredential,
    updateProvider,
    setDefaultProvider,
    deleteCredential,

    // Helpers
    getProvidersByType,
    getDefaultCredential,
  };
}

export default useAIProviders;
