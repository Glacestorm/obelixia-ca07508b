/**
 * useGaliaBDNS - Hook para interoperabilidad con BDNS
 * Base de Datos Nacional de Subvenciones
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface BDNSConvocatoria {
  codigoBDNS: string;
  titulo: string;
  organoConvocante: string;
  comunidadAutonoma: string;
  sector: string;
  tipoAyuda: 'subvencion' | 'prestamo' | 'garantia' | 'mixta';
  presupuestoTotal: number;
  fechaPublicacion: string;
  fechaInicioSolicitudes: string;
  fechaFinSolicitudes: string;
  estado: 'abierta' | 'cerrada' | 'resuelta';
  enlaceBOE: string | null;
  enlaceBDNS: string;
  tiposBeneficiarios: string[];
  resumenRequisitos: string;
}

export interface BDNSSearchResult {
  resultados: BDNSConvocatoria[];
  totalResultados: number;
  pagina: number;
  resultadosPorPagina: number;
  filtrosAplicados: {
    texto: string | null;
    organo: string | null;
    sector: string | null;
    fechas: string | null;
  };
}

export interface BDNSConvocatoriaDetalle extends BDNSConvocatoria {
  basesReguladoras: {
    titulo: string;
    boe: string;
    fecha: string;
  };
  objetivoFinalidad: string;
  tiposBeneficiariosDetalle: Array<{
    tipo: string;
    requisitosEspecificos: string[];
  }>;
  cuantia: {
    presupuestoTotal: number;
    importeMaximoIndividual: number;
    porcentajeMaximoFinanciacion: number;
    tipoAyuda: string;
  };
  plazos: {
    inicioSolicitudes: string;
    finSolicitudes: string;
    resolucion: string;
    justificacion: string;
  };
  criteriosValoracion: Array<{
    criterio: string;
    puntuacionMaxima: number;
    descripcion: string;
  }>;
  documentacionRequerida: Array<{
    documento: string;
    obligatorio: boolean;
    formato: string;
  }>;
  obligacionesBeneficiario: string[];
  incompatibilidades: string[];
  recurso: {
    tipo: string;
    plazo: string;
    organo: string;
  };
}

export interface BDNSSyncResult {
  sincronizacion: {
    expedienteId: string;
    codigoBDNSConvocatoria: string;
    codigoBDNSConcesion: string;
    estado: 'pendiente' | 'sincronizado' | 'error';
    datosSincronizados: {
      nifBeneficiario: string;
      nombreBeneficiario: string;
      importeConcedido: number;
      fechaConcesion: string;
      finalidad: string;
      regional: boolean;
    };
    validaciones: Array<{
      campo: string;
      valido: boolean;
      mensaje: string;
    }>;
    fechaSincronizacion: string;
    proximaSincronizacion: string;
  };
  avisos: string[];
  errores: string[];
}

export interface BDNSBeneficiarioValidation {
  validacion: {
    nif: string;
    nombreBeneficiario: string;
    fechaValidacion: string;
    resultado: 'valido' | 'invalido' | 'con_reservas';
    checks: Array<{
      tipo: string;
      estado: 'ok' | 'ko' | 'pendiente' | 'no_disponible';
      detalle: string;
      fechaConsulta: string;
    }>;
    minimis: {
      importeRecibido3Anos: number;
      limiteDisponible: number;
      subvencionesAnteriores: Array<{
        codigoBDNS: string;
        importe: number;
        fecha: string;
        organo: string;
      }>;
    };
    alertas: string[];
    documentosRequeridos: string[];
  };
  recomendacion: 'aprobar' | 'rechazar' | 'solicitar_documentacion';
  motivoRecomendacion: string;
}

export interface BDNSExportResult {
  exportacion: {
    formato: 'xml' | 'csv' | 'pdf';
    fechaGeneracion: string;
    registros: number;
    contenido: object;
    validacionEsquema: {
      valido: boolean;
      errores: string[];
    };
    urlDescarga: string;
  };
  instrucciones: string;
}

// === HOOK ===
export function useGaliaBDNS() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BDNSSearchResult | null>(null);
  const [convocatoriaDetalle, setConvocatoriaDetalle] = useState<BDNSConvocatoriaDetalle | null>(null);
  const [syncResult, setSyncResult] = useState<BDNSSyncResult | null>(null);
  const [beneficiarioValidation, setBeneficiarioValidation] = useState<BDNSBeneficiarioValidation | null>(null);
  const [exportResult, setExportResult] = useState<BDNSExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === BUSCAR CONVOCATORIAS ===
  const searchConvocatorias = useCallback(async (params: {
    texto?: string;
    organo?: string;
    sector?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-bdns-sync', {
        body: {
          action: 'search_convocatorias',
          params
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as BDNSSearchResult;
        setSearchResults(result);
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al buscar en BDNS';
      setError(message);
      console.error('[useGaliaBDNS] searchConvocatorias error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER DETALLE CONVOCATORIA ===
  const getConvocatoria = useCallback(async (convocatoriaId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-bdns-sync', {
        body: {
          action: 'get_convocatoria',
          params: { convocatoriaId }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data?.convocatoria) {
        const result = data.data.convocatoria as BDNSConvocatoriaDetalle;
        setConvocatoriaDetalle(result);
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener convocatoria';
      setError(message);
      console.error('[useGaliaBDNS] getConvocatoria error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SINCRONIZAR EXPEDIENTE ===
  const syncExpediente = useCallback(async (expedienteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-bdns-sync', {
        body: {
          action: 'sync_expediente',
          params: { expedienteId }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as BDNSSyncResult;
        setSyncResult(result);
        
        if (result.sincronizacion.estado === 'sincronizado') {
          toast.success('Expediente sincronizado con BDNS');
        } else if (result.errores?.length > 0) {
          toast.error('Error en sincronización BDNS');
        }
        
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar con BDNS';
      setError(message);
      console.error('[useGaliaBDNS] syncExpediente error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === VALIDAR BENEFICIARIO ===
  const validateBeneficiario = useCallback(async (nif: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-bdns-sync', {
        body: {
          action: 'validate_beneficiario',
          params: { nif }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as BDNSBeneficiarioValidation;
        setBeneficiarioValidation(result);
        
        if (result.validacion.resultado === 'valido') {
          toast.success('Beneficiario validado correctamente');
        } else if (result.validacion.resultado === 'invalido') {
          toast.error('Beneficiario no cumple requisitos');
        } else {
          toast.warning('Validación con reservas');
        }
        
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar beneficiario';
      setError(message);
      console.error('[useGaliaBDNS] validateBeneficiario error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EXPORTAR A BDNS ===
  const exportToBDNS = useCallback(async (expedienteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-bdns-sync', {
        body: {
          action: 'export_bdns',
          params: { expedienteId }
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as BDNSExportResult;
        setExportResult(result);
        toast.success('Exportación BDNS generada');
        return result;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al exportar a BDNS';
      setError(message);
      console.error('[useGaliaBDNS] exportToBDNS error:', err);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RESET ===
  const reset = useCallback(() => {
    setSearchResults(null);
    setConvocatoriaDetalle(null);
    setSyncResult(null);
    setBeneficiarioValidation(null);
    setExportResult(null);
    setError(null);
  }, []);

  return {
    // Estado
    isLoading,
    error,
    searchResults,
    convocatoriaDetalle,
    syncResult,
    beneficiarioValidation,
    exportResult,
    // Acciones
    searchConvocatorias,
    getConvocatoria,
    syncExpediente,
    validateBeneficiario,
    exportToBDNS,
    reset,
  };
}

export default useGaliaBDNS;
