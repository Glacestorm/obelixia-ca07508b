/**
 * CASUISTICA-FECHAS-01 — Fase C3B1
 * Tests del hook de mutaciones (alta de incidencias persistidas).
 * Solo INSERT. Sin update/upsert/delete. Sin service_role.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// === Mocks ===
const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();

const fromMock = vi.fn((_table: string) => ({
  insert: insertMock,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { usePayrollIncidentMutations } from '../usePayrollIncidentMutations';
import { toast } from 'sonner';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

const ctx = {
  companyId: 'co-1',
  employeeId: 'emp-1',
  periodYear: 2026,
  periodMonth: 3,
};

function setupInsert({
  data,
  error,
}: {
  data?: { id: string } | null;
  error?: { message: string } | null;
}) {
  singleMock.mockResolvedValue({ data: data ?? null, error: error ?? null });
  selectMock.mockReturnValue({ single: singleMock });
  insertMock.mockReturnValue({ select: selectMock });
}

describe('usePayrollIncidentMutations — C3B1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPayrollIncident usa .insert() (no update/upsert/delete) con payload correcto', async () => {
    setupInsert({ data: { id: 'inc-1' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.createPayrollIncident({
        incident_type: 'pnr',
        applies_from: '2026-03-05',
        applies_to: '2026-03-10',
        units: 6,
        legal_review_required: false,
        requires_ss_action: true,
        requires_external_filing: true,
        official_communication_type: 'AFI',
      });
    });

    expect(fromMock).toHaveBeenCalledWith('erp_hr_payroll_incidents');
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0][0];
    expect(payload).toMatchObject({
      company_id: 'co-1',
      employee_id: 'emp-1',
      period_year: 2026,
      period_month: 3,
      incident_type: 'pnr',
      applies_from: '2026-03-05',
      applies_to: '2026-03-10',
      status: 'pending',
      source: 'payroll_dialog',
      version: 1,
      created_by: 'user-123',
      official_communication_type: 'AFI',
      requires_ss_action: true,
      requires_external_filing: true,
    });
    // Garantías de no-uso
    const builder = fromMock.mock.results[0].value as Record<string, unknown>;
    expect(builder.update).toBeUndefined();
    expect(builder.upsert).toBeUndefined();
    expect(builder.delete).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });

  it('en error de RLS/trigger propaga mensaje seguro vía toast.error', async () => {
    setupInsert({ data: null, error: { message: 'incident_type "x" no permitido' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    let res: { id: string } | null = { id: 'x' };
    await act(async () => {
      res = await result.current.createPayrollIncident({
        incident_type: 'otra',
        applies_from: '2026-03-01',
        applies_to: '2026-03-02',
      });
    });

    expect(res).toBeNull();
    expect(toast.error).toHaveBeenCalled();
    const msg = (toast.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as string;
    expect(msg).toMatch(/no permitido/);
  });

  it('no falta contexto: si companyId vacío, no llama supabase', async () => {
    setupInsert({ data: { id: 'x' } });
    const { result } = renderHook(
      () => usePayrollIncidentMutations({ ...ctx, companyId: '' }),
      { wrapper },
    );
    await act(async () => {
      await result.current.createPayrollIncident({
        incident_type: 'otra',
        applies_from: '2026-03-01',
        applies_to: '2026-03-02',
      });
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});