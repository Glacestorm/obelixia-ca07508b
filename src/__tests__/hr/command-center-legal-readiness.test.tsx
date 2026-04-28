/**
 * HR Command Center · Phase 2B · Legal / Compliance wiring contract tests
 *
 * Validates `computeLegalSnapshot` (pure) and the LegalCard render contract.
 *
 * Strategy: unit-test the pure mapping function with synthetic shapes that
 * mimic `useHRLegalCompliance`. We deliberately avoid mounting the whole
 * panel (already covered by command-center-render.test.tsx) and we never
 * call `refreshAll` / `startAutoRefresh` from the Command Center.
 *
 * Run:
 *   bunx vitest run src/__tests__/hr/command-center-legal-readiness.test.tsx
 *   bunx vitest run src/__tests__/hr/
 *
 * Invariants honored:
 *  - persisted_priority_apply OFF
 *  - C3B3C2 BLOCKED
 *  - Legal/Compliance is INTERNAL READING — never an official legal certification.
 *  - Empty hook state ⇒ gray "Sin datos" — never green by default.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  computeLegalSnapshot,
  type LegalSnapshot,
} from '@/hooks/erp/hr/useHRCommandCenter';
import { HRCCLegalComplianceCard } from '@/components/erp/hr/command-center/HRCCLegalComplianceCard';

function fakeHook(opts: {
  obligations?: any[];
  deadlines?: any[];
  sanctionRisks?: any[];
  alerts?: any[];
  upcomingDeadlines?: any[];
  riskAssessment?: Partial<{
    total_alerts: number;
    critical_alerts: number;
    urgent_alerts: number;
    overdue_obligations: number;
    pending_communications: number;
    potential_sanctions_min: number;
    potential_sanctions_max: number;
  }> | null;
  isLoading?: boolean;
} = {}) {
  return {
    isLoading: !!opts.isLoading,
    obligations: opts.obligations ?? [],
    deadlines: opts.deadlines ?? [],
    sanctionRisks: opts.sanctionRisks ?? [],
    alerts: opts.alerts ?? [],
    upcomingDeadlines: opts.upcomingDeadlines ?? [],
    riskAssessment: opts.riskAssessment ?? null,
  };
}

describe('Legal snapshot · readiness rules', () => {
  it('riskAssessment null + obligations [] ⇒ gray, score null, never green', () => {
    const snap = computeLegalSnapshot(fakeHook({ obligations: [], riskAssessment: null }));
    expect(snap.level).toBe('gray');
    expect(snap.score).toBeNull();
    expect(snap.label).toMatch(/sin datos/i);
    expect(snap.hasData).toBe(false);
    expect(snap.level).not.toBe('green');
  });

  it('critical_alerts > 0 ⇒ RED + blockers > 0', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [{ id: 'o1', obligation_name: 'X' }],
        riskAssessment: {
          total_alerts: 3,
          critical_alerts: 2,
          urgent_alerts: 1,
          overdue_obligations: 0,
          pending_communications: 0,
          potential_sanctions_min: 0,
          potential_sanctions_max: 0,
        },
      }),
    );
    expect(snap.level).toBe('red');
    expect(snap.blockers).toBeGreaterThan(0);
    expect(snap.score).not.toBeNull();
    // 100 - 25*2 - 15*1 = 35
    expect(snap.score).toBe(35);
  });

  it('overdue_obligations > 0 ⇒ RED + blockers > 0', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [{ id: 'o1', obligation_name: 'X' }],
        riskAssessment: {
          total_alerts: 0,
          critical_alerts: 0,
          urgent_alerts: 0,
          overdue_obligations: 2,
          pending_communications: 0,
          potential_sanctions_min: 0,
          potential_sanctions_max: 0,
        },
      }),
    );
    expect(snap.level).toBe('red');
    expect(snap.blockers).toBeGreaterThan(0);
    // 100 - 10*2 = 80
    expect(snap.score).toBe(80);
  });

  it('urgent_alerts > 0 without criticals/overdue ⇒ AMBER', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [{ id: 'o1', obligation_name: 'X' }],
        riskAssessment: {
          total_alerts: 1,
          critical_alerts: 0,
          urgent_alerts: 1,
          overdue_obligations: 0,
          pending_communications: 0,
          potential_sanctions_min: 0,
          potential_sanctions_max: 0,
        },
      }),
    );
    expect(snap.level).toBe('amber');
    expect(snap.warnings).toBeGreaterThan(0);
    expect(snap.level).not.toBe('green');
  });

  it('pending_communications > 0 alone ⇒ AMBER', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [{ id: 'o1', obligation_name: 'X' }],
        riskAssessment: {
          total_alerts: 0,
          critical_alerts: 0,
          urgent_alerts: 0,
          overdue_obligations: 0,
          pending_communications: 2,
          potential_sanctions_min: 0,
          potential_sanctions_max: 0,
        },
      }),
    );
    expect(snap.level).toBe('amber');
    expect(snap.warnings).toBeGreaterThanOrEqual(2);
  });

  it('zero alerts + obligations present ⇒ GREEN with non-official disclaimer', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [{ id: 'o1', obligation_name: 'X' }],
        riskAssessment: {
          total_alerts: 0,
          critical_alerts: 0,
          urgent_alerts: 0,
          overdue_obligations: 0,
          pending_communications: 0,
          potential_sanctions_min: 0,
          potential_sanctions_max: 0,
        },
      }),
    );
    expect(snap.level).toBe('green');
    expect(snap.score).toBe(100);
    expect(snap.disclaimer).toMatch(/lectura interna de cumplimiento/i);
  });

  it('detects equality plan and pay registry bullets when present', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [
          { id: 'eq', obligation_name: 'Plan de Igualdad anual' },
          { id: 'rr', obligation_name: 'Registro retributivo obligatorio' },
        ],
        deadlines: [
          { id: 'd1', obligation_id: 'eq', status: 'completed' },
          { id: 'd2', obligation_id: 'rr', status: 'completed' },
        ],
        riskAssessment: {
          total_alerts: 0, critical_alerts: 0, urgent_alerts: 0,
          overdue_obligations: 0, pending_communications: 0,
          potential_sanctions_min: 0, potential_sanctions_max: 0,
        },
      }),
    );
    const eq = snap.coverageBullets.find(b => b.key === 'equality_plan');
    const rr = snap.coverageBullets.find(b => b.key === 'pay_registry');
    // Both detected and have completed activity ⇒ green
    expect(eq?.status).toBe('green');
    expect(rr?.status).toBe('green');
    // Other defined bullets remain gray "Sin datos" (no false positives)
    const wb = snap.coverageBullets.find(b => b.key === 'whistleblowing');
    expect(wb?.status).toBe('gray');
  });

  it('missing obligation ⇒ bullet "Sin datos" without affecting score', () => {
    const snap = computeLegalSnapshot(
      fakeHook({
        obligations: [{ id: 'o1', obligation_name: 'X' }],
        riskAssessment: {
          total_alerts: 0, critical_alerts: 0, urgent_alerts: 0,
          overdue_obligations: 0, pending_communications: 0,
          potential_sanctions_min: 0, potential_sanctions_max: 0,
        },
      }),
    );
    const wb = snap.coverageBullets.find(b => b.key === 'whistleblowing');
    expect(wb?.status).toBe('gray');
    expect(wb?.detail).toMatch(/sin datos/i);
    // score unaffected by missing optional bullets — green/100 still holds
    expect(snap.score).toBe(100);
    expect(snap.level).toBe('green');
  });
});

function makeSnapshot(overrides: Partial<LegalSnapshot> = {}): LegalSnapshot {
  return {
    level: 'amber',
    score: 60,
    label: 'Revisión legal pendiente',
    hasData: true,
    blockers: 0,
    warnings: 1,
    disclaimer:
      'Lectura interna de cumplimiento. Requiere revisión laboral/legal antes de uso externo.',
    criticalAlerts: 0,
    urgentAlerts: 1,
    overdueObligations: 0,
    pendingCommunications: 0,
    totalAlerts: 1,
    upcomingDeadlinesCount: 2,
    sanctionRiskCount: 0,
    potentialSanctionsMin: 0,
    potentialSanctionsMax: 0,
    coverageBullets: [
      { key: 'equality_plan', label: 'Plan de igualdad', status: 'green', detail: '1 completadas' },
      { key: 'whistleblowing', label: 'Canal denuncias', status: 'gray', detail: 'Sin datos' },
    ],
    ...overrides,
  };
}

describe('HRCCLegalComplianceCard · render contract', () => {
  it('always shows the legal disclaimer (internal reading, not certification)', () => {
    render(<HRCCLegalComplianceCard snapshot={makeSnapshot()} />);
    expect(screen.getByTestId('hr-cc-legal-disclaimer').textContent || '').toMatch(
      /lectura interna de cumplimiento/i,
    );
    // Never claims legal certification
    expect(screen.queryByText(/cumple legalmente/i)).toBeNull();
    expect(screen.queryByText(/certificaci[oó]n.*oficial/i)).toBeNull();
  });

  it('renders counters and coverage bullets', () => {
    render(<HRCCLegalComplianceCard snapshot={makeSnapshot()} />);
    expect(screen.getByTestId('hr-cc-legal-critical')).toHaveTextContent('Críticas: 0');
    expect(screen.getByTestId('hr-cc-legal-urgent')).toHaveTextContent('Urgentes: 1');
    expect(screen.getByTestId('hr-cc-legal-overdue')).toHaveTextContent('Vencidas: 0');
    expect(screen.getByTestId('hr-cc-legal-pending')).toHaveTextContent('Comunic. pend.: 0');
    expect(screen.getByTestId('hr-cc-legal-bullet-equality_plan')).toBeInTheDocument();
    expect(screen.getByTestId('hr-cc-legal-bullet-whistleblowing')).toBeInTheDocument();
  });

  it('does not show "Sin bloqueos críticos" badge when there is no data', () => {
    render(
      <HRCCLegalComplianceCard
        snapshot={makeSnapshot({
          level: 'gray',
          score: null,
          label: 'Sin datos',
          hasData: false,
          blockers: 0,
          warnings: 0,
          criticalAlerts: null,
          urgentAlerts: null,
          overdueObligations: null,
          pendingCommunications: null,
        })}
      />,
    );
    expect(screen.getByTestId('hr-cc-legal-badge')).toHaveTextContent(/sin datos/i);
    expect(screen.queryByText(/sin bloqueos cr[ií]ticos/i)).toBeNull();
  });
});