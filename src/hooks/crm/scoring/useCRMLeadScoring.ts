/**
 * Hook para Lead Scoring avanzado con IA
 * Gestiona modelos de scoring, cálculo de scores y tracking behavioral
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export interface ScoringModel {
  id: string;
  name: string;
  description: string | null;
  model_type: string;
  status: string;
  version: number;
  scoring_factors: ScoringFactor[];
  weights: Record<string, number>;
  thresholds: { hot: number; warm: number; cold: number };
  ml_config: Record<string, unknown>;
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  auc_roc: number | null;
  last_trained_at: string | null;
  training_samples: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoringFactor {
  name: string;
  category: 'fit' | 'engagement' | 'intent';
  weight: number;
}

export interface LeadScore {
  id: string;
  lead_id: string;
  model_id: string | null;
  total_score: number;
  fit_score: number;
  engagement_score: number;
  intent_score: number;
  tier: 'A' | 'B' | 'C' | 'D';
  readiness: 'hot' | 'warm' | 'cold';
  score_breakdown: Record<string, unknown>;
  contributing_factors: ContributingFactor[];
  conversion_probability: number | null;
  estimated_deal_size: number | null;
  predicted_close_date: string | null;
  churn_risk: number | null;
  score_trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
  velocity_score: number;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContributingFactor {
  factor: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface ScoreHistory {
  id: string;
  lead_id: string;
  model_id: string | null;
  total_score: number;
  fit_score: number | null;
  engagement_score: number | null;
  intent_score: number | null;
  tier: string | null;
  readiness: string | null;
  trigger_event: string | null;
  score_delta: number;
  recorded_at: string;
}

export interface BehavioralEvent {
  id: string;
  lead_id: string;
  contact_id: string | null;
  event_type: string;
  event_category: string;
  event_name: string;
  event_data: Record<string, unknown>;
  page_url: string | null;
  score_impact: number;
  occurred_at: string;
}

export interface ScoringRule {
  id: string;
  model_id: string;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: RuleCondition[];
  operator: 'AND' | 'OR';
  score_impact: number;
  impact_type: 'add' | 'subtract' | 'multiply' | 'set';
  max_occurrences: number | null;
  decay_days: number | null;
  is_active: boolean;
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface ScoringStats {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  averageScore: number;
  conversionRate: number;
  modelAccuracy: number;
  scoreDistribution: { tier: string; count: number }[];
}

// === HOOK ===
export function useCRMLeadScoring() {
  const [models, setModels] = useState<ScoringModel[]>([]);
  const [activeModel, setActiveModel] = useState<ScoringModel | null>(null);
  const [scores, setScores] = useState<LeadScore[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [stats, setStats] = useState<ScoringStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // === FETCH MODELS ===
  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('crm_scoring_models')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typedModels = (data || []).map(m => ({
        ...m,
        scoring_factors: (m.scoring_factors as unknown as ScoringFactor[]) || [],
        weights: (m.weights as Record<string, number>) || {},
        thresholds: (m.thresholds as { hot: number; warm: number; cold: number }) || { hot: 80, warm: 50, cold: 20 },
        ml_config: (m.ml_config as Record<string, unknown>) || {}
      })) as ScoringModel[];

      setModels(typedModels);
      
      const defaultModel = typedModels.find(m => m.is_default && m.status === 'active');
      if (defaultModel) setActiveModel(defaultModel);

      return typedModels;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching models';
      setError(message);
      console.error('[useCRMLeadScoring] fetchModels:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH SCORES ===
  const fetchScores = useCallback(async (filters?: { 
    tier?: string; 
    readiness?: string; 
    minScore?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('crm_lead_scores')
        .select('*')
        .order('total_score', { ascending: false });

      if (filters?.tier) query = query.eq('tier', filters.tier);
      if (filters?.readiness) query = query.eq('readiness', filters.readiness);
      if (filters?.minScore) query = query.gte('total_score', filters.minScore);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const typedScores = (data || []).map(s => ({
        ...s,
        score_breakdown: (s.score_breakdown as Record<string, unknown>) || {},
        contributing_factors: (s.contributing_factors as unknown as ContributingFactor[]) || []
      })) as LeadScore[];

      setScores(typedScores);
      return typedScores;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching scores';
      setError(message);
      console.error('[useCRMLeadScoring] fetchScores:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH RULES ===
  const fetchRules = useCallback(async (modelId?: string) => {
    try {
      let query = supabase
        .from('crm_scoring_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (modelId) query = query.eq('model_id', modelId);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const typedRules = (data || []).map(r => ({
        ...r,
        conditions: (r.conditions as unknown as RuleCondition[]) || [],
        operator: r.operator as 'AND' | 'OR'
      })) as ScoringRule[];

      setRules(typedRules);
      return typedRules;
    } catch (err) {
      console.error('[useCRMLeadScoring] fetchRules:', err);
      return [];
    }
  }, []);

  // === CALCULATE STATS ===
  const calculateStats = useCallback(async () => {
    try {
      const { data: scoresData } = await supabase
        .from('crm_lead_scores')
        .select('total_score, tier, readiness, conversion_probability');

      if (!scoresData || scoresData.length === 0) {
        setStats(null);
        return null;
      }

      const totalLeads = scoresData.length;
      const hotLeads = scoresData.filter(s => s.readiness === 'hot').length;
      const warmLeads = scoresData.filter(s => s.readiness === 'warm').length;
      const coldLeads = scoresData.filter(s => s.readiness === 'cold').length;
      const averageScore = scoresData.reduce((sum, s) => sum + s.total_score, 0) / totalLeads;
      const conversionRate = scoresData.filter(s => (s.conversion_probability || 0) > 0.5).length / totalLeads * 100;

      const distribution = ['A', 'B', 'C', 'D'].map(tier => ({
        tier,
        count: scoresData.filter(s => s.tier === tier).length
      }));

      const calculatedStats: ScoringStats = {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        averageScore: Math.round(averageScore),
        conversionRate: Math.round(conversionRate),
        modelAccuracy: activeModel?.accuracy ? Math.round(activeModel.accuracy * 100) : 0,
        scoreDistribution: distribution
      };

      setStats(calculatedStats);
      return calculatedStats;
    } catch (err) {
      console.error('[useCRMLeadScoring] calculateStats:', err);
      return null;
    }
  }, [activeModel]);

  // === SCORE LEAD (AI) ===
  const scoreLead = useCallback(async (lead: {
    id: string;
    company: string;
    sector: string;
    size: string;
    source: string;
    engagement: Record<string, number>;
    firmographics?: Record<string, unknown>;
  }) => {
    setIsScoring(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-lead-scorer', {
        body: {
          action: 'score',
          lead,
          modelId: activeModel?.id
        }
      });

      if (fnError) throw fnError;

      if (data?.success) {
        // Save score to database
        const scoreData = data.data;
        const { error: insertError } = await supabase
          .from('crm_lead_scores')
          .upsert({
            lead_id: lead.id,
            model_id: activeModel?.id,
            total_score: scoreData.totalScore,
            fit_score: scoreData.breakdown?.fit?.score || 0,
            engagement_score: scoreData.breakdown?.engagement?.score || 0,
            intent_score: scoreData.breakdown?.intent?.score || 0,
            tier: scoreData.tier,
            readiness: scoreData.readiness,
            score_breakdown: scoreData.breakdown,
            contributing_factors: [
              ...(scoreData.breakdown?.fit?.factors || []).map((f: string) => ({ factor: f, category: 'fit' })),
              ...(scoreData.breakdown?.engagement?.factors || []).map((f: string) => ({ factor: f, category: 'engagement' })),
              ...(scoreData.breakdown?.intent?.factors || []).map((f: string) => ({ factor: f, category: 'intent' }))
            ],
            conversion_probability: scoreData.conversionProbability / 100,
            estimated_deal_size: scoreData.estimatedDealSize,
            calculated_at: new Date().toISOString()
          }, { onConflict: 'lead_id' });

        if (insertError) console.warn('Score save warning:', insertError);

        // Record history
        await supabase.from('crm_score_history').insert({
          lead_id: lead.id,
          model_id: activeModel?.id,
          total_score: scoreData.totalScore,
          fit_score: scoreData.breakdown?.fit?.score,
          engagement_score: scoreData.breakdown?.engagement?.score,
          intent_score: scoreData.breakdown?.intent?.score,
          tier: scoreData.tier,
          readiness: scoreData.readiness,
          trigger_event: 'manual_scoring'
        });

        toast.success(`Lead scored: ${scoreData.totalScore}/100 (${scoreData.tier})`);
        return scoreData;
      }

      throw new Error('Scoring failed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error scoring lead';
      toast.error(message);
      console.error('[useCRMLeadScoring] scoreLead:', err);
      return null;
    } finally {
      setIsScoring(false);
    }
  }, [activeModel]);

  // === BATCH SCORE ===
  const batchScoreLeads = useCallback(async (leadIds: string[]) => {
    setIsScoring(true);
    try {
      const results = [];
      for (const leadId of leadIds) {
        // In production, fetch lead data from your leads table
        const result = await scoreLead({
          id: leadId,
          company: 'Unknown',
          sector: 'Technology',
          size: 'Unknown',
          source: 'import',
          engagement: {}
        });
        if (result) results.push(result);
      }

      toast.success(`Scored ${results.length}/${leadIds.length} leads`);
      return results;
    } catch (err) {
      console.error('[useCRMLeadScoring] batchScoreLeads:', err);
      return [];
    } finally {
      setIsScoring(false);
    }
  }, [scoreLead]);

  // === CREATE MODEL ===
  const createModel = useCallback(async (model: Partial<ScoringModel>) => {
    try {
      const insertData = {
        name: model.name || 'New Model',
        description: model.description,
        model_type: model.model_type || 'hybrid',
        status: 'draft',
        scoring_factors: JSON.parse(JSON.stringify(model.scoring_factors || [])),
        weights: JSON.parse(JSON.stringify(model.weights || { fit: 0.4, engagement: 0.3, intent: 0.3 })),
        thresholds: JSON.parse(JSON.stringify(model.thresholds || { hot: 80, warm: 50, cold: 20 }))
      };

      const { data, error: insertError } = await supabase
        .from('crm_scoring_models')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchModels();
      toast.success('Modelo creado');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating model';
      toast.error(message);
      return null;
    }
  }, [fetchModels]);

  // === UPDATE MODEL ===
  const updateModel = useCallback(async (modelId: string, updates: Partial<ScoringModel>) => {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.model_type !== undefined) updateData.model_type = updates.model_type;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.scoring_factors !== undefined) updateData.scoring_factors = JSON.parse(JSON.stringify(updates.scoring_factors));
      if (updates.weights !== undefined) updateData.weights = JSON.parse(JSON.stringify(updates.weights));
      if (updates.thresholds !== undefined) updateData.thresholds = JSON.parse(JSON.stringify(updates.thresholds));
      if (updates.is_default !== undefined) updateData.is_default = updates.is_default;

      const { error: updateError } = await supabase
        .from('crm_scoring_models')
        .update(updateData)
        .eq('id', modelId);

      if (updateError) throw updateError;

      await fetchModels();
      toast.success('Modelo actualizado');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating model';
      toast.error(message);
      return false;
    }
  }, [fetchModels]);

  // === CREATE RULE ===
  const createRule = useCallback(async (rule: Partial<ScoringRule>) => {
    try {
      const insertData = {
        model_id: rule.model_id,
        name: rule.name || 'New Rule',
        description: rule.description,
        rule_type: rule.rule_type || 'attribute',
        conditions: JSON.parse(JSON.stringify(rule.conditions || [])),
        operator: rule.operator || 'AND',
        score_impact: rule.score_impact || 0,
        impact_type: rule.impact_type || 'add',
        is_active: true
      };

      const { data, error: insertError } = await supabase
        .from('crm_scoring_rules')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchRules(rule.model_id);
      toast.success('Regla creada');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating rule';
      toast.error(message);
      return null;
    }
  }, [fetchRules]);

  // === TRACK BEHAVIORAL EVENT ===
  const trackEvent = useCallback(async (event: {
    lead_id: string;
    event_type: string;
    event_category: string;
    event_name: string;
    event_data?: Record<string, unknown>;
    score_impact?: number;
  }) => {
    try {
      const insertData = {
        lead_id: event.lead_id,
        event_type: event.event_type,
        event_category: event.event_category,
        event_name: event.event_name,
        event_data: JSON.parse(JSON.stringify(event.event_data || {})),
        score_impact: event.score_impact || 0,
        occurred_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('crm_behavioral_events')
        .insert(insertData);

      if (insertError) throw insertError;
      return true;
    } catch (err) {
      console.error('[useCRMLeadScoring] trackEvent:', err);
      return false;
    }
  }, []);

  // === GET SCORE HISTORY ===
  const getScoreHistory = useCallback(async (leadId: string, limit = 30) => {
    try {
      const { data, error } = await supabase
        .from('crm_score_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ScoreHistory[];
    } catch (err) {
      console.error('[useCRMLeadScoring] getScoreHistory:', err);
      return [];
    }
  }, []);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    stopAutoRefresh();
    fetchModels();
    fetchScores();
    calculateStats();
    autoRefreshRef.current = setInterval(() => {
      fetchScores();
      calculateStats();
    }, intervalMs);
  }, [fetchModels, fetchScores, calculateStats]);

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
  const getTierColor = useCallback((tier: string): string => {
    switch (tier) {
      case 'A': return 'text-emerald-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-amber-500';
      case 'D': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  }, []);

  const getReadinessColor = useCallback((readiness: string): string => {
    switch (readiness) {
      case 'hot': return 'text-red-500';
      case 'warm': return 'text-amber-500';
      case 'cold': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  }, []);

  const getTierBadgeVariant = useCallback((tier: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (tier) {
      case 'A': return 'default';
      case 'B': return 'secondary';
      case 'C':
      case 'D': return 'outline';
      default: return 'outline';
    }
  }, []);

  return {
    // Data
    models,
    activeModel,
    scores,
    rules,
    stats,
    // State
    isLoading,
    isScoring,
    error,
    // Model Management
    fetchModels,
    createModel,
    updateModel,
    setActiveModel,
    // Scoring
    fetchScores,
    scoreLead,
    batchScoreLeads,
    // Rules
    fetchRules,
    createRule,
    // Events
    trackEvent,
    getScoreHistory,
    // Stats
    calculateStats,
    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
    // Helpers
    getTierColor,
    getReadinessColor,
    getTierBadgeVariant
  };
}

export default useCRMLeadScoring;
