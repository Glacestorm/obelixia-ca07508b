/**
 * disciplinarySanctionsEngine.ts — Motor de Sanciones Laborales (C5)
 *
 * Gestiona expedientes disciplinarios con tipificación (ET Arts. 54, 58, 60),
 * control de prescripción, generación de cartas y trazabilidad.
 *
 * LÍMITES:
 * - No emite conclusiones jurídicas definitivas.
 * - No sustituye revisión humana ni asesoramiento legal.
 * - Las tipificaciones son orientativas según ET/convenio.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SanctionSeverity = 'leve' | 'grave' | 'muy_grave';

export type DossierStatus =
  | 'draft'            // Borrador inicial
  | 'investigation'    // Investigación en curso
  | 'hearing'          // Audiencia / expediente contradictorio
  | 'proposed'         // Sanción propuesta
  | 'notified'         // Notificada al trabajador
  | 'appealed'         // Impugnada
  | 'executed'         // Ejecutada / firme
  | 'expired'          // Prescrita
  | 'withdrawn';       // Retirada

export type EvidenceType = 'document' | 'testimony' | 'system_log' | 'photo' | 'email' | 'other';

export interface SanctionType {
  code: string;
  description: string;
  severity: SanctionSeverity;
  legalBasis: string;
  /** Typical sanctions for this type */
  typicalSanctions: string[];
}

export interface DossierEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  description?: string;
  attachedAt: string;
  attachedBy?: string;
  documentRef?: string; // Link to document expedient
}

export interface DossierTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  performedBy?: string;
  fromStatus?: DossierStatus;
  toStatus?: DossierStatus;
}

export interface SanctionDossier {
  id: string;
  employeeId: string;
  employeeName: string;
  status: DossierStatus;
  severity: SanctionSeverity;
  sanctionTypeCode: string;
  factsDescription: string;
  factsDate: string;           // Date facts occurred
  knowledgeDate: string;       // Date employer learned of facts
  prescriptionDeadline: string;
  createdAt: string;
  updatedAt: string;
  notifiedAt?: string;
  resolvedAt?: string;
  proposedSanction?: string;
  hearingRequired: boolean;
  hearingDate?: string;
  hearingNotes?: string;
  evidence: DossierEvidence[];
  timeline: DossierTimelineEntry[];
  letterGenerated: boolean;
  letterContent?: string;
}

export interface PrescriptionCheck {
  severity: SanctionSeverity;
  factsDate: string;
  knowledgeDate: string;
  /** Days from knowledge to prescription (ET Art. 60.2) */
  prescriptionDaysFromKnowledge: number;
  /** Months from facts to absolute prescription */
  absolutePrescriptionMonths: number;
  deadlineFromKnowledge: Date;
  absoluteDeadline: Date;
  /** Effective deadline = earlier of the two */
  effectiveDeadline: Date;
  daysRemaining: number;
  isExpired: boolean;
  urgencyLevel: 'ok' | 'warning' | 'critical' | 'expired';
}

export interface SanctionLetterData {
  employeeName: string;
  employeePosition?: string;
  companyName: string;
  severity: SanctionSeverity;
  factsDescription: string;
  factsDate: string;
  legalBasis: string;
  proposedSanction: string;
  notificationDate: string;
}

// ─── Sanction Type Catalog (ET-based) ────────────────────────────────────────

