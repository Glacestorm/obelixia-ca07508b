/**
 * B10A — Registry-aware agreement resolver (PREVIEW-ONLY, pure).
 *
 * Pure, deterministic, side-effect-free resolver that decides whether a
 * Collective Agreement Registry record (post-B9 activation) can be used
 * for payroll, and produces a non-binding preview of payroll concepts.
 *
 * HARD SAFETY (B10A):
 *  - No Supabase, no fetch, no React, no hooks, no DB.
 *  - Does NOT import the operational resolver, payroll engine, payslip
 *    engine, salary normalizer, agreement safety gate, or the ES payroll
 *    bridge.
 *  - Does NOT touch the operational table erp_hr_collective_agreements.
 *  - Does NOT change real payroll output. It is preview-only and meant
 *    to be consumed by B10B (comparator) and B10C (shadow bridge flag
 *    OFF). Apply is reserved for B10D.
 */

// ===================== Types =====================

export type RegistryAgreementResolutionSource =
  | 'operative'
  | 'registry'
  | 'legacy_fallback';

export interface RegistryAgreementSnapshot {
  id: string;
  internal_code: string;
  status: string;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  data_completeness: string;
  salary_tables_loaded: boolean;
}

export interface RegistryAgreementVersionSnapshot {
  id: string;
  agreement_id: string;
  is_current: boolean;
  source_hash?: string | null;
}

export interface RegistryAgreementSourceSnapshot {
  id: string;
  agreement_id: string;
  source_quality: string;
  document_hash?: string | null;
}

export interface RegistrySalaryTableSnapshot {
  id: string;
  agreement_id: string;
  version_id: string;
  year: number;
  professional_group?: string | null;
  category?: string | null;
  level?: string | null;
  salary_base_monthly?: number | null;
  salary_base_annual?: number | null;
  extra_pay_amount?: number | null;
  plus_convenio?: number | null;
  plus_transport?: number | null;
  plus_antiguedad?: number | null;
  plus_nocturnidad?: number | null;
  plus_festivo?: number | null;
  plus_responsabilidad?: number | null;
  other_pluses_json?: Record<string, number> | null;
  row_confidence?: number | null;
}

export interface RegistryRuleSnapshot {
  id: string;
  agreement_id: string;
  version_id: string;
  rule_kind: string;
  rule_value_json?: Record<string, unknown> | null;
}

export interface RegistryAgreementPreviewConcept {
  code: string;
  label: string;
  amount: number;
  source: 'registry_salary_table' | 'registry_rule';
  confidence?: number | null;
}

export interface RegistryResolutionPreview {
  source: RegistryAgreementResolutionSource;
  canUseForPayroll: boolean;
  registryAgreementId?: string;
  registryVersionId?: string;
  salaryRowsMatched: number;
  conceptsPreview: RegistryAgreementPreviewConcept[];
  warnings: string[];
  blockers: string[];
}

export interface ResolveRegistryAgreementPreviewInput {
  agreement: RegistryAgreementSnapshot | null;
  version: RegistryAgreementVersionSnapshot | null;
  source: RegistryAgreementSourceSnapshot | null;
  salaryTables: RegistrySalaryTableSnapshot[];
  rules: RegistryRuleSnapshot[];
  unresolvedCriticalWarningsCount?: number;
  discardedCriticalRowsUnresolvedCount?: number;
  targetYear?: number;
  targetGroup?: string;
  targetCategory?: string;
  targetLevel?: string;
}

// ===================== Constants =====================

const ALLOWED_AGREEMENT_STATUS = new Set(['vigente', 'ultraactividad']);
const REQUIRED_DATA_COMPLETENESS = 'human_validated';
const REQUIRED_SOURCE_QUALITY = 'official';

// ===================== Eligibility =====================

export interface EligibilityResult {
  passed: boolean;
  blockers: string[];
}

export function evaluateRegistryAgreementEligibility(
  input: ResolveRegistryAgreementPreviewInput,
): EligibilityResult {
  const blockers: string[] = [];
  const ag = input.agreement;
  const ver = input.version;
  const src = input.source;

  if (!ag) blockers.push('agreement_missing');
  if (!ver) blockers.push('version_missing');
  if (!src) blockers.push('source_missing');

  if (ag) {
    if (ag.ready_for_payroll !== true) blockers.push('not_ready_for_payroll');
    if (ag.requires_human_review !== false) blockers.push('requires_human_review');
    if (ag.data_completeness !== REQUIRED_DATA_COMPLETENESS)
      blockers.push('not_human_validated');
    if (ag.salary_tables_loaded !== true) blockers.push('salary_tables_not_loaded');
    if (!ALLOWED_AGREEMENT_STATUS.has(ag.status))
      blockers.push('agreement_status_not_valid');
  }

  if (ver && ver.is_current !== true) blockers.push('version_not_current');
  if (src && src.source_quality !== REQUIRED_SOURCE_QUALITY)
    blockers.push('source_not_official');

  if ((input.unresolvedCriticalWarningsCount ?? 0) > 0)
    blockers.push('unresolved_critical_warnings');
  if ((input.discardedCriticalRowsUnresolvedCount ?? 0) > 0)
    blockers.push('discarded_critical_rows_unresolved');

  if (!Array.isArray(input.salaryTables) || input.salaryTables.length === 0)
    blockers.push('no_salary_tables');
  if (!Array.isArray(input.rules) || input.rules.length === 0)
    blockers.push('no_rules');

  return { passed: blockers.length === 0, blockers };
}

