/**
 * useContractClosure — Hook for contract process operational closure
 * V2-ES.6 Paso 3: Evaluates closure readiness and exposes closure actions
 *
 * Mirrors useRegistrationClosure.ts pattern (alta/afiliación).
 * Receives already-loaded data via props — NO additional fetches.
 * Pure computation over existing context + action wrappers.
 */
import { useMemo } from 'react';
import type { ContractProcessData } from '@/hooks/erp/hr/useHRContractProcess';
import type { EnrichedCompleteness } from '@/hooks/erp/hr/useHRProcessDocRequirements';
import type { ContractDeadlineSummary } from '@/components/erp/hr/shared/contractDeadlineEngine';
import {
  evaluateContractClosureReadiness,
  type ContractClosureReadinessResult,
  type ContractClosureSnapshot,
  type ContractClosureBlocker,
} from '@/components/erp/hr/shared/contractClosureEngine';
import type { ContrataPreIntegrationContext } from '@/components/erp/hr/shared/contrataPreIntegrationReadiness';

// ─── Input / Output ─────────────────────────────────────────────────────────

export interface UseContractClosureInput {
  contractData: ContractProcessData | null;
  docCompleteness?: EnrichedCompleteness | null;
  deadlineSummary?: ContractDeadlineSummary | null;
}

export interface UseContractClosureReturn {
  closureReadiness: ContractClosureReadinessResult;
  canClose: boolean;
  isClosed: boolean;
  isConfirmed: boolean;
  blockers: ContractClosureBlocker[];
  warnings: ContractClosureBlocker[];
  existingSnapshot: ContractClosureSnapshot | null;
  closureNotes: string | null;
  closedAt: string | null;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useContractClosure(
  input: UseContractClosureInput,
): UseContractClosureReturn {
  const { contractData, docCompleteness, deadlineSummary } = input;

  const closureReadiness = useMemo(() => {
    const context: ContrataPreIntegrationContext = {};

    if (docCompleteness) {
      context.docReadinessPercent = docCompleteness.percentage ?? 0;
      context.docMandatoryComplete = docCompleteness.mandatoryComplete ?? false;
    }
    if (deadlineSummary) {
      context.deadlineSummary = deadlineSummary;
    }

    return evaluateContractClosureReadiness(contractData, context);
  }, [contractData, docCompleteness, deadlineSummary]);

  return useMemo(() => {
    const isClosed = closureReadiness.alreadyClosed;
    const isConfirmed = closureReadiness.alreadyConfirmed;

    const existingSnapshot = isClosed && contractData?.closure_snapshot
      ? (contractData.closure_snapshot as unknown as ContractClosureSnapshot)
      : null;

    return {
      closureReadiness,
      canClose: closureReadiness.canClose,
      isClosed,
      isConfirmed,
      blockers: closureReadiness.blockers,
      warnings: closureReadiness.warnings,
      existingSnapshot,
      closureNotes: contractData?.closure_notes ?? null,
      closedAt: contractData?.closed_at ?? null,
    };
  }, [closureReadiness, contractData]);
}
