import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FunctionRequest {
  action: 'insights' | 'explain' | 'suggest' | 'copilot';
  companyId?: string;
  domain?: string;
  context?: Record<string, unknown>;
  anomalyData?: Record<string, unknown>;
  messages?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, companyId, domain, context, anomalyData, messages } = await req.json() as FunctionRequest;

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
Máximo 5 insights, ordenados por severidad.`;
        userPrompt = `Dominio: ${domain || 'hr'}\nContexto de métricas:\n${JSON.stringify(context || {}, null, 2)}`;
        break;

      case 'explain':
        systemPrompt = `Eres un experto en nóminas y RRHH. Explica anomalías o incidencias de forma clara y concisa para un gestor de RRHH.

RESPONDE en JSON estricto:
{
  "explanation": "string explicativo detallado",
  "probableCauses": ["causa 1", "causa 2"],
  "recommendedAction": "string con acción recomendada",
  "severity": "high" | "medium" | "low"
}`;
        userPrompt = `Datos de la anomalía:\n${JSON.stringify(anomalyData || {}, null, 2)}`;
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
Máximo 5 sugerencias.`;
        userPrompt = `Contexto de métricas:\n${JSON.stringify(context || {}, null, 2)}`;
        break;

      case 'copilot':
        streaming = true;
        systemPrompt = `Eres un copiloto de RRHH y Payroll con experiencia enterprise. Respondes preguntas sobre métricas, tendencias, anomalías y compliance.
Tienes acceso al contexto de métricas del sistema. Sé conciso, profesional y accionable.
Usa markdown para formatear tus respuestas. Incluye datos numéricos cuando sea relevante.
Si detectas un problema, sugiere crear una tarea de seguimiento.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-hr-people-analytics-ai] action=${action}, domain=${domain}`);

    if (streaming && messages) {
      // Streaming response for copilot
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
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
