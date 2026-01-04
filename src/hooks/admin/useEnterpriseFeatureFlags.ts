/**
 * Enterprise Feature Flags Hook
 * Sistema avanzado de Feature Flags por tenant y licencia
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EnterpriseFeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_tenants: string[];
  target_license_tiers: string[];
  target_roles: string[];
  target_user_ids: string[];
  start_date: string | null;
  end_date: string | null;
  is_experiment: boolean;
  experiment_variants: any[];
  control_percentage: number;
  dependencies: string[];
  metadata: Record<string, any>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagTenantOverride {
  id: string;
  flag_id: string;
  tenant_id: string;
  is_enabled: boolean;
  custom_value: any;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FeatureFlagLicenseOverride {
  id: string;
  flag_id: string;
  license_id: string | null;
  license_tier: string | null;
  is_enabled: boolean;
  custom_value: any;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FeatureFlagAuditLog {
  id: string;
  flag_id: string | null;
  action: string;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export interface CreateFeatureFlagParams {
  flag_key: string;
  flag_name: string;
  description?: string;
  category?: string;
  is_enabled?: boolean;
  rollout_percentage?: number;
  target_license_tiers?: string[];
  target_roles?: string[];
  is_experiment?: boolean;
}

export function useEnterpriseFeatureFlags() {
  const [flags, setFlags] = useState<EnterpriseFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantOverrides, setTenantOverrides] = useState<FeatureFlagTenantOverride[]>([]);
  const [licenseOverrides, setLicenseOverrides] = useState<FeatureFlagLicenseOverride[]>([]);
  const [auditLogs, setAuditLogs] = useState<FeatureFlagAuditLog[]>([]);
  const { user } = useAuth();

  // Fetch all flags
  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enterprise_feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('flag_name', { ascending: true });

      if (error) throw error;
      const mapped: EnterpriseFeatureFlag[] = (data || []).map(f => ({
        id: f.id,
        flag_key: f.flag_key,
        flag_name: f.flag_name,
        description: f.description,
        category: f.category || 'general',
        is_enabled: f.is_enabled ?? false,
        rollout_percentage: f.rollout_percentage ?? 0,
        target_tenants: (f.target_tenants as string[]) || [],
        target_license_tiers: (f.target_license_tiers as string[]) || [],
        target_roles: (f.target_roles as string[]) || [],
        target_user_ids: (f.target_user_ids as string[]) || [],
        start_date: f.start_date,
        end_date: f.end_date,
        is_experiment: f.is_experiment ?? false,
        experiment_variants: Array.isArray(f.experiment_variants) ? f.experiment_variants : [],
        control_percentage: f.control_percentage ?? 50,
        dependencies: (f.dependencies as string[]) || [],
        metadata: (typeof f.metadata === 'object' && f.metadata !== null ? f.metadata : {}) as Record<string, any>,
        created_by: f.created_by,
        updated_by: f.updated_by,
        created_at: f.created_at,
        updated_at: f.updated_at
      }));
      setFlags(mapped);
    } catch (error) {
      console.error('[useEnterpriseFeatureFlags] fetchFlags error:', error);
      toast.error('Error al cargar Feature Flags');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create flag
  const createFlag = useCallback(async (params: CreateFeatureFlagParams) => {
    try {
      const { data, error } = await supabase
        .from('enterprise_feature_flags')
        .insert([{
          ...params,
          created_by: user?.id,
          target_tenants: [],
          target_license_tiers: params.target_license_tiers || [],
          target_roles: params.target_roles || [],
          target_user_ids: [],
          dependencies: [],
          experiment_variants: [],
          metadata: {}
        }])
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.from('feature_flag_audit_log').insert([{
        flag_id: data.id,
        action: 'created',
        new_value: data,
        changed_by: user?.id
      }]);

      toast.success('Feature Flag creado');
      fetchFlags();
      return data;
    } catch (error: any) {
      console.error('[useEnterpriseFeatureFlags] createFlag error:', error);
      toast.error(error.message || 'Error al crear Feature Flag');
      return null;
    }
  }, [user?.id, fetchFlags]);

  // Update flag
  const updateFlag = useCallback(async (
    flagId: string, 
    updates: Partial<EnterpriseFeatureFlag>,
    reason?: string
  ) => {
    try {
      const oldFlag = flags.find(f => f.id === flagId);
      
      const { data, error } = await supabase
        .from('enterprise_feature_flags')
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', flagId)
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.from('feature_flag_audit_log').insert([{
        flag_id: flagId,
        action: updates.is_enabled !== undefined 
          ? (updates.is_enabled ? 'enabled' : 'disabled')
          : 'updated',
        old_value: oldFlag ? JSON.parse(JSON.stringify(oldFlag)) : null,
        new_value: data ? JSON.parse(JSON.stringify(data)) : null,
        changed_by: user?.id,
        reason
      }]);

      toast.success('Feature Flag actualizado');
      fetchFlags();
      return data;
    } catch (error: any) {
      console.error('[useEnterpriseFeatureFlags] updateFlag error:', error);
      toast.error(error.message || 'Error al actualizar');
      return null;
    }
  }, [user?.id, flags, fetchFlags]);

  // Delete flag
  const deleteFlag = useCallback(async (flagId: string, reason?: string) => {
    try {
      const oldFlag = flags.find(f => f.id === flagId);

      // Log before delete
      await supabase.from('feature_flag_audit_log').insert([{
        flag_id: null, // Will be null after delete
        action: 'deleted',
        old_value: oldFlag ? JSON.parse(JSON.stringify(oldFlag)) : null,
        changed_by: user?.id,
        reason
      }]);

      const { error } = await supabase
        .from('enterprise_feature_flags')
        .delete()
        .eq('id', flagId);

      if (error) throw error;

      toast.success('Feature Flag eliminado');
      fetchFlags();
      return true;
    } catch (error) {
      console.error('[useEnterpriseFeatureFlags] deleteFlag error:', error);
      toast.error('Error al eliminar');
      return false;
    }
  }, [user?.id, flags, fetchFlags]);

  // Toggle flag
  const toggleFlag = useCallback(async (flagId: string) => {
    const flag = flags.find(f => f.id === flagId);
    if (!flag) return false;
    
    return updateFlag(flagId, { is_enabled: !flag.is_enabled });
  }, [flags, updateFlag]);

  // Fetch tenant overrides
  const fetchTenantOverrides = useCallback(async (flagId?: string) => {
    try {
      let query = supabase.from('feature_flag_tenant_overrides').select('*');
      if (flagId) query = query.eq('flag_id', flagId);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setTenantOverrides(data || []);
    } catch (error) {
      console.error('[useEnterpriseFeatureFlags] fetchTenantOverrides error:', error);
    }
  }, []);

  // Create tenant override
  const createTenantOverride = useCallback(async (
    flagId: string,
    tenantId: string,
    isEnabled: boolean,
    expiresAt?: string
  ) => {
    try {
      const { error } = await supabase
        .from('feature_flag_tenant_overrides')
        .insert([{
          flag_id: flagId,
          tenant_id: tenantId,
          is_enabled: isEnabled,
          expires_at: expiresAt,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast.success('Override de tenant creado');
      fetchTenantOverrides(flagId);
      return true;
    } catch (error: any) {
      console.error('[useEnterpriseFeatureFlags] createTenantOverride error:', error);
      toast.error(error.message || 'Error al crear override');
      return false;
    }
  }, [user?.id, fetchTenantOverrides]);

  // Delete tenant override
  const deleteTenantOverride = useCallback(async (overrideId: string) => {
    try {
      const { error } = await supabase
        .from('feature_flag_tenant_overrides')
        .delete()
        .eq('id', overrideId);

      if (error) throw error;
      toast.success('Override eliminado');
      fetchTenantOverrides();
      return true;
    } catch (error) {
      console.error('[useEnterpriseFeatureFlags] deleteTenantOverride error:', error);
      toast.error('Error al eliminar override');
      return false;
    }
  }, [fetchTenantOverrides]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (flagId?: string, limit = 50) => {
    try {
      let query = supabase
        .from('feature_flag_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);
      
      if (flagId) query = query.eq('flag_id', flagId);
      
      const { data, error } = await query;
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('[useEnterpriseFeatureFlags] fetchAuditLogs error:', error);
    }
  }, []);

  // Evaluate flag for context
  const evaluateFlag = useCallback((
    flagKey: string,
    context?: {
      tenantId?: string;
      licenseTier?: string;
      userId?: string;
      userRole?: string;
    }
  ): boolean => {
    const flag = flags.find(f => f.flag_key === flagKey);
    if (!flag) return false;
    if (!flag.is_enabled) return false;

    // Check date range
    const now = new Date();
    if (flag.start_date && new Date(flag.start_date) > now) return false;
    if (flag.end_date && new Date(flag.end_date) < now) return false;

    // If no targeting, use global enabled state
    if (!context) return flag.is_enabled;

    // Check tenant targeting
    if (context.tenantId && flag.target_tenants.length > 0) {
      if (!flag.target_tenants.includes(context.tenantId)) return false;
    }

    // Check license tier targeting
    if (context.licenseTier && flag.target_license_tiers.length > 0) {
      if (!flag.target_license_tiers.includes(context.licenseTier)) return false;
    }

    // Check role targeting
    if (context.userRole && flag.target_roles.length > 0) {
      if (!flag.target_roles.includes(context.userRole)) return false;
    }

    // Check user targeting
    if (context.userId && flag.target_user_ids.length > 0) {
      if (!flag.target_user_ids.includes(context.userId)) return false;
    }

    // Rollout percentage check
    if (flag.rollout_percentage < 100 && context.userId) {
      const hash = context.userId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const bucket = Math.abs(hash % 100);
      if (bucket >= flag.rollout_percentage) return false;
    }

    return true;
  }, [flags]);

  // Get flags by category
  const getFlagsByCategory = useCallback(() => {
    const categories: Record<string, EnterpriseFeatureFlag[]> = {};
    flags.forEach(flag => {
      const cat = flag.category || 'general';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(flag);
    });
    return categories;
  }, [flags]);

  // Get statistics
  const getStatistics = useCallback(() => {
    const total = flags.length;
    const enabled = flags.filter(f => f.is_enabled).length;
    const experiments = flags.filter(f => f.is_experiment).length;
    const categories = new Set(flags.map(f => f.category)).size;
    const withTenantTargeting = flags.filter(f => f.target_tenants.length > 0).length;
    const withLicenseTargeting = flags.filter(f => f.target_license_tiers.length > 0).length;

    return {
      total,
      enabled,
      disabled: total - enabled,
      experiments,
      categories,
      withTenantTargeting,
      withLicenseTargeting,
      enabledPercentage: total > 0 ? Math.round((enabled / total) * 100) : 0
    };
  }, [flags]);

  // Initial fetch
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    // State
    flags,
    loading,
    tenantOverrides,
    licenseOverrides,
    auditLogs,
    
    // Actions
    fetchFlags,
    createFlag,
    updateFlag,
    deleteFlag,
    toggleFlag,
    
    // Overrides
    fetchTenantOverrides,
    createTenantOverride,
    deleteTenantOverride,
    
    // Audit
    fetchAuditLogs,
    
    // Evaluation
    evaluateFlag,
    
    // Helpers
    getFlagsByCategory,
    getStatistics,
  };
}

export default useEnterpriseFeatureFlags;
