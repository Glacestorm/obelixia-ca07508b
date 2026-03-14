/**
 * contrataPreparatoryService — V2-ES.8 Paso 4
 * Domain-specific preparatory service for Contrat@/SEPE.
 *
 * Reuses:
 * - contrataPayloadBuilder (V2-ES.6) for payload generation
 * - contrataConsistencyChecker (V2-ES.6) for consistency
 * - preparatorySubmissionEngine (V2-ES.8) for lifecycle
 *
 * Pure functions. No DB access.
 */
import { buildContrataPayload, type ContrataPayloadResult } from '@/components/erp/hr/shared/contrataPayloadBuilder';
import type { ContractProcessData } from '@/hooks/erp/hr/useHRContractProcess';
import {
  type SubmissionValidationResult,
  type ValidationCheck,
  type PayloadSnapshot,
  createPayloadSnapshot,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';

// ─── Contrat@ Submission Types ──────────────────────────────────────────────

export type ContrataSubmissionType =
  | 'comunicacion_inicial'
  | 'copia_basica'
  | 'prorroga'
  | 'conversion'
  | 'finalizacion';

export const CONTRATA_SUBMISSION_TYPES: Record<ContrataSubmissionType, { label: string; description: string }> = {
  comunicacion_inicial: { label: 'Comunicación inicial', description: 'Comunicación del nuevo contrato al SEPE' },
  copia_basica: { label: 'Copia básica', description: 'Copia básica del contrato para representantes' },
  prorroga: { label: 'Prórroga', description: 'Comunicación de prórroga de contrato temporal' },
  conversion: { label: 'Conversión', description: 'Conversión de contrato temporal a indefinido' },
  finalizacion: { label: 'Finalización', description: 'Comunicación de fin de contrato' },
};

// ─── Payload Generation ─────────────────────────────────────────────────────

export interface ContrataPreparatoryPayloadResult {
  payloadResult: ContrataPayloadResult;
  snapshot: PayloadSnapshot | null;
  validationResult: SubmissionValidationResult;
  canDryRun: boolean;
  summary: string;
}

export function generateContrataPreparatoryPayload(
  submissionType: ContrataSubmissionType,
  contractData: ContractProcessData | null,
  options?: {
    docReadinessPercent?: number;
    employeeId?: string;
    contractId?: string;
  },
): ContrataPreparatoryPayloadResult {
  const payloadResult = buildContrataPayload(contractData, {
    docReadinessPercent: options?.docReadinessPercent,
  });

  const snapshot = payloadResult.payload
    ? createPayloadSnapshot('CONTRATA', payloadResult.payload as unknown as Record<string, unknown>, {
        employeeId: options?.employeeId,
        contractId: options?.contractId,
      })
    : null;

  const validationResult = buildContrataValidationResult(submissionType, payloadResult);
  const canDryRun = validationResult.passed && payloadResult.payload !== null;

  const label = CONTRATA_SUBMISSION_TYPES[submissionType]?.label || submissionType;
  const summary = canDryRun
    ? `Payload Contrat@ (${label}) generado y validado — listo para dry-run`
    : `Payload Contrat@ (${label}): ${validationResult.errorCount} error(es), ${validationResult.warningCount} aviso(s)`;

  return { payloadResult, snapshot, validationResult, canDryRun, summary };
}

function buildContrataValidationResult(
  submissionType: ContrataSubmissionType,
  payload: ContrataPayloadResult,
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

  // Consistency
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
      passed: true,
      severity: 'warning',
      message: w.message,
    });
  });

  // Domain-specific
  checks.push({
    checkId: 'contrata_type',
    label: 'Tipo de comunicación',
    passed: !!CONTRATA_SUBMISSION_TYPES[submissionType],
    severity: 'info',
    message: `Tipo: ${CONTRATA_SUBMISSION_TYPES[submissionType]?.label || submissionType}`,
  });

  checks.push({
    checkId: 'contrata_payload',
    label: 'Payload generado',
    passed: payload.payload !== null,
    severity: payload.payload ? 'info' : 'error',
    message: payload.payload ? 'Payload Contrat@ construido' : 'No se pudo construir el payload',
  });

  checks.push({
    checkId: 'contrata_sepe_deadline',
    label: 'Plazo SEPE (10 días hábiles)',
    passed: true, // Will be evaluated with real deadline engine
    severity: 'info',
    message: 'Plazo legal: 10 días hábiles desde inicio del contrato',
  });

  checks.push({
    checkId: 'contrata_certificate',
    label: 'Certificado digital SEPE',
    passed: false,
    severity: 'warning',
    message: 'Certificado digital no configurado — requerido para envío real',
  });

  const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;
  const totalRelevant = checks.filter(c => c.severity !== 'info').length;
  const passedRelevant = checks.filter(c => c.severity !== 'info' && c.passed).length;
  const score = totalRelevant > 0 ? Math.round((passedRelevant / totalRelevant) * 100) : 0;

  return {
    version: '1.0',
    checks,
    errorCount,
    warningCount,
    infoCount: checks.filter(c => c.severity === 'info').length,
    passed: errorCount === 0,
    score: Math.max(score, payload.readinessPercent),
    validatedAt: new Date().toISOString(),
  };
}
