/**
 * useHRCommandCenter — Phase 2B (read-only aggregator)
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
 *  - Phase 2B scoring includes payroll, documentary, legal and VPT when
 *    real scores are available; official integrations remain placeholder
 *    until 2C.
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

    // ── Global readiness (Phase 2B: payroll + documentary + legal + VPT + global) ──
    // Only sections with non-null score enter the weighted denominator.
    const realScores: Array<{ score: number; weight: number }> = [];
    if (global.score !== null) realScores.push({ score: global.score, weight: 0.10 });
    if (payroll.score !== null) realScores.push({ score: payroll.score, weight: 0.30 });
    if (documentary.score !== null) realScores.push({ score: documentary.score, weight: 0.20 });
    if (legal.score !== null) realScores.push({ score: legal.score, weight: 0.25 });
    if (vpt.score !== null) realScores.push({ score: vpt.score, weight: 0.15 });

    let globalReadinessScore: number | null = null;
    if (realScores.length > 0) {
      const totalWeight = realScores.reduce((acc, s) => acc + s.weight, 0);
      const weighted = realScores.reduce((acc, s) => acc + s.score * s.weight, 0);
      globalReadinessScore = Math.round(weighted / totalWeight);
    }
    const totalBlockers =
      global.blockers + payroll.blockers + documentary.blockers
      + legal.blockers + vpt.blockers;
    const totalWarnings =
      payroll.warnings + documentary.warnings + legal.warnings + vpt.warnings;

    // Hard rule: any RED section among payroll / legal / VPT forces global RED,
    // regardless of weighted average. Prudence rule: any blocker > 0 ⇒ RED.
    const hardRed =
      payroll.level === 'red' || legal.level === 'red' || vpt.level === 'red';

    let globalLevel: ReadinessLevel;
    if (globalReadinessScore === null) {
      globalLevel = 'gray';
    } else if (hardRed || totalBlockers > 0) {
      globalLevel = 'red';
    } else {
      globalLevel = levelFromScore(globalReadinessScore, totalBlockers);
    }

    const globalReadiness: SectionReadiness = {
      level: globalLevel,
      score: globalReadinessScore,
      label: globalReadinessScore === null ? 'Sin datos suficientes' : 'Readiness global',
      hasData: globalReadinessScore !== null,
      blockers: totalBlockers,
      warnings: totalWarnings,
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

// ── Legal snapshot computation ──────────────────────────────────────────────

const LEGAL_DISCLAIMER =
  'Lectura interna de cumplimiento. Requiere revisión laboral/legal antes de uso externo.';

/** Defensive bullet definitions: we look for code/name/category matches. */
const LEGAL_BULLET_DEFS: Array<{
  key: string;
  label: string;
  patterns: RegExp[];
}> = [
  { key: 'whistleblowing', label: 'Canal denuncias', patterns: [/canal.*denuncia/i, /whistleblow/i, /informant/i, /ley\s*2\/?2023/i] },
  { key: 'equality_plan', label: 'Plan de igualdad', patterns: [/plan.*igualdad/i, /igualdad/i, /equality/i] },
  { key: 'pay_registry', label: 'Registro retributivo', patterns: [/registro.*retributiv/i, /pay.*registry/i, /retribuci/i] },
  { key: 'pay_audit', label: 'Auditoría retributiva', patterns: [/auditor[ií]a.*retributiv/i, /pay.*audit/i] },
  { key: 'digital_disconnect', label: 'Desconexión digital', patterns: [/desconexi[oó]n.*digital/i, /digital.*disconnect/i] },
  { key: 'remote_work', label: 'Teletrabajo', patterns: [/teletrabajo/i, /remote.*work/i, /trabajo.*distancia/i] },
  { key: 'prl', label: 'PRL / documentación preventiva', patterns: [/\bprl\b/i, /prevenci[oó]n.*riesgos/i, /occupational.*risk/i, /seguridad.*salud/i] },
];

function emptyLegalSnapshot(): LegalSnapshot {
  return {
    level: 'gray',
    score: null,
    label: 'Sin datos',
    hasData: false,
    blockers: 0,
    warnings: 0,
    disclaimer: LEGAL_DISCLAIMER,
    criticalAlerts: null,
    urgentAlerts: null,
    overdueObligations: null,
    pendingCommunications: null,
    totalAlerts: null,
    upcomingDeadlinesCount: null,
    sanctionRiskCount: null,
    potentialSanctionsMin: null,
    potentialSanctionsMax: null,
    coverageBullets: LEGAL_BULLET_DEFS.map(d => ({
      key: d.key,
      label: d.label,
      status: 'gray' as const,
      detail: 'Sin datos',
    })),
  };
}

function findObligation(obligations: any[], patterns: RegExp[]): any | null {
  for (const o of obligations) {
    const haystacks: string[] = [
      o?.obligation_name,
      o?.name,
      o?.code,
      o?.model_code,
      o?.obligation_type,
      o?.category,
      o?.organism,
      o?.legal_reference,
    ].filter(Boolean).map((s: any) => String(s));
    if (haystacks.length === 0) continue;
    for (const p of patterns) {
      if (haystacks.some(h => p.test(h))) return o;
    }
  }
  return null;
}

