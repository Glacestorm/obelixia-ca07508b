/**
 * contrataPayloadBuilder — Payload preparatorio para Contrat@/SEPE
 * V2-ES.6 Paso 1.2: Estructura enriquecida + validación de formato + consistencia
 *
 * NO genera fichero oficial ni transmite al SEPE.
 * NO es validación oficial — es readiness interno.
 */
import type { ContractProcessData } from '@/hooks/erp/hr/useHRContractProcess';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContrataFieldValidation {
  field: string;
  label: string;
  present: boolean;
  valid: boolean;
  error: string | null;
  required: boolean;
}

export interface ContrataPayload {
  action: {
    type: 'nueva_contratacion' | 'conversion' | 'prorroga';
    prepared_at: string;
    version: string;
  };
  worker: {
    dni_nie: string;
    dni_type: 'DNI' | 'NIE';
    naf: string;
  };
  employer: {
    ccc: string;
    legal_entity: string | null;
  };
  contract: {
    type_code: string;
    subtype: string | null;
    start_date: string;
    end_date: string | null;
    duration_type: string;
    is_temporary: boolean;
    is_conversion: boolean;
    conversion_from_type: string | null;
    trial_period_days: number | null;
  };
  working_conditions: {
    hours_type: string;
    hours_percent: number | null;
    weekly_hours: number | null;
    occupation_code: string;
    job_title: string | null;
    workplace_address: string | null;
    collective_agreement: string | null;
  };
  compensation: {
    salary_gross_annual: number | null;
    salary_base_monthly: number | null;
    num_extra_payments: number | null;
  };
}

export interface ContrataConsistencyIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fields: string[];
}

export interface ContrataPayloadResult {
  payload: ContrataPayload | null;
  validations: ContrataFieldValidation[];
  missingFields: ContrataFieldValidation[];
  formatErrors: ContrataFieldValidation[];
  consistency: {
    issues: ContrataConsistencyIssue[];
    errors: ContrataConsistencyIssue[];
    warnings: ContrataConsistencyIssue[];
    isConsistent: boolean;
  };
  isReady: boolean;
  readinessPercent: number;
  readinessLevel: 'complete' | 'high' | 'medium' | 'low' | 'none';
}

// ─── Format validators ──────────────────────────────────────────────────────

// V2-RRHH-P1.2: Use shared MOD 23 validator instead of regex-only
import { validateDNINIE } from '@/engines/erp/hr/dniNieValidator';
export { validateDNINIE };

function validateNAF(value: string): string | null {
  const cleaned = value.replace(/[\s\-\/]/g, '');
  if (!/^\d{12}$/.test(cleaned)) return `NAF debe tener 12 dígitos (recibido: ${cleaned.length})`;
  return null;
}

function validateCCC(value: string): string | null {
  const cleaned = value.replace(/[\s\-\/]/g, '');
  if (!/^\d{11}$/.test(cleaned)) return `CCC debe tener 11 dígitos (recibido: ${cleaned.length})`;
  return null;
}

function validateDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Formato esperado: AAAA-MM-DD';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return null;
}

const VALID_CONTRACT_CODES = ['100', '130', '150', '189', '401', '402', '420', '501', '502'];
function validateContractType(value: string): string | null {
  if (!VALID_CONTRACT_CODES.includes(value)) return `Código de contrato no reconocido: ${value}`;
  return null;
}

const TEMPORARY_CONTRACT_CODES = ['401', '402', '420', '501', '502'];

// ─── Builder ────────────────────────────────────────────────────────────────

export interface BuildContrataPayloadOptions {
  docReadinessPercent?: number;
}

