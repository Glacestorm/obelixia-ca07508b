/**
 * B13.5A — Agreement Impact Engine (PURE).
 *
 * In-memory only. No DB writes, no edge calls, no Supabase, no React,
 * no hooks, no fetch, no service_role, no payroll/bridge imports.
 *
 * Computes the potential impact of a curated, ready_for_payroll
 * collective agreement (Registry) against a snapshot of companies,
 * employees, contracts, salary tables and rules. NEVER mutates inputs
 * and NEVER persists anything.
 */

/* ==========================================================================
 * Snapshot input types
 * ========================================================================== */

export interface RegistryAgreementImpactSnapshot {
  id: string;
  internal_code: string;
  official_name: string;
  ready_for_payroll: boolean;
  requires_human_review: boolean;
  data_completeness: string; // expects 'human_validated'
  source_quality: string; // expects 'official'
  salary_tables_loaded: boolean;
  cnae_codes?: string[];
  jurisdiction_code?: string;
  effective_start_date?: string;
  effective_end_date?: string;
}

export interface RegistryAgreementVersionImpactSnapshot {
  id: string;
  agreement_id: string;
  year?: number;
  is_current?: boolean;
}

export interface RuntimeSettingImpactSnapshot {
  id: string;
  mapping_id: string;
  company_id: string;
  employee_id?: string;
  contract_id?: string;
  is_current: boolean;
  use_registry_for_payroll: boolean;
  activated_at?: string;
}

export interface MappingImpactSnapshot {
  id: string;
  company_id: string;
  employee_id?: string;
  contract_id?: string;
  registry_agreement_id: string;
  registry_version_id: string;
  mapping_status: string; // expects 'approved_internal'
  is_current: boolean;
}

export interface CompanyImpactSnapshot {
  id: string;
  name?: string;
  cnae_code?: string;
  jurisdiction_code?: string;
}

export interface EmployeeImpactSnapshot {
  id: string;
  company_id: string;
  status: string;
  professional_group?: string;
  level?: string;
  category?: string;
  cnae_code?: string;
  province?: string;
  hire_date?: string;
  termination_date?: string;
}

export interface ContractImpactSnapshot {
  id: string;
  employee_id: string;
  company_id: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  base_salary_monthly?: number;
  base_salary_annual?: number;
  current_professional_group?: string;
  current_level?: string;
  current_category?: string;
  current_working_hours?: number;
  current_concepts?: ContractConceptSnapshot[];
}

export interface ContractConceptSnapshot {
  code?: string;
  literal?: string;
  payslip_label?: string;
  amount?: number;
}

export interface SalaryTableImpactSnapshot {
  id: string;
  agreement_id: string;
  version_id: string;
  year: number;
  professional_group: string;
  level?: string;
  category?: string;
  salary_base_annual?: number;
  salary_base_monthly?: number;
  plus_convenio_annual?: number;
  plus_convenio_monthly?: number;
  plus_transport?: number;
  plus_antiguedad?: number;
  concept_literal_from_agreement?: string;
  payslip_label?: string;
  source_page?: number;
  source_excerpt?: string;
}

export interface RuleImpactSnapshot {
  id: string;
  agreement_id: string;
  version_id: string;
  rule_type: string;
  rule_key?: string;
  value_json: Record<string, unknown>;
  source_article?: string;
  source_excerpt?: string;
}

export interface AgreementImpactRiskThresholds {
  large_delta_monthly: number; // EUR
  arrears_max_months: number;
}

export interface AgreementImpactOptions {
  target_year: number;
  as_of_date: string;
  arrears_from?: string;
  arrears_to?: string;
  employer_cost_multiplier?: number;
  require_runtime_setting: boolean;
  include_inactive_employees?: boolean;
  risk_thresholds: AgreementImpactRiskThresholds;
}

