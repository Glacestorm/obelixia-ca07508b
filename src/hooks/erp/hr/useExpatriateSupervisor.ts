/**
 * useExpatriateSupervisor.ts — G2.1
 * Hook that wires the ExpatriateSupervisor engine to assignment data.
 */

import { useMemo } from 'react';
import { evaluateExpatriateSupervisor, type SupervisorResult } from '@/engines/erp/hr/expatriateSupervisor';
import type { MobilityAssignment } from '@/hooks/erp/hr/useGlobalMobility';

export function useExpatriateSupervisor(
  assignment: MobilityAssignment | null,
): SupervisorResult | null {
  return useMemo(() => {
    if (!assignment) return null;
    return evaluateExpatriateSupervisor(assignment);
  }, [assignment]);
}
