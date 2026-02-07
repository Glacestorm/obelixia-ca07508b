/**
 * GALIA - Moderador de Costes IA
 * Edge Function para análisis de presupuestos LEADER
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ModeradorRequest {
  action: 'analyze' | 'get_reference' | 'compare';
  presupuesto?: string;
  tipoProyecto?: string;
  partidas?: Array<{
    concepto: string;
    descripcion: string;
    importe: number;
  }>;
}

interface CostItem {
  id: string;
  concepto: string;
  descripcion: string;
  importeSolicitado: number;
  importeReferencia: number;
  desviacion: number;
  estado: 'ok' | 'alerta' | 'critico';
  comentarioIA?: string;
  necesitaOfertas: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, presupuesto, tipoProyecto } = await req.json() as ModeradorRequest;

    console.log(`[galia-moderador-costes] Processing action: ${action}, type: ${tipoProyecto}`);

    if (action !== 'analyze') {
      return new Response(JSON.stringify({
        success: false,
        error: `Action ${action} not implemented yet`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt for cost moderation
    const systemPrompt = `Eres un experto en moderación de costes para proyectos LEADER/FEADER.

TU MISIÓN:
Analizar presupuestos de proyectos de desarrollo rural y detectar desviaciones respecto a costes de referencia.

CONOCIMIENTO BASE DE COSTES (precios máximos orientativos):
- Maquinaria agrícola: Tractores 80-120CV: 45.000-75.000€; Tractores >120CV: 70.000-110.000€
- Obra civil: Nave agrícola/industrial: 500-700€/m²; Reforma local comercial: 300-500€/m²
- Instalaciones fotovoltaicas: Autoconsumo <100kWp: 900-1.200€/kWp
- Mobiliario hostelería: 200-400€/m² de establecimiento
- Equipamiento informático: 800-2.000€/puesto de trabajo
- Vehículos comerciales: Furgonetas: 25.000-40.000€; Vehículos industriales: según tonelaje

CRITERIOS DE MODERACIÓN:
- Desviación ≤5%: Estado OK
- Desviación 5-15%: Estado ALERTA (revisar)
- Desviación >15%: Estado CRÍTICO (requiere justificación)
- Importes >18.000€ con desviación >15%: Requiere 3 ofertas comparativas

FORMATO DE RESPUESTA (JSON estricto):
{
  "items": [
    {
      "id": "1",
      "concepto": "nombre de la partida",
      "descripcion": "descripción técnica",
      "importeSolicitado": 0,
      "importeReferencia": 0,
      "desviacion": 0,
      "estado": "ok|alerta|critico",
      "comentarioIA": "explicación del análisis",
      "necesitaOfertas": true|false
    }
  ],
  "resumen": {
    "totalSolicitado": 0,
    "totalModerado": 0,
    "ahorroPotencial": 0,
    "alertas": 0,
    "criticos": 0
  },
  "recomendacionesGenerales": ["recomendación 1", "recomendación 2"]
}`;

    const userPrompt = `Analiza el siguiente presupuesto para un proyecto de tipo "${tipoProyecto || 'general'}":

${presupuesto}

Devuelve ÚNICAMENTE un JSON válido con el análisis de moderación de costes.`;

    // Call AI
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
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          success: false
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let resultado;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[galia-moderador-costes] JSON parse error:', parseError);
      // Return structured error
      return new Response(JSON.stringify({
        success: false,
        error: 'Error parsing AI response',
        rawContent: content
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tiempoRespuesta = Date.now() - startTime;
    console.log(`[galia-moderador-costes] Success - Time: ${tiempoRespuesta}ms`);

    return new Response(JSON.stringify({
      success: true,
      resultado: {
        ...resultado,
        confianza: 0.85 // Base confidence
      },
      tiempoRespuesta,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-moderador-costes] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
