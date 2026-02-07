import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  action: 'record_usage' | 'get_metrics' | 'get_dashboard' | 'get_provider_stats' | 'get_privacy_incidents';
  // For record_usage
  provider?: string;
  model?: string;
  tokens_input?: number;
  tokens_output?: number;
  latency_ms?: number;
  success?: boolean;
  error_type?: string;
  routing_mode?: string;
  data_classification?: string;
  was_anonymized?: boolean;
  cost_usd?: number;
  // For queries
  period?: 'hour' | 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
  group_by?: 'provider' | 'model' | 'hour' | 'day';
}

interface UsageMetric {
  timestamp: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  total_tokens: number;
  latency_ms: number;
  success: boolean;
  error_type: string | null;
  routing_mode: string;
  data_classification: string;
  was_anonymized: boolean;
  cost_usd: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json() as AnalyticsRequest;
    console.log(`[ai-analytics] Action: ${action}`);

    switch (action) {
      case 'record_usage': {
        const metric: UsageMetric = {
          timestamp: new Date().toISOString(),
          provider: params.provider || 'unknown',
          model: params.model || 'unknown',
          tokens_input: params.tokens_input || 0,
          tokens_output: params.tokens_output || 0,
          total_tokens: (params.tokens_input || 0) + (params.tokens_output || 0),
          latency_ms: params.latency_ms || 0,
          success: params.success !== false,
          error_type: params.error_type || null,
          routing_mode: params.routing_mode || 'hybrid_auto',
          data_classification: params.data_classification || 'public',
          was_anonymized: params.was_anonymized || false,
          cost_usd: params.cost_usd || 0,
        };

        const { error } = await supabase
          .from('ai_usage_metrics')
          .insert(metric);

        if (error) {
          console.error('[ai-analytics] Insert error:', error);
          // If table doesn't exist, return success anyway (metrics are optional)
          if (error.code === '42P01') {
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Metrics table not configured, skipping' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw error;
        }

        return new Response(JSON.stringify({ success: true, recorded: metric }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_metrics': {
        const period = params.period || 'day';
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'hour':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const { data, error } = await supabase
          .from('ai_usage_metrics')
          .select('*')
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: false });

        if (error) {
          if (error.code === '42P01') {
            return new Response(JSON.stringify({ 
              success: true, 
              metrics: [],
              summary: getEmptySummary()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw error;
        }

        const metrics = data || [];
        const summary = calculateSummary(metrics);

        return new Response(JSON.stringify({ 
          success: true, 
          metrics,
          summary,
          period,
          start_date: startDate.toISOString(),
          end_date: now.toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_dashboard': {
        const period = params.period || 'week';
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'hour':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const { data, error } = await supabase
          .from('ai_usage_metrics')
          .select('*')
          .gte('timestamp', startDate.toISOString())
          .order('timestamp', { ascending: true });

        if (error) {
          if (error.code === '42P01') {
            return new Response(JSON.stringify({ 
              success: true, 
              dashboard: getEmptyDashboard()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw error;
        }

        const metrics = data || [];
        const dashboard = buildDashboard(metrics, period);

        return new Response(JSON.stringify({ 
          success: true, 
          dashboard,
          period
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_provider_stats': {
        const period = params.period || 'month';
        const now = new Date();
        const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('ai_usage_metrics')
          .select('provider, model, tokens_input, tokens_output, cost_usd, latency_ms, success')
          .gte('timestamp', startDate.toISOString());

        if (error) {
          if (error.code === '42P01') {
            return new Response(JSON.stringify({ 
              success: true, 
              provider_stats: [],
              model_stats: []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw error;
        }

        const metrics = data || [];
        const providerStats = calculateProviderStats(metrics);
        const modelStats = calculateModelStats(metrics);

        return new Response(JSON.stringify({ 
          success: true, 
          provider_stats: providerStats,
          model_stats: modelStats
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_privacy_incidents': {
        const period = params.period || 'month';
        const now = new Date();
        const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('ai_usage_metrics')
          .select('timestamp, data_classification, was_anonymized, routing_mode, provider')
          .gte('timestamp', startDate.toISOString())
          .or('data_classification.eq.restricted,data_classification.eq.confidential,was_anonymized.eq.true');

        if (error) {
          if (error.code === '42P01') {
            return new Response(JSON.stringify({ 
              success: true, 
              privacy_incidents: [],
              summary: { total_blocked: 0, total_anonymized: 0, by_classification: {} }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw error;
        }

        const incidents = data || [];
        const privacySummary = calculatePrivacySummary(incidents);

        return new Response(JSON.stringify({ 
          success: true, 
          privacy_incidents: incidents,
          summary: privacySummary
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: `Unknown action: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('[ai-analytics] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getEmptySummary() {
  return {
    total_requests: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    avg_latency_ms: 0,
    success_rate: 100,
    error_count: 0,
    local_requests: 0,
    external_requests: 0,
    anonymized_requests: 0,
    blocked_requests: 0,
  };
}

function calculateSummary(metrics: any[]) {
  if (metrics.length === 0) return getEmptySummary();

  const totalRequests = metrics.length;
  const totalTokens = metrics.reduce((sum, m) => sum + (m.total_tokens || 0), 0);
  const totalCost = metrics.reduce((sum, m) => sum + (m.cost_usd || 0), 0);
  const totalLatency = metrics.reduce((sum, m) => sum + (m.latency_ms || 0), 0);
  const successCount = metrics.filter(m => m.success).length;
  const errorCount = totalRequests - successCount;
  
  const localRequests = metrics.filter(m => 
    m.provider === 'ollama' || m.routing_mode === 'local_only'
  ).length;
  const externalRequests = totalRequests - localRequests;
  
  const anonymizedRequests = metrics.filter(m => m.was_anonymized).length;
  const blockedRequests = metrics.filter(m => 
    m.data_classification === 'restricted' && m.provider !== 'ollama'
  ).length;

  return {
    total_requests: totalRequests,
    total_tokens: totalTokens,
    total_cost_usd: Math.round(totalCost * 10000) / 10000,
    avg_latency_ms: Math.round(totalLatency / totalRequests),
    success_rate: Math.round((successCount / totalRequests) * 100),
    error_count: errorCount,
    local_requests: localRequests,
    external_requests: externalRequests,
    anonymized_requests: anonymizedRequests,
    blocked_requests: blockedRequests,
  };
}

function getEmptyDashboard() {
  return {
    usage_over_time: [],
    provider_distribution: [],
    model_ranking: [],
    cost_breakdown: [],
    latency_trend: [],
    privacy_stats: {
      by_classification: [],
      anonymization_rate: 0,
      local_usage_rate: 0,
    },
    savings_estimate: {
      local_requests: 0,
      estimated_savings_usd: 0,
      external_cost_usd: 0,
    },
  };
}

function buildDashboard(metrics: any[], period: string) {
  if (metrics.length === 0) return getEmptyDashboard();

  // Usage over time
  const timeGroups = groupByTime(metrics, period);
  const usageOverTime = Object.entries(timeGroups).map(([time, items]) => ({
    time,
    requests: items.length,
    tokens: items.reduce((sum: number, m: any) => sum + (m.total_tokens || 0), 0),
    cost_usd: items.reduce((sum: number, m: any) => sum + (m.cost_usd || 0), 0),
  }));

  // Provider distribution
  const providerGroups = groupBy(metrics, 'provider');
  const providerDistribution = Object.entries(providerGroups).map(([provider, items]) => ({
    provider,
    requests: items.length,
    percentage: Math.round((items.length / metrics.length) * 100),
    tokens: items.reduce((sum: number, m: any) => sum + (m.total_tokens || 0), 0),
    cost_usd: items.reduce((sum: number, m: any) => sum + (m.cost_usd || 0), 0),
  }));

  // Model ranking
  const modelGroups = groupBy(metrics, 'model');
  const modelRanking = Object.entries(modelGroups)
    .map(([model, items]) => ({
      model,
      requests: items.length,
      tokens: items.reduce((sum: number, m: any) => sum + (m.total_tokens || 0), 0),
      avg_latency_ms: Math.round(
        items.reduce((sum: number, m: any) => sum + (m.latency_ms || 0), 0) / items.length
      ),
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  // Cost breakdown
  const costBreakdown = providerDistribution.map(p => ({
    provider: p.provider,
    cost_usd: p.cost_usd,
    percentage: metrics.length > 0 
      ? Math.round((p.cost_usd / metrics.reduce((sum, m) => sum + (m.cost_usd || 0), 0)) * 100) || 0
      : 0,
  }));

  // Latency trend
  const latencyTrend = usageOverTime.map(u => {
    const periodMetrics = timeGroups[u.time] || [];
    const avgLatency = periodMetrics.length > 0
      ? Math.round(periodMetrics.reduce((sum: number, m: any) => sum + (m.latency_ms || 0), 0) / periodMetrics.length)
      : 0;
    return {
      time: u.time,
      avg_latency_ms: avgLatency,
    };
  });

  // Privacy stats
  const classificationGroups = groupBy(metrics, 'data_classification');
  const byClassification = Object.entries(classificationGroups).map(([classification, items]) => ({
    classification,
    count: items.length,
    percentage: Math.round((items.length / metrics.length) * 100),
  }));

  const anonymizedCount = metrics.filter(m => m.was_anonymized).length;
  const localCount = metrics.filter(m => m.provider === 'ollama' || m.routing_mode === 'local_only').length;

  const privacyStats = {
    by_classification: byClassification,
    anonymization_rate: Math.round((anonymizedCount / metrics.length) * 100),
    local_usage_rate: Math.round((localCount / metrics.length) * 100),
  };

  // Savings estimate (assuming ~$0.002 per 1K tokens for external, $0 for local)
  const localMetrics = metrics.filter(m => m.provider === 'ollama' || m.routing_mode === 'local_only');
  const localTokens = localMetrics.reduce((sum, m) => sum + (m.total_tokens || 0), 0);
  const externalCost = metrics
    .filter(m => m.provider !== 'ollama' && m.routing_mode !== 'local_only')
    .reduce((sum, m) => sum + (m.cost_usd || 0), 0);
  const estimatedSavings = (localTokens / 1000) * 0.002;

  const savingsEstimate = {
    local_requests: localMetrics.length,
    local_tokens: localTokens,
    estimated_savings_usd: Math.round(estimatedSavings * 10000) / 10000,
    external_cost_usd: Math.round(externalCost * 10000) / 10000,
  };

  return {
    usage_over_time: usageOverTime,
    provider_distribution: providerDistribution,
    model_ranking: modelRanking,
    cost_breakdown: costBreakdown,
    latency_trend: latencyTrend,
    privacy_stats: privacyStats,
    savings_estimate: savingsEstimate,
  };
}

function groupByTime(metrics: any[], period: string): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  metrics.forEach(m => {
    const date = new Date(m.timestamp);
    let key: string;
    
    switch (period) {
      case 'hour':
        key = `${date.getHours()}:${Math.floor(date.getMinutes() / 10) * 10}`;
        break;
      case 'day':
        key = `${date.getHours()}:00`;
        break;
      case 'week':
        key = date.toLocaleDateString('es-ES', { weekday: 'short' });
        break;
      case 'month':
        key = `${date.getDate()}/${date.getMonth() + 1}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  
  return groups;
}

function groupBy(items: any[], key: string): Record<string, any[]> {
  return items.reduce((groups, item) => {
    const value = item[key] || 'unknown';
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
    return groups;
  }, {} as Record<string, any[]>);
}

function calculateProviderStats(metrics: any[]) {
  const groups = groupBy(metrics, 'provider');
  
  return Object.entries(groups).map(([provider, items]) => {
    const totalRequests = items.length;
    const successCount = items.filter((m: any) => m.success).length;
    
    return {
      provider,
      total_requests: totalRequests,
      total_tokens: items.reduce((sum: number, m: any) => sum + (m.tokens_input || 0) + (m.tokens_output || 0), 0),
      total_cost_usd: Math.round(items.reduce((sum: number, m: any) => sum + (m.cost_usd || 0), 0) * 10000) / 10000,
      avg_latency_ms: Math.round(items.reduce((sum: number, m: any) => sum + (m.latency_ms || 0), 0) / totalRequests),
      success_rate: Math.round((successCount / totalRequests) * 100),
    };
  });
}

function calculateModelStats(metrics: any[]) {
  const groups = groupBy(metrics, 'model');
  
  return Object.entries(groups)
    .map(([model, items]) => ({
      model,
      total_requests: items.length,
      total_tokens: items.reduce((sum: number, m: any) => sum + (m.tokens_input || 0) + (m.tokens_output || 0), 0),
      avg_latency_ms: Math.round(items.reduce((sum: number, m: any) => sum + (m.latency_ms || 0), 0) / items.length),
    }))
    .sort((a, b) => b.total_requests - a.total_requests);
}

function calculatePrivacySummary(incidents: any[]) {
  const totalBlocked = incidents.filter(i => 
    i.data_classification === 'restricted' && i.provider !== 'ollama'
  ).length;
  
  const totalAnonymized = incidents.filter(i => i.was_anonymized).length;
  
  const byClassification = groupBy(incidents, 'data_classification');
  const classificationSummary: Record<string, number> = {};
  Object.entries(byClassification).forEach(([classification, items]) => {
    classificationSummary[classification] = items.length;
  });

  return {
    total_blocked: totalBlocked,
    total_anonymized: totalAnonymized,
    by_classification: classificationSummary,
    total_incidents: incidents.length,
  };
}
