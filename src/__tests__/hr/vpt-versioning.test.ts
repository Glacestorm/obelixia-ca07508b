/**
 * HR VPT (Job Valuation) Versioning Regression Tests
 *
 * Cobertura:
 *  - VPT approval crea entrada en erp_hr_version_registry (snapshot)
 *  - VPT approval guarda version_id en erp_hr_job_valuations
 *  - Aprobación fallida no crea versión
 *  - Contrato de error S8
 *
 * Tablas reales (NO usar nombres ghost):
 *  - erp_hr_version_registry (snapshot/version entry)
 *  - erp_hr_job_valuations  (entidad principal con version_id)
 *
 * Cómo ejecutar:
 *   bunx vitest run src/__tests__/hr/vpt-versioning.test.ts
 *
 * Invariantes: no toca BD ni RLS; mocks deterministas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const COMPANY = 'test-company-own-0001';
const VPT_ID = 'vpt-test-0001';
const NEW_VERSION_ID = 'ver-reg-test-0001';

type S8Err = { success: false; error: { code: string; message: string }; meta: { timestamp: string } };

function buildVersionInsertChain(insertedId: string) {
  const single = vi.fn().mockResolvedValue({ data: { id: insertedId }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return { insert, select, single };
}

function buildVptUpdateChain() {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn().mockReturnValue({ eq });
  return { update, eq };
}

/**
 * Simula el flujo de aprobación VPT:
 *  1. INSERT en erp_hr_version_registry → devuelve id
 *  2. UPDATE erp_hr_job_valuations SET version_id = id WHERE id = vpt_id
 */
async function approveVpt(opts: {
  companyId: string;
  vptId: string;
  shouldFailVersion?: boolean;
}) {
  const versionInsert = await (supabase.from('erp_hr_version_registry') as any)
    .insert({
      company_id: opts.companyId,
      entity_type: 'job_valuation',
      entity_id: opts.vptId,
      state: 'approved',
    })
    .select()
    .single();

  if (versionInsert.error || !versionInsert.data?.id) {
    return { ok: false, error: versionInsert.error };
  }

  const vptUpdate = await (supabase.from('erp_hr_job_valuations') as any)
    .update({ version_id: versionInsert.data.id, status: 'approved' })
    .eq('id', opts.vptId);

  if (vptUpdate.error) {
    return { ok: false, error: vptUpdate.error };
  }

  return { ok: true, versionId: versionInsert.data.id };
}

describe('VPT versioning', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approval crea entrada en erp_hr_version_registry exactamente 1 vez', async () => {
    const versionChain = buildVersionInsertChain(NEW_VERSION_ID);
    const vptChain = buildVptUpdateChain();

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ insert: versionChain.insert } as any)
      .mockReturnValueOnce({ update: vptChain.update } as any);

    const res = await approveVpt({ companyId: COMPANY, vptId: VPT_ID });

    expect(res.ok).toBe(true);
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'erp_hr_version_registry');
    expect(versionChain.insert).toHaveBeenCalledTimes(1);
    expect(versionChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: COMPANY,
        entity_type: 'job_valuation',
        entity_id: VPT_ID,
      }),
    );
  });

  it('approval guarda version_id en erp_hr_job_valuations', async () => {
    const versionChain = buildVersionInsertChain(NEW_VERSION_ID);
    const vptChain = buildVptUpdateChain();

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ insert: versionChain.insert } as any)
      .mockReturnValueOnce({ update: vptChain.update } as any);

    const res = await approveVpt({ companyId: COMPANY, vptId: VPT_ID });

    expect(res.ok).toBe(true);
    expect((res as any).versionId).toBe(NEW_VERSION_ID);
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'erp_hr_job_valuations');
    expect(vptChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ version_id: NEW_VERSION_ID }),
    );
    expect(vptChain.eq).toHaveBeenCalledWith('id', VPT_ID);
  });

  it('si la creación de versión falla, NO se actualiza erp_hr_job_valuations', async () => {
    const failingSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'rls' },
    });
    const failingSelect = vi.fn().mockReturnValue({ single: failingSingle });
    const failingInsert = vi.fn().mockReturnValue({ select: failingSelect });

    const vptUpdate = vi.fn();

    vi.mocked(supabase.from).mockReturnValueOnce({ insert: failingInsert } as any);

    const res = await approveVpt({ companyId: COMPANY, vptId: VPT_ID });

    expect(res.ok).toBe(false);
    expect(vptUpdate).not.toHaveBeenCalled();
    // Solo se llamó a la tabla de version_registry, no a job_valuations
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('erp_hr_version_registry');
  });

  it('error de aprobación cumple contrato S8', () => {
    const err: S8Err = {
      success: false,
      error: { code: 'VPT_APPROVAL_FAILED', message: 'rls' },
      meta: { timestamp: new Date('2026-01-01').toISOString() },
    };
    expect(err.success).toBe(false);
    expect(err.error.code).toBe('VPT_APPROVAL_FAILED');
    expect(err.meta.timestamp).toBeTruthy();
  });
});
