import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticsRequest {
  action: 'discover' | 'list_models' | 'benchmark' | 'health_check' | 'get_capabilities' | 'pull_model';
  endpoint_url: string;
  model_id?: string;
  test_prompt?: string;
}

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface BenchmarkResult {
  model_id: string;
  tokens_per_second: number;
  time_to_first_token_ms: number;
  total_time_ms: number;
  quality_score: number;
  response_tokens: number;
  test_prompt_tokens: number;
  gpu_used: boolean;
  memory_used_mb: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, endpoint_url, model_id, test_prompt } = await req.json() as DiagnosticsRequest;

    if (!endpoint_url) {
      return new Response(JSON.stringify({ error: 'endpoint_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize URL
    const baseUrl = endpoint_url.replace(/\/$/, '');

    console.log(`[ai-local-diagnostics] Action: ${action}, Endpoint: ${baseUrl}`);

    let result: any;

    switch (action) {
      case 'discover':
        result = await discoverEndpoint(baseUrl);
        break;
      case 'list_models':
        result = await listModels(baseUrl);
        break;
      case 'benchmark':
        if (!model_id) {
          return new Response(JSON.stringify({ error: 'model_id is required for benchmark' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await benchmarkModel(baseUrl, model_id, test_prompt);
        break;
      case 'health_check':
        result = await healthCheck(baseUrl);
        break;
      case 'get_capabilities':
        result = await getCapabilities(baseUrl);
        break;
      case 'pull_model':
        if (!model_id) {
          return new Response(JSON.stringify({ error: 'model_id is required for pull_model' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await pullModel(baseUrl, model_id);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      endpoint_url: baseUrl,
      data: result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-local-diagnostics] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// === DISCOVER ENDPOINT ===
async function discoverEndpoint(baseUrl: string): Promise<{
  connected: boolean;
  version?: string;
  models_count?: number;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${baseUrl}/api/version`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const versionData = await response.json();
    
    // Also get models count
    const modelsResponse = await fetch(`${baseUrl}/api/tags`);
    const modelsData = await modelsResponse.json();
    
    return {
      connected: true,
      version: versionData.version || 'unknown',
      models_count: modelsData.models?.length || 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { connected: false, error: message };
  }
}

// === LIST MODELS ===
async function listModels(baseUrl: string): Promise<{
  models: OllamaModel[];
  total: number;
}> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const models: OllamaModel[] = data.models || [];

    return {
      models: models.map(m => ({
        name: m.name,
        model: m.model || m.name,
        modified_at: m.modified_at,
        size: m.size,
        digest: m.digest,
        details: m.details,
      })),
      total: models.length,
    };
  } catch (error) {
    console.error('[list_models] Error:', error);
    return { models: [], total: 0 };
  }
}

// === BENCHMARK MODEL ===
async function benchmarkModel(
  baseUrl: string, 
  modelId: string, 
  customPrompt?: string
): Promise<BenchmarkResult> {
  const testPrompt = customPrompt || 
    'Explica en una frase qué es la inteligencia artificial.';
  
  const startTime = Date.now();
  let timeToFirstToken = 0;
  let responseTokens = 0;
  let fullResponse = '';

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        prompt: testPrompt,
        stream: true,
        options: {
          num_predict: 100,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let isFirst = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            if (isFirst) {
              timeToFirstToken = Date.now() - startTime;
              isFirst = false;
            }
            fullResponse += json.response;
            responseTokens++;
          }
        } catch {
          // Ignore parse errors for partial lines
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const tokensPerSecond = responseTokens / (totalTime / 1000);

    // Quality score based on response coherence (simple heuristic)
    const qualityScore = Math.min(100, Math.max(0, 
      (fullResponse.length > 20 ? 50 : 0) +
      (fullResponse.includes('.') ? 20 : 0) +
      (responseTokens > 10 ? 30 : 0)
    ));

    return {
      model_id: modelId,
      tokens_per_second: Math.round(tokensPerSecond * 100) / 100,
      time_to_first_token_ms: timeToFirstToken,
      total_time_ms: totalTime,
      quality_score: qualityScore,
      response_tokens: responseTokens,
      test_prompt_tokens: testPrompt.split(/\s+/).length,
      gpu_used: true, // Assume GPU if Ollama is running
      memory_used_mb: 0, // Can't determine from this API
    };
  } catch (error) {
    return {
      model_id: modelId,
      tokens_per_second: 0,
      time_to_first_token_ms: 0,
      total_time_ms: Date.now() - startTime,
      quality_score: 0,
      response_tokens: 0,
      test_prompt_tokens: testPrompt.split(/\s+/).length,
      gpu_used: false,
      memory_used_mb: 0,
      error: error instanceof Error ? error.message : 'Benchmark failed',
    };
  }
}

// === HEALTH CHECK ===
async function healthCheck(baseUrl: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms: number;
  version?: string;
  models_available: number;
  details: Record<string, any>;
}> {
  const startTime = Date.now();
  
  try {
    // Check version endpoint
    const versionResponse = await fetch(`${baseUrl}/api/version`);
    const versionData = versionResponse.ok ? await versionResponse.json() : null;

    // Check models endpoint
    const modelsResponse = await fetch(`${baseUrl}/api/tags`);
    const modelsData = modelsResponse.ok ? await modelsResponse.json() : { models: [] };

    const latency = Date.now() - startTime;
    const modelsCount = modelsData.models?.length || 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (latency > 5000 || !versionResponse.ok) {
      status = 'degraded';
    }
    if (!versionResponse.ok && !modelsResponse.ok) {
      status = 'unhealthy';
    }

    return {
      status,
      latency_ms: latency,
      version: versionData?.version,
      models_available: modelsCount,
      details: {
        version_endpoint: versionResponse.ok,
        models_endpoint: modelsResponse.ok,
        models: modelsData.models?.map((m: any) => m.name) || [],
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency_ms: Date.now() - startTime,
      models_available: 0,
      details: {
        error: error instanceof Error ? error.message : 'Health check failed',
      },
    };
  }
}

// === GET CAPABILITIES ===
async function getCapabilities(baseUrl: string): Promise<{
  supports_vision: boolean;
  supports_tools: boolean;
  supports_embeddings: boolean;
  supports_chat: boolean;
  supports_generate: boolean;
  available_endpoints: string[];
  models_by_capability: Record<string, string[]>;
}> {
  const endpoints = [
    '/api/generate',
    '/api/chat',
    '/api/embeddings',
    '/api/tags',
    '/api/show',
    '/api/pull',
  ];

  const availableEndpoints: string[] = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint === '/api/tags' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint !== '/api/tags' ? JSON.stringify({}) : undefined,
      });
      // Even 400 means the endpoint exists
      if (response.status !== 404) {
        availableEndpoints.push(endpoint);
      }
    } catch {
      // Endpoint not available
    }
  }

  // Get models and categorize by capability
  const modelsResult = await listModels(baseUrl);
  const modelsByCapability: Record<string, string[]> = {
    chat: [],
    code: [],
    vision: [],
    embedding: [],
  };

  for (const model of modelsResult.models) {
    const name = model.name.toLowerCase();
    if (name.includes('llava') || name.includes('vision')) {
      modelsByCapability.vision.push(model.name);
    }
    if (name.includes('code') || name.includes('coder') || name.includes('deepseek')) {
      modelsByCapability.code.push(model.name);
    }
    if (name.includes('embed') || name.includes('nomic')) {
      modelsByCapability.embedding.push(model.name);
    }
    // All models support chat
    modelsByCapability.chat.push(model.name);
  }

  return {
    supports_vision: modelsByCapability.vision.length > 0,
    supports_tools: true, // Ollama supports function calling
    supports_embeddings: availableEndpoints.includes('/api/embeddings'),
    supports_chat: availableEndpoints.includes('/api/chat'),
    supports_generate: availableEndpoints.includes('/api/generate'),
    available_endpoints: availableEndpoints,
    models_by_capability: modelsByCapability,
  };
}

// === PULL MODEL ===
async function pullModel(baseUrl: string, modelId: string): Promise<{
  status: 'started' | 'completed' | 'error';
  model_id: string;
  message: string;
}> {
  try {
    const response = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // For streaming response, we just confirm it started
    return {
      status: 'started',
      model_id: modelId,
      message: `Pull started for model ${modelId}. Check Ollama logs for progress.`,
    };
  } catch (error) {
    return {
      status: 'error',
      model_id: modelId,
      message: error instanceof Error ? error.message : 'Pull failed',
    };
  }
}
