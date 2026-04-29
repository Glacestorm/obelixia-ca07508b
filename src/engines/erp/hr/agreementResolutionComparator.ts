/**
 * B10B — Pure comparator: Operative agreement resolution vs Registry preview.
 *
 * HARD SAFETY (B10B):
 *  - Pure, deterministic, side-effect-free.
 *  - No Supabase, no fetch, no React, no hooks, no DB.
 *  - Does NOT import payroll engine, payslip engine, salary normalizer,
 *    operative agreement resolver, or the ES payroll bridge.
 *  - Does NOT touch the operational collective agreements table
 *    (the legacy non-registry one).
 *  - Does NOT change real payroll output. Diff/preview only.
 *  - Consumed by future B10C (shadow bridge with hardcoded flag OFF).
 *    Real apply is reserved for B10D.
 *
 * Only type-level imports from the B10A pure resolver are allowed.
 */

import type {
  RegistryResolutionPreview,
  RegistryAgreementPreviewConcept,
} from './registryAwareAgreementResolver';

// ===================== Types =====================

export type AgreementResolutionDiffSeverity = 'critical' | 'warning' | 'info';

export interface OperativeAgreementResolutionSnapshot {
  source: 'operative';
  salaryBaseMonthly?: number | null;
  salaryBaseAnnual?: number | null;
  plusConvenio?: number | null;
  plusTransport?: number | null;
  plusAntiguedad?: number | null;
  extraPayAmount?: number | null;
  annualHours?: number | null;
  seniorityRule?: string | null;
  rawConcepts?: Array<{
    code: string;
    label: string;
    amount: number;
  }>;
  warnings?: string[];
}

export interface AgreementResolutionDiff {
  field: string;
  severity: AgreementResolutionDiffSeverity;
  operativeValue: unknown;
  registryValue: unknown;
  detail: string;
}

