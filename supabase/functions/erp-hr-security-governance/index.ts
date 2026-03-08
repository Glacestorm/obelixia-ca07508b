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
    console.log(`[erp-hr-security-governance] Action: ${action}`);

    // === NON-AI ACTIONS ===
    if (action === 'list_classifications') {
      const { data, error } = await supabase.from('erp_hr_data_classifications').select('*').eq('company_id', company_id).order('sensitivity_level', { ascending: false });
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'list_masking_rules') {
      const { data, error } = await supabase.from('erp_hr_masking_rules').select('*, erp_hr_data_classifications(field_path, classification)').eq('company_id', company_id).order('created_at', { ascending: false });
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'list_sod_rules') {
      const { data, error } = await supabase.from('erp_hr_sod_rules').select('*').eq('company_id', company_id).order('severity', { ascending: false });
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'list_violations') {
      const { data, error } = await supabase.from('erp_hr_sod_violations').select('*, erp_hr_sod_rules(name, severity)').eq('company_id', company_id).order('detected_at', { ascending: false }).limit(100);
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'list_incidents') {
      const { data, error } = await supabase.from('erp_hr_security_incidents').select('*').eq('company_id', company_id).order('detected_at', { ascending: false }).limit(100);
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'list_access_log') {
      const { data, error } = await supabase.from('erp_hr_data_access_log').select('*').eq('company_id', company_id).order('accessed_at', { ascending: false }).limit(200);
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === 'get_security_stats') {
      const [classRes, sodRes, violRes, incRes, accessRes] = await Promise.all([
        supabase.from('erp_hr_data_classifications').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
        supabase.from('erp_hr_sod_rules').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
        supabase.from('erp_hr_sod_violations').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('status', 'open'),
        supabase.from('erp_hr_security_incidents').select('id', { count: 'exact', head: true }).eq('company_id', company_id).in('status', ['open', 'investigating']),
        supabase.from('erp_hr_data_access_log').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
      ]);
      return json({
        success: true,
        data: {
          total_classifications: classRes.count || 0,
          active_sod_rules: sodRes.count || 0,
          open_violations: violRes.count || 0,
          active_incidents: incRes.count || 0,
          total_access_logs: accessRes.count || 0,
        }
      });
    }

    if (action === 'seed_demo') {
      // Seed minimal demo data
      const classifications = [
        { company_id, field_path: 'salary', table_name: 'erp_hr_employees', classification: 'restricted', sensitivity_level: 5, gdpr_category: 'financial', retention_days: 730, requires_encryption: true, description: 'Datos salariales - máxima restricción' },
        { company_id, field_path: 'dni', table_name: 'erp_hr_employees', classification: 'confidential', sensitivity_level: 4, gdpr_category: 'identity', retention_days: 1825, requires_consent: true, description: 'Documento de identidad' },
        { company_id, field_path: 'iban', table_name: 'erp_hr_employees', classification: 'restricted', sensitivity_level: 5, gdpr_category: 'financial', retention_days: 730, requires_encryption: true, description: 'Cuenta bancaria' },
        { company_id, field_path: 'email', table_name: 'erp_hr_employees', classification: 'internal', sensitivity_level: 2, gdpr_category: 'contact', retention_days: 365, description: 'Email corporativo' },
        { company_id, field_path: 'medical_report', table_name: 'erp_hr_safety', classification: 'top_secret', sensitivity_level: 5, gdpr_category: 'health', retention_days: 3650, requires_consent: true, requires_encryption: true, legal_basis: 'Art. 9.2.b GDPR - Obligaciones laborales', description: 'Informes médicos PRL' },
      ];

      const { data: classData } = await supabase.from('erp_hr_data_classifications').insert(classifications).select();

      // Masking rules
      const maskingRules = [
        { company_id, field_path: 'salary', table_name: 'erp_hr_employees', masking_type: 'redact', masking_pattern: '***,**€', visible_to_roles: ['hr_admin', 'cfo'], applies_to_export: true },
        { company_id, field_path: 'dni', table_name: 'erp_hr_employees', masking_type: 'partial', masking_pattern: '****1234A', visible_to_roles: ['hr_admin'], applies_to_export: true },
        { company_id, field_path: 'iban', table_name: 'erp_hr_employees', masking_type: 'partial', masking_pattern: 'ES** **** **** **89', visible_to_roles: ['hr_admin', 'payroll_admin'], applies_to_export: true },
      ];
      await supabase.from('erp_hr_masking_rules').insert(maskingRules);

      // SoD rules
      const sodRules = [
        { company_id, name: 'Nómina: Creación vs Aprobación', description: 'Quien crea una nómina no puede aprobarla', rule_type: 'exclusive', conflicting_permissions: ['payroll.create', 'payroll.approve'], severity: 'critical', regulatory_reference: 'SOX Section 404' },
        { company_id, name: 'RRHH: Contratación vs Alta Nómina', description: 'Quien contrata no debe dar de alta en nómina', rule_type: 'exclusive', conflicting_permissions: ['recruitment.hire', 'payroll.enroll'], severity: 'high', regulatory_reference: 'ISO 27001 A.6.1.2' },
        { company_id, name: 'Finiquito: Cálculo vs Pago', description: 'Segregación en proceso de finiquito', rule_type: 'exclusive', conflicting_permissions: ['settlement.calculate', 'settlement.pay'], severity: 'critical', regulatory_reference: 'SOX Section 302' },
      ];
      const { data: sodData } = await supabase.from('erp_hr_sod_rules').insert(sodRules).select();

      // Sample violation
      if (sodData?.[0]) {
        await supabase.from('erp_hr_sod_violations').insert({
          company_id, rule_id: sodData[0].id, violation_type: 'concurrent_permissions',
          conflicting_action_a: 'payroll.create', conflicting_action_b: 'payroll.approve',
          status: 'open', risk_score: 85, metadata: { detected_by: 'automated_scan' }
        });
      }

      // Sample incident
      await supabase.from('erp_hr_security_incidents').insert({
        company_id, incident_type: 'unauthorized_access', severity: 'medium',
        title: 'Acceso a datos salariales sin autorización', description: 'Se detectó un acceso a la tabla de salarios desde un rol sin permisos de lectura salarial.',
        affected_records: 3, affected_tables: ['erp_hr_employees'], source: 'automated', status: 'investigating',
        containment_actions: JSON.stringify([{ action: 'Sesión revocada', timestamp: new Date().toISOString() }])
      });

      return json({ success: true, data: { message: 'Demo data seeded', classifications: classData?.length || 0 } });
    }

    // === AI GOVERNANCE NON-AI ACTIONS ===
    if (action === 'ai_governance_stats') {
      const [modelsRes, highRes, decisionsRes, overridesRes, policiesRes, auditsRes] = await Promise.all([
        supabase.from('erp_hr_ai_model_registry').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
        supabase.from('erp_hr_ai_model_registry').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('risk_level', 'high'),
        supabase.from('erp_hr_ai_decisions').select('id', { count: 'exact', head: true }).eq('company_id', company_id),
        supabase.from('erp_hr_ai_decisions').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('human_override', true),
        supabase.from('erp_hr_ai_governance_policies').select('id', { count: 'exact', head: true }).eq('company_id', company_id).eq('is_active', true),
        supabase.from('erp_hr_ai_bias_audits').select('overall_fairness_score').eq('company_id', company_id).not('overall_fairness_score', 'is', null),
      ]);
      const scores = (auditsRes.data || []).map((a: any) => Number(a.overall_fairness_score));
      const avgFairness = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
      return json({ success: true, data: {
        total_models: modelsRes.count || 0, active_models: modelsRes.count || 0,
        high_risk_models: highRes.count || 0, total_decisions: decisionsRes.count || 0,
        overridden_decisions: overridesRes.count || 0, pending_audits: 0,
        active_policies: policiesRes.count || 0, avg_fairness_score: avgFairness,
      }});
    }

    if (action === 'ai_governance_seed') {
      // Seed sample decisions
      const { data: modelData } = await supabase.from('erp_hr_ai_model_registry').select('id, model_name').eq('company_id', company_id).limit(3);
      if (modelData && modelData.length > 0) {
        const decisions = [
          { company_id, model_id: modelData[0].id, decision_type: 'turnover_prediction', input_data: { employee_id: 'emp-001', tenure_months: 14, satisfaction: 3.2 }, output_data: { risk_score: 0.78, risk_level: 'high' }, confidence_score: 0.78, risk_level: 'high', explanation: 'Alto riesgo de rotación: baja satisfacción combinada con tenure < 18 meses', outcome_status: 'accepted', processing_time_ms: 1200 },
          { company_id, model_id: modelData[0].id, decision_type: 'turnover_prediction', input_data: { employee_id: 'emp-002', tenure_months: 48, satisfaction: 4.5 }, output_data: { risk_score: 0.12, risk_level: 'low' }, confidence_score: 0.92, risk_level: 'low', explanation: 'Bajo riesgo: alta satisfacción y tenure estable', outcome_status: 'accepted', processing_time_ms: 980 },
          { company_id, model_id: modelData[1]?.id || modelData[0].id, decision_type: 'salary_equity_check', input_data: { department: 'Engineering', role: 'Senior Developer' }, output_data: { gap_detected: true, gap_percentage: 8.3 }, confidence_score: 0.85, risk_level: 'medium', explanation: 'Brecha salarial de 8.3% detectada en rol Senior Developer por género', human_override: true, override_reason: 'Se validó manualmente y se confirmó ajuste pendiente en ciclo Q2', outcome_status: 'overridden', processing_time_ms: 2100 },
        ];
        await supabase.from('erp_hr_ai_decisions').insert(decisions as any);
      }
      return json({ success: true, data: { message: 'AI Governance demo data seeded' } });
    }

    // === AI ACTIONS ===
    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'ai_governance_analysis') {
      systemPrompt = `Eres un experto en gobernanza de IA, EU AI Act (Regulation 2024/1689), y ética algorítmica en RRHH.
Analiza la madurez de gobernanza IA de esta organización.

FORMATO JSON estricto:
{
  "governance_maturity": 0-100,
  "eu_ai_act_compliance": { "score": 0-100, "gaps": ["string"] },
  "model_risk_distribution": { "minimal": number, "limited": number, "high": number },
  "bias_risk_summary": { "models_at_risk": ["string"], "recommended_actions": ["string"] },
  "transparency_score": 0-100,
  "accountability_score": 0-100,
  "recommendations": [{ "priority": 1, "action": "string", "impact": "high|critical" }],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza gobernanza IA: ${JSON.stringify(params)}`;
    } else if (action === 'ai_bias_audit') {
      systemPrompt = `Eres un auditor de sesgo algorítmico especializado en RRHH y EU AI Act.
Ejecuta una auditoría de sesgo para el modelo indicado.

FORMATO JSON estricto:
{
  "protected_attributes": ["gender", "age", "ethnicity", "disability"],
  "fairness_metrics": { "demographic_parity": number, "equalized_odds": number, "calibration": number },
  "overall_fairness_score": 0-100,
  "bias_detected": boolean,
  "bias_details": { "attribute": "string", "metric": "string", "value": number, "threshold": number },
  "disparate_impact_ratios": { "gender": number, "age": number },
  "remediation_actions": [{ "action": "string", "priority": "high|medium|low", "expected_improvement": number }]
}`;
      userPrompt = `Audita sesgo del modelo: ${JSON.stringify(params)}`;
    } else if (action === 'fairness_seed_demo') {
      // Seed fairness demo data
      const metricsData = [
        { company_id, metric_name: 'Tasa de promoción por género', metric_type: 'promotion_rate', protected_attribute: 'gender', group_a_label: 'Mujeres', group_a_value: 12.5, group_b_label: 'Hombres', group_b_value: 18.3, disparate_impact_ratio: 0.68, four_fifths_compliant: false, department: 'Engineering' },
        { company_id, metric_name: 'Ratio salarial por género', metric_type: 'salary_ratio', protected_attribute: 'gender', group_a_label: 'Mujeres', group_a_value: 42500, group_b_label: 'Hombres', group_b_value: 48200, disparate_impact_ratio: 0.88, four_fifths_compliant: true, department: 'General' },
        { company_id, metric_name: 'Acceso formación por edad', metric_type: 'training_access', protected_attribute: 'age', group_a_label: '+50 años', group_a_value: 22, group_b_label: '<50 años', group_b_value: 45, disparate_impact_ratio: 0.49, four_fifths_compliant: false, department: 'General' },
        { company_id, metric_name: 'Tasa contratación diversidad', metric_type: 'hiring_rate', protected_attribute: 'ethnicity', group_a_label: 'Minorías', group_a_value: 8.2, group_b_label: 'Mayoría', group_b_value: 15.6, disparate_impact_ratio: 0.53, four_fifths_compliant: false },
        { company_id, metric_name: 'Bonus por antigüedad', metric_type: 'bonus_distribution', protected_attribute: 'tenure', group_a_label: '<2 años', group_a_value: 1200, group_b_label: '>2 años', group_b_value: 3400, disparate_impact_ratio: 0.35, four_fifths_compliant: false },
      ];
      await supabase.from('erp_hr_fairness_metrics').insert(metricsData);

      const casesData = [
        { company_id, case_number: 'JC-2026-001', case_type: 'pay_dispute', status: 'investigating', priority: 'high', title: 'Brecha salarial en departamento IT', description: 'Se detecta diferencia salarial >15% en mismo rol por género', department: 'IT', is_anonymous: false },
        { company_id, case_number: 'JC-2026-002', case_type: 'promotion_dispute', status: 'open', priority: 'medium', title: 'Sesgo en proceso de promoción Q1', description: 'Candidatas con mejores evaluaciones no promovidas frente a candidatos con evaluaciones inferiores', department: 'Sales' },
        { company_id, case_number: 'JC-2026-003', case_type: 'accommodation_request', status: 'resolved', priority: 'medium', title: 'Solicitud adaptación puesto - discapacidad', resolution: 'Puesto adaptado con equipamiento ergonómico y horario flexible', days_to_resolve: 12, department: 'Operations' },
      ];
      await supabase.from('erp_hr_justice_cases').insert(casesData);

      const plansData = [
        { company_id, plan_name: 'Plan Igualdad Retributiva 2026', plan_type: 'systemic', status: 'active', target_metric: 'salary_ratio', baseline_value: 0.88, target_value: 0.95, current_value: 0.90, progress_percentage: 28, budget: 125000, actions: [{ action: 'Auditoría salarial completa', status: 'completed' }, { action: 'Ajuste salarial fase 1', status: 'in_progress' }, { action: 'Política transparencia salarial', status: 'pending' }] },
        { company_id, plan_name: 'Formación Anti-Sesgo Hiring', plan_type: 'preventive', status: 'active', target_metric: 'hiring_rate', baseline_value: 0.53, target_value: 0.85, current_value: 0.62, progress_percentage: 45, budget: 35000, actions: [{ action: 'Training reclutadores', status: 'completed' }, { action: 'CV anonimizado', status: 'in_progress' }] },
      ];
      await supabase.from('erp_hr_equity_action_plans').insert(plansData as any);

      return json({ success: true, data: { message: 'Fairness demo data seeded' } });

    } else if (action === 'ai_fairness_analysis') {
      systemPrompt = `Eres un experto en equidad organizacional, justicia laboral, RD 902/2020 (igualdad retributiva), y Directiva UE 2023/970 (transparencia salarial).
Analiza la situación de equidad de la organización y genera un diagnóstico integral.

FORMATO JSON estricto:
{
  "overall_fairness_index": 0-100,
  "pay_equity_summary": { "gender_gap": number, "age_gap": number, "remediation_needed": boolean },
  "disparate_impact_alerts": [{ "metric": "string", "attribute": "string", "ratio": number, "description": "string", "severity": "high|critical" }],
  "intersectional_risks": [{ "groups": ["string"], "risk": "string", "recommendation": "string" }],
  "regulatory_compliance": { "rd_902_2020": { "score": 0-100, "gaps": ["string"] }, "eu_directive_2023_970": { "score": 0-100, "gaps": ["string"] } },
  "action_priorities": [{ "priority": 1, "action": "string", "impact": "high|critical", "expected_outcome": "string", "timeline": "string" }],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza la equidad organizacional: ${JSON.stringify(params)}`;

    } else if (action === 'ai_pay_equity_analysis') {
      systemPrompt = `Eres un auditor de equidad retributiva especializado en RD 902/2020 y la Directiva UE 2023/970 de transparencia salarial.
Genera un análisis de equidad retributiva para el tipo solicitado.

FORMATO JSON estricto:
{
  "overall_equity_score": 0-100,
  "gap_percentage": number,
  "affected_employees": number,
  "remediation_cost": number,
  "findings": [{ "category": "string", "finding": "string", "severity": "low|medium|high|critical", "affected_count": number }],
  "salary_bands_analysis": [{ "band": "string", "gap": number, "compliant": boolean }],
  "recommendations": [{ "action": "string", "priority": "high|medium|low", "cost_estimate": number, "timeline": "string" }],
  "legal_obligations": ["string"],
  "summary": "string"
}`;
      userPrompt = `Análisis de equidad retributiva tipo: ${params?.analysis_type || 'comprehensive'}. Contexto: ${JSON.stringify(params)}`;

    } else if (action === 'ai_security_analysis') {
      systemPrompt = `Eres un CISO experto en seguridad de RRHH enterprise, GDPR, LOPDGDD, ISO 27001 y SOX.
Analiza la postura de seguridad de la organización y genera un informe ejecutivo.

FORMATO JSON estricto:
{
  "overall_score": 0-100,
  "maturity_level": "initial|managed|defined|quantitatively_managed|optimizing",
  "risk_areas": [{ "area": "string", "risk_level": "low|medium|high|critical", "description": "string", "recommendation": "string" }],
  "data_protection_score": 0-100,
  "sod_compliance_score": 0-100,
  "access_control_score": 0-100,
  "incident_response_score": 0-100,
  "gdpr_compliance": { "score": 0-100, "gaps": ["string"] },
  "top_priorities": [{ "priority": 1, "action": "string", "impact": "high|critical", "effort": "low|medium|high" }],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza la seguridad de esta organización. Stats: ${JSON.stringify(params)}`;
    } else if (action === 'ai_sod_analysis') {
      systemPrompt = `Eres un auditor de Segregación de Funciones (SoD) especializado en RRHH.
Analiza las reglas SoD, violaciones y propón mejoras.

FORMATO JSON estricto:
{
  "sod_maturity": 0-100,
  "coverage_analysis": { "covered_processes": ["string"], "uncovered_gaps": ["string"] },
  "violation_trends": [{ "period": "string", "count": number, "trend": "up|down|stable" }],
  "recommended_rules": [{ "name": "string", "permissions": ["string"], "severity": "string", "rationale": "string" }],
  "risk_matrix": [{ "process": "string", "inherent_risk": "low|medium|high|critical", "residual_risk": "low|medium|high", "controls": ["string"] }],
  "summary": "string"
}`;
      userPrompt = `Analiza SoD con estas reglas y violaciones: ${JSON.stringify(params)}`;
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

    return json({ success: true, action, data: result, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[erp-hr-security-governance] Error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
