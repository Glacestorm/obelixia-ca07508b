/**
 * useGaliaBeneficiario360 - Hook para Portal Beneficiario 360°
 * Vista integral del beneficiario: expedientes, pagos, documentos, comunicaciones
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface BeneficiarioProfile {
  id: string;
  nif: string;
  nombre: string;
  tipo: 'empresa' | 'autonomo' | 'ayuntamiento' | 'asociacion';
  email: string;
  telefono?: string;
  direccion?: string;
  municipio: string;
  codigoPostal?: string;
  representanteLegal?: string;
  fechaRegistro: string;
  estadoCuenta: 'activo' | 'pendiente' | 'bloqueado';
}

export interface ExpedienteBeneficiario {
  id: string;
  codigo: string;
  titulo: string;
  convocatoria: string;
  estado: 'borrador' | 'presentado' | 'en_instruccion' | 'aprobado' | 'denegado' | 'en_ejecucion' | 'justificado' | 'cerrado';
  fechaSolicitud: string;
  fechaResolucion?: string;
  importeSolicitado: number;
  importeAprobado?: number;
  importeJustificado?: number;
  importePagado?: number;
  porcentajeEjecucion: number;
  tecnicoAsignado?: string;
  proximaAccion?: string;
  fechaLimite?: string;
}

export interface PagoBeneficiario {
  id: string;
  expedienteId: string;
  expedienteCodigo: string;
  tipo: 'anticipo' | 'pago_parcial' | 'pago_final' | 'reintegro';
  importe: number;
  estado: 'pendiente' | 'en_tramite' | 'pagado' | 'rechazado';
  fechaSolicitud: string;
  fechaPago?: string;
  concepto: string;
  numeroTransferencia?: string;
}

export interface DocumentoBeneficiario {
  id: string;
  expedienteId?: string;
  nombre: string;
  tipo: 'solicitud' | 'memoria' | 'presupuesto' | 'factura' | 'justificante' | 'certificado' | 'otro';
  estado: 'pendiente' | 'validado' | 'rechazado' | 'requerido';
  fechaSubida: string;
  fechaValidacion?: string;
  observaciones?: string;
  url?: string;
  tamanio?: number;
}

export interface ComunicacionBeneficiario {
  id: string;
  expedienteId?: string;
  tipo: 'notificacion' | 'requerimiento' | 'resolucion' | 'mensaje' | 'aviso';
  asunto: string;
  contenido: string;
  fechaEnvio: string;
  fechaLectura?: string;
  leido: boolean;
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente';
  requiereRespuesta: boolean;
  fechaLimiteRespuesta?: string;
}

export interface NotificacionBeneficiario {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  accion?: {
    texto: string;
    url: string;
  };
}

export interface ResumenBeneficiario {
  totalExpedientes: number;
  expedientesActivos: number;
  importeTotalAprobado: number;
  importeTotalPagado: number;
  documentosPendientes: number;
  comunicacionesSinLeer: number;
  proximosVencimientos: Array<{
    expedienteId: string;
    expedienteCodigo: string;
    tipo: string;
    fecha: string;
    diasRestantes: number;
  }>;
}

export interface Beneficiario360Context {
  beneficiarioId: string;
  nif?: string;
}

// === HOOK ===
export function useGaliaBeneficiario360() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<BeneficiarioProfile | null>(null);
  const [expedientes, setExpedientes] = useState<ExpedienteBeneficiario[]>([]);
  const [pagos, setPagos] = useState<PagoBeneficiario[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoBeneficiario[]>([]);
  const [comunicaciones, setComunicaciones] = useState<ComunicacionBeneficiario[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionBeneficiario[]>([]);
  const [resumen, setResumen] = useState<ResumenBeneficiario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs para auto-refresh
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH PERFIL COMPLETO ===
  const fetchBeneficiarioData = useCallback(async (context: Beneficiario360Context) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'get_full_profile',
            beneficiarioId: context.beneficiarioId,
            nif: context.nif
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        const data = fnData.data;
        setProfile(data.profile || null);
        setExpedientes(data.expedientes || []);
        setPagos(data.pagos || []);
        setDocumentos(data.documentos || []);
        setComunicaciones(data.comunicaciones || []);
        setNotificaciones(data.notificaciones || []);
        setResumen(data.resumen || null);
        setLastRefresh(new Date());
        return data;
      }

      throw new Error('Respuesta inválida del servidor');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaBeneficiario360] fetchBeneficiarioData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH EXPEDIENTES ===
  const fetchExpedientes = useCallback(async (beneficiarioId: string) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'get_expedientes',
            beneficiarioId
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setExpedientes(fnData.data);
        return fnData.data;
      }
      return [];
    } catch (err) {
      console.error('[useGaliaBeneficiario360] fetchExpedientes error:', err);
      return [];
    }
  }, []);

  // === FETCH PAGOS ===
  const fetchPagos = useCallback(async (beneficiarioId: string, expedienteId?: string) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'get_pagos',
            beneficiarioId,
            expedienteId
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setPagos(fnData.data);
        return fnData.data;
      }
      return [];
    } catch (err) {
      console.error('[useGaliaBeneficiario360] fetchPagos error:', err);
      return [];
    }
  }, []);

  // === FETCH DOCUMENTOS ===
  const fetchDocumentos = useCallback(async (beneficiarioId: string, expedienteId?: string) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'get_documentos',
            beneficiarioId,
            expedienteId
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setDocumentos(fnData.data);
        return fnData.data;
      }
      return [];
    } catch (err) {
      console.error('[useGaliaBeneficiario360] fetchDocumentos error:', err);
      return [];
    }
  }, []);

  // === SUBIR DOCUMENTO ===
  const uploadDocumento = useCallback(async (
    beneficiarioId: string,
    expedienteId: string,
    documento: {
      nombre: string;
      tipo: DocumentoBeneficiario['tipo'];
      contenido: string; // Base64
    }
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'upload_documento',
            beneficiarioId,
            expedienteId,
            documento
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Documento subido correctamente');
        // Refrescar lista de documentos
        await fetchDocumentos(beneficiarioId, expedienteId);
        return fnData.data;
      }

      throw new Error('Error al subir documento');
    } catch (err) {
      console.error('[useGaliaBeneficiario360] uploadDocumento error:', err);
      toast.error('Error al subir el documento');
      return null;
    }
  }, [fetchDocumentos]);

  // === MARCAR COMUNICACIÓN COMO LEÍDA ===
  const marcarComunicacionLeida = useCallback(async (comunicacionId: string) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'mark_read',
            comunicacionId
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        setComunicaciones(prev => 
          prev.map(c => c.id === comunicacionId ? { ...c, leido: true, fechaLectura: new Date().toISOString() } : c)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useGaliaBeneficiario360] marcarComunicacionLeida error:', err);
      return false;
    }
  }, []);

  // === ENVIAR MENSAJE AL GAL ===
  const enviarMensaje = useCallback(async (
    beneficiarioId: string,
    expedienteId: string,
    mensaje: {
      asunto: string;
      contenido: string;
    }
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'send_message',
            beneficiarioId,
            expedienteId,
            mensaje
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Mensaje enviado correctamente');
        return fnData.data;
      }

      throw new Error('Error al enviar mensaje');
    } catch (err) {
      console.error('[useGaliaBeneficiario360] enviarMensaje error:', err);
      toast.error('Error al enviar el mensaje');
      return null;
    }
  }, []);

  // === SOLICITAR PAGO ===
  const solicitarPago = useCallback(async (
    beneficiarioId: string,
    expedienteId: string,
    solicitud: {
      tipo: PagoBeneficiario['tipo'];
      importe: number;
      concepto: string;
      documentosAdjuntos?: string[];
    }
  ) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-beneficiario-360',
        {
          body: {
            action: 'request_payment',
            beneficiarioId,
            expedienteId,
            solicitud
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success) {
        toast.success('Solicitud de pago registrada');
        await fetchPagos(beneficiarioId, expedienteId);
        return fnData.data;
      }

      throw new Error('Error al solicitar pago');
    } catch (err) {
      console.error('[useGaliaBeneficiario360] solicitarPago error:', err);
      toast.error('Error al solicitar el pago');
      return null;
    }
  }, [fetchPagos]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((context: Beneficiario360Context, intervalMs = 120000) => {
    stopAutoRefresh();
    fetchBeneficiarioData(context);
    autoRefreshInterval.current = setInterval(() => {
      fetchBeneficiarioData(context);
    }, intervalMs);
  }, [fetchBeneficiarioData]);

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

  // === RETURN ===
  return {
    // Estado
    isLoading,
    profile,
    expedientes,
    pagos,
    documentos,
    comunicaciones,
    notificaciones,
    resumen,
    error,
    lastRefresh,
    // Acciones
    fetchBeneficiarioData,
    fetchExpedientes,
    fetchPagos,
    fetchDocumentos,
    uploadDocumento,
    marcarComunicacionLeida,
    enviarMensaje,
    solicitarPago,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useGaliaBeneficiario360;
