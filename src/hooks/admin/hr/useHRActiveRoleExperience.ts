/**
 * useHRActiveRoleExperience — P9.5 Role Experience Activation
 * Loads the current user's role experience profile and provides
 * module visibility, quick actions, KPI widgets, and personalization
 * to dynamically shape the ERP UI.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { 
  RoleExperienceProfile, 
  RoleDashboard, 
  UserExperience,
  QuickAction,
  KPIWidget 
} from './useHRRoleExperience';

export interface ActiveRoleExperience {
  /** The resolved role profile for the current user */
  profile: RoleExperienceProfile | null;
  /** User-specific experience overrides */
  userExperience: UserExperience | null;
  /** Dashboards for the active role */
  dashboards: RoleDashboard[];
  /** Whether a module is visible for this role */
  isModuleVisible: (moduleId: string) => boolean;
  /** Effective visible modules (profile + user overrides) */
  visibleModules: string[];
  /** Quick actions for the active role */
  quickActions: QuickAction[];
  /** KPI widgets for the active role */
  kpiWidgets: KPIWidget[];
  /** Pinned modules from user preferences */
  pinnedModules: string[];
  /** Whether role experience is active and loaded */
  isActive: boolean;
  /** Loading state */
  loading: boolean;
  /** Reload profile data */
  reload: () => Promise<void>;
  /** Track module usage for analytics */
  trackModuleUsage: (moduleId: string, action?: string) => void;
}

/**
 * Maps ERP user roles to role experience profile keys.
 * Falls back to 'employee' if no specific mapping exists.
 */
function mapAuthRoleToProfileKey(userRole: string | null, erpRoleName?: string): string {
  // Try ERP role name first (more specific)
  if (erpRoleName) {
    const normalized = erpRoleName.toLowerCase().trim();
    if (normalized.includes('ceo') || normalized.includes('director general')) return 'ceo';
    if (normalized.includes('cfo') || normalized.includes('director financiero')) return 'cfo';
    if (normalized.includes('director rrhh') || normalized.includes('hr director')) return 'hr_director';
    if (normalized.includes('manager') || normalized.includes('responsable')) return 'manager';
    if (normalized.includes('auditor')) return 'auditor';
    if (normalized.includes('admin')) return 'admin';
  }

  // Fall back to auth role
  switch (userRole) {
    case 'superadmin': return 'ceo';
    case 'director_comercial': return 'cfo';
    case 'responsable_comercial': return 'manager';
    case 'director_oficina': return 'manager';
    case 'admin': return 'admin';
    case 'auditor': return 'auditor';
    case 'gestor': return 'employee';
    default: return 'employee';
  }
}

export function useHRActiveRoleExperience(companyId: string | undefined): ActiveRoleExperience {
  const { user, userRole } = useAuth();
  const [profile, setProfile] = useState<RoleExperienceProfile | null>(null);
  const [userExperience, setUserExperience] = useState<UserExperience | null>(null);
  const [dashboards, setDashboards] = useState<RoleDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [erpRoleName, setErpRoleName] = useState<string | undefined>();

  // Resolve the user's ERP role name for better mapping
  useEffect(() => {
    if (!user?.id || !companyId) return;
    
    supabase
      .from('erp_user_companies')
      .select('role:erp_roles(name)')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role && typeof data.role === 'object' && 'name' in (data.role as any)) {
          setErpRoleName((data.role as any).name);
        }
      });
  }, [user?.id, companyId]);

  const roleKey = useMemo(
    () => mapAuthRoleToProfileKey(userRole, erpRoleName),
    [userRole, erpRoleName]
  );

  const loadProfile = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      // 1. Fetch matching role profile
      const { data: profileData } = await supabase
        .from('erp_hr_role_experience_profiles')
        .select('*')
        .eq('company_id', companyId)
        .eq('role_key', roleKey)
        .eq('is_active', true)
        .maybeSingle();

      if (profileData) {
        const parsed = {
          ...profileData,
          visible_modules: Array.isArray(profileData.visible_modules) ? profileData.visible_modules : [],
          quick_actions: Array.isArray(profileData.quick_actions) ? profileData.quick_actions : [],
          kpi_widgets: Array.isArray(profileData.kpi_widgets) ? profileData.kpi_widgets : [],
        } as unknown as RoleExperienceProfile;
        setProfile(parsed);

        // 2. Fetch dashboards for this profile
        const { data: dashData } = await supabase
          .from('erp_hr_role_dashboards')
          .select('*')
          .eq('company_id', companyId)
          .eq('role_profile_id', profileData.id)
          .order('sort_order');

        setDashboards((dashData || []).map((d: any) => ({
          ...d,
          widgets: Array.isArray(d.widgets) ? d.widgets : [],
        })));
      } else {
        setProfile(null);
        setDashboards([]);
      }

      // 3. Fetch user experience overrides
      if (user?.id) {
        const { data: uxData } = await supabase
          .from('erp_hr_user_experience')
          .select('*')
          .eq('company_id', companyId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (uxData) {
          setUserExperience({
            ...uxData,
            pinned_modules: Array.isArray(uxData.pinned_modules) ? uxData.pinned_modules : [],
            recent_modules: Array.isArray(uxData.recent_modules) ? uxData.recent_modules : [],
            completed_onboarding: Array.isArray(uxData.completed_onboarding) ? uxData.completed_onboarding : [],
          } as UserExperience);
        }
      }
    } catch (err) {
      console.error('[useHRActiveRoleExperience] loadProfile error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, roleKey, user?.id]);

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Derived values
  const visibleModules = useMemo(() => {
    if (!profile) return []; // No profile = show all (handled by consumer)
    return profile.visible_modules;
  }, [profile]);

  const pinnedModules = useMemo(
    () => userExperience?.pinned_modules || [],
    [userExperience]
  );

  const isModuleVisible = useCallback((moduleId: string): boolean => {
    // If no role profile exists, all modules are visible (no restriction)
    if (!profile) return true;
    // If visible_modules is empty array, also show all (unconfigured profile)
    if (visibleModules.length === 0) return true;
    return visibleModules.includes(moduleId);
  }, [profile, visibleModules]);

  const trackModuleUsage = useCallback((moduleId: string, action = 'view') => {
    if (!companyId || !user?.id || !profile) return;
    
    // Fire-and-forget analytics insert
    supabase
      .from('erp_hr_role_analytics')
      .upsert({
        company_id: companyId,
        role_key: roleKey,
        module_id: moduleId,
        action_type: action,
        usage_count: 1,
        avg_time_seconds: 0,
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
      } as any, { onConflict: 'company_id,role_key,module_id,action_type,period' })
      .then(() => {});

    // Update recent_modules in user experience
    if (userExperience?.id) {
      const recent = [moduleId, ...(userExperience.recent_modules || []).filter(m => m !== moduleId)].slice(0, 10);
      supabase
        .from('erp_hr_user_experience')
        .update({ recent_modules: recent, last_active_module: moduleId } as any)
        .eq('id', userExperience.id)
        .then(() => {});
    }
  }, [companyId, user?.id, profile, roleKey, userExperience]);

  return {
    profile,
    userExperience,
    dashboards,
    isModuleVisible,
    visibleModules,
    quickActions: profile?.quick_actions || [],
    kpiWidgets: profile?.kpi_widgets || [],
    pinnedModules,
    isActive: !!profile,
    loading,
    reload: loadProfile,
    trackModuleUsage,
  };
}

export default useHRActiveRoleExperience;
