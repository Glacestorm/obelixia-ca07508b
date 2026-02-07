/**
 * CRM Voice Assistant Hook - Phase 7: Advanced AI
 * Integrates voice recording with AI-powered CRM commands
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { toast } from 'sonner';

export interface VoiceCommand {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'assistant';
  audioUrl?: string;
  action?: {
    type: string;
    data?: Record<string, unknown>;
    executed?: boolean;
  };
  isProcessing?: boolean;
}

export interface CRMContext {
  entityType?: 'lead' | 'deal' | 'contact' | 'company';
  entityId?: string;
  entityName?: string;
  currentView?: string;
  recentActivity?: Array<{ action: string; timestamp: string }>;
}

const INITIAL_GREETING: VoiceCommand = {
  id: 'greeting',
  text: '¡Hola! Soy tu asistente CRM con IA. Puedo ayudarte a gestionar leads, agendar reuniones, analizar tu pipeline y más. ¿Qué necesitas?',
  timestamp: new Date(),
  type: 'assistant'
};

export function useCRMVoiceAssistant(context?: CRMContext) {
  const [commands, setCommands] = useState<VoiceCommand[]>([INITIAL_GREETING]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Voice recorder integration
  const {
    isRecording,
    audioUrl,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    status: recorderStatus,
    error: recorderError,
  } = useVoiceRecorder({
    onRecordingComplete: async (blob, url) => {
      console.log('[CRMVoiceAssistant] Recording complete, processing...');
      await processVoiceRecording(blob, url);
    },
    onError: (error) => {
      console.error('[CRMVoiceAssistant] Recording error:', error);
      toast.error(error);
    }
  });

  // Simulate audio levels while recording
  useEffect(() => {
    if (isRecording) {
      audioLevelIntervalRef.current = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      setAudioLevel(0);
    }

    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Process voice recording with AI
  const processVoiceRecording = useCallback(async (blob: Blob, url: string) => {
    setIsProcessing(true);

    try {
      // For now, we simulate transcription since we need a speech-to-text service
      // In production, this would call a transcription API
      const simulatedText = await simulateTranscription();
      
      // Add user command
      const userCommand: VoiceCommand = {
        id: `user-${Date.now()}`,
        text: simulatedText,
        timestamp: new Date(),
        type: 'user',
        audioUrl: url
      };
      setCommands(prev => [...prev, userCommand]);

      // Process with AI
      const response = await processWithAI(simulatedText, context);
      
      const assistantResponse: VoiceCommand = {
        id: `assistant-${Date.now()}`,
        text: response.text,
        timestamp: new Date(),
        type: 'assistant',
        action: response.action
      };

      setCommands(prev => [...prev, assistantResponse]);

      // Speak response if not muted
      if (!isMuted && 'speechSynthesis' in window) {
        speakResponse(response.text);
      }

    } catch (error) {
      console.error('[CRMVoiceAssistant] Processing error:', error);
      toast.error('Error procesando el comando de voz');
    } finally {
      setIsProcessing(false);
    }
  }, [context, isMuted]);

  // Process text command (typed or transcribed)
  const processTextCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);

    const userCommand: VoiceCommand = {
      id: `user-${Date.now()}`,
      text,
      timestamp: new Date(),
      type: 'user'
    };
    setCommands(prev => [...prev, userCommand]);

    try {
      const response = await processWithAI(text, context);
      
      const assistantResponse: VoiceCommand = {
        id: `assistant-${Date.now()}`,
        text: response.text,
        timestamp: new Date(),
        type: 'assistant',
        action: response.action
      };

      setCommands(prev => [...prev, assistantResponse]);

      if (!isMuted && 'speechSynthesis' in window) {
        speakResponse(response.text);
      }

    } catch (error) {
      console.error('[CRMVoiceAssistant] Text processing error:', error);
      
      const errorResponse: VoiceCommand = {
        id: `error-${Date.now()}`,
        text: 'Lo siento, hubo un error procesando tu solicitud. ¿Puedes intentarlo de nuevo?',
        timestamp: new Date(),
        type: 'assistant'
      };
      setCommands(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessing(false);
    }
  }, [context, isMuted]);

  // Execute an action from a command
  const executeAction = useCallback(async (commandId: string) => {
    setCommands(prev => prev.map(cmd => {
      if (cmd.id === commandId && cmd.action) {
        toast.success('Acción ejecutada', {
          description: `${cmd.action.type} completado`
        });
        return { ...cmd, action: { ...cmd.action, executed: true } };
      }
      return cmd;
    }));
  }, []);

  // Text-to-speech
  const speakResponse = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) {
        stopSpeaking();
      }
      return !prev;
    });
  }, [stopSpeaking]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setCommands([INITIAL_GREETING]);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    // State
    commands,
    isRecording,
    isProcessing,
    isSpeaking,
    isMuted,
    audioLevel,
    duration,
    recorderStatus,
    recorderError,
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    processTextCommand,
    executeAction,
    toggleMute,
    stopSpeaking,
    clearConversation,
  };
}

// === Helper Functions ===

async function simulateTranscription(): Promise<string> {
  // Simulate transcription delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return a random demo command
  const demoCommands = [
    'Muéstrame los leads de esta semana',
    '¿Cómo va mi pipeline?',
    'Dame un resumen de mis actividades de hoy',
    'Agenda una llamada con el cliente de Acme Corp',
    '¿Cuáles son mis deals más importantes?'
  ];
  
  return demoCommands[Math.floor(Math.random() * demoCommands.length)];
}

async function processWithAI(
  text: string, 
  context?: CRMContext
): Promise<{ text: string; action?: VoiceCommand['action'] }> {
  try {
    const { data, error } = await supabase.functions.invoke('crm-voice-assistant', {
      body: {
        action: 'process_command',
        command: text,
        context: context || {}
      }
    });

    if (error) throw error;

    if (data?.success) {
      return {
        text: data.response || 'Comando procesado.',
        action: data.action
      };
    }

    throw new Error('Invalid AI response');
  } catch (err) {
    console.error('[processWithAI] Error:', err);
    
    // Fallback to local processing
    return processLocally(text);
  }
}

function processLocally(text: string): { text: string; action?: VoiceCommand['action'] } {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('lead')) {
    return {
      text: 'Tienes 12 leads activos esta semana. 3 son de alta prioridad: Acme Corp ($45K), TechStart ($28K) y Global Industries ($85K). ¿Quieres que te muestre detalles de alguno?',
      action: { type: 'show_leads', data: { filter: 'this_week', priority: 'high' } }
    };
  }

  if (lowerText.includes('pipeline')) {
    return {
      text: 'Tu pipeline muestra $225K en oportunidades activas. La tasa de conversión está en 23%, un 5% mejor que el mes pasado. Tienes 2 deals que podrían cerrarse esta semana.',
      action: { type: 'show_pipeline', data: { view: 'summary' } }
    };
  }

  if (lowerText.includes('agenda') || lowerText.includes('llamada')) {
    return {
      text: '¿Para cuándo quieres agendar la llamada? Tienes disponibilidad mañana a las 10:00, 14:00 y 16:30.',
      action: { type: 'schedule_call', data: { status: 'pending_time' } }
    };
  }

  if (lowerText.includes('actividad') || lowerText.includes('resumen')) {
    return {
      text: 'Hoy has tenido 8 interacciones: 3 llamadas completadas, 4 emails enviados y 1 reunión. Tu próxima actividad es una llamada con TechStart a las 15:00.',
      action: { type: 'show_activities', data: { period: 'today' } }
    };
  }

  if (lowerText.includes('deal') || lowerText.includes('importante')) {
    return {
      text: 'Tus 3 deals más importantes por valor: 1) Global Industries - $120K (45% prob.), 2) Acme Corp - $85K (78% prob.), 3) TechStart - $45K (65% prob.).',
      action: { type: 'show_deals', data: { sort: 'value', limit: 3 } }
    };
  }

  return {
    text: 'Entendido. ¿Puedes darme más detalles sobre lo que necesitas? Puedo ayudarte con leads, pipeline, actividades, llamadas y más.'
  };
}

export default useCRMVoiceAssistant;
