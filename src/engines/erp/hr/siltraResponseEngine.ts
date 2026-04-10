/**
 * siltraResponseEngine — Pure logic for TGSS/SILTRA response reception
 * V2-RRHH-P1.4: Mirrors ta2ReceptionEngine / sepeReceptionEngine pattern
 *
 * Handles RLC, RNT, and CRA response registration.
 * NO Supabase, NO React — pure functions only.
 */

import type { RLCRNTCRAArtifactStatus } from './rlcRntCraArtifactEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SiltraArtifactType = 'rlc' | 'rnt' | 'cra';
export type SiltraResponseType = 'accepted' | 'rejected' | 'confirmed';

export interface SiltraResponseInput {
  artifactId: string;
  artifactType: SiltraArtifactType;
  companyId: string;
  periodYear: number;
  periodMonth: number;
  responseType: SiltraResponseType;
  tgssReference: string;
  receptionDate: string;
  rejectionReason?: string;
  notes?: string;
  registeredBy: string;
}

export interface SiltraResponseValidation {
  isValid: boolean;
  errors: string[];
}

export interface SiltraResponseRecord {
  newArtifactStatus: RLCRNTCRAArtifactStatus;
  evidenceSnapshot: Record<string, unknown>;
  evidenceLabel: string;
  ledgerEventLabel: string;
  tgssReference: string;
  receptionDate: string;
  responseType: SiltraResponseType;
  artifactType: SiltraArtifactType;
  rejectionReason: string | null;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const ARTIFACT_LABELS: Record<SiltraArtifactType, string> = {
  rlc: 'RLC',
  rnt: 'RNT',
  cra: 'CRA',
};

export const SILTRA_RESPONSE_LABELS: Record<SiltraResponseType, string> = {
  accepted: 'Aceptado por TGSS',
  rejected: 'Rechazado por TGSS',
  confirmed: 'Confirmado (reconciliado)',
};

export const SILTRA_RESPONSE_COLORS: Record<SiltraResponseType, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
  confirmed: 'bg-green-500/10 text-green-700 border-green-500/30',
};

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateSiltraInput(input: SiltraResponseInput): SiltraResponseValidation {
  const errors: string[] = [];

  if (!input.artifactId?.trim()) {
    errors.push('ID del artefacto es obligatorio');
  }
  if (!input.companyId?.trim()) {
    errors.push('ID de empresa es obligatorio');
  }
  if (!['rlc', 'rnt', 'cra'].includes(input.artifactType)) {
    errors.push('Tipo de artefacto debe ser RLC, RNT o CRA');
  }
  if (!input.tgssReference?.trim()) {
    errors.push('Referencia TGSS es obligatoria');
  }
  if (!input.receptionDate?.trim()) {
    errors.push('Fecha de recepción es obligatoria');
  } else if (!/^\d{4}-\d{2}-\d{2}/.test(input.receptionDate)) {
    errors.push('Fecha de recepción: formato AAAA-MM-DD');
  }
  if (!input.responseType) {
    errors.push('Tipo de respuesta es obligatorio');
  }
  if (input.responseType === 'rejected' && !input.rejectionReason?.trim()) {
    errors.push('Motivo de rechazo es obligatorio cuando la respuesta es negativa');
  }
  if (input.responseType === 'confirmed') {
    // confirmed requires prior accepted status — caller must enforce this
  }
  if (!input.registeredBy?.trim()) {
    errors.push('Usuario que registra es obligatorio');
  }
  if (!input.periodYear || input.periodYear < 2020) {
    errors.push('Año del período es obligatorio');
  }
  if (!input.periodMonth || input.periodMonth < 1 || input.periodMonth > 12) {
    errors.push('Mes del período es obligatorio (1-12)');
  }

  return { isValid: errors.length === 0, errors };
}

// ─── Record Builder ──────────────────────────────────────────────────────────

export function buildSiltraResponseRecord(input: SiltraResponseInput): SiltraResponseRecord {
  const typeLabel = ARTIFACT_LABELS[input.artifactType];
  const periodLabel = `${String(input.periodMonth).padStart(2, '0')}/${input.periodYear}`;

  const statusMap: Record<SiltraResponseType, RLCRNTCRAArtifactStatus> = {
    accepted: 'accepted',
    rejected: 'rejected',
    confirmed: 'confirmed',
  };

  const eventMap: Record<SiltraResponseType, string> = {
    accepted: `Respuesta TGSS recibida: ${typeLabel} aceptado (${periodLabel})`,
    rejected: `Respuesta TGSS recibida: ${typeLabel} rechazado (${periodLabel})`,
    confirmed: `${typeLabel} confirmado tras reconciliación (${periodLabel})`,
  };

  return {
    newArtifactStatus: statusMap[input.responseType],
    evidenceSnapshot: {
      artifactId: input.artifactId,
      artifactType: input.artifactType,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      tgssReference: input.tgssReference,
      receptionDate: input.receptionDate,
      responseType: input.responseType,
      rejectionReason: input.rejectionReason ?? null,
      registeredBy: input.registeredBy,
      registeredAt: new Date().toISOString(),
    },
    evidenceLabel: `Respuesta TGSS — ${typeLabel} ${input.responseType === 'confirmed' ? 'Confirmado' : input.responseType === 'accepted' ? 'Aceptado' : 'Rechazado'} (Ref: ${input.tgssReference})`,
    ledgerEventLabel: eventMap[input.responseType],
    tgssReference: input.tgssReference.trim(),
    receptionDate: input.receptionDate,
    responseType: input.responseType,
    artifactType: input.artifactType,
    rejectionReason: input.rejectionReason?.trim() ?? null,
  };
}
