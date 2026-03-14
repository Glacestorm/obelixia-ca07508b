/**
 * contrataConsistencyChecker — Cross-field consistency validation for Contrat@/SEPE payload
 * V2-ES.6 Paso 2: Detects logical inconsistencies between contract fields
 *
 * Mirrors tgssConsistencyChecker.ts pattern (alta/afiliación).
 * Pure function — no side effects, no DB access.
 * NOT official SEPE/Contrat@ validation — internal pre-integration checks.
 */
import type { ContractProcessData } from '@/hooks/erp/hr/useHRContractProcess';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ContrataConsistencySeverity = 'error' | 'warning' | 'info';

export interface ContrataConsistencyIssue {
  /** Unique rule identifier */
  rule: string;
  /** Severity level */
  severity: ContrataConsistencySeverity;
  /** Human-readable message (ES) */
  message: string;
  /** Fields involved */
  fields: string[];
}

export interface ContrataConsistencyResult {
  /** All detected issues */
  issues: ContrataConsistencyIssue[];
  /** Only errors (blocking for readiness) */
  errors: ContrataConsistencyIssue[];
  /** Only warnings (non-blocking but notable) */
  warnings: ContrataConsistencyIssue[];
  /** Only info items */
  infos: ContrataConsistencyIssue[];
  /** True if no errors exist */
  isConsistent: boolean;
  /** Number of total issues */
  issueCount: number;
}

// ─── Contract type helpers ──────────────────────────────────────────────────

/** Temporary contract codes that require an end date */
const TEMPORARY_CONTRACT_CODES = ['401', '402', '420', '501', '502'];

/** Indefinite contract codes */
const INDEFINITE_CONTRACT_CODES = ['100', '130', '150', '189'];

/** Training/internship contract codes */
const TRAINING_CONTRACT_CODES = ['501', '502'];

// ─── Consistency rules ──────────────────────────────────────────────────────

