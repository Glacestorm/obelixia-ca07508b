// Types for Agent Help System - Anti-Recursion Architecture

export interface AgentHelpSection {
  id: string;
  title: string;
  content: string;
  subsections?: AgentHelpSection[];
  orderIndex: number;
  icon?: string;
}

export interface AgentExample {
  id: string;
  title: string;
  description: string;
  input: string;
  output: string;
  context?: Record<string, unknown>;
  tags?: string[];
}

export interface AgentKnowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  source: 'user_feedback' | 'chat_interaction' | 'manual' | 'system';
  confidence: number;
  usageCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AgentTip {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface AgentHelpConfig {
  agentId: string;
  agentType: 'erp' | 'crm' | 'supervisor' | 'domain';
  name: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  color: string;
  sections: AgentHelpSection[];
  examples: AgentExample[];
  tips: AgentTip[];
  capabilities: string[];
  bestPractices: string[];
  limitations?: string[];
  relatedAgents?: string[];
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isVoice?: boolean;
  audioUrl?: string;
  feedback?: 'positive' | 'negative' | null;
}

export interface AgentChatSession {
  id: string;
  agentId: string;
  agentType: string;
  messages: AgentChatMessage[];
  startedAt: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentLearningItem {
  id: string;
  agentId: string;
  knowledgeType: 'example' | 'tip' | 'correction' | 'new_capability' | 'user_insight';
  content: string;
  source: string;
  processed: boolean;
  createdAt: string;
}

export interface AgentHelpState {
  isLoading: boolean;
  error: string | null;
  activeSection: string | null;
  isChatOpen: boolean;
  isVoiceEnabled: boolean;
  learnedKnowledge: AgentKnowledge[];
  chatSession: AgentChatSession | null;
}

// Anti-recursion guards
export interface RecursionGuard {
  isInitialized: boolean;
  isFetching: boolean;
  lastFetchTime: number;
  fetchCount: number;
  maxFetchesPerMinute: number;
}

export const DEFAULT_RECURSION_GUARD: RecursionGuard = {
  isInitialized: false,
  isFetching: false,
  lastFetchTime: 0,
  fetchCount: 0,
  maxFetchesPerMinute: 10,
};

// Rate limiting constants
export const RATE_LIMIT = {
  MIN_FETCH_INTERVAL_MS: 1000,
  MAX_FETCHES_PER_MINUTE: 10,
  DEBOUNCE_MS: 500,
  BATCH_INTERVAL_MS: 60000,
  MAX_RENDER_PER_SECOND: 5,
} as const;
