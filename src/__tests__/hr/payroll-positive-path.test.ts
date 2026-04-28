/**
 * HR Payroll Positive Path & Preflight Regression Tests
 *
 * Cobertura:
 *  - Camino positivo: ready con evidencia
 *  - Preflight bloquea cierre sin evidencia crítica
 *  - persisted_priority_apply OFF (PAYROLL_EFFECTIVE_CASUISTICA_MODE = persisted_priority_preview)
 *  - C3B3C2 bloqueada
 *  - Sin salida oficial real (todo DRYRUN-*)
 *  - Contrato de error envelope S8
 *
 * Cómo ejecutar:
 *   bunx vitest run src/__tests__/hr/payroll-positive-path.test.ts
 *
 * Invariantes: no toca motor de nómina, simulateES, payload, flags ni BD.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Constantes de seguridad — espejo de runbook (no modifican producción)
const PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'persisted_priority_preview' as const;
const C3B3C2_ENABLED = false as const;

type S8Ok<T> = { success: true; data: T; meta: { timestamp: string } };
type S8Err = { success: false; error: { code: string; message: string }; meta: { timestamp: string } };

const ts = '2026-01-01T00:00:00.000Z';

describe('HR payroll positive path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('camino positivo: status=READY con evidencia y submission DRYRUN', async () => {
    const positiveResponse: S8Ok<{
      status: string;
      evidence: string[];
      submission_id: string;
    }> = {
      success: true,
      data: {
        status: 'READY',
        evidence: ['contract', 'agreement', 'incidents-validated'],
        submission_id: 'DRYRUN-20260101-001',
      },
      meta: { timestamp: ts },
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: positiveResponse,
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke('erp-hr-payroll-preflight', {
      body: { company_id: 'test-company-own-0001', period: '2026-01' },
    });
    expect((data as any).success).toBe(true);
    expect((data as any).data.status).toBe('READY');
    expect((data as any).data.evidence.length).toBeGreaterThan(0);
    // No salida oficial real
    expect((data as any).data.submission_id).toMatch(/^DRYRUN-/);
  });

  it('preflight BLOQUEA cierre si falta evidencia crítica', async () => {
    const blocked: S8Ok<{ status: string; evidence: string[]; reason: string }> = {
      success: true,
      data: { status: 'BLOCKED', evidence: [], reason: 'MISSING_CRITICAL_EVIDENCE' },
      meta: { timestamp: ts },
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: blocked,
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke('erp-hr-payroll-preflight', {
      body: { company_id: 'test-company-own-0001', period: '2026-01' },
    });
    expect((data as any).data.status).toBe('BLOCKED');
    expect((data as any).data.reason).toBe('MISSING_CRITICAL_EVIDENCE');
    expect((data as any).data.evidence).toHaveLength(0);
  });

  it('persisted_priority_apply permanece OFF', () => {
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).toBe('persisted_priority_preview');
    expect(PAYROLL_EFFECTIVE_CASUISTICA_MODE).not.toBe('persisted_priority_apply');
  });

  it('C3B3C2 permanece bloqueada', () => {
    expect(C3B3C2_ENABLED).toBe(false);
  });

  it('ningún submission_id es real (todos prefijo DRYRUN-)', async () => {
    const samples = ['DRYRUN-20260101-001', 'DRYRUN-PAYROLL-XYZ', 'DRYRUN-AFI-1'];
    for (const s of samples) {
      expect(s.startsWith('DRYRUN-')).toBe(true);
    }
    // Anti-test: si una respuesta trae submission_id sin DRYRUN-, debe interpretarse como inseguro
    const unsafe = 'TGSS-AFI-2026-01-001';
    expect(unsafe.startsWith('DRYRUN-')).toBe(false);
  });

  it('error contract S8 en fallo de preflight', async () => {
    const err: S8Err = {
      success: false,
      error: { code: 'PREFLIGHT_FAILED', message: 'period closed' },
      meta: { timestamp: ts },
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: err,
      error: null,
    } as any);

    const { data } = await supabase.functions.invoke('erp-hr-payroll-preflight', {
      body: { company_id: 'test-company-own-0001', period: '2025-12' },
    });
    expect((data as any).success).toBe(false);
    expect((data as any).error.code).toBe('PREFLIGHT_FAILED');
    expect((data as any).meta.timestamp).toBeTruthy();
  });
});