function bulletStatusFor(
  obligation: any | null,
  deadlines: any[],
  alerts: any[],
): { status: LegalBulletStatus; detail: string } {
  if (!obligation) return { status: 'gray', detail: 'Sin datos' };
  const obId = obligation.id;
  const relatedDeadlines = obId ? deadlines.filter(d => d?.obligation_id === obId) : [];
  const overdue = relatedDeadlines.filter(d => d?.status === 'overdue');
  const completed = relatedDeadlines.filter(d => d?.status === 'completed');
  const relatedAlerts = alerts.filter(a =>
    (obId && a?.obligation_id === obId)
    || (a?.risk?.legal_reference && obligation?.legal_reference
        && a.risk.legal_reference === obligation.legal_reference),
  );
  const critical = relatedAlerts.filter(a => a?.alert_level === 'critical').length;
  const urgent = relatedAlerts.filter(a => a?.alert_level === 'urgent').length;

  if (overdue.length > 0 || critical > 0) {
    return { status: 'red', detail: `${overdue.length} vencidas · ${critical} críticas` };
  }
  if (urgent > 0) {
    return { status: 'amber', detail: `${urgent} urgentes` };
  }
  if (completed.length > 0) {
    return { status: 'green', detail: `${completed.length} completadas` };
  }
  return { status: 'gray', detail: 'Detectada · sin actividad' };
}

export function computeLegalSnapshot(hook: any): LegalSnapshot {
  if (!hook) return emptyLegalSnapshot();

  const obligations: any[] = Array.isArray(hook.obligations) ? hook.obligations : [];
  const deadlines: any[] = Array.isArray(hook.deadlines) ? hook.deadlines : [];
  const sanctionRisks: any[] = Array.isArray(hook.sanctionRisks) ? hook.sanctionRisks : [];
  const alerts: any[] = Array.isArray(hook.alerts) ? hook.alerts : [];
  const upcoming: any[] = Array.isArray(hook.upcomingDeadlines) ? hook.upcomingDeadlines : [];
  const ra = hook.riskAssessment ?? null;

  const hasNoData = obligations.length === 0 && (ra === null || ra === undefined);
  if (hasNoData) {
    return emptyLegalSnapshot();
  }

  const criticalAlerts = safeNumber(ra?.critical_alerts) ?? 0;
  const urgentAlerts = safeNumber(ra?.urgent_alerts) ?? 0;
  const overdueObligations = safeNumber(ra?.overdue_obligations) ?? 0;
  const pendingCommunications = safeNumber(ra?.pending_communications) ?? 0;
  const totalAlerts = safeNumber(ra?.total_alerts) ?? alerts.length;
  const potentialSanctionsMin = safeNumber(ra?.potential_sanctions_min);
  const potentialSanctionsMax = safeNumber(ra?.potential_sanctions_max);

  // Score (formula from spec)
  const score = Math.round(clamp(
    100
      - 25 * criticalAlerts
      - 15 * urgentAlerts
      - 10 * overdueObligations
      - 5 * pendingCommunications,
  ));

  // Level
  let level: ReadinessLevel = 'green';
  let blockers = 0;
  let warnings = 0;
  let label = 'Compliance legal';

  if (criticalAlerts > 0) {
    level = 'red';
    blockers += criticalAlerts;
    label = 'Riesgo crítico legal';
  }
  if (overdueObligations > 0) {
    level = 'red';
    blockers += overdueObligations;
    if (label === 'Compliance legal') label = 'Obligaciones vencidas';
  }
  if (urgentAlerts > 0 || pendingCommunications > 0) {
    if (level !== 'red') {
      level = 'amber';
      label = 'Revisión legal pendiente';
    }
    warnings += urgentAlerts + pendingCommunications;
  }
  if (level === 'green') {
    label = 'Sin bloqueos críticos';
  }

  // Coverage bullets (defensive — ghost match returns gray)
  const coverageBullets: LegalCoverageBullet[] = LEGAL_BULLET_DEFS.map(def => {
    const found = findObligation(obligations, def.patterns);
    const bs = bulletStatusFor(found, deadlines, alerts);
    return {
      key: def.key,
      label: def.label,
      status: bs.status,
      detail: bs.detail,
    };
  });

  return {
    level,
    score,
    label,
    hasData: true,
    blockers,
    warnings,
    disclaimer: LEGAL_DISCLAIMER,
    criticalAlerts,
    urgentAlerts,
    overdueObligations,
    pendingCommunications,
    totalAlerts,
    upcomingDeadlinesCount: upcoming.length,
    sanctionRiskCount: sanctionRisks.length,
    potentialSanctionsMin,
    potentialSanctionsMax,
    coverageBullets,
  };
}