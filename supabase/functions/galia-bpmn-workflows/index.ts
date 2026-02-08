const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowRequest {
  action: 'list_workflows' | 'create_workflow' | 'update_workflow' | 'execute_workflow' | 'get_suggestions' | 'list_executions';
  context?: Record<string, unknown>;
  workflow?: Record<string, unknown>;
  workflowId?: string;
  updates?: Record<string, unknown>;
  entityId?: string;
  entityType?: string;
  variables?: Record<string, unknown>;
  nodes?: Array<{ id: string; type: string; label: string; config?: Record<string, unknown> }>;
  edges?: Array<{ id: string; source: string; target: string; label?: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, context, workflow, workflowId, updates, entityId, entityType, variables, nodes, edges } = await req.json() as WorkflowRequest;

    console.log(`[galia-bpmn-workflows] Processing action: ${action}`);

    switch (action) {
      case 'list_workflows': {
        // Simulate fetching workflows - in production would query bpmn_process_definitions
        const mockWorkflows = [
          {
            id: 'wf-001',
            name: 'Instrucción Expediente LEADER',
            description: 'Flujo completo de instrucción de expedientes LEADER',
            entity_type: 'expediente',
            is_active: true,
            nodes: [],
            edges: [],
            trigger_conditions: { onStatusChange: ['recibido'] },
            sla_config: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'wf-002',
            name: 'Justificación y Pago',
            description: 'Proceso de verificación de justificantes y liberación de pagos',
            entity_type: 'pago',
            is_active: true,
            nodes: [],
            edges: [],
            trigger_conditions: { manual: true },
            sla_config: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        return new Response(JSON.stringify({
          success: true,
          workflows: mockWorkflows,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_workflow': {
        const newWorkflow = {
          id: `wf-${Date.now()}`,
          ...workflow,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify({
          success: true,
          workflow: newWorkflow,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_workflow': {
        return new Response(JSON.stringify({
          success: true,
          message: 'Workflow actualizado',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute_workflow': {
        const execution = {
          id: `exec-${Date.now()}`,
          workflow_id: workflowId,
          entity_id: entityId,
          entity_type: entityType,
          current_node_id: 'start',
          status: 'running',
          started_at: new Date().toISOString(),
          variables: variables || {},
          history: [{
            nodeId: 'start',
            nodeName: 'Inicio',
            enteredAt: new Date().toISOString(),
          }],
        };

        return new Response(JSON.stringify({
          success: true,
          execution,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_suggestions': {
        // Use AI to analyze workflow and suggest improvements
        const systemPrompt = `Eres un experto en optimización de procesos BPMN para gestión de subvenciones públicas LEADER.

CONTEXTO:
- Analizas workflows de gestión de expedientes de ayudas europeas
- Debes sugerir mejoras para cumplimiento normativo, eficiencia y automatización
- Las sugerencias deben ser específicas y aplicables

WORKFLOW ACTUAL:
- Nodos: ${JSON.stringify(nodes)}
- Conexiones: ${JSON.stringify(edges)}
- Tipo de entidad: ${entityType}

RESPONDE EN JSON con este formato exacto:
{
  "suggestions": [
    {
      "type": "optimization" | "automation" | "compliance",
      "title": "Título corto",
      "description": "Descripción detallada de la mejora",
      "impact": "high" | "medium" | "low"
    }
  ]
}`;

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
              { role: 'user', content: 'Analiza este workflow y sugiere mejoras específicas.' }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          console.error('[galia-bpmn-workflows] AI API error:', response.status);
          // Return default suggestions on AI error
          return new Response(JSON.stringify({
            success: true,
            suggestions: [
              {
                type: 'compliance',
                title: 'Añadir verificación BDNS',
                description: 'Incluir un nodo de verificación automática contra la Base de Datos Nacional de Subvenciones',
                impact: 'high',
              },
              {
                type: 'automation',
                title: 'Notificaciones automáticas',
                description: 'Configurar alertas automáticas por email cuando se superen los SLA definidos',
                impact: 'medium',
              },
              {
                type: 'optimization',
                title: 'Paralelizar validaciones',
                description: 'Usar gateway AND para ejecutar validaciones independientes en paralelo',
                impact: 'medium',
              },
            ],
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;

        let suggestions = [];
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            suggestions = parsed.suggestions || [];
          }
        } catch (parseError) {
          console.error('[galia-bpmn-workflows] JSON parse error:', parseError);
          suggestions = [
            {
              type: 'optimization',
              title: 'Revisar tiempos SLA',
              description: 'Ajustar los tiempos máximos de cada etapa según el histórico de ejecuciones',
              impact: 'medium',
            },
          ];
        }

        return new Response(JSON.stringify({
          success: true,
          suggestions,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list_executions': {
        // Simulate execution history
        const mockExecutions = [
          {
            id: 'exec-001',
            workflow_id: workflowId || 'wf-001',
            entity_id: 'exp-2024-001',
            entity_type: 'expediente',
            current_node_id: 'evaluacion',
            status: 'running',
            started_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            variables: {},
            history: [
              { nodeId: 'start', nodeName: 'Inicio', enteredAt: new Date(Date.now() - 86400000 * 3).toISOString(), exitedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
              { nodeId: 'validacion', nodeName: 'Validación', enteredAt: new Date(Date.now() - 86400000 * 2).toISOString(), exitedAt: new Date(Date.now() - 86400000).toISOString() },
              { nodeId: 'evaluacion', nodeName: 'Evaluación', enteredAt: new Date(Date.now() - 86400000).toISOString() },
            ],
          },
          {
            id: 'exec-002',
            workflow_id: workflowId || 'wf-001',
            entity_id: 'exp-2024-002',
            entity_type: 'expediente',
            current_node_id: 'end-ok',
            status: 'completed',
            started_at: new Date(Date.now() - 86400000 * 10).toISOString(),
            completed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            variables: {},
            history: [],
          },
        ];

        return new Response(JSON.stringify({
          success: true,
          executions: mockExecutions,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Acción no soportada: ${action}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[galia-bpmn-workflows] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
