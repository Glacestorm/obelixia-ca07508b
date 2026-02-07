/**
 * Hook principal para IA Híbrida con routing inteligente
 * Sistema Híbrido Universal - Fase 5
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIProviders, type AIProvider, type ProviderCredential } from './useAIProviders';
import { useDataPrivacyGateway, type ClassificationResult } from './useDataPrivacyGateway';
import { useAICredits } from './useAICredits';

// === TYPES ===
export type RoutingMode = 'local_only' | 'external_only' | 'hybrid_auto' | 'hybrid_manual';

export interface HybridAIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
  source?: 'local' | 'external';
  tokens?: { prompt: number; completion: number };
  cost?: number;
  classification?: ClassificationResult;
}

export interface HybridAIContext {
  entityType?: string;
  entityId?: string;
  entityData?: Record<string, unknown>;
  module?: 'crm' | 'erp' | 'admin';
  companyId?: string;
  workspaceId?: string;
}

export interface RoutingDecision {
  provider: AIProvider | null;
  credential: ProviderCredential | null;
  source: 'local' | 'external';
  reason: string;
  classification: ClassificationResult;
  estimatedCost?: number;
  warnings: string[];
}

export interface HybridAIOptions {
  forceProvider?: string;
  forceLocal?: boolean;
  forceExternal?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

// === HOOK ===
export function useHybridAI(context?: HybridAIContext) {
  const [routingMode, setRoutingMode] = useState<RoutingMode>('hybrid_auto');
  const [messages, setMessages] = useState<HybridAIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<AIProvider | null>(null);
  const [lastDecision, setLastDecision] = useState<RoutingDecision | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const { 
    providers, 
    credentials, 
    fetchCredentials,
    getProvidersByType, 
    getDefaultCredential 
  } = useAIProviders();
  
  const { 
    classifyData, 
    sanitizeForExternal 
  } = useDataPrivacyGateway();
  
  const { 
    balances, 
    recordUsage, 
    getLowBalanceCredentials 
  } = useAICredits();

  // === GET ROUTING DECISION ===
  const getRoutingDecision = useCallback((
    prompt: string,
    data?: Record<string, unknown>,
    options?: HybridAIOptions
  ): RoutingDecision => {
    const warnings: string[] = [];
    
    // Classify data
    const dataToClassify = {
      prompt,
      ...data,
      ...(context?.entityData || {}),
    };
    const classification = classifyData(dataToClassify, { 
      entityType: context?.entityType,
      module: context?.module 
    });

    // Check forced options
    if (options?.forceProvider) {
      const provider = providers.find(p => p.id === options.forceProvider);
      const credential = credentials.find(c => c.provider_id === options.forceProvider);
      
      if (provider && classification.level === 'restricted' && provider.provider_type === 'external') {
        warnings.push('ADVERTENCIA: Datos RESTRICTED no deberían enviarse a proveedores externos');
      }

      return {
        provider: provider || null,
        credential: credential || null,
        source: provider?.provider_type === 'local' ? 'local' : 'external',
        reason: 'Proveedor forzado por usuario',
        classification,
        warnings,
      };
    }

    if (options?.forceLocal) {
      const localProviders = getProvidersByType('local');
      const localProvider = localProviders[0];
      
      return {
        provider: localProvider || null,
        credential: null,
        source: 'local',
        reason: 'IA local forzada',
        classification,
        warnings: localProvider ? [] : ['No hay proveedor local disponible'],
      };
    }

    // Apply routing mode
    if (routingMode === 'local_only') {
      const localProviders = getProvidersByType('local');
      return {
        provider: localProviders[0] || null,
        credential: null,
        source: 'local',
        reason: 'Modo solo local activado',
        classification,
        warnings: localProviders.length === 0 ? ['No hay proveedor local configurado'] : [],
      };
    }

    if (routingMode === 'external_only') {
      if (classification.level === 'restricted') {
        warnings.push('BLOQUEADO: Datos RESTRICTED no pueden enviarse externamente');
        const localProviders = getProvidersByType('local');
        return {
          provider: localProviders[0] || null,
          credential: null,
          source: 'local',
          reason: 'Fallback a local por datos restringidos',
          classification,
          warnings,
        };
      }

      const defaultCred = getDefaultCredential(context?.companyId, context?.workspaceId);
      const externalProvider = defaultCred 
        ? providers.find(p => p.id === defaultCred.provider_id)
        : getProvidersByType('external')[0];

      return {
        provider: externalProvider || null,
        credential: defaultCred || null,
        source: 'external',
        reason: 'Modo solo externo activado',
        classification,
        warnings: externalProvider ? [] : ['No hay proveedor externo configurado'],
      };
    }

    // Hybrid Auto Mode - Intelligent routing
    // Rule 1: RESTRICTED data → Always local
    if (classification.level === 'restricted') {
      const localProviders = getProvidersByType('local');
      return {
        provider: localProviders[0] || null,
        credential: null,
        source: 'local',
        reason: 'Datos clasificados como RESTRICTED - solo IA local',
        classification,
        warnings: localProviders.length === 0 ? ['¡ALERTA! Datos RESTRICTED sin IA local disponible'] : [],
      };
    }

    // Rule 2: Check credit balance
    const lowBalanceCredentials = getLowBalanceCredentials();
    const allExternalLow = credentials
      .filter(c => providers.find(p => p.id === c.provider_id)?.provider_type === 'external')
      .every(c => lowBalanceCredentials.some(lb => lb.credentialId === c.id));

    if (allExternalLow) {
      const localProviders = getProvidersByType('local');
      if (localProviders.length > 0) {
        warnings.push('Créditos externos bajos - usando IA local');
        return {
          provider: localProviders[0],
          credential: null,
          source: 'local',
          reason: 'Fallback a local por créditos bajos',
          classification,
          warnings,
        };
      }
    }

    // Rule 3: CONFIDENTIAL with anonymization
    if (classification.level === 'confidential' && classification.requiresAnonymization) {
      // Prefer local, but allow external with anonymization
      const localProviders = getProvidersByType('local');
      if (localProviders.length > 0) {
        return {
          provider: localProviders[0],
          credential: null,
          source: 'local',
          reason: 'Datos CONFIDENTIAL - preferencia local',
          classification,
          warnings: [],
        };
      }
      warnings.push('Datos confidenciales serán anonimizados antes de enviar');
    }

    // Rule 4: Default to external (Lovable AI or configured default)
    const lovableProvider = providers.find(p => p.name.toLowerCase().includes('lovable'));
    const defaultCred = getDefaultCredential(context?.companyId, context?.workspaceId);
    const defaultProvider = defaultCred 
      ? providers.find(p => p.id === defaultCred.provider_id)
      : lovableProvider || getProvidersByType('external')[0];

    return {
      provider: defaultProvider || null,
      credential: defaultCred || null,
      source: 'external',
      reason: defaultProvider?.name === 'Lovable AI' 
        ? 'Usando Lovable AI (sin coste adicional)'
        : 'Proveedor externo por defecto',
      classification,
      warnings,
    };
  }, [
    routingMode, 
    providers, 
    credentials, 
    classifyData, 
    context,
    getProvidersByType, 
    getDefaultCredential, 
    getLowBalanceCredentials
  ]);

  // === SEND MESSAGE ===
  const sendMessage = useCallback(async (
    content: string,
    data?: Record<string, unknown>,
    options?: HybridAIOptions
  ): Promise<HybridAIMessage | null> => {
    if (!content.trim()) return null;

    const userMessage: HybridAIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get routing decision
      const decision = getRoutingDecision(content, data, options);
      setLastDecision(decision);

      if (!decision.provider) {
        throw new Error('No hay proveedor de IA disponible');
      }

      setCurrentProvider(decision.provider);

      // Show warnings
      for (const warning of decision.warnings) {
        if (warning.includes('BLOQUEADO') || warning.includes('ALERTA')) {
          toast.error(warning);
        } else {
          toast.warning(warning);
        }
      }

      // Prepare data for external
      let processedData = data;
      if (decision.source === 'external' && decision.classification.requiresAnonymization) {
        const sanitized = sanitizeForExternal(data || {}, { anonymize: true });
        processedData = sanitized.anonymizedData;
      }

      // Build messages for AI
      const aiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      aiMessages.push({ role: 'user', content });

      abortControllerRef.current = new AbortController();

      // Call hybrid router
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'ai-hybrid-router',
        {
          body: {
            action: 'chat',
            messages: aiMessages,
            provider_id: decision.provider.id,
            model: options?.model || decision.provider.supported_models[0]?.id,
            context: {
              ...context,
              processedData,
              classification: decision.classification,
            },
            options: {
              max_tokens: options?.maxTokens || 2000,
              temperature: options?.temperature || 0.7,
              stream: options?.stream || false,
            },
          },
        }
      );

      if (fnError) throw fnError;

      if (!responseData?.success) {
        throw new Error(responseData?.error || 'Error en la respuesta de IA');
      }

      const assistantMessage: HybridAIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseData.response,
        timestamp: new Date().toISOString(),
        provider: decision.provider.name,
        model: responseData.model,
        source: decision.source,
        tokens: responseData.usage ? {
          prompt: responseData.usage.prompt_tokens,
          completion: responseData.usage.completion_tokens,
        } : undefined,
        cost: responseData.cost,
        classification: decision.classification,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Record usage if external with cost
      if (decision.source === 'external' && decision.credential && responseData.cost > 0) {
        await recordUsage(decision.credential.id, {
          providerId: decision.provider.id,
          model: responseData.model,
          promptTokens: responseData.usage?.prompt_tokens || 0,
          completionTokens: responseData.usage?.completion_tokens || 0,
          totalCost: responseData.cost,
          sourceModule: context?.module || 'admin',
        });
      }

      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[useHybridAI] sendMessage error:', errorMessage);

      if (errorMessage.includes('Rate limit')) {
        toast.error('Límite de solicitudes excedido. Intenta más tarde.');
      } else if (errorMessage.includes('Payment') || errorMessage.includes('credits')) {
        toast.error('Créditos insuficientes. Recarga o cambia a IA local.');
      } else {
        toast.error(`Error de IA: ${errorMessage}`);
      }

      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    messages, 
    context, 
    getRoutingDecision, 
    sanitizeForExternal, 
    recordUsage
  ]);

  // === SWITCH PROVIDER ===
  const switchProvider = useCallback(async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setCurrentProvider(provider);
      toast.success(`Cambiado a ${provider.name}`);
    }
  }, [providers]);

  // === CANCEL REQUEST ===
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsStreaming(false);
      toast.info('Solicitud cancelada');
    }
  }, []);

  // === CLEAR MESSAGES ===
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastDecision(null);
  }, []);

  // === ADD SYSTEM MESSAGE ===
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: HybridAIMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [systemMessage, ...prev.filter(m => m.role !== 'system')]);
  }, []);

  // === LOAD CREDENTIALS ON CONTEXT CHANGE ===
  useEffect(() => {
    if (context?.companyId || context?.workspaceId) {
      fetchCredentials(context.companyId, context.workspaceId);
    }
  }, [context?.companyId, context?.workspaceId, fetchCredentials]);

  return {
    // State
    routingMode,
    messages,
    isLoading,
    isStreaming,
    currentProvider,
    lastDecision,

    // Actions
    setRoutingMode,
    sendMessage,
    switchProvider,
    cancelRequest,
    clearMessages,
    addSystemMessage,
    getRoutingDecision,
  };
}

export default useHybridAI;
