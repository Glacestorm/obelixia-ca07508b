/**
 * sepeReceptionEngine — Pure logic for SEPE/Contrat@ response reception
 * V2-RRHH-P1.2: Mirrors ta2ReceptionEngine.ts pattern
 *
 * NO Supabase, NO React — pure functions only.
 */

import type { ContrataArtifactStatus } from './contrataArtifactStatusEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SEPEResponseType = 'accepted' | 'rejected';

export interface SEPEReceptionInput {
  artifactId: string;
  companyId: string;
  employeeId: string;
  contractProcessId?: string;
  sepeReference: string;
  receptionDate: string;
  responseType: SEPEResponseType;
  rejectionReason?: string;
  notes?: string;
  registeredBy: string;
}

export interface SEPEReceptionValidation {
  isValid: boolean;
  errors: string[];
}

export interface SEPEReceptionRecord {
  newArtifactStatus: ContrataArtifactStatus;
  evidenceSnapshot: Record<string, unknown>;
  evidenceLabel: string;
  ledgerEventLabel: string;
  sepeReference: string;
  receptionDate: string;
  responseType: SEPEResponseType;
  rejectionReason: string | null;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateSEPEInput(input: SEPEReceptionInput): SEPEReceptionValidation {
  const errors: string[] = [];

  if (!input.artifactId?.trim()) {
    errors.push('ID del artefacto Contrat@ es obligatorio');
  }
  if (!input.companyId?.trim()) {
    errors.push('ID de empresa es obligatorio');
  }
  if (!input.employeeId?.trim()) {
    errors.push('ID de empleado es obligatorio');
  }
  if (!input.sepeReference?.trim()) {
    errors.push('Referencia SEPE es obligatoria');
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

  return { isValid: errors.length === 0, errors };
}

// ─── Record Builder ──────────────────────────────────────────────────────────

export function buildSEPEReceptionRecord(input: SEPEReceptionInput): SEPEReceptionRecord {
  const isAccepted = input.responseType === 'accepted';

  return {
    newArtifactStatus: isAccepted ? 'accepted' : 'rejected',
    evidenceSnapshot: {
      artifactId: input.artifactId,
      employeeId: input.employeeId,
      contractProcessId: input.contractProcessId ?? null,
      sepeReference: input.sepeReference,
      receptionDate: input.receptionDate,
      responseType: input.responseType,
      rejectionReason: input.rejectionReason ?? null,
      registeredBy: input.registeredBy,
      registeredAt: new Date().toISOString(),
    },
    evidenceLabel: isAccepted
      ? `Respuesta SEPE — Aceptado (Ref: ${input.sepeReference})`
      : `Respuesta SEPE — Rechazado (Ref: ${input.sepeReference})`,
    ledgerEventLabel: isAccepted
      ? 'Respuesta SEPE recibida: Comunicación aceptada'
      : 'Respuesta SEPE recibida: Comunicación rechazada',
    sepeReference: input.sepeReference.trim(),
    receptionDate: input.receptionDate,
    responseType: input.responseType,
    rejectionReason: input.rejectionReason?.trim() ?? null,
  };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const SEPE_RESPONSE_LABELS: Record<SEPEResponseType, string> = {
  accepted: 'Aceptado por SEPE',
  rejected: 'Rechazado por SEPE',
};

export const SEPE_RESPONSE_COLORS: Record<SEPEResponseType, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
};
