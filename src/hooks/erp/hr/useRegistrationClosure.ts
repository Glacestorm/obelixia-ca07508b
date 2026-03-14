/**
 * useRegistrationClosure — Hook for registration operational closure
 * V2-ES.5 Paso 4: Evaluates closure readiness and exposes closure actions
 *
 * Receives already-loaded data via props — NO additional fetches.
 * Pure computation over existing context + action wrappers.
 */
import { useMemo, useCallback, useState } from 'react';
import type { RegistrationData } from '@/hooks/erp/hr/useHRRegistrationProcess';
import type { EnrichedCompleteness } from '@/hooks/erp/hr/useHRProcessDocRequirements';
import type { RegistrationDeadlineSummary } from '@/components/erp/hr/shared/registrationDeadlineEngine';
import {
  evaluateClosureReadiness,
  buildClosureSnapshot,
  type ClosureReadinessResult,
  type ClosureSnapshot,
  type ClosureBlocker,
} from '@/components/erp/hr/shared/registrationClosureEngine';
import type { PreIntegrationContext } from '@/components/erp/hr/shared/tgssPreIntegrationReadiness';

// ─── Input / Output ─────────────────────────────────────────────────────────

export interface UseRegistrationClosureInput {
  /** Registration data (already loaded) */
  registrationData: RegistrationData | null;
  /** Doc completeness (already loaded, optional) */
  docCompleteness?: EnrichedCompleteness | null;
  /** Deadline summary (already computed, optional) */
  deadlineSummary?: RegistrationDeadlineSummary | null;
}

export interface UseRegistrationClosureReturn {
  /** Full closure readiness evaluation */
  closureReadiness: ClosureReadinessResult;
  /** Can the process be closed right now? */
  canClose: boolean;
  /** Is already closed? */
  isClosed: boolean;
  /** Is already confirmed (supersedes closure)? */
  isConfirmed: boolean;
  /** Blocking issues preventing closure */
  blockers: ClosureBlocker[];
  /** Non-blocking warnings */
  warnings: ClosureBlocker[];
  /** Existing snapshot (if already closed) */
  existingSnapshot: ClosureSnapshot | null;
  /** Existing closure notes */
  closureNotes: string | null;
  /** Closed at timestamp */
  closedAt: string | null;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useRegistrationClosure(
  input: UseRegistrationClosureInput,
): UseRegistrationClosureReturn {
  const { registrationData, docCompleteness, deadlineSummary } = input;

  const closureReadiness = useMemo(() => {
    const context: PreIntegrationContext = {};

    if (docCompleteness) {
      context.docReadinessPercent = docCompleteness.percentage ?? 0;
      context.docMandatoryComplete = docCompleteness.mandatoryComplete ?? false;
    }
    if (deadlineSummary) {
      context.deadlineSummary = deadlineSummary;
    }

    return evaluateClosureReadiness(registrationData, context);
  }, [registrationData, docCompleteness, deadlineSummary]);

  return useMemo(() => {
    const isClosed = closureReadiness.alreadyClosed;
    const isConfirmed = closureReadiness.alreadyConfirmed;

    // Extract existing snapshot from data if closed
    const existingSnapshot = isClosed && registrationData?.closure_snapshot
      ? (registrationData.closure_snapshot as unknown as ClosureSnapshot)
      : null;

    return {
      closureReadiness,
      canClose: closureReadiness.canClose,
      isClosed,
      isConfirmed,
      blockers: closureReadiness.blockers,
      warnings: closureReadiness.warnings,
      existingSnapshot,
      closureNotes: registrationData?.closure_notes ?? null,
      closedAt: registrationData?.closed_at ?? null,
    };
  }, [closureReadiness, registrationData]);
}
