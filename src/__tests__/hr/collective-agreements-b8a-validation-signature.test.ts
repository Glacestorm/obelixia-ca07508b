import { describe, it, expect } from 'vitest';
import {
  canonicalizeValidationPayload,
  computeValidationSignatureHash,
  type ValidationSignaturePayload,
} from '@/engines/erp/hr/collectiveAgreementValidationSignature';

function basePayload(overrides: Partial<ValidationSignaturePayload> = {}): ValidationSignaturePayload {
  return {
    agreement_id: 'a1',
    version_id: 'v1',
    source_id: 's1',
    sha256_hash: 'a'.repeat(64),
    validator_user_id: 'u1',
    validator_role: 'hr_manager',
    validation_scope: ['metadata', 'salary_tables'],
    checklist: [
      { key: 'official_source_verified', status: 'verified', comment: null },
      { key: 'sha256_reviewed', status: 'verified', comment: null },
    ],
    unresolved_warnings: [],
    resolved_warnings: [],
    previous_validation_id: null,
    signed_at_iso: '2026-04-29T10:00:00.000Z',
    checklist_schema_version: 'v1',
    ...overrides,
  };
}

describe('B8A — validation signature helper', () => {
  it('canonicalization is deterministic regardless of key order', () => {
    const a = canonicalizeValidationPayload(basePayload());
    const b = canonicalizeValidationPayload(
      basePayload({
        checklist: [
          { key: 'sha256_reviewed', status: 'verified', comment: null },
          { key: 'official_source_verified', status: 'verified', comment: null },
        ],
        validation_scope: ['salary_tables', 'metadata'],
      }),
    );
    expect(a).toBe(b);
  });

  it('signature hash is 64 hex lowercase', async () => {
    const h = await computeValidationSignatureHash(basePayload());
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changing a checklist item changes the hash', async () => {
    const h1 = await computeValidationSignatureHash(basePayload());
    const h2 = await computeValidationSignatureHash(
      basePayload({
        checklist: [
          { key: 'official_source_verified', status: 'accepted_with_caveat', comment: 'edge case' },
          { key: 'sha256_reviewed', status: 'verified', comment: null },
        ],
      }),
    );
    expect(h1).not.toBe(h2);
  });

  it('changing signed_at changes the hash', async () => {
    const h1 = await computeValidationSignatureHash(basePayload());
    const h2 = await computeValidationSignatureHash(basePayload({ signed_at_iso: '2026-04-29T11:00:00.000Z' }));
    expect(h1).not.toBe(h2);
  });

  it('signature helper does not use FNV (uses real SHA-256 from B7A)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../engines/erp/hr/collectiveAgreementValidationSignature.ts'),
      'utf8',
    );
    expect(src.toLowerCase()).not.toContain('fnv');
    expect(src).toContain('computeSha256Hex');
  });
});
