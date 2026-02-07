/**
 * Hook para AI Copilot - Interfaz estilo Open WebUI
 * Gestión de conversaciones, modelos y contexto
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIProviders } from './useAIProviders';

// === TYPES ===
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  model?: string;
  provider_type?: 'local' | 'external';
  tokens_used?: number;
}

export interface CopilotConversation {
  id: string;
  user_id: string;
  title: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  model_used?: string;
  provider_type?: 'local' | 'external';
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface EntityContext {
  type: string;
  id: string;
  name?: string;
  data?: Record<string, unknown>;
}

export interface CopilotSettings {
  model: string;
  providerType: 'local' | 'external' | 'auto';
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  ollamaUrl: string;
}

// === HOOK ===
export function useAICopilot() {
  // State
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<CopilotConversation | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [entityContext, setEntityContext] = useState<EntityContext | null>(null);
  const [settings, setSettings] = useState<CopilotSettings>({
    model: 'google/gemini-3-flash-preview',
    providerType: 'auto',
    temperature: 0.7,
    maxTokens: 4000,
    ollamaUrl: 'http://localhost:11434',
  });

  const abortRef = useRef<AbortController | null>(null);
  const { providers, getProviderModels } = useAIProviders();

  // === FETCH CONVERSATIONS ===
  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { action: 'list_conversations' }
      });

      if (error) throw error;
      if (data?.success) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('[useAICopilot] fetchConversations error:', err);
    }
  }, []);

  // === LOAD CONVERSATION ===
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { 
          action: 'get_conversation',
          conversation_id: conversationId 
        }
      });

      if (error) throw error;
      if (data?.success) {
        setCurrentConversation(data.conversation);
        setMessages(data.messages);
        
        if (data.conversation.entity_type && data.conversation.entity_id) {
          setEntityContext({
            type: data.conversation.entity_type,
            id: data.conversation.entity_id,
            name: data.conversation.entity_name,
          });
        }
      }
    } catch (err) {
      console.error('[useAICopilot] loadConversation error:', err);
      toast.error('Error al cargar la conversación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SEND MESSAGE ===
  const sendMessage = useCallback(async (content: string): Promise<string | null> => {
    if (!content.trim()) return null;

    // Optimistic update
    const userMessage: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const allMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content }
      ];

      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: {
          action: 'chat',
          conversation_id: currentConversation?.id,
          messages: allMessages,
          model: settings.model,
          provider_type: settings.providerType,
          entity_context: entityContext,
          system_prompt: settings.systemPrompt,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          ollama_url: settings.ollamaUrl,
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Error en la respuesta');
      }

      // Add assistant message
      const assistantMessage: CopilotMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
        model: data.model,
        provider_type: data.source,
        tokens_used: data.tokens?.prompt + data.tokens?.completion,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation if new
      if (!currentConversation && data.conversation_id) {
        setCurrentConversation({
          id: data.conversation_id,
          user_id: '',
          title: content.slice(0, 100),
          message_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          model_used: data.model,
          provider_type: data.source,
          entity_type: entityContext?.type,
          entity_id: entityContext?.id,
          entity_name: entityContext?.name,
        });
        fetchConversations();
      }

      return data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[useAICopilot] sendMessage error:', errorMessage);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast.error('Límite de solicitudes excedido. Intenta más tarde.');
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast.error('Créditos insuficientes. Añade créditos o usa IA local.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentConversation, entityContext, settings, fetchConversations]);

  // === NEW CONVERSATION ===
  const newConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setEntityContext(null);
  }, []);

  // === DELETE CONVERSATION ===
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { 
          action: 'delete_conversation',
          conversation_id: conversationId 
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          newConversation();
        }
        toast.success('Conversación eliminada');
      }
    } catch (err) {
      console.error('[useAICopilot] deleteConversation error:', err);
      toast.error('Error al eliminar la conversación');
    }
  }, [currentConversation, newConversation]);

  // === EXPORT CONVERSATION ===
  const exportConversation = useCallback(async (
    conversationId: string, 
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: { 
          action: 'export_conversation',
          conversation_id: conversationId,
          entity_context: entityContext,
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        if (format === 'markdown') {
          return data.markdown;
        } else {
          return JSON.stringify({
            conversation: data.conversation,
            messages: data.messages
          }, null, 2);
        }
      }
      return null;
    } catch (err) {
      console.error('[useAICopilot] exportConversation error:', err);
      toast.error('Error al exportar la conversación');
      return null;
    }
  }, [entityContext]);

  // === CANCEL REQUEST ===
  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, []);

  // === UPDATE SETTINGS ===
  const updateSettings = useCallback((updates: Partial<CopilotSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // === SET ENTITY CONTEXT ===
  const setContext = useCallback((context: EntityContext | null) => {
    setEntityContext(context);
  }, []);

  // === GET AVAILABLE MODELS ===
  const getAvailableModels = useCallback(() => {
    const models: Array<{ id: string; name: string; provider: string; type: 'local' | 'external' }> = [];

    // External models
    models.push(
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', provider: 'Google', type: 'external' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', type: 'external' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', type: 'external' },
      { id: 'openai/gpt-5', name: 'GPT-5', provider: 'OpenAI', type: 'external' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', type: 'external' },
    );

    // Local models from providers
    const localProviders = providers.filter(p => p.provider_type === 'local');
    for (const provider of localProviders) {
      for (const model of provider.supported_models || []) {
        models.push({
          id: model.id,
          name: model.name,
          provider: provider.name,
          type: 'local',
        });
      }
    }

    return models;
  }, [providers]);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    entityContext,
    settings,

    // Actions
    fetchConversations,
    loadConversation,
    sendMessage,
    newConversation,
    deleteConversation,
    exportConversation,
    cancelRequest,
    updateSettings,
    setContext,
    getAvailableModels,
  };
}

export default useAICopilot;
