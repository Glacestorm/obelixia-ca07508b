/**
 * useObelixIALearning - Hook for cross-domain feedback, validated cases, and learning metrics
 * Phase 2D: Enriched supervised learning for ObelixIA-Supervisor
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CrossDomainFeedback {
  id: string;
  invocation_id: string;
  user_id: string;
  case_type: string;
  escalation_correct: boolean | null;
  escalation_comment: string | null;
  conflict_resolution_correct: boolean | null;
  severity_correct: boolean | null;
  corrected_severity: string | null;
  actions_useful: boolean | null;
  actions_rating: number | null;
  corrected_actions: unknown | null;
  deadline_reasonable: boolean | null;
  corrected_deadline: string | null;
  recommendation_useful: boolean | null;
  recommendation_rating: number | null;
  hr_impact_correct: boolean | null;
  legal_impact_correct: boolean | null;
  domain_assignment_correct: boolean | null;
  human_review_decision_correct: boolean | null;
  overall_rating: number | null;
  comment: string | null;
  reviewer_role: string | null;
  reviewer_domain: string | null;
  created_at: string;
}

export interface ValidatedCase {
  id: string;
  invocation_id: string | null;
  document_id: string | null;
  case_type: string;
  origin: string;
  impact_domains: string[];
  validated_severity: string;
  validated_has_conflict: boolean;
  validated_recommendation: string | null;
  validated_priority_actions: unknown | null;
  validated_deadline: string | null;
  validated_human_review_needed: boolean;
  escalation_was_correct: boolean;
  quality_score: number;
  feedback_count: number;
  input_summary: string | null;
  document_type: string | null;
  legal_area: string | null;
  source_code: string | null;
  validated_by: string | null;
  validator_role: string | null;
  created_at: string;
}

export interface LearningStats {
  totalFeedback: number;
  escalationAccuracy: number;
  conflictResolutionAccuracy: number;
  severityAccuracy: number;
  actionsUsefulness: number;
  deadlineReasonableness: number;
  recommendationUsefulness: number;
  hrImpactAccuracy: number;
  legalImpactAccuracy: number;
  humanReviewAccuracy: number;
  avgOverallRating: number;
  validatedCases: number;
  avgQualityScore: number;
  // By case type
  byType: Record<string, { count: number; avgRating: number }>;
  // Weak areas
  weakAreas: string[];
}

function computeAccuracy(items: (boolean | null)[]): number {
  const valid = items.filter(v => v !== null) as boolean[];
  if (valid.length < 2) return -1; // Not enough data
  return Math.round((valid.filter(v => v).length / valid.length) * 100);
}

export function useObelixIALearning() {
  const [feedbacks, setFeedbacks] = useState<CrossDomainFeedback[]>([]);
  const [validatedCases, setValidatedCases] = useState<ValidatedCase[]>([]);
  const [loading, setLoading] = useState(false);
  const { userRole } = useAuth();

  const fetchFeedbacks = useCallback(async (limit = 200) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_cross_domain_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setFeedbacks((data || []) as unknown as CrossDomainFeedback[]);
    } catch (err) {
      console.error('[useObelixIALearning] fetchFeedbacks error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchValidatedCases = useCallback(async (limit = 100) => {
    try {
      const { data, error } = await supabase
        .from('erp_validated_cases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      setValidatedCases((data || []) as unknown as ValidatedCase[]);
    } catch (err) {
      console.error('[useObelixIALearning] fetchValidatedCases error:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFeedbacks(), fetchValidatedCases()]);
    setLoading(false);
  }, [fetchFeedbacks, fetchValidatedCases]);

  const submitFeedback = useCallback(async (feedback: Omit<CrossDomainFeedback, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Debes iniciar sesión'); return null; }

      const { data, error } = await supabase
        .from('erp_cross_domain_feedback')
        .insert({ ...feedback, user_id: user.id, reviewer_role: userRole || 'user' } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Feedback cross-domain registrado');
      await fetchFeedbacks();
      return data;
    } catch (err) {
      console.error('[useObelixIALearning] submitFeedback error:', err);
      toast.error('Error al enviar feedback');
      return null;
    }
  }, [fetchFeedbacks, userRole]);

  const promoteToValidatedCase = useCallback(async (caseData: Omit<ValidatedCase, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Debes iniciar sesión'); return null; }

      const { data, error } = await supabase
        .from('erp_validated_cases')
        .insert({ ...caseData, validated_by: user.id, validator_role: userRole || 'admin' } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Caso validado y registrado en memoria operativa');
      await fetchValidatedCases();
      return data;
    } catch (err) {
      console.error('[useObelixIALearning] promoteToValidatedCase error:', err);
      toast.error('Error al validar caso');
      return null;
    }
  }, [fetchValidatedCases, userRole]);

  // === COMPUTED LEARNING STATS ===
  const stats: LearningStats = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) {
      return {
        totalFeedback: 0, escalationAccuracy: -1, conflictResolutionAccuracy: -1,
        severityAccuracy: -1, actionsUsefulness: -1, deadlineReasonableness: -1,
        recommendationUsefulness: -1, hrImpactAccuracy: -1, legalImpactAccuracy: -1,
        humanReviewAccuracy: -1, avgOverallRating: 0, validatedCases: validatedCases.length,
        avgQualityScore: 0, byType: {}, weakAreas: [],
      };
    }

    const escalation = computeAccuracy(feedbacks.map(f => f.escalation_correct));
    const conflict = computeAccuracy(feedbacks.map(f => f.conflict_resolution_correct));
    const severity = computeAccuracy(feedbacks.map(f => f.severity_correct));
    const actions = computeAccuracy(feedbacks.map(f => f.actions_useful));
    const deadline = computeAccuracy(feedbacks.map(f => f.deadline_reasonable));
    const recommendation = computeAccuracy(feedbacks.map(f => f.recommendation_useful));
    const hrImpact = computeAccuracy(feedbacks.map(f => f.hr_impact_correct));
    const legalImpact = computeAccuracy(feedbacks.map(f => f.legal_impact_correct));
    const humanReview = computeAccuracy(feedbacks.map(f => f.human_review_decision_correct));

    const ratings = feedbacks.filter(f => f.overall_rating !== null).map(f => f.overall_rating!);
    const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;

    const byType: Record<string, { count: number; avgRating: number }> = {};
    for (const fb of feedbacks) {
      const t = fb.case_type || 'unknown';
      if (!byType[t]) byType[t] = { count: 0, avgRating: 0 };
      byType[t].count++;
      if (fb.overall_rating) {
        byType[t].avgRating = (byType[t].avgRating * (byType[t].count - 1) + fb.overall_rating) / byType[t].count;
      }
    }

    // Detect weak areas (< 60% accuracy with ≥ 3 samples)
    const weakAreas: string[] = [];
    const checks: [string, number][] = [
      ['escalation', escalation], ['conflict_resolution', conflict],
      ['severity', severity], ['actions', actions], ['deadline', deadline],
      ['recommendation', recommendation], ['hr_impact', hrImpact],
      ['legal_impact', legalImpact], ['human_review', humanReview],
    ];
    for (const [name, val] of checks) {
      if (val >= 0 && val < 60) weakAreas.push(name);
    }

    const vcScores = validatedCases.filter(c => c.quality_score > 0);
    const avgQuality = vcScores.length > 0
      ? Math.round((vcScores.reduce((s, c) => s + Number(c.quality_score), 0) / vcScores.length) * 100) / 100
      : 0;

    return {
      totalFeedback: total,
      escalationAccuracy: escalation,
      conflictResolutionAccuracy: conflict,
      severityAccuracy: severity,
      actionsUsefulness: actions,
      deadlineReasonableness: deadline,
      recommendationUsefulness: recommendation,
      hrImpactAccuracy: hrImpact,
      legalImpactAccuracy: legalImpact,
      humanReviewAccuracy: humanReview,
      avgOverallRating: avgRating,
      validatedCases: validatedCases.length,
      avgQualityScore: avgQuality,
      byType,
      weakAreas,
    };
  }, [feedbacks, validatedCases]);

  return {
    feedbacks, validatedCases, loading, stats,
    refresh, fetchFeedbacks, fetchValidatedCases,
    submitFeedback, promoteToValidatedCase,
  };
}
