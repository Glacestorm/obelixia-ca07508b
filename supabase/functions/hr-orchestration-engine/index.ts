import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RATE_LIMIT_CONFIG = {
  burstPerMinute: 10,
  perDay: 200,
  functionName: 'hr-orchestration-engine',
};

interface OrchestrationEvent {
  action: 'emit_event' | 'evaluate_rules' | 'execute_action' | 'get_chain_status';
  company_id: string;
  trigger_module?: string;
  trigger_event?: string;
  trigger_table?: string;
  trigger_data?: Record<string, unknown>;
  rule_id?: string;
  chain_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const input: OrchestrationEvent = await req.json();
    const { action, company_id, trigger_module, trigger_event, trigger_table, trigger_data, rule_id, chain_id } = input;

    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit check
    const burstResult = checkBurstLimit(company_id, RATE_LIMIT_CONFIG);
    if (!burstResult.allowed) {
      console.warn(`[hr-orchestration-engine] Rate limited: company=${company_id}`);
      return rateLimitResponse(burstResult, corsHeaders);
    }

    console.log(`[hr-orchestration-engine] ${action} from ${trigger_module}:${trigger_event} by ${userId} remaining=${burstResult.remaining}`);

    switch (action) {
      // ── Emit Event: find matching rules and execute them ──
      case 'emit_event': {
        if (!trigger_module || !trigger_event) {
          return new Response(JSON.stringify({ success: false, error: 'trigger_module and trigger_event required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch active rules matching this trigger
        const { data: rules, error: rulesErr } = await supabase
          .from('erp_hr_orchestration_rules')
          .select('*')
          .eq('company_id', company_id)
          .eq('is_active', true)
          .eq('trigger_module', trigger_module)
          .eq('trigger_event', trigger_event)
          .order('priority', { ascending: true });

        if (rulesErr) throw rulesErr;

        if (!rules || rules.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            matched_rules: 0, 
            message: 'No matching rules found' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Filter by trigger_table if specified in rule
        const matchedRules = rules.filter((r: any) => 
          !r.trigger_table || r.trigger_table === trigger_table
        );

        // Execute each matched rule
        const results = [];
        for (const rule of matchedRules) {
          const startTime = Date.now();
          let status = 'success';
          let errorMessage: string | null = null;
          let actionResult: Record<string, unknown> = {};

          try {
            // Check trigger_conditions
            if (rule.trigger_conditions && Object.keys(rule.trigger_conditions).length > 0) {
              const conditionsMet = evaluateConditions(rule.trigger_conditions, trigger_data || {});
              if (!conditionsMet) {
                status = 'skipped';
                actionResult = { reason: 'Conditions not met' };
                continue;
              }
            }

            // Execute the action
            actionResult = await executeAction(supabase, {
              actionModule: rule.action_module,
              actionType: rule.action_type,
              actionConfig: rule.action_config || {},
              triggerData: trigger_data || {},
              companyId: company_id,
              userId,
            });

          } catch (err) {
            status = 'failed';
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[hr-orchestration-engine] Rule ${rule.id} failed:`, err);
          }

          const executionTimeMs = Date.now() - startTime;

          // Log execution
          await supabase.from('erp_hr_orchestration_log').insert({
            rule_id: rule.id,
            company_id,
            trigger_module,
            trigger_event,
            trigger_data: trigger_data || {},
            action_module: rule.action_module,
            action_type: rule.action_type,
            action_result: actionResult,
            status,
            error_message: errorMessage,
            execution_time_ms: executionTimeMs,
          });

          // Update rule stats
          await supabase
            .from('erp_hr_orchestration_rules')
            .update({
              last_executed_at: new Date().toISOString(),
              execution_count: (rule.execution_count || 0) + 1,
              last_error: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rule.id);

          results.push({
            rule_id: rule.id,
            rule_name: rule.name,
            status,
            execution_time_ms: executionTimeMs,
            action_module: rule.action_module,
            action_type: rule.action_type,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          matched_rules: matchedRules.length,
          executed: results.filter(r => r.status === 'success').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          failed: results.filter(r => r.status === 'failed').length,
          results,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── Get execution chain status ──
      case 'get_chain_status': {
        const { data: logs, error: logsErr } = await supabase
          .from('erp_hr_orchestration_log')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (logsErr) throw logsErr;

        const stats = {
          total: logs?.length || 0,
          success: logs?.filter((l: any) => l.status === 'success').length || 0,
          failed: logs?.filter((l: any) => l.status === 'failed').length || 0,
          skipped: logs?.filter((l: any) => l.status === 'skipped').length || 0,
          avgExecutionMs: logs && logs.length > 0
            ? Math.round(logs.reduce((sum: number, l: any) => sum + (l.execution_time_ms || 0), 0) / logs.length)
            : 0,
        };

        return new Response(JSON.stringify({ success: true, stats, recent_logs: logs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('[hr-orchestration-engine] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Condition Evaluator ──
function evaluateConditions(
  conditions: Record<string, unknown>,
  data: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = data[key];
    if (typeof expected === 'object' && expected !== null) {
      const op = expected as Record<string, unknown>;
      if ('$gt' in op && !(Number(actual) > Number(op.$gt))) return false;
      if ('$lt' in op && !(Number(actual) < Number(op.$lt))) return false;
      if ('$eq' in op && actual !== op.$eq) return false;
      if ('$ne' in op && actual === op.$ne) return false;
      if ('$in' in op && Array.isArray(op.$in) && !op.$in.includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

// ── Action Executor ──
async function executeAction(
  supabase: any,
  params: {
    actionModule: string;
    actionType: string;
    actionConfig: Record<string, unknown>;
    triggerData: Record<string, unknown>;
    companyId: string;
    userId: string | null;
  }
): Promise<Record<string, unknown>> {
  const { actionModule, actionType, actionConfig, triggerData, companyId, userId } = params;

  switch (actionType) {
    case 'create_alert': {
      const title = interpolate(actionConfig.title as string || 'Alerta de orquestación', triggerData);
      const message = interpolate(actionConfig.message as string || 'Evento detectado', triggerData);
      const severity = actionConfig.severity || 'medium';

      // Insert into a generic alerts mechanism (log-based)
      return {
        type: 'alert',
        title,
        message,
        severity,
        target_module: actionModule,
        created_at: new Date().toISOString(),
      };
    }

    case 'create_record': {
      const targetTable = actionConfig.target_table as string;
      if (!targetTable) throw new Error('target_table required for create_record');

      const record = {
        ...(actionConfig.record_template as Record<string, unknown> || {}),
        company_id: companyId,
      };

      // Interpolate values from trigger data
      for (const [k, v] of Object.entries(record)) {
        if (typeof v === 'string' && v.startsWith('{{') && v.endsWith('}}')) {
          const field = v.slice(2, -2).trim();
          record[k] = triggerData[field] ?? v;
        }
      }

      const { data, error } = await supabase.from(targetTable).insert(record).select().single();
      if (error) throw error;
      return { type: 'record_created', table: targetTable, record_id: data?.id };
    }

    case 'update_status': {
      const targetTable = actionConfig.target_table as string;
      const targetId = interpolate(actionConfig.target_id as string || '', triggerData);
      const newStatus = actionConfig.new_status as string;

      if (!targetTable || !newStatus) throw new Error('target_table and new_status required');

      const { error } = await supabase
        .from(targetTable)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', targetId)
        .eq('company_id', companyId);

      if (error) throw error;
      return { type: 'status_updated', table: targetTable, id: targetId, new_status: newStatus };
    }

    case 'send_notification': {
      const title = interpolate(actionConfig.title as string || 'Notificación', triggerData);
      const message = interpolate(actionConfig.message as string || '', triggerData);
      return {
        type: 'notification',
        title,
        message,
        channel: actionConfig.channel || 'in-app',
        target_module: actionModule,
        sent_at: new Date().toISOString(),
      };
    }

    case 'invoke_ai': {
      // Delegate to AI via Lovable gateway
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      const prompt = interpolate(actionConfig.prompt as string || 'Analiza este evento', triggerData);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: `Eres un analista de RRHH enterprise. Módulo: ${actionModule}. Responde en JSON.` },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '';

      let parsed;
      try {
        const match = content.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { raw: content };
      } catch {
        parsed = { raw: content };
      }

      return { type: 'ai_invocation', module: actionModule, result: parsed };
    }

    default:
      throw new Error(`Unknown action_type: ${actionType}`);
  }
}

// ── Template Interpolation ──
function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? `{{${key}}}`));
}
