/**
 * hrCommandCenterAlerts — Phase 3 (pure, read-only)
 *
 * Computes blockers, warnings, top 5 risks, top 5 actions and next deadlines
 * from the snapshots already produced in `useHRCommandCenter`. NEVER fetches,
 * NEVER writes, NEVER triggers AI. Legal/official actions ALWAYS require human
 * review. VPT remains internal_ready. Official integrations are reflected as-is
 * (no elevation beyond the snapshot from Phase 2C).
 *
 * INVARIANTES:
 *  - Read-only · no edge functions · no migrations · no RLS.
 *  - persisted_priority_apply OFF · C3B3C2 BLOCKED.
 */
import type {
  PayrollSnapshot,
  DocumentarySnapshot,
  LegalSnapshot,
  VPTSnapshot,
  GlobalStateSnapshot,
} from '@/hooks/erp/hr/useHRCommandCenter';
import type { OfficialIntegrationsSnapshot } from '@/hooks/erp/hr/useOfficialIntegrationsSnapshot';

// ── Types ───────────────────────────────────────────────────────────────────

export type HRRiskSource =
  | 'payroll' | 'documentary' | 'legal' | 'vpt' | 'official' | 'workforce';

export type HRRiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export type HRCtaTarget =
  | 'payroll' | 'expedient' | 'compliance' | 'vpt' | 'integrations' | 'employees';

export interface HRCommandCenterRisk {
  id: string;
  source: HRRiskSource;
  severity: HRRiskSeverity;
  title: string;
  description: string;
  dueDate?: string | null;
  scoreImpact?: number;
  ctaLabel?: string;
  ctaTarget?: HRCtaTarget;
  evidenceRequired?: boolean;
  isOfficial?: boolean;
  isInternalOnly?: boolean;
  blocksClose?: boolean;
  requiresHumanReview?: boolean;
}

export interface HRCommandCenterAction {
  id: string;
  source: HRRiskSource;
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  reason: string;
  ctaLabel: string;
  ctaTarget: HRCtaTarget;
  deadline?: string | null;
  blocksClose: boolean;
  requiresHumanReview: boolean;
}

export interface HRCommandCenterAlertsSnapshot {
  blockers: HRCommandCenterRisk[];
  warnings: HRCommandCenterRisk[];
  topRisks: HRCommandCenterRisk[];
  topActions: HRCommandCenterAction[];
  nextDeadlines: HRCommandCenterRisk[];
  criticalCount: number;
  warningCount: number;
  actionCount: number;
  disclaimer: string;
}

export interface AlertsInput {
  payroll: PayrollSnapshot;
  documentary: DocumentarySnapshot;
  legal: LegalSnapshot;
  vpt: VPTSnapshot;
  officialIntegrations: OfficialIntegrationsSnapshot;
  global: GlobalStateSnapshot;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const ALERTS_DISCLAIMER =
  'Lectura interna de riesgos y acciones. No constituye certificación legal ni presentación oficial. Las acciones legales u oficiales requieren revisión humana.';

const SEVERITY_SCORE: Record<HRRiskSeverity, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 10,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(due?: string | null): number | null {
  if (!due) return null;
  const t = Date.parse(String(due));
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86_400_000);
}

function computeScore(risk: HRCommandCenterRisk): number {
  let s = SEVERITY_SCORE[risk.severity];
  if (risk.blocksClose) s += 50;
  if (risk.evidenceRequired) s += 35;
  const d = daysUntil(risk.dueDate);
  if (d !== null) {
    if (d <= 7) s += 25;
    else if (d <= 30) s += 10;
  }
  return s;
}

// ── Risk builders per source ───────────────────────────────────────────────

