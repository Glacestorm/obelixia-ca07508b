/**
 * legal-predictive-analytics - Edge function for predictive legal intelligence
 * Phase 9: AI-powered litigation prediction, cost estimation, and jurisprudence analysis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";
import { mapAuthError, validationError, internalError, errorResponse } from "../_shared/error-contract.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PredictiveRequest {
  action: 
    | 'predict_litigation_outcome'
    | 'estimate_legal_costs'
    | 'analyze_jurisprudence_trends'
    | 'benchmark_clauses'
    | 'identify_proactive_risks'
    | 'settlement_recommendation'
    | 'case_similarity_analysis'
    | 'legal_timeline_forecast';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
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

    // --- S7.1: Auth hardening — validateAuth ---
    const authResult = await validateAuth(req);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    // --- end auth ---

    const { action, context, params } = await req.json() as PredictiveRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'predict_litigation_outcome':
        systemPrompt = `Eres un analista predictivo legal especializado en predicción de resultados de litigios.

TU ROL:
- Analizar casos legales y predecir probabilidad de éxito
- Evaluar fortalezas y debilidades de cada posición
- Identificar factores determinantes del resultado
- Proporcionar rangos de confianza estadísticos

JURISDICCIONES: España, Andorra, UE, UK, UAE, USA

FORMATO DE RESPUESTA (JSON estricto):
{
  "prediction": {
    "outcome": "favorable" | "unfavorable" | "settlement_likely" | "uncertain",
    "probability": 0-100,
    "confidenceInterval": { "low": number, "high": number }
  },
  "factors": [
    {
      "factor": "string",
      "impact": "positive" | "negative" | "neutral",
      "weight": 0-100,
      "explanation": "string"
    }
  ],
  "precedents": [
    {
      "caseId": "string",
      "jurisdiction": "string",
      "outcome": "string",
      "similarity": 0-100,
      "keyLearning": "string"
    }
  ],
  "risks": ["string"],
  "recommendations": ["string"],
  "estimatedDuration": {
    "minMonths": number,
    "maxMonths": number,
    "mostLikelyMonths": number
  }
}`;

        userPrompt = `Analiza este caso y predice el resultado:
${JSON.stringify(params || context || {})}`;
        break;

      case 'estimate_legal_costs':
        systemPrompt = `Eres un experto en estimación de costes legales y presupuestación de litigios.

TU ROL:
- Estimar costes totales de procedimientos legales
- Desglosar por fases y conceptos
- Comparar con benchmarks de mercado
- Identificar oportunidades de optimización

INCLUIR: Honorarios abogados, procuradores, peritos, tasas judiciales, costas, indemnizaciones potenciales

FORMATO DE RESPUESTA (JSON estricto):
{
  "totalEstimate": {
    "low": number,
    "expected": number,
    "high": number,
    "currency": "EUR"
  },
  "breakdown": [
    {
      "concept": "string",
      "phase": "string",
      "amount": number,
      "percentageOfTotal": number,
      "variability": "fixed" | "variable" | "contingent"
    }
  ],
  "timeline": [
    {
      "phase": "string",
      "expectedCost": number,
      "startMonth": number,
      "endMonth": number
    }
  ],
  "riskFactors": [
    {
      "risk": "string",
      "potentialImpact": number,
      "probability": 0-100
    }
  ],
  "marketBenchmark": {
    "averageCost": number,
    "percentile": number,
    "comparison": "below" | "average" | "above"
  },
  "costOptimizations": [
    {
      "suggestion": "string",
      "potentialSavings": number,
      "feasibility": "easy" | "medium" | "difficult"
    }
  ]
}`;

        userPrompt = `Estima los costes legales para:
${JSON.stringify(params || context || {})}`;
        break;

      case 'analyze_jurisprudence_trends':
        systemPrompt = `Eres un analista de tendencias jurisprudenciales con expertise en múltiples jurisdicciones.

TU ROL:
- Identificar tendencias en resoluciones judiciales
- Detectar cambios de criterio en tribunales
- Anticipar evolución de doctrina legal
- Mapear divergencias entre jurisdicciones

FUENTES: CENDOJ, EUR-Lex, HUDOC, Tribunales Supremos, TJUE

FORMATO DE RESPUESTA (JSON estricto):
{
  "trends": [
    {
      "area": "string",
      "trend": "restrictive" | "expansive" | "stable" | "volatile",
      "direction": "string",
      "confidence": 0-100,
      "timeframe": "string",
      "impactLevel": "low" | "medium" | "high" | "critical"
    }
  ],
  "keyDecisions": [
    {
      "caseReference": "string",
      "court": "string",
      "date": "string",
      "doctrine": "string",
      "impact": "string"
    }
  ],
  "jurisdictionalDivergences": [
    {
      "issue": "string",
      "positions": [
        {
          "jurisdiction": "string",
          "position": "string"
        }
      ]
    }
  ],
  "upcomingChanges": [
    {
      "topic": "string",
      "expectedChange": "string",
      "timeline": "string",
      "probability": 0-100
    }
  ],
  "recommendations": ["string"]
}`;

        userPrompt = `Analiza tendencias jurisprudenciales para:
${JSON.stringify(params || context || {})}`;
        break;

      case 'benchmark_clauses':
        systemPrompt = `Eres un experto en benchmarking de cláusulas contractuales y análisis de mercado.

TU ROL:
- Comparar cláusulas con estándares de mercado
- Identificar términos favorables/desfavorables
- Sugerir mejoras basadas en mejores prácticas
- Evaluar posición negociadora

FORMATO DE RESPUESTA (JSON estricto):
{
  "clauseAnalysis": [
    {
      "clauseType": "string",
      "currentTerms": "string",
      "marketPosition": "below_market" | "market_standard" | "above_market" | "unusual",
      "percentile": 0-100,
      "riskLevel": "low" | "medium" | "high",
      "suggestedImprovement": "string"
    }
  ],
  "overallPosition": {
    "score": 0-100,
    "assessment": "string",
    "negotiationPower": "weak" | "balanced" | "strong"
  },
  "industryBenchmarks": [
    {
      "metric": "string",
      "yourValue": "string",
      "industryAverage": "string",
      "topQuartile": "string"
    }
  ],
  "negotiationPriorities": [
    {
      "clause": "string",
      "priority": 1-5,
      "rationale": "string",
      "fallbackPosition": "string"
    }
  ]
}`;

        userPrompt = `Analiza y compara estas cláusulas con el mercado:
${JSON.stringify(params || context || {})}`;
        break;

      case 'identify_proactive_risks':
        systemPrompt = `Eres un sistema de detección proactiva de riesgos legales empresariales.

TU ROL:
- Identificar riesgos legales antes de que se materialicen
- Correlacionar señales de alerta temprana
- Priorizar por impacto y probabilidad
- Sugerir medidas preventivas

ÁREAS: Laboral, Mercantil, Fiscal, RGPD, Compliance, Contractual

FORMATO DE RESPUESTA (JSON estricto):
{
  "identifiedRisks": [
    {
      "riskId": "string",
      "category": "string",
      "description": "string",
      "probability": 0-100,
      "impact": "low" | "medium" | "high" | "critical",
      "expectedCost": number,
      "timeToMaterialization": "string",
      "earlyWarningSignals": ["string"],
      "mitigationActions": [
        {
          "action": "string",
          "cost": number,
          "effectiveness": 0-100,
          "implementationTime": "string"
        }
      ]
    }
  ],
  "riskMatrix": {
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  },
  "totalExposure": number,
  "recommendedBudget": number,
  "prioritizedActions": ["string"]
}`;

        userPrompt = `Identifica riesgos legales proactivos basado en:
${JSON.stringify(params || context || {})}`;
        break;

      case 'settlement_recommendation':
        systemPrompt = `Eres un experto en análisis de acuerdos y negociación de transacciones legales.

TU ROL:
- Evaluar si un acuerdo es conveniente vs. litigar
- Calcular el valor esperado de cada opción
- Identificar el punto óptimo de negociación
- Analizar BATNA y ZOPA

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendation": "settle" | "litigate" | "negotiate_further",
  "analysis": {
    "settlementValue": {
      "proposed": number,
      "recommended": number,
      "walkawayPoint": number
    },
    "litigationValue": {
      "expectedValue": number,
      "bestCase": number,
      "worstCase": number,
      "probability": 0-100
    },
    "valueDifference": number,
    "riskAdjustedRecommendation": "string"
  },
  "negotiationStrategy": {
    "openingPosition": number,
    "targetSettlement": number,
    "minimumAcceptable": number,
    "concessionStrategy": ["string"]
  },
  "nonMonetaryFactors": [
    {
      "factor": "string",
      "weight": 0-100,
      "favorsSide": "settlement" | "litigation"
    }
  ],
  "timeline": {
    "settlementTimeframe": "string",
    "litigationTimeframe": "string"
  },
  "confidenceLevel": 0-100
}`;

        userPrompt = `Analiza si conviene acordar o litigar:
${JSON.stringify(params || context || {})}`;
        break;

      case 'case_similarity_analysis':
        systemPrompt = `Eres un sistema de análisis de similitud de casos legales mediante IA.

TU ROL:
- Encontrar casos similares en jurisprudencia
- Calcular grado de similitud multi-dimensional
- Extraer lecciones aplicables
- Identificar patrones de éxito/fracaso

FORMATO DE RESPUESTA (JSON estricto):
{
  "similarCases": [
    {
      "caseId": "string",
      "court": "string",
      "date": "string",
      "jurisdiction": "string",
      "similarityScore": 0-100,
      "factualSimilarity": 0-100,
      "legalSimilarity": 0-100,
      "outcome": "string",
      "keyFactors": ["string"],
      "applicableLessons": ["string"],
      "distinguishingFactors": ["string"]
    }
  ],
  "patternAnalysis": {
    "successPatterns": ["string"],
    "failurePatterns": ["string"],
    "criticalFactors": ["string"]
  },
  "strategicInsights": ["string"],
  "confidenceInAnalysis": 0-100
}`;

        userPrompt = `Encuentra casos similares a:
${JSON.stringify(params || context || {})}`;
        break;

      case 'legal_timeline_forecast':
        systemPrompt = `Eres un experto en predicción de timelines de procedimientos legales.

TU ROL:
- Estimar duración de procedimientos por fase
- Identificar factores de aceleración/retraso
- Proporcionar escenarios optimista/pesimista
- Sugerir estrategias de gestión temporal

FORMATO DE RESPUESTA (JSON estricto):
{
  "forecast": {
    "totalDuration": {
      "optimistic": number,
      "expected": number,
      "pessimistic": number,
      "unit": "months"
    },
    "phases": [
      {
        "phase": "string",
        "description": "string",
        "duration": {
          "min": number,
          "expected": number,
          "max": number
        },
        "dependencies": ["string"],
        "criticalPath": boolean
      }
    ]
  },
  "milestones": [
    {
      "name": "string",
      "expectedDate": "string",
      "importance": "high" | "medium" | "low"
    }
  ],
  "accelerationFactors": [
    {
      "factor": "string",
      "potentialTimeSaved": number,
      "feasibility": "easy" | "medium" | "difficult",
      "cost": number
    }
  ],
  "delayRisks": [
    {
      "risk": "string",
      "probability": 0-100,
      "potentialDelay": number
    }
  ],
  "recommendations": ["string"]
}`;

        userPrompt = `Pronostica el timeline para:
${JSON.stringify(params || context || {})}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[legal-predictive-analytics] Processing action: ${action}`);

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
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Please try again later.', 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse('PAYMENT_REQUIRED', 'Payment required. Please add credits.', 402, corsHeaders);
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
      console.error('[legal-predictive-analytics] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[legal-predictive-analytics] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[legal-predictive-analytics] Error:', error);
    return internalError(corsHeaders);
  }
});
