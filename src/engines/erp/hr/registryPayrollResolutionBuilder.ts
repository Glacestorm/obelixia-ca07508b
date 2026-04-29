/**
 * B10E.2 — Registry Payroll Resolution Builder (PURE).
 *
 * Pure, deterministic, side-effect-free builder that transforms a runtime
 * setting + mapping + registry agreement/version/source/salary tables/rules
 * into a salary resolution snapshot compatible with the operational bridge
 * shape, WITHOUT touching the bridge, payroll engine, payslip engine,
 * operative resolver, normalizer, safety gate, the operative table
 * `erp_hr_collective_agreements`, or the global flag.
 *
 * HARD SAFETY (B10E.2):
 *  - No Supabase, no fetch, no React, no hooks, no Deno, no DB client.
 *  - No `.from(`, `.insert(`, `.update(`, `.delete(`, `.upsert(`.
 *  - No imports from useESPayrollBridge, registryShadowFlag,
 *    agreementSalaryResolver, salaryNormalizer, payrollEngine,
 *    payslipEngine, agreementSafetyGate.
 *  - Does NOT mutate inputs.
 *  - Does NOT activate HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL.
 *  - Does NOT write `ready_for_payroll`.
 *  - Does NOT load data; pure transform over injected snapshots.
 */

import {
  resolveRegistryAgreementPreview,
  type RegistryAgreementSnapshot as B10AAgreementSnapshot,
  type RegistryAgreementVersionSnapshot as B10AVersionSnapshot,
  type RegistryAgreementSourceSnapshot as B10ASourceSnapshot,
  type RegistrySalaryTableSnapshot as B10ASalaryTableSnapshot,
  type RegistryRuleSnapshot as B10ARuleSnapshot,
} from './registryAwareAgreementResolver';

// ===================== Input snapshots =====================

export interface RegistryPayrollRuntimeSettingSnapshot {
  id: string;
  mapping_id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  use_registry_for_payroll: boolean;
  is_current: boolean;
}

