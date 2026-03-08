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
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      throw new Error('Se requiere pdfBase64');
    }

    // Validate size (~5MB in base64 ≈ 6.67MB string)
    if (pdfBase64.length > 7 * 1024 * 1024) {
      throw new Error('PDF demasiado grande (máx. 5MB)');
    }

    const systemPrompt = `Eres un parser de facturas eléctricas españolas. Extrae TODOS los datos numéricos de la factura.

RESPONDE EXCLUSIVAMENTE en JSON con esta estructura:
{
  "billing_start": "YYYY-MM-DD o null",
  "billing_end": "YYYY-MM-DD o null",
  "days": number o null,
  "consumption_total_kwh": number o null,
  "consumption_p1_kwh": number o null,
  "consumption_p2_kwh": number o null,
  "consumption_p3_kwh": number o null,
  "contracted_power_p1_kw": number o null,
  "contracted_power_p2_kw": number o null,
  "max_demand_p1_kw": number o null,
  "max_demand_p2_kw": number o null,
  "energy_cost": number o null,
  "power_cost": number o null,
  "meter_rental": number o null,
  "electricity_tax": number o null,
  "vat": number o null,
  "other_costs": number o null,
  "total_amount": number o null,
  "supplier": "nombre comercializadora o null",
  "tariff": "tarifa de acceso (2.0TD, 3.0TD, etc.) o null",
  "cups": "CUPS o null",
  "contract_reference": "referencia contrato o null",
  "reactive_energy_kvarh": number o null,
  "excess_power_cost": number o null,
  "confidence": 0-100,
  "warnings": ["lista de campos que no se pudieron extraer con certeza"]
}

REGLAS:
- Todos los importes en euros sin IVA salvo total_amount que incluye IVA
- Consumos en kWh, potencias en kW
- Si no encuentras un campo, pon null
- El campo confidence indica tu confianza global en la extracción`;

    console.log('[energy-invoice-parser] Parsing invoice PDF (base64 client-side)');

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
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrae todos los datos de esta factura eléctrica española.' },
              { type: 'image_url', image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit', message: 'Demasiadas solicitudes.' }), {
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

    console.log('[energy-invoice-parser] Success, confidence:', result?.confidence);

    return new Response(JSON.stringify({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[energy-invoice-parser] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
