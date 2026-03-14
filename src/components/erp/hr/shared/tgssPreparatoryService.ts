/**
 * tgssPreparatoryService — V2-ES.8 Paso 3
 * Domain-specific preparatory service for TGSS/SILTRA.
 *
 * Reuses:
 * - tgssPayloadBuilder (V2-ES.5) for payload generation
 * - tgssConsistencyChecker (V2-ES.5) for consistency validation
 * - tgssPreIntegrationReadiness (V2-ES.5) for readiness evaluation
 * - ssMonthlyExpedientEngine (V2-ES.7) for SS expedient context
 * - preparatorySubmissionEngine (V2-ES.8) for lifecycle
 *
 * Pure functions + utility wrappers. No DB access.
 */
import { buildTGSSPayload, type TGSSPayloadResult } from '@/components/erp/hr/shared/tgssPayloadBuilder';
import { checkTGSSConsistency } from '@/components/erp/hr/shared/tgssConsistencyChecker';
import type { RegistrationData } from '@/hooks/erp/hr/useHRRegistrationProcess';
import {
  type SubmissionValidationResult,
  type ValidationCheck,
  type PayloadSnapshot,
  createPayloadSnapshot,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';

// ─── TGSS Submission Types ─────────────────────────────────────────────────

export type TGSSSubmissionType =
  | 'alta'
  | 'baja'
  | 'variacion'
  | 'cotizacion_mensual';

export const TGSS_SUBMISSION_TYPES: Record<TGSSSubmissionType, { label: string; description: string }> = {
  alta: { label: 'Alta / Afiliación', description: 'Alta inicial o reingreso de trabajador en SS' },
  baja: { label: 'Baja', description: 'Baja de trabajador en la Seguridad Social' },
  variacion: { label: 'Variación de datos', description: 'Modificación de datos del trabajador en SS' },
  cotizacion_mensual: { label: 'Cotización mensual', description: 'Bases y cuotas de cotización del período' },
};

// ─── Payload Generation ─────────────────────────────────────────────────────

export interface TGSSPreparatoryPayloadResult {
  /** The generated payload result from the existing builder */
  payloadResult: TGSSPayloadResult;
  /** Immutable snapshot for audit trail */
  snapshot: PayloadSnapshot | null;
  /** Submission-level validation result */
  validationResult: SubmissionValidationResult;
  /** Whether dry-run is possible */
  canDryRun: boolean;
  /** Human-readable summary */
  summary: string;
}

/**
 * Generate a TGSS preparatory payload for a registration (alta) process.
 * Reuses the existing tgssPayloadBuilder and wraps it with submission lifecycle.
 */
export function generateTGSSPreparatoryPayload(
  submissionType: TGSSSubmissionType,
  registrationData: RegistrationData | null,
  options?: {
    docReadinessPercent?: number;
    employeeId?: string;
  },
): TGSSPreparatoryPayloadResult {
  // 1. Build payload using existing builder
  const payloadResult = buildTGSSPayload(registrationData, {
    docReadinessPercent: options?.docReadinessPercent,
  });

  // 2. Generate snapshot if payload exists
  const snapshot = payloadResult.payload
    ? createPayloadSnapshot('TGSS', payloadResult.payload as unknown as Record<string, unknown>, {
        employeeId: options?.employeeId,
      })
    : null;

  // 3. Build validation result from payload checks
  const validationResult = buildTGSSValidationResult(submissionType, payloadResult);

  // 4. Determine dry-run readiness
  const canDryRun = validationResult.passed && payloadResult.payload !== null;

  // 5. Summary
  const summary = canDryRun
    ? `Payload TGSS (${TGSS_SUBMISSION_TYPES[submissionType].label}) generado y validado — listo para dry-run`
    : `Payload TGSS (${TGSS_SUBMISSION_TYPES[submissionType].label}): ${validationResult.errorCount} error(es), ${validationResult.warningCount} aviso(s)`;

  return { payloadResult, snapshot, validationResult, canDryRun, summary };
}

/**
 * Build a structured SubmissionValidationResult from TGSSPayloadResult.
 * Maps existing field validations + consistency checks into the common format.
 */
function buildTGSSValidationResult(
  submissionType: TGSSSubmissionType,
  payload: TGSSPayloadResult,
): SubmissionValidationResult {
  const checks: ValidationCheck[] = [];

  // Map field validations
  payload.validations.forEach(v => {
    if (v.required) {
      checks.push({
        checkId: `field_${v.field}`,
        label: v.label,
        passed: v.valid,
        severity: v.present ? (v.valid ? 'info' : 'error') : 'error',
        message: v.error || (v.valid ? 'OK' : `${v.label} faltante`),
      });
    }
  });

  // Map consistency checks
  payload.consistency.errors.forEach(e => {
    checks.push({
      checkId: `consistency_${e.rule}`,
      label: e.message,
      passed: false,
      severity: 'error',
      message: e.message,
    });
  });

  payload.consistency.warnings.forEach(w => {
    checks.push({
      checkId: `consistency_${w.rule}`,
      label: w.message,
      passed: true, // warnings don't block
      severity: 'warning',
      message: w.message,
    });
  });

  // Add domain-specific checks
  checks.push({
    checkId: 'tgss_submission_type',
    label: 'Tipo de envío TGSS',
    passed: !!TGSS_SUBMISSION_TYPES[submissionType],
    severity: 'info',
    message: `Tipo: ${TGSS_SUBMISSION_TYPES[submissionType]?.label || submissionType}`,
  });

  checks.push({
    checkId: 'tgss_payload_built',
    label: 'Payload generado',
    passed: payload.payload !== null,
    severity: payload.payload ? 'info' : 'error',
    message: payload.payload ? 'Payload TGSS construido correctamente' : 'No se pudo construir el payload',
  });

  checks.push({
    checkId: 'tgss_certificate_required',
    label: 'Certificado digital',
    passed: false, // always false in V2-ES.8
    severity: 'warning',
    message: 'Certificado FNMT no configurado — requerido para envío real',
  });

  const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warningCount = checks.filter(c => c.severity === 'warning' && !c.passed).length;
  const infoCount = checks.filter(c => c.severity === 'info').length;
  const totalRelevant = checks.filter(c => c.severity !== 'info').length;
  const passedRelevant = checks.filter(c => c.severity !== 'info' && c.passed).length;
  const score = totalRelevant > 0 ? Math.round((passedRelevant / totalRelevant) * 100) : 0;

  return {
    version: '1.0',
    checks,
    errorCount,
    warningCount,
    infoCount,
    passed: errorCount === 0,
    score: Math.max(score, payload.readinessPercent),
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a cotización mensual preparatory payload from SS expedient data.
 * For closed periods with SS contribution data.
 */
export function generateTGSSCotizacionPayload(
  periodData: {
    periodYear: number;
    periodMonth: number;
    employeeCount: number;
    totalBases: number;
    totalQuotas: number;
    employerQuota: number;
    employeeQuota: number;
  },
): TGSSPreparatoryPayloadResult {
  const cotizacionPayload = {
    action: {
      type: 'cotizacion_mensual',
      prepared_at: new Date().toISOString(),
      version: '1.0',
    },
    period: {
      year: periodData.periodYear,
      month: periodData.periodMonth,
      label: `${periodData.periodMonth.toString().padStart(2, '0')}/${periodData.periodYear}`,
    },
    totals: {
      employee_count: periodData.employeeCount,
      total_bases: periodData.totalBases,
      total_quotas: periodData.totalQuotas,
      employer_quota: periodData.employerQuota,
      employee_quota: periodData.employeeQuota,
    },
  };

  const snapshot = createPayloadSnapshot('TGSS', cotizacionPayload, {
    periodId: `${periodData.periodYear}-${periodData.periodMonth}`,
  });

  const checks: ValidationCheck[] = [
    { checkId: 'cotiz_employees', label: 'Empleados', passed: periodData.employeeCount > 0, severity: periodData.employeeCount > 0 ? 'info' : 'error', message: `${periodData.employeeCount} empleados` },
    { checkId: 'cotiz_bases', label: 'Bases de cotización', passed: periodData.totalBases > 0, severity: periodData.totalBases > 0 ? 'info' : 'error', message: `Total bases: ${periodData.totalBases.toLocaleString('es-ES')} €` },
    { checkId: 'cotiz_quotas', label: 'Cuotas', passed: periodData.totalQuotas > 0, severity: periodData.totalQuotas > 0 ? 'info' : 'error', message: `Total cuotas: ${periodData.totalQuotas.toLocaleString('es-ES')} €` },
    { checkId: 'cotiz_cert', label: 'Certificado SILTRA', passed: false, severity: 'warning', message: 'Certificado no configurado — requerido para envío real' },
  ];

  const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;

  const validationResult: SubmissionValidationResult = {
    version: '1.0',
    checks,
    errorCount,
    warningCount: checks.filter(c => !c.passed && c.severity === 'warning').length,
    infoCount: checks.filter(c => c.severity === 'info').length,
    passed: errorCount === 0,
    score: errorCount === 0 ? 85 : 40,
    validatedAt: new Date().toISOString(),
  };

  // Use empty payload result since we're building directly
  const payloadResult: TGSSPayloadResult = {
    payload: null,
    validations: [],
    missingFields: [],
    formatErrors: [],
    consistency: { issues: [], errors: [], warnings: [], infos: [], isConsistent: true, issueCount: 0 },
    isReady: errorCount === 0,
    readinessPercent: errorCount === 0 ? 85 : 40,
    readinessLevel: errorCount === 0 ? 'high' : 'low',
  };

  return {
    payloadResult,
    snapshot,
    validationResult,
    canDryRun: errorCount === 0,
    summary: errorCount === 0
      ? `Cotización SS ${periodData.periodMonth}/${periodData.periodYear} preparada — listo para dry-run`
      : `Cotización SS: ${errorCount} error(es) en datos de cotización`,
  };
}
