/**
 * corridorOperationalEngine.ts — G2.2 Phase 2
 * Pure/deterministic engine that transforms SupervisorResult + assignment data
 * into an actionable CorridorOperationalPlan with phases, checklists,
 * document gaps, suggested tasks, fiscal/payroll dependencies, and coverage assessment.
 *
 * PRINCIPLES:
 * - No fetch, no side-effects, no DB access
 * - All output is deterministic from inputs
 * - Coverage levels are explicit (full/partial/minimal), no fictional percentages
 * - Provenance is tracked on every item
 * - Prudence notes distinguish guidance from officialdom
 */

import type { SupervisorResult } from './expatriateSupervisor';
import type { CorridorKnowledgePack } from './corridorKnowledgePacks';
import type { CrossModuleImpact } from './mobilityImpactResolver';
import type { ExtendedReviewTrigger } from './reviewTriggerEngine';
import type { MobilityAssignment, MobilityDocument, DocumentType, AssignmentStatus } from '@/hooks/erp/hr/useGlobalMobility';

// ── Document Mapping ──

/**
 * Mapping between corridor-required document labels and MobilityDocument.document_type.
 * Avoids false positives/negatives from plain string comparison.
 */
const DOCUMENT_TYPE_MAPPING: Record<string, DocumentType[]> = {
  // SS certificates
  'Certificado A1': ['a1_certificate', 'social_security_cert'],
  'A1 Certificate': ['a1_certificate', 'social_security_cert'],
  'Formulario A1': ['a1_certificate', 'social_security_cert'],
  'Convenio bilateral SS': ['social_security_cert'],
  'Social security certificate': ['social_security_cert', 'a1_certificate'],

  // Immigration
  'Permiso de trabajo': ['work_permit'],
  'Work permit': ['work_permit'],
  'Visa de trabajo': ['visa', 'work_permit'],
  'Visa': ['visa'],
  'Permiso de residencia': ['residence_permit'],
  'Residence permit': ['residence_permit'],

  // Tax
  'Certificado de residencia fiscal': ['tax_residency_cert'],
  'Tax residency certificate': ['tax_residency_cert'],
  'Certificado de cobertura': ['tax_residency_cert'],

  // Assignment
  'Carta de asignación': ['assignment_letter'],
  'Assignment letter': ['assignment_letter'],

  // Cost
  'Proyección de costes': ['cost_projection'],
  'Cost projection': ['cost_projection'],

  // Medical
  'Certificado médico': ['medical_clearance'],
  'Medical clearance': ['medical_clearance'],

  // Repatriation
  'Acuerdo de repatriación': ['repatriation_agreement'],
  'Repatriation agreement': ['repatriation_agreement'],

  // Relocation
  'Contrato de relocalización': ['relocation_contract'],
  'Relocation contract': ['relocation_contract'],
};

function normalizeDocLabel(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, ' ');
}

function resolveDocumentType(requiredLabel: string): DocumentType[] {
  // Direct match
  if (DOCUMENT_TYPE_MAPPING[requiredLabel]) {
    return DOCUMENT_TYPE_MAPPING[requiredLabel];
  }
  // Normalized match
  const normalized = normalizeDocLabel(requiredLabel);
  for (const [key, types] of Object.entries(DOCUMENT_TYPE_MAPPING)) {
    if (normalizeDocLabel(key) === normalized) return types;
  }
  // Partial match
  for (const [key, types] of Object.entries(DOCUMENT_TYPE_MAPPING)) {
    if (normalized.includes(normalizeDocLabel(key)) || normalizeDocLabel(key).includes(normalized)) {
      return types;
    }
  }
  return [];
}

// ── Types ──

export type PhaseId = 'pre_assignment' | 'mobilization' | 'on_assignment' | 'repatriation';
export type PhaseStatus = 'future' | 'active' | 'completed';
export type CoverageLevel = 'full' | 'partial' | 'minimal';
export type Provenance = 'pack' | 'supervisor' | 'assignment' | 'document' | 'engine' | 'fiscal_module' | 'payroll_module';

export interface CheckItem {
  id: string;
  label: string;
  phase: PhaseId;
  completed: boolean;
  provenance: Provenance;
  condition?: string;
}

export interface ContextualAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  phase: PhaseId;
  provenance: Provenance;
  suggestedAction?: string;
}