export interface AgreementImpactInput {
  agreement: RegistryAgreementImpactSnapshot;
  version: RegistryAgreementVersionImpactSnapshot;
  runtimeSettings: RuntimeSettingImpactSnapshot[];
  mappings: MappingImpactSnapshot[];
  companies: CompanyImpactSnapshot[];
  employees: EmployeeImpactSnapshot[];
  contracts: ContractImpactSnapshot[];
  salaryTables: SalaryTableImpactSnapshot[];
  rules: RuleImpactSnapshot[];
  options: AgreementImpactOptions;
}

/* ==========================================================================
 * Output types
 * ========================================================================== */

export type AgreementImpactRiskFlag =
  | 'missing_salary_table'
  | 'ambiguous_salary_table_match'
  | 'salary_below_agreement'
  | 'salary_above_agreement'
  | 'large_delta'
  | 'negative_delta'
  | 'missing_runtime_setting'
  | 'mapping_not_approved'
  | 'registry_not_ready'
  | 'missing_concept_literal'
  | 'missing_payslip_label'
  | 'missing_antiquity_rule'
  | 'arrears_period_too_long'
  | 'inactive_employee'
  | 'inactive_contract';

export interface EmployeeAgreementImpactPreview {
  company_id: string;
  employee_id: string;
  contract_id: string;
  mapping_id?: string;
  runtime_setting_id?: string;
  matched_salary_table_id?: string;
  affected: boolean;
  blocked: boolean;
  blockers: string[];
  warnings: string[];
  current_salary_monthly: number;
  current_salary_annual: number;
  target_salary_monthly: number;
  target_salary_annual: number;
  delta_monthly: number;
  delta_annual: number;
  arrears_estimate: number;
  employer_cost_delta: number;
  concepts_detected: string[];
  missing_concepts: string[];
  risk_flags: AgreementImpactRiskFlag[];
  risk_score: number;
  source_trace: Record<string, unknown>;
}

export interface AgreementImpactSummary {
  companies_scanned: number;
  employees_scanned: number;
  employees_affected: number;
  employees_blocked: number;
  total_monthly_delta: number;
  total_annual_delta: number;
  total_arrears_estimate: number;
  total_employer_cost_delta: number;
  high_risk_count: number;
}

export interface AgreementImpactTrace {
  agreement_id: string;
  version_id: string;
  target_year: number;
  as_of_date: string;
  arrears_window?: { from: string; to: string };
  employer_cost_multiplier: number;
  employer_cost_multiplier_defaulted: boolean;
  payment_count_default: number;
  evaluated_at_iso: string;
}

export interface AgreementImpactResult {
  eligible: boolean;
  reason: string;
  blockers: string[];
  warnings: string[];
  summary: AgreementImpactSummary;
  employee_previews: EmployeeAgreementImpactPreview[];
  trace: AgreementImpactTrace;
}

/* ==========================================================================
 * Constants
 * ========================================================================== */

export const DEFAULT_EMPLOYER_COST_MULTIPLIER = 1.32;
export const DEFAULT_PAYMENT_COUNT = 12;

const PROTECTED_CONCEPT_LITERALS = [
  'transporte',
  'nocturnidad',
  'festivo',
  'antigüedad',
  'antiguedad',
  'dieta',
  'kilomet',
  'responsabilidad',
  'convenio',
] as const;

/* ==========================================================================
 * Public API: deltas
 * ========================================================================== */

export function computeSalaryDelta(
  current: number,
  target: number,
): number {
  return round2((target ?? 0) - (current ?? 0));
}

export function computeMonthlyDelta(
  currentMonthly: number,
  targetMonthly: number,
): number {
  return computeSalaryDelta(currentMonthly, targetMonthly);
}

export function computeAnnualDelta(
  currentAnnual: number,
  targetAnnual: number,
): number {
  return computeSalaryDelta(currentAnnual, targetAnnual);
}

