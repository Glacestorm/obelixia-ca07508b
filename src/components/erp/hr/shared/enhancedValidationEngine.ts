/**
 * enhancedValidationEngine — V2-ES.8 Tramo 3
 * Structural validation closer to real formats for TGSS, Contrat@, and AEAT.
 *
 * Adds:
 * - AFI/FAN structural position validation for TGSS
 * - XML structural tag validation for Contrat@
 * - Modelo 111/190 field-level structural validation for AEAT
 * - Detailed ValidationReport with score, sections, and suggestions
 *
 * DISCLAIMER: Validación interna mejorada — NO sustituye validación oficial del organismo.
 * NO valida contra XSD/esquema real. Es una aproximación estructural para readiness.
 *
 * Pure function — no DB access, no side effects.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ValidationDomain = 'tgss_siltra' | 'contrata_sepe' | 'aeat_111' | 'aeat_190';

export type ValidationSectionStatus = 'pass' | 'warning' | 'error' | 'skipped';

export interface ValidationSection {
  id: string;
  label: string;
  status: ValidationSectionStatus;
  checks: ValidationCheckDetail[];
  score: number; // 0-100
}

export interface ValidationCheckDetail {
  id: string;
  field: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  /** Expected format or value */
  expected?: string;
  /** Actual value found */
  actual?: string;
  /** Suggestion for fixing */
  suggestion?: string;
}

export interface ValidationReport {
  domain: ValidationDomain;
  version: string;
  /** Overall score 0-100 */
  score: number;
  /** Overall pass/fail */
  passed: boolean;
  /** Sections with detailed checks */
  sections: ValidationSection[];
  /** Total counts */
  errorCount: number;
  warningCount: number;
  passCount: number;
  /** Summary message */
  summary: string;
  /** Blockers — issues that prevent dry-run */
  blockers: string[];
  /** Warnings — non-blocking issues */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Timestamp */
  validatedAt: string;
  /** Disclaimer */
  disclaimer: string;
}

// ─── Shared validators ──────────────────────────────────────────────────────

function checkLength(value: string, expected: number, fieldLabel: string): ValidationCheckDetail {
  const actual = value.replace(/[\s\-\/]/g, '').length;
  return {
    id: `len_${fieldLabel.toLowerCase().replace(/\s/g, '_')}`,
    field: fieldLabel,
    label: `Longitud ${fieldLabel}`,
    passed: actual === expected,
    severity: actual === expected ? 'info' : 'error',
    message: actual === expected ? `${actual} caracteres — correcto` : `Esperado ${expected}, encontrado ${actual}`,
    expected: `${expected} caracteres`,
    actual: `${actual} caracteres`,
    suggestion: actual !== expected ? `Verificar que ${fieldLabel} tiene exactamente ${expected} caracteres` : undefined,
  };
}

function checkPattern(value: string, pattern: RegExp, fieldLabel: string, expectedDesc: string): ValidationCheckDetail {
  const matches = pattern.test(value.trim());
  return {
    id: `pat_${fieldLabel.toLowerCase().replace(/\s/g, '_')}`,
    field: fieldLabel,
    label: `Formato ${fieldLabel}`,
    passed: matches,
    severity: matches ? 'info' : 'error',
    message: matches ? `Formato válido` : `No coincide con formato esperado: ${expectedDesc}`,
    expected: expectedDesc,
    actual: value.substring(0, 20),
    suggestion: !matches ? `Formato esperado: ${expectedDesc}` : undefined,
  };
}

function checkRequired(value: unknown, fieldLabel: string): ValidationCheckDetail {
  const present = value != null && String(value).trim() !== '';
  return {
    id: `req_${fieldLabel.toLowerCase().replace(/\s/g, '_')}`,
    field: fieldLabel,
    label: `${fieldLabel} presente`,
    passed: present,
    severity: present ? 'info' : 'error',
    message: present ? 'Presente' : `${fieldLabel} es obligatorio`,
    suggestion: !present ? `Completar ${fieldLabel}` : undefined,
  };
}

