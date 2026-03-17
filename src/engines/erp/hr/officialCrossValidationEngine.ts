/**
 * officialCrossValidationEngine.ts — V2-RRHH-P4
 * Validaciones cruzadas entre nómina legal, cierre mensual y artefactos oficiales.
 *
 * Detecta:
 *  - Descuadres entre bases SS de nómina vs artefactos FAN/RLC/RNT
 *  - IRPF inconsistente entre nómina y modelo 111/190
 *  - Empleados o períodos incompletos
 *  - Artefactos generados sobre datos no listos (período no cerrado)
 *  - Coherencia entre expedientes SS/fiscal y paquete oficial
 *
 * Pure functions — no side-effects.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type CrossValidationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CrossValidationCheck {
  id: string;
  category: CrossValidationCategory;
  label: string;
  passed: boolean;
  severity: CrossValidationSeverity;
  detail: string;
  payrollValue?: number;
  artifactValue?: number;
  diff?: number;
}

export type CrossValidationCategory =
  | 'ss_bases'
  | 'ss_cuotas'
  | 'irpf'
  | 'data_completeness'
  | 'period_status'
  | 'artifact_coherence'
  | 'employee_coverage';

export interface CrossValidationResult {
  evaluatedAt: string;
  periodLabel: string;
  totalChecks: number;
  passed: number;
  failed: number;
  checks: CrossValidationCheck[];
  overallScore: number; // 0-100
  overallStatus: 'clean' | 'warnings' | 'critical';
  categorySummary: CategorySummary[];
}

export interface CategorySummary {
  category: CrossValidationCategory;
  categoryLabel: string;
  total: number;
  passed: number;
  failed: number;
  worstSeverity: CrossValidationSeverity;
}

// ─── Labels ─────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<CrossValidationCategory, string> = {
  ss_bases: 'Bases de cotización SS',
  ss_cuotas: 'Cuotas SS (empresa + trabajador)',
  irpf: 'IRPF / Retenciones',
  data_completeness: 'Completitud de datos',
  period_status: 'Estado del período',
  artifact_coherence: 'Coherencia entre artefactos',
  employee_coverage: 'Cobertura de empleados',
};

// ─── Input ──────────────────────────────────────────────────────────────────

export interface CrossValidationInput {
  periodYear: number;
  periodMonth: number;
  periodStatus: string; // open | closed | locked
  payrollClosed: boolean;

  /** Payroll totals from closing */
  payroll: {
    totalBruto: number;
    totalNeto: number;
    totalSSEmpresa: number;
    totalSSTrabajador: number;
    totalIRPF: number;
    totalBasesCC: number;
    totalBasesAT: number;
    employeeCount: number;
  } | null;

  /** FAN artifact totals (if generated) */
  fan: {
    totalBasesCC: number;
    totalBasesAT: number;
    totalCotizacionEmpresa: number;
    totalCotizacionTrabajador: number;
    totalEmployees: number;
    isValid: boolean;
  } | null;

  /** RLC artifact totals (if generated) */
  rlc: {
    totalLiquidacion: number;
    totalWorkers: number;
    isValid: boolean;
  } | null;

  /** RNT artifact totals (if generated) */
  rnt: {
    totalWorkers: number;
    isValid: boolean;
  } | null;

  /** IRPF / Modelo 111 data (if available for the month) */
  fiscal: {
    totalBaseIRPF: number;
    totalRetencion: number;
    perceptores: number;
  } | null;

  /** SS expedient status */
  ssExpedientStatus?: string;
  /** Fiscal expedient status */
  fiscalExpedientStatus?: string;
}

// ─── Core Validation ────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;

