/**
 * useGaliaProactiveAssistant - Hook para asistente proactivo
 * Notificaciones de plazos, documentos faltantes y cambios normativos
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface Deadline {
  id: string;
  expedienteId: string;
  tipo: string;
  descripcion: string;
  fechaVencimiento: string;
  diasRestantes: number;
  prioridad: 'critico' | 'alto' | 'medio' | 'bajo';
  accionRequerida: string;
  consecuencias: string;
}

export interface DeadlinesResult {
  deadlines: Deadline[];
  resumen: {
    totalPlazos: number;
    criticos: number;
    proximos7Dias: number;
  };
  recomendaciones: string[];
}

export interface MissingDocument {
  expedienteId: string;
  documento: string;
  categoria: 'solicitud' | 'identificacion' | 'proyecto' | 'justificacion';
  obligatorio: boolean;
  fechaLimite: string | null;
  instrucciones: string;
  plantillaDisponible: boolean;
}

export interface MissingDocsResult {
  documentosFaltantes: MissingDocument[];
  expedientesIncompletos: Array<{
    id: string;
    titulo: string;
    porcentajeCompletado: number;
    documentosPendientes: number;
  }>;
  alertas: string[];
}

export interface RegulatoryChange {
  id: string;
  tipo: 'convocatoria' | 'modificacion' | 'circular' | 'correccion';
  titulo: string;
  fuente: 'BOE' | 'BOPA' | 'DOUE' | 'interno';
  fechaPublicacion: string;
  fechaEfectiva: string;
  resumen: string;
  impacto: 'alto' | 'medio' | 'bajo';
  expedientesAfectados: number;
  accionesRequeridas: string[];
  enlace: string | null;
}

export interface RegulatoryChangesResult {
  cambiosNormativos: RegulatoryChange[];
  resumen: {
    totalCambios: number;
    altoImpacto: number;
    ultimaActualizacion: string;
  };
}

export interface Alert {
  id: string;
  tipo: 'plazo' | 'documento' | 'normativa' | 'anomalia' | 'inactividad' | 'pre_aprobacion';
  prioridad: 'critica' | 'alta' | 'media' | 'baja';
  titulo: string;
  mensaje: string;
  expedienteId: string | null;
  fechaCreacion: string;
  fechaExpiracion: string | null;
  accion: {
    tipo: 'ver_expediente' | 'subir_documento' | 'revisar_cambio' | 'confirmar';
    label: string;
    url: string;
  };
  leida: boolean;
}

export interface AlertsResult {
  alertas: Alert[];
  contadores: {
    total: number;
    noLeidas: number;
    criticas: number;
    altas: number;
  };
  ultimaActualizacion: string;
}

export interface DigestResult {
  digest: {
    fecha: string;
    destinatario: string;
    resumenEjecutivo: string;
    seccionPlazos: {
      titulo: string;
      items: Array<{ texto: string; urgente: boolean }>;
      total: number;
    };
    seccionDocumentos: {
      titulo: string;
      items: Array<{ texto: string; expediente: string }>;
      total: number;
    };
    seccionNormativa: {
      titulo: string;
      items: Array<{ texto: string; impacto: string }>;
      total: number;
    };
    accionesRecomendadas: Array<{
      prioridad: number;
      accion: string;
      motivo: string;
    }>;
    metricas: {
      expedientesActivos: number;
      pendientesValidacion: number;
      proximosVencimientos: number;
    };
  };
  canalesEnvio: string[];
}

// === HOOK ===
export function useGaliaProactiveAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [deadlines, setDeadlines] = useState<DeadlinesResult | null>(null);
  const [missingDocs, setMissingDocs] = useState<MissingDocsResult | null>(null);
  const [regulatoryChanges, setRegulatoryChanges] = useState<RegulatoryChangesResult | null>(null);
  const [alerts, setAlerts] = useState<AlertsResult | null>(null);
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === VERIFICAR PLAZOS ===
  const checkDeadlines = useCallback(async (
    role: 'ciudadano' | 'tecnico' | 'gestor' = 'tecnico',
    expedienteId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-proactive-assistant', {
        body: {
          action: 'check_deadlines',
          role,
          expediente_id: expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as DeadlinesResult;
        setDeadlines(result);
        
        // Mostrar toast si hay plazos críticos
        if (result.resumen.criticos > 0) {
          toast.warning(`${result.resumen.criticos} plazo(s) crítico(s) próximo(s) a vencer`);
        }
        
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al verificar plazos';
      setError(message);
      console.error('[useGaliaProactiveAssistant] checkDeadlines error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR DOCUMENTOS FALTANTES ===
  const checkMissingDocs = useCallback(async (
    role: 'ciudadano' | 'tecnico' | 'gestor' = 'tecnico',
    expedienteId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-proactive-assistant', {
        body: {
          action: 'check_missing_docs',
          role,
          expediente_id: expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as MissingDocsResult;
        setMissingDocs(result);
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al verificar documentos';
      setError(message);
      console.error('[useGaliaProactiveAssistant] checkMissingDocs error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VERIFICAR CAMBIOS NORMATIVOS ===
  const checkRegulatoryChanges = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-proactive-assistant', {
        body: {
          action: 'check_regulatory_changes'
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as RegulatoryChangesResult;
        setRegulatoryChanges(result);
        
        if (result.resumen.altoImpacto > 0) {
          toast.info(`${result.resumen.altoImpacto} cambio(s) normativo(s) de alto impacto`);
        }
        
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al verificar normativa';
      setError(message);
      console.error('[useGaliaProactiveAssistant] checkRegulatoryChanges error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER ALERTAS ===
  const fetchAlerts = useCallback(async (
    role: 'ciudadano' | 'tecnico' | 'gestor' = 'tecnico',
    userId?: string,
    expedienteId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-proactive-assistant', {
        body: {
          action: 'get_alerts',
          role,
          user_id: userId,
          expediente_id: expedienteId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as AlertsResult;
        setAlerts(result);
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener alertas';
      setError(message);
      console.error('[useGaliaProactiveAssistant] fetchAlerts error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERAR DIGEST DIARIO ===
  const generateDigest = useCallback(async (
    role: 'ciudadano' | 'tecnico' | 'gestor' = 'tecnico',
    userId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-proactive-assistant', {
        body: {
          action: 'generate_digest',
          role,
          user_id: userId
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as DigestResult;
        setDigest(result);
        toast.success('Digest diario generado');
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar digest';
      setError(message);
      console.error('[useGaliaProactiveAssistant] generateDigest error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((role: 'ciudadano' | 'tecnico' | 'gestor', intervalMs = 300000) => {
    stopAutoRefresh();
    
    // Initial fetch
    fetchAlerts(role);
    
    autoRefreshInterval.current = setInterval(() => {
      fetchAlerts(role);
    }, intervalMs);
  }, [fetchAlerts]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // === RESET ===
  const reset = useCallback(() => {
    setDeadlines(null);
    setMissingDocs(null);
    setRegulatoryChanges(null);
    setAlerts(null);
    setDigest(null);
    setError(null);
  }, []);

  return {
    // Estado
    isLoading,
    error,
    deadlines,
    missingDocs,
    regulatoryChanges,
    alerts,
    digest,
    // Acciones
    checkDeadlines,
    checkMissingDocs,
    checkRegulatoryChanges,
    fetchAlerts,
    generateDigest,
    startAutoRefresh,
    stopAutoRefresh,
    reset,
  };
}

export default useGaliaProactiveAssistant;
