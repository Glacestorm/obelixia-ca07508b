/**
 * HR Command Center · Phase 2C — Official integrations states
 *
 * Validates the pure builder `buildOfficialIntegrationsSnapshot` and the
 * aggregator's behavior when official integrations are red / degraded.
 *
 * Run:
 *   bunx vitest run src/__tests__/hr/command-center-officials-states.test.tsx
 *   bunx vitest run src/__tests__/hr/
 *
 * Invariants honored:
 *  - persisted_priority_apply OFF · C3B3C2 BLOCKED.
 *  - No edge function, RLS, migration or engine touched.
 *  - No row is elevated to accepted / submitted / official_ready
 *    without verifiable archived evidence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import {
  buildOfficialIntegrationsSnapshot,
  OFFICIAL_CONNECTORS,
} from '@/hooks/erp/hr/useOfficialIntegrationsSnapshot';

// ── Mocks for the aggregator (used in tests #8 & #9) ────────────────────────
const execMock = vi.fn();
const preflightMock = vi.fn();
const docsMock = vi.fn();
const vptMock = vi.fn();
const legalMock = vi.fn();
const officialMock = vi.fn();

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
vi.mock('@/hooks/erp/hr/useOfficialIntegrationsSnapshot', async () => {
  const actual: any = await vi.importActual(
    '@/hooks/erp/hr/useOfficialIntegrationsSnapshot',
  );
  return {
    ...actual,
    useOfficialIntegrationsSnapshot: (id: string) => officialMock(id),
  };
});

import { useHRCommandCenter } from '@/hooks/erp/hr/useHRCommandCenter';

// ── Helpers ─────────────────────────────────────────────────────────────────

function findItem(snap: ReturnType<typeof buildOfficialIntegrationsSnapshot>, key: string) {
  return snap.items.find(i => i.key === key)!;
}

function execGreen() {
  return {
    isLoading: false,
    workforceStats: { activeEmployees: 100, newHiresMonth: 0, departuresMonth: 0, onLeave: 0 },
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
function docsGreen() {
  return {
    isLoadingDocuments: false,
    getExpedientStats: () => ({ total: 50, expiringSoon: 0, unverified: 0, activeConsents: 50 }),
  };
}
function vptNoData() { return { isLoading: false }; }
function legalNoData() {
  return {
    isLoading: false,
    obligations: [], deadlines: [], sanctionRisks: [], alerts: [],
    upcomingDeadlines: [], riskAssessment: null,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('buildOfficialIntegrationsSnapshot · Phase 2C', () => {
  it('1. with no rows: every connector is not_configured, gray, no green', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [], certificates: [], adapters: [],
    });
    expect(snap.level).toBe('gray');
    expect(snap.score).toBeNull();
    expect(snap.hasData).toBe(false);
    expect(snap.items.length).toBe(OFFICIAL_CONNECTORS.length);
    snap.items.forEach(i => {
      expect(i.displayedState).toBe('not_configured');
      expect(i.degraded).toBe(false);
    });
  });

  it('2. accepted without evidence/response → degraded to uat_passed', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'tgss',
          submission_type: 'afiliacion',
          status: 'accepted',
          // no evidence, no response_payload, no receipt
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    const item = findItem(snap, 'tgss_afiliacion');
    expect(item.rawState).toBe('accepted');
    expect(item.displayedState).toBe('uat_passed');
    expect(item.degraded).toBe(true);
    expect(item.warning).toMatch(/evidencia oficial archivada/i);
    // No accepted in displayed states
    expect(snap.items.some(i => i.displayedState === 'accepted')).toBe(false);
    expect(snap.acceptedCount).toBe(0);
  });

  it('3. submitted without evidence → degraded to uat_in_progress', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'sepe',
          submission_type: 'contrata',
          status: 'submitted',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    const item = findItem(snap, 'sepe_contrata');
    expect(item.rawState).toBe('submitted');
    expect(item.displayedState).toBe('uat_in_progress');
    expect(item.degraded).toBe(true);
    expect(item.warning).toMatch(/evidencia archivada/i);
    expect(snap.degradedCount).toBeGreaterThan(0);
  });

  it('4. official_ready without production certificate → degraded to sandbox_ready', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'aeat',
          submission_type: 'modelo 111',
          status: 'official_ready',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [
        // sandbox cert, not production
        {
          domain: 'aeat',
          certificate_status: 'active',
          environment: 'sandbox',
          expiration_date: '2030-01-01',
        },
      ],
      adapters: [],
    });
    const item = findItem(snap, 'aeat_111');
    expect(item.rawState).toBe('official_ready');
    expect(item.displayedState).toBe('sandbox_ready');
    expect(item.degraded).toBe(true);
    expect(item.warning).toMatch(/certificado productivo/i);
  });

  it('5. rejected → red card, blockers > 0', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'siltra',
          submission_type: 'rlc',
          status: 'rejected',
          updated_at: '2026-04-01T00:00:00Z',
          last_error: 'invalid xml',
        },
      ],
      certificates: [],
      adapters: [],
    });
    const item = findItem(snap, 'siltra_rlc_rnt');
    expect(item.rawState).toBe('rejected');
    expect(item.displayedState).toBe('rejected');
    expect(snap.level).toBe('red');
    expect(snap.blockers).toBeGreaterThan(0);
    expect(snap.rejectedCount).toBeGreaterThan(0);
  });

  it('6. correction_required → amber card, warnings > 0', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'sepe',
          submission_type: 'certifica',
          status: 'correction_required',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    const item = findItem(snap, 'sepe_certifica');
    expect(item.displayedState).toBe('correction_required');
    expect(snap.level).toBe('amber');
    expect(snap.warnings).toBeGreaterThan(0);
    expect(snap.correctionRequiredCount).toBeGreaterThan(0);
  });

  it('7. accepted WITH evidence + response → keeps accepted, score capped at 80, disclaimer present', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'tgss',
          submission_type: 'afiliacion',
          status: 'accepted',
          response_payload: { ack: 'OK', csv: 'XYZ' },
          external_reference: 'CSV-12345',
          accepted_at: '2026-04-01T10:00:00Z',
          updated_at: '2026-04-01T10:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    const item = findItem(snap, 'tgss_afiliacion');
    expect(item.rawState).toBe('accepted');
    expect(item.displayedState).toBe('accepted');
    expect(item.degraded).toBe(false);
    expect(item.score).toBeLessThanOrEqual(80);
    expect(snap.score!).toBeLessThanOrEqual(80);
    expect(snap.disclaimer).toMatch(/Lectura interna de readiness/i);
    expect(item.hasEvidence).toBe(true);
    expect(item.hasOfficialResponse).toBe(true);
  });

  it('7A. accepted with ONLY external_reference (no response/receipt/accepted_at) → degraded to uat_passed', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'tgss',
          submission_type: 'afiliacion',
          status: 'accepted',
          external_reference: 'LOCAL-TRACK-001',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    const item = findItem(snap, 'tgss_afiliacion');
    expect(item.rawState).toBe('accepted');
    expect(item.hasOfficialResponse).toBe(false);
    expect(item.displayedState).toBe('uat_passed');
    expect(item.degraded).toBe(true);
    expect(snap.items.some(i => i.displayedState === 'accepted')).toBe(false);
    expect(snap.acceptedCount).toBe(0);
  });

  it('7B. official_ready with production cert but status cert_ready_preparatory → degraded to sandbox_ready', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'aeat',
          submission_type: 'modelo 111',
          status: 'official_ready',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [
        {
          domain: 'aeat',
          certificate_status: 'cert_ready_preparatory',
          environment: 'production',
          expiration_date: '2030-01-01',
        },
      ],
      adapters: [],
    });
    const item = findItem(snap, 'aeat_111');
    expect(item.rawState).toBe('official_ready');
    expect(item.hasProductionCertificate).toBe(false);
    expect(item.displayedState).toBe('sandbox_ready');
    expect(item.degraded).toBe(true);
    expect(item.warning).toMatch(/certificado productivo/i);
  });

  it('7C. official_ready with production cert and status active → keeps official_ready, score <= 70, no accepted', () => {
    const snap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'aeat',
          submission_type: 'modelo 190',
          status: 'official_ready',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [
        {
          domain: 'aeat',
          certificate_status: 'active',
          environment: 'production',
          expiration_date: '2030-01-01',
        },
      ],
      adapters: [],
    });
    const item = findItem(snap, 'aeat_190');
    expect(item.rawState).toBe('official_ready');
    expect(item.hasProductionCertificate).toBe(true);
    expect(item.displayedState).toBe('official_ready');
    expect(item.degraded).toBe(false);
    expect(item.score).toBeLessThanOrEqual(70);
    expect(snap.items.some(i => i.displayedState === 'accepted')).toBe(false);
    expect(snap.disclaimer).toMatch(/Lectura interna de readiness/i);
  });
});

describe('useHRCommandCenter · Phase 2C aggregation', () => {
  beforeEach(() => {
    execMock.mockReset();
    preflightMock.mockReset();
    docsMock.mockReset();
    vptMock.mockReset();
    legalMock.mockReset();
    officialMock.mockReset();

    execMock.mockReturnValue(execGreen());
    preflightMock.mockReturnValue(preflightGreen());
    docsMock.mockReturnValue(docsGreen());
    vptMock.mockReturnValue(vptNoData());
    legalMock.mockReturnValue(legalNoData());
  });

  it('8. officialIntegrations RED forces global RED', () => {
    const officialSnap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'tgss',
          submission_type: 'afiliacion',
          status: 'rejected',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    officialMock.mockReturnValue({ snapshot: officialSnap, isLoading: false });

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.officialIntegrations.level).toBe('red');
    expect(result.current.globalReadiness.level).toBe('red');
    expect(result.current.globalReadiness.blockers).toBeGreaterThan(0);
  });

  it('9. officialIntegrations degraded forces global at least AMBER (no red)', () => {
    const officialSnap = buildOfficialIntegrationsSnapshot({
      submissions: [
        {
          submission_domain: 'tgss',
          submission_type: 'afiliacion',
          status: 'accepted', // will be degraded → uat_passed
          updated_at: '2026-04-01T00:00:00Z',
        },
      ],
      certificates: [],
      adapters: [],
    });
    officialMock.mockReturnValue({ snapshot: officialSnap, isLoading: false });

    const { result } = renderHook(() => useHRCommandCenter('co-1'));
    expect(result.current.officialIntegrations.degradedCount).toBeGreaterThan(0);
    // Not red (no rejected, no blockers)
    expect(result.current.officialIntegrations.level).not.toBe('red');
    // Global never green when official is degraded
    expect(result.current.globalReadiness.level).not.toBe('green');
  });
});