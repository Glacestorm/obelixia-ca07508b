// Anti-Recursion Hook for Agent Help System
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AgentHelpConfig,
  AgentKnowledge,
  AgentChatMessage,
  AgentChatSession,
  AgentLearningItem,
  RecursionGuard,
  DEFAULT_RECURSION_GUARD,
  RATE_LIMIT,
} from './agentHelpTypes';
import { getAgentHelpConfig } from '@/config/agentHelpConfigs';

interface UseAgentHelpSystemProps {
  agentId: string;
  agentType: 'erp' | 'crm' | 'supervisor' | 'domain';
}

interface UseAgentHelpSystemReturn {
  // State
  isLoading: boolean;
  error: string | null;
  helpConfig: AgentHelpConfig | null;
  learnedKnowledge: AgentKnowledge[];
  chatSession: AgentChatSession | null;
  
  // Actions
  loadHelp: () => Promise<void>;
  sendMessage: (content: string, isVoice?: boolean) => Promise<AgentChatMessage | null>;
  submitFeedback: (messageId: string, feedback: 'positive' | 'negative') => Promise<void>;
  recordLearning: (item: Omit<AgentLearningItem, 'id' | 'createdAt' | 'processed'>) => void;
  clearChat: () => void;
  
  // Metrics
  renderCount: number;
  isRateLimited: boolean;
}

