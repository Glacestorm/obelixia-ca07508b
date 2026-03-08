/**
 * useHRRoleExperience - Hook for Role-Based Experience Ecosystem (P8)
 * Personalized UX per organizational role
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RoleExperienceProfile {
  id: string;
  company_id: string;
  role_key: string;
  role_label: string;
  description: string | null;
  dashboard_layout: Record<string, unknown>;
  visible_modules: string[];
  quick_actions: QuickAction[];
  kpi_widgets: KPIWidget[];
  notification_preferences: Record<string, unknown>;
  theme_overrides: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  module: string;
  action?: string;
  color?: string;
}

export interface KPIWidget {
  id: string;
  label: string;
  metric_key: string;
  format: 'number' | 'percentage' | 'currency' | 'trend';
  color?: string;
  target?: number;
}

export interface RoleDashboard {
  id: string;
  company_id: string;
  role_profile_id: string;
  dashboard_name: string;
  dashboard_type: string;
  layout_config: Record<string, unknown>;
  widgets: DashboardWidget[];
  filters_config: Record<string, unknown>;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'calendar' | 'alerts' | 'actions';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

export interface RoleOnboardingStep {
  id: string;
  step_order: number;
  step_title: string;
  step_description: string | null;
  step_type: string;
  target_module: string | null;
  target_action: string | null;
  is_required: boolean;
  estimated_minutes: number;
}

export interface UserExperience {
  id: string;
  company_id: string;
  user_id: string;
  role_profile_id: string | null;
  custom_layout: Record<string, unknown>;
  pinned_modules: string[];
  recent_modules: string[];
  completed_onboarding: string[];
  preferences: Record<string, unknown>;
  last_active_module: string | null;
}

export interface RoleAnalytics {
  id: string;
  role_key: string;
  module_id: string;
  action_type: string;
  usage_count: number;
  avg_time_seconds: number;
  satisfaction_score: number | null;
  period: string;
}

export interface RoleExperienceStats {
  total_profiles: number;
  active_profiles: number;
  total_dashboards: number;
  total_users_configured: number;
  avg_modules_per_role: number;
  most_used_module: string;
  onboarding_completion_rate: number;
}

export interface RoleExperienceAnalysis {
  ux_maturity: string;
  role_coverage: number;
  personalization_depth: string;
  recommendations: Array<{ area: string; suggestion: string; impact: string }>;
  adoption_insights: Array<{ role: string; adoption_rate: number; top_modules: string[] }>;
  executive_summary: string;
}

export function useHRRoleExperience() {
  const [profiles, setProfiles] = useState<RoleExperienceProfile[]>([]);
  const [dashboards, setDashboards] = useState<RoleDashboard[]>([]);
  const [onboardingSteps, setOnboardingSteps] = useState<RoleOnboardingStep[]>([]);
  const [userExperience, setUserExperience] = useState<UserExperience | null>(null);
  const [analytics, setAnalytics] = useState<RoleAnalytics[]>([]);
  const [stats, setStats] = useState<RoleExperienceStats | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<RoleExperienceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const { user } = useAuth();

  const fetchProfiles = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_role_experience_profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('role_key');
      if (error) throw error;
      const parsed = (data || []).map((d: any) => ({
        ...d,
        visible_modules: Array.isArray(d.visible_modules) ? d.visible_modules : [],
        quick_actions: Array.isArray(d.quick_actions) ? d.quick_actions : [],
        kpi_widgets: Array.isArray(d.kpi_widgets) ? d.kpi_widgets : [],
      }));
      setProfiles(parsed);

      // Compute stats
      const activeCount = parsed.filter((p: any) => p.is_active).length;
      const avgModules = parsed.length > 0
        ? parsed.reduce((sum: number, p: any) => sum + (p.visible_modules?.length || 0), 0) / parsed.length
        : 0;

      setStats({
        total_profiles: parsed.length,
        active_profiles: activeCount,
        total_dashboards: 0,
        total_users_configured: 0,
        avg_modules_per_role: Math.round(avgModules * 10) / 10,
        most_used_module: 'dashboard',
        onboarding_completion_rate: 0,
      });
    } catch (err) {
      console.error('[useHRRoleExperience] fetchProfiles error:', err);
      toast.error('Error al cargar perfiles de rol');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboards = useCallback(async (companyId: string, profileId?: string) => {
    try {
      let query = supabase.from('erp_hr_role_dashboards').select('*').eq('company_id', companyId);
      if (profileId) query = query.eq('role_profile_id', profileId);
      const { data, error } = await query.order('sort_order');
      if (error) throw error;
      setDashboards((data || []).map((d: any) => ({
        ...d,
        widgets: Array.isArray(d.widgets) ? d.widgets : [],
      })));
    } catch (err) {
      console.error('[useHRRoleExperience] fetchDashboards error:', err);
    }
  }, []);

  const fetchOnboarding = useCallback(async (companyId: string, profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_role_onboarding')
        .select('*')
        .eq('company_id', companyId)
        .eq('role_profile_id', profileId)
        .order('step_order');
      if (error) throw error;
      setOnboardingSteps(data || []);
    } catch (err) {
      console.error('[useHRRoleExperience] fetchOnboarding error:', err);
    }
  }, []);

  const fetchUserExperience = useCallback(async (companyId: string) => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('erp_hr_user_experience')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setUserExperience({
          ...data,
          pinned_modules: Array.isArray(data.pinned_modules) ? data.pinned_modules : [],
          recent_modules: Array.isArray(data.recent_modules) ? data.recent_modules : [],
          completed_onboarding: Array.isArray(data.completed_onboarding) ? data.completed_onboarding : [],
        } as UserExperience);
      }
    } catch (err) {
      console.error('[useHRRoleExperience] fetchUserExperience error:', err);
    }
  }, [user?.id]);

  const fetchAnalytics = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_role_analytics')
        .select('*')
        .eq('company_id', companyId)
        .order('usage_count', { ascending: false })
        .limit(50);
      if (error) throw error;
      setAnalytics(data || []);
    } catch (err) {
      console.error('[useHRRoleExperience] fetchAnalytics error:', err);
    }
  }, []);

  const runAIAnalysis = useCallback(async (companyId: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-premium-intelligence', {
        body: {
          action: 'ai_role_experience',
          company_id: companyId,
          params: {
            profiles_count: profiles.length,
            active_count: profiles.filter(p => p.is_active).length,
            roles: profiles.map(p => ({ key: p.role_key, label: p.role_label, modules: p.visible_modules?.length || 0, actions: p.quick_actions?.length || 0 })),
            analytics_summary: analytics.slice(0, 10),
          },
        },
      });
      if (error) throw error;
      if (data?.success && data?.data) {
        setAiAnalysis(data.data);
        toast.success('Análisis IA completado');
      }
    } catch (err) {
      console.error('[useHRRoleExperience] AI analysis error:', err);
      toast.error('Error en análisis IA');
    } finally {
      setAiLoading(false);
    }
  }, [profiles, analytics]);

  // Realtime for user experience
  useEffect(() => {
    const channel = supabase
      .channel('erp_hr_user_experience_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'erp_hr_user_experience' }, (payload) => {
        if (payload.eventType === 'UPDATE' && user?.id) {
          const updated = payload.new as any;
          if (updated.user_id === user.id) {
            setUserExperience({
              ...updated,
              pinned_modules: Array.isArray(updated.pinned_modules) ? updated.pinned_modules : [],
              recent_modules: Array.isArray(updated.recent_modules) ? updated.recent_modules : [],
              completed_onboarding: Array.isArray(updated.completed_onboarding) ? updated.completed_onboarding : [],
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return {
    profiles, dashboards, onboardingSteps, userExperience, analytics,
    stats, aiAnalysis, loading, aiLoading,
    fetchProfiles, fetchDashboards, fetchOnboarding, fetchUserExperience, fetchAnalytics,
    runAIAnalysis,
  };
}

export default useHRRoleExperience;
