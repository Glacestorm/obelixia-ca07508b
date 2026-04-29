/**
 * B10F.5C — Read-only hook for registry pilot candidate discovery.
 *
 * Optionally fetches a candidate snapshot via the SELECT-only loader
 * (`fetchRegistryPilotCandidateSnapshot`) and runs the pure preflight
 * + discovery aggregator. Caller controls when to run.
 *
 * Hard rules:
 *  - READ-ONLY. No writes anywhere.
 *  - Does NOT import payroll bridge, salary resolver, normalizer,
 *    payroll engine, payslip engine, agreement safety gate, shadow
 *    flag module, registry pilot gate, registry runtime/pilot bridge
 *    decisions.
 *  - Does NOT mutate `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
 *    `HR_REGISTRY_PILOT_MODE`, or `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
 *  - Does NOT touch the operative table `erp_hr_collective_agreements`.
 *  - Does NOT use service_role.
 *  - Does NOT invoke any write edge function.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  evaluatePilotCandidateReadiness,
  type RegistryPilotCandidate,
} from '@/engines/erp/hr/registryPilotCandidatePreflight';
import { fetchRegistryPilotCandidateSnapshot } from '@/engines/erp/hr/registryPilotCandidateDataLoader';
import {
  buildPilotCandidateDiscoveryReport,
  type PilotCandidateDiscoveryResult,
} from '@/engines/erp/hr/registryPilotCandidateDiscovery';

export interface UseRegistryPilotCandidateDiscoveryFilters {
  companyId?: string;
  targetYear?: number;
}

export interface UseRegistryPilotCandidateDiscoveryResult {
  loading: boolean;
  error: string | null;
  warnings: string[];
  report: PilotCandidateDiscoveryResult | null;
  run: (filters: UseRegistryPilotCandidateDiscoveryFilters) => Promise<void>;
  evaluateCandidates: (
    inputs: Parameters<typeof evaluatePilotCandidateReadiness>[0][],
  ) => PilotCandidateDiscoveryResult;
}

export function useRegistryPilotCandidateDiscovery(): UseRegistryPilotCandidateDiscoveryResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [report, setReport] = useState<PilotCandidateDiscoveryResult | null>(null);

  const evaluateCandidates = useCallback(
    (inputs: Parameters<typeof evaluatePilotCandidateReadiness>[0][]) => {
      const evaluated: RegistryPilotCandidate[] = (Array.isArray(inputs) ? inputs : []).map(
        (i) => evaluatePilotCandidateReadiness(i),
      );
      return buildPilotCandidateDiscoveryReport(evaluated);
    },
    [],
  );

  const run = useCallback(async (filters: UseRegistryPilotCandidateDiscoveryFilters) => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      if (!filters?.companyId || typeof filters.targetYear !== 'number') {
        setError('missing_filters');
        setReport(null);
        return;
      }
      const result = await fetchRegistryPilotCandidateSnapshot({
        companyId: filters.companyId,
        year: filters.targetYear,
        supabaseClient: supabase,
      });
      if (!result.ok) {
        setError(result.error);
        setWarnings(result.warnings ?? []);
        setReport(null);
        return;
      }
      const snap = result.snapshot;
      // Build one candidate per (mapping, runtime_setting) pair under this company.
      const evaluated: RegistryPilotCandidate[] = [];
      for (const rs of snap.runtimeSettings) {
        const mappingId =
          typeof (rs as Record<string, unknown>).mapping_id === 'string'
            ? ((rs as Record<string, unknown>).mapping_id as string)
            : null;
        const mapping =
          mappingId == null
            ? null
            : snap.mappings.find((m) => (m as Record<string, unknown>).id === mappingId) ?? null;
        const agreementId = mapping
          ? ((mapping as Record<string, unknown>).registry_agreement_id as string | undefined) ??
            null
          : null;
        const versionId = mapping
          ? ((mapping as Record<string, unknown>).registry_version_id as string | undefined) ??
            null
          : null;
        const registryAgreement = agreementId
          ? snap.agreements.find((a) => (a as Record<string, unknown>).id === agreementId) ?? null
          : null;
        const registryVersion = versionId
          ? snap.versions.find((v) => (v as Record<string, unknown>).id === versionId) ?? null
          : null;
        const salaryTables = agreementId
          ? snap.salaryTables.filter(
              (t) => (t as Record<string, unknown>).agreement_id === agreementId,
            )
          : [];
        const rules = agreementId
          ? snap.rules.filter((r) => (r as Record<string, unknown>).agreement_id === agreementId)
          : [];
        evaluated.push(
          evaluatePilotCandidateReadiness({
            companyId: filters.companyId,
            employeeId: null,
            contractId: null,
            targetYear: filters.targetYear,
            mapping,
            runtimeSetting: rs,
            registryAgreement,
            registryVersion,
            salaryTables,
            rules,
            comparisonReport: null,
          }),
        );
      }
      setWarnings(result.warnings ?? []);
      setReport(buildPilotCandidateDiscoveryReport(evaluated));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, warnings, report, run, evaluateCandidates };
}

export default useRegistryPilotCandidateDiscovery;