/**
 * payslipEngine.ts — V2-RRHH-P1B
 * Motor puro para generación de nóminas legales españolas y validaciones precierre.
 *
 * Genera:
 *  - Estructura de nómina (payslip) con formato cercano al legal español
 *  - Validaciones de legalidad salarial pre-cierre
 *
 * P1B changes:
 *  - Base IRPF uses corrected value from SS engine (excluding exempt extrasalarial)
 *  - MEI trabajador as separate deduction line
 *  - Real period days from employee context
 *  - Snapshot includes regularization detail
 *
 * Legislación referencia: ET Art. 29.1, Orden ESS/2098/2014 (recibo de salarios)
 * NOTA: Formato operativo interno — no sustituye validación legal final.
 */

import type { SSContributionBreakdown } from './ssContributionEngine';
import type { IRPFCalculationResult } from './irpfEngine';

// ── Payslip structure ──

export interface PayslipData {
  // Header
  header: PayslipHeader;

  // Devengos (earnings)
  devengos: PayslipDevengo[];
  totalDevengos: number;

  // Deducciones (deductions)
  deducciones: PayslipDeduccion[];
  totalDeducciones: number;

  // Bases
  bases: PayslipBases;

  // Result
  liquidoTotal: number;

  // Metadata
  traceability: PayslipTraceability;
  warnings: string[];
  limitations: string[];
}

export interface PayslipHeader {
  // Empresa
  empresaNombre: string;
  empresaCIF: string;
  empresaDomicilio: string;
  empresaCCC: string;

  // Trabajador
  trabajadorNombre: string;
  trabajadorDNI: string;
  trabajadorNAF: string;
  trabajadorCategoria: string;
  trabajadorGrupoCotizacion: number;
  trabajadorAntiguedad: string;

  // Periodo
  periodoNombre: string;
  periodoDesde: string;
  periodoHasta: string;
  diasTotales: number;
}

export interface PayslipDevengo {
  concepto: string;
  codigo: string;
  unidades: number | null;
  precioUnidad: number | null;
  importe: number;
  isSalarial: boolean;
  isCotizable: boolean;
}

export interface PayslipDeduccion {
  concepto: string;
  codigo: string;
  base: number | null;
  porcentaje: number | null;
  importe: number;
  tipo: 'ss_worker' | 'irpf' | 'other';
}

export interface PayslipBases {
  baseCotizacionCC: number;
  baseCotizacionAT: number;
  baseIRPF: number;
  baseHorasExtra: number;

  // Detail for legal display
  ccEmpresa: number;
  ccTrabajador: number;
  desempleoEmpresa: number;
  desempleoTrabajador: number;
  fpEmpresa: number;
  fpTrabajador: number;
  fogasa: number;
  meiEmpresa: number;
  meiTrabajador: number;
  atEmpresa: number;

  totalCotizacionesEmpresa: number;
  totalCotizacionesTrabajador: number;
}

export interface PayslipTraceability {
  generatedAt: string;
  snapshotVersion: string;
  runId: string | null;
  periodId: string;
  calculationHash: string;
  ssDataQuality: 'real' | 'estimated' | 'default';
  irpfDataQuality: 'real' | 'estimated' | 'default';
  irpfRegularized: boolean;
  isLegallyComplete: boolean;
  incompletenessReasons: string[];
}

// ── Build Payslip ──

export interface BuildPayslipInput {
  header: PayslipHeader;
  lines: PayslipLineInput[];
  ssResult: SSContributionBreakdown;
  irpfResult: IRPFCalculationResult;
  runId: string | null;
  periodId: string;
}

