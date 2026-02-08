/**
 * useGaliaComplianceAuditor - Hook para auditoría de cumplimiento GALIA V4
 * Analiza punto por punto el documento de requisitos del proyecto
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface ComplianceRequirement {
  id: string;
  actuacion: string;
  descripcion: string;
  categoria: 'infraestructura' | 'funcionalidad' | 'integracion' | 'documentacion' | 'formacion';
  prioridad: 'critica' | 'alta' | 'media' | 'baja';
  estado: 'implementado' | 'parcial' | 'pendiente' | 'planificado';
  porcentaje: number;
  evidencias: string[];
  gaps: string[];
  recomendaciones: string[];
  fecha_verificacion?: string;
}

export interface ComplianceCategory {
  nombre: string;
  requisitos: ComplianceRequirement[];
  porcentaje_total: number;
  requisitos_cumplidos: number;
  requisitos_totales: number;
}

export interface ComplianceReport {
  fecha_generacion: string;
  version_documento: string;
  porcentaje_global: number;
  categorias: ComplianceCategory[];
  comparativa_internacional: {
    estonia: number;
    dinamarca: number;
    galia: number;
  };
  proximos_pasos: string[];
  resumen_ejecutivo: string;
}

export interface ComplianceContext {
  incluir_evidencias?: boolean;
  analizar_gaps?: boolean;
  generar_recomendaciones?: boolean;
}

// === REQUISITOS BASE V4 ===
const REQUISITOS_V4: Omit<ComplianceRequirement, 'estado' | 'porcentaje' | 'evidencias' | 'gaps' | 'recomendaciones' | 'fecha_verificacion'>[] = [
  // Actuación 1
  { id: 'act1', actuacion: 'ACTUACIÓN 1', descripcion: 'Análisis de experiencias nacionales e internacionales en IA para gestión de ayudas', categoria: 'documentacion', prioridad: 'alta' },
  // Actuación 2
  { id: 'act2', actuacion: 'ACTUACIÓN 2', descripcion: 'Estudio normativo: RGPD, Ley 39/2015, Ley 40/2015, Ley 38/2003', categoria: 'documentacion', prioridad: 'critica' },
  // Actuación 3.1
  { id: 'act3_1', actuacion: 'ACTUACIÓN 3.1', descripcion: 'Desarrollo del Asistente Virtual con IA', categoria: 'funcionalidad', prioridad: 'critica' },
  // Actuación 3.2
  { id: 'act3_2', actuacion: 'ACTUACIÓN 3.2', descripcion: 'Base de conocimiento estructurada (FAQ, normativa, procedimientos)', categoria: 'infraestructura', prioridad: 'alta' },
  // Actuación 3.3
  { id: 'act3_3', actuacion: 'ACTUACIÓN 3.3', descripcion: 'Panel de control y dashboard de gestión', categoria: 'funcionalidad', prioridad: 'alta' },
  // Actuación 3.4
  { id: 'act3_4', actuacion: 'ACTUACIÓN 3.4', descripcion: 'Entrenamiento del modelo de IA con datos específicos LEADER', categoria: 'funcionalidad', prioridad: 'alta' },
  // Actuación 3.5
  { id: 'act3_5', actuacion: 'ACTUACIÓN 3.5', descripcion: 'Formación de equipos técnicos de los GAL', categoria: 'formacion', prioridad: 'media' },
  // Actuación 3.6
  { id: 'act3_6', actuacion: 'ACTUACIÓN 3.6', descripcion: 'Pruebas piloto y validación del sistema', categoria: 'funcionalidad', prioridad: 'media' },
  // Actuación 4
  { id: 'act4', actuacion: 'ACTUACIÓN 4', descripcion: 'Plan de desarrollo Fase 2 (ampliación funcionalidades)', categoria: 'documentacion', prioridad: 'media' },
  // Actuación 5
  { id: 'act5', actuacion: 'ACTUACIÓN 5', descripcion: 'Búsqueda de socios para federación nacional', categoria: 'integracion', prioridad: 'baja' },
  // Actuación 6
  { id: 'act6', actuacion: 'ACTUACIÓN 6', descripcion: 'Coordinación transversal con otros módulos ERP', categoria: 'integracion', prioridad: 'media' },
  // Requisitos adicionales del circuito completo
  { id: 'circ_eu', actuacion: 'CIRCUITO UE', descripcion: 'Automatización del circuito UE → España (scraping normativo)', categoria: 'integracion', prioridad: 'alta' },
  { id: 'circ_bdns', actuacion: 'CIRCUITO BDNS', descripcion: 'Sincronización bidireccional con BDNS', categoria: 'integracion', prioridad: 'critica' },
  { id: 'circ_clave', actuacion: 'CIRCUITO Cl@ve', descripcion: 'Autenticación ciudadana vía Cl@ve/DNIe', categoria: 'integracion', prioridad: 'alta' },
  { id: 'circ_notifica', actuacion: 'CIRCUITO Notific@', descripcion: 'Notificaciones oficiales automatizadas', categoria: 'integracion', prioridad: 'media' },
  { id: 'transp_19_2013', actuacion: 'LEY 19/2013', descripcion: 'Cumplimiento portal de transparencia', categoria: 'funcionalidad', prioridad: 'critica' },
  { id: 'rgpd_22', actuacion: 'RGPD Art. 22', descripcion: 'Explicabilidad de decisiones automatizadas', categoria: 'funcionalidad', prioridad: 'critica' },
  { id: 'audit_smart', actuacion: 'AUDITORÍA IA', descripcion: 'Smart Audit con detección de anomalías', categoria: 'funcionalidad', prioridad: 'alta' },
  { id: 'geo_intel', actuacion: 'GEOINTELIGENCIA', descripcion: 'Análisis territorial y despoblación', categoria: 'funcionalidad', prioridad: 'media' },
  { id: 'doc_gen', actuacion: 'GENERACIÓN DOCS', descripcion: 'Generación automática de documentos administrativos', categoria: 'funcionalidad', prioridad: 'alta' },
];

// === HOOK ===
export function useGaliaComplianceAuditor() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === GENERAR INFORME DE CUMPLIMIENTO ===
  const generateComplianceReport = useCallback(async (context?: ComplianceContext) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-auditor', {
        body: {
          action: 'generate_report',
          requisitos: REQUISITOS_V4,
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.report) {
        setReport(data.report);
        return data.report as ComplianceReport;
      }

      throw new Error('Respuesta inválida del servidor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar informe';
      setError(message);
      console.error('[useGaliaComplianceAuditor] generateReport error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR REQUISITO INDIVIDUAL ===
  const verifyRequirement = useCallback(async (requirementId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-auditor', {
        body: {
          action: 'verify_requirement',
          requirement_id: requirementId
        }
      });

      if (fnError) throw fnError;

      return data?.requirement as ComplianceRequirement | null;
    } catch (err) {
      console.error('[useGaliaComplianceAuditor] verifyRequirement error:', err);
      toast.error('Error al verificar requisito');
      return null;
    }
  }, []);

  // === OBTENER COMPARATIVA INTERNACIONAL ===
  const getInternationalComparison = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-auditor', {
        body: {
          action: 'international_comparison'
        }
      });

      if (fnError) throw fnError;

      return data?.comparison || null;
    } catch (err) {
      console.error('[useGaliaComplianceAuditor] getInternationalComparison error:', err);
      return null;
    }
  }, []);

  // === EXPORTAR INFORME ===
  const exportReport = useCallback(async (format: 'pdf' | 'excel' | 'json') => {
    if (!report) {
      toast.error('No hay informe para exportar');
      return null;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-compliance-auditor', {
        body: {
          action: 'export_report',
          report,
          format
        }
      });

      if (fnError) throw fnError;

      toast.success(`Informe exportado en formato ${format.toUpperCase()}`);
      return data?.url || null;
    } catch (err) {
      console.error('[useGaliaComplianceAuditor] exportReport error:', err);
      toast.error('Error al exportar informe');
      return null;
    }
  }, [report]);

  return {
    // Estado
    isLoading,
    report,
    error,
    requisitosBase: REQUISITOS_V4,
    // Acciones
    generateComplianceReport,
    verifyRequirement,
    getInternationalComparison,
    exportReport,
  };
}

export default useGaliaComplianceAuditor;
