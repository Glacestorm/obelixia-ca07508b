import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnergyTracking {
  id: string;
  case_id: string;
  proposal_sent_date: string | null;
  proposal_accepted_date: string | null;
  supplier_change_date: string | null;
  first_invoice_review_date: string | null;
  observed_real_savings: number | null;
  tracking_notes: string | null;
  closure_status: string;
  timeline_events: any[];
  created_at: string;
  updated_at: string;
}

export function useEnergyTracking(caseId: string | null) {
  const [tracking, setTracking] = useState<EnergyTracking | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_tracking')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      if (error) throw error;
      setTracking(data as EnergyTracking | null);
    } catch (err) {
      console.error('[useEnergyTracking] error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const upsertTracking = useCallback(async (values: Partial<EnergyTracking>) => {
    if (!caseId) return null;
    try {
      if (tracking?.id) {
        const { data, error } = await supabase
          .from('energy_tracking')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', tracking.id)
          .select()
          .single();
        if (error) throw error;
        setTracking(data as EnergyTracking);
        toast.success('Seguimiento actualizado');
        return data;
      } else {
        const { data, error } = await supabase
          .from('energy_tracking')
          .insert([{ ...values, case_id: caseId }] as any)
          .select()
          .single();
        if (error) throw error;
        setTracking(data as EnergyTracking);
        toast.success('Seguimiento creado');
        return data;
      }
    } catch (err) {
      console.error('[useEnergyTracking] upsert error:', err);
      toast.error('Error al guardar seguimiento');
      return null;
    }
  }, [caseId, tracking]);

  const addTimelineEvent = useCallback(async (event: { action: string; date: string; notes?: string }) => {
    const currentEvents = tracking?.timeline_events || [];
    const newEvents = [...currentEvents, { ...event, timestamp: new Date().toISOString() }];
    return upsertTracking({ timeline_events: newEvents });
  }, [tracking, upsertTracking]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  return { tracking, loading, fetchTracking, upsertTracking, addTimelineEvent };
}
