/**
 * useOfficialIntegrationsSnapshot — Phase 2C (read-only, defensive)
 *
 * Read-only snapshot of the HR official-integrations connectors
 * (TGSS, SILTRA, CRA, SEPE Contrat@, Certific@2, AEAT 111/190, DELT@…).
 *
 * INVARIANTES:
 *  - NEVER calls `useOfficialReadinessMatrix.evaluate()`.
 *  - NEVER orchestrates `useTGSSReadiness` / `useContrataReadiness`
 *    (they are prop-driven).
 *  - NEVER writes to ledger / version registry / submissions.
 *  - NEVER marks `accepted` / `submitted` / `official_ready` without
 *    verifiable archived evidence.
 *  - Any DB read failure ⇒ gray snapshot (does NOT break the panel).
 *  - C3B3C2 stays BLOCKED · persisted_priority_apply OFF.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SectionReadiness } from '@/hooks/erp/hr/useHRCommandCenter';

// ── Types ───────────────────────────────────────────────────────────────────

export type OfficialIntegrationState =
  | 'not_configured'
  | 'credentials_pending'
  | 'certificate_pending'
  | 'sandbox_ready'
  | 'uat_in_progress'
  | 'uat_passed'
  | 'official_ready'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'correction_required';

export interface OfficialIntegrationItem {
  key: string;
  label: string;
  rawState: OfficialIntegrationState;
  displayedState: OfficialIntegrationState;
  hasEvidence: boolean;
  hasOfficialResponse: boolean;
  hasProductionCertificate: boolean;
  degraded: boolean;
  warning: string | null;
  score: number;
  lastUpdated: string | null;
}

export interface OfficialIntegrationsSnapshot extends SectionReadiness {
  disclaimer: string;
  items: OfficialIntegrationItem[];
  degradedCount: number;
  evidenceBackedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  correctionRequiredCount: number;
}

// ── Connector catalog (minimum required) ───────────────────────────────────

interface ConnectorDef {
  key: string;
  label: string;
  // Patterns that match submission_domain / submission_type / submission_subtype
  patterns: RegExp[];
  // Optional matching on certificate domain/label
  certPatterns?: RegExp[];
}

export const OFFICIAL_CONNECTORS: ConnectorDef[] = [
  {
    key: 'tgss_afiliacion',
    label: 'TGSS / Afiliación',
    patterns: [/tgss/i, /afiliaci/i, /\bafi\b/i],
    certPatterns: [/tgss/i, /siltra/i],
  },
  {
    key: 'siltra_rlc_rnt',
    label: 'SILTRA / RLC / RNT',
    patterns: [/siltra/i, /\brlc\b/i, /\brnt\b/i, /cret[aá]/i],
    certPatterns: [/siltra/i, /tgss/i],
  },
  {
    key: 'cra',
    label: 'CRA',
    patterns: [/\bcra\b/i, /comunicaci[oó]n.*retribuci/i],
    certPatterns: [/aeat/i],
  },
  {
    key: 'sepe_contrata',
    label: 'SEPE Contrat@',
    patterns: [/contrat[a@]/i, /\bsepe\b.*contrat/i],
    certPatterns: [/contrat[a@]/i, /sepe/i],
  },
  {
    key: 'sepe_certifica',
    label: 'SEPE Certific@2',
    patterns: [/certific[a@]/i, /certific@2/i],
    certPatterns: [/sepe/i, /certific/i],
  },
  {
    key: 'aeat_111',
    label: 'AEAT 111',
    patterns: [/\b111\b/i, /modelo.*111/i],
    certPatterns: [/aeat/i],
  },
  {
    key: 'aeat_190',
    label: 'AEAT 190',
    patterns: [/\b190\b/i, /modelo.*190/i],
    certPatterns: [/aeat/i],
  },
  {
    key: 'delta',
    label: 'DELT@',
    patterns: [/delt[a@]/i, /accidente.*trabajo/i],
  },
];

// ── Scoring per state ───────────────────────────────────────────────────────

const STATE_SCORE: Record<OfficialIntegrationState, number> = {
  not_configured: 0,
  credentials_pending: 10,
  certificate_pending: 20,
  sandbox_ready: 40,
  uat_in_progress: 50,
  uat_passed: 60,
  official_ready: 70,
  submitted: 70,
  accepted: 80,
  rejected: 20,
  correction_required: 30,
};

const SCORE_CAP = 80;

const DISCLAIMER =
  'Lectura interna de readiness. Ningún estado equivale a presentación oficial sin credencial, envío/UAT, respuesta oficial y evidencia archivada.';

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function isNonEmptyObject(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  return Object.keys(v as Record<string, unknown>).length > 0;
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

function matchesAny(text: string | null | undefined, patterns: RegExp[]): boolean {
  if (!text) return false;
  return patterns.some(p => p.test(text));
}

function submissionMatches(row: any, def: ConnectorDef): boolean {
  const haystack = [
    row?.submission_domain,
    row?.submission_type,
    row?.submission_subtype,
    row?.adapter_name,
    row?.system_name,
  ]
    .filter(Boolean)
    .map(String)
    .join(' | ');
  return matchesAny(haystack, def.patterns);
}

function adapterMatches(row: any, def: ConnectorDef): boolean {
  const haystack = [
    row?.adapter_name,
    row?.system_name,
    row?.adapter_type,
  ]
    .filter(Boolean)
    .map(String)
    .join(' | ');
  return matchesAny(haystack, def.patterns);
}

function certificateMatches(row: any, def: ConnectorDef): boolean {
  if (!def.certPatterns || def.certPatterns.length === 0) return false;
  const haystack = [
    row?.domain,
    row?.certificate_label,
    row?.certificate_type,
  ]
    .filter(Boolean)
    .map(String)
    .join(' | ');
  return matchesAny(haystack, def.certPatterns);
}

/** Has at least one piece of archived/verifiable evidence. */
function detectEvidence(row: any): boolean {
  if (!row) return false;
  return (
    isNonEmptyString(row.evidence_id) ||
    isNonEmptyString(row.evidence_url) ||
    isNonEmptyString(row.evidence_path) ||
    isNonEmptyString(row.ledger_entry_id) ||
    isNonEmptyString(row.immutable_ledger_id) ||
    isNonEmptyString(row.hash) ||
    isNonEmptyString(row.sha256) ||
    isNonEmptyString(row.receipt_url) ||
    isNonEmptyString(row.receipt_id) ||
    isNonEmptyString(row.external_reference) ||
    isNonEmptyObject(row.response_payload) ||
    isNonEmptyObject(row.official_response) ||
    isNonEmptyString(row.file_url)
  );
}

