/**
 * Hook: useHRAnalyticsIntelligence
 * Fase 7: HR Analytics Predictivos y Workforce Intelligence
 * Gestión de análisis predictivo de talento y planificación estratégica
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TIPOS: Predicción de Rotación ===
export interface TurnoverRiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface TurnoverRecommendation {
  action: string;
  priority: 'immediate' | 'short-term' | 'medium-term';
  expectedImpact: string;
}

export interface TurnoverPrediction {
  employeeId: string;
  employeeName: string;
  department: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedTimeframe: string;
  confidenceScore: number;
  topFactors: TurnoverRiskFactor[];
  recommendedActions: TurnoverRecommendation[];
}

export interface TurnoverAnalysis {
  predictions: TurnoverPrediction[];
  aggregateMetrics: {
    overallRiskScore: number;
    employeesAtRisk: number;
    criticalRoles: string[];
    estimatedCostOfTurnover: string;
    retentionOpportunityWindow: string;
  };
  trendAnalysis: {
    direction: 'improving' | 'stable' | 'deteriorating';
    keyDrivers: string[];
    seasonalPatterns: string;
  };
}

// === TIPOS: Workforce Planning ===
export interface DepartmentState {
  department: string;
  headcount: number;
  avgAge: number;
  criticalRoles: string[];
}

export interface HiringNeed {
  role: string;
  quantity: number;
  priority: 'critical' | 'high' | 'medium';
  skillsRequired: string[];
  estimatedTimeToFill: string;
}

export interface WorkforceProjection {
  timeframe: string;
  scenario: 'conservative' | 'moderate' | 'aggressive';
  projectedHeadcount: number;
  netChange: number;
  hiringNeeds: number;
  expectedAttrition: number;
  keyHires: HiringNeed[];
}

export interface WorkforceRiskArea {
  area: string;
  riskType: 'succession' | 'skills_gap' | 'capacity' | 'age_pyramid';
  severity: 'high' | 'medium' | 'low';
  affectedRoles: string[];
  mitigation: string;
}

export interface WorkforcePlan {
  currentState: {
    totalHeadcount: number;
    ftesEquivalent: number;
    avgTenure: string;
    departmentBreakdown: DepartmentState[];
  };
  projections: WorkforceProjection[];
  riskAreas: WorkforceRiskArea[];
  recommendations: Array<{
    category: 'hiring' | 'development' | 'restructuring' | 'outsourcing';
    recommendation: string;
    impact: string;
    timeline: string;
    investmentRequired: string;
  }>;
  budgetImplications: {
    currentLaborCost: string;
    projectedLaborCost: string;
    hiringBudgetNeeded: string;
    trainingBudgetNeeded: string;
  };
}

// === TIPOS: Salary Benchmarking ===
export interface RoleComparison {
  role: string;
  currentSalary: number;
  marketP25: number;
  marketP50: number;
  marketP75: number;
  marketP90: number;
  currentPercentile: number;
  recommendation: string;
}

export interface SalaryBenchmark {
  marketPositioning: {
    overallPercentile: number;
    positioningLabel: 'below_market' | 'at_market' | 'above_market';
    competitivenessScore: number;
  };
  departmentAnalysis: Array<{
    department: string;
    avgSalary: number;
    marketMedian: number;
    variance: number;
    positioning: string;
    atRiskRoles: string[];
  }>;
  roleComparison: RoleComparison[];
  equityAnalysis: {
    genderPayGap: number;
    genderGapByLevel: Array<{
      level: string;
      gap: number;
      affectedCount: number;
    }>;
    compressionIssues: Array<{
      description: string;
      affectedEmployees: number;
      severity: 'high' | 'medium' | 'low';
    }>;
  };
  recommendations: Array<{
    type: 'adjustment' | 'structure' | 'policy';
    description: string;
    affectedEmployees: number;
    estimatedCost: string;
    priority: 'immediate' | 'short-term' | 'medium-term';
  }>;
}

// === TIPOS: Talent Demand Forecast ===
export interface TalentDemandForecast {
  marketTrends: {
    overallOutlook: 'positive' | 'neutral' | 'challenging';
    talentScarcity: 'low' | 'moderate' | 'high' | 'critical';
    keyTrends: Array<{
      trend: string;
      impact: 'high' | 'medium' | 'low';
      timeframe: string;
      relevantRoles: string[];
    }>;
  };
  demandForecast: Array<{
    role: string;
    currentDemand: 'low' | 'moderate' | 'high';
    projectedDemand: 'decreasing' | 'stable' | 'growing' | 'surging';
    supplyAvailability: 'abundant' | 'adequate' | 'scarce' | 'critical';
    salaryPressure: 'downward' | 'stable' | 'upward' | 'significant_upward';
    recommendedAction: string;
  }>;
  emergingSkills: Array<{
    skill: string;
    category: 'technical' | 'soft' | 'domain';
    growthRate: string;
    relevanceToOrg: 'high' | 'medium' | 'low';
    acquisitionStrategy: 'hire' | 'train' | 'partner';
  }>;
  strategicRecommendations: Array<{
    recommendation: string;
    rationale: string;
    timeline: string;
    resources: string;
  }>;
}

// === TIPOS: Succession Risk ===
export interface SuccessionRisk {
  criticalPositions: Array<{
    position: string;
    incumbent: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    yearsToRetirement: number | null;
    flightRisk: 'low' | 'medium' | 'high';
    businessImpact: string;
    successionReadiness: 'no_successor' | 'developing' | 'ready_1yr' | 'ready_now';
  }>;
  successionPipeline: Array<{
    targetPosition: string;
    successors: Array<{
      name: string;
      currentRole: string;
      readiness: 'ready_now' | '1-2_years' | '3-5_years';
      developmentNeeds: string[];
      retentionRisk: 'low' | 'medium' | 'high';
    }>;
    pipelineHealth: 'strong' | 'adequate' | 'weak' | 'critical';
  }>;
  gapAnalysis: {
    positionsWithoutSuccessor: number;
    positionsWithWeakPipeline: number;
    criticalGaps: string[];
  };
  overallRiskScore: number;
}

// === TIPOS: Productivity Insights ===
export interface ProductivityInsights {
  organizationalMetrics: {
    overallProductivityScore: number;
    revenuePerEmployee: string;
    profitPerEmployee: string;
    utilizationRate: number;
    overtimeRate: number;
    absenteeismRate: number;
  };
  departmentBreakdown: Array<{
    department: string;
    productivityScore: number;
    trend: 'improving' | 'stable' | 'declining';
    opportunities: string[];
  }>;
  optimizationOpportunities: Array<{
    opportunity: string;
    potentialGain: string;
    effort: 'low' | 'medium' | 'high';
    priority: number;
  }>;
}

// === TIPOS: Engagement Prediction ===
export interface EngagementPrediction {
  currentEngagement: {
    overallScore: number;
    eNPS: number;
    participationRate: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  dimensionScores: Array<{
    dimension: string;
    score: number;
    benchmark: number;
    trend: 'up' | 'stable' | 'down';
    priority: 'high' | 'medium' | 'low';
  }>;
  predictions: {
    '3monthOutlook': {
      predictedScore: number;
      confidence: number;
      keyFactors: string[];
    };
    '6monthOutlook': {
      predictedScore: number;
      confidence: number;
      keyFactors: string[];
    };
  };
  actionPlan: Array<{
    initiative: string;
    targetDimension: string;
    expectedImpact: string;
    timeline: string;
  }>;
}

// === TIPOS: Skills Gap Forecast ===
export interface SkillsGapForecast {
  currentCapabilities: {
    totalSkillsTracked: number;
    averageProficiency: number;
    skillCoverage: number;
    criticalSkillsStatus: 'adequate' | 'at_risk' | 'critical';
  };
  skillsInventory: Array<{
    skill: string;
    category: 'technical' | 'soft' | 'leadership' | 'domain';
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    demandTrend: 'increasing' | 'stable' | 'decreasing';
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  futureRequirements: Array<{
    skill: string;
    currentCoverage: number;
    requiredBy: string;
    acquisitionStrategy: 'hire' | 'train' | 'partner' | 'automate';
  }>;
  automationImpact: Array<{
    skill: string;
    automationRisk: 'high' | 'medium' | 'low';
    timeframe: string;
    affectedRoles: string[];
  }>;
}

// === HOOK ===
export function useHRAnalyticsIntelligence() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para cada tipo de análisis
  const [turnoverAnalysis, setTurnoverAnalysis] = useState<TurnoverAnalysis | null>(null);
  const [workforcePlan, setWorkforcePlan] = useState<WorkforcePlan | null>(null);
  const [salaryBenchmark, setSalaryBenchmark] = useState<SalaryBenchmark | null>(null);
  const [talentForecast, setTalentForecast] = useState<TalentDemandForecast | null>(null);
  const [successionRisk, setSuccessionRisk] = useState<SuccessionRisk | null>(null);
  const [productivityInsights, setProductivityInsights] = useState<ProductivityInsights | null>(null);
  const [engagementPrediction, setEngagementPrediction] = useState<EngagementPrediction | null>(null);
  const [skillsGapForecast, setSkillsGapForecast] = useState<SkillsGapForecast | null>(null);

  // === Función genérica para invocar el agente ===
  const invokeAgent = useCallback(async (
    action: string,
    context?: Record<string, unknown>,
    params?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-analytics-intelligence',
        {
          body: { action, context, params }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        return data.data;
      }

      throw new Error(data?.error || 'Error en respuesta del agente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error(`[useHRAnalyticsIntelligence] ${action} error:`, err);
      toast.error(`Error en análisis: ${message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === Predicción de Rotación ===
  const predictTurnover = useCallback(async (context: {
    employees?: unknown[];
    engagement?: Record<string, unknown>;
    salaryData?: Record<string, unknown>;
    turnoverHistory?: unknown[];
  }) => {
    const result = await invokeAgent('predict_turnover', context);
    if (result) {
      setTurnoverAnalysis(result as TurnoverAnalysis);
      toast.success('Análisis de rotación completado');
    }
    return result as TurnoverAnalysis | null;
  }, [invokeAgent]);

  // === Workforce Planning ===
  const generateWorkforcePlan = useCallback(async (
    context: { workforce?: Record<string, unknown> },
    params?: {
      businessProjections?: Record<string, unknown>;
      planningHorizon?: string;
      scenarios?: string[];
    }
  ) => {
    const result = await invokeAgent('workforce_planning', context, params);
    if (result) {
      setWorkforcePlan(result as WorkforcePlan);
      toast.success('Plan de workforce generado');
    }
    return result as WorkforcePlan | null;
  }, [invokeAgent]);

  // === Salary Benchmarking ===
  const analyzeSalaryBenchmark = useCallback(async (
    context: {
      salaryData?: unknown[];
      sector?: string;
      region?: string;
      companySize?: string;
    },
    params?: { benchmarks?: Record<string, unknown> }
  ) => {
    const result = await invokeAgent('salary_benchmarking', context, params);
    if (result) {
      setSalaryBenchmark(result as SalaryBenchmark);
      toast.success('Análisis salarial completado');
    }
    return result as SalaryBenchmark | null;
  }, [invokeAgent]);

  // === Talent Demand Forecast ===
  const forecastTalentDemand = useCallback(async (
    context: {
      sector?: string;
      currentRoles?: unknown[];
    },
    params?: {
      businessPlan?: Record<string, unknown>;
      horizon?: string;
    }
  ) => {
    const result = await invokeAgent('talent_demand_forecast', context, params);
    if (result) {
      setTalentForecast(result as TalentDemandForecast);
      toast.success('Forecast de talento generado');
    }
    return result as TalentDemandForecast | null;
  }, [invokeAgent]);

  // === Succession Risk Analysis ===
  const analyzeSuccessionRisk = useCallback(async (context: {
    leadershipPositions?: unknown[];
    talentData?: unknown[];
    promotionHistory?: unknown[];
  }) => {
    const result = await invokeAgent('succession_risk_analysis', context);
    if (result) {
      setSuccessionRisk(result as SuccessionRisk);
      toast.success('Análisis de sucesión completado');
    }
    return result as SuccessionRisk | null;
  }, [invokeAgent]);

  // === Productivity Insights ===
  const analyzeProductivity = useCallback(async (context: {
    operationalData?: Record<string, unknown>;
    kpis?: Record<string, unknown>;
    sector?: string;
  }) => {
    const result = await invokeAgent('productivity_insights', context);
    if (result) {
      setProductivityInsights(result as ProductivityInsights);
      toast.success('Análisis de productividad completado');
    }
    return result as ProductivityInsights | null;
  }, [invokeAgent]);

  // === Engagement Prediction ===
  const predictEngagement = useCallback(async (context: {
    surveyResults?: Record<string, unknown>;
    historicalData?: unknown[];
    recentEvents?: unknown[];
  }) => {
    const result = await invokeAgent('engagement_prediction', context);
    if (result) {
      setEngagementPrediction(result as EngagementPrediction);
      toast.success('Predicción de engagement completada');
    }
    return result as EngagementPrediction | null;
  }, [invokeAgent]);

  // === Skills Gap Forecast ===
  const forecastSkillsGap = useCallback(async (
    context: {
      currentSkills?: unknown[];
      roleRequirements?: unknown[];
    },
    params?: {
      strategicPlan?: Record<string, unknown>;
      horizon?: string;
    }
  ) => {
    const result = await invokeAgent('skills_gap_forecast', context, params);
    if (result) {
      setSkillsGapForecast(result as SkillsGapForecast);
      toast.success('Forecast de skills completado');
    }
    return result as SkillsGapForecast | null;
  }, [invokeAgent]);

  // === Limpiar estados ===
  const clearAnalysis = useCallback(() => {
    setTurnoverAnalysis(null);
    setWorkforcePlan(null);
    setSalaryBenchmark(null);
    setTalentForecast(null);
    setSuccessionRisk(null);
    setProductivityInsights(null);
    setEngagementPrediction(null);
    setSkillsGapForecast(null);
    setError(null);
  }, []);

  return {
    // Estado
    isLoading,
    error,
    
    // Resultados de análisis
    turnoverAnalysis,
    workforcePlan,
    salaryBenchmark,
    talentForecast,
    successionRisk,
    productivityInsights,
    engagementPrediction,
    skillsGapForecast,

    // Acciones
    predictTurnover,
    generateWorkforcePlan,
    analyzeSalaryBenchmark,
    forecastTalentDemand,
    analyzeSuccessionRisk,
    analyzeProductivity,
    predictEngagement,
    forecastSkillsGap,
    clearAnalysis,
  };
}

export default useHRAnalyticsIntelligence;
