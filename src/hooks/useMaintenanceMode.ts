import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useMaintenanceMode() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, isSuperAdmin } = useAuth();

  const canBypass = isAdmin || isSuperAdmin;

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('site_maintenance_settings')
        .select('setting_value')
        .eq('setting_key', 'maintenance_mode')
        .single();

      if (error) throw error;
      setIsMaintenanceMode(data?.setting_value?.enabled === true);
    } catch (err) {
      console.error('[useMaintenanceMode] fetch error:', err);
      setIsMaintenanceMode(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    const next = !isMaintenanceMode;
    try {
      const { error } = await (supabase as any)
        .from('site_maintenance_settings')
        .update({
          setting_value: { enabled: next },
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('setting_key', 'maintenance_mode');

      if (error) throw error;
      setIsMaintenanceMode(next);
      return true;
    } catch (err) {
      console.error('[useMaintenanceMode] toggle error:', err);
      return false;
    }
  }, [isMaintenanceMode, user?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { isMaintenanceMode, loading, toggle, canBypass, refresh: fetchStatus };
}
