import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, company_id, params } = await req.json();
    console.log(`[erp-hr-premium-intelligence] Action: ${action}`);

    // === SEED DEMO DATA ===
    if (action === 'legal_seed_demo') {
      // Templates
      const templates = [
        {
          company_id, template_name: 'Contrato Indefinido Estándar', template_type: 'employment', category: 'general',
          jurisdiction: 'ES', version: 1, status: 'active',
          content_template: {
            sections: [
              { title: 'Datos del Empleador', content: 'La empresa {{company_name}}, con CIF {{company_cif}}...' },
              { title: 'Datos del Trabajador', content: 'D./Dña. {{employee_name}}, con DNI {{employee_dni}}...' },
              { title: 'Objeto del Contrato', content: 'Prestación de servicios como {{job_title}} en el departamento de {{department}}...' },
              { title: 'Retribución', content: 'Salario bruto anual de {{salary}}€, distribuido en {{pay_periods}} pagas...' },
              { title: 'Jornada', content: 'Jornada {{work_schedule}} de {{hours_per_week}} horas semanales...' },
              { title: 'Período de Prueba', content: 'Se establece un período de prueba de {{probation_months}} meses...' },
            ]
          },
          required_variables: ['company_name', 'company_cif', 'employee_name', 'employee_dni', 'job_title', 'salary', 'start_date'],
          optional_variables: ['department', 'work_schedule', 'hours_per_week', 'probation_months', 'pay_periods'],
          applicable_regulations: ['ET_art8', 'ET_art15', 'RD_2720_1998'],
          approval_required: true, usage_count: 24,
        },
        {
          company_id, template_name: 'Contrato Temporal por Obra', template_type: 'employment', category: 'temporary',
          jurisdiction: 'ES', version: 2, status: 'active',
          content_template: { sections: [
            { title: 'Causa de Temporalidad', content: 'La contratación temporal se justifica por {{temporary_reason}}...' },
            { title: 'Duración', content: 'Desde {{start_date}} hasta {{end_date}} o finalización de la obra...' },
          ]},
          required_variables: ['employee_name', 'temporary_reason', 'start_date'],
          optional_variables: ['end_date', 'project_name'],
          applicable_regulations: ['ET_art15', 'RD_Ley_32_2021'],
          approval_required: true, usage_count: 12,
        },
        {
          company_id, template_name: 'Acuerdo de Confidencialidad (NDA)', template_type: 'nda', category: 'general',
          jurisdiction: 'ES', version: 1, status: 'active',
          content_template: { sections: [
            { title: 'Información Confidencial', content: 'Se considera información confidencial toda aquella...' },
            { title: 'Obligaciones', content: 'El firmante se compromete a no divulgar, copiar o utilizar...' },
            { title: 'Duración', content: 'Las obligaciones de confidencialidad se mantendrán durante {{nda_duration_years}} años...' },
          ]},
          required_variables: ['employee_name', 'nda_duration_years'],
          applicable_regulations: ['CC_art1255', 'LOPDGDD'],
          approval_required: false, usage_count: 18,
        },
        {
          company_id, template_name: 'Carta de Despido Objetivo', template_type: 'termination', category: 'general',
          jurisdiction: 'ES', version: 1, status: 'active',
          content_template: { sections: [
            { title: 'Causa Objetiva', content: 'Se procede al despido objetivo por {{termination_reason}}...' },
            { title: 'Indemnización', content: 'Se pone a disposición la indemnización de {{severance_amount}}€...' },
            { title: 'Preaviso', content: 'Se concede un preaviso de {{notice_days}} días...' },
          ]},
          required_variables: ['employee_name', 'termination_reason', 'severance_amount', 'effective_date'],
          applicable_regulations: ['ET_art52', 'ET_art53'],
          approval_required: true, usage_count: 5,
        },
      ];
      await supabase.from('erp_hr_legal_templates').insert(templates as any);

      // Clauses
      const clausesData = [
        { company_id, clause_name: 'Cláusula de No Competencia Post-contractual', clause_type: 'optional', category: 'non_compete', content: 'El trabajador se compromete a no prestar servicios en empresas competidoras durante un período de {{months}} meses tras la finalización del contrato, percibiendo como compensación económica adecuada el {{percentage}}% de su salario bruto anual.', legal_basis: 'ET art. 21.2', risk_level: 'high', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['competencia', 'restricción'] },
        { company_id, clause_name: 'Protección de Datos Personales', clause_type: 'mandatory', category: 'data_protection', content: 'En cumplimiento del RGPD y la LOPDGDD, el trabajador consiente el tratamiento de sus datos personales para los fines derivados de la relación laboral. El responsable del tratamiento es la empresa, pudiendo ejercer los derechos ARCO-POL.', legal_basis: 'RGPD Art. 6, LOPDGDD Art. 11', risk_level: 'low', is_mandatory: true, is_negotiable: false, applies_to_types: ['employment', 'nda', 'freelance'], tags: ['gdpr', 'lopdgdd', 'datos'] },
        { company_id, clause_name: 'Propiedad Intelectual', clause_type: 'standard', category: 'ip', content: 'Todas las creaciones, invenciones, obras y desarrollos realizados por el trabajador durante la vigencia del contrato y en el marco de su actividad laboral serán propiedad exclusiva de la empresa.', legal_basis: 'LPI Art. 51, LP Art. 15', risk_level: 'medium', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['ip', 'propiedad', 'invenciones'] },
        { company_id, clause_name: 'Período de Prueba', clause_type: 'standard', category: 'probation', content: 'Se establece un período de prueba de {{duration}}, durante el cual cualquiera de las partes podrá dar por resuelto el contrato sin necesidad de preaviso y sin derecho a indemnización.', legal_basis: 'ET Art. 14', risk_level: 'low', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['prueba', 'inicio'] },
        { company_id, clause_name: 'Teletrabajo y Desconexión Digital', clause_type: 'optional', category: 'remote_work', content: 'El trabajador podrá prestar servicios en modalidad de teletrabajo según lo establecido en el Acuerdo Individual de Trabajo a Distancia, conforme a la Ley 10/2021. Se garantiza el derecho a la desconexión digital fuera del horario laboral.', legal_basis: 'Ley 10/2021, LOPDGDD Art. 88', risk_level: 'low', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['teletrabajo', 'remoto', 'desconexión'] },
        { company_id, clause_name: 'Cláusula de Permanencia', clause_type: 'conditional', category: 'general', content: 'En contraprestación a la formación especializada recibida valorada en {{training_cost}}€, el trabajador se compromete a permanecer en la empresa durante un mínimo de {{months}} meses. El incumplimiento generará la obligación de restituir la parte proporcional.', legal_basis: 'ET Art. 21.4', risk_level: 'high', is_mandatory: false, is_negotiable: true, applies_to_types: ['employment'], tags: ['permanencia', 'formación'] },
        { company_id, clause_name: 'Cláusula de Confidencialidad', clause_type: 'mandatory', category: 'confidentiality', content: 'El trabajador se obliga a mantener estricta confidencialidad sobre toda información a la que tenga acceso por razón de su cargo, tanto durante la vigencia del contrato como una vez finalizado éste, sin limitación temporal salvo que la información pase a ser de dominio público.', legal_basis: 'ET Art. 5.d, CC Art. 1258', risk_level: 'medium', is_mandatory: true, is_negotiable: false, applies_to_types: ['employment', 'nda', 'freelance'], tags: ['confidencialidad', 'secreto'] },
      ];
      await supabase.from('erp_hr_legal_clauses').insert(clausesData as any);

      // Sample contracts
      const contractsData = [
        { company_id, contract_number: 'CTR-2026-001', contract_type: 'employment', status: 'active', employee_name: 'María García López', compliance_score: 95, effective_date: '2026-01-15', variables_used: { salary: 35000, job_title: 'Analista Senior' }, compliance_issues: [] },
        { company_id, contract_number: 'CTR-2026-002', contract_type: 'employment', status: 'draft', employee_name: 'Carlos Rodríguez Martín', compliance_score: 72, variables_used: { salary: 42000, job_title: 'Tech Lead' }, compliance_issues: [{ issue: 'Falta cláusula GDPR', severity: 'high' }] },
        { company_id, contract_number: 'CTR-2026-003', contract_type: 'nda', status: 'signed', employee_name: 'Ana Fernández Ruiz', compliance_score: 100, effective_date: '2026-02-01', expiration_date: '2028-02-01', compliance_issues: [] },
      ];
      await supabase.from('erp_hr_legal_contracts').insert(contractsData as any);

      return json({ success: true, data: { message: 'Legal Engine demo data seeded' } });
    }

    // === AI ACTIONS ===
    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'ai_generate_contract') {
      systemPrompt = `Eres un abogado laboralista español experto en redacción de contratos conforme al Estatuto de los Trabajadores (ET), RD 2720/1998, y normativa laboral vigente.
Genera un contrato laboral completo basado en los parámetros proporcionados.

FORMATO JSON estricto:
{
  "contract_title": "string",
  "sections": [{ "title": "string", "content": "string", "legal_basis": "string" }],
  "mandatory_clauses_included": ["string"],
  "optional_clauses_recommended": ["string"],
  "compliance_notes": ["string"],
  "risk_warnings": [{ "warning": "string", "severity": "high|medium|low", "recommendation": "string" }],
  "regulatory_references": ["string"],
  "summary": "string"
}`;
      userPrompt = `Genera contrato con estos parámetros: ${JSON.stringify(params)}`;

    } else if (action === 'ai_legal_compliance') {
      systemPrompt = `Eres un auditor de compliance laboral español experto en ET, GDPR/LOPDGDD, Ley 10/2021 (teletrabajo), RD-Ley 32/2021 (reforma laboral), y normativa de prevención de riesgos.
Analiza el estado de compliance documental de la organización.

FORMATO JSON estricto:
{
  "overall_compliance_score": 0-100,
  "regulatory_coverage": { "et_compliance": 0-100, "gdpr_compliance": 0-100, "prl_compliance": 0-100, "remote_work_compliance": 0-100 },
  "missing_documents": [{ "document": "string", "regulation": "string", "urgency": "critical|high|medium|low", "deadline": "string" }],
  "clause_gaps": [{ "clause_type": "string", "affected_contracts": number, "risk": "string" }],
  "template_recommendations": [{ "template": "string", "reason": "string", "priority": "high|medium|low" }],
  "action_plan": [{ "priority": 1, "action": "string", "deadline": "string", "responsible": "string" }],
  "executive_summary": "string"
}`;
      userPrompt = `Analiza compliance documental: templates=${params?.templates_count || 0}, clauses=${params?.clauses_count || 0}, contracts=${params?.contracts_count || 0}. Detalles: ${JSON.stringify(params)}`;

    } else if (action === 'ai_clause_review') {
      systemPrompt = `Eres un abogado laboralista español especializado en revisión de cláusulas contractuales.
Revisa las cláusulas proporcionadas y evalúa su validez legal, riesgos y mejoras.

FORMATO JSON estricto:
{
  "overall_quality_score": 0-100,
  "clause_reviews": [{ "clause_name": "string", "validity": "valid|questionable|invalid", "risk_level": "low|medium|high|critical", "issues": ["string"], "improvements": ["string"], "legal_references": ["string"] }],
  "missing_mandatory_clauses": [{ "clause_type": "string", "regulation": "string", "template_types_affected": ["string"] }],
  "redundancy_warnings": ["string"],
  "best_practices": ["string"],
  "summary": "string"
}`;
      userPrompt = `Revisa estas cláusulas: ${JSON.stringify(params)}`;

    } else {
      throw new Error(`Acción no soportada: ${action}`);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.6, max_tokens: 4000,
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
    console.error('[erp-hr-premium-intelligence] Error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
