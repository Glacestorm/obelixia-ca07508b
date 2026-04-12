/**
 * equalityPlanEngine — Pure logic for Equality Plan management
 * B1: RD 901/2020, LO 3/2007, RD 902/2020
 *
 * NO Supabase, NO React — pure functions only.
 */

// ─── 9 Mandatory Diagnostic Areas (Art. 7 RD 901/2020) ─────────────────────

export type DiagnosticAreaCode =
  | 'hiring_selection'
  | 'professional_classification'
  | 'training'
  | 'promotion'
  | 'working_conditions'
  | 'co_responsibility'
  | 'salary_audit'
  | 'underrepresentation'
  | 'harassment_prevention';

export interface DiagnosticArea {
  code: DiagnosticAreaCode;
  label: string;
  description: string;
  legalRef: string;
}

export const DIAGNOSTIC_AREAS: DiagnosticArea[] = [
  { code: 'hiring_selection', label: 'Proceso de selección y contratación', description: 'Análisis de sesgos en procesos de selección, contratación y tipos de contrato por sexo', legalRef: 'Art. 7.a RD 901/2020' },
  { code: 'professional_classification', label: 'Clasificación profesional', description: 'Revisión de la clasificación profesional con perspectiva de género', legalRef: 'Art. 7.b RD 901/2020' },
  { code: 'training', label: 'Formación', description: 'Acceso a formación, distribución por sexo y adecuación', legalRef: 'Art. 7.c RD 901/2020' },
  { code: 'promotion', label: 'Promoción profesional', description: 'Criterios y procedimientos de promoción y su impacto por sexo', legalRef: 'Art. 7.d RD 901/2020' },
  { code: 'working_conditions', label: 'Condiciones de trabajo', description: 'Jornada, horarios, permisos, movilidad y organización del trabajo', legalRef: 'Art. 7.e RD 901/2020' },
  { code: 'co_responsibility', label: 'Ejercicio corresponsable', description: 'Corresponsabilidad en derechos de conciliación de la vida personal, familiar y laboral', legalRef: 'Art. 7.f RD 901/2020' },
  { code: 'salary_audit', label: 'Auditoría retributiva', description: 'Análisis de retribuciones desagregadas por sexo, categoría y complementos', legalRef: 'Art. 7.g RD 901/2020, RD 902/2020' },
  { code: 'underrepresentation', label: 'Infrarrepresentación femenina', description: 'Análisis de la presencia femenina en niveles directivos y sectores masculinizados', legalRef: 'Art. 7.h RD 901/2020' },
  { code: 'harassment_prevention', label: 'Prevención del acoso sexual y por razón de sexo', description: 'Protocolos, formación y medidas de prevención y actuación', legalRef: 'Art. 7.i RD 901/2020' },
];

// ─── Measure States ─────────────────────────────────────────────────────────

export type MeasureStatus = 'proposed' | 'approved' | 'in_progress' | 'blocked' | 'completed';

export interface EqualityMeasure {
  id: string;
  areaCode: DiagnosticAreaCode;
  title: string;
  description: string;
  status: MeasureStatus;
  responsiblePerson?: string;
  startDate?: string;
  targetDate?: string;
  completedDate?: string;
  blockReason?: string;
  kpiTarget?: string;
  kpiActual?: string;
  evidence?: string[];
  createdAt: string;
}

