/**
 * CRM AI Hybrid Router - Edge Function
 * Sistema de enrutamiento inteligente para IA Híbrida Universal
 * 
 * Funcionalidades:
 * - Enrutamiento automático Local/Externo basado en privacidad
 * - Gateway de privacidad de datos
 * - Gestión de créditos y uso
 * - Fallback automático
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === TYPES ===
interface HybridRouterRequest {
  action: 'route_request' | 'check_privacy' | 'estimate_cost' | 'get_routing_stats' | 'test_provider';
  prompt?: string;
  context?: Record<string, unknown>;
  provider?: string;
  model?: string;
  routingMode?: 'hybrid_auto' | 'local_only' | 'external_only' | 'cost_optimized' | 'performance_optimized';
  privacyLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  ollamaUrl?: string;
  maxTokens?: number;
}

interface RoutingDecision {
  provider: 'local' | 'external' | 'lovable';
  model: string;
  reason: string;
  privacyLevel: string;
  estimatedCost: number;
  estimatedLatency: number;
  fallbackAvailable: boolean;
}

// === PRIVACY PATTERNS ===
const SENSITIVE_PATTERNS = {
  restricted: [
    /\b\d{8,}[A-Z]?\b/i, // DNI/NIE español
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Tarjeta crédito
    /\biban\s*[a-z]{2}\d{2}[a-z0-9]{4,}/i, // IBAN
    /password|contraseña|clave\s*secreta/i,
    /api[_-]?key|secret[_-]?key|token\s*secreto/i,
  ],
  confidential: [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
    /\+?\d{1,4}[\s.-]?\d{6,12}\b/, // Teléfono
    /factur|invoice|importe|total\s*a\s*pagar/i,
    /sueldo|nómina|salario|retribución/i,
    /cliente\s*id|customer\s*id/i,
  ],
  internal: [
    /presupuesto|budget|forecast/i,
    /estrategia|planificación|roadmap/i,
    /interno|confidencial|privado/i,
    /reunión|meeting|agenda/i,
  ],
};

// === HELPER FUNCTIONS ===
function classifyPrivacy(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Check restricted patterns first (highest sensitivity)
  for (const pattern of SENSITIVE_PATTERNS.restricted) {
    if (pattern.test(text)) {
      return 'restricted';
    }
  }
  
  // Check confidential patterns
  for (const pattern of SENSITIVE_PATTERNS.confidential) {
    if (pattern.test(text)) {
      return 'confidential';
    }
  }
  
  // Check internal patterns
  for (const pattern of SENSITIVE_PATTERNS.internal) {
    if (pattern.test(lowerText)) {
      return 'internal';
    }
  }
  
  return 'public';
}

function anonymizeText(text: string, level: string): { text: string; anonymized: boolean; fieldsAnonymized: string[] } {
  let result = text;
  const fieldsAnonymized: string[] = [];
  
  if (level === 'restricted' || level === 'confidential') {
    // Anonymize emails
    const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    if (emailPattern.test(result)) {
      result = result.replace(emailPattern, '[EMAIL_REDACTED]');
      fieldsAnonymized.push('email');
    }
    
    // Anonymize phone numbers
    const phonePattern = /\+?\d{1,4}[\s.-]?\d{6,12}\b/g;
    if (phonePattern.test(result)) {
      result = result.replace(phonePattern, '[PHONE_REDACTED]');
      fieldsAnonymized.push('phone');
    }
    
    // Anonymize credit cards
    const ccPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    if (ccPattern.test(result)) {
      result = result.replace(ccPattern, '[CARD_REDACTED]');
      fieldsAnonymized.push('credit_card');
    }
    
    // Anonymize DNI/NIE
    const dniPattern = /\b\d{8,}[A-Z]?\b/gi;
    if (dniPattern.test(result)) {
      result = result.replace(dniPattern, '[ID_REDACTED]');
      fieldsAnonymized.push('national_id');
    }
  }
  
  return {
    text: result,
    anonymized: fieldsAnonymized.length > 0,
    fieldsAnonymized,
  };
}

function determineRouting(
  privacyLevel: string,
  routingMode: string,
  localAvailable: boolean
): RoutingDecision {
  const decision: RoutingDecision = {
    provider: 'lovable',
    model: 'google/gemini-2.5-flash',
    reason: '',
    privacyLevel,
    estimatedCost: 0.001,
    estimatedLatency: 500,
    fallbackAvailable: true,
  };
  
  // Privacy-first routing
  if (privacyLevel === 'restricted') {
    if (localAvailable) {
      decision.provider = 'local';
      decision.model = 'llama3.2';
      decision.reason = 'Datos restringidos: procesamiento local obligatorio';
      decision.estimatedCost = 0;
      decision.estimatedLatency = 1000;
    } else {
      decision.provider = 'lovable';
      decision.reason = 'Datos restringidos pero local no disponible: usando Lovable con anonimización';
    }
    return decision;
  }
  
  // Mode-based routing
  switch (routingMode) {
    case 'local_only':
      if (localAvailable) {
        decision.provider = 'local';
        decision.model = 'llama3.2';
        decision.reason = 'Modo local forzado';
        decision.estimatedCost = 0;
        decision.estimatedLatency = 1000;
      } else {
        decision.reason = 'Local no disponible, usando fallback';
      }
      break;
      
    case 'external_only':
      decision.provider = 'lovable';
      decision.model = 'google/gemini-2.5-flash';
      decision.reason = 'Modo externo forzado';
      break;
      
    case 'cost_optimized':
      if (localAvailable) {
        decision.provider = 'local';
        decision.model = 'llama3.2';
        decision.reason = 'Optimización de costes: usando local';
        decision.estimatedCost = 0;
        decision.estimatedLatency = 1000;
      } else {
        decision.model = 'google/gemini-2.5-flash-lite';
        decision.reason = 'Optimización de costes: modelo económico';
        decision.estimatedCost = 0.0005;
      }
      break;
      
    case 'performance_optimized':
      decision.provider = 'lovable';
      decision.model = 'google/gemini-2.5-pro';
      decision.reason = 'Optimización de rendimiento: modelo premium';
      decision.estimatedCost = 0.01;
      decision.estimatedLatency = 300;
      break;
      
    case 'hybrid_auto':
    default:
      if (privacyLevel === 'confidential' && localAvailable) {
        decision.provider = 'local';
        decision.model = 'llama3.2';
        decision.reason = 'Híbrido auto: datos confidenciales procesados localmente';
        decision.estimatedCost = 0;
        decision.estimatedLatency = 1000;
      } else {
        decision.reason = 'Híbrido auto: usando Lovable AI';
      }
      break;
  }
  
  decision.fallbackAvailable = decision.provider === 'local' ? true : localAvailable;
  return decision;
}

async function testOllamaConnection(ollamaUrl: string): Promise<{ connected: boolean; models: string[]; error?: string }> {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return { connected: false, models: [], error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];
    
    return { connected: true, models };
  } catch (error) {
    return { 
      connected: false, 
      models: [], 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

async function callLovableAI(prompt: string, model: string, maxTokens: number): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Eres un asistente empresarial experto en CRM, ERP y gestión comercial. Responde de forma concisa y profesional.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });
  
  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded');
    if (response.status === 402) throw new Error('Insufficient credits');
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOllama(prompt: string, model: string, ollamaUrl: string): Promise<string> {
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.response || '';
}

// === MAIN HANDLER ===
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { 
      action, 
      prompt, 
      context,
      provider,
      model,
      routingMode = 'hybrid_auto',
      privacyLevel: forcedPrivacy,
      ollamaUrl = 'http://localhost:11434',
      maxTokens = 2000,
    } = await req.json() as HybridRouterRequest;
    
    console.log(`[crm-ai-hybrid-router] Action: ${action}`);
    
    switch (action) {
      case 'check_privacy': {
        if (!prompt) {
          return new Response(JSON.stringify({ error: 'Prompt required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const detectedLevel = classifyPrivacy(prompt);
        const anonymization = anonymizeText(prompt, detectedLevel);
        
        return new Response(JSON.stringify({
          success: true,
          privacyLevel: detectedLevel,
          anonymization: {
            required: anonymization.anonymized,
            fieldsDetected: anonymization.fieldsAnonymized,
            anonymizedText: anonymization.text,
          },
          recommendation: detectedLevel === 'restricted' 
            ? 'Usar procesamiento local obligatorio'
            : detectedLevel === 'confidential'
            ? 'Recomendado procesamiento local o anonimización'
            : 'Procesamiento externo permitido',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'estimate_cost': {
        const tokenCount = Math.ceil((prompt?.length || 0) / 4);
        const costs = {
          'google/gemini-2.5-flash': tokenCount * 0.000001,
          'google/gemini-2.5-pro': tokenCount * 0.00001,
          'openai/gpt-5-mini': tokenCount * 0.000005,
          'local': 0,
        };
        
        return new Response(JSON.stringify({
          success: true,
          estimatedTokens: tokenCount,
          costs,
          recommendedModel: tokenCount > 5000 ? 'google/gemini-2.5-flash' : 'google/gemini-2.5-flash-lite',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'test_provider': {
        if (provider === 'ollama' || provider === 'local') {
          const result = await testOllamaConnection(ollamaUrl);
          return new Response(JSON.stringify({
            success: result.connected,
            provider: 'ollama',
            ...result,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Test Lovable AI
        try {
          const testResponse = await callLovableAI('Responde solo: OK', 'google/gemini-2.5-flash-lite', 10);
          return new Response(JSON.stringify({
            success: true,
            provider: 'lovable',
            response: testResponse.substring(0, 50),
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            provider: 'lovable',
            error: error instanceof Error ? error.message : 'Test failed',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      case 'route_request': {
        if (!prompt) {
          return new Response(JSON.stringify({ error: 'Prompt required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // 1. Check privacy
        const detectedPrivacy = forcedPrivacy || classifyPrivacy(prompt);
        
        // 2. Test local availability
        const localTest = await testOllamaConnection(ollamaUrl);
        
        // 3. Determine routing
        const routing = determineRouting(detectedPrivacy, routingMode, localTest.connected);
        
        // 4. Prepare prompt (anonymize if needed)
        let processedPrompt = prompt;
        let wasAnonymized = false;
        
        if (routing.provider !== 'local' && (detectedPrivacy === 'confidential' || detectedPrivacy === 'restricted')) {
          const anonymization = anonymizeText(prompt, detectedPrivacy);
          processedPrompt = anonymization.text;
          wasAnonymized = anonymization.anonymized;
        }
        
        // 5. Execute request
        let response: string;
        let actualProvider: string;
        let actualModel: string;
        
        try {
          if (routing.provider === 'local' && localTest.connected) {
            response = await callOllama(processedPrompt, routing.model, ollamaUrl);
            actualProvider = 'local';
            actualModel = routing.model;
          } else {
            response = await callLovableAI(processedPrompt, routing.model, maxTokens);
            actualProvider = 'lovable';
            actualModel = routing.model;
          }
        } catch (error) {
          // Fallback logic
          console.error('[crm-ai-hybrid-router] Primary failed, trying fallback:', error);
          
          if (routing.provider === 'local') {
            response = await callLovableAI(processedPrompt, 'google/gemini-2.5-flash', maxTokens);
            actualProvider = 'lovable';
            actualModel = 'google/gemini-2.5-flash';
          } else if (localTest.connected) {
            response = await callOllama(processedPrompt, 'llama3.2', ollamaUrl);
            actualProvider = 'local';
            actualModel = 'llama3.2';
          } else {
            throw error;
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          response,
          routing: {
            requestedMode: routingMode,
            actualProvider,
            actualModel,
            privacyLevel: detectedPrivacy,
            wasAnonymized,
            reason: routing.reason,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            estimatedCost: routing.estimatedCost,
            fallbackUsed: actualProvider !== routing.provider,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      case 'get_routing_stats': {
        // Return mock stats for now - in production, query from database
        return new Response(JSON.stringify({
          success: true,
          stats: {
            totalRequests: 0,
            localRequests: 0,
            externalRequests: 0,
            anonymizedRequests: 0,
            fallbacksUsed: 0,
            averageLatency: 0,
            totalCost: 0,
            privacyBreakdown: {
              public: 0,
              internal: 0,
              confidential: 0,
              restricted: 0,
            },
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[crm-ai-hybrid-router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
