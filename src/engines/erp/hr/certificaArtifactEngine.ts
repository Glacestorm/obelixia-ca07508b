/**
 * certificaArtifactEngine.ts — Generador de Certific@2 para SEPE
 * 
 * Genera certificado de empresa en formato XML para comunicación al SEPE
 * cuando finaliza la relación laboral de un empleado.
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

export interface CertificaArtifact {
  id: string;
  worker: CertificaWorkerData;
  employer: CertificaEmployerData;
  contract: CertificaContractData;
  salary: CertificaSalaryData;
  fileName: string;           // "certificado.xml"
  fileExtension: '.xml';
  generatedAt: string;
  status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected';
  circuit: 'CERTIFICA2_SEPE';
  plazoLegal: string;
  normativa: string[];
}

// ── Build functions ──

/**
 * Build a Certific@2 certificate for SEPE.
 */
export function buildCertifica(
  worker: CertificaWorkerData,
  employer: CertificaEmployerData,
  contract: CertificaContractData,
  salary: CertificaSalaryData,
): CertificaArtifact {
  return {
    id: `certifica_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    worker,
    employer,
    contract,
    salary,
    fileName: 'certificado.xml',
    fileExtension: '.xml',
    generatedAt: new Date().toISOString(),
    status: 'draft',
    circuit: 'CERTIFICA2_SEPE',
    plazoLegal: '10 días naturales desde la finalización de la relación laboral',
    normativa: [
      'RD 625/1985 Art. 1 (Certificado de empresa)',
      'ET Art. 49 (Causas de extinción)',
      'LGSS Art. 267 (Requisitos para prestación por desempleo)',
    ],
  };
}

/**
 * Promote Certific@2 artifact status.
 */
export function promoteCertificaStatus(
  current: CertificaArtifact['status'],
  target: CertificaArtifact['status'],
): boolean {
  const order: CertificaArtifact['status'][] = ['draft', 'validated', 'submitted', 'accepted'];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  return ti === ci + 1 || target === 'rejected';
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
