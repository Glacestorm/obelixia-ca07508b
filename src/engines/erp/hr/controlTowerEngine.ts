/**
 * controlTowerEngine.ts — V2-RRHH-FASE-6
 * Pure engine for Control Tower: alert taxonomy, health scoring,
 * signal aggregation, deduplication, and company prioritization.
 *
 * Zero side-effects, zero fetch — deterministic functions only.
 * Consumes data shapes from existing hooks (advisory, closing, readiness, tasks).
 */

import type { PortfolioCompany } from '@/hooks/erp/hr/useAdvisoryPortfolio';

// ─── Alert Taxonomy ─────────────────────────────────────────────────────────

export type AlertCategory =
  | 'closing'        // Monthly closing risks
  | 'readiness'      // Official readiness gaps
  | 'documental'     // Document expiration / compliance
  | 'tasks_sla'      // Overdue tasks / SLA breaches
  | 'consistency'    // Operational inconsistencies
  | 'traceability';  // Missing evidence / audit gaps

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface ControlTowerAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  companyId: string;
  companyName: string;
  process: string;
  origin: string;
  title: string;
  explanation: string;
  suggestedAction: string;
  hasEvidence: boolean;
}

// ─── Health Score ────────────────────────────────────────────────────────────

export interface CompanyHealthScore {
  companyId: string;
  companyName: string;
  score: number; // 0-100, higher = healthier
  severity: AlertSeverity;
  reasons: string[];
  topBlockers: string[];
  topActions: string[];
  alerts: ControlTowerAlert[];
  stats: PortfolioCompany['stats'];
}

export interface ControlTowerSummary {
  totalCompanies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  healthyCount: number;
  totalAlerts: number;
  totalOverdueTasks: number;
  totalOpenClosings: number;
  evaluatedAt: string;
}

// ─── Scoring Logic ──────────────────────────────────────────────────────────

/**
 * Compute health score for a single company.
 * Score starts at 100 and deducts points for each risk signal.
 * Explainable: every deduction is tracked as a reason.
 */
export function computeCompanyHealth(company: PortfolioCompany): CompanyHealthScore {
  let score = 100;
  const reasons: string[] = [];
  const blockers: string[] = [];
  const actions: string[] = [];
  const alerts: ControlTowerAlert[] = [];

  const { stats } = company;
  const makeAlertId = (cat: string, sub: string) => `${company.id}:${cat}:${sub}`;

  // ── 1. Closing status signals ──
  if (stats.closingStatus === 'open' && stats.openClosingPeriods > 0) {
    score -= 20;
    reasons.push(`${stats.openClosingPeriods} período(s) de cierre abierto(s)`);
    blockers.push('Cierre mensual sin iniciar');
    actions.push('Revisar y avanzar cierre mensual');
    alerts.push({
      id: makeAlertId('closing', 'open'),
      category: 'closing',
      severity: stats.openClosingPeriods > 1 ? 'critical' : 'high',
      companyId: company.id,
      companyName: company.name,
      process: 'Cierre mensual',
      origin: 'advisory_portfolio',
      title: `${stats.openClosingPeriods} cierre(s) abierto(s)`,
      explanation: `La empresa tiene ${stats.openClosingPeriods} período(s) de nómina pendiente(s) de cerrar.`,
      suggestedAction: 'Acceder al módulo de cierre mensual y completar las fases pendientes.',
      hasEvidence: false,
    });
  } else if (stats.closingStatus === 'closing') {
    score -= 10;
    reasons.push('Cierre mensual en progreso');
    actions.push('Completar cierre mensual en curso');
    alerts.push({
      id: makeAlertId('closing', 'in_progress'),
      category: 'closing',
      severity: 'medium',
      companyId: company.id,
      companyName: company.name,
      process: 'Cierre mensual',
      origin: 'advisory_portfolio',
      title: 'Cierre en progreso',
      explanation: 'El cierre mensual está en curso pero no se ha completado.',
      suggestedAction: 'Verificar checklist de cierre y completar fases pendientes.',
      hasEvidence: false,
    });
  } else if (stats.closingStatus === 'no_periods') {
    score -= 15;
    reasons.push('Sin períodos de nómina configurados');
    blockers.push('No hay períodos de nómina');
    actions.push('Configurar períodos de nómina para la empresa');
    alerts.push({
      id: makeAlertId('closing', 'no_periods'),
      category: 'consistency',
      severity: 'high',
      companyId: company.id,
      companyName: company.name,
      process: 'Configuración',
      origin: 'advisory_portfolio',
      title: 'Sin períodos de nómina',
      explanation: 'La empresa no tiene períodos de nómina configurados. No se puede operar el cierre mensual.',
      suggestedAction: 'Crear el primer período de nómina desde el módulo de payroll.',
      hasEvidence: false,
    });
  }

  // ── 2. Task / SLA signals ──
  if (stats.overdueTasks > 0) {
    const deduction = Math.min(stats.overdueTasks * 10, 30);
    score -= deduction;
    reasons.push(`${stats.overdueTasks} tarea(s) con SLA vencido`);
    blockers.push(`${stats.overdueTasks} SLA(s) incumplido(s)`);
    actions.push('Resolver tareas con SLA vencido prioritariamente');
    alerts.push({
      id: makeAlertId('tasks_sla', 'overdue'),
      category: 'tasks_sla',
      severity: stats.overdueTasks >= 3 ? 'critical' : 'high',
      companyId: company.id,
      companyName: company.name,
      process: 'Gestión de tareas',
      origin: 'advisory_portfolio',
      title: `${stats.overdueTasks} SLA(s) vencido(s)`,
      explanation: `Hay ${stats.overdueTasks} tarea(s) cuyo plazo de servicio ha sido superado.`,
      suggestedAction: 'Revisar tareas pendientes y priorizar las que tienen SLA vencido.',
      hasEvidence: false,
    });
  }

  if (stats.pendingTasks > 5) {
    score -= 5;
    reasons.push(`${stats.pendingTasks} tareas pendientes (carga alta)`);
    alerts.push({
      id: makeAlertId('tasks_sla', 'high_load'),
      category: 'tasks_sla',
      severity: 'medium',
      companyId: company.id,
      companyName: company.name,
      process: 'Gestión de tareas',
      origin: 'advisory_portfolio',
      title: `${stats.pendingTasks} tareas pendientes`,
      explanation: `La carga de tareas pendientes es elevada (${stats.pendingTasks}).`,
      suggestedAction: 'Revisar prioridades y redistribuir carga si es necesario.',
      hasEvidence: false,
    });
  }

  // ── 3. Employee count signals ──
  if (stats.activeEmployees === 0) {
    score -= 10;
    reasons.push('Sin empleados activos registrados');
    alerts.push({
      id: makeAlertId('consistency', 'no_employees'),
      category: 'consistency',
      severity: 'medium',
      companyId: company.id,
      companyName: company.name,
      process: 'People',
      origin: 'advisory_portfolio',
      title: 'Sin empleados activos',
      explanation: 'La empresa no tiene empleados activos en el sistema.',
      suggestedAction: 'Verificar si la empresa está operativa o dar de alta empleados.',
      hasEvidence: false,
    });
  }

  // ── Clamp score ──
  score = Math.max(0, Math.min(100, score));

  // ── Derive severity ──
  const severity = scoreToseverity(score);

  return {
    companyId: company.id,
    companyName: company.name,
    score,
    severity,
    reasons,
    topBlockers: blockers.slice(0, 3),
    topActions: actions.slice(0, 3),
    alerts,
    stats: company.stats,
  };
}

