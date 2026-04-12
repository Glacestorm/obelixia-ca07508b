/**
 * legalOnboardingEngine.ts — Motor de Onboarding Legal Automatizado (C4)
 *
 * Orquesta el checklist legal obligatorio al alta de un empleado en España.
 * Cada ítem vincula documento/acuse con base legal, evidencia y estado.
 *
 * LÍMITES:
 * - No simula firma jurídica donde no exista mecanismo real.
 * - No sustituye asesoramiento jurídico.
 * - Los estados reflejan la realidad: pendiente, aceptado, no_aplica.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type OnboardingItemStatus =
  | 'pending'        // No iniciado
  | 'generated'      // Documento generado, sin aceptar
  | 'sent'           // Enviado al empleado
  | 'accepted'       // Aceptado/firmado por empleado
  | 'not_applicable' // No aplica a este alta
  | 'blocked';       // Requiere acción previa

export type OnboardingItemCategory =
  | 'contractual'
  | 'alta_ss'
  | 'privacidad'
  | 'compliance'
  | 'igualdad'
  | 'prl';

export interface OnboardingChecklistItem {
  id: string;
  code: string;
  title: string;
  category: OnboardingItemCategory;
  legalBasis: string;
  description: string;
  status: OnboardingItemStatus;
  /** Is this item mandatory for all hires? */
  mandatory: boolean;
  /** Condition description for non-mandatory items */
  applicabilityCondition?: string;
  /** Days after hire to complete (0 = day of hire) */
  deadlineDays: number;
  /** Whether acceptance/signature from employee is required */
  requiresEmployeeAcceptance: boolean;
  /** Linked document type in document catalog */
  linkedDocumentType?: string;
  /** Evidence metadata */
  evidence?: OnboardingEvidence;
  /** Order for display */
  order: number;
}

export interface OnboardingEvidence {
  type: 'digital_acceptance' | 'signed_document' | 'system_generated' | 'manual_upload';
  timestamp?: string;
  acceptedBy?: string;
  ipAddress?: string;
  documentId?: string;
  hash?: string;
  method: string;
}

