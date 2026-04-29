/**
 * B7A — Collective Agreement Document Hasher.
 *
 * Real SHA-256 of source document bytes. Used as official document
 * fingerprint in the registry. NOT a substitute for FNV-1a metadata
 * fingerprint used elsewhere in B5E (different purposes).
 *
 * Pure module: no Supabase, no fetch, no React.
 */

function toHexLower(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < view.length; i++) {
    const b = view[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

/**
 * Compute SHA-256 of a byte buffer. Returns lowercase hex (64 chars).
 * Prefers Web Crypto (`crypto.subtle`) when available; falls back to
 * Node's `crypto` module for non-browser test environments.
 */
export async function computeSha256Hex(buffer: Uint8Array): Promise<string> {
  const subtle: SubtleCrypto | undefined =
    (typeof globalThis !== 'undefined' &&
      (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle) ||
    undefined;

  if (subtle && typeof subtle.digest === 'function') {
    const view = new Uint8Array(buffer);
    const ab = new ArrayBuffer(view.byteLength);
    new Uint8Array(ab).set(view);
    const digest = await subtle.digest('SHA-256', ab);
    return toHexLower(digest);
  }

  // Node fallback (test env). We do NOT use FNV-1a as fallback.
  const nodeCrypto = await import('node:crypto');
  const hash = nodeCrypto.createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}

/**
 * Validates a SHA-256 hex string: 64 lowercase hex chars.
 */
export function isValidSha256Hex(hash: string): boolean {
  return typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
}