/**
 * B3 — Collective Agreements data layer (read-only, DB-first + TS fallback)
 *
 * This module is the single read entry point to the collective agreements
 * Master Registry (`erp_hr_collective_agreements_registry`). It transparently
 * falls back to the legacy TypeScript catalog (`SPANISH_COLLECTIVE_AGREEMENTS`)
 * when no registry row matches.
 *
 * Hard guarantees (enforced by tests):
 *  - READ-ONLY: this layer never writes to the database.
 *  - SAFE BY DEFAULT: every record returned exposes the full safety profile
 *    (ready_for_payroll, requires_human_review, official_submission_blocked,
 *    salary_tables_loaded, data_completeness, source_quality).
 *  - NO PAYROLL: legacy TS records always come out with
 *    ready_for_payroll=false, official_submission_blocked=true.
 *  - HUMAN-IN-THE-LOOP: any ambiguous result emits a `WARNINGS` array.
 *
 * NOT included on purpose:
 *  - No write APIs. Mutations belong to import pipelines (B5+).
 *  - No payroll integration. The guard `canUseAgreementForPayroll` exists
 *    here but is intentionally NOT invoked by payroll engines yet (B4).
 */

import { supabase } from '@/integrations/supabase/client';
import { SPANISH_COLLECTIVE_AGREEMENTS } from '@/data/hr/collectiveAgreementsCatalog';
import {
  evaluateAgreementForPayroll,
  type AgreementOrigin,
  type AgreementSafetyDecision,
} from '@/engines/erp/hr/agreementSafetyGate';

// =============================================================
// Types
// =============================================================

export type SourceLayer = 'registry' | 'legacy_static';

/**
 * Extended source layer used by callers that may also be working against
 * the operational table (`erp_hr_collective_agreements`) or have not yet
 * resolved the origin. The data layer itself only ever produces
 * 'registry' or 'legacy_static'.
 */
export type ExtendedSourceLayer = SourceLayer | 'operative' | 'unknown';

export type RegistrySourceQuality =
  | 'official'
  | 'public_secondary'
  | 'pending_official_validation'
  | 'legacy_static';

export type RegistryDataCompleteness =
  | 'metadata_only'
  | 'salary_tables_loaded'
  | 'parsed_partial'
  | 'parsed_full'
  | 'human_validated';

export type RegistryStatus =
  | 'vigente'
  | 'vencido'
  | 'ultraactividad'
  | 'sustituido'
  | 'pendiente_validacion';

export type AgreementWarningCode =
  | 'LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW'
  | 'MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED'
  | 'JURISDICTION_MISMATCH'
  | 'BAKERY_WORKSHOP_REVIEW_REQUIRED'
  | 'TAKE_AWAY_VS_CONSUMPTION_REVIEW_REQUIRED'
  | 'METADATA_ONLY_NOT_PAYROLL_READY';

export interface UnifiedCollectiveAgreement {
  id?: string;
  internal_code: string;
  agreement_code?: string | null;
  official_name: string;
  short_name?: string | null;
  cnae_codes: string[];
  jurisdiction_code: string;
  province_code?: string | null;
  autonomous_region?: string | null;
  sector?: string | null;
  // Safety + governance
  sourceLayer: SourceLayer;
  source_quality: RegistrySourceQuality;
  data_completeness: RegistryDataCompleteness;
  status?: RegistryStatus;
  salary_tables_loaded: boolean;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  official_submission_blocked: boolean;
  notes?: string | null;
  warnings: AgreementWarningCode[];
  /**
   * B4.c — Safety decision attached after evaluation against
   * `agreementSafetyGate`. Optional because some legacy callers may still
   * receive the bare unified record. When present, the decision is
   * read-only and never causes DB writes nor payroll activation.
   */
  safety?: AgreementSafetyDecision;
}

export interface RankingInput {
  cnae: string;
  jurisdictionCode?: string;
  hasBakeryWorkshop?: boolean;
  hasRetailShop?: boolean;
  hasOnPremiseConsumption?: boolean;
  hasBroadFoodManufacturing?: boolean;
}

export interface PayrollGuardResult {
  allowed: boolean;
  reason?: string;
  requiredActions?: string[];
}

// =============================================================
// Internal helpers
// =============================================================

