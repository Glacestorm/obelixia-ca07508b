/**
 * mobilityPortfolioEngine.ts — Mobility Ops Premium
 * Pure/deterministic engine that evaluates a portfolio of mobility assignments
 * and produces aggregated KPIs, a priority queue, and alerts.
 *
 * PRINCIPLES:
 * - No fetch, no side-effects, no DB access
 * - Reuses SupervisorResult + CorridorOperationalPlan from existing engines
 * - Priority score is derived from existing signals only (traceable)
 * - Document completeness uses deterministic required/present/missing counts
 * - No fictional percentages — levels are used where counts are more honest
 */

import { evaluateExpatriateSupervisor, type SupervisorResult } from './expatriateSupervisor';
import { buildCorridorOperationalPlan, type CorridorOperationalPlan, type CoverageLevel } from './corridorOperationalEngine';
import { getCorridorPack, type CorridorKnowledgePack } from './corridorKnowledgePacks';
import type { MobilityAssignment, MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';
import type { SupportLevel } from './internationalMobilityEngine';

// ── Types ──

export interface CaseAnalysis {
  assignmentId: string;
  employeeId: string;
  corridorLabel: string;
  corridorKey: string; // e.g. "ES-DE" for dedup
  status: string;
  riskScore: number;
  supportLevel: SupportLevel;
  coverageLevel: CoverageLevel;
  docRequired: number;
  docPresent: number;
  docMissing: number;
  /** Deterministic completeness level derived from doc counts */
  docCompletenessLevel: 'complete' | 'partial' | 'critical' | 'unknown';
  reviewTriggersCount: number;
  hasDocGaps: boolean;
  hasFiscalDependency: boolean;
  hasPayrollDependency: boolean;
  nearestExpiration: string | null; // ISO date
  daysToNearestExpiration: number | null;
  suggestedTasksCount: number;
  prudenceNotesCount: number;
  /** Composite priority score — higher = more urgent */
  priorityScore: number;
  /** Breakdown of priority score for traceability */
  priorityBreakdown: PriorityBreakdown;
  supervisorResult: SupervisorResult;
  operationalPlan: CorridorOperationalPlan;
}

export interface PriorityBreakdown {
  riskContribution: number;
  docGapContribution: number;
  expirationContribution: number;
  dependencyContribution: number;
  coverageContribution: number;
  triggerContribution: number;
}

export interface PortfolioAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'expiration' | 'doc_gap' | 'dependency' | 'coverage' | 'pack_stale' | 'tasks_pending';
  message: string;
  affectedCount: number;
  assignmentIds: string[];
}

export interface PortfolioKPIs {
  totalActive: number;
  totalPlanned: number;
  totalAll: number;
  corridorCount: number;
  byCountry: Record<string, number>;
  byCorridor: Record<string, number>;
  byCoverage: Record<CoverageLevel, number>;
  bySupportLevel: Record<SupportLevel, number>;
  docsComplete: number;
  docsPartial: number;
  docsCritical: number;
  withFiscalDependency: number;
  withPayrollDependency: number;
  highRiskCount: number;
  expirationsIn30: number;
  expirationsIn60: number;
  expirationsIn90: number;
  avgRiskScore: number;
  openSuggestedTasks: number;
}

export interface MobilityPortfolioAnalysis {
  kpis: PortfolioKPIs;
  caseAnalyses: CaseAnalysis[];
  priorityQueue: CaseAnalysis[];
  alerts: PortfolioAlert[];
  evaluatedAt: string;
}

// ── Priority Score Computation ──
// Fully traceable: each signal contributes a known amount

