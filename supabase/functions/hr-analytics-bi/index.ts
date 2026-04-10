import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

const RATE_LIMIT_CONFIG = {
  burstPerMinute: 5,
  perDay: 50,
  functionName: 'hr-analytics-bi',
};

interface BIRequest {
  action: 'generate_dashboard' | 'executive_report' | 'predictive_analysis';
  companyId: string;
  realMetrics?: Record<string, number>;
  currentDashboard?: Record<string, unknown>;
  focusArea?: string;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, companyId, realMetrics, currentDashboard, focusArea } = await req.json() as BIRequest;

    if (!companyId) {
      return validationError('companyId is required', corsHeaders);
    }

    // S6.3F: validateTenantAccess replaces manual getClaims + manual adminClient membership
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }

    // Rate limit check
    const burstResult = checkBurstLimit(companyId, RATE_LIMIT_CONFIG);
    if (!burstResult.allowed) {
      console.warn(`[hr-analytics-bi] Rate limited: company=${companyId}`);
      return rateLimitResponse(burstResult, corsHeaders);
    }

    console.log(`[hr-analytics-bi] action=${action} company=${companyId} remaining=${burstResult.remaining}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_dashboard':
        systemPrompt = `Eres un motor de Business Intelligence para HR Enterprise.
Recibes métricas REALES de 11 módulos Premium HR y debes generar un dashboard ejecutivo.

MÓDULOS: Security & SoD, AI Governance, Workforce Planning, Fairness Engine, Digital Twin,
Legal Engine, CNAE Intelligence, Role Experience, Orquestación, Compliance Automation, Analytics BI.

Usa los datos reales proporcionados para calcular scores y detectar patrones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "kpis": [
    {"id":"str","label":"str","value":number,"previousValue":number,"unit":"str","trend":"up|down|flat","trendPercent":number,"module":"str","severity":"success|warning|danger|info"}
  ],
  "trends": [
    {"id":"str","label":"str","module":"str","color":"hex","data":[{"date":"YYYY-MM","value":number}]}
  ],
  "moduleHealth": [
    {"module":"str","label":"str","score":0-100,"activeItems":number,"pendingItems":number,"alerts":number,"lastActivity":"ISO"}
  ],
  "insights": [
    {"id":"str","type":"correlation|anomaly|prediction|recommendation","title":"str","description":"str","confidence":0-100,"relatedModules":["str"],"severity":"info|warning|critical","actionable":true,"suggestedAction":"str"}
  ],
  "riskScore": 0-100,
  "complianceScore": 0-100,
  "fairnessScore": 0-100,
  "securityScore": 0-100,
  "overallHealth": 0-100
}

Genera al menos 8 KPIs, 4 series de tendencia (6 meses), health para cada módulo, y al menos 5 insights cruzados.`;

        userPrompt = `Métricas reales de la empresa:
${JSON.stringify(realMetrics, null, 2)}

Genera el dashboard BI Premium completo basándote en estos datos reales.`;
        break;

      case 'executive_report':
        systemPrompt = `Eres un generador de informes ejecutivos C-level para HR Enterprise.
Genera un informe ejecutivo profesional en español basado en datos reales.

FORMATO DE RESPUESTA (JSON estricto):
{
  "id": "uuid",
  "title": "Informe Ejecutivo HR Premium - [Mes Año]",
  "generatedAt": "ISO timestamp",
  "sections": [
    {"title":"str","content":"str (markdown)","type":"text|kpi|chart|table"}
  ]
}

Incluye: Resumen ejecutivo, KPIs principales, Análisis de riesgos, Cumplimiento normativo,
Estado de equidad, Recomendaciones estratégicas, y Plan de acción prioritario.`;

        userPrompt = `Datos reales: ${JSON.stringify(realMetrics)}
Dashboard actual: ${JSON.stringify(currentDashboard)}
Genera informe ejecutivo completo.`;
        break;

      case 'predictive_analysis':
        systemPrompt = `Eres un motor predictivo de HR Analytics.
Realiza análisis predictivo sobre un área focal específica del ecosistema HR Premium.

FORMATO DE RESPUESTA (JSON estricto):
[
  {"id":"str","type":"prediction|correlation|recommendation","title":"str","description":"str","confidence":0-100,"relatedModules":["str"],"severity":"info|warning|critical","actionable":true,"suggestedAction":"str"}
]

Genera al menos 5 predicciones/recomendaciones basadas en datos reales y tendencias.`;

        userPrompt = `Área focal: ${focusArea}
Dashboard actual: ${JSON.stringify(currentDashboard)}
Genera análisis predictivo detallado.`;
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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResp = await response.json();
    const content = aiResp.choices?.[0]?.message?.content;
    if (!content) throw new Error('No AI content');

    let result;
    try {
      const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON');
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[hr-analytics-bi] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[hr-analytics-bi] Error:', error);
    return internalError(corsHeaders);
  }
});
