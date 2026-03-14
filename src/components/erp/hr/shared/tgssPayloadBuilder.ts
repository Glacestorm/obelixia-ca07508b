/**
 * tgssPayloadBuilder — Construcción y validación del payload preparatorio TGSS
 * V2-ES.5 Paso 3: Estructura enriquecida + validación de formato + consistencia
 *
 * NO genera fichero oficial ni transmite a TGSS.
 * NO es validación oficial — es readiness interno.
 */
import type { RegistrationData } from '@/hooks/erp/hr/useHRRegistrationProcess';
import { checkTGSSConsistency, type ConsistencyResult, type ConsistencyIssue } from './tgssConsistencyChecker';

// ─── Validation rules ───────────────────────────────────────────────────────

export interface FieldValidation {
  field: string;
  label: string;
  present: boolean;
  valid: boolean;
  error: string | null;
  required: boolean;
}

export interface TGSSPayloadResult {
  /** Structured payload ready for future integration */
  payload: TGSSPayload | null;
  /** All field validations */
  validations: FieldValidation[];
  /** Missing required fields */
  missingFields: FieldValidation[];
  /** Fields present but with format errors */
  formatErrors: FieldValidation[];
  /** Cross-field consistency checks (V2-ES.5 Paso 3) */
  consistency: ConsistencyResult;
  /** Overall readiness (fields + format + consistency errors) */
  isReady: boolean;
  /** Readiness percentage (required fields only, penalized by consistency errors) */
  readinessPercent: number;
  /** Readiness level for UI display */
  readinessLevel: 'complete' | 'high' | 'medium' | 'low' | 'none';
}

export interface TGSSPayload {
  /** Action metadata (V2-ES.5 Paso 3) */
  action: {
    type: TGSSActionType;
    prepared_at: string;
    version: string;
  };
  // Worker identification
  worker: {
    naf: string;
    dni_nie: string;
    dni_type: 'DNI' | 'NIE';
  };
  // Employer
  employer: {
    ccc: string;
    legal_entity: string | null;
  };
  // Contract
  contract: {
    type_code: string;
    start_date: string; // YYYY-MM-DD
    end_date: string | null;
    trial_period_days: number | null;
    working_coefficient: number | null;
    collective_agreement: string | null;
    is_temporary: boolean;
  };
  // Social Security
  social_security: {
    regime: string;
    contribution_group: string;
    occupation_code: string | null;
  };
  // Work location
  workplace: {
    work_center: string | null;
  };
  // Banking (V2-ES.5 Paso 3)
  banking: {
    iban: string | null;
  };
}

/** TGSS action types for future integration */
export type TGSSActionType = 'alta_inicial' | 'alta_reingreso' | 'alta_pluriempleo' | 'alta_transferencia';

// ─── Format validators ──────────────────────────────────────────────────────

/** NAF: 12 digits (2 province + 8 sequential + 2 check) */
function validateNAF(value: string): string | null {
  const cleaned = value.replace(/[\s\-\/]/g, '');
  if (!/^\d{12}$/.test(cleaned)) {
    return `NAF debe tener 12 dígitos (recibido: ${cleaned.length} caracteres)`;
  }
  return null;
}

/** DNI: 8 digits + 1 letter */
function validateDNI(value: string): string | null {
  const cleaned = value.trim().toUpperCase();
  if (/^\d{8}[A-Z]$/.test(cleaned)) return null;
  return 'DNI: 8 dígitos + 1 letra (ej: 12345678Z)';
}

/** NIE: X/Y/Z + 7 digits + 1 letter */
function validateNIE(value: string): string | null {
  const cleaned = value.trim().toUpperCase();
  if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) return null;
  return 'NIE: X/Y/Z + 7 dígitos + 1 letra (ej: X1234567A)';
}

