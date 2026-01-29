import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PipelineContext {
  opportunities?: Array<{
    id: string;
    title: string;
    stage_id: string;
    stage_name?: string;
    estimated_value?: number;
    probability?: number;
    created_at: string;
    updated_at: string;
    expected_close_date?: string;
    owner_name?: string;
    company_name?: string;
    days_in_stage?: number;
    last_activity_date?: string;
  }>;
  stages?: Array<{
    id: string;
    name: string;
    slug: string;
    probability?: number;
    order_position: number;
    is_terminal: boolean;
    terminal_type?: string;
  }>;
  activities?: Array<{
    opportunity_id: string;
    type: string;
    created_at: string;
  }>;
  totalValue?: number;
  wonValue?: number;
  lostCount?: number;
}

interface AgentRequest {
  action: 'analyze_pipeline' | 'predict_close' | 'suggest_actions' | 'forecast' | 'detect_risks' | 'coach' | 'full_analysis';
  context: PipelineContext;
  opportunity_id?: string;
  period?: 'weekly' | 'monthly' | 'quarterly';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, context, opportunity_id, period = 'monthly' } = await req.json() as AgentRequest;

    console.log(`[pipeline-ai-agent] Processing action: ${action}`);

    // Build dynamic prompt based on action
    let systemPrompt = '';
    let userPrompt = '';

    const baseContext = `
CONTEXTO DEL PIPELINE:
- Total de oportunidades: ${context.opportunities?.length || 0}
- Valor total pipeline: €${context.totalValue?.toLocaleString() || 0}
- Valor ganado: €${context.wonValue?.toLocaleString() || 0}
- Etapas configuradas: ${context.stages?.map(s => s.name).join(', ') || 'N/A'}

OPORTUNIDADES ACTUALES:
${context.opportunities?.slice(0, 20).map(o => 
  `- ${o.title} | ${o.stage_name || 'Sin etapa'} | €${o.estimated_value?.toLocaleString() || 0} | ${o.probability || 0}% | ${o.days_in_stage || 0} días en etapa | Última actividad: ${o.last_activity_date || 'N/A'}`
).join('\n') || 'Sin oportunidades'}
`;

    switch (action) {
      case 'analyze_pipeline':
        systemPrompt = `Eres un experto analista de ventas B2B con 20 años de experiencia en gestión de pipelines.
Tu rol es analizar el estado actual del pipeline y proporcionar insights accionables.

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": "Resumen ejecutivo en 2-3 oraciones",
  "health_score": 0-100,
  "health_status": "healthy" | "warning" | "critical",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "bottlenecks": [{"stage": "nombre", "issue": "descripción", "impact": "alto|medio|bajo"}],
  "opportunities_at_risk": ["id1", "id2"],
  "quick_wins": [{"opportunity_id": "id", "action": "descripción", "potential_value": 0}],
  "forecast": {"optimistic": 0, "realistic": 0, "conservative": 0}
}`;
        userPrompt = `Analiza este pipeline de ventas y proporciona insights:\n${baseContext}`;
        break;

      case 'predict_close':
        const targetOpp = context.opportunities?.find(o => o.id === opportunity_id);
        systemPrompt = `Eres un sistema predictivo de ventas basado en IA.
Calcula la probabilidad real de cierre considerando múltiples factores más allá de la etapa.

FACTORES A CONSIDERAR:
- Tiempo en etapa actual vs promedio
- Frecuencia de actividad reciente
- Valor del deal vs ticket promedio
- Fecha de cierre esperada vs actual
- Historial de movimientos

FORMATO DE RESPUESTA (JSON estricto):
{
  "opportunity_id": "id",
  "predicted_probability": 0-100,
  "confidence": 0-100,
  "factors": [
    {"name": "factor", "impact": -20 a +20, "description": "explicación"}
  ],
  "predicted_close_date": "YYYY-MM-DD",
  "risk_level": "low" | "medium" | "high",
  "recommendation": "acción sugerida"
}`;
        userPrompt = targetOpp 
          ? `Predice la probabilidad de cierre para:\n${JSON.stringify(targetOpp, null, 2)}\n\n${baseContext}`
          : `No se encontró la oportunidad con ID: ${opportunity_id}`;
        break;

      case 'suggest_actions':
        systemPrompt = `Eres un coach de ventas experto que sugiere las Next Best Actions (NBA) para cada oportunidad.
Prioriza acciones que maximicen conversión y valor.

FORMATO DE RESPUESTA (JSON estricto):
{
  "next_best_actions": [
    {
      "opportunity_id": "id",
      "opportunity_title": "nombre",
      "action_type": "call" | "email" | "meeting" | "proposal" | "follow_up" | "escalate",
      "priority": "urgent" | "high" | "medium" | "low",
      "description": "qué hacer exactamente",
      "reason": "por qué esta acción",
      "expected_impact": "resultado esperado",
      "deadline": "cuándo hacerlo"
    }
  ],
  "daily_focus": [{"action": "descripción", "opportunity_id": "id"}],
  "weekly_goals": ["meta 1", "meta 2", "meta 3"]
}`;
        userPrompt = `Sugiere las mejores acciones para avanzar este pipeline:\n${baseContext}`;
        break;

      case 'forecast':
        systemPrompt = `Eres un sistema de forecasting de ventas con IA.
Genera proyecciones de ingresos basadas en datos históricos y estado actual.

FORMATO DE RESPUESTA (JSON estricto):
{
  "period": "${period}",
  "forecast": {
    "commit": {"value": 0, "deals": 0, "probability": ">90%"},
    "best_case": {"value": 0, "deals": 0, "probability": "50-90%"},
    "pipeline": {"value": 0, "deals": 0, "probability": "<50%"}
  },
  "total_weighted": 0,
  "vs_target": {"target": 0, "gap": 0, "gap_percentage": 0},
  "risk_factors": ["factor 1", "factor 2"],
  "upside_opportunities": [{"opportunity_id": "id", "potential": 0, "action": "descripción"}],
  "confidence_interval": {"low": 0, "high": 0}
}`;
        userPrompt = `Genera forecast ${period} para este pipeline:\n${baseContext}`;
        break;

      case 'detect_risks':
        systemPrompt = `Eres un sistema de detección temprana de riesgos en ventas.
Identifica oportunidades en peligro antes de que se pierdan.

SEÑALES DE RIESGO:
- Más de 7 días sin actividad
- Tiempo en etapa > 2x promedio
- Fecha de cierre vencida
- Sin siguiente paso definido
- Descenso en engagement

FORMATO DE RESPUESTA (JSON estricto):
{
  "at_risk_count": 0,
  "total_value_at_risk": 0,
  "risks": [
    {
      "opportunity_id": "id",
      "opportunity_title": "nombre",
      "risk_level": "critical" | "high" | "medium",
      "risk_score": 0-100,
      "signals": ["señal 1", "señal 2"],
      "days_stalled": 0,
      "recommended_action": "qué hacer",
      "save_probability": 0-100
    }
  ],
  "patterns": ["patrón de pérdida detectado"],
  "prevention_tips": ["consejo 1", "consejo 2"]
}`;
        userPrompt = `Detecta oportunidades en riesgo en este pipeline:\n${baseContext}`;
        break;

      case 'coach':
        const coachOpp = context.opportunities?.find(o => o.id === opportunity_id);
        systemPrompt = `Eres un coach de ventas senior con experiencia en enterprise B2B.
Proporciona coaching personalizado para cerrar esta oportunidad específica.

FORMATO DE RESPUESTA (JSON estricto):
{
  "opportunity_id": "id",
  "coaching_summary": "resumen del coaching",
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "challenges": ["desafío 1", "desafío 2"],
  "sales_strategy": {
    "approach": "descripción del approach recomendado",
    "key_messages": ["mensaje 1", "mensaje 2"],
    "objection_handling": [{"objection": "objeción", "response": "respuesta sugerida"}],
    "stakeholder_mapping": [{"role": "rol", "influence": "alta|media|baja", "approach": "cómo abordar"}]
  },
  "next_steps": [
    {"step": 1, "action": "descripción", "timeline": "cuándo", "expected_outcome": "resultado"}
  ],
  "closing_techniques": ["técnica 1", "técnica 2"],
  "red_flags": ["bandera roja a vigilar"],
  "win_probability_if_followed": 0-100
}`;
        userPrompt = coachOpp
          ? `Proporciona coaching para cerrar esta oportunidad:\n${JSON.stringify(coachOpp, null, 2)}\n\n${baseContext}`
          : `No se encontró la oportunidad con ID: ${opportunity_id}`;
        break;

      case 'full_analysis':
        systemPrompt = `Eres el Director de Revenue Operations con visión 360° del pipeline.
Proporciona un análisis completo ejecutivo.

FORMATO DE RESPUESTA (JSON estricto):
{
  "executive_summary": "resumen ejecutivo en 3-4 oraciones",
  "health_score": 0-100,
  "key_metrics": {
    "pipeline_velocity": 0,
    "average_deal_size": 0,
    "win_rate": 0,
    "sales_cycle_days": 0
  },
  "top_opportunities": [{"id": "id", "title": "nombre", "value": 0, "probability": 0, "next_action": "acción"}],
  "at_risk_summary": {"count": 0, "value": 0, "top_risk": "id"},
  "forecast_summary": {"commit": 0, "best_case": 0, "pipeline": 0},
  "recommendations": [
    {"priority": 1, "action": "descripción", "impact": "alto|medio|bajo", "effort": "alto|medio|bajo"}
  ],
  "quick_wins": [{"opportunity_id": "id", "action": "acción", "value": 0}],
  "weekly_focus_areas": ["área 1", "área 2", "área 3"]
}`;
        userPrompt = `Proporciona análisis completo del pipeline:\n${baseContext}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // Call Lovable AI
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
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta en unos segundos.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required', 
          message: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[pipeline-ai-agent] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[pipeline-ai-agent] JSON parse error:', parseError);
      result = { raw_content: content, parse_error: true };
    }

    console.log(`[pipeline-ai-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[pipeline-ai-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
