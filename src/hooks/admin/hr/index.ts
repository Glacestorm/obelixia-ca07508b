/**
 * HR Hooks - Barrel Export
 * Módulo de Recursos Humanos Enterprise
 */

export { useHRIntegrationLog } from './useHRIntegrationLog';
export type {
  IntegrationType,
  IntegrationStatus,
  IntegrationLogEntry,
  IntegrationMetrics,
  CreateLogParams
} from './useHRIntegrationLog';

// Phase 1 - Legal Compliance Hooks
export { useHRWhistleblower } from './useHRWhistleblower';
export type { 
  WhistleblowerStatus, 
  WhistleblowerCategory, 
  WhistleblowerReport,
  ReportSubmission 
} from './useHRWhistleblower';

export { useHREquality } from './useHREquality';
export type { 
  EqualityPlanStatus, 
  EqualityPlan, 
  SalaryAudit, 
  HarassmentProtocol 
} from './useHREquality';

export { useHRTimeTracking } from './useHRTimeTracking';
export type { 
  EntryType, 
  EntrySource, 
  TimeEntry, 
  TimePolicy, 
  DisconnectionPolicy 
} from './useHRTimeTracking';

// Phase 2 - Talent Management Hooks
export { useHRTalentSkills } from './useHRTalentSkills';
export type {
  SkillGap,
  SkillStrength,
  SkillsAnalysis,
  DevelopmentAction,
  DevelopmentRecommendation,
  DevelopmentPlan,
  OpportunityMatch,
  SuccessionCandidate,
  CareerPath
} from './useHRTalentSkills';

// Phase 3 - Employee Experience & Wellbeing Hooks
export { useHRWellbeing } from './useHRWellbeing';
export type {
  WellbeingScore,
  WellbeingFactor,
  BurnoutRisk,
  WellbeingRecommendation,
  Survey,
  SurveyQuestion,
  SurveyResults,
  WellnessProgram,
  ProgramRecommendations,
  BurnoutAnalysis,
  WellnessPlan
} from './useHRWellbeing';
