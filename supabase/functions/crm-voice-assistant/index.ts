import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceAssistantRequest {
  action: 'process_command' | 'transcribe' | 'analyze_context';
  command?: string;
  audioBase64?: string;
  context?: {
    entityType?: string;
    entityId?: string;
    entityName?: string;
    currentView?: string;
    recentActivity?: Array<{ action: string; timestamp: string }>;
  };
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

    const { action, command, context } = await req.json() as VoiceAssistantRequest;
    console.log(`[crm-voice-assistant] Processing action: ${action}`);

    if (action === 'process_command') {
      const systemPrompt = `Eres un asistente de CRM inteligente y conversacional. Tu rol es ayudar a los usuarios a gestionar su CRM de manera eficiente mediante comandos de voz o texto.

CAPACIDADES:
- Consultar y filtrar leads, deals, contactos y empresas
- Agendar llamadas, reuniones y tareas
- Analizar el pipeline y métricas de ventas
- Enviar emails y crear seguimientos
- Proporcionar insights sobre la actividad comercial

CONTEXTO ACTUAL:
${context ? JSON.stringify(context, null, 2) : 'Sin contexto específico'}

REGLAS:
1. Responde de forma clara y concisa, como si hablaras naturalmente
2. Si puedes ejecutar una acción, incluye el campo "action" en tu respuesta
3. Usa números reales simulados para métricas (leads, valores de deals, etc.)
4. Si necesitas más información, pregunta de forma natural
5. Siempre ofrece una siguiente acción sugerida

FORMATO DE RESPUESTA (JSON estricto):
{
  "response": "texto de respuesta natural",
  "action": {
    "type": "show_leads" | "show_pipeline" | "schedule_call" | "send_email" | "show_activities" | "show_deals" | "create_task" | null,
    "data": { parámetros relevantes }
  },
  "suggestions": ["sugerencia 1", "sugerencia 2"]
}`;

      const userPrompt = `Comando del usuario: "${command}"

Responde de forma útil y ejecuta la acción si es posible.`;

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
          result = { response: aiContent };
        }
      } catch (parseError) {
        console.error('[crm-voice-assistant] JSON parse error:', parseError);
        result = { response: aiContent };
      }

      console.log(`[crm-voice-assistant] Success: ${action}`);

      return new Response(JSON.stringify({
        success: true,
        response: result.response,
        action: result.action,
        suggestions: result.suggestions,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);

  } catch (error) {
    console.error('[crm-voice-assistant] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