export interface PayslipLineInput {
  conceptCode: string;
  conceptName: string;
  lineType: 'earning' | 'deduction' | 'employer_cost' | 'informative';
  amount: number;
  units: number | null;
  unitPrice: number | null;
  isSalary: boolean;
  isSSContributable: boolean;
  isTaxable: boolean;
  sortOrder: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildPayslip(input: BuildPayslipInput): PayslipData {
  const warnings: string[] = [];
  const limitations: string[] = [];

  // ── Devengos ──
  const devengos: PayslipDevengo[] = input.lines
    .filter(l => l.lineType === 'earning')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(l => ({
      concepto: l.conceptName,
      codigo: l.conceptCode,
      unidades: l.units,
      precioUnidad: l.unitPrice,
      importe: r2(l.amount),
      isSalarial: l.isSalary,
      isCotizable: l.isSSContributable,
    }));

  const totalDevengos = r2(devengos.reduce((sum, d) => sum + d.importe, 0));

  // ── Deducciones ──
  const deducciones: PayslipDeduccion[] = [];

  // SS worker contributions
  const ss = input.ssResult;
  deducciones.push({
    concepto: 'Cotización contingencias comunes',
    codigo: 'ES_SS_CC_TRAB',
    base: ss.baseCCMensual,
    porcentaje: null,
    importe: ss.ccTrabajador,
    tipo: 'ss_worker',
  });
  deducciones.push({
    concepto: 'Cotización desempleo',
    codigo: 'ES_SS_DESEMPLEO_TRAB',
    base: ss.baseCCMensual,
    porcentaje: null,
    importe: ss.desempleoTrabajador,
    tipo: 'ss_worker',
  });
  deducciones.push({
    concepto: 'Formación profesional',
    codigo: 'ES_SS_FP_TRAB',
    base: ss.baseCCMensual,
    porcentaje: null,
    importe: ss.fpTrabajador,
    tipo: 'ss_worker',
  });
  // P1B: MEI trabajador
  deducciones.push({
    concepto: 'MEI (Mecanismo Equidad Intergeneracional)',
    codigo: 'ES_SS_MEI_TRAB',
    base: ss.baseCCMensual,
    porcentaje: 0.08,
    importe: ss.meiTrabajador,
    tipo: 'ss_worker',
  });

  // IRPF — P1B: Use corrected IRPF base instead of totalDevengos
  const irpf = input.irpfResult;
  const baseIRPFDisplay = ss.baseIRPFCorregida > 0 ? ss.baseIRPFCorregida : totalDevengos;
  deducciones.push({
    concepto: `IRPF (${irpf.tipoEfectivo}%)${irpf.regularization ? ' [regularizado]' : ''}`,
    codigo: 'ES_IRPF',
    base: baseIRPFDisplay,
    porcentaje: irpf.tipoEfectivo,
    importe: irpf.retencionMensual,
    tipo: 'irpf',
  });

  // Other deductions from lines
  const otherDeductions = input.lines
    .filter(l => l.lineType === 'deduction' && !l.conceptCode.startsWith('ES_SS_') && l.conceptCode !== 'ES_IRPF')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const l of otherDeductions) {
    deducciones.push({
      concepto: l.conceptName,
      codigo: l.conceptCode,
      base: null,
      porcentaje: null,
      importe: r2(Math.abs(l.amount)),
      tipo: 'other',
    });
  }

  const totalDeducciones = r2(deducciones.reduce((sum, d) => sum + d.importe, 0));

  // ── Bases — P1B: Use corrected IRPF base ──
  const bases: PayslipBases = {
    baseCotizacionCC: ss.baseCCMensual,
    baseCotizacionAT: ss.baseATMensual,
    baseIRPF: baseIRPFDisplay,
    baseHorasExtra: ss.baseHorasExtra,
    ccEmpresa: ss.ccEmpresa,
    ccTrabajador: ss.ccTrabajador,
    desempleoEmpresa: ss.desempleoEmpresa,
    desempleoTrabajador: ss.desempleoTrabajador,
    fpEmpresa: ss.fpEmpresa,
    fpTrabajador: ss.fpTrabajador,
    fogasa: ss.fogasa,
    meiEmpresa: ss.meiEmpresa,
    meiTrabajador: ss.meiTrabajador,
    atEmpresa: ss.atEmpresa,
    totalCotizacionesEmpresa: ss.totalEmpresa,
    totalCotizacionesTrabajador: ss.totalTrabajador,
  };

  // ── Líquido ──
  const liquidoTotal = r2(totalDevengos - totalDeducciones);

