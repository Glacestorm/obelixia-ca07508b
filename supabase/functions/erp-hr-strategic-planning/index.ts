import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Request {
  action: string;
  company_id?: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, company_id, params } = await req.json() as Request;
    console.log(`[erp-hr-strategic-planning] Action: ${action}`);

    // === CRUD ACTIONS ===
    if (action === 'list_plans') {
      const { data, error } = await supabase.from('erp_hr_workforce_plans').select('*').eq('company_id', company_id).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'get_plan_detail') {
      const planId = params?.plan_id as string;
      const [planRes, hcRes, scenRes, skillRes, costRes] = await Promise.all([
        supabase.from('erp_hr_workforce_plans').select('*').eq('id', planId).single(),
        supabase.from('erp_hr_headcount_models').select('*').eq('plan_id', planId).order('department'),
        supabase.from('erp_hr_scenarios').select('*').eq('plan_id', planId).order('created_at', { ascending: false }),
        supabase.from('erp_hr_skill_gap_forecasts').select('*').eq('plan_id', planId).order('criticality'),
        supabase.from('erp_hr_cost_projections').select('*').eq('plan_id', planId).order('period'),
      ]);
      if (planRes.error) throw planRes.error;
      return json({ success: true, data: {
        plan: planRes.data,
        headcount: hcRes.data || [],
        scenarios: scenRes.data || [],
        skill_gaps: skillRes.data || [],
        cost_projections: costRes.data || [],
      }});
    }

    if (action === 'list_scenarios') {
      const { data, error } = await supabase.from('erp_hr_scenarios').select('*').eq('company_id', company_id).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'upsert_scenario') {
      const scenarioData = params?.scenario as Record<string, unknown>;
      if (!scenarioData) throw new Error('scenario data required');
      const { data, error } = await supabase.from('erp_hr_scenarios').upsert({ ...scenarioData, company_id } as any).select().single();
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'get_stats') {
      const [plansRes, scenRes, hcRes, skillRes] = await Promise.all([
        supabase.from('erp_hr_workforce_plans').select('id, status, budget_total, budget_used', { count: 'exact' }).eq('company_id', company_id),
        supabase.from('erp_hr_scenarios').select('id, status, risk_level', { count: 'exact' }).eq('company_id', company_id),
        supabase.from('erp_hr_headcount_models').select('current_headcount, projected_headcount, gap, hiring_priority').eq('company_id', company_id),
        supabase.from('erp_hr_skill_gap_forecasts').select('gap, criticality').eq('company_id', company_id),
      ]);
      const hcData = hcRes.data || [];
      const totalCurrentHC = hcData.reduce((s: number, r: any) => s + (r.current_headcount || 0), 0);
      const totalProjectedHC = hcData.reduce((s: number, r: any) => s + (r.projected_headcount || 0), 0);
      const criticalHires = hcData.filter((r: any) => r.hiring_priority === 'critical').length;
      const skillData = skillRes.data || [];
      const criticalSkills = skillData.filter((r: any) => r.criticality === 'critical').length;
      const plans = plansRes.data || [];
      const totalBudget = plans.reduce((s: number, p: any) => s + Number(p.budget_total || 0), 0);

      return json({ success: true, data: {
        total_plans: plansRes.count || 0,
        active_plans: plans.filter((p: any) => p.status === 'active').length,
        total_scenarios: scenRes.count || 0,
        high_risk_scenarios: (scenRes.data || []).filter((s: any) => s.risk_level === 'high').length,
        current_headcount: totalCurrentHC,
        projected_headcount: totalProjectedHC,
        headcount_gap: totalProjectedHC - totalCurrentHC,
        critical_hires: criticalHires,
        critical_skill_gaps: criticalSkills,
        total_budget: totalBudget,
      }});
    }

    // === AI ACTIONS ===
    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'simulate_scenario') {
      systemPrompt = `Eres un estratega de workforce planning y simulación de escenarios para RRHH enterprise.
Simula el escenario proporcionado y genera resultados detallados.

FORMATO JSON estricto:
{
  "simulation_results": {
    "projected_headcount": number,
    "projected_cost": number,
    "net_hires": number,
    "net_separations": number,
    "timeline_months": number
  },
  "impact_by_department": [{"department": "string", "current": number, "projected": number, "change_pct": number}],
  "financial_impact": {
    "total_cost": number,
    "savings": number,
    "investment_needed": number,
    "roi_months": number
  },
  "risk_assessment": [{"risk": "string", "probability": "low|medium|high", "impact": "low|medium|high|critical", "mitigation": "string"}],
  "timeline": [{"month": number, "milestone": "string", "actions": ["string"]}],
  "recommendations": ["string"],
  "executive_summary": "string"
}`;
      userPrompt = `Simula este escenario: ${JSON.stringify(params)}`;
    } else if (action === 'ai_workforce_analysis') {
      systemPrompt = `Eres un consultor estratégico de workforce planning con experiencia en empresas reguladas.
Analiza la planificación de plantilla y genera insights accionables.

FORMATO JSON estricto:
{
  "overall_readiness": 0-100,
  "talent_supply_risk": "low|medium|high|critical",
  "key_insights": [{"area": "string", "insight": "string", "action": "string", "priority": "high|medium|low"}],
  "headcount_optimization": {"overstaffed": [{"dept": "string", "excess": number}], "understaffed": [{"dept": "string", "deficit": number, "urgency": "string"}]},
  "skill_strategy": {"build": ["string"], "buy": ["string"], "borrow": ["string"], "automate": ["string"]},
  "cost_optimization": {"current_cost_efficiency": 0-100, "savings_opportunities": [{"area": "string", "potential_savings": number}]},
  "scenario_recommendation": "string",
  "executive_summary": "string"
}`;
      userPrompt = `Analiza workforce planning: ${JSON.stringify(params)}`;
    } else if (action === 'ai_skill_gap_strategy') {
      systemPrompt = `Eres un experto en gestión de competencias y skill gap analysis para empresas tecnológicas.
Genera una estrategia detallada para cerrar las brechas de skills identificadas.

FORMATO JSON estricto:
{
  "overall_gap_severity": "low|medium|high|critical",
  "priority_skills": [{"skill": "string", "gap": number, "urgency": "string", "strategy": "build|buy|borrow|automate", "timeline_months": number, "estimated_cost": number}],
  "training_roadmap": [{"quarter": "string", "programs": [{"name": "string", "target_skill": "string", "participants": number, "duration_weeks": number}]}],
  "hiring_plan": [{"role": "string", "skills": ["string"], "timeline": "string", "channels": ["string"]}],
  "automation_candidates": [{"process": "string", "current_fte": number, "post_automation_fte": number, "tools": ["string"]}],
  "market_intelligence": {"scarce_skills": ["string"], "emerging_skills": ["string"], "declining_skills": ["string"]},
  "executive_summary": "string"
}`;
      userPrompt = `Analiza brechas de skills: ${JSON.stringify(params)}`;
    } else {
      throw new Error(`Acción no soportada: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.7, max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: 'Rate limit', message: 'Demasiadas solicitudes.' }, 429);
      if (response.status === 402) return json({ error: 'Payment required', message: 'Créditos insuficientes.' }, 402);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content, parseError: true };
    } catch { result = { rawContent: content, parseError: true }; }

    // If simulating, store results back
    if (action === 'simulate_scenario' && params?.scenario_id && result && !result.parseError) {
      await supabase.from('erp_hr_scenarios').update({
        results: result,
        impact_summary: result.executive_summary || '',
        status: 'simulated',
        simulated_at: new Date().toISOString(),
      }).eq('id', params.scenario_id);
    }

    return json({ success: true, action, data: result, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[erp-hr-strategic-planning] Error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
