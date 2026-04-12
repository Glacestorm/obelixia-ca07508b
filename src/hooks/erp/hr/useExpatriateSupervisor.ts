/**
 * useExpatriateSupervisor.ts — G2.1 + G2.2
 * Hook that wires the ExpatriateSupervisor engine to assignment data.
 * G2.2: Pre-fetches corridor pack from DB via repository, passes as override.
 */

import { useMemo } from 'react';
import { evaluateExpatriateSupervisor, type SupervisorResult } from '@/engines/erp/hr/expatriateSupervisor';
import { useResolvedCorridorPack } from '@/hooks/erp/hr/useCorridorPackRepository';
import type { MobilityAssignment } from '@/hooks/erp/hr/useGlobalMobility';

export function useExpatriateSupervisor(
  assignment: MobilityAssignment | null,
  companyId?: string,
): SupervisorResult | null {
  // Pre-fetch the corridor pack from DB (with TS fallback inside)
  const { data: resolvedPack, isLoading } = useResolvedCorridorPack(
    assignment?.home_country_code,
    assignment?.host_country_code,
    companyId,
  );

  return useMemo(() => {
    if (!assignment) return null;
    // While loading, still run with undefined (engine will use TS fallback)
    return evaluateExpatriateSupervisor(assignment, isLoading ? undefined : resolvedPack ?? null);
  }, [assignment, resolvedPack, isLoading]);
}