  // ── Traceability ──
  const incompletenessReasons: string[] = [];
  if (!input.irpfResult.dataQuality.tramosFromDB) {
    incompletenessReasons.push('Tramos IRPF de BD no disponibles — usando defaults');
  }
  if (!input.ssResult.dataQuality.ratesFromDB) {
    incompletenessReasons.push('Tipos SS de BD no disponibles — usando defaults');
  }
  if (!input.irpfResult.dataQuality.familyDataAvailable) {
    incompletenessReasons.push('Datos familiares no disponibles — mínimos no aplicados');
  }

  const traceability: PayslipTraceability = {
    generatedAt: new Date().toISOString(),
    snapshotVersion: '1.1-P1B',
    runId: input.runId,
    periodId: input.periodId,
    calculationHash: computeSimpleHash(`${totalDevengos}|${totalDeducciones}|${liquidoTotal}|${ss.baseCCMensual}|${irpf.tipoEfectivo}`),
    ssDataQuality: input.ssResult.dataQuality.ratesFromDB ? 'real' : 'default',
    irpfDataQuality: input.irpfResult.dataQuality.tramosFromDB ? 'real' : 'estimated',
    irpfRegularized: !!input.irpfResult.regularization,
    isLegallyComplete: incompletenessReasons.length === 0,
    incompletenessReasons,
  };

  if (incompletenessReasons.length > 0) {
    limitations.push('Este documento NO tiene validez legal completa: ' + incompletenessReasons.join('; '));
  }

  // Copy warnings from engines
  warnings.push(...input.ssResult.warnings);
  warnings.push(...input.irpfResult.warnings);

  return {
    header: input.header,
    devengos,
    totalDevengos,
    deducciones,
    totalDeducciones,
    bases,
    liquidoTotal,
    traceability,
    warnings,
    limitations,
  };
}

// ── Pre-Close Legal Validations ──

export interface LegalPreCloseCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  detail: string;
  legalReference?: string;
}

export interface LegalPreCloseInput {
  employees: LegalPreCloseEmployee[];
  periodYear: number;
  periodMonth: number;
}

export interface LegalPreCloseEmployee {
  employeeId: string;
  employeeName: string;
  grossSalary: number;
  baseCCMensual: number;
  grupoCotizacion: number | null;
  tipoIRPF: number | null;
  ssWorker: number;
  hasLaborData: boolean;
  hasFamilyData: boolean;
  hasSSData: boolean;
  irpfRegularized?: boolean;
  baseIRPFCorregida?: number;
}

