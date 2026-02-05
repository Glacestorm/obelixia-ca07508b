/**
 * Hook para AI Insights en CRM
 * Gestiona recomendaciones, predicciones y alertas generadas por IA
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export type InsightType = 'recommendation' | 'prediction' | 'alert' | 'opportunity' | 'risk';
export type InsightCategory = 'scoring' | 'engagement' | 'timing' | 'content' | 'channel' | 'pricing';
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'pending' | 'viewed' | 'accepted' | 'dismissed' | 'completed';

export interface AIInsight {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  account_id: string | null;
  insight_type: InsightType;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  action_items: ActionItem[];
  confidence: number;
  reasoning: string | null;
  supporting_data: Record<string, unknown>;
  model_version: string | null;
  estimated_impact: ImpactEstimate;
  status: InsightStatus;
  actioned_at: string | null;
  actioned_by: string | null;
  feedback: string | null;
  was_helpful: boolean | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  action: string;
  priority: number;
  completed: boolean;
}

export interface ImpactEstimate {
  revenue?: number;
  conversion?: number;
  time?: string;
  description?: string;
}

export interface PredictiveSignal {
  id: string;
  lead_id: string;
  signal_type: string;
  signal_strength: number;
  detected_from: string;
  source_events: unknown[];
  evidence: string | null;
  score_contribution: number;
  detected_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface InsightFilters {
  type?: InsightType;
  category?: InsightCategory;
  priority?: InsightPriority;
  status?: InsightStatus;
  entityType?: 'lead' | 'deal' | 'contact' | 'account';
  entityId?: string;
}

export interface InsightStats {
  total: number;
  pending: number;
  actionedToday: number;
  highPriority: number;
  avgConfidence: number;
  byType: Record<InsightType, number>;
  byCategory: Record<InsightCategory, number>;
}

// === HOOK ===
export function useCRMAIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [signals, setSignals] = useState<PredictiveSignal[]>([]);
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // === FETCH INSIGHTS ===
  const fetchInsights = useCallback(async (filters?: InsightFilters, limit = 50) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('crm_ai_insights')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.type) query = query.eq('insight_type', filters.type);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.entityType === 'lead' && filters?.entityId) {
        query = query.eq('lead_id', filters.entityId);
      }
      if (filters?.entityType === 'deal' && filters?.entityId) {
        query = query.eq('deal_id', filters.entityId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const typedInsights = (data || []).map(i => ({
        ...i,
        action_items: (i.action_items as unknown as ActionItem[]) || [],
        supporting_data: (i.supporting_data as Record<string, unknown>) || {},
        estimated_impact: (i.estimated_impact as ImpactEstimate) || {}
      })) as AIInsight[];

      setInsights(typedInsights);
      return typedInsights;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching insights';
      setError(message);
      console.error('[useCRMAIInsights] fetchInsights:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH SIGNALS ===
  const fetchSignals = useCallback(async (leadId?: string, onlyActive = true) => {
    try {
      let query = supabase
        .from('crm_predictive_signals')
        .select('*')
        .order('signal_strength', { ascending: false });

      if (leadId) query = query.eq('lead_id', leadId);
      if (onlyActive) query = query.eq('is_active', true);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const typedSignals = (data || []).map(s => ({
        ...s,
        source_events: (s.source_events as unknown[]) || []
      })) as PredictiveSignal[];

      setSignals(typedSignals);
      return typedSignals;
    } catch (err) {
      console.error('[useCRMAIInsights] fetchSignals:', err);
      return [];
    }
  }, []);

  // === CALCULATE STATS ===
  const calculateStats = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('crm_ai_insights')
        .select('insight_type, category, priority, status, confidence, actioned_at');

      if (!data || data.length === 0) {
        setStats(null);
        return null;
      }

      const today = new Date().toISOString().split('T')[0];

      const calculatedStats: InsightStats = {
        total: data.length,
        pending: data.filter(i => i.status === 'pending').length,
        actionedToday: data.filter(i => i.actioned_at?.startsWith(today)).length,
        highPriority: data.filter(i => i.priority === 'critical' || i.priority === 'high').length,
        avgConfidence: Math.round(data.reduce((sum, i) => sum + (i.confidence || 0), 0) / data.length * 100),
        byType: {
          recommendation: data.filter(i => i.insight_type === 'recommendation').length,
          prediction: data.filter(i => i.insight_type === 'prediction').length,
          alert: data.filter(i => i.insight_type === 'alert').length,
          opportunity: data.filter(i => i.insight_type === 'opportunity').length,
          risk: data.filter(i => i.insight_type === 'risk').length
        },
        byCategory: {
          scoring: data.filter(i => i.category === 'scoring').length,
          engagement: data.filter(i => i.category === 'engagement').length,
          timing: data.filter(i => i.category === 'timing').length,
          content: data.filter(i => i.category === 'content').length,
          channel: data.filter(i => i.category === 'channel').length,
          pricing: data.filter(i => i.category === 'pricing').length
        }
      };

      setStats(calculatedStats);
      return calculatedStats;
    } catch (err) {
      console.error('[useCRMAIInsights] calculateStats:', err);
      return null;
    }
  }, []);

  // === GENERATE INSIGHTS (AI) ===
  const generateInsights = useCallback(async (context: {
    entityType: 'lead' | 'deal' | 'account';
    entityId: string;
    entityData: Record<string, unknown>;
    focusAreas?: InsightCategory[];
  }) => {
    setIsGenerating(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-lead-scorer', {
        body: {
          action: 'generate_insights',
          context
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.insights) {
        // Save insights to database
        for (const insight of data.insights) {
          await supabase.from('crm_ai_insights').insert({
            lead_id: context.entityType === 'lead' ? context.entityId : null,
            deal_id: context.entityType === 'deal' ? context.entityId : null,
            account_id: context.entityType === 'account' ? context.entityId : null,
            insight_type: insight.type,
            category: insight.category,
            priority: insight.priority,
            title: insight.title,
            description: insight.description,
            action_items: insight.actionItems || [],
            confidence: insight.confidence,
            reasoning: insight.reasoning,
            supporting_data: insight.supportingData || {},
            estimated_impact: insight.estimatedImpact || {},
            model_version: data.modelVersion
          });
        }

        await fetchInsights();
        toast.success(`${data.insights.length} insights generados`);
        return data.insights;
      }

      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generating insights';
      toast.error(message);
      console.error('[useCRMAIInsights] generateInsights:', err);
      return [];
    } finally {
      setIsGenerating(false);
    }
  }, [fetchInsights]);

  // === UPDATE INSIGHT STATUS ===
  const updateInsightStatus = useCallback(async (
    insightId: string,
    status: InsightStatus,
    feedback?: { helpful?: boolean; text?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('crm_ai_insights')
        .update({
          status,
          actioned_at: new Date().toISOString(),
          actioned_by: user?.id,
          was_helpful: feedback?.helpful,
          feedback: feedback?.text
        })
        .eq('id', insightId);

      if (updateError) throw updateError;

      setInsights(prev => prev.map(i => 
        i.id === insightId ? { ...i, status, actioned_at: new Date().toISOString() } : i
      ));

      toast.success('Insight actualizado');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating insight';
      toast.error(message);
      return false;
    }
  }, []);

  // === DISMISS INSIGHT ===
  const dismissInsight = useCallback(async (insightId: string, reason?: string) => {
    return updateInsightStatus(insightId, 'dismissed', { text: reason });
  }, [updateInsightStatus]);

  // === ACCEPT INSIGHT ===
  const acceptInsight = useCallback(async (insightId: string) => {
    return updateInsightStatus(insightId, 'accepted');
  }, [updateInsightStatus]);

  // === COMPLETE INSIGHT ===
  const completeInsight = useCallback(async (insightId: string, wasHelpful?: boolean) => {
    return updateInsightStatus(insightId, 'completed', { helpful: wasHelpful });
  }, [updateInsightStatus]);

  // === CREATE MANUAL INSIGHT ===
  const createInsight = useCallback(async (insight: Partial<AIInsight>) => {
    try {
      const insertData = {
        lead_id: insight.lead_id,
        deal_id: insight.deal_id,
        contact_id: insight.contact_id,
        account_id: insight.account_id,
        insight_type: insight.insight_type || 'recommendation',
        category: insight.category || 'engagement',
        priority: insight.priority || 'medium',
        title: insight.title || 'Manual Insight',
        description: insight.description || '',
        action_items: JSON.parse(JSON.stringify(insight.action_items || [])),
        confidence: insight.confidence || 0.8,
        reasoning: insight.reasoning,
        supporting_data: JSON.parse(JSON.stringify(insight.supporting_data || {})),
        estimated_impact: JSON.parse(JSON.stringify(insight.estimated_impact || {}))
      };

      const { data, error: insertError } = await supabase
        .from('crm_ai_insights')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchInsights();
      toast.success('Insight creado');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating insight';
      toast.error(message);
      return null;
    }
  }, [fetchInsights]);

  // === DETECT SIGNALS ===
  const detectSignals = useCallback(async (leadId: string, events: unknown[]) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-lead-scorer', {
        body: {
          action: 'detect_signals',
          leadId,
          events
        }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.signals) {
        for (const signal of data.signals) {
          await supabase.from('crm_predictive_signals').insert({
            lead_id: leadId,
            signal_type: signal.type,
            signal_strength: signal.strength,
            detected_from: signal.source,
            source_events: signal.events || [],
            evidence: signal.evidence,
            score_contribution: signal.scoreContribution || 0,
            is_active: true
          });
        }

        await fetchSignals(leadId);
        return data.signals;
      }

      return [];
    } catch (err) {
      console.error('[useCRMAIInsights] detectSignals:', err);
      return [];
    }
  }, [fetchSignals]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 120000) => {
    stopAutoRefresh();
    fetchInsights();
    calculateStats();
    autoRefreshRef.current = setInterval(() => {
      fetchInsights({ status: 'pending' });
      calculateStats();
    }, intervalMs);
  }, [fetchInsights, calculateStats]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // === HELPERS ===
  const getPriorityColor = useCallback((priority: InsightPriority): string => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  }, []);

  const getTypeIcon = useCallback((type: InsightType): string => {
    switch (type) {
      case 'recommendation': return 'Lightbulb';
      case 'prediction': return 'TrendingUp';
      case 'alert': return 'AlertTriangle';
      case 'opportunity': return 'Sparkles';
      case 'risk': return 'ShieldAlert';
      default: return 'Info';
    }
  }, []);

  const getPriorityBadgeVariant = useCallback((priority: InsightPriority): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  }, []);

  return {
    // Data
    insights,
    signals,
    stats,
    // State
    isLoading,
    isGenerating,
    error,
    // Fetch
    fetchInsights,
    fetchSignals,
    calculateStats,
    // AI Actions
    generateInsights,
    detectSignals,
    // Insight Management
    createInsight,
    updateInsightStatus,
    dismissInsight,
    acceptInsight,
    completeInsight,
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    // Helpers
    getPriorityColor,
    getTypeIcon,
    getPriorityBadgeVariant
  };
}

export default useCRMAIInsights;
