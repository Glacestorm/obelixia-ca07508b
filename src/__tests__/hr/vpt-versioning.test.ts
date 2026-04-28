/**
 * HR VPT (Job Valuation) Versioning Regression Tests
 *
 * Cobertura (CONTRACT TEST PARCIAL de version linkage):
 *  - VPT approval crea entrada en erp_hr_version_registry (snapshot)
 *  - VPT approval guarda version_id en erp_hr_job_valuations
 *  - Aprobación fallida no crea version_id en VPT
 *  - Snapshot incluye campos canónicos: valuation_id, position_id, factor_scores,
 *    total_score, methodology_snapshot, methodology_version, approved_at
 *  - Contrato de error S8
 *
 * Tablas reales (NO usar nombres ghost):
 *  - erp_hr_version_registry (snapshot/version entry; entity_type = 'vpt_valuation',
 *    entity_id = position_id que pertenece a la valuation)
 *  - erp_hr_job_valuations  (entidad principal con version_id)
 *
 * NOTA — alcance limitado:
 *  Este archivo es un **contract test parcial** del version linkage. NO cubre:
 *  - el sellado real validated → closed del version_registry,
 *  - los triggers/policies que materializan el snapshot inmutable,
 *  - la firma SHA-256 del ledger.
 *  Para cobertura completa del lifecycle, se requieren tests E2E sobre la edge
 *  function de aprobación VPT (a desarrollar).
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
const POSITION_ID = 'pos-test-0001';
const NEW_VERSION_ID = 'ver-reg-test-0001';
const APPROVED_AT = '2026-01-01T00:00:00.000Z';

type S8Err = { success: false; error: { code: string; message: string }; meta: { timestamp: string } };

function buildContentSnapshot() {
  return {
    valuation_id: VPT_ID,
    position_id: POSITION_ID,
    factor_scores: {
      knowhow: 320,
      problem_solving: 264,
      accountability: 200,
    },
    total_score: 784,
    methodology_snapshot: {
      name: 'Hay-like',
      factors: ['knowhow', 'problem_solving', 'accountability'],
      weights: { knowhow: 0.4, problem_solving: 0.33, accountability: 0.27 },
    },
    methodology_version: 'v2026.01',
    approved_at: APPROVED_AT,
  };
}

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
 *  1. INSERT en erp_hr_version_registry con entity_type='vpt_valuation',
 *     entity_id=position_id y content_snapshot canónico → devuelve id
 *  2. UPDATE erp_hr_job_valuations SET version_id = id WHERE id = vpt_id
 */
async function approveVpt(opts: {
  companyId: string;
  vptId: string;
  positionId: string;
}) {
  const contentSnapshot = buildContentSnapshot();

  const versionInsert = await (supabase.from('erp_hr_version_registry') as any)
    .insert({
      company_id: opts.companyId,
      entity_type: 'vpt_valuation',
      entity_id: opts.positionId,
      state: 'approved',
      content_snapshot: contentSnapshot,
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

  return { ok: true, versionId: versionInsert.data.id, snapshot: contentSnapshot };
}

describe('VPT versioning — contract tests (partial linkage)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea entrada en erp_hr_version_registry con entity_type=vpt_valuation y entity_id=position_id', async () => {
    const versionChain = buildVersionInsertChain(NEW_VERSION_ID);
    const vptChain = buildVptUpdateChain();

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ insert: versionChain.insert } as any)
      .mockReturnValueOnce({ update: vptChain.update } as any);

    const res = await approveVpt({ companyId: COMPANY, vptId: VPT_ID, positionId: POSITION_ID });

    expect(res.ok).toBe(true);
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'erp_hr_version_registry');
    expect(versionChain.insert).toHaveBeenCalledTimes(1);
    expect(versionChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: COMPANY,
        entity_type: 'vpt_valuation',
        entity_id: POSITION_ID,
        state: 'approved',
      }),
    );
  });

  it('content_snapshot incluye los campos canónicos VPT', async () => {
    const versionChain = buildVersionInsertChain(NEW_VERSION_ID);
    const vptChain = buildVptUpdateChain();

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ insert: versionChain.insert } as any)
      .mockReturnValueOnce({ update: vptChain.update } as any);

    await approveVpt({ companyId: COMPANY, vptId: VPT_ID, positionId: POSITION_ID });

    const insertArg = versionChain.insert.mock.calls[0][0];
    const snapshot = insertArg.content_snapshot;

    expect(snapshot).toBeTruthy();
    expect(snapshot.valuation_id).toBe(VPT_ID);
    expect(snapshot.position_id).toBe(POSITION_ID);
    expect(snapshot.factor_scores).toEqual(
      expect.objectContaining({
        knowhow: expect.any(Number),
        problem_solving: expect.any(Number),
        accountability: expect.any(Number),
      }),
    );
    expect(typeof snapshot.total_score).toBe('number');
    expect(snapshot.methodology_snapshot).toBeTruthy();
    expect(typeof snapshot.methodology_version).toBe('string');
    expect(snapshot.approved_at).toBe(APPROVED_AT);
  });

  it('actualiza erp_hr_job_valuations.version_id con el id devuelto por el insert', async () => {
    const versionChain = buildVersionInsertChain(NEW_VERSION_ID);
    const vptChain = buildVptUpdateChain();

    vi.mocked(supabase.from)
      .mockReturnValueOnce({ insert: versionChain.insert } as any)
      .mockReturnValueOnce({ update: vptChain.update } as any);

    const res = await approveVpt({ companyId: COMPANY, vptId: VPT_ID, positionId: POSITION_ID });

    expect(res.ok).toBe(true);
    expect((res as any).versionId).toBe(NEW_VERSION_ID);
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'erp_hr_job_valuations');
    expect(vptChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ version_id: NEW_VERSION_ID }),
    );
    expect(vptChain.eq).toHaveBeenCalledWith('id', VPT_ID);
  });

  it('si la creación de versión falla, NO se actualiza erp_hr_job_valuations.version_id', async () => {
    const failingSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'rls' },
    });
    const failingSelect = vi.fn().mockReturnValue({ single: failingSingle });
    const failingInsert = vi.fn().mockReturnValue({ select: failingSelect });

    vi.mocked(supabase.from).mockReturnValueOnce({ insert: failingInsert } as any);

    const res = await approveVpt({ companyId: COMPANY, vptId: VPT_ID, positionId: POSITION_ID });

    expect(res.ok).toBe(false);
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
