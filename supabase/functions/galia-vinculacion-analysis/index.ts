/**
 * GALIA - Análisis de Vinculaciones Empresariales
 * Edge Function para detección de empresas vinculadas, concentración de ayudas y conflictos
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VinculacionRequest {
  action: 'detect_vinculaciones' | 'check_concentracion' | 'flag_conflictos';
  nif?: string;
  beneficiarioNombre?: string;
  expedienteId?: string;
  context?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, nif, beneficiarioNombre, context } = await req.json() as VinculacionRequest;
    console.log(`[galia-vinculacion-analysis] Action: ${action}, NIF: ${nif}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'detect_vinculaciones':
        systemPrompt = `Eres un experto en análisis de vinculaciones empresariales para la gestión de ayudas LEADER.

CRITERIOS DE VINCULACIÓN (según normativa de la administración competente):
- Administradores o socios comunes (>25% participación)
- Misma dirección fiscal o domicilio social
- Mismas cuentas bancarias
- Relaciones familiares entre administradores (hasta 2º grado)
- Empresas del mismo grupo mercantil
- Proveedores recurrentes del beneficiario

FORMATO DE RESPUESTA (JSON estricto):
{
  "vinculaciones": [
    {
      "tipo": "administrador_comun|direccion_fiscal|cuenta_bancaria|grupo_mercantil|familiar|proveedor_recurrente",
      "entidad_vinculada": "Nombre de la entidad",
      "nif_vinculado": "NIF",
      "nivel_riesgo": "bajo|medio|alto|critico",
      "detalle": "Descripción del vínculo",
      "requiere_accion": true
    }
  ],
  "resumen": {
    "total_vinculaciones": 0,
    "riesgo_global": "bajo|medio|alto|critico",
    "recomendacion": "texto"
  }
}`;
        userPrompt = `Analiza posibles vinculaciones para el beneficiario con NIF: ${nif || 'no proporcionado'}, nombre: ${beneficiarioNombre || 'no proporcionado'}. Contexto: ${JSON.stringify(context || {})}`;
        break;

      case 'check_concentracion':
        systemPrompt = `Eres un experto en control de concentración de ayudas públicas y límites de minimis.

NORMATIVA APLICABLE:
- Reglamento (UE) 2023/2831 de minimis: máximo 300.000€ en 3 ejercicios fiscales
- Obligación de declaración de ayudas previas
- Control de acumulación con ayudas de la administración competente

FORMATO DE RESPUESTA (JSON estricto):
{
  "analisis_minimis": {
    "ayudas_previas_estimadas": 0,
    "limite_disponible": 300000,
    "porcentaje_consumido": 0,
    "alerta": false,
    "detalle_ayudas": []
  },
  "concentracion": {
    "beneficiario_directo": 0,
    "empresas_vinculadas": 0,
    "total_grupo": 0,
    "supera_limite": false
  },
  "recomendacion": "texto"
}`;
        userPrompt = `Verifica concentración de ayudas para NIF: ${nif}. ${JSON.stringify(context || {})}`;
        break;

      case 'flag_conflictos':
        systemPrompt = `Eres un auditor especializado en detección de conflictos de interés en gestión de subvenciones.

TIPOS DE CONFLICTO:
- Técnico instructor/evaluador con relación con el beneficiario
- Miembros de órganos de decisión con interés en el proyecto
- Proveedores vinculados al personal del GAL

FORMATO DE RESPUESTA (JSON estricto):
{
  "conflictos": [
    {
      "tipo": "relacion_tecnico|organo_decision|proveedor_vinculado",
      "nivel": "potencial|confirmado",
      "descripcion": "texto",
      "accion_requerida": "texto"
    }
  ],
  "score_integridad": 0
}`;
        userPrompt = `Evalúa posibles conflictos de interés para el expediente. Contexto: ${JSON.stringify(context || {})}`;
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
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let resultado;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
    } catch {
      resultado = { rawContent: content, parseError: true };
    }

    return new Response(JSON.stringify({
      success: true, action, data: resultado, timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-vinculacion-analysis] Error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
