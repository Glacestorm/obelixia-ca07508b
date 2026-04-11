/**
 * useCredentialOnboarding.ts — LM4: Credential & Sandbox State Management
 *
 * Persists state in hr_domain_certificates metadata (namespaced).
 * Loads on mount, saves on every change.
 * All changes generate ledger events for traceability.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  type EvidenceDocumentRef,
  type PersistedOnboardingState,
  ALL_ORGANISMS,
  ORGANISM_LABELS,
  ORGANISM_SANDBOX_SCENARIOS,
  ONBOARDING_METADATA_NAMESPACE,
  ONBOARDING_SCHEMA_VERSION,
  evaluateOrganismGoLiveReadiness,
  computeNextRecommendedAction,
  buildDefaultCredentials,
  buildDefaultCertificateStatuses,
  buildDefaultFormatValidations,
  buildDefaultParserStatuses,
} from '@/engines/erp/hr/credentialOnboardingEngine';
import type { FormatValidationStatus } from '@/engines/erp/hr/officialFormatValidatorEngine';
import { useHRLedgerWriter } from './useHRLedgerWriter';

// ── Persistence record ID — one row per company ─────────────────────────────
const PERSISTENCE_CERT_NAME = '__credential_onboarding_state__';

export function useCredentialOnboarding(companyId: string) {
  const { writeLedger } = useHRLedgerWriter(companyId, 'credential_onboarding');
  const [isLoaded, setIsLoaded] = useState(false);
  const persistDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State
  const [credentialsByOrganism, setCredentialsByOrganism] = useState<Record<OrganismId, CredentialEntry[]>>(buildDefaultCredentials);
  const [certificateStatuses, setCertificateStatuses] = useState<Record<OrganismId, CertificateBindingStatus>>(buildDefaultCertificateStatuses);
  const [formatValidations, setFormatValidations] = useState<Record<OrganismId, Record<string, FormatValidationStatus>>>(buildDefaultFormatValidations);
  const [parserStatuses, setParserStatuses] = useState<Record<OrganismId, boolean>>(buildDefaultParserStatuses);
  const [scenarios, setScenarios] = useState<SandboxScenario[]>(() => ORGANISM_SANDBOX_SCENARIOS.map(s => ({ ...s })));
  const [lastReviewedAt, setLastReviewedAt] = useState<string | undefined>();

  // ── Load from DB ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('hr_domain_certificates')
          .select('metadata')
          .eq('company_id', companyId)
          .eq('certificate_name', PERSISTENCE_CERT_NAME)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.warn('[useCredentialOnboarding] load error:', error.message);
          setIsLoaded(true);
          return;
        }

        const raw = data?.metadata;
        if (!raw || typeof raw !== 'object') {
          setIsLoaded(true);
          return;
        }

        const ns = (raw as Record<string, unknown>)[ONBOARDING_METADATA_NAMESPACE] as PersistedOnboardingState | undefined;
        if (!ns || ns.schemaVersion !== ONBOARDING_SCHEMA_VERSION) {
          setIsLoaded(true);
          return;
        }

        // Merge persisted state over defaults
        const defaultCreds = buildDefaultCredentials();
        if (ns.credentials) {
          ALL_ORGANISMS.forEach(org => {
            if (ns.credentials[org]) {
              defaultCreds[org] = defaultCreds[org].map(dc => {
                const saved = ns.credentials[org].find(c => c.type === dc.type);
                return saved ? { ...dc, ...saved } : dc;
              });
            }
          });
          setCredentialsByOrganism(defaultCreds);
        }

        if (ns.certificateStatuses) {
          setCertificateStatuses(prev => ({ ...prev, ...ns.certificateStatuses }));
        }
        if (ns.formatValidations) {
          setFormatValidations(prev => {
            const merged = { ...prev };
            ALL_ORGANISMS.forEach(org => {
              if (ns.formatValidations[org]) merged[org] = { ...prev[org], ...ns.formatValidations[org] };
            });
            return merged;
          });
        }
        if (ns.parserStatuses) {
          setParserStatuses(prev => ({ ...prev, ...ns.parserStatuses }));
        }
        if (ns.scenarios && Array.isArray(ns.scenarios)) {
          setScenarios(prev => prev.map(s => {
            const saved = ns.scenarios.find(ps => ps.id === s.id);
            return saved ? { ...s, ...saved } : s;
          }));
        }
        setLastReviewedAt(ns.updatedAt);
      } catch (err) {
        console.error('[useCredentialOnboarding] load failed:', err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [companyId]);

  // ── Persist to DB (debounced) ─────────────────────────────────────────────

  const persistState = useCallback(async (
    creds: Record<OrganismId, CredentialEntry[]>,
    certs: Record<OrganismId, CertificateBindingStatus>,
    fmts: Record<OrganismId, Record<string, FormatValidationStatus>>,
    parsers: Record<OrganismId, boolean>,
    scens: SandboxScenario[],
  ) => {
    if (!companyId) return;

    const now = new Date().toISOString();
    const persistedState: PersistedOnboardingState = {
      schemaVersion: ONBOARDING_SCHEMA_VERSION,
      updatedAt: now,
      credentials: creds,
      certificateStatuses: certs,
      formatValidations: fmts,
      parserStatuses: parsers,
      scenarios: scens.map(s => ({
        id: s.id,
        status: s.status,
        executedAt: s.executedAt,
        notes: s.notes,
        evidenceDocuments: s.evidenceDocuments || [],
      })),
    };

    // Read existing metadata to merge defensively
    try {
      const { data: existing } = await (supabase as any)
        .from('hr_domain_certificates')
        .select('id, metadata')
        .eq('company_id', companyId)
        .eq('certificate_name', PERSISTENCE_CERT_NAME)
        .maybeSingle();

      const existingMeta = (existing?.metadata && typeof existing.metadata === 'object') ? existing.metadata : {};
      const mergedMeta = {
        ...existingMeta,
        [ONBOARDING_METADATA_NAMESPACE]: persistedState,
      };

      if (existing?.id) {
        await (supabase as any)
          .from('hr_domain_certificates')
          .update({ metadata: mergedMeta, updated_at: now })
          .eq('id', existing.id);
      } else {
        await (supabase as any)
          .from('hr_domain_certificates')
          .insert({
            company_id: companyId,
            certificate_name: PERSISTENCE_CERT_NAME,
            certificate_type: 'system',
            status: 'active',
            metadata: mergedMeta,
          });
      }
      setLastReviewedAt(now);
    } catch (err) {
      console.error('[useCredentialOnboarding] persist error:', err);
    }
  }, [companyId]);

  const schedulePersist = useCallback((
    creds: Record<OrganismId, CredentialEntry[]>,
    certs: Record<OrganismId, CertificateBindingStatus>,
    fmts: Record<OrganismId, Record<string, FormatValidationStatus>>,
    parsers: Record<OrganismId, boolean>,
    scens: SandboxScenario[],
  ) => {
    if (persistDebounce.current) clearTimeout(persistDebounce.current);
    persistDebounce.current = setTimeout(() => {
      persistState(creds, certs, fmts, parsers, scens);
    }, 800);
  }, [persistState]);

  // ── Update Credential Status ──────────────────────────────────────────────

  const updateCredentialStatus = useCallback(async (
    organism: OrganismId,
    credentialType: CredentialType,
    status: CredentialStatus,
    opts?: { notes?: string; validationDate?: string; expirationDate?: string; evidence?: EvidenceDocumentRef },
  ) => {
    setCredentialsByOrganism(prev => {
      const updated = {
        ...prev,
        [organism]: prev[organism].map(c =>
          c.type === credentialType
            ? {
                ...c,
                status,
                configuredAt: (status === 'configured' || status === 'validated') ? new Date().toISOString() : c.configuredAt,
                validationDate: opts?.validationDate || c.validationDate,
                expirationDate: opts?.expirationDate || c.expirationDate,
                reviewNotes: opts?.notes ?? c.reviewNotes,
                evidenceDocuments: opts?.evidence
                  ? [...(c.evidenceDocuments || []), opts.evidence]
                  : (c.evidenceDocuments || []),
              }
            : c
        ),
      };
      schedulePersist(updated, certificateStatuses, formatValidations, parserStatuses, scenarios);
      return updated;
    });

    writeLedger({
      eventType: 'master_data_changed',
      entityType: 'credential_onboarding',
      entityId: `${organism}:${credentialType}`,
      afterSnapshot: { organism, credentialType, status, ...opts },
      metadata: { action: 'credential_configured' },
    });
  }, [writeLedger, certificateStatuses, formatValidations, parserStatuses, scenarios, schedulePersist]);

  // ── Update Certificate Status ─────────────────────────────────────────────

  const updateCertificateStatus = useCallback(async (
    organism: OrganismId,
    status: CertificateBindingStatus,
  ) => {
    setCertificateStatuses(prev => {
      const updated = { ...prev, [organism]: status };
      schedulePersist(credentialsByOrganism, updated, formatValidations, parserStatuses, scenarios);
      return updated;
    });

    writeLedger({
      eventType: 'master_data_changed',
      entityType: 'certificate_binding',
      entityId: organism,
      afterSnapshot: { organism, certificateStatus: status },
      metadata: { action: 'certificate_bound' },
    });
  }, [writeLedger, credentialsByOrganism, formatValidations, parserStatuses, scenarios, schedulePersist]);

  // ── Update Format Validation ──────────────────────────────────────────────

  const updateFormatValidation = useCallback(async (
    organism: OrganismId,
    artifactType: string,
    status: FormatValidationStatus,
  ) => {
    setFormatValidations(prev => {
      const updated = { ...prev, [organism]: { ...prev[organism], [artifactType]: status } };
      schedulePersist(credentialsByOrganism, certificateStatuses, updated, parserStatuses, scenarios);
      return updated;
    });

    writeLedger({
      eventType: 'system_event',
      entityType: 'format_validation',
      entityId: `${organism}:${artifactType}`,
      afterSnapshot: { organism, artifactType, formatStatus: status },
      metadata: { action: 'format_validated' },
    });
  }, [writeLedger, credentialsByOrganism, certificateStatuses, parserStatuses, scenarios, schedulePersist]);

  // ── Update Parser Status ──────────────────────────────────────────────────

  const updateParserStatus = useCallback(async (organism: OrganismId, verified: boolean) => {
    setParserStatuses(prev => {
      const updated = { ...prev, [organism]: verified };
      schedulePersist(credentialsByOrganism, certificateStatuses, formatValidations, updated, scenarios);
      return updated;
    });

    writeLedger({
      eventType: 'system_event',
      entityType: 'parser_verification',
      entityId: organism,
      afterSnapshot: { organism, parserVerified: verified },
      metadata: { action: 'parser_verified' },
    });
  }, [writeLedger, credentialsByOrganism, certificateStatuses, formatValidations, scenarios, schedulePersist]);

  // ── Mark Scenario Result ──────────────────────────────────────────────────

  const markScenarioResult = useCallback(async (
    scenarioId: string,
    status: ScenarioStatus,
    opts?: { notes?: string; evidence?: EvidenceDocumentRef },
  ) => {
    setScenarios(prev => {
      const updated = prev.map(s =>
        s.id === scenarioId
          ? {
              ...s,
              status,
              executedAt: new Date().toISOString(),
              notes: opts?.notes ?? s.notes,
              evidenceDocuments: opts?.evidence
                ? [...(s.evidenceDocuments || []), opts.evidence]
                : (s.evidenceDocuments || []),
            }
          : s
      );
      schedulePersist(credentialsByOrganism, certificateStatuses, formatValidations, parserStatuses, updated);
      return updated;
    });

    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      writeLedger({
        eventType: 'system_event',
        entityType: `${scenario.phase}_scenario`,
        entityId: scenarioId,
        afterSnapshot: { scenarioId, organism: scenario.organism, phase: scenario.phase, status, ...opts },
        metadata: { action: `${scenario.phase}_scenario_${status}` },
      });
    }
  }, [scenarios, writeLedger, credentialsByOrganism, certificateStatuses, formatValidations, parserStatuses, schedulePersist]);

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
      lastReviewedAt,
    };
  }, [credentialsByOrganism, certificateStatuses, formatValidations, parserStatuses, scenarios, evaluateGoLive, lastReviewedAt]);

  // ── Blocker Matrix ────────────────────────────────────────────────────────

  const getGoLiveBlockerMatrix = useCallback(() => {
    return ALL_ORGANISMS.map(org => ({
      organism: org,
      label: ORGANISM_LABELS[org],
      evaluation: evaluateGoLive(org),
    }));
  }, [evaluateGoLive]);

  // ── Go-Live Ready Count ───────────────────────────────────────────────────

  const goLiveReadyCount = useMemo(() => {
    return ALL_ORGANISMS.filter(org => evaluateGoLive(org).canGoLive).length;
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
    goLiveReadyCount,
    scenarios,
    isLoaded,
    lastReviewedAt,
  };
}
