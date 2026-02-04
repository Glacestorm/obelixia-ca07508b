/**
 * Módulo RRHH - Barrel exports
 * Sistema completo de gestión de recursos humanos
 */

export { HRModule } from './HRModule';
export { HRDashboardPanel } from './HRDashboardPanel';
export { HRPayrollPanel } from './HRPayrollPanel';
export { HRVacationsPanel } from './HRVacationsPanel';
export { HRContractsPanel } from './HRContractsPanel';
export { HRDepartmentsPanel } from './HRDepartmentsPanel';
export { HRSafetyPanel } from './HRSafetyPanel';
export { HRAIAgentPanel } from './HRAIAgentPanel';
export { HRNewsPanel } from './HRNewsPanel';
export { HRKnowledgeUploader } from './HRKnowledgeUploader';
export { HRHelpPanel } from './HRHelpPanel';
export { HRTrends2026Panel } from './HRTrends2026Panel';
export { HRNavigationMenu } from './HRNavigationMenu';

// Nuevos paneles - Fase 2
export { HRSocialSecurityPanel } from './HRSocialSecurityPanel';
export { HRUnionsPanel } from './HRUnionsPanel';
export { HREmployeeDocumentsPanel } from './HREmployeeDocumentsPanel';
export { HRDocumentUploadDialog } from './HRDocumentUploadDialog';
export { HRHelpIndex } from './HRHelpIndex';

// Fase 2 - Gestión avanzada
export { HREmployeesPanel } from './HREmployeesPanel';
export { HREmployeeFormDialog } from './HREmployeeFormDialog';
export { HRAlertsPanel } from './HRAlertsPanel';

// Dialogs operativos
export { HRPayrollEntryDialog } from './HRPayrollEntryDialog';
export { HRVacationRequestDialog } from './HRVacationRequestDialog';
export { HRSeveranceCalculatorDialog } from './HRSeveranceCalculatorDialog';
export { HRIndemnizationCalculatorDialog } from './HRIndemnizationCalculatorDialog';

// Fase 2+ - Nuevos dialogs operativos
export { HRContractFormDialog } from './HRContractFormDialog';
export { HRIncidentFormDialog } from './HRIncidentFormDialog';

// Fase 1 - Prestaciones Sociales
export { HRSocialBenefitsPanel } from './HRSocialBenefitsPanel';
export { HRBenefitEnrollmentDialog } from './HRBenefitEnrollmentDialog';

// Fase 3 - Modelos Contractuales por Jurisdicción
export { HRDocumentTemplatesPanel } from './HRDocumentTemplatesPanel';
export { HRDocumentGeneratorDialog } from './HRDocumentGeneratorDialog';

// Fase 4 - Panel de Control Ejecutivo
export { HRExecutiveDashboard } from './HRExecutiveDashboard';

// Fase 1 - Sistema Avanzado de Gestión de Talento
export { HRJobPositionsPanel } from './HRJobPositionsPanel';

// Fase 2 - Sistema de Reclutamiento Inteligente
export { HRRecruitmentPanel } from './HRRecruitmentPanel';

// Fase 3 - Proceso de Onboarding Adaptativo por CNAE
export { HROnboardingPanel } from './HROnboardingPanel';

// Fase 5 - Gestión de Salidas (Offboarding)
export { HROffboardingPanel } from './HROffboardingPanel';

// Fase 6 - Evaluación del Desempeño y Bonus
export { HRPerformancePanel } from './HRPerformancePanel';

// Fase 7 - Sistema de Formación y Desarrollo Profesional
export { HRTrainingPanel } from './HRTrainingPanel';

// Fase 8 - KPIs Predictivos Avanzados y Métricas Internacionales
export { HRAdvancedAnalyticsPanel } from './HRAdvancedAnalyticsPanel';

// Fase D - Dialogs adicionales para completar funcionalidades
export { HREmailCandidateDialog } from './dialogs/HREmailCandidateDialog';
export { HRInterviewScheduleDialog } from './dialogs/HRInterviewScheduleDialog';
export { HRTrainingPlanDialog } from './dialogs/HRTrainingPlanDialog';
export { HRTrainingEnrollDialog } from './dialogs/HRTrainingEnrollDialog';
export { HRENPSSurveyDialog } from './dialogs/HRENPSSurveyDialog';
export { HRFlightRiskActionDialog } from './dialogs/HRFlightRiskActionDialog';
export { HROnboardingStartDialog } from './dialogs/HROnboardingStartDialog';
export { HRBonusConfigDialog } from './dialogs/HRBonusConfigDialog';
export { HREmployeeProfileDialog } from './dialogs/HREmployeeProfileDialog';
export { HRTerminationAnalysisDialog } from './dialogs/HRTerminationAnalysisDialog';
export { HRCompetencyFormDialog } from './dialogs/HRCompetencyFormDialog';
export { HRTrainingCatalogDialog } from './dialogs/HRTrainingCatalogDialog';
export { HRSafetyEvaluationDialog } from './dialogs/HRSafetyEvaluationDialog';
export { HRSafetyTrainingDialog } from './dialogs/HRSafetyTrainingDialog';
export { HRSettlementDialog } from './dialogs/HRSettlementDialog';
export { HRVacationRejectDialog } from './dialogs/HRVacationRejectDialog';
export { HRLegalReviewDialog } from './dialogs/HRLegalReviewDialog';
export { HREmployeeDocumentsDialog } from './dialogs/HREmployeeDocumentsDialog';
export { HREmployeeExportDialog } from './dialogs/HREmployeeExportDialog';

// Fase: Sistema de Convenios Colectivos y Recálculo de Nóminas
export { HRCollectiveAgreementSelect } from './shared/HRCollectiveAgreementSelect';
export type { AgreementData } from './shared/HRCollectiveAgreementSelect';
export { HRPayrollRecalculationPanel } from './HRPayrollRecalculationPanel';
export { HRPayrollRecalculationDialog } from './dialogs/HRPayrollRecalculationDialog';
export { HRPayrollComplianceWidget } from './widgets/HRPayrollComplianceWidget';

// Fase: Sistema de Gestión de Finiquitos con Validación Multinivel
export { HRSettlementsPanel } from './HRSettlementsPanel';
export { HRSettlementComplianceWidget } from './widgets/HRSettlementComplianceWidget';

// Fase: Sistema de Vigilancia Normativa (Convenios, CNO, BOE/BOPA)
export { HRRegulatoryWatchPanel } from './HRRegulatoryWatchPanel';

// Fase: Sistema de Cumplimiento Legal y Comunicaciones Obligatorias
export * from './compliance';

// Fase: Integración RRHH ↔ Tesorería ↔ Contabilidad
export * from './integration';

// Fase 2: Gestión del Talento Avanzada
export * from './talent';

// Fase 3: Employee Experience & Wellbeing
export * from './wellbeing';

// Fase 4: Contract Lifecycle Management (CLM)
export * from './clm';