export interface DocRequirement {
  label: string;
  mappedTypes: DocumentType[];
  present: boolean;
  presentDocName?: string;
  provenance: Provenance;
}

export interface DocGap {
  label: string;
  expectedTypes: DocumentType[];
  provenance: Provenance;
}

export interface SuggestedTask {
  id: string;
  title: string;
  category: 'mobility' | 'document' | 'compliance' | 'admin_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phase: PhaseId;
  taskType: string;
  deduplicationKey: string;
  provenance: Provenance;
  condition: string;
}

export interface FiscalPayrollDependency {
  id: string;
  label: string;
  module: 'fiscal' | 'payroll' | 'legal';
  detected: boolean;
  status: 'pending_review' | 'action_needed' | 'informational';
  suggestedAction: string;
  context?: string;
  provenance: Provenance;
}

export interface CorridorPhase {
  id: PhaseId;
  label: string;
  status: PhaseStatus;
  checklist: CheckItem[];
  alerts: ContextualAlert[];
  estimatedStart?: string;
  estimatedEnd?: string;
}

export interface CoverageAssessment {
  level: CoverageLevel;
  gaps: string[];
  prudenceNotes: string[];
  /** Rule explanation for the coverage determination */
  rule: string;
}

export interface ExecutiveSummary {
  corridorLabel: string;
  supportLevel: string;
  supportLevelLabel: string;
  riskScore: number;
  packAvailable: boolean;
  packVersion?: string;
  packStatus?: string;
  coverageLevel: CoverageLevel;
  prudenceNotes: string[];
  activatedSignals: number;
  totalSignals: number;
  reviewTriggersCount: number;
}

export interface CorridorOperationalPlan {
  executiveSummary: ExecutiveSummary;
  phases: CorridorPhase[];
  documentRequirements: DocRequirement[];
  documentGaps: DocGap[];
  suggestedTasks: SuggestedTask[];
  fiscalPayrollDependencies: FiscalPayrollDependency[];
  coverageAssessment: CoverageAssessment;
  evaluatedAt: string;
}

// ── Phase Status Resolution ──

const PHASE_ORDER: PhaseId[] = ['pre_assignment', 'mobilization', 'on_assignment', 'repatriation'];
const PHASE_LABELS: Record<PhaseId, string> = {
  pre_assignment: 'Pre-asignación',
  mobilization: 'Movilización',
  on_assignment: 'En destino',
  repatriation: 'Repatriación / Cierre',
};

const STATUS_TO_PHASE: Record<AssignmentStatus, PhaseId> = {
  draft: 'pre_assignment',
  planned: 'pre_assignment',
  pre_assignment: 'pre_assignment',
  active: 'on_assignment',
  extending: 'on_assignment',
  repatriating: 'repatriation',
  completed: 'repatriation',
  cancelled: 'repatriation',
};

function resolvePhaseStatus(phaseId: PhaseId, currentPhase: PhaseId): PhaseStatus {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const phaseIdx = PHASE_ORDER.indexOf(phaseId);
  if (phaseIdx < currentIdx) return 'completed';
  if (phaseIdx === currentIdx) return 'active';
  return 'future';
}

// ── Checklist Builder ──

