/**
 * useHRCommandCenter — Phase 1 (read-only aggregator)
 *
 * Single-tenant executive HR Command Center hook. Composes existing hooks
 * defensively: if any source returns no data, the corresponding section
 * surfaces a "no data / gris" status — never green by default.
 *
 * INVARIANTES:
 *  - Read-only. No service_role. No new edge functions. No new fetches
 *    beyond what the composed hooks already perform.
 *  - VPT/S9 stays internal_ready. No official_ready / accepted / submitted.
 *  - persisted_priority_apply remains OFF. C3B3C2 stays BLOCKED.
 *  - Phase 1 scoring covers ONLY: globalReadiness, payrollReadiness,
 *    documentaryReadiness. Other sections return `null` score + gris.
 */
import { useMemo } from 'react';
import { useHRExecutiveData } from '@/hooks/admin/useHRExecutiveData';
import { usePayrollPreflight } from '@/hooks/erp/hr/usePayrollPreflight';
import { useHRDocumentExpedient } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { useS9VPT } from '@/hooks/erp/hr/useS9VPT';
import { useHRLegalCompliance } from '@/hooks/admin/useHRLegalCompliance';

export type ReadinessLevel = 'green' | 'amber' | 'red' | 'gray';

export interface SectionReadiness {
  level: ReadinessLevel;
  score: number | null;
  label: string;
  hasData: boolean;
  blockers: number;
  warnings: number;
}

export interface GlobalStateSnapshot extends SectionReadiness {
  activeEmployees: number | null;
  newHiresMonth: number | null;
  departuresMonth: number | null;
  onLeave: number | null;
}

export interface PayrollSnapshot extends SectionReadiness {
  periodStatus: string | null;
  pendingIncidents: number | null;
  closableState: 'closable' | 'closable_with_warnings' | 'blocked' | 'unknown';
}

export interface DocumentarySnapshot extends SectionReadiness {
  total: number | null;
  expiringSoon: number | null;
  unverified: number | null;
  activeConsents: number | null;
}

export interface PlaceholderSnapshot extends SectionReadiness {
  phase: 'phase-2' | 'phase-3' | 'future';
  disclaimer: string;
}

/**
 * Legal/Compliance snapshot — Phase 2B real wiring.
 * Read-only consumption of `useHRLegalCompliance`. The Command Center never
 * triggers `refreshAll` / `startAutoRefresh` on its own. If the hook returns
 * empty arrays + null risk assessment ⇒ gris "Sin datos" (never green).
 * This is INTERNAL READING, not an official legal certification.
 */
export type LegalBulletStatus = 'green' | 'amber' | 'red' | 'gray';
export interface LegalCoverageBullet {
  key: string;
  label: string;
  status: LegalBulletStatus;
  detail: string;
}

export interface LegalSnapshot extends SectionReadiness {
  disclaimer: string;
  criticalAlerts: number | null;
  urgentAlerts: number | null;
  overdueObligations: number | null;
  pendingCommunications: number | null;
  totalAlerts: number | null;
  upcomingDeadlinesCount: number | null;
  sanctionRiskCount: number | null;
  potentialSanctionsMin: number | null;
  potentialSanctionsMax: number | null;
  coverageBullets: LegalCoverageBullet[];
}

/**
 * VPT/S9 snapshot — Phase 2A real wiring.
 * VPT remains internal_ready always: score is capped at 80 and the badge
 * never reflects official_ready / accepted / regulatory_ready.
 */
export interface VPTSnapshot extends SectionReadiness {
  status: 'internal_ready';
  disclaimer: string;
  totalPositions: number | null;
  valuatedPositions: number | null;
  coverage: number | null;
  approvedCount: number | null;
  approvedWithVersionId: number | null;
  approvedWithoutVersionId: number | null;
  incoherencesCount: number | null;
}

