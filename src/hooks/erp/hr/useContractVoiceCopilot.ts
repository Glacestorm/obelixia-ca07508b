/**
 * useContractVoiceCopilot — Hook de voz para copiloto contractual
 * Web Speech API nativa (STT + TTS) + edge function hr-labor-copilot
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContractContext {
  contractType?: string;
  contractTypeCode?: string;
  hireDate?: string;
  terminationDate?: string;
  endDate?: string;
  extensionCount?: number;
  status?: string;
  employeeName?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useContractVoiceCopilot() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const sttSupported = typeof window !== 'undefined' && 
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final) setTranscript(final);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1').replace(/```[\s\S]*?```/g, '')
      .replace(/`(.*?)`/g, '$1').replace(/•/g, ',').replace(/\n/g, '. ').trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es') && v.localService) || voices.find(v => v.lang.startsWith('es'));
    if (esVoice) utterance.voice = esVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    // Chrome workaround
    const interval = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(interval); return; }
      window.speechSynthesis.pause(); window.speechSynthesis.resume();
    }, 10000);
    utterance.onend = () => { clearInterval(interval); setIsSpeaking(false); };
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const askQuestion = useCallback(async (question: string, context: ContractContext) => {
    if (!question.trim()) return;
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: new Date() }]);

    try {
      const { data, error } = await supabase.functions.invoke('hr-labor-copilot', {
        body: {
          action: 'consult',
          question,
          context: {
            domain: 'contract_lifecycle',
            ...context,
            systemInstructions: 'Eres un asesor laboral especializado en contratación española. Responde de forma concisa con base legal (ET, RDL 32/2021, LGSS). Máximo 3 párrafos.',
          },
        },
      });

      const answer = error ? 'Error al consultar. Inténtelo de nuevo.' :
        (data?.response || data?.data?.response || 'No se obtuvo respuesta.');

      setMessages(prev => [...prev, { role: 'assistant', content: answer, timestamp: new Date() }]);
      return answer;
    } catch {
      const fallback = 'Error de conexión con el asistente.';
      setMessages(prev => [...prev, { role: 'assistant', content: fallback, timestamp: new Date() }]);
      return fallback;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    isListening, isSpeaking, isProcessing, messages, transcript,
    sttSupported, ttsSupported,
    startListening, stopListening, speak, stopSpeaking,
    askQuestion, clearMessages, setTranscript,
  };
}
