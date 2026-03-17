/**
 * fanCotizacionArtifactEngine.ts — V2-RRHH-P2
 * Generador de artefactos FAN / Fichero de Bases de Cotización mensual.
 *
 * Genera un payload estructurado con las bases de cotización mensuales
 * de todos los empleados de una empresa para un período, usando los
 * resultados del motor SS endurecido (P1B).
 *
 * Formato: Estructura JSON preparatoria que simula el contenido de un
 * fichero FAN (Fichero de Afiliación y Bases de Cotización) para SILTRA.
 * NO genera el binario real de SILTRA.
 *
 * IMPORTANTE: Generado ≠ presentado. isRealSubmissionBlocked === true.
 * Legislación: LGSS Art. 22-23, Orden ISM/2024, RD 2064/1995.
 */

import type { SSContributionBreakdown } from './ssContributionEngine';

// ── Types ──

export interface FANEmployeeRecord {
  employeeId: string;
  employeeName: string;
  naf: string;
  dniNie: string;
  grupoCotizacion: number;
  contractTypeCode: string;
  isTemporary: boolean;
  coeficienteParcialidad: number;
  diasCotizados: number;

  // From SS engine (P1B)
  baseCCMensual: number;
  baseATMensual: number;
  baseHorasExtra: number;
  prorrateoMensual: number;

  // Worker contributions
  ccTrabajador: number;
  desempleoTrabajador: number;
  fpTrabajador: number;
  meiTrabajador: number;
  totalTrabajador: number;

  // Employer contributions
  ccEmpresa: number;
  desempleoEmpresa: number;
  fogasa: number;
  fpEmpresa: number;
  meiEmpresa: number;
  atEmpresa: number;
  totalEmpresa: number;

  // IRPF (informative, from P1B corrected base)
  baseIRPFCorregida: number;
  tipoIRPF: number;
  retencionIRPF: number;

  // Trazabilidad
  topeMinAplicado: boolean;
  topeMaxAplicado: boolean;
  prorrateoSource: 'calculated' | 'from_lines' | 'none';
  ssDataFromDB: boolean;

  // Validation per employee
  validationIssues: string[];
}

export interface FANCotizacionArtifact {
  id: string;
  circuitId: 'tgss_cotizacion';
  actionLabel: string;

  // Period
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;

  // Employee records
  records: FANEmployeeRecord[];
  totalEmployees: number;

  // Totals
  totals: FANCotizacionTotals;

  // Validation
  validations: FANValidation[];
  isValid: boolean;
  readinessPercent: number;
  warnings: string[];

  // Status
  artifactStatus: FANArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;

  // Meta
  generatedAt: string;
  version: string;
}

export interface FANCotizacionTotals {
  totalBasesCC: number;
  totalBasesAT: number;
  totalHorasExtra: number;
  totalCotizacionTrabajador: number;
  totalCotizacionEmpresa: number;
  totalCotizacionGeneral: number;
  totalRetencionIRPF: number;
  totalLiquidoEstimado: number;
}

export interface FANValidation {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail: string;
}

export type FANArtifactStatus =
  | 'generated'
  | 'validated_internal'
  | 'dry_run_ready'
  | 'pending_approval'
  | 'error';