export function computeArrearsEstimate(
  deltaMonthly: number,
  fromDate: string | undefined,
  toDate: string | undefined,
  options?: { max_months?: number },
): { amount: number; months: number; warnings: string[] } {
  const warnings: string[] = [];
  if (!fromDate || !toDate) {
    return { amount: 0, months: 0, warnings: ['arrears_window_missing'] };
  }
  const months = monthsBetween(fromDate, toDate);
  if (months <= 0) {
    return { amount: 0, months: 0, warnings: ['arrears_window_invalid'] };
  }
  if (deltaMonthly < 0) {
    return { amount: 0, months, warnings: ['arrears_negative_delta'] };
  }
  const max = options?.max_months;
  const cappedMonths = max && months > max ? max : months;
  if (max && months > max) warnings.push('arrears_period_too_long');
  return {
    amount: round2(deltaMonthly * cappedMonths),
    months: cappedMonths,
    warnings,
  };
}

export function computeEmployerCostDelta(
  delta: { delta_annual: number },
  options?: { multiplier?: number },
): { amount: number; multiplier: number; defaulted: boolean } {
  const provided = options?.multiplier;
  const multiplier =
    typeof provided === 'number' && provided > 0
      ? provided
      : DEFAULT_EMPLOYER_COST_MULTIPLIER;
  const defaulted = !(typeof provided === 'number' && provided > 0);
  const positiveDelta = Math.max(delta.delta_annual, 0);
  return {
    amount: round2(positiveDelta * multiplier),
    multiplier,
    defaulted,
  };
}

/* ==========================================================================
 * Salary table matching
 * ========================================================================== */

interface MatchResult {
  match?: SalaryTableImpactSnapshot;
  ambiguous: boolean;
  fallbackUsed: boolean;
}

function matchSalaryTable(
  tables: SalaryTableImpactSnapshot[],
  ctx: {
    professional_group?: string;
    level?: string;
    category?: string;
  },
): MatchResult {
  if (!ctx.professional_group) {
    return { ambiguous: false, fallbackUsed: false };
  }

  const normalize = (v?: string) => (v ?? '').trim().toLowerCase();

  const pg = normalize(ctx.professional_group);
  const lvl = normalize(ctx.level);
  const cat = normalize(ctx.category);

  const byPgLvlCat = tables.filter(
    (t) =>
      normalize(t.professional_group) === pg &&
      normalize(t.level) === lvl &&
      normalize(t.category) === cat &&
      lvl !== '' &&
      cat !== '',
  );
  if (byPgLvlCat.length === 1) {
    return { match: byPgLvlCat[0], ambiguous: false, fallbackUsed: false };
  }
  if (byPgLvlCat.length > 1) {
    return { match: byPgLvlCat[0], ambiguous: true, fallbackUsed: false };
  }

  const byPgLvl = tables.filter(
    (t) =>
      normalize(t.professional_group) === pg &&
      normalize(t.level) === lvl &&
      lvl !== '',
  );
  if (byPgLvl.length === 1) {
    return { match: byPgLvl[0], ambiguous: false, fallbackUsed: true };
  }
  if (byPgLvl.length > 1) {
    return { match: byPgLvl[0], ambiguous: true, fallbackUsed: true };
  }

  const byPg = tables.filter((t) => normalize(t.professional_group) === pg);
  if (byPg.length === 1) {
    return { match: byPg[0], ambiguous: false, fallbackUsed: true };
  }
  if (byPg.length > 1) {
    return { match: byPg[0], ambiguous: true, fallbackUsed: true };
  }

  return { ambiguous: false, fallbackUsed: false };
}

/* ==========================================================================
 * Concept detection
 * ========================================================================== */

function detectProtectedConcepts(
  table: SalaryTableImpactSnapshot,
): string[] {
  const haystack = `${table.concept_literal_from_agreement ?? ''} ${
    table.payslip_label ?? ''
  }`.toLowerCase();
  const found: string[] = [];
  for (const literal of PROTECTED_CONCEPT_LITERALS) {
    if (haystack.includes(literal)) found.push(literal);
  }
  if (typeof table.plus_transport === 'number' && table.plus_transport > 0) {
    if (!found.includes('transporte')) found.push('transporte');
  }
  if (
    typeof table.plus_antiguedad === 'number' &&
    table.plus_antiguedad > 0
  ) {
    if (!found.includes('antiguedad')) found.push('antiguedad');
  }
  return found;
}

