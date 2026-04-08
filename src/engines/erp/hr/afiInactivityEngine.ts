/**
 * afiInactivityEngine.ts — AFI Inactividad / PNR / Suspensión
 * 
 * Genera pares de ficheros AFI para informar y eliminar inactividad
 * en situaciones de PNR (Prestación No Retributiva) y suspensión de empleo y sueldo.
 * 
 * Legislación:
 * - ET Art. 45: Causas de suspensión del contrato
 * - ET Art. 48: Suspensión con reserva de puesto
 * - LGSS Art. 144: Situaciones asimiladas al alta
 * - RD 84/1996 Art. 36: Comunicación de inactividad
 * - Orden ESS/1187/2015: Sistema RED/SILTRA
 * 
 * Flujo:
 * 1. Inicio inactividad → AFI tipo 6 (informar inactividad)
 * 2. Fin inactividad → AFI eliminar inactividad
 */

// ── Types ──

export type InactivityType =
  | 'pnr'              // Prestación No Retributiva (ERTE suspensión)
  | 'suspension_empleo' // Suspensión empleo y sueldo (ET Art. 45)
  | 'excedencia'        // Excedencia voluntaria
  | 'huelga'            // Huelga legal
  | 'cierre_patronal'   // Cierre patronal
  | 'permiso_sin_sueldo'; // Permiso sin retribución

export interface AFIInactivityData {
  employeeId: string;
  naf: string;
  dniNie: string;
  fullName: string;
  ccc: string;
  cif: string;
  razonSocial: string;
  inactivityType: InactivityType;
  startDate: string;
  endDate?: string | null;
  motivo: string;
}

export interface AFIInactivityArtifact {
  id: string;
  action: 'informar_inactividad' | 'eliminar_inactividad';
  inactivityType: InactivityType;
  data: AFIInactivityData;
  fileName: string;          // e.g., "12090357.AFI"
  fileExtension: '.AFI';
  effectiveDate: string;
  generatedAt: string;
  status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected';
  circuit: 'SILTRA_TGSS';
  plazoLegal: string;
  normativa: string[];
}

export interface AFIInactivityPair {
  informar: AFIInactivityArtifact;
  eliminar: AFIInactivityArtifact | null; // null if end date not yet known
}

// ── Build functions ──

function generateFileName(): string {
  const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 8);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${ts}${rand}.AFI`;
}

/**
 * Build a pair of AFI inactivity artifacts (informar + eliminar).
 */
export function buildAFIInactivityPair(data: AFIInactivityData): AFIInactivityPair {
  const now = new Date().toISOString();

  const normativa = [
    'ET Art. 45 (Suspensión del contrato)',
    'RD 84/1996 Art. 36 (Comunicación de inactividad)',
    'Orden ESS/1187/2015 (Sistema RED/SILTRA)',
  ];

  if (data.inactivityType === 'pnr') {
    normativa.push('RDL 8/2020 (ERTE por fuerza mayor)');
  }

  const informar: AFIInactivityArtifact = {
    id: `afi_inact_start_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: 'informar_inactividad',
    inactivityType: data.inactivityType,
    data,
    fileName: generateFileName(),
    fileExtension: '.AFI',
    effectiveDate: data.startDate,
    generatedAt: now,
    status: 'draft',
    circuit: 'SILTRA_TGSS',
    plazoLegal: '3 días naturales desde el inicio de la inactividad',
    normativa,
  };

  const eliminar: AFIInactivityArtifact | null = data.endDate ? {
    id: `afi_inact_end_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: 'eliminar_inactividad',
    inactivityType: data.inactivityType,
    data,
    fileName: generateFileName(),
    fileExtension: '.AFI',
    effectiveDate: data.endDate,
    generatedAt: now,
    status: 'draft',
    circuit: 'SILTRA_TGSS',
    plazoLegal: '3 días naturales desde la reincorporación',
    normativa,
  } : null;

  return { informar, eliminar };
}

/**
 * Promote AFI Inactivity artifact status.
 */
export function promoteAFIInactivityStatus(
  current: AFIInactivityArtifact['status'],
  target: AFIInactivityArtifact['status'],
): boolean {
  const order: AFIInactivityArtifact['status'][] = ['draft', 'validated', 'submitted', 'accepted'];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  return ti === ci + 1 || target === 'rejected';
}

export const INACTIVITY_TYPE_LABELS: Record<InactivityType, string> = {
  pnr: 'PNR (Prestación No Retributiva)',
  suspension_empleo: 'Suspensión empleo y sueldo',
  excedencia: 'Excedencia voluntaria',
  huelga: 'Huelga legal',
  cierre_patronal: 'Cierre patronal',
  permiso_sin_sueldo: 'Permiso sin retribución',
};