/**
 * Has an OFFICIAL response artifact.
 * NOTE: `external_reference` is NOT enough on its own — it can be a local
 * tracking id without any official acknowledgement.
 */
function detectOfficialResponse(row: any): boolean {
  if (!row) return false;
  return (
    isNonEmptyObject(row.response_payload) ||
    isNonEmptyObject(row.official_response) ||
    isNonEmptyString(row.receipt_id) ||
    isNonEmptyString(row.receipt_url) ||
    isNonEmptyString(row.accepted_at) ||
    isNonEmptyString(row.rejected_at)
  );
}

/**
 * Has a VALID production certificate.
 * Strict rules: status must be `active` or `valid` (preparatory / configured
 * / pending / draft do NOT count), environment must be production/prod,
 * and the expiration date (if present) must be in the future.
 */
function detectProductionCertificate(certs: any[]): boolean {
  if (!Array.isArray(certs) || certs.length === 0) return false;
  const now = Date.now();
  return certs.some(c => {
    const status = String(c?.certificate_status || c?.status || '')
      .toLowerCase()
      .trim();
    const env = String(c?.environment || '').toLowerCase().trim();
    const isActive = status === 'active' || status === 'valid';
    const isProd = env === 'production' || env === 'prod';
    if (!isActive || !isProd) return false;
    const exp = c?.expiration_date ?? c?.expires_at ?? null;
    if (!exp) return true;
    const t = Date.parse(String(exp));
    if (Number.isNaN(t)) return true;
    return t > now;
  });
}

/** Normalize raw status from a submission row into our union type. */
function normalizeRawState(row: any): OfficialIntegrationState {
  const s = String(row?.status || row?.readiness_status || '').toLowerCase().trim();
  if (!s) return 'not_configured';
  if (s === 'accepted' || s === 'success' || s === 'aceptado') return 'accepted';
  if (s === 'rejected' || s === 'failed' || s === 'rechazado' || s === 'error') return 'rejected';
  if (s === 'submitted' || s === 'sent' || s === 'enviado') return 'submitted';
  if (s === 'official_ready') return 'official_ready';
  if (s === 'uat_passed') return 'uat_passed';
  if (s === 'uat_in_progress' || s === 'in_progress' || s === 'pending') return 'uat_in_progress';
  if (s === 'sandbox_ready' || s === 'sandbox') return 'sandbox_ready';
  if (s === 'certificate_pending' || s === 'cert_pending') return 'certificate_pending';
  if (s === 'credentials_pending') return 'credentials_pending';
  if (s === 'correction_required' || s === 'requires_correction') return 'correction_required';
  if (s === 'not_configured' || s === 'draft') return 'not_configured';
  return 'not_configured';
}

