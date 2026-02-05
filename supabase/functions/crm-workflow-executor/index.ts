import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutorRequest {
  action: 'execute' | 'resume' | 'step' | 'analyze';
  executionId?: string;
  workflowId?: string;
  context?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, executionId, workflowId, context } = await req.json() as ExecutorRequest;

    console.log(`[crm-workflow-executor] Action: ${action}, Execution: ${executionId}`);

    switch (action) {
      case 'execute': {
        if (!workflowId || !executionId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'workflowId and executionId required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Fetch workflow and nodes
        const { data: workflow, error: wfError } = await supabase
          .from('crm_workflows')
          .select('*')
          .eq('id', workflowId)
          .single();

        if (wfError || !workflow) {
          throw new Error('Workflow not found');
        }

        const { data: nodes } = await supabase
          .from('crm_workflow_nodes')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('order_index', { ascending: true });

        const { data: connections } = await supabase
          .from('crm_workflow_connections')
          .select('*')
          .eq('workflow_id', workflowId);

        // Execute each node in order
        let stepsExecuted = 0;
        let currentContext = { ...context };

        for (const node of (nodes || [])) {
          // Skip trigger nodes (they just initiate)
          if (node.node_type === 'trigger') continue;

          // Create execution step record
          const { data: step } = await supabase
            .from('crm_workflow_execution_steps')
            .insert({
              execution_id: executionId,
              node_id: node.id,
              step_order: stepsExecuted + 1,
              status: 'running',
              input_data: currentContext,
              started_at: new Date().toISOString()
            })
            .select()
            .single();

          try {
            // Execute node based on type
            const result = await executeNode(node, currentContext, supabase);
            
            // Update step as completed
            await supabase
              .from('crm_workflow_execution_steps')
              .update({
                status: 'completed',
                output_data: result,
                completed_at: new Date().toISOString(),
                duration_ms: step ? Date.now() - new Date(step.started_at).getTime() : 0
              })
              .eq('id', step?.id);

            currentContext = { ...currentContext, ...result };
            stepsExecuted++;
          } catch (nodeError) {
            // Update step as failed
            await supabase
              .from('crm_workflow_execution_steps')
              .update({
                status: 'failed',
                error_message: nodeError instanceof Error ? nodeError.message : 'Unknown error',
                completed_at: new Date().toISOString()
              })
              .eq('id', step?.id);

            // Mark execution as failed
            await supabase
              .from('crm_workflow_executions')
              .update({
                status: 'failed',
                error_message: nodeError instanceof Error ? nodeError.message : 'Unknown error',
                completed_at: new Date().toISOString()
              })
              .eq('id', executionId);

            return new Response(JSON.stringify({
              success: false,
              status: 'failed',
              stepsExecuted,
              error: nodeError instanceof Error ? nodeError.message : 'Unknown error'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Mark execution as completed
        await supabase
          .from('crm_workflow_executions')
          .update({
            status: 'completed',
            context_data: currentContext,
            completed_at: new Date().toISOString()
          })
          .eq('id', executionId);

        return new Response(JSON.stringify({
          success: true,
          status: 'completed',
          stepsExecuted,
          context: currentContext
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'resume': {
        if (!executionId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'executionId required' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update status to running
        await supabase
          .from('crm_workflow_executions')
          .update({ status: 'running' })
          .eq('id', executionId);

        // Continue execution from current node
        // ... (simplified for now)

        return new Response(JSON.stringify({
          success: true,
          status: 'running'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'analyze': {
        // Use AI to analyze workflow performance
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          throw new Error('LOVABLE_API_KEY not configured');
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
              {
                role: 'system',
                content: `Eres un analista de workflows CRM. Analiza el rendimiento y sugiere optimizaciones.

FORMATO DE RESPUESTA (JSON):
{
  "performance": { "score": 0-100, "bottlenecks": [], "recommendations": [] },
  "optimization": { "suggestedChanges": [], "estimatedImprovement": "string" }
}`
              },
              {
                role: 'user',
                content: `Analiza este workflow: ${JSON.stringify(context)}`
              }
            ],
            temperature: 0.5,
            max_tokens: 1500
          })
        });

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;

        let analysis;
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
        } catch {
          analysis = { rawContent: content };
        }

        return new Response(JSON.stringify({
          success: true,
          analysis
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('[crm-workflow-executor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Node execution logic
async function executeNode(
  node: any, 
  context: Record<string, unknown>,
  supabase: any
): Promise<Record<string, unknown>> {
  const config = node.config || {};

  switch (node.node_type) {
    case 'action':
      return executeAction(node.node_subtype, config, context, supabase);

    case 'condition':
      return evaluateCondition(node.node_subtype, config, context);

    case 'delay':
      return executeDelay(config);

    case 'split':
      return executeSplit(config, context);

    default:
      return { executed: true, nodeType: node.node_type };
  }
}

async function executeAction(
  subtype: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  supabase: any
): Promise<Record<string, unknown>> {
  switch (subtype) {
    case 'send_email':
      // Simulated email sending
      console.log('[Action] Send email:', config);
      return { emailSent: true, to: config.to };

    case 'send_notification':
      console.log('[Action] Send notification:', config);
      return { notificationSent: true };

    case 'create_task':
      // Create task in database
      const { data: task } = await supabase
        .from('crm_activities')
        .insert({
          type: 'task',
          title: config.title || 'Tarea de workflow',
          description: config.description,
          status: 'pending'
        })
        .select()
        .single();

      return { taskCreated: true, taskId: task?.id };

    case 'update_record':
      // Update record based on config
      console.log('[Action] Update record:', config);
      return { recordUpdated: true };

    case 'add_tag':
      console.log('[Action] Add tag:', config);
      return { tagAdded: true, tag: config.tag };

    default:
      return { executed: true, action: subtype };
  }
}

function evaluateCondition(
  subtype: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const field = config.field as string;
  const operator = config.operator as string;
  const value = config.value;
  const contextValue = context[field];

  let result = false;

  switch (operator || subtype) {
    case 'field_equals':
    case 'equals':
      result = contextValue === value;
      break;
    case 'field_contains':
    case 'contains':
      result = String(contextValue).includes(String(value));
      break;
    case 'field_greater':
    case 'greater_than':
      result = Number(contextValue) > Number(value);
      break;
    case 'field_less':
    case 'less_than':
      result = Number(contextValue) < Number(value);
      break;
    default:
      result = true;
  }

  return { conditionMet: result, field, operator, value, contextValue };
}

function executeDelay(config: Record<string, unknown>): Record<string, unknown> {
  // In a real implementation, this would schedule the next step
  const delayMs = calculateDelayMs(config);
  console.log(`[Delay] Waiting ${delayMs}ms`);
  
  return { 
    delayed: true, 
    delayMs,
    resumeAt: new Date(Date.now() + delayMs).toISOString()
  };
}

function calculateDelayMs(config: Record<string, unknown>): number {
  const unit = config.unit as string || 'minutes';
  const amount = Number(config.amount || config.minutes || config.hours || config.days || 1);

  switch (unit) {
    case 'minutes':
      return amount * 60 * 1000;
    case 'hours':
      return amount * 60 * 60 * 1000;
    case 'days':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount * 60 * 1000;
  }
}

function executeSplit(
  config: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const splitType = config.type as string || 'random';
  
  if (splitType === 'percentage') {
    const random = Math.random() * 100;
    const threshold = Number(config.percentage || 50);
    return { branch: random < threshold ? 'A' : 'B', random };
  }

  if (splitType === 'ab_test') {
    const random = Math.random();
    return { branch: random < 0.5 ? 'A' : 'B', random };
  }

  return { branch: 'default' };
}