/** DNI or NIE */
function validateDNINIE(value: string): { valid: boolean; type: 'DNI' | 'NIE'; error: string | null } {
  const cleaned = value.trim().toUpperCase();
  if (/^\d{8}[A-Z]$/.test(cleaned)) return { valid: true, type: 'DNI', error: null };
  if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) return { valid: true, type: 'NIE', error: null };
  return {
    valid: false,
    type: /^[XYZ]/.test(cleaned) ? 'NIE' : 'DNI',
    error: `Formato inválido: ${cleaned.length > 0 ? 'no coincide con DNI (8+1) ni NIE (X/Y/Z+7+1)' : 'vacío'}`,
  };
}

/** CCC: 11 digits (2 province + 9 number) */
function validateCCC(value: string): string | null {
  const cleaned = value.replace(/[\s\-\/]/g, '');
  if (!/^\d{11}$/.test(cleaned)) {
    return `CCC debe tener 11 dígitos (recibido: ${cleaned.length} caracteres)`;
  }
  return null;
}

/** Date in YYYY-MM-DD format and valid */
function validateDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'Formato de fecha esperado: AAAA-MM-DD';
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return null;
}

/** Contract type: known code */
const VALID_CONTRACT_CODES = ['100', '189', '401', '402', '410', '420', '421', '501', '502'];
function validateContractType(value: string): string | null {
  if (!VALID_CONTRACT_CODES.includes(value)) {
    return `Código de contrato no reconocido: ${value}`;
  }
  return null;
}

/** Contribution group: 1-11 */
function validateContributionGroup(value: string): string | null {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 11) {
    return 'Grupo de cotización debe ser entre 1 y 11';
  }
  return null;
}

/** Regime: known code */
const VALID_REGIMES = ['general', 'autonomos', 'agrario', 'mar', 'mineria', 'hogar'];
function validateRegime(value: string): string | null {
  if (!VALID_REGIMES.includes(value)) {
    return `Régimen no reconocido: ${value}`;
  }
  return null;
}

/** IBAN: ES + 2 check digits + 20 digits (V2-ES.5 Paso 3) */
function validateIBAN(value: string): string | null {
  const cleaned = value.replace(/[\s\-]/g, '').toUpperCase();
  // Spanish IBAN: ES + 22 digits = 24 chars
  if (/^ES\d{22}$/.test(cleaned)) return null;
  // Accept other EU IBANs loosely
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(cleaned)) return null;
  return 'IBAN español: ES + 22 dígitos (ej: ES9121000418450200051332)';
}

/** Temporary contract codes */
const TEMPORARY_CONTRACT_CODES = ['401', '402', '410', '420', '421', '501', '502'];

// ─── Builder ────────────────────────────────────────────────────────────────

export interface BuildTGSSPayloadOptions {
  /** Doc completeness percentage for cross-validation */
  docReadinessPercent?: number;
}

