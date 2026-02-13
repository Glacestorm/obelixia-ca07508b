/**
 * GALIA - Reconocimiento Automático de Gastos Justificados
 * Edge Function para extracción OCR de facturas y clasificación en partidas LEADER
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GastoRequest {
  action: 'extract_factura' | 'classify_partida' | 'validate_gasto';
  facturaTexto?: string;
  partidas?: Array<{ concepto: string; importe: number }>;
  tipoProyecto?: string;
  presupuestoAprobado?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, facturaTexto, partidas, tipoProyecto, presupuestoAprobado } = await req.json() as GastoRequest;
    console.log(`[galia-gasto-recognition] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'extract_factura':
        systemPrompt = `Eres un sistema OCR especializado en extracción de datos de facturas para justificación de ayudas LEADER.

CAMPOS A EXTRAER:
- proveedor: Nombre/razón social del emisor
- nif_proveedor: NIF/CIF del emisor
- numero_factura: Número de factura
- fecha_emision: Fecha de emisión (formato YYYY-MM-DD)
- conceptos: Array de líneas con concepto, cantidad, precio unitario, importe
- base_imponible: Base imponible total
- tipo_iva: Porcentaje de IVA aplicado
- cuota_iva: Cuota de IVA
- total: Total factura
- forma_pago: Efectivo, transferencia, cheque, etc.

FORMATO DE RESPUESTA (JSON estricto):
{
  "factura": {
    "proveedor": "", "nif_proveedor": "", "numero_factura": "",
    "fecha_emision": "", "conceptos": [],
    "base_imponible": 0, "tipo_iva": 21, "cuota_iva": 0, "total": 0,
    "forma_pago": ""
  },
  "alertas": [],
  "confianza": 0.95
}`;
        userPrompt = `Extrae los datos de esta factura:\n\n${facturaTexto}`;
        break;

      case 'classify_partida':
        systemPrompt = `Eres un clasificador de gastos en partidas presupuestarias LEADER/FEADER.

PARTIDAS PRESUPUESTARIAS LEADER TÍPICAS:
1. Obra civil y reformas
2. Maquinaria y equipamiento
3. Mobiliario
4. Equipamiento informático
5. Instalaciones (eléctricas, climatización, etc.)
6. Vehículos
7. Gastos generales (hasta 12% s/inversión material)
8. Honorarios profesionales
9. Licencias y permisos
10. Publicidad y difusión

FORMATO DE RESPUESTA (JSON estricto):
{
  "clasificacion": [
    {
      "concepto_factura": "",
      "partida_asignada": "",
      "codigo_partida": "",
      "importe": 0,
      "confianza": 0.9,
      "justificacion": ""
    }
  ],
  "resumen_por_partida": {}
}`;
        userPrompt = `Clasifica estos gastos en partidas presupuestarias LEADER para un proyecto de tipo "${tipoProyecto || 'general'}":\n\n${JSON.stringify(partidas)}`;
        break;

      case 'validate_gasto':
        systemPrompt = `Eres un validador de elegibilidad de gastos para ayudas LEADER.

REGLAS DE ELEGIBILIDAD:
1. Pagos en efectivo: NO elegibles si >1.000€ (Ley 11/2021)
2. Ofertas competitivas: Obligatorias 3 ofertas si importe >18.000€ con desviación >15%
3. Coherencia: El gasto debe ser coherente con el proyecto aprobado
4. Temporalidad: Fecha factura dentro del período de ejecución
5. IVA: Solo deducible si el beneficiario NO puede recuperarlo
6. Gastos generales: Máximo 12% sobre inversión material
7. Autoempleo/gastos de personal: Según convocatoria

FORMATO DE RESPUESTA (JSON estricto):
{
  "validacion": [
    {
      "concepto": "",
      "importe": 0,
      "elegible": true,
      "motivo": "",
      "alertas": [],
      "requiere_ofertas": false,
      "pago_efectivo_alerta": false
    }
  ],
  "resumen": {
    "total_elegible": 0,
    "total_no_elegible": 0,
    "alertas_count": 0,
    "porcentaje_elegibilidad": 100
  }
}`;
        userPrompt = `Valida la elegibilidad de estos gastos para un proyecto LEADER de tipo "${tipoProyecto}" con presupuesto aprobado de ${presupuestoAprobado || 0}€:\n\n${JSON.stringify(partidas)}`;
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
    console.error('[galia-gasto-recognition] Error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
