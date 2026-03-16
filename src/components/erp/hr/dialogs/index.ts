/**
 * HR Dialogs - Barrel exports
 * V2-RRHH-FASE-1 Sprint 2: Consolidated dialog registry by domain
 * 
 * All dialogs are re-exported here for backward compatibility.
 * New code should import from domain barrels instead:
 *   import { HRContractFormDialog } from '@/components/erp/hr/domains/contracts';
 *   import { HRPayrollEntryDialog } from '@/components/erp/hr/domains/payroll';
 */

// ── Recruitment & Talent (D10) ──
export { HREmailCandidateDialog } from './HREmailCandidateDialog';
export { HRInterviewScheduleDialog } from './HRInterviewScheduleDialog';
export { HROnboardingStartDialog } from './HROnboardingStartDialog';
export { HRTerminationAnalysisDialog } from './HRTerminationAnalysisDialog';
export { HRFlightRiskActionDialog } from './HRFlightRiskActionDialog';

// ── Training & Development (D10) ──
export { HRTrainingPlanDialog } from './HRTrainingPlanDialog';
export { HRTrainingEnrollDialog } from './HRTrainingEnrollDialog';
export { HRTrainingCatalogDialog } from './HRTrainingCatalogDialog';
export { HRCompetencyFormDialog } from './HRCompetencyFormDialog';
export { HRCertificationFormDialog } from './HRCertificationFormDialog';

// ── Performance & Engagement (D10) ──
export { HRENPSSurveyDialog } from './HRENPSSurveyDialog';
export { HRObjectiveFormDialog } from './HRObjectiveFormDialog';

// ── Compensation & Benefits (D3/D1) ──
export { HRBonusConfigDialog } from './HRBonusConfigDialog';
export { HRBonusPolicyImportDialog } from './HRBonusPolicyImportDialog';
export { HRBenefitFormDialog } from './HRBenefitFormDialog';

// ── People & Organization (D1) ──
export { HREmployeeProfileDialog } from './HREmployeeProfileDialog';
export { HREmployeeDocumentsDialog } from './HREmployeeDocumentsDialog';
export { HREmployeeExportDialog } from './HREmployeeExportDialog';
export { HRDepartmentFormDialog } from './HRDepartmentFormDialog';

// ── Compliance & Safety (D5) ──
export { HRSafetyEvaluationDialog } from './HRSafetyEvaluationDialog';
export { HRSafetyTrainingDialog } from './HRSafetyTrainingDialog';
export { HREPIManagementDialog } from './HREPIManagementDialog';
export { HRLegalReviewDialog } from './HRLegalReviewDialog';

// ── Settlements & Payroll (D2/D3) ──
export { HRSettlementDialog } from './HRSettlementDialog';
export { HRPayrollRecalculationDialog } from './HRPayrollRecalculationDialog';

// ── Leave & Attendance (D8) ──
export { HRVacationRejectDialog } from './HRVacationRejectDialog';

// ── Unions & Labor Relations (D5) ──
export { HRUnionMembershipDialog } from './HRUnionMembershipDialog';
export { HRElectionFormDialog } from './HRElectionFormDialog';
export { HRUnionCreditUsageDialog } from './HRUnionCreditUsageDialog';

// ── Social Security (D4) ──
export { SSCertificateRequestDialog } from './SSCertificateRequestDialog';
export { SSNewCommunicationDialog } from './SSNewCommunicationDialog';
export { SSSILTRASubmitDialog } from './SSSILTRASubmitDialog';

/**
 * ROOT-LEVEL DIALOGS — Already re-exported via domain barrels:
 * - HRPayrollEntryDialog      → domains/payroll
 * - HRVacationRequestDialog   → domains/workflows
 * - HRSeveranceCalculatorDialog → domains/contracts
 * - HRIndemnizationCalculatorDialog → domains/contracts
 * - HRContractFormDialog      → domains/contracts
 * - HRIncidentFormDialog      → domains/workflows
 * - HRDocumentGeneratorDialog → domains/documents
 * - HRDocumentUploadDialog    → domains/documents
 * - HRBenefitEnrollmentDialog → domains/people
 * - HREmployeeFormDialog      → domains/people
 */