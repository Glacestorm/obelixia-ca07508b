/**
 * agreementSafetyGate — B4.a
 *
 * Pure module that decides whether a collective agreement may drive
 * AUTOMATIC payroll computation (base salary, plus convenio, seniority,
 * extra payments, annual hours).
 *
 * Strict invariants:
 *  - No Supabase, no fetch, no React, no DB, no side effects.
 *  - Defaults are SAFE: in case of doubt, deny computation capabilities.
 *  - The operative table (`erp_hr_collective_agreements`, 106 rows) keeps
 *    its current behaviour: callers tag it as origin='operative' and the
 *    gate stays out of the way.
 *  - Registry-sourced agreements must satisfy ALL safety flags
 *    (mirroring the DB trigger `enforce_ca_registry_ready_for_payroll`)
 *    before being considered payroll-ready.
 *  - Legacy TS fallback never feeds automatic concepts; only informative.
 *
 * This module is NOT yet wired into payroll. B4.b/B4.c will integrate it
 * defensively into the resolver and bridge.
 */

// ── Types ──

export type AgreementOrigin =
  | 'operative'
  | 'registry'
  | 'legacy_ts_fallback'
  | 'unknown';

export type AgreementSafetyCode =
  | 'AGREEMENT_NOT_READY_FOR_PAYROLL'
  | 'AGREEMENT_REQUIRES_HUMAN_REVIEW'
  | 'AGREEMENT_MISSING_SALARY_TABLES'
  | 'AGREEMENT_NON_OFFICIAL_SOURCE'
  | 'AGREEMENT_STATUS_NOT_VIGENTE'
  | 'LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW'
  | 'MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT'
  | 'OPERATIVE_TABLE_AGREEMENT_NOT_MIRRORED'
  | 'AGREEMENT_CONFLICT_EMPLOYEE_VS_CONTRACT';

export interface AgreementSafetyDecision {
  allowed: boolean;
  origin: AgreementOrigin;
  blockReason?: AgreementSafetyCode;
  warnings: AgreementSafetyCode[];
  missing: string[];

  canComputeBaseSalary: boolean;
  canComputePlusConvenio: boolean;
  canComputeSeniority: boolean;
  canComputeExtraPayments: boolean;
  canComputeAnnualHours: boolean;
}

export interface AgreementSafetyInput {
  /**
   * Loaded agreement record. Shape is intentionally `any` because the
   * gate is consumed from multiple layers (registry, operative table,
   * legacy TS catalog). Only safety-relevant fields are inspected.
   */
  agreement: any | null;
  origin: AgreementOrigin;
  hasManualSalary: boolean;
}

// ── Helpers ──

/** All capability flags off. */
function noCapabilities(): Pick<
  AgreementSafetyDecision,
  | 'canComputeBaseSalary'
  | 'canComputePlusConvenio'
  | 'canComputeSeniority'
  | 'canComputeExtraPayments'
  | 'canComputeAnnualHours'
> {
  return {
    canComputeBaseSalary: false,
    canComputePlusConvenio: false,
    canComputeSeniority: false,
    canComputeExtraPayments: false,
    canComputeAnnualHours: false,
  };
}

/** All capability flags on. */
function fullCapabilities(): ReturnType<typeof noCapabilities> {
  return {
    canComputeBaseSalary: true,
    canComputePlusConvenio: true,
    canComputeSeniority: true,
    canComputeExtraPayments: true,
    canComputeAnnualHours: true,
  };
}

/**
 * Priority order when several registry checks fail. The first failing
 * condition (in this order) becomes `blockReason`; the rest are still
 * tracked via `missing[]`.
 */
const REGISTRY_BLOCK_PRIORITY: AgreementSafetyCode[] = [
  'AGREEMENT_NOT_READY_FOR_PAYROLL',
  'AGREEMENT_MISSING_SALARY_TABLES',
  'AGREEMENT_REQUIRES_HUMAN_REVIEW',
  'AGREEMENT_NON_OFFICIAL_SOURCE',
  'AGREEMENT_STATUS_NOT_VIGENTE',
];

