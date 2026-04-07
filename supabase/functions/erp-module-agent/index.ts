import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dominios que SIEMPRE requieren validación legal pre-acción
const LEGAL_VALIDATION_REQUIRED_DOMAINS = ['hr', 'financial', 'compliance'];

// Tipos de acciones que SIEMPRE requieren validación legal
const LEGAL_VALIDATION_REQUIRED_ACTIONS = [
  'terminate_employee', 'modify_contract', 'process_payroll',
  'create_invoice', 'approve_payment', 'modify_tax_config',
  'delete_data', 'export_personal_data', 'modify_permissions'
];

interface AgentRequest {
  action: 'execute' | 'coordinate_domain' | 'supervisor_orchestrate' | 'get_predictive_insights' | 'execute_with_legal_validation';
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
  skipLegalValidation?: boolean; // Solo para acciones de bajo riesgo
  jurisdictions?: string[];
}

interface LegalValidationResult {
  approved: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  conditions: string[];
  blocking_issues: string[];
}

/**
 * Función helper para solicitar validación legal al Agente Jurídico
 */
async function requestLegalValidation(
  supabaseUrl: string,
  supabaseKey: string,
  agentId: string,
  agentType: string,
  actionType: string,
  actionData: Record<string, unknown>,
  jurisdictions: string[] = ['ES', 'AD', 'EU']
): Promise<LegalValidationResult> {
  try {
    const legalInternalSecret = Deno.env.get('LEGAL_INTERNAL_SECRET');
    if (!legalInternalSecret) {
      console.error('[erp-module-agent] LEGAL_INTERNAL_SECRET not configured — skipping legal validation');
      return { isValid: false, requiresReview: true, warnings: ['Legal validation unavailable: missing internal secret'], blockingIssues: [] };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/legal-ai-advisor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'x-internal-secret': legalInternalSecret,
      },
      body: JSON.stringify({
        action: 'validate_action',
        requesting_agent: agentId,
        requesting_agent_type: agentType,
        jurisdictions,
        urgency: 'immediate',
        agent_action: {
          action_type: actionType,
          action_data: actionData
        }
      })
    });

    if (!response.ok) {
      console.warn('[erp-module-agent] Legal validation failed, proceeding with caution');
      return {
        approved: false,
        risk_level: 'high',
        warnings: ['Validación legal no disponible'],
        conditions: ['Requiere revisión manual'],
        blocking_issues: ['Error en servicio de validación legal']
      };
    }

    const data = await response.json();
    
    if (data?.success && data?.data) {
      return {
        approved: data.data.approved ?? false,
        risk_level: data.data.risk_level ?? 'medium',
        warnings: data.data.warnings ?? [],
        conditions: data.data.conditions ?? [],
        blocking_issues: data.data.blocking_issues ?? []
      };
    }

    return {
      approved: true,
      risk_level: 'low',
      warnings: [],
      conditions: [],
      blocking_issues: []
    };
  } catch (error) {
    console.error('[erp-module-agent] Legal validation error:', error);
    return {
      approved: false,
      risk_level: 'high',
      warnings: ['Error en validación legal'],
      conditions: [],
      blocking_issues: ['Servicio legal no disponible - escalar a supervisión']
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const requestData = await req.json() as AgentRequest;
    const { 
      action, agentType, domain, context, capabilities, 
      objective, priority, moduleAgents, domains, currentState,
      skipLegalValidation, jurisdictions 
    } = requestData;

    console.log(`[erp-module-agent] Action: ${action}, AgentType: ${agentType}, Domain: ${domain}`);

    let systemPrompt = '';
    let userPrompt = '';
    let legalValidation: LegalValidationResult | null = null;

    // === VALIDACIÓN LEGAL PRE-ACCIÓN ===
    // Verificar si esta acción requiere validación legal
    const requiresLegalValidation = 
      !skipLegalValidation && 
      action === 'execute' && 
      domain && 
      agentType && 
      (
        LEGAL_VALIDATION_REQUIRED_DOMAINS.includes(domain) ||
        LEGAL_VALIDATION_REQUIRED_ACTIONS.some(a => 
          context && JSON.stringify(context).toLowerCase().includes(a)
        )
      );

    if (requiresLegalValidation) {
      console.log(`[erp-module-agent] Requesting legal validation for ${domain}/${agentType}`);
      
      legalValidation = await requestLegalValidation(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        `agent_${domain}_${agentType}`,
        agentType,
        action,
        context || {},
        jurisdictions || ['ES', 'AD', 'EU']
      );

      // Si la validación legal rechaza la acción, devolver inmediatamente
      if (!legalValidation.approved && legalValidation.blocking_issues.length > 0) {
        console.log(`[erp-module-agent] Action blocked by legal validation`);
        return new Response(JSON.stringify({
          success: false,
          action,
          blocked_by_legal: true,
          legal_validation: legalValidation,
          message: 'Acción bloqueada por validación legal',
          timestamp: new Date().toISOString()
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    switch (action) {
      case 'execute':
      case 'execute_with_legal_validation':
        // Incluir resultado de validación legal en el contexto del agente
        const legalContext = legalValidation ? `
VALIDACIÓN LEGAL PRE-ACCIÓN:
- Aprobado: ${legalValidation.approved ? 'Sí' : 'Con condiciones'}
- Nivel de riesgo: ${legalValidation.risk_level}
- Advertencias: ${legalValidation.warnings.join(', ') || 'Ninguna'}
- Condiciones: ${legalValidation.conditions.join(', ') || 'Ninguna'}

IMPORTANTE: Debes considerar estas condiciones y advertencias legales en tu análisis.
` : '';

        systemPrompt = `Eres un agente IA especializado de tipo "${agentType}" para el dominio "${domain}" de un ERP enterprise.
${legalContext}
CAPACIDADES DISPONIBLES:
${capabilities?.join('\n- ') || 'Ninguna especificada'}

ROL:
- Analizar el contexto proporcionado
- Identificar acciones requeridas según tus capacidades
- Proponer métricas y resultados
- Cumplir con las condiciones legales indicadas

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
