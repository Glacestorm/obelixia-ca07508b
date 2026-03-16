/**
 * evidenceEngine — Pure logic for HR evidence management
 * V2-RRHH-FASE-2: Evidence linking, classification, validation
 *
 * NO Supabase, NO React — pure functions only.
 */

import type { EvidenceType } from './ledgerEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvidenceInput {
  companyId: string;
  ledgerEventId?: string;
  evidenceType: EvidenceType;
  evidenceLabel: string;
  refEntityType: string;
  refEntityId: string;
  documentId?: string;
  fileVersionId?: string;
  storagePath?: string;
  storageBucket?: string;
  contentHash?: string;
  evidenceSnapshot?: Record<string, unknown>;
  capturedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceRow {
  company_id: string;
  ledger_event_id: string | null;
  evidence_type: EvidenceType;
  evidence_label: string;
  ref_entity_type: string;
  ref_entity_id: string;
  document_id: string | null;
  file_version_id: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
  content_hash: string | null;
  evidence_snapshot: Record<string, unknown> | null;
  captured_by: string | null;
  metadata: Record<string, unknown>;
}

export interface EvidenceChainItem {
  id: string;
  evidenceType: EvidenceType;
  label: string;
  capturedAt: string;
  isValid: boolean;
  contentHash: string | null;
  refEntityType: string;
  refEntityId: string;
}

// ─── Labels ─────────────────────────────────────────────────────────────────

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  document: 'Documento',
  snapshot: 'Snapshot de datos',
  approval: 'Aprobación',
  signature: 'Firma',
  export_package: 'Paquete de exportación',
  closure_package: 'Paquete de cierre',
  calculation_result: 'Resultado de cálculo',
  validation_result: 'Resultado de validación',
  external_receipt: 'Acuse externo',
  system_generated: 'Generado por sistema',
};

export const EVIDENCE_TYPE_ICONS: Record<EvidenceType, string> = {
  document: 'FileText',
  snapshot: 'Camera',
  approval: 'CheckSquare',
  signature: 'PenTool',
  export_package: 'Package',
  closure_package: 'Lock',
  calculation_result: 'Calculator',
  validation_result: 'ShieldCheck',
  external_receipt: 'Receipt',
  system_generated: 'Bot',
};

// ─── Row builder ────────────────────────────────────────────────────────────

export function buildEvidenceRow(input: EvidenceInput): EvidenceRow {
  return {
    company_id: input.companyId,
    ledger_event_id: input.ledgerEventId ?? null,
    evidence_type: input.evidenceType,
    evidence_label: input.evidenceLabel,
    ref_entity_type: input.refEntityType,
    ref_entity_id: input.refEntityId,
    document_id: input.documentId ?? null,
    file_version_id: input.fileVersionId ?? null,
    storage_path: input.storagePath ?? null,
    storage_bucket: input.storageBucket ?? null,
    content_hash: input.contentHash ?? null,
    evidence_snapshot: input.evidenceSnapshot ?? null,
    captured_by: input.capturedBy ?? null,
    metadata: input.metadata ?? {},
  };
}

// ─── Evidence chain validation ──────────────────────────────────────────────

/**
 * Check if an evidence chain is complete (all items valid, no gaps).
 */
export function validateEvidenceChain(chain: EvidenceChainItem[]): {
  isComplete: boolean;
  invalidCount: number;
  gaps: string[];
} {
  const invalidCount = chain.filter(e => !e.isValid).length;
  const gaps: string[] = [];

  // Check for required evidence types in a closure/rectification scenario
  const types = new Set(chain.map(e => e.evidenceType));
  if (chain.length > 0 && !types.has('snapshot')) {
    gaps.push('Falta snapshot de datos');
  }

  return {
    isComplete: invalidCount === 0 && gaps.length === 0,
    invalidCount,
    gaps,
  };
}

/**
 * Group evidence items by entity for timeline display.
 */
export function groupEvidenceByEntity(
  items: EvidenceChainItem[],
): Map<string, EvidenceChainItem[]> {
  const map = new Map<string, EvidenceChainItem[]>();
  for (const item of items) {
    const key = `${item.refEntityType}:${item.refEntityId}`;
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

/**
 * Sort evidence chain chronologically.
 */
export function sortEvidenceChain(chain: EvidenceChainItem[]): EvidenceChainItem[] {
  return [...chain].sort((a, b) =>
    new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
}
