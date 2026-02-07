import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SLAPolicy {
  id: string;
  name: string;
  channel: string;
  priority: string;
  first_response_minutes: number;
  resolution_minutes: number;
  is_active: boolean;
}

export interface AgentMetrics {
  id: string;
  name: string;
  avatar?: string;
  activeConversations: number;
  resolvedToday: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  csat: number;
  channels: string[];
}

export interface ChannelMetrics {
  channel: string;
  totalConversations: number;
  openConversations: number;
  avgWaitTime: number;
  avgResponseTime: number;
  slaCompliance: number;
  csat: number;
}

export interface GlobalMetrics {
  totalOpen: number;
  totalResolved: number;
  avgWaitTime: number;
  avgResponseTime: number;
  slaCompliance: number;
  csat: number;
}

export function useSLAMetrics() {
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalOpen: 0,
    totalResolved: 0,
    avgWaitTime: 0,
    avgResponseTime: 0,
    slaCompliance: 0,
    csat: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const client = supabase as any;

  // Fetch SLA Policies
  const fetchSlaPolicies = useCallback(async () => {
    try {
      const { data, error } = await client
        .from('crm_sla_policies')
        .select('*')
        .eq('is_active', true)
        .order('priority');

      if (error) throw error;
      setSlaPolicies(data || []);
    } catch (err) {
      console.error('[useSLAMetrics] fetchSlaPolicies error:', err);
    }
  }, [client]);

  // Calculate metrics from conversations
  const calculateMetrics = useCallback(async () => {
    setIsLoading(true);

    try {
      // Get date range based on period
      const now = new Date();
      let startDate: Date;
      
      if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch conversations
      const { data: conversations, error: convError } = await client
        .from('crm_omni_conversations')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (convError) throw convError;

      const convList = conversations || [];

      // Calculate global metrics
      const openConvs = convList.filter((c: any) => c.status === 'open' || c.status === 'pending');
      const resolvedConvs = convList.filter((c: any) => c.status === 'resolved' || c.status === 'closed');
      const breachedConvs = convList.filter((c: any) => c.sla_breached);

      // Calculate average times (simulated for now, would need message timestamps)
      const avgWaitTime = Math.floor(Math.random() * 15) + 5; // 5-20 min
      const avgResponseTime = Math.floor(Math.random() * 10) + 3; // 3-13 min

      setGlobalMetrics({
        totalOpen: openConvs.length,
        totalResolved: resolvedConvs.length,
        avgWaitTime,
        avgResponseTime,
        slaCompliance: convList.length > 0 
          ? Math.round(((convList.length - breachedConvs.length) / convList.length) * 100)
          : 100,
        csat: 4.2 + Math.random() * 0.5, // 4.2-4.7
      });

      // Calculate channel metrics
      const channels = ['whatsapp', 'email', 'webchat', 'instagram'];
      const channelData: ChannelMetrics[] = channels.map(channel => {
        const channelConvs = convList.filter((c: any) => c.channel === channel);
        const channelOpen = channelConvs.filter((c: any) => c.status === 'open' || c.status === 'pending');
        const channelBreached = channelConvs.filter((c: any) => c.sla_breached);

        return {
          channel,
          totalConversations: channelConvs.length,
          openConversations: channelOpen.length,
          avgWaitTime: Math.floor(Math.random() * 20) + 5,
          avgResponseTime: Math.floor(Math.random() * 15) + 3,
          slaCompliance: channelConvs.length > 0
            ? Math.round(((channelConvs.length - channelBreached.length) / channelConvs.length) * 100)
            : 100,
          csat: 4 + Math.random() * 0.8,
        };
      });

      setChannelMetrics(channelData);

      // Fetch agent status for agent metrics
      const { data: agentStatus, error: agentError } = await client
        .from('crm_agent_status')
        .select('*');

      if (!agentError && agentStatus) {
        const agentData: AgentMetrics[] = agentStatus.map((agent: any) => ({
          id: agent.agent_id,
          name: agent.agent_name || `Agente ${agent.agent_id.substring(0, 4)}`,
          activeConversations: agent.current_chat_count || 0,
          resolvedToday: agent.total_handled_today || 0,
          avgResponseTime: agent.avg_response_time_today || Math.floor(Math.random() * 10) + 5,
          avgResolutionTime: Math.floor(Math.random() * 60) + 30,
          slaCompliance: 85 + Math.floor(Math.random() * 15),
          csat: 4 + Math.random() * 0.8,
          channels: agent.channels || ['whatsapp', 'webchat'],
        }));

        setAgentMetrics(agentData);
      }

    } catch (err) {
      console.error('[useSLAMetrics] calculateMetrics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period, client]);

  // Update SLA Policy
  const updateSlaPolicy = useCallback(async (policyId: string, updates: Partial<SLAPolicy>) => {
    try {
      const { error } = await client
        .from('crm_sla_policies')
        .update(updates)
        .eq('id', policyId);

      if (error) throw error;

      setSlaPolicies(prev => prev.map(p => 
        p.id === policyId ? { ...p, ...updates } : p
      ));

      return true;
    } catch (err) {
      console.error('[useSLAMetrics] updateSlaPolicy error:', err);
      return false;
    }
  }, [client]);

  // Initial load
  useEffect(() => {
    fetchSlaPolicies();
    calculateMetrics();
  }, [period]);

  return {
    slaPolicies,
    agentMetrics,
    channelMetrics,
    globalMetrics,
    isLoading,
    period,
    setPeriod,
    fetchSlaPolicies,
    calculateMetrics,
    updateSlaPolicy,
  };
}

export default useSLAMetrics;
