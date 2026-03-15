/**
 * useRegulatoryFeedback - CRUD for erp_regulatory_feedback
 * Supports human validation of AI-generated regulatory analysis
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RegulatoryFeedback {
  id: string;
  document_id: string;
  user_id: string;
  feedback_type: string;
  field_reviewed: string | null;
  original_value: string | null;
  corrected_value: string | null;
  accepted: boolean | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

export interface FeedbackStats {
  total: number;
  accepted: number;
  rejected: number;
  pendingReview: number;
  acceptanceRate: number;
  byField: Record<string, { accepted: number; rejected: number; total: number }>;
}

export function useRegulatoryFeedback() {
  const [feedbacks, setFeedbacks] = useState<RegulatoryFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0, accepted: 0, rejected: 0, pendingReview: 0, acceptanceRate: 0, byField: {},
  });
  const [loading, setLoading] = useState(false);

  const fetchFeedback = useCallback(async (documentId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('erp_regulatory_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (documentId) query = query.eq('document_id', documentId);

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []) as unknown as RegulatoryFeedback[];
      setFeedbacks(items);

      // Compute stats
      const byField: Record<string, { accepted: number; rejected: number; total: number }> = {};
      let accepted = 0, rejected = 0;
      for (const fb of items) {
        if (fb.accepted === true) accepted++;
        if (fb.accepted === false) rejected++;
        const key = fb.field_reviewed || 'general';
        if (!byField[key]) byField[key] = { accepted: 0, rejected: 0, total: 0 };
        byField[key].total++;
        if (fb.accepted === true) byField[key].accepted++;
        if (fb.accepted === false) byField[key].rejected++;
      }

      setStats({
        total: items.length,
        accepted,
        rejected,
        pendingReview: items.filter(f => f.accepted === null).length,
        acceptanceRate: items.length > 0 ? accepted / items.length : 0,
        byField,
      });
    } catch (err) {
      console.error('[useRegulatoryFeedback] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitFeedback = useCallback(async (feedback: {
    document_id: string;
    feedback_type: string;
    field_reviewed: string;
    original_value?: string;
    corrected_value?: string;
    accepted: boolean;
    rating?: number;
    comment?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión para enviar feedback');
        return null;
      }

      const { data, error } = await supabase
        .from('erp_regulatory_feedback')
        .insert({
          document_id: feedback.document_id,
          user_id: user.id,
          feedback_type: feedback.feedback_type,
          field_reviewed: feedback.field_reviewed,
          original_value: feedback.original_value || null,
          corrected_value: feedback.corrected_value || null,
          accepted: feedback.accepted,
          rating: feedback.rating || null,
          comment: feedback.comment || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Feedback registrado');
      await fetchFeedback();
      return data;
    } catch (err) {
      console.error('[useRegulatoryFeedback] submit error:', err);
      toast.error('Error al enviar feedback');
      return null;
    }
  }, [fetchFeedback]);

  return { feedbacks, stats, loading, fetchFeedback, submitFeedback };
}
