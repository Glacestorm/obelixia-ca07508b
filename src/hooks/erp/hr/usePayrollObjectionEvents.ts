/**
 * usePayrollObjectionEvents — Lectura del timeline de eventos de una incidencia (S9.23).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ObjectionEventType =
  | 'created'
  | 'reopened'
  | 'closed'
  | 'in_review'
  | 'answered'
  | 'escalated'
  | 'note';

export interface ObjectionEvent {
  id: string;
  objection_id: string;
  event_type: ObjectionEventType | string;
  actor_id: string;
  actor_role: string | null;
  message: string | null;
  metadata: any;
  created_at: string;
}

export function usePayrollObjectionEvents(objectionId: string | null) {
  const [events, setEvents] = useState<ObjectionEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!objectionId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hr_payroll_objection_events')
        .select('*')
        .eq('objection_id', objectionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setEvents((data || []) as ObjectionEvent[]);
    } catch (err) {
      console.error('[usePayrollObjectionEvents] fetch error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [objectionId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refresh: fetchEvents };
}