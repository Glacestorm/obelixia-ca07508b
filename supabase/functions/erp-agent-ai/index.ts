/**
 * ERP Agent AI - Edge Function para análisis inteligente de agentes ERP
 * Usa Lovable AI para análisis real, predicciones y orquestación multi-agente
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AgentAction = 
  | 'analyze_domain'
  | 'predict_metrics'
  | 'orchestrate_multi_agent'
  | 'generate_insights'
  | 'evaluate_workflow'
  | 'learn_from_decision'
  | 'competitive_ranking'
  | 'chat_with_agent';

interface AgentRequest {
  action: AgentAction;
  domain?: string;
  agentType?: string;
  context?: Record<string, unknown>;
  message?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  workflowId?: string;
  decisionData?: Record<string, unknown>;
}

const DOMAIN_PROMPTS: Record<string, string> = {
  financial: `Eres un agente experto en finanzas corporativas, contabilidad, tesorería, facturación y gestión de cobros. 
Analizas flujos de caja, detectas anomalías contables, optimizas procesos de facturación y predices necesidades de liquidez.
Tienes acceso a datos financieros en tiempo real y puedes generar proyecciones precisas.`,

  crm_cs: `Eres un agente experto en ventas, customer success y gestión de relaciones con clientes.
Analizas pipelines de ventas, detectas oportunidades de upsell/cross-sell, predices riesgo de churn y optimizas la experiencia del cliente.
Puedes identificar señales de compra y recomendar acciones comerciales específicas.`,

  compliance: `Eres un agente experto en cumplimiento normativo, GDPR, PSD2, ESG, KYC/AML y auditoría.
Detectas incumplimientos potenciales, generas alertas de riesgo regulatorio y recomiendas acciones correctivas.
Conoces la normativa europea y española en profundidad.`,

  operations: `Eres un agente experto en operaciones, inventario, logística, mantenimiento y scheduling.
Optimizas niveles de stock, predices necesidades de mantenimiento, detectas ineficiencias operativas y mejoras la cadena de suministro.`,

  hr: `Eres un agente experto en recursos humanos, nóminas, reclutamiento, formación y gestión del talento.
Analizas rendimiento de empleados, detectas riesgo de rotación, optimizas procesos de contratación y recomiendas planes de desarrollo.`,

  analytics: `Eres un agente experto en análisis de datos, reporting, forecasting y detección de anomalías.
Generas informes ejecutivos, predices tendencias, detectas patrones anómalos y proporcionas insights accionables.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, domain, agentType, context, message, conversationHistory, workflowId, decisionData } = await req.json() as AgentRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_domain':
        systemPrompt = `${DOMAIN_PROMPTS[domain || 'analytics']}

INSTRUCCIONES:
- Analiza el estado actual del dominio basándote en el contexto proporcionado
- Identifica KPIs críticos, tendencias y áreas de mejora
- Genera insights accionables con nivel de confianza
- Prioriza por impacto en el negocio

FORMATO DE RESPUESTA (JSON estricto):
{
  "status": "healthy" | "warning" | "critical",
  "healthScore": 0-100,
  "kpis": [{ "name": "...", "value": ..., "trend": "up" | "down" | "stable", "target": ... }],
  "insights": [{ "type": "opportunity" | "risk" | "recommendation", "title": "...", "description": "...", "confidence": 0-100, "impact": "high" | "medium" | "low", "suggestedAction": "..." }],
  "predictions": [{ "metric": "...", "currentValue": ..., "predictedValue": ..., "timeframe": "...", "confidence": 0-100 }],
  "alerts": [{ "severity": "critical" | "warning" | "info", "message": "...", "actionRequired": true | false }]
}`;
        userPrompt = `Analiza el dominio ${domain} con este contexto: ${JSON.stringify(context || {})}`;
        break;

      case 'predict_metrics':
        systemPrompt = `Eres un sistema de predicción avanzado para métricas de negocio.
Utilizas análisis de tendencias, patrones estacionales y correlaciones para generar predicciones precisas.

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [{
    "metric": "...",
    "currentValue": ...,
    "predictions": [
      { "timeframe": "7d", "value": ..., "confidence": 0-100, "range": { "min": ..., "max": ... } },
      { "timeframe": "30d", "value": ..., "confidence": 0-100, "range": { "min": ..., "max": ... } },
      { "timeframe": "90d", "value": ..., "confidence": 0-100, "range": { "min": ..., "max": ... } }
    ],
    "factors": ["factor1", "factor2"],
    "scenarios": {
      "optimistic": { "value": ..., "probability": 0-100 },
      "base": { "value": ..., "probability": 0-100 },
      "pessimistic": { "value": ..., "probability": 0-100 }
    }
  }],
  "correlations": [{ "metrics": ["A", "B"], "strength": 0-100, "direction": "positive" | "negative" }],
  "seasonalPatterns": [{ "pattern": "...", "impact": "...", "nextOccurrence": "..." }]
}`;
        userPrompt = `Genera predicciones para: ${JSON.stringify(context)}`;
        break;

      case 'orchestrate_multi_agent':
        systemPrompt = `Eres el Supervisor de Orquestación Multi-Agente.
Coordinas múltiples agentes de diferentes dominios para resolver problemas complejos.
Distribuyes tareas, resuelves conflictos entre agentes y optimizas la colaboración.

FORMATO DE RESPUESTA (JSON estricto):
{
  "orchestrationPlan": {
    "objective": "...",
    "priority": "critical" | "high" | "medium" | "low",
    "estimatedDuration": "...",
    "steps": [{
      "stepNumber": 1,
      "agentDomain": "...",
      "agentType": "...",
      "task": "...",
      "dependencies": [],
      "expectedOutput": "...",
      "timeout": "..."
    }]
  },
  "agentAssignments": [{
    "agentId": "...",
    "role": "...",
    "responsibilities": ["..."],
    "collaboratesWith": ["..."]
  }],
  "conflictResolution": [{
    "conflict": "...",
    "resolution": "...",
    "impactedAgents": ["..."]
  }],
  "successCriteria": ["..."],
  "fallbackPlan": "..."
}`;
        userPrompt = `Orquesta esta operación multi-agente: ${JSON.stringify(context)}`;
        break;

      case 'generate_insights':
        systemPrompt = `Eres un generador de insights de negocio de alto nivel.
Analizas datos de múltiples fuentes y generas insights estratégicos accionables.
Priorizas por impacto financiero y viabilidad de implementación.

FORMATO DE RESPUESTA (JSON estricto):
{
  "insights": [{
    "id": "...",
    "type": "opportunity" | "risk" | "optimization" | "prediction" | "anomaly",
    "category": "revenue" | "cost" | "efficiency" | "compliance" | "customer",
    "title": "...",
    "summary": "...",
    "details": "...",
    "confidence": 0-100,
    "impact": {
      "type": "financial" | "operational" | "strategic",
      "magnitude": "high" | "medium" | "low",
      "estimatedValue": ...,
      "timeToRealize": "..."
    },
    "recommendations": [{
      "action": "...",
      "priority": 1-5,
      "effort": "low" | "medium" | "high",
      "expectedROI": "..."
    }],
    "dataPoints": ["..."],
    "relatedDomains": ["..."]
  }],
  "executiveSummary": "...",
  "topPriorities": ["..."]
}`;
        userPrompt = `Genera insights estratégicos basándote en: ${JSON.stringify(context)}`;
        break;

      case 'evaluate_workflow':
        systemPrompt = `Eres un evaluador de workflows automatizados.
Analizas la eficiencia, puntos de fallo y oportunidades de mejora en procesos.
Sugieres optimizaciones basadas en patrones de éxito.

FORMATO DE RESPUESTA (JSON estricto):
{
  "workflowAnalysis": {
    "id": "...",
    "name": "...",
    "status": "optimal" | "suboptimal" | "critical",
    "efficiencyScore": 0-100,
    "bottlenecks": [{ "step": "...", "impact": "...", "solution": "..." }],
    "improvements": [{ "description": "...", "expectedGain": "...", "implementation": "..." }]
  },
  "triggers": {
    "current": ["..."],
    "recommended": ["..."]
  },
  "automationOpportunities": [{
    "process": "...",
    "currentManualEffort": "...",
    "automationPotential": 0-100,
    "recommendedApproach": "..."
  }],
  "riskAssessment": [{
    "risk": "...",
    "probability": 0-100,
    "mitigation": "..."
  }]
}`;
        userPrompt = `Evalúa este workflow: ${JSON.stringify({ workflowId, context })}`;
        break;

      case 'learn_from_decision':
        systemPrompt = `Eres un sistema de aprendizaje continuo para agentes de IA.
Analizas decisiones pasadas, sus resultados y extraes patrones para mejorar futuras decisiones.
Implementas reinforcement learning conceptual.

FORMATO DE RESPUESTA (JSON estricto):
{
  "learningRecord": {
    "decisionId": "...",
    "outcome": "success" | "partial" | "failure",
    "lessonsLearned": ["..."],
    "patternsIdentified": [{
      "pattern": "...",
      "applicability": "...",
      "confidence": 0-100
    }]
  },
  "modelUpdates": [{
    "parameter": "...",
    "previousValue": ...,
    "newValue": ...,
    "reason": "..."
  }],
  "knowledgeBase": {
    "newRules": ["..."],
    "refinedRules": [{ "rule": "...", "refinement": "..." }],
    "deprecatedRules": ["..."]
  },
  "performanceImpact": {
    "expectedImprovement": "...",
    "affectedDecisionTypes": ["..."]
  }
}`;
        userPrompt = `Aprende de esta decisión: ${JSON.stringify(decisionData)}`;
        break;

      case 'competitive_ranking':
        systemPrompt = `Eres un sistema de ranking competitivo entre agentes de IA.
Evalúas el rendimiento de agentes basándote en métricas objetivas.
Generas rankings, badges y recomendaciones de mejora.

FORMATO DE RESPUESTA (JSON estricto):
{
  "rankings": [{
    "rank": 1,
    "agentId": "...",
    "agentName": "...",
    "domain": "...",
    "score": 0-100,
    "metrics": {
      "successRate": 0-100,
      "responseTime": ...,
      "insightsGenerated": ...,
      "actionsExecuted": ...,
      "userSatisfaction": 0-100
    },
    "badges": ["...", "..."],
    "trend": "rising" | "stable" | "declining",
    "trendPercentage": ...
  }],
  "topPerformers": [{
    "category": "...",
    "agentId": "...",
    "achievement": "..."
  }],
  "improvementRecommendations": [{
    "agentId": "...",
    "recommendation": "...",
    "expectedImpact": "..."
  }],
  "leagueTable": {
    "champion": "...",
    "challenger": "...",
    "promoted": ["..."],
    "demoted": ["..."]
  }
}`;
        userPrompt = `Genera ranking competitivo para estos agentes: ${JSON.stringify(context)}`;
        break;

      case 'chat_with_agent':
        systemPrompt = `${DOMAIN_PROMPTS[domain || 'analytics']}

Eres el agente "${agentType}" del dominio "${domain}".
Responde de forma conversacional pero profesional.
Proporciona información accionable y específica.
Si no tienes suficiente información, indícalo claramente.

Siempre estructura tus respuestas con:
1. Respuesta directa a la pregunta
2. Contexto relevante adicional
3. Recomendaciones o próximos pasos si aplica`;
        
        const messages = conversationHistory || [];
        messages.push({ role: 'user', content: message || '' });
        
        const chatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!chatResponse.ok) {
          const status = chatResponse.status;
          if (status === 429) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          if (status === 402) {
            return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw new Error(`AI API error: ${status}`);
        }

        const chatData = await chatResponse.json();
        const chatContent = chatData.choices?.[0]?.message?.content || '';

        return new Response(JSON.stringify({
          success: true,
          action,
          data: {
            response: chatContent,
            agentType,
            domain,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[erp-agent-ai] Processing action: ${action}`);

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

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${status}`);
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
      console.error('[erp-agent-ai] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-agent-ai] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      domain,
      agentType,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-agent-ai] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