/** Apply degradation rules. */
function applyDegradation(args: {
  rawState: OfficialIntegrationState;
  hasEvidence: boolean;
  hasOfficialResponse: boolean;
  hasProductionCertificate: boolean;
}): { displayedState: OfficialIntegrationState; degraded: boolean; warning: string | null } {
  const { rawState, hasEvidence, hasOfficialResponse, hasProductionCertificate } = args;

  if (rawState === 'accepted' && (!hasEvidence || !hasOfficialResponse)) {
    return {
      displayedState: 'uat_passed',
      degraded: true,
      warning: 'Estado no elevable a accepted sin evidencia oficial archivada',
    };
  }
  if (rawState === 'submitted' && !hasEvidence) {
    return {
      displayedState: 'uat_in_progress',
      degraded: true,
      warning: 'Envío no elevable a submitted sin evidencia archivada',
    };
  }
  if (rawState === 'official_ready' && !hasProductionCertificate) {
    return {
      displayedState: 'sandbox_ready',
      degraded: true,
      warning: 'official_ready requiere certificado productivo válido',
    };
  }
  return { displayedState: rawState, degraded: false, warning: null };
}

/** Build a single connector item from raw row matches. */
export function buildConnectorItem(
  def: ConnectorDef,
  submissionRow: any | null,
  certRows: any[],
  adapterRow: any | null,
): OfficialIntegrationItem {
  // No data at all for this connector
  if (!submissionRow && certRows.length === 0 && !adapterRow) {
    return {
      key: def.key,
      label: def.label,
      rawState: 'not_configured',
      displayedState: 'not_configured',
      hasEvidence: false,
      hasOfficialResponse: false,
      hasProductionCertificate: false,
      degraded: false,
      warning: null,
      score: STATE_SCORE.not_configured,
      lastUpdated: null,
    };
  }

  let rawState: OfficialIntegrationState = 'not_configured';
  if (submissionRow) {
    rawState = normalizeRawState(submissionRow);
  } else if (adapterRow) {
    // Adapter exists but no submission yet → at most credentials/cert pending
    const aStatus = String(adapterRow?.status || '').toLowerCase();
    if (aStatus === 'active' || aStatus === 'enabled') {
      rawState = certRows.length > 0 ? 'sandbox_ready' : 'certificate_pending';
    } else {
      rawState = 'credentials_pending';
    }
  } else if (certRows.length > 0) {
    rawState = 'certificate_pending';
  }

  const hasEvidence = detectEvidence(submissionRow);
  const hasOfficialResponse = detectOfficialResponse(submissionRow);
  const hasProductionCertificate = detectProductionCertificate(certRows);

  const { displayedState, degraded, warning } = applyDegradation({
    rawState,
    hasEvidence,
    hasOfficialResponse,
    hasProductionCertificate,
  });

  const score = Math.min(STATE_SCORE[displayedState] ?? 0, SCORE_CAP);
  const lastUpdated =
    submissionRow?.updated_at ||
    submissionRow?.created_at ||
    adapterRow?.updated_at ||
    adapterRow?.last_execution_at ||
    certRows[0]?.updated_at ||
    null;

  return {
    key: def.key,
    label: def.label,
    rawState,
    displayedState,
    hasEvidence,
    hasOfficialResponse,
    hasProductionCertificate,
    degraded,
    warning,
    score,
    lastUpdated,
  };
}

