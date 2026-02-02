/**
 * useLegalAgentIntegration - Hook para integración con otros agentes IA
 * Fase 3: Sistema de validación y asesoría inter-agentes
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface AgentQuery {
  id: string;
  requesting_agent: string;
  requesting_agent_type: string;
  query_type: string;
  query_content: Record<string, unknown>;
  context: Record<string, unknown>;
  jurisdictions: string[];
  urgency: 'immediate' | 'standard' | 'scheduled';
  response: Record<string, unknown> | null;
  approved: boolean | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null;
  legal_basis: string[];
  conditions: string[];
  warnings: string[];
  recommendations: string[];
  processing_time_ms: number | null;
  tokens_used: number | null;
  was_helpful: boolean | null;
  feedback: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ValidationLog {
  id: string;
  agent_id: string;
  agent_type: string;
  action_type: string;
  action_description: string | null;
  action_data: Record<string, unknown>;
  validation_result: Record<string, unknown>;
  is_approved: boolean;
  risk_level: string | null;
  legal_basis: string[];
  applicable_regulations: string[];
  warnings: string[];
  blocking_issues: string[];
  created_at: string;
}

export interface AgentStats {
  total_queries: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  by_agent: Record<string, { queries: number; approved: number }>;
  by_type: Record<string, number>;
  avg_response_time_ms: number;
  risk_distribution: Record<string, number>;
}

export function useLegalAgentIntegration() {
  const [isLoading, setIsLoading] = useState(false);
  const [queries, setQueries] = useState<AgentQuery[]>([]);
  const [validations, setValidations] = useState<ValidationLog[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to safely cast Json to Record
  const toRecord = (value: Json | null): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  };

  // === FETCH AGENT QUERIES ===
  const fetchAgentQueries = useCallback(async (filters?: {
    agent?: string;
    type?: string;
    approved?: boolean;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('legal_agent_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.agent) {
        query = query.eq('requesting_agent_type', filters.agent);
      }
      if (filters?.type) {
        query = query.eq('query_type', filters.type);
      }
      if (filters?.approved !== undefined) {
        query = query.eq('approved', filters.approved);
      }

      const { data, error: dbError } = await query.limit(filters?.limit || 50);

      if (dbError) throw dbError;
      
      // Map to interface
      const mappedData: AgentQuery[] = (data || []).map(item => ({
        id: item.id,
        requesting_agent: item.requesting_agent,
        requesting_agent_type: item.requesting_agent_type,
        query_type: item.query_type,
        query_content: toRecord(item.query_content),
        context: toRecord(item.context),
        jurisdictions: item.jurisdictions || [],
        urgency: item.urgency as AgentQuery['urgency'],
        response: item.response ? toRecord(item.response) : null,
        approved: item.approved,
        risk_level: item.risk_level as AgentQuery['risk_level'],
        legal_basis: item.legal_basis || [],
        conditions: item.conditions || [],
        warnings: item.warnings || [],
        recommendations: item.recommendations || [],
        processing_time_ms: item.processing_time_ms,
        tokens_used: item.tokens_used,
        was_helpful: item.was_helpful,
        feedback: item.feedback,
        created_at: item.created_at,
        responded_at: item.responded_at
      }));

      setQueries(mappedData);
      calculateStats(mappedData);
      return mappedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAgentIntegration] fetchAgentQueries error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === FETCH VALIDATION LOGS ===
  const fetchValidationLogs = useCallback(async (filters?: {
    agent?: string;
    approved?: boolean;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('legal_validation_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.agent) {
        query = query.eq('agent_type', filters.agent);
      }
      if (filters?.approved !== undefined) {
        query = query.eq('is_approved', filters.approved);
      }

      const { data, error: dbError } = await query.limit(filters?.limit || 50);

      if (dbError) throw dbError;
      
      // Map to interface
      const mappedData: ValidationLog[] = (data || []).map(item => ({
        id: item.id,
        agent_id: item.agent_id,
        agent_type: item.agent_type,
        action_type: item.action_type,
        action_description: item.action_description,
        action_data: toRecord(item.action_data),
        validation_result: toRecord(item.validation_result),
        is_approved: item.is_approved,
        risk_level: item.risk_level,
        legal_basis: item.legal_basis || [],
        applicable_regulations: item.applicable_regulations || [],
        warnings: item.warnings || [],
        blocking_issues: item.blocking_issues || [],
        created_at: item.created_at
      }));

      setValidations(mappedData);
      return mappedData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAgentIntegration] fetchValidationLogs error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CALCULATE STATS ===
  const calculateStats = (queriesData: AgentQuery[]) => {
    const byAgent: Record<string, { queries: number; approved: number }> = {};
    const byType: Record<string, number> = {};
    const riskDistribution: Record<string, number> = {};

    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    queriesData.forEach(q => {
      // Count by approval status
      if (q.approved === true) approvedCount++;
      else if (q.approved === false) rejectedCount++;
      else pendingCount++;

      // By agent
      const agentKey = q.requesting_agent_type;
      if (!byAgent[agentKey]) {
        byAgent[agentKey] = { queries: 0, approved: 0 };
      }
      byAgent[agentKey].queries++;
      if (q.approved) byAgent[agentKey].approved++;

      // By type
      byType[q.query_type] = (byType[q.query_type] || 0) + 1;

      // Risk distribution
      if (q.risk_level) {
        riskDistribution[q.risk_level] = (riskDistribution[q.risk_level] || 0) + 1;
      }

      // Response time
      if (q.processing_time_ms) {
        totalResponseTime += q.processing_time_ms;
        responseCount++;
      }
    });

    setStats({
      total_queries: queriesData.length,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      pending_count: pendingCount,
      by_agent: byAgent,
      by_type: byType,
      avg_response_time_ms: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0,
      risk_distribution: riskDistribution
    });
  };

  // === PROVIDE FEEDBACK ===
  const provideFeedback = useCallback(async (
    queryId: string,
    wasHelpful: boolean,
    feedback?: string
  ) => {
    try {
      const { error: dbError } = await supabase
        .from('legal_agent_queries')
        .update({
          was_helpful: wasHelpful,
          feedback
        })
        .eq('id', queryId);

      if (dbError) throw dbError;

      toast.success('Feedback registrado');
      await fetchAgentQueries();
      return true;
    } catch (err) {
      console.error('[useLegalAgentIntegration] provideFeedback error:', err);
      toast.error('Error al registrar feedback');
      return false;
    }
  }, [fetchAgentQueries]);

  // === VALIDATE AGENT ACTION (Realtime call) ===
  const validateAction = useCallback(async (
    agentId: string,
    agentType: string,
    action: {
      action_type: string;
      action_data: Record<string, unknown>;
      jurisdictions?: string[];
    }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        {
          body: {
            action: 'validate_action',
            requesting_agent: agentId,
            requesting_agent_type: agentType,
            agent_action: action,
            jurisdictions: action.jurisdictions || ['ES'],
            urgency: 'immediate'
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success) {
        // Refresh queries after validation
        await fetchAgentQueries({ limit: 20 });
        return data;
      }

      throw new Error(data?.error || 'Error en validación');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalAgentIntegration] validateAction error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAgentQueries]);

  // === REALTIME SUBSCRIPTION ===
  useEffect(() => {
    const channel = supabase
      .channel('legal-agent-queries-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'legal_agent_queries' },
        (payload) => {
          const newItem = payload.new;
          const newQuery: AgentQuery = {
            id: newItem.id,
            requesting_agent: newItem.requesting_agent,
            requesting_agent_type: newItem.requesting_agent_type,
            query_type: newItem.query_type,
            query_content: newItem.query_content as Record<string, unknown> || {},
            context: newItem.context as Record<string, unknown> || {},
            jurisdictions: newItem.jurisdictions || [],
            urgency: newItem.urgency as AgentQuery['urgency'],
            response: newItem.response as Record<string, unknown> | null,
            approved: newItem.approved,
            risk_level: newItem.risk_level as AgentQuery['risk_level'],
            legal_basis: newItem.legal_basis || [],
            conditions: newItem.conditions || [],
            warnings: newItem.warnings || [],
            recommendations: newItem.recommendations || [],
            processing_time_ms: newItem.processing_time_ms,
            tokens_used: newItem.tokens_used,
            was_helpful: newItem.was_helpful,
            feedback: newItem.feedback,
            created_at: newItem.created_at,
            responded_at: newItem.responded_at
          };
          setQueries(prev => {
            if (prev.some(q => q.id === newQuery.id)) return prev;
            return [newQuery, ...prev];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // === INITIAL FETCH ===
  useEffect(() => {
    fetchAgentQueries();
    fetchValidationLogs();
  }, [fetchAgentQueries, fetchValidationLogs]);

  return {
    isLoading,
    queries,
    validations,
    stats,
    error,
    fetchAgentQueries,
    fetchValidationLogs,
    provideFeedback,
    validateAction,
  };
}

export default useLegalAgentIntegration;
