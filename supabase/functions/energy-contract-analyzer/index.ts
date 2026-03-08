import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { contractText, contractUrl } = await req.json();
    
    if (!contractText && !contractUrl) {
      throw new Error('Se requiere contractText o contractUrl');
    }

    const systemPrompt = `Eres un analista legal especializado en contratos de suministro eléctrico en España.

ANALIZA el contrato proporcionado y extrae la siguiente información.

IMPORTANTE:
- Esta es una herramienta de APOYO al analista, no una decisión automática final.
- Sé conservador en tus conclusiones.
- Indica claramente cuando no puedas determinar algo con certeza.

RESPONDE EN JSON ESTRICTO:
{
  "resumen": "Resumen ejecutivo del contrato en 3-5 líneas",
  "comercializadora": "Nombre de la comercializadora",
  "tarifa": "Tarifa contratada",
  "permanencia": {
    "detectada": true/false,
    "duracion_meses": number o null,
    "fecha_fin": "fecha o null",
    "penalizacion": "descripción de penalización o null"
  },
  "renovacion_automatica": {
    "detectada": true/false,
    "condiciones": "descripción de condiciones o null",
    "plazo_preaviso_dias": number o null
  },
  "firma_expresa_requerida": {
    "necesaria": true/false,
    "motivo": "explicación"
  },
  "observaciones_riesgo": [
    "Lista de observaciones de riesgo detectadas"
  ],
  "clausulas_relevantes": [
    { "titulo": "título de cláusula", "resumen": "resumen breve", "riesgo": "bajo/medio/alto" }
  ],
  "datos_economicos": {
    "precio_energia_detectado": "si se detecta",
    "precio_potencia_detectado": "si se detecta",
    "otros_costes": "si se detectan"
  },
  "confianza_analisis": 0-100,
  "nota_analista": "Nota adicional para el analista humano"
}`;

    const userPrompt = `Analiza este contrato de suministro eléctrico:\n\n${contractText || `[Documento en URL: ${contractUrl}]`}`;

    console.log('[energy-contract-analyzer] Processing contract analysis');

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
        temperature: 0.3,
        max_tokens: 3000,
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

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log('[energy-contract-analyzer] Success');

    return new Response(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[energy-contract-analyzer] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
