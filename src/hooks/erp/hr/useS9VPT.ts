/**
 * useS9VPT — Hook for Job Position Valuation (VPT)
 * S9 Compliance — Directiva UE 2023/970
 *
 * Status semantics aligned with useHRVersionRegistry:
 *   draft → review → approved (= vigente) → closed → superseded
 * Unique partial index guarantees only ONE approved per position+company.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  computeVPTScore,
  detectVPTIncoherences,
  suggestEquivalentBand,
  DEFAULT_VPT_METHODOLOGY,
  DEFAULT_METHODOLOGY_VERSION,
} from '@/engines/erp/hr/s9ComplianceEngine';
import type {
  VPTMethodology,
  VPTFactorScores,
  VPTValuationStatus,
  VPTIncoherence,
} from '@/types/s9-compliance';

export interface VPTRow {
  id: string;
  company_id: string;
  position_id: string;
  version_id: string | null;
  status: VPTValuationStatus;
  methodology_version: string;
  methodology_snapshot: VPTMethodology;
  factor_scores: VPTFactorScores;
  total_score: number;
  equivalent_band_min: number | null;
  equivalent_band_max: number | null;
  notes: string | null;
  scored_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  ai_suggestions: VPTFactorScores | null;
  created_at: string;
  updated_at: string;
  // joined from erp_hr_job_positions
  position_name?: string;
  job_level?: string;
  salary_band_min?: number;
  salary_band_max?: number;
}

export function useS9VPT(companyId: string) {
  const queryClient = useQueryClient();

  // ── Fetch all valuations with position data ─────────────────
  const valuationsQuery = useQuery({
    queryKey: ['s9-vpt', companyId],
    queryFn: async (): Promise<VPTRow[]> => {
      const { data: valuations, error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useS9VPT] fetch error:', error);
        return [];
      }

      const positionIds = [...new Set((valuations ?? []).map((v: any) => v.position_id))];
      if (positionIds.length === 0) return (valuations ?? []) as VPTRow[];

      const { data: positions } = await (supabase as any)
        .from('erp_hr_job_positions')
        .select('id, title, job_level, salary_band_min, salary_band_max')
        .in('id', positionIds);

      const posMap = new Map((positions ?? []).map((p: any) => [p.id, p]));

      return (valuations ?? []).map((v: any) => {
        const pos = posMap.get(v.position_id) as any;
        return {
          ...v,
          position_name: pos?.title ?? 'Puesto desconocido',
          job_level: pos?.job_level,
          salary_band_min: pos?.salary_band_min,
          salary_band_max: pos?.salary_band_max,
        } as VPTRow;
      });
    },
    enabled: !!companyId,
  });

  // ── Fetch positions ─────────────────────────────────────────
  const positionsQuery = useQuery({
    queryKey: ['s9-vpt-positions', companyId],
    queryFn: async () => {
      const { data: positions } = await (supabase as any)
        .from('erp_hr_job_positions')
        .select('id, title, job_level, salary_band_min, salary_band_max, responsibilities, required_competencies')
        .eq('company_id', companyId)
        .eq('is_active', true);
      return (positions ?? []) as Array<{
        id: string;
        title: string;
        job_level: string;
        salary_band_min: number;
        salary_band_max: number;
        responsibilities: any;
        required_competencies: any;
      }>;
    },
    enabled: !!companyId,
  });

  // ── Create valuation (draft) ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (params: {
      positionId: string;
      factorScores?: VPTFactorScores;
      methodology?: VPTMethodology;
      methodologyVersion?: string;
      notes?: string;
    }) => {
      const methodology = params.methodology ?? DEFAULT_VPT_METHODOLOGY;
      const emptyScores: VPTFactorScores = {
        qualifications: { formal_education: 1, experience: 1, certifications: 1 },
        responsibility: { people_decisions: 1, economic_decisions: 1, organizational_impact: 1 },
        effort: { intellectual_complexity: 1, physical_effort: 1, emotional_load: 1 },
        conditions: { hardship_danger: 1, atypical_schedules: 1, availability_travel: 1 },
      };
      const scores = params.factorScores ?? emptyScores;
      const breakdown = computeVPTScore(scores, methodology);

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .insert({
          company_id: companyId,
          position_id: params.positionId,
          status: 'draft',
          methodology_version: params.methodologyVersion ?? DEFAULT_METHODOLOGY_VERSION,
          methodology_snapshot: methodology,
          factor_scores: scores,
          total_score: breakdown.totalScore,
          notes: params.notes ?? null,
          scored_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s9-vpt', companyId] });
    },
  });

  // ── Update scores (only in draft) ───────────────────────────
  const updateScoresMutation = useMutation({
    mutationFn: async (params: {
      valuationId: string;
      factorScores: VPTFactorScores;
      methodology?: VPTMethodology;
      notes?: string;
    }) => {
      const methodology = params.methodology ?? DEFAULT_VPT_METHODOLOGY;
      const breakdown = computeVPTScore(params.factorScores, methodology);

      const { error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .update({
          factor_scores: params.factorScores,
          total_score: breakdown.totalScore,
          methodology_snapshot: methodology,
          notes: params.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.valuationId);

      if (error) throw error;
      return breakdown;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s9-vpt', companyId] });
    },
  });

  // ── Transition status ───────────────────────────────────────
  // draft → review → approved → closed/superseded
  // When approving, supersede any previously approved valuation for same position
  const transitionMutation = useMutation({
    mutationFn: async (params: { valuationId: string; newStatus: VPTValuationStatus; positionId?: string }) => {
      const updates: Record<string, any> = {
        status: params.newStatus,
        updated_at: new Date().toISOString(),
      };

      if (params.newStatus === 'approved') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.approved_by = user?.id ?? null;
        updates.approved_at = new Date().toISOString();

        // Supersede any currently approved valuation for the same position
        if (params.positionId) {
          await (supabase as any)
            .from('erp_hr_job_valuations')
            .update({ status: 'superseded', updated_at: new Date().toISOString() })
            .eq('company_id', companyId)
            .eq('position_id', params.positionId)
            .eq('status', 'approved')
            .neq('id', params.valuationId);
        }
      }

      if (params.newStatus === 'review') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.reviewed_by = user?.id ?? null;
      }

      const { error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .update(updates)
        .eq('id', params.valuationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s9-vpt', companyId] });
    },
  });

  // ── Set equivalent band (separate from score) ───────────────
  const setBandMutation = useMutation({
    mutationFn: async (params: { valuationId: string; bandMin: number; bandMax: number }) => {
      const { error } = await (supabase as any)
        .from('erp_hr_job_valuations')
        .update({
          equivalent_band_min: params.bandMin,
          equivalent_band_max: params.bandMax,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.valuationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s9-vpt', companyId] });
    },
  });

  // ── Computed analytics ──────────────────────────────────────
  const analytics = useMemo(() => {
    const vals = valuationsQuery.data ?? [];
    const approvedVals = vals.filter(v => v.status === 'approved');
    const totalPositions = positionsQuery.data?.length ?? 0;
    const valuatedPositions = new Set(approvedVals.map(v => v.position_id)).size;
    const coverage = totalPositions > 0 ? (valuatedPositions / totalPositions) * 100 : 0;
    const avgScore = approvedVals.length > 0
      ? approvedVals.reduce((s, v) => s + v.total_score, 0) / approvedVals.length
      : 0;

    return {
      totalPositions,
      valuatedPositions,
      coverage: Math.round(coverage * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
      totalValuations: vals.length,
      byStatus: {
        draft: vals.filter(v => v.status === 'draft').length,
        review: vals.filter(v => v.status === 'review').length,
        approved: approvedVals.length,
        closed: vals.filter(v => v.status === 'closed').length,
        superseded: vals.filter(v => v.status === 'superseded').length,
      },
    };
  }, [valuationsQuery.data, positionsQuery.data]);

  // ── Incoherences (only approved valuations) ─────────────────
  const incoherences = useMemo((): VPTIncoherence[] => {
    const approvedVals = (valuationsQuery.data ?? []).filter(v => v.status === 'approved');
    if (approvedVals.length < 2) return [];
    return detectVPTIncoherences(approvedVals.map(v => ({
      id: v.id,
      positionId: v.position_id,
      positionName: v.position_name,
      totalScore: v.total_score,
      salaryBandMin: v.salary_band_min ?? undefined,
      salaryBandMax: v.salary_band_max ?? undefined,
      jobLevel: v.job_level,
    })));
  }, [valuationsQuery.data]);

  return {
    valuations: valuationsQuery.data ?? [],
    positions: positionsQuery.data ?? [],
    isLoading: valuationsQuery.isLoading || positionsQuery.isLoading,
    analytics,
    incoherences,
    createValuation: createMutation.mutateAsync,
    updateScores: updateScoresMutation.mutateAsync,
    transitionStatus: transitionMutation.mutateAsync,
    setEquivalentBand: setBandMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateScoresMutation.isPending,
    refetch: () => {
      valuationsQuery.refetch();
      positionsQuery.refetch();
    },
  };
}
