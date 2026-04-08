/**
 * fdiArtifactEngine.ts — Generador de artefactos FDI para INSS
 * 
 * Genera ficheros .FDI para comunicaciones de IT (Incapacidad Temporal)
 * y AT (Accidente de Trabajo) al INSS vía SILTRA.
 * 
 * Legislación:
 * - LGSS Art. 169-176: Incapacidad temporal
 * - RD 625/2014: Gestión y control de IT
 * - Orden ESS/1187/2015: Sistema RED/SILTRA
 * 
 * Plazos:
 * - Comunicación parte de baja: inmediato tras recepción del parte médico
 * - Comunicación parte de confirmación: 5 días hábiles
 * - Comunicación parte de alta: inmediato
 */

// ── Types ──

export type FDIType = 'baja_it' | 'confirmacion_it' | 'alta_it' | 'baja_at' | 'alta_at' | 'recaida';

export type FDIContingency = 'comun' | 'profesional' | 'accidente_trabajo' | 'enfermedad_profesional';

export interface FDIWorkerData {
  employeeId: string;
  naf: string;
  dniNie: string;
  fullName: string;
  birthDate: string;
  grupoCotizacion: number;
}

export interface FDIEmployerData {
  ccc: string;
  cif: string;
  razonSocial: string;
}

export interface FDIMedicalData {
  fechaBaja: string;
  fechaAlta?: string | null;
  contingencia: FDIContingency;
  diagnosticoCode?: string;
  diagnosticoDescription?: string;
  codigoMutua?: string;
  duracionEstimadaDias?: number;
}

export interface FDIArtifact {
  id: string;
  type: FDIType;
  worker: FDIWorkerData;
  employer: FDIEmployerData;
  medical: FDIMedicalData;
  fileName: string;          // e.g., "12090357.FDI"
  fileExtension: '.FDI';
  generatedAt: string;
  status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected';
  circuit: 'SILTRA_INSS';
  plazoLegal: string;
  normativa: string[];
}

// ── Build functions ──

/**
 * Build an FDI artifact for IT/AT communication to INSS.
 */
export function buildFDI(
  type: FDIType,
  worker: FDIWorkerData,
  employer: FDIEmployerData,
  medical: FDIMedicalData,
): FDIArtifact {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 8);
  const fileName = `${timestamp}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}.FDI`;

  const plazo = type.includes('baja')
    ? 'Inmediato tras recepción del parte médico de baja'
    : type.includes('confirmacion')
      ? '5 días hábiles desde la fecha de confirmación'
      : 'Inmediato tras recepción del parte médico de alta';

  const normativa = [
    'LGSS Art. 169-176 (Incapacidad temporal)',
    'RD 625/2014 (Gestión y control de IT)',
    'Orden ESS/1187/2015 (Sistema RED/SILTRA)',
  ];

  if (medical.contingencia === 'accidente_trabajo' || medical.contingencia === 'enfermedad_profesional') {
    normativa.push('LGSS Art. 156 (Accidente de trabajo)');
  }

  return {
    id: `fdi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    worker,
    employer,
    medical,
    fileName,
    fileExtension: '.FDI',
    generatedAt: now.toISOString(),
    status: 'draft',
    circuit: 'SILTRA_INSS',
    plazoLegal: plazo,
    normativa,
  };
}

/**
 * Promote FDI artifact status.
 */
export function promoteFDIStatus(
  current: FDIArtifact['status'],
  target: FDIArtifact['status'],
): boolean {
  const order: FDIArtifact['status'][] = ['draft', 'validated', 'submitted', 'accepted'];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  return ti === ci + 1 || target === 'rejected';
}

export const FDI_TYPE_LABELS: Record<FDIType, string> = {
  baja_it: 'Parte de baja IT',
  confirmacion_it: 'Parte de confirmación IT',
  alta_it: 'Parte de alta IT',
  baja_at: 'Parte de baja AT',
  alta_at: 'Parte de alta AT',
  recaida: 'Recaída',
};
