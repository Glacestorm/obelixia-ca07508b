/**
 * Hook para Sistema de Ayuda de Agentes
 * FASE 1: Chatbot de ayuda contextual con voz (ElevenLabs)
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
    isListening: false,
  });

  // === ANTI-RECURSION REFS ===
  const isMountedRef = useRef(true);
  const guardRef = useRef<RecursionGuard>(createRecursionGuard());
  const circuitBreakerRef = useRef({ failures: 0, lastFailure: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatQueueRef = useRef<string[]>([]);
  const isProcessingChatRef = useRef(false);
  const MAX_QUEUE_SIZE = 10; // Limit queue to prevent infinite growth
  
  // Refs para evitar dependencias inestables en useCallback
  const helpContentRef = useRef(state.helpContent);
  const chatHistoryRef = useRef(state.chatHistory);
  
  // Sincronizar refs con estado
  useEffect(() => {
    helpContentRef.current = state.helpContent;
  }, [state.helpContent]);
  
  useEffect(() => {
    chatHistoryRef.current = state.chatHistory;
  }, [state.chatHistory]);

  // === VOICE REFS ===
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
    
    // Skip if already initialized and not forcing refresh - usar ref para evitar dependencia
    if (guardRef.current.isInitialized && !forceRefresh) {
      return helpContentRef.current;
    }
    
    if (!canFetch()) return helpContentRef.current;
    
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
        'agent-help-chat',
        {
          body: {
            agentId,
            agentType: agentInfo?.type || 'supervisor',
            message: 'Dame un resumen de tus capacidades y cómo puedes ayudarme.',
            conversationId: `init_${agentId}_${Date.now()}`,
          },
        }
      );

      if (!isMountedRef.current) return null;
      if (fnError) throw fnError;

      if (data?.success && data?.response) {
        const helpContent: AgentHelpContent = {
          agentId,
          agentType: agentInfo?.type || 'supervisor',
          agentName: agentInfo?.name || agentId,
          description: data.response,
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          tableOfContents: [],
          overview: data.response,
          capabilities: [],
          useCases: [],
          bestPractices: [],
          examples: [],
          learnedKnowledge: [],
          tips: [],
          warnings: [],
        };
        
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
  }, [agentId, canFetch]); // Removido state.helpContent - usamos ref

  // === SEND CHAT MESSAGE ===
  const sendChatMessage = useCallback(async (
    message: string,
    isVoice = false
  ): Promise<ChatMessage | null> => {
    if (!isMountedRef.current) return null;
    if (!message.trim()) return null;
    
    // Queue the message if already processing - con límite
    if (isProcessingChatRef.current) {
      if (chatQueueRef.current.length >= MAX_QUEUE_SIZE) {
        console.warn('[useAgentHelpSystem] Queue full, dropping message');
        toast.warning('Demasiados mensajes en cola');
        return null;
      }
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
        'agent-help-chat',
        {
          body: {
            agentId,
            agentType: agentInfo?.type || 'supervisor',
            message,
            conversationId: `chat_${agentId}_${Date.now()}`,
            history: chatHistoryRef.current.slice(-10).map(m => ({
              role: m.role,
              content: m.content,
            })),
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
          tokensUsed: data.tokensUsed,
          responseTimeMs: data.responseTimeMs,
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
      
      const errorMsg = err instanceof Error ? err.message : 'Error al enviar mensaje';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
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
  }, [agentId, finalConfig.maxChatHistory]); // Removido state.chatHistory - usamos ref

  // === TEXT-TO-SPEECH (ElevenLabs) ===
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!finalConfig.enableVoice) return;

    setState(prev => ({ ...prev, isSpeaking: true }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-help-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text,
            voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.onerror = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();
    } catch (err) {
      console.error('[useAgentHelpSystem] TTS error:', err);
      setState(prev => ({ ...prev, isSpeaking: false }));
      toast.error('Error al reproducir audio');
    }
  }, [finalConfig.enableVoice]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  // === SPEECH-TO-TEXT ===
  const startListening = useCallback(async (): Promise<void> => {
    if (!finalConfig.enableVoice) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setState(prev => ({ ...prev, isListening: true }));
    } catch (err) {
      console.error('[useAgentHelpSystem] Microphone error:', err);
      toast.error('No se pudo acceder al micrófono');
    }
  }, [finalConfig.enableVoice]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, []);

  const processVoiceInput = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binary);

      // Call STT edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio },
      });

      if (error) throw error;

      const transcribedText = data?.text?.trim();

      if (transcribedText) {
        // Send transcribed text as message
        const response = await sendChatMessage(transcribedText, true);
        
        // Speak the response
        if (response) {
          await speakText(response.content);
        }
      } else {
        toast.warning('No se detectó audio claro');
      }
    } catch (err) {
      console.error('[useAgentHelpSystem] STT error:', err);
      toast.error('Error al procesar audio');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [sendChatMessage, speakText]);

  // === ADD LEARNED KNOWLEDGE ===
  const addLearnedKnowledge = useCallback(async (
    knowledge: Omit<LearnedKnowledge, 'id' | 'createdAt' | 'usageCount'>
  ): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    if (!finalConfig.enableLearning) return false;
    
    try {
      const agentInfo = AGENT_HELP_REGISTRY[agentId];
      
      const { error } = await supabase.from('agent_knowledge_base').insert({
        agent_id: agentId,
        agent_type: agentInfo?.type || 'supervisor',
        title: knowledge.title,
        content: knowledge.content,
        category: knowledge.source,
        source: knowledge.source,
        confidence_score: knowledge.confidence,
        is_verified: false,
      });

      if (error) throw error;

      // Refresh help content to include new knowledge
      await loadHelpContent(true);
      toast.success('Conocimiento añadido');
      return true;
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
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
    isListening: state.isListening,
    
    // Chat Actions
    loadHelpContent,
    sendChatMessage,
    clearChat,
    
    // Voice Actions
    speakText,
    stopSpeaking,
    startListening,
    stopListening,
    toggleVoice,
    
    // Learning Actions
    addLearnedKnowledge,
    
    // Config
    config: finalConfig,
  };
}

export default useAgentHelpSystem;
