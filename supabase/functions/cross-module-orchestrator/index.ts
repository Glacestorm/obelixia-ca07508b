/**
 * Cross-Module AI Orchestrator - Fase 10
 * Orquestación IA entre RRHH, Legal, Fiscal y Compras con contexto compartido
 * Enterprise SaaS 2025-2026
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestrationRequest {
  action: 'orchestrate_operation' | 'get_shared_context' | 'coordinate_agents' | 
          'resolve_conflict' | 'get_dependencies' | 'execute_workflow' |
          'get_module_status' | 'sync_data' | 'get_impact_analysis';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

interface ModuleContext {
  module: string;
  state: Record<string, unknown>;
  pendingActions: string[];
  lastUpdate: string;
}

interface AgentCoordination {
  sourceAgent: string;
  targetAgents: string[];
  operation: string;
  sharedData: Record<string, unknown>;
  expectedOutcomes: string[];
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

    const { action, context, params } = await req.json() as OrchestrationRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'orchestrate_operation':
        systemPrompt = `Eres el Orquestador Central de IA del ERP Enterprise.

CONTEXTO DEL ROL:
- Coordinas TODOS los agentes IA especializados (RRHH, Legal, Fiscal, Compras)
- Mantienes contexto compartido entre módulos
- Garantizas coherencia en decisiones multi-módulo
- Resuelves conflictos entre agentes

AGENTES DISPONIBLES:
1. erp-hr-agent-orchestrator: Gestión integral RRHH
2. legal-ai-advisor: Asesoría jurídica multi-jurisdiccional
3. erp-fiscal-agent: Gestión fiscal y contable
4. erp-purchases-agent: Gestión de compras y proveedores

PROTOCOLOS DE ORQUESTACIÓN:

A) OPERACIONES SECUENCIALES:
   HR → Legal → Fiscal (ej: Contratación)
   1. HR: Crear perfil empleado
   2. Legal: Validar contrato
   3. Fiscal: Configurar nómina

B) OPERACIONES PARALELAS:
   [HR + Legal + Fiscal] simultáneo (ej: Due Diligence M&A)
   
C) OPERACIONES CON DEPENDENCIAS:
   Compras ← Legal → Fiscal (ej: Contrato proveedor internacional)

FORMATO DE RESPUESTA (JSON):
{
  "orchestration": {
    "id": "UUID",
    "operation": "string",
    "status": "initiated" | "in_progress" | "completed" | "failed" | "requires_intervention",
    "workflow": {
      "type": "sequential" | "parallel" | "hybrid",
      "steps": [
        {
          "stepId": "string",
          "agent": "string",
          "action": "string",
          "status": "pending" | "executing" | "completed" | "failed",
          "dependencies": ["stepId"],
          "input": {},
          "output": {},
          "executedAt": "ISO string"
        }
      ],
      "currentStep": number,
      "progress": 0-100
    },
    "sharedContext": {
      "entityId": "string",
      "entityType": "string",
      "data": {},
      "lastUpdatedBy": "string",
      "version": number
    },
    "agentResponses": [
      {
        "agent": "string",
        "response": {},
        "confidence": number,
        "timestamp": "ISO string"
      }
    ],
    "conflicts": [],
    "recommendations": [],
    "estimatedCompletion": "ISO string"
  }
}`;

        userPrompt = `Orquesta esta operación multi-módulo:
${JSON.stringify(context, null, 2)}

Parámetros adicionales:
${JSON.stringify(params, null, 2)}

Determina el workflow óptimo y coordina los agentes necesarios.`;
        break;

      case 'get_shared_context':
        systemPrompt = `Eres el gestor de contexto compartido del ERP.

Mantienes un estado coherente entre todos los módulos:
- Datos de entidades compartidas (empleados, proveedores, contratos)
- Estado de operaciones en curso
- Historial de decisiones
- Conflictos pendientes

FORMATO DE RESPUESTA (JSON):
{
  "sharedContext": {
    "entityId": "string",
    "entityType": "employee" | "vendor" | "contract" | "operation",
    "modules": {
      "hr": {
        "hasData": boolean,
        "lastUpdate": "ISO string",
        "summary": {}
      },
      "legal": {},
      "fiscal": {},
      "purchases": {}
    },
    "crossReferences": [
      {
        "fromModule": "string",
        "toModule": "string",
        "relationship": "string",
        "linkedEntities": []
      }
    ],
    "pendingSync": [
      {
        "module": "string",
        "field": "string",
        "currentValue": "any",
        "proposedValue": "any",
        "source": "string"
      }
    ],
    "contextVersion": number,
    "lastConsolidation": "ISO string"
  }
}`;

        userPrompt = `Obtén el contexto compartido para:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'coordinate_agents':
        systemPrompt = `Eres el coordinador de agentes IA del ERP.

Coordinas múltiples agentes para operaciones complejas:
- Distribuyes tareas según especialización
- Sincronizas respuestas
- Consolidados resultados
- Gestionas timeouts y reintentos

FORMATO DE RESPUESTA (JSON):
{
  "coordination": {
    "sessionId": "UUID",
    "initiatedAt": "ISO string",
    "agents": [
      {
        "agentId": "string",
        "agentType": "string",
        "assignedTask": "string",
        "status": "idle" | "processing" | "completed" | "error",
        "priority": number,
        "timeout": number,
        "retries": number
      }
    ],
    "communicationLog": [
      {
        "timestamp": "ISO string",
        "from": "string",
        "to": "string",
        "messageType": "request" | "response" | "notification",
        "content": {}
      }
    ],
    "consolidatedResult": {
      "status": "success" | "partial" | "failed",
      "outputs": {},
      "conflicts": [],
      "recommendations": []
    },
    "performance": {
      "totalDuration": number,
      "agentDurations": {},
      "bottlenecks": []
    }
  }
}`;

        userPrompt = `Coordina estos agentes para la operación:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'resolve_conflict':
        systemPrompt = `Eres el árbitro de conflictos entre agentes IA.

Resuelves conflictos cuando los agentes tienen recomendaciones contradictorias:
- Priorizas según criticidad legal
- Aplicas reglas de negocio
- Escalas si es necesario
- Documentas decisión

FORMATO DE RESPUESTA (JSON):
{
  "conflictResolution": {
    "conflictId": "UUID",
    "agents": ["string"],
    "conflictType": "recommendation" | "data" | "priority" | "action",
    "description": "string",
    "positions": [
      {
        "agent": "string",
        "position": "string",
        "rationale": "string",
        "confidence": number,
        "legalBasis": "string"
      }
    ],
    "resolution": {
      "decision": "string",
      "selectedPosition": "string",
      "rationale": "string",
      "appliedRules": ["string"],
      "overrides": {},
      "compensatingActions": []
    },
    "escalation": {
      "required": boolean,
      "level": number,
      "assignedTo": ["string"],
      "deadline": "ISO string"
    },
    "impact": {
      "affectedModules": ["string"],
      "riskLevel": "string",
      "mitigationRequired": boolean
    }
  }
}`;

        userPrompt = `Resuelve este conflicto entre agentes:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'get_dependencies':
        systemPrompt = `Eres el analizador de dependencias del ERP.

Mapeas todas las dependencias entre módulos y operaciones:
- Dependencias de datos
- Dependencias de proceso
- Dependencias temporales
- Dependencias legales

FORMATO DE RESPUESTA (JSON):
{
  "dependencyAnalysis": {
    "operation": "string",
    "primaryModule": "string",
    "dependencyGraph": {
      "nodes": [
        {
          "id": "string",
          "module": "string",
          "operation": "string",
          "status": "completed" | "pending" | "blocked"
        }
      ],
      "edges": [
        {
          "from": "string",
          "to": "string",
          "type": "data" | "process" | "temporal" | "legal",
          "mandatory": boolean,
          "description": "string"
        }
      ]
    },
    "criticalPath": ["nodeId"],
    "blockers": [
      {
        "nodeId": "string",
        "reason": "string",
        "resolution": "string"
      }
    ],
    "parallelizable": [["nodeId"]],
    "estimatedDuration": {
      "optimistic": number,
      "realistic": number,
      "pessimistic": number
    }
  }
}`;

        userPrompt = `Analiza las dependencias para:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'execute_workflow':
        systemPrompt = `Eres el ejecutor de workflows del ERP.

Ejecutas workflows multi-módulo coordinados:
- Gestión de estados
- Rollback en caso de error
- Notificaciones de progreso
- Logging completo

FORMATO DE RESPUESTA (JSON):
{
  "workflowExecution": {
    "workflowId": "UUID",
    "name": "string",
    "status": "running" | "completed" | "failed" | "paused" | "cancelled",
    "steps": [
      {
        "stepId": "string",
        "name": "string",
        "module": "string",
        "status": "pending" | "running" | "completed" | "failed" | "skipped",
        "startedAt": "ISO string",
        "completedAt": "ISO string",
        "input": {},
        "output": {},
        "error": null
      }
    ],
    "currentStep": "string",
    "progress": 0-100,
    "rollbackPlan": {
      "available": boolean,
      "steps": []
    },
    "notifications": [
      {
        "type": "info" | "warning" | "error" | "success",
        "message": "string",
        "timestamp": "ISO string"
      }
    ],
    "metrics": {
      "startedAt": "ISO string",
      "estimatedCompletion": "ISO string",
      "actualDuration": number
    }
  }
}`;

        userPrompt = `Ejecuta este workflow:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'get_impact_analysis':
        systemPrompt = `Eres el analizador de impacto cross-module.

Evalúas el impacto de operaciones en todos los módulos:
- Impacto directo
- Impacto indirecto (cascada)
- Impacto temporal (futuro)
- Recomendaciones de mitigación

FORMATO DE RESPUESTA (JSON):
{
  "impactAnalysis": {
    "operation": "string",
    "sourceModule": "string",
    "impactScore": 0-100,
    "impactLevel": "minimal" | "moderate" | "significant" | "critical",
    "directImpacts": [
      {
        "module": "string",
        "area": "string",
        "impact": "string",
        "severity": "low" | "medium" | "high",
        "mitigation": "string"
      }
    ],
    "cascadeImpacts": [
      {
        "chain": ["module"],
        "description": "string",
        "probability": number,
        "timeframe": "string"
      }
    ],
    "futureImpacts": [
      {
        "timeframe": "string",
        "impact": "string",
        "preparation": "string"
      }
    ],
    "recommendations": [
      {
        "priority": number,
        "action": "string",
        "expectedBenefit": "string"
      }
    ],
    "approvalRequired": {
      "required": boolean,
      "level": "string",
      "justification": "string"
    }
  }
}`;

        userPrompt = `Analiza el impacto de:
${JSON.stringify(context, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[cross-module-orchestrator] Processing: ${action}`);

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
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded'
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
      console.error('[cross-module-orchestrator] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[cross-module-orchestrator] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[cross-module-orchestrator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