/** Pure builder used both by the hook and by tests. */
export function buildOfficialIntegrationsSnapshot(args: {
  submissions: any[];
  certificates: any[];
  adapters: any[];
}): OfficialIntegrationsSnapshot {
  const { submissions, certificates, adapters } = args;

  const items: OfficialIntegrationItem[] = OFFICIAL_CONNECTORS.map(def => {
    // Pick most recent matching submission
    const matchingSubs = submissions
      .filter(s => submissionMatches(s, def))
      .sort((a, b) => {
        const ta = Date.parse(String(a?.updated_at || a?.created_at || 0)) || 0;
        const tb = Date.parse(String(b?.updated_at || b?.created_at || 0)) || 0;
        return tb - ta;
      });
    const submissionRow = matchingSubs[0] ?? null;

    const matchingCerts = certificates.filter(c => certificateMatches(c, def));
    const matchingAdapter = adapters.find(a => adapterMatches(a, def)) ?? null;

    return buildConnectorItem(def, submissionRow, matchingCerts, matchingAdapter);
  });

  const degradedCount = items.filter(i => i.degraded).length;
  const evidenceBackedCount = items.filter(i => i.hasEvidence).length;
  const acceptedCount = items.filter(i => i.displayedState === 'accepted').length;
  const rejectedCount = items.filter(i => i.displayedState === 'rejected').length;
  const correctionRequiredCount = items.filter(
    i => i.displayedState === 'correction_required',
  ).length;

  const allNotConfigured = items.every(i => i.displayedState === 'not_configured');

  // Score: prudent average across ALL connectors (not just configured ones)
  // so missing connectors don't inflate readiness.
  let score: number | null = null;
  if (!allNotConfigured && items.length > 0) {
    const avg = items.reduce((acc, i) => acc + i.score, 0) / items.length;
    score = Math.round(clamp(Math.min(avg, SCORE_CAP)));
  }

  let level: SectionReadiness['level'];
  let label: string;
  let blockers = 0;
  let warnings = 0;

  if (allNotConfigured || score === null) {
    level = 'gray';
    label = 'Sin datos oficiales';
  } else if (rejectedCount > 0) {
    level = 'red';
    blockers = rejectedCount;
    label = 'Incidencia oficial';
  } else if (degradedCount > 0 || correctionRequiredCount > 0) {
    level = 'amber';
    warnings = degradedCount + correctionRequiredCount;
    label = 'Revisión oficial';
  } else {
    // Coverage-driven: green only if score is meaningfully high
    if (score >= 70) {
      level = 'green';
      label = 'Readiness operativo';
    } else if (score >= 40) {
      level = 'amber';
      label = 'Configuración parcial';
    } else {
      level = 'red';
      label = 'Configuración incompleta';
    }
  }

  return {
    level,
    score,
    label,
    hasData: !allNotConfigured,
    blockers,
    warnings,
    disclaimer: DISCLAIMER,
    items,
    degradedCount,
    evidenceBackedCount,
    acceptedCount,
    rejectedCount,
    correctionRequiredCount,
  };
}

/** Empty snapshot used when companyId is missing or queries fail entirely. */
export function emptyOfficialIntegrationsSnapshot(): OfficialIntegrationsSnapshot {
  return buildOfficialIntegrationsSnapshot({
    submissions: [],
    certificates: [],
    adapters: [],
  });
}

// ── React hook ──────────────────────────────────────────────────────────────

export function useOfficialIntegrationsSnapshot(
  companyId: string | null | undefined,
): { snapshot: OfficialIntegrationsSnapshot; isLoading: boolean } {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [adapters, setAdapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setSubmissions([]); setCertificates([]); setAdapters([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Defensive parallel reads. Each failure ⇒ empty array, no throw.
    const safeRead = async <T,>(fn: () => Promise<{ data: T[] | null; error: any }>): Promise<T[]> => {
      try {
        const { data, error } = await fn();
        if (error) return [];
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    Promise.all([
      safeRead(() =>
        (supabase as any)
          .from('hr_official_submissions')
          .select('*')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false })
          .limit(100)
          .then((r: any) => r),
      ),
      safeRead(() =>
        (supabase as any)
          .from('erp_hr_domain_certificates')
          .select('*')
          .eq('company_id', companyId)
          .then((r: any) => r),
      ),
      safeRead(() =>
        (supabase as any)
          .from('hr_integration_adapters')
          .select('*')
          .eq('company_id', companyId)
          .then((r: any) => r),
      ),
    ]).then(([subs, certs, adps]) => {
      if (cancelled) return;
      setSubmissions(subs);
      setCertificates(certs);
      setAdapters(adps);
      setIsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setSubmissions([]); setCertificates([]); setAdapters([]);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [companyId]);

  const snapshot = useMemo(
    () => buildOfficialIntegrationsSnapshot({ submissions, certificates, adapters }),
    [submissions, certificates, adapters],
  );

  return { snapshot, isLoading };
}

export default useOfficialIntegrationsSnapshot;