const SANCTION_TYPES: SanctionType[] = [
  // LEVES
  {
    code: 'L01',
    description: 'Faltas repetidas e injustificadas de puntualidad o asistencia',
    severity: 'leve',
    legalBasis: 'Art. 54.2.a ET (menor entidad)',
    typicalSanctions: ['Amonestación verbal', 'Amonestación escrita'],
  },
  {
    code: 'L02',
    description: 'Descuido o negligencia leve en el trabajo',
    severity: 'leve',
    legalBasis: 'Art. 54.2.e ET (menor entidad)',
    typicalSanctions: ['Amonestación verbal', 'Amonestación escrita'],
  },
  {
    code: 'L03',
    description: 'Incumplimiento leve de normas de seguridad e higiene',
    severity: 'leve',
    legalBasis: 'Art. 29 LPRL / Convenio colectivo',
    typicalSanctions: ['Amonestación escrita'],
  },
  // GRAVES
  {
    code: 'G01',
    description: 'Faltas repetidas e injustificadas de asistencia al trabajo',
    severity: 'grave',
    legalBasis: 'Art. 54.2.a ET',
    typicalSanctions: ['Suspensión de empleo y sueldo 3-15 días'],
  },
  {
    code: 'G02',
    description: 'Indisciplina o desobediencia en el trabajo',
    severity: 'grave',
    legalBasis: 'Art. 54.2.b ET',
    typicalSanctions: ['Suspensión de empleo y sueldo 5-20 días'],
  },
  {
    code: 'G03',
    description: 'Disminución continuada y voluntaria en el rendimiento',
    severity: 'grave',
    legalBasis: 'Art. 54.2.e ET',
    typicalSanctions: ['Suspensión de empleo y sueldo 5-15 días'],
  },
  {
    code: 'G04',
    description: 'Embriaguez o toxicomanía habitual con repercusión en el trabajo',
    severity: 'grave',
    legalBasis: 'Art. 54.2.f ET',
    typicalSanctions: ['Suspensión de empleo y sueldo'],
  },
  // MUY GRAVES
  {
    code: 'MG01',
    description: 'Faltas repetidas e injustificadas de asistencia (reiteración)',
    severity: 'muy_grave',
    legalBasis: 'Art. 54.2.a ET',
    typicalSanctions: ['Suspensión de empleo y sueldo 20-60 días', 'Despido disciplinario'],
  },
  {
    code: 'MG02',
    description: 'Ofensas verbales o físicas al empresario, compañeros o familiares',
    severity: 'muy_grave',
    legalBasis: 'Art. 54.2.c ET',
    typicalSanctions: ['Suspensión de empleo y sueldo', 'Despido disciplinario'],
  },
  {
    code: 'MG03',
    description: 'Transgresión de la buena fe contractual y abuso de confianza',
    severity: 'muy_grave',
    legalBasis: 'Art. 54.2.d ET',
    typicalSanctions: ['Despido disciplinario'],
  },
  {
    code: 'MG04',
    description: 'Acoso por razón de origen, sexo, orientación, discapacidad, edad o convicciones',
    severity: 'muy_grave',
    legalBasis: 'Art. 54.2.g ET',
    typicalSanctions: ['Suspensión de empleo y sueldo', 'Despido disciplinario'],
  },
];

// ─── Prescription Rules (ET Art. 60.2) ───────────────────────────────────────

const PRESCRIPTION_RULES: Record<SanctionSeverity, { daysFromKnowledge: number; monthsAbsolute: number }> = {
  leve:      { daysFromKnowledge: 10, monthsAbsolute: 6 },
  grave:     { daysFromKnowledge: 20, monthsAbsolute: 6 },
  muy_grave: { daysFromKnowledge: 60, monthsAbsolute: 6 },
};

// ─── Valid Transitions ───────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<DossierStatus, DossierStatus[]> = {
  draft:         ['investigation', 'withdrawn'],
  investigation: ['hearing', 'proposed', 'withdrawn', 'expired'],
  hearing:       ['proposed', 'withdrawn', 'expired'],
  proposed:      ['notified', 'withdrawn'],
  notified:      ['executed', 'appealed'],
  appealed:      ['executed', 'withdrawn'],
  executed:      [],
  expired:       [],
  withdrawn:     [],
};

// ─── Engine Functions ────────────────────────────────────────────────────────

let _idCounter = 0;
function genId(prefix: string): string {
  _idCounter++;
  return `${prefix}-${Date.now()}-${_idCounter.toString(36)}`;
}

/**
 * Returns the full sanction type catalog.
 */
export function getSanctionTypes(): SanctionType[] {
  return [...SANCTION_TYPES];
}

/**
 * Returns sanction types filtered by severity.
 */
