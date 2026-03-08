import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UsageBillingEvent {
  id: string;
  installation_id: string;
  module_key: string;
  event_type: string;
  event_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  billed: boolean;
  billed_at: string | null;
  invoice_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageSummary {
  module_key: string;
  event_name: string;
  total_quantity: number;
  total_amount: number;
  currency: string;
  event_count: number;
}

export interface BillingRule {
  id: string;
  module_key: string;
  event_type: string;
  description: string | null;
  unit_price: number;
  currency: string;
  free_tier_limit: number;
  tier_pricing: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useUsageBilling() {
  const [events, setEvents] = useState<UsageBillingEvent[]>([]);
  const [summary, setSummary] = useState<UsageSummary[]>([]);
  const [rules, setRules] = useState<BillingRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  const fetchEvents = useCallback(async (installationId: string, limit = 50) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('usage_billing_events')
        .select('*')
        .eq('installation_id', installationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setEvents((data || []) as any);
    } catch (err) {
      console.error('[useUsageBilling] fetchEvents error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (installationId: string) => {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_usage_billing_summary', {
        p_installation_id: installationId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) throw error;
      const summaryData = (data || []) as any as UsageSummary[];
      setSummary(summaryData);
      setMonthlyTotal(summaryData.reduce((acc: number, s: UsageSummary) => acc + Number(s.total_amount), 0));
    } catch (err) {
      console.error('[useUsageBilling] fetchSummary error:', err);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('usage_billing_rules')
        .select('*')
        .eq('is_active', true)
        .order('module_key');

      if (error) throw error;
      setRules((data || []) as any);
    } catch (err) {
      console.error('[useUsageBilling] fetchRules error:', err);
    }
  }, []);

  const recordUsage = useCallback(async (params: {
    installation_id: string;
    module_key: string;
    event_name: string;
    quantity?: number;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      // Get pricing rule
      const { data: ruleData } = await (supabase
        .from('usage_billing_rules') as any)
        .select('*')
        .eq('module_key', params.module_key)
        .eq('event_type', params.event_name)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      const rule = ruleData as { unit_price?: number; currency?: string; free_tier_limit?: number } | null;

      const unitPrice = rule?.unit_price || 0;
      const quantity = params.quantity || 1;

      const insertData: Record<string, unknown> = {
        installation_id: params.installation_id,
        module_key: params.module_key,
        event_type: 'usage',
        event_name: params.event_name,
        quantity,
        unit_price: unitPrice,
        total_amount: unitPrice * quantity,
        currency: rule?.currency || 'EUR',
        billing_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        billing_period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        metadata: params.metadata || {},
      };

      const { error } = await supabase
        .from('usage_billing_events')
        .insert(insertData as any);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[useUsageBilling] recordUsage error:', err);
      return false;
    }
  }, []);

  const saveRule = useCallback(async (rule: Partial<BillingRule> & { module_key: string; event_type: string }) => {
    try {
      const { error } = await supabase
        .from('usage_billing_rules')
        .upsert({
          module_key: rule.module_key,
          event_type: rule.event_type,
          description: rule.description || null,
          unit_price: rule.unit_price || 0,
          currency: rule.currency || 'EUR',
          free_tier_limit: rule.free_tier_limit || 0,
          tier_pricing: rule.tier_pricing || null,
          is_active: rule.is_active !== false,
        } as any, { onConflict: 'module_key,event_type' });

      if (error) throw error;
      toast.success('Regla de facturación guardada');
      await fetchRules();
      return true;
    } catch (err) {
      console.error('[useUsageBilling] saveRule error:', err);
      toast.error('Error al guardar regla');
      return false;
    }
  }, [fetchRules]);

  return {
    events,
    summary,
    rules,
    isLoading,
    monthlyTotal,
    fetchEvents,
    fetchSummary,
    fetchRules,
    recordUsage,
    saveRule,
  };
}
