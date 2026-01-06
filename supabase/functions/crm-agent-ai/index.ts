import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMAgentRequest {
  action: 'analyze_domain' | 'predict_metrics' | 'orchestrate' | 'get_insights' | 'rank_agents' | 'learn' | 'chat' | 'score_lead' | 'predict_churn' | 'detect_upsell' | 'optimize_pipeline';
  domain?: string;
  context?: Record<string, unknown>;
  agentId?: string;
  message?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  leadData?: Record<string, unknown>;
  customerData?: Record<string, unknown>;
  pipelineData?: Record<string, unknown>;
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

    const { action, domain, context, agentId, message, conversationHistory, leadData, customerData, pipelineData } = await req.json() as CRMAgentRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_domain':
        systemPrompt = `Eres un experto analista de CRM especializado en el dominio: ${domain || 'general'}.

DOMINIOS CRM QUE ANALIZAS:
- leads: Gestión de prospectos, cualificación, nurturing
- pipeline: Oportunidades de venta, etapas, probabilidades
- customers: Relaciones con clientes, satisfacción, retención
- activities: Tareas, llamadas, reuniones, seguimientos
- forecast: Predicciones de ventas, tendencias, objetivos

CAPACIDADES DE ANÁLISIS:
1. Identificar patrones de comportamiento
2. Detectar señales de compra o abandono
3. Evaluar salud de relaciones comerciales
4. Proporcionar recomendaciones accionables
5. Cuantificar oportunidades y riesgos

FORMATO DE RESPUESTA (JSON estricto):
{
  "domainHealth": 0-100,
  "trend": "improving" | "stable" | "declining",
  "keyMetrics": [
    {"name": "string", "value": number, "trend": "up" | "down" | "stable", "target": number}
  ],
  "insights": [
    {"type": "opportunity" | "risk" | "recommendation", "title": "string", "description": "string", "impact": "high" | "medium" | "low", "confidence": 0-100}
  ],
  "agents": [
    {"id": "string", "name": "string", "status": "active" | "idle" | "processing", "performance": 0-100, "tasksCompleted": number}
  ],
  "recommendations": ["string"],
  "alerts": [{"severity": "critical" | "warning" | "info", "message": "string"}]
}`;

        userPrompt = context 
          ? `Analiza este contexto del dominio ${domain}: ${JSON.stringify(context)}`
          : `Proporciona un análisis general del dominio ${domain} en CRM`;
        break;

      case 'score_lead':
        systemPrompt = `Eres un experto en Lead Scoring con IA avanzada.

FACTORES DE PUNTUACIÓN:
1. Datos demográficos (empresa, industria, tamaño)
2. Comportamiento digital (visitas, descargas, engagement)
3. Señales de compra (presupuesto, timeline, autoridad)
4. Historial de interacciones
5. Compatibilidad con ICP (Ideal Customer Profile)

FORMATO DE RESPUESTA (JSON estricto):
{
  "score": 0-100,
  "grade": "A" | "B" | "C" | "D" | "F",
  "conversionProbability": 0-100,
  "estimatedValue": number,
  "timeToConvert": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "nextBestActions": [
    {"action": "string", "priority": "high" | "medium" | "low", "expectedImpact": number}
  ],
  "signals": [
    {"type": "positive" | "negative", "signal": "string", "weight": number}
  ],
  "segmentation": {
    "tier": "enterprise" | "mid-market" | "smb",
    "industry": "string",
    "buyerPersona": "string"
  }
}`;

        userPrompt = `Puntúa este lead: ${JSON.stringify(leadData || context)}`;
        break;

      case 'predict_churn':
        systemPrompt = `Eres un experto en predicción de churn y retención de clientes.

SEÑALES DE CHURN QUE DETECTAS:
1. Disminución en uso del producto
2. Reducción de engagement
3. Tickets de soporte sin resolver
4. Ausencia en comunicaciones
5. Cambios en stakeholders
6. Señales financieras
7. Actividad de competidores

FORMATO DE RESPUESTA (JSON estricto):
{
  "churnProbability": 0-100,
  "riskLevel": "critical" | "high" | "medium" | "low",
  "churnTimeframe": "string",
  "lifetimeValue": number,
  "revenueAtRisk": number,
  "signals": [
    {"signal": "string", "weight": number, "trend": "worsening" | "stable" | "improving"}
  ],
  "retentionStrategies": [
    {"strategy": "string", "effectiveness": 0-100, "effort": "low" | "medium" | "high", "timeline": "string"}
  ],
  "healthIndicators": {
    "productUsage": 0-100,
    "engagement": 0-100,
    "satisfaction": 0-100,
    "relationship": 0-100
  },
  "comparativeAnalysis": {
    "vsSegmentAverage": number,
    "trend30d": number,
    "trend90d": number
  }
}`;

        userPrompt = `Predice el riesgo de churn para este cliente: ${JSON.stringify(customerData || context)}`;
        break;

      case 'detect_upsell':
        systemPrompt = `Eres un experto en detección de oportunidades de upsell y cross-sell.

SEÑALES DE UPSELL:
1. Crecimiento en uso del producto actual
2. Límites de plan alcanzados
3. Nuevas necesidades expresadas
4. Expansión del equipo/empresa
5. Satisfacción alta (NPS, CSAT)
6. Engagement con contenido premium

FORMATO DE RESPUESTA (JSON estricto):
{
  "upsellScore": 0-100,
  "opportunities": [
    {
      "product": "string",
      "type": "upsell" | "cross-sell" | "expansion",
      "probability": 0-100,
      "potentialValue": number,
      "effort": "low" | "medium" | "high",
      "signals": ["string"],
      "approach": "string"
    }
  ],
  "totalPotentialMRR": number,
  "bestTiming": "string",
  "buyerReadiness": {
    "budget": 0-100,
    "authority": 0-100,
    "need": 0-100,
    "timeline": 0-100
  },
  "recommendedActions": [
    {"action": "string", "priority": "high" | "medium" | "low", "expectedConversion": 0-100}
  ],
  "competitiveRisks": ["string"]
}`;

        userPrompt = `Detecta oportunidades de upsell para este cliente: ${JSON.stringify(customerData || context)}`;
        break;

      case 'optimize_pipeline':
        systemPrompt = `Eres un experto en optimización de pipeline de ventas.

ÁREAS DE OPTIMIZACIÓN:
1. Velocidad de cada etapa
2. Tasas de conversión entre etapas
3. Deals estancados o en riesgo
4. Distribución del pipeline
5. Forecast accuracy
6. Win/Loss analysis

FORMATO DE RESPUESTA (JSON estricto):
{
  "pipelineHealth": 0-100,
  "totalValue": number,
  "weightedValue": number,
  "averageDealSize": number,
  "averageCycleTime": number,
  "stages": [
    {
      "name": "string",
      "deals": number,
      "value": number,
      "avgDaysInStage": number,
      "conversionRate": 0-100,
      "bottleneck": boolean
    }
  ],
  "atRiskDeals": [
    {"dealName": "string", "value": number, "riskLevel": 0-100, "daysStuck": number, "reason": "string"}
  ],
  "recommendations": [
    {"type": "acceleration" | "conversion" | "qualification" | "closure", "recommendation": "string", "impactedValue": number}
  ],
  "forecast": {
    "thisMonth": number,
    "nextMonth": number,
    "thisQuarter": number,
    "confidence": 0-100
  },
  "velocityMetrics": {
    "leadsToOpportunity": number,
    "opportunityToWon": number,
    "overallVelocity": number
  }
}`;

        userPrompt = `Optimiza este pipeline de ventas: ${JSON.stringify(pipelineData || context)}`;
        break;

      case 'predict_metrics':
        systemPrompt = `Eres un sistema de predicción avanzado para métricas CRM.

MÉTRICAS QUE PREDICES:
- Conversiones de leads
- Revenue forecast
- Churn rate
- Customer acquisition cost
- Lifetime value
- Pipeline velocity
- Win rate

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [
    {
      "metric": "string",
      "currentValue": number,
      "predictedValue": number,
      "timeframe": "string",
      "confidence": 0-100,
      "trend": "up" | "down" | "stable",
      "factors": ["string"]
    }
  ],
  "scenarios": {
    "optimistic": {"value": number, "probability": 0-100},
    "realistic": {"value": number, "probability": 0-100},
    "pessimistic": {"value": number, "probability": 0-100}
  },
  "recommendations": ["string"],
  "risks": ["string"]
}`;

        userPrompt = `Predice las métricas CRM basándote en: ${JSON.stringify(context)}`;
        break;

      case 'orchestrate':
        systemPrompt = `Eres el orquestador maestro del sistema multi-agente CRM.

AGENTES CRM BAJO TU SUPERVISIÓN:
- Lead Scoring Agent: Calificación automática de prospectos
- Pipeline Optimizer: Optimización del embudo de ventas
- Churn Predictor: Detección temprana de abandonos
- Upsell Detector: Identificación de oportunidades de expansión
- Customer Success Agent: Salud y satisfacción del cliente
- Activity Optimizer: Gestión inteligente de actividades
- Forecast Analyst: Predicciones de ventas

FORMATO DE RESPUESTA (JSON estricto):
{
  "orchestrationPlan": {
    "priority": "high" | "medium" | "low",
    "objective": "string",
    "estimatedImpact": number
  },
  "agentAssignments": [
    {"agentId": "string", "task": "string", "priority": 1-10, "dependencies": ["string"]}
  ],
  "workflow": [
    {"step": number, "action": "string", "agent": "string", "expectedDuration": "string"}
  ],
  "expectedOutcomes": ["string"],
  "kpisToMonitor": ["string"],
  "escalationRules": [
    {"condition": "string", "action": "string"}
  ]
}`;

        userPrompt = `Orquesta los agentes CRM para: ${JSON.stringify(context)}`;
        break;

      case 'rank_agents':
        systemPrompt = `Eres el sistema de ranking y evaluación de agentes CRM.

CRITERIOS DE EVALUACIÓN:
1. Precisión de predicciones
2. Valor generado (revenue influenced)
3. Tiempo de respuesta
4. Tasa de éxito de recomendaciones
5. Reducción de riesgos
6. Satisfacción del usuario

FORMATO DE RESPUESTA (JSON estricto):
{
  "rankings": [
    {
      "rank": number,
      "agentId": "string",
      "agentName": "string",
      "overallScore": 0-100,
      "metrics": {
        "accuracy": 0-100,
        "valueGenerated": number,
        "responseTime": number,
        "successRate": 0-100,
        "userSatisfaction": 0-100
      },
      "trend": "rising" | "stable" | "falling",
      "achievements": ["string"],
      "areasToImprove": ["string"]
    }
  ],
  "topPerformer": {"agentId": "string", "reason": "string"},
  "mostImproved": {"agentId": "string", "improvement": number},
  "recommendations": ["string"]
}`;

        userPrompt = `Genera ranking de agentes CRM basándote en: ${JSON.stringify(context)}`;
        break;

      case 'chat':
        systemPrompt = `Eres un agente CRM especializado con capacidades avanzadas.

ROL: ${agentId || 'Supervisor CRM'}

CAPACIDADES:
- Análisis profundo de leads, deals y clientes
- Recomendaciones basadas en datos y patrones
- Predicciones de conversión, churn y upsell
- Optimización de pipeline y actividades
- Insights accionables para equipos de ventas

ESTILO DE RESPUESTA:
- Profesional pero accesible
- Datos concretos y métricas cuando sea posible
- Recomendaciones específicas y accionables
- Formato estructurado cuando convenga

Responde de manera útil y concisa.`;

        const history = conversationHistory || [];
        userPrompt = message || 'Hola';
        
        const messagesForChat = [
          { role: 'system', content: systemPrompt },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userPrompt }
        ];

        const chatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: messagesForChat,
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!chatResponse.ok) {
          if (chatResponse.status === 429) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw new Error(`AI API error: ${chatResponse.status}`);
        }

        const chatData = await chatResponse.json();
        const chatContent = chatData.choices?.[0]?.message?.content;

        return new Response(JSON.stringify({
          success: true,
          action: 'chat',
          response: chatContent,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_insights':
        systemPrompt = `Eres un generador de insights estratégicos para CRM.

TIPOS DE INSIGHTS:
1. Oportunidades de revenue
2. Riesgos de churn
3. Optimizaciones de proceso
4. Tendencias de mercado
5. Recomendaciones de acción

FORMATO DE RESPUESTA (JSON estricto):
{
  "insights": [
    {
      "id": "string",
      "type": "opportunity" | "risk" | "optimization" | "trend" | "action",
      "title": "string",
      "description": "string",
      "impact": "high" | "medium" | "low",
      "urgency": "immediate" | "this_week" | "this_month",
      "confidence": 0-100,
      "potentialValue": number,
      "suggestedActions": ["string"],
      "affectedEntities": ["string"]
    }
  ],
  "summary": "string",
  "topPriority": {"insightId": "string", "reason": "string"}
}`;

        userPrompt = `Genera insights estratégicos CRM basándote en: ${JSON.stringify(context)}`;
        break;

      case 'learn':
        systemPrompt = `Eres el sistema de aprendizaje continuo de agentes CRM.

PROCESOS DE APRENDIZAJE:
1. Analizar resultados de decisiones pasadas
2. Identificar patrones de éxito
3. Detectar áreas de mejora
4. Actualizar modelos de predicción
5. Optimizar umbrales y parámetros

FORMATO DE RESPUESTA (JSON estricto):
{
  "learningRecord": {
    "timestamp": "string",
    "agentId": "string",
    "type": "success_pattern" | "failure_analysis" | "optimization" | "new_insight",
    "lesson": "string",
    "confidenceChange": number,
    "impactedModels": ["string"],
    "recommendations": ["string"]
  },
  "modelUpdates": [
    {"model": "string", "parameter": "string", "oldValue": number, "newValue": number, "reason": "string"}
  ],
  "performanceImpact": {
    "expectedImprovement": 0-100,
    "affectedMetrics": ["string"]
  }
}`;

        userPrompt = `Procesa este aprendizaje: ${JSON.stringify(context)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[crm-agent-ai] Processing action: ${action}`);

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
        max_tokens: 2500,
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required', 
          message: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
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
      console.error('[crm-agent-ai] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[crm-agent-ai] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-agent-ai] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
