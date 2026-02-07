import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortalAIRequest {
  action: 'categorize_ticket' | 'suggest_resolution' | 'analyze_sentiment' | 'generate_response' | 'search_kb';
  portal_type: 'partner' | 'customer';
  ticket_data?: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
  };
  query?: string;
  context?: Record<string, unknown>;
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

    const { action, portal_type, ticket_data, query, context } = await req.json() as PortalAIRequest;

    console.log(`[portal-ai-assistant] Processing action: ${action} for ${portal_type}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'categorize_ticket':
        systemPrompt = `Eres un sistema de categorización de tickets de soporte para ObelixIA.
        
CATEGORÍAS DISPONIBLES:
- billing: Facturación, pagos, suscripciones
- technical: Problemas técnicos, errores, bugs
- integration: Integraciones, APIs, conectores
- feature_request: Solicitudes de nuevas funcionalidades
- training: Formación, documentación, ayuda
- account: Gestión de cuenta, usuarios, permisos
- compliance: Cumplimiento normativo, auditorías
- performance: Rendimiento, velocidad, optimización
- security: Seguridad, accesos, vulnerabilidades
- other: Otros

FORMATO DE RESPUESTA (JSON estricto):
{
  "category": "string",
  "confidence": 0-100,
  "suggested_priority": "low" | "medium" | "high" | "critical",
  "keywords": ["keyword1", "keyword2"],
  "estimated_resolution_time_hours": number
}`;

        userPrompt = `Categoriza este ticket:
Asunto: ${ticket_data?.subject}
Descripción: ${ticket_data?.description}`;
        break;

      case 'suggest_resolution':
        systemPrompt = `Eres un asistente experto de soporte técnico para ObelixIA, una plataforma enterprise de IA bancaria.

CONTEXTO:
- Plataforma: ERP con módulos de Contabilidad, RRHH, Fiscal, Legal, Migración
- Integraciones: Stripe, Supabase, APIs bancarias
- Usuarios: Entidades financieras, consultoras, partners tecnológicos

INSTRUCCIONES:
- Proporciona una resolución clara y paso a paso
- Incluye enlaces a documentación cuando sea relevante
- Sugiere artículos de la base de conocimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "suggested_resolution": "string con markdown",
  "steps": ["paso1", "paso2"],
  "related_articles": ["título artículo"],
  "escalation_needed": boolean,
  "escalation_reason": "string si aplica"
}`;

        userPrompt = `Sugiere una resolución para:
Asunto: ${ticket_data?.subject}
Descripción: ${ticket_data?.description}
Categoría: ${ticket_data?.category || 'sin categorizar'}
Prioridad: ${ticket_data?.priority || 'medium'}`;
        break;

      case 'analyze_sentiment':
        systemPrompt = `Analiza el sentimiento y urgencia del ticket de soporte.

FORMATO DE RESPUESTA (JSON estricto):
{
  "sentiment": "positive" | "neutral" | "negative" | "frustrated",
  "urgency_level": 1-10,
  "customer_satisfaction_risk": "low" | "medium" | "high",
  "key_concerns": ["concern1", "concern2"],
  "recommended_tone": "string",
  "escalation_triggers": ["trigger1"]
}`;

        userPrompt = `Analiza el sentimiento de:
${ticket_data?.description}`;
        break;

      case 'generate_response':
        systemPrompt = `Genera una respuesta profesional para un ticket de soporte de ObelixIA.

TONO:
- Profesional pero cercano
- Empático con el problema del cliente
- Orientado a soluciones
- Incluir siguiente paso claro

FORMATO DE RESPUESTA (JSON estricto):
{
  "response": "string con markdown",
  "tone": "formal" | "friendly" | "urgent",
  "follow_up_actions": ["action1"],
  "internal_notes": "string para equipo interno"
}`;

        userPrompt = `Genera respuesta para:
Asunto: ${ticket_data?.subject}
Descripción: ${ticket_data?.description}
Contexto adicional: ${JSON.stringify(context || {})}`;
        break;

      case 'search_kb':
        systemPrompt = `Busca en la base de conocimiento de ObelixIA y sugiere artículos relevantes.

ÁREAS DE CONOCIMIENTO:
- Módulos ERP (Contabilidad, RRHH, Fiscal, Legal)
- Integraciones (Stripe, APIs bancarias)
- Configuración y administración
- Cumplimiento normativo (PSD2, GDPR, DORA)
- Mejores prácticas

FORMATO DE RESPUESTA (JSON estricto):
{
  "query_understanding": "string",
  "suggested_articles": [
    {"title": "string", "category": "string", "relevance": 0-100, "summary": "string"}
  ],
  "related_topics": ["topic1"],
  "no_results_alternative": "string si no hay resultados"
}`;

        userPrompt = `Busca artículos relacionados con: ${query}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

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
        max_tokens: 2000,
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[portal-ai-assistant] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[portal-ai-assistant] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      portal_type,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[portal-ai-assistant] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