export const FAN_STATUS_META: Record<FANArtifactStatus, { label: string; color: string; disclaimer: string }> = {
  generated: {
    label: 'Generado (interno)',
    color: 'bg-blue-500/10 text-blue-700',
    disclaimer: 'Fichero de bases generado internamente. NO constituye liquidación oficial ante la TGSS.',
  },
  validated_internal: {
    label: 'Validado internamente',
    color: 'bg-indigo-500/10 text-indigo-700',
    disclaimer: 'Validación interna superada. NO ha sido procesado por SILTRA ni por la TGSS.',
  },
  dry_run_ready: {
    label: 'Listo para dry-run',
    color: 'bg-emerald-500/10 text-emerald-700',
    disclaimer: 'Preparado para simulación. El envío real permanece bloqueado.',
  },
  pending_approval: {
    label: 'Pendiente de aprobación',
    color: 'bg-amber-500/10 text-amber-700',
    disclaimer: 'Requiere aprobación interna. NO es una liquidación oficial.',
  },
  error: {
    label: 'Error en validación',
    color: 'bg-destructive/10 text-destructive',
    disclaimer: 'Errores detectados que impiden el procesamiento.',
  },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Build employee record from SS result ──

export function buildFANEmployeeRecord(params: {
  employeeId: string;
  employeeName: string;
  naf: string;
  dniNie: string;
  grupoCotizacion: number;
  contractTypeCode: string;
  isTemporary: boolean;
  coeficienteParcialidad: number;
  diasCotizados: number;
  ssResult: SSContributionBreakdown;
  tipoIRPF: number;
  retencionIRPF: number;
}): FANEmployeeRecord {
  const ss = params.ssResult;
  const issues: string[] = [];

  if (!params.naf || params.naf.trim().length === 0) issues.push('NAF ausente');
  if (!params.dniNie || params.dniNie.trim().length === 0) issues.push('DNI/NIE ausente');
  if (params.diasCotizados <= 0) issues.push('Días cotizados ≤ 0');
  if (ss.baseCCMensual <= 0) issues.push('Base CC ≤ 0');
  if (!ss.dataQuality.ratesFromDB) issues.push('Tipos SS estimados (sin BD)');

  return {
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    naf: params.naf,
    dniNie: params.dniNie,
    grupoCotizacion: params.grupoCotizacion,
    contractTypeCode: params.contractTypeCode,
    isTemporary: params.isTemporary,
    coeficienteParcialidad: params.coeficienteParcialidad,
    diasCotizados: params.diasCotizados,
    baseCCMensual: ss.baseCCMensual,
    baseATMensual: ss.baseATMensual,
    baseHorasExtra: ss.baseHorasExtra,
    prorrateoMensual: ss.prorrateoMensual,
    ccTrabajador: ss.ccTrabajador,
    desempleoTrabajador: ss.desempleoTrabajador,
    fpTrabajador: ss.fpTrabajador,
    meiTrabajador: ss.meiTrabajador,
    totalTrabajador: ss.totalTrabajador,
    ccEmpresa: ss.ccEmpresa,
    desempleoEmpresa: ss.desempleoEmpresa,
    fogasa: ss.fogasa,
    fpEmpresa: ss.fpEmpresa,
    meiEmpresa: ss.meiEmpresa,
    atEmpresa: ss.atEmpresa,
    totalEmpresa: ss.totalEmpresa,
    baseIRPFCorregida: ss.baseIRPFCorregida,
    tipoIRPF: params.tipoIRPF,
    retencionIRPF: params.retencionIRPF,
    topeMinAplicado: ss.topeMinAplicado,
    topeMaxAplicado: ss.topeMaxAplicado,
    prorrateoSource: ss.prorrateoSource,
    ssDataFromDB: ss.dataQuality.ratesFromDB,
    validationIssues: issues,
  };
}

// ── Build full FAN artifact ──

function generateFANId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `FAN-COT-${ts}-${rand}`;
}

