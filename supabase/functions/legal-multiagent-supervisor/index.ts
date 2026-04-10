/**
 * Legal Multiagent Supervisor - Phase 1B
 * 
 * Routes legal queries to specialized agents:
 * - Legal-Labor: labor law, dismissals, protected leave
 * - Legal-Compliance: regulatory compliance, risk, data protection, audits
 * - Legal-Contracts: CLM, smart contracts, contract review, negotiation
 * Validates HR actions via escalation protocol
 *
 * Auth: validateTenantAccess(req, company_id) — S7.3
 * Chaining: forwards user JWT to downstream agents (no SERVICE_ROLE_KEY)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateTenantAccess, isAuthError } from "../_shared/tenant-auth.ts";
import { successResponse, mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LEGAL_CLASSIFIER_PROMPT = `Eres un clasificador de consultas jurídicas. Determina a qué agente legal especializado dirigir cada consulta.

CATEGORÍAS:
- labor: Derecho laboral, contratos de trabajo, despidos, permisos protegidos, ERE/ERTE, movilidad, acoso, demandas laborales, Seguridad Social, convenios colectivos.
- compliance: Compliance regulatorio, GDPR/LOPDGDD, protección de datos, riesgo legal, auditoría legal, inspecciones, sanciones, alertas normativas, validación de cumplimiento, ESG legal.
- contracts: CLM, contratos mercantiles, revisión contractual, negociación, plantillas, cláusulas, smart contracts, lifecycle contractual, NDA, SLA, acuerdos de nivel de servicio.

REGLAS:
- Contratos de TRABAJO (laborales) → labor.
- Contratos mercantiles, proveedores, clientes → contracts.
- Cumplimiento, normativa, GDPR, auditoría → compliance.
- En caso de duda → labor (por seguridad).
- Responde SOLO con JSON válido.

FORMATO DE RESPUESTA (JSON estricto):
{"domain": "labor|compliance|contracts", "confidence": 0.0-1.0, "reasoning": "explicación breve"}`;

interface LegalSupervisorRequest {
  action: 'route_query' | 'validate_hr_action' | 'get_status';
  company_id: string;
  query?: string;
  context?: Record<string, unknown>;
  source_agent?: string;
}

const LEGAL_ROUTES: Record<string, { code: string; fn: string; action: string }> = {
  labor: { code: 'legal-labor', fn: 'legal-ai-advisor', action: 'advise' },
  compliance: { code: 'legal-compliance', fn: 'legal-validation-gateway-enhanced', action: 'validate_operation' },
  contracts: { code: 'legal-contracts', fn: 'advanced-clm-engine', action: 'analyze' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Capture original Authorization header for downstream forwarding
    const originalAuthHeader = req.headers.get('Authorization');

    const input: LegalSupervisorRequest = await req.json();
    const { action, company_id, query, context, source_agent } = input;

    if (!company_id) return validationError('company_id required', corsHeaders);
    if (!action) return validationError('action required', corsHeaders);

    // Auth: validateTenantAccess — JWT + membership check
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) return mapAuthError(authResult, corsHeaders);
    const { userId, userClient } = authResult;

    const agentFunctionUrl = `${supabaseUrl}/functions/v1`;

    // === GET STATUS ===
    if (action === 'get_status') {
      const { data: recentInvocations } = await userClient
        .from('erp_ai_agent_invocations')
        .select('*')
        .eq('company_id', company_id)
        .in('supervisor_code', ['legal-supervisor'])
        .order('created_at', { ascending: false })
        .limit(20);

      return successResponse({
        supervisor_status: 'active',
        recent_invocations: recentInvocations || [],
        escalations_from_hr: (recentInvocations || []).filter(
          (inv: any) => inv.metadata?.source_agent === 'hr-supervisor'
        ).length,
        timestamp: new Date().toISOString()
      }, corsHeaders);
    }

    // === ROUTE QUERY (direct legal query) ===
    if (action === 'route_query') {
      if (!query) return validationError('query required', corsHeaders);

      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      console.log(`[legal-multiagent-supervisor] Classifying legal query: ${query.substring(0, 80)}...`);

      const classifierResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: LEGAL_CLASSIFIER_PROMPT },
            { role: 'user', content: query }
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });

      if (!classifierResponse.ok) {
        if (classifierResponse.status === 429) {
          return errorResponse('RATE_LIMITED', 'Rate limit exceeded', 429, corsHeaders);
        }
        if (classifierResponse.status === 402) {
          return errorResponse('PAYMENT_REQUIRED', 'Créditos IA insuficientes', 402, corsHeaders);
        }
        throw new Error(`Classifier API error: ${classifierResponse.status}`);
      }

      const classifierData = await classifierResponse.json();
      const classifierContent = classifierData.choices?.[0]?.message?.content || '';

      let classification = { domain: 'labor', confidence: 0.5, reasoning: 'Fallback to labor' };
      try {
        const jsonMatch = classifierContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) classification = JSON.parse(jsonMatch[0]);
      } catch {
        console.warn('[legal-multiagent-supervisor] Parse error, defaulting to labor');
      }

      if (classification.confidence < 0.5) {
        classification.domain = 'labor';
        classification.reasoning = `Low confidence (${classification.confidence}), defaulting to labor.`;
      }

      console.log(`[legal-multiagent-supervisor] Classification: ${classification.domain} (${classification.confidence})`);

      // Route to agent — forward user JWT, not SERVICE_ROLE_KEY
      const route = LEGAL_ROUTES[classification.domain] || LEGAL_ROUTES.labor;
      let agentResponse: any = null;
      let outcomeStatus = 'success';

      try {
        const body: Record<string, unknown> = { company_id, context: { ...context, routed_by: 'legal-supervisor' } };
        
        if (route.action === 'advise') {
          body.action = 'advise';
          body.query = query;
          body.legal_area = 'labor';
        } else if (route.action === 'validate_operation') {
          body.action = 'validate_operation';
          body.operation_type = 'legal_query';
          body.operation_data = { query, ...context };
        } else {
          body.action = route.action;
          body.query = query;
        }

        const resp = await fetch(`${agentFunctionUrl}/${route.fn}`, {
          method: 'POST',
          headers: {
            'Authorization': originalAuthHeader || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        agentResponse = await resp.json();
      } catch (err) {
        console.error(`[legal-multiagent-supervisor] ${route.code} error:`, err);
        outcomeStatus = 'failed';
        agentResponse = { success: false, error: `${route.code} unavailable` };
      }

      const executionTime = Date.now() - startTime;

      // Log invocation via userClient
      try {
        await userClient.from('erp_ai_agent_invocations').insert({
          agent_code: route.code,
          supervisor_code: 'legal-supervisor',
          company_id,
          user_id: userId,
          input_summary: query.substring(0, 500),
          routing_reason: classification.reasoning,
          confidence_score: classification.confidence,
          outcome_status: outcomeStatus,
          execution_time_ms: executionTime,
          response_summary: JSON.stringify(agentResponse)?.substring(0, 1000),
          metadata: { source_agent, classification, phase: '1B' },
        });
      } catch (logErr) {
        console.error('[legal-multiagent-supervisor] Logging error:', logErr);
      }

      return successResponse({
        response: agentResponse,
        routing: {
          domain: classification.domain,
          agent_code: route.code,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        },
        execution_time_ms: executionTime,
        outcome_status: outcomeStatus,
        timestamp: new Date().toISOString(),
      }, corsHeaders);
    }

    // === VALIDATE HR ACTION (escalation from HR-Supervisor) ===
    if (action === 'validate_hr_action') {
      if (!query) return validationError('query required for validation', corsHeaders);

      console.log(`[legal-multiagent-supervisor] Validating HR action via gateway: ${query.substring(0, 80)}...`);

      let validationResponse: any = null;
      let advisorResponse: any = null;
      let outcomeStatus = 'success';

      // Step 1: Get legal validation via gateway — forward user JWT
      try {
        const resp = await fetch(`${agentFunctionUrl}/legal-validation-gateway-enhanced`, {
          method: 'POST',
          headers: {
            'Authorization': originalAuthHeader || '',
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

      // Step 2: Get legal advisory opinion — forward user JWT
      try {
        const resp = await fetch(`${agentFunctionUrl}/legal-ai-advisor`, {
          method: 'POST',
          headers: {
            'Authorization': originalAuthHeader || '',
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

      // Log invocation via userClient
      try {
        await userClient.from('erp_ai_agent_invocations').insert({
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
            phase: '1B',
          },
        });
      } catch (logErr) {
        console.error('[legal-multiagent-supervisor] Logging error:', logErr);
      }

      return successResponse({
        ...combinedResult,
        execution_time_ms: executionTime,
        outcome_status: outcomeStatus,
        timestamp: new Date().toISOString(),
      }, corsHeaders);
    }

    return validationError(`Unknown action: ${action}`, corsHeaders);

  } catch (error) {
    console.error('[legal-multiagent-supervisor] Error:', error);
    return internalError(corsHeaders);
  }
});
