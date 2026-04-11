/**
 * S9 Compliance & Quality — Shared Types
 * Tipos canónicos para los módulos de cumplimiento legal S9
 */

// ─── Module Readiness ────────────────────────────────────────

export type S9ModuleReadiness =
  | 'ready'
  | 'internal_ready'
  | 'preparatory'
  | 'pending_external'
  | 'partial_controlled';

export interface S9DomainDescriptor {
  id: string;
  name: string;
  readiness: S9ModuleReadiness;
  legalBasis: string;
  existingAssets: string[];
  requiredNewAssets: string[];
  regressionRisk: 'none' | 'low' | 'medium';
}

// ─── LISMI / LGD ─────────────────────────────────────────────

export interface LISMIQuotaResult {
  totalEmployees: number;
  disabledEmployees: number;
  currentRatio: number;
  requiredRatio: number;
  isCompliant: boolean;
  deficit: number;
  thresholdApplies: boolean; // false if <50 employees
  alerts: LISMIAlert[];
}

export interface LISMIAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  legalRef?: string;
}

export type AlternativeMeasureType =
  | 'donation'
  | 'sponsorship'
  | 'service_contract'
  | 'enclave_laboral';

export interface AlternativeMeasure {
  id: string;
  type: AlternativeMeasureType;
  description: string;
  amount?: number;
  evidenceDocumentId?: string;
  validFrom?: string;
  validUntil?: string;
}

// ─── Salary Register (RD 902/2020) ───────────────────────────

export interface SalaryRegisterEntry {
  groupOrCategory: string;
  concept: string;
  maleCount: number;
  femaleCount: number;
  maleMean: number;
  femaleMean: number;
  maleMedian: number;
  femaleMedian: number;
  gapPercent: number;
  hasSignificantGap: boolean;
}

export interface SalaryRegisterReport {
  period: string;
  generatedAt: string;
  entries: SalaryRegisterEntry[];
  globalGap: number;
  alerts: SalaryRegisterAlert[];
  version: number;
}

export interface SalaryRegisterAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  group?: string;
  concept?: string;
  gapPercent?: number;
}

// ─── Digital Disconnection ───────────────────────────────────

export interface DisconnectionViolation {
  employeeId: string;
  employeeName?: string;
  date: string;
  startTime: string;
  endTime: string;
  minutesOutside: number;
  policyId: string;
}

export interface DisconnectionMetrics {
  totalViolations: number;
  employeesAffected: number;
  averageMinutesOutside: number;
  worstDay: string | null;
  complianceRate: number;
}

// ─── Remote Work (Ley 10/2021) ───────────────────────────────

/** 13 mandatory points per Ley 10/2021 Art. 7 */
export const REMOTE_WORK_MANDATORY_POINTS = [
  'equipment_inventory',
  'expense_list',
  'work_schedule',
  'availability_hours',
  'workplace_percentage',
  'work_center_reference',
  'work_location',
  'duration_and_notice',
  'reversibility_terms',
  'performance_monitoring',
  'disconnection_protocol',
  'data_protection',
  'risk_prevention',
] as const;

export type RemoteWorkMandatoryPoint = (typeof REMOTE_WORK_MANDATORY_POINTS)[number];

export interface RemoteWorkValidation {
  isComplete: boolean;
  completedPoints: RemoteWorkMandatoryPoint[];
  missingPoints: RemoteWorkMandatoryPoint[];
  completionPercent: number;
}

export interface RemoteWorkAgreement {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  agreementDate: string;
  startDate: string;
  endDate?: string;
  status: 'draft' | 'active' | 'suspended' | 'terminated';
  remotePercentage: number;
  workLocation: Record<string, unknown>;
  equipmentInventory: Array<Record<string, unknown>>;
  expenseCompensation: Record<string, unknown>;
  scheduleDetails: Record<string, unknown>;
  disconnectionPolicyId?: string;
  agreementContent: Record<string, unknown>;
  signedAt?: string;
  signedBy?: string;
  validation?: RemoteWorkValidation;
}

// ─── VPT (Valoración de Puestos de Trabajo) ─────────────────

export type VPTFactor = 'qualifications' | 'responsibility' | 'effort' | 'conditions';

export type VPTSubfactor =
  | 'formal_education'
  | 'experience'
  | 'certifications'
  | 'people_decisions'
  | 'economic_decisions'
  | 'organizational_impact'
  | 'intellectual_complexity'
  | 'physical_effort'
  | 'emotional_load'
  | 'hardship_danger'
  | 'atypical_schedules'
  | 'availability_travel';

export interface VPTSubfactorWeight {
  subfactor: VPTSubfactor;
  weight: number; // 0-1 within factor
}

export interface VPTFactorConfig {
  factor: VPTFactor;
  weight: number; // 0-1, all factors sum to 1
  subfactors: VPTSubfactorWeight[];
}

export type VPTMethodology = VPTFactorConfig[];

export type VPTFactorScores = Record<VPTFactor, Record<string, number>>; // subfactor → 1-5

/**
 * Status aligned with useHRVersionRegistry semantics:
 * draft → review → approved → closed → superseded
 * 'approved' = the single active/vigente valuation (enforced by unique partial index)
 */
export type VPTValuationStatus = 'draft' | 'review' | 'approved' | 'closed' | 'superseded';

export interface VPTValuation {
  id: string;
  companyId: string;
  positionId: string;
  positionName?: string;
  versionId?: string;
  status: VPTValuationStatus;
  methodologyVersion: string;
  methodologySnapshot: VPTMethodology;
  factorScores: VPTFactorScores;
  totalScore: number;
  equivalentBandMin?: number;
  equivalentBandMax?: number;
  notes?: string;
  scoredBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  aiSuggestions?: VPTFactorScores;
  createdAt: string;
  updatedAt: string;
}

export interface VPTIncoherence {
  type: 'score_vs_band' | 'level_divergence' | 'similar_positions';
  level: 'warning' | 'critical';
  message: string;
  positionIds: string[];
  details: Record<string, unknown>;
}

export interface VPTScoreBreakdown {
  factorScores: Record<VPTFactor, number>; // 0-100 per factor
  totalScore: number; // 0-100
}

export interface VPTComparison {
  positionId: string;
  positionName: string;
  totalScore: number;
  factorScores: Record<VPTFactor, number>;
  salaryBandMax?: number;
  jobLevel?: string;
}

export interface VPTBandSuggestion {
  suggestedMin: number;
  suggestedMax: number;
  basis: string;
}
