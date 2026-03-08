import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIUsagePricingRule {
  id: string;
  decision_type: string;
  display_name: string;
  description: string | null;
  module_key: string | null;
  base_price_per_unit: number;
  currency: string;
  price_per_1k_tokens: number;
  free_tier_units: number;
  is_active: boolean;
  tier_multipliers: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface AIUsageSummary {
  period: { start: string; end: string };
  totals: { amount: number; decisions: number; tokens: number };
  by_decision: Record<string, { count: number; total: number; tokens: number }>;
  by_module: Record<string, { count: number; total: number }>;
  by_day: Array<{ day: string; count: number; total: number }>;
  by_model: Record<string, { count: number; tokens: number }>;
  recent_events: any[];
}

export interface AIUsageInvoice {
  id: string;
  installation_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_decisions: number;
  total_tokens: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  line_items: any[];
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface CostSimulation {
  monthly: {
    total_decisions: number;
    billable_decisions: number;
    free_tier_used: number;
    total_tokens: number;
    decision_cost: number;
    token_cost: number;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  annual_estimate: number;
  pricing_rule: AIUsagePricingRule | null;
}

export function useAIUsagePricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [pricingRules, setPricingRules] = useState<AIUsagePricingRule[]>([]);
  const [usageSummary, setUsageSummary] = useState<AIUsageSummary | null>(null);
  const [invoices, setInvoices] = useState<AIUsageInvoice[]>([]);
  const [simulation, setSimulation] = useState<CostSimulation | null>(null);

  const recordAIDecision = useCallback(async (params: {
    installation_id: string;
    decision_type: string;
    module_key?: string;
    ai_model?: string;
    tokens?: { prompt: number; completion: number };
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-usage-billing', {
        body: { action: 'record_decision', ...params }
      });
      if (error) throw error;
      return data?.success ? data.data : null;
    } catch (err) {
      console.error('[useAIUsagePricing] recordAIDecision error:', err);
      return null;
    }
  }, []);

  const fetchUsageSummary = useCallback(async (installationId: string, periodStart?: string, periodEnd?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-usage-billing', {
        body: { action: 'get_usage_summary', installation_id: installationId, period_start: periodStart, period_end: periodEnd }
      });
      if (error) throw error;
      if (data?.success) {
        setUsageSummary(data.data);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useAIUsagePricing] fetchUsageSummary error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPricingRules = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-usage-billing', {
        body: { action: 'get_pricing_rules' }
      });
      if (error) throw error;
      if (data?.success) {
        setPricingRules(data.data);
        return data.data;
      }
      return [];
    } catch (err) {
      console.error('[useAIUsagePricing] fetchPricingRules error:', err);
      return [];
    }
  }, []);

  const generateInvoice = useCallback(async (installationId: string, periodStart?: string, periodEnd?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-usage-billing', {
        body: { action: 'generate_invoice', installation_id: installationId, period_start: periodStart, period_end: periodEnd }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Factura generada');
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useAIUsagePricing] generateInvoice error:', err);
      toast.error('Error al generar factura');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async (installationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-usage-billing', {
        body: { action: 'get_invoices', installation_id: installationId }
      });
      if (error) throw error;
      if (data?.success) {
        setInvoices(data.data);
        return data.data;
      }
      return [];
    } catch (err) {
      console.error('[useAIUsagePricing] fetchInvoices error:', err);
      return [];
    }
  }, []);

  const simulateCost = useCallback(async (params: {
    decisions_per_month: number;
    avg_tokens_per_decision: number;
    decision_type: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-usage-billing', {
        body: { action: 'simulate_cost', simulation: params }
      });
      if (error) throw error;
      if (data?.success) {
        setSimulation(data.data);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useAIUsagePricing] simulateCost error:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    pricingRules,
    usageSummary,
    invoices,
    simulation,
    recordAIDecision,
    fetchUsageSummary,
    fetchPricingRules,
    generateInvoice,
    fetchInvoices,
    simulateCost,
  };
}

export default useAIUsagePricing;
