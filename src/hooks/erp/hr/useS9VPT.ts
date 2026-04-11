/**
 * useS9VPT — Hook for Job Position Valuation (VPT)
 * S9 Compliance — Directiva UE 2023/970
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  computeVPTScore,
  detectVPTIncoherences,
  DEFAULT_VPT_METHODOLOGY,
} from '@/engines/erp/hr/s9ComplianceEngine';
import type {
  VPTMethodology,
  VPTFactorScores,
  VPTValuationStatus,
  VPTScoreBreakdown,
  VPTIncoherence,
} from '@/types/s9-compliance';

export interface VPTRow {
  id: string;
  company_id: string;
  position_id: string;
  version_id: string | null;
  status: VPTValuationStatus;
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
  // joined
  position_name?: string;
  job_level?: string;
  salary_band_min?: number;
  salary_band_max?: number;
  department_name?: string;
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

      // Enrich with position data
      const positionIds = [...new Set((valuations ?? []).map((v: any) => v.position_id))];
      if (positionIds.length === 0) return (valuations ?? []) as VPTRow[];

      const { data: positions } = await (supabase as any)
        .from('erp_hr_job_positions')
        .select('id, title, job_level, salary_band_min, salary_band_max, department_id')
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

  // ── Fetch positions without valuation ───────────────────────
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

  // ── Create valuation ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (params: {
      positionId: string;
      factorScores?: VPTFactorScores;
      methodology?: VPTMethodology;
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

  // ── Update scores ───────────────────────────────────────────
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
  const transitionMutation = useMutation({
    mutationFn: async (params: { valuationId: string; newStatus: VPTValuationStatus }) => {
      const updates: Record<string, any> = { status: params.newStatus, updated_at: new Date().toISOString() };
      if (params.newStatus === 'approved' || params.newStatus === 'active') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.approved_by = user?.id ?? null;
        updates.approved_at = new Date().toISOString();
      }
      if (params.newStatus === 'under_review') {
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

  // ── Computed analytics ──────────────────────────────────────
  const analytics = useMemo(() => {
    const vals = valuationsQuery.data ?? [];
    const activeVals = vals.filter(v => v.status === 'active');
    const totalPositions = positionsQuery.data?.length ?? 0;
    const valuatedPositions = new Set(activeVals.map(v => v.position_id)).size;
    const coverage = totalPositions > 0 ? (valuatedPositions / totalPositions) * 100 : 0;
    const avgScore = activeVals.length > 0
      ? activeVals.reduce((s, v) => s + v.total_score, 0) / activeVals.length
      : 0;

    return {
      totalPositions,
      valuatedPositions,
      coverage: Math.round(coverage * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
      totalValuations: vals.length,
      byStatus: {
        draft: vals.filter(v => v.status === 'draft').length,
        under_review: vals.filter(v => v.status === 'under_review').length,
        approved: vals.filter(v => v.status === 'approved').length,
        active: activeVals.length,
        archived: vals.filter(v => v.status === 'archived').length,
      },
    };
  }, [valuationsQuery.data, positionsQuery.data]);

  // ── Incoherences ────────────────────────────────────────────
  const incoherences = useMemo((): VPTIncoherence[] => {
    const activeVals = (valuationsQuery.data ?? []).filter(v => v.status === 'active');
    if (activeVals.length < 2) return [];
    return detectVPTIncoherences(activeVals.map(v => ({
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
    isCreating: createMutation.isPending,
    isUpdating: updateScoresMutation.isPending,
    refetch: () => {
      valuationsQuery.refetch();
      positionsQuery.refetch();
    },
  };
}
