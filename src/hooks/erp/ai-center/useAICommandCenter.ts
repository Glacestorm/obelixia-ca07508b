import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ApprovalQueueItem {
  id: string;
  company_id: string | null;
  agent_code: string;
  domain: string;
  task_type: string;
  status: string;
  priority: number;
  semaphore: string;
  confidence_score: number | null;
  payload_summary: string | null;
  action_required: string | null;
  cost_tokens: number | null;
  started_at: string | null;
  estimated_completion: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRegistryItem {
  id: string;
  code: string;
  name: string;
  module_domain: string;
  agent_type: string;
  status: string;
  confidence_threshold: number;
  requires_human_review: boolean;
  execution_type: string;
  description: string | null;
  specialization: string | null;
}

export interface CommandCenterKPIs {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  errorAgents: number;
  pendingApprovals: number;
  todayInvocations: number;
  avgConfidence: number;
  todayEscalations: number;
  avgLatencyMs: number;
}

export function useAICommandCenter() {
  const [agents, setAgents] = useState<AgentRegistryItem[]>([]);
  const [queue, setQueue] = useState<ApprovalQueueItem[]>([]);
  const [kpis, setKpis] = useState<CommandCenterKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('erp_ai_agents_registry')
      .select('id, code, name, module_domain, agent_type, status, confidence_threshold, requires_human_review, execution_type, description, specialization')
      .order('module_domain');

    if (error) {
      console.error('[AICommandCenter] fetchAgents error:', error);
      return [];
    }
    return (data || []) as AgentRegistryItem[];
  }, []);

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from('erp_ai_approval_queue')
      .select('*')
      .in('status', ['pending', 'escalated'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[AICommandCenter] fetchQueue error:', error);
      return [];
    }
    return (data || []) as ApprovalQueueItem[];
  }, []);

  const fetchKPIs = useCallback(async (agentsList: AgentRegistryItem[]) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: invocations } = await supabase
      .from('erp_ai_agent_invocations')
      .select('confidence_score, execution_time_ms, escalated_to')
      .gte('created_at', todayStart.toISOString());

    const inv = invocations || [];
    const confidences = inv.filter(i => i.confidence_score != null).map(i => i.confidence_score!);
    const latencies = inv.filter(i => i.execution_time_ms != null).map(i => i.execution_time_ms!);

    const { count: pendingCount } = await supabase
      .from('erp_ai_approval_queue')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'escalated']);

    setKpis({
      totalAgents: agentsList.length,
      activeAgents: agentsList.filter(a => a.status === 'active').length,
      pausedAgents: agentsList.filter(a => a.status === 'paused').length,
      errorAgents: agentsList.filter(a => a.status === 'error').length,
      pendingApprovals: pendingCount || 0,
      todayInvocations: inv.length,
      avgConfidence: confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0,
      todayEscalations: inv.filter(i => i.escalated_to).length,
      avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsList, queueList] = await Promise.all([fetchAgents(), fetchQueue()]);
      setAgents(agentsList);
      setQueue(queueList);
      await fetchKPIs(agentsList);
    } catch (err) {
      console.error('[AICommandCenter] loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchQueue, fetchKPIs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime subscription for queue updates
  useEffect(() => {
    const channel = supabase
      .channel('ai-approval-queue-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'erp_ai_approval_queue' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ApprovalQueueItem;
            if (newItem.status === 'pending' || newItem.status === 'escalated') {
              setQueue(prev => [newItem, ...prev].sort((a, b) => b.priority - a.priority));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ApprovalQueueItem;
            if (updated.status === 'pending' || updated.status === 'escalated') {
              setQueue(prev => prev.map(q => q.id === updated.id ? updated : q));
            } else {
              setQueue(prev => prev.filter(q => q.id !== updated.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setQueue(prev => prev.filter(q => q.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    agents,
    queue,
    kpis,
    loading,
    refresh: loadAll,
    user,
  };
}

export default useAICommandCenter;
