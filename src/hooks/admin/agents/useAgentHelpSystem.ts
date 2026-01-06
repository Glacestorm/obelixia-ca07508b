/**
 * Hook para Sistema de Ayuda de Agentes
 * Con protecciones anti-recursión robustas
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AgentHelpContent,
  AgentHelpState,
  ChatMessage,
  AgentHelpConfig,
  DEFAULT_HELP_CONFIG,
  RecursionGuard,
  createRecursionGuard,
  RATE_LIMIT,
  AgentType,
  LearnedKnowledge,
  AGENT_HELP_REGISTRY,
} from './agentHelpTypes';

// === HOOK ===
export function useAgentHelpSystem(agentId: string, config: Partial<AgentHelpConfig> = {}) {
  const finalConfig = { ...DEFAULT_HELP_CONFIG, ...config };
  
  // === STATE ===
  const [state, setState] = useState<AgentHelpState>({
    isLoading: false,
    error: null,
    helpContent: null,
    chatHistory: [],
    isVoiceActive: false,
    isSpeaking: false,
  });

  // === ANTI-RECURSION REFS ===
  const isMountedRef = useRef(true);
  const guardRef = useRef<RecursionGuard>(createRecursionGuard());
  const circuitBreakerRef = useRef({ failures: 0, lastFailure: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatQueueRef = useRef<string[]>([]);
  const isProcessingChatRef = useRef(false);

  // === HELPER: Check Rate Limit ===
  const canFetch = useCallback((): boolean => {
    const guard = guardRef.current;
    const now = Date.now();
    
    // Check if currently fetching
    if (guard.isCurrentlyFetching) {
      console.log('[useAgentHelpSystem] Blocked: Already fetching');
      return false;
    }
    
    // Check minimum interval
    if (now - guard.lastFetchTime < RATE_LIMIT.MIN_FETCH_INTERVAL_MS) {
      console.log('[useAgentHelpSystem] Blocked: Rate limited');
      return false;
    }
    
    // Check circuit breaker
    const breaker = circuitBreakerRef.current;
    if (breaker.failures >= RATE_LIMIT.CIRCUIT_BREAKER_THRESHOLD) {
      if (now - breaker.lastFailure < RATE_LIMIT.CIRCUIT_BREAKER_RESET_MS) {
        console.log('[useAgentHelpSystem] Blocked: Circuit breaker open');
        return false;
      }
      // Reset circuit breaker
      circuitBreakerRef.current = { failures: 0, lastFailure: 0 };
    }
    
    return true;
  }, []);

  // === LOAD HELP CONTENT ===
  const loadHelpContent = useCallback(async (forceRefresh = false): Promise<AgentHelpContent | null> => {
    // Anti-recursion checks
    if (!isMountedRef.current) return null;
    if (!agentId) return null;
    
    // Skip if already initialized and not forcing refresh
    if (guardRef.current.isInitialized && !forceRefresh) {
      return state.helpContent;
    }
    
    if (!canFetch()) return state.helpContent;
    
    // Mark as fetching
    guardRef.current.isCurrentlyFetching = true;
    guardRef.current.lastFetchTime = Date.now();
    guardRef.current.fetchCount++;
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const agentInfo = AGENT_HELP_REGISTRY[agentId];
      
      const { data, error: fnError } = await supabase.functions.invoke(
        'agent-help-assistant',
        {
          body: {
            action: 'get_help_content',
            agentId,
            agentType: agentInfo?.type || 'supervisor',
            agentName: agentInfo?.name || agentId,
            language: finalConfig.language,
          },
        }
      );

      if (!isMountedRef.current) return null;
      if (fnError) throw fnError;

      if (data?.success && data?.helpContent) {
        const helpContent = data.helpContent as AgentHelpContent;
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          helpContent,
          error: null,
        }));
        
        guardRef.current.isInitialized = true;
        circuitBreakerRef.current.failures = 0;
        
        return helpContent;
      }

      throw new Error('Respuesta inválida del servidor');
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      const message = err instanceof Error ? err.message : 'Error desconocido';
      
      // Update circuit breaker
      circuitBreakerRef.current.failures++;
      circuitBreakerRef.current.lastFailure = Date.now();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      
      console.error('[useAgentHelpSystem] loadHelpContent error:', err);
      return null;
    } finally {
      guardRef.current.isCurrentlyFetching = false;
    }
  }, [agentId, state.helpContent, canFetch, finalConfig.language]);

  // === SEND CHAT MESSAGE ===
  const sendChatMessage = useCallback(async (
    message: string,
    isVoice = false
  ): Promise<ChatMessage | null> => {
    if (!isMountedRef.current) return null;
    if (!message.trim()) return null;
    
    // Queue the message if already processing
    if (isProcessingChatRef.current) {
      chatQueueRef.current.push(message);
      console.log('[useAgentHelpSystem] Message queued');
      return null;
    }
    
    isProcessingChatRef.current = true;
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      isVoice,
    };
    
    setState(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory.slice(-finalConfig.maxChatHistory + 1), userMessage],
      isLoading: true,
    }));
    
    try {
      const agentInfo = AGENT_HELP_REGISTRY[agentId];
      
      const { data, error: fnError } = await supabase.functions.invoke(
        'agent-help-assistant',
        {
          body: {
            action: 'chat',
            agentId,
            agentType: agentInfo?.type || 'supervisor',
            message,
            conversationHistory: state.chatHistory.slice(-10).map(m => ({
              role: m.role,
              content: m.content,
            })),
            helpContent: state.helpContent,
            language: finalConfig.language,
          },
        }
      );

      if (!isMountedRef.current) return null;
      if (fnError) throw fnError;

      if (data?.success && data?.response) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          audioUrl: data.audioUrl,
        };
        
        setState(prev => ({
          ...prev,
          chatHistory: [...prev.chatHistory, assistantMessage],
          isLoading: false,
        }));
        
        return assistantMessage;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error('Error en el chat');
      return null;
    } finally {
      isProcessingChatRef.current = false;
      
      // Process queued messages
      if (chatQueueRef.current.length > 0) {
        const nextMessage = chatQueueRef.current.shift();
        if (nextMessage) {
          // Small delay to prevent rapid firing
          setTimeout(() => sendChatMessage(nextMessage), 500);
        }
      }
    }
  }, [agentId, state.chatHistory, state.helpContent, finalConfig.language, finalConfig.maxChatHistory]);

  // === ADD LEARNED KNOWLEDGE ===
  const addLearnedKnowledge = useCallback(async (
    knowledge: Omit<LearnedKnowledge, 'id' | 'createdAt' | 'usageCount'>
  ): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    if (!finalConfig.enableLearning) return false;
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'agent-help-assistant',
        {
          body: {
            action: 'add_knowledge',
            agentId,
            knowledge,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        // Refresh help content to include new knowledge
        await loadHelpContent(true);
        toast.success('Conocimiento añadido');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useAgentHelpSystem] addLearnedKnowledge error:', err);
      toast.error('Error al añadir conocimiento');
      return false;
    }
  }, [agentId, finalConfig.enableLearning, loadHelpContent]);

  // === TOGGLE VOICE ===
  const toggleVoice = useCallback(() => {
    setState(prev => ({ ...prev, isVoiceActive: !prev.isVoiceActive }));
  }, []);

  // === CLEAR CHAT ===
  const clearChat = useCallback(() => {
    setState(prev => ({ ...prev, chatHistory: [] }));
    chatQueueRef.current = [];
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      chatQueueRef.current = [];
    };
  }, []);

  // === INITIAL LOAD (with guard) ===
  useEffect(() => {
    if (!guardRef.current.isInitialized && agentId && isMountedRef.current) {
      loadHelpContent();
    }
  }, [agentId]); // Only agentId, not loadHelpContent to prevent loops

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    helpContent: state.helpContent,
    chatHistory: state.chatHistory,
    isVoiceActive: state.isVoiceActive,
    isSpeaking: state.isSpeaking,
    
    // Actions
    loadHelpContent,
    sendChatMessage,
    addLearnedKnowledge,
    toggleVoice,
    clearChat,
    
    // Config
    config: finalConfig,
  };
}

export default useAgentHelpSystem;
