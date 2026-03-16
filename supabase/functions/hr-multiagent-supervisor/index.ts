/**
 * HR Multiagent Supervisor - Phase 1B
 * 
 * Routes HR queries to specialized agents:
 * - HR-Ops: payroll, contracts, leave, admin
 * - HR-Compliance: labor compliance, audits, risks
 * - HR-Talent: recruitment, onboarding, offboarding, performance, training, succession
 * - HR-Analytics: people analytics, anomalies, predictions, workforce metrics
 * - Legal escalation: dismissals, protected leave, legal risk
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CLASSIFIER_SYSTEM_PROMPT = `Eres un clasificador experto de consultas de Recursos Humanos. Tu trabajo es determinar a qué agente especializado debe dirigirse cada consulta.

CATEGORÍAS:
- ops: Nóminas, contratos laborales, vacaciones, permisos, fichajes, expediente del empleado, Seguridad Social, administración laboral, altas/bajas, datos personales, organigrama, jornada laboral.
- compliance: Vencimientos documentales, alertas legales laborales, documentación obligatoria, sanciones, auditoría laboral, inspección de trabajo, prevención de riesgos, igualdad, protección de datos RRHH.
- talent: Reclutamiento, selección, onboarding, offboarding, desempeño, evaluación, formación, planes de desarrollo, sucesión, skills matrix, marketplace interno de talento, planes de carrera.
- analytics: People analytics, métricas de plantilla, anomalías, predicciones de rotación, absentismo, headcount forecasting, dashboards RRHH, KPIs, benchmarking, insights de workforce.
- legal_escalation: Despidos (disciplinario, objetivo, colectivo), riesgos legales graves, permisos protegidos (maternidad, paternidad, lactancia), reducción de jornada con implicaciones legales, movilidad internacional, ERE/ERTE, validación jurídica de decisiones, acoso laboral, demandas laborales.

REGLAS:
- Si la consulta mezcla operativo + compliance, elige la más relevante.
- Si hay cualquier riesgo legal significativo, elige legal_escalation.
- Reclutamiento, formación, desempeño, onboarding, offboarding → talent.
- Métricas, estadísticas, predicciones, anomalías, analytics → analytics.
- En caso de duda entre ops y otro, elige ops.
- Responde SOLO con JSON válido.

FORMATO DE RESPUESTA (JSON estricto):
{"domain": "ops|compliance|talent|analytics|legal_escalation", "confidence": 0.0-1.0, "reasoning": "explicación breve"}`;

interface SupervisorRequest {
  action: 'route_query' | 'get_status' | 'get_registry';
  company_id: string;
  query?: string;
  context?: Record<string, unknown>;
  session_id?: string;
}

// Agent routing configuration
const AGENT_ROUTES: Record<string, { code: string; fn: string; action: string }> = {
  ops: { code: 'hr-ops', fn: 'erp-hr-ai-agent', action: 'chat' },
  compliance: { code: 'hr-compliance', fn: 'erp-hr-compliance-monitor', action: 'analyze' },
  talent: { code: 'hr-talent', fn: 'erp-hr-talent-intelligence', action: 'analyze' },
  analytics: { code: 'hr-analytics', fn: 'erp-hr-analytics-agent', action: 'analyze' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const input: SupervisorRequest = await req.json();
    const { action, company_id, query, context, session_id } = input;

    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === GET REGISTRY ===
    if (action === 'get_registry') {
      const { data: agents } = await supabase
        .from('erp_ai_agents_registry')
        .select('*')
        .order('module_domain', { ascending: true });
      
      return new Response(JSON.stringify({ success: true, data: agents }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === GET STATUS ===
    if (action === 'get_status') {
      const { data: recentInvocations } = await supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: agents } = await supabase
        .from('erp_ai_agents_registry')
        .select('*')
        .in('module_domain', ['hr', 'legal', 'cross']);

      return new Response(JSON.stringify({
        success: true,
        data: {
          agents,
          recent_invocations: recentInvocations || [],
          supervisor_status: 'active',
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === ROUTE QUERY ===
    if (action === 'route_query') {
      if (!query) {
        return new Response(JSON.stringify({ success: false, error: 'query required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      // Step 1: Classify query with IA
      console.log(`[hr-multiagent-supervisor] Classifying query: ${query.substring(0, 80)}...`);
      
      const classifierResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
            { role: 'user', content: query }
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });

      if (!classifierResponse.ok) {
        if (classifierResponse.status === 429) {
          return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Intenta más tarde.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (classifierResponse.status === 402) {
          return new Response(JSON.stringify({ success: false, error: 'Créditos IA insuficientes.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        throw new Error(`Classifier API error: ${classifierResponse.status}`);
      }

      const classifierData = await classifierResponse.json();
      const classifierContent = classifierData.choices?.[0]?.message?.content || '';

      // Parse classification
      let classification = { domain: 'ops', confidence: 0.5, reasoning: 'Fallback to ops' };
      try {
        const jsonMatch = classifierContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          classification = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.warn('[hr-multiagent-supervisor] Failed to parse classifier response, defaulting to ops');
      }

      // Apply confidence threshold — if < 0.5, default to ops
      if (classification.confidence < 0.5) {
        classification.domain = 'ops';
        classification.reasoning = `Low confidence (${classification.confidence}), defaulting to ops. Original: ${classification.reasoning}`;
      }

      console.log(`[hr-multiagent-supervisor] Classification: ${classification.domain} (${classification.confidence}) - ${classification.reasoning}`);

      // Step 2: Route to appropriate agent
      let agentResponse: any = null;
      let agentCode = 'hr-ops';
      let escalatedTo: string | null = null;
      let escalationReason: string | null = null;
      let outcomeStatus = 'success';

      const agentFunctionUrl = `${supabaseUrl}/functions/v1`;

      if (classification.domain === 'legal_escalation') {
        // Legal escalation path
        agentCode = 'hr-ops';
        escalatedTo = 'legal-supervisor';
        escalationReason = classification.reasoning;
        outcomeStatus = 'escalated';

        try {
          const resp = await fetch(`${agentFunctionUrl}/legal-multiagent-supervisor`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'validate_hr_action',
              company_id,
              query,
              context: { ...context, source_agent: 'hr-supervisor', escalation_reason: classification.reasoning },
              source_agent: 'hr-supervisor',
            }),
          });
          agentResponse = await resp.json();
          
          if (agentResponse?.success) {
            outcomeStatus = 'escalated';
          }
        } catch (err) {
          console.error('[hr-multiagent-supervisor] Legal escalation error:', err);
          outcomeStatus = 'failed';
          agentResponse = { success: false, error: 'Legal supervisor unavailable' };
        }
      } else {
        // Route to HR specialist agent
        const route = AGENT_ROUTES[classification.domain] || AGENT_ROUTES.ops;
        agentCode = route.code;

        try {
          const body: Record<string, unknown> = {
            action: route.action,
            company_id,
            context: context || {},
          };
          
          // Different agents expect different payload shapes
          if (route.action === 'chat') {
            body.message = query;
          } else {
            body.query = query;
          }

          const resp = await fetch(`${agentFunctionUrl}/${route.fn}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          agentResponse = await resp.json();
        } catch (err) {
          console.error(`[hr-multiagent-supervisor] ${agentCode} agent error:`, err);
          outcomeStatus = 'failed';
          agentResponse = { success: false, error: `${agentCode} agent unavailable` };
        }
      }

      const executionTime = Date.now() - startTime;

      // Step 3: Log invocation
      try {
        await supabase.from('erp_ai_agent_invocations').insert({
          agent_code: agentCode,
          supervisor_code: 'hr-supervisor',
          company_id,
          user_id: userId,
          input_summary: query.substring(0, 500),
          routing_reason: classification.reasoning,
          confidence_score: classification.confidence,
          escalated_to: escalatedTo,
          escalation_reason: escalationReason,
          outcome_status: outcomeStatus,
          execution_time_ms: executionTime,
          response_summary: JSON.stringify(agentResponse)?.substring(0, 1000),
          metadata: {
            session_id,
            classification,
            agent_code: agentCode,
            phase: '1B',
          },
        });
      } catch (logErr) {
        console.error('[hr-multiagent-supervisor] Logging error:', logErr);
      }

      // Step 4: Compose response
      return new Response(JSON.stringify({
        success: true,
        data: {
          response: agentResponse,
          routing: {
            domain: classification.domain,
            agent_code: agentCode,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            escalated_to: escalatedTo,
            escalation_reason: escalationReason,
          },
          execution_time_ms: executionTime,
          outcome_status: outcomeStatus,
          timestamp: new Date().toISOString(),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[hr-multiagent-supervisor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
