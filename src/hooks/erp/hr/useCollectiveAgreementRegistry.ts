/**
 * B3 — React hook wrapper around the read-only collective agreement
 * data layer. Exposes loading/error state and the same DB-first +
 * legacy fallback semantics. No writes.
 */

import { useCallback, useState } from 'react';
import {
  getCollectiveAgreementByCode,
  getCollectiveAgreementsByCnae,
  rankCollectiveAgreementsForActivity,
  canUseAgreementForPayroll,
  attachAgreementSafety,
  buildBridgeSafetyContext,
  mapSourceLayerToOrigin,
  type UnifiedCollectiveAgreement,
  type RankingInput,
  type PayrollGuardResult,
  type BridgeSafetyContext,
  type ExtendedSourceLayer,
} from '@/lib/hr/collectiveAgreementRegistry';

export function useCollectiveAgreementRegistry() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByCode = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await getCollectiveAgreementByCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchByCnae = useCallback(
    async (cnae: string, jurisdictionCode?: string): Promise<UnifiedCollectiveAgreement[]> => {
      setIsLoading(true);
      setError(null);
      try {
        return await getCollectiveAgreementsByCnae(cnae, jurisdictionCode);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const rank = useCallback(
    (input: RankingInput) => rankCollectiveAgreementsForActivity(input),
    []
  );

  const checkPayrollGuard = useCallback(
    (agreement: UnifiedCollectiveAgreement): PayrollGuardResult =>
      canUseAgreementForPayroll(agreement),
    []
  );

  return {
    isLoading,
    error,
    fetchByCode,
    fetchByCnae,
    rank,
    checkPayrollGuard,
    /** B4.c — Attach a fresh safety decision (default hasManualSalary=false). */
    attachSafety: attachAgreementSafety,
    /** B4.c — Build the safetyContext expected by the resolver/bridge. */
    buildBridgeSafetyContext,
    /** B4.c — sourceLayer→AgreementOrigin pure mapping. */
    mapSourceLayerToOrigin,
  };
}

export type {
  BridgeSafetyContext,
  ExtendedSourceLayer,
};

export default useCollectiveAgreementRegistry;