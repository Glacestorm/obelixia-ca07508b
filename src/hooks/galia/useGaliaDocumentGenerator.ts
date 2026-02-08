/**
 * useGaliaDocumentGenerator - Generación automática de documentos oficiales
 * Memorias anuales, informes FEDER, resoluciones, notificaciones
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DocumentType = 
  | 'memoria_anual'
  | 'informe_feder'
  | 'resolucion_concesion'
  | 'resolucion_denegacion'
  | 'notificacion_requerimiento'
  | 'notificacion_subsanacion'
  | 'certificado_ayuda'
  | 'acta_comision'
  | 'informe_justificacion';

export interface DocumentTemplate {
  id: string;
  type: DocumentType;
  name: string;
  description: string;
  requiredFields: string[];
  legalBasis?: string;
  version: string;
}

export interface GeneratedDocument {
  id: string;
  type: DocumentType;
  title: string;
  content: string;
  htmlContent?: string;
  metadata: {
    expedienteId?: string;
    convocatoriaId?: string;
    beneficiario?: string;
    fecha: string;
    firmante?: string;
    registroSalida?: string;
  };
  legalReferences: string[];
  generatedAt: string;
  status: 'draft' | 'review' | 'approved' | 'signed';
}

export interface GenerationContext {
  expedienteId?: string;
  convocatoriaId?: string;
  galId?: string;
  beneficiarioData?: Record<string, unknown>;
  proyectoData?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
}

export function useGaliaDocumentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<GeneratedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar plantillas disponibles
  const loadTemplates = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-document-generator', {
        body: { action: 'list_templates' }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.templates) {
        setTemplates(data.templates);
        return data.templates;
      }

      // Plantillas por defecto si no hay respuesta
      const defaultTemplates: DocumentTemplate[] = [
        {
          id: 'memoria_anual',
          type: 'memoria_anual',
          name: 'Memoria Anual GAL',
          description: 'Informe anual de actividades y resultados del GAL',
          requiredFields: ['año', 'galId'],
          legalBasis: 'Reglamento (UE) 2021/2115',
          version: '1.0'
        },
        {
          id: 'informe_feder',
          type: 'informe_feder',
          name: 'Informe Seguimiento FEDER',
          description: 'Informe trimestral para la Comisión Europea',
          requiredFields: ['trimestre', 'año'],
          legalBasis: 'Reglamento (UE) 2021/1060',
          version: '1.0'
        },
        {
          id: 'resolucion_concesion',
          type: 'resolucion_concesion',
          name: 'Resolución de Concesión',
          description: 'Resolución aprobando la ayuda solicitada',
          requiredFields: ['expedienteId', 'importeConcedido'],
          legalBasis: 'Ley 39/2015, art. 88',
          version: '1.0'
        },
        {
          id: 'resolucion_denegacion',
          type: 'resolucion_denegacion',
          name: 'Resolución de Denegación',
          description: 'Resolución denegando la ayuda con motivación',
          requiredFields: ['expedienteId', 'motivosDenegacion'],
          legalBasis: 'Ley 39/2015, art. 88',
          version: '1.0'
        },
        {
          id: 'notificacion_requerimiento',
          type: 'notificacion_requerimiento',
          name: 'Requerimiento de Subsanación',
          description: 'Notificación solicitando documentación adicional',
          requiredFields: ['expedienteId', 'documentosRequeridos'],
          legalBasis: 'Ley 39/2015, art. 68',
          version: '1.0'
        },
        {
          id: 'certificado_ayuda',
          type: 'certificado_ayuda',
          name: 'Certificado de Ayuda',
          description: 'Certificado oficial de la ayuda concedida',
          requiredFields: ['expedienteId'],
          version: '1.0'
        },
        {
          id: 'acta_comision',
          type: 'acta_comision',
          name: 'Acta de Comisión de Valoración',
          description: 'Acta de la reunión de la comisión evaluadora',
          requiredFields: ['fechaReunion', 'expedientes'],
          version: '1.0'
        }
      ];
      
      setTemplates(defaultTemplates);
      return defaultTemplates;
    } catch (err) {
      console.error('[useGaliaDocumentGenerator] loadTemplates error:', err);
      return [];
    }
  }, []);

  // Generar documento
  const generateDocument = useCallback(async (
    type: DocumentType,
    context: GenerationContext
  ): Promise<GeneratedDocument | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-document-generator', {
        body: {
          action: 'generate',
          documentType: type,
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.document) {
        const doc = data.document as GeneratedDocument;
        setCurrentDocument(doc);
        setGeneratedDocuments(prev => [doc, ...prev]);
        toast.success('Documento generado correctamente');
        return doc;
      }

      throw new Error('Error generando documento');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(`Error: ${message}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Generar memoria anual
  const generateMemoriaAnual = useCallback(async (
    año: number,
    galId: string
  ) => {
    return generateDocument('memoria_anual', {
      galId,
      customFields: { año }
    });
  }, [generateDocument]);

  // Generar informe FEDER
  const generateInformeFEDER = useCallback(async (
    trimestre: number,
    año: number,
    galId: string
  ) => {
    return generateDocument('informe_feder', {
      galId,
      customFields: { trimestre, año }
    });
  }, [generateDocument]);

  // Generar resolución de concesión
  const generateResolucionConcesion = useCallback(async (
    expedienteId: string,
    importeConcedido: number,
    condiciones?: string[]
  ) => {
    return generateDocument('resolucion_concesion', {
      expedienteId,
      customFields: { importeConcedido, condiciones }
    });
  }, [generateDocument]);

  // Generar resolución de denegación
  const generateResolucionDenegacion = useCallback(async (
    expedienteId: string,
    motivosDenegacion: string[]
  ) => {
    return generateDocument('resolucion_denegacion', {
      expedienteId,
      customFields: { motivosDenegacion }
    });
  }, [generateDocument]);

  // Generar requerimiento
  const generateRequerimiento = useCallback(async (
    expedienteId: string,
    documentosRequeridos: string[],
    plazo: number = 10
  ) => {
    return generateDocument('notificacion_requerimiento', {
      expedienteId,
      customFields: { documentosRequeridos, plazo }
    });
  }, [generateDocument]);

  // Aprobar documento
  const approveDocument = useCallback(async (documentId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-document-generator', {
        body: {
          action: 'approve',
          documentId
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setGeneratedDocuments(prev => 
          prev.map(d => d.id === documentId ? { ...d, status: 'approved' as const } : d)
        );
        toast.success('Documento aprobado');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useGaliaDocumentGenerator] approveDocument error:', err);
      toast.error('Error aprobando documento');
      return false;
    }
  }, []);

  // Exportar a PDF
  const exportToPDF = useCallback(async (documentId: string): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-document-generator', {
        body: {
          action: 'export_pdf',
          documentId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.pdfUrl) {
        toast.success('PDF generado');
        return data.pdfUrl;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaDocumentGenerator] exportToPDF error:', err);
      toast.error('Error exportando PDF');
      return null;
    }
  }, []);

  // Historial de documentos generados
  const loadHistory = useCallback(async (galId?: string, limit = 50) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-document-generator', {
        body: {
          action: 'history',
          galId,
          limit
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.documents) {
        setGeneratedDocuments(data.documents);
        return data.documents;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaDocumentGenerator] loadHistory error:', err);
      return [];
    }
  }, []);

  return {
    // Estado
    isGenerating,
    templates,
    generatedDocuments,
    currentDocument,
    error,
    // Acciones generales
    loadTemplates,
    generateDocument,
    approveDocument,
    exportToPDF,
    loadHistory,
    setCurrentDocument,
    // Acciones específicas
    generateMemoriaAnual,
    generateInformeFEDER,
    generateResolucionConcesion,
    generateResolucionDenegacion,
    generateRequerimiento,
  };
}

export default useGaliaDocumentGenerator;
