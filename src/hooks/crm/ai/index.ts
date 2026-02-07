/**
 * CRM AI Hooks - Phase 7: Advanced Generative AI
 */

export { useCRMVoiceAssistant } from './useCRMVoiceAssistant';
export type { VoiceCommand, CRMContext } from './useCRMVoiceAssistant';

export { usePredictivePipeline } from './usePredictivePipeline';
export type { 
  DealPrediction, 
  QuarterForecast, 
  PipelineInsight, 
  PipelineHealth 
} from './usePredictivePipeline';

export { useRealtimeCollaboration } from './useRealtimeCollaboration';
export type { 
  Collaborator, 
  ActivityItem, 
  ChatMessage, 
  CollaborationState 
} from './useRealtimeCollaboration';
