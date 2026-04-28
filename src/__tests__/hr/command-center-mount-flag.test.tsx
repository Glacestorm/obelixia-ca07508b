/**
 * HR Command Center — Phase 4A mount flag tests (realistic).
 *
 * Validates:
 *  1. Static guarantee: HR_COMMAND_CENTER_ENABLED defaults to `false`.
 *  2. Source contract: HRExecutiveDashboard wires the flag and lazy-imports
 *     HRCommandCenterPanel (no eager import).
 *  3. OFF behavior: nothing renders, useHRCommandCenter is not called.
 *  4. ON behavior: mount renders the experimental disclaimer AND the real
 *     HRCommandCenterPanel (testid="hr-command-center"), and
 *     useHRCommandCenter is invoked with the provided companyId.
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
import type { HRCommandCenterData } from '@/hooks/erp/hr/useHRCommandCenter';

// === Realistic fixture mirroring src/__tests__/hr/command-center-render.test.tsx ===
function emptyData(): HRCommandCenterData {
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
    legal: {
      level: 'gray',
      score: null,
      label: 'Sin datos',
      hasData: false,
      blockers: 0,
      warnings: 0,
      disclaimer: 'Lectura interna de cumplimiento. Requiere revisión laboral/legal antes de uso externo.',
      criticalAlerts: null,
      urgentAlerts: null,
      overdueObligations: null,
      pendingCommunications: null,
      totalAlerts: null,
      upcomingDeadlinesCount: null,
      sanctionRiskCount: null,
      potentialSanctionsMin: null,
      potentialSanctionsMax: null,
      coverageBullets: [],
    },
    vpt: {
      level: 'gray',
      score: null,
      label: 'Sin datos',
      hasData: false,
      blockers: 0,
      warnings: 0,
      status: 'internal_ready',
      disclaimer: 'internal_ready · herramienta interna de soporte; no constituye certificación oficial regulatoria',
      totalPositions: null,
      valuatedPositions: null,
      coverage: null,
      approvedCount: null,
      approvedWithVersionId: null,
      approvedWithoutVersionId: null,
      incoherencesCount: null,
    },
    officialIntegrations: {
      level: 'gray',
      score: null,
      label: 'Sin datos oficiales',
      hasData: false,
      blockers: 0,
      warnings: 0,
      disclaimer: 'Lectura interna de readiness. Ningún estado equivale a presentación oficial sin credencial, envío/UAT, respuesta oficial y evidencia archivada.',
      items: [
        {
          key: 'tgss_afiliacion',
          label: 'TGSS / Afiliación',
          rawState: 'not_configured',
          displayedState: 'not_configured',
          hasEvidence: false,
          hasOfficialResponse: false,
          hasProductionCertificate: false,
          degraded: false,
          warning: null,
          score: 0,
          lastUpdated: null,
        },
      ],
      degradedCount: 0,
      evidenceBackedCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      correctionRequiredCount: 0,
    },
    alerts: {
      blockers: [],
      warnings: [],
      topRisks: [],
      topActions: [],
      nextDeadlines: [],
      criticalCount: 0,
      warningCount: 0,
      actionCount: 0,
      disclaimer: 'Lectura interna de riesgos y acciones. No constituye certificación legal ni presentación oficial. Las acciones legales u oficiales requieren revisión humana.',
    },
  } as HRCommandCenterData;
}

const mockUseHRCommandCenter = vi.fn((_companyId: string) => emptyData());

vi.mock('@/hooks/erp/hr/useHRCommandCenter', () => ({
  useHRCommandCenter: (companyId: string) => mockUseHRCommandCenter(companyId),
}));

/**
 * Wrapper mirroring HRExecutiveDashboard's conditional mount, used to
 * exercise OFF/ON behavior in isolation (the full dashboard is too heavy
 * for unit tests).
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
      <Suspense fallback={<div data-testid="hr-cc-loading">loading</div>}>
        <Lazy companyId={companyId} />
      </Suspense>
    </section>
  );
}

describe('HR Command Center — Phase 4A mount flag (realistic)', () => {
  beforeEach(() => {
    mockUseHRCommandCenter.mockClear();
    mockUseHRCommandCenter.mockImplementation(() => emptyData());
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
    expect(src).toMatch(/HR_COMMAND_CENTER_ENABLED/);
    expect(src).toMatch(/from ['"]\.\/command-center\/featureFlag['"]/);
    expect(src).toMatch(
      /lazy\([\s\S]*?import\(['"]\.\/command-center\/HRCommandCenterPanel['"]\)/,
    );
    // No eager import of HRCommandCenterPanel at the top of the file.
    expect(src).not.toMatch(
      /^import\s+\{[^}]*HRCommandCenterPanel[^}]*\}\s+from/m,
    );
    // Conditional render guarded by flag AND the lazy ref.
    expect(src).toMatch(
      /HR_COMMAND_CENTER_ENABLED\s*&&\s*LazyHRCommandCenterPanel/,
    );
    expect(src).toMatch(/data-testid=["']hr-command-center-mount["']/);
    expect(src).toMatch(/Experimental/);
    expect(src).toMatch(/Internal readiness/);
  });

  it('flag OFF: nothing renders and useHRCommandCenter is not called', () => {
    render(<MountWrapper enabled={false} companyId="company-test" />);
    expect(screen.queryByTestId('hr-command-center-mount')).toBeNull();
    expect(screen.queryByTestId('hr-command-center')).toBeNull();
    expect(mockUseHRCommandCenter).not.toHaveBeenCalled();
  });

  it('flag ON: mounts panel with disclaimer and calls useHRCommandCenter(companyId)', async () => {
    render(<MountWrapper enabled={true} companyId="company-xyz" />);

    // Outer experimental section.
    const mount = await screen.findByTestId('hr-command-center-mount');
    expect(mount).toBeTruthy();
    expect(mount.textContent || '').toMatch(/Experimental/i);
    expect(mount.textContent || '').toMatch(/Internal readiness/i);

    // Real panel rendered inside (lazy resolved).
    const panel = await screen.findByTestId('hr-command-center');
    expect(panel).toBeTruthy();

    // Hook actually invoked with the companyId we passed.
    expect(mockUseHRCommandCenter).toHaveBeenCalled();
    const calledWith = mockUseHRCommandCenter.mock.calls.map((c) => c[0]);
    expect(calledWith).toContain('company-xyz');
  });
});
