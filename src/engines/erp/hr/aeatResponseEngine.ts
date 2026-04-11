/**
 * aeatResponseEngine — Pure logic for AEAT response reception
 * P1.5R: Mirrors siltraResponseEngine pattern for Modelo 111 / 190
 *
 * Handles acceptance/rejection registration from AEAT.
 * NO Supabase, NO React — pure functions only.
 */

import type { AEATArtifactStatus } from './aeatArtifactEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AEATArtifactType = 'modelo_111' | 'modelo_190';
export type AEATResponseType = 'accepted' | 'rejected';

export interface AEATResponseInput {
  artifactId: string;
  artifactType: AEATArtifactType;
  companyId: string;
  fiscalYear: number;
  /** For 111: trimester (1-4) or month (1-12). For 190: not used */
  period?: number;
  periodicity?: 'trimestral' | 'mensual';
  responseType: AEATResponseType;
  aeatReference: string;
  csvCode?: string;
  receptionDate: string;
  rejectionReason?: string;
  notes?: string;
  registeredBy: string;
}

export interface AEATResponseValidation {
  isValid: boolean;
  errors: string[];
}

export interface AEATResponseRecord {
  newArtifactStatus: AEATArtifactStatus;
  evidenceSnapshot: Record<string, unknown>;
  evidenceLabel: string;
  ledgerEventLabel: string;
  aeatReference: string;
  csvCode: string | null;
  receptionDate: string;
  responseType: AEATResponseType;
  artifactType: AEATArtifactType;
  rejectionReason: string | null;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const ARTIFACT_LABELS: Record<AEATArtifactType, string> = {
  modelo_111: 'Modelo 111',
  modelo_190: 'Modelo 190',
};

export const AEAT_RESPONSE_LABELS: Record<AEATResponseType, string> = {
  accepted: 'Aceptado por AEAT',
  rejected: 'Rechazado por AEAT',
};

export const AEAT_RESPONSE_COLORS: Record<AEATResponseType, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/30',
};

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateAEATInput(input: AEATResponseInput): AEATResponseValidation {
  const errors: string[] = [];

  if (!input.artifactId?.trim()) {
    errors.push('ID del artefacto es obligatorio');
  }
  if (!input.companyId?.trim()) {
    errors.push('ID de empresa es obligatorio');
  }
  if (!['modelo_111', 'modelo_190'].includes(input.artifactType)) {
    errors.push('Tipo de artefacto debe ser Modelo 111 o Modelo 190');
  }
  if (!input.aeatReference?.trim()) {
    errors.push('Referencia AEAT es obligatoria');
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
  if (!input.registeredBy?.trim()) {
    errors.push('Usuario que registra es obligatorio');
  }
  if (!input.fiscalYear || input.fiscalYear < 2020) {
    errors.push('Ejercicio fiscal es obligatorio');
  }

  return { isValid: errors.length === 0, errors };
}

// ─── Record Builder ──────────────────────────────────────────────────────────

export function buildAEATResponseRecord(input: AEATResponseInput): AEATResponseRecord {
  const typeLabel = ARTIFACT_LABELS[input.artifactType];
  const periodLabel = input.artifactType === 'modelo_111'
    ? (input.periodicity === 'mensual'
      ? `M${input.period}/${input.fiscalYear}`
      : `${input.period}T/${input.fiscalYear}`)
    : `Ejercicio ${input.fiscalYear}`;

  const statusMap: Record<AEATResponseType, AEATArtifactStatus> = {
    accepted: 'accepted',
    rejected: 'rejected',
  };

  const eventMap: Record<AEATResponseType, string> = {
    accepted: `Respuesta AEAT recibida: ${typeLabel} aceptado (${periodLabel})`,
    rejected: `Respuesta AEAT recibida: ${typeLabel} rechazado (${periodLabel})`,
  };

  return {
    newArtifactStatus: statusMap[input.responseType],
    evidenceSnapshot: {
      artifactId: input.artifactId,
      artifactType: input.artifactType,
      fiscalYear: input.fiscalYear,
      period: input.period,
      periodicity: input.periodicity,
      aeatReference: input.aeatReference,
      csvCode: input.csvCode ?? null,
      receptionDate: input.receptionDate,
      responseType: input.responseType,
      rejectionReason: input.rejectionReason ?? null,
      registeredBy: input.registeredBy,
      registeredAt: new Date().toISOString(),
    },
    evidenceLabel: `Respuesta AEAT — ${typeLabel} ${input.responseType === 'accepted' ? 'Aceptado' : 'Rechazado'} (Ref: ${input.aeatReference})`,
    ledgerEventLabel: eventMap[input.responseType],
    aeatReference: input.aeatReference.trim(),
    csvCode: input.csvCode?.trim() ?? null,
    receptionDate: input.receptionDate,
    responseType: input.responseType,
    artifactType: input.artifactType,
    rejectionReason: input.rejectionReason?.trim() ?? null,
  };
}
