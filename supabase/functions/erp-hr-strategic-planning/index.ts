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

    // === SEED ACTIONS (P9.6) ===
    if (action === 'workforce_seed_demo') {
      // Workforce Planning seed (P3)
      const plans = [
        { company_id, plan_name: 'Plan Estratégico RRHH 2026-2028', plan_type: 'strategic', status: 'active', horizon_months: 36, budget_total: 2500000, budget_used: 450000, target_headcount: 320, current_headcount: 275, description: 'Plan estratégico de crecimiento y transformación digital' },
        { company_id, plan_name: 'Plan Expansión Internacional Q3', plan_type: 'expansion', status: 'draft', horizon_months: 12, budget_total: 800000, budget_used: 0, target_headcount: 45, current_headcount: 0, description: 'Apertura mercado LATAM con equipo local' },
      ];
      const { data: planData } = await supabase.from('erp_hr_workforce_plans').insert(plans as any).select();

      if (planData?.[0]) {
        const planId = planData[0].id;
        const headcountModels = [
          { company_id, plan_id: planId, department: 'Engineering', current_headcount: 85, projected_headcount: 110, gap: 25, hiring_priority: 'critical', avg_cost_per_hire: 8500, timeline_months: 12 },
          { company_id, plan_id: planId, department: 'Sales', current_headcount: 45, projected_headcount: 60, gap: 15, hiring_priority: 'high', avg_cost_per_hire: 6000, timeline_months: 12 },
          { company_id, plan_id: planId, department: 'Operations', current_headcount: 95, projected_headcount: 100, gap: 5, hiring_priority: 'medium', avg_cost_per_hire: 5000, timeline_months: 18 },
          { company_id, plan_id: planId, department: 'HR', current_headcount: 20, projected_headcount: 22, gap: 2, hiring_priority: 'low', avg_cost_per_hire: 7000, timeline_months: 24 },
        ];
        await supabase.from('erp_hr_headcount_models').insert(headcountModels as any);

        const scenarios = [
          { company_id, plan_id: planId, scenario_name: 'Crecimiento Orgánico', scenario_type: 'growth', status: 'active', risk_level: 'low', assumptions: { growth_rate: 15, attrition_rate: 8, hiring_success: 85 }, projected_cost: 1200000 },
          { company_id, plan_id: planId, scenario_name: 'Recesión Moderada', scenario_type: 'downturn', status: 'active', risk_level: 'high', assumptions: { growth_rate: -5, attrition_rate: 12, hiring_freeze: true }, projected_cost: -350000 },
          { company_id, plan_id: planId, scenario_name: 'Automatización Acelerada', scenario_type: 'transformation', status: 'draft', risk_level: 'medium', assumptions: { automation_pct: 30, reskill_budget: 200000 }, projected_cost: 800000 },
        ];
        await supabase.from('erp_hr_scenarios').insert(scenarios as any);

        const skillGaps = [
          { company_id, plan_id: planId, skill_name: 'AI/ML Engineering', current_level: 2, required_level: 4, gap: 2, criticality: 'critical', mitigation: 'Programa de formación + contratación externa', department: 'Engineering' },
          { company_id, plan_id: planId, skill_name: 'Cloud Architecture (AWS)', current_level: 3, required_level: 5, gap: 2, criticality: 'high', mitigation: 'Certificaciones + mentoring', department: 'Engineering' },
          { company_id, plan_id: planId, skill_name: 'Data Analytics', current_level: 2, required_level: 4, gap: 2, criticality: 'high', mitigation: 'Bootcamp interno', department: 'Sales' },
        ];
        await supabase.from('erp_hr_skill_gap_forecasts').insert(skillGaps as any);

        const costs = [
          { company_id, plan_id: planId, period: '2026-Q1', category: 'hiring', amount: 180000, description: 'Contrataciones Q1' },
          { company_id, plan_id: planId, period: '2026-Q2', category: 'hiring', amount: 250000, description: 'Contrataciones Q2' },
          { company_id, plan_id: planId, period: '2026-Q1', category: 'training', amount: 75000, description: 'Formación y certificaciones' },
          { company_id, plan_id: planId, period: '2026-Q2', category: 'training', amount: 95000, description: 'Bootcamps internos' },
        ];
        await supabase.from('erp_hr_cost_projections').insert(costs as any);
      }

      return json({ success: true, data: { message: 'Workforce Planning demo data seeded' } });
    }

    if (action === 'twin_seed_demo') {
      // Digital Twin seed (P5)
      const twins = [
        { company_id, twin_name: 'Digital Twin - Producción', twin_type: 'production', status: 'active', sync_frequency_minutes: 30, last_sync_at: new Date().toISOString(), health_score: 92, divergence_score: 4, modules_tracked: ['hr', 'operations', 'payroll'], description: 'Réplica del entorno productivo para simulaciones seguras' },
        { company_id, twin_name: 'Digital Twin - Sandbox', twin_type: 'sandbox', status: 'paused', sync_frequency_minutes: 60, health_score: 78, divergence_score: 18, modules_tracked: ['hr', 'compensation'], description: 'Entorno de pruebas para cambios organizacionales' },
      ];
      const { data: twinData } = await supabase.from('erp_hr_twin_instances').insert(twins as any).select();

      if (twinData?.[0]) {
        const twinId = twinData[0].id;
        const snapshots = [
          { company_id, twin_id: twinId, module_name: 'hr', snapshot_data: { employees: 275, departments: 8, avg_tenure: 4.2 }, recorded_at: new Date().toISOString() },
          { company_id, twin_id: twinId, module_name: 'payroll', snapshot_data: { total_gross: 1250000, avg_salary: 38500, deductions: 312000 }, recorded_at: new Date().toISOString() },
          { company_id, twin_id: twinId, module_name: 'operations', snapshot_data: { active_projects: 12, utilization: 87, overtime_hours: 340 }, recorded_at: new Date().toISOString() },
        ];
        await supabase.from('erp_hr_twin_module_snapshots').insert(snapshots as any);

        const metrics = [
          { company_id, twin_id: twinId, metric_key: 'headcount', metric_value: 275, metric_type: 'workforce', baseline_value: 260, variance_pct: 5.8 },
          { company_id, twin_id: twinId, metric_key: 'turnover_rate', metric_value: 8.5, metric_type: 'retention', baseline_value: 10.2, variance_pct: -16.7 },
          { company_id, twin_id: twinId, metric_key: 'cost_per_employee', metric_value: 42000, metric_type: 'financial', baseline_value: 40500, variance_pct: 3.7 },
        ];
        await supabase.from('erp_hr_twin_metrics').insert(metrics as any);

        const experiments = [
          { company_id, twin_id: twinId, experiment_name: 'Semana laboral 4 días', hypothesis: 'Reducir jornada a 4 días mantiene productividad y reduce rotación', status: 'completed', variables: { work_days: 4, salary_impact: 0, hours_reduction: 20 }, results: { productivity_change: -2, turnover_reduction: 25, satisfaction_increase: 18, roi: 1.4 }, started_at: '2026-01-15', completed_at: '2026-03-01' },
          { company_id, twin_id: twinId, experiment_name: 'Incremento salarial 8% Engineering', hypothesis: 'Aumento salarial reducirá rotación en Engineering >40%', status: 'running', variables: { department: 'Engineering', salary_increase: 8 }, started_at: '2026-02-01' },
        ];
        await supabase.from('erp_hr_twin_experiments').insert(experiments as any);

        const alerts = [
          { company_id, twin_id: twinId, alert_type: 'divergence', severity: 'medium', title: 'Divergencia creciente en módulo payroll', description: 'La divergencia del módulo payroll ha superado el 15% respecto al entorno de producción', is_resolved: false },
          { company_id, twin_id: twinId, alert_type: 'health', severity: 'low', title: 'Sync delay detectado', description: 'El último sync tardó 45s (umbral: 30s)', is_resolved: true, resolved_at: new Date().toISOString() },
        ];
        await supabase.from('erp_hr_twin_alerts').insert(alerts as any);
      }

      return json({ success: true, data: { message: 'Digital Twin demo data seeded' } });
    }


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
    } else if (action === 'twin_sync') {
      systemPrompt = `Eres un motor de sincronización de Digital Twin organizacional.
Compara el estado actual de los módulos HR del twin con producción y genera métricas actualizadas.

FORMATO JSON estricto:
{
  "divergence_score": 0-100,
  "health_score": 0-100,
  "synced_modules": number,
  "diverged_modules": number,
  "sync_details": [{"module": "string", "status": "synced|diverged", "divergence_pct": number, "detail": "string"}],
  "recommendations": ["string"]
}`;
      userPrompt = `Sincroniza twin con producción: ${JSON.stringify(params)}`;
    } else if (action === 'twin_experiment') {
      systemPrompt = `Eres un simulador de escenarios What-If sobre un Digital Twin organizacional de RRHH.
Simula el impacto del experimento descrito sin afectar producción. Evalúa riesgos, costes y beneficios.

FORMATO JSON estricto:
{
  "impact_analysis": {"cost_impact": number, "retention_delta_pct": number, "productivity_delta_pct": number, "satisfaction_delta": number, "legal_risk": "low|medium|high", "implementation_months": number},
  "result_snapshot": {"affected_employees": number, "departments_impacted": ["string"], "budget_change_annual": number},
  "risk_score": 0-100,
  "recommendation": "proceed|caution|abort",
  "detailed_findings": ["string"],
  "rollback_plan": "string"
}`;
      userPrompt = `Ejecuta experimento en twin: ${JSON.stringify(params)}`;
    } else if (action === 'twin_ai_analysis') {
      systemPrompt = `Eres un analista senior de Digital Twin organizacional de RRHH.
Evalúa la salud general del twin, identifica divergencias con producción, y sugiere mejoras y experimentos.

FORMATO JSON estricto:
{
  "overall_assessment": "string",
  "health_insights": [{"area": "string", "status": "healthy|warning|critical", "detail": "string"}],
  "divergence_analysis": "string",
  "critical_issues": [{"issue": "string", "severity": "low|medium|high|critical", "action": "string"}],
  "recommendations": [{"title": "string", "priority": "high|medium|low", "impact": "string", "effort": "string"}],
  "experiment_suggestions": [{"name": "string", "type": "what_if|stress_test|optimization", "description": "string", "expected_insight": "string"}],
  "maturity_score": 0-100
}`;
      userPrompt = `Analiza Digital Twin completo: ${JSON.stringify(params)}`;
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
