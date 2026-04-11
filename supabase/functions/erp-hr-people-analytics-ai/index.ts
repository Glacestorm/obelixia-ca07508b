/**
 * erp-hr-people-analytics-ai - People Analytics AI
 * 
 * S6.3C: Migrated to validateTenantAccess + userClient
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface FunctionRequest {
  action: 'insights' | 'explain' | 'suggest' | 'copilot';
  companyId?: string;
  domain?: string;
  context?: Record<string, unknown>;
  anomalyData?: Record<string, unknown>;
  messages?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, companyId, domain, context, anomalyData, messages } = await req.json() as FunctionRequest;

    if (!companyId) {
      return validationError('companyId is required', corsHeaders);
    }

    // --- AUTH + TENANT VALIDATION (S6.3C) ---
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    // --- END AUTH + TENANT VALIDATION ---

    // --- VPT CONTEXT INJECTION (S9.8) ---
    let vptContextBlock = '';
    try {
      const { data: vptData } = await authResult.client
        .from('erp_hr_job_valuations')
        .select('position_id, total_score')
        .eq('company_id', companyId)
        .eq('status', 'approved');

      if (vptData && vptData.length > 0) {
        const { data: emps } = await authResult.client
          .from('erp_hr_employees')
          .select('id, gender, position_id')
          .eq('company_id', companyId)
          .eq('is_active', true);

        if (emps && emps.length > 0) {
          const vptMap: Record<string, number> = {};
          for (const v of vptData) {
            if (v.position_id && v.total_score != null) {
              vptMap[v.position_id] = v.total_score;
            }
          }

          const maleScores: number[] = [];
          const femaleScores: number[] = [];
          for (const e of emps) {
            if (e.position_id && vptMap[e.position_id] !== undefined) {
              if (e.gender === 'M') maleScores.push(vptMap[e.position_id]);
              else if (e.gender === 'F') femaleScores.push(vptMap[e.position_id]);
            }
          }

          const matched = maleScores.length + femaleScores.length;
          if (matched > 0) {
            const avgM = maleScores.length > 0 ? (maleScores.reduce((a, b) => a + b, 0) / maleScores.length).toFixed(1) : 'N/A';
            const avgF = femaleScores.length > 0 ? (femaleScores.reduce((a, b) => a + b, 0) / femaleScores.length).toFixed(1) : 'N/A';
            const diff = (maleScores.length > 0 && femaleScores.length > 0)
              ? (parseFloat(avgM as string) - parseFloat(avgF as string)).toFixed(1)
              : 'N/A';

            vptContextBlock = `\n\n=== CONTEXTO VPT (INFORMATIVO — NO JUSTIFICATIVO) ===\nPosiciones valoradas: ${vptData.length}\nEmpleados con match VPT: ${matched}\nScore medio VPT H: ${avgM}\nScore medio VPT M: ${avgF}\nDiferencia media VPT: ${diff}\nEste contexto es descriptivo y no debe usarse para afirmar que una brecha está justificada o explicada por VPT.\n=== FIN CONTEXTO VPT ===`;
          }
        }
      }
    } catch (vptErr) {
      console.warn('[erp-hr-people-analytics-ai] VPT context query failed, continuing without VPT:', vptErr);
    }
    // --- END VPT CONTEXT ---

    const vptGuardrail = '\nSi se incluyen datos de Valoración de Puestos de Trabajo (VPT), utilízalos como contexto descriptivo complementario. NUNCA afirmes que una brecha salarial está "justificada", "explicada completamente", "corregida" o "resuelta" por los scores VPT.';

    let systemPrompt = '';
    let userPrompt = '';
    let streaming = false;

    switch (action) {
      case 'insights':
        systemPrompt = `Eres un analista experto en People Analytics y RRHH empresarial.
Genera insights priorizados basados en las métricas proporcionadas.

RESPONDE SIEMPRE en JSON estricto con esta estructura:
{
  "insights": [
    {
      "id": "string",
      "domain": "hr" | "payroll" | "compliance" | "wellbeing" | "equity",
      "severity": "critical" | "high" | "medium" | "low",
      "title": "string corto",
      "description": "string explicativo",
      "suggestion": "acción recomendada",
      "taskCategory": "admin_request" | "payroll" | "compliance" | "document" | "general",
      "confidence": 0-100
    }
  ]
}
Máximo 5 insights, ordenados por severidad.` + vptGuardrail;
        userPrompt = `Dominio: ${domain || 'hr'}\nContexto de métricas:\n${JSON.stringify(context || {}, null, 2)}` + vptContextBlock;
        break;

      case 'explain':
        systemPrompt = `Eres un experto en nóminas y RRHH. Explica anomalías o incidencias de forma clara y concisa para un gestor de RRHH.

RESPONDE en JSON estricto:
{
  "explanation": "string explicativo detallado",
  "probableCauses": ["causa 1", "causa 2"],
  "recommendedAction": "string con acción recomendada",
  "severity": "high" | "medium" | "low"
}` + vptGuardrail;
        userPrompt = `Datos de la anomalía:\n${JSON.stringify(anomalyData || {}, null, 2)}` + vptContextBlock;
        break;

      case 'suggest':
        systemPrompt = `Eres un consultor de RRHH que proporciona sugerencias accionables basadas en métricas.
Cada sugerencia debe poder convertirse en una tarea del sistema.

RESPONDE en JSON estricto:
{
  "suggestions": [
    {
      "title": "string accionable",
      "description": "detalle de la acción",
      "priority": "high" | "medium" | "low",
      "taskCategory": "admin_request" | "payroll" | "compliance" | "document" | "general",
      "estimatedImpact": "string"
    }
  ]
}
Máximo 5 sugerencias.` + vptGuardrail;
        userPrompt = `Contexto de métricas:\n${JSON.stringify(context || {}, null, 2)}` + vptContextBlock;
        break;

      case 'copilot':
        streaming = true;
        systemPrompt = `Eres un copiloto de RRHH y Payroll con experiencia enterprise. Respondes preguntas sobre métricas, tendencias, anomalías y compliance.
Tienes acceso al contexto de métricas del sistema. Sé conciso, profesional y accionable.
Usa markdown para formatear tus respuestas. Incluye datos numéricos cuando sea relevante.
Si detectas un problema, sugiere crear una tarea de seguimiento.` + vptGuardrail;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);

    console.log(`[erp-hr-people-analytics-ai] action=${action}, domain=${domain}`);

    if (streaming && messages) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            ...(context ? [{ role: 'system', content: `Contexto de métricas actuales:\n${JSON.stringify(context)}` }] : []),
            ...(vptContextBlock ? [{ role: 'system', content: vptContextBlock }] : []),
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
        }
        if (response.status === 402) {
          return errorResponse('PAYMENT_REQUIRED', 'AI credits exhausted.', 402, corsHeaders);
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Non-streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse('PAYMENT_REQUIRED', 'AI credits exhausted.', 402, corsHeaders);
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

    return new Response(JSON.stringify({ success: true, action, data: result, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-people-analytics-ai] Error:', error);
    return internalError(corsHeaders);
  }
});
