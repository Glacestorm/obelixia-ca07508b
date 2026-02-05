import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketingRequest {
  action: 'analyze_campaign' | 'generate_subject_lines' | 'optimize_send_time' | 'predict_engagement' | 'segment_recommendations';
  campaign_id?: string;
  campaign_data?: Record<string, unknown>;
  audience_data?: Record<string, unknown>;
  historical_data?: Array<Record<string, unknown>>;
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

    const { action, campaign_id, campaign_data, audience_data, historical_data } = await req.json() as MarketingRequest;
    console.log(`[crm-marketing-automation] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_campaign':
        systemPrompt = `Eres un experto en marketing digital y análisis de campañas.
        
ANALIZA la campaña proporcionada y genera insights accionables.

FORMATO DE RESPUESTA (JSON estricto):
{
  "overall_score": 0-100,
  "strengths": ["punto fuerte 1", "punto fuerte 2"],
  "weaknesses": ["área mejora 1", "área mejora 2"],
  "recommendations": [
    {"priority": "high|medium|low", "action": "descripción", "expected_impact": "porcentaje o descripción"}
  ],
  "predicted_metrics": {
    "open_rate": 0-100,
    "click_rate": 0-100,
    "conversion_rate": 0-100
  }
}`;
        userPrompt = `Analiza esta campaña: ${JSON.stringify(campaign_data)}`;
        break;

      case 'generate_subject_lines':
        systemPrompt = `Eres un copywriter experto en email marketing con años de experiencia.
        
GENERA líneas de asunto optimizadas para maximizar apertura.

FORMATO DE RESPUESTA (JSON estricto):
{
  "subject_lines": [
    {"text": "asunto 1", "style": "urgency|curiosity|benefit|personal", "predicted_open_rate": 0-100},
    {"text": "asunto 2", "style": "...", "predicted_open_rate": 0-100}
  ],
  "best_practices_applied": ["práctica 1", "práctica 2"],
  "a_b_test_recommendation": {
    "variant_a": "asunto A",
    "variant_b": "asunto B",
    "hypothesis": "qué estamos probando"
  }
}`;
        userPrompt = `Genera líneas de asunto para: ${JSON.stringify(campaign_data)}. Audiencia: ${JSON.stringify(audience_data)}`;
        break;

      case 'optimize_send_time':
        systemPrompt = `Eres un experto en optimización de timing para email marketing.
        
ANALIZA los datos históricos y recomienda el mejor momento de envío.

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommended_times": [
    {"day": "Monday|Tuesday|...", "hour": 0-23, "timezone": "Europe/Madrid", "confidence": 0-100}
  ],
  "avoid_times": [
    {"day": "...", "hour": 0-23, "reason": "motivo"}
  ],
  "segment_specific": {
    "b2b": {"best_day": "...", "best_hour": 0-23},
    "b2c": {"best_day": "...", "best_hour": 0-23}
  },
  "reasoning": "explicación del análisis"
}`;
        userPrompt = `Datos históricos: ${JSON.stringify(historical_data)}. Audiencia: ${JSON.stringify(audience_data)}`;
        break;

      case 'predict_engagement':
        systemPrompt = `Eres un analista predictivo especializado en marketing digital.
        
PREDICE métricas de engagement basándote en datos históricos y características de la campaña.

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": {
    "open_rate": {"value": 0-100, "confidence_interval": [0, 0]},
    "click_rate": {"value": 0-100, "confidence_interval": [0, 0]},
    "unsubscribe_rate": {"value": 0-10, "confidence_interval": [0, 0]},
    "conversion_rate": {"value": 0-100, "confidence_interval": [0, 0]}
  },
  "factors": [
    {"name": "factor 1", "impact": "positive|negative", "weight": 0-100}
  ],
  "risk_assessment": "low|medium|high",
  "improvement_opportunities": ["oportunidad 1", "oportunidad 2"]
}`;
        userPrompt = `Campaña: ${JSON.stringify(campaign_data)}. Histórico: ${JSON.stringify(historical_data)}`;
        break;

      case 'segment_recommendations':
        systemPrompt = `Eres un experto en segmentación de audiencias para marketing.
        
GENERA recomendaciones de segmentos basándote en los datos proporcionados.

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommended_segments": [
    {
      "name": "nombre segmento",
      "description": "descripción",
      "conditions": [
        {"field": "campo", "operator": "equals|contains|greater_than", "value": "valor"}
      ],
      "estimated_size": 0,
      "engagement_potential": "high|medium|low"
    }
  ],
  "cross_sell_opportunities": ["oportunidad 1"],
  "reactivation_targets": {
    "description": "usuarios inactivos que reactivar",
    "estimated_count": 0
  }
}`;
        userPrompt = `Datos de audiencia: ${JSON.stringify(audience_data)}`;
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
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[crm-marketing-automation] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[crm-marketing-automation] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-marketing-automation] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
