/**
 * HR Command Center — Phase 4A mount flag tests.
 *
 * Verifies the safe mount of HRCommandCenterPanel inside HRExecutiveDashboard
 * behind the static flag `HR_COMMAND_CENTER_ENABLED`.
 *
 * Invariants:
 *  - Flag OFF by default → no mount, no useHRCommandCenter call.
 *  - Flag ON (forced via vi.mock) → mount renders with experimental disclaimer.
 *  - persisted_priority_apply OFF · C3B3C2 BLOCKED.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Shared mock for useHRCommandCenter — reused across modules.
const mockUseHRCommandCenter = vi.fn(() => ({
  isLoading: false,
  globalReadiness: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0 },
  global: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0, activeEmployees: null, newHiresMonth: null, departuresMonth: null, onLeave: null },
  payroll: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0, periodStatus: null, pendingIncidents: null, closableState: 'unknown' },
  documentary: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0, expiredCount: null, expiringSoonCount: null, missingMandatoryCount: null },
  legal: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0, items: [], disclaimer: 'internal_readiness' },
  vpt: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0, status: 'internal_ready', disclaimer: 'internal_ready_not_official' },
  officials: { level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0, integrations: [], disclaimer: 'no_official_unless_evidence' },
  alerts: { totals: { blockers: 0, warnings: 0 }, topRisks: [], topActions: [], nextDeadlines: [], hasData: false },
}));

vi.mock('@/hooks/erp/hr/useHRCommandCenter', () => ({
  useHRCommandCenter: (companyId: string) => mockUseHRCommandCenter(companyId),
}));

// Minimal mock of useHRExecutiveData — returns just enough to render.
vi.mock('@/hooks/admin/useHRExecutiveData', () => ({
  useHRExecutiveData: () => ({
    isLoading: false,
    error: null,
    lastRefresh: new Date(),
    workforceStats: { total: 0, active: 0, onLeave: 0, newHires: 0, departures: 0, avgTenure: 0, employees: [] },
    laborCosts: { totalMonthly: 0, costPerEmployee: 0 },
    departments: [],
    alerts: [],
    monthlyTrends: [],
    metrics: [],
    predictions: null,
    insights: null,
    risks: null,
    benchmarks: null,
    isLoadingAI: false,
    refreshData: vi.fn(),
    fetchPredictions: vi.fn(),
    fetchInsights: vi.fn(),
    fetchRiskAssessment: vi.fn(),
    fetchBenchmarks: vi.fn(),
    startAutoRefresh: vi.fn(),
    stopAutoRefresh: vi.fn(),
  }),
}));

describe('HR Command Center — Phase 4A mount flag', () => {
  beforeEach(() => {
    mockUseHRCommandCenter.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/components/erp/hr/command-center/featureFlag');
  });

  it('flag OFF by default: does not render the mount section', async () => {
    const { HRExecutiveDashboard } = await import(
      '@/components/erp/hr/HRExecutiveDashboard'
    );
    render(<HRExecutiveDashboard companyId="company-test" />);
    expect(screen.queryByTestId('hr-command-center-mount')).toBeNull();
  });

  it('flag OFF: useHRCommandCenter is never called', async () => {
    const { HRExecutiveDashboard } = await import(
      '@/components/erp/hr/HRExecutiveDashboard'
    );
    render(<HRExecutiveDashboard companyId="company-test" />);
    expect(mockUseHRCommandCenter).not.toHaveBeenCalled();
  });

  it('flag ON (forced): renders experimental mount with disclaimer', async () => {
    vi.doMock('@/components/erp/hr/command-center/featureFlag', () => ({
      HR_COMMAND_CENTER_ENABLED: true,
    }));

    const { HRExecutiveDashboard } = await import(
      '@/components/erp/hr/HRExecutiveDashboard'
    );
    render(<HRExecutiveDashboard companyId="company-test" />);

    const mount = await screen.findByTestId('hr-command-center-mount');
    expect(mount).toBeTruthy();
    expect(mount.textContent || '').toMatch(/Experimental/i);
    expect(mount.textContent || '').toMatch(/Internal readiness/i);
  });
});