function scoreToseverity(score: number): AlertSeverity {
  if (score <= 40) return 'critical';
  if (score <= 60) return 'high';
  if (score <= 80) return 'medium';
  return 'info';
}

// ─── Aggregation ────────────────────────────────────────────────────────────

/**
 * Build the full Control Tower state from a list of portfolio companies.
 * Returns scored + sorted companies and global summary.
 */
export function buildControlTowerState(companies: PortfolioCompany[]): {
  scoredCompanies: CompanyHealthScore[];
  summary: ControlTowerSummary;
} {
  const scored = companies.map(computeCompanyHealth);

  // Sort by score ascending (worst first)
  scored.sort((a, b) => a.score - b.score);

  const summary: ControlTowerSummary = {
    totalCompanies: scored.length,
    criticalCount: scored.filter(c => c.severity === 'critical').length,
    highCount: scored.filter(c => c.severity === 'high').length,
    mediumCount: scored.filter(c => c.severity === 'medium').length,
    healthyCount: scored.filter(c => c.severity === 'info').length,
    totalAlerts: scored.reduce((sum, c) => sum + c.alerts.length, 0),
    totalOverdueTasks: scored.reduce((sum, c) => sum + c.stats.overdueTasks, 0),
    totalOpenClosings: scored.reduce((sum, c) => sum + c.stats.openClosingPeriods, 0),
    evaluatedAt: new Date().toISOString(),
  };

  return { scoredCompanies: scored, summary };
}

// ─── Severity utils ─────────────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<AlertSeverity, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  order: number;
}> = {
  critical: { label: 'Crítico', color: 'text-destructive', bgColor: 'bg-destructive/10', dotColor: 'bg-destructive', order: 0 },
  high: { label: 'Alto', color: 'text-orange-700', bgColor: 'bg-orange-500/10', dotColor: 'bg-orange-500', order: 1 },
  medium: { label: 'Medio', color: 'text-amber-700', bgColor: 'bg-amber-500/10', dotColor: 'bg-amber-500', order: 2 },
  info: { label: 'Normal', color: 'text-emerald-700', bgColor: 'bg-emerald-500/10', dotColor: 'bg-emerald-500', order: 3 },
};

export const CATEGORY_LABELS: Record<AlertCategory, string> = {
  closing: 'Cierre mensual',
  readiness: 'Readiness oficial',
  documental: 'Documental / Compliance',
  tasks_sla: 'Tareas / SLA',
  consistency: 'Consistencia operativa',
  traceability: 'Trazabilidad',
};