export function buildContrataPayload(
  data: ContractProcessData | null,
  options?: BuildContrataPayloadOptions,
): ContrataPayloadResult {
  const emptyConsistency = { issues: [], errors: [], warnings: [], isConsistent: true };
  const empty: ContrataPayloadResult = {
    payload: null, validations: [], missingFields: [], formatErrors: [],
    consistency: emptyConsistency, isReady: false, readinessPercent: 0, readinessLevel: 'none',
  };

  if (!data) return empty;

  const validations: ContrataFieldValidation[] = [];

  const check = (
    field: string, label: string, value: string | number | null | undefined,
    required: boolean, validator?: (v: string) => string | null,
  ): ContrataFieldValidation => {
    const strVal = value != null ? String(value).trim() : '';
    const present = strVal !== '';
    let error: string | null = null;
    let valid = true;
    if (!present) {
      valid = false;
      if (required) error = `${label} es obligatorio`;
    } else if (validator) {
      error = validator(strVal);
      valid = error === null;
    }
    const result: ContrataFieldValidation = { field, label, present, valid, error, required };
    validations.push(result);
    return result;
  };

  // Required fields (Contrat@)
  let dniType: 'DNI' | 'NIE' = 'DNI';
  check('dni_nie', 'DNI/NIE', data.dni_nie, true, (v) => {
    const r = validateDNINIE(v);
    dniType = r.type;
    return r.error;
  });
  check('naf', 'NAF', data.naf, true, validateNAF);
  check('ccc', 'CCC', data.ccc, true, validateCCC);
  check('contract_type_code', 'Tipo de contrato', data.contract_type_code, true, validateContractType);
  check('contract_start_date', 'Fecha inicio', data.contract_start_date, true, validateDate);
  check('contract_duration_type', 'Duración', data.contract_duration_type, true);
  check('working_hours_type', 'Tipo jornada', data.working_hours_type, true);
  check('occupation_code', 'Código CNO', data.occupation_code, true);

  // Recommended fields
  check('contract_end_date', 'Fecha fin', data.contract_end_date, false, (v) => v ? validateDate(v) : null);
  check('weekly_hours', 'Horas semanales', data.weekly_hours, false);
  check('working_hours_percent', '% Jornada', data.working_hours_percent, false);
  check('collective_agreement', 'Convenio colectivo', data.collective_agreement, false);
  check('job_title', 'Puesto', data.job_title, false);
  check('workplace_address', 'Centro de trabajo', data.workplace_address, false);
  check('salary_gross_annual', 'Salario bruto anual', data.salary_gross_annual, false);
  check('salary_base_monthly', 'Salario base mensual', data.salary_base_monthly, false);
  check('trial_period_days', 'Período prueba', data.trial_period_days, false);
  check('legal_entity', 'Entidad legal', data.legal_entity, false);

  // ── Field metrics ─────────────────────────────────────────────────────
  const missingFields = validations.filter(v => v.required && !v.present);
  const formatErrors = validations.filter(v => v.present && !v.valid);
  const requiredValid = validations.filter(v => v.required && v.valid).length;
  const totalRequired = validations.filter(v => v.required).length;

  // ── Consistency checks ────────────────────────────────────────────────
  const issues: ContrataConsistencyIssue[] = [];

  // Rule 1: Temporary without end date
  if (data.contract_type_code && TEMPORARY_CONTRACT_CODES.includes(data.contract_type_code)) {
    if (!data.contract_end_date) {
      issues.push({ rule: 'TEMP_NO_END_DATE', severity: 'error', message: 'Contrato temporal sin fecha de finalización', fields: ['contract_type_code', 'contract_end_date'] });
    }
  }

  // Rule 2: End date before start date
  if (data.contract_start_date && data.contract_end_date) {
    const start = new Date(data.contract_start_date);
    const end = new Date(data.contract_end_date);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      issues.push({ rule: 'END_BEFORE_START', severity: 'error', message: 'Fecha fin anterior o igual a fecha inicio', fields: ['contract_start_date', 'contract_end_date'] });
    }
  }

  // Rule 3: Partial without hours percent
  if (data.working_hours_type === 'parcial' && !data.working_hours_percent) {
    issues.push({ rule: 'PARTIAL_NO_PERCENT', severity: 'error', message: 'Jornada parcial sin porcentaje de jornada', fields: ['working_hours_type', 'working_hours_percent'] });
  }

  // Rule 4: Conversion without previous type
  if (data.is_conversion && !data.conversion_from_type) {
    issues.push({ rule: 'CONVERSION_NO_PREV_TYPE', severity: 'error', message: 'Conversión de contrato sin tipo anterior', fields: ['is_conversion', 'conversion_from_type'] });
  }

  // Rule 5: Start date in distant past (> 30 days)
  if (data.contract_start_date) {
    const start = new Date(data.contract_start_date);
    const daysDiff = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      issues.push({ rule: 'START_DISTANT_PAST', severity: 'warning', message: `Fecha inicio hace ${daysDiff} días — verificar si se comunicó a tiempo`, fields: ['contract_start_date'] });
    }
  }

  // Rule 6: Trial period too long
  if (data.trial_period_days != null && data.trial_period_days > 180) {
    issues.push({ rule: 'TRIAL_TOO_LONG', severity: 'warning', message: `Período de prueba de ${data.trial_period_days} días — verificar según convenio`, fields: ['trial_period_days'] });
  }

  // Rule 7: Status vs data completeness
  if ((data.contract_process_status === 'ready_to_submit' || data.contract_process_status === 'submitted') && missingFields.length > 0) {
    issues.push({ rule: 'STATUS_WITHOUT_DATA', severity: 'error', message: `Estado "${data.contract_process_status}" pero faltan datos obligatorios`, fields: ['contract_process_status'] });
  }

  // Rule 8: Doc readiness
  if (options?.docReadinessPercent != null && options.docReadinessPercent < 50) {
    if (data.contract_process_status === 'ready_to_submit' || data.contract_process_status === 'submitted') {
      issues.push({ rule: 'LOW_DOC_READINESS', severity: 'warning', message: `Documentación al ${options.docReadinessPercent}% — insuficiente para comunicación`, fields: ['contract_process_status'] });
    }
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const consistency = { issues, errors, warnings, isConsistent: errors.length === 0 };

  // ── Readiness ─────────────────────────────────────────────────────────
  const basePercent = totalRequired > 0 ? (requiredValid / totalRequired) * 100 : 0;
  const penalty = (errors.length * 5) + (warnings.length * 2);
  const readinessPercent = Math.max(0, Math.round(basePercent - penalty));
  const isReady = missingFields.length === 0 && formatErrors.length === 0 && consistency.isConsistent;

  const readinessLevel: ContrataPayloadResult['readinessLevel'] =
    isReady ? 'complete' :
    readinessPercent >= 80 ? 'high' :
    readinessPercent >= 50 ? 'medium' :
    readinessPercent > 0 ? 'low' : 'none';

  // ── Build payload ─────────────────────────────────────────────────────
  let payload: ContrataPayload | null = null;
  if (missingFields.length === 0) {
    const isTemporary = data.contract_type_code ? TEMPORARY_CONTRACT_CODES.includes(data.contract_type_code) : false;
    payload = {
      action: {
        type: data.is_conversion ? 'conversion' : 'nueva_contratacion',
        prepared_at: new Date().toISOString(),
        version: '1.0',
      },
      worker: {
        dni_nie: String(data.dni_nie).trim().toUpperCase(),
        dni_type: dniType,
        naf: String(data.naf).replace(/[\s\-\/]/g, ''),
      },
      employer: {
        ccc: String(data.ccc).replace(/[\s\-\/]/g, ''),
        legal_entity: data.legal_entity || null,
      },
      contract: {
        type_code: String(data.contract_type_code),
        subtype: data.contract_subtype || null,
        start_date: String(data.contract_start_date),
        end_date: data.contract_end_date || null,
        duration_type: String(data.contract_duration_type),
        is_temporary: isTemporary,
        is_conversion: data.is_conversion ?? false,
        conversion_from_type: data.conversion_from_type || null,
        trial_period_days: data.trial_period_days ?? null,
      },
      working_conditions: {
        hours_type: String(data.working_hours_type),
        hours_percent: data.working_hours_percent ?? null,
        weekly_hours: data.weekly_hours ?? null,
        occupation_code: String(data.occupation_code),
        job_title: data.job_title || null,
        workplace_address: data.workplace_address || null,
        collective_agreement: data.collective_agreement || null,
      },
      compensation: {
        salary_gross_annual: data.salary_gross_annual ?? null,
        salary_base_monthly: data.salary_base_monthly ?? null,
        num_extra_payments: data.num_extra_payments ?? null,
      },
    };
  }

  return { payload, validations, missingFields, formatErrors, consistency, isReady, readinessPercent, readinessLevel };
}
