/**
 * useTGSSReadiness — Hook for unified TGSS pre-integration readiness
 * V2-ES.5 Paso 3: Combines payload, consistency, docs and deadlines
 *
 * Receives already-loaded data via props — NO additional fetches.
 * Pure computation over existing context.
 */
import { useMemo } from 'react';
import type { RegistrationData } from '@/hooks/erp/hr/useHRRegistrationProcess';
import type { EnrichedCompleteness } from '@/hooks/erp/hr/useHRProcessDocRequirements';
import type { RegistrationDeadlineSummary } from '@/engines/erp/hr/registrationDeadlineEngine';
import {
  evaluatePreIntegrationReadiness,
  type PreIntegrationSummary,
  type PreIntegrationContext,
} from '@/components/erp/hr/shared/tgssPreIntegrationReadiness';

export interface UseTGSSReadinessInput {
  /** Registration data (already loaded) */
  registrationData: RegistrationData | null;
  /** Doc completeness (already loaded, optional) */
  docCompleteness?: EnrichedCompleteness | null;
  /** Deadline summary (already computed, optional) */
  deadlineSummary?: RegistrationDeadlineSummary | null;
}

export interface UseTGSSReadinessReturn {
  /** Full pre-integration summary */
  summary: PreIntegrationSummary;
  /** Shortcut: can proceed to integration */
  canProceed: boolean;
  /** Shortcut: overall status string */
  status: PreIntegrationSummary['status'];
  /** Shortcut: human label */
  statusLabel: string;
  /** Shortcut: has any blocking issue */
  hasBlockers: boolean;
  /** Shortcut: total issue count (errors + format + missing) */
  totalIssues: number;
}

export function useTGSSReadiness(input: UseTGSSReadinessInput): UseTGSSReadinessReturn {
  const { registrationData, docCompleteness, deadlineSummary } = input;

  const summary = useMemo(() => {
    const context: PreIntegrationContext = {};

    if (docCompleteness) {
      context.docReadinessPercent = docCompleteness.percentage ?? 0;
      context.docMandatoryComplete = docCompleteness.mandatoryComplete ?? false;
    }

    if (deadlineSummary) {
      context.deadlineSummary = deadlineSummary;
    }

    return evaluatePreIntegrationReadiness(registrationData, context);
  }, [registrationData, docCompleteness, deadlineSummary]);

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
