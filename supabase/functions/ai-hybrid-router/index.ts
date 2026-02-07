import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// === INTERFACES ===
interface HybridRouterRequest {
  action: 'chat' | 'analyze' | 'generate' | 'route_decision' | 'test_providers' | 'get_config';
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  context?: Record<string, unknown>;
  routing_mode?: 'local_only' | 'external_only' | 'hybrid_auto' | 'hybrid_manual';
  preferred_provider?: string;
  model?: string;
  options?: {
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
  };
  include_sensitive_data?: boolean;
}

interface ProviderConfig {
  id: string;
  name: string;
  provider_type: 'local' | 'external' | 'lovable_gateway';
  api_endpoint: string;
  requires_api_key: boolean;
  supported_models: Array<{ id: string; name: string; context_window?: number }>;
  is_active: boolean;
  priority?: number;
}

interface PrivacyRule {
  classification_level: string;
  field_patterns: string[];
  action: 'anonymize' | 'block' | 'allow' | 'local_only';
}

interface RoutingDecision {
  provider: ProviderConfig;
  model: string;
  reason: string;
  fallback_available: boolean;
  warnings: string[];
  data_classification: string;
}

// === HELPER FUNCTIONS ===
function classifyDataSensitivity(data: Record<string, unknown>, rules: PrivacyRule[]): {
  level: string;
  sensitiveFields: string[];
  canSendExternal: boolean;
  requiresAnonymization: boolean;
} {
  const sensitiveFields: string[] = [];
  let highestLevel = 'public';
  const levelPriority: Record<string, number> = {
    'public': 0,
    'internal': 1,
    'confidential': 2,
    'restricted': 3
  };

  const dataStr = JSON.stringify(data).toLowerCase();

  for (const rule of rules) {
    for (const pattern of rule.field_patterns || []) {
      try {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(dataStr)) {
          sensitiveFields.push(pattern);
          if (levelPriority[rule.classification_level] > levelPriority[highestLevel]) {
            highestLevel = rule.classification_level;
          }
        }
      } catch {
        // Invalid regex pattern, skip
      }
    }
  }

  return {
    level: highestLevel,
    sensitiveFields: [...new Set(sensitiveFields)],
    canSendExternal: highestLevel === 'public' || highestLevel === 'internal',
    requiresAnonymization: highestLevel === 'confidential'
  };
}

function anonymizeData(data: Record<string, unknown>, sensitiveFields: string[]): Record<string, unknown> {
  let dataStr = JSON.stringify(data);
  
  for (const field of sensitiveFields) {
    try {
      const regex = new RegExp(field, 'gi');
      dataStr = dataStr.replace(regex, '[REDACTED]');
    } catch {
      // Invalid regex, skip
    }
  }
  
  return JSON.parse(dataStr);
}

async function testLocalProvider(endpoint: string, timeout = 5000): Promise<{ available: boolean; latency?: number }> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    return { available: response.ok, latency };
  } catch {
    return { available: false };
  }
}

async function callLocalAI(
  endpoint: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; max_tokens?: number } = {}
): Promise<{ success: boolean; response?: string; error?: string; tokens?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.max_tokens || 2000,
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Local AI error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      response: data.message?.content || data.response,
      tokens: data.eval_count || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Local AI connection failed'
    };
  }
}

async function callLovableAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; max_tokens?: number } = {}
): Promise<{ success: boolean; response?: string; error?: string; tokens?: number; cost?: number; usage?: any }> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Try again later.' };
      }
      if (response.status === 402) {
        return { success: false, error: 'Payment required. Add credits to continue.' };
      }
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage || {};

    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const estimatedCost = (promptTokens * 0.00001) + (completionTokens * 0.00003);

    return {
      success: true,
      response: content,
      tokens: promptTokens + completionTokens,
      cost: estimatedCost,
      usage
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lovable AI connection failed'
    };
  }
}

