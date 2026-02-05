/**
 * CRM Lead Scorer Edge Function
 * Motor de scoring con IA para leads B2B
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringRequest {
  action: 'score' | 'batch_score' | 'generate_insights' | 'detect_signals' | 'prioritize' | 'enrich';
  lead?: LeadData;
  leads?: LeadData[];
  leadId?: string;
  modelId?: string;
  context?: Record<string, unknown>;
  events?: unknown[];
}

interface LeadData {
  id: string;
  company: string;
  sector: string;
  size: string;
  source: string;
  engagement: Record<string, number>;
  firmographics?: Record<string, unknown>;
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

    const { action, lead, leads, leadId, modelId, context, events } = await req.json() as ScoringRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'score':
        systemPrompt = `Eres un sistema avanzado de Lead Scoring B2B con capacidades predictivas.

MODELO DE SCORING (0-100):
1. FIT SCORE (0-40): Coincidencia con ICP
   - Tamaño empresa: SMB(5-10), Mid-Market(15-25), Enterprise(30-40)
   - Industria: Match exacto(+15), relacionada(+8), no relacionada(+0)
   - Budget: Alto(+10), Medio(+5), Bajo(+0)

2. ENGAGEMENT SCORE (0-30): Nivel de interacción
   - Email opens: bajo(+2), medio(+5), alto(+8)
   - Email clicks: bajo(+3), medio(+6), alto(+10)
   - Page views: bajo(+2), medio(+4), alto(+7)
   - Demo requests: +10 cada una
   - Content downloads: +3 cada una

3. INTENT SCORE (0-30): Señales de compra
   - Pricing page views: +8
   - Competitor comparison: +6
   - Integration docs: +5
   - Case studies: +4
   - Contact sales: +10
   - Timeline urgency: alta(+10), media(+5), baja(+0)

CLASIFICACIÓN:
- Tier A: 80-100 (Hot Lead)
- Tier B: 60-79 (Warm Lead)
- Tier C: 40-59 (Nurture)
- Tier D: 0-39 (Cold)

READINESS:
- hot: score >= 80
- warm: score >= 50 && score < 80
- cold: score < 50

FORMATO DE RESPUESTA (JSON estricto):
{
  "totalScore": 0-100,
  "breakdown": {
    "fit": { "score": 0-40, "factors": ["factor1", "factor2"] },
    "engagement": { "score": 0-30, "factors": ["factor1", "factor2"] },
    "intent": { "score": 0-30, "factors": ["factor1", "factor2"] }
  },
  "tier": "A" | "B" | "C" | "D",
  "readiness": "hot" | "warm" | "cold",
  "recommendedAction": "string con acción específica",
  "estimatedDealSize": number,
  "conversionProbability": 0-100,
  "nextBestAction": "string",
  "riskFactors": ["factor1", "factor2"]
}`;

        userPrompt = lead 
          ? `Puntúa este lead B2B:
Empresa: ${lead.company}
Sector: ${lead.sector}
Tamaño: ${lead.size}
Fuente: ${lead.source}
Engagement: ${JSON.stringify(lead.engagement)}
Firmographics: ${JSON.stringify(lead.firmographics || {})}`
          : 'Error: No se proporcionó información del lead';
        break;

      case 'generate_insights':
        systemPrompt = `Eres un sistema de análisis predictivo para CRM B2B que genera insights accionables.

TIPOS DE INSIGHTS:
1. recommendation: Sugerencias de acción
2. prediction: Predicciones basadas en datos
3. alert: Alertas de riesgo u oportunidad
4. opportunity: Oportunidades detectadas
5. risk: Riesgos identificados

CATEGORÍAS:
- scoring: Relacionado con puntuación
- engagement: Relacionado con interacción
- timing: Relacionado con momento óptimo
- content: Relacionado con contenido
- channel: Relacionado con canal de comunicación
- pricing: Relacionado con precio

PRIORIDADES:
- critical: Acción inmediata requerida
- high: Acción en 24h
- medium: Acción esta semana
- low: Cuando sea posible

FORMATO DE RESPUESTA (JSON estricto):
{
  "insights": [
    {
      "type": "recommendation" | "prediction" | "alert" | "opportunity" | "risk",
      "category": "scoring" | "engagement" | "timing" | "content" | "channel" | "pricing",
      "priority": "critical" | "high" | "medium" | "low",
      "title": "Título corto y descriptivo",
      "description": "Descripción detallada del insight",
      "actionItems": [
        { "id": "1", "action": "Acción específica", "priority": 1, "completed": false }
      ],
      "confidence": 0.0-1.0,
      "reasoning": "Explicación del razonamiento",
      "supportingData": {},
      "estimatedImpact": {
        "revenue": number o null,
        "conversion": number o null,
        "description": "Descripción del impacto"
      }
    }
  ],
  "modelVersion": "v1.0"
}`;

        userPrompt = `Genera insights para esta entidad:
Tipo: ${context?.entityType || 'lead'}
ID: ${context?.entityId || 'unknown'}
Datos: ${JSON.stringify(context?.entityData || {})}
Áreas de enfoque: ${JSON.stringify(context?.focusAreas || ['all'])}`;
        break;

      case 'detect_signals':
        systemPrompt = `Eres un sistema de detección de señales de compra para ventas B2B.

TIPOS DE SEÑALES:
- buying_intent: Intención de compra clara
- budget_available: Señales de presupuesto disponible
- timeline_urgent: Urgencia en el timeline
- competitor_evaluation: Evaluando competidores
- stakeholder_involved: Involucración de stakeholders
- trial_engagement: Alto engagement con trial/demo
- expansion_potential: Potencial de expansión
- churn_risk: Señales de riesgo de abandono

FORMATO DE RESPUESTA (JSON estricto):
{
  "signals": [
    {
      "type": "buying_intent" | "budget_available" | "timeline_urgent" | ...,
      "strength": 0.0-1.0,
      "source": "behavior" | "content" | "timing" | "external",
      "events": ["evento1", "evento2"],
      "evidence": "Descripción de la evidencia",
      "scoreContribution": 0-20
    }
  ]
}`;

        userPrompt = `Detecta señales de compra:
Lead ID: ${leadId}
Eventos recientes: ${JSON.stringify(events || [])}`;
        break;

      case 'prioritize':
        systemPrompt = `Eres un sistema de priorización de pipeline comercial B2B.

CRITERIOS DE PRIORIZACIÓN:
1. Score actual + tendencia
2. Valor potencial del deal
3. Urgencia / timing del cliente
4. Probabilidad de cierre
5. Recursos requeridos

FORMATO DE RESPUESTA (JSON estricto):
{
  "prioritizedLeads": [
    {
      "id": "string",
      "rank": number,
      "priorityScore": 0-100,
      "reasoning": "string",
      "suggestedNextStep": "string",
      "urgency": "high" | "medium" | "low",
      "estimatedCloseDate": "YYYY-MM-DD",
      "blockers": ["blocker1"]
    }
  ],
  "insights": {
    "pipelineHealth": "string",
    "focusRecommendation": "string",
    "quickWins": ["lead_id1", "lead_id2"]
  }
}`;

        userPrompt = `Prioriza estos leads: ${JSON.stringify(leads)}`;
        break;

      case 'enrich':
        systemPrompt = `Eres un sistema de enriquecimiento de datos B2B.

FORMATO DE RESPUESTA (JSON estricto):
{
  "enrichedData": {
    "industry": "string",
    "subIndustry": "string",
    "estimatedRevenue": "string",
    "employeeCount": "string",
    "techStack": ["tech1", "tech2"],
    "buyingSignals": ["signal1", "signal2"],
    "competitorProducts": ["product1"],
    "decisionMakers": ["role1", "role2"],
    "painPoints": ["pain1", "pain2"]
  },
  "qualificationQuestions": ["pregunta1", "pregunta2"],
  "discoveryAngles": ["angle1", "angle2"],
  "confidenceLevel": 0-100
}`;

        userPrompt = `Enriquece datos para: ${JSON.stringify(lead)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[crm-lead-scorer] Processing action: ${action}`);

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
        temperature: 0.6,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Intenta más tarde.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Payment required',
          message: 'Créditos de IA insuficientes.'
        }), {
          status: 402,
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
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[crm-lead-scorer] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[crm-lead-scorer] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      modelId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-lead-scorer] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
