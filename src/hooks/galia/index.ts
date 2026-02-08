/**
 * GALIA Module Hooks - Barrel Export
 * Gestión de Ayudas LEADER con Inteligencia Artificial
 */

export { useGaliaConvocatorias } from './useGaliaConvocatorias';
export type { GaliaConvocatoria, GaliaConvocatoriaFilters } from './useGaliaConvocatorias';

export { useGaliaExpedientes } from './useGaliaExpedientes';
export type { GaliaExpediente, GaliaExpedienteFilters } from './useGaliaExpedientes';

export { useGaliaAsistenteIA } from './useGaliaAsistenteIA';
export type { GaliaMessage, GaliaConversation } from './useGaliaAsistenteIA';

export { useGaliaAnalytics } from './useGaliaAnalytics';
export type { GaliaKPIs, GaliaAnalyticsData } from './useGaliaAnalytics';

export { useGaliaDocumentos } from './useGaliaDocumentos';
export type { GaliaDocumento, DocumentoFilters } from './useGaliaDocumentos';

export { useGaliaAnalisisCostes } from './useGaliaAnalisisCostes';
export type { GaliaAnalisisCoste, AnalisisCostesResult } from './useGaliaAnalisisCostes';

export { useGaliaNotificaciones } from './useGaliaNotificaciones';
export type { GaliaNotificacion } from './useGaliaNotificaciones';

export { useGaliaAIAnalysis } from './useGaliaAIAnalysis';
export type { 
  RiskAnalysisResult, 
  SmartAssignmentResult, 
  DeadlinePredictionResult,
  ProactiveAlert,
  ProactiveAlertsResult,
  FullAnalysisResult,
  TecnicoData 
} from './useGaliaAIAnalysis';

export { useGaliaImpactPredictor } from './useGaliaImpactPredictor';
export type { 
  ProjectData,
  ImpactPrediction,
  ViabilityAnalysis,
  EmploymentEstimate
} from './useGaliaImpactPredictor';

export { useGaliaReporting } from './useGaliaReporting';
export type { 
  ReportPeriodo,
  MemoriaAnual,
  InformeFEDER,
  CuadroMando,
  InformeSeguimiento
} from './useGaliaReporting';

export { useGaliaTransparency } from './useGaliaTransparency';
export type { 
  PublicData,
  DecisionExplanation,
  AuditTrail,
  PublicReport
} from './useGaliaTransparency';

export { useGaliaAutoApproval } from './useGaliaAutoApproval';
export type { 
  EligibilityResult,
  PreApprovalResult,
  PendingApproval
} from './useGaliaAutoApproval';

export { useGaliaProactiveAssistant } from './useGaliaProactiveAssistant';
export type { 
  Deadline,
  Alert,
  DigestResult,
  RegulatoryChange,
  DeadlinesResult,
  MissingDocsResult,
  RegulatoryChangesResult,
  AlertsResult,
  MissingDocument
} from './useGaliaProactiveAssistant';

export { useGaliaBDNS } from './useGaliaBDNS';
export type { 
  BDNSConvocatoria,
  BDNSSyncResult,
  BDNSBeneficiarioValidation
} from './useGaliaBDNS';

export { useGaliaTranslations, GALIA_TRANSLATIONS } from './useGaliaTranslations';

// === PHASE 5 - EXPANSION ===
export { useGaliaClaveAuth } from './useGaliaClaveAuth';
export type { ClaveUserData, ClaveSession } from './useGaliaClaveAuth';

export { useGaliaFederation } from './useGaliaFederation';
export type { 
  FederationKPIs, 
  RegionalData, 
  NationalDashboard, 
  ComparisonResult 
} from './useGaliaFederation';

export { useGaliaGamification } from './useGaliaGamification';
export type { 
  Achievement,
  UserStats, 
  LeaderboardEntry, 
  Challenge,
  PointsResult,
  ActivityType
} from './useGaliaGamification';

export { useGaliaPerformance, useGaliaLazyLoad } from './useGaliaPerformance';

// === PHASE 6 - INNOVATION ===
export { useGaliaEUDIWallet } from './useGaliaEUDIWallet';
export type { PresentationRequest, VerificationResult, RevocationStatus, CredentialType } from './useGaliaEUDIWallet';

export { useGaliaMultimodalAI } from './useGaliaMultimodalAI';
export type { DocumentAnalysisResult, TranscriptionResult, VoiceAssistantResponse, StructuredData } from './useGaliaMultimodalAI';

export { useGaliaBlockchainAudit } from './useGaliaBlockchainAudit';
export type { AuditBlock, AuditTrailResult, ProofResult, AnchorResult, DecisionType } from './useGaliaBlockchainAudit';

export { useGaliaPublicAPI } from './useGaliaPublicAPI';
export type { Convocatoria, ExpedienteStatus, EligibilityCheck, GlobalStats } from './useGaliaPublicAPI';

// === PHASE 7 - EXCELENCIA OPERACIONAL ===
export { useGaliaSmartAudit } from './useGaliaSmartAudit';
export type { 
  AuditFinding, 
  AuditReport, 
  AnomalyPattern, 
  SmartAuditStats 
} from './useGaliaSmartAudit';

export { useGaliaCompliancePredictor } from './useGaliaCompliancePredictor';
export type { 
  ComplianceRisk, 
  ComplianceForecast, 
  PreventiveAction, 
  ComplianceTrend 
} from './useGaliaCompliancePredictor';

export { useGaliaEarlyWarning } from './useGaliaEarlyWarning';
export type { 
  EarlyWarning, 
  WarningThreshold, 
  WarningStats, 
  SignalPattern 
} from './useGaliaEarlyWarning';

export { useGaliaExecutiveDashboard } from './useGaliaExecutiveDashboard';
export type { 
  ExecutiveKPI, 
  StrategicInsight, 
  PerformanceMetrics, 
  ComparativeAnalysis, 
  ExecutiveReport, 
  DashboardConfig 
} from './useGaliaExecutiveDashboard';