export interface HRCommandCenterData {
  isLoading: boolean;
  globalReadiness: SectionReadiness;
  global: GlobalStateSnapshot;
  payroll: PayrollSnapshot;
  documentary: DocumentarySnapshot;
  legal: LegalSnapshot;
  vpt: VPTSnapshot;
  officialIntegrations: PlaceholderSnapshot;
  alerts: PlaceholderSnapshot;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function levelFromScore(score: number | null, blockers = 0): ReadinessLevel {
  if (score === null || score === undefined) return 'gray';
  if (blockers > 0) return 'red';
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function safeNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useHRCommandCenter(companyId: string): HRCommandCenterData {
  const exec = useHRExecutiveData(companyId);
  const preflight = usePayrollPreflight(companyId);
  const docs = useHRDocumentExpedient(companyId);
  const vptHook = useS9VPT(companyId);
  // Read-only consumption: we do NOT call refreshAll / startAutoRefresh.
  // The hook performs its own initial load on mount; we just read state.
  const legalHook = useHRLegalCompliance(companyId);

  return useMemo<HRCommandCenterData>(() => {
    const isLoading = Boolean(
      (exec as any)?.isLoading
        || preflight?.isLoading
        || (docs as any)?.isLoadingDocuments
        || (vptHook as any)?.isLoading
        || (legalHook as any)?.isLoading,
    );

    // ── Global state ──
    const wf = (exec as any)?.workforceStats ?? null;
    const hasGlobalData = wf && safeNumber(wf.activeEmployees) !== null;
    const activeEmployees = safeNumber(wf?.activeEmployees);
    const newHires = safeNumber(wf?.newHiresMonth);
    const departures = safeNumber(wf?.departuresMonth);
    const onLeave = safeNumber(wf?.onLeave);

    // Lightweight global score: only when we have headcount data.
    let globalScore: number | null = null;
    if (hasGlobalData && activeEmployees !== null && activeEmployees > 0) {
      const turnoverPenalty = ((departures ?? 0) / Math.max(activeEmployees, 1)) * 100;
      globalScore = Math.round(clamp(100 - turnoverPenalty * 4));
    }
    const global: GlobalStateSnapshot = {
      level: levelFromScore(globalScore),
      score: globalScore,
      label: hasGlobalData ? 'Estado plantilla' : 'Sin datos',
      hasData: Boolean(hasGlobalData),
      blockers: 0,
      warnings: 0,
      activeEmployees,
      newHiresMonth: newHires,
      departuresMonth: departures,
      onLeave,
    };

    // ── Payroll preflight ──
    const pf = preflight?.preflight ?? null;
    const hasPayrollData = !!pf;
    let payrollScore: number | null = null;
    let payrollBlockers = 0;
    let payrollWarnings = 0;
    let closable: PayrollSnapshot['closableState'] = 'unknown';
    let periodStatus: string | null = null;
    let pendingIncidents: number | null = null;

    if (hasPayrollData && pf) {
      payrollBlockers = (pf.crossDomainBlockers?.length ?? 0)
        + (pf.firstBlockedStep ? 1 : 0);
      payrollWarnings = pf.legalAlerts?.length ?? 0;
      const completion = safeNumber(pf.completionScore) ?? 0;
      payrollScore = Math.round(clamp(completion - payrollBlockers * 20 - payrollWarnings * 5));
      if (payrollBlockers > 0 || pf.overallStatus === 'blocked') {
        closable = 'blocked';
      } else if (payrollWarnings > 0 || pf.overallStatus === 'at_risk') {
        closable = 'closable_with_warnings';
      } else if (pf.overallStatus === 'on_track') {
        closable = 'closable';
      } else {
        closable = 'unknown';
      }
      pendingIncidents = pf.steps?.find((s: any) => s.id === 'incidents')
        ? null
        : null;
      // periodStatus: not exposed in PreflightResult; keep null in Phase 1
      periodStatus = pf.overallStatus ?? null;
    }
    const payroll: PayrollSnapshot = {
      level: hasPayrollData
        ? (payrollBlockers > 0 ? 'red' : levelFromScore(payrollScore, payrollBlockers))
        : 'gray',
      score: payrollScore,
      label: hasPayrollData ? 'Preflight nómina' : 'Sin datos',
      hasData: hasPayrollData,
      blockers: payrollBlockers,
      warnings: payrollWarnings,
      periodStatus,
      pendingIncidents,
      closableState: closable,
    };

    // ── Documentary ──
    const stats = typeof (docs as any)?.getExpedientStats === 'function'
      ? (docs as any).getExpedientStats()
      : null;
    const hasDocData = !!stats && typeof stats.total === 'number';
    let docScore: number | null = null;
    let docBlockers = 0;
    let docWarnings = 0;
    if (hasDocData && stats.total >= 0) {
      const expired = safeNumber(stats.expiringSoon) ?? 0;
      const unverified = safeNumber(stats.unverified) ?? 0;
      const total = Math.max(stats.total, 1);
      const okRatio = (total - expired - unverified) / total;
      docScore = Math.round(clamp(okRatio * 100 - expired * 2));
      docWarnings = expired;
      docBlockers = unverified > Math.floor(total * 0.5) ? 1 : 0;
    }
    const documentary: DocumentarySnapshot = {
      level: hasDocData ? levelFromScore(docScore, docBlockers) : 'gray',
      score: docScore,
      label: hasDocData ? 'Expediente documental' : 'Sin datos',
      hasData: hasDocData,
      blockers: docBlockers,
      warnings: docWarnings,
      total: hasDocData ? stats.total : null,
      expiringSoon: hasDocData ? safeNumber(stats.expiringSoon) : null,
      unverified: hasDocData ? safeNumber(stats.unverified) : null,
      activeConsents: hasDocData ? safeNumber(stats.activeConsents) : null,
    };

    // ── Placeholders Fase 1 (legal / VPT / oficiales / alertas) ──
    const placeholder = (
      label: string,
      disclaimer: string,
      phase: PlaceholderSnapshot['phase'] = 'phase-2',
    ): PlaceholderSnapshot => ({
      level: 'gray',
      score: null,
      label,
      hasData: false,
      blockers: 0,
      warnings: 0,
      phase,
      disclaimer,
    });

    // ── Legal / Compliance (real wiring) ──
    const legal = computeLegalSnapshot(legalHook);

    // ── VPT / S9 (real wiring) ──
    const vpt = computeVPTSnapshot(vptHook);

    const officialIntegrations = placeholder(
      'Integraciones oficiales',
      'Sin evidencia oficial archivada · no se marca accepted/official_ready',
    );
    const alerts = placeholder(
      'Alertas y bloqueos',
      'Agregación completa en Fase 3',
      'phase-3',
    );

    // ── Global readiness (Phase 1: only weighted over real sections) ──
    const realScores: Array<{ score: number; weight: number }> = [];
    if (global.score !== null) realScores.push({ score: global.score, weight: 0.2 });
    if (payroll.score !== null) realScores.push({ score: payroll.score, weight: 0.5 });
    if (documentary.score !== null) realScores.push({ score: documentary.score, weight: 0.3 });

    let globalReadinessScore: number | null = null;
    if (realScores.length > 0) {
      const totalWeight = realScores.reduce((acc, s) => acc + s.weight, 0);
      const weighted = realScores.reduce((acc, s) => acc + s.score * s.weight, 0);
      globalReadinessScore = Math.round(weighted / totalWeight);
    }
    const totalBlockers = global.blockers + payroll.blockers + documentary.blockers;
    const globalReadiness: SectionReadiness = {
      level: globalReadinessScore === null
        ? 'gray'
        : levelFromScore(globalReadinessScore, totalBlockers),
      score: globalReadinessScore,
      label: globalReadinessScore === null ? 'Sin datos suficientes' : 'Readiness global',
      hasData: globalReadinessScore !== null,
      blockers: totalBlockers,
      warnings: payroll.warnings + documentary.warnings,
    };

    return {
      isLoading,
      globalReadiness,
      global,
      payroll,
      documentary,
      legal,
      vpt,
      officialIntegrations,
      alerts,
    };
  }, [exec, preflight, docs, vptHook, legalHook]);
}

// ── VPT snapshot computation ────────────────────────────────────────────────

const VPT_DISCLAIMER =
  'internal_ready · herramienta interna de soporte; no constituye certificación oficial regulatoria';
const VPT_SCORE_CAP = 80;

function emptyVPTSnapshot(label: string): VPTSnapshot {
  return {
    level: 'gray',
    score: null,
    label,
    hasData: false,
    blockers: 0,
    warnings: 0,
    status: 'internal_ready',
    disclaimer: VPT_DISCLAIMER,
    totalPositions: null,
    valuatedPositions: null,
    coverage: null,
    approvedCount: null,
    approvedWithVersionId: null,
    approvedWithoutVersionId: null,
    incoherencesCount: null,
  };
}

export function computeVPTSnapshot(hook: any): VPTSnapshot {
  // Defensive: hook missing or no analytics → gris "Sin datos"
  if (!hook || !hook.analytics) {
    return emptyVPTSnapshot('Sin datos');
  }
  const analytics = hook.analytics;
  const totalPositions = safeNumber(analytics.totalPositions);

  // No positions configured → gris (nothing to value yet)
  if (totalPositions === null) {
    return emptyVPTSnapshot('Sin datos');
  }
  if (totalPositions === 0) {
    return {
      ...emptyVPTSnapshot('Sin puestos configurados'),
      totalPositions: 0,
      valuatedPositions: 0,
      coverage: 0,
      approvedCount: 0,
      approvedWithVersionId: 0,
      approvedWithoutVersionId: 0,
      incoherencesCount: 0,
      hasData: true,
    };
  }

  const valuations: any[] = Array.isArray(hook.valuations) ? hook.valuations : [];
  const incoherences: any[] = Array.isArray(hook.incoherences) ? hook.incoherences : [];

  const valuatedPositions = safeNumber(analytics.valuatedPositions) ?? 0;
  const coverage = safeNumber(analytics.coverage) ?? 0;
  const approvedCount = safeNumber(analytics?.byStatus?.approved) ?? 0;
  const approvedWithVersionId = valuations.filter(
    (v: any) => v?.status === 'approved' && !!v?.version_id,
  ).length;
  const approvedWithoutVersionId = Math.max(approvedCount - approvedWithVersionId, 0);
  const incoherencesCount = incoherences.length;

  // ── Readiness rules ──
  let level: ReadinessLevel = 'gray';
  let score: number | null = null;
  let blockers = 0;
  let warnings = 0;
  let label = 'VPT / S9';

  if (approvedCount === 0) {
    // totalPositions > 0 and no approvals → red, coverage 0%
    level = 'red';
    score = 0;
    blockers = 1;
    label = 'VPT sin aprobar';
  } else if (approvedWithoutVersionId > 0) {
    // Critical blocker: approved without immutable snapshot
    level = 'red';
    score = Math.min(20, VPT_SCORE_CAP);
    blockers = approvedWithoutVersionId;
    label = 'VPT sin version_id';
  } else {
    // Coverage-driven scoring (capped at 80, internal_ready)
    const coverageScore = Math.round(clamp(coverage)); // 0..100
    let computed = coverageScore;
    if (incoherencesCount > 0) {
      computed -= incoherencesCount * 5;
    }
    computed = Math.round(clamp(computed));
    score = Math.min(computed, VPT_SCORE_CAP);

    if (incoherencesCount > 5) {
      level = 'red';
      blockers = 1;
      warnings = incoherencesCount;
      label = 'VPT con incoherencias';
    } else if (incoherencesCount > 0) {
      level = 'amber';
      warnings = incoherencesCount;
      label = 'VPT con avisos';
    } else if (coverage < 25) {
      level = 'red';
      label = 'VPT cobertura baja';
    } else if (coverage < 80) {
      level = 'amber';
      label = 'VPT cobertura parcial';
    } else {
      // coverage >= 80, no incoherences, no missing version_id
      level = 'green';
      label = 'VPT operativo';
    }
  }

  return {
    level,
    score,
    label,
    hasData: true,
    blockers,
    warnings,
    status: 'internal_ready',
    disclaimer: VPT_DISCLAIMER,
    totalPositions,
    valuatedPositions,
    coverage: Math.round(coverage * 10) / 10,
    approvedCount,
    approvedWithVersionId,
    approvedWithoutVersionId,
    incoherencesCount,
  };
}

export default useHRCommandCenter;