export interface RegistryPayrollMappingSnapshot {
  id: string;
  company_id: string;
  employee_id?: string | null;
  contract_id?: string | null;
  registry_agreement_id: string;
  registry_version_id: string;
  mapping_status: string;
  is_current: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface RegistryPayrollAgreementSnapshot {
  id: string;
  internal_code?: string;
  official_name?: string;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  data_completeness: string;
  salary_tables_loaded: boolean;
  source_quality: string;
  status: string;
}

export interface RegistryPayrollVersionSnapshot {
  id: string;
  agreement_id: string;
  is_current: boolean;
}

export interface RegistryPayrollSourceSnapshot {
  id?: string;
  agreement_id?: string;
  source_quality: string;
  document_hash?: string | null;
}

export interface RegistryPayrollSalaryTableRowSnapshot {
  id?: string;
  year: number;
  professional_group?: string | null;
  category?: string | null;
  level?: string | null;
  salary_base_monthly?: number | null;
  salary_base_annual?: number | null;
  plus_convenio?: number | null;
  plus_transport?: number | null;
  plus_antiguedad?: number | null;
  extra_pay_amount?: number | null;
  row_confidence?: number | null;
  requires_human_review?: boolean | null;
}

export interface RegistryPayrollRuleSnapshot {
  id?: string;
  rule_kind: string;
  rule_value_json?: Record<string, unknown> | null;
  source_excerpt?: string | null;
}

// ===================== Output =====================

export type RegistryPayrollResolutionReason =
  | 'built'
  | 'runtime_setting_inactive'
  | 'mapping_not_approved'
  | 'mapping_not_current'
  | 'registry_not_ready'
  | 'requires_human_review'
  | 'data_completeness_not_validated'
  | 'source_quality_not_official'
  | 'version_not_current'
  | 'missing_salary_table'
  | 'b10a_blocked';

export interface RegistryPayrollResolutionBuildResult {
  canBuild: boolean;
  reason: RegistryPayrollResolutionReason;
  blockers: string[];
  warnings: string[];
  salaryResolution?: {
    source: 'registry';
    salarioBaseConvenio?: number;
    salarioBaseAnualConvenio?: number;
    plusConvenioTabla?: number;
    plusTransporte?: number;
    antiguedad?: number;
    pagasExtra?: {
      count?: number;
      amount?: number;
      prorrateadas?: boolean;
    };
    jornadaAnual?: number;
    matchedRows: number;
    __registry_source: {
      setting_id: string;
      mapping_id: string;
      registry_agreement_id: string;
      registry_version_id: string;
      salary_table_row_id?: string;
      source_quality: string;
      warnings: string[];
      blockers: string[];
    };
  };
}

export interface BuildRegistryPayrollResolutionInput {
  setting: RegistryPayrollRuntimeSettingSnapshot | null;
  mapping: RegistryPayrollMappingSnapshot | null;
  agreement: RegistryPayrollAgreementSnapshot | null;
  version: RegistryPayrollVersionSnapshot | null;
  source: RegistryPayrollSourceSnapshot | null;
  salaryTables: RegistryPayrollSalaryTableRowSnapshot[];
  rules: RegistryPayrollRuleSnapshot[];
  targetYear: number;
  professionalGroup?: string | null;
  category?: string | null;
}

// ===================== Constants =====================

const ALLOWED_AGREEMENT_STATUS = new Set(['vigente', 'ultraactividad']);
const REQUIRED_DATA_COMPLETENESS = 'human_validated';
const REQUIRED_SOURCE_QUALITY = 'official';
const MIN_ROW_CONFIDENCE = 0.6;

// ===================== Helpers =====================

function norm(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  return s.length === 0 ? null : s;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function pickRule(
  rules: RegistryPayrollRuleSnapshot[],
  kinds: string[],
): RegistryPayrollRuleSnapshot | null {
  const set = new Set(kinds.map((k) => k.toLowerCase()));
  for (const r of rules) {
    if (r && typeof r.rule_kind === 'string' && set.has(r.rule_kind.toLowerCase())) {
      return r;
    }
  }
  return null;
}

function buildEmpty(
  reason: RegistryPayrollResolutionReason,
  blockers: string[],
  warnings: string[] = [],
): RegistryPayrollResolutionBuildResult {
  return { canBuild: false, reason, blockers, warnings };
}

// ===================== Salary row matching =====================

interface SalaryMatch {
  row: RegistryPayrollSalaryTableRowSnapshot | null;
  warnings: string[];
  matchedRows: number;
}

function matchSalaryRow(
  rows: RegistryPayrollSalaryTableRowSnapshot[],
  year: number,
  group: string | null | undefined,
  category: string | null | undefined,
): SalaryMatch {
  const warnings: string[] = [];
  const yearRows = rows.filter((r) => r && r.year === year);

  // Discard low-confidence rows.
  const usable: RegistryPayrollSalaryTableRowSnapshot[] = [];
  let discardedLowConf = false;
  for (const r of yearRows) {
    if (typeof r.row_confidence === 'number' && r.row_confidence < MIN_ROW_CONFIDENCE) {
      discardedLowConf = true;
      continue;
    }
    usable.push(r);
  }
  if (discardedLowConf) warnings.push('salary_table_low_confidence_discarded');

  if (usable.length === 0) {
    return { row: null, warnings, matchedRows: 0 };
  }

  const tg = norm(group);
  const tc = norm(category);

  // Stable order by id ascending for determinism.
  const sorted = [...usable].sort((a, b) => {
    const ai = a.id ?? '';
    const bi = b.id ?? '';
    return ai < bi ? -1 : ai > bi ? 1 : 0;
  });

  if (tg !== null && tc !== null) {
    const exact = sorted.filter(
      (r) => norm(r.professional_group) === tg && norm(r.category) === tc,
    );
    if (exact.length > 0) {
      return { row: exact[0], warnings, matchedRows: exact.length };
    }
    warnings.push('category_not_exact_match');
  }

  if (tg !== null) {
    const groupOnly = sorted.filter((r) => norm(r.professional_group) === tg);
    if (groupOnly.length > 0) {
      warnings.push('fallback_salary_row_match');
      return { row: groupOnly[0], warnings, matchedRows: groupOnly.length };
    }
  }

  warnings.push('fallback_salary_row_match');
  return { row: sorted[0], warnings, matchedRows: sorted.length };
}

// ===================== Main builder =====================

export function buildRegistryPayrollResolution(
  input: BuildRegistryPayrollResolutionInput,
): RegistryPayrollResolutionBuildResult {
  const { setting, mapping, agreement, version, source, salaryTables, rules, targetYear } = input;

  // 1) Runtime setting checks
  if (!setting) {
    return buildEmpty('runtime_setting_inactive', ['runtime_setting_inactive']);
  }
  const settingBlockers: string[] = [];
  if (setting.is_current === false) settingBlockers.push('setting_not_current');
  if (setting.use_registry_for_payroll === false)
    settingBlockers.push('use_registry_for_payroll_false');
  if (settingBlockers.length > 0) {
    return buildEmpty('runtime_setting_inactive', settingBlockers);
  }

  // 2) Mapping checks
  if (!mapping) {
    return buildEmpty('mapping_not_approved', ['mapping_missing']);
  }
  const mappingBlockers: string[] = [];
  if (mapping.mapping_status !== 'approved_internal')
    mappingBlockers.push('mapping_not_approved');
  if (!mapping.approved_by || !mapping.approved_at)
    mappingBlockers.push('mapping_missing_approval_metadata');
  if (mappingBlockers.length > 0) {
    return buildEmpty('mapping_not_approved', mappingBlockers);
  }
  if (mapping.is_current !== true) {
    return buildEmpty('mapping_not_current', ['mapping_not_current']);
  }
  if (setting.mapping_id !== mapping.id) {
    return buildEmpty('mapping_not_current', ['setting_mapping_mismatch']);
  }

  // 3) Agreement readiness
  if (!agreement) {
    return buildEmpty('registry_not_ready', ['registry_agreement_missing']);
  }
  if (mapping.registry_agreement_id !== agreement.id) {
    return buildEmpty('registry_not_ready', ['mapping_agreement_mismatch']);
  }

  const agBlockers: string[] = [];
  let agReason: RegistryPayrollResolutionReason | null = null;
  if (agreement.requires_human_review === true) {
    agBlockers.push('requires_human_review');
    agReason = agReason ?? 'requires_human_review';
  }
  if (agreement.data_completeness !== REQUIRED_DATA_COMPLETENESS) {
    agBlockers.push('data_completeness_not_validated');
    agReason = agReason ?? 'data_completeness_not_validated';
  }
  if (agreement.salary_tables_loaded !== true) {
    agBlockers.push('salary_tables_not_loaded');
    agReason = agReason ?? 'registry_not_ready';
  }
  if (!ALLOWED_AGREEMENT_STATUS.has(agreement.status)) {
    agBlockers.push('agreement_status_not_valid');
    agReason = agReason ?? 'registry_not_ready';
  }
  if (agreement.ready_for_payroll !== true) {
    agBlockers.push('registry_not_ready');
    agReason = agReason ?? 'registry_not_ready';
  }
  if (agBlockers.length > 0) {
    return buildEmpty(agReason ?? 'registry_not_ready', agBlockers);
  }

  // 4) Source quality
  if (!source || source.source_quality !== REQUIRED_SOURCE_QUALITY) {
    return buildEmpty('source_quality_not_official', ['source_quality_not_official']);
  }
  if (agreement.source_quality !== REQUIRED_SOURCE_QUALITY) {
    return buildEmpty('source_quality_not_official', ['source_quality_not_official']);
  }

  // 5) Version
  if (!version) {
    return buildEmpty('version_not_current', ['version_missing']);
  }
  if (version.agreement_id !== agreement.id) {
    return buildEmpty('version_not_current', ['version_agreement_mismatch']);
  }
  if (mapping.registry_version_id !== version.id) {
    return buildEmpty('version_not_current', ['mapping_version_mismatch']);
  }
  if (version.is_current !== true) {
    return buildEmpty('version_not_current', ['version_not_current']);
  }

  // 6) Delegate to B10A resolver as a defensive cross-check.
  const b10aAgreement: B10AAgreementSnapshot = {
    id: agreement.id,
    internal_code: agreement.internal_code ?? '',
    status: agreement.status,
    ready_for_payroll: agreement.ready_for_payroll,
    requires_human_review: agreement.requires_human_review,
    data_completeness: agreement.data_completeness,
    salary_tables_loaded: agreement.salary_tables_loaded,
  };
  const b10aVersion: B10AVersionSnapshot = {
    id: version.id,
    agreement_id: version.agreement_id,
    is_current: version.is_current,
  };
  const b10aSource: B10ASourceSnapshot = {
    id: source.id ?? `${agreement.id}-source`,
    agreement_id: source.agreement_id ?? agreement.id,
    source_quality: source.source_quality,
    document_hash: source.document_hash ?? null,
  };
  const b10aSalaryTables: B10ASalaryTableSnapshot[] = (salaryTables ?? []).map((r, idx) => ({
    id: r.id ?? `row-${idx}`,
    agreement_id: agreement.id,
    version_id: version.id,
    year: r.year,
    professional_group: r.professional_group ?? null,
    category: r.category ?? null,
    level: r.level ?? null,
    salary_base_monthly: r.salary_base_monthly ?? null,
    salary_base_annual: r.salary_base_annual ?? null,
    extra_pay_amount: r.extra_pay_amount ?? null,
    plus_convenio: r.plus_convenio ?? null,
    plus_transport: r.plus_transport ?? null,
    plus_antiguedad: r.plus_antiguedad ?? null,
    row_confidence: r.row_confidence ?? null,
  }));
  const b10aRules: B10ARuleSnapshot[] = (rules ?? []).map((r, idx) => ({
    id: r.id ?? `rule-${idx}`,
    agreement_id: agreement.id,
    version_id: version.id,
    rule_kind: r.rule_kind,
    rule_value_json: r.rule_value_json ?? null,
  }));

  const b10a = resolveRegistryAgreementPreview({
    agreement: b10aAgreement,
    version: b10aVersion,
    source: b10aSource,
    salaryTables: b10aSalaryTables,
    rules: b10aRules,
    targetYear,
    targetGroup: input.professionalGroup ?? undefined,
    targetCategory: input.category ?? undefined,
  });
  if (!b10a.canUseForPayroll) {
    return buildEmpty('b10a_blocked', b10a.blockers);
  }

  // 7) Salary table match
  const match = matchSalaryRow(salaryTables ?? [], targetYear, input.professionalGroup, input.category);
  const warnings: string[] = [...match.warnings];

  if (!match.row) {
    return buildEmpty('missing_salary_table', ['missing_salary_table'], warnings);
  }
  const row = match.row;

  // 8) Rules
  const annualHoursRule = pickRule(rules ?? [], ['annual_hours', 'working_hours']);
  const extraPayRule = pickRule(rules ?? [], ['extra_payments']);

  if (!rules || rules.length === 0) warnings.push('no_rules_available');
  if (!annualHoursRule) warnings.push('no_annual_hours_rule');
  if (!extraPayRule) warnings.push('no_extra_payments_rule');

  let jornadaAnual: number | undefined;
  if (annualHoursRule?.rule_value_json) {
    const v =
      (annualHoursRule.rule_value_json.hours as unknown) ??
      (annualHoursRule.rule_value_json.jornadaAnualHours as unknown);
    if (isPositiveFinite(v)) jornadaAnual = v;
  }

  let pagasExtra: { count?: number; amount?: number; prorrateadas?: boolean } | undefined;
  if (extraPayRule?.rule_value_json) {
    const j = extraPayRule.rule_value_json;
    const out: { count?: number; amount?: number; prorrateadas?: boolean } = {};
    if (isPositiveFinite(j.count)) out.count = j.count as number;
    if (isPositiveFinite(j.amount)) out.amount = j.amount as number;
    if (typeof j.prorrateadas === 'boolean') out.prorrateadas = j.prorrateadas;
    if (Object.keys(out).length > 0) pagasExtra = out;
  }
  if (!pagasExtra && isPositiveFinite(row.extra_pay_amount)) {
    pagasExtra = { amount: row.extra_pay_amount as number };
  }

  const salaryResolution: NonNullable<RegistryPayrollResolutionBuildResult['salaryResolution']> = {
    source: 'registry',
    matchedRows: match.matchedRows,
    __registry_source: {
      setting_id: setting.id,
      mapping_id: mapping.id,
      registry_agreement_id: agreement.id,
      registry_version_id: version.id,
      salary_table_row_id: row.id,
      source_quality: source.source_quality,
      warnings: [...warnings],
      blockers: [],
    },
  };
  if (isPositiveFinite(row.salary_base_monthly))
    salaryResolution.salarioBaseConvenio = row.salary_base_monthly as number;
  if (isPositiveFinite(row.salary_base_annual))
    salaryResolution.salarioBaseAnualConvenio = row.salary_base_annual as number;
  if (isPositiveFinite(row.plus_convenio))
    salaryResolution.plusConvenioTabla = row.plus_convenio as number;
  if (isPositiveFinite(row.plus_transport))
    salaryResolution.plusTransporte = row.plus_transport as number;
  if (isPositiveFinite(row.plus_antiguedad))
    salaryResolution.antiguedad = row.plus_antiguedad as number;
  if (pagasExtra) salaryResolution.pagasExtra = pagasExtra;
  if (jornadaAnual !== undefined) salaryResolution.jornadaAnual = jornadaAnual;

  return {
    canBuild: true,
    reason: 'built',
    blockers: [],
    warnings,
    salaryResolution,
  };
}

export default buildRegistryPayrollResolution;