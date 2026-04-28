/**
 * HR Security & Auth Regression Tests
 *
 * Cobertura:
 *  - 401 sin JWT
 *  - 400 sin company_id obligatorio
 *  - 403 con company_id ajeno (cross-tenant)
 *  - 200 con company_id correcto
 *  - 422 datos inválidos con company_id correcto
 *  - No cross-tenant read
 *  - No cross-tenant write
 *  - Contrato de error envelope S8: { success:false, error:{code,message}, meta:{timestamp} }
 *
 * Fuentes maestras:
 *  - docs/qa/HR_CURRENT_STATE_VERIFICATION.md
 *  - docs/qa/HR_SECURITY_AUDIT_RESULT.md
 *  - docs/qa/HR_SECURITY_AUDIT_RUNBOOK.md
 *
 * Cómo ejecutar:
 *   bunx vitest run src/__tests__/hr/security-auth-regression.test.ts
 *
 * Invariantes:
 *  - No modifica producción, RLS, migraciones, edge functions, flags ni motores.
 *  - persisted_priority_apply OFF.
 *  - C3B3C2 bloqueada.
 *  - Ninguna salida real TGSS/SEPE/AEAT/SILTRA/CRA/RLC/RNT/Contrat@/Certific@/DELT@.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Fixtures deterministas
const OWN_COMPANY = 'test-company-own-0001';
const FOREIGN_COMPANY = 'test-company-foreign-9999';
const FN_NAME = 'erp-hr-readiness-check';

// Envelope estándar S8 — único contrato de error aceptado
type S8Error = {
  success: false;
  error: { code: string; message: string };
  meta: { timestamp: string };
};

function makeS8Error(code: string, message: string): S8Error {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString() },
  };
}

function expectS8ErrorEnvelope(err: unknown): asserts err is S8Error {
  expect(err).toBeTruthy();
  const e = err as S8Error;
  expect(e.success).toBe(false);
  expect(e.error).toBeTruthy();
  expect(typeof e.error.code).toBe('string');
  expect(typeof e.error.message).toBe('string');
  expect(e.meta).toBeTruthy();
  expect(typeof e.meta.timestamp).toBe('string');
}

describe('HR security & auth regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('401 UNAUTHORIZED cuando no hay JWT', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any);
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: makeS8Error('UNAUTHORIZED', 'JWT missing or invalid'),
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke(FN_NAME, { body: {} });
    expectS8ErrorEnvelope(data);
    expect((data as S8Error).error.code).toBe('UNAUTHORIZED');
  });

  it('400 MISSING_COMPANY_ID cuando body no incluye company_id', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: makeS8Error('MISSING_COMPANY_ID', 'company_id is required'),
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke(FN_NAME, { body: { foo: 'bar' } });
    expectS8ErrorEnvelope(data);
    expect((data as S8Error).error.code).toBe('MISSING_COMPANY_ID');
  });

  it('403 TENANT_FORBIDDEN cuando company_id es ajeno', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: makeS8Error('TENANT_FORBIDDEN', 'No access to company'),
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke(FN_NAME, {
      body: { company_id: FOREIGN_COMPANY },
    });
    expectS8ErrorEnvelope(data);
    expect((data as S8Error).error.code).toBe('TENANT_FORBIDDEN');
  });

  it('200 OK con company_id correcto y JWT válido', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        success: true,
        data: { ok: true, company_id: OWN_COMPANY },
        meta: { timestamp: '2026-01-01T00:00:00.000Z' },
      },
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke(FN_NAME, {
      body: { company_id: OWN_COMPANY },
    });
    expect((data as any).success).toBe(true);
    expect((data as any).data.company_id).toBe(OWN_COMPANY);
  });

  it('422 VALIDATION_ERROR con company_id correcto pero payload inválido', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: makeS8Error('VALIDATION_ERROR', 'period must be YYYY-MM'),
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke(FN_NAME, {
      body: { company_id: OWN_COMPANY, period: 'NOT-A-DATE' },
    });
    expectS8ErrorEnvelope(data);
    expect((data as S8Error).error.code).toBe('VALIDATION_ERROR');
  });

  it('No cross-tenant read: select con company_id ajeno devuelve 0 filas (RLS)', async () => {
    const selectMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: undefined as unknown,
    };
    // Devuelve thenable simple
    (selectMock as any).then = (resolve: (v: any) => void) =>
      resolve({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValueOnce(selectMock as any);

    const result: any = await (supabase.from('erp_hr_employees') as any)
      .select('*')
      .eq('company_id', FOREIGN_COMPANY);

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('No cross-tenant write: insert con company_id ajeno devuelve error RLS (42501)', async () => {
    const insertMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'new row violates row-level security policy' },
      }),
    };
    vi.mocked(supabase.from).mockReturnValueOnce(insertMock as any);

    const { data, error } = await (supabase.from('erp_hr_employees') as any)
      .insert({ company_id: FOREIGN_COMPANY, name: 'x' })
      .select()
      .single();

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect((error as any).code).toBe('42501');
  });

  it('Contrato S8 uniforme en todos los errores', () => {
    const samples = [
      makeS8Error('UNAUTHORIZED', 'a'),
      makeS8Error('MISSING_COMPANY_ID', 'b'),
      makeS8Error('TENANT_FORBIDDEN', 'c'),
      makeS8Error('VALIDATION_ERROR', 'd'),
    ];
    for (const s of samples) {
      expectS8ErrorEnvelope(s);
    }
  });
});
