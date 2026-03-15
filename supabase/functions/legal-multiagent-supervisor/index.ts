/**
 * Legal Multiagent Supervisor - Phase 1A
 * 
 * Backend supervisor for Legal module that:
 * 1. Routes queries to Legal-Labor (via legal-ai-advisor)
 * 2. Validates HR actions (via legal-validation-gateway-enhanced)
 * 3. Responds to escalations from HR-Supervisor
 * 4. Logs all invocations for traceability
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LegalSupervisorRequest {
  action: 'route_query' | 'validate_hr_action' | 'get_status';
  company_id: string;
  query?: string;
  context?: Record<string, unknown>;
  source_agent?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    const input: LegalSupervisorRequest = await req.json();
    const { action, company_id, query, context, source_agent } = input;

    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const agentFunctionUrl = `${supabaseUrl}/functions/v1`;

    // === GET STATUS ===
    if (action === 'get_status') {
      const { data: recentInvocations } = await supabase
        .from('erp_ai_agent_invocations')
        .select('*')
        .eq('company_id', company_id)
        .in('supervisor_code', ['legal-supervisor'])
        .order('created_at', { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({
        success: true,
        data: {
          supervisor_status: 'active',
          recent_invocations: recentInvocations || [],
          escalations_from_hr: (recentInvocations || []).filter(
            (inv: any) => inv.metadata?.source_agent === 'hr-supervisor'
          ).length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === ROUTE QUERY (direct legal query) ===
    if (action === 'route_query') {
      if (!query) {
        return new Response(JSON.stringify({ success: false, error: 'query required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[legal-multiagent-supervisor] Routing query to legal-ai-advisor (labor): ${query.substring(0, 80)}...`);

      let agentResponse: any = null;
      let outcomeStatus = 'success';

      try {
        const resp = await fetch(`${agentFunctionUrl}/legal-ai-advisor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'advise',
            company_id,
            query,
            legal_area: 'labor',
            context: { ...context, routed_by: 'legal-supervisor' },
          }),
        });
        agentResponse = await resp.json();
      } catch (err) {
        console.error('[legal-multiagent-supervisor] legal-ai-advisor error:', err);
        outcomeStatus = 'failed';
        agentResponse = { success: false, error: 'Legal advisor unavailable' };
      }

      const executionTime = Date.now() - startTime;

      // Log
      try {
        await supabase.from('erp_ai_agent_invocations').insert({
          agent_code: 'legal-labor',
          supervisor_code: 'legal-supervisor',
          company_id,
          user_id: userId,
          input_summary: query.substring(0, 500),
          routing_reason: 'Direct legal query routed to Legal-Labor',
          confidence_score: 0.90,
          outcome_status: outcomeStatus,
          execution_time_ms: executionTime,
          response_summary: JSON.stringify(agentResponse)?.substring(0, 1000),
          metadata: { source_agent, context_keys: Object.keys(context || {}) },
        });
      } catch (logErr) {
        console.error('[legal-multiagent-supervisor] Logging error:', logErr);
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          response: agentResponse,
          agent_code: 'legal-labor',
          execution_time_ms: executionTime,
          outcome_status: outcomeStatus,
          timestamp: new Date().toISOString(),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // === VALIDATE HR ACTION (escalation from HR-Supervisor) ===
    if (action === 'validate_hr_action') {
      if (!query) {
        return new Response(JSON.stringify({ success: false, error: 'query required for validation' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[legal-multiagent-supervisor] Validating HR action via gateway: ${query.substring(0, 80)}...`);

      let validationResponse: any = null;
      let advisorResponse: any = null;
      let outcomeStatus = 'success';

      // Step 1: Get legal validation via gateway
      try {
        const resp = await fetch(`${agentFunctionUrl}/legal-validation-gateway-enhanced`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'validate_operation',
            company_id,
            operation_type: 'hr_action',
            operation_data: { query, ...context },
          }),
        });
        validationResponse = await resp.json();
      } catch (err) {
        console.error('[legal-multiagent-supervisor] Validation gateway error:', err);
      }

      // Step 2: Get legal advisory opinion
      try {
        const resp = await fetch(`${agentFunctionUrl}/legal-ai-advisor`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'advise',
            company_id,
            query: `Validación jurídico-laboral: ${query}`,
            legal_area: 'labor',
            context: {
              ...context,
              routed_by: 'legal-supervisor',
              source: 'hr-escalation',
              escalation_reason: context?.escalation_reason,
            },
          }),
        });
        advisorResponse = await resp.json();
      } catch (err) {
        console.error('[legal-multiagent-supervisor] Legal advisor error:', err);
        outcomeStatus = 'failed';
      }

      const executionTime = Date.now() - startTime;

      // Compose combined result
      const riskLevel = validationResponse?.data?.risk_level || 
                        (advisorResponse?.data?.risk_level) || 'medium';
      const requiresHumanReview = riskLevel === 'high' || riskLevel === 'critical';

      const combinedResult = {
        validation: validationResponse?.data || null,
        advisory: advisorResponse?.data || null,
        risk_level: riskLevel,
        requires_human_review: requiresHumanReview,
        recommendations: [
          ...(validationResponse?.data?.recommendations || []),
          ...(advisorResponse?.data?.recommendations || []),
        ],
        legal_basis: advisorResponse?.data?.legal_basis || null,
      };

      if (requiresHumanReview) {
        outcomeStatus = 'human_review';
      }

      // Log
      try {
        await supabase.from('erp_ai_agent_invocations').insert({
          agent_code: 'legal-labor',
          supervisor_code: 'legal-supervisor',
          company_id,
          user_id: userId,
          input_summary: query.substring(0, 500),
          routing_reason: `HR escalation: ${context?.escalation_reason || 'risk detected'}`,
          confidence_score: 0.85,
          escalated_to: null,
          escalation_reason: null,
          outcome_status: outcomeStatus,
          execution_time_ms: executionTime,
          response_summary: JSON.stringify(combinedResult).substring(0, 1000),
          metadata: {
            source_agent: source_agent || 'hr-supervisor',
            risk_level: riskLevel,
            requires_human_review: requiresHumanReview,
            validation_available: !!validationResponse?.success,
            advisory_available: !!advisorResponse?.success,
          },
        });
      } catch (logErr) {
        console.error('[legal-multiagent-supervisor] Logging error:', logErr);
      }

      return new Response(JSON.stringify({
        success: true,
        data: combinedResult,
        execution_time_ms: executionTime,
        outcome_status: outcomeStatus,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[legal-multiagent-supervisor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