function payrollRisks(p: PayrollSnapshot): HRCommandCenterRisk[] {
  if (!p.hasData) return [];
  const out: HRCommandCenterRisk[] = [];
  if (p.closableState === 'blocked' || p.level === 'red') {
    out.push({
      id: 'payroll:close-blocked',
      source: 'payroll',
      severity: 'critical',
      title: 'Cierre de nómina bloqueado',
      description: `Preflight nómina en estado ${p.periodStatus ?? 'bloqueado'}. Resuelve incidencias antes del cierre.`,
      ctaLabel: 'Abrir nómina',
      ctaTarget: 'payroll',
      blocksClose: true,
    });
  }
  if (p.blockers > 0 && p.closableState !== 'blocked' && p.level !== 'red') {
    out.push({
      id: 'payroll:blockers',
      source: 'payroll',
      severity: 'critical',
      title: 'Bloqueos en preflight de nómina',
      description: `${p.blockers} bloqueo(s) detectados en el preflight.`,
      ctaLabel: 'Abrir nómina',
      ctaTarget: 'payroll',
      blocksClose: true,
    });
  }
  if (p.periodStatus === 'at_risk') {
    out.push({
      id: 'payroll:at-risk',
      source: 'payroll',
      severity: 'high',
      title: 'Periodo de nómina en riesgo',
      description: 'El preflight reporta el periodo como "at_risk".',
      ctaLabel: 'Abrir nómina',
      ctaTarget: 'payroll',
    });
  }
  if (p.warnings > 0) {
    out.push({
      id: 'payroll:warnings',
      source: 'payroll',
      severity: 'medium',
      title: 'Avisos en preflight de nómina',
      description: `${p.warnings} aviso(s) detectado(s).`,
      ctaLabel: 'Abrir nómina',
      ctaTarget: 'payroll',
    });
  }
  return out;
}

function documentaryRisks(d: DocumentarySnapshot): HRCommandCenterRisk[] {
  if (!d.hasData) return [];
  const out: HRCommandCenterRisk[] = [];
  const total = d.total ?? 0;
  const unverified = d.unverified ?? 0;
  const expiring = d.expiringSoon ?? 0;
  if (d.level === 'red' || (total > 0 && unverified > total * 0.5)) {
    out.push({
      id: 'documentary:high-risk',
      source: 'documentary',
      severity: 'high',
      title: 'Expediente documental con riesgo elevado',
      description: `${unverified} documento(s) sin verificar de ${total}.`,
      ctaLabel: 'Abrir expediente',
      ctaTarget: 'expedient',
    });
  } else if (unverified > 0) {
    out.push({
      id: 'documentary:unverified',
      source: 'documentary',
      severity: 'medium',
      title: 'Documentos sin verificar',
      description: `${unverified} documento(s) pendientes de verificación.`,
      ctaLabel: 'Abrir expediente',
      ctaTarget: 'expedient',
    });
  }
  if (expiring > 0) {
    out.push({
      id: 'documentary:expiring',
      source: 'documentary',
      severity: 'medium',
      title: 'Documentos próximos a vencer',
      description: `${expiring} documento(s) próximos a caducar.`,
      ctaLabel: 'Abrir expediente',
      ctaTarget: 'expedient',
    });
  }
  return out;
}

function legalRisks(l: LegalSnapshot): HRCommandCenterRisk[] {
  if (!l.hasData) return [];
  const out: HRCommandCenterRisk[] = [];
  if ((l.criticalAlerts ?? 0) > 0) {
    out.push({
      id: 'legal:critical-alerts',
      source: 'legal',
      severity: 'critical',
      title: 'Alertas legales críticas',
      description: `${l.criticalAlerts} alerta(s) crítica(s) de compliance.`,
      ctaLabel: 'Abrir compliance',
      ctaTarget: 'compliance',
      requiresHumanReview: true,
    });
  }
  if ((l.overdueObligations ?? 0) > 0) {
    out.push({
      id: 'legal:overdue',
      source: 'legal',
      severity: 'critical',
      title: 'Obligaciones legales vencidas',
      description: `${l.overdueObligations} obligación(es) vencida(s).`,
      ctaLabel: 'Abrir compliance',
      ctaTarget: 'compliance',
      evidenceRequired: true,
      requiresHumanReview: true,
    });
  }
  if ((l.urgentAlerts ?? 0) > 0) {
    out.push({
      id: 'legal:urgent',
      source: 'legal',
      severity: 'high',
      title: 'Alertas legales urgentes',
      description: `${l.urgentAlerts} alerta(s) urgente(s).`,
      ctaLabel: 'Abrir compliance',
      ctaTarget: 'compliance',
      requiresHumanReview: true,
    });
  }
  if ((l.pendingCommunications ?? 0) > 0) {
    out.push({
      id: 'legal:communications',
      source: 'legal',
      severity: 'medium',
      title: 'Comunicaciones legales pendientes',
      description: `${l.pendingCommunications} comunicación(es) pendientes.`,
      ctaLabel: 'Abrir compliance',
      ctaTarget: 'compliance',
      requiresHumanReview: true,
    });
  }
  // Coverage bullets red/amber, máximo 2
  const offending = (l.coverageBullets ?? [])
    .filter(b => b.status === 'red' || b.status === 'amber')
    .slice(0, 2);
  for (const b of offending) {
    out.push({
      id: `legal:bullet:${b.key}`,
      source: 'legal',
      severity: b.status === 'red' ? 'high' : 'medium',
      title: `Cobertura legal pendiente: ${b.label}`,
      description: b.detail,
      ctaLabel: 'Abrir compliance',
      ctaTarget: 'compliance',
      requiresHumanReview: true,
    });
  }
  return out;
}