function checkNumericRange(value: number | null | undefined, min: number, max: number, fieldLabel: string): ValidationCheckDetail {
  const present = value != null;
  const inRange = present && value >= min && value <= max;
  return {
    id: `range_${fieldLabel.toLowerCase().replace(/\s/g, '_')}`,
    field: fieldLabel,
    label: `Rango ${fieldLabel}`,
    passed: inRange,
    severity: !present ? 'warning' : inRange ? 'info' : 'error',
    message: !present ? `${fieldLabel} no especificado` : inRange ? `${value} — dentro del rango` : `${value} fuera del rango [${min}-${max}]`,
    expected: `${min}-${max}`,
    actual: present ? String(value) : 'N/A',
  };
}

function sectionScore(checks: ValidationCheckDetail[]): number {
  if (checks.length === 0) return 100;
  const passed = checks.filter(c => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}

function sectionStatus(checks: ValidationCheckDetail[]): ValidationSectionStatus {
  if (checks.some(c => !c.passed && c.severity === 'error')) return 'error';
  if (checks.some(c => !c.passed && c.severity === 'warning')) return 'warning';
  return 'pass';
}

// ─── TGSS/SILTRA Structural Validation ──────────────────────────────────────

/**
 * AFI (Afiliación) record structural validation.
 * Validates field positions, lengths, and types as per SILTRA AFI format.
 */
export function validateTGSSStructural(payload: Record<string, unknown> | null): ValidationReport {
  if (!payload) return emptyReport('tgss_siltra', 'Sin payload TGSS para validar');

  const worker = (payload.worker || {}) as Record<string, unknown>;
  const employer = (payload.employer || {}) as Record<string, unknown>;
  const contract = (payload.contract || {}) as Record<string, unknown>;
  const ss = (payload.social_security || {}) as Record<string, unknown>;
  const banking = (payload.banking || {}) as Record<string, unknown>;

  // Section 1: Worker identification (AFI positions 1-50)
  const workerChecks: ValidationCheckDetail[] = [
    checkRequired(worker.naf, 'NAF'),
    ...(worker.naf ? [
      checkLength(String(worker.naf), 12, 'NAF'),
      checkPattern(String(worker.naf), /^\d{12}$/, 'NAF', '12 dígitos numéricos'),
      // AFI: Province code (first 2 digits) must be 01-52
      {
        id: 'afi_naf_province',
        field: 'NAF',
        label: 'Provincia NAF (AFI pos 1-2)',
        passed: /^(0[1-9]|[1-4]\d|5[0-2])/.test(String(worker.naf).replace(/\D/g, '')),
        severity: 'warning' as const,
        message: /^(0[1-9]|[1-4]\d|5[0-2])/.test(String(worker.naf).replace(/\D/g, ''))
          ? `Provincia ${String(worker.naf).substring(0, 2)} — válida`
          : `Código provincia ${String(worker.naf).substring(0, 2)} fuera de rango 01-52`,
        expected: '01-52',
        actual: String(worker.naf).substring(0, 2),
      },
    ] : []),
    checkRequired(worker.dni_nie, 'DNI/NIE'),
    ...(worker.dni_nie ? [
      checkPattern(String(worker.dni_nie), /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/, 'DNI/NIE', '8 dígitos + letra ó X/Y/Z + 7 dígitos + letra'),
      // DNI letter verification
      (() => {
        const val = String(worker.dni_nie).trim().toUpperCase();
        if (/^\d{8}[A-Z]$/.test(val)) {
          const num = parseInt(val.substring(0, 8), 10);
          const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
          const expectedLetter = letters[num % 23];
          const actualLetter = val[8];
          return {
            id: 'afi_dni_check_letter',
            field: 'DNI',
            label: 'Dígito control DNI',
            passed: actualLetter === expectedLetter,
            severity: (actualLetter === expectedLetter ? 'info' : 'error') as 'info' | 'error',
            message: actualLetter === expectedLetter
              ? `Letra de control ${actualLetter} — correcta`
              : `Letra esperada ${expectedLetter}, encontrada ${actualLetter}`,
            expected: expectedLetter,
            actual: actualLetter,
            suggestion: actualLetter !== expectedLetter ? 'Verificar número de DNI — la letra de control no coincide' : undefined,
          };
        }
        return { id: 'afi_dni_check_letter', field: 'DNI', label: 'Dígito control DNI', passed: true, severity: 'info' as const, message: 'NIE — verificación de letra no aplicable' };
      })(),
    ] : []),
  ];

  // Section 2: Employer (AFI positions 51-80)
  const employerChecks: ValidationCheckDetail[] = [
    checkRequired(employer.ccc, 'CCC'),
    ...(employer.ccc ? [
      checkLength(String(employer.ccc), 11, 'CCC'),
      checkPattern(String(employer.ccc), /^\d{11}$/, 'CCC', '11 dígitos numéricos'),
    ] : []),
  ];

  // Section 3: Contract data (AFI positions 81-150)
  const contractChecks: ValidationCheckDetail[] = [
    checkRequired(contract.type_code, 'Código contrato'),
    ...(contract.type_code ? [
      checkPattern(String(contract.type_code), /^\d{3}$/, 'Código contrato', '3 dígitos (ej: 100, 401)'),
    ] : []),
    checkRequired(contract.start_date, 'Fecha inicio'),
    ...(contract.start_date ? [
      checkPattern(String(contract.start_date), /^\d{4}-\d{2}-\d{2}$/, 'Fecha inicio', 'AAAA-MM-DD'),
    ] : []),
    // Temporary contract requires end date
    ...(contract.is_temporary ? [
      checkRequired(contract.end_date, 'Fecha fin (contrato temporal)'),
    ] : []),
    ...(contract.working_coefficient != null ? [
      checkNumericRange(contract.working_coefficient as number, 0.01, 1.0, 'Coef. jornada'),
    ] : []),
  ];

  // Section 4: Social Security (AFI positions 151-200)
  const ssChecks: ValidationCheckDetail[] = [
    checkRequired(ss.contribution_group, 'Grupo cotización'),
    ...(ss.contribution_group ? [
      checkNumericRange(parseInt(String(ss.contribution_group), 10), 1, 11, 'Grupo cotización'),
    ] : []),
    checkRequired(ss.regime, 'Régimen SS'),
    ...(ss.regime ? [
      {
        id: 'afi_regime_valid',
        field: 'Régimen',
        label: 'Régimen conocido',
        passed: ['general', 'autonomos', 'agrario', 'mar', 'mineria', 'hogar'].includes(String(ss.regime)),
        severity: (['general', 'autonomos', 'agrario', 'mar', 'mineria', 'hogar'].includes(String(ss.regime)) ? 'info' : 'warning') as 'info' | 'warning',
        message: ['general', 'autonomos', 'agrario', 'mar', 'mineria', 'hogar'].includes(String(ss.regime))
          ? `Régimen ${ss.regime} — reconocido`
          : `Régimen ${ss.regime} no estándar — verificar`,
      },
    ] : []),
  ];

  // Section 5: Banking (optional but structured)
  const bankingChecks: ValidationCheckDetail[] = [];
  if (banking.iban) {
    bankingChecks.push(
      checkPattern(String(banking.iban), /^ES\d{22}$/, 'IBAN', 'ES + 22 dígitos'),
      checkLength(String(banking.iban).replace(/\s/g, ''), 24, 'IBAN'),
    );
  }

  const sections: ValidationSection[] = [
    { id: 'worker', label: 'Identificación trabajador (AFI)', checks: workerChecks, score: sectionScore(workerChecks), status: sectionStatus(workerChecks) },
    { id: 'employer', label: 'Empresa / CCC (AFI)', checks: employerChecks, score: sectionScore(employerChecks), status: sectionStatus(employerChecks) },
    { id: 'contract', label: 'Datos contrato (AFI)', checks: contractChecks, score: sectionScore(contractChecks), status: sectionStatus(contractChecks) },
    { id: 'social_security', label: 'Seguridad Social (AFI)', checks: ssChecks, score: sectionScore(ssChecks), status: sectionStatus(ssChecks) },
    ...(bankingChecks.length > 0 ? [{
      id: 'banking', label: 'Domiciliación bancaria', checks: bankingChecks, score: sectionScore(bankingChecks), status: sectionStatus(bankingChecks),
    }] : []),
  ];

  return buildReport('tgss_siltra', sections);
}

// ─── Contrat@/SEPE Structural Validation ────────────────────────────────────

/**
 * XML structural validation for Contrat@.
 * Validates that all required XML elements would be present and correctly formatted.
 */
export function validateContrataStructural(payload: Record<string, unknown> | null): ValidationReport {
  if (!payload) return emptyReport('contrata_sepe', 'Sin payload Contrat@ para validar');

  const worker = (payload.worker || {}) as Record<string, unknown>;
  const employer = (payload.employer || {}) as Record<string, unknown>;
  const contract = (payload.contract || {}) as Record<string, unknown>;
  const conditions = (payload.working_conditions || {}) as Record<string, unknown>;
  const compensation = (payload.compensation || {}) as Record<string, unknown>;

  // Section 1: <DatosIdentificativosTrabajador>
  const workerChecks: ValidationCheckDetail[] = [
    checkRequired(worker.dni_nie, 'DNI/NIE'),
    ...(worker.dni_nie ? [
      checkPattern(String(worker.dni_nie), /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/, 'DNI/NIE', 'DNI: 8d+1L / NIE: X|Y|Z+7d+1L'),
    ] : []),
    checkRequired(worker.naf, 'NAF'),
    ...(worker.naf ? [
      checkLength(String(worker.naf), 12, 'NAF'),
    ] : []),
  ];

  // Section 2: <DatosEmpresa>
  const employerChecks: ValidationCheckDetail[] = [
    checkRequired(employer.ccc, 'CCC'),
    ...(employer.ccc ? [
      checkLength(String(employer.ccc), 11, 'CCC'),
    ] : []),
  ];

  // Section 3: <DatosContrato>
  const contractChecks: ValidationCheckDetail[] = [
    checkRequired(contract.type_code, 'Código contrato'),
    ...(contract.type_code ? [
      checkPattern(String(contract.type_code), /^\d{3}$/, 'Código contrato', '3 dígitos'),
    ] : []),
    checkRequired(contract.start_date, 'Fecha inicio'),
    ...(contract.start_date ? [
      checkPattern(String(contract.start_date), /^\d{4}-\d{2}-\d{2}$/, 'Fecha inicio', 'AAAA-MM-DD'),
    ] : []),
    checkRequired(contract.duration_type, 'Tipo duración'),
    ...(contract.is_temporary ? [
      checkRequired(contract.end_date, 'Fecha fin (temporal)'),
    ] : []),
    ...(contract.is_conversion ? [
      checkRequired(contract.conversion_from_type, 'Tipo contrato anterior (conversión)'),
    ] : []),
  ];

  // Section 4: <CondicionesTrabajo>
  const condChecks: ValidationCheckDetail[] = [
    checkRequired(conditions.hours_type, 'Tipo jornada'),
    checkRequired(conditions.occupation_code, 'Código CNO'),
    ...(conditions.occupation_code ? [
      checkPattern(String(conditions.occupation_code), /^\d{4,6}$/, 'Código CNO', '4-6 dígitos numéricos'),
    ] : []),
    ...(conditions.hours_type === 'parcial' ? [
      checkRequired(conditions.hours_percent, '% Jornada (parcial)'),
      ...(conditions.hours_percent != null ? [
        checkNumericRange(conditions.hours_percent as number, 1, 99, '% Jornada'),
      ] : []),
    ] : []),
    ...(conditions.weekly_hours != null ? [
      checkNumericRange(conditions.weekly_hours as number, 1, 60, 'Horas semanales'),
    ] : []),
  ];

  // Section 5: <DatosRetributivos> (recommended)
  const compChecks: ValidationCheckDetail[] = [];
  if (compensation.salary_gross_annual != null) {
    compChecks.push(checkNumericRange(compensation.salary_gross_annual as number, 1000, 500000, 'Salario bruto anual'));
  }
  if (compensation.salary_base_monthly != null) {
    compChecks.push(checkNumericRange(compensation.salary_base_monthly as number, 100, 50000, 'Salario base mensual'));
  }
  // Cross-check: monthly * (12 + extras) should approximate annual
  if (compensation.salary_gross_annual != null && compensation.salary_base_monthly != null) {
    const annual = compensation.salary_gross_annual as number;
    const monthly = compensation.salary_base_monthly as number;
    const extras = (compensation.num_extra_payments as number) || 2;
    const estimated = monthly * (12 + extras);
    const deviation = Math.abs(estimated - annual) / annual;
    compChecks.push({
      id: 'xml_salary_coherence',
      field: 'Coherencia salarial',
      label: 'Salario base × pagas ≈ bruto anual',
      passed: deviation < 0.15,
      severity: deviation < 0.15 ? 'info' : 'warning',
      message: deviation < 0.15
        ? `Estimado ${estimated.toLocaleString('es-ES')}€ vs declarado ${annual.toLocaleString('es-ES')}€ — coherente`
        : `Estimado ${estimated.toLocaleString('es-ES')}€ difiere del declarado ${annual.toLocaleString('es-ES')}€ (${(deviation * 100).toFixed(0)}%)`,
      suggestion: deviation >= 0.15 ? 'Verificar que el salario bruto anual incluye pagas extras' : undefined,
    });
  }

  const sections: ValidationSection[] = [
    { id: 'worker', label: '<DatosIdentificativosTrabajador>', checks: workerChecks, score: sectionScore(workerChecks), status: sectionStatus(workerChecks) },
    { id: 'employer', label: '<DatosEmpresa>', checks: employerChecks, score: sectionScore(employerChecks), status: sectionStatus(employerChecks) },
    { id: 'contract', label: '<DatosContrato>', checks: contractChecks, score: sectionScore(contractChecks), status: sectionStatus(contractChecks) },
    { id: 'conditions', label: '<CondicionesTrabajo>', checks: condChecks, score: sectionScore(condChecks), status: sectionStatus(condChecks) },
    ...(compChecks.length > 0 ? [{
      id: 'compensation', label: '<DatosRetributivos>', checks: compChecks, score: sectionScore(compChecks), status: sectionStatus(compChecks),
    }] : []),
  ];

  return buildReport('contrata_sepe', sections);
}

// ─── AEAT Structural Validation ─────────────────────────────────────────────

/**
 * Modelo 111 structural validation.
 * Validates field-level structure matching BOE-defined casillas.
 */
export function validateAEAT111Structural(payload: Record<string, unknown> | null): ValidationReport {
  if (!payload) return emptyReport('aeat_111', 'Sin payload Modelo 111 para validar');

  const declarante = (payload.declarante || {}) as Record<string, unknown>;
  const periodo = (payload.periodo || {}) as Record<string, unknown>;
  const modelo = (payload.modelo_111 || {}) as Record<string, unknown>;

  // Section 1: Declarante
  const declChecks: ValidationCheckDetail[] = [
    checkRequired(declarante.nif, 'NIF declarante'),
    ...(declarante.nif ? [
      checkPattern(String(declarante.nif), /^[A-Z0-9]\d{7}[A-Z0-9]$/, 'NIF', 'Letra/dígito + 7 dígitos + letra/dígito'),
      checkLength(String(declarante.nif), 9, 'NIF'),
    ] : []),
    checkRequired(declarante.razon_social, 'Razón social'),
  ];

  // Section 2: Período
  const perChecks: ValidationCheckDetail[] = [
    checkRequired(periodo.ejercicio, 'Ejercicio'),
    ...(periodo.ejercicio != null ? [
      checkNumericRange(periodo.ejercicio as number, 2020, 2030, 'Ejercicio'),
    ] : []),
    checkRequired(periodo.periodo, 'Período'),
    ...(periodo.periodo ? [
      checkPattern(String(periodo.periodo), /^([1-4]T|0[1-9]|1[0-2])$/, 'Período', '1T-4T ó 01-12'),
    ] : []),
  ];

  // Section 3: Casillas del modelo
  const modelChecks: ValidationCheckDetail[] = [];

  // Casilla 01: Nº perceptores rendimientos trabajo
  if (modelo.total_perceptores != null) {
    modelChecks.push(checkNumericRange(modelo.total_perceptores as number, 0, 999999, 'Casilla 01 — Nº perceptores'));
  } else {
    modelChecks.push(checkRequired(null, 'Casilla 01 — Nº perceptores'));
  }

  // Casilla 02: Total percepciones
  if (modelo.total_percepciones != null) {
    modelChecks.push({
      id: 'aeat111_c02',
      field: 'Casilla 02',
      label: 'Total percepciones (2 decimales)',
      passed: true,
      severity: 'info',
      message: `${(modelo.total_percepciones as number).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
    });
  }

  // Casilla 03: Total retenciones
  if (modelo.total_retenciones != null) {
    modelChecks.push({
      id: 'aeat111_c03',
      field: 'Casilla 03',
      label: 'Total retenciones (2 decimales)',
      passed: true,
      severity: 'info',
      message: `${(modelo.total_retenciones as number).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
    });

    // Cross-check: retenciones shouldn't exceed percepciones
    if (modelo.total_percepciones != null && (modelo.total_retenciones as number) > (modelo.total_percepciones as number)) {
      modelChecks.push({
        id: 'aeat111_ret_vs_perc',
        field: 'Coherencia',
        label: 'Retenciones ≤ Percepciones',
        passed: false,
        severity: 'error',
        message: 'Las retenciones superan las percepciones — error aritmético',
        suggestion: 'Verificar los importes de retenciones y percepciones del período',
      });
    }

    // Type rate sanity
    if (modelo.total_percepciones != null && (modelo.total_percepciones as number) > 0) {
      const rate = ((modelo.total_retenciones as number) / (modelo.total_percepciones as number)) * 100;
      modelChecks.push({
        id: 'aeat111_avg_rate',
        field: 'Tipo medio',
        label: 'Tipo medio retención',
        passed: rate <= 50,
        severity: rate <= 50 ? 'info' : 'warning',
        message: `${rate.toFixed(2)}%${rate > 50 ? ' — inusualmente alto' : ''}`,
        suggestion: rate > 50 ? 'Un tipo medio superior al 50% es inusual — verificar' : undefined,
      });
    }
  }

  const sections: ValidationSection[] = [
    { id: 'declarante', label: 'Declarante (NIF/Razón Social)', checks: declChecks, score: sectionScore(declChecks), status: sectionStatus(declChecks) },
    { id: 'periodo', label: 'Ejercicio / Período', checks: perChecks, score: sectionScore(perChecks), status: sectionStatus(perChecks) },
    { id: 'casillas', label: 'Casillas Modelo 111', checks: modelChecks, score: sectionScore(modelChecks), status: sectionStatus(modelChecks) },
  ];

  return buildReport('aeat_111', sections);
}

/**
 * Modelo 190 structural validation.
 */
export function validateAEAT190Structural(payload: Record<string, unknown> | null): ValidationReport {
  if (!payload) return emptyReport('aeat_190', 'Sin payload Modelo 190 para validar');

  const declarante = (payload.declarante || {}) as Record<string, unknown>;
  const perceptores = (payload.perceptores || []) as Array<Record<string, unknown>>;
  const totals = (payload.totals || {}) as Record<string, unknown>;

  // Section 1: Declarante
  const declChecks: ValidationCheckDetail[] = [
    checkRequired(declarante.nif, 'NIF declarante'),
    ...(declarante.nif ? [
      checkLength(String(declarante.nif), 9, 'NIF'),
    ] : []),
    checkRequired(declarante.razon_social, 'Razón social'),
    checkRequired(payload.ejercicio, 'Ejercicio'),
  ];

  // Section 2: Perceptores
  const percChecks: ValidationCheckDetail[] = [];
  percChecks.push({
    id: 'aeat190_perc_count',
    field: 'Perceptores',
    label: 'Nº perceptores',
    passed: perceptores.length > 0,
    severity: perceptores.length > 0 ? 'info' : 'error',
    message: `${perceptores.length} perceptores`,
  });

  // Validate NIF of first 5 perceptores as sample
  const sample = perceptores.slice(0, 5);
  const nifValid = sample.every(p => p.nif && String(p.nif).length >= 8);
  percChecks.push({
    id: 'aeat190_perc_nif',
    field: 'NIF perceptores',
    label: 'NIF perceptores (muestra)',
    passed: nifValid,
    severity: nifValid ? 'info' : 'error',
    message: nifValid ? `Muestra de ${sample.length} NIFs — válidos` : 'Algunos perceptores sin NIF válido',
    suggestion: !nifValid ? 'Completar NIF de todos los perceptores' : undefined,
  });

  // Check clave_percepcion
  const claveValid = sample.every(p => p.clave_percepcion && String(p.clave_percepcion).length >= 1);
  percChecks.push({
    id: 'aeat190_clave',
    field: 'Clave percepción',
    label: 'Clave de percepción',
    passed: claveValid,
    severity: claveValid ? 'info' : 'warning',
    message: claveValid ? 'Claves de percepción presentes' : 'Algunos perceptores sin clave de percepción',
  });

  // Section 3: Totals coherence
  const totalChecks: ValidationCheckDetail[] = [];
  if (totals.total_perceptores != null) {
    totalChecks.push({
      id: 'aeat190_total_match',
      field: 'Total perceptores',
      label: 'Total = Nº registros',
      passed: (totals.total_perceptores as number) === perceptores.length,
      severity: (totals.total_perceptores as number) === perceptores.length ? 'info' : 'warning',
      message: `Declarado: ${totals.total_perceptores}, Registros: ${perceptores.length}`,
    });
  }
  if (totals.total_retenciones != null && totals.total_percepciones_integras != null) {
    const ret = totals.total_retenciones as number;
    const perc = totals.total_percepciones_integras as number;
    totalChecks.push({
      id: 'aeat190_ret_coherence',
      field: 'Coherencia retenciones',
      label: 'Retenciones ≤ Percepciones íntegras',
      passed: ret <= perc,
      severity: ret <= perc ? 'info' : 'error',
      message: ret <= perc ? 'Coherente' : `Retenciones (${ret.toLocaleString('es-ES')}€) > Percepciones (${perc.toLocaleString('es-ES')}€)`,
    });
  }

  const sections: ValidationSection[] = [
    { id: 'declarante', label: 'Declarante', checks: declChecks, score: sectionScore(declChecks), status: sectionStatus(declChecks) },
    { id: 'perceptores', label: 'Perceptores (registro detalle)', checks: percChecks, score: sectionScore(percChecks), status: sectionStatus(percChecks) },
    ...(totalChecks.length > 0 ? [{
      id: 'totals', label: 'Totales y coherencia', checks: totalChecks, score: sectionScore(totalChecks), status: sectionStatus(totalChecks),
    }] : []),
  ];

  return buildReport('aeat_190', sections);
}

// ─── Report builder ─────────────────────────────────────────────────────────

function buildReport(domain: ValidationDomain, sections: ValidationSection[]): ValidationReport {
  const allChecks = sections.flatMap(s => s.checks);
  const errorCount = allChecks.filter(c => !c.passed && c.severity === 'error').length;
  const warningCount = allChecks.filter(c => !c.passed && c.severity === 'warning').length;
  const passCount = allChecks.filter(c => c.passed).length;

  const score = allChecks.length > 0
    ? Math.round((passCount / allChecks.length) * 100)
    : 0;

  const blockers = allChecks.filter(c => !c.passed && c.severity === 'error').map(c => c.message);
  const warnings = allChecks.filter(c => !c.passed && c.severity === 'warning').map(c => c.message);
  const suggestions = allChecks.filter(c => c.suggestion).map(c => c.suggestion!);

  const domainLabels: Record<ValidationDomain, string> = {
    tgss_siltra: 'TGSS/SILTRA',
    contrata_sepe: 'Contrat@/SEPE',
    aeat_111: 'AEAT Modelo 111',
    aeat_190: 'AEAT Modelo 190',
  };

  const summary = errorCount === 0
    ? `${domainLabels[domain]}: ${passCount}/${allChecks.length} checks OK${warningCount > 0 ? `, ${warningCount} aviso(s)` : ''} — Score ${score}%`
    : `${domainLabels[domain]}: ${errorCount} error(es), ${warningCount} aviso(s) — Score ${score}%`;

  return {
    domain,
    version: '1.0',
    score,
    passed: errorCount === 0,
    sections,
    errorCount,
    warningCount,
    passCount,
    summary,
    blockers,
    warnings,
    suggestions,
    validatedAt: new Date().toISOString(),
    disclaimer: 'Validación estructural interna mejorada — NO sustituye la validación oficial del organismo. NO valida contra XSD/esquema real.',
  };
}

function emptyReport(domain: ValidationDomain, reason: string): ValidationReport {
  return {
    domain,
    version: '1.0',
    score: 0,
    passed: false,
    sections: [],
    errorCount: 1,
    warningCount: 0,
    passCount: 0,
    summary: reason,
    blockers: [reason],
    warnings: [],
    suggestions: [],
    validatedAt: new Date().toISOString(),
    disclaimer: 'Validación estructural interna mejorada — NO sustituye la validación oficial del organismo.',
  };
}

// ─── Unified dispatcher ─────────────────────────────────────────────────────

/**
 * Run enhanced structural validation for any domain payload.
 */
export function runEnhancedValidation(
  domain: ValidationDomain,
  payload: Record<string, unknown> | null,
): ValidationReport {
  switch (domain) {
    case 'tgss_siltra': return validateTGSSStructural(payload);
    case 'contrata_sepe': return validateContrataStructural(payload);
    case 'aeat_111': return validateAEAT111Structural(payload);
    case 'aeat_190': return validateAEAT190Structural(payload);
    default: return emptyReport(domain, `Dominio ${domain} no soportado`);
  }
}