function buildChecklist(
  pack: CorridorKnowledgePack | null,
  assignment: MobilityAssignment,
  documents: MobilityDocument[],
  presentDocTypes: Set<DocumentType>,
): CheckItem[] {
  const items: CheckItem[] = [];
  let idx = 0;
  const addItem = (label: string, phase: PhaseId, completed: boolean, provenance: Provenance, condition?: string) => {
    items.push({ id: `chk-${idx++}`, label, phase, completed, provenance, condition });
  };

  // Pre-assignment checklist
  addItem('Carta de asignación emitida', 'pre_assignment', presentDocTypes.has('assignment_letter'), 'document');
  
  if (pack?.immigration.workPermitRequired) {
    addItem('Permiso de trabajo tramitado', 'pre_assignment', presentDocTypes.has('work_permit'), 'pack', 'immigration.workPermitRequired');
    addItem(`Visa ${pack.immigration.visaType} solicitada`, 'pre_assignment', presentDocTypes.has('visa'), 'pack');
  }
  
  if (pack?.ss.certType) {
    addItem(`Certificado ${pack.ss.certType} obtenido`, 'pre_assignment', presentDocTypes.has('a1_certificate') || presentDocTypes.has('social_security_cert'), 'pack', `ss.certType=${pack.ss.certType}`);
  }

  addItem('Certificado médico internacional', 'pre_assignment', presentDocTypes.has('medical_clearance'), 'engine');

  // Mobilization
  addItem('Proyección de costes aprobada', 'mobilization', presentDocTypes.has('cost_projection'), 'engine');
  
  if (assignment.split_payroll) {
    addItem('Payroll split configurado', 'mobilization', false, 'assignment', 'split_payroll=true');
  }
  if (assignment.shadow_payroll) {
    addItem('Shadow payroll configurado', 'mobilization', false, 'assignment', 'shadow_payroll=true');
  }

  if (pack?.payroll.taxEqRecommended && assignment.compensation_approach === 'tax_equalization') {
    addItem('Tax equalization agreement firmado', 'mobilization', false, 'pack');
  }

  // On assignment
  if (pack?.tax.residenceDaysThreshold) {
    const daysInHost = assignment.days_in_host ?? 0;
    const approaching = daysInHost > pack.tax.residenceDaysThreshold * 0.7;
    addItem(`Monitorizar umbral ${pack.tax.residenceDaysThreshold} días residencia fiscal`, 'on_assignment', !approaching, 'pack', `days_in_host=${daysInHost}`);
  }

  if (pack?.ss.maxMonths) {
    const start = new Date(assignment.start_date);
    const now = new Date();
    const monthsElapsed = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    addItem(`Control duración SS (máx. ${pack.ss.maxMonths} meses)`, 'on_assignment', monthsElapsed < pack.ss.maxMonths, 'pack', `months=${monthsElapsed}/${pack.ss.maxMonths}`);
  }

  addItem('Certificado de residencia fiscal actualizado', 'on_assignment', presentDocTypes.has('tax_residency_cert'), 'engine');

  // Repatriation
  addItem('Acuerdo de repatriación firmado', 'repatriation', presentDocTypes.has('repatriation_agreement'), 'document');
  addItem('Cierre de cuentas fiscales en destino', 'repatriation', false, 'engine');
  addItem('Baja en SS destino / reactivación origen', 'repatriation', false, 'engine');

  return items;
}

// ── Contextual Alerts Builder ──

function buildAlerts(
  pack: CorridorKnowledgePack | null,
  assignment: MobilityAssignment,
  reviewTriggers: ExtendedReviewTrigger[],
  crossModuleImpact: CrossModuleImpact,
): ContextualAlert[] {
  const alerts: ContextualAlert[] = [];
  let idx = 0;

  // From review triggers — contextualized
  for (const t of reviewTriggers) {
    const phase = t.affectedModule === 'fiscal' || t.affectedModule === 'tax'
      ? 'on_assignment'
      : t.affectedModule === 'immigration' ? 'pre_assignment'
      : 'mobilization';
    alerts.push({
      id: `alert-rt-${idx++}`,
      severity: t.severity === 'critical_review_required' ? 'critical' : t.severity === 'review_required' ? 'warning' : 'info',
      message: t.reason,
      phase,
      provenance: 'supervisor',
      suggestedAction: t.suggestedAction,
    });
  }

  // SS max months approaching
  if (pack?.ss.maxMonths) {
    const start = new Date(assignment.start_date);
    const now = new Date();
    const monthsElapsed = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (monthsElapsed >= pack.ss.maxMonths - 3 && monthsElapsed < pack.ss.maxMonths) {
      alerts.push({
        id: `alert-ss-expiry-${idx++}`,
        severity: 'warning',
        message: `El certificado ${pack.ss.certType} se acerca al límite de ${pack.ss.maxMonths} meses (${monthsElapsed} meses transcurridos). Valorar extensión o cambio de régimen.`,
        phase: 'on_assignment',
        provenance: 'pack',
        suggestedAction: 'Solicitar extensión de A1 o iniciar afiliación local',
      });
    } else if (monthsElapsed >= pack.ss.maxMonths) {
      alerts.push({
        id: `alert-ss-expired-${idx++}`,
        severity: 'critical',
        message: `Superado el límite de ${pack.ss.maxMonths} meses del ${pack.ss.certType}. Es necesaria afiliación local o extensión autorizada.`,
        phase: 'on_assignment',
        provenance: 'pack',
        suggestedAction: 'Iniciar afiliación local en destino urgentemente',
      });
    }
  }

  // 183-day threshold
  if (pack?.tax.residenceDaysThreshold) {
    const days = assignment.days_in_host ?? 0;
    if (days > pack.tax.residenceDaysThreshold * 0.85 && days <= pack.tax.residenceDaysThreshold) {
      alerts.push({
        id: `alert-183-approaching-${idx++}`,
        severity: 'warning',
        message: `${days} días en destino — próximo al umbral de ${pack.tax.residenceDaysThreshold} días para residencia fiscal. Impacto potencial en la declaración de IRPF.`,
        phase: 'on_assignment',
        provenance: 'pack',
        suggestedAction: 'Revisar planificación de días y consultar con fiscal',
      });
    }
  }

  // PE risk
  if (assignment.pe_risk_flag && crossModuleImpact.legal.peAssessment) {
    alerts.push({
      id: `alert-pe-risk-${idx++}`,
      severity: 'warning',
      message: 'Riesgo de Establecimiento Permanente (PE) detectado. Requiere evaluación jurídica de la actividad en destino.',
      phase: 'on_assignment',
      provenance: 'assignment',
      suggestedAction: 'Solicitar informe PE al departamento jurídico',
    });
  }

  // Pack stale
  if (pack && (pack.status === 'stale' || pack.status === 'review_required')) {
    alerts.push({
      id: `alert-pack-stale-${idx++}`,
      severity: 'info',
      message: `El knowledge pack para este corredor tiene estado "${pack.status}". Los datos normativos pueden no estar actualizados.`,
      phase: 'pre_assignment',
      provenance: 'pack',
      suggestedAction: 'Verificar datos normativos con fuentes oficiales antes de proceder',
    });
  }

  return alerts;
}

