/**
 * useGaliaAdminIntegrations - Phase 8F
 * Integraciones con Administraciones Públicas Españolas
 * AEAT, TGSS, Registro Mercantil, Catastro/SIGPAC
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export type AdminIntegrationType = 'aeat' | 'tgss' | 'registro_mercantil' | 'catastro' | 'sigpac' | 'bdns';

export interface AdminIntegration {
  id: string;
  type: AdminIntegrationType;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  lastSync: string | null;
  nextSync: string | null;
  config: {
    autoSync: boolean;
    syncFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
    credentials?: {
      configured: boolean;
      expiresAt?: string;
    };
  };
  stats: {
    totalQueries: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface AEATConsultaResult {
  nif: string;
  denominacion: string;
  situacionCensal: 'alta' | 'baja' | 'suspendida';
  obligacionesTributarias: {
    iva: boolean;
    irpf: boolean;
    is: boolean;
  };
  certificados: {
    corrienteObligaciones: boolean;
    fechaEmision: string;
    validoHasta: string;
  };
  alertas: string[];
}

export interface TGSSConsultaResult {
  nif: string;
  denominacion: string;
  regimen: string;
  situacion: 'alta' | 'baja';
  corrientePagos: boolean;
  ultimaCotizacion: string;
  numeroTrabajadores: number;
  certificado: {
    emitido: boolean;
    fechaEmision: string;
    validoHasta: string;
  };
}

export interface RegistroMercantilResult {
  nif: string;
  denominacion: string;
  formaJuridica: string;
  fechaConstitucion: string;
  capitalSocial: number;
  domicilioSocial: string;
  administradores: Array<{
    nombre: string;
    cargo: string;
    fechaNombramiento: string;
  }>;
  situacion: 'activa' | 'disuelta' | 'liquidacion' | 'concurso';
  ultimoDeposito: {
    ejercicio: number;
    fechaDeposito: string;
  };
}

export interface CatastroResult {
  referenciaCatastral: string;
  localizacion: {
    provincia: string;
    municipio: string;
    poligono?: string;
    parcela?: string;
    direccion?: string;
  };
  superficie: number;
  uso: string;
  valorCatastral: number;
  titularidad: Array<{
    nif: string;
    nombre: string;
    porcentaje: number;
  }>;
  cultivos?: Array<{
    tipo: string;
    superficie: number;
  }>;
}

export interface SIGPACResult {
  provincia: string;
  municipio: string;
  agregado: number;
  zona: number;
  poligono: number;
  parcela: number;
  recinto: number;
  superficie: number;
  usoSIGPAC: string;
  coeficienteAdmisibilidad: number;
  pendienteMedia: number;
  regionalizacion: string;
}

export interface ConsultaLog {
  id: string;
  integrationType: AdminIntegrationType;
  queryType: string;
  inputParams: Record<string, unknown>;
  status: 'success' | 'error' | 'pending';
  responseTime: number;
  timestamp: string;
  expedienteId?: string;
  result?: unknown;
  errorMessage?: string;
}

export interface GaliaAdminIntegrationsContext {
  expedienteId?: string;
  beneficiarioNIF?: string;
  referenciaCatastral?: string;
}

// === HOOK ===
export function useGaliaAdminIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<AdminIntegration[]>([]);
  const [consultaLogs, setConsultaLogs] = useState<ConsultaLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH INTEGRATIONS ===
  const fetchIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'get_integrations'
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.integrations) {
        setIntegrations(data.data.integrations);
        setLastRefresh(new Date());
        return data.data.integrations;
      }

      throw new Error('Respuesta inválida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaAdminIntegrations] fetchIntegrations error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CONSULTA AEAT ===
  const consultarAEAT = useCallback(async (
    nif: string,
    tipoConsulta: 'situacion_censal' | 'obligaciones' | 'certificado_corriente'
  ): Promise<AEATConsultaResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'consulta_aeat',
            params: { nif, tipoConsulta }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Consulta AEAT completada');
        return data.data as AEATConsultaResult;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] consultarAEAT error:', err);
      toast.error('Error en consulta AEAT');
      return null;
    }
  }, []);

  // === CONSULTA TGSS ===
  const consultarTGSS = useCallback(async (
    nif: string,
    tipoConsulta: 'situacion' | 'certificado_corriente' | 'vida_laboral'
  ): Promise<TGSSConsultaResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'consulta_tgss',
            params: { nif, tipoConsulta }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Consulta TGSS completada');
        return data.data as TGSSConsultaResult;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] consultarTGSS error:', err);
      toast.error('Error en consulta TGSS');
      return null;
    }
  }, []);

  // === CONSULTA REGISTRO MERCANTIL ===
  const consultarRegistroMercantil = useCallback(async (
    nif: string
  ): Promise<RegistroMercantilResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'consulta_registro_mercantil',
            params: { nif }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Consulta Registro Mercantil completada');
        return data.data as RegistroMercantilResult;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] consultarRegistroMercantil error:', err);
      toast.error('Error en consulta Registro Mercantil');
      return null;
    }
  }, []);

  // === CONSULTA CATASTRO ===
  const consultarCatastro = useCallback(async (
    referenciaCatastral: string
  ): Promise<CatastroResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'consulta_catastro',
            params: { referenciaCatastral }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Consulta Catastro completada');
        return data.data as CatastroResult;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] consultarCatastro error:', err);
      toast.error('Error en consulta Catastro');
      return null;
    }
  }, []);

  // === CONSULTA SIGPAC ===
  const consultarSIGPAC = useCallback(async (
    params: {
      provincia: string;
      municipio: string;
      poligono: number;
      parcela: number;
      recinto?: number;
    }
  ): Promise<SIGPACResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'consulta_sigpac',
            params
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Consulta SIGPAC completada');
        return data.data as SIGPACResult;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] consultarSIGPAC error:', err);
      toast.error('Error en consulta SIGPAC');
      return null;
    }
  }, []);

  // === VALIDAR BENEFICIARIO COMPLETO ===
  const validarBeneficiarioCompleto = useCallback(async (
    nif: string,
    referenciaCatastral?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'validacion_completa',
            params: { nif, referenciaCatastral }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Validación completa finalizada');
        return data.data;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] validarBeneficiarioCompleto error:', err);
      toast.error('Error en validación completa');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH LOGS ===
  const fetchConsultaLogs = useCallback(async (limit = 50) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'get_logs',
            params: { limit }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.logs) {
        setConsultaLogs(data.data.logs);
        return data.data.logs;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] fetchConsultaLogs error:', err);
      return [];
    }
  }, []);

  // === CONFIGURE INTEGRATION ===
  const configureIntegration = useCallback(async (
    integrationType: AdminIntegrationType,
    config: Partial<AdminIntegration['config']>
  ) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-admin-integrations',
        {
          body: {
            action: 'configure_integration',
            params: { integrationType, config }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        toast.success('Integración configurada');
        await fetchIntegrations();
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useGaliaAdminIntegrations] configureIntegration error:', err);
      toast.error('Error al configurar integración');
      return false;
    }
  }, [fetchIntegrations]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 120000) => {
    stopAutoRefresh();
    fetchIntegrations();
    autoRefreshInterval.current = setInterval(() => {
      fetchIntegrations();
    }, intervalMs);
  }, [fetchIntegrations]);

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
    integrations,
    consultaLogs,
    error,
    lastRefresh,
    // Acciones
    fetchIntegrations,
    consultarAEAT,
    consultarTGSS,
    consultarRegistroMercantil,
    consultarCatastro,
    consultarSIGPAC,
    validarBeneficiarioCompleto,
    fetchConsultaLogs,
    configureIntegration,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useGaliaAdminIntegrations;
