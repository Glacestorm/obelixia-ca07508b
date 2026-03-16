/**
 * ledgerEngine — Pure logic for HR immutable ledger
 * V2-RRHH-FASE-2: Hashing, event building, validation
 *
 * NO Supabase, NO React — pure functions only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type LedgerEventType =
  | 'employee_created' | 'employee_updated' | 'master_data_changed'
  | 'contract_created' | 'contract_updated' | 'contract_terminated'
  | 'salary_changed'
  | 'payroll_incident_created' | 'payroll_incident_resolved'
  | 'payroll_calculated' | 'payroll_recalculated'
  | 'payroll_closed' | 'payroll_reopened' | 'payroll_rectified'
  | 'document_generated' | 'document_uploaded' | 'document_signed'
  | 'document_expired' | 'document_version_created'
  | 'settlement_created' | 'settlement_calculated'
  | 'termination_initiated'
  | 'official_export_prepared' | 'official_export_submitted'
  | 'expedient_action'
  | 'consent_granted' | 'consent_revoked'
  | 'approval_requested' | 'approval_granted' | 'approval_rejected'
  | 'period_closed' | 'period_reopened'
  | 'rectification_issued' | 'reversion_applied'
  | 'bulk_operation' | 'system_event';

export type VersionState =
  | 'draft' | 'validated' | 'closed'
  | 'rectified' | 'reopened' | 'superseded' | 'cancelled';

export type EvidenceType =
  | 'document' | 'snapshot' | 'approval' | 'signature'
  | 'export_package' | 'closure_package' | 'calculation_result'
  | 'validation_result' | 'external_receipt' | 'system_generated';

export interface LedgerEventInput {
  companyId: string;
  eventType: LedgerEventType;
  eventLabel: string;
  entityType: string;
  entityId: string;
  aggregateType?: string;
  aggregateId?: string;
  processId?: string;
  correlationId?: string;
  parentEventId?: string;
  actorId?: string;
  actorRole?: string;
  sourceModule?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  changedFields?: string[];
  financialImpact?: Record<string, unknown>;
  complianceImpact?: Record<string, unknown>;
  isRectification?: boolean;
  isReopening?: boolean;
  isReversion?: boolean;
  isReemission?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LedgerEventRow {
  company_id: string;
  event_type: LedgerEventType;
  event_label: string;
  entity_type: string;
  entity_id: string;
  aggregate_type: string | null;
  aggregate_id: string | null;
  process_id: string | null;
  correlation_id: string | null;
  parent_event_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  source_module: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  changed_fields: string[] | null;
  financial_impact: Record<string, unknown> | null;
  compliance_impact: Record<string, unknown> | null;
  immutable_hash: string;
  is_rectification: boolean;
  is_reopening: boolean;
  is_reversion: boolean;
  is_reemission: boolean;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
}

// ─── Event Labels (human-readable, ES) ──────────────────────────────────────

export const LEDGER_EVENT_LABELS: Record<LedgerEventType, string> = {
  employee_created: 'Alta de empleado',
  employee_updated: 'Actualización de empleado',
  master_data_changed: 'Cambio de datos maestro',
  contract_created: 'Contrato creado',
  contract_updated: 'Contrato modificado',
  contract_terminated: 'Contrato extinguido',
  salary_changed: 'Cambio retributivo',
  payroll_incident_created: 'Incidencia de nómina creada',
  payroll_incident_resolved: 'Incidencia de nómina resuelta',
  payroll_calculated: 'Nómina calculada',
  payroll_recalculated: 'Nómina recalculada',
  payroll_closed: 'Nómina cerrada',
  payroll_reopened: 'Nómina reabierta',
  payroll_rectified: 'Nómina rectificada',
  document_generated: 'Documento generado',
  document_uploaded: 'Documento cargado',
  document_signed: 'Documento firmado',
  document_expired: 'Documento vencido',
  document_version_created: 'Nueva versión documental',
  settlement_created: 'Finiquito creado',
  settlement_calculated: 'Finiquito calculado',
  termination_initiated: 'Baja iniciada',
  official_export_prepared: 'Exportación oficial preparada',
  official_export_submitted: 'Exportación oficial enviada',
  expedient_action: 'Acción sobre expediente',
  consent_granted: 'Consentimiento otorgado',
  consent_revoked: 'Consentimiento revocado',
  approval_requested: 'Aprobación solicitada',
  approval_granted: 'Aprobación concedida',
  approval_rejected: 'Aprobación rechazada',
  period_closed: 'Período cerrado',
  period_reopened: 'Período reabierto',
  rectification_issued: 'Rectificación emitida',
  reversion_applied: 'Reversión aplicada',
  bulk_operation: 'Operación masiva',
  system_event: 'Evento del sistema',
};

// ─── Hash computation ───────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hash of the key immutable fields.
 * Uses Web Crypto API (available in browsers and Deno).
 */
