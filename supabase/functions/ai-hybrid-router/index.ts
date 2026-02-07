import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HybridRouterRequest {
  action: 'chat' | 'analyze' | 'generate';
  messages: Array<{ role: string; content: string }>;
  provider_id?: string;
  model?: string;
  context?: Record<string, unknown>;
  options?: {
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
  };
}

// Provider configurations
const EXTERNAL_PROVIDERS: Record<string, {
  endpoint: string;
  auth_header: string;
  format: 'openai' | 'anthropic' | 'google';
}> = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    auth_header: 'Authorization',
    format: 'openai',
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    auth_header: 'x-api-key',
    format: 'anthropic',
  },
  google: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    auth_header: 'x-goog-api-key',
    format: 'google',
  },
  mistral: {
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    auth_header: 'Authorization',
    format: 'openai',
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    auth_header: 'Authorization',
    format: 'openai',
  },
  together: {
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    auth_header: 'Authorization',
    format: 'openai',
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    auth_header: 'Authorization',
    format: 'openai',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      messages, 
      provider_id, 
      model,
      context,
      options = {}
    } = await req.json() as HybridRouterRequest;

    console.log(`[ai-hybrid-router] Action: ${action}, Provider: ${provider_id}, Model: ${model}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Determine which provider to use
    let providerName = 'lovable';
    let apiKey = LOVABLE_API_KEY;
    let useLocal = false;

    if (provider_id) {
      // Fetch provider details from database
      const { data: provider } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('id', provider_id)
        .single();

      if (provider) {
        providerName = provider.name.toLowerCase().replace(/\s+/g, '');
        
        if (provider.provider_type === 'local') {
          useLocal = true;
        } else if (provider.requires_api_key) {
          // Get API key from credentials
          const { data: credential } = await supabase
            .from('ai_provider_credentials')
            .select('api_key_encrypted')
            .eq('provider_id', provider_id)
            .eq('is_active', true)
            .single();

          if (credential?.api_key_encrypted) {
            apiKey = credential.api_key_encrypted;
          }
        }
      }
    }

    // Build system prompt with context
    let systemPrompt = `Eres un asistente de IA empresarial integrado en un sistema CRM/ERP.
Tu rol es ayudar con análisis de datos, generación de contenido y automatización de tareas.

CAPACIDADES:
- Análisis de datos y métricas empresariales
- Generación de comunicaciones profesionales
- Recomendaciones basadas en datos
- Soporte en decisiones estratégicas

FORMATO: Responde de forma concisa y profesional.`;

    if (context) {
      systemPrompt += `\n\nCONTEXTO ACTUAL:\n${JSON.stringify(context, null, 2)}`;
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // === LOCAL AI (Ollama) ===
    if (useLocal) {
      try {
        const ollamaUrl = context?.ollamaUrl || 'http://localhost:11434';
        const localModel = model || 'llama3.2';

        const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: localModel,
            messages: fullMessages,
            stream: false,
            options: {
              temperature: options.temperature || 0.7,
              num_predict: options.max_tokens || 2000,
            },
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (ollamaResponse.ok) {
          const data = await ollamaResponse.json();
          
          return new Response(JSON.stringify({
            success: true,
            source: 'local',
            model: localModel,
            response: data.message?.content || data.response,
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
            cost: 0,
            timestamp: new Date().toISOString(),
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        throw new Error('Local AI not responding, trying fallback...');
      } catch (localError) {
        console.log('[ai-hybrid-router] Local AI failed, using Lovable AI fallback');
        // Continue to Lovable AI fallback
        providerName = 'lovable';
        apiKey = LOVABLE_API_KEY;
      }
    }

    // === LOVABLE AI ===
    if (providerName === 'lovable' || providerName === 'lovableai') {
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const selectedModel = model || 'google/gemini-2.5-flash';

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: fullMessages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 2000,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Payment required. Please add credits to continue.',
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Lovable AI error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      return new Response(JSON.stringify({
        success: true,
        source: 'external',
        model: selectedModel,
        response: content,
        usage: data.usage,
        cost: 0, // Lovable AI tracks its own credits
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === EXTERNAL PROVIDERS ===
    const providerConfig = EXTERNAL_PROVIDERS[providerName];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    if (!apiKey) {
      throw new Error(`API key required for ${providerName}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (providerConfig.auth_header === 'Authorization') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      headers[providerConfig.auth_header] = apiKey;
    }

    let requestBody: any;
    let endpoint = providerConfig.endpoint;

    if (providerConfig.format === 'openai') {
      requestBody = {
        model: model || 'gpt-4o-mini',
        messages: fullMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
      };
    } else if (providerConfig.format === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
      requestBody = {
        model: model || 'claude-3-haiku-20240307',
        max_tokens: options.max_tokens || 2000,
        system: systemPrompt,
        messages: messages,
      };
    } else if (providerConfig.format === 'google') {
      endpoint = `${providerConfig.endpoint}/${model || 'gemini-pro'}:generateContent`;
      requestBody = {
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.max_tokens || 2000,
        },
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`${providerName} API error: ${response.status}`);
    }

    const data = await response.json();
    let content: string;
    let usage: any;

    if (providerConfig.format === 'openai') {
      content = data.choices?.[0]?.message?.content;
      usage = data.usage;
    } else if (providerConfig.format === 'anthropic') {
      content = data.content?.[0]?.text;
      usage = {
        prompt_tokens: data.usage?.input_tokens,
        completion_tokens: data.usage?.output_tokens,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };
    } else if (providerConfig.format === 'google') {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      usage = {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      };
    }

    // Calculate estimated cost (simplified)
    const estimatedCost = ((usage?.total_tokens || 0) / 1000) * 0.01;

    return new Response(JSON.stringify({
      success: true,
      source: 'external',
      model: model,
      response: content,
      usage,
      cost: estimatedCost,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-hybrid-router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
