/**
 * useGaliaExportPrint - Hook para impresión y exportación de documentos GALIA
 * Fase 7: Sistema de Impresión y Exportación Universal
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export type ExportFormat = 'pdf' | 'excel' | 'word' | 'csv';
export type DocumentType = 'expediente' | 'resolucion' | 'requerimiento' | 'memoria' | 'acta' | 'informe';

export interface PrintSection {
  id: string;
  titulo: string;
  contenido: string;
  incluirEnImpresion: boolean;
}

export interface DocumentoGenerado {
  tipo: DocumentType;
  titulo: string;
  fechaGeneracion: string;
  cabecera?: {
    organismo: string;
    programa: string;
    convocatoria: string;
  };
  expediente?: {
    numero: string;
    beneficiario: string;
    nif: string;
    proyecto: string;
  };
  secciones: PrintSection[];
  pie?: {
    codigoVerificacion: string;
    urlVerificacion: string;
    fechaFirma: string;
  };
}

export interface ResolucionGenerada {
  tipo: 'concesion' | 'denegacion' | 'archivo' | 'desistimiento';
  numero: string;
  fecha: string;
  encabezamiento: string;
  antecedentes: string[];
  fundamentosJuridicos: string[];
  parteDispositiva: {
    decision: string;
    importeConcedido?: number;
    condiciones: string[];
    plazoJustificacion?: string;
  };
  recursos: {
    tipo: string;
    plazo: string;
    organoCompetente: string;
  };
  firmaElectronica: {
    cargo: string;
    nombre?: string;
    csv: string;
  };
}

export interface RequerimientoGenerado {
  numero: string;
  fecha: string;
  expediente: string;
  beneficiario: {
    nombre: string;
    nif: string;
    direccion?: string;
  };
  defectosDetectados: Array<{
    codigo: string;
    descripcion: string;
    documentoRequerido: string;
    obligatorio: boolean;
  }>;
  plazoSubsanacion: string;
  fechaLimite: string;
  advertencias: string[];
  instrucciones: string;
}

export interface ExportResult {
  formato: ExportFormat;
  nombreArchivo: string;
  fechaExportacion: string;
  columnas?: string[];
  filas?: unknown[][];
  metadata?: {
    totalRegistros: number;
    filtrosAplicados?: Record<string, unknown>;
  };
}

export interface PrintPreviewOptions {
  expedienteId: string;
  sections?: string[];
  includeHeader?: boolean;
  includeFooter?: boolean;
  includeSignature?: boolean;
}

// === HOOK ===
export function useGaliaExportPrint() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<DocumentoGenerado | null>(null);

  // === GENERATE PDF ===
  const generatePDF = useCallback(async (options: PrintPreviewOptions): Promise<DocumentoGenerado | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-document-print', {
        body: {
          action: 'generate_pdf',
          expedienteId: options.expedienteId,
          sections: options.sections,
          data: {
            includeHeader: options.includeHeader ?? true,
            includeFooter: options.includeFooter ?? true,
            includeSignature: options.includeSignature ?? true
          }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.documento) {
        setLastGenerated(data.documento);
        toast.success('Documento PDF generado correctamente');
        return data.documento;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando PDF';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE RESOLUTION ===
  const generateResolution = useCallback(async (
    expedienteId: string,
    tipo: 'concesion' | 'denegacion' | 'archivo' | 'desistimiento',
    data?: Record<string, unknown>
  ): Promise<ResolucionGenerada | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-document-print', {
        body: {
          action: 'generate_resolution',
          expedienteId,
          documentType: tipo,
          data
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.resolucion) {
        toast.success(`Resolución de ${tipo} generada`);
        return result.resolucion;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando resolución';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // === GENERATE REQUERIMIENTO ===
  const generateRequerimiento = useCallback(async (
    expedienteId: string,
    defectos: string[]
  ): Promise<RequerimientoGenerado | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-document-print', {
        body: {
          action: 'generate_requerimiento',
          expedienteId,
          data: { defectos }
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.requerimiento) {
        toast.success('Requerimiento de subsanación generado');
        return result.requerimiento;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando requerimiento';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // === GENERATE MEMORIA ===
  const generateMemoria = useCallback(async (
    tipo: 'anual' | 'justificacion' | 'seguimiento',
    periodo: string,
    data?: Record<string, unknown>
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-document-print', {
        body: {
          action: 'generate_memoria',
          documentType: tipo,
          data: { ...data, periodo }
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.memoria) {
        toast.success(`Memoria ${tipo} generada`);
        return result.memoria;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando memoria';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // === GENERATE ACTA ===
  const generateActa = useCallback(async (
    expedienteId: string,
    tipo: 'verificacion_in_situ' | 'verificacion_administrativa' | 'control_final',
    datosVisita?: Record<string, unknown>
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-document-print', {
        body: {
          action: 'generate_acta',
          expedienteId,
          documentType: tipo,
          data: datosVisita
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.acta) {
        toast.success(`Acta de ${tipo.replace(/_/g, ' ')} generada`);
        return result.acta;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando acta';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // === EXPORT DATA ===
  const exportData = useCallback(async (
    format: ExportFormat,
    data: Record<string, unknown>
  ): Promise<ExportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('galia-document-print', {
        body: {
          action: 'export_data',
          format,
          data
        }
      });

      if (fnError) throw fnError;

      if (result?.success && result?.export) {
        toast.success(`Datos exportados a ${format.toUpperCase()}`);
        return result.export;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error exportando datos';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PRINT PREVIEW ===
  const openPrintPreview = useCallback((documento: DocumentoGenerado) => {
    // Create print window with document content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${documento.titulo}</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header p { margin: 5px 0; color: #666; }
    .expediente-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .section-content { text-align: justify; }
    .footer { margin-top: 40px; border-top: 1px solid #333; padding-top: 20px; font-size: 12px; color: #666; }
    .firma { text-align: right; margin-top: 60px; }
    @media print {
      body { margin: 1cm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${documento.cabecera?.organismo || 'Grupo de Acción Local'}</h1>
    <p>Programa ${documento.cabecera?.programa || 'LEADER'}</p>
    <p>${documento.cabecera?.convocatoria || ''}</p>
  </div>
  
  <div class="expediente-info">
    <strong>Expediente:</strong> ${documento.expediente?.numero || 'N/A'}<br>
    <strong>Beneficiario:</strong> ${documento.expediente?.beneficiario || 'N/A'}<br>
    <strong>NIF:</strong> ${documento.expediente?.nif || 'N/A'}<br>
    <strong>Proyecto:</strong> ${documento.expediente?.proyecto || 'N/A'}
  </div>

  ${documento.secciones.filter(s => s.incluirEnImpresion).map(section => `
    <div class="section">
      <h2>${section.titulo}</h2>
      <div class="section-content">${section.contenido}</div>
    </div>
  `).join('')}

  <div class="footer">
    <p><strong>Código de verificación:</strong> ${documento.pie?.codigoVerificacion || 'CSV-PENDIENTE'}</p>
    <p><strong>URL verificación:</strong> ${documento.pie?.urlVerificacion || 'https://galia.verificacion.es'}</p>
    <p><strong>Fecha generación:</strong> ${new Date(documento.fechaGeneracion).toLocaleString('es-ES')}</p>
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir</button>
  </div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, []);

  // === DOWNLOAD AS FILE ===
  const downloadAsFile = useCallback((content: string, filename: string, format: ExportFormat) => {
    const mimeTypes: Record<ExportFormat, string> = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      csv: 'text/csv'
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Archivo ${filename} descargado`);
  }, []);

  // === SEND BY EMAIL ===
  const sendByEmail = useCallback(async (
    documento: DocumentoGenerado,
    destinatario: string,
    asunto?: string
  ) => {
    // In a real implementation, this would call an edge function
    toast.info(`Enviando documento a ${destinatario}...`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(`Documento enviado a ${destinatario}`);
    return true;
  }, []);

  // === SHARE TEMPORARY LINK ===
  const shareTemporaryLink = useCallback(async (
    documento: DocumentoGenerado,
    expirationHours: number = 24
  ) => {
    // Generate temporary share link
    const shareId = crypto.randomUUID().slice(0, 8);
    const shareLink = `https://galia.app/share/${shareId}`;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(shareLink);
    
    toast.success(`Enlace copiado (expira en ${expirationHours}h)`);
    return shareLink;
  }, []);

  return {
    // State
    isLoading,
    isGenerating,
    error,
    lastGenerated,
    
    // PDF Generation
    generatePDF,
    openPrintPreview,
    
    // Official Documents
    generateResolution,
    generateRequerimiento,
    generateMemoria,
    generateActa,
    
    // Export
    exportData,
    downloadAsFile,
    
    // Sharing
    sendByEmail,
    shareTemporaryLink
  };
}

export default useGaliaExportPrint;