function computePriorityScore(params: {
  riskScore: number;
  docMissing: number;
  docRequired: number;
  daysToNearestExpiration: number | null;
  hasFiscalDep: boolean;
  hasPayrollDep: boolean;
  coverageLevel: CoverageLevel;
  reviewTriggersCount: number;
}): { score: number; breakdown: PriorityBreakdown } {
  // Risk: 0-40 points (scaled from 0-100 risk score)
  const riskContribution = Math.round(params.riskScore * 0.4);

  // Doc gaps: 0-25 points (scaled by missing/required ratio)
  const docRatio = params.docRequired > 0 ? params.docMissing / params.docRequired : 0;
  const docGapContribution = Math.round(docRatio * 25);

  // Expiration urgency: 0-20 points
  let expirationContribution = 0;
  if (params.daysToNearestExpiration !== null) {
    if (params.daysToNearestExpiration <= 15) expirationContribution = 20;
    else if (params.daysToNearestExpiration <= 30) expirationContribution = 15;
    else if (params.daysToNearestExpiration <= 60) expirationContribution = 10;
    else if (params.daysToNearestExpiration <= 90) expirationContribution = 5;
  }

  // Dependencies: 0-10 points
  const dependencyContribution = (params.hasFiscalDep ? 5 : 0) + (params.hasPayrollDep ? 5 : 0);

  // Coverage penalty: 0-10 points
  const coverageContribution = params.coverageLevel === 'minimal' ? 10 : params.coverageLevel === 'partial' ? 5 : 0;

  // Triggers: 0-5 points
  const triggerContribution = Math.min(5, params.reviewTriggersCount * 2);

  const score = riskContribution + docGapContribution + expirationContribution + dependencyContribution + coverageContribution + triggerContribution;

  return {
    score: Math.min(100, score),
    breakdown: {
      riskContribution,
      docGapContribution,
      expirationContribution,
      dependencyContribution,
      coverageContribution,
      triggerContribution,
    },
  };
}

// ── Document Completeness Level ──

function docCompletenessLevel(required: number, present: number): CaseAnalysis['docCompletenessLevel'] {
  if (required === 0) return 'unknown';
  const ratio = present / required;
  if (ratio >= 1) return 'complete';
  if (ratio >= 0.5) return 'partial';
  return 'critical';
}

// ── Nearest Expiration ──

function findNearestExpiration(docs: MobilityDocument[]): { date: string | null; days: number | null } {
  const now = Date.now();
  let nearest: { date: string; days: number } | null = null;

  for (const doc of docs) {
    if (!doc.expiry_date) continue;
    const expiry = new Date(doc.expiry_date).getTime();
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && (nearest === null || daysLeft < nearest.days)) {
      nearest = { date: doc.expiry_date, days: daysLeft };
    }
  }

  return nearest ?? { date: null, days: null };
}

// ── Corridor Key ──

function corridorKey(home: string, host: string): string {
  return `${home.toUpperCase()}-${host.toUpperCase()}`;
}

// ── Main Engine ──

