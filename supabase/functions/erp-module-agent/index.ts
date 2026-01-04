import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRequest {
  action: 'execute' | 'coordinate_domain' | 'supervisor_orchestrate' | 'get_predictive_insights' | 'coordinate_import';
  agentType?: string;
  domain?: string;
  context?: Record<string, unknown>;
  capabilities?: string[];
  objective?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  moduleAgents?: Array<{
    id: string;
    type: string;
    status: string;
    capabilities: string[];
  }>;
  domains?: Array<{
    id: string;
    domain: string;
    status: string;
    activeModules: number;
  }>;
  currentState?: Record<string, unknown>;
  // Para coordinación de importación
  importContext?: {
    fileName?: string;
    detectedEntities?: Array<{
      entity_type: string;
      records_count: number;
      confidence: number;
    }>;
    importResults?: Array<{
      entity_type: string;
      status: string;
      inserted_count: number;
      error_count: number;
    }>;
  };
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

    const { action, agentType, domain, context, capabilities, objective, priority, moduleAgents, domains, currentState, importContext } = await req.json() as AgentRequest;

    console.log(`[erp-module-agent] Action: ${action}, AgentType: ${agentType}, Domain: ${domain}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'execute':
        systemPrompt = `Eres un agente IA especializado de tipo "${agentType}" para el dominio "${domain}" de un ERP enterprise.

CAPACIDADES DISPONIBLES:
${capabilities?.join('\n- ') || 'Ninguna especificada'}

ROL:
- Analizar el contexto proporcionado
- Identificar acciones requeridas según tus capacidades
- Proponer métricas y resultados

FORMATO DE RESPUESTA (JSON estricto):
{
  "success": true,
  "actions_taken": [
    {"action": "nombre_accion", "result": "descripcion_resultado", "confidence": 0-100}
  ],
  "metrics": {
    "items_processed": number,
    "success_rate": number,
    "time_saved_minutes": number
  },
  "recommendations": ["recomendación 1", "recomendación 2"],
  "next_steps": ["paso 1", "paso 2"]
}`;

        userPrompt = context 
          ? `Ejecuta análisis con este contexto:\n${JSON.stringify(context, null, 2)}`
          : 'Ejecuta análisis general de tu módulo y proporciona métricas actualizadas.';
        break;

      case 'coordinate_domain':
        systemPrompt = `Eres el agente coordinador del dominio "${domain}" en un ERP enterprise.

AGENTES BAJO TU COORDINACIÓN:
${moduleAgents?.map(a => `- ${a.type}: ${a.status} (${a.capabilities.slice(0, 3).join(', ')})`).join('\n') || 'Ninguno'}

OBJETIVO: ${objective || 'Optimizar operaciones del dominio'}

RESPONSABILIDADES:
1. Distribuir tareas entre agentes del módulo
2. Detectar conflictos o duplicidades
3. Optimizar flujos de trabajo
4. Reportar estado consolidado

FORMATO DE RESPUESTA (JSON estricto):
{
  "coordination_plan": {
    "priority_actions": [{"agent_type": "string", "action": "string", "priority": 1-5}],
    "dependencies": [{"from": "agent1", "to": "agent2", "type": "data|trigger|approval"}],
    "conflicts_detected": []
  },
  "domain_metrics": {
    "efficiency_score": 0-100,
    "bottlenecks": [],
    "optimization_opportunities": []
  },
  "escalations": []
}`;

        userPrompt = `Coordina los ${moduleAgents?.length || 0} agentes del dominio para: ${objective}`;
        break;

      case 'supervisor_orchestrate':
        systemPrompt = `Eres el SUPERVISOR GENERAL de todos los agentes IA de un ERP enterprise.

DOMINIOS BAJO SUPERVISIÓN:
${domains?.map(d => `- ${d.domain}: ${d.status} (${d.activeModules} módulos activos)`).join('\n') || 'Ninguno'}

OBJETIVO GLOBAL: ${objective || 'Optimización general'}
PRIORIDAD: ${priority || 'medium'}

CAPACIDADES DE SUPERVISOR:
1. Distribución inteligente de tareas entre dominios
2. Resolución de conflictos inter-dominio
3. Optimización de recursos globales
4. Análisis predictivo del sistema
5. Auto-optimización continua
6. Aprendizaje entre módulos

FORMATO DE RESPUESTA (JSON estricto):
{
  "orchestration_plan": {
    "global_objective": "string",
    "domain_assignments": [{"domain": "string", "tasks": [], "priority": 1-5}],
    "cross_domain_workflows": [],
    "resource_allocation": {}
  },
  "insights": [
    {
      "id": "insight_1",
      "type": "optimization|warning|prediction|recommendation",
      "priority": "low|medium|high|critical",
      "title": "string",
      "description": "string",
      "affectedDomains": ["domain1"],
      "suggestedAction": "string",
      "confidence": 0-100,
      "timestamp": "ISO8601"
    }
  ],
  "system_health": {
    "overall_score": 0-100,
    "bottlenecks": [],
    "optimization_suggestions": []
  },
  "conflicts_resolved": 0,
  "learning_updates": []
}`;

        userPrompt = `Orquesta todos los dominios (${domains?.length || 0}) para el objetivo: ${objective}. Genera insights predictivos y plan de optimización.`;
        break;

      case 'get_predictive_insights':
        systemPrompt = `Eres el sistema de análisis predictivo del ERP. Genera insights basados en el estado actual del sistema.

ESTADO ACTUAL:
${JSON.stringify(currentState, null, 2)}

TIPOS DE INSIGHTS A GENERAR:
1. optimization - Oportunidades de mejora
2. warning - Alertas de riesgo
3. prediction - Predicciones futuras
4. recommendation - Recomendaciones proactivas

FORMATO DE RESPUESTA (JSON estricto):
{
  "insights": [
    {
      "id": "unique_id",
      "type": "optimization|warning|prediction|recommendation",
      "priority": "low|medium|high|critical",
      "title": "Título corto",
      "description": "Descripción detallada",
      "affectedDomains": ["financial", "compliance"],
      "suggestedAction": "Acción sugerida",
      "confidence": 85,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "system_trends": {
    "efficiency_trend": "improving|stable|declining",
    "risk_level": "low|medium|high",
    "predicted_issues": []
  }
}`;

        userPrompt = 'Analiza el estado actual y genera 3-5 insights predictivos relevantes.';
        break;

      case 'coordinate_import':
        systemPrompt = `Eres el agente COORDINADOR DE IMPORTACIÓN del módulo Maestros de un ERP enterprise.

CONTEXTO DE IMPORTACIÓN:
- Archivo: ${importContext?.fileName || 'No especificado'}
- Entidades detectadas: ${JSON.stringify(importContext?.detectedEntities || [])}
- Resultados: ${JSON.stringify(importContext?.importResults || [])}

RESPONSABILIDADES:
1. Validar consistencia entre entidades importadas
2. Detectar relaciones faltantes (ej: artículo sin proveedor)
3. Proponer correcciones automáticas
4. Coordinar con otros módulos afectados
5. Generar reporte de impacto

FORMATO DE RESPUESTA (JSON estricto):
{
  "validation": {
    "is_consistent": true|false,
    "issues": [{"entity": "string", "issue": "string", "severity": "low|medium|high", "auto_fixable": true|false}],
    "relationships_missing": []
  },
  "impact_analysis": {
    "affected_modules": ["ventas", "compras", "inventario"],
    "data_quality_score": 0-100,
    "recommendations": []
  },
  "auto_corrections": [
    {"entity": "string", "field": "string", "original": "value", "corrected": "value", "reason": "string"}
  ],
  "next_steps": ["Revisar X", "Configurar Y"],
  "supervisor_notification": {
    "should_notify": true|false,
    "priority": "low|medium|high|critical",
    "summary": "Resumen para el supervisor"
  }
}`;

        userPrompt = importContext?.importResults?.length 
          ? `Analiza los resultados de importación y coordina las acciones necesarias.`
          : `Prepara la estrategia de importación para las entidades detectadas.`;
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
      const errorText = await response.text();
      console.error('[erp-module-agent] AI API error:', response.status, errorText);
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
      console.error('[erp-module-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-module-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-module-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
