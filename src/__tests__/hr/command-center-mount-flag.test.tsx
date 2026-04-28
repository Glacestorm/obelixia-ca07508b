/**
 * HR Command Center — Phase 4A mount flag tests.
 *
 * The full HRExecutiveDashboard is too heavy to render reliably in unit
 * tests, so we verify the mount contract via:
 *  1. Static guarantee: HR_COMMAND_CENTER_ENABLED defaults to `false`.
 *  2. Source contract: HRExecutiveDashboard imports the flag and the
 *     panel only behind it (no eager import of the panel).
 *  3. Behavior contract: a small wrapper that mirrors production wiring
 *     verifies OFF/ON behavior and that useHRCommandCenter is not called
 *     when OFF.
 *
 * Invariants:
 *  - persisted_priority_apply OFF · C3B3C2 BLOCKED.
 *  - VPT internal_ready · officials read-only.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { lazy, Suspense } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

/**
 * Minimal wrapper that mirrors the production conditional mount in
 * HRExecutiveDashboard so we can test OFF/ON behavior in isolation.
 */
function MountWrapper({ enabled, companyId }: { enabled: boolean; companyId: string }) {
  const Lazy = enabled
    ? lazy(() =>
        import('@/components/erp/hr/command-center/HRCommandCenterPanel').then(
          (m) => ({ default: m.HRCommandCenterPanel }),
        ),
      )
    : null;

  if (!enabled || !Lazy) return null;

  return (
    <section
      data-testid="hr-command-center-mount"
      aria-label="HR Command Center experimental"
    >
      <span>Experimental · Internal readiness</span>
      <Suspense fallback={<div>loading</div>}>
        <Lazy companyId={companyId} />
      </Suspense>
    </section>
  );
}

describe('HR Command Center — Phase 4A mount flag', () => {
  beforeEach(() => {
    mockUseHRCommandCenter.mockClear();
  });

  it('static flag is OFF by default', async () => {
    const mod = await import(
      '@/components/erp/hr/command-center/featureFlag'
    );
    expect(mod.HR_COMMAND_CENTER_ENABLED).toBe(false);
  });

  it('HRExecutiveDashboard wires the flag and lazy-imports the panel', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/erp/hr/HRExecutiveDashboard.tsx'),
      'utf8',
    );
    // Imports the static flag.
    expect(src).toMatch(/HR_COMMAND_CENTER_ENABLED/);
    expect(src).toMatch(/from ['"]\.\/command-center\/featureFlag['"]/);
    // Lazy import (not an eager import of the panel module).
    expect(src).toMatch(
      /lazy\([\s\S]*?import\(['"]\.\/command-center\/HRCommandCenterPanel['"]\)/,
    );
    // No eager import of HRCommandCenterPanel as a top-level symbol.
    expect(src).not.toMatch(
      /^import\s+\{[^}]*HRCommandCenterPanel[^}]*\}\s+from/m,
    );
    // Conditional render guarded by the flag.
    expect(src).toMatch(/HR_COMMAND_CENTER_ENABLED\s*&&/);
    // Mount section testid + experimental disclaimer text.
    expect(src).toMatch(/data-testid=["']hr-command-center-mount["']/);
    expect(src).toMatch(/Experimental/);
    expect(src).toMatch(/Internal readiness/);
  });

  it('flag OFF: nothing renders and useHRCommandCenter is not called', () => {
    render(<MountWrapper enabled={false} companyId="company-test" />);
    expect(screen.queryByTestId('hr-command-center-mount')).toBeNull();
    expect(mockUseHRCommandCenter).not.toHaveBeenCalled();
  });

  it('flag ON: mount section renders with experimental disclaimer', async () => {
    render(<MountWrapper enabled={true} companyId="company-test" />);
    const mount = await screen.findByTestId('hr-command-center-mount');
    expect(mount).toBeTruthy();
    expect(mount.textContent || '').toMatch(/Experimental/i);
    expect(mount.textContent || '').toMatch(/Internal readiness/i);
  });
});