export const MEASURE_STATUS_CONFIG: Record<MeasureStatus, { label: string; color: string }> = {
  proposed: { label: 'Propuesta', color: 'bg-slate-100 text-slate-700' },
  approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En curso', color: 'bg-amber-100 text-amber-700' },
  blocked: { label: 'Bloqueada', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Cerrada', color: 'bg-green-100 text-green-700' },
};

export const VALID_MEASURE_TRANSITIONS: Record<MeasureStatus, MeasureStatus[]> = {
  proposed: ['approved', 'blocked'],
  approved: ['in_progress', 'blocked'],
  in_progress: ['completed', 'blocked'],
  blocked: ['proposed', 'in_progress'],
  completed: [],
};

export function canTransitionMeasure(from: MeasureStatus, to: MeasureStatus): boolean {
  return VALID_MEASURE_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Negotiation Timeline ───────────────────────────────────────────────────

export type NegotiationPhase =
  | 'constitution'
  | 'diagnosis'
  | 'negotiation'
  | 'approval'
  | 'registration'
  | 'implementation'
  | 'monitoring';

export interface NegotiationEvent {
  id: string;
  phase: NegotiationPhase;
  title: string;
  date: string;
  description?: string;
  attendees?: string;
  documentRefs?: string[];
}

export const NEGOTIATION_PHASES: { code: NegotiationPhase; label: string; description: string }[] = [
  { code: 'constitution', label: 'Constitución comisión negociadora', description: 'Formación de la comisión con representantes de la empresa y RLT' },
  { code: 'diagnosis', label: 'Elaboración del diagnóstico', description: 'Recogida y análisis de datos de las 9 materias obligatorias' },
  { code: 'negotiation', label: 'Negociación de medidas', description: 'Discusión y acuerdo de medidas correctoras con la RLT' },
  { code: 'approval', label: 'Aprobación del plan', description: 'Firma y aprobación formal del plan de igualdad' },
  { code: 'registration', label: 'Registro en REGCON', description: 'Inscripción del plan en el registro de convenios y acuerdos colectivos' },
  { code: 'implementation', label: 'Implantación', description: 'Ejecución de las medidas acordadas' },
  { code: 'monitoring', label: 'Seguimiento y evaluación', description: 'Revisión periódica del cumplimiento y eficacia de las medidas' },
];

// ─── Diagnostic Scoring ─────────────────────────────────────────────────────

export type DiagnosticStatus = 'not_started' | 'in_progress' | 'completed';

export interface DiagnosticAreaScore {
  areaCode: DiagnosticAreaCode;
  status: DiagnosticStatus;
  findings?: string;
  gapLevel?: 'none' | 'low' | 'medium' | 'high';
  dataCollected?: boolean;
  measures?: EqualityMeasure[];
}

export function computeDiagnosticProgress(scores: DiagnosticAreaScore[]): {
  total: number;
  completed: number;
  percentage: number;
} {
  const total = DIAGNOSTIC_AREAS.length;
  const completed = scores.filter(s => s.status === 'completed').length;
  return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

// ─── REGCON Readiness ───────────────────────────────────────────────────────

export type RegconReadiness = 'not_ready' | 'internal_ready' | 'official_handoff_ready';

export interface RegconReadinessResult {
  status: RegconReadiness;
  label: string;
  checks: { check: string; passed: boolean; detail?: string }[];
  blockers: string[];
}

export function evaluateRegconReadiness(params: {
  planExists: boolean;
  planApproved: boolean;
  diagnosticComplete: boolean;
  measuresApproved: boolean;
  salaryAuditDone: boolean;
  harassmentProtocolActive: boolean;
  commissionConstituted: boolean;
  hasRegistrationNumber: boolean;
}): RegconReadinessResult {
  const checks = [
    { check: 'Plan de igualdad creado', passed: params.planExists, detail: 'Debe existir un plan formalizado' },
    { check: 'Diagnóstico de las 9 materias completado', passed: params.diagnosticComplete, detail: 'Las 9 materias del Art. 7 RD 901/2020 deben estar analizadas' },
    { check: 'Medidas correctoras aprobadas', passed: params.measuresApproved, detail: 'Al menos las medidas básicas deben estar aprobadas' },
    { check: 'Auditoría retributiva realizada', passed: params.salaryAuditDone, detail: 'Obligatoria según RD 902/2020' },
    { check: 'Protocolo de acoso activo', passed: params.harassmentProtocolActive, detail: 'Obligatorio para todas las empresas' },
    { check: 'Comisión negociadora constituida', passed: params.commissionConstituted, detail: 'Participación de la RLT obligatoria' },
    { check: 'Plan aprobado formalmente', passed: params.planApproved, detail: 'Aprobación con firma de ambas partes' },
  ];

  const blockers = checks.filter(c => !c.passed).map(c => c.check);
  const allInternal = checks.every(c => c.passed);

  let status: RegconReadiness;
  let label: string;

  if (params.hasRegistrationNumber) {
    // Should never say "registered" without real proof — treat as handoff_ready with reference
    status = 'official_handoff_ready';
    label = 'Preparado para registro oficial (referencia interna existente)';
  } else if (allInternal) {
    status = 'official_handoff_ready';
    label = 'Completado internamente — pendiente de registro en REGCON';
  } else if (params.planExists && params.diagnosticComplete) {
    status = 'internal_ready';
    label = 'En preparación interna — faltan requisitos';
  } else {
    status = 'not_ready';
    label = 'No preparado — requisitos pendientes';
  }

  return { status, label, checks, blockers };
}

// ─── Measures Summary ───────────────────────────────────────────────────────

export function computeMeasuresSummary(measures: EqualityMeasure[]): {
  total: number;
  byStatus: Record<MeasureStatus, number>;
  byArea: Record<string, number>;
  completionRate: number;
} {
  const byStatus: Record<MeasureStatus, number> = {
    proposed: 0, approved: 0, in_progress: 0, blocked: 0, completed: 0,
  };
  const byArea: Record<string, number> = {};

  for (const m of measures) {
    byStatus[m.status]++;
    byArea[m.areaCode] = (byArea[m.areaCode] ?? 0) + 1;
  }

  const total = measures.length;
  const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

  return { total, byStatus, byArea, completionRate };
}

// ─── Parse JSONB data from DB ───────────────────────────────────────────────

export function parseDiagnosisData(raw: Record<string, unknown> | null): DiagnosticAreaScore[] {
  if (!raw || !raw.areas) return [];
  const areas = raw.areas as DiagnosticAreaScore[];
  return Array.isArray(areas) ? areas : [];
}

export function parseMeasuresData(raw: Record<string, unknown> | null): EqualityMeasure[] {
  if (!raw || !raw.items) return [];
  const items = raw.items as EqualityMeasure[];
  return Array.isArray(items) ? items : [];
}

export function parseNegotiationTimeline(raw: Record<string, unknown> | null): NegotiationEvent[] {
  if (!raw || !raw.events) return [];
  const events = raw.events as NegotiationEvent[];
  return Array.isArray(events) ? events : [];
}

export function serializeDiagnosisData(areas: DiagnosticAreaScore[]): Record<string, unknown> {
  return { areas, version: '1.0', updatedAt: new Date().toISOString() };
}

export function serializeMeasuresData(items: EqualityMeasure[]): Record<string, unknown> {
  return { items, version: '1.0', updatedAt: new Date().toISOString() };
}

export function serializeNegotiationTimeline(events: NegotiationEvent[]): Record<string, unknown> {
  return { events, version: '1.0', updatedAt: new Date().toISOString() };
}
