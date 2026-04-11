/**
 * useOffboardingPipeline.ts — Unified offboarding pipeline hook
 * P2.1: Pipeline de baja unificado end-to-end
 *
 * Wires offboardingPipelineEngine to Supabase persistence.
 * Provides reactive state for the OffboardingWorkspace UI.
 *
 * Reuses:
 * - useOffboardingOrchestration (settlement calculation)
 * - useHRLedgerWriter (audit trail)
 * - useCertificaResponse (SEPE response flow)
 * - erp_hr_termination_analysis table (no new tables)
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHRLedgerWriter } from './useHRLedgerWriter';
import { useOffboardingOrchestration, type SettlementCalcInput } from './useOffboardingOrchestration';
import {
  type OffboardingCase,
  type OffboardingPipelineState,
  type PipelineTimelineEvent,
  type TransitionGuardResult,
  createOffboardingCase,
  evaluateTransitionGuard,
  isValidPipelineTransition,
  computePipelineChecklist,
  deriveOffboardingSignals,
  buildTimelineEvent,
  PIPELINE_STATE_META,
} from '@/engines/erp/hr/offboardingPipelineEngine';
import type { InternalTerminationType } from '@/engines/erp/hr/offboardingOrchestrationEngine';
import type { SettlementEvidenceSnapshot } from '@/engines/erp/hr/settlementEvidenceEngine';

// ── Types ──

export interface PipelineCaseListItem {
  id: string;
  employeeId: string;
  employeeName: string;
  terminationType: string;
  effectiveDate: string | null;
  pipelineState: OffboardingPipelineState;
  legalReviewRequired: boolean;
  createdAt: string;
}

// ── Hook ──

export function useOffboardingPipeline(companyId: string) {
  const [cases, setCases] = useState<PipelineCaseListItem[]>([]);
  const [activeCase, setActiveCase] = useState<OffboardingCase | null>(null);
  const [timeline, setTimeline] = useState<PipelineTimelineEvent[]>([]);
  const [settlement, setSettlement] = useState<SettlementEvidenceSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { writeLedger } = useHRLedgerWriter(companyId, 'offboarding_pipeline');
  const { calculateSettlement } = useOffboardingOrchestration(companyId);

  // ── Fetch case list ──

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('erp_hr_termination_analysis')
        .select(`
          id,
          employee_id,
          termination_type,
          proposed_termination_date,
          status,
          legal_review_required,
          created_at,
          pipeline_state,
          employee:erp_hr_employees(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: PipelineCaseListItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.employee
          ? `${row.employee.first_name} ${row.employee.last_name}`
          : 'Desconocido',
        terminationType: row.termination_type,
        effectiveDate: row.proposed_termination_date,
        pipelineState: (row.pipeline_state as OffboardingPipelineState) || mapLegacyStatus(row.status),
        legalReviewRequired: row.legal_review_required ?? false,
        createdAt: row.created_at,
      }));

      setCases(mapped);
    } catch (err) {
      console.error('[useOffboardingPipeline] fetchCases error:', err);
      toast.error('Error al cargar casos de baja');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // ── Load a single case fully ──

  const loadCase = useCallback(async (caseId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('erp_hr_termination_analysis')
        .select(`
          *,
          employee:erp_hr_employees(id, first_name, last_name, hire_date, job_title)
        `)
        .eq('id', caseId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;

      const pipelineState: OffboardingPipelineState =
        data.pipeline_state || mapLegacyStatus(data.status);

      const offCase = createOffboardingCase({
        id: data.id,
        employeeId: data.employee_id,
        employeeName: data.employee
          ? `${data.employee.first_name} ${data.employee.last_name}`
          : 'Desconocido',
        companyId,
        terminationType: data.termination_type as InternalTerminationType,
        effectiveDate: data.proposed_termination_date ?? '',
        reason: data.termination_reason ?? '',
        legalReviewRequired: data.legal_review_required ?? false,
      });

      // Override computed fields with DB data
      offCase.pipelineState = pipelineState;
      offCase.observations = data.termination_reason ?? '';
      offCase.createdAt = data.created_at;
      offCase.updatedAt = data.updated_at ?? data.created_at;

      // Load settlement if available from metadata
      if (data.settlement_snapshot) {
        offCase.finiquitoComputed = true;
        offCase.finiquitoTotal = data.settlement_snapshot.totalBruto ?? null;
        offCase.finiquitoSubtotal = data.settlement_snapshot.finiquito?.subtotal ?? null;
        offCase.indemnizacionAmount = data.settlement_snapshot.indemnizacion?.amount ?? null;
        offCase.indemnizacionLegalBasis = data.settlement_snapshot.indemnizacion?.legalBasis ?? null;
        offCase.vacationCompensationAmount = data.settlement_snapshot.finiquito?.vacationCompensation ?? null;
        offCase.pendingVacationDays = data.settlement_snapshot.finiquito?.vacationDaysPending ?? 0;
        setSettlement(data.settlement_snapshot);
      }

      // Load timeline from metadata
      if (data.pipeline_timeline && Array.isArray(data.pipeline_timeline)) {
        setTimeline(data.pipeline_timeline);
      } else {
        setTimeline([buildTimelineEvent('draft', 'Caso creado')]);
      }

      setActiveCase(offCase);
    } catch (err) {
      console.error('[useOffboardingPipeline] loadCase error:', err);
      toast.error('Error al cargar caso de baja');
    }
  }, [companyId]);

  // ── Transition state ──

  const transitionState = useCallback(async (
    targetState: OffboardingPipelineState,
    detail?: string,
  ): Promise<boolean> => {
    if (!activeCase) return false;

    const guard = evaluateTransitionGuard(activeCase, targetState);
    if (!guard.allowed) {
      guard.blockers.forEach(b => toast.error(b));
      return false;
    }

    try {
      const newTimeline = [
        ...timeline,
        buildTimelineEvent(targetState, detail),
      ];

      const updatePayload: Record<string, unknown> = {
        pipeline_state: targetState,
        pipeline_timeline: newTimeline,
        updated_at: new Date().toISOString(),
      };

      if (targetState === 'closed') {
        updatePayload.closed_at = new Date().toISOString();
        updatePayload.status = 'executed';
      }
      if (targetState === 'cancelled') {
        updatePayload.status = 'cancelled';
      }

      const { error } = await (supabase as any)
        .from('erp_hr_termination_analysis')
        .update(updatePayload)
        .eq('id', activeCase.id)
        .eq('company_id', companyId);

      if (error) throw error;

      // Ledger event
      await writeLedger({
        eventType: 'system_event',
        entityType: 'termination',
        entityId: activeCase.id,
        beforeSnapshot: { state: activeCase.pipelineState },
        afterSnapshot: { state: targetState, detail },
      });

      // Update local state
      setActiveCase(prev => prev ? { ...prev, pipelineState: targetState, updatedAt: new Date().toISOString() } : null);
      setTimeline(newTimeline);

      toast.success(`Estado: ${PIPELINE_STATE_META[targetState].label}`);
      return true;
    } catch (err) {
      console.error('[useOffboardingPipeline] transitionState error:', err);
      toast.error('Error al cambiar estado del caso');
      return false;
    }
  }, [activeCase, timeline, companyId, writeLedger]);

  // ── Calculate settlement ──

  const runSettlementCalculation = useCallback(async (
    input: Omit<SettlementCalcInput, 'terminationId'>,
  ): Promise<SettlementEvidenceSnapshot | null> => {
    if (!activeCase) return null;

    const result = await calculateSettlement({
      ...input,
      terminationId: activeCase.id,
    });

    if (result) {
      setSettlement(result);

      // Persist snapshot in termination record
      await (supabase as any)
        .from('erp_hr_termination_analysis')
        .update({
          settlement_snapshot: result,
          estimated_cost_min: result.totalBruto,
          estimated_cost_max: result.totalBruto,
        })
        .eq('id', activeCase.id)
        .eq('company_id', companyId);

      // Update local case
      setActiveCase(prev => prev ? {
        ...prev,
        finiquitoComputed: true,
        finiquitoTotal: result.totalBruto,
        finiquitoSubtotal: result.finiquito.subtotal,
        indemnizacionAmount: result.indemnizacion.amount,
        indemnizacionLegalBasis: result.indemnizacion.legalBasis,
        vacationCompensationAmount: result.finiquito.vacationCompensation,
        pendingVacationDays: result.finiquito.vacationDaysPending,
      } : null);
    }

    return result;
  }, [activeCase, companyId, calculateSettlement]);

  // ── Derive computed data ──

  const checklist = activeCase ? computePipelineChecklist(activeCase) : null;
  const signals = activeCase ? deriveOffboardingSignals(activeCase) : null;

  const canTransitionTo = useCallback((target: OffboardingPipelineState): TransitionGuardResult => {
    if (!activeCase) return { allowed: false, blockers: ['Sin caso activo'] };
    return evaluateTransitionGuard(activeCase, target);
  }, [activeCase]);

  // ── Init ──
  useEffect(() => { fetchCases(); }, [fetchCases]);

  return {
    // Lists
    cases,
    isLoading,
    fetchCases,

    // Active case
    activeCase,
    loadCase,
    setActiveCase,

    // Pipeline
    transitionState,
    canTransitionTo,
    checklist,
    signals,
    timeline,

    // Settlement
    settlement,
    runSettlementCalculation,
  };
}

// ── Helpers ──

/** Map legacy status values to pipeline states */
function mapLegacyStatus(status: string | null): OffboardingPipelineState {
  switch (status) {
    case 'draft': return 'draft';
    case 'under_review': return 'in_review';
    case 'approved': return 'approved_hr';
    case 'in_progress': return 'pending_calculation';
    case 'executed': return 'closed';
    case 'cancelled': return 'cancelled';
    default: return 'draft';
  }
}