export function validateLegalPreClose(input: LegalPreCloseInput): LegalPreCloseCheck[] {
  const checks: LegalPreCloseCheck[] = [];

  // ── 1. All employees have grupo cotización ──
  const withoutGrupo = input.employees.filter(e => !e.grupoCotizacion);
  checks.push({
    id: 'all_have_grupo_cotizacion',
    label: 'Grupo cotización asignado',
    passed: withoutGrupo.length === 0,
    severity: 'error',
    detail: withoutGrupo.length > 0
      ? `${withoutGrupo.length} empleado(s) sin grupo: ${withoutGrupo.slice(0, 3).map(e => e.employeeName).join(', ')}${withoutGrupo.length > 3 ? '...' : ''}`
      : 'OK',
    legalReference: 'LGSS Art. 147',
  });

  // ── 2. All employees have IRPF type calculated ──
  const withoutIRPF = input.employees.filter(e => e.tipoIRPF === null);
  checks.push({
    id: 'all_have_irpf',
    label: 'Retención IRPF calculada',
    passed: withoutIRPF.length === 0,
    severity: 'error',
    detail: withoutIRPF.length > 0
      ? `${withoutIRPF.length} empleado(s) sin IRPF: ${withoutIRPF.slice(0, 3).map(e => e.employeeName).join(', ')}${withoutIRPF.length > 3 ? '...' : ''}`
      : 'OK',
    legalReference: 'LIRPF Art. 99',
  });

  // ── 3. SS bases within legal topes ──
  const ssOutOfRange = input.employees.filter(e => e.baseCCMensual <= 0);
  checks.push({
    id: 'ss_bases_positive',
    label: 'Bases cotización positivas',
    passed: ssOutOfRange.length === 0,
    severity: 'error',
    detail: ssOutOfRange.length > 0
      ? `${ssOutOfRange.length} empleado(s) con base CC ≤ 0`
      : 'OK',
    legalReference: 'LGSS Art. 147',
  });

  // ── 4. All employees have labor data ──
  const withoutLabor = input.employees.filter(e => !e.hasLaborData);
  checks.push({
    id: 'all_have_labor_data',
    label: 'Ficha laboral ES completa',
    passed: withoutLabor.length === 0,
    severity: 'warning',
    detail: withoutLabor.length > 0
      ? `${withoutLabor.length} empleado(s) sin ficha laboral ES`
      : 'OK',
  });

  // ── 5. IRPF family data available ──
  const withoutFamily = input.employees.filter(e => !e.hasFamilyData);
  checks.push({
    id: 'all_have_family_data',
    label: 'Datos familiares IRPF disponibles',
    passed: withoutFamily.length === 0,
    severity: 'warning',
    detail: withoutFamily.length > 0
      ? `${withoutFamily.length} empleado(s) sin datos familiares — mínimos no aplicados`
      : 'OK',
  });

  // ── 6. Gross salary > SMI ──
  const SMI_2025_MENSUAL = 1134; // 15,876€ / 14 pagas
  const belowSMI = input.employees.filter(e => e.grossSalary > 0 && e.grossSalary < SMI_2025_MENSUAL);
  checks.push({
    id: 'salary_above_smi',
    label: 'Salario ≥ SMI',
    passed: belowSMI.length === 0,
    severity: 'warning',
    detail: belowSMI.length > 0
      ? `${belowSMI.length} empleado(s) con bruto < SMI (${SMI_2025_MENSUAL}€): ${belowSMI.slice(0, 3).map(e => `${e.employeeName} (${r2(e.grossSalary)}€)`).join(', ')}`
      : 'OK',
    legalReference: 'ET Art. 27',
  });

  // ── 7. SS contributions match expected range ──
  const ssAbnormal = input.employees.filter(e => {
    if (e.grossSalary <= 0) return false;
    const ssRate = (e.ssWorker / e.grossSalary) * 100;
    return ssRate < 4 || ssRate > 10; // Worker SS normally ~6.43% with MEI
  });
  checks.push({
    id: 'ss_contributions_range',
    label: 'Cotizaciones SS en rango esperado',
    passed: ssAbnormal.length === 0,
    severity: 'warning',
    detail: ssAbnormal.length > 0
      ? `${ssAbnormal.length} empleado(s) con cotización SS fuera de rango normal`
      : 'OK',
  });

  // ── 8. IRPF within reasonable range ──
  const irpfAbnormal = input.employees.filter(e => {
    if (e.tipoIRPF === null) return false;
    return e.tipoIRPF < 0 || e.tipoIRPF > 47;
  });
  checks.push({
    id: 'irpf_range',
    label: 'IRPF en rango legal (0%–47%)',
    passed: irpfAbnormal.length === 0,
    severity: 'error',
    detail: irpfAbnormal.length > 0
      ? `${irpfAbnormal.length} empleado(s) con IRPF fuera de rango`
      : 'OK',
    legalReference: 'LIRPF Art. 63',
  });

  // ── 9. P1B: IRPF regularization applied ──
  const withoutRegularization = input.employees.filter(e => !e.irpfRegularized);
  checks.push({
    id: 'irpf_regularized',
    label: 'IRPF con regularización progresiva',
    passed: withoutRegularization.length === 0,
    severity: 'info',
    detail: withoutRegularization.length > 0
      ? `${withoutRegularization.length} empleado(s) sin regularización IRPF — tipo fijo anual aplicado`
      : 'Todos con regularización progresiva',
    legalReference: 'RIRPF Art. 82-86',
  });

  // ── 10. P1B: Base IRPF differs from total devengos (exempt concepts exist) ──
  const withExempt = input.employees.filter(e => e.baseIRPFCorregida !== undefined && e.baseIRPFCorregida < e.grossSalary);
  if (withExempt.length > 0) {
    checks.push({
      id: 'irpf_base_corrected',
      label: 'Base IRPF corregida (conceptos exentos)',
      passed: true,
      severity: 'info',
      detail: `${withExempt.length} empleado(s) con base IRPF < total devengos (exentos excluidos correctamente)`,
    });
  }

  return checks;
}

// ── Hash helper ──

function computeSimpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return `ps-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}