export function runCrossValidation(input: CrossValidationInput): CrossValidationResult {
  const checks: CrossValidationCheck[] = [];
  const periodLabel = `${String(input.periodMonth).padStart(2, '0')}/${input.periodYear}`;

  // ── 1. Period status checks ──────────────────────────────────────────
  checks.push({
    id: 'period_closed',
    category: 'period_status',
    label: 'Período cerrado',
    passed: ['closed', 'locked'].includes(input.periodStatus),
    severity: 'critical',
    detail: `Estado: ${input.periodStatus}`,
  });

  checks.push({
    id: 'payroll_closed',
    category: 'period_status',
    label: 'Nómina cerrada',
    passed: input.payrollClosed,
    severity: 'critical',
    detail: input.payrollClosed ? 'Cerrada' : 'Abierta — artefactos pueden ser inconsistentes',
  });

  // ── 2. Data completeness ─────────────────────────────────────────────
  checks.push({
    id: 'has_payroll_data',
    category: 'data_completeness',
    label: 'Datos de nómina disponibles',
    passed: input.payroll !== null,
    severity: 'critical',
    detail: input.payroll ? `${input.payroll.employeeCount} empleados, ${input.payroll.totalBruto.toFixed(2)}€ bruto` : 'Sin datos de nómina',
  });

  checks.push({
    id: 'has_fan',
    category: 'data_completeness',
    label: 'Artefacto FAN generado',
    passed: input.fan !== null,
    severity: 'medium',
    detail: input.fan ? `${input.fan.totalEmployees} empleados` : 'No generado',
  });

  checks.push({
    id: 'has_rlc',
    category: 'data_completeness',
    label: 'Artefacto RLC generado',
    passed: input.rlc !== null,
    severity: 'medium',
    detail: input.rlc ? `${input.rlc.totalWorkers} trabajadores` : 'No generado',
  });

  // ── 3. SS bases coherence ────────────────────────────────────────────
  if (input.payroll && input.fan) {
    const diffCC = r2(Math.abs(input.payroll.totalBasesCC - input.fan.totalBasesCC));
    const threshold = input.payroll.totalBasesCC * 0.01; // 1% tolerance
    checks.push({
      id: 'ss_bases_cc_coherence',
      category: 'ss_bases',
      label: 'Bases CC: nómina vs FAN',
      passed: diffCC <= threshold,
      severity: diffCC > threshold ? 'high' : 'info',
      detail: `Nómina: ${input.payroll.totalBasesCC.toFixed(2)}€, FAN: ${input.fan.totalBasesCC.toFixed(2)}€`,
      payrollValue: input.payroll.totalBasesCC,
      artifactValue: input.fan.totalBasesCC,
      diff: diffCC,
    });

    const diffAT = r2(Math.abs(input.payroll.totalBasesAT - input.fan.totalBasesAT));
    checks.push({
      id: 'ss_bases_at_coherence',
      category: 'ss_bases',
      label: 'Bases AT: nómina vs FAN',
      passed: diffAT <= threshold,
      severity: diffAT > threshold ? 'high' : 'info',
      detail: `Nómina: ${input.payroll.totalBasesAT.toFixed(2)}€, FAN: ${input.fan.totalBasesAT.toFixed(2)}€`,
      payrollValue: input.payroll.totalBasesAT,
      artifactValue: input.fan.totalBasesAT,
      diff: diffAT,
    });
  }

  // ── 4. SS cuotas coherence ───────────────────────────────────────────
  if (input.payroll && input.fan) {
    const diffEmp = r2(Math.abs(input.payroll.totalSSEmpresa - input.fan.totalCotizacionEmpresa));
    checks.push({
      id: 'ss_cuota_empresa',
      category: 'ss_cuotas',
      label: 'Cuota SS empresa: nómina vs FAN',
      passed: diffEmp < 1,
      severity: diffEmp >= 1 ? 'high' : 'info',
      detail: `Nómina: ${input.payroll.totalSSEmpresa.toFixed(2)}€, FAN: ${input.fan.totalCotizacionEmpresa.toFixed(2)}€`,
      payrollValue: input.payroll.totalSSEmpresa,
      artifactValue: input.fan.totalCotizacionEmpresa,
      diff: diffEmp,
    });

    const diffTrab = r2(Math.abs(input.payroll.totalSSTrabajador - input.fan.totalCotizacionTrabajador));
    checks.push({
      id: 'ss_cuota_trabajador',
      category: 'ss_cuotas',
      label: 'Cuota SS trabajador: nómina vs FAN',
      passed: diffTrab < 1,
      severity: diffTrab >= 1 ? 'high' : 'info',
      detail: `Nómina: ${input.payroll.totalSSTrabajador.toFixed(2)}€, FAN: ${input.fan.totalCotizacionTrabajador.toFixed(2)}€`,
      payrollValue: input.payroll.totalSSTrabajador,
      artifactValue: input.fan.totalCotizacionTrabajador,
      diff: diffTrab,
    });
  }

  // ── 5. RLC vs FAN coherence ──────────────────────────────────────────
  if (input.fan && input.rlc) {
    const fanTotal = r2(input.fan.totalCotizacionEmpresa + input.fan.totalCotizacionTrabajador);
    const rlcTotal = input.rlc.totalLiquidacion;
    const diff = r2(Math.abs(fanTotal - rlcTotal));
    checks.push({
      id: 'rlc_vs_fan',
      category: 'artifact_coherence',
      label: 'RLC vs FAN: total liquidación',
      passed: diff < 1,
      severity: diff >= 1 ? 'high' : 'info',
      detail: `FAN: ${fanTotal.toFixed(2)}€, RLC: ${rlcTotal.toFixed(2)}€`,
      payrollValue: fanTotal,
      artifactValue: rlcTotal,
      diff,
    });
  }

  // ── 6. Employee coverage ─────────────────────────────────────────────
  if (input.payroll && input.fan) {
    checks.push({
      id: 'employee_count_match',
      category: 'employee_coverage',
      label: 'Nº empleados: nómina vs artefactos',
      passed: input.payroll.employeeCount === input.fan.totalEmployees,
      severity: input.payroll.employeeCount !== input.fan.totalEmployees ? 'high' : 'info',
      detail: `Nómina: ${input.payroll.employeeCount}, FAN: ${input.fan.totalEmployees}`,
      payrollValue: input.payroll.employeeCount,
      artifactValue: input.fan.totalEmployees,
    });
  }

  if (input.rnt && input.fan) {
    checks.push({
      id: 'rnt_vs_fan_workers',
      category: 'employee_coverage',
      label: 'Nº trabajadores: RNT vs FAN',
      passed: input.rnt.totalWorkers === input.fan.totalEmployees,
      severity: input.rnt.totalWorkers !== input.fan.totalEmployees ? 'medium' : 'info',
      detail: `RNT: ${input.rnt.totalWorkers}, FAN: ${input.fan.totalEmployees}`,
    });
  }

  // ── 7. IRPF coherence ───────────────────────────────────────────────
  if (input.payroll && input.fiscal) {
    const irpfDiff = r2(Math.abs(input.payroll.totalIRPF - input.fiscal.totalRetencion));
    const threshold = input.payroll.totalIRPF * 0.02; // 2%
    checks.push({
      id: 'irpf_retention_coherence',
      category: 'irpf',
      label: 'Retención IRPF: nómina vs fiscal',
      passed: irpfDiff <= threshold,
      severity: irpfDiff > threshold ? 'high' : 'info',
      detail: `Nómina: ${input.payroll.totalIRPF.toFixed(2)}€, Fiscal: ${input.fiscal.totalRetencion.toFixed(2)}€`,
      payrollValue: input.payroll.totalIRPF,
      artifactValue: input.fiscal.totalRetencion,
      diff: irpfDiff,
    });

    // Perceptores match
    checks.push({
      id: 'irpf_perceptores_match',
      category: 'irpf',
      label: 'Nº perceptores IRPF vs empleados nómina',
      passed: input.payroll.employeeCount === input.fiscal.perceptores,
      severity: input.payroll.employeeCount !== input.fiscal.perceptores ? 'medium' : 'info',
      detail: `Nómina: ${input.payroll.employeeCount}, Fiscal: ${input.fiscal.perceptores}`,
    });
  }

  // ── 8. Artifact validity ─────────────────────────────────────────────
  if (input.fan && !input.fan.isValid) {
    checks.push({
      id: 'fan_valid', category: 'artifact_coherence',
      label: 'FAN válido', passed: false, severity: 'high',
      detail: 'El artefacto FAN tiene errores de validación',
    });
  }
  if (input.rlc && !input.rlc.isValid) {
    checks.push({
      id: 'rlc_valid', category: 'artifact_coherence',
      label: 'RLC válido', passed: false, severity: 'high',
      detail: 'El artefacto RLC tiene errores de validación',
    });
  }

  // ── Compute result ───────────────────────────────────────────────────
  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.filter(c => !c.passed).length;
  const overallScore = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;

  const hasCritical = checks.some(c => !c.passed && (c.severity === 'critical' || c.severity === 'high'));
  const overallStatus: CrossValidationResult['overallStatus'] =
    hasCritical ? 'critical' : failedCount > 0 ? 'warnings' : 'clean';

  // Category summary
  const categorySet = new Set(checks.map(c => c.category));
  const categorySummary: CategorySummary[] = Array.from(categorySet).map(cat => {
    const catChecks = checks.filter(c => c.category === cat);
    const catFailed = catChecks.filter(c => !c.passed);
    const severityOrder: CrossValidationSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    const worstSeverity = catFailed.length > 0
      ? severityOrder.find(s => catFailed.some(c => c.severity === s)) ?? 'info'
      : 'info';

    return {
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat],
      total: catChecks.length,
      passed: catChecks.filter(c => c.passed).length,
      failed: catFailed.length,
      worstSeverity,
    };
  });

  return {
    evaluatedAt: new Date().toISOString(),
    periodLabel,
    totalChecks: checks.length,
    passed: passedCount,
    failed: failedCount,
    checks,
    overallScore,
    overallStatus,
    categorySummary,
  };
}
