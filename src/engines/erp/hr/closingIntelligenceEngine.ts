/**
 * closingIntelligenceEngine.ts — V2-ES.7 Paso 7
 * Closing Intelligence Layer: pure logic for closing score, narrative,
 * discrepancy explanation, and reopen guard assessment.
 * Zero side-effects, zero fetch — deterministic functions only.
 */

import type { PeriodClosureSnapshot } from './payrollRunEngine';
import type { MonthlyKPIs, MonthlyKPIDeltas, ExpedientReadinessSummary } from './monthlyExecutiveReportEngine';

// ── Types ──

export interface ClosingConfidenceScore {
  overall: number; // 0-100
  breakdown: ClosingScoreBreakdown;
  level: 'high' | 'medium' | 'low';
  label: string;
}

export interface ClosingScoreBreakdown {
  validation_score: number;     // 0-25 — pre-close checks passed ratio
  run_integrity_score: number;  // 0-25 — snapshot hash + no errors + approved
  expedient_score: number;      // 0-25 — SS + Fiscal readiness
  data_completeness: number;    // 0-25 — payment date, employee count, totals > 0
}

export interface ClosingDiscrepancy {
  id: string;
  area: 'totals' | 'employees' | 'expedients' | 'incidents' | 'runs' | 'dates';
  severity: 'info' | 'warning' | 'error';
  title: string;
  explanation: string;
  recommendation?: string;
}

export interface ReopenGuardAssessment {
  allowed: boolean;
  risk_level: 'low' | 'medium' | 'high';
  warnings: string[];
  reopen_count: number;
  has_locked_expedients: boolean;
  has_auto_generated_expedients: boolean;
}

export interface ClosingNarrative {
  summary: string;
  details: string[];
  disclaimers: string[];
}

export interface ClosingIntelligenceReport {
  version: '1.0';
  generated_at: string;
  period_id: string;
  confidence: ClosingConfidenceScore;
  discrepancies: ClosingDiscrepancy[];
  reopen_guard: ReopenGuardAssessment;
  narrative: ClosingNarrative;
  changes_vs_previous: ChangesSummary | null;
}

export interface ChangesSummary {
  employee_delta: number;
  gross_delta: number;
  gross_pct: number;
  net_delta: number;
  net_pct: number;
  notable_changes: string[];
}

// ── Confidence Score ──

export function computeClosingConfidence(params: {
  snapshot: PeriodClosureSnapshot | null;
  expedientReadiness: ExpedientReadinessSummary;
  paymentDateSet: boolean;
  totalGross: number;
  totalNet: number;
  employeeCount: number;
}): ClosingConfidenceScore {
  const { snapshot, expedientReadiness, paymentDateSet, totalGross, totalNet, employeeCount } = params;

  // 1. Validation score (0-25)
  let validation_score = 0;
  if (snapshot) {
    const vs = snapshot.validation_summary;
    if (vs.total_checks > 0) {
      const passRatio = vs.passed / vs.total_checks;
      validation_score = Math.round(passRatio * 25);
      // Penalize hard failures
      if (vs.failed > 0) validation_score = Math.max(validation_score - 10, 0);
    }
  } else {
    validation_score = 10; // Legacy period without snapshot
  }

  // 2. Run integrity (0-25)
  let run_integrity_score = 0;
  if (snapshot) {
    if (snapshot.approved_run_id) run_integrity_score += 10;
    const approvedInHistory = snapshot.run_history.filter(r => r.status === 'approved').length;
    if (approvedInHistory >= 1) run_integrity_score += 5;
    // No excessive recalculations
    if (snapshot.recalculations_count <= 2) run_integrity_score += 5;
    // Incidents resolved
    if (snapshot.incidents_summary.pending === 0) run_integrity_score += 5;
  } else {
    run_integrity_score = totalGross > 0 ? 10 : 0;
  }

  // 3. Expedient score (0-25)
  let expedient_score = 0;
  const readinessMap: Record<string, number> = { complete: 25, partial: 15, pending: 8, none: 0 };
  expedient_score = readinessMap[expedientReadiness.overall_readiness] ?? 0;

  // 4. Data completeness (0-25)
  let data_completeness = 0;
  if (paymentDateSet) data_completeness += 7;
  if (employeeCount > 0) data_completeness += 6;
  if (totalGross > 0) data_completeness += 6;
  if (totalNet > 0) data_completeness += 6;

  const overall = validation_score + run_integrity_score + expedient_score + data_completeness;
  const level = overall >= 80 ? 'high' : overall >= 50 ? 'medium' : 'low';
  const labels: Record<string, string> = {
    high: 'Alta confianza',
    medium: 'Confianza media',
    low: 'Confianza baja',
  };

  return {
    overall,
    breakdown: { validation_score, run_integrity_score, expedient_score, data_completeness },
    level,
    label: labels[level],
  };
}

