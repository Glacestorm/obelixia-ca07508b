/**
 * certificaArtifactEngine.ts — Generador de Certific@2 para SEPE
 * 
 * Genera certificado de empresa en formato preparatorio para comunicación al SEPE
 * cuando finaliza la relación laboral de un empleado.
 * 
 * IMPORTANTE: El artefacto generado es un payload/modelo preparatorio interno.
 * NO constituye el XML oficial Certific@2 del SEPE ni integración final.
 * isRealSubmissionBlocked === true.
 * 
 * Legislación:
 * - RD 625/1985 Art. 1: Obligación del empresario de comunicar la baja
 * - ET Art. 49: Causas de extinción del contrato de trabajo
 * - RDL 2/2015: Texto refundido de la Ley del Estatuto de los Trabajadores
 * 
 * Plazo: 10 días naturales desde la finalización de la relación laboral
 */

// ── Types ──

export type CausaBajaSEPE =
  | '51' // Fin de contrato temporal
  | '52' // Despido disciplinario
  | '53' // Despido objetivo
  | '54' // Dimisión del trabajador
  | '55' // Mutuo acuerdo
  | '56' // ERE/ERTE
  | '61' // Jubilación
  | '62' // Incapacidad permanente
  | '63' // Fallecimiento
  | '64' // Baja voluntaria
  | '69' // Otras causas
  | '77'; // Modificación sustancial condiciones

export interface CertificaWorkerData {
  employeeId: string;
  naf: string;
  dniNie: string;
  fullName: string;
  fechaNacimiento: string;
}

export interface CertificaEmployerData {
  ccc: string;
  cif: string;
  razonSocial: string;
}

export interface CertificaContractData {
  tipoContrato: string;
  fechaAlta: string;
  fechaBaja: string;
  causaBaja: CausaBajaSEPE;
  jornadaParcial: boolean;
  coeficienteParcialidad?: number;
}

export interface CertificaSalaryData {
  /** Last 180 days of salary data for unemployment calculation */
  basesUltimos180Dias: Array<{
    mes: string; // YYYY-MM
    baseContribucion: number;
    diasCotizados: number;
  }>;
  vacacionesDevengadasNoDisfrutadas?: number;
  indemnizacionFinContrato?: number;
}

// ── Status lifecycle ──

export type CertificaArtifactStatus =
  | 'draft'
  | 'validated'
  | 'dry_run_ready'
  | 'pending_approval'
  | 'submitted'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'confirmed'
  | 'archived'
  | 'error';

export const CERTIFICA_STATUS_META: Record<CertificaArtifactStatus, {
  label: string;
  color: string;
  disclaimer: string;
}> = {
  draft: {
    label: 'Borrador (interno)',
    color: 'bg-slate-500/10 text-slate-700',
    disclaimer: 'Payload preparatorio generado internamente. NO es el XML oficial Certific@2 del SEPE.',
  },
  validated: {
    label: 'Validado internamente',
    color: 'bg-indigo-500/10 text-indigo-700',
    disclaimer: 'Validación interna superada. NO ha sido validado por el SEPE.',
  },
  dry_run_ready: {
    label: 'Listo para dry-run',
    color: 'bg-emerald-500/10 text-emerald-700',
    disclaimer: 'Preparado para simulación interna. El envío real permanece bloqueado (isRealSubmissionBlocked).',
  },
  pending_approval: {
    label: 'Pendiente de aprobación',
    color: 'bg-amber-500/10 text-amber-700',
    disclaimer: 'Requiere aprobación interna antes de avanzar. NO es un envío oficial.',
  },
  submitted: {
    label: 'Preparado internamente',
    color: 'bg-blue-500/10 text-blue-700',
    disclaimer: 'Marcado como preparado. isRealSubmissionBlocked sigue activo — esto es un registro preparatorio.',
  },
  sent: {
    label: 'Enviado (preparatorio)',
    color: 'bg-cyan-500/10 text-cyan-700',
    disclaimer: 'Marcado como enviado. isRealSubmissionBlocked sigue activo — registro preparatorio, no conector SEPE real.',
  },
  accepted: {
    label: 'Aceptado (SEPE)',
    color: 'bg-emerald-600/10 text-emerald-800',
    disclaimer: 'Respuesta positiva del SEPE registrada manualmente. Certificado archivado como evidencia.',
  },
  rejected: {
    label: 'Rechazado (SEPE)',
    color: 'bg-red-500/10 text-red-700',
    disclaimer: 'El SEPE ha rechazado este certificado. Revisar motivo y regenerar si procede.',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-green-600/10 text-green-800',
    disclaimer: 'Certificado confirmado y verificado. Proceso de certificación completado.',
  },
  archived: {
    label: 'Archivado',
    color: 'bg-muted text-muted-foreground',
    disclaimer: 'Artefacto archivado. No admite más transiciones.',
  },
  error: {
    label: 'Error en validación',
    color: 'bg-destructive/10 text-destructive',
    disclaimer: 'El artefacto contiene errores que impiden su procesamiento.',
  },
};

