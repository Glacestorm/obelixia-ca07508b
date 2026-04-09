import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

interface TotalRewardsRequest {
  action: 'analyze_compensation' | 'compare_market' | 'generate_recommendations' | 'forecast_total_package';
  employee_id?: string;
  company_id?: string;
  fiscal_year?: number;
  job_level?: string;
  job_family?: string;
  location?: string;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, employee_id, company_id, fiscal_year, job_level, job_family, location } = await req.json() as TotalRewardsRequest;

    // === UNIFIED TENANT RESOLUTION ===
    let resolvedCompanyId: string | null = null;

    if (employee_id) {
      // Path 1: Need to resolve company from employee first — use a preliminary auth check
      // We'll validate tenant access after resolving the company_id
      if (company_id) {
        resolvedCompanyId = company_id;
      } else {
        // We need userClient to resolve employee → company_id via RLS
        // Use company_id from a preliminary lookup; for now validate auth only
        const { validateAuth } = await import('../_shared/tenant-auth.ts');
        const authResult = await validateAuth(req);
        if (isAuthError(authResult)) {
          return new Response(JSON.stringify(authResult.body), {
            status: authResult.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create a temporary userClient for the employee lookup
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const authHeader = req.headers.get('Authorization')!;
        const tempUserClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        const { data: empData, error: empError } = await tempUserClient
          .from('erp_hr_employees')
          .select('company_id')
          .eq('id', employee_id)
          .maybeSingle();

        if (empError || !empData?.company_id) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        resolvedCompanyId = empData.company_id;
      }
    } else if (company_id) {
      resolvedCompanyId = company_id;
    } else {
      return new Response(JSON.stringify({ error: 'Bad Request: employee_id or company_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === VALIDATE TENANT ACCESS ===
    const authResult = await validateTenantAccess(req, resolvedCompanyId!);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userId, userClient } = authResult;
    const companyId = resolvedCompanyId!;

    console.log(`[erp-hr-total-rewards] Processing action: ${action}, user: ${userId}, company: ${companyId}`);

    let systemPrompt = '';
    let userPrompt = '';
    let contextData: Record<string, unknown> = {};

    // Fetch relevant data based on action
    if (action === 'analyze_compensation' && employee_id && fiscal_year) {
      const { data: compensations } = await userClient
        .from('erp_hr_compensation')
        .select('*')
        .eq('employee_id', employee_id);

      const { data: benefitsEnrollments } = await userClient
        .from('erp_hr_benefits_enrollments')
        .select(`
          *,
          plan:erp_hr_benefits_plans(*)
        `)
        .eq('employee_id', employee_id)
        .eq('status', 'active');

      const { data: benchmarks } = await userClient
        .from('erp_hr_salary_bands')
        .select('*')
        .eq('company_id', companyId)
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
      const { data: benchmarks } = await userClient
        .from('erp_hr_salary_bands')
        .select('*')
        .eq('company_id', companyId)
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
      const { data: currentComp } = await userClient
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
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