type RegistryRow = {
  id: string;
  internal_code: string;
  agreement_code: string | null;
  official_name: string;
  short_name: string | null;
  cnae_codes: string[];
  jurisdiction_code: string;
  province_code: string | null;
  autonomous_region: string | null;
  sector: string | null;
  status: RegistryStatus;
  source_quality: RegistrySourceQuality;
  data_completeness: RegistryDataCompleteness;
  salary_tables_loaded: boolean;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  official_submission_blocked: boolean;
  notes: string | null;
};

function normalizeRegistryRow(
  row: RegistryRow,
  warnings: AgreementWarningCode[] = []
): UnifiedCollectiveAgreement {
  const base: UnifiedCollectiveAgreement = {
    id: row.id,
    internal_code: row.internal_code,
    agreement_code: row.agreement_code,
    official_name: row.official_name,
    short_name: row.short_name,
    cnae_codes: row.cnae_codes ?? [],
    jurisdiction_code: row.jurisdiction_code,
    province_code: row.province_code,
    autonomous_region: row.autonomous_region,
    sector: row.sector,
    sourceLayer: 'registry',
    source_quality: row.source_quality,
    data_completeness: row.data_completeness,
    status: row.status,
    salary_tables_loaded: row.salary_tables_loaded,
    ready_for_payroll: row.ready_for_payroll,
    requires_human_review: row.requires_human_review,
    official_submission_blocked: row.official_submission_blocked,
    notes: row.notes,
    warnings: [...warnings],
  };
  return attachAgreementSafety(base);
}

function normalizeLegacyEntry(
  legacy: typeof SPANISH_COLLECTIVE_AGREEMENTS[number],
  extraWarnings: AgreementWarningCode[] = []
): UnifiedCollectiveAgreement {
  // Legacy TS entries are NEVER payroll-ready, regardless of how they look.
  const base: UnifiedCollectiveAgreement = {
    internal_code: legacy.code,
    official_name: legacy.name,
    short_name: legacy.name,
    cnae_codes: legacy.cnae_codes ?? [],
    jurisdiction_code: legacy.jurisdiction_code,
    province_code: null,
    autonomous_region: null,
    sector: null,
    sourceLayer: 'legacy_static',
    source_quality: 'legacy_static',
    data_completeness: 'metadata_only',
    status: 'pendiente_validacion',
    salary_tables_loaded: false,
    ready_for_payroll: false,
    requires_human_review: true,
    official_submission_blocked: true,
    notes: 'Legacy TS catalog fallback. Pending DB-first migration.',
    warnings: [
      'LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW',
      'METADATA_ONLY_NOT_PAYROLL_READY',
      ...extraWarnings,
    ],
  };
  return attachAgreementSafety(base);
}

// =============================================================
// B4.c — Safety attachment + sourceLayer→origin mapping
// =============================================================

/**
 * Pure mapping between the data layer's `sourceLayer` (or extended source
 * layer used by the bridge) and the safety gate's `AgreementOrigin`.
 *
 * - `'registry'` → `'registry'`
 * - `'legacy_static'` → `'legacy_ts_fallback'`
 * - `'operative'` → `'operative'` (no-op for the legacy DB table)
 * - `'unknown'` or undefined → `'unknown'`
 */
export function mapSourceLayerToOrigin(
  layer: ExtendedSourceLayer | undefined | null
): AgreementOrigin {
  switch (layer) {
    case 'registry':
      return 'registry';
    case 'legacy_static':
      return 'legacy_ts_fallback';
    case 'operative':
      return 'operative';
    case 'unknown':
    case undefined:
    case null:
    default:
      return 'unknown';
  }
}

/**
 * Attaches a `safety` decision (from `agreementSafetyGate`) to a unified
 * agreement record. Pure: never writes to DB, never mutates the input.
 * Defaults `hasManualSalary` to false because the data layer does not
 * know about contracts; callers that DO know should re-evaluate.
 */
export function attachAgreementSafety(
  agreement: UnifiedCollectiveAgreement,
  options?: { hasManualSalary?: boolean }
): UnifiedCollectiveAgreement {
  const origin = mapSourceLayerToOrigin(agreement.sourceLayer);
  const safety = evaluateAgreementForPayroll({
    agreement,
    origin,
    hasManualSalary: options?.hasManualSalary ?? false,
  });
  return { ...agreement, safety };
}

/**
 * Bridge helper (pure): given the resolved agreement (from any source) and
 * whether the contract declares a manual salary, returns the
 * `safetyContext` that the resolver expects. Defaults are SAFE: when no
 * agreement is provided and origin cannot be resolved, returns
 * `origin='unknown'` so the resolver enters defensive mode.
 */