/**
 * Valid status transitions for Certific@2.
 * Mirrors AFI and SILTRA patterns.
 */
export const CERTIFICA_VALID_TRANSITIONS: Record<CertificaArtifactStatus, CertificaArtifactStatus[]> = {
  draft:             ['validated', 'error'],
  validated:         ['dry_run_ready', 'error'],
  dry_run_ready:     ['pending_approval', 'error'],
  pending_approval:  ['submitted', 'error'],
  submitted:         ['sent', 'error'],
  sent:              ['accepted', 'rejected'],
  accepted:          ['confirmed'],
  rejected:          ['draft'],  // cycle back for correction
  confirmed:         ['archived'],
  archived:          [],
  error:             ['draft'],
};

export interface CertificaArtifact {
  id: string;
  worker: CertificaWorkerData;
  employer: CertificaEmployerData;
  contract: CertificaContractData;
  salary: CertificaSalaryData;
  fileName: string;           // "certificado_preparatorio.json"
  fileExtension: '.json';
  generatedAt: string;
  status: CertificaArtifactStatus;
  statusLabel: string;
  statusDisclaimer: string;
  circuit: 'CERTIFICA2_SEPE';
  plazoLegal: string;
  normativa: string[];
  /** Always true — no real SEPE connector exists */
  isRealSubmissionBlocked: true;
  /** This is a preparatory payload, NOT official SEPE XML */
  isPreparatoryPayload: true;
}

// ── Build functions ──

/**
 * Build a Certific@2 preparatory certificate.
 * 
 * IMPORTANT: This generates a structured JSON payload for internal use.
 * It is NOT the official Certific@2 XML format required by SEPE.
 * Real SEPE submission requires: official XML schema, digital signature,
 * and SEPE Certific@2 connector — none of which exist yet.
 */
export function buildCertifica(
  worker: CertificaWorkerData,
  employer: CertificaEmployerData,
  contract: CertificaContractData,
  salary: CertificaSalaryData,
): CertificaArtifact {
  const status: CertificaArtifactStatus = 'draft';
  const meta = CERTIFICA_STATUS_META[status];

  return {
    id: `certifica_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    worker,
    employer,
    contract,
    salary,
    fileName: 'certificado_preparatorio.json',
    fileExtension: '.json',
    generatedAt: new Date().toISOString(),
    status,
    statusLabel: meta.label,
    statusDisclaimer: meta.disclaimer,
    circuit: 'CERTIFICA2_SEPE',
    plazoLegal: '10 días naturales desde la finalización de la relación laboral',
    normativa: [
      'RD 625/1985 Art. 1 (Certificado de empresa)',
      'ET Art. 49 (Causas de extinción)',
      'LGSS Art. 267 (Requisitos para prestación por desempleo)',
    ],
    isRealSubmissionBlocked: true,
    isPreparatoryPayload: true,
  };
}

/**
 * Validate a status transition for Certific@2.
 */
export function isValidCertificaTransition(
  current: CertificaArtifactStatus,
  target: CertificaArtifactStatus,
): boolean {
  return CERTIFICA_VALID_TRANSITIONS[current]?.includes(target) ?? false;
}

/**
 * Promote Certific@2 artifact status with validation.
 */
export function promoteCertificaStatus(
  current: CertificaArtifactStatus,
  target: CertificaArtifactStatus,
): { success: boolean; newLabel: string; newDisclaimer: string } {
  if (!isValidCertificaTransition(current, target)) {
    return {
      success: false,
      newLabel: CERTIFICA_STATUS_META[current].label,
      newDisclaimer: `Transición no válida: ${current} → ${target}`,
    };
  }
  const meta = CERTIFICA_STATUS_META[target];
  return {
    success: true,
    newLabel: meta.label,
    newDisclaimer: meta.disclaimer,
  };
}

export const CAUSA_BAJA_LABELS: Record<CausaBajaSEPE, string> = {
  '51': 'Fin de contrato temporal',
  '52': 'Despido disciplinario',
  '53': 'Despido objetivo',
  '54': 'Dimisión del trabajador',
  '55': 'Mutuo acuerdo',
  '56': 'ERE/ERTE',
  '61': 'Jubilación',
  '62': 'Incapacidad permanente',
  '63': 'Fallecimiento',
  '64': 'Baja voluntaria',
  '69': 'Otras causas',
  '77': 'Modificación sustancial de condiciones',
};
