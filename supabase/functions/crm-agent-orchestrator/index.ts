import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestratorRequest {
  action: 'execute_instruction' | 'supervisor_instruction' | 'execute_agent' | 'register_agent' | 'get_insights';
  agentId?: string;
  moduleType?: string;
  instruction?: string;
  agentAction?: string;
  context?: Record<string, unknown>;
  systemPrompt?: string;
  capabilities?: Array<{ id: string; name: string; description: string }>;
  targetAgents?: string[];
  currentState?: Record<string, unknown>;
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

    const request = await req.json() as OrchestratorRequest;
    const { action } = request;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'execute_instruction':
        systemPrompt = request.systemPrompt || `Eres un agente CRM ultra-especializado en ${request.moduleType || 'gestión comercial'}.

CAPACIDADES DISPONIBLES:
${request.capabilities?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'Gestión general CRM'}

REGLAS DE RESPUESTA:
1. Responde siempre con acciones concretas y datos específicos
2. Proporciona recomendaciones accionables
3. Indica nivel de confianza en tus análisis
4. Sugiere siguientes pasos claros

FORMATO DE RESPUESTA (JSON estricto):
{
  "response": "Tu respuesta detallada aquí",
  "confidenceScore": 85,
  "actionTaken": "acción realizada si aplica",
  "recommendations": ["rec1", "rec2"],
  "nextSteps": ["paso1", "paso2"],
  "metrics": { "impactEstimated": "valor" }
}`;

        userPrompt = `INSTRUCCIÓN: ${request.instruction}

CONTEXTO:
${request.context ? JSON.stringify(request.context, null, 2) : 'Sin contexto adicional'}

Procesa esta instrucción y proporciona una respuesta detallada con recomendaciones.`;
        break;

      case 'supervisor_instruction':
        systemPrompt = `Eres el Supervisor General de Agentes IA - el coordinador central de todos los agentes CRM y ERP.

TU ROL:
1. Coordinar múltiples agentes especializados
2. Resolver conflictos entre agentes
3. Optimizar recursos y prioridades
4. Generar insights predictivos cross-funcionales
5. Tomar decisiones de alto nivel

AGENTES REGISTRADOS:
${request.targetAgents?.join(', ') || 'Todos los agentes CRM'}

ESTADO ACTUAL DEL SISTEMA:
${request.currentState ? JSON.stringify(request.currentState, null, 2) : 'Estado nominal'}

INSTRUCCIONES AUTÓNOMAS POSIBLES:
- coordinate_all_agents: Sincronizar todos los agentes
- optimize_pipeline: Optimizar flujo de ventas
- analyze_conversion_funnel: Analizar embudo de conversión
- detect_revenue_opportunities: Detectar oportunidades de ingresos
- prevent_churn_risks: Prevenir riesgos de abandono
- balance_workload: Balancear carga de trabajo
- cross_module_learning: Aprendizaje cruzado entre módulos
- generate_insights: Generar insights predictivos

FORMATO DE RESPUESTA (JSON estricto):
{
  "response": "Descripción de acciones tomadas",
  "insights": [
    {
      "id": "insight_1",
      "type": "opportunity|risk|optimization|trend",
      "priority": "low|medium|high|critical",
      "title": "Título del insight",
      "description": "Descripción detallada",
      "affectedAgents": ["agent_id1", "agent_id2"],
      "probability": 85,
      "estimatedImpact": 15000,
      "recommendedAction": "Acción recomendada",
      "timestamp": "${new Date().toISOString()}"
    }
  ],
  "coordinationActions": [
    {
      "targetAgent": "agent_id",
      "action": "acción asignada",
      "priority": "high"
    }
  ],
  "systemOptimizations": ["opt1", "opt2"],
  "conflictsResolved": 0,
  "executionTimeMs": 1500
}`;

        userPrompt = `INSTRUCCIÓN DEL SUPERVISOR: ${request.instruction}

Ejecuta esta instrucción considerando el estado de todos los agentes y genera insights accionables.`;
        break;

      case 'execute_agent':
        systemPrompt = `Eres un agente CRM especializado en ${request.moduleType || 'gestión comercial'}.

ACCIÓN A EJECUTAR: ${request.agentAction}

CAPACIDADES:
${request.capabilities?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'Capacidades estándar'}

FORMATO DE RESPUESTA (JSON estricto):
{
  "success": true,
  "result": {
    "actionCompleted": "descripción de lo realizado",
    "dataProcessed": {},
    "changes": []
  },
  "confidenceScore": 88,
  "recommendations": ["rec1", "rec2"],
  "nextActions": ["next1", "next2"],
  "executionTimeMs": 450
}`;

        userPrompt = `Ejecuta la acción "${request.agentAction}" con el siguiente contexto:
${request.context ? JSON.stringify(request.context, null, 2) : 'Sin contexto adicional'}`;
        break;

      case 'get_insights':
        systemPrompt = `Eres el motor de análisis predictivo del sistema de agentes CRM.

Analiza el estado actual del sistema y genera insights predictivos de alto valor.

FORMATO DE RESPUESTA (JSON estricto):
{
  "insights": [
    {
      "id": "insight_${Date.now()}",
      "type": "opportunity|risk|optimization|trend",
      "priority": "low|medium|high|critical",
      "title": "Título descriptivo",
      "description": "Descripción detallada del insight",
      "affectedAgents": [],
      "probability": 80,
      "estimatedImpact": 10000,
      "recommendedAction": "Acción sugerida",
      "timestamp": "${new Date().toISOString()}"
    }
  ],
  "systemTrends": {
    "performance": "improving|stable|declining",
    "utilizationTrend": 65,
    "predictedBottlenecks": []
  }
}`;

        userPrompt = `Estado actual del sistema:
${request.currentState ? JSON.stringify(request.currentState, null, 2) : 'Sistema nominal'}

Genera insights predictivos basados en este estado.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[crm-agent-orchestrator] Processing: ${action}`);

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
        max_tokens: 2000,
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
        result = { response: content, parseError: false };
      }
    } catch (parseError) {
      console.error('[crm-agent-orchestrator] JSON parse error:', parseError);
      result = { response: content, parseError: true };
    }

    console.log(`[crm-agent-orchestrator] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-agent-orchestrator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