export interface BridgeSafetyContext {
  agreementOrigin: AgreementOrigin;
  hasManualSalary: boolean;
  agreementRecord?: unknown;
}

export function buildBridgeSafetyContext(input: {
  agreement?: UnifiedCollectiveAgreement | null;
  sourceLayer?: ExtendedSourceLayer | null;
  hasManualSalary?: boolean;
}): BridgeSafetyContext {
  const layer = input.sourceLayer ?? input.agreement?.sourceLayer ?? 'unknown';
  return {
    agreementOrigin: mapSourceLayerToOrigin(layer),
    hasManualSalary: input.hasManualSalary ?? false,
    agreementRecord: input.agreement ?? undefined,
  };
}

// =============================================================
// 1. Get by internal code
// =============================================================

export async function getCollectiveAgreementByCode(
  code: string
): Promise<UnifiedCollectiveAgreement | null> {
  if (!code || typeof code !== 'string') return null;

  // DB first
  // Cast through unknown because the registry tables may be excluded from
  // generated types in some environments; the runtime contract is verified
  // by the schema test (B1).
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: RegistryRow | null; error: unknown }>;
        };
      };
    };
  };

  try {
    const { data, error } = await client
      .from('erp_hr_collective_agreements_registry')
      .select('*')
      .eq('internal_code', code)
      .maybeSingle();

    if (!error && data) {
      return normalizeRegistryRow(data);
    }
  } catch {
    // Fall through to TS fallback. Network/auth errors must not break
    // read paths that have a safe fallback.
  }

  // Legacy TS fallback
  const legacy = SPANISH_COLLECTIVE_AGREEMENTS.find(a => a.code === code);
  if (legacy) return normalizeLegacyEntry(legacy);

  return null;
}

// =============================================================
// 2. Get by CNAE
// =============================================================

export async function getCollectiveAgreementsByCnae(
  cnae: string,
  jurisdictionCode?: string
): Promise<UnifiedCollectiveAgreement[]> {
  if (!cnae) return [];
  const trimmed = cnae.trim();

  const client = supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        contains: (
          col: string,
          val: string[]
        ) => Promise<{ data: RegistryRow[] | null; error: unknown }>;
      };
    };
  };

  let registryRows: RegistryRow[] = [];
  try {
    const { data, error } = await client
      .from('erp_hr_collective_agreements_registry')
      .select('*')
      .contains('cnae_codes', [trimmed]);
    if (!error && Array.isArray(data)) {
      registryRows = data;
    }
  } catch {
    registryRows = [];
  }

  // Filter by jurisdiction if provided. We keep mismatches but flag them.
  let registryHits = registryRows.map(r => {
    const w: AgreementWarningCode[] = [];
    if (jurisdictionCode && r.jurisdiction_code !== jurisdictionCode) {
      // Allow national agreements (ES) when the request is for a region (ES-XX).
      if (!(r.jurisdiction_code === 'ES' && jurisdictionCode.startsWith('ES-'))) {
        w.push('JURISDICTION_MISMATCH');
      }
    }
    return normalizeRegistryRow(r, w);
  });

  if (jurisdictionCode) {
    // Prefer exact jurisdiction matches first (regional > national > others).
    registryHits = [
      ...registryHits.filter(h => h.jurisdiction_code === jurisdictionCode),
      ...registryHits.filter(
        h => h.jurisdiction_code === 'ES' && jurisdictionCode.startsWith('ES-')
      ),
      ...registryHits.filter(
        h =>
          h.jurisdiction_code !== jurisdictionCode &&
          !(h.jurisdiction_code === 'ES' && jurisdictionCode.startsWith('ES-'))
      ),
    ];
  }

  if (registryHits.length > 0) {
    if (registryHits.length > 1) {
      registryHits[0].warnings.push('MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED');
    }
    return registryHits;
  }

  // Fallback: legacy TS catalog by CNAE.
  const legacyHits = SPANISH_COLLECTIVE_AGREEMENTS
    .filter(a => a.cnae_codes?.includes(trimmed))
    .filter(a => !jurisdictionCode || a.jurisdiction_code === jurisdictionCode || a.jurisdiction_code === 'ES')
    .map(a => normalizeLegacyEntry(a));

  if (legacyHits.length > 1) {
    legacyHits[0].warnings.push('MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED');
  }
  return legacyHits;
}

// =============================================================
// 3. Baleares ranking
// =============================================================