/* ==========================================================================
 * Per-employee delta
 * ========================================================================== */

export interface EmployeeAgreementResolution {
  mapping?: MappingImpactSnapshot;
  runtimeSetting?: RuntimeSettingImpactSnapshot;
  matchedTable?: SalaryTableImpactSnapshot;
  ambiguousMatch: boolean;
  fallbackUsed: boolean;
}

export interface EmployeeDeltaOptions {
  paymentCount: number;
  paymentCountFromRule: boolean;
  arrears_from?: string;
  arrears_to?: string;
  arrears_max_months: number;
  employer_cost_multiplier?: number;
  require_runtime_setting: boolean;
  include_inactive_employees: boolean;
  large_delta_monthly_threshold: number;
  agreement: RegistryAgreementImpactSnapshot;
  hasAntiquityRule: boolean;
}

export function computeEmployeeAgreementDelta(
  employee: EmployeeImpactSnapshot,
  resolution: EmployeeAgreementResolution & {
    contract: ContractImpactSnapshot;
    company: CompanyImpactSnapshot;
  },
  options: EmployeeDeltaOptions,
): EmployeeAgreementImpactPreview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const risk_flags: AgreementImpactRiskFlag[] = [];

  const { contract, company, mapping, runtimeSetting, matchedTable } =
    resolution;

  // Status gates
  if (employee.status !== 'active') {
    if (!options.include_inactive_employees) {
      blockers.push('inactive_employee');
      risk_flags.push('inactive_employee');
    } else {
      warnings.push('inactive_employee');
      risk_flags.push('inactive_employee');
    }
  }
  if (!contract.is_active) {
    blockers.push('inactive_contract');
    risk_flags.push('inactive_contract');
  }

  // Mapping / runtime setting gates
  if (!mapping) {
    blockers.push('missing_mapping');
  } else if (mapping.mapping_status !== 'approved_internal' || !mapping.is_current) {
    blockers.push('mapping_not_approved');
    risk_flags.push('mapping_not_approved');
  }

  if (options.require_runtime_setting) {
    if (!runtimeSetting || !runtimeSetting.is_current) {
      blockers.push('missing_runtime_setting');
      risk_flags.push('missing_runtime_setting');
    }
  }

  // Salary table
  if (!matchedTable) {
    blockers.push('missing_salary_table');
    risk_flags.push('missing_salary_table');
  }
  if (resolution.ambiguousMatch) {
    warnings.push('ambiguous_salary_table_match');
    risk_flags.push('ambiguous_salary_table_match');
  }
  if (resolution.fallbackUsed) {
    warnings.push('salary_table_match_fallback');
  }

  // Current
  let currentMonthly = contract.base_salary_monthly ?? 0;
  let currentAnnual = contract.base_salary_annual ?? 0;
  if (currentMonthly === 0 && currentAnnual > 0) {
    currentMonthly = round2(currentAnnual / options.paymentCount);
    if (!options.paymentCountFromRule) warnings.push('payment_count_unknown');
  } else if (currentAnnual === 0 && currentMonthly > 0) {
    currentAnnual = round2(currentMonthly * options.paymentCount);
    if (!options.paymentCountFromRule) warnings.push('payment_count_unknown');
  }

  // Target from matched table
  let targetMonthly = 0;
  let targetAnnual = 0;
  let conceptsDetected: string[] = [];
  const missingConcepts: string[] = [];

  if (matchedTable) {
    if (typeof matchedTable.salary_base_monthly === 'number') {
      targetMonthly = matchedTable.salary_base_monthly;
    }
    if (typeof matchedTable.salary_base_annual === 'number') {
      targetAnnual = matchedTable.salary_base_annual;
    }
    if (targetMonthly === 0 && targetAnnual > 0) {
      targetMonthly = round2(targetAnnual / options.paymentCount);
      if (!options.paymentCountFromRule) warnings.push('payment_count_unknown');
    } else if (targetAnnual === 0 && targetMonthly > 0) {
      targetAnnual = round2(targetMonthly * options.paymentCount);
      if (!options.paymentCountFromRule) warnings.push('payment_count_unknown');
    }

    conceptsDetected = detectProtectedConcepts(matchedTable);

    // Concept literal preservation gates
    const literalRaw = matchedTable.concept_literal_from_agreement ?? '';
    const payslipLabel = matchedTable.payslip_label ?? '';
    const haystack = `${literalRaw} ${payslipLabel}`.toLowerCase();
    const impactsPayroll =
      (typeof matchedTable.plus_transport === 'number' &&
        matchedTable.plus_transport > 0) ||
      (typeof matchedTable.plus_antiguedad === 'number' &&
        matchedTable.plus_antiguedad > 0) ||
      PROTECTED_CONCEPT_LITERALS.some((l) => haystack.includes(l));

    if (impactsPayroll) {
      if (!literalRaw) {
        blockers.push('missing_concept_literal');
        risk_flags.push('missing_concept_literal');
      }
      if (!payslipLabel) {
        blockers.push('missing_payslip_literal_preservation');
        risk_flags.push('missing_payslip_label');
      }
    }

    if (
      typeof matchedTable.plus_antiguedad === 'number' &&
      matchedTable.plus_antiguedad > 0 &&
      !options.hasAntiquityRule
    ) {
      warnings.push('missing_antiquity_rule');
      risk_flags.push('missing_antiquity_rule');
    }
  }

  // Detect missing concepts vs current contract concepts
  const currentConceptLabels = (contract.current_concepts ?? []).map(
    (c) => `${c.literal ?? ''} ${c.payslip_label ?? ''}`.toLowerCase(),
  );
  for (const c of conceptsDetected) {
    if (!currentConceptLabels.some((cl) => cl.includes(c))) {
      missingConcepts.push(c);
    }
  }

  const deltaMonthly = computeMonthlyDelta(currentMonthly, targetMonthly);
  const deltaAnnual = computeAnnualDelta(currentAnnual, targetAnnual);

  if (matchedTable) {
    if (deltaMonthly > 0) risk_flags.push('salary_below_agreement');
    if (deltaMonthly < 0) {
      risk_flags.push('salary_above_agreement');
      risk_flags.push('negative_delta');
    }
    if (Math.abs(deltaMonthly) >= options.large_delta_monthly_threshold) {
      risk_flags.push('large_delta');
    }
  }

  const arrears = computeArrearsEstimate(
    deltaMonthly,
    options.arrears_from,
    options.arrears_to,
    { max_months: options.arrears_max_months },
  );
  for (const w of arrears.warnings) {
    warnings.push(w);
    if (w === 'arrears_period_too_long') risk_flags.push('arrears_period_too_long');
  }

  const employer = computeEmployerCostDelta(
    { delta_annual: deltaAnnual },
    { multiplier: options.employer_cost_multiplier },
  );
  if (employer.defaulted) warnings.push('employer_cost_multiplier_defaulted');

  const blocked = blockers.length > 0;
  const affected = !blocked && (deltaMonthly !== 0 || deltaAnnual !== 0);

  return {
    company_id: company.id,
    employee_id: employee.id,
    contract_id: contract.id,
    mapping_id: mapping?.id,
    runtime_setting_id: runtimeSetting?.id,
    matched_salary_table_id: matchedTable?.id,
    affected,
    blocked,
    blockers: dedupe(blockers),
    warnings: dedupe(warnings),
    current_salary_monthly: round2(currentMonthly),
    current_salary_annual: round2(currentAnnual),
    target_salary_monthly: round2(targetMonthly),
    target_salary_annual: round2(targetAnnual),
    delta_monthly: deltaMonthly,
    delta_annual: deltaAnnual,
    arrears_estimate: arrears.amount,
    employer_cost_delta: employer.amount,
    concepts_detected: conceptsDetected,
    missing_concepts: missingConcepts,
    risk_flags: dedupe(risk_flags) as AgreementImpactRiskFlag[],
    risk_score: scoreRisk(risk_flags, blockers),
    source_trace: {
      matched_table_source_page: matchedTable?.source_page,
      matched_table_source_excerpt: matchedTable?.source_excerpt,
      mapping_status: mapping?.mapping_status,
      runtime_setting_current: runtimeSetting?.is_current ?? false,
    },
  };
}

