/**
 * useAgentHelp - Hook para sistema de ayuda inteligente de agentes
 * Gestiona conocimientos, chatbot y aprendizaje continuo
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface AgentKnowledge {
  id: string;
  agent_id: string;
  agent_type: 'crm' | 'erp' | 'supervisor' | 'vertical';
  module_type?: string;
  title: string;
  description?: string;
  category: 'capability' | 'example' | 'tip' | 'learned' | 'faq' | 'best_practice';
  content: string;
  source?: string;
  confidence_score?: number;
  usage_count: number;
  last_used_at?: string;
  example_input?: string;
  example_output?: string;
  section_index: number;
  order_index: number;
  tags: string[];
  is_verified: boolean;
  created_at: string;
}

export interface HelpConversation {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  input_mode: 'text' | 'voice';
  output_mode: 'text' | 'voice' | 'both';
  audio_url?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

export interface AgentHelpConfig {
  agentId: string;
  agentType: 'crm' | 'erp' | 'supervisor' | 'vertical';
  agentName: string;
  agentDescription?: string;
  moduleType?: string;
}

// === CATEGORÍAS PARA ÍNDICE ===
export const KNOWLEDGE_CATEGORIES = {
  capability: { label: 'Capacidades', icon: 'Zap', color: 'text-blue-500' },
  example: { label: 'Ejemplos', icon: 'FileText', color: 'text-emerald-500' },
  tip: { label: 'Tips y Trucos', icon: 'Lightbulb', color: 'text-amber-500' },
  learned: { label: 'Aprendido Recientemente', icon: 'Brain', color: 'text-purple-500' },
  faq: { label: 'Preguntas Frecuentes', icon: 'HelpCircle', color: 'text-cyan-500' },
  best_practice: { label: 'Mejores Prácticas', icon: 'Award', color: 'text-rose-500' },
} as const;

// === HOOK ===
export function useAgentHelp(config: AgentHelpConfig) {
  const [knowledge, setKnowledge] = useState<AgentKnowledge[]>([]);
  const [messages, setMessages] = useState<HelpConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const conversationId = useRef<string>(crypto.randomUUID());
  const audioContext = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // === FETCH KNOWLEDGE BASE ===
  const fetchKnowledge = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('agent_knowledge_base')
        .select('*')
        .eq('agent_id', config.agentId)
        .eq('agent_type', config.agentType)
        .eq('is_active', true)
        .order('section_index')
        .order('order_index');

      if (fetchError) throw fetchError;
      
      setKnowledge((data || []) as AgentKnowledge[]);
    } catch (err) {
      console.error('[useAgentHelp] fetchKnowledge error:', err);
    }
  }, [config.agentId, config.agentType]);

  // === GET KNOWLEDGE BY CATEGORY ===
  const getKnowledgeByCategory = useCallback((category: string) => {
    return knowledge.filter(k => k.category === category);
  }, [knowledge]);

  // === GET INDEXED SECTIONS ===
  const getIndexedSections = useCallback(() => {
    const sections: Record<string, AgentKnowledge[]> = {};
    
    Object.keys(KNOWLEDGE_CATEGORIES).forEach(cat => {
      const items = knowledge.filter(k => k.category === cat);
      if (items.length > 0) {
        sections[cat] = items;
      }
    });
    
    return sections;
  }, [knowledge]);

  // === SEND CHAT MESSAGE ===
  const sendMessage = useCallback(async (
    content: string, 
    inputMode: 'text' | 'voice' = 'text'
  ): Promise<string | null> => {
    if (!content.trim()) return null;

    const userMessage: HelpConversation = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      input_mode: inputMode,
      output_mode: 'text',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Guardar mensaje del usuario
      await supabase.from('agent_help_conversations').insert({
        agent_id: config.agentId,
        agent_type: config.agentType,
        conversation_id: conversationId.current,
        role: 'user',
        content: content.trim(),
        input_mode: inputMode,
        context: {
          agent_name: config.agentName,
          module_type: config.moduleType
        }
      } as any);

      // Construir contexto con conocimientos relevantes
      const relevantKnowledge = knowledge
        .filter(k => 
          k.content.toLowerCase().includes(content.toLowerCase()) ||
          k.tags.some(t => content.toLowerCase().includes(t.toLowerCase()))
        )
        .slice(0, 5)
        .map(k => `[${k.category}] ${k.title}: ${k.content}`)
        .join('\n\n');

      // Llamar a edge function de chat
      const { data, error: fnError } = await supabase.functions.invoke(
        'agent-help-chat',
        {
          body: {
            action: 'chat',
            agent_id: config.agentId,
            agent_type: config.agentType,
            agent_name: config.agentName,
            agent_description: config.agentDescription,
            message: content,
            conversation_id: conversationId.current,
            knowledge_context: relevantKnowledge,
            history: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        }
      );

      if (fnError) throw fnError;

      const responseContent = data?.response || 'Lo siento, no pude procesar tu consulta.';

      const assistantMessage: HelpConversation = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        input_mode: 'text',
        output_mode: 'text',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Guardar respuesta
      await supabase.from('agent_help_conversations').insert({
        agent_id: config.agentId,
        agent_type: config.agentType,
        conversation_id: conversationId.current,
        role: 'assistant',
        content: responseContent,
        output_mode: 'text'
      } as any);

      // Si hay nuevo conocimiento aprendido, guardarlo
      if (data?.learned_knowledge) {
        await addLearnedKnowledge(data.learned_knowledge);
      }

      return responseContent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useAgentHelp] sendMessage error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config, knowledge, messages]);

  // === TEXT TO SPEECH ===
  const speakResponse = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      
      const { data, error: ttsError } = await supabase.functions.invoke(
        'agent-help-tts',
        {
          body: { text, voice: 'alloy' }
        }
      );

      if (ttsError) throw ttsError;

      if (data?.audioContent) {
        if (!audioContext.current) {
          audioContext.current = new AudioContext();
        }

        const audioData = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
        const audioBuffer = await audioContext.current.decodeAudioData(audioData.buffer);
        
        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.current.destination);
        source.onended = () => setIsSpeaking(false);
        source.start(0);
      }
    } catch (err) {
      console.error('[useAgentHelp] speakResponse error:', err);
      setIsSpeaking(false);
    }
  }, []);

  // === SPEECH TO TEXT - START RECORDING ===
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        
        // Convertir a base64 y enviar a STT
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const { data, error: sttError } = await supabase.functions.invoke(
              'agent-help-stt',
              {
                body: { audio: base64Audio }
              }
            );

            if (sttError) throw sttError;

            if (data?.text) {
              // Enviar el texto transcrito como mensaje
              const response = await sendMessage(data.text, 'voice');
              if (response) {
                await speakResponse(response);
              }
            }
          } catch (err) {
            console.error('[useAgentHelp] STT error:', err);
            toast.error('Error al procesar audio');
          }
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('[useAgentHelp] startListening error:', err);
      toast.error('No se pudo acceder al micrófono');
    }
  }, [sendMessage, speakResponse]);

  // === STOP LISTENING ===
  const stopListening = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsListening(false);
  }, []);

  // === ADD LEARNED KNOWLEDGE ===
  const addLearnedKnowledge = useCallback(async (knowledgeData: {
    title: string;
    content: string;
    category?: string;
  }) => {
    try {
      await supabase.from('agent_knowledge_base').insert({
        agent_id: config.agentId,
        agent_type: config.agentType,
        title: knowledgeData.title,
        content: knowledgeData.content,
        category: knowledgeData.category || 'learned',
        source: 'interaction',
        section_index: 99,
        order_index: Date.now(),
        tags: ['aprendido', 'automático']
      } as any);

      // Refrescar conocimientos
      await fetchKnowledge();
      
      toast.success('Nuevo conocimiento aprendido');
    } catch (err) {
      console.error('[useAgentHelp] addLearnedKnowledge error:', err);
    }
  }, [config.agentId, config.agentType, fetchKnowledge]);

  // === INCREMENT USAGE COUNT ===
  const incrementUsage = useCallback(async (knowledgeId: string) => {
    try {
      const item = knowledge.find(k => k.id === knowledgeId);
      if (item) {
        await supabase
          .from('agent_knowledge_base')
          .update({ 
            usage_count: (item.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', knowledgeId);
      }
    } catch (err) {
      console.error('[useAgentHelp] incrementUsage error:', err);
    }
  }, [knowledge]);

  // === PROVIDE FEEDBACK ===
  const provideFeedback = useCallback(async (
    messageId: string,
    rating: number,
    wasHelpful: boolean,
    feedbackText?: string
  ) => {
    try {
      await supabase.from('agent_help_feedback').insert({
        conversation_id: conversationId.current,
        agent_id: config.agentId,
        rating,
        was_helpful: wasHelpful,
        feedback_type: wasHelpful ? 'helpful' : 'not_helpful',
        feedback_text: feedbackText
      } as any);

      toast.success('Gracias por tu feedback');
    } catch (err) {
      console.error('[useAgentHelp] provideFeedback error:', err);
    }
  }, [config.agentId]);

  // === CLEAR CONVERSATION ===
  const clearConversation = useCallback(() => {
    setMessages([]);
    conversationId.current = crypto.randomUUID();
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  return {
    // State
    knowledge,
    messages,
    isLoading,
    isSpeaking,
    isListening,
    error,
    conversationId: conversationId.current,
    
    // Knowledge
    fetchKnowledge,
    getKnowledgeByCategory,
    getIndexedSections,
    addLearnedKnowledge,
    incrementUsage,
    
    // Chat
    sendMessage,
    clearConversation,
    provideFeedback,
    
    // Voice
    speakResponse,
    startListening,
    stopListening,
  };
}

export default useAgentHelp;
