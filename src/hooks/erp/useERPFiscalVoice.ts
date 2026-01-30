/**
 * useERPFiscalVoice - Hook para voz bidireccional (Speech-to-Text + Text-to-Speech)
 * Integrado con ElevenLabs TTS y Lovable AI STT
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoiceState {
  isRecording: boolean;
  isPlaying: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
}

export function useERPFiscalVoice() {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    isPlaying: false,
    isProcessing: false,
    transcript: '',
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize AudioContext on demand
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudioToText(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect in 100ms chunks

      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: ''
      }));

      console.log('[useERPFiscalVoice] Recording started');
    } catch (error) {
      console.error('[useERPFiscalVoice] Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: 'No se pudo acceder al micrófono'
      }));
      toast.error('No se pudo acceder al micrófono');
    }
  }, []);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: true
      }));
      console.log('[useERPFiscalVoice] Recording stopped');
    }
  }, [state.isRecording]);

  // Process audio blob to text
  const processAudioToText = useCallback(async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Call voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text) {
        setState(prev => ({
          ...prev,
          transcript: data.text,
          isProcessing: false
        }));
        console.log('[useERPFiscalVoice] Transcription:', data.text);
        return data.text;
      }

      throw new Error('No se recibió transcripción');
    } catch (error) {
      console.error('[useERPFiscalVoice] STT error:', error);
      setState(prev => ({
        ...prev,
        error: 'Error al transcribir audio',
        isProcessing: false
      }));
      return null;
    }
  }, []);

  // Text to Speech - Play audio response
  const speak = useCallback(async (text: string, voiceId?: string) => {
    if (!text.trim()) return;

    setState(prev => ({ ...prev, isPlaying: true }));

    try {
      // Call TTS edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-help-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            text: text.substring(0, 2000), // Limit text
            voiceId: voiceId || 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
            stability: 0.5,
            similarityBoost: 0.75
          })
        }
      );

      if (!response.ok) {
        throw new Error(`TTS error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop any current playback
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setState(prev => ({ ...prev, isPlaying: false, error: 'Error reproduciendo audio' }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      await audio.play();
      console.log('[useERPFiscalVoice] Playing TTS audio');
    } catch (error) {
      console.error('[useERPFiscalVoice] TTS error:', error);
      setState(prev => ({
        ...prev,
        isPlaying: false,
        error: 'Error al generar voz'
      }));
    }
  }, []);

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    speak,
    stopPlayback,
    clearTranscript
  };
}

export default useERPFiscalVoice;
