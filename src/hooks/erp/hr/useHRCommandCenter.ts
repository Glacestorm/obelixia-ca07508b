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

export interface HRCommandCenterData {
  isLoading: boolean;
  globalReadiness: SectionReadiness;
  global: GlobalStateSnapshot;
  payroll: PayrollSnapshot;
  documentary: DocumentarySnapshot;
  legal: PlaceholderSnapshot;
  vpt: PlaceholderSnapshot;
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

  return useMemo<HRCommandCenterData>(() => {
    const isLoading = Boolean(
      (exec as any)?.isLoading || preflight?.isLoading || (docs as any)?.isLoadingDocuments,
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

    const legal = placeholder(
      'Compliance legal',
      'Sin evidencia oficial archivada — pendiente Fase 2',
    );
    const vpt = placeholder(
      'VPT / S9',
      'internal_ready · no constituye certificación oficial regulatoria',
    );
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
  }, [exec, preflight, docs]);
}

export default useHRCommandCenter;