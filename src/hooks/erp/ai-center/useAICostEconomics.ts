/**
 * useAICostEconomics — Phase 4: AI Economics & Budgets
 * Tracks token usage, cost per agent, budget consumption, and ROI metrics.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentCostRecord {
  agentCode: string;
  agentName: string;
  domain: string;
  invocations: number;
  totalTokens: number;
  estimatedCost: number;
  avgCostPerCall: number;
  successRate: number;
  roi: number; // estimated value generated / cost
}

export interface CostTrend {
  date: string;
  totalCost: number;
  invocations: number;
  avgCost: number;
}

export interface BudgetStatus {
  monthlyBudget: number;
  consumed: number;
  remaining: number;
  consumedPercentage: number;
  projectedEnd: number; // projected month-end cost
  status: 'on_track' | 'warning' | 'exceeded';
  daysRemaining: number;
}

export interface CostKPIs {
  totalSpend: number;
  totalInvocations: number;
  avgCostPerCall: number;
  costSavingsVsManual: number;
  topCostAgent: string;
  budgetUtilization: number;
}

// Estimated cost per 1K tokens (simplified model)
const COST_PER_1K_TOKENS = 0.002; // EUR
const ESTIMATED_TOKENS_PER_CALL = 800;
const MANUAL_COST_PER_TASK = 12; // EUR - estimated human cost per equivalent task

export function useAICostEconomics() {
  const [agentCosts, setAgentCosts] = useState<AgentCostRecord[]>([]);
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [kpis, setKpis] = useState<CostKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const fetchCostData = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
      // Fetch invocations with agent info
      const { data: invocations, error: invErr } = await supabase
        .from('erp_ai_agent_invocations')
        .select('agent_code, outcome_status, execution_time_ms, confidence_score, created_at')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })
        .limit(1000);

      if (invErr) throw invErr;

      const records = invocations || [];

      // Fetch agent registry for names
      const { data: agents } = await supabase
        .from('erp_ai_agents_registry')
        .select('agent_code, name, module_domain');

      const agentMap = new Map<string, { name: string; domain: string }>();
      (agents || []).forEach((a: any) => {
        agentMap.set(a.agent_code, { name: a.name, domain: a.module_domain || 'general' });
      });

      // Compute per-agent costs
      const byAgent = new Map<string, any[]>();
      records.forEach((r: any) => {
        const list = byAgent.get(r.agent_code) || [];
        list.push(r);
        byAgent.set(r.agent_code, list);
      });

      const agentCostList: AgentCostRecord[] = Array.from(byAgent.entries()).map(([code, recs]) => {
        const totalTokens = recs.length * ESTIMATED_TOKENS_PER_CALL;
        const estimatedCost = (totalTokens / 1000) * COST_PER_1K_TOKENS;
        const successes = recs.filter((r: any) => r.outcome_status === 'success').length;
        const successRate = recs.length > 0 ? Math.round((successes / recs.length) * 100) : 0;
        const manualEquivalent = successes * MANUAL_COST_PER_TASK;
        const info = agentMap.get(code);

        return {
          agentCode: code,
          agentName: info?.name || code,
          domain: info?.domain || 'general',
          invocations: recs.length,
          totalTokens,
          estimatedCost: Math.round(estimatedCost * 100) / 100,
          avgCostPerCall: recs.length > 0 ? Math.round((estimatedCost / recs.length) * 1000) / 1000 : 0,
          successRate,
          roi: estimatedCost > 0 ? Math.round((manualEquivalent / estimatedCost) * 10) / 10 : 0,
        };
      }).sort((a, b) => b.estimatedCost - a.estimatedCost);

      setAgentCosts(agentCostList);

      // Compute daily trends
      const byDay = new Map<string, { cost: number; count: number }>();
      records.forEach((r: any) => {
        const day = r.created_at.split('T')[0];
        const entry = byDay.get(day) || { cost: 0, count: 0 };
        entry.cost += (ESTIMATED_TOKENS_PER_CALL / 1000) * COST_PER_1K_TOKENS;
        entry.count++;
        byDay.set(day, entry);
      });

      const trends: CostTrend[] = Array.from(byDay.entries())
        .map(([date, val]) => ({
          date,
          totalCost: Math.round(val.cost * 100) / 100,
          invocations: val.count,
          avgCost: val.count > 0 ? Math.round((val.cost / val.count) * 1000) / 1000 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setCostTrends(trends);

      // Compute KPIs
      const totalSpend = agentCostList.reduce((s, a) => s + a.estimatedCost, 0);
      const totalInvocations = records.length;
      const topAgent = agentCostList[0];

      setKpis({
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalInvocations,
        avgCostPerCall: totalInvocations > 0 ? Math.round((totalSpend / totalInvocations) * 1000) / 1000 : 0,
        costSavingsVsManual: Math.round(
          agentCostList.reduce((s, a) => s + (a.successRate / 100) * a.invocations * MANUAL_COST_PER_TASK, 0) - totalSpend
        ),
        topCostAgent: topAgent?.agentName || '-',
        budgetUtilization: 0, // set below
      });

      // Compute budget status
      const monthlyBudget = 500; // EUR — configurable
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfMonth = now.getDate();
      const daysRemaining = daysInMonth - dayOfMonth;
      const dailyRate = dayOfMonth > 0 ? totalSpend / dayOfMonth : 0;
      const projectedEnd = Math.round((dailyRate * daysInMonth) * 100) / 100;

      const consumedPct = monthlyBudget > 0 ? Math.round((totalSpend / monthlyBudget) * 100) : 0;
      let status: BudgetStatus['status'] = 'on_track';
      if (consumedPct > 100) status = 'exceeded';
      else if (consumedPct > 80 || projectedEnd > monthlyBudget) status = 'warning';

      setBudgetStatus({
        monthlyBudget,
        consumed: Math.round(totalSpend * 100) / 100,
        remaining: Math.round((monthlyBudget - totalSpend) * 100) / 100,
        consumedPercentage: consumedPct,
        projectedEnd,
        status,
        daysRemaining,
      });

      if (kpis) {
        setKpis(prev => prev ? { ...prev, budgetUtilization: consumedPct } : prev);
      }
    } catch (err) {
      console.error('[useAICostEconomics] fetchCostData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchCostData(dateRange.from, dateRange.to);
  }, [dateRange, fetchCostData]);

  return {
    agentCosts,
    costTrends,
    budgetStatus,
    kpis,
    loading,
    dateRange,
    setDateRange,
    refresh,
    fetchCostData,
  };
}