export function analyzePortfolio(
  assignments: MobilityAssignment[],
  documentsByAssignment: Map<string, MobilityDocument[]>,
  corridorPacks: Map<string, CorridorKnowledgePack | null>,
): MobilityPortfolioAnalysis {
  const caseAnalyses: CaseAnalysis[] = [];

  for (const assignment of assignments) {
    const docs = documentsByAssignment.get(assignment.id) ?? [];
    const ck = corridorKey(assignment.home_country_code, assignment.host_country_code);
    const pack = corridorPacks.has(ck) ? corridorPacks.get(ck)! : getCorridorPack(assignment.home_country_code, assignment.host_country_code);

    // Reuse existing engines
    const supervisor = evaluateExpatriateSupervisor(assignment, pack);
    const plan = buildCorridorOperationalPlan(supervisor, assignment, docs);

    const { date: nearestExp, days: daysToExp } = findNearestExpiration(docs);
    const hasFiscalDep = plan.fiscalPayrollDependencies.some(d => d.module === 'fiscal' && d.detected);
    const hasPayrollDep = plan.fiscalPayrollDependencies.some(d => d.module === 'payroll' && d.detected);

    const docReq = plan.documentRequirements.length;
    const docPres = plan.documentRequirements.filter(r => r.present).length;
    const docMiss = docReq - docPres;

    const { score, breakdown } = computePriorityScore({
      riskScore: supervisor.consolidatedRiskScore,
      docMissing: docMiss,
      docRequired: docReq,
      daysToNearestExpiration: daysToExp,
      hasFiscalDep: hasFiscalDep,
      hasPayrollDep: hasPayrollDep,
      coverageLevel: plan.coverageAssessment.level,
      reviewTriggersCount: supervisor.reviewTriggers.length,
    });

    caseAnalyses.push({
      assignmentId: assignment.id,
      employeeId: assignment.employee_id,
      corridorLabel: supervisor.corridorLabel,
      corridorKey: ck,
      status: assignment.status,
      riskScore: supervisor.consolidatedRiskScore,
      supportLevel: supervisor.overallSupportLevel,
      coverageLevel: plan.coverageAssessment.level,
      docRequired: docReq,
      docPresent: docPres,
      docMissing: docMiss,
      docCompletenessLevel: docCompletenessLevel(docReq, docPres),
      reviewTriggersCount: supervisor.reviewTriggers.length,
      hasDocGaps: plan.documentGaps.length > 0,
      hasFiscalDependency: hasFiscalDep,
      hasPayrollDependency: hasPayrollDep,
      nearestExpiration: nearestExp,
      daysToNearestExpiration: daysToExp,
      suggestedTasksCount: plan.suggestedTasks.length,
      prudenceNotesCount: plan.coverageAssessment.prudenceNotes.length,
      priorityScore: score,
      priorityBreakdown: breakdown,
      supervisorResult: supervisor,
      operationalPlan: plan,
    });
  }

  // Priority queue: descending by priority score
  const priorityQueue = [...caseAnalyses].sort((a, b) => b.priorityScore - a.priorityScore);

  // KPIs
  const kpis = computeKPIs(caseAnalyses);

  // Alerts
  const alerts = computeAlerts(caseAnalyses);

  return {
    kpis,
    caseAnalyses,
    priorityQueue,
    alerts,
    evaluatedAt: new Date().toISOString(),
  };
}

// ── KPIs ──

function computeKPIs(cases: CaseAnalysis[]): PortfolioKPIs {
  const activeStatuses = new Set(['active', 'extending', 'repatriating']);
  const plannedStatuses = new Set(['draft', 'planned', 'pre_assignment']);

  const byCountry: Record<string, number> = {};
  const byCorridor: Record<string, number> = {};
  const byCoverage: Record<CoverageLevel, number> = { full: 0, partial: 0, minimal: 0 };
  const bySupportLevel: Record<SupportLevel, number> = { supported_production: 0, supported_with_review: 0, out_of_scope: 0 };

  let totalRisk = 0;
  let docsComplete = 0;
  let docsPartial = 0;
  let docsCritical = 0;
  let withFiscalDep = 0;
  let withPayrollDep = 0;
  let highRisk = 0;
  let exp30 = 0, exp60 = 0, exp90 = 0;
  let totalSuggested = 0;

  for (const c of cases) {
    byCountry[c.corridorKey.split('-')[1]] = (byCountry[c.corridorKey.split('-')[1]] ?? 0) + 1;
    byCorridor[c.corridorKey] = (byCorridor[c.corridorKey] ?? 0) + 1;
    byCoverage[c.coverageLevel]++;
    bySupportLevel[c.supportLevel]++;
    totalRisk += c.riskScore;
    if (c.docCompletenessLevel === 'complete') docsComplete++;
    else if (c.docCompletenessLevel === 'partial') docsPartial++;
    else if (c.docCompletenessLevel === 'critical') docsCritical++;
    if (c.hasFiscalDependency) withFiscalDep++;
    if (c.hasPayrollDependency) withPayrollDep++;
    if (c.riskScore >= 60) highRisk++;
    if (c.daysToNearestExpiration !== null) {
      if (c.daysToNearestExpiration <= 30) exp30++;
      if (c.daysToNearestExpiration <= 60) exp60++;
      if (c.daysToNearestExpiration <= 90) exp90++;
    }
    totalSuggested += c.suggestedTasksCount;
  }

  const totalActive = cases.filter(c => activeStatuses.has(c.status)).length;
  const totalPlanned = cases.filter(c => plannedStatuses.has(c.status)).length;

  return {
    totalActive,
    totalPlanned,
    totalAll: cases.length,
    corridorCount: Object.keys(byCorridor).length,
    byCountry,
    byCorridor,
    byCoverage,
    bySupportLevel,
    docsComplete,
    docsPartial,
    docsCritical,
    withFiscalDependency: withFiscalDep,
    withPayrollDependency: withPayrollDep,
    highRiskCount: highRisk,
    expirationsIn30: exp30,
    expirationsIn60: exp60,
    expirationsIn90: exp90,
    avgRiskScore: cases.length > 0 ? Math.round(totalRisk / cases.length) : 0,
    openSuggestedTasks: totalSuggested,
  };
}

