/**
 * Hook para el sistema de ayuda de agentes
 * Gestiona base de conocimientos, aprendizaje continuo y chatbot especializado
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: 'capabilities' | 'examples' | 'best_practices' | 'learned' | 'faq' | 'troubleshooting';
  description?: string;
  keywords?: string[];
  tags?: string[];
  usageCount: number;
  confidenceScore: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  source?: string;
  orderIndex?: number;
  sectionIndex?: number;
}

export interface AgentHelpIndex {
  id: string;
  section: string;
  title: string;
  subsections: Array<{
    id: string;
    title: string;
    entryCount: number;
  }>;
  orderIndex: number;
}

export interface HelpMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audioUrl?: string;
  wasHelpful?: boolean;
  inputMode?: 'text' | 'voice';
  outputMode?: 'text' | 'voice';
}

export interface AgentHelpContext {
  agentId: string;
  agentType: string;
  agentName: string;
  agentDescription: string;
  capabilities: string[];
  currentModule?: string;
  recentActivity?: Array<{
    action: string;
    timestamp: string;
    result?: string;
  }>;
}

export interface LearnedKnowledge {
  id: string;
  title: string;
  content: string;
  learnedAt: string;
  source: 'user_feedback' | 'execution' | 'conversation' | 'admin';
  confidence: number;
  usageCount: number;
}

// === HOOK ===

export function useAgentHelpSystem(context?: AgentHelpContext) {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [helpIndex, setHelpIndex] = useState<AgentHelpIndex[]>([]);
  const [learnedKnowledge, setLearnedKnowledge] = useState<LearnedKnowledge[]>([]);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationIdRef = useRef<string>(`conv_${Date.now()}`);
  const audioContextRef = useRef<AudioContext | null>(null);

  // === FETCH KNOWLEDGE BASE ===
  const fetchKnowledgeBase = useCallback(async () => {
    if (!context?.agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('agent_knowledge_base')
        .select('*')
        .eq('agent_id', context.agentId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      const entries: KnowledgeEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category as KnowledgeEntry['category'],
        description: item.description,
        keywords: item.keywords || [],
        tags: item.tags || [],
        usageCount: item.usage_count || 0,
        confidenceScore: item.confidence_score || 0.8,
        isVerified: item.is_verified || false,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        source: item.source,
        orderIndex: item.order_index,
        sectionIndex: item.section_index
      }));

      setKnowledgeEntries(entries);

      // Generar índice estructurado
      const indexMap = new Map<string, AgentHelpIndex>();
      entries.forEach((entry, idx) => {
        const sectionKey = entry.category;
        if (!indexMap.has(sectionKey)) {
          indexMap.set(sectionKey, {
            id: sectionKey,
            section: getCategoryLabel(sectionKey),
            title: getCategoryLabel(sectionKey),
            subsections: [],
            orderIndex: getCategoryOrder(sectionKey)
          });
        }
        const section = indexMap.get(sectionKey)!;
        section.subsections.push({
          id: entry.id,
          title: entry.title,
          entryCount: 1
        });
      });

      setHelpIndex(Array.from(indexMap.values()).sort((a, b) => a.orderIndex - b.orderIndex));

      // Filtrar conocimientos aprendidos
      const learned = entries
        .filter(e => e.category === 'learned')
        .map(e => ({
          id: e.id,
          title: e.title,
          content: e.content,
          learnedAt: e.createdAt,
          source: (e.source || 'execution') as LearnedKnowledge['source'],
          confidence: e.confidenceScore,
          usageCount: e.usageCount
        }));
      setLearnedKnowledge(learned);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar base de conocimientos';
      setError(message);
      console.error('[useAgentHelpSystem] fetchKnowledgeBase error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [context?.agentId]);

  // === SEARCH KNOWLEDGE ===
  const searchKnowledge = useCallback(async (query: string): Promise<KnowledgeEntry[]> => {
    if (!context?.agentId || !query.trim()) return [];

    try {
      const queryLower = query.toLowerCase();
      const results = knowledgeEntries.filter(entry => 
        entry.title.toLowerCase().includes(queryLower) ||
        entry.content.toLowerCase().includes(queryLower) ||
        entry.keywords?.some(k => k.toLowerCase().includes(queryLower)) ||
        entry.tags?.some(t => t.toLowerCase().includes(queryLower))
      );

      return results.sort((a, b) => b.usageCount - a.usageCount);
    } catch (err) {
      console.error('[useAgentHelpSystem] searchKnowledge error:', err);
      return [];
    }
  }, [context?.agentId, knowledgeEntries]);

  // === SEND MESSAGE TO CHATBOT ===
  const sendMessage = useCallback(async (
    content: string, 
    inputMode: 'text' | 'voice' = 'text'
  ): Promise<HelpMessage | null> => {
    if (!context) return null;

    const userMessage: HelpMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      inputMode
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Construir contexto para el agente
      const relevantKnowledge = await searchKnowledge(content);
      const knowledgeContext = relevantKnowledge
        .slice(0, 5)
        .map(k => `${k.title}: ${k.content}`)
        .join('\n\n');

      const { data, error: fnError } = await supabase.functions.invoke('agent-help-chat', {
        body: {
          message: content,
          conversationId: conversationIdRef.current,
          agentContext: {
            agentId: context.agentId,
            agentType: context.agentType,
            agentName: context.agentName,
            description: context.agentDescription,
            capabilities: context.capabilities,
            currentModule: context.currentModule
          },
          knowledgeContext,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (fnError) throw fnError;

      const assistantMessage: HelpMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data?.response || 'No pude generar una respuesta.',
        timestamp: new Date().toISOString(),
        audioUrl: data?.audioUrl,
        outputMode: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Guardar conversación en BD
      await supabase.from('agent_help_conversations').insert({
        agent_id: context.agentId,
        agent_type: context.agentType,
        conversation_id: conversationIdRef.current,
        role: 'user',
        content,
        input_mode: inputMode
      });

      await supabase.from('agent_help_conversations').insert({
        agent_id: context.agentId,
        agent_type: context.agentType,
        conversation_id: conversationIdRef.current,
        role: 'assistant',
        content: assistantMessage.content,
        output_mode: 'text'
      });

      return assistantMessage;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al procesar mensaje';
      console.error('[useAgentHelpSystem] sendMessage error:', err);
      
      const errorMessage: HelpMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'system',
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [context, messages, searchKnowledge]);

  // === TEXT TO SPEECH ===
  const textToSpeech = useCallback(async (text: string): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('agent-help-tts', {
        body: { text, voice: 'alloy' }
      });

      if (error) throw error;
      if (!data?.audioContent) return;

      // Reproducir audio
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
      const decodedAudio = await audioContextRef.current.decodeAudioData(audioBuffer.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContextRef.current.destination);
      source.start(0);

    } catch (err) {
      console.error('[useAgentHelpSystem] textToSpeech error:', err);
      toast.error('Error al reproducir audio');
    }
  }, []);

  // === SPEECH TO TEXT ===
  const startVoiceInput = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast.error('Tu navegador no soporta reconocimiento de voz');
        resolve(null);
        return;
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        resolve(null);
      };

      recognition.start();
    });
  }, []);

  // === ADD LEARNED KNOWLEDGE ===
  const addLearnedKnowledge = useCallback(async (
    title: string,
    content: string,
    source: LearnedKnowledge['source'] = 'conversation'
  ): Promise<boolean> => {
    if (!context?.agentId) return false;

    try {
      const { error } = await supabase.from('agent_knowledge_base').insert({
        agent_id: context.agentId,
        agent_type: context.agentType,
        title,
        content,
        category: 'learned',
        source,
        is_active: true,
        is_verified: false,
        confidence_score: 0.7,
        usage_count: 0
      });

      if (error) throw error;

      toast.success('Conocimiento añadido a la base');
      await fetchKnowledgeBase();
      return true;

    } catch (err) {
      console.error('[useAgentHelpSystem] addLearnedKnowledge error:', err);
      toast.error('Error al guardar conocimiento');
      return false;
    }
  }, [context, fetchKnowledgeBase]);

  // === PROVIDE FEEDBACK ===
  const provideFeedback = useCallback(async (
    messageId: string,
    wasHelpful: boolean,
    feedbackText?: string
  ): Promise<void> => {
    if (!context?.agentId) return;

    try {
      await supabase.from('agent_help_feedback').insert({
        agent_id: context.agentId,
        conversation_id: conversationIdRef.current,
        message_id: messageId,
        was_helpful: wasHelpful,
        feedback_text: feedbackText,
        rating: wasHelpful ? 5 : 1
      });

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, wasHelpful } : m
      ));

      toast.success(wasHelpful ? '¡Gracias por tu feedback positivo!' : 'Gracias, mejoraremos');

    } catch (err) {
      console.error('[useAgentHelpSystem] provideFeedback error:', err);
    }
  }, [context?.agentId]);

  // === CLEAR CONVERSATION ===
  const clearConversation = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = `conv_${Date.now()}`;
  }, []);

  // === GET ENTRY BY ID ===
  const getEntryById = useCallback((entryId: string): KnowledgeEntry | undefined => {
    return knowledgeEntries.find(e => e.id === entryId);
  }, [knowledgeEntries]);

  // === HELPERS ===
  function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      capabilities: '🎯 Capacidades',
      examples: '📚 Ejemplos de Uso',
      best_practices: '✨ Mejores Prácticas',
      learned: '🧠 Conocimiento Aprendido',
      faq: '❓ Preguntas Frecuentes',
      troubleshooting: '🔧 Solución de Problemas'
    };
    return labels[category] || category;
  }

  function getCategoryOrder(category: string): number {
    const orders: Record<string, number> = {
      capabilities: 1,
      examples: 2,
      best_practices: 3,
      faq: 4,
      troubleshooting: 5,
      learned: 6
    };
    return orders[category] || 99;
  }

  return {
    // Estado
    isLoading,
    knowledgeEntries,
    helpIndex,
    learnedKnowledge,
    messages,
    isConnected,
    error,

    // Acciones
    fetchKnowledgeBase,
    searchKnowledge,
    sendMessage,
    textToSpeech,
    startVoiceInput,
    addLearnedKnowledge,
    provideFeedback,
    clearConversation,
    getEntryById
  };
}

export default useAgentHelpSystem;