export function buildFANCotizacion(params: {
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  records: FANEmployeeRecord[];
}): FANCotizacionArtifact {
  const warnings: string[] = [];
  const validations: FANValidation[] = [];

  const { records } = params;
  const periodLabel = `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`;

  // ── Totals ──
  const totals: FANCotizacionTotals = {
    totalBasesCC: r2(records.reduce((s, r) => s + r.baseCCMensual, 0)),
    totalBasesAT: r2(records.reduce((s, r) => s + r.baseATMensual, 0)),
    totalHorasExtra: r2(records.reduce((s, r) => s + r.baseHorasExtra, 0)),
    totalCotizacionTrabajador: r2(records.reduce((s, r) => s + r.totalTrabajador, 0)),
    totalCotizacionEmpresa: r2(records.reduce((s, r) => s + r.totalEmpresa, 0)),
    totalCotizacionGeneral: 0,
    totalRetencionIRPF: r2(records.reduce((s, r) => s + r.retencionIRPF, 0)),
    totalLiquidoEstimado: 0,
  };
  totals.totalCotizacionGeneral = r2(totals.totalCotizacionTrabajador + totals.totalCotizacionEmpresa);
  const totalBrutos = r2(records.reduce((s, r) => s + r.baseCCMensual, 0)); // Approximation
  totals.totalLiquidoEstimado = r2(totalBrutos - totals.totalCotizacionTrabajador - totals.totalRetencionIRPF);

  // ── Validations ──

  // 1. At least one employee
  validations.push({
    id: 'has_employees',
    label: 'Empleados en liquidación',
    passed: records.length > 0,
    severity: 'error',
    detail: records.length > 0 ? `${records.length} empleado(s)` : 'Sin empleados — liquidación vacía',
  });

  // 2. Company CCC present
  validations.push({
    id: 'has_ccc',
    label: 'CCC empresa',
    passed: params.companyCCC.trim().length > 0,
    severity: 'error',
    detail: params.companyCCC.trim().length > 0 ? params.companyCCC : 'CCC no configurado',
  });

  // 3. All employees have NAF
  const withoutNAF = records.filter(r => r.validationIssues.includes('NAF ausente'));
  validations.push({
    id: 'all_have_naf',
    label: 'NAF en todos los registros',
    passed: withoutNAF.length === 0,
    severity: 'error',
    detail: withoutNAF.length > 0
      ? `${withoutNAF.length} empleado(s) sin NAF`
      : 'OK',
  });

  // 4. No zero bases
  const zeroBases = records.filter(r => r.baseCCMensual <= 0);
  validations.push({
    id: 'no_zero_bases',
    label: 'Bases CC > 0',
    passed: zeroBases.length === 0,
    severity: 'error',
    detail: zeroBases.length > 0
      ? `${zeroBases.length} empleado(s) con base CC ≤ 0`
      : 'OK',
  });

  // 5. SS data from DB
  const estimatedSS = records.filter(r => !r.ssDataFromDB);
  validations.push({
    id: 'ss_data_real',
    label: 'Tipos SS desde BD',
    passed: estimatedSS.length === 0,
    severity: 'warning',
    detail: estimatedSS.length > 0
      ? `${estimatedSS.length} empleado(s) con tipos SS estimados`
      : 'Todos con datos reales de BD',
  });

  // 6. Topes applied check
  const topedMax = records.filter(r => r.topeMaxAplicado);
  if (topedMax.length > 0) {
    validations.push({
      id: 'topes_max_applied',
      label: 'Topes máximos aplicados',
      passed: true,
      severity: 'info',
      detail: `${topedMax.length} empleado(s) con base topada al máximo`,
    });
  }

  // 7. CIF present
  validations.push({
    id: 'has_cif',
    label: 'CIF empresa',
    passed: params.companyCIF.trim().length > 0,
    severity: 'error',
    detail: params.companyCIF.trim().length > 0 ? params.companyCIF : 'CIF no configurado',
  });

  // Aggregate individual employee issues
  const totalIssues = records.reduce((s, r) => s + r.validationIssues.length, 0);
  if (totalIssues > 0) {
    warnings.push(`${totalIssues} incidencia(s) en registros individuales`);
  }

  const errorValidations = validations.filter(v => v.severity === 'error' && !v.passed);
  const allPassed = validations.filter(v => v.passed).length;
  const readinessPercent = validations.length > 0 ? Math.round((allPassed / validations.length) * 100) : 0;
  const isValid = errorValidations.length === 0 && records.length > 0;

  const status: FANArtifactStatus = !isValid ? 'error' : 'generated';

  return {
    id: generateFANId(),
    circuitId: 'tgss_cotizacion',
    actionLabel: `Liquidación bases cotización ${periodLabel}`,
    companyId: params.companyId,
    companyCIF: params.companyCIF,
    companyCCC: params.companyCCC,
    companyName: params.companyName,
    periodYear: params.periodYear,
    periodMonth: params.periodMonth,
    periodLabel,
    records,
    totalEmployees: records.length,
    totals,
    validations,
    isValid,
    readinessPercent,
    warnings,
    artifactStatus: status,
    statusLabel: FAN_STATUS_META[status].label,
    statusDisclaimer: FAN_STATUS_META[status].disclaimer,
    generatedAt: new Date().toISOString(),
    version: '1.0-P2',
  };
}

// ── Promote status ──

export function promoteFANStatus(
  artifact: FANCotizacionArtifact,
  targetStatus: FANArtifactStatus,
): FANCotizacionArtifact {
  const validTransitions: Record<FANArtifactStatus, FANArtifactStatus[]> = {
    generated: ['validated_internal', 'error'],
    validated_internal: ['dry_run_ready', 'error'],
    dry_run_ready: ['pending_approval', 'error'],
    pending_approval: ['validated_internal'],
    error: ['generated'],
  };

  const allowed = validTransitions[artifact.artifactStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    return { ...artifact, warnings: [...artifact.warnings, `Transición no permitida: ${artifact.artifactStatus} → ${targetStatus}`] };
  }

  return {
    ...artifact,
    artifactStatus: targetStatus,
    statusLabel: FAN_STATUS_META[targetStatus].label,
    statusDisclaimer: FAN_STATUS_META[targetStatus].disclaimer,
  };
}

// ── Serialize for evidence ──

export function serializeFANForSnapshot(artifact: FANCotizacionArtifact): Record<string, unknown> {
  return {
    id: artifact.id,
    circuitId: artifact.circuitId,
    periodLabel: artifact.periodLabel,
    companyId: artifact.companyId,
    companyCCC: artifact.companyCCC,
    totalEmployees: artifact.totalEmployees,
    totals: artifact.totals,
    isValid: artifact.isValid,
    readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus,
    version: artifact.version,
    generatedAt: artifact.generatedAt,
    errorCount: artifact.validations.filter(v => !v.passed && v.severity === 'error').length,
    warningCount: artifact.warnings.length,
  };
}
