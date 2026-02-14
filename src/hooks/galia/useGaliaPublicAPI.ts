/**
 * useGaliaPublicAPI - Hook for Public API Integration
 * 
 * REST/GraphQL API for third-party integrations.
 * Allows external systems to query grants data.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Convocatoria {
  id: string;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto_total: number;
  estado: string;
  descripcion: string;
}

export interface ExpedienteStatus {
  codigo: string;
  estado: string;
  fechaSolicitud: string;
  ultimaActualizacion: string;
  progreso: number;
  etapas: Array<{
    nombre: string;
    completada: boolean;
    fecha?: string;
    enProceso?: boolean;
  }>;
  proximaAccion: string;
}

export interface EligibilityCheck {
  eligible: boolean;
  score: number;
  checks: Array<{
    criterio: string;
    cumple: boolean;
    detalle: string;
  }>;
  recomendaciones: string[];
  convocatoriasAplicables: string[];
}

export interface GlobalStats {
  periodo: string;
  convocatoriasActivas: number;
  solicitudesRecibidas: number;
  expedientesEnTramite: number;
  proyectosConcedidos: number;
  importeTotalConcedido: number;
  empleosComprometidos: number;
  tasaAprobacion: number;
  tiempoMedioResolucion: string;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact: { email: string };
  };
  servers: Array<{ url: string }>;
  paths: Record<string, unknown>;
}

export function useGaliaPublicAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAPI = useCallback(async <T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = new URL(`${supabaseUrl}/functions/v1/galia-public-api/${endpoint}`);
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url.toString(), options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error calling API';
      setError(message);
      console.error('[useGaliaPublicAPI] Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getConvocatorias = useCallback(async (
    limit?: number
  ): Promise<{ success: boolean; data: Convocatoria[] } | null> => {
    const endpoint = limit ? `convocatorias?limit=${limit}` : 'convocatorias';
    return callAPI(endpoint);
  }, [callAPI]);

  const getConvocatoria = useCallback(async (
    id: string
  ): Promise<{ success: boolean; data: Convocatoria } | null> => {
    return callAPI(`convocatorias/${id}`);
  }, [callAPI]);

  const getExpedienteStatus = useCallback(async (
    codigo: string
  ): Promise<{ success: boolean; data: ExpedienteStatus } | null> => {
    return callAPI(`expedientes/${codigo}`);
  }, [callAPI]);

  const checkEligibility = useCallback(async (
    nif: string,
    tipoProyecto: string,
    presupuesto: number,
    territorio: string
  ): Promise<{ success: boolean; data: EligibilityCheck } | null> => {
    return callAPI('expedientes/check-eligibility', 'POST', {
      nif,
      tipoProyecto,
      presupuesto,
      territorio
    });
  }, [callAPI]);

  const getGlobalStats = useCallback(async (): Promise<{ success: boolean; data: GlobalStats } | null> => {
    return callAPI('stats/global');
  }, [callAPI]);

  const getGALStats = useCallback(async (
    galCodigo: string
  ): Promise<{ success: boolean; data: Record<string, unknown> } | null> => {
    return callAPI(`stats/gal/${galCodigo}`);
  }, [callAPI]);

  const getOpenAPISpec = useCallback(async (): Promise<OpenAPISpec | null> => {
    return callAPI('docs/openapi');
  }, [callAPI]);

  const getAPIDocumentation = useCallback(async () => {
    return callAPI('docs');
  }, [callAPI]);

  return {
    isLoading,
    error,
    callAPI,
    getConvocatorias,
    getConvocatoria,
    getExpedienteStatus,
    checkEligibility,
    getGlobalStats,
    getGALStats,
    getOpenAPISpec,
    getAPIDocumentation
  };
}

export default useGaliaPublicAPI;