// ── Document Analysis ──

function analyzeDocuments(
  pack: CorridorKnowledgePack | null,
  assignment: MobilityAssignment,
  documents: MobilityDocument[],
): { requirements: DocRequirement[]; gaps: DocGap[] } {
  const requirements: DocRequirement[] = [];
  const gaps: DocGap[] = [];
  const presentDocTypes = new Set(documents.map(d => d.document_type));

  // Build list of required documents from pack
  const requiredLabels = pack?.requiredDocuments ?? [];

  // Always-required regardless of pack
  const baseRequired = ['Carta de asignación'];
  if (pack?.immigration.workPermitRequired) {
    baseRequired.push('Permiso de trabajo');
  }

  const allRequired = [...new Set([...baseRequired, ...requiredLabels])];

  for (const label of allRequired) {
    const mappedTypes = resolveDocumentType(label);
    const present = mappedTypes.length > 0
      ? mappedTypes.some(t => presentDocTypes.has(t))
      : false;
    
    const matchingDoc = present
      ? documents.find(d => mappedTypes.includes(d.document_type))
      : undefined;

    requirements.push({
      label,
      mappedTypes,
      present,
      presentDocName: matchingDoc?.document_name,
      provenance: requiredLabels.includes(label) ? 'pack' : 'engine',
    });

    if (!present) {
      gaps.push({
        label,
        expectedTypes: mappedTypes,
        provenance: requiredLabels.includes(label) ? 'pack' : 'engine',
      });
    }
  }

  return { requirements, gaps };
}

// ── Suggested Tasks Builder ──