export function checkContrataConsistency(
  data: ContractProcessData | null,
  docReadinessPercent?: number,
): ContrataConsistencyResult {
  const empty: ContrataConsistencyResult = {
    issues: [], errors: [], warnings: [], infos: [],
    isConsistent: true, issueCount: 0,
  };

  if (!data) return empty;

  const issues: ContrataConsistencyIssue[] = [];

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

  // ── Rule 3: End date before start date ────────────────────────────────
  if (data.contract_start_date && data.contract_end_date) {
    const start = new Date(data.contract_start_date);
    const end = new Date(data.contract_end_date);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      issues.push({
        rule: 'END_BEFORE_START',
        severity: 'error',
        message: 'Fecha fin anterior o igual a fecha inicio',
        fields: ['contract_start_date', 'contract_end_date'],
      });
    }
  }

  // ── Rule 4: Partial without hours percent ─────────────────────────────
  if (data.working_hours_type === 'parcial' && !data.working_hours_percent) {
    issues.push({
      rule: 'PARTIAL_NO_PERCENT',
      severity: 'error',
      message: 'Jornada parcial sin porcentaje de jornada',
      fields: ['working_hours_type', 'working_hours_percent'],
    });
  }

  // ── Rule 5: Partial hours percent out of range ────────────────────────
  if (data.working_hours_percent != null) {
    const pct = Number(data.working_hours_percent);
    if (!isNaN(pct)) {
      if (pct <= 0 || pct > 100) {
        issues.push({
          rule: 'PERCENT_OUT_OF_RANGE',
          severity: 'error',
          message: 'Porcentaje de jornada debe estar entre 1 y 100',
          fields: ['working_hours_percent'],
        });
      } else if (pct < 10) {
        issues.push({
          rule: 'PERCENT_VERY_LOW',
          severity: 'warning',
          message: `Porcentaje de jornada muy bajo (${pct}%) — verificar`,
          fields: ['working_hours_percent'],
        });
      }
    }
  }

  // ── Rule 6: Conversion without previous type ──────────────────────────
  if (data.is_conversion && !data.conversion_from_type) {
    issues.push({
      rule: 'CONVERSION_NO_PREV_TYPE',
      severity: 'error',
      message: 'Conversión de contrato sin tipo anterior',
      fields: ['is_conversion', 'conversion_from_type'],
    });
  }

  // ── Rule 7: Conversion from same type ─────────────────────────────────
  if (data.is_conversion && data.conversion_from_type && data.contract_type_code) {
    if (data.conversion_from_type === data.contract_type_code) {
      issues.push({
        rule: 'CONVERSION_SAME_TYPE',
        severity: 'warning',
        message: 'Conversión al mismo tipo de contrato — verificar si es correcto',
        fields: ['conversion_from_type', 'contract_type_code'],
      });
    }
  }

  // ── Rule 8: Start date in distant past (> 30 days) ────────────────────
  if (data.contract_start_date) {
    const start = new Date(data.contract_start_date);
    const now = new Date();
    if (!isNaN(start.getTime())) {
      const daysDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        issues.push({
          rule: 'START_DISTANT_PAST',
          severity: 'warning',
          message: `Fecha inicio hace ${daysDiff} días — verificar si se comunicó a tiempo`,
          fields: ['contract_start_date'],
        });
      }
    }
  }

  // ── Rule 9: Start date far in the future ──────────────────────────────
  if (data.contract_start_date) {
    const start = new Date(data.contract_start_date);
    const now = new Date();
    if (!isNaN(start.getTime())) {
      const daysDiff = Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 60) {
        issues.push({
          rule: 'START_FAR_FUTURE',
          severity: 'info',
          message: `Fecha inicio a ${daysDiff} días en el futuro — normal si es planificación anticipada`,
          fields: ['contract_start_date'],
        });
      }
    }
  }

  // ── Rule 10: Trial period excessively long ────────────────────────────
  if (data.trial_period_days != null && data.trial_period_days > 180) {
    issues.push({
      rule: 'TRIAL_TOO_LONG',
      severity: 'warning',
      message: `Período de prueba de ${data.trial_period_days} días — verificar según convenio`,
      fields: ['trial_period_days'],
    });
  }

  // ── Rule 11: Training contracts should have trial period ──────────────
  if (data.contract_type_code && TRAINING_CONTRACT_CODES.includes(data.contract_type_code)) {
    if (data.trial_period_days == null || data.trial_period_days === 0) {
      issues.push({
        rule: 'TRAINING_NO_TRIAL',
        severity: 'info',
        message: 'Contrato formativo sin periodo de prueba — habitual pero verificar convenio',
        fields: ['contract_type_code', 'trial_period_days'],
      });
    }
  }

  // ── Rule 12: Status vs data completeness ──────────────────────────────
  if (data.contract_process_status === 'ready_to_submit' || data.contract_process_status === 'submitted') {
    const hasBasicData = data.dni_nie && data.naf && data.ccc &&
      data.contract_type_code && data.contract_start_date &&
      data.contract_duration_type && data.working_hours_type && data.occupation_code;
    if (!hasBasicData) {
      issues.push({
        rule: 'STATUS_WITHOUT_DATA',
        severity: 'error',
        message: `Estado "${data.contract_process_status}" pero faltan datos obligatorios`,
        fields: ['contract_process_status'],
      });
    }
  }

  // ── Rule 13: Doc readiness vs communication readiness ─────────────────
  if (docReadinessPercent != null && docReadinessPercent < 50) {
    if (data.contract_process_status === 'ready_to_submit' || data.contract_process_status === 'submitted') {
      issues.push({
        rule: 'LOW_DOC_READINESS',
        severity: 'warning',
        message: `Documentación al ${docReadinessPercent}% — insuficiente para comunicación`,
        fields: ['contract_process_status'],
      });
    }
  }

  // ── Rule 14: Full-time with hours percent ─────────────────────────────
  if (data.working_hours_type === 'completa' && data.working_hours_percent != null && data.working_hours_percent < 100) {
    issues.push({
      rule: 'FULLTIME_WITH_PARTIAL_PERCENT',
      severity: 'warning',
      message: `Jornada completa con porcentaje ${data.working_hours_percent}% — posible error de tipo de jornada`,
      fields: ['working_hours_type', 'working_hours_percent'],
    });
  }

  // ── Rule 15: Duration type vs contract type coherence ─────────────────
  if (data.contract_duration_type === 'indefinido' && data.contract_type_code &&
    TEMPORARY_CONTRACT_CODES.includes(data.contract_type_code)) {
    issues.push({
      rule: 'DURATION_TYPE_MISMATCH',
      severity: 'error',
      message: 'Duración "indefinido" con código de contrato temporal — incoherente',
      fields: ['contract_duration_type', 'contract_type_code'],
    });
  }

  if (data.contract_duration_type === 'temporal' && data.contract_type_code &&
    INDEFINITE_CONTRACT_CODES.includes(data.contract_type_code)) {
    issues.push({
      rule: 'DURATION_TYPE_MISMATCH_INV',
      severity: 'error',
      message: 'Duración "temporal" con código de contrato indefinido — incoherente',
      fields: ['contract_duration_type', 'contract_type_code'],
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
