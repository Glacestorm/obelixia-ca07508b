/**
 * cotizacionReconciliationEngine — Pure cost reconciliation validator
 * V2-RRHH-P1.4: Pre-confirmation gate for SILTRA/cotización
 *
 * Validates consistency between payroll totals, FAN, RLC, RNT, and CRA.
 * NO Supabase, NO React — pure functions only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReconciliationTotals {
  /** From payroll run */
  payroll?: {
    ssEmpresa: number;
    ssTrabajador: number;
    totalBruto: number;
    workerCount: number;
  };
  /** From FAN artifact */
  fan?: {
    totalBasesCC: number;
    totalBasesAT: number;
    totalCuotaEmpresa: number;
    totalCuotaTrabajador: number;
    workerCount: number;
  };
  /** From RLC artifact */
  rlc?: {
    totalLiquidacion: number;
    totalIngreso: number;
    totalCuotaEmpresa: number;
    totalCuotaTrabajador: number;
    workerCount: number;
  };
  /** From RNT artifact */
  rnt?: {
    totalWorkers: number;
    totalBasesCC: number;
    totalBasesAT: number;
  };
  /** From CRA artifact */
  cra?: {
    totalEmpresa: number;
    totalTrabajador: number;
    totalGeneral: number;
    workerCount: number;
  };
}

export interface ReconciliationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  expected: string;
  actual: string;
  diff: number | null;
}

export interface CotizacionReconciliationResult {
  checks: ReconciliationCheck[];
  passedCount: number;
  totalCount: number;
  score: number;
  canConfirm: boolean;
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;
const TOLERANCE = 1; // €1 tolerance for rounding

function checkClose(id: string, label: string, expected: number, actual: number, severity: 'error' | 'warning' = 'error'): ReconciliationCheck {
  const diff = r2(Math.abs(expected - actual));
  return {
    id,
    label,
    passed: diff <= TOLERANCE,
    severity,
    expected: `${expected.toFixed(2)}€`,
    actual: `${actual.toFixed(2)}€`,
    diff,
  };
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export function reconcileCotizacion(totals: ReconciliationTotals): CotizacionReconciliationResult {
  const checks: ReconciliationCheck[] = [];

  // 1. Payroll vs FAN
  if (totals.payroll && totals.fan) {
    checks.push(checkClose('payroll_fan_empresa', 'Payroll SS Empresa vs FAN Cuota Empresa', totals.payroll.ssEmpresa, totals.fan.totalCuotaEmpresa));
    checks.push(checkClose('payroll_fan_trabajador', 'Payroll SS Trabajador vs FAN Cuota Trabajador', totals.payroll.ssTrabajador, totals.fan.totalCuotaTrabajador));
    checks.push({
      id: 'payroll_fan_workers', label: 'Trabajadores Payroll vs FAN',
      passed: totals.payroll.workerCount === totals.fan.workerCount,
      severity: 'error',
      expected: `${totals.payroll.workerCount}`,
      actual: `${totals.fan.workerCount}`,
      diff: Math.abs(totals.payroll.workerCount - totals.fan.workerCount),
    });
  }

  // 2. FAN vs RLC
  if (totals.fan && totals.rlc) {
    checks.push(checkClose('fan_rlc_empresa', 'FAN Cuota Empresa vs RLC Cuota Empresa', totals.fan.totalCuotaEmpresa, totals.rlc.totalCuotaEmpresa));
    checks.push(checkClose('fan_rlc_trabajador', 'FAN Cuota Trabajador vs RLC Cuota Trabajador', totals.fan.totalCuotaTrabajador, totals.rlc.totalCuotaTrabajador));
    const fanTotal = r2(totals.fan.totalCuotaEmpresa + totals.fan.totalCuotaTrabajador);
    checks.push(checkClose('fan_rlc_total', 'FAN Total vs RLC Liquidación', fanTotal, totals.rlc.totalLiquidacion));
  }

  // 3. RLC vs CRA
  if (totals.rlc && totals.cra) {
    const rlcTotal = r2(totals.rlc.totalCuotaEmpresa + totals.rlc.totalCuotaTrabajador);
    checks.push(checkClose('rlc_cra_total', 'RLC Total vs CRA Total General', rlcTotal, totals.cra.totalGeneral, 'warning'));
    checks.push(checkClose('rlc_cra_empresa', 'RLC Empresa vs CRA Empresa', totals.rlc.totalCuotaEmpresa, totals.cra.totalEmpresa, 'warning'));
  }

  // 4. RNT vs FAN bases
  if (totals.rnt && totals.fan) {
    checks.push(checkClose('rnt_fan_basesCC', 'RNT Bases CC vs FAN Bases CC', totals.rnt.totalBasesCC, totals.fan.totalBasesCC));
    checks.push(checkClose('rnt_fan_basesAT', 'RNT Bases AT vs FAN Bases AT', totals.rnt.totalBasesAT, totals.fan.totalBasesAT));
  }

  // 5. Worker count consistency
  if (totals.rnt && totals.rlc) {
    checks.push({
      id: 'rnt_rlc_workers', label: 'Trabajadores RNT vs RLC',
      passed: totals.rnt.totalWorkers === totals.rlc.workerCount,
      severity: 'warning',
      expected: `${totals.rnt.totalWorkers}`,
      actual: `${totals.rlc.workerCount}`,
      diff: Math.abs(totals.rnt.totalWorkers - totals.rlc.workerCount),
    });
  }

  // Availability checks
  if (!totals.fan) {
    checks.push({ id: 'fan_missing', label: 'FAN disponible', passed: false, severity: 'info', expected: 'Sí', actual: 'No generado', diff: null });
  }
  if (!totals.rlc) {
    checks.push({ id: 'rlc_missing', label: 'RLC disponible', passed: false, severity: 'info', expected: 'Sí', actual: 'No generado', diff: null });
  }
  if (!totals.rnt) {
    checks.push({ id: 'rnt_missing', label: 'RNT disponible', passed: false, severity: 'info', expected: 'Sí', actual: 'No generado', diff: null });
  }
  if (!totals.cra) {
    checks.push({ id: 'cra_missing', label: 'CRA disponible', passed: false, severity: 'info', expected: 'Sí', actual: 'No generado', diff: null });
  }

  const passedCount = checks.filter(c => c.passed).length;
  const totalCount = checks.length;
  const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const errors = checks.filter(c => c.severity === 'error' && !c.passed);
  const canConfirm = errors.length === 0 && totalCount > 0;

  return {
    checks,
    passedCount,
    totalCount,
    score,
    canConfirm,
    timestamp: new Date().toISOString(),
  };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export function getReconciliationScoreColor(score: number): string {
  if (score >= 90) return 'text-green-700 bg-green-500/10';
  if (score >= 70) return 'text-amber-700 bg-amber-500/10';
  return 'text-red-700 bg-red-500/10';
}
