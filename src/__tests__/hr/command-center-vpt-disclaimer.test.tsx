/**
 * HR Command Center · Phase 2A · VPT / S9 wiring contract tests
 *
 * Validates the readiness rules for the VPT card driven by `useS9VPT`:
 *  - VPT badge is ALWAYS `internal_ready` (never official/regulatory).
 *  - approvedWithoutVersionId > 0 ⇒ red, never green.
 *  - coverage ≥ 80% with full version_id and 0 incoherences ⇒ green operativo,
 *    score capped at 80, disclaimer visible.
 *  - totalPositions > 0 with approvedCount = 0 ⇒ red (NOT gray).
 *  - totalPositions null / no analytics ⇒ gray "Sin datos".
 *
 * Strategy: unit-test the pure computation `computeVPTSnapshot` plus a
 * lightweight render check on the card. We avoid mounting the whole panel
 * because we already have full panel render coverage in
 * command-center-render.test.tsx.
 *
 * Run:
 *   bunx vitest run src/__tests__/hr/command-center-vpt-disclaimer.test.tsx
 *   bunx vitest run src/__tests__/hr/
 *
 * Invariants honored:
 *  - persisted_priority_apply OFF
 *  - C3B3C2 BLOCKED
 *  - VPT/S9 stays internal_ready · score capped at 80
 *  - No production code touched outside the wiring patch.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { computeVPTSnapshot } from '@/hooks/erp/hr/useHRCommandCenter';
import type { VPTSnapshot } from '@/hooks/erp/hr/useHRCommandCenter';
import { HRCCVPTReadinessCard } from '@/components/erp/hr/command-center/HRCCVPTReadinessCard';

function fakeHook(opts: {
  totalPositions: number | null;
  valuatedPositions?: number;
  coverage?: number;
  approved?: number;
  approvedWithVersionId?: number;
  incoherences?: number;
  isLoading?: boolean;
}) {
  if (opts.totalPositions === null) {
    // simulate hook with no analytics yet
    return { isLoading: !!opts.isLoading };
  }
  const approved = opts.approved ?? 0;
  const withV = Math.min(opts.approvedWithVersionId ?? approved, approved);
  const valuations: any[] = [];
  for (let i = 0; i < withV; i++) {
    valuations.push({ status: 'approved', version_id: `ver-${i}` });
  }
  for (let i = 0; i < approved - withV; i++) {
    valuations.push({ status: 'approved', version_id: null });
  }
  return {
    isLoading: !!opts.isLoading,
    valuations,
    incoherences: Array.from({ length: opts.incoherences ?? 0 }, (_, i) => ({ id: `i-${i}` })),
    analytics: {
      totalPositions: opts.totalPositions,
      valuatedPositions: opts.valuatedPositions ?? 0,
      coverage: opts.coverage ?? 0,
      byStatus: { approved },
    },
  };
}

describe('VPT snapshot · readiness rules', () => {
  it('returns gray "Sin datos" when hook has no analytics', () => {
    const snap = computeVPTSnapshot(fakeHook({ totalPositions: null }));
    expect(snap.level).toBe('gray');
    expect(snap.score).toBeNull();
    expect(snap.label).toMatch(/sin datos/i);
    expect(snap.status).toBe('internal_ready');
  });

  it('returns gray "Sin puestos configurados" when totalPositions === 0', () => {
    const snap = computeVPTSnapshot(fakeHook({ totalPositions: 0 }));
    expect(snap.level).toBe('gray');
    expect(snap.score).toBeNull();
    expect(snap.label).toMatch(/sin puestos/i);
    expect(snap.totalPositions).toBe(0);
  });

  it('totalPositions > 0 with approvedCount === 0 is RED, never gray/green', () => {
    const snap = computeVPTSnapshot(
      fakeHook({ totalPositions: 10, approved: 0, coverage: 0 }),
    );
    expect(snap.level).toBe('red');
    expect(snap.score).toBe(0);
    expect(snap.blockers).toBeGreaterThan(0);
    expect(snap.level).not.toBe('gray');
    expect(snap.level).not.toBe('green');
  });

  it('approvedWithoutVersionId > 0 ⇒ RED, never green, capped ≤ 80', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 10,
        valuatedPositions: 8,
        coverage: 80,
        approved: 8,
        approvedWithVersionId: 5, // 3 missing version_id
      }),
    );
    expect(snap.level).toBe('red');
    expect(snap.level).not.toBe('green');
    expect(snap.approvedWithoutVersionId).toBe(3);
    expect(snap.blockers).toBeGreaterThan(0);
    expect(snap.score).not.toBeNull();
    expect(snap.score!).toBeLessThanOrEqual(80);
  });

  it('coverage ≥ 80%, full version_id, 0 incoherencies ⇒ GREEN, score ≤ 80', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 10,
        valuatedPositions: 10,
        coverage: 95,
        approved: 10,
        approvedWithVersionId: 10,
        incoherences: 0,
      }),
    );
    expect(snap.level).toBe('green');
    expect(snap.score).not.toBeNull();
    expect(snap.score!).toBeLessThanOrEqual(80);
    expect(snap.status).toBe('internal_ready');
    expect(snap.disclaimer).toMatch(/no constituye certificación oficial/i);
  });

  it('caps the score at 80 even with coverage 100%', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 5,
        valuatedPositions: 5,
        coverage: 100,
        approved: 5,
        approvedWithVersionId: 5,
        incoherences: 0,
      }),
    );
    expect(snap.score).toBe(80);
    expect(snap.status).toBe('internal_ready');
  });

  it('incoherences > 5 ⇒ RED', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 10,
        valuatedPositions: 9,
        coverage: 90,
        approved: 9,
        approvedWithVersionId: 9,
        incoherences: 6,
      }),
    );
    expect(snap.level).toBe('red');
  });

  it('1..5 incoherencies ⇒ at least AMBER (not green)', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 10,
        valuatedPositions: 9,
        coverage: 90,
        approved: 9,
        approvedWithVersionId: 9,
        incoherences: 2,
      }),
    );
    expect(snap.level).toBe('amber');
    expect(snap.level).not.toBe('green');
  });

  it('coverage < 25% ⇒ RED', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 100,
        valuatedPositions: 10,
        coverage: 10,
        approved: 10,
        approvedWithVersionId: 10,
        incoherences: 0,
      }),
    );
    expect(snap.level).toBe('red');
  });

  it('coverage between 25% and 80% ⇒ AMBER', () => {
    const snap = computeVPTSnapshot(
      fakeHook({
        totalPositions: 10,
        valuatedPositions: 5,
        coverage: 50,
        approved: 5,
        approvedWithVersionId: 5,
        incoherences: 0,
      }),
    );
    expect(snap.level).toBe('amber');
  });
});

function makeSnapshot(overrides: Partial<VPTSnapshot> = {}): VPTSnapshot {
  return {
    level: 'green',
    score: 80,
    label: 'VPT operativo',
    hasData: true,
    blockers: 0,
    warnings: 0,
    status: 'internal_ready',
    disclaimer:
      'internal_ready · herramienta interna de soporte; no constituye certificación oficial regulatoria',
    totalPositions: 10,
    valuatedPositions: 10,
    coverage: 100,
    approvedCount: 10,
    approvedWithVersionId: 10,
    approvedWithoutVersionId: 0,
    incoherencesCount: 0,
    ...overrides,
  };
}

describe('HRCCVPTReadinessCard · render contract', () => {
  it('always shows internal_ready badge, even with full coverage', () => {
    render(<HRCCVPTReadinessCard snapshot={makeSnapshot()} />);
    expect(screen.getByTestId('hr-cc-vpt-badge')).toHaveTextContent(/internal_ready/i);
    expect(screen.getByTestId('hr-cc-vpt-disclaimer').textContent || '').toMatch(
      /no constituye certificación oficial/i,
    );
  });

  it('shows the non-official disclaimer in every state', () => {
    render(
      <HRCCVPTReadinessCard
        snapshot={makeSnapshot({ level: 'red', score: 0, approvedCount: 0, coverage: 0 })}
      />,
    );
    expect(screen.getByTestId('hr-cc-vpt-disclaimer').textContent || '').toMatch(
      /no constituye certificación oficial/i,
    );
  });
});