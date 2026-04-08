/**
 * deltaArtifactEngine.ts — Generador de partes de accidente Delt@
 * 
 * Genera ficheros XML tipo PAT_*.xml para comunicación de partes de accidente
 * de trabajo al sistema Delt@ del MITES (Ministerio de Trabajo y Economía Social).
 * 
 * Legislación:
 * - LGSS Art. 156: Definición de accidente de trabajo
 * - Orden TAS/2926/2002: Modelo de parte de accidente de trabajo
 * - RD 404/2010: Comunicación electrónica de accidentes
 * 
 * Plazos:
 * - Parte AT con baja: 5 días hábiles desde la fecha del accidente/baja médica
 * - Parte AT sin baja: hasta el 5º día hábil del mes siguiente
 * - Accidente grave/muy grave/mortal: 24 horas
 */

// ── Types ──

export type AccidentSeverity = 'leve' | 'grave' | 'muy_grave' | 'mortal';
export type AccidentType = 'in_itinere' | 'en_jornada' | 'en_mision';

export interface DeltaWorkerData {
  employeeId: string;
  naf: string;
  dniNie: string;
  fullName: string;
  birthDate: string;
  sexo: 'H' | 'M';
  nacionalidad: string;
  ocupacion: string;
  antiguedad: string; // fecha de antigüedad en la empresa
  tipoContrato: string;
}

export interface DeltaEmployerData {
  ccc: string;
  cif: string;
  razonSocial: string;
  cnae: string;
  centroTrabajo: string;
  plantilla: number;
}

export interface DeltaAccidentData {
  fecha: string;
  hora: string;
  lugar: string;
  descripcion: string;
  severity: AccidentSeverity;
  type: AccidentType;
  causaBaja: boolean;
  fechaBaja?: string | null;
  testigos?: string[];
  lesionDescripcion?: string;
  parteDelCuerpo?: string;
  agentoMaterial?: string;
}

export interface DeltaArtifact {
  id: string;
  worker: DeltaWorkerData;
  employer: DeltaEmployerData;
  accident: DeltaAccidentData;
  fileName: string;          // e.g., "PAT_12103846.xml"
  fileExtension: '.xml';
  generatedAt: string;
  status: 'draft' | 'validated' | 'submitted' | 'accepted' | 'rejected';
  circuit: 'DELTA_MITES';
  plazoLegal: string;
  normativa: string[];
}

// ── Build functions ──

/**
 * Build a Delt@ accident report artifact.
 */
export function buildDeltaPart(
  worker: DeltaWorkerData,
  employer: DeltaEmployerData,
  accident: DeltaAccidentData,
): DeltaArtifact {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 8);
  const fileName = `PAT_${timestamp}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}.xml`;

  const plazo = accident.severity === 'mortal' || accident.severity === 'muy_grave' || accident.severity === 'grave'
    ? '24 horas desde el accidente'
    : accident.causaBaja
      ? '5 días hábiles desde la fecha de baja médica'
      : '5º día hábil del mes siguiente al accidente';

  return {
    id: `delta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    worker,
    employer,
    accident,
    fileName,
    fileExtension: '.xml',
    generatedAt: now.toISOString(),
    status: 'draft',
    circuit: 'DELTA_MITES',
    plazoLegal: plazo,
    normativa: [
      'LGSS Art. 156 (Accidente de trabajo)',
      'Orden TAS/2926/2002 (Modelo parte de accidente)',
      'RD 404/2010 (Comunicación electrónica)',
    ],
  };
}

/**
 * Promote Delt@ artifact status.
 */
export function promoteDeltaStatus(
  current: DeltaArtifact['status'],
  target: DeltaArtifact['status'],
): boolean {
  const order: DeltaArtifact['status'][] = ['draft', 'validated', 'submitted', 'accepted'];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  return ti === ci + 1 || target === 'rejected';
}

export const ACCIDENT_SEVERITY_LABELS: Record<AccidentSeverity, string> = {
  leve: 'Leve',
  grave: 'Grave',
  muy_grave: 'Muy grave',
  mortal: 'Mortal',
};

export const ACCIDENT_TYPE_LABELS: Record<AccidentType, string> = {
  in_itinere: 'In itinere',
  en_jornada: 'En jornada',
  en_mision: 'En misión',
};
