/**
 * erp-hr-executive-analytics
 * Edge Function para análisis predictivo ejecutivo de RRHH
 * Fase 4 - Enterprise SaaS 2025-2026
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface AnalyticsRequest {
  action: 'get_predictions' | 'analyze_trends' | 'generate_insights' | 'benchmark_analysis' | 'risk_assessment';
  context?: {
    companyId?: string;
    period?: string;
    metrics?: Record<string, unknown>;
  };
  params?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, context, params } = await req.json() as AnalyticsRequest;

    const companyId = context?.companyId;
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === VALIDATE TENANT ACCESS ===
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userId } = authResult;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`[erp-hr-executive-analytics] Processing action: ${action}, User: ${userId}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'get_predictions':
        systemPrompt = `Eres un analista predictivo experto en RRHH para empresas españolas.
        
CONTEXTO DEL ROL:
- Analiza tendencias históricas de plantilla, costes y rotación
- Genera predicciones a 3, 6 y 12 meses
- Identifica patrones estacionales y cíclicos
- Considera factores macroeconómicos españoles

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [
    {
      "metric": "headcount",
      "current": number,
      "predicted_3m": number,
      "predicted_6m": number,
      "predicted_12m": number,
      "confidence": number,
      "trend": "up" | "down" | "stable",
      "factors": ["factor1", "factor2"]
    }
  ],
  "scenarios": {
    "optimistic": { "headcount": number, "cost": number, "turnover": number },
    "baseline": { "headcount": number, "cost": number, "turnover": number },
    "pessimistic": { "headcount": number, "cost": number, "turnover": number }
  },
  "seasonalPatterns": [
    { "month": string, "hiringPeak": boolean, "turnoverRisk": "low" | "medium" | "high" }
  ]
}`;
        userPrompt = `Genera predicciones para esta empresa:
${JSON.stringify(context?.metrics || {})}

Considera datos actuales y tendencias del mercado laboral español 2025-2026.`;
        break;

      case 'analyze_trends':
        systemPrompt = `Eres un analista de tendencias de RRHH especializado en el mercado español.

CONTEXTO DEL ROL:
- Identifica tendencias en métricas de RRHH
- Detecta anomalías y desviaciones
- Correlaciona indicadores entre sí
- Proporciona contexto del sector

FORMATO DE RESPUESTA (JSON estricto):
{
  "trends": [
    {
      "metric": string,
      "direction": "improving" | "declining" | "stable",
      "magnitude": number,
      "significance": "high" | "medium" | "low",
      "correlation": string | null,
      "insight": string
    }
  ],
  "anomalies": [
    {
      "metric": string,
      "value": number,
      "expected": number,
      "deviation": number,
      "severity": "warning" | "critical",
      "possibleCause": string
    }
  ],
  "correlations": [
    {
      "metrics": [string, string],
      "coefficient": number,
      "interpretation": string
    }
  ]
}`;
        userPrompt = `Analiza estas tendencias de RRHH:
${JSON.stringify(params || {})}`;
        break;

      case 'generate_insights':
        systemPrompt = `Eres un consultor ejecutivo de RRHH con experiencia en empresas españolas.

CONTEXTO DEL ROL:
- Genera insights accionables para la dirección
- Prioriza por impacto en el negocio
- Considera normativa laboral española
- Propone acciones específicas con plazos

FORMATO DE RESPUESTA (JSON estricto):
{
  "insights": [
    {
      "id": string,
      "title": string,
      "description": string,
      "impact": "high" | "medium" | "low",
      "urgency": "immediate" | "short_term" | "medium_term",
      "category": "cost_optimization" | "talent_retention" | "compliance" | "efficiency" | "growth",
      "actions": [
        {
          "action": string,
          "deadline": string,
          "responsible": string,
          "expectedOutcome": string
        }
      ],
      "estimatedSavings": number | null,
      "riskIfIgnored": string
    }
  ],
  "executiveSummary": string,
  "priorityMatrix": {
    "urgent_important": [string],
    "not_urgent_important": [string],
    "urgent_not_important": [string],
    "not_urgent_not_important": [string]
  }
}`;
        userPrompt = `Genera insights ejecutivos basados en estos datos de RRHH:

Métricas actuales: ${JSON.stringify(context?.metrics || {})}
Periodo: ${context?.period || '30 días'}

Enfócate en:
1. Optimización de costes laborales
2. Retención de talento
3. Cumplimiento normativo
4. Eficiencia operativa`;
        break;

      case 'benchmark_analysis':
        systemPrompt = `Eres un experto en benchmarking de RRHH con datos del mercado español.

CONTEXTO DEL ROL:
- Compara métricas con el sector empresarial español
- Utiliza datos de referencia 2024-2025
- Considera tamaño de empresa y CNAE
- Proporciona posicionamiento competitivo

FORMATO DE RESPUESTA (JSON estricto):
{
  "benchmarks": [
    {
      "metric": string,
      "companyValue": number,
      "sectorAverage": number,
      "sectorBest": number,
      "percentile": number,
      "gap": number,
      "assessment": "above_average" | "average" | "below_average" | "critical"
    }
  ],
  "competitivePosition": {
    "overall": number,
    "strengths": [string],
    "weaknesses": [string],
    "opportunities": [string]
  },
  "improvementPriorities": [
    {
      "metric": string,
      "currentGap": number,
      "targetValue": number,
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high"
    }
  ]
}`;
        userPrompt = `Realiza análisis benchmark para:
${JSON.stringify(params || {})}

Compara con sector empresarial español de tamaño similar.`;
        break;

      case 'risk_assessment':
        systemPrompt = `Eres un analista de riesgos laborales especializado en España.

CONTEXTO DEL ROL:
- Identifica riesgos de capital humano
- Evalúa impacto y probabilidad
- Propone mitigaciones específicas
- Considera normativa laboral española

FORMATO DE RESPUESTA (JSON estricto):
{
  "risks": [
    {
      "id": string,
      "name": string,
      "category": "talent" | "compliance" | "cost" | "operational" | "legal",
      "probability": "high" | "medium" | "low",
      "impact": "critical" | "high" | "medium" | "low",
      "riskScore": number,
      "currentIndicators": [string],
      "mitigationActions": [
        {
          "action": string,
          "priority": number,
          "cost": "low" | "medium" | "high",
          "effectiveness": number
        }
      ],
      "monitoringKPIs": [string]
    }
  ],
  "overallRiskLevel": "low" | "medium" | "high" | "critical",
  "riskTrend": "improving" | "stable" | "worsening",
  "immediateActions": [string],
  "contingencyPlans": [
    {
      "scenario": string,
      "trigger": string,
      "response": string
    }
  ]
}`;
        userPrompt = `Evalúa riesgos de RRHH para:
${JSON.stringify(context?.metrics || {})}

Considera especialmente:
- Rotación de personal clave
- Cumplimiento normativo (contratos, PRL, RGPD)
- Costes laborales y presupuesto
- Conflictividad laboral`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // AI Call
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
        max_tokens: 3000,
      }),
    });

    // Error handling
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Payment required', 
          message: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    // Parse response
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
      console.error('[erp-hr-executive-analytics] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-executive-analytics] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-executive-analytics] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
