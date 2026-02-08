import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardRequest {
  action: 'load_kpis' | 'generate_insights' | 'get_performance_metrics' | 'run_comparative_analysis' | 'generate_executive_report' | 'export_report' | 'save_config' | 'load_config';
  period?: string;
  focus?: string[];
  params?: Record<string, unknown>;
  reportType?: string;
  reportId?: string;
  format?: string;
  config?: Record<string, unknown>;
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

    const { action, period, focus, params, reportType, reportId, format, config } = await req.json() as DashboardRequest;
    console.log(`[galia-executive-dashboard] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'load_kpis':
        systemPrompt = `Eres un analista de KPIs para gestión de subvenciones públicas LEADER.

GENERA KPIs ejecutivos:
- Eficiencia operativa
- Cumplimiento normativo
- Ejecución presupuestaria
- Impacto territorial

RESPONDE EN JSON ESTRICTO:
{
  "kpis": [
    {
      "id": "string",
      "name": "string",
      "category": "efficiency|compliance|financial|operational|impact",
      "currentValue": number,
      "previousValue": number,
      "target": number,
      "unit": "string",
      "trend": "up|down|stable",
      "trendPercent": number,
      "status": "on_track|at_risk|off_track|exceeded",
      "sparklineData": [number],
      "lastUpdated": "ISO date"
    }
  ]
}`;
        userPrompt = `Genera KPIs para período: ${period || 'month'}`;
        break;

      case 'generate_insights':
        systemPrompt = `Eres un asesor estratégico IA para gestión de subvenciones LEADER.

GENERA insights accionables sobre:
- Oportunidades de mejora
- Riesgos identificados
- Recomendaciones estratégicas
- Tendencias relevantes
- Comparativas benchmark

RESPONDE EN JSON ESTRICTO:
{
  "insights": [
    {
      "id": "string",
      "insightType": "opportunity|risk|recommendation|trend|benchmark",
      "priority": "critical|high|medium|low",
      "title": "string",
      "description": "string",
      "impact": "string",
      "suggestedAction": "string",
      "dataPoints": [{ "label": "string", "value": "string" }],
      "confidence": 0-1,
      "generatedAt": "ISO date"
    }
  ]
}`;
        userPrompt = focus?.length 
          ? `Genera insights enfocados en: ${focus.join(', ')}` 
          : 'Genera insights estratégicos generales';
        break;

      case 'get_performance_metrics':
        return new Response(JSON.stringify({
          success: true,
          metrics: {
            period: period || 'current_month',
            expedientesProcessed: 156,
            averageProcessingTime: 12.5,
            approvalRate: 78.5,
            rejectionRate: 15.2,
            complianceScore: 92.3,
            budgetUtilization: 67.8,
            userSatisfaction: 4.2,
            aiAssistedDecisions: 89,
            automationRate: 45.6
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'run_comparative_analysis':
        return new Response(JSON.stringify({
          success: true,
          comparisons: [
            { metric: 'Tasa Aprobación', currentPeriod: 78.5, previousPeriod: 72.3, yearOverYear: 82.1, benchmark: 75.0, ranking: 3, totalEntities: 11 },
            { metric: 'Tiempo Medio Resolución', currentPeriod: 12.5, previousPeriod: 15.2, yearOverYear: 18.3, benchmark: 14.0, ranking: 2, totalEntities: 11 },
            { metric: 'Score Cumplimiento', currentPeriod: 92.3, previousPeriod: 89.7, yearOverYear: 85.4, benchmark: 90.0, ranking: 1, totalEntities: 11 }
          ]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'generate_executive_report':
        systemPrompt = `Eres un generador de informes ejecutivos para dirección de GAL LEADER.

GENERA informe ${reportType} con:
- Resumen ejecutivo conciso
- Highlights y logros
- Preocupaciones y riesgos
- Recomendaciones estratégicas

RESPONDE EN JSON ESTRICTO:
{
  "report": {
    "id": "string",
    "reportType": "weekly|monthly|quarterly|annual",
    "period": { "start": "ISO date", "end": "ISO date" },
    "generatedAt": "ISO date",
    "summary": "string",
    "highlights": ["string"],
    "concerns": ["string"],
    "recommendations": ["string"],
    "kpis": [],
    "insights": []
  }
}`;
        userPrompt = `Genera informe ejecutivo ${reportType}`;
        break;

      case 'export_report':
        return new Response(JSON.stringify({
          success: true,
          downloadUrl: `https://storage.example.com/reports/${reportId}.${format}`,
          format,
          reportId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'save_config':
      case 'load_config':
        return new Response(JSON.stringify({
          success: true,
          config: config || {
            refreshInterval: 300000,
            kpiLayout: 'grid',
            showBenchmarks: true,
            alertThresholds: {},
            favoriteKPIs: []
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

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
        temperature: 0.6,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[galia-executive-dashboard] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-executive-dashboard] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