/* ==========================================================================
 * Affected employees collector
 * ========================================================================== */

export function computeAffectedEmployees(
  input: AgreementImpactInput,
): EmployeeAgreementImpactPreview[] {
  const previews: EmployeeAgreementImpactPreview[] = [];

  // Pre-index
  const tablesForVersion = input.salaryTables.filter(
    (t) =>
      t.agreement_id === input.agreement.id &&
      t.version_id === input.version.id &&
      t.year === input.options.target_year,
  );

  const paymentCountRule = input.rules.find(
    (r) =>
      r.agreement_id === input.agreement.id &&
      r.version_id === input.version.id &&
      r.rule_type === 'extra_pay',
  );
  let paymentCount = DEFAULT_PAYMENT_COUNT;
  let paymentCountFromRule = false;
  if (paymentCountRule) {
    const v = paymentCountRule.value_json;
    const candidate =
      typeof v?.payment_count === 'number'
        ? (v.payment_count as number)
        : typeof v?.count === 'number'
          ? (v.count as number)
          : undefined;
    if (typeof candidate === 'number' && candidate > 0) {
      paymentCount = candidate;
      paymentCountFromRule = true;
    }
  }

  const hasAntiquityRule = input.rules.some(
    (r) =>
      r.agreement_id === input.agreement.id &&
      r.version_id === input.version.id &&
      r.rule_type === 'antiquity',
  );

  const companyById = new Map(input.companies.map((c) => [c.id, c]));
  const contractsByEmployee = new Map<string, ContractImpactSnapshot[]>();
  for (const c of input.contracts) {
    const arr = contractsByEmployee.get(c.employee_id) ?? [];
    arr.push(c);
    contractsByEmployee.set(c.employee_id, arr);
  }

  for (const employee of input.employees) {
    const company = companyById.get(employee.company_id);
    if (!company) continue;

    const employeeContracts = (contractsByEmployee.get(employee.id) ?? []).filter(
      (c) => c.company_id === employee.company_id,
    );
    if (employeeContracts.length === 0) continue;

    for (const contract of employeeContracts) {
      const mapping = pickMapping(input.mappings, employee, contract);
      const runtimeSetting = pickRuntimeSetting(
        input.runtimeSettings,
        employee,
        contract,
        mapping,
      );

      const ctx = {
        professional_group:
          employee.professional_group ?? contract.current_professional_group,
        level: employee.level ?? contract.current_level,
        category: employee.category ?? contract.current_category,
      };
      const match = matchSalaryTable(tablesForVersion, ctx);

      const preview = computeEmployeeAgreementDelta(
        employee,
        {
          contract,
          company,
          mapping,
          runtimeSetting,
          matchedTable: match.match,
          ambiguousMatch: match.ambiguous,
          fallbackUsed: match.fallbackUsed,
        },
        {
          paymentCount,
          paymentCountFromRule,
          arrears_from: input.options.arrears_from,
          arrears_to: input.options.arrears_to,
          arrears_max_months: input.options.risk_thresholds.arrears_max_months,
          employer_cost_multiplier: input.options.employer_cost_multiplier,
          require_runtime_setting: input.options.require_runtime_setting,
          include_inactive_employees:
            input.options.include_inactive_employees ?? false,
          large_delta_monthly_threshold:
            input.options.risk_thresholds.large_delta_monthly,
          agreement: input.agreement,
          hasAntiquityRule,
        },
      );
      previews.push(preview);
    }
  }

  return previews;
}

