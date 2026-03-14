/**
 * tgssConsistencyChecker — Cross-field consistency validation for TGSS payload
 * V2-ES.5 Paso 3: Detects logical inconsistencies between registration fields
 *
 * Pure function — no side effects, no DB access.
 * NOT official TGSS validation — internal pre-integration checks.
 */
import type { RegistrationData } from '@/hooks/erp/hr/useHRRegistrationProcess';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConsistencySeverity = 'error' | 'warning' | 'info';

export interface ConsistencyIssue {
  /** Unique rule identifier */
  rule: string;
  /** Severity level */
  severity: ConsistencySeverity;
  /** Human-readable message (ES) */
  message: string;
  /** Fields involved */
  fields: string[];
}

export interface ConsistencyResult {
  /** All detected issues */
  issues: ConsistencyIssue[];
  /** Only errors (blocking for readiness) */
  errors: ConsistencyIssue[];
  /** Only warnings (non-blocking but notable) */
  warnings: ConsistencyIssue[];
  /** Only info items */
  infos: ConsistencyIssue[];
  /** True if no errors exist */
  isConsistent: boolean;
  /** Number of total issues */
  issueCount: number;
}

// ─── Contract type helpers ──────────────────────────────────────────────────

/** Temporary contract codes that require an end date */
const TEMPORARY_CONTRACT_CODES = ['401', '402', '410', '420', '421', '501', '502'];

/** Indefinite contract codes */
const INDEFINITE_CONTRACT_CODES = ['100', '189'];

/** Training/internship contract codes */
const TRAINING_CONTRACT_CODES = ['420', '421'];

// ─── Consistency rules ──────────────────────────────────────────────────────

