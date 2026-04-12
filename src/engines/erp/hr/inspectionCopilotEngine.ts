/**
 * inspectionCopilotEngine.ts — Motor del Copiloto de Inspección de Trabajo (C3)
 * 
 * Evalúa readiness por área inspectable, genera semáforos con evidencias,
 * identifica carencias y produce un pack documental agrupado.
 * 
 * DISCLAIMER: Este motor NO sustituye asesoramiento jurídico profesional.
 * Los scores son orientativos y reflejan completitud documental interna,
 * NO conformidad legal certificada.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type InspectionAreaId =
  | 'time_tracking'
  | 'contracts'
  | 'prl'
  | 'equality'
  | 'lismi'
  | 'whistleblower'
  | 'labor_docs';

export type TrafficLight = 'green' | 'yellow' | 'red';

export interface InspectionAreaDef {
  id: InspectionAreaId;
  label: string;
  legalBasis: string;
  checks: InspectionCheck[];
}

export interface InspectionCheck {
  id: string;
  description: string;
  weight: number; // 1-10
  category: 'mandatory' | 'recommended';
}

export interface EvidenceRef {
  checkId: string;
  source: string;      // e.g. 'erp_hr_time_clock', 'erp_hr_contracts'
  description: string;
  available: boolean;
  documentId?: string;
}

export interface AreaEvaluation {
  areaId: InspectionAreaId;
  label: string;
  legalBasis: string;
  light: TrafficLight;
  score: number;         // 0-100, orientativo
  totalChecks: number;
  passedChecks: number;
  failedChecks: InspectionCheck[];
  evidences: EvidenceRef[];
  gaps: string[];
}

export interface InspectionReadinessReport {
  companyId: string;
  evaluatedAt: string;
  overallScore: number;  // 0-100
  overallLight: TrafficLight;
  areas: AreaEvaluation[];
  criticalGaps: string[];
  documentPack: DocumentPackItem[];
  disclaimer: string;
}

export interface DocumentPackItem {
  areaId: InspectionAreaId;
  documentType: string;
  label: string;
  available: boolean;
  source: string;
}

// ─── Áreas de inspección ─────────────────────────────────────────────────────

export const INSPECTION_AREAS: InspectionAreaDef[] = [
  {
    id: 'time_tracking',
    label: 'Registro de Jornada',
    legalBasis: 'Art. 34.9 ET, RDL 8/2019',
    checks: [
      { id: 'tc_system_active', description: 'Sistema de fichaje operativo', weight: 10, category: 'mandatory' },
      { id: 'tc_daily_records', description: 'Registros diarios de entrada/salida', weight: 9, category: 'mandatory' },
      { id: 'tc_retention_4y', description: 'Conservación 4 años accesible', weight: 8, category: 'mandatory' },
      { id: 'tc_rlt_informed', description: 'RLT informada del sistema', weight: 5, category: 'recommended' },
      { id: 'tc_export_ready', description: 'Exportación disponible para inspección', weight: 7, category: 'mandatory' },
    ],
  },
  {
    id: 'contracts',
    label: 'Contratos de Trabajo',
    legalBasis: 'Arts. 8-11 ET, RD 1424/2002',
    checks: [
      { id: 'ct_all_written', description: 'Todos los contratos por escrito', weight: 10, category: 'mandatory' },
      { id: 'ct_registered_sepe', description: 'Contratos comunicados al SEPE', weight: 9, category: 'mandatory' },
      { id: 'ct_correct_modality', description: 'Modalidades contractuales correctas', weight: 8, category: 'mandatory' },
      { id: 'ct_temp_cause', description: 'Temporalidad con causa justificada', weight: 9, category: 'mandatory' },
      { id: 'ct_copy_basica', description: 'Copia básica entregada a RLT', weight: 6, category: 'recommended' },
    ],
  },
  {
    id: 'prl',
    label: 'Prevención de Riesgos Laborales',
    legalBasis: 'Ley 31/1995, RD 39/1997',
    checks: [
      { id: 'prl_eval_risks', description: 'Evaluación de riesgos actualizada', weight: 10, category: 'mandatory' },
      { id: 'prl_planning', description: 'Planificación preventiva documentada', weight: 9, category: 'mandatory' },
      { id: 'prl_training', description: 'Formación PRL registrada', weight: 8, category: 'mandatory' },
      { id: 'prl_medical', description: 'Vigilancia de la salud ofrecida', weight: 7, category: 'mandatory' },
      { id: 'prl_spa_contract', description: 'SPA/SPP designado o contratado', weight: 8, category: 'mandatory' },
    ],
  },
  {
    id: 'equality',
    label: 'Plan de Igualdad',
    legalBasis: 'RD 901/2020, RD 902/2020, LO 3/2007',
    checks: [
      { id: 'eq_plan_exists', description: 'Plan de Igualdad elaborado (≥50 empleados)', weight: 10, category: 'mandatory' },
      { id: 'eq_diagnosis', description: 'Diagnóstico de situación completado', weight: 9, category: 'mandatory' },
      { id: 'eq_salary_audit', description: 'Auditoría retributiva realizada', weight: 9, category: 'mandatory' },
      { id: 'eq_rlt_negotiated', description: 'Negociado con RLT', weight: 8, category: 'mandatory' },
      { id: 'eq_regcon', description: 'Inscrito en REGCON (si obligatorio)', weight: 7, category: 'recommended' },
    ],
  },
  {
    id: 'lismi',
    label: 'LISMI / LGD — Discapacidad',
    legalBasis: 'RDL 1/2013, RD 364/2005',
    checks: [
      { id: 'li_quota_met', description: 'Cuota 2% cumplida (≥50 empleados)', weight: 10, category: 'mandatory' },
      { id: 'li_alternatives', description: 'Medidas alternativas si aplica', weight: 8, category: 'mandatory' },
      { id: 'li_certificates', description: 'Certificados de discapacidad archivados', weight: 7, category: 'mandatory' },
    ],
  },
  {
    id: 'whistleblower',
    label: 'Canal de Denuncias',
    legalBasis: 'Ley 2/2023',
    checks: [
      { id: 'wb_channel_active', description: 'Canal habilitado y accesible', weight: 10, category: 'mandatory' },
      { id: 'wb_responsible', description: 'Responsable del sistema designado', weight: 9, category: 'mandatory' },
      { id: 'wb_confidentiality', description: 'Garantías de confidencialidad documentadas', weight: 8, category: 'mandatory' },
      { id: 'wb_response_time', description: 'Acuse de recibo en 7 días', weight: 7, category: 'mandatory' },
    ],
  },
  {
    id: 'labor_docs',
    label: 'Documentación Laboral General',
    legalBasis: 'ET, LGSS, normativa transversal',
    checks: [
      { id: 'ld_payslips', description: 'Nóminas firmadas/entregadas', weight: 9, category: 'mandatory' },
      { id: 'ld_tc2', description: 'TC2/RLC disponibles', weight: 8, category: 'mandatory' },
      { id: 'ld_calendar', description: 'Calendario laboral publicado', weight: 7, category: 'mandatory' },
      { id: 'ld_irpf', description: 'Certificados IRPF disponibles', weight: 6, category: 'recommended' },
      { id: 'ld_ss_affiliation', description: 'Altas/bajas SS comunicadas', weight: 9, category: 'mandatory' },
    ],
  },
];

// ─── Evaluación ──────────────────────────────────────────────────────────────

export interface CompanyDataSnapshot {
  employeeCount: number;
  hasTimeClockSystem: boolean;
  timeClockRecordCount: number;
  timeClockExportReady: boolean;
  contractCount: number;
  contractsWithModality: number;
  tempContractsWithCause: number;
  totalTempContracts: number;
  hasPRLEvaluation: boolean;
  hasPRLPlanning: boolean;
  hasPRLTraining: boolean;
  hasMedicalSurveillance: boolean;
  hasSPA: boolean;
  hasEqualityPlan: boolean;
  equalityDiagnosisComplete: boolean;
  hasSalaryAudit: boolean;
  equalityNegotiated: boolean;
  equalityRegistered: boolean;
  lismiQuotaMet: boolean;
  lismiAlternatives: boolean;
  lismiCertificatesArchived: boolean;
  hasWhistleblowerChannel: boolean;
  whistleblowerResponsible: boolean;
  whistleblowerConfidentiality: boolean;
  whistleblowerResponseTime: boolean;
  payslipsDelivered: boolean;
  hasTC2: boolean;
  hasCalendar: boolean;
  hasIRPFCertificates: boolean;
  ssAffiliationsCommunicated: boolean;
  rltInformed: boolean;
  copiaBasicaDelivered: boolean;
  sepeContractsCommunicated: boolean;
}

const CHECK_RESOLVERS: Record<string, (d: CompanyDataSnapshot) => boolean> = {
  // Time tracking
  tc_system_active: d => d.hasTimeClockSystem,
  tc_daily_records: d => d.timeClockRecordCount > 0,
  tc_retention_4y: d => d.timeClockRecordCount > 0, // simplified
  tc_rlt_informed: d => d.rltInformed,
  tc_export_ready: d => d.timeClockExportReady,
  // Contracts
  ct_all_written: d => d.contractCount > 0,
  ct_registered_sepe: d => d.sepeContractsCommunicated,
  ct_correct_modality: d => d.contractsWithModality >= d.contractCount * 0.95,
  ct_temp_cause: d => d.totalTempContracts === 0 || d.tempContractsWithCause >= d.totalTempContracts * 0.9,
  ct_copy_basica: d => d.copiaBasicaDelivered,
  // PRL
  prl_eval_risks: d => d.hasPRLEvaluation,
  prl_planning: d => d.hasPRLPlanning,
  prl_training: d => d.hasPRLTraining,
  prl_medical: d => d.hasMedicalSurveillance,
  prl_spa_contract: d => d.hasSPA,
  // Equality
  eq_plan_exists: d => d.employeeCount < 50 || d.hasEqualityPlan,
  eq_diagnosis: d => d.employeeCount < 50 || d.equalityDiagnosisComplete,
  eq_salary_audit: d => d.employeeCount < 50 || d.hasSalaryAudit,
  eq_rlt_negotiated: d => d.employeeCount < 50 || d.equalityNegotiated,
  eq_regcon: d => d.employeeCount < 50 || d.equalityRegistered,
  // LISMI
  li_quota_met: d => d.employeeCount < 50 || d.lismiQuotaMet,
  li_alternatives: d => d.employeeCount < 50 || d.lismiAlternatives,
  li_certificates: d => d.employeeCount < 50 || d.lismiCertificatesArchived,
  // Whistleblower
  wb_channel_active: d => d.hasWhistleblowerChannel,
  wb_responsible: d => d.whistleblowerResponsible,
  wb_confidentiality: d => d.whistleblowerConfidentiality,
  wb_response_time: d => d.whistleblowerResponseTime,
  // Labor docs
  ld_payslips: d => d.payslipsDelivered,
  ld_tc2: d => d.hasTC2,
  ld_calendar: d => d.hasCalendar,
  ld_irpf: d => d.hasIRPFCertificates,
  ld_ss_affiliation: d => d.ssAffiliationsCommunicated,
};

export function resolveCheck(checkId: string, data: CompanyDataSnapshot): boolean {
  const resolver = CHECK_RESOLVERS[checkId];
  if (!resolver) return false;
  try { return resolver(data); } catch { return false; }
}

export function scoreToLight(score: number): TrafficLight {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function evaluateArea(
  area: InspectionAreaDef,
  data: CompanyDataSnapshot
): AreaEvaluation {
  const evidences: EvidenceRef[] = [];
  const failedChecks: InspectionCheck[] = [];
  const gaps: string[] = [];
  let totalWeight = 0;
  let passedWeight = 0;
  let passedCount = 0;

  for (const check of area.checks) {
    const passed = resolveCheck(check.id, data);
    totalWeight += check.weight;

    evidences.push({
      checkId: check.id,
      source: `erp_hr_${area.id}`,
      description: check.description,
      available: passed,
    });

    if (passed) {
      passedWeight += check.weight;
      passedCount++;
    } else {
      failedChecks.push(check);
      gaps.push(check.description);
    }
  }

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  return {
    areaId: area.id,
    label: area.label,
    legalBasis: area.legalBasis,
    light: scoreToLight(score),
    score,
    totalChecks: area.checks.length,
    passedChecks: passedCount,
    failedChecks,
    evidences,
    gaps,
  };
}

// ─── Pack documental ─────────────────────────────────────────────────────────

const DOC_PACK_ITEMS: DocumentPackItem[] = [
  { areaId: 'time_tracking', documentType: 'export_fichajes', label: 'Exportación de registros de jornada', available: false, source: 'erp_hr_time_clock' },
  { areaId: 'time_tracking', documentType: 'protocolo_fichaje', label: 'Protocolo de registro horario', available: false, source: 'erp_hr_documents' },
  { areaId: 'contracts', documentType: 'contratos_vigentes', label: 'Listado de contratos vigentes', available: false, source: 'erp_hr_contracts' },
  { areaId: 'contracts', documentType: 'copias_basicas', label: 'Copias básicas entregadas', available: false, source: 'erp_hr_documents' },
  { areaId: 'prl', documentType: 'eval_riesgos', label: 'Evaluación de riesgos', available: false, source: 'erp_hr_documents' },
  { areaId: 'prl', documentType: 'plan_prevencion', label: 'Plan de prevención', available: false, source: 'erp_hr_documents' },
  { areaId: 'prl', documentType: 'formacion_prl', label: 'Registros de formación PRL', available: false, source: 'erp_hr_training' },
  { areaId: 'equality', documentType: 'plan_igualdad', label: 'Plan de Igualdad', available: false, source: 'erp_hr_equality_plans' },
  { areaId: 'equality', documentType: 'auditoria_retributiva', label: 'Auditoría retributiva', available: false, source: 'erp_hr_salary_audits' },
  { areaId: 'lismi', documentType: 'certificados_discapacidad', label: 'Certificados de discapacidad', available: false, source: 'erp_hr_documents' },
  { areaId: 'lismi', documentType: 'medidas_alternativas', label: 'Documentación medidas alternativas', available: false, source: 'erp_hr_documents' },
  { areaId: 'whistleblower', documentType: 'protocolo_denuncias', label: 'Protocolo del canal de denuncias', available: false, source: 'erp_hr_documents' },
  { areaId: 'labor_docs', documentType: 'nominas', label: 'Nóminas del periodo', available: false, source: 'erp_hr_payrolls' },
  { areaId: 'labor_docs', documentType: 'tc2_rlc', label: 'TC2/RLC', available: false, source: 'erp_hr_official_artifacts' },
  { areaId: 'labor_docs', documentType: 'calendario_laboral', label: 'Calendario laboral', available: false, source: 'erp_hr_documents' },
];

export function buildDocumentPack(data: CompanyDataSnapshot): DocumentPackItem[] {
  return DOC_PACK_ITEMS.map(item => {
    let available = false;
    switch (item.documentType) {
      case 'export_fichajes': available = data.timeClockExportReady && data.timeClockRecordCount > 0; break;
      case 'contratos_vigentes': available = data.contractCount > 0; break;
      case 'plan_igualdad': available = data.hasEqualityPlan; break;
      case 'auditoria_retributiva': available = data.hasSalaryAudit; break;
      case 'nominas': available = data.payslipsDelivered; break;
      case 'tc2_rlc': available = data.hasTC2; break;
      case 'eval_riesgos': available = data.hasPRLEvaluation; break;
      case 'plan_prevencion': available = data.hasPRLPlanning; break;
      case 'formacion_prl': available = data.hasPRLTraining; break;
      case 'protocolo_denuncias': available = data.hasWhistleblowerChannel; break;
      case 'certificados_discapacidad': available = data.lismiCertificatesArchived; break;
      default: available = false;
    }
    return { ...item, available };
  });
}

// ─── Informe completo ────────────────────────────────────────────────────────

export const INSPECTION_DISCLAIMER =
  'Este informe es una herramienta interna de autoevaluación orientativa. ' +
  'NO constituye asesoramiento jurídico ni garantiza conformidad legal. ' +
  'Los semáforos reflejan completitud documental interna, no homologación oficial. ' +
  'Se recomienda validación por profesional cualificado antes de cualquier inspección.';

export function generateInspectionReport(
  companyId: string,
  data: CompanyDataSnapshot
): InspectionReadinessReport {
  const areas = INSPECTION_AREAS.map(a => evaluateArea(a, data));
  const totalWeight = areas.reduce((s, a) => s + a.score * INSPECTION_AREAS.find(ia => ia.id === a.areaId)!.checks.length, 0);
  const totalChecks = areas.reduce((s, a) => s + a.totalChecks, 0);
  const overallScore = totalChecks > 0 ? Math.round(totalWeight / totalChecks) : 0;

  const criticalGaps = areas
    .filter(a => a.light === 'red')
    .flatMap(a => a.gaps.map(g => `[${a.label}] ${g}`));

  return {
    companyId,
    evaluatedAt: new Date().toISOString(),
    overallScore,
    overallLight: scoreToLight(overallScore),
    areas,
    criticalGaps,
    documentPack: buildDocumentPack(data),
    disclaimer: INSPECTION_DISCLAIMER,
  };
}

// ─── Defaults para snapshot vacío ────────────────────────────────────────────

export function createEmptySnapshot(): CompanyDataSnapshot {
  return {
    employeeCount: 0, hasTimeClockSystem: false, timeClockRecordCount: 0,
    timeClockExportReady: false, contractCount: 0, contractsWithModality: 0,
    tempContractsWithCause: 0, totalTempContracts: 0, hasPRLEvaluation: false,
    hasPRLPlanning: false, hasPRLTraining: false, hasMedicalSurveillance: false,
    hasSPA: false, hasEqualityPlan: false, equalityDiagnosisComplete: false,
    hasSalaryAudit: false, equalityNegotiated: false, equalityRegistered: false,
    lismiQuotaMet: false, lismiAlternatives: false, lismiCertificatesArchived: false,
    hasWhistleblowerChannel: false, whistleblowerResponsible: false,
    whistleblowerConfidentiality: false, whistleblowerResponseTime: false,
    payslipsDelivered: false, hasTC2: false, hasCalendar: false,
    hasIRPFCertificates: false, ssAffiliationsCommunicated: false,
    rltInformed: false, copiaBasicaDelivered: false, sepeContractsCommunicated: false,
  };
}
