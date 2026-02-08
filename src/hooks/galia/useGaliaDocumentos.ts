/**
 * Hook para gestión de documentos GALIA
 * Integración con OCR IA y clasificación automática
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GaliaDocumento {
  id: string;
  expediente_id: string | null;
  solicitud_id: string | null;
  beneficiario_id: string | null;
  tipo: string;
  subtipo: string | null;
  nombre_archivo: string;
  nombre_original: string | null;
  storage_path: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  hash_sha256: string | null;
  fecha_documento: string | null;
  fecha_subida: string | null;
  subido_por: string | null;
  es_obligatorio: boolean;
  validado: boolean;
  validado_at: string | null;
  validado_por: string | null;
  motivo_rechazo: string | null;
  requiere_revision: boolean;
  resultado_ia: Record<string, unknown> | null;
  datos_extraidos: Record<string, unknown> | null;
  confianza_extraccion: number | null;
  version: number;
  documento_padre_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentoFilters {
  expedienteId?: string;
  solicitudId?: string;
  tipo?: string;
  validado?: boolean;
  requiereRevision?: boolean;
}

export function useGaliaDocumentos(filters?: DocumentoFilters) {
  const [documentos, setDocumentos] = useState<GaliaDocumento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocumentos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('galia_documentos')
        .select('*')
        .order('fecha_subida', { ascending: false });

      if (filters?.expedienteId) {
        query = query.eq('expediente_id', filters.expedienteId);
      }

      if (filters?.solicitudId) {
        query = query.eq('solicitud_id', filters.solicitudId);
      }

      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters?.validado !== undefined) {
        query = query.eq('validado', filters.validado);
      }

      if (filters?.requiereRevision !== undefined) {
        query = query.eq('requiere_revision', filters.requiereRevision);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDocumentos((data || []) as GaliaDocumento[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar documentos';
      setError(message);
      console.error('[useGaliaDocumentos] fetchDocumentos error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.expedienteId, filters?.solicitudId, filters?.tipo, filters?.validado, filters?.requiereRevision]);

  const createDocumento = useCallback(async (documento: Partial<GaliaDocumento>) => {
    try {
      const { data, error: createError } = await supabase
        .from('galia_documentos')
        .insert([documento as any])
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Documento registrado');
      await fetchDocumentos();
      return data as GaliaDocumento;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear documento';
      toast.error(message);
      return null;
    }
  }, [fetchDocumentos]);

  const updateDocumento = useCallback(async (id: string, updates: Partial<GaliaDocumento>) => {
    try {
      const { error: updateError } = await supabase
        .from('galia_documentos')
        .update(updates as any)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Documento actualizado');
      await fetchDocumentos();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar documento';
      toast.error(message);
      return false;
    }
  }, [fetchDocumentos]);

  const saveOCRResult = useCallback(async (
    documentoId: string,
    ocrResult: {
      extracted_text: string;
      entities: Array<{ type: string; value: string; confidence: number }>;
      classification: { category?: string; requires_review?: boolean };
      confidence: number;
    }
  ) => {
    try {
      const updates: Partial<GaliaDocumento> = {
        resultado_ia: { 
          extracted_text: ocrResult.extracted_text,
          classification: ocrResult.classification,
        },
        datos_extraidos: { entities: ocrResult.entities },
        confianza_extraccion: ocrResult.confidence,
        requiere_revision: ocrResult.classification.requires_review || false,
      };

      const { error: updateError } = await supabase
        .from('galia_documentos')
        .update(updates as any)
        .eq('id', documentoId);

      if (updateError) throw updateError;

      toast.success('Resultado OCR guardado');
      await fetchDocumentos();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar resultado OCR';
      toast.error(message);
      return false;
    }
  }, [fetchDocumentos]);

  const validarDocumento = useCallback(async (id: string, userId: string, aprobado: boolean, motivoRechazo?: string) => {
    try {
      const updates: Partial<GaliaDocumento> = {
        validado: aprobado,
        validado_por: userId,
        validado_at: new Date().toISOString(),
        motivo_rechazo: aprobado ? null : (motivoRechazo || null),
        requiere_revision: false,
      };

      const { error: updateError } = await supabase
        .from('galia_documentos')
        .update(updates as any)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success(aprobado ? 'Documento validado' : 'Documento rechazado');
      await fetchDocumentos();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar documento';
      toast.error(message);
      return false;
    }
  }, [fetchDocumentos]);

  const getEstadisticas = useCallback(() => {
    const total = documentos.length;
    const pendientes = documentos.filter(d => !d.validado && !d.motivo_rechazo).length;
    const validados = documentos.filter(d => d.validado).length;
    const rechazados = documentos.filter(d => d.motivo_rechazo).length;
    const requierenRevision = documentos.filter(d => d.requiere_revision).length;
    const confianzaMedia = documentos.length > 0
      ? documentos.reduce((sum, d) => sum + (d.confianza_extraccion || 0), 0) / documentos.length
      : 0;

    return {
      total,
      pendientes,
      validados,
      rechazados,
      requierenRevision,
      confianzaMedia: Math.round(confianzaMedia * 100),
    };
  }, [documentos]);

  const getDocumentosPorTipo = useCallback(() => {
    const porTipo: Record<string, number> = {};
    documentos.forEach(doc => {
      porTipo[doc.tipo] = (porTipo[doc.tipo] || 0) + 1;
    });
    return porTipo;
  }, [documentos]);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  return {
    documentos,
    isLoading,
    error,
    fetchDocumentos,
    createDocumento,
    updateDocumento,
    saveOCRResult,
    validarDocumento,
    getEstadisticas,
    getDocumentosPorTipo,
  };
}

export default useGaliaDocumentos;
