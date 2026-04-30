/**
 * B11.2C.2 — Unit tests for useTicNacSalaryTableStagingActions.
 * Mocks `@/integrations/supabase/client` to verify:
 *  - no session → AUTH_REQUIRED, never calls invoke
 *  - stageOcrBatch / approveSecond send the expected `action`
 *  - 401 mapped to UNAUTHORIZED, no throw
 *  - reject with short reason blocked client-side, no invoke
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSessionMock(...a),
      refreshSession: (...a: unknown[]) => refreshSessionMock(...a),
    },
    functions: {
      invoke: (...a: unknown[]) => invokeMock(...a),
    },
  },
}));

import { useTicNacSalaryTableStagingActions } from '@/hooks/erp/hr/useTicNacSalaryTableStagingActions';

const FAKE_AGREEMENT = '00000000-0000-0000-0000-000000000001';
const FAKE_VERSION = '00000000-0000-0000-0000-000000000002';
const FAKE_ROW = '00000000-0000-0000-0000-000000000003';

const SAMPLE_RAW_ROW = {
  source_page: '12',
  source_excerpt: 'Anexo I — Tabla salarial',
  year: 2026,
  professional_group: 'A1',
  concept_literal_from_agreement: 'Plus transporte',
  normalized_concept_key: 'plus_transport',
  payroll_label: 'Plus transporte',
  payslip_label: 'Plus transporte',
  plus_transport: 50,
  currency: 'EUR',
};

beforeEach(() => {
  getSessionMock.mockReset();
  refreshSessionMock.mockReset();
  invokeMock.mockReset();
});

describe('useTicNacSalaryTableStagingActions — auth-safe behavior', () => {
  it('returns AUTH_REQUIRED and never calls invoke when no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useTicNacSalaryTableStagingActions());

    let res: Awaited<ReturnType<typeof result.current.approveSingle>> | null = null;
    await act(async () => {
      res = await result.current.approveSingle(FAKE_ROW);
    });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(res).not.toBeNull();
    expect(res!.success).toBe(false);
    if (res!.success === false) {
      expect(res!.error.code).toBe('AUTH_REQUIRED');
      expect(res!.skipped).toBe(true);
    }
  });

  it('stageOcrBatch sends action="stage_ocr_batch" with raw_rows', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    invokeMock.mockResolvedValue({
      data: { success: true, data: { inserted_count: 1, rows: [{ id: 'x' }] } },
      error: null,
    });

    const { result } = renderHook(() => useTicNacSalaryTableStagingActions());
    await act(async () => {
      await result.current.stageOcrBatch({
        agreementId: FAKE_AGREEMENT,
        versionId: FAKE_VERSION,
        approvalMode: 'ocr_dual_human_approval',
        rawRows: [SAMPLE_RAW_ROW],
      });
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [fnName, opts] = invokeMock.mock.calls[0];
    expect(fnName).toBe('erp-hr-agreement-staging');
    expect(opts.body.action).toBe('stage_ocr_batch');
    expect(opts.body.agreement_id).toBe(FAKE_AGREEMENT);
    expect(opts.body.version_id).toBe(FAKE_VERSION);
    expect(opts.body.approval_mode).toBe('ocr_dual_human_approval');
    expect(Array.isArray(opts.body.raw_rows)).toBe(true);
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  it('approveSecond sends action="approve_second"', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    invokeMock.mockResolvedValue({
      data: { success: true, data: { row: {}, approval_hash: 'h' } },
      error: null,
    });

    const { result } = renderHook(() => useTicNacSalaryTableStagingActions());
    await act(async () => {
      await result.current.approveSecond(FAKE_ROW);
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [, opts] = invokeMock.mock.calls[0];
    expect(opts.body.action).toBe('approve_second');
    expect(opts.body.row_id).toBe(FAKE_ROW);
  });

  it('captures 401 and returns UNAUTHORIZED without throwing', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    refreshSessionMock.mockResolvedValue({});
    // Always return 401-shaped envelope
    invokeMock.mockResolvedValue({
      data: {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
      },
      error: null,
    });

    const { result } = renderHook(() => useTicNacSalaryTableStagingActions());
    let res: Awaited<ReturnType<typeof result.current.approveSingle>> | null = null;
    await act(async () => {
      res = await result.current.approveSingle(FAKE_ROW);
    });

    expect(res).not.toBeNull();
    expect(res!.success).toBe(false);
    if (res!.success === false) {
      expect(res!.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('reject with reason shorter than 5 chars is blocked client-side', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });

    const { result } = renderHook(() => useTicNacSalaryTableStagingActions());
    let res: Awaited<ReturnType<typeof result.current.rejectRow>> | null = null;
    await act(async () => {
      res = await result.current.rejectRow(FAKE_ROW, 'no');
    });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(res).not.toBeNull();
    expect(res!.success).toBe(false);
    if (res!.success === false) {
      expect(res!.error.code).toBe('INVALID_PAYLOAD');
      expect(res!.reason).toBe('client_validation');
    }
  });
});