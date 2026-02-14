const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PlannerRequest {
  action: 'generate_spec' | 'budget_review' | 'generate_raci';
  params?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, params } = await req.json() as PlannerRequest;
    console.log(`[galia-phase2-planner] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_spec':
        systemPrompt = `Eres un experto en pliegos de prescripciones técnicas para proyectos de cooperación LEADER/FEADER.
Genera un pliego técnico profesional y detallado para la herramienta solicitada.

ESTRUCTURA DEL PLIEGO:
1. OBJETO DEL CONTRATO
2. ALCANCE FUNCIONAL
3. REQUISITOS TÉCNICOS
4. REQUISITOS NO FUNCIONALES (seguridad, rendimiento, accesibilidad)
5. ENTREGABLES
6. CRITERIOS DE ACEPTACIÓN
7. PLAZO DE EJECUCIÓN
8. GARANTÍA Y SOPORTE

Incluye referencias a normativa aplicable (LCSP, ENS, RGPD, Ley 39/2015).
Responde en texto plano estructurado, no JSON.`;
        userPrompt = `Genera el pliego técnico para: "${(params as any)?.templateName}"
Descripción: ${(params as any)?.templateDescription}
Contexto: Proyecto de cooperación entre Grupos de Acción Local para digitalización de gestión de ayudas LEADER mediante IA.`;
        break;

      case 'budget_review':
        systemPrompt = `Eres un experto en presupuestación de proyectos de cooperación LEADER/FEADER.
Analiza el presupuesto proporcionado y genera recomendaciones.

FORMATO DE RESPUESTA (texto plano):
1. ANÁLISIS GENERAL: valoración del equilibrio presupuestario
2. PARTIDAS SOBREDIMENSIONADAS: identificar posibles excesos
3. PARTIDAS INFRADIMENSIONADAS: riesgos de subdimensionamiento
4. RECOMENDACIONES: ajustes sugeridos con justificación
5. COMPARATIVA: contraste con proyectos similares LEADER`;
        userPrompt = `Analiza este presupuesto de Fase 2:\n${JSON.stringify(params, null, 2)}`;
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
        temperature: 0.5,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit', success: false }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({
      success: true,
      action,
      data: content,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-phase2-planner] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
