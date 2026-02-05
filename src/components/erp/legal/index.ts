/**
 * Módulo Jurídico ERP - Barrel exports
 * Sistema completo de gestión jurídica multi-jurisdiccional
 */

export { LegalModule } from './LegalModule';
export { LegalNavigationMenu } from './LegalNavigationMenu';
export { LegalExecutiveDashboard } from './LegalExecutiveDashboard';
export { LegalAdvisorPanel } from './LegalAdvisorPanel';
export { LegalCompliancePanel } from './LegalCompliancePanel';
export { LegalDocumentsPanel } from './LegalDocumentsPanel';
export { LegalKnowledgePanel } from './LegalKnowledgePanel';
export { LegalAgentActivityPanel } from './LegalAgentActivityPanel';
export { LegalContractAnalysisPanel } from './LegalContractAnalysisPanel';
export { LegalRiskAssessmentPanel } from './LegalRiskAssessmentPanel';
export { LegalNewsPanel } from './LegalNewsPanel';
export { LegalTrends2026Panel } from './LegalTrends2026Panel';

// Fase 7: Base de Conocimiento Jurídico
export { LegalKnowledgeUploader } from './LegalKnowledgeUploader';
export { LegalRegulationAlertsPanel } from './LegalRegulationAlertsPanel';
export { LegalEssentialKnowledgeLoader } from './LegalEssentialKnowledgeLoader';
export { LegalKnowledgeSyncConfig } from './LegalKnowledgeSyncConfig';
export { LegalKnowledgeExportPanel } from './LegalKnowledgeExportPanel';

// Fase 8: Sistema de Alertas Regulatorias
export { LegalBulletinMonitorPanel } from './LegalBulletinMonitorPanel';
export { LegalChangeDetectorPanel } from './LegalChangeDetectorPanel';
export { LegalNotificationsPanel } from './LegalNotificationsPanel';
export { LegalEnforcementTimelinePanel } from './LegalEnforcementTimelinePanel';
export { LegalAdaptationPlanPanel } from './LegalAdaptationPlanPanel';

// Fase 9: Reportes y Auditoría Legal
export { LegalDueDiligencePanel } from './LegalDueDiligencePanel';
export { LegalAuditTrailPanel } from './LegalAuditTrailPanel';
export { LegalComplianceReportPanel } from './LegalComplianceReportPanel';
export { LegalRiskReportPanel } from './LegalRiskReportPanel';
export { LegalRegulationImpactPanel } from './LegalRegulationImpactPanel';

// Fase 10: Validación Legal Cross-Module y Gateway
export { LegalValidationGatewayPanel } from './LegalValidationGatewayPanel';
export { LegalAgentSupervisorPanel } from './LegalAgentSupervisorPanel';
export { LegalComplianceAPIPanel } from './LegalComplianceAPIPanel';

// Fase 8 (Plan): Legal Entity & IP Management
export * from './entity';

// Fase 9: AI Autonomous Agents & Predictive Legal Analytics
export * from './analytics';

// Fase 10: Legal Validation Gateway Enhanced & Cross-Module Orchestration
export * from './gateway';