function vptRisks(v: VPTSnapshot): HRCommandCenterRisk[] {
  if (!v.hasData) return [];
  const out: HRCommandCenterRisk[] = [];
  const internal = { isInternalOnly: true } as const;
  if ((v.approvedWithoutVersionId ?? 0) > 0) {
    out.push({
      id: 'vpt:no-version-id',
      source: 'vpt',
      severity: 'critical',
      title: 'Valoraciones VPT aprobadas sin version_id',
      description: `${v.approvedWithoutVersionId} valoración(es) aprobadas sin snapshot inmutable.`,
      ctaLabel: 'Abrir VPT',
      ctaTarget: 'vpt',
      ...internal,
    });
  }
  if ((v.approvedCount ?? 0) === 0 && (v.totalPositions ?? 0) > 0) {
    out.push({
      id: 'vpt:no-approvals',
      source: 'vpt',
      severity: 'high',
      title: 'VPT sin aprobaciones',
      description: `${v.totalPositions} puesto(s) sin valoración aprobada.`,
      ctaLabel: 'Abrir VPT',
      ctaTarget: 'vpt',
      ...internal,
    });
  }
  if ((v.incoherencesCount ?? 0) > 0) {
    out.push({
      id: 'vpt:incoherences',
      source: 'vpt',
      severity: 'medium',
      title: 'Incoherencias VPT',
      description: `${v.incoherencesCount} incoherencia(s) detectada(s).`,
      ctaLabel: 'Abrir VPT',
      ctaTarget: 'vpt',
      ...internal,
    });
  }
  if (v.coverage !== null && v.coverage < 80 && (v.totalPositions ?? 0) > 0) {
    out.push({
      id: 'vpt:coverage',
      source: 'vpt',
      severity: 'medium',
      title: 'Cobertura VPT < 80%',
      description: `Cobertura actual: ${v.coverage}%.`,
      ctaLabel: 'Abrir VPT',
      ctaTarget: 'vpt',
      ...internal,
    });
  }
  return out;
}

function officialRisks(o: OfficialIntegrationsSnapshot): HRCommandCenterRisk[] {
  if (!o.hasData) return [];
  const out: HRCommandCenterRisk[] = [];
  const officialBase = { isOfficial: true, requiresHumanReview: true } as const;

  // Rejected items (max 3)
  const rejected = o.items.filter(i => i.displayedState === 'rejected').slice(0, 3);
  for (const it of rejected) {
    out.push({
      id: `official:rejected:${it.key}`,
      source: 'official',
      severity: 'critical',
      title: `Envío oficial rechazado: ${it.label}`,
      description: 'El conector reporta un rechazo en el último envío. Requiere revisión humana antes de reintentar.',
      ctaLabel: 'Abrir integraciones',
      ctaTarget: 'integrations',
      ...officialBase,
    });
  }

  // Correction required (max 3)
  const corrections = o.items
    .filter(i => i.displayedState === 'correction_required')
    .slice(0, 3);
  for (const it of corrections) {
    out.push({
      id: `official:correction:${it.key}`,
      source: 'official',
      severity: 'high',
      title: `Corrección oficial requerida: ${it.label}`,
      description: 'El conector requiere corrección antes de reintentar.',
      ctaLabel: 'Abrir integraciones',
      ctaTarget: 'integrations',
      ...officialBase,
    });
  }

  // Degraded (max 3) — evidence required
  const degraded = o.items.filter(i => i.degraded).slice(0, 3);
  for (const it of degraded) {
    out.push({
      id: `official:degraded:${it.key}`,
      source: 'official',
      severity: 'high',
      title: `Estado oficial no elevable: ${it.label}`,
      description: it.warning ?? 'El estado se ha degradado por falta de evidencia oficial archivada.',
      ctaLabel: 'Abrir integraciones',
      ctaTarget: 'integrations',
      evidenceRequired: true,
      ...officialBase,
    });
  }

  // Not configured when others ARE configured
  const anyConfigured = o.items.some(i => i.displayedState !== 'not_configured');
  if (anyConfigured) {
    const notConfigured = o.items
      .filter(i => i.displayedState === 'not_configured')
      .slice(0, 3);
    for (const it of notConfigured) {
      out.push({
        id: `official:not-configured:${it.key}`,
        source: 'official',
        severity: 'low',
        title: `${it.label}: sin configurar`,
        description: 'Conector sin configurar mientras otros conectores están activos.',
        ctaLabel: 'Abrir integraciones',
        ctaTarget: 'integrations',
        ...officialBase,
      });
    }
  }

  return out;
}

