/**
 * useITWorkflowPipeline.ts — Hook for unified IT workflow pipeline
 * P2.2: Wires itWorkflowPipelineEngine to Supabase data
 */

import { useMemo, useCallback } from 'react';
import { useITProcesses, useITParts, useITBases, useUpdateITProcess } from '@/hooks/hr/useHRITProcesses';
import {
  mapProcessStatusToPipelineState,
  evaluateITTransitionGuard,
  deriveITChecklist,
  buildITTimeline,
  deriveITCrossModuleSignals,
  deriveFDIChecklist,
  calculateITPayrollImpact,
  calculateITReportingKPIs,
  type ITPipelineCaseData,
  type ITPipelineState,
  type ITCrossModuleSignals,
  type ITChecklistItem,
  type ITTimelineEvent,
  type FDIChecklistItem,
  type ITPayrollImpact,
  type ITReportingKPIs,
  type ITTransitionGuardResult,
} from '@/engines/erp/hr/itWorkflowPipelineEngine';
import type { FDIArtifact } from '@/engines/erp/hr/fdiArtifactEngine';
import type { HRITProcess } from '@/types/hr';
import { toast } from 'sonner';

export interface UseITWorkflowPipelineOptions {
  companyId: string | undefined;
  processId?: string;
  filters?: { employee_id?: string; status?: string; process_type?: string };
}

export interface ITWorkflowPipelineResult {
  // Data
  processes: HRITProcess[];
  isLoading: boolean;
  // Selected process pipeline
  caseData: ITPipelineCaseData | null;
  pipelineState: ITPipelineState | null;
  checklist: ITChecklistItem[];
  timeline: ITTimelineEvent[];
  fdiChecklist: FDIChecklistItem[];
  signals: ITCrossModuleSignals | null;
  // Actions
  transitionTo: (target: ITPipelineState) => Promise<boolean>;
  evaluateTransition: (target: ITPipelineState) => ITTransitionGuardResult | null;
  calculatePayrollImpact: (params: {
    periodDays: number;
    periodStartDate: string;
    periodEndDate: string;
    grossSalaryMonthly: number;
  }) => ITPayrollImpact | null;
  // Reporting
  reportingKPIs: ITReportingKPIs | null;
}

export function useITWorkflowPipeline(options: UseITWorkflowPipelineOptions): ITWorkflowPipelineResult {
  const { companyId, processId, filters } = options;

  const { data: processes = [], isLoading: processesLoading } = useITProcesses(companyId, filters);
  const { data: parts = [] } = useITParts(processId);
  const { data: bases = [] } = useITBases(processId);
  const updateProcess = useUpdateITProcess();

  // Build case data for selected process
  const caseData = useMemo<ITPipelineCaseData | null>(() => {
    if (!processId) return null;
    const process = processes.find(p => p.id === processId);
    if (!process) return null;

    const pipelineState = mapProcessStatusToPipelineState(process, parts);
    // FDI artifacts would come from erp_hr_official_artifacts — for now empty
    const fdiArtifacts: FDIArtifact[] = [];

    return { process, parts, bases, fdiArtifacts, pipelineState };
  }, [processId, processes, parts, bases]);

  const pipelineState = caseData?.pipelineState ?? null;

  const checklist = useMemo(() => caseData ? deriveITChecklist(caseData) : [], [caseData]);
  const timeline = useMemo(() => caseData ? buildITTimeline(caseData) : [], [caseData]);
  const fdiChecklist = useMemo(() => caseData ? deriveFDIChecklist(caseData) : [], [caseData]);
  const signals = useMemo(() => caseData ? deriveITCrossModuleSignals(caseData, processes) : null, [caseData, processes]);

  const reportingKPIs = useMemo(() => {
    if (!processes.length) return null;
    const allBases = bases; // in production this would aggregate across processes
    return calculateITReportingKPIs(processes, allBases);
  }, [processes, bases]);

  const evaluateTransition = useCallback((target: ITPipelineState): ITTransitionGuardResult | null => {
    if (!caseData) return null;
    return evaluateITTransitionGuard(caseData, target);
  }, [caseData]);

  const transitionTo = useCallback(async (target: ITPipelineState): Promise<boolean> => {
    if (!caseData) return false;
    const guard = evaluateITTransitionGuard(caseData, target);
    if (!guard.allowed) {
      toast.error(`Transición bloqueada: ${guard.blockers.join(', ')}`);
      return false;
    }
    if (guard.warnings.length > 0) {
      toast.warning(guard.warnings.join('; '));
    }

    // Map pipeline state to DB status
    const statusMap: Record<ITPipelineState, string> = {
      communicated: 'active',
      active: 'active',
      review_pending: 'extended',
      relapsed: 'relapsed',
      medical_discharge: 'active',
      closed: 'closed',
      cancelled: 'closed',
    };

    try {
      await updateProcess.mutateAsync({
        id: caseData.process.id,
        status: statusMap[target] as any,
        ...(target === 'closed' && !caseData.process.end_date ? { end_date: new Date().toISOString().split('T')[0] } : {}),
        metadata: {
          ...(caseData.process.metadata ?? {}),
          pipeline_state: target,
          pipeline_transition_at: new Date().toISOString(),
        },
      } as any);
      toast.success(`Proceso transicionado a: ${target}`);
      return true;
    } catch (err) {
      toast.error('Error al transicionar proceso IT');
      return false;
    }
  }, [caseData, updateProcess]);

  const calcPayrollImpact = useCallback((params: {
    periodDays: number; periodStartDate: string; periodEndDate: string; grossSalaryMonthly: number;
  }): ITPayrollImpact | null => {
    if (!caseData) return null;
    return calculateITPayrollImpact({
      process: caseData.process,
      base: caseData.bases.length > 0 ? caseData.bases[caseData.bases.length - 1] : null,
      ...params,
    });
  }, [caseData]);

  return {
    processes,
    isLoading: processesLoading,
    caseData,
    pipelineState,
    checklist,
    timeline,
    fdiChecklist,
    signals,
    transitionTo,
    evaluateTransition,
    calculatePayrollImpact: calcPayrollImpact,
    reportingKPIs,
  };
}
