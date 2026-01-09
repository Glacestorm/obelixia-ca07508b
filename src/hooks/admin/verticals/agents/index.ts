/**
 * Vertical AI Agents - Barrel Export
 * Phase 1 - Autonomous AI Agents per Vertical
 */

export { useVerticalAgent } from './useVerticalAgent';
export type {
  VerticalType,
  AgentMode,
  SessionStatus,
  TaskStatus,
  VerticalAgentSession,
  AgentMessage,
  AgentAction,
  AgentRecommendation,
  AgentAlert,
  AgentDecision,
  VerticalAgentTask,
  VerticalAgentConfig,
} from './useVerticalAgent';

export { useHealthcareAgent } from './useHealthcareAgent';
export type {
  TeleconsultParams,
  SymptomAnalysisParams,
  MedicationCheckParams,
  PatientMonitorParams,
  PrescriptionParams,
} from './useHealthcareAgent';

export { useAgricultureAgent } from './useAgricultureAgent';
export type {
  HarvestPredictionParams,
  IrrigationOptimizeParams,
  PestDetectionParams,
  PlantingPlanParams,
  TraceabilityParams,
} from './useAgricultureAgent';

export { useIndustrialAgent } from './useIndustrialAgent';
export type {
  MaintenancePredictionParams,
  OEEOptimizeParams,
  InventoryOptimizeParams,
  RouteOptimizeParams,
  EnergyMonitorParams,
} from './useIndustrialAgent';

export { useServicesAgent } from './useServicesAgent';
export type {
  CustomerInteractionParams,
  DynamicPricingParams,
  ChurnPredictionParams,
  ReservationParams,
  ReviewAnalysisParams,
} from './useServicesAgent';