function workforceRisks(g: GlobalStateSnapshot): HRCommandCenterRisk[] {
  if (!g.hasData) return [];
  const active = g.activeEmployees ?? 0;
  const dep = g.departuresMonth ?? 0;
  if (active <= 0) return [];
  const ratio = dep / active;
  if (ratio > 0.10) {
    return [{
      id: 'workforce:turnover',
      source: 'workforce',
      severity: 'medium',
      title: 'Rotación elevada del mes',
      description: `${dep} salida(s) sobre ${active} empleados activos (${Math.round(ratio * 100)}%).`,
      ctaLabel: 'Ver plantilla',
      ctaTarget: 'employees',
    }];
  }
  return [];
}

// ── Boost-aware ranking ────────────────────────────────────────────────────

function boostScore(r: HRCommandCenterRisk): number {
  let s = computeScore(r);
  // Source-specific boosts
  if (r.source === 'official' && r.id.startsWith('official:rejected:')) s += 50;
  if (r.source === 'official' && r.id.startsWith('official:degraded:')) s += 35;
  if (r.source === 'legal' && r.id === 'legal:critical-alerts') s += 50;
  if (r.source === 'legal' && r.id === 'legal:overdue') s += 40;
  if (r.source === 'vpt' && r.id === 'vpt:no-version-id') s += 45;
  if (r.source === 'vpt' && r.id === 'vpt:no-approvals') s += 40;
  if (r.source === 'documentary' && r.id === 'documentary:high-risk') s += 30;
  return s;
}

/** Round-robin selection: avoid saturating top-N with one single source. */
function pickTopWithRoundRobin(
  ranked: HRCommandCenterRisk[],
  limit: number,
): HRCommandCenterRisk[] {
  if (ranked.length <= limit) return ranked;
  // Group by source, preserving rank order
  const groups = new Map<HRRiskSource, HRCommandCenterRisk[]>();
  for (const r of ranked) {
    const arr = groups.get(r.source) ?? [];
    arr.push(r);
    groups.set(r.source, arr);
  }
  // Always seat criticals first regardless of round-robin
  const out: HRCommandCenterRisk[] = [];
  const seen = new Set<string>();
  for (const r of ranked) {
    if (out.length >= limit) break;
    if (r.severity === 'critical') {
      out.push(r);
      seen.add(r.id);
    }
  }
  // Then round-robin across remaining sources
  const sources = Array.from(groups.keys());
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (const src of sources) {
      if (out.length >= limit) break;
      const next = (groups.get(src) ?? []).find(x => !seen.has(x.id));
      if (next) {
        out.push(next);
        seen.add(next.id);
        progressed = true;
      }
    }
  }
  return out;
}

// ── Action templating ───────────────────────────────────────────────────────

const ACTION_TEMPLATE: Record<HRRiskSource, {
  ctaLabel: string;
  ctaTarget: HRCtaTarget;
  requiresHumanReview: boolean;
}> = {
  payroll:     { ctaLabel: 'Abrir nómina',        ctaTarget: 'payroll',      requiresHumanReview: false },
  documentary: { ctaLabel: 'Abrir expediente',    ctaTarget: 'expedient',    requiresHumanReview: false },
  legal:       { ctaLabel: 'Abrir compliance',    ctaTarget: 'compliance',   requiresHumanReview: true  },
  vpt:         { ctaLabel: 'Abrir VPT',           ctaTarget: 'vpt',          requiresHumanReview: false },
  official:    { ctaLabel: 'Abrir integraciones', ctaTarget: 'integrations', requiresHumanReview: true  },
  workforce:   { ctaLabel: 'Ver plantilla',       ctaTarget: 'employees',    requiresHumanReview: false },
};