// ===================== Salary row matching =====================

export interface MatchResult {
  rows: RegistrySalaryTableSnapshot[];
  exactMatch: boolean;
}

function norm(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  return s.length === 0 ? null : s;
}

export function matchRegistrySalaryRows(
  input: ResolveRegistryAgreementPreviewInput,
): MatchResult {
  const ag = input.agreement;
  const ver = input.version;
  if (!ag || !ver) return { rows: [], exactMatch: false };

  const baseFiltered = input.salaryTables.filter(
    (r) =>
      r.agreement_id === ag.id &&
      r.version_id === ver.id &&
      (input.targetYear === undefined || r.year === input.targetYear),
  );

  const tg = norm(input.targetGroup);
  const tc = norm(input.targetCategory);
  const tl = norm(input.targetLevel);
  const wantsExact = tg !== null || tc !== null || tl !== null;

  if (wantsExact) {
    const exact = baseFiltered.filter((r) => {
      const okG = tg === null || norm(r.professional_group) === tg;
      const okC = tc === null || norm(r.category) === tc;
      const okL = tl === null || norm(r.level) === tl;
      return okG && okC && okL;
    });
    if (exact.length > 0) return { rows: exact, exactMatch: true };
    return { rows: baseFiltered, exactMatch: false };
  }

  return { rows: baseFiltered, exactMatch: true };
}

// ===================== Concept building =====================

interface FieldDef {
  field: keyof RegistrySalaryTableSnapshot;
  code: string;
  label: string;
}

const FIELD_DEFS: FieldDef[] = [
  { field: 'salary_base_monthly', code: 'REGISTRY_SALARY_BASE_MONTHLY', label: 'Salario base mensual (registry)' },
  { field: 'salary_base_annual', code: 'REGISTRY_SALARY_BASE_ANNUAL', label: 'Salario base anual (registry)' },
  { field: 'extra_pay_amount', code: 'REGISTRY_EXTRA_PAY_AMOUNT', label: 'Paga extra (registry)' },
  { field: 'plus_convenio', code: 'REGISTRY_PLUS_CONVENIO', label: 'Plus convenio (registry)' },
  { field: 'plus_transport', code: 'REGISTRY_PLUS_TRANSPORT', label: 'Plus transporte (registry)' },
  { field: 'plus_antiguedad', code: 'REGISTRY_PLUS_ANTIGUEDAD', label: 'Plus antigüedad (registry)' },
  { field: 'plus_nocturnidad', code: 'REGISTRY_PLUS_NOCTURNIDAD', label: 'Plus nocturnidad (registry)' },
  { field: 'plus_festivo', code: 'REGISTRY_PLUS_FESTIVO', label: 'Plus festivo (registry)' },
  { field: 'plus_responsabilidad', code: 'REGISTRY_PLUS_RESPONSABILIDAD', label: 'Plus responsabilidad (registry)' },
];

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildRegistryConceptsPreview(
  rows: RegistrySalaryTableSnapshot[],
): RegistryAgreementPreviewConcept[] {
  const out: RegistryAgreementPreviewConcept[] = [];
  for (const row of rows) {
    const conf = typeof row.row_confidence === 'number' ? row.row_confidence : null;
    for (const def of FIELD_DEFS) {
      const v = row[def.field] as unknown;
      if (isPositiveFinite(v)) {
        out.push({
          code: def.code,
          label: def.label,
          amount: round2(v),
          source: 'registry_salary_table',
          confidence: conf,
        });
      }
    }
    if (row.other_pluses_json && typeof row.other_pluses_json === 'object') {
      const keys = Object.keys(row.other_pluses_json).sort();
      for (const k of keys) {
        const v = row.other_pluses_json[k];
        if (isPositiveFinite(v)) {
          out.push({
            code: `REGISTRY_OTHER_PLUS:${k}`,
            label: `Otro plus (${k}) (registry)`,
            amount: round2(v),
            source: 'registry_salary_table',
            confidence: conf,
          });
        }
      }
    }
  }
  return out;
}

// ===================== Main resolver =====================

export function resolveRegistryAgreementPreview(
  input: ResolveRegistryAgreementPreviewInput,
): RegistryResolutionPreview {
  const elig = evaluateRegistryAgreementEligibility(input);
  if (!elig.passed) {
    return {
      source: 'operative',
      canUseForPayroll: false,
      salaryRowsMatched: 0,
      conceptsPreview: [],
      warnings: [],
      blockers: elig.blockers,
    };
  }

  const ag = input.agreement!;
  const ver = input.version!;

  const match = matchRegistrySalaryRows(input);
  const warnings: string[] = [];

  if (match.rows.length === 0) {
    return {
      source: 'operative',
      canUseForPayroll: false,
      salaryRowsMatched: 0,
      conceptsPreview: [],
      warnings: [],
      blockers: ['no_salary_tables'],
    };
  }

  if (!match.exactMatch) warnings.push('no_exact_salary_row_match');

  const concepts = buildRegistryConceptsPreview(match.rows);

  return {
    source: 'registry',
    canUseForPayroll: true,
    registryAgreementId: ag.id,
    registryVersionId: ver.id,
    salaryRowsMatched: match.rows.length,
    conceptsPreview: concepts,
    warnings,
    blockers: [],
  };
}

export default resolveRegistryAgreementPreview;
