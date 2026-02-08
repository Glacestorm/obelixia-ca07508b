/**
 * useGaliaGeoIntelligence - Hook para Geointeligencia Territorial
 * Análisis de impacto por municipio, zonas despobladas y optimización de inversión
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface MunicipalityData {
  id: string;
  name: string;
  province: string;
  population: number;
  populationTrend: 'declining' | 'stable' | 'growing';
  depopulationRisk: 'critical' | 'high' | 'medium' | 'low';
  grantCount: number;
  totalInvestment: number;
  avgGrantAmount: number;
  employmentGenerated: number;
  coordinates: { lat: number; lng: number };
  polygon?: number[][];
}

export interface TerritorialImpact {
  municipalityId: string;
  municipalityName: string;
  impactScore: number;
  economicImpact: {
    directJobs: number;
    indirectJobs: number;
    investmentMultiplier: number;
    taxRevenue: number;
  };
  socialImpact: {
    populationRetention: number;
    serviceAccessibility: number;
    qualityOfLife: number;
  };
  environmentalImpact: {
    sustainabilityScore: number;
    carbonReduction: number;
    biodiversityProtection: number;
  };
  recommendations: string[];
}

export interface DepopulationZone {
  id: string;
  name: string;
  municipalities: string[];
  totalPopulation: number;
  populationDensity: number;
  riskLevel: 'critical' | 'high' | 'medium';
  priorityScore: number;
  suggestedInterventions: {
    type: string;
    description: string;
    estimatedImpact: number;
    budget: number;
  }[];
  grantOpportunities: {
    convocatoriaId: string;
    title: string;
    maxAmount: number;
    relevanceScore: number;
  }[];
}

export interface InvestmentOptimization {
  scenarioId: string;
  scenarioName: string;
  totalBudget: number;
  allocations: {
    municipalityId: string;
    municipalityName: string;
    amount: number;
    projectTypes: string[];
    expectedImpact: number;
    priorityReason: string;
  }[];
  expectedOutcomes: {
    totalJobs: number;
    populationRetained: number;
    economicMultiplier: number;
    sustainabilityScore: number;
  };
  comparisonToBaseline: {
    jobsImprovement: number;
    efficiencyGain: number;
    equityScore: number;
  };
}

export interface GeoAnalysisContext {
  region: string;
  convocatoriaId?: string;
  dateRange?: { start: string; end: string };
  focusMunicipalities?: string[];
  analysisType: 'impact' | 'depopulation' | 'optimization' | 'full';
}

// === HOOK ===
export function useGaliaGeoIntelligence() {
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [municipalities, setMunicipalities] = useState<MunicipalityData[]>([]);
  const [impacts, setImpacts] = useState<TerritorialImpact[]>([]);
  const [depopulationZones, setDepopulationZones] = useState<DepopulationZone[]>([]);
  const [optimization, setOptimization] = useState<InvestmentOptimization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Refs para auto-refresh
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH MUNICIPAL DATA ===
  const fetchMunicipalData = useCallback(async (region: string = 'asturias') => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-geo-intelligence',
        {
          body: {
            action: 'get_municipal_data',
            context: { region }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        setMunicipalities(fnData.data.municipalities || []);
        setLastAnalysis(new Date());
        return fnData.data;
      }

      throw new Error('Invalid response from geo-intelligence service');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaGeoIntelligence] fetchMunicipalData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALYZE TERRITORIAL IMPACT ===
  const analyzeTerritorialImpact = useCallback(async (
    context: GeoAnalysisContext
  ): Promise<TerritorialImpact[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-geo-intelligence',
        {
          body: {
            action: 'analyze_impact',
            context
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        const impactData = fnData.data.impacts || [];
        setImpacts(impactData);
        setLastAnalysis(new Date());
        toast.success(`Análisis de impacto completado para ${impactData.length} municipios`);
        return impactData;
      }

      throw new Error('Error en análisis de impacto territorial');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaGeoIntelligence] analyzeTerritorialImpact error:', err);
      toast.error('Error al analizar impacto territorial');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === DETECT DEPOPULATION ZONES ===
  const detectDepopulationZones = useCallback(async (
    region: string = 'asturias'
  ): Promise<DepopulationZone[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-geo-intelligence',
        {
          body: {
            action: 'detect_depopulation',
            context: { region }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        const zones = fnData.data.zones || [];
        setDepopulationZones(zones);
        setLastAnalysis(new Date());
        
        const criticalCount = zones.filter((z: DepopulationZone) => z.riskLevel === 'critical').length;
        if (criticalCount > 0) {
          toast.warning(`${criticalCount} zonas en riesgo crítico de despoblación detectadas`);
        } else {
          toast.success(`${zones.length} zonas analizadas`);
        }
        
        return zones;
      }

      throw new Error('Error en detección de zonas despobladas');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaGeoIntelligence] detectDepopulationZones error:', err);
      toast.error('Error al detectar zonas despobladas');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === OPTIMIZE INVESTMENT DISTRIBUTION ===
  const optimizeInvestment = useCallback(async (
    budget: number,
    priorities: {
      employment: number;
      sustainability: number;
      equity: number;
      depopulation: number;
    },
    region: string = 'asturias'
  ): Promise<InvestmentOptimization | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-geo-intelligence',
        {
          body: {
            action: 'optimize_investment',
            context: { region },
            params: { budget, priorities }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        const optimizationResult = fnData.data.optimization;
        setOptimization(optimizationResult);
        setLastAnalysis(new Date());
        toast.success('Optimización de inversión calculada');
        return optimizationResult;
      }

      throw new Error('Error en optimización de inversión');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useGaliaGeoIntelligence] optimizeInvestment error:', err);
      toast.error('Error al optimizar distribución de inversión');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GET MUNICIPALITY DETAILS ===
  const getMunicipalityDetails = useCallback(async (
    municipalityId: string
  ): Promise<{ municipality: MunicipalityData; impact: TerritorialImpact; grants: unknown[] } | null> => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'galia-geo-intelligence',
        {
          body: {
            action: 'get_municipality_details',
            params: { municipalityId }
          }
        }
      );

      if (fnError) throw fnError;

      if (fnData?.success && fnData?.data) {
        return fnData.data;
      }

      return null;
    } catch (err) {
      console.error('[useGaliaGeoIntelligence] getMunicipalityDetails error:', err);
      return null;
    }
  }, []);

  // === GENERATE HEATMAP DATA ===
  const generateHeatmapData = useCallback((
    metric: 'investment' | 'employment' | 'depopulation' | 'impact'
  ) => {
    return municipalities.map(m => {
      let value = 0;
      switch (metric) {
        case 'investment':
          value = m.totalInvestment;
          break;
        case 'employment':
          value = m.employmentGenerated;
          break;
        case 'depopulation':
          value = m.depopulationRisk === 'critical' ? 100 : 
                  m.depopulationRisk === 'high' ? 75 :
                  m.depopulationRisk === 'medium' ? 50 : 25;
          break;
        case 'impact':
          const impact = impacts.find(i => i.municipalityId === m.id);
          value = impact?.impactScore || 0;
          break;
      }
      return {
        ...m.coordinates,
        weight: value,
        municipalityId: m.id,
        municipalityName: m.name
      };
    });
  }, [municipalities, impacts]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((region: string, intervalMs = 300000) => {
    stopAutoRefresh();
    fetchMunicipalData(region);
    autoRefreshInterval.current = setInterval(() => {
      fetchMunicipalData(region);
    }, intervalMs);
  }, [fetchMunicipalData]);

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
    municipalities,
    impacts,
    depopulationZones,
    optimization,
    error,
    lastAnalysis,
    // Acciones
    fetchMunicipalData,
    analyzeTerritorialImpact,
    detectDepopulationZones,
    optimizeInvestment,
    getMunicipalityDetails,
    generateHeatmapData,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

export default useGaliaGeoIntelligence;
