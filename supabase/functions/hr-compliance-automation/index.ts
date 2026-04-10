/**
 * Edge Function: hr-compliance-automation
 * AI-powered compliance checklist generation, auditing, and reporting.
 *
 * S6.3B: Migrated to validateTenantAccess + userClient. adminClient: 0.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

const RATE_LIMIT_CONFIG = {
  burstPerMinute: 5,
  perDay: 40,
  functionName: 'hr-compliance-automation',
};

interface ComplianceRequest {
  action: 'generate_checklist' | 'run_audit' | 'assess_risk' | 'generate_report';
  company_id: string;
  framework_id?: string;
  framework_code?: string;
  framework_name?: string;
  total_requirements?: number;
  frameworks?: any[];
  checklist_summary?: any;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ComplianceRequest = await req.json();
    const { action } = body;

    // S6.3B: Standard auth gate
    const authResult = await validateTenantAccess(req, body.company_id);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Rate limit check
    const identifier = body.company_id || 'anonymous';
    const burstResult = checkBurstLimit(identifier, RATE_LIMIT_CONFIG);
    if (!burstResult.allowed) {
      console.warn(`[hr-compliance-automation] Rate limited: ${identifier}`);
      return rateLimitResponse(burstResult, corsHeaders);
    }

    console.log(`[hr-compliance-automation] action=${action} remaining=${burstResult.remaining}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_checklist':
        systemPrompt = `Eres un experto en cumplimiento normativo laboral español y europeo.
Genera un checklist de requisitos para el marco normativo indicado.

FORMATO DE RESPUESTA (JSON estricto):
{
  "checklist": [
    {
      "code": "REQ-001",
      "title": "string",
      "description": "string",
      "category": "documentation" | "process" | "technical" | "training" | "organizational",
      "priority": "critical" | "high" | "medium" | "low",
      "evidence_required": boolean,
      "evidence_description": "string o null"
    }
  ]
}

Genera exactamente ${body.total_requirements || 10} requisitos relevantes, específicos y accionables.
Usa códigos como ${body.framework_code}-001, ${body.framework_code}-002, etc.`;

        userPrompt = `Genera el checklist de cumplimiento para: ${body.framework_name} (${body.framework_code}).
Jurisdicción aplicable. Los requisitos deben ser concretos, verificables y con evidencia cuando sea necesario.`;
        break;

      case 'run_audit':
        systemPrompt = `Eres un auditor experto en cumplimiento normativo laboral.
Analiza el estado de cumplimiento y genera hallazgos y recomendaciones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "audit": {
    "name": "string",
    "scope": ["string"],
    "overall_score": number (0-100),
    "risk_level": "low" | "medium" | "high" | "critical",
    "findings": [
      {
        "id": "F-001",
        "title": "string",
        "description": "string",
        "severity": "info" | "low" | "medium" | "high" | "critical",
        "regulation": "string",
        "remediation": "string",
        "deadline": "YYYY-MM-DD o null"
      }
    ],
    "recommendations": [
      {
        "title": "string",
        "description": "string",
        "priority": "high" | "medium" | "low",
        "estimated_effort": "string"
      }
    ]
  }
}`;

        userPrompt = `Ejecuta una auditoría de cumplimiento sobre estos marcos:
${JSON.stringify(body.frameworks)}

Estado actual del checklist: ${JSON.stringify(body.checklist_summary)}

Genera hallazgos realistas basados en los gaps detectados (items pendientes y vencidos).
Prioriza los hallazgos por severidad y proporciona remediaciones concretas.`;
        break;

      case 'generate_report':
        systemPrompt = `Eres un generador de informes regulatorios.
FORMATO DE RESPUESTA (JSON estricto):
{
  "report": {
    "title": "string",
    "executive_summary": "string",
    "sections": [{"title": "string", "content": "string"}],
    "conclusions": ["string"],
    "next_steps": ["string"]
  }
}`;
        userPrompt = `Genera un informe regulatorio completo basado en: ${JSON.stringify(body.frameworks)}`;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Acción no soportada: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`[hr-compliance-automation] Processing: ${action}`);

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
    } catch {
      result = { rawContent: content };
    }

    console.log(`[hr-compliance-automation] Success: ${action}`);

    return new Response(JSON.stringify({ success: true, action, ...result, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[hr-compliance-automation] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
