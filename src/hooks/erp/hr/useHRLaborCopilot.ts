/**
 * useHRLaborCopilot — V2-RRHH-FASE-7
 * Hook for the contextual HR labor copilot.
 *
 * Connects:
 *  - useControlTower (scored companies, summary, enriched signals)
 *  - useAdvisoryPortfolio (portfolio summary)
 *  - copilotContextEngine (context serialization)
 *
 * Sends context + question to hr-labor-copilot edge function.
 * Manages conversation history and loading state.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useControlTower } from './useControlTower';
import {
  buildCopilotContext,
  GUIDED_PROMPTS,
  type CopilotFullContext,
  type GuidedPrompt,
} from '@/engines/erp/hr/copilotContextEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  promptId?: string; // links to guided prompt if used
}

export interface UseHRLaborCopilotReturn {
  // Chat
  messages: CopilotMessage[];
  isLoading: boolean;
  error: string | null;
  // Actions
  sendMessage: (question: string, promptId?: string) => Promise<void>;
  clearConversation: () => void;
  // Context
  focusedCompanyId: string | null;
  setFocusedCompanyId: (id: string | null) => void;
  guidedPrompts: GuidedPrompt[];
  availableCompanies: Array<{ id: string; name: string; severity: string; score: number }>;
  // Control Tower passthrough
  isControlTowerLoading: boolean;
  portfolioSize: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useHRLaborCopilot(): UseHRLaborCopilotReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedCompanyId, setFocusedCompanyId] = useState<string | null>(null);
  const messageIdCounter = useRef(0);

  // Connect to Control Tower for real signals
  const {
    scoredCompanies,
    summary,
    isLoading: isControlTowerLoading,
  } = useControlTower();

  // Build available companies list for selector
  const availableCompanies = scoredCompanies.map(c => ({
    id: c.companyId,
    name: c.companyName,
    severity: c.severity,
    score: c.score,
  }));

  // Filter guided prompts based on whether a company is focused
  const guidedPrompts = GUIDED_PROMPTS.filter(p =>
    focusedCompanyId ? true : !p.requiresFocusedCompany
  );

  const sendMessage = useCallback(async (question: string, promptId?: string) => {
    if (!question.trim() || isLoading) return;

    setError(null);
    const userMsgId = `msg-${++messageIdCounter.current}`;
    const userMessage: CopilotMessage = {
      id: userMsgId,
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
      promptId,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build context from real Control Tower data
      const context = buildCopilotContext(
        scoredCompanies,
        summary,
        null, // portfolioSummary is embedded in summary
        focusedCompanyId,
        15,
      );

      // Build conversation history for AI continuity
      const conversationHistory = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error: fnError } = await supabase.functions.invoke(
        'hr-labor-copilot',
        {
          body: {
            question: question.trim(),
            context,
            conversationHistory,
          },
        },
      );

      if (fnError) throw fnError;

      if (data?.success && data?.response) {
        const assistantMsgId = `msg-${++messageIdCounter.current}`;
        const assistantMessage: CopilotMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data?.message || data?.error || 'Respuesta vacía del copiloto');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar el copiloto';
      setError(message);
      // Add error as assistant message
      const errMsgId = `msg-${++messageIdCounter.current}`;
      setMessages(prev => [...prev, {
        id: errMsgId,
        role: 'assistant',
        content: `⚠️ ${message}. Inténtalo de nuevo en unos segundos.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, scoredCompanies, summary, focusedCompanyId, messages]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    focusedCompanyId,
    setFocusedCompanyId,
    guidedPrompts,
    availableCompanies,
    isControlTowerLoading,
    portfolioSize: scoredCompanies.length,
  };
}