function pickBlockReason(
  failed: Set<AgreementSafetyCode>
): AgreementSafetyCode | undefined {
  for (const code of REGISTRY_BLOCK_PRIORITY) {
    if (failed.has(code)) return code;
  }
  return undefined;
}

// ── Main API ──

export function evaluateAgreementForPayroll(
  input: AgreementSafetyInput
): AgreementSafetyDecision {
  const { agreement, origin, hasManualSalary } = input;

  // ── 1. Operative (current per-company table). Preserve behaviour. ──
  if (origin === 'operative') {
    return {
      allowed: true,
      origin,
      warnings: [],
      missing: [],
      ...fullCapabilities(),
    };
  }

  // ── 3/4/5. Unknown / null agreement paths handled before registry ──
  if (origin === 'unknown' || agreement === null || agreement === undefined) {
    if (origin !== 'legacy_ts_fallback') {
      if (hasManualSalary) {
        return {
          allowed: true,
          origin: 'unknown',
          warnings: ['MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT'],
          missing: ['validated_agreement'],
          ...noCapabilities(),
        };
      }
      return {
        allowed: false,
        origin: 'unknown',
        blockReason: 'AGREEMENT_NOT_READY_FOR_PAYROLL',
        warnings: [],
        missing: ['agreement', 'manual_salary'],
        ...noCapabilities(),
      };
    }
  }

  // ── Legacy TS fallback ──
  if (origin === 'legacy_ts_fallback') {
    return {
      allowed: true,
      origin,
      warnings: ['LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW'],
      missing: ['registry_validated_agreement'],
      ...noCapabilities(),
    };
  }

  // ── 2. Registry — full invariant check ──
  // (origin === 'registry' from here on, with non-null agreement)
  const a = agreement as Record<string, unknown>;
  const failed = new Set<AgreementSafetyCode>();
  const missing: string[] = [];

  if (a.ready_for_payroll !== true) {
    failed.add('AGREEMENT_NOT_READY_FOR_PAYROLL');
    missing.push('ready_for_payroll');
  }
  if (a.salary_tables_loaded !== true) {
    failed.add('AGREEMENT_MISSING_SALARY_TABLES');
    missing.push('salary_tables_loaded');
  }
  if (a.requires_human_review === true) {
    failed.add('AGREEMENT_REQUIRES_HUMAN_REVIEW');
    missing.push('human_review_completed');
  }
  if (a.source_quality !== 'official') {
    failed.add('AGREEMENT_NON_OFFICIAL_SOURCE');
    missing.push('official_source');
  }
  if (a.data_completeness !== 'human_validated') {
    // Tracked as missing; contributes to "not ready" rather than its own
    // top-priority block, but if nothing higher fired, the block reason
    // remains AGREEMENT_NOT_READY_FOR_PAYROLL (which will be set above
    // unless ready_for_payroll happens to be true).
    missing.push('human_validated');
    if (a.ready_for_payroll === true) {
      // Inconsistent state: ready=true but completeness != human_validated
      failed.add('AGREEMENT_REQUIRES_HUMAN_REVIEW');
    }
  }
  const status = a.status;
  if (status !== 'vigente' && status !== 'ultraactividad') {
    failed.add('AGREEMENT_STATUS_NOT_VIGENTE');
    missing.push('status_vigente');
  }
  if (a.official_submission_blocked === true) {
    missing.push('official_submission_unblocked');
    // Treated as not-ready if no other block fired.
    if (a.ready_for_payroll !== true) {
      failed.add('AGREEMENT_NOT_READY_FOR_PAYROLL');
    }
  }

  if (failed.size === 0 && missing.length === 0) {
    return {
      allowed: true,
      origin,
      warnings: [],
      missing: [],
      ...fullCapabilities(),
    };
  }

  return {
    allowed: false,
    origin,
    blockReason: pickBlockReason(failed) ?? 'AGREEMENT_NOT_READY_FOR_PAYROLL',
    warnings: [],
    missing,
    ...noCapabilities(),
  };
}

export default evaluateAgreementForPayroll;