function pickMapping(
  mappings: MappingImpactSnapshot[],
  employee: EmployeeImpactSnapshot,
  contract: ContractImpactSnapshot,
): MappingImpactSnapshot | undefined {
  const candidates = mappings.filter((m) => m.is_current);
  return (
    candidates.find(
      (m) => m.contract_id === contract.id && m.company_id === employee.company_id,
    ) ??
    candidates.find(
      (m) => m.employee_id === employee.id && m.company_id === employee.company_id,
    ) ??
    candidates.find(
      (m) =>
        m.company_id === employee.company_id &&
        !m.employee_id &&
        !m.contract_id,
    )
  );
}

function pickRuntimeSetting(
  settings: RuntimeSettingImpactSnapshot[],
  employee: EmployeeImpactSnapshot,
  contract: ContractImpactSnapshot,
  mapping?: MappingImpactSnapshot,
): RuntimeSettingImpactSnapshot | undefined {
  const candidates = settings.filter(
    (s) => s.is_current && s.use_registry_for_payroll,
  );
  return (
    candidates.find((s) => s.contract_id === contract.id) ??
    candidates.find((s) => s.employee_id === employee.id) ??
    (mapping
      ? candidates.find(
          (s) =>
            s.mapping_id === mapping.id &&
            !s.contract_id &&
            !s.employee_id,
        )
      : undefined) ??
    candidates.find(
      (s) =>
        s.company_id === employee.company_id &&
        !s.contract_id &&
        !s.employee_id,
    )
  );
}

