import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { installations, analytics } = await req.json();

    if (!installations || installations.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        recommendations: [{
          type: 'info',
          priority: 'medium',
          title: 'Sin datos de instalación',
          description: 'Registra al menos una instalación solar para recibir recomendaciones personalizadas.',
          impact: null,
        }],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `Eres un consultor energético especializado en autoconsumo solar fotovoltaico en España.
Analiza los datos de instalaciones solares y genera recomendaciones accionables.

REGLAS:
- Sé específico con datos numéricos
- Cada recomendación debe tener: type (optimization|warning|opportunity|info), priority (high|medium|low), title (max 60 chars), description (max 200 chars), impact (ahorro estimado en €/año o null)
- Evalúa: eficiencia de autoconsumo, dimensionamiento, baterías, compensación de excedentes, tarifa óptima, mantenimiento, dependencia de red
- Si ratio autoconsumo < 60%, sugiere batería
- Si dependencia de red > 70%, la instalación puede estar infrautilizada
- Si ahorro real < 70% del estimado, hay un problema
- Si no hay contrato de mantenimiento, alertar
- Si excedentes > autoconsumo, posible sobredimensionamiento
- Genera entre 3 y 8 recomendaciones

FORMATO JSON estricto:
{
  "recommendations": [
    { "type": "...", "priority": "...", "title": "...", "description": "...", "impact": number|null }
  ],
  "overallScore": 0-100,
  "summary": "resumen ejecutivo en 1-2 frases"
}`;

    const userPrompt = `Instalaciones: ${JSON.stringify(installations)}
Analytics: ${JSON.stringify(analytics)}`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit. Intenta más tarde.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No AI content');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [], overallScore: 0, summary: 'Error parsing' };
    } catch {
      result = { recommendations: [], overallScore: 0, summary: content.substring(0, 200) };
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[energy-solar-recommendations] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
