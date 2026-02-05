/**
 * CRM Hooks - Barrel export
 */

export { CRMProvider, useCRMContext } from './useCRMContext';
export { useCRMRoles } from './useCRMRoles';
export { useCRMTeams } from './useCRMTeams';
export { useCRMContacts } from './useCRMContacts';
export { useCRMDeals, DEAL_STAGES } from './useCRMDeals';
export type { CRMDeal, DealStage } from './useCRMDeals';
export { useCRMActivities, ACTIVITY_TYPES } from './useCRMActivities';
export type { CRMActivity, ActivityType } from './useCRMActivities';

// Marketing Automation (Phase 1)
export * from './marketing';

// Workflow Builder (Phase 2)
export * from './workflows';

// Agents
export * from './agents';

// Lead Scoring & AI Insights (Phase 3)
export * from './scoring';
