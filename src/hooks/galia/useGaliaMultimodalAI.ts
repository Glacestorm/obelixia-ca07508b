/**
 * useGaliaMultimodalAI - Hook for Multimodal AI (Voice + Documents)
 * 
 * Capabilities:
 * - Advanced OCR with structured data extraction
 * - Audio to text transcription
 * - Voice assistant for queries
 * - Document image analysis
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentAnalysisResult {
  documentType: string;
  confidence: number;
  extractedData: {
    fields: Array<{
      name: string;
      value: unknown;
      confidence: number;
      location: string;
    }>;
    tables: unknown[];
    signatures: unknown[];
    stamps: unknown[];
  };
  validation: {
    isComplete: boolean;
    missingFields: string[];
    warnings: string[];
    eligibleForLEADER: boolean;
  };
  summary: string;
}

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  language: string;
  duration_seconds: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  entities: Array<{
    type: string;
    value: string;
    position: number;
  }>;
  intent: 'consulta' | 'comando' | 'dictado';
}

export interface VoiceAssistantResponse {
  response: string;
  suggestions: string[];
  requiresHuman: boolean;
  escalationReason: string | null;
  relatedDocuments: string[];
  nextSteps: string[];
}

export interface StructuredData {
  entities: Array<{
    type: string;
    value: unknown;
    normalized: unknown;
    confidence: number;
    source: string;
  }>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  formData: Record<string, unknown>;
}

export type DocumentType = 'factura' | 'solicitud' | 'presupuesto' | 'licencia' | 'justificacion' | 'general';
export type Language = 'es' | 'ca' | 'eu' | 'gl';

export function useGaliaMultimodalAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [voiceResponse, setVoiceResponse] = useState<VoiceAssistantResponse | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const analyzeDocument = useCallback(async (
    imageBase64: string,
    documentType: DocumentType = 'general',
    language: Language = 'es'
  ): Promise<DocumentAnalysisResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-multimodal-ai', {
        body: {
          action: 'analyze_document',
          imageBase64,
          documentType,
          language
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setAnalysisResult(data.data);
        toast.success('Documento analizado correctamente');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error analizando documento';
      setError(message);
      toast.error('Error al analizar documento');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const transcribeVoice = useCallback(async (
    audioBase64: string,
    language: Language = 'es'
  ): Promise<TranscriptionResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-multimodal-ai', {
        body: {
          action: 'transcribe_voice',
          audioBase64,
          language
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setTranscriptionResult(data.data);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error transcribiendo audio';
      setError(message);
      toast.error('Error al transcribir audio');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const askVoiceAssistant = useCallback(async (
    textPrompt: string,
    expedienteId?: string,
    language: Language = 'es'
  ): Promise<VoiceAssistantResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-multimodal-ai', {
        body: {
          action: 'voice_assistant',
          textPrompt,
          expedienteId,
          language
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setVoiceResponse(data.data);
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error procesando consulta';
      setError(message);
      toast.error('Error al procesar consulta de voz');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const extractStructuredData = useCallback(async (
    textContent: string
  ): Promise<StructuredData | null> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-multimodal-ai', {
        body: {
          action: 'extract_structured_data',
          textPrompt: textContent
        }
      });

      if (fnError) throw fnError;

      return data?.data || null;
    } catch (err) {
      console.error('[useGaliaMultimodalAI] extractStructuredData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Grabando audio...');
    } catch (err) {
      toast.error('No se pudo acceder al micrófono');
      console.error('[useGaliaMultimodalAI] startRecording error:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsRecording(false);
          resolve(base64);
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    });
  }, []);

  const imageToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const clearState = useCallback(() => {
    setAnalysisResult(null);
    setTranscriptionResult(null);
    setVoiceResponse(null);
    setError(null);
  }, []);

  return {
    isLoading,
    isRecording,
    error,
    analysisResult,
    transcriptionResult,
    voiceResponse,
    analyzeDocument,
    transcribeVoice,
    askVoiceAssistant,
    extractStructuredData,
    startRecording,
    stopRecording,
    imageToBase64,
    clearState
  };
}

export default useGaliaMultimodalAI;