export function useAgentHelpSystem({
  agentId,
  agentType,
}: UseAgentHelpSystemProps): UseAgentHelpSystemReturn {
  // === ANTI-RECURSION REFS ===
  const guardRef = useRef<RecursionGuard>({ ...DEFAULT_RECURSION_GUARD });
  const abortControllerRef = useRef<AbortController | null>(null);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const pendingLearningRef = useRef<Omit<AgentLearningItem, 'id' | 'createdAt' | 'processed'>[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // === STATE ===
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnedKnowledge, setLearnedKnowledge] = useState<AgentKnowledge[]>([]);
  const [chatSession, setChatSession] = useState<AgentChatSession | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // === STATIC CONFIG (no API call needed) ===
  const helpConfig = useMemo(() => {
    return getAgentHelpConfig(agentId, agentType);
  }, [agentId, agentType]);

  // === RENDER GUARD ===
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    if (timeSinceLastRender < 1000) {
      renderCountRef.current++;
      if (renderCountRef.current > RATE_LIMIT.MAX_RENDER_PER_SECOND) {
        console.error('[AgentHelpSystem] Circuit breaker: Too many renders');
        setError('Sistema pausado por exceso de actualizaciones');
        setIsRateLimited(true);
        return;
      }
    } else {
      renderCountRef.current = 1;
      lastRenderTimeRef.current = now;
      setIsRateLimited(false);
    }
  });

  // === RATE LIMIT CHECK ===
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const guard = guardRef.current;
    
    // Reset counter if more than a minute has passed
    if (now - guard.lastFetchTime > 60000) {
      guard.fetchCount = 0;
    }
    
    // Check minimum interval
    if (now - guard.lastFetchTime < RATE_LIMIT.MIN_FETCH_INTERVAL_MS) {
      return false;
    }
    
    // Check max fetches per minute
    if (guard.fetchCount >= RATE_LIMIT.MAX_FETCHES_PER_MINUTE) {
      return false;
    }
    
    return true;
  }, []);

  // === LOAD LEARNED KNOWLEDGE ===
  const loadHelp = useCallback(async () => {
    // Guard checks
    if (guardRef.current.isFetching) {
      console.log('[AgentHelpSystem] Fetch already in progress, skipping');
      return;
    }
    
    if (!checkRateLimit()) {
      console.log('[AgentHelpSystem] Rate limited, skipping fetch');
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    guardRef.current.isFetching = true;
    guardRef.current.fetchCount++;
    guardRef.current.lastFetchTime = Date.now();
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch learned knowledge from database
      const { data, error: fetchError } = await supabase
        .from('agent_knowledge_base')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      const knowledge: AgentKnowledge[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        source: item.source || 'system',
        confidence: item.confidence_score || 0.8,
        usageCount: item.usage_count || 0,
        createdAt: item.created_at,
        lastUsedAt: item.last_used_at,
      }));

      setLearnedKnowledge(knowledge);
      guardRef.current.isInitialized = true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('[AgentHelpSystem] Fetch aborted');
        return;
      }
      const message = err instanceof Error ? err.message : 'Error cargando ayuda';
      setError(message);
      console.error('[AgentHelpSystem] Load error:', err);
    } finally {
      guardRef.current.isFetching = false;
      setIsLoading(false);
    }
  }, [agentId, checkRateLimit]);

  // === SEND CHAT MESSAGE ===
  const sendMessage = useCallback(async (
    content: string,
    isVoice = false
  ): Promise<AgentChatMessage | null> => {
    if (!checkRateLimit()) {
      toast.error('Demasiadas solicitudes. Espera un momento.');
      return null;
    }

    const userMessage: AgentChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      isVoice,
    };

    // Update local state immediately
    setChatSession(prev => {
      if (!prev) {
        return {
          id: crypto.randomUUID(),
          agentId,
          agentType,
          messages: [userMessage],
          startedAt: new Date().toISOString(),
        };
      }
      return {
        ...prev,
        messages: [...prev.messages, userMessage],
      };
    });

    try {
      // Call edge function for AI response
      const { data, error: fnError } = await supabase.functions.invoke(
        'agent-help-assistant',
        {
          body: {
            action: 'chat',
            agentId,
            agentType,
            message: content,
            context: {
              helpConfig,
              recentKnowledge: learnedKnowledge.slice(0, 5),
            },
          },
        }
      );

      if (fnError) throw fnError;

      const assistantMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.response || 'Lo siento, no pude procesar tu mensaje.',
        timestamp: new Date().toISOString(),
      };

      setChatSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
      } : null);

      return assistantMessage;
    } catch (err) {
      console.error('[AgentHelpSystem] Chat error:', err);
      toast.error('Error al enviar mensaje');
      return null;
    }
  }, [agentId, agentType, helpConfig, learnedKnowledge, checkRateLimit]);

  // === SUBMIT FEEDBACK ===
  const submitFeedback = useCallback(async (
    messageId: string,
    feedback: 'positive' | 'negative'
  ) => {
    setChatSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, feedback } : msg
        ),
      };
    });

    // Queue for batch processing
    if (feedback === 'positive') {
      const message = chatSession?.messages.find(m => m.id === messageId);
      if (message && message.role === 'assistant') {
        recordLearning({
          agentId,
          knowledgeType: 'user_insight',
          content: message.content,
          source: 'user_feedback',
        });
      }
    }
  }, [agentId, chatSession]);

  // === RECORD LEARNING (BATCHED) ===
  const recordLearning = useCallback((
    item: Omit<AgentLearningItem, 'id' | 'createdAt' | 'processed'>
  ) => {
    pendingLearningRef.current.push(item);
    
    // Clear existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    // Schedule batch flush
    flushTimeoutRef.current = setTimeout(async () => {
      if (pendingLearningRef.current.length === 0) return;
      
      const batch = [...pendingLearningRef.current];
      pendingLearningRef.current = [];
      
      try {
        // Insert batch into knowledge base
        const inserts = batch.map(item => ({
          agent_id: item.agentId,
          agent_type: agentType,
          category: item.knowledgeType,
          title: `Aprendizaje: ${item.knowledgeType}`,
          content: item.content,
          source: item.source,
          is_active: true,
          confidence_score: 0.7,
        }));

        await supabase
          .from('agent_knowledge_base')
          .insert(inserts);
          
        console.log(`[AgentHelpSystem] Flushed ${batch.length} learning items`);
      } catch (err) {
        console.error('[AgentHelpSystem] Failed to flush learning:', err);
      }
    }, RATE_LIMIT.BATCH_INTERVAL_MS);
  }, [agentType]);

  // === CLEAR CHAT ===
  const clearChat = useCallback(() => {
    setChatSession(null);
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  // === INITIAL LOAD (ONCE) ===
  useEffect(() => {
    if (!guardRef.current.isInitialized && agentId) {
      loadHelp();
    }
  }, [agentId]); // Minimal dependencies

  return {
    isLoading,
    error,
    helpConfig,
    learnedKnowledge,
    chatSession,
    loadHelp,
    sendMessage,
    submitFeedback,
    recordLearning,
    clearChat,
    renderCount: renderCountRef.current,
    isRateLimited,
  };
}

export default useAgentHelpSystem;
