/**
 * B8B — Collective Agreement Activation Readiness (pure).
 *
 * Computes a deterministic readiness report for proposing the activation
 * of a registry agreement so it can (in B9, NOT here) be marked ready for
 * payroll consumption from the Master Registry.
 *
 * HARD SAFETY:
 *  - Pure function. No Supabase, no fetch, no React.
 *  - Never mutates anything.
 *  - Never sets `ready_for_payroll`. Never touches the operational table
 *    `erp_hr_collective_agreements` (without `_registry`). Never imports
 *    payroll engines.
 *  - The returned report is signed by the caller via the activation service.
 */

// =============================================================
// Input row-like types (decoupled from DB Row types so the engine
// can be tested with plain literals).
// =============================================================

export interface RegistryAgreementLike {
  id: string;
  status: string; // vigente | vencido | ultraactividad | sustituido | pendiente_validacion
  source_quality: string; // official | public_secondary | pending_official_validation | legacy_static
  data_completeness: string; // metadata_only | salary_tables_loaded | parsed_partial | parsed_full | human_validated
  salary_tables_loaded: boolean;
}

export interface RegistryVersionLike {
  id: string;
  agreement_id: string;
  is_current: boolean;
  source_hash: string | null;
}

export interface RegistryValidationLike {
  id: string;
  agreement_id: string;
  version_id: string;
  validation_status: string; // approved_internal expected
  is_current: boolean;
  validation_scope: string[];
  sha256_hash: string;
  /**
   * Optional checklist materialised by the caller. When present, B8B
   * also checks that `no_payroll_use_acknowledged` is `verified` (B8A
   * already enforces it, but we re-check defensively).
   */
  checklist?: Array<{ key: string; status: string }>;
}

export interface RegistrySourceLike {
  id: string;
  agreement_id: string;
  document_hash: string | null;
  source_quality: string;
}

// =============================================================
// Output
// =============================================================

export type ActivationCheckSeverity = 'blocking' | 'warning' | 'info';

export interface ActivationReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: ActivationCheckSeverity;
  detail?: string;
}

export interface ActivationReadinessReport {
  passed: boolean;
  checks: ActivationReadinessCheck[];
  blocking_failures: string[];
  /** Schema version of this report; embedded in the signed payload. */
  schema_version: 'b8b-v1';
}

export interface ComputeReadinessInput {
  agreement: RegistryAgreementLike;
  version: RegistryVersionLike;
  validation: RegistryValidationLike;
  source: RegistrySourceLike;
  salaryTablesCount: number;
  rulesCount: number;
  unresolvedCriticalWarningsCount: number;
  discardedCriticalRowsUnresolvedCount: number;
}

// =============================================================
// Constants
// =============================================================

const ALLOWED_AGREEMENT_STATUS = new Set(['vigente', 'ultraactividad']);
const ALLOWED_DATA_COMPLETENESS = new Set([
  'parsed_partial',
  'parsed_full',
  'human_validated',
]);
const REQUIRED_SCOPES = ['metadata', 'salary_tables', 'rules'] as const;

// =============================================================
// Engine
// =============================================================

