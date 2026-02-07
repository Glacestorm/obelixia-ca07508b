import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OmnichannelRequest {
  action: 'send_message' | 'suggest_response' | 'analyze_sentiment' | 'generate_summary' | 'auto_categorize';
  conversationId?: string;
  channel?: string;
  content?: string;
  contentType?: string;
  messages?: Array<{
    content: string;
    direction: string;
    sender_type: string;
    created_at: string;
  }>;
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

    const { action, conversationId, channel, content, contentType, messages } = await req.json() as OmnichannelRequest;
    console.log(`[crm-omnichannel] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'send_message':
        // In a real implementation, this would call WhatsApp/Email/SMS APIs
        console.log(`[crm-omnichannel] Sending ${contentType} message via ${channel} for conversation ${conversationId}`);
        return new Response(JSON.stringify({
          success: true,
          messageId: crypto.randomUUID(),
          status: 'sent',
          channel,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'suggest_response':
        systemPrompt = `Eres un asistente de atención al cliente experto y empático. Tu rol es sugerir respuestas profesionales y útiles.

CONTEXTO:
- Estás ayudando a un agente de soporte a responder a un cliente
- Las respuestas deben ser cordiales, claras y orientadas a resolver el problema
- Mantén un tono profesional pero cercano
- Si el cliente parece frustrado, muestra empatía primero

FORMATO DE RESPUESTA (JSON estricto):
{
  "suggestion": "texto de la respuesta sugerida",
  "alternatives": ["alternativa 1", "alternativa 2"],
  "tone": "empático" | "informativo" | "resolutivo",
  "confidence": 0.0-1.0
}`;

        const conversationHistory = (messages || [])
          .map(m => `${m.direction === 'inbound' ? 'Cliente' : 'Agente'}: ${m.content}`)
          .join('\n');

        userPrompt = `Historial de conversación:\n${conversationHistory}\n\nSugiere una respuesta apropiada para el agente.`;
        break;

      case 'analyze_sentiment':
        systemPrompt = `Eres un analizador de sentimientos experto en conversaciones de servicio al cliente.

ANALIZA:
- Tono general del cliente
- Nivel de satisfacción
- Señales de urgencia o frustración
- Intención del cliente

FORMATO DE RESPUESTA (JSON estricto):
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "score": -1.0 a 1.0,
  "emotions": ["emoción1", "emoción2"],
  "urgency": "low" | "medium" | "high",
  "satisfaction_risk": "bajo" | "medio" | "alto",
  "key_concerns": ["preocupación1", "preocupación2"],
  "recommendations": ["recomendación para el agente"]
}`;

        const customerMessages = (messages || [])
          .filter(m => m.direction === 'inbound')
          .map(m => m.content)
          .join('\n');

        userPrompt = `Analiza el sentimiento de estos mensajes del cliente:\n${customerMessages}`;
        break;

      case 'generate_summary':
        systemPrompt = `Eres un experto en resumir conversaciones de soporte al cliente.

GENERA:
- Resumen ejecutivo de la conversación
- Problema principal del cliente
- Acciones tomadas
- Estado actual
- Próximos pasos recomendados

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": "resumen en 2-3 oraciones",
  "main_issue": "descripción del problema",
  "actions_taken": ["acción1", "acción2"],
  "current_status": "resuelto" | "pendiente" | "escalado",
  "next_steps": ["paso1", "paso2"],
  "tags_suggested": ["tag1", "tag2"]
}`;

        userPrompt = `Resume esta conversación:\n${JSON.stringify(messages, null, 2)}`;
        break;

      case 'auto_categorize':
        systemPrompt = `Eres un sistema de categorización de tickets de soporte.

CATEGORIZA según:
- Tipo de consulta (soporte, ventas, facturación, devolución, información)
- Producto o servicio mencionado
- Prioridad sugerida
- Departamento apropiado

FORMATO DE RESPUESTA (JSON estricto):
{
  "category": "categoria principal",
  "subcategory": "subcategoría",
  "priority": "low" | "normal" | "high" | "urgent",
  "department": "soporte" | "ventas" | "facturación" | "logística",
  "tags": ["tag1", "tag2"],
  "confidence": 0.0-1.0
}`;

        userPrompt = `Categoriza esta conversación:\n${JSON.stringify(messages, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // Call AI for analysis actions
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
        max_tokens: 1500,
      }),
    });

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

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[crm-omnichannel] JSON parse error:', parseError);
      result = { rawContent: aiContent, parseError: true };
    }

    console.log(`[crm-omnichannel] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-omnichannel] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
