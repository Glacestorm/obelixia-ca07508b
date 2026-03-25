import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InvocationRecord {
  id: string;
  agent_code: string;
  outcome_status: string;
  confidence_score: number | null;
  execution_time_ms: number | null;
  escalated_to: string | null;
  escalation_reason: string | null;
  input_summary: string | null;
  response_summary: string | null;
  routing_reason: string | null;
  supervisor_code: string | null;
  created_at: string;
}

export interface ObservabilityKPIs {
  totalInvocations: number;
  successRate: number;
  avgConfidence: number;
  avgLatency: number;
  escalationRate: number;
  p95Latency: number;
  autonomousDecisions: number;
  humanReviews: number;
}

export interface AgentPerformance {
  agentCode: string;
  invocations: number;
  successRate: number;
  avgConfidence: number;
  avgLatency: number;
  escalations: number;
}

export interface EscalationEdge {
  from: string;
  to: string;
  count: number;
  reasons: string[];
}

export function useObservabilityData() {
  const [invocations, setInvocations] = useState<InvocationRecord[]>([]);
  const [kpis, setKpis] = useState<ObservabilityKPIs | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [escalationEdges, setEscalationEdges] = useState<EscalationEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 86400000),
    to: new Date(),
  });

  const fetchInvocations = useCallback(async (from: Date, to: Date, agentFilter?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('erp_ai_agent_invocations')
        .select('id, agent_code, outcome_status, confidence_score, execution_time_ms, escalated_to, escalation_reason, input_summary, response_summary, routing_reason, supervisor_code, created_at')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (agentFilter && agentFilter !== 'all') {
        query = query.eq('agent_code', agentFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = (data || []) as InvocationRecord[];
      setInvocations(records);
      computeKPIs(records);
      computeAgentPerformance(records);
      computeEscalationEdges(records);
    } catch (err) {
      console.error('[useObservabilityData] fetchInvocations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const computeKPIs = (records: InvocationRecord[]) => {
    if (records.length === 0) {
      setKpis({ totalInvocations: 0, successRate: 0, avgConfidence: 0, avgLatency: 0, escalationRate: 0, p95Latency: 0, autonomousDecisions: 0, humanReviews: 0 });
      return;
    }

    const successes = records.filter(r => r.outcome_status === 'success').length;
    const confidences = records.filter(r => r.confidence_score != null).map(r => r.confidence_score!);
    const latencies = records.filter(r => r.execution_time_ms != null).map(r => r.execution_time_ms!).sort((a, b) => a - b);
    const escalated = records.filter(r => r.escalated_to).length;
    const autonomous = records.filter(r => !r.escalated_to && r.outcome_status === 'success').length;

    setKpis({
      totalInvocations: records.length,
      successRate: Math.round((successes / records.length) * 100),
      avgConfidence: confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0,
      avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
      escalationRate: Math.round((escalated / records.length) * 100),
      p95Latency: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] || 0 : 0,
      autonomousDecisions: autonomous,
      humanReviews: escalated,
    });
  };

  const computeAgentPerformance = (records: InvocationRecord[]) => {
    const byAgent = new Map<string, InvocationRecord[]>();
    records.forEach(r => {
      const list = byAgent.get(r.agent_code) || [];
      list.push(r);
      byAgent.set(r.agent_code, list);
    });

    const perf: AgentPerformance[] = Array.from(byAgent.entries()).map(([code, recs]) => {
      const successes = recs.filter(r => r.outcome_status === 'success').length;
      const confs = recs.filter(r => r.confidence_score != null).map(r => r.confidence_score!);
      const lats = recs.filter(r => r.execution_time_ms != null).map(r => r.execution_time_ms!);
      return {
        agentCode: code,
        invocations: recs.length,
        successRate: Math.round((successes / recs.length) * 100),
        avgConfidence: confs.length > 0 ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 0,
        avgLatency: lats.length > 0 ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
        escalations: recs.filter(r => r.escalated_to).length,
      };
    }).sort((a, b) => b.invocations - a.invocations);

    setAgentPerformance(perf);
  };

  const computeEscalationEdges = (records: InvocationRecord[]) => {
    const edgeMap = new Map<string, { count: number; reasons: Set<string> }>();
    records.filter(r => r.escalated_to).forEach(r => {
      const key = `${r.agent_code}→${r.escalated_to}`;
      const edge = edgeMap.get(key) || { count: 0, reasons: new Set<string>() };
      edge.count++;
      if (r.escalation_reason) edge.reasons.add(r.escalation_reason);
      edgeMap.set(key, edge);
    });

    setEscalationEdges(
      Array.from(edgeMap.entries()).map(([key, val]) => {
        const [from, to] = key.split('→');
        return { from, to, count: val.count, reasons: Array.from(val.reasons) };
      }).sort((a, b) => b.count - a.count)
    );
  };

  const refresh = useCallback((agentFilter?: string) => {
    fetchInvocations(dateRange.from, dateRange.to, agentFilter);
  }, [dateRange, fetchInvocations]);

  return {
    invocations,
    kpis,
    agentPerformance,
    escalationEdges,
    loading,
    dateRange,
    setDateRange,
    refresh,
    fetchInvocations,
  };
}
