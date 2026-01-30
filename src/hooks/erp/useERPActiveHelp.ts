/**
 * useERPActiveHelp - Hook para Ayuda Activa Contextual
 * Analiza asientos en tiempo real y emite alertas/sugerencias
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HelpBubble {
  id: string;
  type: 'warning' | 'error' | 'suggestion' | 'info';
  title: string;
  message: string;
  recommendation?: string;
  position?: { x: number; y: number };
  accountCode?: string;
  dismissed: boolean;
  createdAt: Date;
}

export interface JournalEntryContext {
  description: string;
  lines: Array<{
    account_code: string;
    account_name?: string;
    debit: number;
    credit: number;
  }>;
  date?: string;
  jurisdiction?: string;
}

export interface ActiveHelpConfig {
  enabled: boolean;
  autoAnalyze: boolean;
  useLocalAI: boolean; // true = local, false = external
  showBubbles: boolean;
  voiceAlerts: boolean;
  analysisDebounceMs: number;
}

export function useERPActiveHelp(companyId?: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bubbles, setBubbles] = useState<HelpBubble[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<{
    result: string;
    issues: string[];
    suggestions: string[];
  } | null>(null);
  const [config, setConfig] = useState<ActiveHelpConfig>({
    enabled: true,
    autoAnalyze: true,
    useLocalAI: true,
    showBubbles: true,
    voiceAlerts: false,
    analysisDebounceMs: 1500
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique bubble ID
  const generateBubbleId = () => `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add a help bubble
  const addBubble = useCallback((bubble: Omit<HelpBubble, 'id' | 'dismissed' | 'createdAt'>) => {
    const newBubble: HelpBubble = {
      ...bubble,
      id: generateBubbleId(),
      dismissed: false,
      createdAt: new Date()
    };

    setBubbles(prev => {
      // Remove duplicates based on title
      const filtered = prev.filter(b => b.title !== bubble.title);
      return [newBubble, ...filtered].slice(0, 5); // Max 5 bubbles
    });

    // Auto-dismiss after 15 seconds for info/suggestions
    if (bubble.type === 'info' || bubble.type === 'suggestion') {
      setTimeout(() => {
        dismissBubble(newBubble.id);
      }, 15000);
    }

    return newBubble;
  }, []);

  // Dismiss a bubble
  const dismissBubble = useCallback((bubbleId: string) => {
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
  }, []);

  // Clear all bubbles
  const clearBubbles = useCallback(() => {
    setBubbles([]);
  }, []);

  // Analyze journal entry in real-time
  const analyzeEntry = useCallback(async (entry: JournalEntryContext): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    correctedEntry?: JournalEntryContext;
  } | null> => {
    if (!config.enabled) return null;

    setIsAnalyzing(true);

    try {
      // Build analysis prompt
      const totalDebit = entry.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

      // Quick validation before AI
      const quickIssues: string[] = [];
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        quickIssues.push(`Asiento descuadrado: Debe (${totalDebit.toFixed(2)}€) ≠ Haber (${totalCredit.toFixed(2)}€)`);
      }

      if (entry.lines.length < 2) {
        quickIssues.push('Un asiento debe tener al menos 2 líneas (partida doble)');
      }

      entry.lines.forEach((line, idx) => {
        if (line.debit > 0 && line.credit > 0) {
          quickIssues.push(`Línea ${idx + 1}: No puede tener importe en Debe y Haber simultáneamente`);
        }
        if (line.debit === 0 && line.credit === 0) {
          quickIssues.push(`Línea ${idx + 1}: Debe tener un importe en Debe o Haber`);
        }
      });

      // Show quick issues as bubbles
      quickIssues.forEach(issue => {
        addBubble({
          type: 'error',
          title: 'Error de validación',
          message: issue,
          recommendation: 'Corrige el error antes de guardar'
        });
      });

      // AI-powered analysis for deeper insights
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'analyze_entry',
          company_id: companyId,
          entry,
          use_local_ai: config.useLocalAI
        }
      });

      if (error) throw error;

      const result = {
        isValid: quickIssues.length === 0 && !data?.has_issues,
        issues: [...quickIssues, ...(data?.issues || [])],
        suggestions: data?.suggestions || [],
        correctedEntry: data?.corrected_entry
      };

      setLastAnalysis({
        result: result.isValid ? 'Asiento correcto' : 'Se encontraron problemas',
        issues: result.issues,
        suggestions: result.suggestions
      });

      // Add suggestion bubbles
      result.suggestions.forEach(suggestion => {
        addBubble({
          type: 'suggestion',
          title: 'Sugerencia',
          message: suggestion,
          recommendation: 'Considera aplicar esta mejora'
        });
      });

      // Add issue bubbles from AI
      (data?.issues || []).forEach((issue: string) => {
        addBubble({
          type: 'warning',
          title: 'Posible error',
          message: issue
        });
      });

      return result;
    } catch (error) {
      console.error('[useERPActiveHelp] analyzeEntry error:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [config, companyId, addBubble]);

  // Debounced analysis for real-time typing
  const debouncedAnalyze = useCallback((entry: JournalEntryContext) => {
    if (!config.autoAnalyze) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      analyzeEntry(entry);
    }, config.analysisDebounceMs);
  }, [analyzeEntry, config.autoAnalyze, config.analysisDebounceMs]);

  // Search help - query for fiscal help
  const searchHelp = useCallback(async (
    query: string,
    options?: {
      useExternal?: boolean;
      jurisdiction?: string;
    }
  ): Promise<{
    answer: string;
    sources: string[];
    relatedTopics: string[];
  } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'help_query',
          query,
          use_external: options?.useExternal ?? !config.useLocalAI,
          jurisdiction: options?.jurisdiction
        }
      });

      if (error) throw error;

      return {
        answer: data?.answer || 'No se encontró respuesta',
        sources: data?.sources || [],
        relatedTopics: data?.related_topics || []
      };
    } catch (error) {
      console.error('[useERPActiveHelp] searchHelp error:', error);
      toast.error('Error al buscar ayuda');
      return null;
    }
  }, [config.useLocalAI]);

  // Get contextual help for account
  const getAccountHelp = useCallback(async (accountCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-ai-agent', {
        body: {
          action: 'account_help',
          account_code: accountCode
        }
      });

      if (error) throw error;

      if (data?.help) {
        addBubble({
          type: 'info',
          title: `Cuenta ${accountCode}`,
          message: data.help.description || '',
          recommendation: data.help.usage_notes,
          accountCode
        });
      }

      return data?.help || null;
    } catch (error) {
      console.error('[useERPActiveHelp] getAccountHelp error:', error);
      return null;
    }
  }, [addBubble]);

  // Update config
  const updateConfig = useCallback((updates: Partial<ActiveHelpConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    isAnalyzing,
    bubbles,
    lastAnalysis,
    config,
    // Actions
    analyzeEntry,
    debouncedAnalyze,
    searchHelp,
    getAccountHelp,
    addBubble,
    dismissBubble,
    clearBubbles,
    updateConfig
  };
}

export default useERPActiveHelp;
