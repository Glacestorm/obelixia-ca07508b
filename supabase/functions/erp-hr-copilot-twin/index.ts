import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FunctionRequest {
  action: string;
  companyId?: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, companyId = 'demo-company-id', params } = await req.json() as FunctionRequest;
    console.log(`[erp-hr-copilot-twin] Action: ${action}`);

    // Non-AI actions
    switch (action) {
      case 'get_copilot_stats': {
        const [sessionsRes, actionsRes, kpisRes] = await Promise.all([
          supabase.from('erp_hr_copilot_sessions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
          supabase.from('erp_hr_copilot_actions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
          supabase.from('erp_hr_copilot_kpis').select('*').eq('company_id', companyId),
        ]);
        return new Response(JSON.stringify({
          success: true, data: { sessions: sessionsRes.data || [], actions: actionsRes.data || [], kpis: kpisRes.data || [] }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_twin_data': {
        const [snapshotsRes, simulationsRes] = await Promise.all([
          supabase.from('erp_hr_digital_twin_snapshots').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(10),
          supabase.from('erp_hr_digital_twin_simulations').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
        ]);
        return new Response(JSON.stringify({
          success: true, data: { snapshots: snapshotsRes.data || [], simulations: simulationsRes.data || [] }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'create_session': {
        const { data, error } = await supabase.from('erp_hr_copilot_sessions').insert([{
          company_id: companyId,
          session_type: (params as any)?.session_type || 'general',
          title: (params as any)?.title || 'Nueva sesión',
          autonomy_level: (params as any)?.autonomy_level || 'assisted',
        }]).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'log_action': {
        const { data, error } = await supabase.from('erp_hr_copilot_actions').insert([{
          company_id: companyId,
          session_id: (params as any)?.session_id,
          action_type: (params as any)?.action_type || 'recommendation',
          description: (params as any)?.description || '',
          target_entity: (params as any)?.target_entity,
          status: 'pending',
          confidence_score: (params as any)?.confidence_score || 85,
        }]).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // AI-powered actions
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'copilot_chat':
        systemPrompt = `Eres el Copilot IA de RRHH Enterprise de ObelixIA. Eres un asistente experto en gestión de recursos humanos con capacidades autónomas.

CAPACIDADES:
- Análisis predictivo de rotación, rendimiento y bienestar
- Recomendaciones proactivas basadas en datos del workforce
- Automatización de tareas repetitivas (informes, recordatorios, alertas)
- Asesoramiento legal laboral (España/UE)
- Planificación de workforce y sucesión

CONTEXTO ACTUAL: ${JSON.stringify(params?.context || {})}

Responde de forma concisa, accionable y profesional. Si detectas oportunidades de mejora, sugiere acciones concretas.`;
        userPrompt = (params as any)?.message || 'Hola, ¿qué novedades hay?';
        break;

      case 'ai_twin_analysis':
        systemPrompt = `Eres un motor de análisis de Digital Twin para RRHH Enterprise.
Analiza el snapshot del gemelo digital y genera insights, predicciones y recomendaciones.

FORMATO JSON estricto:
{
  "health_score": 0-100,
  "key_insights": [{"area": "string", "insight": "string", "impact": "low|medium|high", "trend": "improving|stable|declining"}],
  "predictions": [{"metric": "string", "current": "string", "predicted_30d": "string", "predicted_90d": "string", "confidence": 0-100}],
  "risk_areas": [{"area": "string", "risk_level": "low|medium|high|critical", "description": "string", "mitigation": "string"}],
  "optimization_opportunities": [{"title": "string", "potential_impact": "string", "effort": "low|medium|high", "roi_estimate": "string"}],
  "divergence_analysis": {"score": 0-100, "main_divergences": ["string"], "sync_recommendation": "string"},
  "summary": "string"
}`;
        userPrompt = `Analiza este snapshot del Digital Twin de RRHH: ${JSON.stringify(params)}`;
        break;

      case 'ai_simulate_scenario':
        systemPrompt = `Eres un simulador de escenarios de RRHH vía Digital Twin.
Simula el impacto de cambios propuestos sin afectar al sistema real.

FORMATO JSON estricto:
{
  "simulation_result": "favorable|neutral|unfavorable",
  "risk_score": 0-100,
  "impact_areas": [{"area": "string", "current_state": "string", "projected_state": "string", "impact_type": "positive|neutral|negative", "magnitude": "low|medium|high"}],
  "financial_impact": {"monthly_cost_delta": "string", "annual_projection": "string", "roi_timeline": "string"},
  "workforce_impact": {"headcount_change": number, "skill_gaps": ["string"], "training_needs": ["string"], "morale_prediction": "string"},
  "compliance_impact": {"affected_regulations": ["string"], "risk_areas": ["string"], "required_actions": ["string"]},
  "recommendation": "proceed|proceed_with_caution|delay|abort",
  "implementation_plan": [{"step": number, "action": "string", "timeline": "string", "responsible": "string"}],
  "summary": "string"
}`;
        userPrompt = `Simula este escenario en el Digital Twin de RRHH: ${JSON.stringify(params)}`;
        break;

      case 'ai_proactive_insights':
        systemPrompt = `Eres un sistema de insights proactivos de RRHH.
Genera alertas, recomendaciones y acciones proactivas basadas en los datos actuales del workforce.

FORMATO JSON estricto:
{
  "critical_alerts": [{"type": "string", "title": "string", "description": "string", "urgency": "immediate|this_week|this_month", "suggested_action": "string"}],
  "recommendations": [{"category": "retention|performance|compliance|wellness|cost", "title": "string", "description": "string", "impact": "high|medium|low", "effort": "low|medium|high", "auto_executable": boolean}],
  "upcoming_events": [{"date": "string", "event": "string", "action_required": "string", "assigned_to": "string"}],
  "trend_alerts": [{"metric": "string", "direction": "up|down", "magnitude": "string", "significance": "string"}],
  "automation_suggestions": [{"task": "string", "frequency": "string", "time_saved": "string", "confidence": 0-100}],
  "summary": "string"
}`;
        userPrompt = `Genera insights proactivos basados en estos datos de RRHH: ${JSON.stringify(params)}`;
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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit', message: 'Demasiadas solicitudes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required', message: 'Créditos insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    // For chat, return raw text; for analysis, parse JSON
    if (action === 'copilot_chat') {
      return new Response(JSON.stringify({
        success: true, action, data: { response: content }, timestamp: new Date().toISOString()
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content, parseError: true };
    } catch {
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-copilot-twin] Success: ${action}`);
    return new Response(JSON.stringify({
      success: true, action, data: result, timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[erp-hr-copilot-twin] Error:', error);
    return new Response(JSON.stringify({
      success: false, error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