export function getSanctionTypesBySeverity(severity: SanctionSeverity): SanctionType[] {
  return SANCTION_TYPES.filter(t => t.severity === severity);
}

/**
 * Finds a sanction type by code.
 */
export function getSanctionTypeByCode(code: string): SanctionType | undefined {
  return SANCTION_TYPES.find(t => t.code === code);
}

/**
 * Calculates prescription deadlines and status (ET Art. 60.2).
 */
export function checkPrescription(
  severity: SanctionSeverity,
  factsDate: string,
  knowledgeDate: string,
  referenceDate?: string,
): PrescriptionCheck {
  const rules = PRESCRIPTION_RULES[severity];
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  const knowledge = new Date(knowledgeDate);
  const facts = new Date(factsDate);

  const deadlineFromKnowledge = new Date(knowledge);
  deadlineFromKnowledge.setDate(deadlineFromKnowledge.getDate() + rules.daysFromKnowledge);

  const absoluteDeadline = new Date(facts);
  absoluteDeadline.setMonth(absoluteDeadline.getMonth() + rules.monthsAbsolute);

  const effectiveDeadline = deadlineFromKnowledge < absoluteDeadline
    ? deadlineFromKnowledge
    : absoluteDeadline;

  const daysRemaining = Math.ceil((effectiveDeadline.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;

  let urgencyLevel: PrescriptionCheck['urgencyLevel'] = 'ok';
  if (isExpired) urgencyLevel = 'expired';
  else if (daysRemaining <= 3) urgencyLevel = 'critical';
  else if (daysRemaining <= 7) urgencyLevel = 'warning';

  return {
    severity,
    factsDate,
    knowledgeDate,
    prescriptionDaysFromKnowledge: rules.daysFromKnowledge,
    absolutePrescriptionMonths: rules.monthsAbsolute,
    deadlineFromKnowledge,
    absoluteDeadline,
    effectiveDeadline,
    daysRemaining,
    isExpired,
    urgencyLevel,
  };
}

/**
 * Creates a new disciplinary dossier.
 */
export function createDossier(params: {
  employeeId: string;
  employeeName: string;
  severity: SanctionSeverity;
  sanctionTypeCode: string;
  factsDescription: string;
  factsDate: string;
  knowledgeDate: string;
}): SanctionDossier {
  const now = new Date().toISOString();
  const prescription = checkPrescription(params.severity, params.factsDate, params.knowledgeDate);

  // Hearing required for legal reps and union delegates (Art. 55.1 ET)
  // Default to true for muy_grave as best practice
  const hearingRequired = params.severity === 'muy_grave';

  return {
    id: genId('dos'),
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    status: 'draft',
    severity: params.severity,
    sanctionTypeCode: params.sanctionTypeCode,
    factsDescription: params.factsDescription,
    factsDate: params.factsDate,
    knowledgeDate: params.knowledgeDate,
    prescriptionDeadline: prescription.effectiveDeadline.toISOString(),
    createdAt: now,
    updatedAt: now,
    hearingRequired,
    evidence: [],
    timeline: [{
      id: genId('tl'),
      timestamp: now,
      action: 'Expediente creado',
      description: `Expediente disciplinario abierto — ${getSeverityLabel(params.severity)}`,
      toStatus: 'draft',
    }],
    letterGenerated: false,
  };
}

/**
 * Validates and performs a status transition on a dossier.
 */
export function transitionDossier(
  dossier: SanctionDossier,
  newStatus: DossierStatus,
  performedBy?: string,
  notes?: string,
): { success: boolean; dossier: SanctionDossier; error?: string } {
  const allowed = VALID_TRANSITIONS[dossier.status];
  if (!allowed?.includes(newStatus)) {
    return {
      success: false,
      dossier,
      error: `Transición no válida: ${dossier.status} → ${newStatus}`,
    };
  }

  const now = new Date().toISOString();
  const entry: DossierTimelineEntry = {
    id: genId('tl'),
    timestamp: now,
    action: `Estado cambiado a ${getStatusLabel(newStatus)}`,
    description: notes ?? `Transición de ${getStatusLabel(dossier.status)} a ${getStatusLabel(newStatus)}`,
    performedBy,
    fromStatus: dossier.status,
    toStatus: newStatus,
  };

  const updated: SanctionDossier = {
    ...dossier,
    status: newStatus,
    updatedAt: now,
    timeline: [...dossier.timeline, entry],
    notifiedAt: newStatus === 'notified' ? now : dossier.notifiedAt,
    resolvedAt: (newStatus === 'executed' || newStatus === 'withdrawn' || newStatus === 'expired')
      ? now : dossier.resolvedAt,
  };

  return { success: true, dossier: updated };
}

/**
 * Adds evidence to a dossier.
 */
export function addEvidence(
  dossier: SanctionDossier,
  evidence: Omit<DossierEvidence, 'id' | 'attachedAt'>,
): SanctionDossier {
  const now = new Date().toISOString();
  const newEvidence: DossierEvidence = {
    ...evidence,
    id: genId('ev'),
    attachedAt: now,
  };

  return {
    ...dossier,
    updatedAt: now,
    evidence: [...dossier.evidence, newEvidence],
    timeline: [...dossier.timeline, {
      id: genId('tl'),
      timestamp: now,
      action: 'Evidencia añadida',
      description: `${evidence.title} (${evidence.type})`,
      performedBy: evidence.attachedBy,
    }],
  };
}

/**
 * Generates a sanction letter draft.
 */
export function generateSanctionLetter(data: SanctionLetterData): string {
  const severityLabel = getSeverityLabel(data.severity);

  return `CARTA DE SANCIÓN

${data.companyName}

Fecha: ${data.notificationDate}

A la atención de: ${data.employeeName}${data.employeePosition ? `\nCargo: ${data.employeePosition}` : ''}

COMUNICACIÓN DE SANCIÓN POR FALTA ${severityLabel.toUpperCase()}

Por medio de la presente, la Dirección de ${data.companyName} le comunica la imposición de la siguiente sanción disciplinaria:

HECHOS:
${data.factsDescription}

Fecha de los hechos: ${data.factsDate}

TIPIFICACIÓN:
Los hechos descritos constituyen una falta ${severityLabel} conforme a ${data.legalBasis}.

SANCIÓN IMPUESTA:
${data.proposedSanction}

FUNDAMENTO LEGAL:
La presente sanción se impone al amparo de lo dispuesto en los artículos 54 y 58 del Estatuto de los Trabajadores, así como en ${data.legalBasis}.

Le informamos de su derecho a impugnar la presente sanción ante la jurisdicción social en los plazos legalmente establecidos (Art. 114 LRJS — 20 días hábiles).

Atentamente,

_________________________________
Firma de la Dirección
${data.companyName}


Recibí:

_________________________________
${data.employeeName}
Fecha: ___/___/______


AVISO: Este documento ha sido generado como borrador por el sistema de gestión. Requiere revisión jurídica antes de su notificación formal. No constituye asesoramiento legal.`;
}

/**
 * Returns Spanish label for severity.
 */
export function getSeverityLabel(severity: SanctionSeverity): string {
  const labels: Record<SanctionSeverity, string> = {
    leve: 'Leve',
    grave: 'Grave',
    muy_grave: 'Muy grave',
  };
  return labels[severity] ?? severity;
}

/**
 * Returns Spanish label for status.
 */
export function getStatusLabel(status: DossierStatus): string {
  const labels: Record<DossierStatus, string> = {
    draft: 'Borrador',
    investigation: 'Investigación',
    hearing: 'Audiencia',
    proposed: 'Propuesta',
    notified: 'Notificada',
    appealed: 'Impugnada',
    executed: 'Ejecutada',
    expired: 'Prescrita',
    withdrawn: 'Retirada',
  };
  return labels[status] ?? status;
}

/**
 * Returns valid next states from current status.
 */
export function getValidTransitions(status: DossierStatus): DossierStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Returns prescription rules for reference.
 */
export function getPrescriptionRules() {
  return { ...PRESCRIPTION_RULES };
}
