/**
 * useCredentialOnboarding.ts — LM3: Credential & Sandbox State Management
 *
 * Persists state in hr_domain_certificates metadata + local state.
 * All changes generate ledger events for traceability.
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  type OrganismId,
  type CredentialEntry,
  type CredentialStatus,
  type CredentialType,
  type CertificateBindingStatus,
  type SandboxScenario,
  type ScenarioStatus,
  type CredentialOnboardingState,
  ALL_ORGANISMS,
  ORGANISM_LABELS,
  ORGANISM_CREDENTIAL_REQUIREMENTS,
  ORGANISM_SANDBOX_SCENARIOS,
  evaluateOrganismGoLiveReadiness,
  computeNextRecommendedAction,
} from '@/engines/erp/hr/credentialOnboardingEngine';
import type { FormatValidationStatus } from '@/engines/erp/hr/officialFormatValidatorEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

export function useCredentialOnboarding(companyId: string) {
  const { writeLedger } = useHRLedgerWriter(companyId, 'credential_onboarding');

  // In-memory state (persisted via ledger events, loaded from metadata)
  const [credentialsByOrganism, setCredentialsByOrganism] = useState<Record<OrganismId, CredentialEntry[]>>(() => {
    const init: Record<string, CredentialEntry[]> = {};
    ALL_ORGANISMS.forEach(org => {
      init[org] = ORGANISM_CREDENTIAL_REQUIREMENTS[org].map(req => ({
        type: req.type,
        status: 'not_configured' as CredentialStatus,
      }));
    });
    return init as Record<OrganismId, CredentialEntry[]>;
  });

  const [certificateStatuses, setCertificateStatuses] = useState<Record<OrganismId, CertificateBindingStatus>>(() => {
    const init: Record<string, CertificateBindingStatus> = {};
    ALL_ORGANISMS.forEach(org => { init[org] = 'not_configured'; });
    return init as Record<OrganismId, CertificateBindingStatus>;
  });

  const [formatValidations, setFormatValidations] = useState<Record<OrganismId, Record<string, FormatValidationStatus>>>(() => {
    const init: Record<string, Record<string, FormatValidationStatus>> = {};
    ALL_ORGANISMS.forEach(org => { init[org] = {}; });
    return init as Record<OrganismId, Record<string, FormatValidationStatus>>;
  });

  const [parserStatuses, setParserStatuses] = useState<Record<OrganismId, boolean>>(() => {
    const init: Record<string, boolean> = {};
    ALL_ORGANISMS.forEach(org => { init[org] = false; });
    return init as Record<OrganismId, boolean>;
  });

  const [scenarios, setScenarios] = useState<SandboxScenario[]>(() =>
    ORGANISM_SANDBOX_SCENARIOS.map(s => ({ ...s }))
  );

  // ── Update Credential Status ──────────────────────────────────────────────

  const updateCredentialStatus = useCallback(async (
    organism: OrganismId,
    credentialType: CredentialType,
    status: CredentialStatus,
    notes?: string,
  ) => {
    setCredentialsByOrganism(prev => ({
      ...prev,
      [organism]: prev[organism].map(c =>
        c.type === credentialType
          ? { ...c, status, configuredAt: status === 'configured' || status === 'validated' ? new Date().toISOString() : c.configuredAt, notes }
          : c
      ),
    }));

    writeLedger({
      eventType: 'field_change',
      entityType: 'credential_onboarding',
      entityId: `${organism}:${credentialType}`,
      afterSnapshot: { organism, credentialType, status, notes },
      metadata: { action: 'credential_configured' },
    });
  }, [writeLedger]);

  // ── Update Certificate Status ─────────────────────────────────────────────

  const updateCertificateStatus = useCallback(async (
    organism: OrganismId,
    status: CertificateBindingStatus,
  ) => {
    setCertificateStatuses(prev => ({ ...prev, [organism]: status }));

    writeLedger({
      eventType: 'field_change',
      entityType: 'certificate_binding',
      entityId: organism,
      afterSnapshot: { organism, certificateStatus: status },
      metadata: { action: 'certificate_bound' },
    });
  }, [writeLedger]);

  // ── Update Format Validation ──────────────────────────────────────────────

  const updateFormatValidation = useCallback(async (
    organism: OrganismId,
    artifactType: string,
    status: FormatValidationStatus,
  ) => {
    setFormatValidations(prev => ({
      ...prev,
      [organism]: { ...prev[organism], [artifactType]: status },
    }));

    writeLedger({
      eventType: 'field_change',
      entityType: 'format_validation',
      entityId: `${organism}:${artifactType}`,
      afterSnapshot: { organism, artifactType, formatStatus: status },
      metadata: { action: 'format_validated' },
    });
  }, [writeLedger]);

  // ── Update Parser Status ──────────────────────────────────────────────────

  const updateParserStatus = useCallback(async (organism: OrganismId, verified: boolean) => {
    setParserStatuses(prev => ({ ...prev, [organism]: verified }));

    writeLedger({
      eventType: 'field_change',
      entityType: 'parser_verification',
      entityId: organism,
      afterSnapshot: { organism, parserVerified: verified },
      metadata: { action: 'parser_verified' },
    });
  }, [writeLedger]);

  // ── Mark Scenario Result ──────────────────────────────────────────────────

  const markScenarioResult = useCallback(async (
    scenarioId: string,
    status: ScenarioStatus,
    notes?: string,
  ) => {
    setScenarios(prev => prev.map(s =>
      s.id === scenarioId
        ? { ...s, status, executedAt: new Date().toISOString(), notes }
        : s
    ));

    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      writeLedger({
        eventType: status === 'passed' ? 'status_change' : 'field_change',
        entityType: `${scenario.phase}_scenario`,
        entityId: scenarioId,
        afterSnapshot: { scenarioId, organism: scenario.organism, phase: scenario.phase, status, notes },
        metadata: { action: `${scenario.phase}_scenario_${status}` },
      });
    }
  }, [scenarios, writeLedger]);

  // ── Evaluate Go-Live ──────────────────────────────────────────────────────

  const evaluateGoLive = useCallback((organism: OrganismId) => {
    const orgScenarios = scenarios.filter(s => s.organism === organism);
    const sandboxPassed = orgScenarios.filter(s => s.phase === 'sandbox' && s.status === 'passed').length;
    const uatPassed = orgScenarios.filter(s => s.phase === 'uat' && s.status === 'passed').length;

    return evaluateOrganismGoLiveReadiness({
      organism,
      credentials: credentialsByOrganism[organism] || [],
      certificateStatus: certificateStatuses[organism] || 'not_configured',
      formatStatuses: formatValidations[organism] || {},
      parserVerified: parserStatuses[organism] || false,
      sandboxPassedCount: sandboxPassed,
      uatPassedCount: uatPassed,
    });
  }, [credentialsByOrganism, certificateStatuses, formatValidations, parserStatuses, scenarios]);

  // ── Get Organism State ────────────────────────────────────────────────────

  const getOrganismState = useCallback((organism: OrganismId): CredentialOnboardingState => {
    const orgScenarios = scenarios.filter(s => s.organism === organism);
    const evaluation = evaluateGoLive(organism);

    return {
      organism,
      label: ORGANISM_LABELS[organism],
      credentials: credentialsByOrganism[organism] || [],
      certificateStatus: certificateStatuses[organism] || 'not_configured',
      certificatePurposes: ['firma', 'autenticacion', 'presentacion_oficial'],
      formatValidation: formatValidations[organism] || {},
      parserVerified: parserStatuses[organism] || false,
      sandboxScenarios: orgScenarios.filter(s => s.phase === 'sandbox'),
      uatScenarios: orgScenarios.filter(s => s.phase === 'uat'),
      readiness: evaluation.readinessLevel,
      goLiveEvaluation: evaluation,
      nextRecommendedAction: computeNextRecommendedAction(evaluation),
    };
  }, [credentialsByOrganism, certificateStatuses, formatValidations, parserStatuses, scenarios, evaluateGoLive]);

  // ── Blocker Matrix ────────────────────────────────────────────────────────

  const getGoLiveBlockerMatrix = useCallback(() => {
    return ALL_ORGANISMS.map(org => ({
      organism: org,
      label: ORGANISM_LABELS[org],
      evaluation: evaluateGoLive(org),
    }));
  }, [evaluateGoLive]);

  // ── All States ────────────────────────────────────────────────────────────

  const allOrganismStates = useMemo(() =>
    ALL_ORGANISMS.map(org => getOrganismState(org)),
    [getOrganismState]
  );

  return {
    allOrganismStates,
    getOrganismState,
    updateCredentialStatus,
    updateCertificateStatus,
    updateFormatValidation,
    updateParserStatus,
    markScenarioResult,
    evaluateGoLive,
    getGoLiveBlockerMatrix,
    scenarios,
  };
}
