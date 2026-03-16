/**
 * useRegulatoryFeedback - CRUD for erp_regulatory_feedback
 * Supports human validation with domain-based permissions
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  reviewer_domain: string | null;
  reviewer_role: string | null;
  created_at: string;
}

export interface FeedbackStats {
  total: number;
  accepted: number;
  rejected: number;
  pendingReview: number;
  acceptanceRate: number;
  byField: Record<string, { accepted: number; rejected: number; total: number }>;
  byDomain: Record<string, { accepted: number; rejected: number; total: number }>;
  weakFields: string[];
  weakDomains: string[];
}

// Domain permissions by role
const ROLE_DOMAIN_MAP: Record<string, string[]> = {
  superadmin: ['hr', 'legal', 'compliance', 'fiscal', 'general'],
  admin: ['hr', 'legal', 'compliance', 'fiscal', 'general'],
  responsable_comercial: ['compliance', 'fiscal', 'general'],
  director_comercial: ['compliance', 'fiscal', 'general'],
  director_oficina: ['general'],
  auditor: ['compliance', 'general'],
  user: ['general'],
};

// Field-to-domain mapping
const FIELD_DOMAIN_MAP: Record<string, string> = {
  summary: 'general',
  impact_level: 'general',
  impact_domains: 'general',
  impact_summary: 'general',
  classification: 'legal',
};

export function useRegulatoryFeedback() {
  const [feedbacks, setFeedbacks] = useState<RegulatoryFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0, accepted: 0, rejected: 0, pendingReview: 0, acceptanceRate: 0,
    byField: {}, byDomain: {}, weakFields: [], weakDomains: [],
  });
  const [loading, setLoading] = useState(false);
  const { userRole } = useAuth();

  const getAllowedDomains = useCallback((): string[] => {
    return ROLE_DOMAIN_MAP[userRole || 'user'] || ['general'];
  }, [userRole]);

  const canReviewField = useCallback((field: string, docDomains?: string[]): boolean => {
    const allowed = getAllowedDomains();
    // Admin/superadmin can review everything
    if (allowed.length >= 5) return true;
    // Check field's default domain
    const fieldDomain = FIELD_DOMAIN_MAP[field] || 'general';
    if (allowed.includes(fieldDomain)) return true;
    // Check if any doc domain matches user's allowed domains
    if (docDomains) {
      return docDomains.some(d => allowed.includes(d));
    }
    return false;
  }, [getAllowedDomains]);

  const getReviewerDomain = useCallback((field: string, docDomains?: string[]): string => {
    const allowed = getAllowedDomains();
    // If user has domain-specific access matching the document, use that
    if (docDomains) {
      const match = docDomains.find(d => allowed.includes(d));
      if (match) return match;
    }
    return FIELD_DOMAIN_MAP[field] || 'general';
  }, [getAllowedDomains]);

  const fetchFeedback = useCallback(async (documentId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('erp_regulatory_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (documentId) query = query.eq('document_id', documentId);

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []) as unknown as RegulatoryFeedback[];
      setFeedbacks(items);

      // Compute stats with domain breakdown
      const byField: Record<string, { accepted: number; rejected: number; total: number }> = {};
      const byDomain: Record<string, { accepted: number; rejected: number; total: number }> = {};
      let accepted = 0, rejected = 0;

      for (const fb of items) {
        if (fb.accepted === true) accepted++;
        if (fb.accepted === false) rejected++;

        const fieldKey = fb.field_reviewed || 'general';
        if (!byField[fieldKey]) byField[fieldKey] = { accepted: 0, rejected: 0, total: 0 };
        byField[fieldKey].total++;
        if (fb.accepted === true) byField[fieldKey].accepted++;
        if (fb.accepted === false) byField[fieldKey].rejected++;

        const domainKey = fb.reviewer_domain || 'general';
        if (!byDomain[domainKey]) byDomain[domainKey] = { accepted: 0, rejected: 0, total: 0 };
        byDomain[domainKey].total++;
        if (fb.accepted === true) byDomain[domainKey].accepted++;
        if (fb.accepted === false) byDomain[domainKey].rejected++;
      }

      // Detect weak fields (acceptance < 60% with at least 3 samples)
      const weakFields = Object.entries(byField)
        .filter(([, v]) => v.total >= 3 && (v.accepted / v.total) < 0.6)
        .map(([k]) => k);

      const weakDomains = Object.entries(byDomain)
        .filter(([, v]) => v.total >= 3 && (v.accepted / v.total) < 0.6)
        .map(([k]) => k);

      setStats({
        total: items.length,
        accepted,
        rejected,
        pendingReview: items.filter(f => f.accepted === null).length,
        acceptanceRate: items.length > 0 ? accepted / items.length : 0,
        byField,
        byDomain,
        weakFields,
        weakDomains,
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
    reviewer_domain?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión para enviar feedback');
        return null;
      }

      const domain = feedback.reviewer_domain || getReviewerDomain(feedback.field_reviewed);

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
          reviewer_domain: domain,
          reviewer_role: userRole || 'user',
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
  }, [fetchFeedback, getReviewerDomain, userRole]);

  return {
    feedbacks, stats, loading,
    fetchFeedback, submitFeedback,
    canReviewField, getAllowedDomains, getReviewerDomain,
  };
}
