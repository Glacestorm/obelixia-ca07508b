/**
 * rlcRntCraArtifactEngine.ts — V2-RRHH-P4
 * Generadores pre-reales de artefactos TGSS para liquidación mensual:
 *
 *  - RLC (Recibo de Liquidación de Cotizaciones): resumen de cuotas a ingresar
 *  - RNT (Relación Nominal de Trabajadores): detalle por trabajador de bases y cuotas
 *  - CRA (Cuadro Resumen de Aportaciones): desglose por conceptos agregados
 *
 * Inputs: FANEmployeeRecord[] (ya calculadas por fanCotizacionArtifactEngine)
 *         + datos empresa + período
 *
 * IMPORTANTE: Generado ≠ presentado. isRealSubmissionBlocked === true.
 * Legislación: LGSS Art. 22-23, RD 2064/1995, Orden ISM/2024.
 */

import type { FANEmployeeRecord, FANCotizacionTotals } from './fanCotizacionArtifactEngine';

// ─── Shared Types ───────────────────────────────────────────────────────────

export type RLCRNTCRAArtifactStatus =
  | 'generated'
  | 'validated_internal'
  | 'dry_run_ready'
  | 'pending_approval'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'confirmed'
  | 'archived'
  | 'error';

export const RLCRNTCRA_STATUS_META: Record<RLCRNTCRAArtifactStatus, { label: string; color: string; disclaimer: string }> = {
  generated: {
    label: 'Generado (interno)',
    color: 'bg-blue-500/10 text-blue-700',
    disclaimer: 'Documento generado internamente. NO constituye liquidación oficial ante la TGSS.',
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
  sent: {
    label: 'Enviado (interno)',
    color: 'bg-sky-500/10 text-sky-700',
    disclaimer: 'Marcado como enviado internamente. isRealSubmissionBlocked === true. No se ha transmitido a SILTRA/TGSS.',
  },
  accepted: {
    label: 'Aceptado por TGSS',
    color: 'bg-emerald-500/10 text-emerald-700',
    disclaimer: 'Respuesta TGSS registrada como aceptada. Pendiente de reconciliación para confirmar.',
  },
  rejected: {
    label: 'Rechazado por TGSS',
    color: 'bg-red-500/10 text-red-700',
    disclaimer: 'Respuesta TGSS registrada como rechazada. Requiere corrección y reenvío.',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-green-500/10 text-green-700',
    disclaimer: 'Aceptado y reconciliado. Liquidación confirmada con validación operativa completa.',
  },
  archived: {
    label: 'Archivado',
    color: 'bg-slate-500/10 text-slate-700',
    disclaimer: 'Artefacto archivado con trazabilidad completa.',
  },
  error: {
    label: 'Error en validación',
    color: 'bg-destructive/10 text-destructive',
    disclaimer: 'Errores detectados que impiden el procesamiento.',
  },
};

export interface ArtifactValidationItem {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail: string;
}

// ─── RNT (Relación Nominal de Trabajadores) ─────────────────────────────────

export interface RNTWorkerLine {
  naf: string;
  dniNie: string;
  employeeName: string;
  grupoCotizacion: number;
  contractTypeCode: string;
  diasCotizados: number;
  coeficienteParcialidad: number;
  baseCCMensual: number;
  baseATMensual: number;
  baseHorasExtra: number;
  ccTrabajador: number;
  desempleoTrabajador: number;
  fpTrabajador: number;
  meiTrabajador: number;
  totalTrabajador: number;
  ccEmpresa: number;
  desempleoEmpresa: number;
  fogasa: number;
  fpEmpresa: number;
  meiEmpresa: number;
  atEmpresa: number;
  totalEmpresa: number;
  topeMinAplicado: boolean;
  topeMaxAplicado: boolean;
  issues: string[];
}

export interface RNTArtifact {
  id: string;
  artifactType: 'rnt';
  circuitId: 'tgss_cotizacion';
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  workers: RNTWorkerLine[];
  totalWorkers: number;
  totals: FANCotizacionTotals;
  validations: ArtifactValidationItem[];
  isValid: boolean;
  readinessPercent: number;
  artifactStatus: RLCRNTCRAArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
  generatedAt: string;
  version: string;
}

// ─── RLC (Recibo de Liquidación de Cotizaciones) ────────────────────────────

export interface RLCArtifact {
  id: string;
  artifactType: 'rlc';
  circuitId: 'tgss_cotizacion';
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;

  /** Summary amounts */
  totalBasesCC: number;
  totalBasesAT: number;
  totalCuotaEmpresa: number;
  totalCuotaTrabajador: number;
  totalLiquidacion: number;
  totalRecargo: number; // 0 in normal case
  totalIngreso: number;
  totalWorkers: number;

  /** Concept breakdown */
  conceptBreakdown: RLCConceptLine[];

  validations: ArtifactValidationItem[];
  isValid: boolean;
  readinessPercent: number;
  artifactStatus: RLCRNTCRAArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
  generatedAt: string;
  version: string;
}

export interface RLCConceptLine {
  conceptCode: string;
  conceptLabel: string;
  baseImponible: number;
  tipoPercent: number;
  cuota: number;
  source: 'empresa' | 'trabajador';
}

// ─── CRA (Cuadro Resumen de Aportaciones) ───────────────────────────────────

export interface CRAArtifact {
  id: string;
  artifactType: 'cra';
  circuitId: 'tgss_cotizacion';
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;

  /** Aggregated by contribution concept */
  sections: CRASection[];

  /** Grand totals */
  totalEmpresa: number;
  totalTrabajador: number;
  totalGeneral: number;
  totalWorkers: number;

  validations: ArtifactValidationItem[];
  isValid: boolean;
  readinessPercent: number;
  artifactStatus: RLCRNTCRAArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
  generatedAt: string;
  version: string;
}

export interface CRASection {
  sectionId: string;
  sectionLabel: string;
  empresa: number;
  trabajador: number;
  total: number;
  workerCount: number;
  /** A6 fix: optional breakdown by grupo de cotización */
  byGrupo?: Array<{ grupo: number; empresa: number; trabajador: number; total: number; workerCount: number }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;

function generateArtifactId(type: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${type.toUpperCase()}-${ts}-${rand}`;
}

function buildBaseValidations(params: {
  companyCCC: string;
  companyCIF: string;
  records: FANEmployeeRecord[];
  periodMonth: number;
  periodYear: number;
}): ArtifactValidationItem[] {
  const validations: ArtifactValidationItem[] = [];

  validations.push({
    id: 'has_ccc', label: 'CCC empresa',
    passed: params.companyCCC.trim().length > 0,
    severity: 'error', detail: params.companyCCC || 'No configurado',
  });

  validations.push({
    id: 'has_cif', label: 'CIF empresa',
    passed: params.companyCIF.trim().length > 0,
    severity: 'error', detail: params.companyCIF || 'No configurado',
  });

  validations.push({
    id: 'has_workers', label: 'Trabajadores en período',
    passed: params.records.length > 0,
    severity: 'error', detail: params.records.length > 0 ? `${params.records.length} trabajador(es)` : 'Sin trabajadores',
  });

  const withoutNAF = params.records.filter(r => !r.naf || r.naf.trim().length === 0);
  validations.push({
    id: 'all_naf', label: 'NAF en todos los trabajadores',
    passed: withoutNAF.length === 0,
    severity: 'error', detail: withoutNAF.length > 0 ? `${withoutNAF.length} sin NAF` : 'OK',
  });

  const zeroBases = params.records.filter(r => r.baseCCMensual <= 0);
  validations.push({
    id: 'no_zero_bases', label: 'Bases CC > 0',
    passed: zeroBases.length === 0,
    severity: 'error', detail: zeroBases.length > 0 ? `${zeroBases.length} con base ≤ 0` : 'OK',
  });

  validations.push({
    id: 'valid_period', label: 'Período válido',
    passed: params.periodMonth >= 1 && params.periodMonth <= 12 && params.periodYear >= 2020,
    severity: 'error', detail: `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`,
  });

  return validations;
}

function computeStatus(validations: ArtifactValidationItem[]): {
  isValid: boolean;
  readinessPercent: number;
  status: RLCRNTCRAArtifactStatus;
} {
  const errors = validations.filter(v => v.severity === 'error' && !v.passed).length;
  const passed = validations.filter(v => v.passed).length;
  const readinessPercent = validations.length > 0 ? Math.round((passed / validations.length) * 100) : 0;
  const isValid = errors === 0 && validations.length > 0;
  return { isValid, readinessPercent, status: isValid ? 'generated' : 'error' };
}

// ─── RNT Builder ────────────────────────────────────────────────────────────

export function buildRNT(params: {
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  records: FANEmployeeRecord[];
  totals: FANCotizacionTotals;
}): RNTArtifact {
  const periodLabel = `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`;

  const workers: RNTWorkerLine[] = params.records.map(r => ({
    naf: r.naf,
    dniNie: r.dniNie,
    employeeName: r.employeeName,
    grupoCotizacion: r.grupoCotizacion,
    contractTypeCode: r.contractTypeCode,
    diasCotizados: r.diasCotizados,
    coeficienteParcialidad: r.coeficienteParcialidad,
    baseCCMensual: r.baseCCMensual,
    baseATMensual: r.baseATMensual,
    baseHorasExtra: r.baseHorasExtra,
    ccTrabajador: r.ccTrabajador,
    desempleoTrabajador: r.desempleoTrabajador,
    fpTrabajador: r.fpTrabajador,
    meiTrabajador: r.meiTrabajador,
    totalTrabajador: r.totalTrabajador,
    ccEmpresa: r.ccEmpresa,
    desempleoEmpresa: r.desempleoEmpresa,
    fogasa: r.fogasa,
    fpEmpresa: r.fpEmpresa,
    meiEmpresa: r.meiEmpresa,
    atEmpresa: r.atEmpresa,
    totalEmpresa: r.totalEmpresa,
    topeMinAplicado: r.topeMinAplicado,
    topeMaxAplicado: r.topeMaxAplicado,
    issues: r.validationIssues,
  }));

  const validations = buildBaseValidations({
    companyCCC: params.companyCCC,
    companyCIF: params.companyCIF,
    records: params.records,
    periodMonth: params.periodMonth,
    periodYear: params.periodYear,
  });

  // Additional RNT-specific validations
  const withIssues = params.records.filter(r => r.validationIssues.length > 0);
  if (withIssues.length > 0) {
    validations.push({
      id: 'worker_issues', label: 'Incidencias en trabajadores',
      passed: false, severity: 'warning',
      detail: `${withIssues.length} trabajador(es) con incidencias`,
    });
  }

  const { isValid, readinessPercent, status } = computeStatus(validations);

  return {
    id: generateArtifactId('RNT'),
    artifactType: 'rnt',
    circuitId: 'tgss_cotizacion',
    companyId: params.companyId,
    companyCIF: params.companyCIF,
    companyCCC: params.companyCCC,
    companyName: params.companyName,
    periodYear: params.periodYear,
    periodMonth: params.periodMonth,
    periodLabel,
    workers,
    totalWorkers: workers.length,
    totals: params.totals,
    validations,
    isValid,
    readinessPercent,
    artifactStatus: status,
    statusLabel: RLCRNTCRA_STATUS_META[status].label,
    statusDisclaimer: RLCRNTCRA_STATUS_META[status].disclaimer,
    generatedAt: new Date().toISOString(),
    version: '1.0-P4',
  };
}

// ─── RLC Builder ────────────────────────────────────────────────────────────

export function buildRLC(params: {
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  records: FANEmployeeRecord[];
  totals: FANCotizacionTotals;
}): RLCArtifact {
  const periodLabel = `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`;

  // Build concept breakdown from aggregated records (A5 fix: derive rates from actual cuotas)
  const ccCuota = r2(params.records.reduce((s, r) => s + r.ccEmpresa + r.ccTrabajador, 0));
  const desempleoCuota = r2(params.records.reduce((s, r) => s + r.desempleoEmpresa + r.desempleoTrabajador, 0));
  const fogasaCuota = r2(params.records.reduce((s, r) => s + r.fogasa, 0));
  const fpCuota = r2(params.records.reduce((s, r) => s + r.fpEmpresa + r.fpTrabajador, 0));
  const meiCuota = r2(params.records.reduce((s, r) => s + r.meiEmpresa + r.meiTrabajador, 0));
  const atCuota = r2(params.records.reduce((s, r) => s + r.atEmpresa, 0));

  const deriveRate = (cuota: number, base: number) => base > 0 ? r2((cuota / base) * 100) : 0;

  const conceptBreakdown: RLCConceptLine[] = [
    {
      conceptCode: 'CC', conceptLabel: 'Contingencias Comunes',
      baseImponible: params.totals.totalBasesCC,
      tipoPercent: deriveRate(ccCuota, params.totals.totalBasesCC),
      cuota: ccCuota,
      source: 'empresa',
    },
    {
      conceptCode: 'DESEMP', conceptLabel: 'Desempleo',
      baseImponible: params.totals.totalBasesCC,
      tipoPercent: deriveRate(desempleoCuota, params.totals.totalBasesCC),
      cuota: desempleoCuota,
      source: 'empresa',
    },
    {
      conceptCode: 'FOGASA', conceptLabel: 'FOGASA',
      baseImponible: params.totals.totalBasesCC,
      tipoPercent: deriveRate(fogasaCuota, params.totals.totalBasesCC),
      cuota: fogasaCuota,
      source: 'empresa',
    },
    {
      conceptCode: 'FP', conceptLabel: 'Formación Profesional',
      baseImponible: params.totals.totalBasesCC,
      tipoPercent: deriveRate(fpCuota, params.totals.totalBasesCC),
      cuota: fpCuota,
      source: 'empresa',
    },
    {
      conceptCode: 'MEI', conceptLabel: 'Mecanismo Equidad Intergeneracional',
      baseImponible: params.totals.totalBasesCC,
      tipoPercent: deriveRate(meiCuota, params.totals.totalBasesCC),
      cuota: meiCuota,
      source: 'empresa',
    },
    {
      conceptCode: 'AT', conceptLabel: 'Accidentes de Trabajo / EP',
      baseImponible: params.totals.totalBasesAT,
      tipoPercent: deriveRate(atCuota, params.totals.totalBasesAT),
      cuota: atCuota,
      source: 'empresa',
    },
  ];

  const totalCuotaEmpresa = params.totals.totalCotizacionEmpresa;
  const totalCuotaTrabajador = params.totals.totalCotizacionTrabajador;
  const totalLiquidacion = r2(totalCuotaEmpresa + totalCuotaTrabajador);

  const validations = buildBaseValidations({
    companyCCC: params.companyCCC,
    companyCIF: params.companyCIF,
    records: params.records,
    periodMonth: params.periodMonth,
    periodYear: params.periodYear,
  });

  // RLC-specific: totals coherence
  const conceptTotal = r2(conceptBreakdown.reduce((s, c) => s + c.cuota, 0));
  validations.push({
    id: 'concept_coherence', label: 'Coherencia conceptos vs total',
    passed: Math.abs(conceptTotal - totalLiquidacion) < 1,
    severity: 'warning',
    detail: `Conceptos: ${conceptTotal.toFixed(2)}€, Total: ${totalLiquidacion.toFixed(2)}€`,
  });

  const { isValid, readinessPercent, status } = computeStatus(validations);

  return {
    id: generateArtifactId('RLC'),
    artifactType: 'rlc',
    circuitId: 'tgss_cotizacion',
    companyId: params.companyId,
    companyCIF: params.companyCIF,
    companyCCC: params.companyCCC,
    companyName: params.companyName,
    periodYear: params.periodYear,
    periodMonth: params.periodMonth,
    periodLabel,
    totalBasesCC: params.totals.totalBasesCC,
    totalBasesAT: params.totals.totalBasesAT,
    totalCuotaEmpresa: totalCuotaEmpresa,
    totalCuotaTrabajador: totalCuotaTrabajador,
    totalLiquidacion,
    totalRecargo: 0,
    totalIngreso: totalLiquidacion,
    totalWorkers: params.records.length,
    conceptBreakdown,
    validations,
    isValid,
    readinessPercent,
    artifactStatus: status,
    statusLabel: RLCRNTCRA_STATUS_META[status].label,
    statusDisclaimer: RLCRNTCRA_STATUS_META[status].disclaimer,
    generatedAt: new Date().toISOString(),
    version: '1.0-P4',
  };
}

// ─── CRA Builder ────────────────────────────────────────────────────────────

export function buildCRA(params: {
  companyId: string;
  companyCIF: string;
  companyCCC: string;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  records: FANEmployeeRecord[];
}): CRAArtifact {
  const periodLabel = `${String(params.periodMonth).padStart(2, '0')}/${params.periodYear}`;
  const { records } = params;
  const n = records.length;

  // A6 fix: helper to build grupo breakdown for a section
  const grupoSet = new Set(records.map(r => r.grupoCotizacion));
  const grupoArr = Array.from(grupoSet).sort((a, b) => a - b);

  function buildGrupoBreakdown(
    empresaFn: (r: FANEmployeeRecord) => number,
    trabajadorFn: (r: FANEmployeeRecord) => number,
  ) {
    return grupoArr.map(g => {
      const grp = records.filter(r => r.grupoCotizacion === g);
      const emp = r2(grp.reduce((s, r) => s + empresaFn(r), 0));
      const trab = r2(grp.reduce((s, r) => s + trabajadorFn(r), 0));
      return { grupo: g, empresa: emp, trabajador: trab, total: r2(emp + trab), workerCount: grp.length };
    });
  }

  const sections: CRASection[] = [
    {
      sectionId: 'cc', sectionLabel: 'Contingencias Comunes',
      empresa: r2(records.reduce((s, r) => s + r.ccEmpresa, 0)),
      trabajador: r2(records.reduce((s, r) => s + r.ccTrabajador, 0)),
      total: 0, workerCount: n,
      byGrupo: buildGrupoBreakdown(r => r.ccEmpresa, r => r.ccTrabajador),
    },
    {
      sectionId: 'desempleo', sectionLabel: 'Desempleo',
      empresa: r2(records.reduce((s, r) => s + r.desempleoEmpresa, 0)),
      trabajador: r2(records.reduce((s, r) => s + r.desempleoTrabajador, 0)),
      total: 0, workerCount: n,
      byGrupo: buildGrupoBreakdown(r => r.desempleoEmpresa, r => r.desempleoTrabajador),
    },
    {
      sectionId: 'fogasa', sectionLabel: 'FOGASA',
      empresa: r2(records.reduce((s, r) => s + r.fogasa, 0)),
      trabajador: 0,
      total: 0, workerCount: n,
      byGrupo: buildGrupoBreakdown(r => r.fogasa, () => 0),
    },
    {
      sectionId: 'fp', sectionLabel: 'Formación Profesional',
      empresa: r2(records.reduce((s, r) => s + r.fpEmpresa, 0)),
      trabajador: r2(records.reduce((s, r) => s + r.fpTrabajador, 0)),
      total: 0, workerCount: n,
      byGrupo: buildGrupoBreakdown(r => r.fpEmpresa, r => r.fpTrabajador),
    },
    {
      sectionId: 'mei', sectionLabel: 'MEI',
      empresa: r2(records.reduce((s, r) => s + r.meiEmpresa, 0)),
      trabajador: r2(records.reduce((s, r) => s + r.meiTrabajador, 0)),
      total: 0, workerCount: n,
      byGrupo: buildGrupoBreakdown(r => r.meiEmpresa, r => r.meiTrabajador),
    },
    {
      sectionId: 'at', sectionLabel: 'AT / EP',
      empresa: r2(records.reduce((s, r) => s + r.atEmpresa, 0)),
      trabajador: 0,
      total: 0, workerCount: n,
      byGrupo: buildGrupoBreakdown(r => r.atEmpresa, () => 0),
    },
  ];

  // Compute totals for each section
  for (const s of sections) {
    s.total = r2(s.empresa + s.trabajador);
  }

  const totalEmpresa = r2(sections.reduce((s, sec) => s + sec.empresa, 0));
  const totalTrabajador = r2(sections.reduce((s, sec) => s + sec.trabajador, 0));
  const totalGeneral = r2(totalEmpresa + totalTrabajador);

  const validations = buildBaseValidations({
    companyCCC: params.companyCCC,
    companyCIF: params.companyCIF,
    records: params.records,
    periodMonth: params.periodMonth,
    periodYear: params.periodYear,
  });

  // CRA-specific: section totals coherence
  validations.push({
    id: 'sections_coherence', label: 'Coherencia secciones vs total',
    passed: Math.abs(totalGeneral - r2(records.reduce((s, r) => s + r.totalEmpresa + r.totalTrabajador, 0))) < 1,
    severity: 'warning',
    detail: `CRA total: ${totalGeneral.toFixed(2)}€`,
  });

  const { isValid, readinessPercent, status } = computeStatus(validations);

  return {
    id: generateArtifactId('CRA'),
    artifactType: 'cra',
    circuitId: 'tgss_cotizacion',
    companyId: params.companyId,
    companyCIF: params.companyCIF,
    companyCCC: params.companyCCC,
    companyName: params.companyName,
    periodYear: params.periodYear,
    periodMonth: params.periodMonth,
    periodLabel,
    sections,
    totalEmpresa,
    totalTrabajador,
    totalGeneral,
    totalWorkers: n,
    validations,
    isValid,
    readinessPercent,
    artifactStatus: status,
    statusLabel: RLCRNTCRA_STATUS_META[status].label,
    statusDisclaimer: RLCRNTCRA_STATUS_META[status].disclaimer,
    generatedAt: new Date().toISOString(),
    version: '1.0-P4',
  };
}

// ─── Status promotion ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<RLCRNTCRAArtifactStatus, RLCRNTCRAArtifactStatus[]> = {
  generated: ['validated_internal', 'error'],
  validated_internal: ['dry_run_ready', 'error'],
  dry_run_ready: ['pending_approval', 'error'],
  pending_approval: ['sent', 'validated_internal', 'error'],
  sent: ['accepted', 'rejected', 'error'],
  accepted: ['confirmed', 'error'],
  rejected: ['generated', 'error'],
  confirmed: ['archived'],
  archived: [],
  error: ['generated'],
};

export function promoteRLCRNTCRAStatus<T extends { artifactStatus: RLCRNTCRAArtifactStatus; statusLabel: string; statusDisclaimer: string }>(
  artifact: T,
  targetStatus: RLCRNTCRAArtifactStatus,
): T {
  const allowed = VALID_TRANSITIONS[artifact.artifactStatus] ?? [];
  if (!allowed.includes(targetStatus)) return artifact;

  return {
    ...artifact,
    artifactStatus: targetStatus,
    statusLabel: RLCRNTCRA_STATUS_META[targetStatus].label,
    statusDisclaimer: RLCRNTCRA_STATUS_META[targetStatus].disclaimer,
  };
}

// ─── Serialize for evidence ─────────────────────────────────────────────────

export function serializeRLCForSnapshot(artifact: RLCArtifact): Record<string, unknown> {
  return {
    id: artifact.id, artifactType: 'rlc', circuitId: artifact.circuitId,
    periodLabel: artifact.periodLabel, companyCCC: artifact.companyCCC,
    totalLiquidacion: artifact.totalLiquidacion, totalWorkers: artifact.totalWorkers,
    isValid: artifact.isValid, readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus, version: artifact.version,
    generatedAt: artifact.generatedAt,
  };
}

export function serializeRNTForSnapshot(artifact: RNTArtifact): Record<string, unknown> {
  return {
    id: artifact.id, artifactType: 'rnt', circuitId: artifact.circuitId,
    periodLabel: artifact.periodLabel, companyCCC: artifact.companyCCC,
    totalWorkers: artifact.totalWorkers, totals: artifact.totals,
    isValid: artifact.isValid, readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus, version: artifact.version,
    generatedAt: artifact.generatedAt,
  };
}

export function serializeCRAForSnapshot(artifact: CRAArtifact): Record<string, unknown> {
  return {
    id: artifact.id, artifactType: 'cra', circuitId: artifact.circuitId,
    periodLabel: artifact.periodLabel, companyCCC: artifact.companyCCC,
    totalGeneral: artifact.totalGeneral, totalWorkers: artifact.totalWorkers,
    isValid: artifact.isValid, readinessPercent: artifact.readinessPercent,
    artifactStatus: artifact.artifactStatus, version: artifact.version,
    generatedAt: artifact.generatedAt,
  };
}
