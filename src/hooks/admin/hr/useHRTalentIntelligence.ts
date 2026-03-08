/**
 * useHRTalentIntelligence - Hook para Talent Intelligence Enterprise
 * Skill Graph, Career Paths, Talent Pools, Mentoring, Gap Analysis
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SkillNode {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
  category: string;
  skill_type: string;
  level: number;
  is_core: boolean;
  market_demand: string;
  obsolescence_risk: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CareerPath {
  id: string;
  company_id: string;
  name: string;
  from_role: string;
  to_role: string;
  path_type: string;
  department: string | null;
  avg_time_months: number | null;
  typical_salary_increase_percent: number | null;
  required_experience_years: number | null;
  requirements: unknown[];
  required_skills: unknown[];
  is_active: boolean;
  created_at: string;
}

export interface TalentPool {
  id: string;
  company_id: string;
  name: string;
  pool_type: string;
  description: string | null;
  member_count: number;
  review_frequency: string;
  last_reviewed_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MentoringMatch {
  id: string;
  company_id: string;
  mentor_name: string | null;
  mentee_name: string | null;
  program_name: string | null;
  focus_areas: string[];
  compatibility_score: number | null;
  status: string;
  sessions_completed: number;
  ai_match_reason: string | null;
  created_at: string;
}

export interface GigAssignment {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  department: string | null;
  assigned_employee_name: string | null;
  status: string;
  gig_type: string;
  estimated_hours: number | null;
  created_at: string;
}

export interface TalentAnalysis {
  bench_strength: { strong: number; adequate: number; weak: number; critical: number };
  readiness_map: Array<{ role: string; ready_now: number; ready_1yr: number; gap: string }>;
  critical_roles_at_risk: Array<{ role: string; risk: string; reason: string }>;
  flight_risk_employees: Array<{ name: string; role: string; risk_score: number; factors: string[] }>;
  skill_gaps: Array<{ skill: string; current_coverage: number; target_coverage: number; gap_severity: string; recommendation: string }>;
  mobility_pipeline: { internal_moves_potential: number; cross_dept_candidates: number; promotion_ready: number };
  high_potential_indicators: Array<{ name: string; dept: string; indicators: string[]; recommended_pool: string }>;
  ai_narrative: string;
}

export interface TalentStats {
  totalSkills: number;
  talentPools: TalentPool[];
  totalPaths: number;
  activeMentoring: number;
  openGigs: number;
}

export function useHRTalentIntelligence() {
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<SkillNode[]>([]);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [talentPools, setTalentPools] = useState<TalentPool[]>([]);
  const [mentoringMatches, setMentoringMatches] = useState<MentoringMatch[]>([]);
  const [gigs, setGigs] = useState<GigAssignment[]>([]);
  const [analysis, setAnalysis] = useState<TalentAnalysis | null>(null);
  const [stats, setStats] = useState<TalentStats | null>(null);

  const invoke = useCallback(async (action: string, params: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('erp-hr-talent-intelligence', {
      body: { action, params }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Error');
    return data.data;
  }, []);

  const fetchStats = useCallback(async (companyId: string) => {
    try {
      const data = await invoke('get_talent_stats', { company_id: companyId });
      setStats(data);
      return data;
    } catch (err) {
      console.error('[TalentIntelligence] fetchStats error:', err);
      return null;
    }
  }, [invoke]);

  const fetchSkills = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_skills', { company_id: companyId });
      setSkills(data || []);
      return data;
    } finally { setLoading(false); }
  }, [invoke]);

  const fetchCareerPaths = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_career_paths', { company_id: companyId });
      setCareerPaths(data || []);
      return data;
    } finally { setLoading(false); }
  }, [invoke]);

  const fetchTalentPools = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_talent_pools', { company_id: companyId });
      setTalentPools(data || []);
      return data;
    } finally { setLoading(false); }
  }, [invoke]);

  const fetchMentoring = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_mentoring', { company_id: companyId });
      setMentoringMatches(data || []);
      return data;
    } finally { setLoading(false); }
  }, [invoke]);

  const fetchGigs = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('list_gigs', { company_id: companyId });
      setGigs(data || []);
      return data;
    } finally { setLoading(false); }
  }, [invoke]);

  const runGapAnalysis = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('analyze_gap', { company_id: companyId });
      setAnalysis(data);
      toast.success('Análisis de talento completado');
      return data;
    } catch (err) {
      toast.error('Error en análisis de talento');
      return null;
    } finally { setLoading(false); }
  }, [invoke]);

  const runMentoringMatch = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await invoke('ai_mentoring_match', { company_id: companyId });
      toast.success('Matching de mentoring generado');
      return data;
    } catch (err) {
      toast.error('Error en matching');
      return null;
    } finally { setLoading(false); }
  }, [invoke]);

  const seedData = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      await invoke('seed_talent_data', { company_id: companyId });
      toast.success('Datos demo de talento creados');
    } catch (err) {
      toast.error('Error al crear datos demo');
    } finally { setLoading(false); }
  }, [invoke]);

  return {
    loading, skills, careerPaths, talentPools, mentoringMatches, gigs, analysis, stats,
    fetchStats, fetchSkills, fetchCareerPaths, fetchTalentPools, fetchMentoring, fetchGigs,
    runGapAnalysis, runMentoringMatch, seedData,
  };
}

export default useHRTalentIntelligence;
