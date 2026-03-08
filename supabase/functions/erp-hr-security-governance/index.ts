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

    // === AI ACTIONS ===
    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'ai_security_analysis') {
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
