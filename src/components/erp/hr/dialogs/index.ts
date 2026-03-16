/**
 * HR Dialogs - Barrel exports
 * V2-RRHH-FASE-1: Consolidated dialog registry
 * 
 * Dialogs in this folder are already properly organized.
 * Root-level dialogs (HR*Dialog.tsx in parent) will migrate here incrementally.
 */

// ── Recruitment & Talent ──
export { HREmailCandidateDialog } from './HREmailCandidateDialog';
export { HRInterviewScheduleDialog } from './HRInterviewScheduleDialog';
export { HROnboardingStartDialog } from './HROnboardingStartDialog';
export { HRTerminationAnalysisDialog } from './HRTerminationAnalysisDialog';
export { HRFlightRiskActionDialog } from './HRFlightRiskActionDialog';

// ── Training & Development ──
export { HRTrainingPlanDialog } from './HRTrainingPlanDialog';
export { HRTrainingEnrollDialog } from './HRTrainingEnrollDialog';
export { HRTrainingCatalogDialog } from './HRTrainingCatalogDialog';
export { HRCompetencyFormDialog } from './HRCompetencyFormDialog';
export { HRCertificationFormDialog } from './HRCertificationFormDialog';

// ── Performance & Engagement ──
export { HRENPSSurveyDialog } from './HRENPSSurveyDialog';
export { HRObjectiveFormDialog } from './HRObjectiveFormDialog';

// ── Compensation & Benefits ──
export { HRBonusConfigDialog } from './HRBonusConfigDialog';
export { HRBonusPolicyImportDialog } from './HRBonusPolicyImportDialog';
export { HRBenefitFormDialog } from './HRBenefitFormDialog';

// ── People & Organization ──
export { HREmployeeProfileDialog } from './HREmployeeProfileDialog';
export { HREmployeeDocumentsDialog } from './HREmployeeDocumentsDialog';
export { HREmployeeExportDialog } from './HREmployeeExportDialog';
export { HRDepartmentFormDialog } from './HRDepartmentFormDialog';

// ── Compliance & Safety ──
export { HRSafetyEvaluationDialog } from './HRSafetyEvaluationDialog';
export { HRSafetyTrainingDialog } from './HRSafetyTrainingDialog';
export { HREPIManagementDialog } from './HREPIManagementDialog';
export { HRLegalReviewDialog } from './HRLegalReviewDialog';

// ── Settlements & Payroll ──
export { HRSettlementDialog } from './HRSettlementDialog';
export { HRPayrollRecalculationDialog } from './HRPayrollRecalculationDialog';

// ── Leave & Attendance ──
export { HRVacationRejectDialog } from './HRVacationRejectDialog';

// ── Unions & Labor Relations ──
export { HRUnionMembershipDialog } from './HRUnionMembershipDialog';
export { HRElectionFormDialog } from './HRElectionFormDialog';
export { HRUnionCreditUsageDialog } from './HRUnionCreditUsageDialog';

// ── Social Security ──
export { SSCertificateRequestDialog } from './SSCertificateRequestDialog';
export { SSNewCommunicationDialog } from './SSNewCommunicationDialog';
export { SSSILTRASubmitDialog } from './SSSILTRASubmitDialog';

/**
 * NOTE: The following dialogs still live in the parent directory (root).
 * They will be migrated here in Sprint 2:
 * - HRPayrollEntryDialog
 * - HRVacationRequestDialog
 * - HRSeveranceCalculatorDialog
 * - HRIndemnizationCalculatorDialog
 * - HRContractFormDialog
 * - HRIncidentFormDialog
 * - HRDocumentGeneratorDialog
 * - HRDocumentUploadDialog
 * - HRBenefitEnrollmentDialog
 */
