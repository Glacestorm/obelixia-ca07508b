/**
 * B8A — Collective Agreement Validation Signature (pure).
 *
 * Internal-audit signature only. NOT a qualified eIDAS signature.
 * UI MUST surface "Validación interna — no oficial" wherever this
 * hash is shown.
 *
 * No Supabase, no fetch, no React. Uses real SHA-256 from B7A hasher.
 */

import { computeSha256Hex } from './collectiveAgreementDocumentHasher';

export interface ValidationSignaturePayload {
  agreement_id: string;
  version_id: string;
  source_id: string;
  sha256_hash: string;
  validator_user_id: string;
  validator_role: string;
  validation_scope: string[];
  checklist: Array<{ key: string; status: string; comment?: string | null }>;
  unresolved_warnings: unknown[];
  resolved_warnings: unknown[];
  previous_validation_id?: string | null;
  signed_at_iso: string;
  checklist_schema_version: 'v1';
}

/**
 * Stable JSON: keys sorted lexicographically at every depth, arrays
 * preserved in caller order EXCEPT `checklist` which is sorted by key
 * (canonical order required for deterministic hashing).
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  );
}

export function canonicalizeValidationPayload(
  payload: ValidationSignaturePayload,
): string {
  const checklist = [...(payload.checklist ?? [])]
    .map((c) => ({
      key: c.key,
      status: c.status,
      comment: c.comment ?? null,
    }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const scope = [...(payload.validation_scope ?? [])].sort();

  const normalized = {
    agreement_id: payload.agreement_id,
    version_id: payload.version_id,
    source_id: payload.source_id,
    sha256_hash: payload.sha256_hash,
    validator_user_id: payload.validator_user_id,
    validator_role: payload.validator_role,
    validation_scope: scope,
    checklist,
    unresolved_warnings: payload.unresolved_warnings ?? [],
    resolved_warnings: payload.resolved_warnings ?? [],
    previous_validation_id: payload.previous_validation_id ?? null,
    signed_at_iso: payload.signed_at_iso,
    checklist_schema_version: payload.checklist_schema_version,
  };

  return stableStringify(normalized);
}

export async function computeValidationSignatureHash(
  payload: ValidationSignaturePayload,
): Promise<string> {
  const canonical = canonicalizeValidationPayload(payload);
  const bytes = new TextEncoder().encode(canonical);
  return computeSha256Hex(bytes);
}
