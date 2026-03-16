/**
 * controlTowerEngine.ts — V2-RRHH-FASE-6 + 6B Enrichment
 * Pure engine for Control Tower: alert taxonomy, health scoring,
 * signal aggregation, deduplication, and company prioritization.
 *
 * Signals consumed:
 *  - Advisory portfolio stats (closing, tasks, employees)
 *  - Readiness matrix per company (blocked circuits, status gaps)
 *  - Documental/compliance alerts (erp_hr_alerts)
 *  - Traceability (evidence + version registry counts)
 *
 * Zero side-effects, zero fetch — deterministic functions only.
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

// ─── Enriched Signal Inputs (per company) ───────────────────────────────────

export interface CompanyReadinessSignals {
  blockedCircuits: number;
  dataIncompleteCircuits: number;
  notConfiguredCircuits: number;
  errorCircuits: number;
  totalCircuits: number;
  /** e.g. "TGSS Afiliación: bloqueado" */
  blockDetails: string[];
}

export interface CompanyDocumentalSignals {
  unresolvedCritical: number;
  unresolvedHigh: number;
  unresolvedMedium: number;
  /** Top alert titles for drill-down */
  topAlertTitles: string[];
}

export interface CompanyTraceabilitySignals {
  /** Evidence count for this company */
  evidenceCount: number;
  /** Version count for this company */
  versionCount: number;
  /** Whether there's at least one closing evidence */
  hasClosingEvidence: boolean;
  /** Whether there's at least one readiness evidence */
  hasReadinessEvidence: boolean;
}

