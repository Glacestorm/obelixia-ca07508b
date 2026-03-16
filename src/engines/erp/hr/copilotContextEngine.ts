/**
 * copilotContextEngine.ts — V2-RRHH-FASE-7
 * Pure engine that aggregates real signals from Control Tower, portfolio,
 * closing, readiness, and traceability into a serializable context
 * suitable for the HR Labor Copilot AI prompt.
 *
 * Zero side-effects, zero fetch — deterministic functions only.
 */

import type { CompanyHealthScore, ControlTowerSummary, AlertCategory, AlertSeverity } from './controlTowerEngine';
import type { PortfolioSummary } from '@/hooks/erp/hr/useAdvisoryPortfolio';

// ─── Copilot Context Types ─────────────────────────────────────────────────

export interface CopilotPortfolioContext {
  totalCompanies: number;
  activeCompanies: number;
  totalEmployees: number;
  totalOverdueTasks: number;
  companiesWithOpenClosing: number;
  companiesFullyClosed: number;
  criticalCompanies: number;
  highRiskCompanies: number;
  evaluatedAt: string;
}

export interface CopilotCompanyContext {
  companyId: string;
  companyName: string;
  healthScore: number;
  severity: AlertSeverity;
  reasons: string[];
  topBlockers: string[];
  topActions: string[];
  stats: {
    activeEmployees: number;
    pendingTasks: number;
    overdueTasks: number;
    openClosingPeriods: number;
    closingStatus: string;
  };
  alertsByCategory: Record<string, {
    count: number;
    titles: string[];
    severity: AlertSeverity;
  }>;
}

export interface CopilotFullContext {
  portfolio: CopilotPortfolioContext | null;
  /** All companies sorted worst-first, limited to top N for token economy */
  companies: CopilotCompanyContext[];
  /** Selected company detail (if drill-down) */
  focusedCompany: CopilotCompanyContext | null;
  /** System disclaimers the AI must include */
  systemConstraints: string[];
  /** Timestamp */
  generatedAt: string;
}

// ─── Context Builders ───────────────────────────────────────────────────────

export function buildPortfolioContext(
  summary: ControlTowerSummary | null,
  portfolioSummary: PortfolioSummary | null,
): CopilotPortfolioContext | null {
  if (!summary && !portfolioSummary) return null;

  return {
    totalCompanies: summary?.totalCompanies ?? portfolioSummary?.totalCompanies ?? 0,
    activeCompanies: portfolioSummary?.activeCompanies ?? summary?.totalCompanies ?? 0,
    totalEmployees: portfolioSummary?.totalEmployees ?? 0,
    totalOverdueTasks: summary?.totalOverdueTasks ?? portfolioSummary?.totalOverdueTasks ?? 0,
    companiesWithOpenClosing: summary?.totalOpenClosings ?? portfolioSummary?.companiesWithOpenClosing ?? 0,
    companiesFullyClosed: portfolioSummary?.companiesFullyClosed ?? 0,
    criticalCompanies: summary?.criticalCount ?? 0,
    highRiskCompanies: summary?.highCount ?? 0,
    evaluatedAt: summary?.evaluatedAt ?? new Date().toISOString(),
  };
}

export function buildCompanyContext(scored: CompanyHealthScore): CopilotCompanyContext {
  // Group alerts by category
  const alertsByCategory: CopilotCompanyContext['alertsByCategory'] = {};
  for (const alert of scored.alerts) {
    if (!alertsByCategory[alert.category]) {
      alertsByCategory[alert.category] = {
        count: 0,
        titles: [],
        severity: alert.severity,
      };
    }
    const cat = alertsByCategory[alert.category];
    cat.count++;
    if (cat.titles.length < 3) cat.titles.push(alert.title);
    // Keep worst severity
    if (severityOrder(alert.severity) < severityOrder(cat.severity)) {
      cat.severity = alert.severity;
    }
  }

  return {
    companyId: scored.companyId,
    companyName: scored.companyName,
    healthScore: scored.score,
    severity: scored.severity,
    reasons: scored.reasons.slice(0, 8),
    topBlockers: scored.topBlockers,
    topActions: scored.topActions,
    stats: {
      activeEmployees: scored.stats.activeEmployees,
      pendingTasks: scored.stats.pendingTasks,
      overdueTasks: scored.stats.overdueTasks,
      openClosingPeriods: scored.stats.openClosingPeriods,
      closingStatus: scored.stats.closingStatus,
    },
    alertsByCategory,
  };
}

/**
 * Build the full copilot context from Control Tower data.
 * Limits company list to top N worst for token economy.
 */
