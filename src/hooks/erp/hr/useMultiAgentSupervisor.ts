/**
 * useMultiAgentSupervisor - Phase 1A
 * Hook for interacting with the HR/Legal multiagent supervisor architecture
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentRegistryEntry {
  id: string;
  code: string;
  name: string;
  module_domain: string;
  specialization: string;
  agent_type: string;
  execution_type: string;
  backend_handler: string;
  ui_entrypoint: string;
  status: string;
  supervisor_code: string | null;
  confidence_threshold: number;
  requires_human_review: boolean;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentInvocation {
  id: string;
  agent_code: string;
  supervisor_code: string | null;
  company_id: string;
  user_id: string | null;
  input_summary: string;
  routing_reason: string;
  confidence_score: number;
  escalated_to: string | null;
  escalation_reason: string | null;
  outcome_status: string;
  execution_time_ms: number;
  response_summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RoutingResult {
  response: any;
  routing: {
    domain: string;
    agent_code: string;
    confidence: number;
    reasoning: string;
    escalated_to: string | null;
    escalation_reason: string | null;
  };
  execution_time_ms: number;
  outcome_status: string;
  timestamp: string;
}

export function useMultiAgentSupervisor(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [registry, setRegistry] = useState<AgentRegistryEntry[]>([]);
  const [invocations, setInvocations] = useState<AgentInvocation[]>([]);
  const [lastResult, setLastResult] = useState<RoutingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const getAgentRegistry = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_ai_agents_registry')
        .select('*')
        .order('module_domain', { ascending: true });

      if (dbError) throw dbError;
      setRegistry((data as unknown as AgentRegistryEntry[]) || []);
      return data;
    } catch (err) {
      console.error('[useMultiAgentSupervisor] Registry fetch error:', err);
      return [];
    }
  }, []);

  const getRecentInvocations = useCallback(async (limit = 20) => {
    try {
      const { data, error: dbError } = await supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError) throw dbError;
      setInvocations((data as unknown as AgentInvocation[]) || []);
      return data;
    } catch (err) {
      console.error('[useMultiAgentSupervisor] Invocations fetch error:', err);
      return [];
    }
  }, [companyId]);

  const routeQuery = useCallback(async (
    query: string,
    context?: Record<string, unknown>
  ): Promise<RoutingResult | null> => {
    if (!query.trim()) {
      toast.error('La consulta no puede estar vacía');
      return null;
    }

    setIsLoading(true);
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'hr-multiagent-supervisor',
        {
          body: {
            action: 'route_query',
            company_id: companyId,
            query,
            context,
            session_id: crypto.randomUUID(),
          }
        }
      );

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        const result = data.data as RoutingResult;
        setLastResult(result);
        
        // Refresh invocations
        getRecentInvocations();
        
        return result;
      }

      throw new Error(data?.error || 'Invalid response from supervisor');
    } catch (err: any) {
      const message = err?.message || 'Error al procesar consulta';
      setError(message);
      
      if (err?.message?.includes('Rate limit')) {
        toast.error('Demasiadas solicitudes. Intenta más tarde.');
      } else if (err?.message?.includes('402') || err?.message?.includes('Créditos')) {
        toast.error('Créditos IA insuficientes.');
      } else {
        toast.error(message);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, getRecentInvocations]);

  return {
    // State
    isLoading,
    registry,
    invocations,
    lastResult,
    error,
    // Actions
    routeQuery,
    getAgentRegistry,
    getRecentInvocations,
    // Computed
    hrAgents: registry.filter(a => a.module_domain === 'hr'),
    legalAgents: registry.filter(a => a.module_domain === 'legal'),
    supervisors: registry.filter(a => a.agent_type === 'supervisor'),
    escalatedCount: invocations.filter(i => i.escalated_to).length,
  };
}

export default useMultiAgentSupervisor;
