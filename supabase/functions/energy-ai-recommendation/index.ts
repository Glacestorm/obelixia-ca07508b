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

    const { caseData, supply, invoices, contracts, consumptionProfile, tariffCatalog } = await req.json();

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
  "implementation_notes": "observaciones detalladas para el analista, incluyendo:\\n- Justificación de la tarifa recomendada\\n- Análisis de potencia\\n- Riesgos identificados\\n- Pasos recomendados\\n- Datos que faltan o requieren verificación",
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
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', message: 'Demasiadas solicitudes. Intenta más tarde.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required', message: 'Créditos de IA insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    console.log('[energy-ai-recommendation] Success');

    return new Response(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[energy-ai-recommendation] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
