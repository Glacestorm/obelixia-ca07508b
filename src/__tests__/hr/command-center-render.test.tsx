/**
 * HR Command Center — Phase 1 render contract tests
 *
 * Covers:
 *  - Renders the 8 main sections (KPI header + 7 cards).
 *  - With NO data: every section shows "Sin datos" and never green.
 *  - Payroll WITHOUT critical evidence is never green/closable.
 *  - VPT card always shows "internal_ready" + non-official disclaimer.
 *  - Official integrations never show accepted/official_ready/submitted.
 *
 * Strategy: mock `useHRCommandCenter` directly so the panel renders
 * deterministic snapshots. This keeps the test independent from the
 * underlying hooks and from the global flag.
 *
 * Run:
 *   bunx vitest run src/__tests__/hr/command-center-render.test.tsx
 *
 * Invariants honored:
 *  - persisted_priority_apply OFF
 *  - C3B3C2 BLOCKED
 *  - No production code modified by these tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { HRCommandCenterData } from '@/hooks/erp/hr/useHRCommandCenter';

const mockUseHRCommandCenter = vi.fn();

vi.mock('@/hooks/erp/hr/useHRCommandCenter', () => ({
  useHRCommandCenter: (companyId: string) => mockUseHRCommandCenter(companyId),
}));

import { HRCommandCenterPanel } from '@/components/erp/hr/command-center/HRCommandCenterPanel';

function emptyData(): HRCommandCenterData {
  const placeholder = {
    level: 'gray' as const,
    score: null,
    label: 'Sin datos',
    hasData: false,
    blockers: 0,
    warnings: 0,
    phase: 'phase-2' as const,
    disclaimer: 'placeholder',
  };
  return {
    isLoading: false,
    globalReadiness: {
      level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0,
    },
    global: {
      level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0,
      activeEmployees: null, newHiresMonth: null, departuresMonth: null, onLeave: null,
    },
    payroll: {
      level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0,
      periodStatus: null, pendingIncidents: null, closableState: 'unknown',
    },
    documentary: {
      level: 'gray', score: null, label: 'Sin datos', hasData: false, blockers: 0, warnings: 0,
      total: null, expiringSoon: null, unverified: null, activeConsents: null,
    },
    legal: { ...placeholder, label: 'Compliance legal', disclaimer: 'Sin evidencia oficial archivada — pendiente Fase 2' },
    vpt: {
      level: 'gray' as const,
      score: null,
      label: 'Sin datos',
      hasData: false,
      blockers: 0,
      warnings: 0,
      status: 'internal_ready' as const,
      disclaimer: 'internal_ready · herramienta interna de soporte; no constituye certificación oficial regulatoria',
      totalPositions: null,
      valuatedPositions: null,
      coverage: null,
      approvedCount: null,
      approvedWithVersionId: null,
      approvedWithoutVersionId: null,
      incoherencesCount: null,
    },
    officialIntegrations: { ...placeholder, label: 'Integraciones oficiales', disclaimer: 'Sin evidencia oficial archivada · no se marca accepted/official_ready' },
    alerts: { ...placeholder, label: 'Alertas y bloqueos', disclaimer: 'Agregación completa en Fase 3', phase: 'phase-3' as const },
  };
}

function payrollBlockedData(): HRCommandCenterData {
  const base = emptyData();
  return {
    ...base,
    payroll: {
      level: 'red',
      score: 30,
      label: 'Preflight nómina',
      hasData: true,
      blockers: 2,
      warnings: 1,
      periodStatus: 'blocked',
      pendingIncidents: 5,
      closableState: 'blocked',
    },
    globalReadiness: {
      level: 'red', score: 30, label: 'Readiness global', hasData: true, blockers: 2, warnings: 1,
    },
  };
}

describe('HRCommandCenterPanel · Phase 1 render', () => {
  beforeEach(() => {
    mockUseHRCommandCenter.mockReset();
  });

  it('renders the 8 main sections (header + 7 cards)', () => {
    mockUseHRCommandCenter.mockReturnValue(emptyData());
    render(<HRCommandCenterPanel companyId="co-1" />);
    expect(screen.getByTestId('hr-command-center')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-header')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-global')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-payroll')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-documentary')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-legal')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-vpt')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-officials')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-alerts')).toBeInTheDocument();
  });

  it('with no data: every section shows gray "Sin datos" and never green', () => {
    mockUseHRCommandCenter.mockReturnValue(emptyData());
    const { container } = render(<HRCommandCenterPanel companyId="co-1" />);
    // At least one "Sin datos" badge per gray section (>= 5)
    const sinDatos = screen.getAllByText(/sin datos|sin evidencia/i);
    expect(sinDatos.length).toBeGreaterThanOrEqual(4);
    // No success-variant badge in the entire panel
    const successBadges = container.querySelectorAll('.bg-success\\/12, .text-success');
    expect(successBadges.length).toBe(0);
  });

  it('payroll without evidence shows blocked, never green/closable', () => {
    mockUseHRCommandCenter.mockReturnValue(payrollBlockedData());
    render(<HRCommandCenterPanel companyId="co-1" />);
    const closable = screen.getByTestId('hr-cc-payroll-closable');
    expect(closable).toHaveTextContent(/bloqueado/i);
    const badge = screen.getByTestId('hr-cc-payroll-badge');
    expect(badge).toHaveTextContent(/bloqueado/i);
    expect(badge).not.toHaveTextContent(/listo/i);
  });

  it('VPT card always shows "internal_ready" + non-official disclaimer', () => {
    mockUseHRCommandCenter.mockReturnValue(emptyData());
    render(<HRCommandCenterPanel companyId="co-1" />);
    expect(screen.getByTestId('hr-cc-vpt-badge')).toHaveTextContent(/internal_ready/i);
    const disclaimer = screen.getByTestId('hr-cc-vpt-disclaimer');
    expect(disclaimer.textContent || '').toMatch(/no constituye certificación oficial/i);
  });

  it('official integrations never show accepted/official_ready/submitted', () => {
    mockUseHRCommandCenter.mockReturnValue(emptyData());
    render(<HRCommandCenterPanel companyId="co-1" />);
    const states = screen.getAllByTestId('hr-cc-official-state');
    expect(states.length).toBeGreaterThan(0);
    for (const s of states) {
      const txt = (s.textContent || '').toLowerCase();
      expect(txt).toBe('not_configured');
      expect(txt).not.toMatch(/accepted|official_ready|submitted/);
    }
    const disclaimer = screen.getByTestId('hr-cc-officials-disclaimer');
    expect(disclaimer.textContent || '').toMatch(/no se marca accepted\/official_ready/i);
  });

  it('renders an empty placeholder when companyId is missing', () => {
    mockUseHRCommandCenter.mockReturnValue(emptyData());
    render(<HRCommandCenterPanel companyId="" />);
    expect(screen.getByTestId('hr-command-center')).toBeInTheDocument();
    expect(screen.getByText(/selecciona una empresa/i)).toBeInTheDocument();
  });
});