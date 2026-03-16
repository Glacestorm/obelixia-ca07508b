/**
 * useHRLaborCopilot — V2-RRHH-FASE-7 + 7B Hardening
 * Hook for the contextual HR labor copilot.
 *
 * 7B additions:
 *  - SSE streaming for real-time token rendering
 *  - Client-side prompt injection detection
 *  - Enriched context with granular detail for focused company
 *
 * Connects:
 *  - useControlTower (scored companies, summary, enriched signals)
 *  - copilotContextEngine (context serialization + sanitization)
 *
 * Sends context + question to hr-labor-copilot edge function (streaming).
 * Manages conversation history and loading state.
 */

import { useState, useCallback, useRef } from 'react';
import { useControlTower } from './useControlTower';
import {
  buildCopilotContext,
  sanitizeUserQuestion,
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
  isStreaming?: boolean;
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

// ─── SSE Stream Parser ──────────────────────────────────────────────────────

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-labor-copilot`;

async function streamCopilotChat({
  question,
  context,
  conversationHistory,
  onDelta,
  onDone,
  onError,
}: {
  question: string;
  context: CopilotFullContext;
  conversationHistory: Array<{ role: string; content: string }>;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ question, context, conversationHistory }),
  });

  // Handle non-streaming error responses
  if (!resp.ok) {
    let errorMsg = 'Error del copiloto';
    try {
      const errData = await resp.json();
      errorMsg = errData.message || errData.error || errorMsg;
    } catch {
      // ignore parse error
    }
    onError(errorMsg);
    return;
  }

  // Check content type — if JSON, it's a guardrail/non-stream response
  const contentType = resp.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await resp.json();
      if (data.response) {
        onDelta(data.response);
      } else if (data.error) {
        onError(data.message || data.error);
        return;
      }
    } catch {
      onError('Error al procesar respuesta');
      return;
    }
    onDone();
    return;
  }

  // SSE streaming
  if (!resp.body) {
    onError('Sin respuesta del servidor');
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        // Incomplete JSON — put back and wait
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
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

    // 7B: Client-side prompt injection check
    const { sanitized, injectionDetected } = sanitizeUserQuestion(question);

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

    if (injectionDetected) {
      const errMsgId = `msg-${++messageIdCounter.current}`;
      setMessages(prev => [...prev, {
        id: errMsgId,
        role: 'assistant',
        content: '⚠️ Tu pregunta contiene un patrón no permitido. Por favor, reformula tu consulta sobre gestión laboral.',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
      return;
    }

    try {
      // Build context from real Control Tower data
      const context = buildCopilotContext(
        scoredCompanies,
        summary,
        null,
        focusedCompanyId,
        15,
      );

      // Build conversation history for AI continuity
      const conversationHistory = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Create streaming assistant message
      const assistantMsgId = `msg-${++messageIdCounter.current}`;
      let assistantContent = '';

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }]);

      await streamCopilotChat({
        question: sanitized,
        context,
        conversationHistory,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: assistantContent }
                : m
            )
          );
        },
        onDone: () => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, isStreaming: false }
                : m
            )
          );
        },
        onError: (errMsg) => {
          setError(errMsg);
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: `⚠️ ${errMsg}. Inténtalo de nuevo.`, isStreaming: false }
                : m
            )
          );
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar el copiloto';
      setError(message);
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
