/**
 * useWebSpeech - Hook for browser-native Speech Recognition (STT) and Speech Synthesis (TTS)
 * Uses the free Web Speech API — no API keys or external services needed.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseWebSpeechOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
}

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}) {
  const { lang = 'es-ES', continuous = false, onResult, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesReadyRef = useRef(false);

  // Pre-load voices — they're async in most browsers
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSttSupported(!!SpeechRecognition);
    const hasTts = 'speechSynthesis' in window;
    setTtsSupported(hasTts);

    if (hasTts) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
          voicesReadyRef.current = true;
          console.log(`[TTS] ${v.length} voces cargadas`);
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const text = final || interim;
      setTranscript(text);
      if (final) {
        onResult?.(final);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, continuous, onResult, onEnd]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string, voiceLang?: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[TTS] speechSynthesis no disponible');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean markdown/HTML for cleaner speech
    const cleanText = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/•/g, ',')
      .replace(/\n/g, '. ')
      .trim();

    if (!cleanText) {
      console.warn('[TTS] No hay texto para leer');
      return;
    }

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = voiceLang || lang;
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Pick the best voice
      const voices = window.speechSynthesis.getVoices();
      const targetLang = voiceLang || lang;
      const preferredVoice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0]) && v.localService)
        || voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log(`[TTS] Usando voz: ${preferredVoice.name} (${preferredVoice.lang})`);
      } else {
        console.log(`[TTS] Sin voz específica, usando default. Voces disponibles: ${voices.length}`);
      }

      utterance.onstart = () => {
        console.log('[TTS] Reproduciendo...');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('[TTS] Finalizado');
        setIsSpeaking(false);
      };
      utterance.onerror = (e) => {
        console.error('[TTS] Error:', e);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // Chrome workaround: Chrome pauses speech after ~15s. Resume it periodically.
      const resumeInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(resumeInterval);
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);

      utterance.onend = () => {
        clearInterval(resumeInterval);
        setIsSpeaking(false);
      };
    };

    // If voices aren't loaded yet, wait briefly
    if (window.speechSynthesis.getVoices().length === 0) {
      console.log('[TTS] Esperando carga de voces...');
      const onVoices = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        doSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      // Safety timeout
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        doSpeak();
      }, 1000);
    } else {
      doSpeak();
    }
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    // STT
    isListening,
    transcript,
    startListening,
    stopListening,
    sttSupported,
    // TTS
    isSpeaking,
    speak,
    stopSpeaking,
    ttsSupported,
  };
}
