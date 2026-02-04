/**
 * Hook para gestión de competencias y desarrollo del talento
 * Fase 2: Gestión del Talento Avanzada
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === INTERFACES ===

export interface SkillGap {
  skill_name: string;
  category: 'technical' | 'soft' | 'digital' | 'industry' | 'management';
  current_level: number;
  required_level: number;
  gap_severity: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
  estimated_time_months: number;
  recommended_actions: string[];
}

export interface SkillStrength {
  skill_name: string;
  category: string;
  current_level: number;
  exceeds_by: number;
  leverage_opportunities: string[];
}

export interface SkillsAnalysis {
  employee_summary: {
    total_skills: number;
    proficient_count: number;
    developing_count: number;
    gap_count: number;
    overall_readiness: number;
  };
  skill_gaps: SkillGap[];
  strengths: SkillStrength[];
  development_priority: 'high' | 'medium' | 'low';
  career_impact_score: number;
}

export interface DevelopmentAction {
  type: 'course' | 'mentoring' | 'project' | 'certification' | 'workshop';
  title: string;
  provider?: string;
  duration_hours: number;
  cost_estimate?: number;
  timeline: string;
  expected_outcome: string;
}

export interface DevelopmentRecommendation {
  skill_target: string;
  priority: number;
  actions: DevelopmentAction[];
  success_metrics: string[];
}

export interface DevelopmentPlan {
  development_plan: {
    title: string;
    duration_months: number;
    total_hours: number;
    investment_estimate: number;
  };
  recommendations: DevelopmentRecommendation[];
  quick_wins: Array<{ action: string; impact: string; effort: string }>;
  long_term_goals: Array<{ goal: string; timeline: string; dependencies: string[] }>;
}

export interface OpportunityMatch {
  opportunity_id: string;
  opportunity_type: 'project' | 'rotation' | 'mentoring' | 'committee';
  title: string;
  match_score: number;
  skills_utilized: string[];
  skills_developed: string[];
  time_commitment: string;
  duration: string;
  career_benefit: string;
  recommendation_reason: string;
}

export interface SuccessionCandidate {
  employee_id: string;
  employee_name: string;
  current_position: string;
  nine_box_position: { performance: number; potential: number };
  overall_readiness: number;
  readiness_level: 'ready_now' | 'ready_in_1_year' | 'ready_in_2_years' | 'development_needed';
  strengths_for_role: string[];
  gaps_for_role: string[];
  development_actions: Array<{ action: string; timeline: string }>;
  flight_risk: 'low' | 'medium' | 'high';
  recommendation_priority: number;
}

export interface CareerPath {
  path_name: string;
  path_type: 'technical' | 'management' | 'hybrid' | 'specialist';
  probability_of_success: number;
  alignment_with_interests: number;
  milestones: Array<{
    position: string;
    level: number;
    timeline: string;
    salary_increase: string;
    key_requirements: string[];
    skills_to_develop: string[];
  }>;
  end_goal: {
    position: string;
    timeline: string;
    salary_range: string;
  };
}

// === HOOK ===

export function useHRTalentSkills() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analysis results
  const [skillsAnalysis, setSkillsAnalysis] = useState<SkillsAnalysis | null>(null);
  const [developmentPlan, setDevelopmentPlan] = useState<DevelopmentPlan | null>(null);
  const [opportunityMatches, setOpportunityMatches] = useState<OpportunityMatch[]>([]);
  const [successionCandidates, setSuccessionCandidates] = useState<SuccessionCandidate[]>([]);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);

  // === ANALYZE SKILLS GAP ===
  const analyzeSkillsGap = useCallback(async (
    employeeId: string,
    skillsData?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-talent-skills-agent',
        {
          body: {
            action: 'analyze_skills_gap',
            employee_id: employeeId,
            skills_data: skillsData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setSkillsAnalysis(data.data);
        toast.success('Análisis de competencias completado');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en análisis de competencias';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === RECOMMEND DEVELOPMENT ===
  const recommendDevelopment = useCallback(async (
    employeeId: string,
    skillsData?: Record<string, unknown>,
    careerData?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-talent-skills-agent',
        {
          body: {
            action: 'recommend_development',
            employee_id: employeeId,
            skills_data: skillsData,
            career_data: careerData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        setDevelopmentPlan(data.data);
        toast.success('Plan de desarrollo generado');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando plan de desarrollo';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === MATCH OPPORTUNITY ===
  const matchOpportunity = useCallback(async (
    employeeId: string,
    skillsData?: Record<string, unknown>,
    opportunityData?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-talent-skills-agent',
        {
          body: {
            action: 'match_opportunity',
            employee_id: employeeId,
            skills_data: skillsData,
            opportunity_data: opportunityData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.recommended_opportunities) {
        setOpportunityMatches(data.data.recommended_opportunities);
        toast.success('Oportunidades matching encontradas');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en matching de oportunidades';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ANALYZE SUCCESSION ===
  const analyzeSuccession = useCallback(async (
    positionId: string,
    departmentId?: string,
    candidatesData?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-talent-skills-agent',
        {
          body: {
            action: 'analyze_succession',
            position_id: positionId,
            department_id: departmentId,
            skills_data: candidatesData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.succession_candidates) {
        setSuccessionCandidates(data.data.succession_candidates);
        toast.success('Análisis de sucesión completado');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en análisis de sucesión';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === EVALUATE READINESS ===
  const evaluateReadiness = useCallback(async (
    employeeId: string,
    targetPositionId: string,
    performanceData?: Record<string, unknown>,
    careerData?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-talent-skills-agent',
        {
          body: {
            action: 'evaluate_readiness',
            employee_id: employeeId,
            position_id: targetPositionId,
            skills_data: performanceData,
            career_data: careerData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        toast.success('Evaluación de readiness completada');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error evaluando readiness';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === SUGGEST CAREER PATH ===
  const suggestCareerPath = useCallback(async (
    employeeId: string,
    skillsData?: Record<string, unknown>,
    careerData?: Record<string, unknown>,
    organizationData?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'erp-hr-talent-skills-agent',
        {
          body: {
            action: 'suggest_career_path',
            employee_id: employeeId,
            skills_data: skillsData,
            career_data: careerData,
            opportunity_data: organizationData
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data?.career_paths) {
        setCareerPaths(data.data.career_paths);
        toast.success('Rutas de carrera generadas');
        return data.data;
      }

      throw new Error('Invalid response');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error sugiriendo rutas de carrera';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CLEAR RESULTS ===
  const clearResults = useCallback(() => {
    setSkillsAnalysis(null);
    setDevelopmentPlan(null);
    setOpportunityMatches([]);
    setSuccessionCandidates([]);
    setCareerPaths([]);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    skillsAnalysis,
    developmentPlan,
    opportunityMatches,
    successionCandidates,
    careerPaths,
    
    // Actions
    analyzeSkillsGap,
    recommendDevelopment,
    matchOpportunity,
    analyzeSuccession,
    evaluateReadiness,
    suggestCareerPath,
    clearResults
  };
}

export default useHRTalentSkills;
