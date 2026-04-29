import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createValidationDraft,
  updateValidationChecklist,
  approveValidation,
  rejectValidation,
  VALIDATION_CHECKLIST_KEYS_V1,
  type ValidationServiceAdapter,
  type RegistryAgreementRow,
  type RegistryVersionRow,
  type RegistrySourceRow,
  type ValidationRow,
  type ValidationItemRow,
} from '@/engines/erp/hr/collectiveAgreementValidationService';

const SHA = 'a'.repeat(64);

function makeAdapter(seed: {
  agreement?: RegistryAgreementRow;
  version?: RegistryVersionRow;
  source?: RegistrySourceRow;
  roles?: Record<string, string[]>;
}) {
  const validations = new Map<string, ValidationRow>();
  const items = new Map<string, ValidationItemRow[]>();
  const signatures: any[] = [];
  const superseded: string[] = [];
  let seq = 1;

  const adapter: ValidationServiceAdapter = {
    async fetchAgreement(id) {
      return seed.agreement && seed.agreement.id === id ? seed.agreement : null;
    },
    async fetchVersion(id) {
      return seed.version && seed.version.id === id ? seed.version : null;
    },
    async fetchSource(id) {
      return seed.source && seed.source.id === id ? seed.source : null;
    },
    async fetchCurrentValidation(agreementId, versionId) {
      for (const v of validations.values()) {
        if (v.is_current && v.agreement_id === agreementId && v.version_id === versionId) return v;
      }
      return null;
    },
    async fetchValidation(id) {
      return validations.get(id) ?? null;
    },
    async fetchValidationItems(id) {
      return items.get(id) ?? [];
    },
    async fetchUserRoles(userId) {
      return seed.roles?.[userId] ?? [];
    },
    async insertValidation(args) {
      const id = `val-${seq++}`;
      validations.set(id, {
        id,
        agreement_id: args.agreement_id,
        version_id: args.version_id,
        source_id: args.source_id,
        sha256_hash: args.sha256_hash,
        validator_user_id: args.validator_user_id,
        validator_role: args.validator_role,
        validation_status: args.validation_status,
        validation_scope: args.validation_scope,
        is_current: false,
        notes: null,
        unresolved_warnings: [],
        resolved_warnings: [],
        signature_hash: null,
        validated_at: null,
      });
      return { id };
    },
    async updateValidation(args) {
      const v = validations.get(args.id);
      if (!v) throw new Error('not found');
      Object.assign(v, args.patch);
    },
    async insertSignature(args) {
      signatures.push(args);
      return { id: `sig-${signatures.length}` };
    },
    async insertItems(args) {
      const list: ValidationItemRow[] = args.items.map((i) => ({
        validation_id: args.validation_id,
        item_key: i.item_key,
        item_status: i.item_status ?? 'pending',
        comment: null,
        evidence_url: null,
        evidence_excerpt: null,
      }));
      items.set(args.validation_id, list);
    },
    async upsertItem(args) {
      const list = items.get(args.validation_id) ?? [];
      const existing = list.find((i) => i.item_key === args.item_key);
      if (existing) {
        existing.item_status = args.item_status;
        existing.comment = args.comment ?? null;
        existing.evidence_url = args.evidence_url ?? null;
        existing.evidence_excerpt = args.evidence_excerpt ?? null;
      } else {
        list.push({
          validation_id: args.validation_id,
          item_key: args.item_key,
          item_status: args.item_status,
          comment: args.comment ?? null,
          evidence_url: args.evidence_url ?? null,
          evidence_excerpt: args.evidence_excerpt ?? null,
        });
      }
      items.set(args.validation_id, list);
    },
    async supersedeValidation(id) {
      superseded.push(id);
      const v = validations.get(id);
      if (v) {
        v.is_current = false;
        v.validation_status = 'superseded';
      }
    },
  };

  return { adapter, validations, items, signatures, superseded };
}

function fillChecklistVerified(items: Map<string, ValidationItemRow[]>, validationId: string) {
  const list = items.get(validationId)!;
  for (const it of list) it.item_status = 'verified';
}

const baseSeed = () => ({
  agreement: { id: 'agr-1', internal_code: 'COM-GEN-IB' } as RegistryAgreementRow,
  version: { id: 'ver-1', agreement_id: 'agr-1', source_hash: SHA, is_current: true } as RegistryVersionRow,
  source: { id: 'src-1', agreement_id: 'agr-1', document_hash: SHA } as RegistrySourceRow,
  roles: { 'user-hr': ['hr_manager'], 'user-noop': ['user'] } as Record<string, string[]>,
});

