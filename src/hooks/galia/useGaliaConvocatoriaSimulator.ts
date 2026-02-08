/**
 * useGaliaConvocatoriaSimulator - Hook para Simulador de Convocatorias
 * Predicción de elegibilidad, estimación de ayuda y sugerencias de mejora
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface ProjectProfile {
  id?: string;
  name: string;
  description: string;
  sector: string;
  municipality: string;
  legalForm: 'autonomo' | 'sl' | 'sa' | 'cooperativa' | 'asociacion' | 'ayuntamiento' | 'other';
  employeesCount: number;
  annualRevenue?: number;
  yearsOperating?: number;
  totalInvestment: number;
  requestedGrant: number;
  projectType: 'inversion' | 'emprendimiento' | 'innovacion' | 'digitalizacion' | 'sostenibilidad' | 'turismo';
  activities: string[];
  hasEnvironmentalImpact?: boolean;
  createsJobs?: boolean;
  jobsToCreate?: number;
  isRuralArea?: boolean;
  previousGrants?: number;
}

export interface EligibilityResult {
  isEligible: boolean;
  eligibilityScore: number;
  passedCriteria: EligibilityCriterion[];
  failedCriteria: EligibilityCriterion[];
  warningCriteria: EligibilityCriterion[];
  summary: string;
}

export interface EligibilityCriterion {
  id: string;
  name: string;
  description: string;
  category: 'legal' | 'economic' | 'territorial' | 'sectoral' | 'documentary';
  status: 'passed' | 'failed' | 'warning' | 'unknown';
  details: string;
  weight: number;
}

export interface GrantEstimate {
  estimatedAmount: number;
  minAmount: number;
  maxAmount: number;
  percentageOfInvestment: number;
  breakdownByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  confidenceLevel: number;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    adjustment: number;
    explanation: string;
  }[];
}

export interface ScoringPrediction {
  predictedScore: number;
  maxPossibleScore: number;
  percentile: number;
  ranking: 'alto' | 'medio' | 'bajo';
  scoreBreakdown: {
    criterion: string;
    points: number;
    maxPoints: number;
    justification: string;
  }[];
  competitivenessAnalysis: string;
}

export interface ImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'eligibility' | 'scoring' | 'documentation' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  impact: number; // Estimated score improvement
  effort: 'easy' | 'moderate' | 'difficult';
  timeline: string;
  specificActions: string[];
}

export interface SimulationResult {
  projectProfile: ProjectProfile;
  eligibility: EligibilityResult;
  grantEstimate: GrantEstimate;
  scoring: ScoringPrediction;
  improvements: ImprovementSuggestion[];
  matchingCalls: MatchingCall[];
  timestamp: string;
}

export interface MatchingCall {
  id: string;
  title: string;
  organization: string;
  deadline: string;
  budget: number;
  matchScore: number;
  eligibilityStatus: 'eligible' | 'partial' | 'ineligible';
  keyRequirements: string[];
  recommendedActions: string[];
}

export interface SimulatorContext {
  galId?: string;
  region?: string;
  currentCalls?: string[];
}

// === HOOK ===

export function useGaliaConvocatoriaSimulator() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectProfile | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<ProjectProfile[]>([]);
  const [simulationHistory, setSimulationHistory] = useState<SimulationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // === SIMULAR ELEGIBILIDAD ===
  const simulateEligibility = useCallback(async (
    project: ProjectProfile,
    context?: SimulatorContext
  ): Promise<SimulationResult | null> => {
    setIsSimulating(true);
    setError(null);
    setCurrentProject(project);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-convocatoria-simulator',
        {
          body: {
            action: 'simulate',
            project,
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result: SimulationResult = {
          projectProfile: project,
          eligibility: data.data.eligibility,
          grantEstimate: data.data.grantEstimate,
          scoring: data.data.scoring,
          improvements: data.data.improvements || [],
          matchingCalls: data.data.matchingCalls || [],
          timestamp: new Date().toISOString()
        };

        setSimulationResult(result);
        setSimulationHistory(prev => [result, ...prev.slice(0, 9)]);
        
        toast.success('Simulación completada');
        return result;
      }

      throw new Error('Respuesta inválida del simulador');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en simulación';
      setError(message);
      console.error('[useGaliaConvocatoriaSimulator] simulateEligibility error:', err);
      toast.error('Error al simular elegibilidad');
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, []);

  // === BUSCAR CONVOCATORIAS COMPATIBLES ===
  const findMatchingCalls = useCallback(async (
    project: ProjectProfile,
    region?: string
  ): Promise<MatchingCall[]> => {
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-convocatoria-simulator',
        {
          body: {
            action: 'find_matching',
            project,
            region
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.matchingCalls) {
        return data.matchingCalls;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaConvocatoriaSimulator] findMatchingCalls error:', err);
      toast.error('Error al buscar convocatorias');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OBTENER SUGERENCIAS DE MEJORA ===
  const getImprovementSuggestions = useCallback(async (
    project: ProjectProfile,
    eligibilityResult?: EligibilityResult
  ): Promise<ImprovementSuggestion[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'galia-convocatoria-simulator',
        {
          body: {
            action: 'get_improvements',
            project,
            eligibilityResult
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.improvements) {
        return data.improvements;
      }

      return [];
    } catch (err) {
      console.error('[useGaliaConvocatoriaSimulator] getImprovementSuggestions error:', err);
      return [];
    }
  }, []);

  // === COMPARAR ESCENARIOS ===
  const compareScenarios = useCallback(async (
    scenarios: ProjectProfile[]
  ): Promise<{ scenario: ProjectProfile; result: SimulationResult }[]> => {
    setIsLoading(true);

    try {
      const results = await Promise.all(
        scenarios.map(async (scenario) => {
          const result = await simulateEligibility(scenario);
          return { scenario, result: result! };
        })
      );

      return results.filter(r => r.result !== null);
    } catch (err) {
      console.error('[useGaliaConvocatoriaSimulator] compareScenarios error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [simulateEligibility]);

  // === GUARDAR PERFIL ===
  const saveProjectProfile = useCallback((profile: ProjectProfile) => {
    const profileWithId = {
      ...profile,
      id: profile.id || `profile_${Date.now()}`
    };
    setSavedProfiles(prev => {
      const filtered = prev.filter(p => p.id !== profileWithId.id);
      return [profileWithId, ...filtered];
    });
    toast.success('Perfil guardado');
    return profileWithId;
  }, []);

  // === ELIMINAR PERFIL ===
  const deleteProjectProfile = useCallback((profileId: string) => {
    setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
    toast.success('Perfil eliminado');
  }, []);

  // === LIMPIAR SIMULACIÓN ===
  const clearSimulation = useCallback(() => {
    setCurrentProject(null);
    setSimulationResult(null);
    setError(null);
  }, []);

  // === EXPORTAR RESULTADO ===
  const exportSimulationResult = useCallback((result: SimulationResult) => {
    const exportData = {
      ...result,
      exportedAt: new Date().toISOString(),
      format: 'GALIA Simulator Export'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_${result.projectProfile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Simulación exportada');
  }, []);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    isSimulating,
    currentProject,
    simulationResult,
    savedProfiles,
    simulationHistory,
    error,
    // Acciones
    simulateEligibility,
    findMatchingCalls,
    getImprovementSuggestions,
    compareScenarios,
    saveProjectProfile,
    deleteProjectProfile,
    clearSimulation,
    exportSimulationResult,
    setCurrentProject
  };
}

export default useGaliaConvocatoriaSimulator;
