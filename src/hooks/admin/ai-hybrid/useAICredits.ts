/**
 * Hook para gestión de créditos y consumo de IA
 * Sistema Híbrido Universal - Fase 4
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// === INTERFACES ===
export type CreditTransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'adjustment';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CreditBalance {
  credentialId: string;
  providerId: string;
  providerName: string;
  balance: number;
  alertThreshold: number;
  lastUpdated: string;
  status: 'healthy' | 'low' | 'critical' | 'empty';
}

export interface CreditTransaction {
  id: string;
  credential_id: string;
  transaction_type: CreditTransactionType;
  amount: number;
  balance_after: number;
  balance_before: number;
  description: string | null;
  payment_reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}

export interface UsageRecord {
  id: string;
  provider_id: string;
  credential_id: string;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost: number;
  source_module: string;
  request_timestamp: string;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  byDay: Array<{ date: string; requests: number; cost: number }>;
}

export interface CostEstimate {
  promptTokens: number;
  estimatedCompletionTokens: number;
  estimatedCost: number;
  currency: string;
  model: string;
}

export interface CreditAlert {
  id: string;
  credential_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  threshold_percentage: number;
  current_balance: number;
  is_dismissed: boolean;
  created_at: string;
}

// Helper to parse JSON
const parseJsonField = <T>(field: Json | null, defaultValue: T): T => {
  if (!field) return defaultValue;
  try {
    if (typeof field === 'object') return field as unknown as T;
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

// === HOOK ===
export function useAICredits() {
  const [balances, setBalances] = useState<CreditBalance[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [alerts, setAlerts] = useState<CreditAlert[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const alertCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH BALANCES ===
  const fetchBalances = useCallback(async (companyId?: string, workspaceId?: string) => {
    try {
      const client = supabase as any;
      let query = client
        .from('ai_provider_credentials')
        .select(`
          id,
          provider_id,
          credits_balance,
          credits_alert_threshold,
          last_usage_check,
          provider:ai_providers(name)
        `)
        .eq('is_active', true);

      if (companyId) query = query.eq('company_id', companyId);
      if (workspaceId) query = query.eq('workspace_id', workspaceId);

      const { data, error } = await query;

      if (error) throw error;

      const mapped: CreditBalance[] = (data || []).map((c: any) => {
        const balance = Number(c.credits_balance) || 0;
        const threshold = Number(c.credits_alert_threshold) || 10;
        
        let status: CreditBalance['status'] = 'healthy';
        if (balance <= 0) status = 'empty';
        else if (balance <= threshold * 0.05) status = 'critical';
        else if (balance <= threshold * 0.2) status = 'low';

        return {
          credentialId: c.id,
          providerId: c.provider_id,
          providerName: c.provider?.name || 'Unknown',
          balance,
          alertThreshold: threshold,
          lastUpdated: c.last_usage_check || new Date().toISOString(),
          status,
        };
      });

      setBalances(mapped);
      return mapped;
    } catch (err) {
      console.error('[useAICredits] fetchBalances error:', err);
      return [];
    }
  }, []);

  // === FETCH TRANSACTIONS ===
  const fetchTransactions = useCallback(async (
    credentialId: string,
    limit: number = 50
  ): Promise<CreditTransaction[]> => {
    try {
      const client = supabase as any;
      const { data, error } = await client
        .from('ai_credits_transactions')
        .select('*')
        .eq('credential_id', credentialId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const mapped: CreditTransaction[] = (data || []).map((t: any) => ({
        id: t.id,
        credential_id: t.credential_id,
        transaction_type: t.transaction_type as CreditTransactionType,
        amount: Number(t.amount),
        balance_after: Number(t.balance_after),
        balance_before: Number(t.balance_before) || 0,
        description: t.description,
        payment_reference: t.payment_reference,
        metadata: parseJsonField<Record<string, unknown>>(t.metadata, null),
        created_at: t.created_at,
        created_by: t.created_by,
      }));

      setTransactions(mapped);
      return mapped;
    } catch (err) {
      console.error('[useAICredits] fetchTransactions error:', err);
      return [];
    }
  }, []);

  // === FETCH ALERTS ===
  const fetchAlerts = useCallback(async (credentialId?: string) => {
    try {
      const client = supabase as any;
      let query = client
        .from('ai_credit_alerts')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (credentialId) {
        query = query.eq('credential_id', credentialId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: CreditAlert[] = (data || []).map((a: any) => ({
        id: a.id,
        credential_id: a.credential_id,
        alert_type: a.alert_type,
        severity: (a.alert_type?.includes('critical') ? 'critical' : 
                  a.alert_type?.includes('low') ? 'warning' : 'info') as AlertSeverity,
        message: a.message,
        threshold_percentage: Number(a.threshold_percentage) || 0,
        current_balance: Number(a.current_balance) || 0,
        is_dismissed: a.is_dismissed ?? false,
        created_at: a.created_at,
      }));

      setAlerts(mapped);
      return mapped;
    } catch (err) {
      console.error('[useAICredits] fetchAlerts error:', err);
      return [];
    }
  }, []);

  // === RECORD USAGE ===
  const recordUsage = useCallback(async (
    credentialId: string,
    usage: {
      providerId: string;
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalCost: number;
      sourceModule: string;
      userId?: string;
    }
  ): Promise<boolean> => {
    try {
      const client = supabase as any;
      
      // Insert usage log
      const { error: logError } = await client
        .from('ai_usage_logs')
        .insert({
          provider_id: usage.providerId,
          credential_id: credentialId,
          model_used: usage.model,
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          total_cost: usage.totalCost,
          source_module: usage.sourceModule,
          user_id: usage.userId,
          success: true,
        });

      if (logError) throw logError;

      // Update balance
      const currentBalance = balances.find(b => b.credentialId === credentialId);
      if (currentBalance) {
        const newBalance = currentBalance.balance - usage.totalCost;

        const { error: updateError } = await client
          .from('ai_provider_credentials')
          .update({
            credits_balance: newBalance,
            last_usage_check: new Date().toISOString(),
          })
          .eq('id', credentialId);

        if (updateError) throw updateError;

        // Record transaction
        await client
          .from('ai_credits_transactions')
          .insert({
            credential_id: credentialId,
            transaction_type: 'usage',
            amount: -usage.totalCost,
            balance_after: newBalance,
            balance_before: currentBalance.balance,
            description: `${usage.model}: ${usage.promptTokens + usage.completionTokens} tokens`,
            metadata: {
              model: usage.model,
              prompt_tokens: usage.promptTokens,
              completion_tokens: usage.completionTokens,
              source_module: usage.sourceModule,
            },
          });

        // Check for alerts
        await checkAndCreateAlerts(credentialId, newBalance, currentBalance.alertThreshold);
      }

      return true;
    } catch (err) {
      console.error('[useAICredits] recordUsage error:', err);
      return false;
    }
  }, [balances]);

  // === CHECK AND CREATE ALERTS ===
  const checkAndCreateAlerts = useCallback(async (
    credentialId: string,
    currentBalance: number,
    threshold: number
  ) => {
    const percentRemaining = (currentBalance / threshold) * 100;

    let alertType: string | null = null;
    let message = '';

    if (currentBalance <= 0) {
      alertType = 'credits_depleted';
      message = 'Créditos agotados. Las solicitudes de IA externa están pausadas.';
    } else if (percentRemaining <= 5) {
      alertType = 'credits_critical';
      message = `Solo queda ${percentRemaining.toFixed(1)}% de créditos. Recarga urgente recomendada.`;
    } else if (percentRemaining <= 20) {
      alertType = 'credits_low';
      message = `Créditos bajos: ${percentRemaining.toFixed(1)}% restante.`;
    }

    if (alertType) {
      const client = supabase as any;
      
      // Check if alert already exists
      const { data: existing } = await client
        .from('ai_credit_alerts')
        .select('id')
        .eq('credential_id', credentialId)
        .eq('alert_type', alertType)
        .eq('is_dismissed', false)
        .single();

      if (!existing) {
        await client
          .from('ai_credit_alerts')
          .insert({
            credential_id: credentialId,
            alert_type: alertType,
            message,
            threshold_percentage: percentRemaining,
            current_balance: currentBalance,
          });

        // Show toast
        if (alertType === 'credits_depleted' || alertType === 'credits_critical') {
          toast.error(message);
        } else {
          toast.warning(message);
        }
      }
    }
  }, []);

  // === GET USAGE STATS ===
  const getUsageStats = useCallback(async (
    credentialId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<UsageStats> => {
    setIsLoading(true);
    try {
      const client = supabase as any;
      let query = client
        .from('ai_usage_logs')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('success', true);

      if (dateRange) {
        query = query
          .gte('request_timestamp', dateRange.start.toISOString())
          .lte('request_timestamp', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats: UsageStats = {
        totalRequests: data?.length || 0,
        totalTokens: 0,
        totalCost: 0,
        byProvider: {},
        byModel: {},
        byDay: [],
      };

      const dayMap: Record<string, { requests: number; cost: number }> = {};

      for (const record of data || []) {
        const tokens = (record.prompt_tokens || 0) + (record.completion_tokens || 0);
        const cost = Number(record.total_cost) || 0;

        stats.totalTokens += tokens;
        stats.totalCost += cost;

        if (!stats.byProvider[record.provider_id]) {
          stats.byProvider[record.provider_id] = { requests: 0, tokens: 0, cost: 0 };
        }
        stats.byProvider[record.provider_id].requests++;
        stats.byProvider[record.provider_id].tokens += tokens;
        stats.byProvider[record.provider_id].cost += cost;

        const model = record.model_used || 'unknown';
        if (!stats.byModel[model]) {
          stats.byModel[model] = { requests: 0, tokens: 0, cost: 0 };
        }
        stats.byModel[model].requests++;
        stats.byModel[model].tokens += tokens;
        stats.byModel[model].cost += cost;

        const day = record.request_timestamp?.split('T')[0] || 'unknown';
        if (!dayMap[day]) {
          dayMap[day] = { requests: 0, cost: 0 };
        }
        dayMap[day].requests++;
        dayMap[day].cost += cost;
      }

      stats.byDay = Object.entries(dayMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setUsageStats(stats);
      return stats;
    } catch (err) {
      console.error('[useAICredits] getUsageStats error:', err);
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        byProvider: {},
        byModel: {},
        byDay: [],
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === ESTIMATE COST ===
  const estimateCost = useCallback((
    prompt: string,
    model: string,
    pricing: { inputPer1k: number; outputPer1k: number }
  ): CostEstimate => {
    const promptTokens = Math.ceil(prompt.length / 3);
    const estimatedCompletionTokens = Math.ceil(promptTokens * 1.5);

    const inputCost = (promptTokens / 1000) * pricing.inputPer1k;
    const outputCost = (estimatedCompletionTokens / 1000) * pricing.outputPer1k;

    return {
      promptTokens,
      estimatedCompletionTokens,
      estimatedCost: inputCost + outputCost,
      currency: 'USD',
      model,
    };
  }, []);

  // === ADD CREDITS ===
  const addCredits = useCallback(async (
    credentialId: string,
    amount: number,
    description?: string,
    reference?: string
  ): Promise<boolean> => {
    try {
      const client = supabase as any;
      const currentBalance = balances.find(b => b.credentialId === credentialId);
      const newBalance = (currentBalance?.balance || 0) + amount;

      const { error: updateError } = await client
        .from('ai_provider_credentials')
        .update({ credits_balance: newBalance })
        .eq('id', credentialId);

      if (updateError) throw updateError;

      await client
        .from('ai_credits_transactions')
        .insert({
          credential_id: credentialId,
          transaction_type: 'purchase',
          amount,
          balance_after: newBalance,
          balance_before: currentBalance?.balance || 0,
          description: description || 'Recarga de créditos',
          payment_reference: reference,
        });

      // Resolve any credit alerts
      await client
        .from('ai_credit_alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('credential_id', credentialId)
        .eq('is_dismissed', false);

      toast.success(`${amount} créditos añadidos correctamente`);
      await fetchBalances();
      return true;
    } catch (err) {
      toast.error('Error al añadir créditos');
      return false;
    }
  }, [balances, fetchBalances]);

  // === RESOLVE ALERT ===
  const resolveAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const client = supabase as any;
      const { error } = await client
        .from('ai_credit_alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  // === GET LOW BALANCE CREDENTIALS ===
  const getLowBalanceCredentials = useCallback(() => {
    return balances.filter(b => b.status === 'low' || b.status === 'critical' || b.status === 'empty');
  }, [balances]);

  // === PERIODIC ALERT CHECK ===
  useEffect(() => {
    fetchBalances();
    fetchAlerts();

    alertCheckInterval.current = setInterval(() => {
      fetchAlerts();
    }, 60000);

    return () => {
      if (alertCheckInterval.current) {
        clearInterval(alertCheckInterval.current);
      }
    };
  }, [fetchBalances, fetchAlerts]);

  return {
    balances,
    transactions,
    alerts,
    usageStats,
    isLoading,
    fetchBalances,
    fetchTransactions,
    fetchAlerts,
    getUsageStats,
    recordUsage,
    addCredits,
    resolveAlert,
    estimateCost,
    getLowBalanceCredentials,
  };
}

export default useAICredits;