export interface EnrichedCompanySignals {
  readiness?: CompanyReadinessSignals;
  documental?: CompanyDocumentalSignals;
  traceability?: CompanyTraceabilitySignals;
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
export function computeCompanyHealth(
  company: PortfolioCompany,
  enriched?: EnrichedCompanySignals,
): CompanyHealthScore {
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

  // ── 4. READINESS signals (6B enrichment) ──
  if (enriched?.readiness) {
    const r = enriched.readiness;

    if (r.blockedCircuits > 0) {
      const deduction = Math.min(r.blockedCircuits * 8, 20);
      score -= deduction;
      reasons.push(`${r.blockedCircuits} circuito(s) oficial(es) bloqueado(s)`);
      blockers.push(`Readiness: ${r.blockedCircuits} circuito(s) bloqueado(s)`);
      actions.push('Revisar certificados y configuración de circuitos bloqueados');
      alerts.push({
        id: makeAlertId('readiness', 'blocked'),
        category: 'readiness',
        severity: r.blockedCircuits >= 3 ? 'critical' : 'high',
        companyId: company.id,
        companyName: company.name,
        process: 'Readiness España',
        origin: 'readiness_matrix',
        title: `${r.blockedCircuits} circuito(s) bloqueado(s)`,
        explanation: r.blockDetails.length > 0
          ? `Circuitos afectados: ${r.blockDetails.slice(0, 3).join('; ')}`
          : `Hay ${r.blockedCircuits} circuito(s) que no pueden avanzar por bloqueos.`,
        suggestedAction: 'Acceder a Readiness España y resolver los bloqueos indicados.',
        hasEvidence: false,
      });
    }

    if (r.errorCircuits > 0) {
      score -= Math.min(r.errorCircuits * 10, 15);
      reasons.push(`${r.errorCircuits} circuito(s) con error`);
      alerts.push({
        id: makeAlertId('readiness', 'error'),
        category: 'readiness',
        severity: 'high',
        companyId: company.id,
        companyName: company.name,
        process: 'Readiness España',
        origin: 'readiness_matrix',
        title: `${r.errorCircuits} circuito(s) con error`,
        explanation: 'Existen circuitos en estado de error que requieren atención.',
        suggestedAction: 'Revisar envíos rechazados o con errores en la matriz de readiness.',
        hasEvidence: false,
      });
    }

    if (r.dataIncompleteCircuits > 0 && r.blockedCircuits === 0) {
      score -= Math.min(r.dataIncompleteCircuits * 3, 10);
      reasons.push(`${r.dataIncompleteCircuits} circuito(s) con datos incompletos`);
      alerts.push({
        id: makeAlertId('readiness', 'incomplete'),
        category: 'readiness',
        severity: 'medium',
        companyId: company.id,
        companyName: company.name,
        process: 'Readiness España',
        origin: 'readiness_matrix',
        title: `${r.dataIncompleteCircuits} circuito(s) con datos incompletos`,
        explanation: 'Algunos circuitos necesitan datos adicionales del ERP para poder generar payloads.',
        suggestedAction: 'Completar datos de empleados, contratos o cotización según corresponda.',
        hasEvidence: false,
      });
    }

    if (r.notConfiguredCircuits > 0 && r.totalCircuits > 0) {
      const unconfiguredRatio = r.notConfiguredCircuits / r.totalCircuits;
      if (unconfiguredRatio > 0.5) {
        score -= 5;
        reasons.push(`${r.notConfiguredCircuits}/${r.totalCircuits} circuitos sin configurar`);
        alerts.push({
          id: makeAlertId('readiness', 'not_configured'),
          category: 'readiness',
          severity: 'info',
          companyId: company.id,
          companyName: company.name,
          process: 'Readiness España',
          origin: 'readiness_matrix',
          title: `${r.notConfiguredCircuits} circuito(s) sin configurar`,
          explanation: 'La mayoría de circuitos oficiales no están configurados.',
          suggestedAction: 'Evaluar qué circuitos son necesarios y configurarlos.',
          hasEvidence: false,
        });
      }
    }
  }

  // ── 5. DOCUMENTAL signals (6B enrichment) ──
  if (enriched?.documental) {
    const d = enriched.documental;

    if (d.unresolvedCritical > 0) {
      score -= Math.min(d.unresolvedCritical * 10, 20);
      reasons.push(`${d.unresolvedCritical} alerta(s) documental(es) crítica(s)`);
      blockers.push(`${d.unresolvedCritical} alerta(s) documental(es) crítica(s) sin resolver`);
      actions.push('Resolver alertas documentales críticas');
      alerts.push({
        id: makeAlertId('documental', 'critical'),
        category: 'documental',
        severity: 'critical',
        companyId: company.id,
        companyName: company.name,
        process: 'Documental / Compliance',
        origin: 'erp_hr_alerts',
        title: `${d.unresolvedCritical} alerta(s) crítica(s)`,
        explanation: d.topAlertTitles.length > 0
          ? `Incluye: ${d.topAlertTitles.slice(0, 2).join('; ')}`
          : `Hay ${d.unresolvedCritical} alerta(s) de severidad crítica sin resolver.`,
        suggestedAction: 'Acceder al panel de alertas HR y resolver las alertas críticas.',
        hasEvidence: false,
      });
    }

    if (d.unresolvedHigh > 0) {
      score -= Math.min(d.unresolvedHigh * 5, 15);
      reasons.push(`${d.unresolvedHigh} alerta(s) documental(es) de severidad alta`);
      actions.push('Revisar alertas documentales de severidad alta');
      alerts.push({
        id: makeAlertId('documental', 'high'),
        category: 'documental',
        severity: 'high',
        companyId: company.id,
        companyName: company.name,
        process: 'Documental / Compliance',
        origin: 'erp_hr_alerts',
        title: `${d.unresolvedHigh} alerta(s) de severidad alta`,
        explanation: `Hay ${d.unresolvedHigh} alerta(s) documentales/HR de severidad alta pendientes.`,
        suggestedAction: 'Revisar vencimientos de contratos, documentos o situaciones HR pendientes.',
        hasEvidence: false,
      });
    }

    if (d.unresolvedMedium > 3) {
      score -= 5;
      reasons.push(`${d.unresolvedMedium} alertas documentales medias acumuladas`);
      alerts.push({
        id: makeAlertId('documental', 'medium_accumulation'),
        category: 'documental',
        severity: 'medium',
        companyId: company.id,
        companyName: company.name,
        process: 'Documental / Compliance',
        origin: 'erp_hr_alerts',
        title: `${d.unresolvedMedium} alertas medias acumuladas`,
        explanation: 'La acumulación de alertas de severidad media indica deuda operativa.',
        suggestedAction: 'Dedicar tiempo a resolver alertas acumuladas para evitar escalada.',
        hasEvidence: false,
      });
    }
  }

  // ── 6. TRACEABILITY signals (6B enrichment) ──
  if (enriched?.traceability) {
    const t = enriched.traceability;

    // Companies with closing activity but no closing evidence
    if (stats.closingStatus !== 'no_periods' && !t.hasClosingEvidence) {
      score -= 8;
      reasons.push('Sin evidencia de cierre registrada');
      alerts.push({
        id: makeAlertId('traceability', 'no_closing_evidence'),
        category: 'traceability',
        severity: 'medium',
        companyId: company.id,
        companyName: company.name,
        process: 'Trazabilidad',
        origin: 'evidence_engine',
        title: 'Sin evidencia de cierre',
        explanation: 'La empresa tiene períodos de nómina pero no se ha registrado evidencia de cierre (closure_package).',
        suggestedAction: 'Completar un cierre mensual con snapshot para generar evidencia auditable.',
        hasEvidence: false,
      });
    }

    // Companies with employees but zero evidence of any kind
    if (stats.activeEmployees > 0 && t.evidenceCount === 0 && t.versionCount === 0) {
      score -= 10;
      reasons.push('Sin trazabilidad (0 evidencias y 0 versiones)');
      blockers.push('Trazabilidad completamente ausente');
      actions.push('Operar procesos con trazabilidad activa (cierre, readiness)');
      alerts.push({
        id: makeAlertId('traceability', 'zero'),
        category: 'traceability',
        severity: 'high',
        companyId: company.id,
        companyName: company.name,
        process: 'Trazabilidad',
        origin: 'evidence_engine',
        title: 'Trazabilidad ausente',
        explanation: 'No existe ninguna evidencia ni versión registrada. La empresa carece de rastro auditable.',
        suggestedAction: 'Iniciar procesos operativos que generen trazabilidad (cierre mensual, readiness).',
        hasEvidence: false,
      });
    }

    // Companies with readiness activity but no readiness evidence
    if (enriched?.readiness && enriched.readiness.totalCircuits > 0 && !t.hasReadinessEvidence) {
      score -= 5;
      reasons.push('Readiness evaluada pero sin evidencia registrada');
      alerts.push({
        id: makeAlertId('traceability', 'no_readiness_evidence'),
        category: 'traceability',
        severity: 'info',
        companyId: company.id,
        companyName: company.name,
        process: 'Trazabilidad',
        origin: 'evidence_engine',
        title: 'Readiness sin evidencia',
        explanation: 'Se han evaluado circuitos oficiales pero no se ha registrado snapshot de readiness.',
        suggestedAction: 'Ejecutar evaluación de readiness desde la matriz oficial para generar evidencia.',
        hasEvidence: false,
      });
    }
  }

  // ── Clamp score ──
  score = Math.max(0, Math.min(100, score));

  // ── Derive severity ──
  const severity = scoreToSeverity(score);

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

function scoreToSeverity(score: number): AlertSeverity {
  if (score <= 40) return 'critical';
  if (score <= 60) return 'high';
  if (score <= 80) return 'medium';
  return 'info';
}

// ─── Aggregation ────────────────────────────────────────────────────────────

/**
 * Build the full Control Tower state from a list of portfolio companies
 * and optional enriched signals per company.
 */
export function buildControlTowerState(
  companies: PortfolioCompany[],
  enrichedSignals?: Map<string, EnrichedCompanySignals>,
): {
  scoredCompanies: CompanyHealthScore[];
  summary: ControlTowerSummary;
} {
  const scored = companies.map(c =>
    computeCompanyHealth(c, enrichedSignals?.get(c.id)),
  );

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
