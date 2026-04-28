/**
 * HR Command Center · Phase 3 — Alerts & Actions
 *
 * Validates `computeAlertsSnapshot` (pure) and the rendering of
 * `HRCCAlertsAndBlockersCard`. No fetches · no edge functions · no flags
 * · no migrations. VPT internal_ready · official integrations not elevated.
 *
 * Run:
 *   bunx vitest run src/__tests__/hr/command-center-alerts-actions.test.tsx
 *   bunx vitest run src/__tests__/hr/
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  computeAlertsSnapshot,
  ALERTS_DISCLAIMER,
  type AlertsInput,
} from '@/hooks/erp/hr/hrCommandCenterAlerts';

import { buildOfficialIntegrationsSnapshot } from '@/hooks/erp/hr/useOfficialIntegrationsSnapshot';

// ── Snapshot factories ──────────────────────────────────────────────────────

function emptyGlobal() {
  return {
    level: 'gray' as const, score: null, label: 'Sin datos', hasData: false,
    blockers: 0, warnings: 0,
    activeEmployees: null, newHiresMonth: null, departuresMonth: null, onLeave: null,
  };
}
function emptyPayroll() {
  return {
    level: 'gray' as const, score: null, label: 'Sin datos', hasData: false,
    blockers: 0, warnings: 0,
    periodStatus: null, pendingIncidents: null, closableState: 'unknown' as const,
  };
}
function emptyDocumentary() {
  return {
    level: 'gray' as const, score: null, label: 'Sin datos', hasData: false,
    blockers: 0, warnings: 0,
    total: null, expiringSoon: null, unverified: null, activeConsents: null,
  };
}
function emptyLegal() {
  return {
    level: 'gray' as const, score: null, label: 'Sin datos', hasData: false,
    blockers: 0, warnings: 0,
    disclaimer: 'x',
    criticalAlerts: null, urgentAlerts: null, overdueObligations: null,
    pendingCommunications: null, totalAlerts: null, upcomingDeadlinesCount: null,
    sanctionRiskCount: null, potentialSanctionsMin: null, potentialSanctionsMax: null,
    coverageBullets: [],
  };
}
function emptyVPT() {
  return {
    level: 'gray' as const, score: null, label: 'Sin datos', hasData: false,
    blockers: 0, warnings: 0,
    status: 'internal_ready' as const, disclaimer: 'x',
    totalPositions: null, valuatedPositions: null, coverage: null,
    approvedCount: null, approvedWithVersionId: null, approvedWithoutVersionId: null,
    incoherencesCount: null,
  };
}
function emptyOfficial() {
  return buildOfficialIntegrationsSnapshot({ submissions: [], certificates: [], adapters: [] });
}
function emptyInput(): AlertsInput {
  return {
    payroll: emptyPayroll(),
    documentary: emptyDocumentary(),
    legal: emptyLegal(),
    vpt: emptyVPT(),
    officialIntegrations: emptyOfficial(),
    global: emptyGlobal(),
  };
}

// ── Pure tests ──────────────────────────────────────────────────────────────

describe('computeAlertsSnapshot · Phase 3 (pure)', () => {
  it('1. payroll blocked → critical risk + payroll action with blocksClose=true', () => {
    const snap = computeAlertsSnapshot({
      ...emptyInput(),
      payroll: {
        ...emptyPayroll(),
        hasData: true, level: 'red', score: 30, label: 'Preflight', blockers: 2, warnings: 1,
        periodStatus: 'blocked', closableState: 'blocked',
      },
    });
    const r = snap.topRisks.find(x => x.source === 'payroll' && x.severity === 'critical');
    expect(r).toBeTruthy();
    expect(r!.blocksClose).toBe(true);
    const a = snap.topActions.find(x => x.source === 'payroll');
    expect(a).toBeTruthy();
    expect(a!.blocksClose).toBe(true);
    expect(a!.ctaTarget).toBe('payroll');
  });

  it('2. legal criticalAlerts > 0 → critical risk + action requiresHumanReview=true', () => {
    const snap = computeAlertsSnapshot({
      ...emptyInput(),
      legal: {
        ...emptyLegal(),
        hasData: true, level: 'red', score: 25, label: 'Crítico',
        criticalAlerts: 2, urgentAlerts: 0, overdueObligations: 0,
        pendingCommunications: 0, totalAlerts: 2,
      },
    });
    const r = snap.topRisks.find(x => x.source === 'legal' && x.severity === 'critical');
    expect(r).toBeTruthy();
    expect(r!.requiresHumanReview).toBe(true);
    const a = snap.topActions.find(x => x.source === 'legal');
    expect(a).toBeTruthy();
    expect(a!.requiresHumanReview).toBe(true);
    expect(a!.ctaTarget).toBe('compliance');
  });

  it('3. VPT approvedWithoutVersionId > 0 → critical risk + version_id action, isInternalOnly', () => {
    const snap = computeAlertsSnapshot({
      ...emptyInput(),
      vpt: {
        ...emptyVPT(),
        hasData: true, level: 'red', score: 20, label: 'VPT sin version_id',
        totalPositions: 10, valuatedPositions: 8, coverage: 80,
        approvedCount: 5, approvedWithVersionId: 2, approvedWithoutVersionId: 3,
        incoherencesCount: 0,
      },
    });
    const r = snap.topRisks.find(x => x.id === 'vpt:no-version-id');
    expect(r).toBeTruthy();
    expect(['critical', 'high']).toContain(r!.severity);
    expect(r!.isInternalOnly).toBe(true);
    const a = snap.topActions.find(x => x.source === 'vpt');
    expect(a).toBeTruthy();
    expect(a!.title).toMatch(/version_id/i);
    expect(a!.ctaTarget).toBe('vpt');
  });

  it('4. official rejected → critical risk isOfficial=true + action requiresHumanReview=true', () => {
    const official = buildOfficialIntegrationsSnapshot({
      submissions: [{
        submission_domain: 'tgss', submission_type: 'afiliacion',
        status: 'rejected', updated_at: '2026-04-01T00:00:00Z',
      }],
      certificates: [], adapters: [],
    });
    const snap = computeAlertsSnapshot({ ...emptyInput(), officialIntegrations: official });
    const r = snap.topRisks.find(x => x.source === 'official' && x.severity === 'critical');
    expect(r).toBeTruthy();
    expect(r!.isOfficial).toBe(true);
    const a = snap.topActions.find(x => x.source === 'official');
    expect(a).toBeTruthy();
    expect(a!.requiresHumanReview).toBe(true);
    expect(a!.ctaTarget).toBe('integrations');
  });

  it('5. official degraded (accepted sin evidencia) → high risk evidenceRequired + action adjuntar evidencia', () => {
    const official = buildOfficialIntegrationsSnapshot({
      submissions: [{
        submission_domain: 'tgss', submission_type: 'afiliacion',
        status: 'accepted', updated_at: '2026-04-01T00:00:00Z',
      }],
      certificates: [], adapters: [],
    });
    const snap = computeAlertsSnapshot({ ...emptyInput(), officialIntegrations: official });
    const r = snap.topRisks.find(x => x.id.startsWith('official:degraded:'));
    expect(r).toBeTruthy();
    expect(r!.severity).toBe('high');
    expect(r!.evidenceRequired).toBe(true);
    expect(r!.isOfficial).toBe(true);
    const a = snap.topActions.find(x => x.id.includes('degraded'));
    expect(a).toBeTruthy();
    expect(a!.title.toLowerCase()).toMatch(/evidencia/);
    expect(a!.requiresHumanReview).toBe(true);
  });

  it('6. documentary unverified/expiringSoon → warnings (no critical) + acciones documentales', () => {
    const snap = computeAlertsSnapshot({
      ...emptyInput(),
      documentary: {
        ...emptyDocumentary(),
        hasData: true, level: 'amber', score: 60, label: 'Doc',
        total: 100, expiringSoon: 5, unverified: 8, activeConsents: 50,
      },
    });
    expect(snap.criticalCount).toBe(0);
    expect(snap.warningCount).toBeGreaterThan(0);
    const docs = snap.topActions.filter(a => a.source === 'documentary');
    expect(docs.length).toBeGreaterThan(0);
    docs.forEach(a => expect(a.ctaTarget).toBe('expedient'));
  });

  it('7. top risks limited to 5 with critical first', () => {
    // Build many risks across all sources
    const official = buildOfficialIntegrationsSnapshot({
      submissions: [
        { submission_domain: 'tgss', submission_type: 'afi', status: 'rejected', updated_at: '2026-04-01' },
        { submission_domain: 'siltra', submission_type: 'rlc', status: 'rejected', updated_at: '2026-04-01' },
        { submission_domain: 'aeat', submission_type: '111', status: 'rejected', updated_at: '2026-04-01' },
      ],
      certificates: [], adapters: [],
    });
    const snap = computeAlertsSnapshot({
      ...emptyInput(),
      payroll: { ...emptyPayroll(), hasData: true, level: 'red', score: 10, label: 'x', blockers: 1, warnings: 3, periodStatus: 'blocked', closableState: 'blocked' },
      documentary: { ...emptyDocumentary(), hasData: true, level: 'amber', score: 50, label: 'x', total: 50, unverified: 5, expiringSoon: 3, activeConsents: 10 },
      legal: { ...emptyLegal(), hasData: true, level: 'red', score: 0, label: 'x', criticalAlerts: 1, urgentAlerts: 2, overdueObligations: 1, pendingCommunications: 1, totalAlerts: 5 },
      vpt: { ...emptyVPT(), hasData: true, level: 'red', score: 10, label: 'x', totalPositions: 10, valuatedPositions: 5, coverage: 50, approvedCount: 5, approvedWithVersionId: 2, approvedWithoutVersionId: 3, incoherencesCount: 2 },
      officialIntegrations: official,
    });
    expect(snap.topRisks.length).toBeLessThanOrEqual(5);
    // First risk is critical
    expect(snap.topRisks[0].severity).toBe('critical');
    // No medium/low before any critical
    let seenNonCritical = false;
    for (const r of snap.topRisks) {
      if (r.severity !== 'critical') seenNonCritical = true;
      if (seenNonCritical) {
        expect(r.severity).not.toBe('critical');
      }
    }
  });

  it('8. top actions limited to 5; legal/official have requiresHumanReview=true', () => {
    const official = buildOfficialIntegrationsSnapshot({
      submissions: [{ submission_domain: 'tgss', submission_type: 'afi', status: 'rejected', updated_at: '2026-04-01' }],
      certificates: [], adapters: [],
    });
    const snap = computeAlertsSnapshot({
      ...emptyInput(),
      legal: { ...emptyLegal(), hasData: true, level: 'red', score: 0, label: 'x', criticalAlerts: 1, urgentAlerts: 0, overdueObligations: 0, pendingCommunications: 0, totalAlerts: 1 },
      officialIntegrations: official,
    });
    expect(snap.topActions.length).toBeLessThanOrEqual(5);
    snap.topActions
      .filter(a => a.source === 'legal' || a.source === 'official')
      .forEach(a => expect(a.requiresHumanReview).toBe(true));
  });

  it('9. no data anywhere → empty arrays + disclaimer', () => {
    const snap = computeAlertsSnapshot(emptyInput());
    expect(snap.blockers).toEqual([]);
    expect(snap.warnings).toEqual([]);
    expect(snap.topRisks).toEqual([]);
    expect(snap.topActions).toEqual([]);
    expect(snap.nextDeadlines).toEqual([]);
    expect(snap.disclaimer).toBe(ALERTS_DISCLAIMER);
  });
});

// ── Render test ─────────────────────────────────────────────────────────────

const mockUseHRCommandCenter = vi.fn();
vi.mock('@/hooks/erp/hr/useHRCommandCenter', async () => {
  const actual: any = await vi.importActual('@/hooks/erp/hr/useHRCommandCenter');
  return {
    ...actual,
    useHRCommandCenter: (id: string) => mockUseHRCommandCenter(id),
  };
});

import { HRCommandCenterPanel } from '@/components/erp/hr/command-center/HRCommandCenterPanel';
import type { HRCommandCenterData } from '@/hooks/erp/hr/useHRCommandCenter';

function buildPanelData(overrides: Partial<HRCommandCenterData> = {}): HRCommandCenterData {
  const base: HRCommandCenterData = {
    isLoading: false,
    globalReadiness: { level: 'gray', score: null, label: 'x', hasData: false, blockers: 0, warnings: 0 },
    global: emptyGlobal(),
    payroll: emptyPayroll(),
    documentary: emptyDocumentary(),
    legal: { ...emptyLegal(), disclaimer: 'd' },
    vpt: { ...emptyVPT(), disclaimer: 'd' },
    officialIntegrations: emptyOfficial(),
    alerts: computeAlertsSnapshot(emptyInput()),
  };
  return { ...base, ...overrides };
}

describe('HRCCAlertsAndBlockersCard · Phase 3 render', () => {
  beforeEach(() => mockUseHRCommandCenter.mockReset());

  it('10A. shows disclaimer + empty state when no alerts', () => {
    mockUseHRCommandCenter.mockReturnValue(buildPanelData());
    render(<HRCommandCenterPanel companyId="co-1" />);
    const disclaimer = screen.getByTestId('hr-cc-alerts-disclaimer');
    expect(disclaimer.textContent || '').toMatch(/Lectura interna de riesgos/i);
    expect(screen.getByTestId('hr-cc-alerts-empty')).toBeInTheDocument();
  });

  it('10B. renders top risks, top actions and human-review chip when official+legal present', () => {
    const official = buildOfficialIntegrationsSnapshot({
      submissions: [{ submission_domain: 'tgss', submission_type: 'afi', status: 'rejected', updated_at: '2026-04-01' }],
      certificates: [], adapters: [],
    });
    const alerts = computeAlertsSnapshot({
      ...emptyInput(),
      legal: { ...emptyLegal(), hasData: true, level: 'red', score: 0, label: 'x', criticalAlerts: 1, urgentAlerts: 0, overdueObligations: 0, pendingCommunications: 0, totalAlerts: 1 },
      officialIntegrations: official,
    });
    mockUseHRCommandCenter.mockReturnValue(buildPanelData({ alerts }));
    render(<HRCommandCenterPanel companyId="co-1" />);
    expect(screen.getByTestId('hr-cc-alerts-top-risks')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-alerts-top-actions')).toBeInTheDocument();
    const riskRows = screen.getAllByTestId('hr-cc-alerts-risk-row');
    expect(riskRows.length).toBeGreaterThan(0);
    expect(riskRows.length).toBeLessThanOrEqual(5);
    const humanChips = screen.getAllByTestId('hr-cc-alerts-action-human-review');
    expect(humanChips.length).toBeGreaterThan(0);
  });
});