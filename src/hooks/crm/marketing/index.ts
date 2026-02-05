/**
 * CRM Marketing Hooks - Phase 1: Marketing Automation Suite
 * Barrel export for all marketing-related hooks
 */

export { useMarketingCampaigns } from './useMarketingCampaigns';
export type { 
  MarketingCampaign, 
  CampaignGoals, 
  CampaignMetrics, 
  CampaignSettings,
  CampaignFilters 
} from './useMarketingCampaigns';

export { useEmailSequences } from './useEmailSequences';
export type { 
  EmailSequence, 
  EmailSequenceStep, 
  SequenceCondition,
  SequenceAction,
  SequenceStats,
  SequenceEnrollment 
} from './useEmailSequences';

export { useAudienceSegments, SEGMENT_FIELDS } from './useAudienceSegments';
export type { 
  AudienceSegment, 
  SegmentCondition, 
  SegmentMember,
  SegmentField 
} from './useAudienceSegments';

export { useEmailTemplates, DEFAULT_VARIABLES } from './useEmailTemplates';
export type { 
  EmailTemplate, 
  TemplateVariable, 
  TemplateStats 
} from './useEmailTemplates';
