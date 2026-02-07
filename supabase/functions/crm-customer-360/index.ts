/**
 * CRM Customer 360 Edge Function
 * Identity resolution, profile enrichment, and journey analysis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Customer360Request {
  action: 'enrich' | 'merge' | 'resolve_identity' | 'analyze_journey' | 'compute_health' | 'segment_suggest';
  profileId?: string;
  sourceIds?: string[];
  targetId?: string;
  identifiers?: Array<{ type: string; value: string }>;
  context?: Record<string, unknown>;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, profileId, sourceIds, targetId, identifiers, context } = await req.json() as Customer360Request;

    console.log(`[crm-customer-360] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'enrich': {
        if (!profileId) throw new Error('profileId required');

        // Fetch current profile
        const { data: profile } = await supabase
          .from('crm_unified_profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (!profile) throw new Error('Profile not found');

        systemPrompt = `Eres un sistema de enriquecimiento de datos B2B.
Analiza el perfil y sugiere datos adicionales basándote en la información disponible.

FORMATO DE RESPUESTA (JSON estricto):
{
  "enrichedData": {
    "industry": "string o null",
    "company_size": "string o null",
    "annual_revenue_estimate": number o null,
    "employee_count_estimate": number o null,
    "persona_type": "string (decision_maker, influencer, end_user, etc.)",
    "customer_segment": "string (enterprise, mid_market, smb, startup)",
    "suggested_tier": "standard | silver | gold | platinum | enterprise",
    "interests": ["interest1", "interest2"],
    "pain_points": ["pain1", "pain2"],
    "buying_signals": ["signal1", "signal2"]
  },
  "dataQualityScore": 0-100,
  "confidenceLevel": 0-100,
  "missingFields": ["field1", "field2"],
  "recommendations": ["recommendation1"]
}`;

        userPrompt = `Enriquece este perfil B2B:
Nombre: ${profile.display_name}
Email: ${profile.primary_email || 'N/A'}
Empresa: ${profile.company_name || 'N/A'}
Título: ${profile.job_title || 'N/A'}
Industria actual: ${profile.industry || 'N/A'}
Score actual: ${profile.total_score}
Touchpoints: ${profile.total_touchpoints}`;
        break;
      }

      case 'merge': {
        if (!sourceIds || !targetId) throw new Error('sourceIds and targetId required');

        // Fetch all profiles to merge
        const { data: profilesToMerge } = await supabase
          .from('crm_unified_profiles')
          .select('*')
          .in('id', [...sourceIds, targetId]);

        systemPrompt = `Eres un sistema de resolución de identidad y fusión de perfiles.
Analiza los perfiles y determina cómo combinarlos de manera óptima.

FORMATO DE RESPUESTA (JSON estricto):
{
  "mergedProfile": {
    "display_name": "nombre más completo",
    "primary_email": "email más confiable",
    "company_name": "empresa correcta",
    "job_title": "título más reciente",
    "industry": "industria confirmada",
    "tags": ["tag1", "tag2"]
  },
  "conflictsResolved": [
    { "field": "email", "keptValue": "x", "discardedValues": ["y"] }
  ],
  "dataQualityImprovement": 0-100,
  "mergeConfidence": 0-100
}`;

        userPrompt = `Fusiona estos ${profilesToMerge?.length || 0} perfiles:
${JSON.stringify(profilesToMerge, null, 2)}

Perfil destino ID: ${targetId}`;
        break;
      }

      case 'analyze_journey': {
        if (!profileId) throw new Error('profileId required');

        // Fetch profile and touchpoints
        const [profileRes, touchpointsRes] = await Promise.all([
          supabase.from('crm_unified_profiles').select('*').eq('id', profileId).single(),
          supabase.from('crm_touchpoints').select('*').eq('profile_id', profileId).order('occurred_at', { ascending: true }).limit(50)
        ]);

        systemPrompt = `Eres un analista de customer journey B2B.
Analiza el historial de interacciones y proporciona insights sobre el journey del cliente.

FORMATO DE RESPUESTA (JSON estricto):
{
  "journeyAnalysis": {
    "currentStage": "awareness | consideration | decision | retention | advocacy",
    "stageConfidence": 0-100,
    "daysInJourney": number,
    "engagementTrend": "increasing | stable | decreasing",
    "keyMilestones": [
      { "name": "string", "date": "ISO date", "significance": "high | medium | low" }
    ]
  },
  "nextBestActions": [
    { "action": "string", "priority": 1-5, "reasoning": "string" }
  ],
  "riskFactors": ["factor1", "factor2"],
  "opportunitySignals": ["signal1", "signal2"],
  "predictedOutcome": {
    "likelihood": 0-100,
    "estimatedCloseDate": "ISO date o null",
    "estimatedValue": number o null
  }
}`;

        userPrompt = `Analiza el journey de este cliente:
Perfil: ${JSON.stringify(profileRes.data)}
Touchpoints (${touchpointsRes.data?.length || 0}): ${JSON.stringify(touchpointsRes.data)}`;
        break;
      }

      case 'compute_health': {
        if (!profileId) throw new Error('profileId required');

        const { data: profile } = await supabase
          .from('crm_unified_profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        systemPrompt = `Eres un sistema de scoring de salud del cliente.

COMPONENTES DEL HEALTH SCORE (0-100):
1. Engagement (0-25): Frecuencia e intensidad de interacciones
2. Adoption (0-25): Uso de productos/servicios
3. Satisfaction (0-25): Indicadores de satisfacción
4. Growth Potential (0-25): Potencial de expansión

FORMATO DE RESPUESTA (JSON estricto):
{
  "healthScore": 0-100,
  "breakdown": {
    "engagement": { "score": 0-25, "trend": "up | stable | down" },
    "adoption": { "score": 0-25, "trend": "up | stable | down" },
    "satisfaction": { "score": 0-25, "trend": "up | stable | down" },
    "growthPotential": { "score": 0-25, "trend": "up | stable | down" }
  },
  "riskLevel": "low | medium | high | critical",
  "churnProbability": 0-100,
  "improvementActions": ["action1", "action2"]
}`;

        userPrompt = `Calcula el health score para:
${JSON.stringify(profile)}`;
        break;
      }

      case 'segment_suggest': {
        const { data: profiles } = await supabase
          .from('crm_unified_profiles')
          .select('*')
          .limit(100);

        systemPrompt = `Eres un sistema de segmentación inteligente para CRM B2B.
Analiza los perfiles y sugiere segmentos dinámicos basados en patrones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "suggestedSegments": [
    {
      "name": "Nombre del segmento",
      "description": "Descripción",
      "conditions": [
        { "field": "lifecycle_stage", "operator": "equals", "value": "customer" }
      ],
      "estimatedSize": number,
      "businessValue": "high | medium | low",
      "useCase": "descripción del caso de uso"
    }
  ],
  "insights": {
    "totalProfilesAnalyzed": number,
    "commonPatterns": ["pattern1", "pattern2"],
    "recommendations": ["rec1", "rec2"]
  }
}`;

        userPrompt = `Sugiere segmentos para ${profiles?.length || 0} perfiles:
${JSON.stringify(profiles?.slice(0, 20))}...`;
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // Call AI
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
    } catch {
      result = { rawContent: content };
    }

    // Apply updates for enrich action
    if (action === 'enrich' && profileId && result.enrichedData) {
      const updates: any = {};
      if (result.enrichedData.industry) updates.industry = result.enrichedData.industry;
      if (result.enrichedData.company_size) updates.company_size = result.enrichedData.company_size;
      if (result.enrichedData.persona_type) updates.persona_type = result.enrichedData.persona_type;
      if (result.enrichedData.customer_segment) updates.customer_segment = result.enrichedData.customer_segment;
      if (result.enrichedData.suggested_tier) updates.account_tier = result.enrichedData.suggested_tier;
      if (result.dataQualityScore) updates.data_quality_score = result.dataQualityScore;
      updates.requires_enrichment = false;

      await supabase
        .from('crm_unified_profiles')
        .update(updates)
        .eq('id', profileId);
    }

    console.log(`[crm-customer-360] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-customer-360] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