export function checkTGSSConsistency(
  data: RegistrationData | null,
  docReadinessPercent?: number,
): ConsistencyResult {
  const empty: ConsistencyResult = {
    issues: [],
    errors: [],
    warnings: [],
    infos: [],
    isConsistent: true,
    issueCount: 0,
  };

  if (!data) return empty;

  const issues: ConsistencyIssue[] = [];

  // ── Rule 1: Temporary contract must have end date ─────────────────────
  if (data.contract_type_code && TEMPORARY_CONTRACT_CODES.includes(data.contract_type_code)) {
    if (!data.contract_end_date) {
      issues.push({
        rule: 'TEMP_NO_END_DATE',
        severity: 'error',
        message: 'Contrato temporal sin fecha de finalización',
        fields: ['contract_type_code', 'contract_end_date'],
      });
    }
  }

  // ── Rule 2: Indefinite contract should not have end date ──────────────
  if (data.contract_type_code && INDEFINITE_CONTRACT_CODES.includes(data.contract_type_code)) {
    if (data.contract_end_date) {
      issues.push({
        rule: 'INDEF_WITH_END_DATE',
        severity: 'warning',
        message: 'Contrato indefinido con fecha de finalización — verificar si es correcto',
        fields: ['contract_type_code', 'contract_end_date'],
      });
    }
  }

  // ── Rule 3: End date must be after start date ─────────────────────────
  if (data.registration_date && data.contract_end_date) {
    const start = new Date(data.registration_date);
    const end = new Date(data.contract_end_date);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      issues.push({
        rule: 'END_BEFORE_START',
        severity: 'error',
        message: 'Fecha fin de contrato anterior o igual a la fecha de alta',
        fields: ['registration_date', 'contract_end_date'],
      });
    }
  }

  // ── Rule 4: Registration date in the distant past ─────────────────────
  if (data.registration_date) {
    const regDate = new Date(data.registration_date);
    const now = new Date();
    if (!isNaN(regDate.getTime())) {
      const daysDiff = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        issues.push({
          rule: 'REG_DATE_DISTANT_PAST',
          severity: 'warning',
          message: `Fecha de alta hace ${daysDiff} días — verificar si el alta no se tramitó a tiempo`,
          fields: ['registration_date'],
        });
      }
    }
  }

  // ── Rule 5: Registration date far in the future ───────────────────────
  if (data.registration_date) {
    const regDate = new Date(data.registration_date);
    const now = new Date();
    if (!isNaN(regDate.getTime())) {
      const daysDiff = Math.floor((regDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 60) {
        issues.push({
          rule: 'REG_DATE_FAR_FUTURE',
          severity: 'info',
          message: `Fecha de alta a ${daysDiff} días en el futuro — normal si es planificación anticipada`,
          fields: ['registration_date'],
        });
      }
    }
  }

  // ── Rule 6: Part-time coefficient coherence ───────────────────────────
  if (data.working_coefficient != null) {
    const coeff = Number(data.working_coefficient);
    if (!isNaN(coeff)) {
      if (coeff <= 0 || coeff > 1) {
        issues.push({
          rule: 'COEFF_OUT_OF_RANGE',
          severity: 'error',
          message: 'Coeficiente de jornada debe estar entre 0 y 1 (ej: 0.5 = media jornada)',
          fields: ['working_coefficient'],
        });
      } else if (coeff < 0.1) {
        issues.push({
          rule: 'COEFF_VERY_LOW',
          severity: 'warning',
          message: `Coeficiente de jornada muy bajo (${coeff}) — verificar si es correcto`,
          fields: ['working_coefficient'],
        });
      }
    }
  }

  // ── Rule 7: Training contracts should have trial period ───────────────
  if (data.contract_type_code && TRAINING_CONTRACT_CODES.includes(data.contract_type_code)) {
    if (data.trial_period_days == null || data.trial_period_days === 0) {
      issues.push({
        rule: 'TRAINING_NO_TRIAL',
        severity: 'info',
        message: 'Contrato formativo sin periodo de prueba especificado — habitual pero verificar convenio',
        fields: ['contract_type_code', 'trial_period_days'],
      });
    }
  }

  // ── Rule 8: Trial period excessively long ─────────────────────────────
  if (data.trial_period_days != null && data.trial_period_days > 0) {
    // Art. 14 ET: max 6 months for titulados, 2 months for others, by convention
    if (data.trial_period_days > 180) {
      issues.push({
        rule: 'TRIAL_TOO_LONG',
        severity: 'warning',
        message: `Periodo de prueba de ${data.trial_period_days} días — verificar límites según convenio y categoría`,
        fields: ['trial_period_days'],
      });
    }
  }

  // ── Rule 9: Status vs data completeness ───────────────────────────────
  if (data.registration_status === 'ready_to_submit' || data.registration_status === 'submitted') {
    const hasBasicData = data.naf && data.dni_nie && data.ccc && data.registration_date &&
      data.contract_type_code && data.contribution_group && data.regime;
    if (!hasBasicData) {
      issues.push({
        rule: 'STATUS_WITHOUT_DATA',
        severity: 'error',
        message: `Estado "${data.registration_status}" pero faltan datos obligatorios del alta`,
        fields: ['registration_status'],
      });
    }
  }

  // ── Rule 10: Doc readiness vs TGSS readiness ─────────────────────────
  if (docReadinessPercent != null && docReadinessPercent < 50) {
    if (data.registration_status === 'ready_to_submit' || data.registration_status === 'submitted') {
      issues.push({
        rule: 'LOW_DOC_READINESS',
        severity: 'warning',
        message: `Documentación al ${docReadinessPercent}% — insuficiente para tramitación segura`,
        fields: ['registration_status'],
      });
    }
  }

  // ── Rule 11: Regime coherence with contract type ──────────────────────
  if (data.regime === 'autonomos' && data.contract_type_code) {
    issues.push({
      rule: 'AUTONOMOS_WITH_CONTRACT',
      severity: 'warning',
      message: 'Régimen de autónomos con contrato laboral — verificar si corresponde',
      fields: ['regime', 'contract_type_code'],
    });
  }

  if (data.regime === 'hogar' && data.contract_type_code &&
    !['100', '189', '401', '402'].includes(data.contract_type_code)) {
    issues.push({
      rule: 'HOGAR_UNUSUAL_CONTRACT',
      severity: 'info',
      message: 'Régimen hogar con tipo de contrato poco habitual — verificar',
      fields: ['regime', 'contract_type_code'],
    });
  }

  // ── Classify ──────────────────────────────────────────────────────────
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return {
    issues,
    errors,
    warnings,
    infos,
    isConsistent: errors.length === 0,
    issueCount: issues.length,
  };
}
