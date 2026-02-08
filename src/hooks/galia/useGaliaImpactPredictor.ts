/**
 * useGaliaImpactPredictor - Hook para predicción de impacto socioeconómico
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectData {
  id: string;
  titulo: string;
  descripcion?: string;
  sector: string;
  importe_solicitado: number;
  importe_inversion_total?: number;
  municipio?: string;
  comarca?: string;
  tipo_beneficiario: 'empresa' | 'ayuntamiento' | 'asociacion' | 'autonomo';
  empleos_previstos?: number;
  empleos_mantener?: number;
  innovacion?: boolean;
  digitalizacion?: boolean;
  sostenibilidad?: boolean;
  fecha_inicio_prevista?: string;
  duracion_meses?: number;
}

export interface ImpactPrediction {
  impacto_global: {
    puntuacion: number;
    nivel: 'bajo' | 'medio' | 'alto' | 'transformador';
    descripcion: string;
  };
  impacto_economico: {
    puntuacion: number;
    efecto_multiplicador: number;
    inversion_inducida_estimada: number;
    impacto_pib_local: 'bajo' | 'medio' | 'alto';
  };
  impacto_empleo: {
    empleos_directos_estimados: number;
    empleos_indirectos_estimados: number;
    calidad_empleo: 'precario' | 'estable' | 'cualificado';
    sostenibilidad_empleo: number;
  };
  impacto_territorial: {
    puntuacion: number;
    fijacion_poblacion: 'bajo' | 'medio' | 'alto';
    mejora_servicios: boolean;
    atraccion_inversiones: boolean;
  };
  indicadores_edl: {
    alineacion_estrategia: number;
    contribucion_objetivos: string[];
  };
  riesgos_impacto: Array<{
    riesgo: string;
    probabilidad: number;
    mitigacion: string;
  }>;
  recomendaciones_mejora: string[];
  comparativa_sector: {
    percentil: number;
    media_sector: number;
    posicion: 'por_debajo' | 'media' | 'por_encima' | 'destacado';
  };
}

export interface ViabilityAnalysis {
  viabilidad_global: {
    puntuacion: number;
    nivel: 'inviable' | 'dudoso' | 'viable' | 'muy_viable';
    confianza: number;
  };
  viabilidad_tecnica: {
    puntuacion: number;
    fortalezas: string[];
    debilidades: string[];
  };
  viabilidad_economica: {
    puntuacion: number;
    roi_estimado: number;
    payback_meses: number;
    punto_equilibrio: number;
  };
  viabilidad_comercial: {
    puntuacion: number;
    mercado_potencial: 'nicho' | 'local' | 'regional' | 'nacional';
    competencia: 'alta' | 'media' | 'baja';
  };
  probabilidad_exito: number;
  factores_criticos: string[];
  condiciones_exito: string[];
  alertas: Array<{
    tipo: string;
    severidad: 'info' | 'warning' | 'critical';
    mensaje: string;
  }>;
}

export interface EmploymentEstimate {
  empleo_directo: {
    creacion: number;
    mantenimiento: number;
    total: number;
    jornada_completa_equivalente: number;
  };
  empleo_indirecto: {
    estimacion: number;
    sectores_beneficiados: string[];
    multiplicador: number;
  };
  perfil_empleo: Array<{
    categoria: string;
    numero: number;
    cualificacion: 'basica' | 'media' | 'alta';
    tipo_contrato: 'temporal' | 'indefinido' | 'autonomo';
    salario_estimado: number;
  }>;
  sostenibilidad: {
    probabilidad_permanencia_1_ano: number;
    probabilidad_permanencia_3_anos: number;
    probabilidad_permanencia_5_anos: number;
  };
  impacto_genero: {
    porcentaje_mujeres_estimado: number;
    mejora_brecha: boolean;
  };
  impacto_juventud: {
    porcentaje_jovenes_estimado: number;
    atraccion_talento: boolean;
  };
  coste_por_empleo: number;
}

export function useGaliaImpactPredictor() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predictImpact = useCallback(async (project: ProjectData): Promise<ImpactPrediction | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-impact-predictor', {
        body: { action: 'predict_impact', projectData: project }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data as ImpactPrediction;
      }

      throw new Error(data?.error || 'Error en predicción');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al predecir impacto', { description: message });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeViability = useCallback(async (project: ProjectData): Promise<ViabilityAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-impact-predictor', {
        body: { action: 'analyze_viability', projectData: project }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data as ViabilityAnalysis;
      }

      throw new Error(data?.error || 'Error en análisis');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al analizar viabilidad', { description: message });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const estimateEmployment = useCallback(async (project: ProjectData): Promise<EmploymentEstimate | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-impact-predictor', {
        body: { action: 'estimate_employment', projectData: project }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data as EmploymentEstimate;
      }

      throw new Error(data?.error || 'Error en estimación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al estimar empleo', { description: message });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const compareProjects = useCallback(async (projects: ProjectData[]) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-impact-predictor', {
        body: { action: 'compare_projects', projects }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data;
      }

      throw new Error(data?.error || 'Error en comparación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error('Error al comparar proyectos', { description: message });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    error,
    predictImpact,
    analyzeViability,
    estimateEmployment,
    compareProjects,
  };
}

export default useGaliaImpactPredictor;
