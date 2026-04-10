/**
 * ta2ReceptionEngine.ts — V2-RRHH-P1.1
 * Pure logic for TA2 (TGSS response) reception and validation.
 *
 * NO Supabase, NO React — pure functions only.
 *
 * TA2 is the official response document from TGSS confirming or rejecting
 * an AFI (Alta/Baja/Variación) submission. This engine handles:
 *  - Input validation
 *  - Record building for persistence
 *  - Status determination
 */

import type { AFIArtifactStatus } from './afiArtifactEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TA2ResponseType = 'accepted' | 'rejected';

export interface TA2ReceptionInput {
  /** ID of the AFI artifact in erp_hr_official_artifacts */
  artifactId: string;
  /** Company context */
  companyId: string;
  /** Employee this TA2 corresponds to */
  employeeId: string;
  /** Registration request ID (erp_hr_registration_data) */
  requestId?: string;
  /** TGSS reference number from the TA2 document */
  tgssReference: string;
  /** Date the TA2 was received */
  receptionDate: string;
  /** Whether TGSS accepted or rejected */
  responseType: TA2ResponseType;
  /** Rejection reason (required when responseType === 'rejected') */
  rejectionReason?: string;
  /** Optional notes */
  notes?: string;
  /** User performing the registration */
  registeredBy: string;
}

export interface TA2ReceptionValidation {
  isValid: boolean;
  errors: string[];
}

export interface TA2ReceptionRecord {
  /** Target status for the AFI artifact */
  newArtifactStatus: AFIArtifactStatus;
  /** Data to persist as evidence snapshot */
  evidenceSnapshot: Record<string, unknown>;
  /** Label for evidence record */
  evidenceLabel: string;
  /** Ledger event label */
  ledgerEventLabel: string;
  /** TGSS reference to persist */
  tgssReference: string;
  /** Reception date */
  receptionDate: string;
  /** Response type */
  responseType: TA2ResponseType;
  /** Rejection reason if applicable */
  rejectionReason: string | null;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateTA2Input(input: TA2ReceptionInput): TA2ReceptionValidation {
  const errors: string[] = [];

  if (!input.artifactId?.trim()) {
    errors.push('ID del artefacto AFI es obligatorio');
  }

  if (!input.companyId?.trim()) {
    errors.push('ID de empresa es obligatorio');
  }

  if (!input.employeeId?.trim()) {
    errors.push('ID de empleado es obligatorio');
  }

  if (!input.tgssReference?.trim()) {
    errors.push('Referencia TGSS del TA2 es obligatoria');
  }

  if (!input.receptionDate?.trim()) {
    errors.push('Fecha de recepción es obligatoria');
  } else if (!/^\d{4}-\d{2}-\d{2}/.test(input.receptionDate)) {
    errors.push('Fecha de recepción: formato AAAA-MM-DD');
  }

  if (!input.responseType) {
    errors.push('Tipo de respuesta (aceptado/rechazado) es obligatorio');
  }

  if (input.responseType === 'rejected' && !input.rejectionReason?.trim()) {
    errors.push('Motivo de rechazo es obligatorio cuando la respuesta es negativa');
  }

  if (!input.registeredBy?.trim()) {
    errors.push('Usuario que registra es obligatorio');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ─── Record Builder ──────────────────────────────────────────────────────────

export function buildTA2ReceptionRecord(input: TA2ReceptionInput): TA2ReceptionRecord {
  const isAccepted = input.responseType === 'accepted';

  return {
    newArtifactStatus: isAccepted ? 'accepted' : 'rejected',
    evidenceSnapshot: {
      artifactId: input.artifactId,
      employeeId: input.employeeId,
      tgssReference: input.tgssReference,
      receptionDate: input.receptionDate,
      responseType: input.responseType,
      rejectionReason: input.rejectionReason ?? null,
      registeredBy: input.registeredBy,
      registeredAt: new Date().toISOString(),
    },
    evidenceLabel: isAccepted
      ? `TA2 TGSS — Aceptado (Ref: ${input.tgssReference})`
      : `TA2 TGSS — Rechazado (Ref: ${input.tgssReference})`,
    ledgerEventLabel: isAccepted
      ? 'Respuesta TGSS recibida: Alta aceptada'
      : 'Respuesta TGSS recibida: Alta rechazada',
    tgssReference: input.tgssReference.trim(),
    receptionDate: input.receptionDate,
    responseType: input.responseType,
    rejectionReason: input.rejectionReason?.trim() ?? null,
  };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const TA2_RESPONSE_LABELS: Record<TA2ResponseType, string> = {
  accepted: 'Aceptado por TGSS',
  rejected: 'Rechazado por TGSS',
};

export const TA2_RESPONSE_COLORS: Record<TA2ResponseType, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
};