function actionTitleFor(r: HRCommandCenterRisk): string {
  // Map a few specific risks to clearer action titles
  if (r.id === 'payroll:close-blocked') return 'Desbloquear cierre de nómina';
  if (r.id === 'payroll:blockers')      return 'Resolver bloqueos de preflight';
  if (r.id === 'payroll:warnings')      return 'Revisar avisos de preflight';
  if (r.id === 'documentary:unverified')return 'Revisar documentos sin verificar';
  if (r.id === 'documentary:expiring')  return 'Renovar documentos próximos a vencer';
  if (r.id === 'documentary:high-risk') return 'Sanear expediente documental';
  if (r.id === 'legal:critical-alerts') return 'Atender alertas legales críticas';
  if (r.id === 'legal:overdue')         return 'Resolver obligaciones legales vencidas';
  if (r.id === 'legal:urgent')          return 'Atender alertas legales urgentes';
  if (r.id === 'legal:communications')  return 'Atender comunicaciones legales';
  if (r.id === 'vpt:no-version-id')     return 'Resolver VPT aprobadas sin version_id';
  if (r.id === 'vpt:no-approvals')      return 'Aprobar valoraciones VPT';
  if (r.id === 'vpt:incoherences')      return 'Revisar incoherencias VPT';
  if (r.id === 'vpt:coverage')          return 'Completar cobertura VPT';
  if (r.id.startsWith('official:rejected:'))      return `Revisar rechazo oficial: ${r.title.replace(/^.*?:\s*/, '')}`;
  if (r.id.startsWith('official:correction:'))    return `Aplicar corrección oficial: ${r.title.replace(/^.*?:\s*/, '')}`;
  if (r.id.startsWith('official:degraded:'))      return `Adjuntar evidencia oficial: ${r.title.replace(/^.*?:\s*/, '')}`;
  if (r.id.startsWith('official:not-configured:'))return `Configurar integración: ${r.title.replace(/:.*$/, '')}`;
  if (r.id === 'workforce:turnover')    return 'Revisar rotación del mes';
  return r.title;
}

function actionFromRisk(
  r: HRCommandCenterRisk,
  priority: 1 | 2 | 3 | 4 | 5,
): HRCommandCenterAction {
  const tpl = ACTION_TEMPLATE[r.source];
  return {
    id: `${r.source}:action:${r.id}`,
    source: r.source,
    priority,
    title: actionTitleFor(r),
    description: r.description,
    reason: r.title,
    ctaLabel: r.ctaLabel ?? tpl.ctaLabel,
    ctaTarget: r.ctaTarget ?? tpl.ctaTarget,
    deadline: r.dueDate ?? null,
    blocksClose: !!r.blocksClose,
    requiresHumanReview: tpl.requiresHumanReview || !!r.requiresHumanReview,
  };
}

// ── Main entry ──────────────────────────────────────────────────────────────

export function computeAlertsSnapshot(input: AlertsInput): HRCommandCenterAlertsSnapshot {
  const all: HRCommandCenterRisk[] = [
    ...payrollRisks(input.payroll),
    ...documentaryRisks(input.documentary),
    ...legalRisks(input.legal),
    ...vptRisks(input.vpt),
    ...officialRisks(input.officialIntegrations),
    ...workforceRisks(input.global),
  ];

  // Annotate scoreImpact for transparency / debugging
  const scored = all.map(r => ({ ...r, scoreImpact: boostScore(r) }));

  // Deduplicate by source+title (keep highest score)
  const dedup = new Map<string, HRCommandCenterRisk>();
  for (const r of scored) {
    const key = `${r.source}:${r.title}`;
    const prev = dedup.get(key);
    if (!prev || (prev.scoreImpact ?? 0) < (r.scoreImpact ?? 0)) {
      dedup.set(key, r);
    }
  }
  const deduped = Array.from(dedup.values());

  // Sort by score desc (stable)
  const ranked = [...deduped].sort(
    (a, b) => (b.scoreImpact ?? 0) - (a.scoreImpact ?? 0),
  );

  const blockers = ranked.filter(r => r.severity === 'critical');
  const warnings = ranked.filter(r => r.severity !== 'critical');

  const topRisks = pickTopWithRoundRobin(ranked, 5);

  const topActions = topRisks
    .slice(0, 5)
    .map((r, idx) => actionFromRisk(r, (idx + 1) as 1 | 2 | 3 | 4 | 5));

  const nextDeadlines = ranked
    .filter(r => !!r.dueDate)
    .sort((a, b) => {
      const ta = Date.parse(String(a.dueDate)) || 0;
      const tb = Date.parse(String(b.dueDate)) || 0;
      return ta - tb;
    })
    .slice(0, 5);

  return {
    blockers,
    warnings,
    topRisks,
    topActions,
    nextDeadlines,
    criticalCount: blockers.length,
    warningCount: warnings.length,
    actionCount: topActions.length,
    disclaimer: ALERTS_DISCLAIMER,
  };
}

export default computeAlertsSnapshot;