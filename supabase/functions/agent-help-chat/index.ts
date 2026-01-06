/**
 * Edge Function: Agent Help Chat
 * Chatbot especializado para ayuda de agentes con IA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  conversationId: string;
  agentContext: {
    agentId: string;
    agentType: string;
    agentName: string;
    description: string;
    capabilities: string[];
    currentModule?: string;
  };
  knowledgeContext?: string;
  conversationHistory?: Array<{
    role: string;
    content: string;
  }>;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { 
      message, 
      conversationId, 
      agentContext, 
      knowledgeContext,
      conversationHistory = []
    } = await req.json() as ChatRequest;

    console.log(`[agent-help-chat] Processing message for agent: ${agentContext.agentName}`);

    // Construir el system prompt especializado
    const systemPrompt = `Eres un asistente de ayuda especializado para el agente "${agentContext.agentName}".

## INFORMACIÓN DEL AGENTE
- **Nombre**: ${agentContext.agentName}
- **Tipo**: ${agentContext.agentType}
- **Descripción**: ${agentContext.description}
- **Capacidades**: ${agentContext.capabilities.join(', ')}
${agentContext.currentModule ? `- **Módulo actual**: ${agentContext.currentModule}` : ''}

## BASE DE CONOCIMIENTOS RELEVANTE
${knowledgeContext || 'No hay conocimiento específico relevante para esta consulta.'}

## TU ROL
1. Responde preguntas sobre qué hace este agente y cómo funciona
2. Proporciona ejemplos prácticos y detallados de uso
3. Sugiere formas de sacar más provecho del agente
4. Explica las capacidades de manera clara y accesible
5. Ayuda a resolver problemas o dudas específicas
6. Cuando sea útil, menciona funcionalidades relacionadas

## FORMATO DE RESPUESTA
- Sé claro, conciso pero completo
- Usa emojis para hacer la respuesta más visual (🎯, ✅, 💡, etc.)
- Incluye ejemplos concretos cuando sea apropiado
- Si no sabes algo, indícalo honestamente
- Responde siempre en español

## IMPORTANTE
- Mantén el contexto de la conversación
- Personaliza las respuestas según las capacidades del agente
- Sugiere acciones concretas que el usuario puede tomar`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Llamar a Lovable AI
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.'
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

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log(`[agent-help-chat] Response generated for conversation: ${conversationId}`);

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      conversationId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[agent-help-chat] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
