/**
 * useSupervisorDomainData - Hook for fetching real agent registry + invocation data
 * Used by the global Supervisor and HR mini-control center
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RegistryAgent {
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

export interface InvocationRecord {
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

export function useSupervisorDomainData(companyId?: string) {
  const [agents, setAgents] = useState<RegistryAgent[]>([]);
  const [invocations, setInvocations] = useState<InvocationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('erp_ai_agents_registry')
        .select('*')
        .order('module_domain', { ascending: true });
      setAgents((data as unknown as RegistryAgent[]) || []);
    } catch (err) {
      console.error('[useSupervisorDomainData] agents error:', err);
    }
  }, []);

  const fetchInvocations = useCallback(async (limit = 50) => {
    try {
      let query = supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data } = await query;
      setInvocations((data as unknown as InvocationRecord[]) || []);
    } catch (err) {
      console.error('[useSupervisorDomainData] invocations error:', err);
    }
  }, [companyId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAgents(), fetchInvocations()]);
    setLoading(false);
  }, [fetchAgents, fetchInvocations]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Computed filters
  const hrAgents = agents.filter(a => a.module_domain === 'hr');
  const legalAgents = agents.filter(a => a.module_domain === 'legal');
  const crossAgents = agents.filter(a => a.module_domain === 'cross');
  const complianceAgents = agents.filter(a => a.module_domain === 'compliance');
  const supervisors = agents.filter(a => a.agent_type === 'supervisor');

  const hrInvocations = invocations.filter(i => {
    const agent = agents.find(a => a.code === i.agent_code);
    return agent?.module_domain === 'hr' || i.supervisor_code === 'hr-supervisor';
  });

  const legalInvocations = invocations.filter(i => {
    const agent = agents.find(a => a.code === i.agent_code);
    return agent?.module_domain === 'legal' || i.supervisor_code === 'legal-supervisor';
  });

  const complianceInvocations = invocations.filter(i => {
    const agent = agents.find(a => a.code === i.agent_code);
    return agent?.module_domain === 'compliance';
  });

  const escalatedInvocations = invocations.filter(i => i.escalated_to);
  const humanReviewInvocations = invocations.filter(i => i.outcome_status === 'human_review');
  const conflictInvocations = invocations.filter(i => 
    i.outcome_status === 'failed' || i.outcome_status === 'escalated'
  );

  // Stats
  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalInvocations: invocations.length,
    successRate: invocations.length > 0
      ? Math.round((invocations.filter(i => i.outcome_status === 'success').length / invocations.length) * 100)
      : 0,
    escalatedCount: escalatedInvocations.length,
    humanReviewCount: humanReviewInvocations.length,
    avgConfidence: invocations.length > 0
      ? Math.round((invocations.reduce((s, i) => s + (i.confidence_score || 0), 0) / invocations.length) * 100)
      : 0,
    avgExecutionTime: invocations.length > 0
      ? Math.round(invocations.reduce((s, i) => s + (i.execution_time_ms || 0), 0) / invocations.length)
      : 0,
  };

  return {
    agents,
    invocations,
    loading,
    refresh,
    // Domain filters
    hrAgents,
    legalAgents,
    crossAgents,
    supervisors,
    hrInvocations,
    legalInvocations,
    escalatedInvocations,
    humanReviewInvocations,
    conflictInvocations,
    stats,
  };
}