// === MAIN HANDLER ===
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      action,
      messages = [],
      prompt,
      context = {},
      routing_mode,
      preferred_provider,
      model,
      options = {},
      include_sensitive_data = false
    } = await req.json() as HybridRouterRequest;

    console.log(`[ai-hybrid-router] Action: ${action}, Mode: ${routing_mode || 'auto'}`);

    // === ACTION: GET CONFIG ===
    if (action === 'get_config') {
      const [providersRes, configRes, rulesRes] = await Promise.all([
        supabase.from('ai_hybrid_providers').select('*').eq('is_active', true).order('priority', { ascending: false }),
        supabase.from('ai_hybrid_config').select('*'),
        supabase.from('ai_hybrid_privacy_rules').select('*').eq('is_active', true)
      ]);

      return new Response(JSON.stringify({
        success: true,
        providers: providersRes.data || [],
        config: configRes.data || [],
        privacy_rules: rulesRes.data || [],
        lovable_ai_available: !!lovableApiKey,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch providers and config
    const [providersRes, configRes, rulesRes] = await Promise.all([
      supabase.from('ai_hybrid_providers').select('*').eq('is_active', true).order('priority', { ascending: false }),
      supabase.from('ai_hybrid_config').select('config_value').eq('config_key', 'global_settings').single(),
      supabase.from('ai_hybrid_privacy_rules').select('*').eq('is_active', true)
    ]);

    const providers = (providersRes.data || []) as ProviderConfig[];
    const privacyRules = (rulesRes.data || []) as PrivacyRule[];
    const globalSettings = (configRes.data?.config_value as Record<string, any>) || {};
    const effectiveMode = routing_mode || globalSettings.default_routing_mode || 'hybrid_auto';

    // === ACTION: TEST PROVIDERS ===
    if (action === 'test_providers') {
      const results: Record<string, { available: boolean; latency?: number; type: string }> = {};
      
      const testPromises = providers.map(async (provider) => {
        if (provider.provider_type === 'local') {
          const test = await testLocalProvider(provider.api_endpoint);
          results[provider.id] = { ...test, type: 'local' };
        } else if (provider.provider_type === 'lovable_gateway') {
          results[provider.id] = { available: !!lovableApiKey, type: 'lovable_gateway' };
        } else {
          results[provider.id] = { available: true, type: 'external' };
        }
      });

      await Promise.all(testPromises);

      return new Response(JSON.stringify({
        success: true,
        providers: results,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === DATA CLASSIFICATION ===
    const messagesArray = Array.isArray(messages) ? messages : [];
    const dataToClassify = { ...context, messages: messagesArray, prompt: prompt || '' };
    const classification = classifyDataSensitivity(dataToClassify, privacyRules);

    // === ROUTING DECISION ===
    let selectedProvider: ProviderConfig | null = null;
    let selectedModel = model || 'google/gemini-2.5-flash';
    let routingReason = '';
    const warnings: string[] = [];

    // Check preferred provider
    if (preferred_provider) {
      selectedProvider = providers.find(p => p.id === preferred_provider) || null;
      if (selectedProvider) routingReason = 'User preference';
    }

    // Apply routing mode
    if (!selectedProvider) {
      const localProviders = providers.filter(p => p.provider_type === 'local');
      const externalProviders = providers.filter(p => 
        p.provider_type === 'external' || p.provider_type === 'lovable_gateway' || p.provider_type === 'lovable'
      );

      switch (effectiveMode) {
        case 'local_only':
          for (const local of localProviders) {
            const test = await testLocalProvider(local.api_endpoint);
            if (test.available) {
              selectedProvider = local;
              selectedModel = (local.supported_models as any)?.[0]?.id || 'llama3.2';
              routingReason = 'Local-only mode';
              break;
            }
          }
          if (!selectedProvider) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No local AI provider available',
              routing_mode: effectiveMode
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          break;

        case 'external_only':
          if (externalProviders.length > 0 && lovableApiKey) {
            selectedProvider = externalProviders.find(p => p.provider_type === 'lovable_gateway' || p.provider_type === 'lovable') || externalProviders[0];
            routingReason = 'External-only mode';
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: 'No external AI provider available'
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          break;

        case 'hybrid_auto':
        default:
          // Privacy-based routing
          if (!classification.canSendExternal && !include_sensitive_data) {
            for (const local of localProviders) {
              const test = await testLocalProvider(local.api_endpoint);
              if (test.available) {
                selectedProvider = local;
                selectedModel = (local.supported_models as any)?.[0]?.id || 'llama3.2';
                routingReason = 'Sensitive data requires local processing';
                break;
              }
            }
            if (!selectedProvider) {
              warnings.push('Sensitive data detected but no local provider available');
              if (classification.requiresAnonymization && externalProviders.length > 0 && lovableApiKey) {
                selectedProvider = externalProviders.find(p => p.provider_type === 'lovable_gateway' || p.provider_type === 'lovable') || externalProviders[0];
                routingReason = 'Anonymized data sent to external (local unavailable)';
              } else {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'Cannot process sensitive data without local provider',
                  classification
                }), {
                  status: 422,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } else {
            // Try local first (cost-free)
            for (const local of localProviders) {
              const test = await testLocalProvider(local.api_endpoint);
              if (test.available) {
                selectedProvider = local;
                selectedModel = (local.supported_models as any)?.[0]?.id || 'llama3.2';
                routingReason = 'Local provider available (cost-free)';
                break;
              }
            }
            // Fallback to external
            if (!selectedProvider && externalProviders.length > 0 && lovableApiKey) {
              selectedProvider = externalProviders.find(p => p.provider_type === 'lovable_gateway' || p.provider_type === 'lovable') || externalProviders[0];
              routingReason = 'Fallback to external (local unavailable)';
            }
          }
          break;
      }
    }

    if (!selectedProvider) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No AI provider available'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === ACTION: ROUTE DECISION ONLY ===
    if (action === 'route_decision') {
      const decision: RoutingDecision = {
        provider: selectedProvider,
        model: selectedModel,
        reason: routingReason,
        fallback_available: providers.length > 1,
        warnings,
        data_classification: classification.level
      };

      return new Response(JSON.stringify({
        success: true,
        decision,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === PREPARE MESSAGES ===
    let processedMessages = [...messages];
    if (prompt && processedMessages.length === 0) {
      processedMessages = [{ role: 'user', content: prompt }];
    }

    const systemPrompt = `Eres un asistente de IA empresarial integrado en un sistema CRM/ERP.
Tu rol es ayudar con análisis de datos, generación de contenido y automatización.

CAPACIDADES:
- Análisis de datos de clientes y métricas empresariales
- Generación de comunicaciones profesionales
- Recomendaciones basadas en datos
- Soporte en decisiones estratégicas

FORMATO: Responde de forma concisa y profesional.
${context && Object.keys(context).length > 0 ? `\nCONTEXTO:\n${JSON.stringify(context, null, 2)}` : ''}`;

    const finalMessages = [
      { role: 'system', content: systemPrompt },
      ...processedMessages
    ];

    // Anonymize if needed
    let messagesToProcess = finalMessages;
    if (classification.requiresAnonymization && selectedProvider.provider_type !== 'local') {
      messagesToProcess = finalMessages.map(m => ({
        ...m,
        content: (anonymizeData({ content: m.content }, classification.sensitiveFields) as any).content
      }));
      warnings.push('Data was anonymized before external processing');
    }

    // === EXECUTE AI CALL ===
    let result: { success: boolean; response?: string; error?: string; tokens?: number; cost?: number; usage?: any };
    
    if (selectedProvider.provider_type === 'local') {
      result = await callLocalAI(selectedProvider.api_endpoint, selectedModel, messagesToProcess, options);
    } else {
      result = await callLovableAI(lovableApiKey!, selectedModel, messagesToProcess, options);
    }

    const executionTime = Date.now() - startTime;

    // Log routing (non-blocking)
    supabase.from('ai_hybrid_routing_logs').insert({
      provider_id: selectedProvider.id,
      routing_mode: effectiveMode,
      data_classification: classification.level,
      was_anonymized: classification.requiresAnonymization && selectedProvider.provider_type !== 'local',
      prompt_tokens: result.usage?.prompt_tokens || 0,
      completion_tokens: result.usage?.completion_tokens || 0,
      total_cost: result.cost || 0,
      latency_ms: executionTime,
      was_successful: result.success,
      fallback_used: routingReason.includes('Fallback'),
      fallback_reason: routingReason.includes('Fallback') ? routingReason : null
    }).then(() => {}).catch(e => console.error('[ai-hybrid-router] Log error:', e));

    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        provider: selectedProvider.name,
        routing_reason: routingReason
      }), {
        status: result.error?.includes('Rate limit') ? 429 : result.error?.includes('Payment') ? 402 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response: result.response,
      provider: {
        id: selectedProvider.id,
        name: selectedProvider.name,
        type: selectedProvider.provider_type
      },
      model: selectedModel,
      routing: {
        mode: effectiveMode,
        reason: routingReason,
        classification: classification.level,
        anonymized: classification.requiresAnonymization && selectedProvider.provider_type !== 'local'
      },
      usage: {
        tokens: result.tokens,
        cost: result.cost,
        latency_ms: executionTime
      },
      warnings,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-hybrid-router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