/* ==========================================================================
 * Risks / summary / ranking
 * ========================================================================== */

export function detectAgreementImpactRisks(
  input: AgreementImpactInput,
): { eligible: boolean; blockers: string[]; warnings: string[]; reason: string } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const a = input.agreement;

  if (a.ready_for_payroll !== true) blockers.push('registry_not_ready_for_payroll');
  if (a.requires_human_review !== false) blockers.push('registry_requires_human_review');
  if (a.data_completeness !== 'human_validated') blockers.push('registry_not_human_validated');
  if (a.source_quality !== 'official') blockers.push('registry_source_not_official');
  if (a.salary_tables_loaded !== true) blockers.push('registry_salary_tables_not_loaded');
  if (input.version.agreement_id !== a.id) blockers.push('version_mismatch');

  const tables = input.salaryTables.filter(
    (t) =>
      t.agreement_id === a.id &&
      t.version_id === input.version.id &&
      t.year === input.options.target_year,
  );
  if (tables.length === 0) blockers.push('no_salary_tables_for_target_year');

  if (input.options.require_runtime_setting) {
    const anyCurrent = input.runtimeSettings.some(
      (s) => s.is_current && s.use_registry_for_payroll,
    );
    if (!anyCurrent) blockers.push('no_current_runtime_setting');
  }

  const eligible = blockers.length === 0;
  return {
    eligible,
    blockers,
    warnings,
    reason: eligible ? 'eligible' : blockers[0] ?? 'not_eligible',
  };
}

export function summarizeAgreementImpact(
  previews: EmployeeAgreementImpactPreview[],
): AgreementImpactSummary {
  const companies = new Set<string>();
  let affected = 0;
  let blocked = 0;
  let totalMonthly = 0;
  let totalAnnual = 0;
  let totalArrears = 0;
  let totalEmployerCost = 0;
  let highRisk = 0;
  for (const p of previews) {
    companies.add(p.company_id);
    if (p.affected) affected++;
    if (p.blocked) blocked++;
    totalMonthly += p.delta_monthly;
    totalAnnual += p.delta_annual;
    totalArrears += p.arrears_estimate;
    totalEmployerCost += p.employer_cost_delta;
    if (p.risk_score >= 60) highRisk++;
  }
  return {
    companies_scanned: companies.size,
    employees_scanned: previews.length,
    employees_affected: affected,
    employees_blocked: blocked,
    total_monthly_delta: round2(totalMonthly),
    total_annual_delta: round2(totalAnnual),
    total_arrears_estimate: round2(totalArrears),
    total_employer_cost_delta: round2(totalEmployerCost),
    high_risk_count: highRisk,
  };
}

