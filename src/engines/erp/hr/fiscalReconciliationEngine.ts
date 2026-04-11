/**
 * fiscalReconciliationEngine — Quarterly & annual fiscal cross-checks
 * P1.5R: Validates coherence between payroll, Modelo 111, and Modelo 190
 *
 * NO Supabase, NO React — pure functions only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PayrollPeriodFiscalData {
  periodYear: number;
  periodMonth: number;
  perceptoresCount: number;
  perceptorIds?: string[];
  baseIRPF: number;
  retencionIRPF: number;
  brutoPeriodo: number;
}

export interface Modelo111FiscalData {
  trimester: number;
  periodicity: 'trimestral' | 'mensual';
  totalPerceptores: number;
  totalPercepciones: number;
  totalRetenciones: number;
  artifactStatus: string;
}

export interface Modelo190FiscalData {
  fiscalYear: number;
  totalPerceptores: number;
  totalPercepciones: number;
  totalRetenciones: number;
  perceptorLines: Array<{
    employeeId?: string;
    nif: string;
    percepciones: number;
    retenciones: number;
    clavePercepcion: string;
  }>;
}

export interface ReconciliationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  expected: number;
  actual: number;
  difference: number;
  detail: string;
}

export interface FiscalReconciliationResult {
  checkType: 'quarterly_111' | 'annual_190' | 'per_employee';
  periodLabel: string;
  checks: ReconciliationCheck[];
  passedCount: number;
  failedCount: number;
  reconciliationScore: number;
  isReconciled: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;
const TOLERANCE = 1; // €1 tolerance

// ─── Quarterly 111 vs Payroll ────────────────────────────────────────────────

export function reconcileQuarterly111(
  payrollMonths: PayrollPeriodFiscalData[],
  modelo111: Modelo111FiscalData,
  trimester: number,
  fiscalYear: number,
): FiscalReconciliationResult {
  const checks: ReconciliationCheck[] = [];
  const periodLabel = `${trimester}T/${fiscalYear}`;

  // Sum payroll months
  const payrollBase = r2(payrollMonths.reduce((s, m) => s + m.baseIRPF, 0));
  const payrollRetenciones = r2(payrollMonths.reduce((s, m) => s + m.retencionIRPF, 0));

  // Unique perceptors from payroll
  const allIds = new Set<string>();
  let hasIds = false;
  for (const m of payrollMonths) {
    if (m.perceptorIds?.length) {
      hasIds = true;
      m.perceptorIds.forEach(id => allIds.add(id));
    }
  }
  const payrollPerceptores = hasIds ? allIds.size : Math.max(...payrollMonths.map(m => m.perceptoresCount), 0);

  // Check 1: Base IRPF
  const baseDiff = r2(Math.abs(payrollBase - modelo111.totalPercepciones));
  checks.push({
    id: 'base_irpf_match', label: 'Base IRPF: Nómina vs Mod.111',
    passed: baseDiff <= TOLERANCE,
    severity: baseDiff > TOLERANCE ? 'error' : 'info',
    expected: payrollBase, actual: modelo111.totalPercepciones, difference: baseDiff,
    detail: `Nómina: ${payrollBase.toFixed(2)}€, Mod.111: ${modelo111.totalPercepciones.toFixed(2)}€`,
  });

  // Check 2: Retenciones
  const retDiff = r2(Math.abs(payrollRetenciones - modelo111.totalRetenciones));
  checks.push({
    id: 'retenciones_match', label: 'Retenciones: Nómina vs Mod.111',
    passed: retDiff <= TOLERANCE,
    severity: retDiff > TOLERANCE ? 'error' : 'info',
    expected: payrollRetenciones, actual: modelo111.totalRetenciones, difference: retDiff,
    detail: `Nómina: ${payrollRetenciones.toFixed(2)}€, Mod.111: ${modelo111.totalRetenciones.toFixed(2)}€`,
  });

  // Check 3: Perceptores
  const percDiff = Math.abs(payrollPerceptores - modelo111.totalPerceptores);
  checks.push({
    id: 'perceptores_match', label: 'Perceptores: Nómina vs Mod.111',
    passed: percDiff === 0,
    severity: percDiff > 0 ? 'warning' : 'info',
    expected: payrollPerceptores, actual: modelo111.totalPerceptores, difference: percDiff,
    detail: `Nómina: ${payrollPerceptores}, Mod.111: ${modelo111.totalPerceptores}`,
  });

  // Check 4: Months coverage
  const expectedMonths = modelo111.periodicity === 'mensual' ? 1 : 3;
  const monthsDiff = Math.abs(payrollMonths.length - expectedMonths);
  checks.push({
    id: 'months_coverage', label: 'Meses cubiertos',
    passed: payrollMonths.length === expectedMonths,
    severity: monthsDiff > 0 ? 'warning' : 'info',
    expected: expectedMonths, actual: payrollMonths.length, difference: monthsDiff,
    detail: `Esperados: ${expectedMonths}, recibidos: ${payrollMonths.length}`,
  });

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const reconciliationScore = Math.round((passedCount / checks.length) * 100);

  return {
    checkType: 'quarterly_111',
    periodLabel,
    checks,
    passedCount,
    failedCount,
    reconciliationScore,
    isReconciled: failedCount === 0,
  };
}

// ─── Annual 190 vs Σ111 vs Payroll ───────────────────────────────────────────

export function reconcileAnnual190(
  modelo190: Modelo190FiscalData,
  quarterly111s: Modelo111FiscalData[],
  annualPayroll: PayrollPeriodFiscalData[],
): FiscalReconciliationResult {
  const checks: ReconciliationCheck[] = [];
  const periodLabel = `Ejercicio ${modelo190.fiscalYear}`;

  // Sum all 111s
  const total111Percepciones = r2(quarterly111s.reduce((s, q) => s + q.totalPercepciones, 0));
  const total111Retenciones = r2(quarterly111s.reduce((s, q) => s + q.totalRetenciones, 0));

  // Sum annual payroll
  const totalPayrollBase = r2(annualPayroll.reduce((s, m) => s + m.baseIRPF, 0));
  const totalPayrollRetenciones = r2(annualPayroll.reduce((s, m) => s + m.retencionIRPF, 0));

  // Check 1: 190 retenciones vs Σ111 retenciones
  const diff190vs111 = r2(Math.abs(modelo190.totalRetenciones - total111Retenciones));
  checks.push({
    id: '190_vs_111_retenciones', label: 'Retenciones: Mod.190 vs Σ Mod.111',
    passed: diff190vs111 <= TOLERANCE,
    severity: diff190vs111 > TOLERANCE ? 'error' : 'info',
    expected: total111Retenciones, actual: modelo190.totalRetenciones, difference: diff190vs111,
    detail: `Σ111: ${total111Retenciones.toFixed(2)}€, 190: ${modelo190.totalRetenciones.toFixed(2)}€`,
  });

  // Check 2: 190 percepciones vs Σ111 percepciones
  const diffPerc = r2(Math.abs(modelo190.totalPercepciones - total111Percepciones));
  checks.push({
    id: '190_vs_111_percepciones', label: 'Percepciones: Mod.190 vs Σ Mod.111',
    passed: diffPerc <= TOLERANCE,
    severity: diffPerc > TOLERANCE ? 'error' : 'info',
    expected: total111Percepciones, actual: modelo190.totalPercepciones, difference: diffPerc,
    detail: `Σ111: ${total111Percepciones.toFixed(2)}€, 190: ${modelo190.totalPercepciones.toFixed(2)}€`,
  });

  // Check 3: 190 vs payroll retenciones
  const diff190vsPayroll = r2(Math.abs(modelo190.totalRetenciones - totalPayrollRetenciones));
  checks.push({
    id: '190_vs_payroll_retenciones', label: 'Retenciones: Mod.190 vs Nómina anual',
    passed: diff190vsPayroll <= TOLERANCE,
    severity: diff190vsPayroll > TOLERANCE ? 'error' : 'info',
    expected: totalPayrollRetenciones, actual: modelo190.totalRetenciones, difference: diff190vsPayroll,
    detail: `Nómina: ${totalPayrollRetenciones.toFixed(2)}€, 190: ${modelo190.totalRetenciones.toFixed(2)}€`,
  });

  // Check 4: Number of 111s
  const expected111Count = 4; // or 12 for mensual — simplified
  const has111Count = quarterly111s.length;
  checks.push({
    id: '111_count', label: 'Declaraciones 111 presentadas',
    passed: has111Count >= expected111Count,
    severity: has111Count < expected111Count ? 'warning' : 'info',
    expected: expected111Count, actual: has111Count, difference: Math.abs(expected111Count - has111Count),
    detail: `Esperadas: ${expected111Count}, disponibles: ${has111Count}`,
  });

  // Check 5: Clave percepción assigned
  const withoutClave = modelo190.perceptorLines.filter(l => !l.clavePercepcion);
  checks.push({
    id: 'clave_percepcion', label: 'Clave percepción asignada a todos los perceptores',
    passed: withoutClave.length === 0,
    severity: withoutClave.length > 0 ? 'error' : 'info',
    expected: 0, actual: withoutClave.length, difference: withoutClave.length,
    detail: withoutClave.length > 0 ? `${withoutClave.length} sin clave` : 'OK',
  });

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const reconciliationScore = Math.round((passedCount / checks.length) * 100);

  return {
    checkType: 'annual_190',
    periodLabel,
    checks,
    passedCount,
    failedCount,
    reconciliationScore,
    isReconciled: failedCount === 0,
  };
}

// ─── Per-employee reconciliation ─────────────────────────────────────────────

export function reconcilePerEmployee(
  employeePayroll: PayrollPeriodFiscalData[],
  perceptorLine: Modelo190FiscalData['perceptorLines'][0],
  employeeLabel: string,
): FiscalReconciliationResult {
  const checks: ReconciliationCheck[] = [];

  const payrollPerc = r2(employeePayroll.reduce((s, m) => s + m.baseIRPF, 0));
  const payrollRet = r2(employeePayroll.reduce((s, m) => s + m.retencionIRPF, 0));

  const percDiff = r2(Math.abs(payrollPerc - perceptorLine.percepciones));
  checks.push({
    id: 'employee_percepciones', label: 'Percepciones: Nómina vs Mod.190',
    passed: percDiff <= TOLERANCE,
    severity: percDiff > TOLERANCE ? 'error' : 'info',
    expected: payrollPerc, actual: perceptorLine.percepciones, difference: percDiff,
    detail: `Nómina: ${payrollPerc.toFixed(2)}€, 190: ${perceptorLine.percepciones.toFixed(2)}€`,
  });

  const retDiff = r2(Math.abs(payrollRet - perceptorLine.retenciones));
  checks.push({
    id: 'employee_retenciones', label: 'Retenciones: Nómina vs Mod.190',
    passed: retDiff <= TOLERANCE,
    severity: retDiff > TOLERANCE ? 'error' : 'info',
    expected: payrollRet, actual: perceptorLine.retenciones, difference: retDiff,
    detail: `Nómina: ${payrollRet.toFixed(2)}€, 190: ${perceptorLine.retenciones.toFixed(2)}€`,
  });

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;

  return {
    checkType: 'per_employee',
    periodLabel: employeeLabel,
    checks,
    passedCount,
    failedCount,
    reconciliationScore: Math.round((passedCount / checks.length) * 100),
    isReconciled: failedCount === 0,
  };
}