export function buildCopilotContext(
  scoredCompanies: CompanyHealthScore[],
  summary: ControlTowerSummary | null,
  portfolioSummary: PortfolioSummary | null,
  focusedCompanyId: string | null,
  maxCompanies = 10,
): CopilotFullContext {
  const portfolio = buildPortfolioContext(summary, portfolioSummary);

  // Build company contexts (already sorted worst-first from control tower)
  const companies = scoredCompanies
    .slice(0, maxCompanies)
    .map(buildCompanyContext);

  // Focused company
  let focusedCompany: CopilotCompanyContext | null = null;
  if (focusedCompanyId) {
    const found = scoredCompanies.find(c => c.companyId === focusedCompanyId);
    if (found) {
      focusedCompany = buildCompanyContext(found);
    }
  }

  return {
    portfolio,
    companies,
    focusedCompany,
    systemConstraints: SYSTEM_CONSTRAINTS,
    generatedAt: new Date().toISOString(),
  };
}

// ─── System Constraints ─────────────────────────────────────────────────────

const SYSTEM_CONSTRAINTS = [
  'El sistema está en modo preparatorio. No se realizan envíos reales a organismos oficiales.',
  'Toda información sobre readiness, circuitos y envíos es interna y preparatoria.',
  'No proporciones asesoramiento legal vinculante. Indica siempre consultar con un profesional.',
  'Si faltan datos o la información es parcial, indícalo claramente.',
  'No inventes datos que no estén presentes en el contexto proporcionado.',
  'Las puntuaciones de salud son orientativas y basadas en señales del sistema.',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function severityOrder(s: AlertSeverity): number {
  const map: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, info: 3 };
  return map[s] ?? 3;
}

// ─── Guided Prompts ─────────────────────────────────────────────────────────

export interface GuidedPrompt {
  id: string;
  label: string;
  prompt: string;
  icon: string; // lucide icon name
  requiresFocusedCompany: boolean;
  category: 'portfolio' | 'company' | 'closing' | 'readiness' | 'documental' | 'traceability';
}

export const GUIDED_PROMPTS: GuidedPrompt[] = [
  {
    id: 'portfolio_summary',
    label: 'Resumen de cartera',
    prompt: '¿Cuál es el estado general de mi cartera de empresas? ¿Qué empresas requieren atención prioritaria y por qué?',
    icon: 'Briefcase',
    requiresFocusedCompany: false,
    category: 'portfolio',
  },
  {
    id: 'company_status',
    label: 'Estado de esta empresa',
    prompt: 'Resume el estado laboral completo de esta empresa. ¿Cuáles son sus principales riesgos y qué acciones se recomiendan?',
    icon: 'Building2',
    requiresFocusedCompany: true,
    category: 'company',
  },
  {
    id: 'closing_gaps',
    label: '¿Qué falta para cerrar?',
    prompt: '¿Qué falta para completar el cierre mensual de esta empresa? ¿Qué bloquea el proceso?',
    icon: 'Calendar',
    requiresFocusedCompany: true,
    category: 'closing',
  },
  {
    id: 'readiness_blocks',
    label: 'Bloqueos de readiness',
    prompt: '¿Qué bloquea el readiness oficial de esta empresa? ¿Qué circuitos tienen problemas y qué se necesita para resolverlos?',
    icon: 'Shield',
    requiresFocusedCompany: true,
    category: 'readiness',
  },
  {
    id: 'documental_critical',
    label: 'Alertas documentales',
    prompt: '¿Qué alertas documentales o de compliance son críticas en esta empresa? ¿Cuáles son las más urgentes?',
    icon: 'FileText',
    requiresFocusedCompany: true,
    category: 'documental',
  },
  {
    id: 'traceability_gaps',
    label: 'Huecos de trazabilidad',
    prompt: '¿Qué problemas de trazabilidad tiene esta empresa? ¿Dónde falta evidencia o registro de versiones?',
    icon: 'Search',
    requiresFocusedCompany: true,
    category: 'traceability',
  },
  {
    id: 'priority_action',
    label: '¿Dónde actuar primero?',
    prompt: 'De todas las empresas de mi cartera, ¿cuáles necesitan atención inmediata y qué acción concreta debo tomar primero?',
    icon: 'Zap',
    requiresFocusedCompany: false,
    category: 'portfolio',
  },
  {
    id: 'risk_explanation',
    label: '¿Por qué está en riesgo?',
    prompt: '¿Por qué esta empresa está clasificada con este nivel de riesgo? Explica las señales que contribuyen a su puntuación.',
    icon: 'AlertTriangle',
    requiresFocusedCompany: true,
    category: 'company',
  },
];
