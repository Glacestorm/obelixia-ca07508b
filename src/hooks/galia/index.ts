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