function buildSuggestedTasks(
  pack: CorridorKnowledgePack | null,
  assignment: MobilityAssignment,
  documentGaps: DocGap[],
  crossModuleImpact: CrossModuleImpact,
): SuggestedTask[] {
  const tasks: SuggestedTask[] = [];
  let idx = 0;

  const addTask = (
    title: string,
    category: SuggestedTask['category'],
    priority: SuggestedTask['priority'],
    phase: PhaseId,
    taskType: string,
    provenance: Provenance,
    condition: string,
  ) => {
    tasks.push({
      id: `stask-${idx++}`,
      title,
      category,
      priority,
      phase,
      taskType,
      deduplicationKey: `${assignment.id}:${taskType}:${phase}`,
      provenance,
      condition,
    });
  };

  // Document gap tasks
  for (const gap of documentGaps) {
    addTask(
      `Obtener: ${gap.label}`,
      'document',
      'high',
      'pre_assignment',
      `doc_obtain_${gap.expectedTypes[0] ?? 'unknown'}`,
      gap.provenance,
      `Documento requerido no presente`,
    );
  }

  // Immigration tasks
  if (pack?.immigration.workPermitRequired) {
    addTask(
      `Tramitar permiso de trabajo (${pack.immigration.visaType})`,
      'mobility',
      'urgent',
      'pre_assignment',
      'immigration_work_permit',
      'pack',
      'immigration.workPermitRequired=true',
    );
  }

  // SS certificate
  if (pack?.ss.certType) {
    addTask(
      `Solicitar ${pack.ss.certType}`,
      'mobility',
      'high',
      'pre_assignment',
      `ss_cert_${pack.ss.certType.toLowerCase().replace(/\s+/g, '_')}`,
      'pack',
      `ss.certType=${pack.ss.certType}`,
    );
  }

  // Fiscal review
  if (crossModuleImpact.fiscal.residencyReview) {
    addTask(
      'Revisar residencia fiscal del trabajador',
      'compliance',
      'high',
      'mobilization',
      'fiscal_residency_review',
      'fiscal_module',
      'fiscal.residencyReview=true',
    );
  }

  if (crossModuleImpact.fiscal.art7pReview) {
    addTask(
      'Evaluar elegibilidad Art. 7.p LIRPF',
      'compliance',
      'medium',
      'mobilization',
      'fiscal_art7p_review',
      'fiscal_module',
      'fiscal.art7pReview=true',
    );
  }

  // Shadow payroll
  if (crossModuleImpact.fiscal.shadowPayroll) {
    addTask(
      'Configurar shadow payroll en destino',
      'mobility',
      'high',
      'mobilization',
      'payroll_shadow_setup',
      'payroll_module',
      'fiscal.shadowPayroll=true',
    );
  }

  // Legal - PE assessment
  if (crossModuleImpact.legal.peAssessment) {
    addTask(
      'Solicitar evaluación de Establecimiento Permanente',
      'compliance',
      'high',
      'on_assignment',
      'legal_pe_assessment',
      'engine',
      'legal.peAssessment=true',
    );
  }

  // Contract annex
  if (crossModuleImpact.legal.contractAnnex) {
    addTask(
      'Preparar anexo contractual de asignación internacional',
      'admin_request',
      'medium',
      'pre_assignment',
      'legal_contract_annex',
      'engine',
      'legal.contractAnnex=true',
    );
  }

  return tasks;
}

// ── Fiscal/Payroll Dependencies ──

function buildDependencies(
  crossModuleImpact: CrossModuleImpact,
  pack: CorridorKnowledgePack | null,
  assignment: MobilityAssignment,
): FiscalPayrollDependency[] {
  const deps: FiscalPayrollDependency[] = [];
  let idx = 0;

  if (crossModuleImpact.fiscal.residencyReview) {
    deps.push({
      id: `dep-${idx++}`,
      label: 'Revisión de residencia fiscal',
      module: 'fiscal',
      detected: true,
      status: 'action_needed',
      suggestedAction: 'Verificar regla de 183 días y centro de intereses vitales en módulo fiscal',
      context: 'Módulo Fiscal → Residencia',
      provenance: 'fiscal_module',
    });
  }

  if (crossModuleImpact.fiscal.art7pReview) {
    deps.push({
      id: `dep-${idx++}`,
      label: 'Elegibilidad Art. 7.p LIRPF (exención hasta 60.100€)',
      module: 'fiscal',
      detected: true,
      status: assignment.days_in_host && assignment.days_in_host > 0 ? 'action_needed' : 'pending_review',
      suggestedAction: 'Comprobar requisitos de trabajo efectivo en el extranjero y beneficiario no residente',
      context: 'Módulo Fiscal → Retenciones IRPF',
      provenance: 'fiscal_module',
    });
  }

  if (crossModuleImpact.fiscal.cdiApplicable) {
    deps.push({
      id: `dep-${idx++}`,
      label: `Convenio de Doble Imposición aplicable${pack?.cdi.treatyRef ? ` (${pack.cdi.treatyRef})` : ''}`,
      module: 'fiscal',
      detected: true,
      status: 'informational',
      suggestedAction: 'Revisar artículos aplicables del CDI para determinar retenciones correctas',
      context: 'Módulo Fiscal → CDI',
      provenance: 'fiscal_module',
    });
  }

  if (crossModuleImpact.fiscal.shadowPayroll) {
    deps.push({
      id: `dep-${idx++}`,
      label: 'Shadow payroll en país destino',
      module: 'payroll',
      detected: true,
      status: 'action_needed',
      suggestedAction: 'Configurar nómina sombra para declaraciones locales en destino',
      context: 'Módulo Payroll → Nómina internacional',
      provenance: 'payroll_module',
    });
  }

  if (crossModuleImpact.fiscal.retentionAdjustment) {
    deps.push({
      id: `dep-${idx++}`,
      label: 'Ajuste de retenciones por movilidad',
      module: 'payroll',
      detected: true,
      status: 'action_needed',
      suggestedAction: 'Recalcular retenciones IRPF considerando split payroll o Art. 7.p',
      context: 'Módulo Payroll → Retenciones',
      provenance: 'payroll_module',
    });
  }

  if (crossModuleImpact.legal.peAssessment) {
    deps.push({
      id: `dep-${idx++}`,
      label: 'Riesgo de Establecimiento Permanente (PE)',
      module: 'legal',
      detected: true,
      status: 'action_needed',
      suggestedAction: 'Evaluar si la actividad del trabajador genera EP en el país destino',
      context: 'Módulo Legal → Análisis PE',
      provenance: 'engine',
    });
  }

  if (crossModuleImpact.legal.dataProtection) {
    deps.push({
      id: `dep-${idx++}`,
      label: 'Transferencia internacional de datos personales',
      module: 'legal',
      detected: true,
      status: 'informational',
      suggestedAction: 'Verificar base legal para transferencia de datos del empleado al país destino (GDPR)',
      context: 'Módulo Legal → Protección de datos',
      provenance: 'engine',
    });
  }

  return deps;
}

