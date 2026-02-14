/**
 * useGaliaPilotFeedback - Hook para feedback de usuarios piloto
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PilotFeedback {
  id: string;
  user_id: string;
  rating: number;
  category: string;
  area: string;
  comment: string | null;
  nps_score: number | null;
  status: string;
  ai_summary: string | null;
  created_at: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  avgRating: number;
  avgNPS: number;
  byCategory: Record<string, number>;
  byArea: Record<string, number>;
  byStatus: Record<string, number>;
  satisfactionRate: number;
}

export function useGaliaPilotFeedback() {
  const [feedback, setFeedback] = useState<PilotFeedback[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('galia_pilot_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback((data || []) as PilotFeedback[]);
    } catch (err) {
      console.error('[useGaliaPilotFeedback] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitFeedback = useCallback(async (params: {
    rating: number;
    category: string;
    area: string;
    comment?: string;
    nps_score?: number;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Inicia sesión'); return false; }

      const { error } = await supabase
        .from('galia_pilot_feedback')
        .insert({
          user_id: user.id,
          rating: params.rating,
          category: params.category,
          area: params.area,
          comment: params.comment || null,
          nps_score: params.nps_score ?? null,
        } as any);

      if (error) throw error;
      toast.success('¡Gracias por tu feedback!');
      await fetchFeedback();
      return true;
    } catch (err) {
      console.error('[useGaliaPilotFeedback] submit error:', err);
      toast.error('Error al enviar feedback');
      return false;
    }
  }, [fetchFeedback]);

  const stats: FeedbackStats = {
    totalFeedback: feedback.length,
    avgRating: feedback.length > 0 ? Math.round(feedback.reduce((s, f) => s + f.rating, 0) / feedback.length * 10) / 10 : 0,
    avgNPS: (() => {
      const npsItems = feedback.filter(f => f.nps_score != null);
      return npsItems.length > 0 ? Math.round(npsItems.reduce((s, f) => s + (f.nps_score || 0), 0) / npsItems.length * 10) / 10 : 0;
    })(),
    byCategory: feedback.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {} as Record<string, number>),
    byArea: feedback.reduce((acc, f) => { acc[f.area] = (acc[f.area] || 0) + 1; return acc; }, {} as Record<string, number>),
    byStatus: feedback.reduce((acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {} as Record<string, number>),
    satisfactionRate: feedback.length > 0 ? Math.round(feedback.filter(f => f.rating >= 4).length / feedback.length * 100) : 0,
  };

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  return { feedback, loading, stats, fetchFeedback, submitFeedback };
}

export default useGaliaPilotFeedback;
