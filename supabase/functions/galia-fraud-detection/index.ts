/**
 * GALIA - Fraud Detection Edge Function
 * Detects fraud indicators in LEADER grant applications
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FraudRequest {
  action: 'analyze_fraud' | 'check_splitting' | 'check_duplicates' | 'full_scan';
  expedienteData?: {
    beneficiario_nif: string;
    beneficiario_nombre: string;
    importe_solicitado: number;
    partidas: Array<{ concepto: string; importe: number; proveedor?: string; nif_proveedor?: string }>;
    proveedores?: Array<{ nombre: string; nif: string; importe: number }>;
  };
  historialExpedientes?: Array<{
    numero: string;
    beneficiario_nif: string;
    importe: number;
    estado: string;
    convocatoria: string;
    partidas?: Array<{ concepto: string; proveedor?: string; nif_proveedor?: string }>;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, expedienteData, historialExpedientes } = await req.json() as FraudRequest;
    console.log(`[galia-fraud-detection] Action: ${action}`);

    const systemPrompt = `Eres un experto en detección de fraude en subvenciones públicas LEADER/FEADER.

TU MISIÓN: Analizar expedientes de ayudas y detectar indicios de fraude según normativa española y europea.

INDICADORES DE FRAUDE A VERIFICAR:
1. FRACCIONAMIENTO (SPLITTING): División artificial de inversiones para evitar umbrales de contratación (>18.000€ requiere 3 ofertas, >50.000€ licitación pública)
2. DUPLICIDAD DE FACTURAS: Mismas facturas presentadas en múltiples convocatorias o expedientes
3. PROVEEDORES FICTICIOS: NIF inactivos, empresas sin actividad real, creadas poco antes de la solicitud
4. EMPRESAS VINCULADAS: Facturas entre empresas del mismo grupo/administrador, conflictos de interés
5. DESPROPORCIÓN: Presupuesto solicitado vs capacidad real del solicitante (facturación, empleados)
6. PAGOS EN EFECTIVO: Gastos >1.000€ pagados en efectivo (prohibido por Ley 11/2021)
7. CONCENTRACIÓN DE AYUDAS: Mismo beneficiario acumulando ayudas en múltiples convocatorias sin justificación
8. IRREGULARIDADES DOCUMENTALES: Fechas inconsistentes, formatos sospechosos, documentos alterados

NIVELES DE RIESGO:
- CRÍTICO: Evidencia clara de irregularidad - requiere bloqueo inmediato
- ALTO: Indicios fuertes - requiere investigación profunda
- MEDIO: Patrones sospechosos - requiere revisión adicional
- BAJO: Observaciones menores - documentar para seguimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "riesgoGlobal": "critico" | "alto" | "medio" | "bajo",
  "puntuacionRiesgo": 0-100,
  "indicadores": [
    {
      "tipo": "fraccionamiento" | "duplicidad" | "proveedor_ficticio" | "vinculacion" | "desproporcion" | "efectivo" | "concentracion" | "documental",
      "nivel": "critico" | "alto" | "medio" | "bajo",
      "titulo": "string",
      "descripcion": "string",
      "evidencia": "string",
      "accionRequerida": "string",
      "articuloNormativo": "string"
    }
  ],
  "alertas": [
    { "tipo": "bloqueo" | "revision" | "seguimiento", "mensaje": "string", "urgencia": "inmediata" | "24h" | "semanal" }
  ],
  "recomendaciones": ["string"],
  "resumen": "string"
}`;

    const userPrompt = action === 'full_scan'
      ? `Realiza un análisis COMPLETO de fraude para este expediente:
         
Datos del expediente: ${JSON.stringify(expedienteData)}

Historial de expedientes del mismo beneficiario y proveedores: ${JSON.stringify(historialExpedientes || [])}

Analiza TODOS los indicadores y devuelve un informe detallado.`
      : action === 'check_splitting'
      ? `Analiza exclusivamente el riesgo de FRACCIONAMIENTO (splitting) en estas partidas: ${JSON.stringify(expedienteData?.partidas)}
         
Verifica si hay divisiones artificiales para evitar umbrales de contratación.`
      : action === 'check_duplicates'
      ? `Busca DUPLICIDADES entre estos expedientes: ${JSON.stringify(historialExpedientes)}
         
Compara proveedores, importes, conceptos y fechas.`
      : `Analiza indicios de fraude: ${JSON.stringify(expedienteData)}`;

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
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found');
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-fraud-detection] Success: ${action}`);
    return new Response(JSON.stringify({ success: true, action, data: result, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-fraud-detection] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
