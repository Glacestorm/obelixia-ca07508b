import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HelpRequest {
  action: 'chat' | 'get_help' | 'search_knowledge' | 'record_learning';
  agentId: string;
  agentType: string;
  message?: string;
  context?: Record<string, unknown>;
  learningItems?: Array<{
    knowledgeType: string;
    content: string;
    source: string;
  }>;
}

// Rate limiting
const rateLimiter = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(agentId: string): boolean {
  const now = Date.now();
  const limiter = rateLimiter.get(agentId);
  
  if (!limiter || now - limiter.lastReset > RATE_LIMIT_WINDOW_MS) {
    rateLimiter.set(agentId, { count: 1, lastReset: now });
    return true;
  }
  
  if (limiter.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  limiter.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, agentId, agentType, message, context, learningItems } = await req.json() as HelpRequest;

    // Rate limit check
    if (!checkRateLimit(agentId)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Demasiadas solicitudes. Espera un momento.',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[agent-help-assistant] Processing ${action} for ${agentType}/${agentId}`);

    switch (action) {
      case 'chat': {
        if (!message) {
          throw new Error('Message is required for chat action');
        }

        const helpConfig = context?.helpConfig as Record<string, unknown> || {};
        const recentKnowledge = context?.recentKnowledge as Array<Record<string, unknown>> || [];

        const systemPrompt = `Eres el asistente de ayuda del agente "${helpConfig.name || agentId}" en un sistema ERP/CRM empresarial.

INFORMACIÓN DEL AGENTE:
- Nombre: ${helpConfig.name || agentId}
- Tipo: ${agentType}
- Descripción: ${helpConfig.fullDescription || 'Agente especializado del sistema'}
- Capacidades: ${(helpConfig.capabilities as string[] || []).join(', ')}
- Mejores prácticas: ${(helpConfig.bestPractices as string[] || []).join('; ')}

CONOCIMIENTO RECIENTE APRENDIDO:
${recentKnowledge.map((k: Record<string, unknown>) => `- ${k.title}: ${k.content}`).join('\n') || 'Ninguno aún'}

INSTRUCCIONES:
1. Responde de manera clara, concisa y útil
2. Si el usuario pregunta sobre capacidades, enuméralas de forma estructurada
3. Si pregunta cómo hacer algo, da instrucciones paso a paso
4. Si preguntas sobre errores o problemas, sugiere soluciones prácticas
5. Usa emojis ocasionalmente para hacer las respuestas más amigables
6. Si no conoces algo específico, sugiere consultar la documentación o contactar soporte
7. Responde siempre en español

FORMATO:
- Usa listas cuando enumeres elementos
- Usa negritas para conceptos importantes
- Mantén las respuestas en 2-3 párrafos máximo`;

        const userPrompt = message;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[agent-help-assistant] AI API error:', errorText);
          
          if (response.status === 429) {
            return new Response(JSON.stringify({
              success: false,
              error: 'AI rate limit exceeded',
              response: 'El servicio está ocupado. Por favor, intenta de nuevo en unos segundos.',
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const assistantResponse = data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.';

        return new Response(JSON.stringify({
          success: true,
          response: assistantResponse,
          tokensUsed: data.usage?.total_tokens || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_help': {
        // Return basic help info (static config is on client side)
        return new Response(JSON.stringify({
          success: true,
          agentId,
          agentType,
          message: 'Use client-side config for static help',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'search_knowledge': {
        const query = message || '';
        
        // AI-powered search
        const searchPrompt = `Busca información relevante sobre "${query}" en el contexto del agente ${agentId} (${agentType}).
        
Conocimiento disponible:
${JSON.stringify(context?.recentKnowledge || [], null, 2)}

Responde con los items más relevantes en formato JSON:
{
  "results": [
    { "id": "...", "title": "...", "relevance": 0.0-1.0 }
  ]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'user', content: searchPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{"results": []}';
        
        let results = [];
        try {
          const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
          results = parsed.results || [];
        } catch {
          results = [];
        }

        return new Response(JSON.stringify({
          success: true,
          results,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'record_learning': {
        if (!learningItems || learningItems.length === 0) {
          return new Response(JSON.stringify({
            success: true,
            message: 'No learning items to record',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Just acknowledge - actual DB insert happens on client side
        console.log(`[agent-help-assistant] Recording ${learningItems.length} learning items for ${agentId}`);
        
        return new Response(JSON.stringify({
          success: true,
          recorded: learningItems.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[agent-help-assistant] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
