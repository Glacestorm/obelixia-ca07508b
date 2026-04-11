/**
 * compliance-ia — Compliance IA Agent
 * G1.1: Auth hardened with validateTenantAccess + mock data removed
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError } from '../_shared/error-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceRequest {
  action: 'run_check' | 'get_summary' | 'get_alerts' | 'analyze_document' | 'generate_remediation' | 'update_check' |
          'check_compliance' | 'generate_report' | 'assess_risk' | 'get_recommendations' | 'monitor_changes';
  company_id?: string;
  regulation?: string;
  documentContent?: string;
  checkIds?: string[];
  checkId?: string;
  status?: string;
  evidence?: string;
  context?: {
    regulations?: string[];
    industry?: string;
    jurisdiction?: string;
    documentContent?: string;
    processDescription?: string;
  };
  entityId?: string;
  entityType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json() as ComplianceRequest;
    const { action, company_id } = requestBody;
    console.log(`[compliance-ia] Processing action: ${action}`);

    // --- G1.1: AUTH GATE ---
    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'company_id is required' }, meta: { timestamp: new Date().toISOString() } }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) return mapAuthError(authResult, corsHeaders);
    // --- END AUTH GATE ---

    // G1.1: Replaced mock data with honest degradation
    switch (action) {
      case 'get_summary':
        return new Response(JSON.stringify({
          success: true,
          summary: [],
          source: 'no_data_available',
          mode: 'requires_configuration',
          message: 'No hay datos de cumplimiento configurados. Configure regulaciones y controles en el módulo de compliance para obtener un resumen real.',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_alerts':
        return new Response(JSON.stringify({
          success: true,
          alerts: [],
          source: 'no_data_available',
          mode: 'requires_configuration',
          message: 'No hay alertas de cumplimiento configuradas. Configure regulaciones aplicables para recibir alertas automáticas.',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'run_check':
        // Route to AI analysis instead of returning mock report
        break;

      case 'update_check':
        return new Response(JSON.stringify({
          success: true,
          checkId: requestBody.checkId,
          status: requestBody.status,
          source: 'stub',
          mode: 'requires_configuration',
          message: 'Actualización registrada. La persistencia real requiere configuración del módulo de compliance.',
          updated_at: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'generate_remediation':
        return new Response(JSON.stringify({
          success: true,
          plan: null,
          source: 'estimated',
          mode: 'requires_configuration',
          message: 'La generación de planes de remediación requiere datos reales de controles y hallazgos configurados.',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // For AI-powered actions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';
    const { context, entityId, entityType, documentContent, regulation } = requestBody;

    switch (action) {
      case 'run_check':
        systemPrompt = `Eres un experto en cumplimiento normativo empresarial.

EVALÚA el cumplimiento contra la regulación especificada.
IMPORTANTE: Tus resultados son estimaciones basadas en IA, no datos verificados del sistema.

RESPONDE EN JSON ESTRICTO:
{
  "report": {
    "id": "report_generated",
    "regulation": "${regulation || 'General'}",
    "overall_score": 0-100,
    "source": "ai_estimated",
    "checks": [
      { "id": "chk-1", "regulation": "string", "requirement": "string", "status": "compliant|partial|non_compliant", "evidence": "Requiere verificación manual", "last_checked": "ISO date", "next_review": "ISO date", "risk_level": "high|medium|low" }
    ],
    "gaps": [
      { "requirement": "string", "recommendation": "string" }
    ],
    "generated_at": "ISO date"
  }
}`;
        userPrompt = `Evalúa cumplimiento para regulación: ${regulation || 'General'}. Contexto de empresa: ${company_id}`;
        break;

      case 'analyze_document':
        systemPrompt = `Eres un experto en análisis de cumplimiento normativo.

ANALIZA el documento contra la regulación especificada.

RESPONDE EN JSON ESTRICTO:
{
  "findings": [
    { "issue": "string", "severity": "critical" | "high" | "medium" | "low", "recommendation": "string" }
  ],
  "score": 0-100
}`;
        userPrompt = `Analiza este documento para cumplimiento de ${regulation}:
${documentContent?.substring(0, 2000)}`;
        break;

      case 'check_compliance':
        systemPrompt = `Eres un experto en cumplimiento normativo empresarial.

EVALÚA el cumplimiento contra las regulaciones especificadas.

RESPONDE EN JSON ESTRICTO:
{
  "overallStatus": "compliant" | "partial" | "non_compliant",
  "score": 0-100,
  "checkResults": [
    {
      "regulation": "string",
      "requirement": "string",
      "status": "pass" | "fail" | "warning",
      "details": "string",
      "remediation": "string"
    }
  ],
  "criticalIssues": [],
  "upcomingDeadlines": [{ "date": "string", "requirement": "string" }]
}`;
        userPrompt = `Verifica cumplimiento para:
Regulaciones: ${context?.regulations?.join(', ')}
Industria: ${context?.industry}
Jurisdicción: ${context?.jurisdiction}
Proceso/Documento: ${context?.processDescription || context?.documentContent}`;
        break;

      case 'generate_report':
        systemPrompt = `Eres un generador de informes de cumplimiento normativo.

GENERA un informe completo de cumplimiento.

RESPONDE EN JSON ESTRICTO:
{
  "reportSummary": "string",
  "executiveSummary": "string",
  "complianceMetrics": {
    "overallScore": 0-100,
    "byRegulation": [{ "name": "string", "score": 0-100, "trend": "string" }]
  },
  "findings": [{ "severity": "string", "finding": "string", "recommendation": "string" }],
  "actionItems": [{ "priority": 1, "item": "string", "deadline": "string", "owner": "string" }],
  "historicalTrend": "string"
}`;
        userPrompt = `Genera informe de cumplimiento para entidad ${entityType}: ${entityId}`;
        break;

      case 'assess_risk':
        systemPrompt = `Eres un evaluador de riesgos de cumplimiento.

RESPONDE EN JSON ESTRICTO:
{
  "riskLevel": "critical" | "high" | "medium" | "low",
  "riskScore": 0-100,
  "riskFactors": [{ "factor": "string", "impact": "string", "likelihood": "string", "mitigation": "string" }],
  "potentialPenalties": [],
  "mitigationPlan": [],
  "monitoringRecommendations": []
}`;
        userPrompt = `Evalúa riesgos de cumplimiento para: ${context?.processDescription}
Regulaciones aplicables: ${context?.regulations?.join(', ')}`;
        break;

      case 'get_recommendations':
        systemPrompt = `Eres un asesor de mejoras en cumplimiento normativo.

RESPONDE EN JSON ESTRICTO:
{
  "priorityRecommendations": [{ "title": "string", "description": "string", "impact": "string", "effort": "string", "deadline": "string" }],
  "quickWins": [],
  "longTermInitiatives": [],
  "trainingNeeds": [],
  "toolsRequired": []
}`;
        userPrompt = `Recomienda mejoras de cumplimiento para industria ${context?.industry}`;
        break;

      case 'monitor_changes':
        systemPrompt = `Eres un monitor de cambios regulatorios.

RESPONDE EN JSON ESTRICTO:
{
  "recentChanges": [{ "regulation": "string", "change": "string", "effectiveDate": "string", "impact": "string" }],
  "upcomingChanges": [{ "regulation": "string", "expectedChange": "string", "timeline": "string" }],
  "actionRequired": [],
  "impactAssessment": "string"
}`;
        userPrompt = `Monitorea cambios regulatorios para: ${context?.regulations?.join(', ')} en ${context?.jurisdiction}`;
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
        temperature: 0.5,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[compliance-ia] Success: ${action}`);

    const responseData: Record<string, unknown> = { success: true, action, timestamp: new Date().toISOString() };
    
    if (action === 'analyze_document') {
      responseData.analysis = result;
    } else if (action === 'run_check') {
      responseData.report = result?.report || result;
      responseData.source = 'ai_estimated';
    } else {
      responseData.data = result;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[compliance-ia] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
