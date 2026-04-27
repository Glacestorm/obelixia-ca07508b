/**
 * CASUISTICA-FECHAS-01 — Fase C3B1
 * Tests del hook de mutaciones (alta de incidencias persistidas).
 *
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Cobertura adicional para `updatePayrollIncident` (UPDATE filtrado) y
 * `cancelPayrollIncident` (soft-delete con motivo). Nunca .delete() físico.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// === Mocks ===
const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();

// C3C: cadena UPDATE.
const updateMock = vi.fn();
const updateEqMock = vi.fn();
const updateIs1Mock = vi.fn();
const updateIs2Mock = vi.fn();
const updateSelectMock = vi.fn();
const updateSingleMock = vi.fn();

const deleteSpy = vi.fn();
const upsertSpy = vi.fn();

const fromMock = vi.fn((_table: string) => ({
  insert: insertMock,
  update: updateMock,
  // Sondas de seguridad: si el código llama .delete() o .upsert() los tests fallan.
  delete: deleteSpy,
  upsert: upsertSpy,
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

function setupUpdate({
  data,
  error,
}: {
  data?: { id: string } | null;
  error?: { message: string } | null;
}) {
  updateSingleMock.mockResolvedValue({ data: data ?? null, error: error ?? null });
  updateSelectMock.mockReturnValue({ single: updateSingleMock });
  updateIs2Mock.mockReturnValue({ select: updateSelectMock });
  updateIs1Mock.mockReturnValue({ is: updateIs2Mock });
  updateEqMock.mockReturnValue({ is: updateIs1Mock });
  updateMock.mockReturnValue({ eq: updateEqMock });
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

describe('usePayrollIncidentMutations — C3C update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updatePayrollIncident usa .update() (no .upsert ni .delete) con guardrails', async () => {
    setupUpdate({ data: { id: 'inc-1' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.updatePayrollIncident('inc-1', {
        applies_from: '2026-03-05',
        applies_to: '2026-03-12',
        units: 8,
        notes: 'corregido',
        legal_review_required: true,
        official_communication_type: 'AFI',
      });
    });

    expect(fromMock).toHaveBeenCalledWith('erp_hr_payroll_incidents');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();

    // Guardrails: .eq('id', id).is('deleted_at', null).is('applied_at', null).
    expect(updateEqMock).toHaveBeenCalledWith('id', 'inc-1');
    expect(updateIs1Mock).toHaveBeenCalledWith('deleted_at', null);
    expect(updateIs2Mock).toHaveBeenCalledWith('applied_at', null);

    const payload = updateMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      applies_from: '2026-03-05',
      applies_to: '2026-03-12',
      units: 8,
      notes: 'corregido',
      legal_review_required: true,
      official_communication_type: 'AFI',
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it('updatePayrollIncident filtra claves prohibidas (company_id, employee_id, applied_at, incident_type, concept_code, version)', async () => {
    setupUpdate({ data: { id: 'inc-1' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.updatePayrollIncident('inc-1', {
        // Cast forzado para simular intento malicioso desde caller.
        ...({
          company_id: 'co-EVIL',
          employee_id: 'emp-EVIL',
          applied_at: '2026-03-01T00:00:00Z',
          applied_to_record_id: 'pay-1',
          incident_type: 'otra',
          concept_code: 'ES_OTRA',
          version: 99,
          period_year: 1999,
          period_month: 1,
          deleted_at: '2026-03-01T00:00:00Z',
          deleted_by: 'someone',
          status: 'applied',
          created_at: '2020-01-01',
          created_by: 'fake',
          id: 'inc-OTHER',
        } as never),
        notes: 'sólo esto debería pasar',
      });
    });

    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    for (const k of [
      'company_id',
      'employee_id',
      'applied_at',
      'applied_to_record_id',
      'incident_type',
      'concept_code',
      'version',
      'period_year',
      'period_month',
      'deleted_at',
      'deleted_by',
      'status',
      'created_at',
      'created_by',
      'id',
    ]) {
      expect(payload[k]).toBeUndefined();
    }
    expect(payload.notes).toBe('sólo esto debería pasar');
  });

  it('updatePayrollIncident sin id no llama a supabase', async () => {
    setupUpdate({ data: { id: 'x' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.updatePayrollIncident('', { notes: 'x' });
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('updatePayrollIncident sin claves admitidas no llama a supabase', async () => {
    setupUpdate({ data: { id: 'x' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.updatePayrollIncident('inc-1', {
        ...({ company_id: 'evil' } as never),
      });
    });
    expect(updateMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('error RLS/trigger en update muestra toast seguro', async () => {
    setupUpdate({ data: null, error: { message: 'permission denied' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    let res: { id: string } | null = { id: 'x' };
    await act(async () => {
      res = await result.current.updatePayrollIncident('inc-1', { notes: 'x' });
    });
    expect(res).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('usePayrollIncidentMutations — C3C cancel (soft-delete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancelPayrollIncident usa .update con { deleted_at, deleted_by, cancellation_reason, status:cancelled } y guardrails', async () => {
    setupUpdate({ data: { id: 'inc-1' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.cancelPayrollIncident('inc-1', 'duplicado por error');
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();

    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.deleted_by).toBe('user-123');
    expect(payload.cancellation_reason).toBe('duplicado por error');
    expect(payload.status).toBe('cancelled');
    expect(typeof payload.deleted_at).toBe('string');

    // Guardrails canónicos.
    expect(updateEqMock).toHaveBeenCalledWith('id', 'inc-1');
    expect(updateIs1Mock).toHaveBeenCalledWith('deleted_at', null);
    expect(updateIs2Mock).toHaveBeenCalledWith('applied_at', null);

    expect(toast.success).toHaveBeenCalled();
  });

  it('motivo vacío no llama a supabase', async () => {
    setupUpdate({ data: { id: 'x' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.cancelPayrollIncident('inc-1', '');
    });
    expect(updateMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('motivo < 5 caracteres no llama a supabase', async () => {
    setupUpdate({ data: { id: 'x' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    await act(async () => {
      await result.current.cancelPayrollIncident('inc-1', 'abc');
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('error RLS/trigger en cancel muestra toast seguro', async () => {
    setupUpdate({ data: null, error: { message: 'cannot cancel applied incident' } });
    const { result } = renderHook(() => usePayrollIncidentMutations(ctx), { wrapper });

    let res: { id: string } | null = { id: 'x' };
    await act(async () => {
      res = await result.current.cancelPayrollIncident('inc-1', 'motivo válido');
    });
    expect(res).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
});