export function computeActivationReadiness(
  input: ComputeReadinessInput,
): ActivationReadinessReport {
  const checks: ActivationReadinessCheck[] = [];

  const push = (
    id: string,
    label: string,
    passed: boolean,
    severity: ActivationCheckSeverity = 'blocking',
    detail?: string,
  ) => {
    checks.push({ id, label, passed, severity, detail });
  };

  const v = input.validation;
  const ver = input.version;
  const ag = input.agreement;
  const src = input.source;

  // 1) Validation must be approved_internal
  push(
    'validation_approved_internal',
    'Validación interna aprobada',
    v.validation_status === 'approved_internal',
    'blocking',
    `validation_status=${v.validation_status}`,
  );

  // 2) Validation must be current
  push(
    'validation_is_current',
    'Validación marcada como vigente (is_current)',
    v.is_current === true,
  );

  // 3-5) Validation scope must include metadata + salary_tables + rules
  const scope = new Set(v.validation_scope ?? []);
  for (const required of REQUIRED_SCOPES) {
    push(
      `validation_scope_${required}`,
      `Scope de validación incluye "${required}"`,
      scope.has(required),
    );
  }

  // 6) Version must be current
  push(
    'version_is_current',
    'Versión del convenio marcada como vigente',
    ver.is_current === true,
  );

  // 7) Version belongs to agreement
  push(
    'version_belongs_to_agreement',
    'Versión pertenece al convenio',
    ver.agreement_id === ag.id,
  );

  // 8) Source belongs to agreement
  push(
    'source_belongs_to_agreement',
    'Fuente pertenece al convenio',
    src.agreement_id === ag.id,
  );

  // 9) SHA-256 match: source.document_hash === version.source_hash === validation.sha256_hash
  const versionHash = ver.source_hash ?? '';
  const sourceHash = src.document_hash ?? '';
  const validationHash = v.sha256_hash ?? '';
  const sha256Aligned =
    /^[a-f0-9]{64}$/.test(validationHash) &&
    versionHash === validationHash &&
    sourceHash === validationHash;
  push(
    'sha256_alignment',
    'SHA-256 coincide entre fuente, versión y validación',
    sha256Aligned,
    'blocking',
    `source=${sourceHash || 'null'}; version=${versionHash || 'null'}; validation=${validationHash || 'null'}`,
  );

  // 10) Source quality must be official
  push(
    'source_quality_official',
    'Fuente oficial',
    src.source_quality === 'official',
    'blocking',
    `source_quality=${src.source_quality}`,
  );

  // 11) Salary tables loaded flag on registry
  push(
    'agreement_salary_tables_loaded',
    'Convenio con tablas salariales cargadas',
    ag.salary_tables_loaded === true,
  );

  // 12) Data completeness must be parsed_partial+ (or already human_validated)
  push(
    'agreement_data_completeness_min',
    'Convenio con completeness mínima (parsed_partial+)',
    ALLOWED_DATA_COMPLETENESS.has(ag.data_completeness),
    'blocking',
    `data_completeness=${ag.data_completeness}`,
  );

  // 13) Agreement status in (vigente, ultraactividad)
  push(
    'agreement_status_vigente_or_ultra',
    'Convenio vigente o en ultraactividad',
    ALLOWED_AGREEMENT_STATUS.has(ag.status),
    'blocking',
    `status=${ag.status}`,
  );

  // 14) No unresolved critical warnings
  push(
    'no_unresolved_critical_warnings',
    'Sin warnings críticos abiertos',
    (input.unresolvedCriticalWarningsCount ?? 0) === 0,
    'blocking',
    `unresolved_critical=${input.unresolvedCriticalWarningsCount}`,
  );

  // 15) No critical discarded rows unresolved
  push(
    'no_unresolved_discarded_critical_rows',
    'Sin filas descartadas críticas sin resolver',
    (input.discardedCriticalRowsUnresolvedCount ?? 0) === 0,
    'blocking',
    `discarded_critical_unresolved=${input.discardedCriticalRowsUnresolvedCount}`,
  );

  // 16) Salary tables count > 0
  push(
    'salary_tables_count_gt_zero',
    'Existe al menos una tabla salarial parseada',
    (input.salaryTablesCount ?? 0) > 0,
    'blocking',
    `salaryTablesCount=${input.salaryTablesCount}`,
  );

  // 17) Rules count > 0
  push(
    'rules_count_gt_zero',
    'Existe al menos una regla parseada',
    (input.rulesCount ?? 0) > 0,
    'blocking',
    `rulesCount=${input.rulesCount}`,
  );

  // 18) (Optional) checklist no_payroll_use_acknowledged verified
  if (Array.isArray(v.checklist)) {
    const ack = v.checklist.find((c) => c.key === 'no_payroll_use_acknowledged');
    push(
      'checklist_no_payroll_use_ack',
      'Checklist B8A: no_payroll_use_acknowledged verificado',
      !!ack && ack.status === 'verified',
      'blocking',
    );
  }

  const blocking_failures = checks
    .filter((c) => !c.passed && c.severity === 'blocking')
    .map((c) => c.id);

  return {
    passed: blocking_failures.length === 0,
    checks,
    blocking_failures,
    schema_version: 'b8b-v1',
  };
}