/**
 * aeatPreparatoryService — V2-ES.8 Paso 4
 * Domain-specific preparatory service for AEAT (111/190).
 *
 * Reuses:
 * - fiscalMonthlyExpedientEngine (V2-ES.7) for fiscal data structure
 * - preparatorySubmissionEngine (V2-ES.8) for lifecycle
 *
 * Pure functions. No DB access.
 */
import type {
  Modelo111Summary,
  Modelo190LineItem,
  FiscalExpedientSnapshot,
} from '@/engines/erp/hr/fiscalMonthlyExpedientEngine';
import {
  type SubmissionValidationResult,
  type ValidationCheck,
  type PayloadSnapshot,
  createPayloadSnapshot,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';

// ─── AEAT Submission Types ──────────────────────────────────────────────────

export type AEATSubmissionType =
  | 'modelo_111_trimestral'
  | 'modelo_111_mensual'
  | 'modelo_190_anual';

export const AEAT_SUBMISSION_TYPES: Record<AEATSubmissionType, { label: string; description: string; frequency: string }> = {
  modelo_111_trimestral: { label: 'Modelo 111 Trimestral', description: 'Retenciones e ingresos a cuenta — trimestral', frequency: 'trimestral' },
  modelo_111_mensual: { label: 'Modelo 111 Mensual', description: 'Retenciones e ingresos a cuenta — grandes empresas', frequency: 'mensual' },
  modelo_190_anual: { label: 'Modelo 190 Anual', description: 'Resumen anual de retenciones e ingresos a cuenta', frequency: 'anual' },
};

// ─── Modelo 111 Preparatory ─────────────────────────────────────────────────

export interface AEAT111PreparatoryPayloadResult {
  payload: AEAT111PreparatoryPayload | null;
  snapshot: PayloadSnapshot | null;
  validationResult: SubmissionValidationResult;
  canDryRun: boolean;
  summary: string;
}

export interface AEAT111PreparatoryPayload {
  action: {
    type: 'modelo_111';
    mode: 'preparatory';
    prepared_at: string;
    version: string;
  };
  declarante: {
    nif: string;
    razon_social: string;
  };
  periodo: {
    ejercicio: number;
    periodo: string; // '1T', '2T', '3T', '4T' or '01'-'12'
    label: string;
  };
  modelo_111: Modelo111Summary;
  source: {
    periods_included: string[];
    fiscal_expedient_refs: string[];
  };
}

/**
 * Generate AEAT 111 preparatory payload from fiscal expedient data.
 */
export function generateAEAT111PreparatoryPayload(
  declaranteNif: string,
  declaranteNombre: string,
  ejercicio: number,
  trimestre: 1 | 2 | 3 | 4,
  modelo111Data: Modelo111Summary | null,
  periodsIncluded: string[],
): AEAT111PreparatoryPayloadResult {
  if (!modelo111Data) {
    return {
      payload: null,
      snapshot: null,
      validationResult: createEmptyAEATValidation('111', 'Sin datos fiscales para el período'),
      canDryRun: false,
      summary: 'Sin datos de retenciones para generar Modelo 111',
    };
  }

  const payload: AEAT111PreparatoryPayload = {
    action: {
      type: 'modelo_111',
      mode: 'preparatory',
      prepared_at: new Date().toISOString(),
      version: '1.0',
    },
    declarante: {
      nif: declaranteNif,
      razon_social: declaranteNombre,
    },
    periodo: {
      ejercicio,
      periodo: `${trimestre}T`,
      label: `${trimestre}T/${ejercicio}`,
    },
    modelo_111: modelo111Data,
    source: {
      periods_included: periodsIncluded,
      fiscal_expedient_refs: periodsIncluded,
    },
  };

  const snapshot = createPayloadSnapshot(
    'AEAT_111',
    payload as unknown as Record<string, unknown>,
    { periodId: `${ejercicio}-${trimestre}T` },
  );

  const validationResult = buildAEAT111ValidationResult(payload, declaranteNif);
  const canDryRun = validationResult.passed;

  return {
    payload,
    snapshot,
    validationResult,
    canDryRun,
    summary: canDryRun
      ? `Modelo 111 ${trimestre}T/${ejercicio} preparado — ${modelo111Data.total_retenciones.toLocaleString('es-ES')} € retenciones — listo para dry-run`
      : `Modelo 111: ${validationResult.errorCount} error(es)`,
  };
}

function buildAEAT111ValidationResult(
  payload: AEAT111PreparatoryPayload,
  nif: string,
): SubmissionValidationResult {
  const checks: ValidationCheck[] = [];
  const m = payload.modelo_111;

  checks.push({
    checkId: 'aeat_nif',
    label: 'NIF declarante',
    passed: nif.length >= 8,
    severity: nif.length >= 8 ? 'info' : 'error',
    message: nif.length >= 8 ? `NIF: ${nif}` : 'NIF del declarante no configurado',
  });

  checks.push({
    checkId: 'aeat_perceptores',
    label: 'Perceptores',
    passed: m.total_perceptores > 0,
    severity: m.total_perceptores > 0 ? 'info' : 'error',
    message: `${m.total_perceptores} perceptores declarados`,
  });

  checks.push({
    checkId: 'aeat_percepciones',
    label: 'Percepciones',
    passed: m.total_percepciones > 0,
    severity: m.total_percepciones > 0 ? 'info' : 'warning',
    message: `Total percepciones: ${m.total_percepciones.toLocaleString('es-ES')} €`,
  });

  checks.push({
    checkId: 'aeat_retenciones',
    label: 'Retenciones',
    passed: m.total_retenciones >= 0,
    severity: 'info',
    message: `Total retenciones: ${m.total_retenciones.toLocaleString('es-ES')} €`,
  });

  // Coherence: retenciones should not exceed percepciones
  if (m.total_retenciones > m.total_percepciones && m.total_percepciones > 0) {
    checks.push({
      checkId: 'aeat_ret_gt_perc',
      label: 'Retenciones > Percepciones',
      passed: false,
      severity: 'error',
      message: 'Las retenciones superan las percepciones — verificar datos',
    });
  }

  // Rate sanity check
  const avgRate = m.total_percepciones > 0
    ? (m.total_retenciones / m.total_percepciones) * 100
    : 0;
  if (avgRate > 50) {
    checks.push({
      checkId: 'aeat_rate_high',
      label: 'Tipo retención alto',
      passed: false,
      severity: 'warning',
      message: `Tipo medio de retención ${avgRate.toFixed(1)}% — verificar`,
    });
  }

  checks.push({
    checkId: 'aeat_certificate',
    label: 'Certificado AEAT',
    passed: false,
    severity: 'warning',
    message: 'Certificado digital no configurado — requerido para presentación real',
  });

  checks.push({
    checkId: 'aeat_not_official',
    label: 'Modo preparatorio',
    passed: true,
    severity: 'info',
    message: 'Preparatorio: NO equivale a presentación oficial ante AEAT',
  });

  const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;

  return {
    version: '1.0',
    checks,
    errorCount,
    warningCount,
    infoCount: checks.filter(c => c.severity === 'info').length,
    passed: errorCount === 0,
    score: errorCount === 0 ? (warningCount === 0 ? 95 : 80) : 40,
    validatedAt: new Date().toISOString(),
  };
}

// ─── Modelo 190 Preparatory ─────────────────────────────────────────────────

export interface AEAT190PreparatoryPayloadResult {
  payload: AEAT190PreparatoryPayload | null;
  snapshot: PayloadSnapshot | null;
  validationResult: SubmissionValidationResult;
  canDryRun: boolean;
  summary: string;
}

export interface AEAT190PreparatoryPayload {
  action: {
    type: 'modelo_190';
    mode: 'preparatory';
    prepared_at: string;
    version: string;
  };
  declarante: {
    nif: string;
    razon_social: string;
  };
  ejercicio: number;
  perceptores: Modelo190LineItem[];
  totals: {
    total_perceptores: number;
    total_percepciones_integras: number;
    total_retenciones: number;
    total_percepciones_especie: number;
    total_ingresos_cuenta: number;
  };
  source: {
    periods_count: number;
    fiscal_expedient_refs: string[];
  };
}

/**
 * Generate AEAT 190 preparatory payload from annual fiscal data.
 */
export function generateAEAT190PreparatoryPayload(
  declaranteNif: string,
  declaranteNombre: string,
  ejercicio: number,
  perceptores: Modelo190LineItem[],
  periodsIncluded: string[],
): AEAT190PreparatoryPayloadResult {
  if (perceptores.length === 0) {
    return {
      payload: null,
      snapshot: null,
      validationResult: createEmptyAEATValidation('190', 'Sin perceptores para el ejercicio'),
      canDryRun: false,
      summary: 'Sin datos de perceptores para generar Modelo 190',
    };
  }

  const totals = {
    total_perceptores: perceptores.length,
    total_percepciones_integras: perceptores.reduce((s, p) => s + p.percepciones_integras, 0),
    total_retenciones: perceptores.reduce((s, p) => s + p.retenciones_practicadas, 0),
    total_percepciones_especie: perceptores.reduce((s, p) => s + p.percepciones_en_especie, 0),
    total_ingresos_cuenta: perceptores.reduce((s, p) => s + p.ingresos_a_cuenta, 0),
  };

  const payload: AEAT190PreparatoryPayload = {
    action: {
      type: 'modelo_190',
      mode: 'preparatory',
      prepared_at: new Date().toISOString(),
      version: '1.0',
    },
    declarante: { nif: declaranteNif, razon_social: declaranteNombre },
    ejercicio,
    perceptores,
    totals,
    source: {
      periods_count: periodsIncluded.length,
      fiscal_expedient_refs: periodsIncluded,
    },
  };

  const snapshot = createPayloadSnapshot(
    'AEAT_190',
    payload as unknown as Record<string, unknown>,
    { periodId: `${ejercicio}-anual` },
  );

  const checks: ValidationCheck[] = [
    { checkId: 'aeat190_nif', label: 'NIF declarante', passed: declaranteNif.length >= 8, severity: declaranteNif.length >= 8 ? 'info' : 'error', message: `NIF: ${declaranteNif}` },
    { checkId: 'aeat190_perceptores', label: 'Perceptores', passed: perceptores.length > 0, severity: 'info', message: `${perceptores.length} perceptores` },
    { checkId: 'aeat190_nif_check', label: 'NIF perceptores', passed: perceptores.every(p => p.nif?.length >= 8), severity: perceptores.every(p => p.nif?.length >= 8) ? 'info' : 'error', message: perceptores.every(p => p.nif?.length >= 8) ? 'Todos los NIFs válidos' : 'Algunos perceptores sin NIF válido' },
    { checkId: 'aeat190_periods', label: 'Períodos incluidos', passed: periodsIncluded.length >= 12, severity: periodsIncluded.length >= 12 ? 'info' : 'warning', message: `${periodsIncluded.length}/12 períodos incluidos` },
    { checkId: 'aeat190_cert', label: 'Certificado AEAT', passed: false, severity: 'warning', message: 'Certificado digital no configurado' },
    { checkId: 'aeat190_mode', label: 'Modo preparatorio', passed: true, severity: 'info', message: 'NO equivale a presentación oficial ante AEAT' },
  ];

  const errorCount = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warningCount = checks.filter(c => !c.passed && c.severity === 'warning').length;

  const validationResult: SubmissionValidationResult = {
    version: '1.0',
    checks,
    errorCount,
    warningCount,
    infoCount: checks.filter(c => c.severity === 'info').length,
    passed: errorCount === 0,
    score: errorCount === 0 ? 80 : 30,
    validatedAt: new Date().toISOString(),
  };

  return {
    payload,
    snapshot,
    validationResult,
    canDryRun: errorCount === 0,
    summary: errorCount === 0
      ? `Modelo 190 ${ejercicio} — ${perceptores.length} perceptores, ${totals.total_retenciones.toLocaleString('es-ES')} € retenciones`
      : `Modelo 190: ${errorCount} error(es)`,
  };
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function createEmptyAEATValidation(modelo: string, reason: string): SubmissionValidationResult {
  return {
    version: '1.0',
    checks: [{
      checkId: `aeat${modelo}_no_data`,
      label: `Sin datos Modelo ${modelo}`,
      passed: false,
      severity: 'error',
      message: reason,
    }],
    errorCount: 1,
    warningCount: 0,
    infoCount: 0,
    passed: false,
    score: 0,
    validatedAt: new Date().toISOString(),
  };
}