// ── Alerts ──

function computeAlerts(cases: CaseAnalysis[]): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];

  // Expirations <= 30 days
  const expiring30 = cases.filter(c => c.daysToNearestExpiration !== null && c.daysToNearestExpiration <= 30);
  if (expiring30.length > 0) {
    alerts.push({
      id: 'expiration_30d',
      severity: 'critical',
      category: 'expiration',
      message: `${expiring30.length} caso(s) con documentos que expiran en ≤30 días`,
      affectedCount: expiring30.length,
      assignmentIds: expiring30.map(c => c.assignmentId),
    });
  }

  // Doc gaps
  const withGaps = cases.filter(c => c.hasDocGaps);
  if (withGaps.length > 0) {
    alerts.push({
      id: 'doc_gaps',
      severity: withGaps.length >= 3 ? 'critical' : 'warning',
      category: 'doc_gap',
      message: `${withGaps.length} caso(s) con documentación incompleta`,
      affectedCount: withGaps.length,
      assignmentIds: withGaps.map(c => c.assignmentId),
    });
  }

  // Fiscal dependencies
  const fiscalDeps = cases.filter(c => c.hasFiscalDependency);
  if (fiscalDeps.length > 0) {
    alerts.push({
      id: 'fiscal_deps',
      severity: 'warning',
      category: 'dependency',
      message: `${fiscalDeps.length} caso(s) con dependencia fiscal pendiente`,
      affectedCount: fiscalDeps.length,
      assignmentIds: fiscalDeps.map(c => c.assignmentId),
    });
  }

  // Minimal coverage
  const minCoverage = cases.filter(c => c.coverageLevel === 'minimal');
  if (minCoverage.length > 0) {
    alerts.push({
      id: 'minimal_coverage',
      severity: 'warning',
      category: 'coverage',
      message: `${minCoverage.length} caso(s) con cobertura normativa mínima`,
      affectedCount: minCoverage.length,
      assignmentIds: minCoverage.map(c => c.assignmentId),
    });
  }

  // Suggested tasks not created
  const withSuggested = cases.filter(c => c.suggestedTasksCount > 0);
  if (withSuggested.length > 0) {
    const totalTasks = withSuggested.reduce((sum, c) => sum + c.suggestedTasksCount, 0);
    alerts.push({
      id: 'tasks_pending',
      severity: 'info',
      category: 'tasks_pending',
      message: `${totalTasks} tarea(s) sugerida(s) sin crear en ${withSuggested.length} caso(s)`,
      affectedCount: withSuggested.length,
      assignmentIds: withSuggested.map(c => c.assignmentId),
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return alerts;
}
