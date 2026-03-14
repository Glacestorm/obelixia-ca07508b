/**
 * useContrataReadiness — Hook for unified Contrat@/SEPE pre-integration readiness
 * V2-ES.6 Paso 2: Combines payload, consistency, docs and deadlines
 *
 * Mirrors useTGSSReadiness.ts pattern (alta/afiliación).
 * Receives already-loaded data via props — NO additional fetches.
 * Pure computation over existing context.
 */
import { useMemo } from 'react';
import type { ContractProcessData } from '@/hooks/erp/hr/useHRContractProcess';
import type { ContractDeadlineSummary } from '@/components/erp/hr/shared/contractDeadlineEngine';
import {
  evaluateContrataPreIntegrationReadiness,
  type ContrataPreIntegrationSummary,
  type ContrataPreIntegrationContext,
} from '@/components/erp/hr/shared/contrataPreIntegrationReadiness';

/** Minimal doc readiness shape — avoids requiring full EnrichedCompleteness */
export interface DocReadinessInput {
  percentage: number;
  mandatoryComplete: boolean;
}

export interface UseContrataReadinessInput {
  /** Contract process data (already loaded) */
  contractData: ContractProcessData | null;
  /** Doc completeness (already loaded, optional) */
  docCompleteness?: DocReadinessInput | null;
  /** Deadline summary (already computed, optional) */
  deadlineSummary?: ContractDeadlineSummary | null;
}

export interface UseContrataReadinessReturn {
  /** Full pre-integration summary */
  summary: ContrataPreIntegrationSummary;
  /** Shortcut: can proceed to integration */
  canProceed: boolean;
  /** Shortcut: overall status string */
  status: ContrataPreIntegrationSummary['status'];
  /** Shortcut: human label */
  statusLabel: string;
  /** Shortcut: has any blocking issue */
  hasBlockers: boolean;
  /** Shortcut: total issue count (errors + format + missing) */
  totalIssues: number;
}

export function useContrataReadiness(input: UseContrataReadinessInput): UseContrataReadinessReturn {
  const { contractData, docCompleteness, deadlineSummary } = input;

  const summary = useMemo(() => {
    const context: ContrataPreIntegrationContext = {};

    if (docCompleteness) {
      context.docReadinessPercent = docCompleteness.percentage ?? 0;
      context.docMandatoryComplete = docCompleteness.mandatoryComplete ?? false;
    }

    if (deadlineSummary) {
      context.deadlineSummary = deadlineSummary;
    }

    return evaluateContrataPreIntegrationReadiness(contractData, context);
  }, [contractData, docCompleteness, deadlineSummary]);

  return useMemo(() => {
    const totalIssues =
      summary.payload.missingFields.length +
      summary.payload.formatErrors.length +
      summary.consistency.errorCount;

    return {
      summary,
      canProceed: summary.canProceed,
      status: summary.status,
      statusLabel: summary.statusLabel,
      hasBlockers: !summary.canProceed,
      totalIssues,
    };
  }, [summary]);
}