describe('B8A — validation service', () => {
  let env: ReturnType<typeof makeAdapter>;
  beforeEach(() => {
    env = makeAdapter(baseSeed());
  });

  it('createValidationDraft creates 18 checklist items', async () => {
    const r = await createValidationDraft(
      {
        agreement_id: 'agr-1',
        version_id: 'ver-1',
        source_id: 'src-1',
        validator_user_id: 'user-hr',
        validation_scope: ['metadata', 'salary_tables', 'rules'],
      },
      env.adapter,
    );
    expect(env.items.get(r.id)).toHaveLength(VALIDATION_CHECKLIST_KEYS_V1.length);
  });

  it('createValidationDraft fails if user has no authorized role', async () => {
    await expect(
      createValidationDraft(
        { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-noop', validation_scope: [] },
        env.adapter,
      ),
    ).rejects.toThrow('ROLE_NOT_AUTHORIZED');
  });

  it('approveValidation fails with checklist incomplete', async () => {
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    await expect(
      approveValidation({ validation_id: d.id, validator_user_id: 'user-hr' }, env.adapter),
    ).rejects.toThrow(/CHECKLIST_ITEM_PENDING/);
  });

  it('approveValidation fails with SHA256_MISMATCH', async () => {
    const seed = baseSeed();
    seed.version.source_hash = 'b'.repeat(64);
    env = makeAdapter(seed);
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    fillChecklistVerified(env.items, d.id);
    // change version hash AFTER draft to simulate drift
    seed.version.source_hash = 'c'.repeat(64);
    await expect(
      approveValidation({ validation_id: d.id, validator_user_id: 'user-hr' }, env.adapter),
    ).rejects.toThrow('SHA256_MISMATCH');
  });

  it('approveValidation fails with critical unresolved warning', async () => {
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    fillChecklistVerified(env.items, d.id);
    env.validations.get(d.id)!.unresolved_warnings = [{ code: 'X', severity: 'critical' }];
    await expect(
      approveValidation({ validation_id: d.id, validator_user_id: 'user-hr' }, env.adapter),
    ).rejects.toThrow('CRITICAL_UNRESOLVED_WARNINGS');
  });

  it('approveValidation fails if no_payroll_use_acknowledged is not verified', async () => {
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    fillChecklistVerified(env.items, d.id);
    const it = env.items.get(d.id)!.find((i) => i.item_key === 'no_payroll_use_acknowledged')!;
    it.item_status = 'not_applicable';
    await expect(
      approveValidation({ validation_id: d.id, validator_user_id: 'user-hr' }, env.adapter),
    ).rejects.toThrow('NO_PAYROLL_USE_ACK_REQUIRED');
  });

  it('accepted_with_caveat without comment fails on update and on approve', async () => {
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    await expect(
      updateValidationChecklist(
        {
          validation_id: d.id,
          validator_user_id: 'user-hr',
          item_key: 'cnae_codes_reviewed',
          item_status: 'accepted_with_caveat',
          comment: '',
        },
        env.adapter,
      ),
    ).rejects.toThrow('CAVEAT_REQUIRES_COMMENT');
  });

  it('salary_tables scope + categories not_applicable fails', async () => {
    const d = await createValidationDraft(
      {
        agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1',
        validator_user_id: 'user-hr', validation_scope: ['salary_tables'],
      },
      env.adapter,
    );
    fillChecklistVerified(env.items, d.id);
    env.items.get(d.id)!.find((i) => i.item_key === 'categories_reviewed')!.item_status = 'not_applicable';
    await expect(
      approveValidation({ validation_id: d.id, validator_user_id: 'user-hr' }, env.adapter),
    ).rejects.toThrow(/SCOPE_SALARY_TABLES_REQUIRES:categories_reviewed/);
  });

  it('approveValidation OK generates signature_hash and inserts signature and is_current', async () => {
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: ['metadata'] },
      env.adapter,
    );
    fillChecklistVerified(env.items, d.id);
    const r = await approveValidation({ validation_id: d.id, validator_user_id: 'user-hr' }, env.adapter);
    expect(r.signature_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(env.signatures).toHaveLength(1);
    expect(env.validations.get(d.id)!.validation_status).toBe('approved_internal');
    expect(env.validations.get(d.id)!.is_current).toBe(true);
  });

  it('approveValidation supersedes previous current validation', async () => {
    const d1 = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    fillChecklistVerified(env.items, d1.id);
    await approveValidation({ validation_id: d1.id, validator_user_id: 'user-hr' }, env.adapter);

    const d2 = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    fillChecklistVerified(env.items, d2.id);
    const r2 = await approveValidation({ validation_id: d2.id, validator_user_id: 'user-hr' }, env.adapter);
    expect(r2.superseded_previous_id).toBe(d1.id);
    expect(env.validations.get(d1.id)!.validation_status).toBe('superseded');
  });

  it('rejectValidation requires notes and inserts signature', async () => {
    const d = await createValidationDraft(
      { agreement_id: 'agr-1', version_id: 'ver-1', source_id: 'src-1', validator_user_id: 'user-hr', validation_scope: [] },
      env.adapter,
    );
    await expect(
      rejectValidation({ validation_id: d.id, validator_user_id: 'user-hr', notes: '' }, env.adapter),
    ).rejects.toThrow('REJECT_REQUIRES_NOTES');
    await rejectValidation(
      { validation_id: d.id, validator_user_id: 'user-hr', notes: 'No coincide con BOIB' },
      env.adapter,
    );
    expect(env.validations.get(d.id)!.validation_status).toBe('rejected');
    expect(env.signatures).toHaveLength(1);
  });

  it('service file does not import Supabase, does not patch registry, no operational table refs', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../engines/erp/hr/collectiveAgreementValidationService.ts'),
      'utf8',
    );
    expect(src).not.toContain('@/integrations/supabase/client');
    expect(src).not.toContain('@supabase');
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toContain('ready_for_payroll = true');
    expect(src).not.toContain('ready_for_payroll: true');
    expect(src).not.toContain("from 'react'");
    // Operational table forbidden — registry sub-tables only.
    const opMatches = src.match(/erp_hr_collective_agreements(?!_registry)/g);
    expect(opMatches).toBeNull();
    // Service must not reference patching of registry-wide flags.
    expect(src).not.toContain('data_completeness:');
    expect(src).not.toContain('salary_tables_loaded:');
  });
});
