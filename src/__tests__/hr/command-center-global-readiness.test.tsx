/**
 * HR Command Center · Global readiness aggregation tests
 *
 * Validates that `useHRCommandCenter` weights legal + VPT into the global
 * readiness, propagates blockers/warnings, and applies the hard-red rule
 * when payroll/legal/VPT are red.
 *
 * Strategy: mock the underlying hooks so the aggregator is exercised in
 * isolation. We never touch RLS, edge functions, migrations or flags.
 *
 * Run:
 *   bunx vitest run src/__tests__/hr/command-center-global-readiness.test.tsx
 *   bunx vitest run src/__tests__/hr/
 *
 * Invariants honored:
 *  - persisted_priority_apply OFF · C3B3C2 BLOCKED.
 *  - Legal stays internal reading. VPT stays internal_ready.
 *  - No production engine, RLS, edge function or migration is touched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// ── Mocks for composed hooks ────────────────────────────────────────────────
const execMock = vi.fn();
const preflightMock = vi.fn();
const docsMock = vi.fn();
const vptMock = vi.fn();
const legalMock = vi.fn();

vi.mock('@/hooks/admin/useHRExecutiveData', () => ({
  useHRExecutiveData: (id: string) => execMock(id),
}));
vi.mock('@/hooks/erp/hr/usePayrollPreflight', () => ({
  usePayrollPreflight: (id: string) => preflightMock(id),
}));
vi.mock('@/hooks/erp/hr/useHRDocumentExpedient', () => ({
  useHRDocumentExpedient: (id: string) => docsMock(id),
}));
vi.mock('@/hooks/erp/hr/useS9VPT', () => ({
  useS9VPT: (id: string) => vptMock(id),
}));
vi.mock('@/hooks/admin/useHRLegalCompliance', () => ({
  useHRLegalCompliance: (id: string) => legalMock(id),
}));

import { useHRCommandCenter } from '@/hooks/erp/hr/useHRCommandCenter';

// ── Helpers to build deterministic source-hook returns ──────────────────────
function execGreen() {
  return {
    isLoading: false,
    workforceStats: {
      activeEmployees: 100,
      newHiresMonth: 2,
      departuresMonth: 1,
      onLeave: 0,
    },
  };
}

function preflightGreen() {
  return {
    isLoading: false,
    preflight: {
      overallStatus: 'on_track',
      completionScore: 100,
      crossDomainBlockers: [],
      legalAlerts: [],
      firstBlockedStep: null,
      steps: [],
    },
  };
}

function preflightRed() {
  return {
    isLoading: false,
    preflight: {
      overallStatus: 'blocked',
      completionScore: 30,
      crossDomainBlockers: [{ id: 'b1' }, { id: 'b2' }],
      legalAlerts: [{ id: 'a1' }],
      firstBlockedStep: { id: 's1' },
      steps: [],
    },
  };
}

function docsGreen() {
  return {
    isLoadingDocuments: false,
    getExpedientStats: () => ({
      total: 50,
      expiringSoon: 0,
      unverified: 0,
      activeConsents: 50,
    }),
  };
}

function vptNoData() {
  // Hook returns no analytics ⇒ snapshot.score === null
  return { isLoading: false };
}

function vptGreen() {
  return {
    isLoading: false,
    valuations: Array.from({ length: 10 }, (_, i) => ({
      status: 'approved',
      version_id: `v-${i}`,
    })),
    incoherences: [],
    analytics: {
      totalPositions: 10,
      valuatedPositions: 10,
      coverage: 100,
      byStatus: { approved: 10 },
    },
  };
}

function vptRed() {
  return {
    isLoading: false,
    valuations: Array.from({ length: 5 }, () => ({ status: 'approved', version_id: null })),
    incoherences: [],
    analytics: {
      totalPositions: 10,
      valuatedPositions: 5,
      coverage: 50,
      byStatus: { approved: 5 },
    },
  };
}

function legalNoData() {
  return {
    isLoading: false,
    obligations: [],
    deadlines: [],
    sanctionRisks: [],
    alerts: [],
    upcomingDeadlines: [],
    riskAssessment: null,
  };
}

function legalGreen() {
  return {
    isLoading: false,
    obligations: [{ id: 'o1', obligation_name: 'X' }],
    deadlines: [],
    sanctionRisks: [],
    alerts: [],
    upcomingDeadlines: [],
    riskAssessment: {
      total_alerts: 0,
      critical_alerts: 0,
      urgent_alerts: 0,
      overdue_obligations: 0,
      pending_communications: 0,
      potential_sanctions_min: 0,
      potential_sanctions_max: 0,
    },
  };
}

function legalRed() {
  return {
    isLoading: false,
    obligations: [{ id: 'o1', obligation_name: 'X' }],
    deadlines: [],
    sanctionRisks: [],
    alerts: [],
    upcomingDeadlines: [],
    riskAssessment: {
      total_alerts: 3,
      critical_alerts: 2,
      urgent_alerts: 1,
      overdue_obligations: 0,
      pending_communications: 0,
      potential_sanctions_min: 0,
      potential_sanctions_max: 0,
    },
  };
}

function legalAmber() {
  return {
    isLoading: false,
    obligations: [{ id: 'o1', obligation_name: 'X' }],
    deadlines: [],
    sanctionRisks: [],
    alerts: [],
    upcomingDeadlines: [],
    riskAssessment: {
      total_alerts: 2,
      critical_alerts: 0,
      urgent_alerts: 2,
      overdue_obligations: 0,
      pending_communications: 1,
      potential_sanctions_min: 0,
      potential_sanctions_max: 0,
    },
  };
}

describe('useHRCommandCenter · global readiness aggregation', () => {
  beforeEach(() => {
    execMock.mockReset();
    preflightMock.mockReset();
    docsMock.mockReset();
    vptMock.mockReset();
    legalMock.mockReset();
  });

  it('legal RED forces global RED even with payroll/documentary green', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptNoData());
    legalMock.mockReturnValue(legalRed());

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.legal.level).toBe('red');
    expect(result.current.payroll.level).toBe('green');
    expect(result.current.globalReadiness.level).toBe('red');
    expect(result.current.globalReadiness.blockers).toBeGreaterThan(0);
  });

  it('VPT RED forces global RED even with payroll/documentary green', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptRed());
    legalMock.mockReturnValue(legalNoData());

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.vpt.level).toBe('red');
    expect(result.current.payroll.level).toBe('green');
    expect(result.current.globalReadiness.level).toBe('red');
  });

  it('payroll RED forces global RED', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightRed());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptGreen());
    legalMock.mockReturnValue(legalGreen());

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.payroll.level).toBe('red');
    expect(result.current.globalReadiness.level).toBe('red');
  });

  it('legal null does not enter the denominator and does not force red', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptGreen());
    legalMock.mockReturnValue(legalNoData());

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.legal.score).toBeNull();
    expect(result.current.legal.level).toBe('gray');
    expect(result.current.globalReadiness.level).not.toBe('red');
    expect(result.current.globalReadiness.score).not.toBeNull();
  });

  it('VPT null does not enter the denominator and does not force red', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptNoData());
    legalMock.mockReturnValue(legalGreen());

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.vpt.score).toBeNull();
    expect(result.current.vpt.level).toBe('gray');
    expect(result.current.globalReadiness.level).not.toBe('red');
    expect(result.current.globalReadiness.score).not.toBeNull();
  });

  it('global blockers/warnings include legal and VPT contributions', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptRed());        // contributes blockers
    legalMock.mockReturnValue(legalAmber());  // contributes warnings

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    const gr = result.current.globalReadiness;
    expect(gr.blockers).toBeGreaterThanOrEqual(result.current.vpt.blockers);
    expect(gr.warnings).toBeGreaterThanOrEqual(
      result.current.legal.warnings + result.current.vpt.warnings,
    );
    // VPT red ⇒ global red
    expect(gr.level).toBe('red');
  });

  it('all sections green ⇒ global green', () => {
    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptGreen());
    legalMock.mockReturnValue(legalGreen());

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.globalReadiness.level).toBe('green');
    expect(result.current.globalReadiness.blockers).toBe(0);
  });
});