// ── Coverage Assessment ──

/**
 * Coverage level is determined by a clear, deterministic rule:
 * - full: pack exists, status=current, AND all 4 domains have data (SS, CDI, tax, immigration)
 * - partial: pack exists but status!=current OR one domain is missing meaningful data
 * - minimal: no pack available
 *
 * No percentage is used — only explicit level + gaps.
 */
function assessCoverage(
  pack: CorridorKnowledgePack | null,
  reviewTriggers: ExtendedReviewTrigger[],
): CoverageAssessment {
  if (!pack) {
    return {
      level: 'minimal',
      gaps: ['No existe knowledge pack para este corredor', 'Clasificación basada únicamente en motores genéricos', 'Revisión manual obligatoria'],
      prudenceNotes: [
        'Sin pack específico, el sistema aplica reglas genéricas. La revisión humana es obligatoria.',
        'No se garantiza cobertura normativa específica para este corredor.',
      ],
      rule: 'Nivel minimal: sin pack disponible para el corredor. Solo motores genéricos activos.',
    };
  }

  const gaps: string[] = [];
  const prudenceNotes: string[] = [];

  // Check domain completeness
  if (!pack.ss.regime || pack.ss.regime === 'no_agreement') {
    gaps.push('Sin convenio de Seguridad Social identificado');
  }
  if (!pack.cdi.hasCDI) {
    gaps.push('Sin Convenio de Doble Imposición aplicable');
  }
  if (pack.status !== 'current') {
    gaps.push(`Pack en estado "${pack.status}" — datos potencialmente desactualizados`);
  }

  // Critical triggers indicate coverage gaps
  const criticalCount = reviewTriggers.filter(t => t.severity === 'critical_review_required').length;
  if (criticalCount > 0) {
    gaps.push(`${criticalCount} trigger(s) críticos activos que requieren revisión humana`);
  }

  // Prudence notes
  prudenceNotes.push(pack.automationBoundaryNote);
  if (pack.status !== 'current') {
    prudenceNotes.push('Los datos de este pack pueden no reflejar la normativa vigente. Verificar con fuentes oficiales.');
  }

  // Determine level
  const hasAllDomains = pack.ss.regime !== 'no_agreement' && pack.cdi.hasCDI;
  const isCurrent = pack.status === 'current';

  let level: CoverageLevel;
  let rule: string;

  if (hasAllDomains && isCurrent && criticalCount === 0) {
    level = 'full';
    rule = 'Nivel full: pack vigente (current), todos los dominios cubiertos (SS, CDI, tax, inmigración), sin triggers críticos.';
  } else if (hasAllDomains || isCurrent) {
    level = 'partial';
    rule = `Nivel partial: ${!isCurrent ? 'pack no vigente' : ''}${!hasAllDomains ? (isCurrent ? '' : ' + ') + 'dominio(s) sin cobertura' : ''}${criticalCount > 0 ? ' + triggers críticos' : ''}.`;
  } else {
    level = 'partial';
    rule = 'Nivel partial: pack disponible pero con limitaciones significativas en dominios o vigencia.';
  }

  return { level, gaps, prudenceNotes, rule };
}

