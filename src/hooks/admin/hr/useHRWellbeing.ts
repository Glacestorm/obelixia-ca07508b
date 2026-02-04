/**
 * useHRWellbeing - Hook para gestión del bienestar laboral
 * Fase 3: Employee Experience & Wellbeing
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===
export interface WellbeingScore {
  wellbeing_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: WellbeingFactor[];
  burnout_risk: BurnoutRisk;
  recommendations: WellbeingRecommendation[];
  positive_indicators: string[];
}

export interface WellbeingFactor {
  factor: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  details: string;
}

export interface BurnoutRisk {
  probability: number;
  contributing_factors: string[];
  timeline: 'immediate' | 'short_term' | 'medium_term';
}

export interface WellbeingRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  expected_impact: string;
  timeline: string;
}

export interface SurveyQuestion {
  id: string;
  category: string;
  question: string;
  type: 'scale_1_5' | 'scale_1_10' | 'multiple_choice' | 'open_text' | 'yes_no';
  options?: string[];
  is_required: boolean;
  follow_up_condition?: string | null;
}

export interface Survey {
  survey_title: string;
  survey_type: 'pulse' | 'climate' | 'engagement' | 'wellbeing' | 'exit';
  estimated_time_minutes: number;
  introduction: string;
  questions: SurveyQuestion[];
  closing_message: string;
}

export interface SurveyResults {
  summary: {
    participation_rate: number;
    overall_score: number;
    trend: 'improving' | 'stable' | 'declining';
    comparison_to_benchmark: 'above' | 'at' | 'below';
  };
  key_findings: Array<{
    finding: string;
    impact: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative';
    affected_percentage: number;
  }>;
  category_scores: Array<{
    category: string;
    score: number;
    previous_score: number;
    trend: 'up' | 'stable' | 'down';
  }>;
  risk_areas: Array<{
    area: string;
    severity: 'high' | 'medium' | 'low';
    departments_affected: string[];
    recommended_action: string;
  }>;
  action_plan: Array<{
    priority: number;
    action: string;
    owner: string;
    timeline: string;
    expected_impact: string;
  }>;
  quotes: string[];
}

export interface WellnessProgram {
  program_name: string;
  category: string;
  description: string;
  target_audience: string;
  expected_benefits: string[];
  estimated_cost_per_employee: number;
  implementation_complexity: 'low' | 'medium' | 'high';
  roi_estimate: string;
  priority: 'high' | 'medium' | 'low';
  providers: string[];
}

export interface ProgramRecommendations {
  recommended_programs: WellnessProgram[];
  budget_recommendation: {
    minimum: number;
    optimal: number;
    premium: number;
    per_employee_annual: number;
  };
  implementation_roadmap: Array<{
    phase: number;
    programs: string[];
    timeline: string;
    focus: string;
  }>;
}

export interface BurnoutAnalysis {
  burnout_analysis: {
    overall_risk: 'low' | 'moderate' | 'high' | 'critical';
    risk_score: number;
    stage: 'none' | 'honeymoon' | 'onset' | 'chronic' | 'habitual' | 'burnout';
    dimensions: {
      emotional_exhaustion: number;
      depersonalization: number;
      reduced_accomplishment: number;
    };
  };
  warning_signs: Array<{
    sign: string;
    severity: 'mild' | 'moderate' | 'severe';
    observed_frequency: 'occasional' | 'frequent' | 'constant';
    data_source: string;
  }>;
  protective_factors: string[];
  intervention_plan: {
    immediate_actions: string[];
    short_term_actions: string[];
    long_term_prevention: string[];
    manager_guidance: string;
  };
  recovery_timeline: string;
}

export interface WellnessPlan {
  plan_name: string;
  duration_weeks: number;
  goals: Array<{
    goal: string;
    metric: string;
    target: string;
  }>;
  weekly_activities: Array<{
    week: number;
    focus_area: string;
    activities: Array<{
      activity: string;
      frequency: string;
      duration_minutes: number;
      type: 'physical' | 'mental' | 'social' | 'professional';
    }>;
    check_in_questions: string[];
  }>;
  resources: Array<{
    resource: string;
    type: 'app' | 'service' | 'content' | 'professional';
    access: string;
  }>;
  milestones: Array<{
    week: number;
    milestone: string;
    reward: string;
  }>;
  support_network: {
    hr_contact: boolean;
    manager_involvement: string;
    peer_support: string;
    professional_support: string;
  };
}

// === HOOK ===
export function useHRWellbeing() {
  const [isLoading, setIsLoading] = useState(false);
  const [wellbeingScore, setWellbeingScore] = useState<WellbeingScore | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyResults, setSurveyResults] = useState<SurveyResults | null>(null);
  const [programRecommendations, setProgramRecommendations] = useState<ProgramRecommendations | null>(null);
  const [burnoutAnalysis, setBurnoutAnalysis] = useState<BurnoutAnalysis | null>(null);
  const [wellnessPlan, setWellnessPlan] = useState<WellnessPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === ANALYZE WELLBEING ===
  const analyzeWellbeing = useCallback(async (params: {
    employee_id?: string;
    department_id?: string;
    metrics?: Record<string, unknown>;
    company_context?: Record<string, unknown>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-wellbeing-agent',
        {
          body: {
            action: 'analyze_wellbeing',
            ...params
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setWellbeingScore(data.data);
        return data.data as WellbeingScore;
      }

      throw new Error('Invalid response from wellbeing agent');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error analyzing wellbeing';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === GENERATE SURVEY ===
  const generateSurvey = useCallback(async (params: {
    type: 'pulse' | 'climate' | 'engagement' | 'wellbeing' | 'exit';
    objective?: string;
    department_id?: string;
    company_context?: Record<string, unknown>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-wellbeing-agent',
        {
          body: {
            action: 'generate_survey',
            department_id: params.department_id,
            survey_data: {
              type: params.type,
              objective: params.objective
            },
            company_context: params.company_context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setSurvey(data.data);
        toast.success('Encuesta generada correctamente');
        return data.data as Survey;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generating survey';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALYZE SURVEY RESULTS ===
  const analyzeSurveyResults = useCallback(async (surveyData: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-wellbeing-agent',
        {
          body: {
            action: 'analyze_survey_results',
            survey_data: surveyData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setSurveyResults(data.data);
        return data.data as SurveyResults;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error analyzing results';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RECOMMEND PROGRAMS ===
  const recommendPrograms = useCallback(async (params: {
    metrics?: Record<string, unknown>;
    company_context?: Record<string, unknown>;
    budget?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-wellbeing-agent',
        {
          body: {
            action: 'recommend_programs',
            metrics: params.metrics,
            company_context: params.company_context,
            survey_data: { budget: params.budget }
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setProgramRecommendations(data.data);
        return data.data as ProgramRecommendations;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error recommending programs';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === PREDICT BURNOUT ===
  const predictBurnout = useCallback(async (params: {
    employee_id?: string;
    metrics?: Record<string, unknown>;
    history?: Record<string, unknown>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-wellbeing-agent',
        {
          body: {
            action: 'predict_burnout',
            employee_id: params.employee_id,
            metrics: params.metrics,
            survey_data: params.history
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setBurnoutAnalysis(data.data);
        return data.data as BurnoutAnalysis;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error predicting burnout';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CREATE WELLNESS PLAN ===
  const createWellnessPlan = useCallback(async (params: {
    employee_id: string;
    needs?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
    company_context?: Record<string, unknown>;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-wellbeing-agent',
        {
          body: {
            action: 'create_wellness_plan',
            employee_id: params.employee_id,
            metrics: params.needs,
            survey_data: params.preferences,
            company_context: params.company_context
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setWellnessPlan(data.data);
        toast.success('Plan de wellness creado');
        return data.data as WellnessPlan;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating wellness plan';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CLEAR STATE ===
  const clearState = useCallback(() => {
    setWellbeingScore(null);
    setSurvey(null);
    setSurveyResults(null);
    setProgramRecommendations(null);
    setBurnoutAnalysis(null);
    setWellnessPlan(null);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    wellbeingScore,
    survey,
    surveyResults,
    programRecommendations,
    burnoutAnalysis,
    wellnessPlan,
    // Actions
    analyzeWellbeing,
    generateSurvey,
    analyzeSurveyResults,
    recommendPrograms,
    predictBurnout,
    createWellnessPlan,
    clearState,
  };
}

export default useHRWellbeing;
