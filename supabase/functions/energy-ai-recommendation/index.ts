import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, temperature = 0.7, maxTokens = 2000) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: 'Demasiadas solicitudes. Intenta más tarde.' };
    if (response.status === 402) throw { status: 402, message: 'Créditos de IA insuficientes.' };
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(content: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
    return { rawContent: content, parseError: true };
  } catch {
    return { rawContent: content, parseError: true };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = await req.json();
    const action = body.action || 'recommend';

    // === GET ENERGY NEWS ===
    if (action === 'get_energy_news') {
      const { category, search } = body;
      const systemPrompt = `Eres un periodista experto en el sector energético español y europeo. Genera noticias realistas y actuales sobre el mercado energético.

FORMATO DE RESPUESTA (JSON estricto - array):
[
  {
    "id": "uuid string",
    "title": "título de la noticia",
    "summary": "resumen de 2-3 líneas",
    "category": "mercado" | "regulacion" | "tecnologia" | "renovables" | "precios",
    "source": "nombre de la fuente",
    "date": "YYYY-MM-DD",
    "importance": "alta" | "media" | "baja",
    "tags": ["tag1", "tag2"],
    "url": null
  }
]

Genera exactamente 8 noticias relevantes y recientes. Usa fechas cercanas a hoy (marzo 2026).`;

      const userPrompt = category && category !== 'all'
        ? `Genera noticias del sector energético español, categoría: ${category}${search ? `. Tema: ${search}` : ''}`
        : `Genera noticias variadas del sector energético español${search ? `. Tema: ${search}` : ''}`;

      const content = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, 0.8, 3000);
      const result = parseJSON(content);

      return new Response(JSON.stringify({ success: true, action, data: Array.isArray(result) ? result : result.news || [result] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === GET REGULATIONS ===
    if (action === 'get_regulations') {
      const { scope, search } = body;
      const systemPrompt = `Eres un jurista experto en regulación energética española y europea. Genera un listado de normativa vigente y relevante del sector energético.

FORMATO DE RESPUESTA (JSON estricto - array):
[
  {
    "id": "uuid string",
    "title": "título/nombre de la norma",
    "code": "código normativo (BOE, DOUE, etc.)",
    "scope": "local" | "autonomica" | "estatal" | "europea",
    "category": "tarifas" | "peajes" | "impuestos" | "autoconsumo" | "comercializacion" | "medioambiente" | "derechos_consumidor",
    "summary": "resumen de la norma en 2-3 líneas",
    "effective_date": "YYYY-MM-DD",
    "status": "vigente" | "en_tramite" | "derogada",
    "impact": "alto" | "medio" | "bajo",
    "applies_to": ["residencial", "pyme", "industrial"],
    "url": null
  }
]

Genera exactamente 10 normas relevantes y reales del sector energético español.`;

      const userPrompt = scope && scope !== 'all'
        ? `Lista normativa energética española, ámbito: ${scope}${search ? `. Búsqueda: ${search}` : ''}`
        : `Lista normativa energética española vigente${search ? `. Búsqueda: ${search}` : ''}`;

      const content = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, 0.5, 4000);
      const result = parseJSON(content);

      return new Response(JSON.stringify({ success: true, action, data: Array.isArray(result) ? result : result.regulations || [result] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === REGULATORY CHAT ===
    if (action === 'regulatory_chat') {
      const { question, context } = body;
      if (!question) throw new Error('No se proporcionó pregunta');

      const systemPrompt = `Eres un consultor energético experto y jurista especializado en regulación energética española y europea.

Tu rol es responder preguntas sobre:
- Normativa energética (RD, directivas UE, leyes)
- Tarifas reguladas, peajes, cargos
- Impuestos sobre la electricidad y gas
- Autoconsumo, excedentes, compensación
- Derechos del consumidor energético
- Obligaciones de comercializadoras y distribuidoras
- Mercado eléctrico OMIE, pool, PVPC
- Certificados energéticos
- Bonos sociales

REGLAS:
- Responde siempre en español
- Sé preciso y cita normativa cuando sea posible
- Si no estás seguro, indícalo claramente
- Estructura tu respuesta con headers markdown
- Máximo 500 palabras

FORMATO: Texto libre en markdown.`;

      const userPrompt = context
        ? `Contexto del expediente: ${JSON.stringify(context)}\n\nPregunta: ${question}`
        : `Pregunta: ${question}`;

      const content = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, 0.6, 2000);

      return new Response(JSON.stringify({ success: true, action, data: { answer: content } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === DEFAULT: ENERGY RECOMMENDATION (existing logic) ===
    const { caseData, supply, invoices, contracts, consumptionProfile, tariffCatalog } = body;

    const systemPrompt = `Eres un consultor energético experto en el mercado eléctrico español.

CONTEXTO:
- Analizas expedientes de optimización tarifaria para clientes residenciales y PYME.
- Tu rol es generar un BORRADOR de recomendación que será revisado y editado por un analista humano.
- Sé conservador en las estimaciones de ahorro.
- Basa tus cálculos en los datos reales proporcionados.

IMPORTANTE:
- Esto es un BORRADOR, no una decisión final.
- Indica claramente las incertidumbres.
- Si faltan datos críticos, señálalo.

RESPONDE EN JSON ESTRICTO con esta estructura:
{
  "recommended_supplier": "nombre de la comercializadora recomendada",
  "recommended_tariff": "nombre de la tarifa recomendada",
  "recommended_power_p1": número en kW,
  "recommended_power_p2": número en kW,
  "monthly_savings_estimate": número en euros,
  "annual_savings_estimate": número en euros,
  "risk_level": "low" | "medium" | "high",
  "confidence_score": 0-100,
  "implementation_notes": "observaciones detalladas para el analista",
  "reasoning_summary": "resumen ejecutivo de 2-3 líneas del análisis"
}`;

    const invoiceSummary = (invoices || []).map((inv: any) => ({
      periodo: `${inv.billing_start || '?'} a ${inv.billing_end || '?'}`,
      dias: inv.days,
      consumo_total: inv.consumption_total_kwh,
      p1: inv.consumption_p1_kwh,
      p2: inv.consumption_p2_kwh,
      p3: inv.consumption_p3_kwh,
      coste_energia: inv.energy_cost,
      coste_potencia: inv.power_cost,
      total: inv.total_amount,
    }));

    const contractSummary = (contracts || []).map((c: any) => ({
      comercializadora: c.supplier,
      tarifa: c.tariff_name,
      inicio: c.start_date,
      fin: c.end_date,
      permanencia: c.has_permanence,
      renovacion: c.has_renewal,
      penalizacion: c.early_exit_penalty_text,
    }));

    const tariffSample = (tariffCatalog || []).slice(0, 20).map((t: any) => ({
      comercializadora: t.supplier,
      tarifa: t.tariff_name,
      energia_p1: t.energy_price_p1,
      energia_p2: t.energy_price_p2,
      energia_p3: t.energy_price_p3,
      potencia_p1: t.power_price_p1,
      potencia_p2: t.power_price_p2,
      permanencia: t.has_permanence,
    }));

    const userPrompt = `Genera un borrador de recomendación energética para este expediente:

DATOS DEL EXPEDIENTE:
- Cliente: ${caseData?.title || 'No especificado'}
- Comercializadora actual: ${caseData?.current_supplier || 'No especificada'}
- Tarifa actual: ${caseData?.current_tariff || 'No especificada'}
- CUPS: ${caseData?.cups || 'No especificado'}

PUNTO DE SUMINISTRO:
- Tarifa acceso: ${supply?.tariff_access || 'No especificada'}
- Distribuidora: ${supply?.distributor || 'No especificada'}
- Potencia contratada P1: ${supply?.contracted_power_p1 || 'No especificada'} kW
- Potencia contratada P2: ${supply?.contracted_power_p2 || 'No especificada'} kW
- Máxima demanda P1: ${supply?.max_demand_p1 || 'No registrada'} kW
- Máxima demanda P2: ${supply?.max_demand_p2 || 'No registrada'} kW

PERFIL DE CONSUMO:
${consumptionProfile ? `- Personas en casa: ${consumptionProfile.household_size || '?'}
- Aerotermia ACS: ${consumptionProfile.has_acs_aerothermal ? 'Sí' : 'No'}
- Bomba calor: ${consumptionProfile.has_heat_pump ? 'Sí' : 'No'}
- AC Inverter: ${consumptionProfile.has_ac_inverter ? 'Sí' : 'No'}
- Coche eléctrico: ${consumptionProfile.has_ev ? 'Sí' : 'No'}
- Inducción: ${consumptionProfile.has_induction ? 'Sí' : 'No'}
- Teletrabajo: ${consumptionProfile.work_from_home ? 'Sí' : 'No'}
- Carga desplazable: ${consumptionProfile.shiftable_load_pct || '?'}%
- Hora duchas: ${consumptionProfile.showers_start_time || '?'} - ${consumptionProfile.showers_end_time || '?'}` : 'No disponible'}

FACTURAS (${invoiceSummary.length} registradas):
${JSON.stringify(invoiceSummary, null, 2)}

CONTRATOS:
${JSON.stringify(contractSummary, null, 2)}

TARIFAS DISPONIBLES EN CATÁLOGO (muestra):
${JSON.stringify(tariffSample, null, 2)}

Genera la recomendación optimizando el coste total (energía + potencia) teniendo en cuenta el perfil de consumo del cliente.`;

    console.log('[energy-ai-recommendation] Processing AI recommendation draft');

    const content = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt, 0.4, 3000);
    const result = parseJSON(content);

    console.log('[energy-ai-recommendation] Success');

    return new Response(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[energy-ai-recommendation] Error:', error);

    if (error?.status === 429 || error?.status === 402) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
