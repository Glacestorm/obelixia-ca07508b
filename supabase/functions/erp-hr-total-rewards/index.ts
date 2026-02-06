import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TotalRewardsRequest {
  action: 'analyze_compensation' | 'compare_market' | 'generate_recommendations' | 'forecast_total_package';
  employee_id?: string;
  fiscal_year?: number;
  job_level?: string;
  job_family?: string;
  location?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, employee_id, fiscal_year, job_level, job_family, location } = await req.json() as TotalRewardsRequest;

    console.log(`[erp-hr-total-rewards] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';
    let contextData: Record<string, unknown> = {};

    // Fetch relevant data based on action
    if (action === 'analyze_compensation' && employee_id && fiscal_year) {
      // Use the actual tables from schema
      const { data: compensations } = await supabase
        .from('erp_hr_compensation')
        .select('*')
        .eq('employee_id', employee_id);

      const { data: benefitsEnrollments } = await supabase
        .from('erp_hr_benefits_enrollments')
        .select(`
          *,
          plan:erp_hr_benefits_plans(*)
        `)
        .eq('employee_id', employee_id)
        .eq('status', 'active');

      const { data: benchmarks } = await supabase
        .from('erp_hr_salary_bands')
        .select('*')
        .limit(20);

      contextData = { compensations, benefitsEnrollments, benchmarks };

      systemPrompt = `Eres un analista experto en compensación total y Total Rewards.
Tu rol es analizar paquetes de compensación de empleados y proporcionar insights estratégicos.

CAPACIDADES:
- Análisis detallado de estructura salarial
- Comparación con benchmarks de mercado
- Identificación de brechas competitivas
- Recomendaciones de optimización fiscal
- Valoración de beneficios no monetarios

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": "Resumen ejecutivo del paquete",
  "totalValue": 0,
  "breakdown": {
    "cash": { "amount": 0, "percentage": 0 },
    "benefits": { "amount": 0, "percentage": 0 },
    "equity": { "amount": 0, "percentage": 0 },
    "perks": { "amount": 0, "percentage": 0 }
  },
  "marketPosition": {
    "percentile": 0,
    "comparison": "above_market | at_market | below_market",
    "gap": 0
  },
  "strengths": ["..."],
  "improvements": ["..."],
  "recommendations": [
    {
      "action": "Descripción de la acción",
      "impact": "high | medium | low",
      "estimatedValue": 0
    }
  ],
  "fiscalOptimizations": ["..."]
}`;

      userPrompt = `Analiza el siguiente paquete de compensación:

DATOS DEL EMPLEADO:
${JSON.stringify(compensations, null, 2)}

BENCHMARKS DE MERCADO DISPONIBLES:
${JSON.stringify(benchmarks, null, 2)}

Proporciona un análisis completo del paquete de compensación total, incluyendo:
1. Valoración total del paquete
2. Desglose por categorías
3. Posición competitiva vs mercado
4. Fortalezas y áreas de mejora
5. Recomendaciones concretas
6. Optimizaciones fiscales posibles`;
    }

    else if (action === 'compare_market') {
      const { data: benchmarks } = await supabase
        .from('erp_hr_salary_bands')
        .select('*')
        .eq('level', job_level || 'mid')
        .eq('job_family', job_family || 'engineering');

      contextData = { benchmarks, job_level, job_family, location };

      systemPrompt = `Eres un experto en estudios de compensación y benchmarking salarial.

FORMATO DE RESPUESTA (JSON estricto):
{
  "marketAnalysis": {
    "percentile25": 0,
    "percentile50": 0,
    "percentile75": 0,
    "percentile90": 0,
    "recommendedRange": { "min": 0, "max": 0 }
  },
  "trends": ["..."],
  "competitiveFactors": ["..."],
  "recommendations": ["..."]
}`;

      userPrompt = `Analiza el mercado de compensación para:
- Nivel: ${job_level || 'mid'}
- Familia de puesto: ${job_family || 'engineering'}
- Ubicación: ${location || 'Spain'}

Datos de benchmark disponibles:
${JSON.stringify(benchmarks, null, 2)}`;
    }

    else if (action === 'generate_recommendations') {
      systemPrompt = `Eres un consultor de compensación y beneficios.

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendations": [
    {
      "category": "base_salary | variable | benefits | equity | perks",
      "action": "Descripción",
      "rationale": "Justificación",
      "estimatedCost": 0,
      "expectedROI": "Descripción del retorno",
      "priority": "high | medium | low"
    }
  ],
  "implementationPlan": ["Paso 1", "Paso 2", "..."],
  "riskConsiderations": ["..."]
}`;

      userPrompt = `Genera recomendaciones de mejora para el paquete de compensación basándote en las mejores prácticas del mercado español y europeo.`;
    }

    else if (action === 'forecast_total_package' && employee_id) {
      const { data: currentComp } = await supabase
        .from('erp_hr_compensation')
        .select('*')
        .eq('employee_id', employee_id)
        .order('effective_from', { ascending: false })
        .limit(10);

      contextData = { currentComp };

      systemPrompt = `Eres un analista de planificación de compensación.

FORMATO DE RESPUESTA (JSON estricto):
{
  "forecast": {
    "year1": { "total": 0, "growth": 0 },
    "year3": { "total": 0, "growth": 0 },
    "year5": { "total": 0, "growth": 0 }
  },
  "assumptions": ["..."],
  "scenarios": {
    "conservative": { "year5Total": 0 },
    "moderate": { "year5Total": 0 },
    "aggressive": { "year5Total": 0 }
  },
  "keyDrivers": ["..."]
}`;

      userPrompt = `Proyecta la evolución del paquete de compensación para los próximos 5 años:

Historial de compensación:
${JSON.stringify(currentComp, null, 2)}`;
    }

    else {
      throw new Error(`Acción no soportada: ${action}`);
    }

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
        temperature: 0.7,
        max_tokens: 2000,
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
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { rawContent: content, parseError: true };
      }
    } catch (parseError) {
      console.error('[erp-hr-total-rewards] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-total-rewards] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      analysis: result,
      context: contextData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-total-rewards] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
