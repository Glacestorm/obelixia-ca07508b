import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIBillingRequest {
  action: 'record_decision' | 'get_usage_summary' | 'generate_invoice' | 'get_pricing_rules' | 'simulate_cost' | 'get_invoices';
  installation_id?: string;
  decision_type?: string;
  module_key?: string;
  ai_model?: string;
  tokens?: { prompt: number; completion: number };
  period_start?: string;
  period_end?: string;
  simulation?: { decisions_per_month: number; avg_tokens_per_decision: number; decision_type: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as AIBillingRequest;
    const { action } = body;

    console.log(`[ai-usage-billing] Processing action: ${action}`);

    switch (action) {
      case 'record_decision': {
        const { installation_id, decision_type, module_key, ai_model, tokens } = body;
        if (!installation_id || !decision_type) throw new Error('installation_id and decision_type required');

        // Get pricing rule
        let query = supabase
          .from('ai_usage_pricing')
          .select('*')
          .eq('decision_type', decision_type)
          .eq('is_active', true);

        if (module_key) query = query.eq('module_key', module_key);

        const { data: rules } = await query.limit(1).maybeSingle();
        const rule = rules as any;

        const totalTokens = (tokens?.prompt || 0) + (tokens?.completion || 0);
        const tokenCost = rule ? (totalTokens / 1000) * (rule.price_per_1k_tokens || 0) : 0;
        const unitCost = rule?.base_price_per_unit || 0.02;
        const totalAmount = unitCost + tokenCost;

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const eventData = {
          installation_id,
          module_key: module_key || rule?.module_key || 'ai',
          event_type: 'ai_decision',
          event_name: decision_type,
          quantity: 1,
          unit_price: totalAmount,
          total_amount: totalAmount,
          currency: rule?.currency || 'EUR',
          billing_period_start: periodStart,
          billing_period_end: periodEnd,
          ai_model_used: ai_model || 'google/gemini-2.5-flash',
          tokens_consumed: totalTokens,
          decision_type,
          prompt_tokens: tokens?.prompt || 0,
          completion_tokens: tokens?.completion || 0,
          metadata: { rule_id: rule?.id, token_cost: tokenCost, unit_cost: unitCost },
        };

        const { error } = await supabase.from('usage_billing_events').insert(eventData);
        if (error) throw error;

        return new Response(JSON.stringify({
          success: true, action,
          data: { recorded: true, amount: totalAmount, currency: rule?.currency || 'EUR', tokens: totalTokens },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_usage_summary': {
        const { installation_id, period_start, period_end } = body;
        if (!installation_id) throw new Error('installation_id required');

        const now = new Date();
        const pStart = period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const pEnd = period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: events } = await supabase
          .from('usage_billing_events')
          .select('*')
          .eq('installation_id', installation_id)
          .eq('event_type', 'ai_decision')
          .gte('created_at', pStart)
          .lte('created_at', pEnd + 'T23:59:59')
          .order('created_at', { ascending: false });

        const allEvents = (events || []) as any[];

        // Aggregate by decision_type
        const byDecision: Record<string, { count: number; total: number; tokens: number }> = {};
        const byModule: Record<string, { count: number; total: number }> = {};
        const byDay: Record<string, { count: number; total: number }> = {};
        const byModel: Record<string, { count: number; tokens: number }> = {};

        let totalAmount = 0;
        let totalDecisions = 0;
        let totalTokens = 0;

        for (const ev of allEvents) {
          const dt = ev.decision_type || ev.event_name || 'unknown';
          const mod = ev.module_key || 'unknown';
          const day = ev.created_at?.split('T')[0] || 'unknown';
          const model = ev.ai_model_used || 'unknown';
          const amount = Number(ev.total_amount) || 0;
          const tkns = Number(ev.tokens_consumed) || 0;

          totalAmount += amount;
          totalDecisions++;
          totalTokens += tkns;

          if (!byDecision[dt]) byDecision[dt] = { count: 0, total: 0, tokens: 0 };
          byDecision[dt].count++;
          byDecision[dt].total += amount;
          byDecision[dt].tokens += tkns;

          if (!byModule[mod]) byModule[mod] = { count: 0, total: 0 };
          byModule[mod].count++;
          byModule[mod].total += amount;

          if (!byDay[day]) byDay[day] = { count: 0, total: 0 };
          byDay[day].count++;
          byDay[day].total += amount;

          if (!byModel[model]) byModel[model] = { count: 0, tokens: 0 };
          byModel[model].count++;
          byModel[model].tokens += tkns;
        }

        return new Response(JSON.stringify({
          success: true, action,
          data: {
            period: { start: pStart, end: pEnd },
            totals: { amount: totalAmount, decisions: totalDecisions, tokens: totalTokens },
            by_decision: byDecision,
            by_module: byModule,
            by_day: Object.entries(byDay).map(([day, v]) => ({ day, ...v })).sort((a, b) => a.day.localeCompare(b.day)),
            by_model: byModel,
            recent_events: allEvents.slice(0, 20),
          },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'generate_invoice': {
        const { installation_id, period_start, period_end } = body;
        if (!installation_id) throw new Error('installation_id required');

        const now = new Date();
        const pStart = period_start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const pEnd = period_end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Get all AI events for the period
        const { data: events } = await supabase
          .from('usage_billing_events')
          .select('*')
          .eq('installation_id', installation_id)
          .eq('event_type', 'ai_decision')
          .gte('created_at', pStart)
          .lte('created_at', pEnd + 'T23:59:59');

        const allEvents = (events || []) as any[];

        // Build line items by decision type
        const lineItems: Record<string, any> = {};
        let totalDecisions = 0;
        let totalTokens = 0;
        let subtotal = 0;

        for (const ev of allEvents) {
          const dt = ev.decision_type || ev.event_name;
          if (!lineItems[dt]) lineItems[dt] = { decision_type: dt, count: 0, tokens: 0, amount: 0 };
          lineItems[dt].count++;
          lineItems[dt].tokens += Number(ev.tokens_consumed) || 0;
          lineItems[dt].amount += Number(ev.total_amount) || 0;
          totalDecisions++;
          totalTokens += Number(ev.tokens_consumed) || 0;
          subtotal += Number(ev.total_amount) || 0;
        }

        const taxRate = 0.21; // IVA
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;
        const invoiceNumber = `AI-${installation_id.slice(0, 8).toUpperCase()}-${pStart.replace(/-/g, '')}`;

        const invoice = {
          installation_id,
          invoice_number: invoiceNumber,
          period_start: pStart,
          period_end: pEnd,
          total_decisions: totalDecisions,
          total_tokens: totalTokens,
          subtotal,
          discount_amount: 0,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency: 'EUR',
          status: 'draft',
          line_items: Object.values(lineItems),
          issued_at: new Date().toISOString(),
        };

        const { data: inserted, error } = await supabase
          .from('ai_usage_invoices')
          .insert(invoice)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true, action, data: inserted,
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_pricing_rules': {
        const { data: rules, error } = await supabase
          .from('ai_usage_pricing')
          .select('*')
          .eq('is_active', true)
          .order('module_key');

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true, action, data: rules || [],
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'simulate_cost': {
        const { simulation } = body;
        if (!simulation) throw new Error('simulation params required');

        const { data: rule } = await supabase
          .from('ai_usage_pricing')
          .select('*')
          .eq('decision_type', simulation.decision_type)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        const r = rule as any;
        const unitPrice = r?.base_price_per_unit || 0.02;
        const tokenPrice = r?.price_per_1k_tokens || 0.002;
        const freeTier = r?.free_tier_units || 0;

        const billableDecisions = Math.max(0, simulation.decisions_per_month - freeTier);
        const totalTokens = simulation.decisions_per_month * simulation.avg_tokens_per_decision;
        const decisionCost = billableDecisions * unitPrice;
        const tokenCost = (totalTokens / 1000) * tokenPrice;
        const subtotal = decisionCost + tokenCost;
        const tax = subtotal * 0.21;

        return new Response(JSON.stringify({
          success: true, action,
          data: {
            monthly: {
              total_decisions: simulation.decisions_per_month,
              billable_decisions: billableDecisions,
              free_tier_used: Math.min(simulation.decisions_per_month, freeTier),
              total_tokens: totalTokens,
              decision_cost: decisionCost,
              token_cost: tokenCost,
              subtotal,
              tax,
              total: subtotal + tax,
              currency: r?.currency || 'EUR',
            },
            annual_estimate: (subtotal + tax) * 12,
            pricing_rule: r || null,
          },
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_invoices': {
        const { installation_id } = body;
        if (!installation_id) throw new Error('installation_id required');

        const { data, error } = await supabase
          .from('ai_usage_invoices')
          .select('*')
          .eq('installation_id', installation_id)
          .order('period_start', { ascending: false })
          .limit(12);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true, action, data: data || [],
          timestamp: new Date().toISOString()
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

  } catch (error) {
    console.error('[ai-usage-billing] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