// ── Discrepancy Detection ──

export function detectDiscrepancies(params: {
  snapshot: PeriodClosureSnapshot | null;
  kpis: MonthlyKPIs;
  deltas: MonthlyKPIDeltas | null;
  expedientReadiness: ExpedientReadinessSummary;
  paymentDate: string | null;
  periodStatus: string;
}): ClosingDiscrepancy[] {
  const { snapshot, kpis, deltas, expedientReadiness, paymentDate, periodStatus } = params;
  const discrepancies: ClosingDiscrepancy[] = [];

  // 1. Missing payment date
  if (!paymentDate) {
    discrepancies.push({
      id: 'no_payment_date', area: 'dates', severity: 'warning',
      title: 'Fecha de pago no definida',
      explanation: 'El período se cerró sin fecha de pago asignada.',
      recommendation: 'Establecer fecha de pago antes de bloquear el período.',
    });
  }

  // 2. Pending incidents at close
  if (snapshot && snapshot.incidents_summary.pending > 0) {
    discrepancies.push({
      id: 'pending_incidents', area: 'incidents', severity: 'warning',
      title: `${snapshot.incidents_summary.pending} incidencia(s) pendiente(s)`,
      explanation: 'Se cerró el período con incidencias sin resolver. Los importes podrían no reflejar todas las variables.',
      recommendation: 'Revisar incidencias pendientes si se reabre el período.',
    });
  }

  // 3. Recalculations > 3
  if (snapshot && snapshot.recalculations_count > 3) {
    discrepancies.push({
      id: 'excessive_recalcs', area: 'runs', severity: 'info',
      title: `${snapshot.recalculations_count} recálculos realizados`,
      explanation: 'Se realizaron múltiples recálculos, lo que puede indicar ajustes iterativos o complejidad en el período.',
    });
  }

  // 4. Large MoM variation
  if (deltas) {
    if (Math.abs(deltas.total_gross_pct) > 15) {
      discrepancies.push({
        id: 'large_gross_variation', area: 'totals', severity: 'warning',
        title: `Variación del bruto: ${deltas.total_gross_pct > 0 ? '+' : ''}${deltas.total_gross_pct.toFixed(1)}%`,
        explanation: `El bruto total ha variado significativamente vs. mes anterior (${deltas.total_gross_delta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}).`,
        recommendation: 'Verificar que la variación corresponde a cambios reales (altas, bajas, extras, etc.).',
      });
    }
    if (Math.abs(deltas.employee_count) > 5) {
      discrepancies.push({
        id: 'large_headcount_change', area: 'employees', severity: 'info',
        title: `Variación plantilla: ${deltas.employee_count > 0 ? '+' : ''}${deltas.employee_count} empleados`,
        explanation: 'Cambio significativo en el número de empleados procesados respecto al período anterior.',
      });
    }
  }

  // 5. Expedients incomplete
  if (expedientReadiness.overall_readiness === 'none') {
    discrepancies.push({
      id: 'no_expedients', area: 'expedients', severity: 'info',
      title: 'Sin expedientes internos',
      explanation: 'No se han generado expedientes de SS ni Fiscal para este período.',
      recommendation: 'Considerar generar expedientes internos para trazabilidad completa.',
    });
  } else if (expedientReadiness.overall_readiness === 'partial') {
    discrepancies.push({
      id: 'partial_expedients', area: 'expedients', severity: 'info',
      title: 'Expedientes parcialmente completos',
      explanation: `SS: ${expedientReadiness.ss_status || 'sin generar'}, Fiscal: ${expedientReadiness.fiscal_status || 'sin generar'}.`,
    });
  }

  // 6. Zero employees
  if (kpis.employee_count === 0) {
    discrepancies.push({
      id: 'zero_employees', area: 'employees', severity: 'error',
      title: 'Sin empleados en el período',
      explanation: 'El período se cerró con 0 empleados procesados.',
    });
  }

  return discrepancies;
}

