/**
 * useAuditAgents — Hook para la jerarquía de agentes IA de auditoría
 * 8 Especialistas → 2 Supervisores → 1 SuperSupervisor
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuditAgent {
  id: string;
  code: string;
  name: string;
  module_domain: string;
  specialization: string;
  agent_type: 'specialist' | 'supervisor' | 'super_supervisor';
  execution_type: string;
  status: string;
  supervisor_code: string | null;
  confidence_threshold: number;
  requires_human_review: boolean;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditAgentInvocation {
  id: string;
  agent_code: string;
  input_summary: string;
  routing_reason: string;
  confidence_score: number;
  escalated_to: string | null;
  escalation_reason: string | null;
  outcome_status: string;
  execution_time_ms: number;
  response_summary: string;
  created_at: string;
}

export interface AuditAgentStats {
  totalAgents: number;
  activeAgents: number;
  supervisors: number;
  superSupervisor: AuditAgent | null;
  totalInvocations: number;
  avgConfidence: number;
  escalationRate: number;
  successRate: number;
}

export function useAuditAgents() {
  const [agents, setAgents] = useState<AuditAgent[]>([]);
  const [invocations, setInvocations] = useState<AuditAgentInvocation[]>([]);
  const [stats, setStats] = useState<AuditAgentStats>({
    totalAgents: 0, activeAgents: 0, supervisors: 0, superSupervisor: null,
    totalInvocations: 0, avgConfidence: 0, escalationRate: 0, successRate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_ai_agents_registry')
        .select('*')
        .eq('module_domain', 'audit')
        .order('agent_type', { ascending: true });

      if (error) throw error;
      const typedAgents = (data as unknown as AuditAgent[]) || [];
      setAgents(typedAgents);

      // Calculate stats
      const ss = typedAgents.find(a => a.agent_type === 'super_supervisor') || null;
      setStats(prev => ({
        ...prev,
        totalAgents: typedAgents.length,
        activeAgents: typedAgents.filter(a => a.status === 'active').length,
        supervisors: typedAgents.filter(a => a.agent_type === 'supervisor').length,
        superSupervisor: ss,
      }));

      return typedAgents;
    } catch (err) {
      console.error('[useAuditAgents] fetchAuditAgents error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInvocations = useCallback(async (agentCode?: string, limit = 50) => {
    try {
      let query = supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentCode) query = query.eq('agent_code', agentCode);

      const { data, error } = await query;
      if (error) throw error;
      
      const typed = (data as unknown as AuditAgentInvocation[]) || [];
      setInvocations(typed);

      // Update invocation stats
      const total = typed.length;
      const escalated = typed.filter(i => i.escalated_to).length;
      const successful = typed.filter(i => i.outcome_status === 'success').length;
      const avgConf = total > 0 ? typed.reduce((sum, i) => sum + i.confidence_score, 0) / total : 0;

      setStats(prev => ({
        ...prev,
        totalInvocations: total,
        avgConfidence: Math.round(avgConf * 100) / 100,
        escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      }));

      return typed;
    } catch (err) {
      console.error('[useAuditAgents] fetchInvocations error:', err);
      return [];
    }
  }, []);

  const invokeAgent = useCallback(async (agentCode: string, query: string, context?: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.functions.invoke('audit-agent-specialist', {
        body: { action: 'invoke', agent_code: agentCode, query, context }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Agente ${agentCode} ejecutado`);
        await fetchInvocations(agentCode);
        return data.data;
      }
      throw new Error(data?.error || 'Invocation failed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al invocar agente';
      toast.error(msg);
      return null;
    }
  }, [fetchInvocations]);

  const escalateToSupervisor = useCallback(async (agentCode: string, reason: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('audit-agent-supervisor', {
        body: { action: 'escalate', from_agent: agentCode, reason }
      });
      if (error) throw error;
      toast.success('Escalado al supervisor');
      return data?.data;
    } catch (err) {
      toast.error('Error en escalación');
      return null;
    }
  }, []);

  // Computed
  const specialists = agents.filter(a => a.agent_type === 'specialist');
  const supervisors = agents.filter(a => a.agent_type === 'supervisor');
  const superSupervisor = agents.find(a => a.agent_type === 'super_supervisor') || null;
  const internalAgents = specialists.filter(a => (a.metadata as any)?.domain === 'internal');
  const externalAgents = specialists.filter(a => (a.metadata as any)?.domain === 'external');
  const internalSupervisor = agents.find(a => a.code === 'AUDIT-SUP-INT-001') || null;
  const externalSupervisor = agents.find(a => a.code === 'AUDIT-SUP-EXT-001') || null;

  return {
    agents, invocations, stats, isLoading,
    fetchAuditAgents, fetchInvocations, invokeAgent, escalateToSupervisor,
    specialists, supervisors, superSupervisor,
    internalAgents, externalAgents, internalSupervisor, externalSupervisor,
  };
}