// ── Timeline Estimation ──

function estimateTimeline(assignment: MobilityAssignment): Record<PhaseId, { start?: string; end?: string }> {
  const startDate = new Date(assignment.start_date);
  const endDate = assignment.end_date ? new Date(assignment.end_date) : null;

  // Pre-assignment: 3 months before start
  const preStart = new Date(startDate);
  preStart.setMonth(preStart.getMonth() - 3);

  // Mobilization: 1 month before start to start
  const mobStart = new Date(startDate);
  mobStart.setMonth(mobStart.getMonth() - 1);

  return {
    pre_assignment: {
      start: preStart.toISOString().split('T')[0],
      end: mobStart.toISOString().split('T')[0],
    },
    mobilization: {
      start: mobStart.toISOString().split('T')[0],
      end: startDate.toISOString().split('T')[0],
    },
    on_assignment: {
      start: startDate.toISOString().split('T')[0],
      end: endDate?.toISOString().split('T')[0],
    },
    repatriation: {
      start: endDate?.toISOString().split('T')[0],
      end: endDate ? (() => {
        const r = new Date(endDate);
        r.setMonth(r.getMonth() + 2);
        return r.toISOString().split('T')[0];
      })() : undefined,
    },
  };
}

// ── Main Engine ──

export function buildCorridorOperationalPlan(
  supervisor: SupervisorResult,
  assignment: MobilityAssignment,
  documents: MobilityDocument[],
): CorridorOperationalPlan {
  const pack = supervisor.corridorPack;
  const presentDocTypes = new Set(documents.map(d => d.document_type));
  const currentPhase = STATUS_TO_PHASE[assignment.status] ?? 'pre_assignment';
  const timeline = estimateTimeline(assignment);

  // Build layers
  const checklist = buildChecklist(pack, assignment, documents, presentDocTypes);
  const alerts = buildAlerts(pack, assignment, supervisor.reviewTriggers, supervisor.crossModuleImpact);
  const { requirements, gaps } = analyzeDocuments(pack, assignment, documents);
  const suggestedTasks = buildSuggestedTasks(pack, assignment, gaps, supervisor.crossModuleImpact);
  const dependencies = buildDependencies(supervisor.crossModuleImpact, pack, assignment);
  const coverage = assessCoverage(pack, supervisor.reviewTriggers);

  // Build phases
  const phases: CorridorPhase[] = PHASE_ORDER.map(phaseId => ({
    id: phaseId,
    label: PHASE_LABELS[phaseId],
    status: resolvePhaseStatus(phaseId, currentPhase),
    checklist: checklist.filter(c => c.phase === phaseId),
    alerts: alerts.filter(a => a.phase === phaseId),
    estimatedStart: timeline[phaseId].start,
    estimatedEnd: timeline[phaseId].end,
  }));

  // Support labels
  const supportLabels: Record<string, string> = {
    supported_production: 'Soportado — Producción',
    supported_with_review: 'Soportado — Requiere revisión',
    out_of_scope: 'Fuera de alcance',
  };

  const activeSignals = supervisor.activationTriggers.filter(t => t.detected).length;

  const executiveSummary: ExecutiveSummary = {
    corridorLabel: supervisor.corridorLabel,
    supportLevel: supervisor.overallSupportLevel,
    supportLevelLabel: supportLabels[supervisor.overallSupportLevel] ?? supervisor.overallSupportLevel,
    riskScore: supervisor.consolidatedRiskScore,
    packAvailable: supervisor.hasCorridorPack,
    packVersion: pack?.version,
    packStatus: pack?.status,
    coverageLevel: coverage.level,
    prudenceNotes: coverage.prudenceNotes,
    activatedSignals: activeSignals,
    totalSignals: supervisor.activationTriggers.length,
    reviewTriggersCount: supervisor.reviewTriggers.length,
  };

  return {
    executiveSummary,
    phases,
    documentRequirements: requirements,
    documentGaps: gaps,
    suggestedTasks,
    fiscalPayrollDependencies: dependencies,
    coverageAssessment: coverage,
    evaluatedAt: new Date().toISOString(),
  };
}
