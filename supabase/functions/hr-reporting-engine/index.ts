import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

const RATE_LIMIT_CONFIG = {
  burstPerMinute: 10,
  perDay: 100,
  functionName: 'hr-reporting-engine',
};

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!).auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { action, company_id, params } = await req.json();

    // Rate limit expensive operations
    if (action === 'generate_report') {
      const burstResult = checkBurstLimit(company_id || user.id, RATE_LIMIT_CONFIG);
      if (!burstResult.allowed) {
        console.warn(`[hr-reporting-engine] Rate limited: company=${company_id}`);
        return rateLimitResponse(burstResult, corsHeaders);
      }
    }

    switch (action) {
      // === LIST TEMPLATES ===
      case 'list_templates': {
        const { data } = await supabase
          .from('erp_hr_report_templates')
          .select('*')
          .or(`company_id.eq.${company_id},company_id.is.null`)
          .eq('is_active', true)
          .order('category', { ascending: true });
        return jsonResponse({ success: true, data: data || [] });
      }

      // === GENERATE REPORT ===
      case 'generate_report': {
        const startTime = Date.now();
        const { template_id, report_name, format, filters, modules } = params || {};

        // Create pending report
        const { data: report, error: insertErr } = await supabase
          .from('erp_hr_generated_reports')
          .insert({
            company_id,
            template_id,
            report_name: report_name || 'Reporte Premium HR',
            format: format || 'pdf',
            status: 'generating',
            generated_by: user.id,
            filters_applied: filters || {},
            modules_included: modules || [],
            data_sources: {},
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Collect real data from modules
        const dataSources: Record<string, { source: string; count: number; timestamp: string }> = {};
        const reportData: Record<string, unknown> = {};

        // Fairness data
        if (!modules || modules.length === 0 || modules.includes('fairness')) {
          const { data: eqData, count } = await supabase
            .from('erp_hr_pay_equity_analyses')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id)
            .order('created_at', { ascending: false })
            .limit(10);
          reportData.fairness = { analyses: eqData || [], count };
          dataSources.fairness = { source: (eqData?.length || 0) > 0 ? 'real' : 'demo', count: count || 0, timestamp: new Date().toISOString() };

          const { data: metricsData, count: mCount } = await supabase
            .from('erp_hr_fairness_metrics')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id)
            .limit(20);
          reportData.fairness_metrics = { metrics: metricsData || [], count: mCount };
        }

        // Workforce data
        if (!modules || modules.length === 0 || modules.includes('workforce')) {
          const { data: plansData, count } = await supabase
            .from('erp_hr_workforce_plans')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.workforce = { plans: plansData || [], count };
          dataSources.workforce = { source: (plansData?.length || 0) > 0 ? 'real' : 'demo', count: count || 0, timestamp: new Date().toISOString() };

          // Real headcount
          const { data: empData, count: empCount } = await supabase
            .from('erp_hr_employees')
            .select('id, department, job_title, base_salary, gender, employment_status', { count: 'exact' })
            .eq('company_id', company_id)
            .eq('employment_status', 'active');
          reportData.real_headcount = { employees: empData || [], count: empCount };
          dataSources.real_headcount = { source: (empCount || 0) > 0 ? 'real' : 'demo', count: empCount || 0, timestamp: new Date().toISOString() };
        }

        // Legal data
        if (!modules || modules.length === 0 || modules.includes('legal')) {
          const { data: contractsData, count } = await supabase
            .from('erp_hr_legal_contracts')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id)
            .limit(50);
          reportData.legal = { contracts: contractsData || [], count };
          dataSources.legal = { source: (contractsData?.length || 0) > 0 ? 'real' : 'demo', count: count || 0, timestamp: new Date().toISOString() };
        }

        // Compliance data
        if (!modules || modules.length === 0 || modules.includes('compliance')) {
          const { data: fwData, count } = await supabase
            .from('erp_hr_compliance_frameworks')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.compliance = { frameworks: fwData || [], count };
          dataSources.compliance = { source: (fwData?.length || 0) > 0 ? 'real' : 'demo', count: count || 0, timestamp: new Date().toISOString() };
        }

        // Security data
        if (!modules || modules.length === 0 || modules.includes('security')) {
          const { count: maskCount } = await supabase
            .from('erp_hr_masking_rules')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company_id);
          const { count: sodCount } = await supabase
            .from('erp_hr_sod_rules')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company_id);
          reportData.security = { masking_rules: maskCount || 0, sod_rules: sodCount || 0 };
          dataSources.security = { source: (maskCount || 0) > 0 ? 'real' : 'demo', count: (maskCount || 0) + (sodCount || 0), timestamp: new Date().toISOString() };
        }

        // Generate AI executive summary if API key available
        let executiveSummary = '';
        if (LOVABLE_API_KEY) {
          try {
            const summaryPrompt = `Genera un resumen ejecutivo profesional en español para un reporte de RRHH Premium.
Datos disponibles: ${JSON.stringify(Object.entries(dataSources).map(([k, v]) => `${k}: ${v.count} registros (${v.source})`))}.
Módulos incluidos: ${modules?.join(', ') || 'todos'}.
Formato: 3-5 párrafos ejecutivos con hallazgos clave, riesgos y recomendaciones.
RESPONDE SOLO CON EL TEXTO DEL RESUMEN, sin JSON.`;

            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [{ role: 'user', content: summaryPrompt }],
                temperature: 0.5,
                max_tokens: 1500,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              executiveSummary = aiData.choices?.[0]?.message?.content || '';
            }
          } catch (e) {
            console.error('AI summary error:', e);
          }
        }

        const generationTime = Date.now() - startTime;

        // Update report with collected data
        const { error: updateErr } = await supabase
          .from('erp_hr_generated_reports')
          .update({
            status: 'completed',
            data_sources: dataSources,
            content_snapshot: { ...reportData, executive_summary: executiveSummary },
            generation_time_ms: generationTime,
            completed_at: new Date().toISOString(),
            metadata: { template_version: 1, ai_summary: !!executiveSummary },
          })
          .eq('id', report!.id);

        if (updateErr) throw updateErr;

        return jsonResponse({
          success: true,
          data: {
            report_id: report!.id,
            status: 'completed',
            data_sources: dataSources,
            content: { ...reportData, executive_summary: executiveSummary },
            generation_time_ms: generationTime,
          }
        });
      }

      // === LIST GENERATED REPORTS ===
      case 'list_reports': {
        const { data } = await supabase
          .from('erp_hr_generated_reports')
          .select('id, report_name, report_type, format, status, generated_by, modules_included, data_sources, generation_time_ms, created_at, completed_at')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(50);
        return jsonResponse({ success: true, data: data || [] });
      }

      // === GET REPORT DETAIL ===
      case 'get_report': {
        const { data } = await supabase
          .from('erp_hr_generated_reports')
          .select('*')
          .eq('id', params?.report_id)
          .eq('company_id', company_id)
          .single();
        return jsonResponse({ success: true, data });
      }

      // === LIST SCHEDULES ===
      case 'list_schedules': {
        const { data } = await supabase
          .from('erp_hr_report_schedules')
          .select('*, template:erp_hr_report_templates(template_name, category)')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false });
        return jsonResponse({ success: true, data: data || [] });
      }

      // === CREATE SCHEDULE ===
      case 'create_schedule': {
        const { template_id, schedule_name, frequency, format: fmt, filters: schedFilters, recipients, delivery_method } = params || {};
        const cronMap: Record<string, string> = {
          daily: '0 8 * * *',
          weekly: '0 8 * * 1',
          monthly: '0 8 1 * *',
        };
        const { data, error } = await supabase
          .from('erp_hr_report_schedules')
          .insert({
            company_id,
            template_id,
            schedule_name: schedule_name || 'Reporte programado',
            frequency: frequency || 'monthly',
            cron_expression: cronMap[frequency || 'monthly'] || cronMap.monthly,
            format: fmt || 'pdf',
            filters: schedFilters || {},
            recipients: recipients || [],
            delivery_method: delivery_method || 'download',
            is_active: true,
            created_by: user.id,
            next_run_at: new Date(Date.now() + 86400000).toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      // === TOGGLE SCHEDULE ===
      case 'toggle_schedule': {
        const { schedule_id, is_active } = params || {};
        const { error } = await supabase
          .from('erp_hr_report_schedules')
          .update({ is_active, updated_at: new Date().toISOString() })
          .eq('id', schedule_id)
          .eq('company_id', company_id);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      // === SEED TEMPLATES ===
      case 'seed_templates': {
        const templates = [
          // Role templates
          { template_key: 'ceo_executive', template_name: 'CEO — Informe Ejecutivo Global', category: 'role', target_role: 'ceo', sections: ['executive_summary','risk_overview','headcount_kpis','fairness_summary','compliance_score','contracts_critical','strategic_alerts'], kpi_definitions: ['headcount','gender_gap','compliance_score','critical_hires','total_salary_cost'] },
          { template_key: 'hr_director', template_name: 'Director RRHH — Informe Estratégico', category: 'role', target_role: 'hr_director', sections: ['executive_summary','headcount_detail','salary_analysis','fairness_deep','skill_gaps','training_coverage','turnover','active_plans'], kpi_definitions: ['headcount','avg_salary','gender_gap','open_cases','skill_gaps','active_contracts'] },
          { template_key: 'hr_ops', template_name: 'HR Operations — Informe Operativo', category: 'role', target_role: 'admin', sections: ['headcount_summary','new_hires','terminations','contracts_expiring','payroll_summary','incidents'], kpi_definitions: ['headcount','active_contracts','avg_salary','open_cases'] },
          { template_key: 'payroll_cfo', template_name: 'Payroll / CFO — Informe Financiero', category: 'role', target_role: 'cfo', sections: ['salary_distribution','payroll_totals','cost_by_department','gender_pay_gap','compensation_benchmarks','anomalies'], kpi_definitions: ['total_salary_cost','avg_salary','gender_gap','headcount','critical_hires'] },
          { template_key: 'legal_compliance', template_name: 'Legal & Compliance — Informe Regulatorio', category: 'role', target_role: 'auditor', sections: ['compliance_score','frameworks_status','audit_findings','contracts_compliance','legal_risks','regulatory_changes'], kpi_definitions: ['compliance_score','open_cases','active_contracts','gender_gap'] },
          { template_key: 'manager', template_name: 'Manager — Informe de Equipo', category: 'role', target_role: 'manager', sections: ['team_headcount','vacations_pending','performance_summary','training_pending','skill_gaps_team'], kpi_definitions: ['headcount','skill_gaps'] },
          { template_key: 'auditor', template_name: 'Auditor — Informe de Control', category: 'role', target_role: 'auditor', sections: ['compliance_overview','sod_violations','masking_coverage','access_logs','fairness_compliance','audit_trail'], kpi_definitions: ['compliance_score','open_cases','gender_gap'] },
          // Module templates
          { template_key: 'mod_fairness', template_name: 'Fairness & Justice Engine', category: 'module', target_module: 'fairness', sections: ['pay_equity_analysis','disparate_impact','justice_cases','action_plans','real_salary_data'], kpi_definitions: ['gender_gap','equity_score','open_cases','non_compliant_metrics'] },
          { template_key: 'mod_workforce', template_name: 'Workforce Planning', category: 'module', target_module: 'workforce', sections: ['real_headcount','projected_headcount','gaps','scenarios','skill_forecasts','cost_projections'], kpi_definitions: ['headcount','headcount_gap','critical_hires','skill_gaps','total_budget'] },
          { template_key: 'mod_legal', template_name: 'Legal Engine Premium', category: 'module', target_module: 'legal', sections: ['contracts_overview','compliance_checks','clause_library','templates_usage','real_contracts'], kpi_definitions: ['active_contracts','draft_contracts','avg_compliance_score','total_clauses'] },
          { template_key: 'mod_compliance', template_name: 'Compliance Automation', category: 'module', target_module: 'compliance', sections: ['frameworks_status','audits','alerts','remediation_tracking'], kpi_definitions: ['compliance_score','frameworks_count','critical_alerts'] },
          { template_key: 'mod_security', template_name: 'Security & Governance', category: 'module', target_module: 'security', sections: ['masking_rules','sod_rules','access_log','ai_models','security_posture'], kpi_definitions: ['masking_rules_count','sod_violations','access_events'] },
          { template_key: 'mod_ai_gov', template_name: 'AI Governance', category: 'module', target_module: 'ai_governance', sections: ['model_registry','bias_audits','risk_assessments','compliance_status'], kpi_definitions: ['models_count','high_risk_models','bias_alerts'] },
          { template_key: 'mod_twin', template_name: 'Digital Twin', category: 'module', target_module: 'digital_twin', sections: ['twin_instances','experiments','snapshots','predictions'], kpi_definitions: ['twin_count','experiments_count','snapshot_coverage'] },
          { template_key: 'mod_cnae', template_name: 'CNAE Intelligence', category: 'module', target_module: 'cnae', sections: ['sector_profiles','benchmarks','market_analysis','regulatory_map'], kpi_definitions: ['profiles_count','sectors_covered'] },
          { template_key: 'mod_analytics', template_name: 'Analytics & BI Premium', category: 'module', target_module: 'analytics', sections: ['cross_module_kpis','trend_analysis','predictive_insights','data_quality'], kpi_definitions: ['total_records','data_coverage','modules_active'] },
        ];

        for (const tpl of templates) {
          await supabase.from('erp_hr_report_templates').upsert({
            company_id,
            template_key: tpl.template_key,
            template_name: tpl.template_name,
            category: tpl.category,
            target_role: tpl.target_role || null,
            target_module: tpl.target_module || null,
            sections: tpl.sections,
            kpi_definitions: tpl.kpi_definitions,
            supported_formats: ['pdf', 'excel'],
            is_active: true,
          }, { onConflict: 'id' });
        }

        return jsonResponse({ success: true, data: { seeded: templates.length } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[hr-reporting-engine] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
