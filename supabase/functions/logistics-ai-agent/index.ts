/**
 * Logistics AI Agent
 * G1.1: Auth hardened with validateAuth
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError } from '../_shared/error-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogisticsAgentRequest {
  action: 'analyze' | 'optimize' | 'predict' | 'chat' | 'recommend';
  context?: {
    companyId?: string;
    shipments?: Array<Record<string, unknown>>;
    carriers?: Array<Record<string, unknown>>;
    vehicles?: Array<Record<string, unknown>>;
    routes?: Array<Record<string, unknown>>;
    stats?: Record<string, unknown>;
  };
  message?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- G1.1: AUTH GATE ---
    const authResult = await validateAuth(req);
    if (isAuthError(authResult)) return mapAuthError(authResult, corsHeaders);
    // --- END AUTH GATE ---

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, context, message, conversationHistory } = await req.json() as LogisticsAgentRequest;

    let systemPrompt = '';
    let userPrompt = '';

    const baseContext = `
CONTEXTO OPERATIVO LOGÍSTICA:
- Empresa ID: ${context?.companyId || 'N/A'}
- Total envíos: ${context?.stats?.totalShipments || 0}
- En tránsito: ${context?.stats?.inTransitShipments || 0}
- Pendientes: ${context?.stats?.pendingShipments || 0}
- Tasa incidencias: ${context?.stats?.incidentRate || 0}%
- Coste total: ${context?.stats?.totalCost || 0} €
- Operadoras activas: ${context?.carriers?.length || 0}
- Vehículos flota: ${context?.vehicles?.length || 0}
`;

    switch (action) {
      case 'analyze':
        systemPrompt = `Eres un agente de IA especializado en logística y cadena de suministro para empresas españolas.
Tu rol es analizar operaciones logísticas y detectar:
1. Ineficiencias en rutas y entregas
2. Problemas con operadoras (retrasos, costes excesivos)
3. Oportunidades de optimización de flota
4. Riesgos operacionales (documentación vehículos, seguros)
5. Patrones de incidencias

${baseContext}

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": "Resumen ejecutivo del análisis",
  "healthScore": 0-100,
  "issues": [
    {
      "type": "route_inefficiency" | "carrier_problem" | "fleet_issue" | "documentation" | "cost_overrun",
      "severity": "info" | "warning" | "error",
      "title": "Título del problema",
      "description": "Descripción detallada",
      "suggestedAction": "Acción recomendada",
      "estimatedImpact": "Impacto estimado"
    }
  ],
  "opportunities": [
    {
      "type": "cost_saving" | "efficiency" | "service_improvement",
      "title": "Título oportunidad",
      "description": "Descripción",
      "potentialSaving": "Ahorro potencial"
    }
  ],
  "kpis": {
    "deliveryRate": 0-100,
    "onTimeDelivery": 0-100,
    "costEfficiency": 0-100,
    "fleetUtilization": 0-100
  }
}`;

        userPrompt = `Analiza la situación logística actual:
Envíos: ${JSON.stringify(context?.shipments?.slice(0, 20) || [])}
Operadoras: ${JSON.stringify(context?.carriers || [])}
Vehículos: ${JSON.stringify(context?.vehicles || [])}`;
        break;

      case 'optimize':
        systemPrompt = `Eres un experto en optimización logística con conocimiento de:
- Algoritmos de ruteo (VRP, TSP)
- Consolidación de envíos
- Selección óptima de operadoras
- Optimización de flota
- Last-mile delivery

${baseContext}

FORMATO DE RESPUESTA (JSON estricto):
{
  "optimizations": [
    {
      "area": "routing" | "consolidation" | "carrier_selection" | "fleet" | "scheduling",
      "title": "Título optimización",
      "currentState": "Estado actual",
      "proposedChange": "Cambio propuesto",
      "expectedBenefit": "Beneficio esperado",
      "implementation": "Pasos de implementación",
      "priority": "high" | "medium" | "low",
      "estimatedSaving": 0
    }
  ],
  "quickWins": ["Lista de mejoras rápidas"],
  "longTermStrategy": "Estrategia a largo plazo"
}`;

        userPrompt = `Propón optimizaciones basándote en los datos actuales:
${JSON.stringify(context || {})}`;
        break;

      case 'predict':
        systemPrompt = `Eres un sistema predictivo de IA para logística capaz de:
- Predecir demanda de envíos
- Estimar tiempos de entrega
- Anticipar incidencias
- Proyectar costes
- Detectar patrones estacionales

${baseContext}

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [
    {
      "type": "demand" | "delivery_time" | "incident" | "cost" | "capacity",
      "period": "Período de predicción",
      "prediction": "Predicción detallada",
      "confidence": 0-100,
      "factors": ["Factores que influyen"],
      "recommendation": "Recomendación basada en predicción"
    }
  ],
  "alerts": ["Alertas basadas en predicciones"],
  "trends": {
    "volume": "up" | "down" | "stable",
    "costs": "up" | "down" | "stable",
    "performance": "up" | "down" | "stable"
  }
}`;

        userPrompt = `Genera predicciones basándote en el histórico:
${JSON.stringify(context || {})}`;
        break;

      case 'recommend':
        systemPrompt = `Eres un asesor estratégico de logística que genera recomendaciones accionables:
- Mejoras operativas inmediatas
- Negociación con operadoras
- Expansión de flota
- Nuevas rutas
- Tecnología y automatización

${baseContext}

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendations": [
    {
      "category": "operational" | "strategic" | "financial" | "technology",
      "priority": 1-5,
      "title": "Título",
      "description": "Descripción detallada",
      "expectedROI": "ROI esperado",
      "timeframe": "Plazo de implementación",
      "resources": ["Recursos necesarios"],
      "risks": ["Riesgos asociados"]
    }
  ],
  "nextBestActions": ["Top 3 acciones inmediatas"],
  "strategicInsights": "Insights estratégicos"
}`;

        userPrompt = `Genera recomendaciones estratégicas:
${JSON.stringify(context || {})}`;
        break;

      case 'chat':
      default:
        systemPrompt = `Eres el Agente de Logística IA de Obelixia ERP, un copiloto especializado en:

🚚 GESTIÓN DE ENVÍOS
- Tracking y trazabilidad
- Gestión de incidencias
- Optimización de entregas

📦 OPERADORAS Y CARRIERS
- Comparativa de tarifas
- Evaluación de rendimiento
- Integración multi-carrier

🚛 FLOTA PROPIA
- Mantenimiento predictivo
- Documentación (ITV, seguros)
- Asignación de vehículos

🗺️ RUTAS Y PLANIFICACIÓN
- Optimización de rutas
- Planificación de entregas
- Consolidación de cargas

💰 COSTES Y CONTABILIZACIÓN
- Control de costes
- Asientos automáticos
- Reporting financiero

${baseContext}

Responde de forma clara, profesional y accionable. Si detectas problemas, sugiere soluciones concretas.
Usa emojis moderadamente para mejorar legibilidad.
Siempre basa tus respuestas en los datos del contexto proporcionado.`;

        userPrompt = message || 'Hola, ¿cómo puedes ayudarme con la logística?';
        break;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: userPrompt }
    ];

    console.log(`[logistics-ai-agent] Processing action: ${action}`);
    const startTime = Date.now();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Intenta en unos segundos.' 
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const latency = Date.now() - startTime;

    if (!content) throw new Error('No content in AI response');

    let result;
    if (action !== 'chat') {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { rawContent: content };
        }
      } catch {
        result = { rawContent: content };
      }
    } else {
      result = content;
    }

    console.log(`[logistics-ai-agent] Success: ${action} in ${latency}ms`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      response: action === 'chat' ? content : undefined,
      metadata: {
        latency_ms: latency,
        model: 'gemini-2.5-flash',
        agent: 'logistics'
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[logistics-ai-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
