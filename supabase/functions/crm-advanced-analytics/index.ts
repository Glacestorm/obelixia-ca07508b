import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  action: 'executive_summary' | 'trend_analysis' | 'predictions' | 'recommendations' | 'run_prediction' | 'analyze_funnel' | 'analyze_cohorts';
  context?: {
    companyId?: string;
    timeRange?: { start: string; end: string };
    entityType?: string;
    filters?: Record<string, unknown>;
  };
  analysisType?: string;
  entityType?: string;
  entityId?: string;
  funnelType?: string;
  periodStart?: string;
  periodEnd?: string;
  cohortType?: string;
  cohortPeriod?: string;
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

    const body = await req.json() as AnalyticsRequest;
    const { action, context } = body;

    console.log(`[crm-advanced-analytics] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'executive_summary':
        systemPrompt = `Eres un analista ejecutivo de CRM especializado en generar resúmenes de alto nivel.

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": {
    "headline": "string - titular principal",
    "keyMetrics": [
      { "name": "string", "value": "number", "change": "number", "trend": "up|down|stable" }
    ],
    "highlights": ["string"],
    "concerns": ["string"],
    "opportunities": ["string"],
    "recommendations": [
      { "action": "string", "priority": "high|medium|low", "expectedImpact": "string" }
    ],
    "outlook": "string - perspectiva general"
  },
  "performanceScore": 0-100,
  "healthStatus": "excellent|good|at_risk|critical"
}`;
        userPrompt = `Genera un resumen ejecutivo para el período ${context?.timeRange?.start || 'último mes'} a ${context?.timeRange?.end || 'hoy'}.
Contexto: ${JSON.stringify(context || {})}`;
        break;

      case 'trend_analysis':
        systemPrompt = `Eres un analista de tendencias CRM experto en identificar patrones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "trends": [
    {
      "metric": "string",
      "direction": "increasing|decreasing|stable|volatile",
      "changeRate": "number percentage",
      "significance": "high|medium|low",
      "explanation": "string",
      "forecast": { "next30days": "number", "next90days": "number", "confidence": 0-100 }
    }
  ],
  "seasonality": ["string - patrones estacionales detectados"],
  "anomalies": [
    { "date": "string", "metric": "string", "value": "number", "explanation": "string" }
  ],
  "correlations": [
    { "metrics": ["string", "string"], "strength": 0-100, "type": "positive|negative" }
  ],
  "insights": ["string - insights principales"]
}`;
        userPrompt = `Analiza tendencias CRM para el contexto: ${JSON.stringify(context || {})}`;
        break;

      case 'predictions':
      case 'run_prediction':
        systemPrompt = `Eres un motor de predicción CRM que analiza datos para generar pronósticos.

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [
    {
      "entityType": "${body.entityType || 'deal'}",
      "entityId": "${body.entityId || 'general'}",
      "analysisType": "${body.analysisType || 'deal_forecast'}",
      "predictionScore": 0-100,
      "confidenceLevel": 0-100,
      "riskFactors": [
        { "factor": "string", "impact": 0-100, "description": "string" }
      ],
      "opportunityFactors": [
        { "factor": "string", "impact": 0-100, "description": "string" }
      ],
      "recommendedActions": [
        { "action": "string", "priority": "high|medium|low", "expectedImpact": 0-100 }
      ],
      "predictedOutcome": {
        "scenario": "best|expected|worst",
        "value": "number",
        "probability": 0-100
      },
      "predictedValue": "number",
      "predictedDate": "ISO date"
    }
  ],
  "modelConfidence": 0-100,
  "dataQuality": "high|medium|low"
}`;
        userPrompt = `Genera predicciones ${body.analysisType || 'generales'} para ${body.entityType || 'deals'}.
Entity ID: ${body.entityId || 'all'}
Contexto: ${JSON.stringify(context || {})}`;
        break;

      case 'analyze_funnel':
        systemPrompt = `Eres un especialista en análisis de funnels de conversión CRM.

FORMATO DE RESPUESTA (JSON estricto):
{
  "funnel": {
    "name": "Funnel ${body.funnelType || 'sales'}",
    "type": "${body.funnelType || 'sales'}",
    "periodStart": "${body.periodStart || ''}",
    "periodEnd": "${body.periodEnd || ''}",
    "stages": [
      {
        "name": "string",
        "count": "number",
        "conversionRate": 0-100,
        "avgTimeInStage": "number en días",
        "dropOffRate": 0-100
      }
    ],
    "totalEntered": "number",
    "totalConverted": "number",
    "overallConversionRate": 0-100,
    "averageTimeToConvert": "number en días",
    "bottleneckStage": "string - etapa con mayor drop-off",
    "dropOffAnalysis": {
      "primaryReasons": ["string"],
      "costOfDropOff": "number estimated revenue lost"
    },
    "recommendations": ["string - acciones para mejorar"],
    "comparedToPrevious": {
      "conversionChange": "number percentage",
      "velocityChange": "number percentage"
    }
  }
}`;
        userPrompt = `Analiza el funnel de tipo ${body.funnelType || 'sales'} del ${body.periodStart} al ${body.periodEnd}.`;
        break;

      case 'analyze_cohorts':
        systemPrompt = `Eres un experto en análisis de cohortes para CRM y customer success.

FORMATO DE RESPUESTA (JSON estricto):
{
  "cohortAnalysis": {
    "type": "${body.cohortType || 'retention'}",
    "period": "${body.cohortPeriod || 'monthly'}",
    "cohorts": [
      {
        "cohortDate": "string ISO date",
        "totalEntities": "number",
        "retentionByPeriod": [
          { "periodIndex": 0, "activeEntities": "number", "retentionRate": 0-100, "metricValue": "number" }
        ],
        "averageLifetimeValue": "number",
        "churnRate": 0-100
      }
    ],
    "overallRetention": {
      "month1": 0-100,
      "month3": 0-100,
      "month6": 0-100,
      "month12": 0-100
    },
    "bestPerformingCohort": { "date": "string", "reason": "string" },
    "worstPerformingCohort": { "date": "string", "reason": "string" },
    "trends": ["string"],
    "insights": ["string"],
    "recommendations": ["string"]
  }
}`;
        userPrompt = `Genera análisis de cohortes tipo ${body.cohortType || 'retention'} con período ${body.cohortPeriod || 'monthly'}.`;
        break;

      case 'recommendations':
        systemPrompt = `Eres un consultor estratégico de CRM que genera recomendaciones accionables.

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendations": [
    {
      "id": "uuid",
      "category": "sales|marketing|support|operations",
      "title": "string",
      "description": "string",
      "priority": "critical|high|medium|low",
      "expectedImpact": {
        "metric": "string",
        "improvement": "number percentage",
        "timeframe": "string"
      },
      "effort": "low|medium|high",
      "steps": ["string"],
      "kpis": ["string - métricas para medir éxito"],
      "risks": ["string"]
    }
  ],
  "quickWins": ["string - acciones de bajo esfuerzo alto impacto"],
  "strategicInitiatives": ["string - iniciativas a largo plazo"]
}`;
        userPrompt = `Genera recomendaciones estratégicas basadas en: ${JSON.stringify(context || {})}`;
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Por favor intenta de nuevo más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[crm-advanced-analytics] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[crm-advanced-analytics] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-advanced-analytics] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