/**
 * Pure ranking helper. Returns an ordered list of internal_code candidates
 * for Baleares activities. Always returns >= 0 candidates and never marks
 * any as definitive — final decision is human.
 */
export function rankCollectiveAgreementsForActivity(
  input: RankingInput
): { internal_code: string; warnings: AgreementWarningCode[] }[] {
  const cnae = (input.cnae ?? '').trim();
  const isBaleares =
    input.jurisdictionCode === 'ES-IB' ||
    input.jurisdictionCode === undefined ||
    input.jurisdictionCode === 'ES';
  const out: { internal_code: string; warnings: AgreementWarningCode[] }[] = [];

  // CNAE 1071/1072 — bakery/pastry industry
  if (cnae === '1071' || cnae === '1072') {
    if (isBaleares) {
      out.push({ internal_code: 'PAN-PAST-IB', warnings: [] });
      out.push({ internal_code: 'IND-ALIM-IB', warnings: [] });
    }
  }
  // CNAE 4724 — bakery/pastry retail point of sale
  else if (cnae === '4724') {
    if (isBaleares) {
      const w: AgreementWarningCode[] = ['MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED'];
      out.push({ internal_code: 'PAN-PAST-IB', warnings: w });
      out.push({ internal_code: 'COM-GEN-IB', warnings: w });
    }
  }
  // CNAE 47 — generic retail
  else if (cnae.startsWith('47')) {
    if (isBaleares) {
      out.push({
        internal_code: 'COM-GEN-IB',
        warnings: input.hasBakeryWorkshop ? ['BAKERY_WORKSHOP_REVIEW_REQUIRED'] : [],
      });
      if (input.hasBakeryWorkshop) {
        out.unshift({
          internal_code: 'PAN-PAST-IB',
          warnings: ['BAKERY_WORKSHOP_REVIEW_REQUIRED'],
        });
      }
    }
  }
  // CNAE 55/56 — hospitality
  else if (cnae.startsWith('55') || cnae.startsWith('56') || input.hasOnPremiseConsumption) {
    if (isBaleares) {
      out.push({
        internal_code: 'HOST-IB',
        warnings: input.hasOnPremiseConsumption
          ? []
          : ['TAKE_AWAY_VS_CONSUMPTION_REVIEW_REQUIRED'],
      });
    }
  }
  // CNAE 10 — broad food manufacturing
  else if (cnae === '10' || cnae.startsWith('10')) {
    if (isBaleares && input.hasBroadFoodManufacturing !== false) {
      out.push({ internal_code: 'IND-ALIM-IB', warnings: [] });
    }
  }

  return out;
}

// =============================================================
// 4. Payroll guard
// =============================================================

/**
 * Pure guard: returns whether an agreement may drive automatic payroll.
 * NOT integrated in payroll engines yet (B4 will integrate it).
 */
export function canUseAgreementForPayroll(
  agreement: Pick<
    UnifiedCollectiveAgreement,
    | 'ready_for_payroll'
    | 'salary_tables_loaded'
    | 'requires_human_review'
    | 'official_submission_blocked'
    | 'data_completeness'
    | 'source_quality'
    | 'sourceLayer'
    | 'internal_code'
  >
): PayrollGuardResult {
  const requiredActions: string[] = [];

  if (agreement.sourceLayer === 'legacy_static') {
    requiredActions.push('Migrate agreement to the Master Registry with verified BOE/REGCON source.');
  }
  if (!agreement.ready_for_payroll) {
    requiredActions.push('Set ready_for_payroll=true (only allowed after all other checks pass).');
  }
  if (!agreement.salary_tables_loaded) {
    requiredActions.push('Load and validate official salary tables.');
  }
  if (agreement.requires_human_review) {
    requiredActions.push('Complete human validation by a labor advisor.');
  }
  if (agreement.official_submission_blocked) {
    requiredActions.push('Unblock official_submission_blocked after manual sign-off.');
  }
  if (agreement.data_completeness !== 'human_validated') {
    requiredActions.push("Reach data_completeness='human_validated'.");
  }
  if (agreement.source_quality !== 'official') {
    requiredActions.push("Confirm source_quality='official' (BOE / BOIB / REGCON verified).");
  }

  if (requiredActions.length === 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Agreement '${agreement.internal_code}' is not payroll-ready.`,
    requiredActions,
  };
}

// =============================================================
// Exports for testing
// =============================================================

export const __internal = {
  normalizeRegistryRow,
  normalizeLegacyEntry,
};