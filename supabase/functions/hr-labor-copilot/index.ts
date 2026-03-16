import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CopilotRequest {
  question: string;
  context: Record<string, unknown>;
  conversationHistory?: Array<{ role: string; content: string }>;
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

    const { question, context, conversationHistory = [] } = await req.json() as CopilotRequest;

    if (!question || !context) {
      throw new Error('Missing question or context');
    }

    const systemPrompt = `Eres el Copiloto Laboral de ObelixIA, un asistente especializado en gestión operativa de RRHH para asesorías laborales multiempresa.

TU ROL:
- Ayudar a operadores y asesores laborales a entender el estado de su cartera de empresas
- Explicar riesgos, bloqueos y prioridades basándote SOLO en datos reales del sistema
- Proponer acciones concretas y razonables
- Ser transparente sobre limitaciones y datos parciales

REGLAS ESTRICTAS:
${(context.systemConstraints as string[] || []).map((c: string) => `- ${c}`).join('\n')}

FORMATO DE RESPUESTA:
- Responde siempre en español
- Sé conciso pero completo
- Estructura tu respuesta con secciones claras usando markdown
- Incluye siempre:
  1. **Resumen**: síntesis de 1-2 líneas
  2. **Detalle**: análisis basado en datos del contexto
  3. **Señales base**: qué datos sustentan tu análisis
  4. **Acciones sugeridas**: qué hacer concretamente (numeradas)
  5. **Limitaciones**: si hay datos parciales o incertidumbre, indícalo

DATOS DEL SISTEMA:
${JSON.stringify(context, null, 2)}

IMPORTANTE:
- Si no tienes datos suficientes para responder, dilo claramente
- No inventes estadísticas ni porcentajes que no estén en el contexto
- Refiere a la puntuación de salud (0-100) cuando sea relevante
- Menciona las categorías de alertas por nombre (cierre, readiness, documental, SLA, consistencia, trazabilidad)`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: question },
    ];

    console.log(`[hr-labor-copilot] Processing question: ${question.substring(0, 80)}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'rate_limit',
          message: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({
          success: false,
          error: 'credits_exhausted',
          message: 'Créditos de IA insuficientes.',
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

    console.log(`[hr-labor-copilot] Success, response length: ${content.length}`);

    return new Response(JSON.stringify({
      success: true,
      response: content,
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[hr-labor-copilot] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
