import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface GaliaMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  confianza?: number;
  intencion?: string;
  derivadoTecnico?: boolean;
  feedback?: number;
}

export interface GaliaConversation {
  sessionId: string;
  messages: GaliaMessage[];
  galId?: string;
  expedienteId?: string;
  solicitudId?: string;
}

interface AsistenteOptions {
  galId?: string;
  expedienteId?: string;
  solicitudId?: string;
  modo?: 'ciudadano' | 'tecnico';
}

export function useGaliaAsistenteIA(options?: AsistenteOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GaliaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return null;

    const userMessage: GaliaMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-assistant', {
        body: {
          action: 'chat',
          sessionId,
          message: content.trim(),
          context: {
            galId: options?.galId,
            expedienteId: options?.expedienteId,
            solicitudId: options?.solicitudId,
            modo: options?.modo || 'ciudadano',
            historial: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        }
      });

      if (fnError) throw fnError;

      const assistantMessage: GaliaMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Lo siento, no he podido procesar tu consulta.',
        timestamp: new Date(),
        confianza: data.confianza,
        intencion: data.intencion,
        derivadoTecnico: data.derivadoTecnico,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Guardar interacción en BD
      if (user?.id) {
        await supabase.from('galia_interacciones_ia').insert([{
          gal_id: options?.galId,
          user_id: user.id,
          session_id: sessionId,
          tipo: options?.modo || 'ciudadano',
          expediente_id: options?.expedienteId,
          solicitud_id: options?.solicitudId,
          pregunta: content.trim(),
          respuesta: data.response,
          confianza: data.confianza,
          intencion_detectada: data.intencion,
          derivado_tecnico: data.derivadoTecnico,
          modelo_usado: 'gemini-2.5-flash',
          tokens_entrada: data.tokensEntrada,
          tokens_salida: data.tokensSalida,
          tiempo_respuesta_ms: data.tiempoRespuesta,
        }] as any);
      }

      return assistantMessage;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      const message = err instanceof Error ? err.message : 'Error al procesar consulta';
      setError(message);
      console.error('[useGaliaAsistenteIA] sendMessage error:', err);

      const errorMessage: GaliaMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Por favor, intenta de nuevo o contacta con un técnico.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, messages, options?.galId, options?.expedienteId, options?.solicitudId, options?.modo, user?.id]);

  const submitFeedback = useCallback(async (messageId: string, rating: number, comentario?: string) => {
    try {
      // Find the original question for this response
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex <= 0) return false;

      const pregunta = messages[messageIndex - 1]?.content;

      await supabase.from('galia_interacciones_ia')
        .update({ 
          feedback_usuario: rating, 
          feedback_comentario: comentario 
        })
        .eq('session_id', sessionId)
        .eq('pregunta', pregunta);

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, feedback: rating } : m
      ));

      toast.success('Gracias por tu valoración');
      return true;
    } catch (err) {
      console.error('[useGaliaAsistenteIA] submitFeedback error:', err);
      return false;
    }
  }, [sessionId, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const getWelcomeMessage = useCallback((): GaliaMessage => {
    const modo = options?.modo || 'ciudadano';
    const content = modo === 'ciudadano'
      ? '¡Hola! Soy tu asistente virtual para ayudas LEADER. Puedo resolver tus dudas sobre:\n\n• **Convocatorias abiertas** y requisitos\n• **Documentación necesaria** para solicitar ayudas\n• **Estado de tu expediente** o solicitud\n• **Justificación de gastos** y plazos\n\n¿En qué puedo ayudarte hoy?'
      : '¡Hola! Soy tu copiloto para gestión de expedientes LEADER. Puedo ayudarte con:\n\n• **Análisis de solicitudes** y elegibilidad\n• **Moderación de costes** y detección de anomalías\n• **Consultas normativas** y criterios de valoración\n• **Generación de informes** y resoluciones\n\n¿Qué necesitas revisar?';

    return {
      id: 'welcome',
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
  }, [options?.modo]);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    submitFeedback,
    clearMessages,
    cancelRequest,
    getWelcomeMessage,
  };
}

export default useGaliaAsistenteIA;
