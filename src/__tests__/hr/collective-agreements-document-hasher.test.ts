/**
 * B7A tests — Document hasher.
 * Verifies real SHA-256 (Node fallback OK in jsdom).
 */
import { describe, it, expect } from 'vitest';
import {
  computeSha256Hex,
  isValidSha256Hex,
} from '@/engines/erp/hr/collectiveAgreementDocumentHasher';

const enc = (s: string) => new TextEncoder().encode(s);

// FNV-1a 32-bit reference for cross-check
function fnv1a32Hex(buf: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

describe('B7A — collectiveAgreementDocumentHasher', () => {
  it('same buffer → same hash', async () => {
    const a = await computeSha256Hex(enc('hello-boib'));
    const b = await computeSha256Hex(enc('hello-boib'));
    expect(a).toBe(b);
    expect(isValidSha256Hex(a)).toBe(true);
  });

  it('1-byte change → different hash', async () => {
    const a = await computeSha256Hex(enc('hello-boib'));
    const b = await computeSha256Hex(enc('hello-boiB'));
    expect(a).not.toBe(b);
  });

  it('hash is 64 lowercase hex chars', async () => {
    const h = await computeSha256Hex(enc('boib-2024'));
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(h)).toBe(true);
  });

  it('SHA-256 ≠ FNV-1a (different length, different value, no fnv prefix)', async () => {
    const buf = enc('comparison-input');
    const sha = await computeSha256Hex(buf);
    const fnv = fnv1a32Hex(buf);
    expect(sha).not.toBe(fnv);
    expect(sha).not.toMatch(/^fnv1a32/);
    expect(sha.length).toBe(64);
    expect(fnv.length).toBe(8);
  });

  it('isValidSha256Hex rejects malformed', () => {
    expect(isValidSha256Hex('')).toBe(false);
    expect(isValidSha256Hex('ZZ'.repeat(32))).toBe(false);
    expect(isValidSha256Hex('abcd')).toBe(false);
    expect(isValidSha256Hex('A'.repeat(64))).toBe(false); // uppercase rejected
  });
});