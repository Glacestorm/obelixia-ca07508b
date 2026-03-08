import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnergyNotification {
  id: string;
  company_id: string;
  case_id: string | null;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useEnergyNotifications(companyId: string) {
  const [notifications, setNotifications] = useState<EnergyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const notifs = (data || []) as EnergyNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('[useEnergyNotifications] error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const markRead = useCallback(async (id: string) => {
    try {
      await supabase.from('energy_notifications')
        .update({ is_read: true } as any)
        .eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[useEnergyNotifications] markRead error:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await supabase.from('energy_notifications')
        .update({ is_read: true } as any)
        .eq('company_id', companyId)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[useEnergyNotifications] markAllRead error:', err);
    }
  }, [companyId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`energy-notifs-${companyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'energy_notifications',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const newNotif = payload.new as EnergyNotification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead };
}