// ── Reopen Guard ──

export function assessReopenGuard(params: {
  periodStatus: string;
  metadata: Record<string, unknown>;
  expedientReadiness: ExpedientReadinessSummary;
}): ReopenGuardAssessment {
  const { periodStatus, metadata, expedientReadiness } = params;
  const meta = metadata as any;
  const warnings: string[] = [];

  const allowed = periodStatus === 'closed'; // locked = no reopen
  const reopenHistory = meta?.reopen_history || [];
  const reopenCount = reopenHistory.length;

  if (reopenCount >= 2) {
    warnings.push(`Este período ya ha sido reabierto ${reopenCount} veces. Reaperturas frecuentes reducen la fiabilidad del cierre.`);
  }

  const hasAutoGen = !!meta?.auto_generation;
  if (hasAutoGen) {
    warnings.push('Se han auto-generado expedientes tras el cierre. Reabrir podría invalidar la consolidación automática.');
  }

  const hasLockedExpedients = ['finalized_internal', 'ready_internal'].includes(expedientReadiness.ss_status || '')
    || ['finalized_internal', 'ready_internal'].includes(expedientReadiness.fiscal_status || '');

  if (hasLockedExpedients) {
    warnings.push('Existen expedientes internos en estado avanzado (finalized/ready). Reabrir podría crear inconsistencias.');
  }

  const riskLevel = warnings.length >= 3 ? 'high' : warnings.length >= 1 ? 'medium' : 'low';

  return {
    allowed,
    risk_level: riskLevel,
    warnings,
    reopen_count: reopenCount,
    has_locked_expedients: hasLockedExpedients,
    has_auto_generated_expedients: hasAutoGen,
  };
}

// ── Narrative Generation ──

export function generateClosingNarrative(params: {
  periodName: string;
  kpis: MonthlyKPIs;
  deltas: MonthlyKPIDeltas | null;
  snapshot: PeriodClosureSnapshot | null;
  expedientReadiness: ExpedientReadinessSummary;
  confidence: ClosingConfidenceScore;
  discrepancies: ClosingDiscrepancy[];
}): ClosingNarrative {
  const { periodName, kpis, deltas, snapshot, expedientReadiness, confidence, discrepancies } = params;
  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Summary
  let summary = `Período ${periodName} cerrado con ${kpis.employee_count} empleados, bruto total ${fmt(kpis.total_gross)}, neto ${fmt(kpis.total_net)}.`;
  if (deltas) {
    const dir = deltas.total_gross_pct > 0 ? 'incremento' : deltas.total_gross_pct < 0 ? 'decremento' : 'sin variación';
    summary += ` ${dir === 'sin variación' ? 'Sin variación' : dir.charAt(0).toUpperCase() + dir.slice(1)} del ${Math.abs(deltas.total_gross_pct).toFixed(1)}% en bruto vs mes anterior.`;
  }
  summary += ` Confianza del cierre: ${confidence.overall}% (${confidence.label}).`;

  // Details
  const details: string[] = [];
  if (snapshot) {
    details.push(`Run de referencia: #${snapshot.approved_run_number} (${snapshot.run_type}).`);
    if (snapshot.recalculations_count > 0) {
      details.push(`Se realizaron ${snapshot.recalculations_count} recálculo(s) antes del cierre.`);
    }
    details.push(`Incidencias: ${snapshot.incidents_summary.validated} validadas de ${snapshot.incidents_summary.total} totales.`);
  }

  const expDetails: string[] = [];
  if (expedientReadiness.ss_status) expDetails.push(`SS: ${expedientReadiness.ss_status}${expedientReadiness.ss_score !== null ? ` (${expedientReadiness.ss_score}%)` : ''}`);
  if (expedientReadiness.fiscal_status) expDetails.push(`Fiscal: ${expedientReadiness.fiscal_status}${expedientReadiness.fiscal_score !== null ? ` (${expedientReadiness.fiscal_score}%)` : ''}`);
  if (expDetails.length > 0) details.push(`Expedientes internos: ${expDetails.join(', ')}.`);

  if (discrepancies.length > 0) {
    const warnings = discrepancies.filter(d => d.severity === 'warning').length;
    const infos = discrepancies.filter(d => d.severity === 'info').length;
    details.push(`Se han detectado ${discrepancies.length} observaciones (${warnings} advertencias, ${infos} informativas).`);
  }

  // Disclaimers
  const disclaimers = [
    'Este análisis es orientativo e interno. No sustituye la revisión profesional.',
    'Los expedientes SS y Fiscal son preparatorios internos — no constituyen presentación oficial.',
  ];

  return { summary, details, disclaimers };
}