export function buildTGSSPayload(
  data: RegistrationData | null,
  options?: BuildTGSSPayloadOptions,
): TGSSPayloadResult {
  const emptyConsistency: ConsistencyResult = {
    issues: [], errors: [], warnings: [], infos: [],
    isConsistent: true, issueCount: 0,
  };

  const empty: TGSSPayloadResult = {
    payload: null,
    validations: [],
    missingFields: [],
    formatErrors: [],
    consistency: emptyConsistency,
    isReady: false,
    readinessPercent: 0,
    readinessLevel: 'none',
  };

  if (!data) return empty;

  const validations: FieldValidation[] = [];

  // Helper
  const check = (
    field: string,
    label: string,
    value: string | number | null | undefined,
    required: boolean,
    validator?: (v: string) => string | null,
  ): FieldValidation => {
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

    const result: FieldValidation = { field, label, present, valid, error, required };
    validations.push(result);
    return result;
  };

  // Required fields
  check('naf', 'NAF (Nº Afiliación SS)', data.naf, true, validateNAF);

  let dniType: 'DNI' | 'NIE' = 'DNI';
  check('dni_nie', 'DNI/NIE', data.dni_nie, true, (v) => {
    const result = validateDNINIE(v);
    dniType = result.type;
    return result.error;
  });

  check('ccc', 'CCC (Cuenta Cotización)', data.ccc, true, validateCCC);
  check('registration_date', 'Fecha de alta', data.registration_date, true, validateDate);
  check('contract_type_code', 'Tipo de contrato', data.contract_type_code, true, validateContractType);
  check('contribution_group', 'Grupo de cotización', data.contribution_group, true, validateContributionGroup);
  check('regime', 'Régimen', data.regime, true, validateRegime);

  // Recommended fields
  check('work_center', 'Centro de trabajo', data.work_center, false);
  check('legal_entity', 'Entidad legal', data.legal_entity, false);
  check('working_coefficient', 'Coef. jornada', data.working_coefficient, false);
  check('occupation_code', 'Código CNO', data.occupation_code, false);
  check('collective_agreement', 'Convenio colectivo', data.collective_agreement, false);
  check('contract_end_date', 'Fecha fin contrato', data.contract_end_date, false, (v) => v ? validateDate(v) : null);
  // V2-ES.5 Paso 3: IBAN
  check('iban', 'IBAN domiciliación', (data as Record<string, unknown>).iban as string | null, false, (v) => v ? validateIBAN(v) : null);

  // ── Field-level metrics ───────────────────────────────────────────────
  const missingFields = validations.filter(v => v.required && !v.present);
  const formatErrors = validations.filter(v => v.present && !v.valid);
  const requiredValid = validations.filter(v => v.required && v.valid).length;
  const totalRequired = validations.filter(v => v.required).length;

  // ── Consistency checks (V2-ES.5 Paso 3) ──────────────────────────────
  const consistency = checkTGSSConsistency(data, options?.docReadinessPercent);

  // ── Readiness calculation (penalized by consistency errors) ───────────
  const basePercent = totalRequired > 0 ? (requiredValid / totalRequired) * 100 : 0;
  // Each consistency error penalizes 5%, each warning 2%
  const penalty = (consistency.errors.length * 5) + (consistency.warnings.length * 2);
  const readinessPercent = Math.max(0, Math.round(basePercent - penalty));

  const isReady = missingFields.length === 0 && formatErrors.length === 0 && consistency.isConsistent;

  const readinessLevel: TGSSPayloadResult['readinessLevel'] =
    isReady ? 'complete' :
    readinessPercent >= 80 ? 'high' :
    readinessPercent >= 50 ? 'medium' :
    readinessPercent > 0 ? 'low' : 'none';

  // ── Build payload ─────────────────────────────────────────────────────
  let payload: TGSSPayload | null = null;
  if (missingFields.length === 0) {
    const isTemporary = data.contract_type_code
      ? TEMPORARY_CONTRACT_CODES.includes(data.contract_type_code)
      : false;

    payload = {
      action: {
        type: 'alta_inicial',
        prepared_at: new Date().toISOString(),
        version: '3.0',
      },
      worker: {
        naf: String(data.naf).replace(/[\s\-\/]/g, ''),
        dni_nie: String(data.dni_nie).trim().toUpperCase(),
        dni_type: dniType,
      },
      employer: {
        ccc: String(data.ccc).replace(/[\s\-\/]/g, ''),
        legal_entity: data.legal_entity || null,
      },
      contract: {
        type_code: String(data.contract_type_code),
        start_date: String(data.registration_date),
        end_date: data.contract_end_date || null,
        trial_period_days: data.trial_period_days ?? null,
        working_coefficient: data.working_coefficient ?? null,
        collective_agreement: data.collective_agreement || null,
        is_temporary: isTemporary,
      },
      social_security: {
        regime: String(data.regime),
        contribution_group: String(data.contribution_group),
        occupation_code: data.occupation_code || null,
      },
      workplace: {
        work_center: data.work_center || null,
      },
      banking: {
        iban: ((data as Record<string, unknown>).iban as string) || null,
      },
    };
  }

  return {
    payload,
    validations,
    missingFields,
    formatErrors,
    consistency,
    isReady,
    readinessPercent,
    readinessLevel,
  };
}
