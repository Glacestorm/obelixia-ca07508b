/**
 * Agent Help Chat - Edge Function
 * Procesa mensajes de chat con Lovable AI Gateway
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  agentId: string;
  agentType: string;
  message: string;
  conversationId: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  knowledgeContext?: string;
}

serve(async (req) => {
  // === CORS ===
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // === VALIDATE API KEY ===
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { agentId, agentType, message, conversationId, history, knowledgeContext } = await req.json() as ChatRequest;

    if (!message || !agentId) {
      throw new Error('Missing required fields: message, agentId');
    }

    console.log(`[agent-help-chat] Processing message for ${agentType}/${agentId}`);

    // === BUILD SYSTEM PROMPT ===
    const systemPrompt = buildSystemPrompt(agentId, agentType, knowledgeContext);

    // === BUILD MESSAGES ===
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // === CALL LOVABLE AI ===
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    // === ERROR HANDLING ===
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required', 
          message: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    // === PARSE RESPONSE ===
    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
    const tokensUsed = data.usage?.total_tokens || 0;

    const responseTimeMs = Date.now() - startTime;

    console.log(`[agent-help-chat] Response generated in ${responseTimeMs}ms, tokens: ${tokensUsed}`);

    return new Response(JSON.stringify({
      success: true,
      response: assistantResponse,
      tokensUsed,
      responseTimeMs,
      conversationId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[agent-help-chat] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

function buildSystemPrompt(agentId: string, agentType: string, knowledgeContext?: string): string {
  const basePrompt = `Eres un asistente de ayuda especializado para el sistema ERP enterprise.
Tu rol es ayudar a los usuarios a entender y utilizar el agente "${agentId}" de tipo "${agentType}".

DIRECTRICES DE COMUNICACIÓN:
- Responde en español de forma clara y concisa
- Usa un tono profesional pero amigable
- Proporciona ejemplos prácticos cuando sea útil
- Si no estás seguro de algo, indícalo honestamente
- Ofrece seguir ayudando al final de cada respuesta

CAPACIDADES DEL AGENTE ${agentId.toUpperCase()}:
${getAgentCapabilities(agentId, agentType)}

${knowledgeContext ? `CONOCIMIENTO RELEVANTE:\n${knowledgeContext}` : ''}

FORMATO DE RESPUESTA:
- Respuestas concisas (máximo 3-4 párrafos)
- Usa viñetas para listas
- Incluye ejemplos cuando sea apropiado
- Sugiere acciones concretas cuando sea posible`;

  return basePrompt;
}

function getAgentCapabilities(agentId: string, agentType: string): string {
  const capabilities: Record<string, string> = {
    'commercial_supervisor': `
- Supervisión de pipeline de ventas
- Análisis de oportunidades comerciales
- Coordinación de equipos de ventas
- Predicción de cierre de deals
- Gestión de clientes estratégicos`,
    
    'financial_supervisor': `
- Supervisión de flujo de caja
- Análisis de rentabilidad
- Coordinación de cobros y pagos
- Predicción financiera
- Gestión de tesorería`,
    
    'operations_supervisor': `
- Supervisión de inventario
- Optimización de producción
- Coordinación logística
- Predicción de demanda
- Control de calidad`,
    
    'hr_supervisor': `
- Supervisión de nóminas
- Gestión del talento
- Coordinación de formación
- Análisis de rendimiento
- Planificación de recursos humanos`,
    
    'analytics_supervisor': `
- Generación de dashboards
- Análisis predictivo
- Reportes automatizados
- Detección de anomalías
- Insights de negocio`,
  };

  return capabilities[agentId] || `
- Asistencia general del módulo
- Respuesta a consultas
- Guía de uso
- Resolución de problemas`;
}
