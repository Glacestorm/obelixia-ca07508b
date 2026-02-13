/**
 * GALIA - Hook de Clasificación Automática de Documentos
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocClassification {
  categoria: string;
  subcategoria: string;
  confianza: number;
  descripcion: string;
}

export interface DocExtractedData {
  emisor?: string;
  receptor?: string;
  fecha?: string;
  numero?: string;
  importe?: number | null;
  nif?: string;
  otros?: Record<string, unknown>;
}

export interface DocValidation {
  esValido: boolean;
  problemas: string[];
  caducado: boolean;
  legible: boolean;
}

export interface ClassificationResult {
  clasificacion: DocClassification;
  datosExtraidos: DocExtractedData;
  validacion: DocValidation;
  sugerencias: string[];
}

export interface ChecklistItem {
  documento: string;
  requerido: boolean;
  presentado: boolean;
  estado: 'ok' | 'falta' | 'caducado' | 'incompleto' | 'revision';
  observacion: string;
  prioridad: 'critica' | 'alta' | 'media' | 'baja';
}

export interface ChecklistResult {
  completitud: number;
  checklist: ChecklistItem[];
  documentosFaltantes: string[];
  documentosExcedentes: string[];
  recomendaciones: string[];
  puedeContinuar: boolean;
}

export interface BatchClassResult {
  resultados: Array<{
    id: string;
    filename: string;
    categoria: string;
    subcategoria: string;
    confianza: number;
    datosRelevantes: { emisor?: string; fecha?: string; importe?: number | null };
  }>;
  resumen: {
    total: number;
    clasificados: number;
    confianzaMedia: number;
    categorias: Record<string, number>;
  };
}

export function useGaliaDocClassification() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [checklistResult, setChecklistResult] = useState<ChecklistResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchClassResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const classifyDocument = useCallback(async (documentText: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-doc-classification', {
        body: { action: 'classify', documentText }
      });
      if (fnError) throw fnError;
      if (data?.success && data?.data) {
        setClassificationResult(data.data);
        toast.success(`Documento clasificado: ${data.data.clasificacion?.categoria}`);
        return data.data as ClassificationResult;
      }
      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error clasificando documento: ${message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const validateChecklist = useCallback(async (
    requiredDocuments: string[],
    submittedDocuments: Array<{ tipo: string; nombre: string; fecha?: string }>
  ) => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-doc-classification', {
        body: { action: 'validate_checklist', requiredDocuments, submittedDocuments }
      });
      if (fnError) throw fnError;
      if (data?.success && data?.data) {
        setChecklistResult(data.data);
        const completeness = data.data.completitud || 0;
        if (completeness === 100) toast.success('Documentación completa ✓');
        else toast.warning(`Documentación al ${completeness}% - Faltan documentos`);
        return data.data as ChecklistResult;
      }
      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error validando checklist: ${message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const batchClassify = useCallback(async (
    documents: Array<{ id: string; text: string; filename: string }>
  ) => {
    setIsProcessing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-doc-classification', {
        body: { action: 'batch_classify', documents }
      });
      if (fnError) throw fnError;
      if (data?.success && data?.data) {
        setBatchResult(data.data);
        toast.success(`${data.data.resumen?.clasificados || 0} documentos clasificados`);
        return data.data as BatchClassResult;
      }
      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error en clasificación por lotes: ${message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    classificationResult,
    checklistResult,
    batchResult,
    error,
    classifyDocument,
    validateChecklist,
    batchClassify,
  };
}

export default useGaliaDocClassification;