export async function computeImmutableHash(input: LedgerEventInput): Promise<string> {
  const payload = JSON.stringify({
    c: input.companyId,
    t: input.eventType,
    et: input.entityType,
    ei: input.entityId,
    bs: input.beforeSnapshot ?? null,
    as: input.afterSnapshot ?? null,
    ts: new Date().toISOString(),
  });

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple string hash for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ─── Row builder ────────────────────────────────────────────────────────────

export async function buildLedgerRow(input: LedgerEventInput): Promise<LedgerEventRow> {
  const hash = await computeImmutableHash(input);

  return {
    company_id: input.companyId,
    event_type: input.eventType,
    event_label: input.eventLabel || LEDGER_EVENT_LABELS[input.eventType] || input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    aggregate_type: input.aggregateType ?? null,
    aggregate_id: input.aggregateId ?? null,
    process_id: input.processId ?? null,
    correlation_id: input.correlationId ?? null,
    parent_event_id: input.parentEventId ?? null,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    source_module: input.sourceModule ?? 'hr',
    before_snapshot: input.beforeSnapshot ?? null,
    after_snapshot: input.afterSnapshot ?? null,
    changed_fields: input.changedFields ?? null,
    financial_impact: input.financialImpact ?? null,
    compliance_impact: input.complianceImpact ?? null,
    immutable_hash: hash,
    is_rectification: input.isRectification ?? false,
    is_reopening: input.isReopening ?? false,
    is_reversion: input.isReversion ?? false,
    is_reemission: input.isReemission ?? false,
    metadata: input.metadata ?? {},
    ip_address: null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };
}

// ─── Changed fields detection ───────────────────────────────────────────────

export function detectChangedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  if (!before || !after) return [];
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

// ─── Version state machine ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<VersionState, VersionState[]> = {
  draft: ['validated', 'cancelled'],
  validated: ['closed', 'draft', 'cancelled'],
  closed: ['rectified', 'reopened', 'superseded'],
  rectified: ['draft', 'validated'],
  reopened: ['draft', 'validated', 'closed'],
  superseded: [],
  cancelled: [],
};

export function canTransitionVersion(from: VersionState, to: VersionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(state: VersionState): VersionState[] {
  return VALID_TRANSITIONS[state] ?? [];
}

export function isTerminalVersionState(state: VersionState): boolean {
  return state === 'superseded' || state === 'cancelled';
}

export const VERSION_STATE_LABELS: Record<VersionState, string> = {
  draft: 'Borrador',
  validated: 'Validado',
  closed: 'Cerrado',
  rectified: 'Rectificado',
  reopened: 'Reabierto',
  superseded: 'Reemplazado',
  cancelled: 'Cancelado',
};

export const VERSION_STATE_COLORS: Record<VersionState, string> = {
  draft: 'bg-muted text-muted-foreground',
  validated: 'bg-blue-100 text-blue-800',
  closed: 'bg-emerald-100 text-emerald-800',
  rectified: 'bg-amber-100 text-amber-800',
  reopened: 'bg-orange-100 text-orange-800',
  superseded: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-800',
};