// ── Changes vs Previous ──

export function computeChangesSummary(
  kpis: MonthlyKPIs,
  deltas: MonthlyKPIDeltas | null,
): ChangesSummary | null {
  if (!deltas) return null;

  const notable: string[] = [];
  if (Math.abs(deltas.employee_count) > 0) {
    notable.push(`${deltas.employee_count > 0 ? '+' : ''}${deltas.employee_count} empleados`);
  }
  if (Math.abs(deltas.total_gross_pct) > 5) {
    notable.push(`Bruto ${deltas.total_gross_pct > 0 ? '+' : ''}${deltas.total_gross_pct.toFixed(1)}%`);
  }
  if (Math.abs(deltas.avg_gross_pct) > 3) {
    notable.push(`Bruto medio ${deltas.avg_gross_pct > 0 ? '+' : ''}${deltas.avg_gross_pct.toFixed(1)}%`);
  }

  return {
    employee_delta: deltas.employee_count,
    gross_delta: deltas.total_gross_delta,
    gross_pct: deltas.total_gross_pct,
    net_delta: deltas.total_net_delta,
    net_pct: deltas.total_net_pct,
    notable_changes: notable,
  };
}

// ── Full Report Builder ──

export function buildClosingIntelligenceReport(params: {
  periodId: string;
  periodName: string;
  periodStatus: string;
  metadata: Record<string, unknown>;
  snapshot: PeriodClosureSnapshot | null;
  kpis: MonthlyKPIs;
  deltas: MonthlyKPIDeltas | null;
  expedientReadiness: ExpedientReadinessSummary;
  paymentDate: string | null;
}): ClosingIntelligenceReport {
  const { periodId, periodName, periodStatus, metadata, snapshot, kpis, deltas, expedientReadiness, paymentDate } = params;

  const confidence = computeClosingConfidence({
    snapshot, expedientReadiness,
    paymentDateSet: !!paymentDate,
    totalGross: kpis.total_gross,
    totalNet: kpis.total_net,
    employeeCount: kpis.employee_count,
  });

  const discrepancies = detectDiscrepancies({
    snapshot, kpis, deltas, expedientReadiness, paymentDate, periodStatus,
  });

  const reopen_guard = assessReopenGuard({ periodStatus, metadata, expedientReadiness });

  const narrative = generateClosingNarrative({
    periodName, kpis, deltas, snapshot, expedientReadiness, confidence, discrepancies,
  });

  const changes_vs_previous = computeChangesSummary(kpis, deltas);

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    period_id: periodId,
    confidence,
    discrepancies,
    reopen_guard,
    narrative,
    changes_vs_previous,
  };
}
