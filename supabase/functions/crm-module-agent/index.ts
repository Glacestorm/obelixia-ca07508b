import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMAgentRequest {
  action: 'execute' | 'supervisor_orchestrate' | 'chat' | 'get_insights';
  agentType?: string;
  context?: Record<string, unknown>;
  capabilities?: string[];
  objective?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  agents?: Array<{
    id: string;
    type: string;
    status: string;
    capabilities: string[];
    metrics: Record<string, unknown>;
  }>;
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

    const { action, agentType, context, capabilities, objective, priority, message, agents } = await req.json() as CRMAgentRequest;

    console.log(`[crm-module-agent] Action: ${action}, AgentType: ${agentType}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'execute':
        systemPrompt = `Eres un agente IA especializado de tipo "${agentType}" para un CRM enterprise de última generación.

CAPACIDADES ESPECIALIZADAS:
${capabilities?.map(c => `- ${c}`).join('\n') || 'Ninguna especificada'}

ROL Y RESPONSABILIDADES:
1. Analizar datos de clientes, leads y oportunidades
2. Generar insights accionables basados en ML/AI
3. Proponer acciones específicas para mejorar conversiones
4. Predecir comportamientos y tendencias

CONTEXTO ACTUAL:
${JSON.stringify(context, null, 2)}

FORMATO DE RESPUESTA (JSON estricto):
{
  "success": true,
  "analysis": {
    "summary": "Resumen ejecutivo del análisis",
    "key_findings": ["hallazgo 1", "hallazgo 2"],
    "risk_factors": [],
    "opportunities": []
  },
  "actions_recommended": [
    {
      "action": "nombre_accion",
      "description": "descripción detallada",
      "priority": "high|medium|low",
      "estimated_impact": "descripción del impacto",
      "confidence": 0-100
    }
  ],
  "metrics": {
    "items_analyzed": number,
    "insights_generated": number,
    "predictions_made": number,
    "confidence_avg": number
  },
  "predictions": [
    {
      "type": "conversion|churn|upsell|engagement",
      "probability": 0-100,
      "timeframe": "días/semanas",
      "factors": ["factor1", "factor2"]
    }
  ]
}`;

        userPrompt = context
          ? `Ejecuta análisis completo con este contexto:\n${JSON.stringify(context, null, 2)}`
          : 'Ejecuta análisis general de tu especialización y proporciona insights actualizados.';
        break;

      case 'supervisor_orchestrate':
        systemPrompt = `Eres el SUPERVISOR GENERAL de todos los agentes IA del CRM enterprise.

AGENTES BAJO SUPERVISIÓN:
${agents?.map(a => `- ${a.type}: ${a.status} (${a.capabilities.slice(0, 2).join(', ')})`).join('\n') || 'Ninguno'}

OBJETIVO: ${objective || 'Optimización general del CRM'}
PRIORIDAD: ${priority || 'medium'}

CAPACIDADES DE SUPERVISOR CRM:
1. Coordinación inteligente entre agentes especializados
2. Detección de oportunidades cross-selling
3. Análisis predictivo del pipeline
4. Optimización del customer journey
5. Priorización de leads y oportunidades
6. Gestión proactiva de riesgos (churn)

FORMATO DE RESPUESTA (JSON estricto):
{
  "orchestration_result": {
    "objective_addressed": "string",
    "agents_coordinated": ["agent1", "agent2"],
    "cross_agent_insights": []
  },
  "insights": [
    {
      "id": "insight_crm_1",
      "type": "opportunity|risk|prediction|recommendation|alert",
      "priority": "low|medium|high|critical",
      "title": "Título del insight",
      "description": "Descripción detallada",
      "affectedEntities": [{"type": "lead|deal|contact|account", "id": "uuid", "name": "nombre"}],
      "suggestedAction": "Acción recomendada",
      "confidence": 0-100,
      "estimatedImpact": {
        "revenue": number,
        "probability": 0-100,
        "timeframe": "días/semanas"
      },
      "timestamp": "ISO8601",
      "agentId": "supervisor"
    }
  ],
  "pipeline_analysis": {
    "total_value": number,
    "at_risk_value": number,
    "acceleration_opportunities": number,
    "forecast_confidence": 0-100
  },
  "agent_performance": [
    {"agentType": "string", "healthScore": 0-100, "recommendation": "string"}
  ],
  "next_priority_actions": [
    {"action": "string", "agent": "string", "urgency": "high|medium|low"}
  ]
}`;

        userPrompt = `Orquesta los ${agents?.length || 0} agentes CRM para: ${objective}. Genera insights accionables y plan de optimización del pipeline.`;
        break;

      case 'chat':
        systemPrompt = `Eres un agente IA especializado de tipo "${agentType}" en un CRM enterprise.

TUS CAPACIDADES:
${capabilities?.map(c => `- ${c}`).join('\n') || context?.agentCapabilities || 'Especialista CRM'}

DESCRIPCIÓN DE TU ROL:
${context?.agentDescription || 'Asistente especializado en CRM'}

INSTRUCCIONES:
1. Responde de forma concisa y profesional
2. Proporciona información específica de tu especialización
3. Sugiere acciones cuando sea apropiado
4. Usa datos del contexto si están disponibles

FORMATO DE RESPUESTA (JSON):
{
  "response": "Tu respuesta conversacional aquí",
  "suggested_actions": ["acción 1", "acción 2"],
  "relevant_data": {}
}`;

        userPrompt = message || 'Hola, ¿en qué puedo ayudarte?';
        break;

      case 'get_insights':
        systemPrompt = `Eres el sistema de análisis predictivo del CRM. Genera insights basados en el estado actual.

ESTADO ACTUAL:
${JSON.stringify(context, null, 2)}

TIPOS DE INSIGHTS:
1. opportunity - Oportunidades de venta/upsell
2. risk - Riesgos de churn o pérdida
3. prediction - Predicciones de comportamiento
4. recommendation - Recomendaciones proactivas
5. alert - Alertas urgentes

FORMATO DE RESPUESTA (JSON):
{
  "insights": [
    {
      "id": "unique_id",
      "type": "opportunity|risk|prediction|recommendation|alert",
      "priority": "low|medium|high|critical",
      "title": "Título corto",
      "description": "Descripción detallada",
      "affectedEntities": [{"type": "lead", "id": "uuid", "name": "Nombre"}],
      "suggestedAction": "Acción sugerida",
      "confidence": 85,
      "estimatedImpact": {"revenue": 5000, "probability": 75},
      "timestamp": "ISO8601",
      "agentId": "insight_generator"
    }
  ],
  "summary": {
    "total_opportunities": number,
    "total_risks": number,
    "priority_score": 0-100
  }
}`;

        userPrompt = 'Analiza el estado actual del CRM y genera 3-5 insights accionables.';
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
      const errorText = await response.text();
      console.error('[crm-module-agent] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[crm-module-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[crm-module-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-module-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