export interface AgreementResolutionComparisonReport {
  canApplyRegistrySafely: boolean;
  hasCriticalDiffs: boolean;
  hasWarnings: boolean;
  diffs: AgreementResolutionDiff[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface CompareInput {
  operative: OperativeAgreementResolutionSnapshot;
  registryPreview: RegistryResolutionPreview;
  toleranceEuros?: number;
}

// ===================== Constants =====================

const DEFAULT_TOLERANCE_EUROS = 0.02;
const MONTHLY_CRITICAL_THRESHOLD = 5;
const ANNUAL_CRITICAL_THRESHOLD = 60;

type AmountCadence = 'monthly' | 'annual';

interface FieldMapEntry {
  operativeField: keyof OperativeAgreementResolutionSnapshot;
  registryConceptCode: string;
  cadence: AmountCadence;
}

const FIELD_MAP: ReadonlyArray<FieldMapEntry> = [
  {
    operativeField: 'salaryBaseMonthly',
    registryConceptCode: 'REGISTRY_SALARY_BASE_MONTHLY',
    cadence: 'monthly',
  },
  {
    operativeField: 'salaryBaseAnnual',
    registryConceptCode: 'REGISTRY_SALARY_BASE_ANNUAL',
    cadence: 'annual',
  },
  {
    operativeField: 'plusConvenio',
    registryConceptCode: 'REGISTRY_PLUS_CONVENIO',
    cadence: 'monthly',
  },
  {
    operativeField: 'plusTransport',
    registryConceptCode: 'REGISTRY_PLUS_TRANSPORT',
    cadence: 'monthly',
  },
  {
    operativeField: 'plusAntiguedad',
    registryConceptCode: 'REGISTRY_PLUS_ANTIGUEDAD',
    cadence: 'monthly',
  },
  {
    operativeField: 'extraPayAmount',
    registryConceptCode: 'REGISTRY_EXTRA_PAY_AMOUNT',
    cadence: 'monthly',
  },
];

const MAPPED_REGISTRY_CODES: ReadonlySet<string> = new Set(
  FIELD_MAP.map((f) => f.registryConceptCode),
);

// ===================== Helpers =====================

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function classifyAmountSeverity(
  delta: number,
  cadence: AmountCadence,
  tolerance: number,
): AgreementResolutionDiffSeverity | null {
  const abs = Math.abs(delta);
  if (abs <= tolerance) return null;
  const criticalThreshold =
    cadence === 'annual' ? ANNUAL_CRITICAL_THRESHOLD : MONTHLY_CRITICAL_THRESHOLD;
  if (abs > criticalThreshold) return 'critical';
  return 'warning';
}

function findRegistryConcept(
  preview: RegistryResolutionPreview,
  code: string,
): RegistryAgreementPreviewConcept | undefined {
  return preview.conceptsPreview.find((c) => c.code === code);
}

function pushDiff(
  diffs: AgreementResolutionDiff[],
  diff: AgreementResolutionDiff,
): void {
  diffs.push(diff);
}

// ===================== Main =====================

export function compareOperativeVsRegistryAgreementResolution(
  input: CompareInput,
): AgreementResolutionComparisonReport {
  const tolerance =
    typeof input.toleranceEuros === 'number' && Number.isFinite(input.toleranceEuros)
      ? Math.max(0, input.toleranceEuros)
      : DEFAULT_TOLERANCE_EUROS;

  const { operative, registryPreview } = input;
  const diffs: AgreementResolutionDiff[] = [];

  // === Special case: registry preview not usable ===
  if (registryPreview.canUseForPayroll !== true) {
    pushDiff(diffs, {
      field: 'registryPreview',
      severity: 'critical',
      operativeValue: null,
      registryValue: {
        canUseForPayroll: registryPreview.canUseForPayroll,
        blockers: [...registryPreview.blockers],
      },
      detail: `registry_preview_not_usable: blockers=[${registryPreview.blockers.join(',')}]`,
    });

    return finalize(diffs, /*registryUsable*/ false);
  }

  // === Amount comparisons ===
  for (const entry of FIELD_MAP) {
    const opVal = operative[entry.operativeField] as number | null | undefined;
    const regConcept = findRegistryConcept(registryPreview, entry.registryConceptCode);
    const regVal = regConcept ? regConcept.amount : undefined;

    const opPresent = isFiniteNumber(opVal);
    const regPresent = isFiniteNumber(regVal);

    if (!opPresent && !regPresent) {
      continue;
    }

    if (opPresent && !regPresent) {
      pushDiff(diffs, {
        field: `missing_registry_concept:${entry.registryConceptCode}`,
        severity: 'warning',
        operativeValue: opVal,
        registryValue: null,
        detail: `Operative has ${entry.operativeField}=${opVal} but registry has no concept ${entry.registryConceptCode}.`,
      });
      continue;
    }

    if (!opPresent && regPresent) {
      pushDiff(diffs, {
        field: `extra_registry_concept:${entry.registryConceptCode}`,
        severity: 'info',
        operativeValue: null,
        registryValue: regVal,
        detail: `Registry exposes ${entry.registryConceptCode}=${regVal} but operative ${entry.operativeField} is empty.`,
      });
      continue;
    }

    // both present
    const delta = (opVal as number) - (regVal as number);
    const sev = classifyAmountSeverity(delta, entry.cadence, tolerance);
    if (sev === null) {
      continue;
    }
    pushDiff(diffs, {
      field: entry.operativeField as string,
      severity: sev,
      operativeValue: opVal,
      registryValue: regVal,
      detail: `Δ=${(delta).toFixed(2)}€ (${entry.cadence}, tolerance=${tolerance}€, op=${opVal}, registry=${regVal}).`,
    });
  }

  // === Extra registry concepts (not mapped) ===
  for (const concept of registryPreview.conceptsPreview) {
    if (MAPPED_REGISTRY_CODES.has(concept.code)) continue;
    pushDiff(diffs, {
      field: `extra_registry_concept:${concept.code}`,
      severity: 'info',
      operativeValue: null,
      registryValue: concept.amount,
      detail: `Registry exposes additional concept ${concept.code} (${concept.label}) without operative equivalent.`,
    });
  }

  // === Annual hours comparability ===
  if (isFiniteNumber(operative.annualHours)) {
    pushDiff(diffs, {
      field: 'annualHours',
      severity: 'warning',
      operativeValue: operative.annualHours,
      registryValue: null,
      detail: 'registry_annual_hours_not_comparable: B10A preview does not expose jornada concepts.',
    });
  }

  // === Registry warnings (info) ===
  for (const w of registryPreview.warnings) {
    pushDiff(diffs, {
      field: 'registry_warning',
      severity: 'info',
      operativeValue: null,
      registryValue: w,
      detail: `Registry warning: ${w}`,
    });
  }

  // === Operative warnings (info) ===
  if (Array.isArray(operative.warnings)) {
    for (const w of operative.warnings) {
      pushDiff(diffs, {
        field: 'operative_warning',
        severity: 'info',
        operativeValue: w,
        registryValue: null,
        detail: `Operative warning: ${w}`,
      });
    }
  }

  return finalize(diffs, /*registryUsable*/ true);
}

function finalize(
  diffs: AgreementResolutionDiff[],
  registryUsable: boolean,
): AgreementResolutionComparisonReport {
  // Deterministic ordering: by severity rank, then field, then detail.
  const severityRank: Record<AgreementResolutionDiffSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const sorted = [...diffs].sort((a, b) => {
    const sa = severityRank[a.severity] - severityRank[b.severity];
    if (sa !== 0) return sa;
    if (a.field !== b.field) return a.field < b.field ? -1 : 1;
    if (a.detail !== b.detail) return a.detail < b.detail ? -1 : 1;
    return 0;
  });

  const summary = { critical: 0, warning: 0, info: 0 };
  for (const d of sorted) summary[d.severity] += 1;

  const hasCriticalDiffs = summary.critical > 0;
  const hasWarnings = summary.warning > 0;
  const canApplyRegistrySafely = registryUsable === true && !hasCriticalDiffs;

  return {
    canApplyRegistrySafely,
    hasCriticalDiffs,
    hasWarnings,
    diffs: sorted,
    summary,
  };
}