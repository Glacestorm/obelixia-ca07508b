/**
 * hr-workforce-simulation — V2-RRHH-FASE-8
 * AI narrative enrichment for workforce simulations.
 * Receives a SimulationResult and returns a streaming explanation.
 */

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
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { result } = await req.json();
    if (!result?.input || !result?.baseline || !result?.impact) {
      return new Response(JSON.stringify({ error: 'Invalid simulation result' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { input, baseline, impact } = result;

    const systemPrompt = `Eres el analista del Gemelo Digital Laboral de ObelixIA.
Tu función es explicar los resultados de simulaciones de workforce.

REGLAS ESTRICTAS:
- Responde siempre en español.
- Basa tu análisis EXCLUSIVAMENTE en los datos proporcionados.
- No inventes datos ni estadísticas externas.
- No des asesoramiento legal ni fiscal vinculante.
- Deja claro que son ESTIMACIONES basadas en datos del sistema.
- Usa un tono profesional, directo y útil.

FORMATO DE RESPUESTA:
1. **Resumen ejecutivo** (2-3 líneas)
2. **Impacto económico** (coste mensual, anual, variación %)
3. **Riesgos operativos** (si los hay)
4. **Supuestos aplicados** (qué hipótesis se han usado)
5. **Recomendación** (acción sugerida, sin comprometer legalidad)
6. **Limitaciones** (qué no cubre este análisis)`;

    const userPrompt = `Analiza esta simulación de workforce:

ESCENARIO: ${input.label} (${input.scenarioType})
PARÁMETROS: ${JSON.stringify(input.parameters)}

BASELINE ACTUAL:
- Empleados activos: ${baseline.activeEmployees}
- Salario medio: €${baseline.avgSalary?.toLocaleString()}
- Coste bruto mensual: €${baseline.totalGrossMonthlyCost?.toLocaleString()}
- Coste empresa mensual: €${baseline.totalEmployerMonthlyCost?.toLocaleString()}
- Tasa absentismo: ${baseline.absenteeismRate}%
- Tasa rotación: ${baseline.turnoverRate}%

IMPACTO CALCULADO:
- Delta coste bruto mensual: €${impact.deltaGrossMonthlyCost?.toLocaleString()} (${impact.percentChangeGross}%)
- Delta coste empresa mensual: €${impact.deltaEmployerMonthlyCost?.toLocaleString()} (${impact.percentChangeEmployer}%)
- Delta coste anual: €${impact.deltaAnnualCost?.toLocaleString()}
- Nuevo salario medio: €${impact.newAvgSalary?.toLocaleString()}
- Nuevo coste empresa mensual total: €${impact.newTotalMonthlyCost?.toLocaleString()}
- Delta headcount: ${impact.deltaHeadcount}

RIESGOS DETECTADOS: ${impact.operationalRisks?.map((r: any) => `[${r.severity}] ${r.label}: ${r.description}`).join('; ') || 'Ninguno'}

SUPUESTOS: ${impact.assumptions?.join('; ')}

LIMITACIONES: ${impact.limitations?.join('; ')}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('[hr-workforce-simulation] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