export function rankAffectedEmployeesByRisk(
  previews: EmployeeAgreementImpactPreview[],
): EmployeeAgreementImpactPreview[] {
  return [...previews].sort((a, b) => {
    if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
    return Math.abs(b.delta_monthly) - Math.abs(a.delta_monthly);
  });
}

export function buildAgreementImpactTrace(
  input: AgreementImpactInput,
): AgreementImpactTrace {
  const provided = input.options.employer_cost_multiplier;
  const multiplier =
    typeof provided === 'number' && provided > 0
      ? provided
      : DEFAULT_EMPLOYER_COST_MULTIPLIER;
  const defaulted = !(typeof provided === 'number' && provided > 0);

  return {
    agreement_id: input.agreement.id,
    version_id: input.version.id,
    target_year: input.options.target_year,
    as_of_date: input.options.as_of_date,
    arrears_window:
      input.options.arrears_from && input.options.arrears_to
        ? { from: input.options.arrears_from, to: input.options.arrears_to }
        : undefined,
    employer_cost_multiplier: multiplier,
    employer_cost_multiplier_defaulted: defaulted,
    payment_count_default: DEFAULT_PAYMENT_COUNT,
    evaluated_at_iso: '1970-01-01T00:00:00.000Z', // deterministic; engine is pure
  };
}

/* ==========================================================================
 * Top-level preview
 * ========================================================================== */

export function computeAgreementImpactPreview(
  input: AgreementImpactInput,
): AgreementImpactResult {
  const trace = buildAgreementImpactTrace(input);
  const eligibility = detectAgreementImpactRisks(input);

  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      blockers: eligibility.blockers,
      warnings: eligibility.warnings,
      summary: emptySummary(input),
      employee_previews: [],
      trace,
    };
  }

  const previews = computeAffectedEmployees(input);
  const summary = summarizeAgreementImpact(previews);

  return {
    eligible: true,
    reason: 'eligible',
    blockers: [],
    warnings: eligibility.warnings,
    summary,
    employee_previews: previews,
    trace,
  };
}

function emptySummary(input: AgreementImpactInput): AgreementImpactSummary {
  return {
    companies_scanned: input.companies.length,
    employees_scanned: 0,
    employees_affected: 0,
    employees_blocked: 0,
    total_monthly_delta: 0,
    total_annual_delta: 0,
    total_arrears_estimate: 0,
    total_employer_cost_delta: 0,
    high_risk_count: 0,
  };
}

/* ==========================================================================
 * Helpers
 * ========================================================================== */

function round2(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  const years = to.getUTCFullYear() - from.getUTCFullYear();
  const months = to.getUTCMonth() - from.getUTCMonth();
  let total = years * 12 + months;
  // partial month if day-of-month of `to` > day-of-month of `from`
  if (to.getUTCDate() >= from.getUTCDate()) total += 1;
  return Math.max(0, total);
}

function scoreRisk(flags: AgreementImpactRiskFlag[], blockers: string[]): number {
  let score = 0;
  for (const f of flags) {
    switch (f) {
      case 'missing_salary_table':
      case 'mapping_not_approved':
      case 'registry_not_ready':
      case 'missing_concept_literal':
      case 'missing_payslip_label':
        score += 30;
        break;
      case 'large_delta':
      case 'salary_below_agreement':
        score += 20;
        break;
      case 'ambiguous_salary_table_match':
      case 'missing_runtime_setting':
      case 'missing_antiquity_rule':
      case 'arrears_period_too_long':
        score += 15;
        break;
      case 'salary_above_agreement':
      case 'negative_delta':
      case 'inactive_employee':
      case 'inactive_contract':
        score += 10;
        break;
    }
  }
  if (blockers.length > 0) score = Math.max(score, 50);
  return Math.min(100, score);
}