export interface OnboardingWorkflow {
  employeeId: string;
  employeeName: string;
  hireDate: string;
  items: OnboardingChecklistItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface OnboardingProgress {
  total: number;
  completed: number;
  pending: number;
  blocked: number;
  notApplicable: number;
  percentage: number;
  overdue: OnboardingChecklistItem[];
  isComplete: boolean;
}

export interface EmployeeContext {
  employeeId: string;
  employeeName: string;
  hireDate: string;
  headcount?: number; // company headcount for igualdad checks
  hasDigitalDisconnectionProtocol?: boolean;
  hasEqualityPlan?: boolean;
  hasWhistleblowerChannel?: boolean;
  hasHarassmentProtocol?: boolean;
}

// ─── Checklist Template ──────────────────────────────────────────────────────

const LEGAL_ONBOARDING_TEMPLATE: Omit<OnboardingChecklistItem, 'id' | 'status' | 'evidence'>[] = [
  {
    code: 'CONTRACT',
    title: 'Contrato de trabajo',
    category: 'contractual',
    legalBasis: 'Art. 8.2 ET — Forma del contrato',
    description: 'Contrato laboral firmado por ambas partes antes o en la fecha de incorporación.',
    mandatory: true,
    deadlineDays: 0,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'contrato',
    order: 1,
  },
  {
    code: 'AFI_ALTA',
    title: 'Alta en Seguridad Social (AFI)',
    category: 'alta_ss',
    legalBasis: 'Art. 139 LGSS — Obligación de alta previa',
    description: 'Comunicación del alta del trabajador en la TGSS. Debe realizarse antes del inicio de la prestación de servicios.',
    mandatory: true,
    deadlineDays: 0,
    requiresEmployeeAcceptance: false,
    linkedDocumentType: 'alta_ss',
    order: 2,
  },
  {
    code: 'LOPDGDD',
    title: 'Acuse de recibo LOPDGDD',
    category: 'privacidad',
    legalBasis: 'Art. 11-13 RGPD / LO 3/2018 LOPDGDD',
    description: 'Información sobre el tratamiento de datos personales y derechos del trabajador. Requiere acuse de recibo firmado.',
    mandatory: true,
    deadlineDays: 0,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'lopdgdd',
    order: 3,
  },
  {
    code: 'WHISTLEBLOWER',
    title: 'Información canal de denuncias',
    category: 'compliance',
    legalBasis: 'Ley 2/2023 — Canal de denuncias (≥50 empleados)',
    description: 'Comunicación de la existencia del canal interno de denuncias y procedimiento de uso.',
    mandatory: false,
    applicabilityCondition: 'Empresas con ≥50 trabajadores',
    deadlineDays: 0,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'canal_denuncias',
    order: 4,
  },
  {
    code: 'HARASSMENT',
    title: 'Protocolo de acoso',
    category: 'compliance',
    legalBasis: 'Art. 48 LO 3/2007 — Protocolo frente al acoso',
    description: 'Entrega y acuse del protocolo de prevención del acoso laboral y sexual.',
    mandatory: true,
    deadlineDays: 0,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'protocolo_acoso',
    order: 5,
  },
  {
    code: 'DIGITAL_DISCONNECTION',
    title: 'Acuse de desconexión digital',
    category: 'privacidad',
    legalBasis: 'Art. 88 LOPDGDD — Derecho a la desconexión digital',
    description: 'Información sobre la política de desconexión digital de la empresa.',
    mandatory: true,
    deadlineDays: 0,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'desconexion_digital',
    order: 6,
  },
  {
    code: 'EQUALITY_PLAN',
    title: 'Referencia Plan de Igualdad',
    category: 'igualdad',
    legalBasis: 'Art. 45-46 LO 3/2007 / RD 901/2020 (≥50 empleados)',
    description: 'Información sobre la existencia del Plan de Igualdad y acceso al mismo.',
    mandatory: false,
    applicabilityCondition: 'Empresas con ≥50 trabajadores o con obligación por convenio',
    deadlineDays: 5,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'plan_igualdad',
    order: 7,
  },
  {
    code: 'PRL_INFO',
    title: 'Información PRL del puesto',
    category: 'prl',
    legalBasis: 'Art. 18-19 Ley 31/1995 PRL',
    description: 'Información de riesgos del puesto y medidas preventivas. Formación inicial en PRL.',
    mandatory: true,
    deadlineDays: 3,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'prl_formacion',
    order: 8,
  },
  {
    code: 'MEDICAL_EXAM',
    title: 'Reconocimiento médico inicial',
    category: 'prl',
    legalBasis: 'Art. 22 Ley 31/1995 PRL',
    description: 'Ofrecimiento de reconocimiento médico inicial. Obligatorio en puestos con riesgos específicos.',
    mandatory: true,
    deadlineDays: 30,
    requiresEmployeeAcceptance: false,
    linkedDocumentType: 'reconocimiento_medico',
    order: 9,
  },
  {
    code: 'COMPANY_HANDBOOK',
    title: 'Normativa interna / manual de empleado',
    category: 'compliance',
    legalBasis: 'Art. 20.2 ET — Poder de dirección',
    description: 'Entrega del reglamento interno o manual del empleado, si existe.',
    mandatory: false,
    applicabilityCondition: 'Si la empresa dispone de normativa interna documentada',
    deadlineDays: 5,
    requiresEmployeeAcceptance: true,
    linkedDocumentType: 'normativa_interna',
    order: 10,
  },
];

// ─── Engine Functions ────────────────────────────────────────────────────────

let _idCounter = 0;
function generateItemId(): string {
  _idCounter++;
  return `onb-${Date.now()}-${_idCounter.toString(36)}`;
}

/**
 * Creates a fresh onboarding workflow for an employee,
 * evaluating applicability of conditional items.
 */
export function createOnboardingWorkflow(ctx: EmployeeContext): OnboardingWorkflow {
  const now = new Date().toISOString();
  const headcount = ctx.headcount ?? 0;

  const items: OnboardingChecklistItem[] = LEGAL_ONBOARDING_TEMPLATE.map(template => {
    let status: OnboardingItemStatus = 'pending';

    // Evaluate applicability for conditional items
    if (template.code === 'WHISTLEBLOWER' && headcount < 50 && !ctx.hasWhistleblowerChannel) {
      status = 'not_applicable';
    }
    if (template.code === 'EQUALITY_PLAN' && headcount < 50 && !ctx.hasEqualityPlan) {
      status = 'not_applicable';
    }

    return {
      ...template,
      id: generateItemId(),
      status,
    };
  });

  return {
    employeeId: ctx.employeeId,
    employeeName: ctx.employeeName,
    hireDate: ctx.hireDate,
    items,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculates progress of the onboarding workflow.
 */
export function calculateOnboardingProgress(
  workflow: OnboardingWorkflow,
  referenceDate?: string,
): OnboardingProgress {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();
  const hireDate = new Date(workflow.hireDate);

  const applicable = workflow.items.filter(i => i.status !== 'not_applicable');
  const completed = applicable.filter(i => i.status === 'accepted' || (i.status === 'generated' && !i.requiresEmployeeAcceptance));
  const blocked = applicable.filter(i => i.status === 'blocked');
  const pending = applicable.filter(i => i.status === 'pending' || i.status === 'generated' || i.status === 'sent');

  const overdue = applicable.filter(item => {
    if (item.status === 'accepted') return false;
    if (item.status === 'generated' && !item.requiresEmployeeAcceptance) return false;
    const deadlineDate = new Date(hireDate);
    deadlineDate.setDate(deadlineDate.getDate() + item.deadlineDays);
    return refDate > deadlineDate;
  });

  const total = applicable.length;
  const completedCount = completed.length;

  return {
    total,
    completed: completedCount,
    pending: pending.length,
    blocked: blocked.length,
    notApplicable: workflow.items.length - applicable.length,
    percentage: total > 0 ? Math.round((completedCount / total) * 100) : 100,
    overdue,
    isComplete: completedCount === total,
  };
}

/**
 * Records evidence of acceptance/generation for an item.
 */
export function recordItemEvidence(
  item: OnboardingChecklistItem,
  evidence: OnboardingEvidence,
): OnboardingChecklistItem {
  const newStatus: OnboardingItemStatus =
    evidence.type === 'digital_acceptance' || evidence.type === 'signed_document'
      ? 'accepted'
      : item.requiresEmployeeAcceptance
        ? 'generated'
        : 'accepted';

  return {
    ...item,
    status: newStatus,
    evidence: {
      ...evidence,
      timestamp: evidence.timestamp ?? new Date().toISOString(),
    },
  };
}

/**
 * Computes deadline date for an item relative to hire date.
 */
export function getItemDeadline(item: OnboardingChecklistItem, hireDate: string): Date {
  const d = new Date(hireDate);
  d.setDate(d.getDate() + item.deadlineDays);
  return d;
}

/**
 * Returns category labels in Spanish.
 */
export function getCategoryLabel(cat: OnboardingItemCategory): string {
  const labels: Record<OnboardingItemCategory, string> = {
    contractual: 'Contractual',
    alta_ss: 'Alta Seguridad Social',
    privacidad: 'Privacidad / LOPDGDD',
    compliance: 'Compliance',
    igualdad: 'Igualdad',
    prl: 'Prevención Riesgos Laborales',
  };
  return labels[cat] ?? cat;
}

/**
 * Returns the base template items (for reference/testing).
 */
export function getOnboardingTemplate() {
  return [...LEGAL_ONBOARDING_TEMPLATE];
}

/**
 * Generates a text summary of workflow status.
 */
export function generateOnboardingSummary(workflow: OnboardingWorkflow): string {
  const progress = calculateOnboardingProgress(workflow);
  const lines: string[] = [
    `Onboarding Legal — ${workflow.employeeName}`,
    `Fecha alta: ${workflow.hireDate}`,
    `Progreso: ${progress.percentage}% (${progress.completed}/${progress.total})`,
  ];

  if (progress.overdue.length > 0) {
    lines.push(`⚠ Ítems vencidos: ${progress.overdue.map(i => i.title).join(', ')}`);
  }

  if (progress.isComplete) {
    lines.push('✓ Onboarding legal completado');
  }

  return lines.join('\n');
}
