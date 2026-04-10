/**
 * erp-hr-analytics-agent - People Analytics AI Agent
 * 
 * S6.3C: Migrated to validateTenantAccess + userClient
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface AnalyticsRequest {
  action: 'calculate_kpis' | 'predict_flight_risk' | 'analyze_recruitment' | 'calculate_enps' | 'benchmark_comparison' | 'generate_insights' | 'compa_ratio_analysis';
  context?: {
    companyId: string;
    cnaeCode?: string;
    employeeIds?: string[];
    period?: string;
    metrics?: string[];
    departmentId?: string;
  };
  params?: Record<string, unknown>;
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

    const { action, context, params } = await req.json() as AnalyticsRequest;

    const companyId = context?.companyId;
    if (!companyId) {
      return validationError('companyId is required', corsHeaders);
    }

    // --- AUTH + TENANT VALIDATION (S6.3C) ---
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    // --- END AUTH + TENANT VALIDATION ---

    console.log(`[erp-hr-analytics-agent] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'calculate_kpis':
        systemPrompt = `Eres un experto en People Analytics y KPIs de RRHH internacionales.

MÉTRICAS CLAVE A CALCULAR:
1. TIME-TO-HIRE: Días desde apertura de vacante hasta aceptación
2. COST-PER-HIRE: Coste total de contratación (publicidad + agencias + entrevistas + onboarding)
3. QUALITY OF HIRE: Score 0-100 basado en rendimiento a 12 meses
4. FLIGHT RISK SCORE: Probabilidad de rotación 0-100%
5. eNPS: Net Promoter Score empleados (-100 a +100)
6. COMPA-RATIO: Salario actual / Mediana mercado
7. 9-BOX GRID: Distribución de talento por potencial/rendimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "kpis": [
    {
      "code": "time_to_hire",
      "name": "Time-to-Hire",
      "value": 32,
      "unit": "días",
      "target": 28,
      "achievement": 87.5,
      "trend": "improving",
      "benchmark": 35,
      "vs_benchmark": "+8.6%"
    }
  ],
  "summary": "Resumen ejecutivo de KPIs",
  "recommendations": ["acción 1", "acción 2"],
  "alerts": [{"kpi": "flight_risk", "severity": "high", "message": "..."}]
}`;

        userPrompt = `Calcula los KPIs de RRHH para:
- Empresa: ${context?.companyId}
- CNAE: ${context?.cnaeCode || 'General'}
- Período: ${context?.period || 'Último trimestre'}
- Métricas solicitadas: ${context?.metrics?.join(', ') || 'Todas'}

Datos adicionales: ${JSON.stringify(params || {})}`;
        break;

      case 'predict_flight_risk':
        systemPrompt = `Eres un sistema predictivo de rotación de empleados basado en IA.

FACTORES DE RIESGO A EVALUAR (0-100 cada uno):
- Antigüedad (tenure_factor): <1 año = alto riesgo, 2-5 años = bajo
- Compensación (compensation_factor): Compa-ratio < 0.9 = riesgo
- Rendimiento (performance_factor): Tendencia decreciente = riesgo
- Engagement (engagement_factor): Basado en participación y feedback
- Crecimiento (career_growth_factor): Tiempo sin promoción
- Manager (manager_relationship_factor): Rotación bajo mismo manager
- Carga (workload_factor): Horas extras sostenidas
- Mercado (market_demand_factor): Demanda de perfil en mercado

FORMATO DE RESPUESTA (JSON estricto):
{
  "employees": [
    {
      "employeeId": "uuid",
      "employeeName": "Nombre",
      "riskScore": 75,
      "riskLevel": "high",
      "confidence": 85,
      "factors": {
        "tenure_factor": 60,
        "compensation_factor": 80,
        "performance_factor": 40,
        "engagement_factor": 70,
        "career_growth_factor": 90,
        "manager_relationship_factor": 50,
        "workload_factor": 65,
        "market_demand_factor": 75
      },
      "mainDrivers": ["Sin promoción en 3 años", "Salario 15% bajo mercado"],
      "recommendedActions": ["Reunión 1:1 urgente", "Revisar compensación"]
    }
  ],
  "summary": {
    "highRisk": 5,
    "mediumRisk": 12,
    "lowRisk": 30,
    "totalAnalyzed": 47
  }
}`;

        userPrompt = `Predice el riesgo de rotación para:
- Empresa: ${context?.companyId}
- Empleados específicos: ${context?.employeeIds?.join(', ') || 'Todos'}
- Departamento: ${context?.departmentId || 'Todos'}

Datos de contexto: ${JSON.stringify(params || {})}`;
        break;

      case 'analyze_recruitment':
        systemPrompt = `Eres un analista experto en métricas de reclutamiento.

MÉTRICAS DE RECRUITING:
- Time-to-Fill: Días para cubrir posición
- Time-to-Hire: Días desde primera entrevista hasta oferta aceptada
- Cost-per-Hire: Todos los costes asociados
- Source Effectiveness: Rendimiento por canal
- Offer Acceptance Rate: % ofertas aceptadas
- Quality of Hire: Rendimiento a 3, 6 y 12 meses
- Candidate Experience Score

FORMATO DE RESPUESTA (JSON estricto):
{
  "metrics": {
    "avgTimeToFill": 42,
    "avgTimeToHire": 28,
    "avgCostPerHire": 3500,
    "offerAcceptanceRate": 78,
    "qualityOfHireScore": 72
  },
  "sourceAnalysis": [
    {"source": "LinkedIn", "hires": 15, "avgTimeToHire": 25, "qualityScore": 80, "costPerHire": 2800}
  ],
  "bottlenecks": ["Tiempo en screening alto", "Baja conversión en entrevista técnica"],
  "recommendations": ["Automatizar screening inicial", "Mejorar employer branding"]
}`;

        userPrompt = `Analiza las métricas de reclutamiento:
- Empresa: ${context?.companyId}
- Período: ${context?.period || 'Último año'}

Datos adicionales: ${JSON.stringify(params || {})}`;
        break;

      case 'calculate_enps':
        systemPrompt = `Eres un experto en Employee Experience y medición de eNPS.

METODOLOGÍA eNPS:
- Pregunta: "¿Recomendarías esta empresa como lugar de trabajo?" (0-10)
- Promotores: 9-10
- Pasivos: 7-8
- Detractores: 0-6
- eNPS = % Promotores - % Detractores (rango -100 a +100)

BENCHMARKS eNPS:
- Excelente: > +50
- Bueno: +10 a +50
- Neutral: -10 a +10
- Necesita mejora: < -10

FORMATO DE RESPUESTA (JSON estricto):
{
  "score": 35,
  "breakdown": {
    "promoters": 45,
    "passives": 35,
    "detractors": 20,
    "totalResponses": 42,
    "responseRate": 89
  },
  "trend": {
    "current": 35,
    "previous": 28,
    "change": "+7",
    "direction": "improving"
  },
  "byDepartment": [
    {"name": "Tecnología", "score": 52, "responses": 15}
  ],
  "themes": {
    "positive": ["Flexibilidad", "Compañeros", "Formación"],
    "negative": ["Salarios", "Comunicación interna"]
  },
  "actionItems": ["Revisar política salarial", "Mejorar canales de comunicación"]
}`;

        userPrompt = `Calcula y analiza el eNPS:
- Empresa: ${context?.companyId}
- Período: ${context?.period || 'Último trimestre'}

Datos del survey: ${JSON.stringify(params || {})}`;
        break;

      case 'benchmark_comparison':
        systemPrompt = `Eres un experto en benchmarking de RRHH por sector CNAE.

BENCHMARKS POR SECTOR (España 2026):
- Tecnología (62): Rotación 18%, Time-to-Hire 35d, eNPS +25
- Retail (47): Rotación 35%, Time-to-Hire 15d, eNPS +5
- Banca (64): Rotación 8%, Time-to-Hire 45d, eNPS +15
- Industria (25-33): Rotación 12%, Time-to-Hire 40d, eNPS +10
- Servicios (69-82): Rotación 22%, Time-to-Hire 28d, eNPS +12

FORMATO DE RESPUESTA (JSON estricto):
{
  "sector": {
    "cnaeCode": "62",
    "sectorName": "Programación y consultoría",
    "benchmarkYear": 2026
  },
  "comparison": [
    {
      "metric": "Rotación voluntaria",
      "companyValue": 15,
      "benchmarkValue": 18,
      "percentile": 65,
      "status": "above_benchmark"
    }
  ],
  "overallPosition": "Por encima de la media del sector",
  "strengths": ["Baja rotación", "Alto eNPS"],
  "improvementAreas": ["Time-to-Hire", "Inversión en formación"],
  "peerComparison": "Top 25% del sector"
}`;

        userPrompt = `Compara con benchmarks sectoriales:
- Empresa: ${context?.companyId}
- CNAE: ${context?.cnaeCode || '62'}
- Métricas: ${JSON.stringify(params || {})}`;
        break;

      case 'compa_ratio_analysis':
        systemPrompt = `Eres un experto en compensación y competitividad salarial.

ANÁLISIS COMPA-RATIO:
- Compa-Ratio = Salario Actual / Mediana Mercado
- < 0.80: Crítico - Alto riesgo de fuga
- 0.80-0.90: Por debajo del mercado
- 0.90-1.10: En mercado
- 1.10-1.20: Por encima del mercado
- > 1.20: Significativamente por encima

RANGE PENETRATION:
- Posición dentro del rango salarial del puesto
- 0-25%: Entry level
- 25-50%: Desarrollando
- 50-75%: Competente
- 75-100%: Experto/Senior

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": {
    "avgCompaRatio": 0.95,
    "employeesBelow90": 12,
    "employeesAbove110": 5,
    "totalAnalyzed": 47,
    "estimatedRiskCost": 85000
  },
  "distribution": {
    "critical": 3,
    "belowMarket": 9,
    "atMarket": 28,
    "aboveMarket": 7
  },
  "byDepartment": [
    {"name": "Tecnología", "avgCompaRatio": 0.88, "risk": "high"}
  ],
  "priorityActions": [
    {"employee": "Juan Pérez", "currentRatio": 0.75, "recommendedAdjustment": "+15%", "urgency": "critical"}
  ],
  "budgetImpact": {
    "toReachMarket": 45000,
    "toReach10thPercentile": 85000
  }
}`;

        userPrompt = `Analiza la competitividad salarial:
- Empresa: ${context?.companyId}
- Departamento: ${context?.departmentId || 'Todos'}

Datos salariales: ${JSON.stringify(params || {})}`;
        break;

      case 'generate_insights':
        systemPrompt = `Eres un estratega de People Analytics que genera insights ejecutivos.

ÁREAS DE INSIGHT:
1. Talento: Retención, desarrollo, sucesión
2. Cultura: Engagement, clima, valores
3. Productividad: Rendimiento, eficiencia
4. Compensación: Equidad, competitividad
5. Riesgo: Compliance, rotación, burnout

FORMATO DE RESPUESTA (JSON estricto):
{
  "executiveSummary": "Resumen en 2-3 líneas",
  "keyMetrics": [
    {"name": "Rotación Q4", "value": "12%", "trend": "down", "impact": "positive"}
  ],
  "insights": [
    {
      "category": "talent",
      "title": "Riesgo de fuga en Tech",
      "description": "5 empleados clave con riesgo alto",
      "impact": "high",
      "recommendation": "Plan de retención urgente"
    }
  ],
  "predictions": [
    {"metric": "Rotación Q1 2027", "predicted": "10%", "confidence": 75}
  ],
  "actionsRequired": [
    {"priority": 1, "action": "...", "deadline": "2 semanas", "owner": "HR Director"}
  ]
}`;

        userPrompt = `Genera insights estratégicos de RRHH:
- Empresa: ${context?.companyId}
- CNAE: ${context?.cnaeCode}
- Período de análisis: ${context?.period || 'YTD'}

Datos disponibles: ${JSON.stringify(params || {})}`;
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
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[erp-hr-analytics-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-analytics-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-analytics-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
