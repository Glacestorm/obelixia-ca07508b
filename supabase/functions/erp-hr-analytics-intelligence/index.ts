/**
 * erp-hr-analytics-intelligence - Advanced HR Analytics Intelligence
 * 
 * S6.3C: Migrated to validateTenantAccess + userClient (SECURITY FIX: added missing tenant isolation)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface AnalyticsRequest {
  action: 
    | 'predict_turnover'
    | 'workforce_planning'
    | 'salary_benchmarking'
    | 'talent_demand_forecast'
    | 'succession_risk_analysis'
    | 'productivity_insights'
    | 'engagement_prediction'
    | 'skills_gap_forecast';
  context?: Record<string, unknown>;
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

    // Extract companyId from context or params
    const companyId = (context?.companyId || context?.company_id || params?.companyId) as string | undefined;
    if (!companyId) {
      return validationError('companyId is required in context', corsHeaders);
    }

    // --- AUTH + TENANT VALIDATION (S6.3C — SECURITY FIX: previously had NO membership check) ---
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    console.log(`[erp-hr-analytics-intelligence] Authenticated user: ${authResult.userId}`);
    // --- END AUTH + TENANT VALIDATION ---

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'predict_turnover':
        systemPrompt = `Eres un experto en HR Analytics y Machine Learning predictivo especializado en rotación de personal.

CONTEXTO DEL ROL:
- Analista predictivo de RRHH con expertise en modelos de deserción
- Conocimiento profundo de factores de riesgo de fuga de talento
- Experiencia en intervenciones preventivas de retención

FACTORES A ANALIZAR:
1. Engagement scores y tendencias
2. Tiempo en el puesto y empresa
3. Historial de promociones y aumentos
4. Patrones de ausencias y vacaciones
5. Comparativa salarial de mercado
6. Carga de trabajo y horas extra
7. Relación con management
8. Oportunidades de desarrollo

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [
    {
      "employeeId": "string",
      "employeeName": "string",
      "department": "string",
      "riskScore": 0-100,
      "riskLevel": "low" | "medium" | "high" | "critical",
      "predictedTimeframe": "string (ej: 3-6 meses)",
      "confidenceScore": 0-100,
      "topFactors": [
        {
          "factor": "string",
          "impact": "high" | "medium" | "low",
          "description": "string"
        }
      ],
      "recommendedActions": [
        {
          "action": "string",
          "priority": "immediate" | "short-term" | "medium-term",
          "expectedImpact": "string"
        }
      ]
    }
  ],
  "aggregateMetrics": {
    "overallRiskScore": 0-100,
    "employeesAtRisk": "number",
    "criticalRoles": ["string"],
    "estimatedCostOfTurnover": "string",
    "retentionOpportunityWindow": "string"
  },
  "trendAnalysis": {
    "direction": "improving" | "stable" | "deteriorating",
    "keyDrivers": ["string"],
    "seasonalPatterns": "string"
  }
}`;

        userPrompt = `Analiza el riesgo de rotación para esta organización:

Datos de empleados: ${JSON.stringify(context?.employees || [])}
Métricas de engagement: ${JSON.stringify(context?.engagement || {})}
Datos salariales: ${JSON.stringify(context?.salaryData || {})}
Historial de bajas: ${JSON.stringify(context?.turnoverHistory || [])}

Genera predicciones detalladas con factores de riesgo y acciones recomendadas.`;
        break;

      case 'workforce_planning':
        systemPrompt = `Eres un estratega de Workforce Planning con expertise en planificación de plantilla a largo plazo.

CONTEXTO DEL ROL:
- Especialista en Strategic Workforce Planning (SWP)
- Conocimiento de modelos de demanda y oferta de talento
- Experiencia en escenarios de crecimiento y reestructuración

DIMENSIONES DE ANÁLISIS:
1. Proyecciones de crecimiento del negocio
2. Jubilaciones y bajas esperadas
3. Gaps de competencias actuales y futuros
4. Necesidades de nuevos roles/funciones
5. Impacto de automatización/IA
6. Benchmarks de ratio empleados/facturación

FORMATO DE RESPUESTA (JSON estricto):
{
  "currentState": {
    "totalHeadcount": "number",
    "ftesEquivalent": "number",
    "avgTenure": "string",
    "departmentBreakdown": [
      {
        "department": "string",
        "headcount": "number",
        "avgAge": "number",
        "criticalRoles": ["string"]
      }
    ]
  },
  "projections": [
    {
      "timeframe": "string (Q1 2026, Q2 2026...)",
      "scenario": "conservative" | "moderate" | "aggressive",
      "projectedHeadcount": "number",
      "netChange": "number",
      "hiringNeeds": "number",
      "expectedAttrition": "number",
      "keyHires": [
        {
          "role": "string",
          "quantity": "number",
          "priority": "critical" | "high" | "medium",
          "skillsRequired": ["string"],
          "estimatedTimeToFill": "string"
        }
      ]
    }
  ],
  "riskAreas": [
    {
      "area": "string",
      "riskType": "succession" | "skills_gap" | "capacity" | "age_pyramid",
      "severity": "high" | "medium" | "low",
      "affectedRoles": ["string"],
      "mitigation": "string"
    }
  ],
  "recommendations": [
    {
      "category": "hiring" | "development" | "restructuring" | "outsourcing",
      "recommendation": "string",
      "impact": "string",
      "timeline": "string",
      "investmentRequired": "string"
    }
  ],
  "budgetImplications": {
    "currentLaborCost": "string",
    "projectedLaborCost": "string",
    "hiringBudgetNeeded": "string",
    "trainingBudgetNeeded": "string"
  }
}`;

        userPrompt = `Genera un plan estratégico de workforce para:

Plantilla actual: ${JSON.stringify(context?.workforce || {})}
Proyecciones de negocio: ${JSON.stringify(params?.businessProjections || {})}
Horizonte de planificación: ${params?.planningHorizon || '12 meses'}
Escenarios a considerar: ${JSON.stringify(params?.scenarios || ['moderate'])}`;
        break;

      case 'salary_benchmarking':
        systemPrompt = `Eres un experto en Compensation & Benefits con acceso a datos de mercado salarial.

CONTEXTO DEL ROL:
- Especialista en Total Rewards y compensación competitiva
- Conocimiento de benchmarks salariales por sector/región
- Experiencia en estructuras de bandas salariales

ANÁLISIS A REALIZAR:
1. Comparativa con percentiles de mercado (P25, P50, P75, P90)
2. Equidad interna por nivel/familia de puestos
3. Competitividad por departamento/rol
4. Gender pay gap analysis
5. Compresión salarial
6. Total compensation vs. base salary

FORMATO DE RESPUESTA (JSON estricto):
{
  "marketPositioning": {
    "overallPercentile": "number (0-100)",
    "positioningLabel": "below_market" | "at_market" | "above_market",
    "competitivenessScore": 0-100
  },
  "departmentAnalysis": [
    {
      "department": "string",
      "avgSalary": "number",
      "marketMedian": "number",
      "variance": "number (%)",
      "positioning": "string",
      "atRiskRoles": ["string"]
    }
  ],
  "roleComparison": [
    {
      "role": "string",
      "currentSalary": "number",
      "marketP25": "number",
      "marketP50": "number",
      "marketP75": "number",
      "marketP90": "number",
      "currentPercentile": "number",
      "recommendation": "string"
    }
  ],
  "equityAnalysis": {
    "genderPayGap": "number (%)",
    "genderGapByLevel": [
      {
        "level": "string",
        "gap": "number (%)",
        "affectedCount": "number"
      }
    ],
    "compressionIssues": [
      {
        "description": "string",
        "affectedEmployees": "number",
        "severity": "high" | "medium" | "low"
      }
    ]
  },
  "recommendations": [
    {
      "type": "adjustment" | "structure" | "policy",
      "description": "string",
      "affectedEmployees": "number",
      "estimatedCost": "string",
      "priority": "immediate" | "short-term" | "medium-term"
    }
  ],
  "budgetScenarios": [
    {
      "scenario": "string",
      "description": "string",
      "totalCost": "string",
      "percentIncrease": "number"
    }
  ]
}`;

        userPrompt = `Realiza un análisis de competitividad salarial:

Datos salariales actuales: ${JSON.stringify(context?.salaryData || [])}
Sector/CNAE: ${context?.sector || 'General'}
Región: ${context?.region || 'España'}
Tamaño empresa: ${context?.companySize || 'PYME'}
Benchmarks disponibles: ${JSON.stringify(params?.benchmarks || {})}`;
        break;

      case 'talent_demand_forecast':
        systemPrompt = `Eres un analista de Talent Intelligence especializado en predicción de demanda de talento.

CONTEXTO DEL ROL:
- Experto en análisis de tendencias del mercado laboral
- Conocimiento de evolución de roles y skills emergentes
- Experiencia en forecasting de necesidades de talento

ANÁLISIS A REALIZAR:
1. Tendencias del mercado laboral por sector
2. Skills emergentes vs. obsoletas
3. Roles en crecimiento vs. declive
4. Impacto de tecnología en perfiles
5. Competencia por talento en el mercado

FORMATO DE RESPUESTA (JSON estricto):
{
  "marketTrends": {
    "overallOutlook": "positive" | "neutral" | "challenging",
    "talentScarcity": "low" | "moderate" | "high" | "critical",
    "keyTrends": [
      {
        "trend": "string",
        "impact": "high" | "medium" | "low",
        "timeframe": "string",
        "relevantRoles": ["string"]
      }
    ]
  },
  "demandForecast": [
    {
      "role": "string",
      "currentDemand": "low" | "moderate" | "high",
      "projectedDemand": "decreasing" | "stable" | "growing" | "surging",
      "supplyAvailability": "abundant" | "adequate" | "scarce" | "critical",
      "salaryPressure": "downward" | "stable" | "upward" | "significant_upward",
      "recommendedAction": "string"
    }
  ],
  "emergingSkills": [
    {
      "skill": "string",
      "category": "technical" | "soft" | "domain",
      "growthRate": "string (%)",
      "relevanceToOrg": "high" | "medium" | "low",
      "acquisitionStrategy": "hire" | "train" | "partner"
    }
  ],
  "decliningSkills": [
    {
      "skill": "string",
      "riskLevel": "high" | "medium" | "low",
      "affectedEmployees": "number",
      "transitionPath": "string"
    }
  ],
  "competitorAnalysis": {
    "hiringActivity": "aggressive" | "moderate" | "conservative",
    "targetRoles": ["string"],
    "competitiveThreat": "high" | "medium" | "low"
  },
  "strategicRecommendations": [
    {
      "recommendation": "string",
      "rationale": "string",
      "timeline": "string",
      "resources": "string"
    }
  ]
}`;

        userPrompt = `Genera un forecast de demanda de talento:

Sector/CNAE: ${context?.sector || 'Tecnología'}
Roles actuales: ${JSON.stringify(context?.currentRoles || [])}
Plan de negocio: ${JSON.stringify(params?.businessPlan || {})}
Horizonte: ${params?.horizon || '24 meses'}`;
        break;

      case 'succession_risk_analysis':
        systemPrompt = `Eres un experto en Succession Planning y gestión de riesgo de talento crítico.

CONTEXTO DEL ROL:
- Especialista en identificación de posiciones críticas
- Conocimiento de pipelines de sucesión
- Experiencia en desarrollo de High Potentials

FORMATO DE RESPUESTA (JSON estricto):
{
  "criticalPositions": [
    {
      "position": "string",
      "incumbent": "string",
      "riskLevel": "low" | "medium" | "high" | "critical",
      "riskFactors": ["string"],
      "yearsToRetirement": "number | null",
      "flightRisk": "low" | "medium" | "high",
      "businessImpact": "string",
      "successionReadiness": "no_successor" | "developing" | "ready_1yr" | "ready_now"
    }
  ],
  "successionPipeline": [
    {
      "targetPosition": "string",
      "successors": [
        {
          "name": "string",
          "currentRole": "string",
          "readiness": "ready_now" | "1-2_years" | "3-5_years",
          "developmentNeeds": ["string"],
          "retentionRisk": "low" | "medium" | "high"
        }
      ],
      "pipelineHealth": "strong" | "adequate" | "weak" | "critical"
    }
  ],
  "gapAnalysis": {
    "positionsWithoutSuccessor": "number",
    "positionsWithWeakPipeline": "number",
    "criticalGaps": ["string"]
  },
  "developmentPriorities": [
    {
      "employee": "string",
      "targetRole": "string",
      "developmentPlan": ["string"],
      "timeline": "string",
      "investment": "string"
    }
  ],
  "recommendations": [
    {
      "priority": "immediate" | "short-term" | "medium-term",
      "action": "string",
      "rationale": "string"
    }
  ],
  "overallRiskScore": 0-100,
  "benchmarkComparison": "below_average" | "average" | "above_average"
}`;

        userPrompt = `Analiza el riesgo de sucesión:

Posiciones de liderazgo: ${JSON.stringify(context?.leadershipPositions || [])}
Datos de talento: ${JSON.stringify(context?.talentData || [])}
Historial de promociones: ${JSON.stringify(context?.promotionHistory || [])}`;
        break;

      case 'productivity_insights':
        systemPrompt = `Eres un analista de Workforce Productivity especializado en optimización del rendimiento organizacional.

FORMATO DE RESPUESTA (JSON estricto):
{
  "organizationalMetrics": {
    "overallProductivityScore": 0-100,
    "revenuePerEmployee": "string",
    "profitPerEmployee": "string",
    "utilizationRate": "number (%)",
    "overtimeRate": "number (%)",
    "absenteeismRate": "number (%)"
  },
  "departmentBreakdown": [
    {
      "department": "string",
      "productivityScore": 0-100,
      "trend": "improving" | "stable" | "declining",
      "keyMetrics": {
        "output": "string",
        "efficiency": "string",
        "quality": "string"
      },
      "topPerformers": "number",
      "underperformers": "number",
      "opportunities": ["string"]
    }
  ],
  "productivityDrivers": [
    {
      "factor": "string",
      "impact": "positive" | "negative",
      "magnitude": "high" | "medium" | "low",
      "actionable": "boolean",
      "recommendation": "string"
    }
  ],
  "bottlenecks": [
    {
      "area": "string",
      "description": "string",
      "impactedTeams": ["string"],
      "estimatedLoss": "string",
      "resolution": "string"
    }
  ],
  "optimizationOpportunities": [
    {
      "opportunity": "string",
      "potentialGain": "string",
      "effort": "low" | "medium" | "high",
      "timeline": "string",
      "priority": 1-5
    }
  ],
  "benchmarkComparison": {
    "industryAverage": "number",
    "topQuartile": "number",
    "ourPosition": "string",
    "gapToClose": "string"
  }
}`;

        userPrompt = `Genera insights de productividad:

Datos operativos: ${JSON.stringify(context?.operationalData || {})}
KPIs actuales: ${JSON.stringify(context?.kpis || {})}
Sector: ${context?.sector || 'General'}`;
        break;

      case 'engagement_prediction':
        systemPrompt = `Eres un experto en Employee Engagement y predicción de clima laboral.

FORMATO DE RESPUESTA (JSON estricto):
{
  "currentEngagement": {
    "overallScore": 0-100,
    "eNPS": "number (-100 to 100)",
    "participationRate": "number (%)",
    "trend": "improving" | "stable" | "declining"
  },
  "dimensionScores": [
    {
      "dimension": "string",
      "score": 0-100,
      "benchmark": 0-100,
      "trend": "up" | "stable" | "down",
      "priority": "high" | "medium" | "low"
    }
  ],
  "segmentAnalysis": [
    {
      "segment": "string (department/tenure/age)",
      "engagementScore": 0-100,
      "riskLevel": "low" | "medium" | "high",
      "keyIssues": ["string"],
      "strengths": ["string"]
    }
  ],
  "predictions": {
    "3monthOutlook": {
      "predictedScore": 0-100,
      "confidence": "number (%)",
      "keyFactors": ["string"]
    },
    "6monthOutlook": {
      "predictedScore": 0-100,
      "confidence": "number (%)",
      "keyFactors": ["string"]
    }
  },
  "riskAlerts": [
    {
      "alert": "string",
      "severity": "critical" | "high" | "medium",
      "affectedGroup": "string",
      "recommendedAction": "string"
    }
  ],
  "actionPlan": [
    {
      "initiative": "string",
      "targetDimension": "string",
      "expectedImpact": "string",
      "timeline": "string",
      "owner": "string",
      "resources": "string"
    }
  ]
}`;

        userPrompt = `Predice engagement y genera plan de acción:

Resultados de encuestas: ${JSON.stringify(context?.surveyResults || {})}
Datos históricos: ${JSON.stringify(context?.historicalData || [])}
Eventos recientes: ${JSON.stringify(context?.recentEvents || [])}`;
        break;

      case 'skills_gap_forecast':
        systemPrompt = `Eres un experto en Skills Analytics y workforce capability planning.

FORMATO DE RESPUESTA (JSON estricto):
{
  "currentCapabilities": {
    "totalSkillsTracked": "number",
    "averageProficiency": 0-100,
    "skillCoverage": "number (%)",
    "criticalSkillsStatus": "adequate" | "at_risk" | "critical"
  },
  "skillsInventory": [
    {
      "skill": "string",
      "category": "technical" | "soft" | "leadership" | "domain",
      "currentLevel": 0-100,
      "requiredLevel": 0-100,
      "gap": "number",
      "employeesWithSkill": "number",
      "demandTrend": "increasing" | "stable" | "decreasing",
      "priority": "critical" | "high" | "medium" | "low"
    }
  ],
  "futureRequirements": [
    {
      "skill": "string",
      "currentCoverage": "number (%)",
      "requiredBy": "string (date)",
      "gapToClose": "number",
      "acquisitionStrategy": "hire" | "train" | "partner" | "automate"
    }
  ],
  "developmentPriorities": [
    {
      "skill": "string",
      "targetAudience": "string",
      "trainingApproach": "string",
      "estimatedDuration": "string",
      "estimatedCost": "string",
      "expectedROI": "string"
    }
  ],
  "automationImpact": [
    {
      "skill": "string",
      "automationRisk": "high" | "medium" | "low",
      "timeframe": "string",
      "affectedRoles": ["string"],
      "transitionStrategy": "string"
    }
  ],
  "strategicRecommendations": [
    {
      "recommendation": "string",
      "rationale": "string",
      "investment": "string",
      "timeline": "string",
      "expectedOutcome": "string"
    }
  ]
}`;

        userPrompt = `Analiza gaps de skills y genera forecast:

Skills actuales: ${JSON.stringify(context?.currentSkills || [])}
Roles y requisitos: ${JSON.stringify(context?.roleRequirements || [])}
Plan estratégico: ${JSON.stringify(params?.strategicPlan || {})}
Horizonte: ${params?.horizon || '24 meses'}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-hr-analytics-intelligence] Processing action: ${action}`);

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
          error: 'rate_limit',
          message: 'Demasiadas solicitudes. Intenta en unos segundos.'
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
      console.error('[erp-hr-analytics-intelligence] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-analytics-intelligence] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-analytics-intelligence] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
