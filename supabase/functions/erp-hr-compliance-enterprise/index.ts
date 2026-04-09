import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

interface ComplianceEnterpriseRequest {
  action: 'get_dashboard' | 'list_policies' | 'upsert_policy' | 'list_audits' | 'upsert_audit' |
          'list_incidents' | 'upsert_incident' | 'list_training' | 'upsert_training' |
          'list_risk_assessments' | 'upsert_risk_assessment' | 'ai_risk_analysis' |
          'ai_gap_analysis' | 'seed_demo' | 'get_kpis';
  companyId: string;
  data?: Record<string, unknown>;
  id?: string;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  function jsonResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify({ ...data, timestamp: new Date().toISOString() }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, companyId, data, id } = await req.json() as ComplianceEnterpriseRequest;

    // Auth + tenant isolation via shared utility
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return jsonResponse(authResult.body, authResult.status);
    }
    const { userId, userClient, adminClient } = authResult;

    console.log(`[erp-hr-compliance-enterprise] Action: ${action}, Company: ${companyId}, User: ${userId}`);

    switch (action) {
      case 'get_dashboard': {
        const [policies, audits, incidents, training, risks, kpis] = await Promise.all([
          userClient.from('erp_hr_compliance_policies').select('*').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_audits').select('*').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_incidents').select('*').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_training').select('*').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_risk_assessments').select('*').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_kpis').select('*').eq('company_id', companyId).order('measured_at', { ascending: false }).limit(20),
        ]);
        return jsonResponse({ success: true, data: {
          policies: policies.data || [],
          audits: audits.data || [],
          incidents: incidents.data || [],
          training: training.data || [],
          riskAssessments: risks.data || [],
          kpis: kpis.data || [],
        }});
      }

      case 'list_policies': {
        const { data: rows, error } = await userClient.from('erp_hr_compliance_policies').select('*').eq('company_id', companyId).order('updated_at', { ascending: false });
        if (error) throw error;
        return jsonResponse({ success: true, data: rows });
      }

      case 'upsert_policy': {
        const payload = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        if (id) {
          const { error } = await userClient.from('erp_hr_compliance_policies').update(payload).eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await userClient.from('erp_hr_compliance_policies').insert([payload]);
          if (error) throw error;
        }
        return jsonResponse({ success: true });
      }

      case 'list_audits': {
        const { data: rows, error } = await userClient.from('erp_hr_compliance_audits').select('*').eq('company_id', companyId).order('planned_start', { ascending: false });
        if (error) throw error;
        return jsonResponse({ success: true, data: rows });
      }

      case 'upsert_audit': {
        const payload = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        if (id) {
          const { error } = await userClient.from('erp_hr_compliance_audits').update(payload).eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await userClient.from('erp_hr_compliance_audits').insert([payload]);
          if (error) throw error;
        }
        return jsonResponse({ success: true });
      }

      case 'list_incidents': {
        const { data: rows, error } = await userClient.from('erp_hr_compliance_incidents').select('*').eq('company_id', companyId).order('reported_at', { ascending: false });
        if (error) throw error;
        return jsonResponse({ success: true, data: rows });
      }

      case 'upsert_incident': {
        const payload = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        if (id) {
          const { error } = await userClient.from('erp_hr_compliance_incidents').update(payload).eq('id', id);
          if (error) throw error;
        } else {
          payload.incident_code = `INC-${Date.now().toString(36).toUpperCase()}`;
          const { error } = await userClient.from('erp_hr_compliance_incidents').insert([payload]);
          if (error) throw error;
        }
        return jsonResponse({ success: true });
      }

      case 'list_training': {
        const { data: rows, error } = await userClient.from('erp_hr_compliance_training').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
        if (error) throw error;
        return jsonResponse({ success: true, data: rows });
      }

      case 'upsert_training': {
        const payload = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        if (id) {
          const { error } = await userClient.from('erp_hr_compliance_training').update(payload).eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await userClient.from('erp_hr_compliance_training').insert([payload]);
          if (error) throw error;
        }
        return jsonResponse({ success: true });
      }

      case 'list_risk_assessments': {
        const { data: rows, error } = await userClient.from('erp_hr_compliance_risk_assessments').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
        if (error) throw error;
        return jsonResponse({ success: true, data: rows });
      }

      case 'upsert_risk_assessment': {
        const payload = { ...data, company_id: companyId, updated_at: new Date().toISOString() };
        if (id) {
          const { error } = await userClient.from('erp_hr_compliance_risk_assessments').update(payload).eq('id', id);
          if (error) throw error;
        } else {
          const { error } = await userClient.from('erp_hr_compliance_risk_assessments').insert([payload]);
          if (error) throw error;
        }
        return jsonResponse({ success: true });
      }

      case 'get_kpis': {
        const { data: rows, error } = await userClient.from('erp_hr_compliance_kpis').select('*').eq('company_id', companyId).order('measured_at', { ascending: false }).limit(30);
        if (error) throw error;
        return jsonResponse({ success: true, data: rows });
      }

      case 'ai_risk_analysis': {
        const [policies, incidents, audits] = await Promise.all([
          userClient.from('erp_hr_compliance_policies').select('title,status,risk_level,category').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_incidents').select('title,severity,status,category').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_audits').select('title,status,overall_score,critical_findings').eq('company_id', companyId),
        ]);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: `Eres un analista de riesgos de compliance enterprise especializado en normativa laboral española y europea (LOPDGDD, LISOS, ET, DORA, AI Act).

Analiza los datos de compliance de la empresa y genera un informe de riesgos.

FORMATO DE RESPUESTA (JSON estricto):
{
  "overallRiskScore": 0-100,
  "riskLevel": "low"|"medium"|"high"|"critical",
  "topRisks": [{"area": "string", "description": "string", "severity": "string", "probability": "string", "impact": "string", "mitigation": "string"}],
  "complianceGaps": [{"regulation": "string", "gap": "string", "urgency": "string", "recommendation": "string"}],
  "strengths": ["string"],
  "recommendations": [{"priority": 1, "action": "string", "deadline": "string", "responsible": "string"}],
  "regulatoryExposure": {"total": 0, "byRegulation": [{"name": "string", "exposure": 0, "status": "string"}]},
  "narrative": "string"
}` },
              { role: 'user', content: `Datos: Políticas: ${JSON.stringify(policies.data || [])}, Incidentes: ${JSON.stringify(incidents.data || [])}, Auditorías: ${JSON.stringify(audits.data || [])}` }
            ],
            temperature: 0.7, max_tokens: 3000,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
        return jsonResponse({ success: true, data: result });
      }

      case 'ai_gap_analysis': {
        const [policies, training, risks] = await Promise.all([
          userClient.from('erp_hr_compliance_policies').select('title,status,category,regulation_reference,review_date').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_training').select('title,regulation_area,completion_rate,status').eq('company_id', companyId),
          userClient.from('erp_hr_compliance_risk_assessments').select('assessment_name,risk_level,overall_risk_score,status').eq('company_id', companyId),
        ]);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: `Eres un auditor de compliance enterprise. Realiza un Gap Analysis completo.

FORMATO DE RESPUESTA (JSON estricto):
{
  "overallMaturity": 0-5,
  "maturityLevel": "initial"|"managed"|"defined"|"measured"|"optimizing",
  "gaps": [{"regulation": "string", "requirement": "string", "currentState": "string", "targetState": "string", "gap": "string", "priority": "high"|"medium"|"low", "effortEstimate": "string"}],
  "maturityByArea": [{"area": "string", "score": 0-5, "status": "string"}],
  "actionPlan": [{"phase": 1, "title": "string", "actions": ["string"], "timeline": "string"}],
  "trainingGaps": [{"area": "string", "currentCoverage": 0, "requiredCoverage": 100, "gap": 0}],
  "narrative": "string"
}` },
              { role: 'user', content: `Datos: Políticas: ${JSON.stringify(policies.data || [])}, Formación: ${JSON.stringify(training.data || [])}, Evaluaciones: ${JSON.stringify(risks.data || [])}` }
            ],
            temperature: 0.7, max_tokens: 3000,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
        return jsonResponse({ success: true, data: result });
      }

      case 'seed_demo': {
        // seed_demo stays on adminClient — DELETE ops lack RLS policies
        // Clean existing demo data
        await Promise.all([
          adminClient.from('erp_hr_compliance_policies').delete().eq('company_id', companyId),
          adminClient.from('erp_hr_compliance_audits').delete().eq('company_id', companyId),
          adminClient.from('erp_hr_compliance_incidents').delete().eq('company_id', companyId),
          adminClient.from('erp_hr_compliance_training').delete().eq('company_id', companyId),
          adminClient.from('erp_hr_compliance_risk_assessments').delete().eq('company_id', companyId),
          adminClient.from('erp_hr_compliance_kpis').delete().eq('company_id', companyId),
        ]);

        const now = new Date().toISOString();

        // Seed policies
        await adminClient.from('erp_hr_compliance_policies').insert([
          { company_id: companyId, code: 'POL-001', title: 'Protección de Datos Personales (LOPDGDD)', category: 'privacy', regulation_reference: 'LOPDGDD - Ley Orgánica 3/2018', status: 'active', version: '3.0', risk_level: 'high', effective_date: '2024-01-15', review_date: '2026-06-15', jurisdictions: ['ES', 'EU'], tags: ['RGPD', 'privacidad'] },
          { company_id: companyId, code: 'POL-002', title: 'Prevención de Riesgos Laborales', category: 'safety', regulation_reference: 'Ley 31/1995', status: 'active', version: '2.1', risk_level: 'high', effective_date: '2024-03-01', review_date: '2026-03-01', jurisdictions: ['ES'] },
          { company_id: companyId, code: 'POL-003', title: 'Igualdad Retributiva', category: 'equality', regulation_reference: 'RD 902/2020', status: 'active', version: '1.2', risk_level: 'medium', effective_date: '2024-06-01', review_date: '2026-12-01', jurisdictions: ['ES'] },
          { company_id: companyId, code: 'POL-004', title: 'Canal de Denuncias', category: 'whistleblower', regulation_reference: 'Ley 2/2023', status: 'active', version: '1.0', risk_level: 'high', effective_date: '2024-01-01', review_date: '2026-07-01', jurisdictions: ['ES', 'EU'] },
          { company_id: companyId, code: 'POL-005', title: 'Protocolo Desconexión Digital', category: 'labor', regulation_reference: 'Art. 88 LOPDGDD', status: 'active', version: '1.1', risk_level: 'low', effective_date: '2024-04-01', jurisdictions: ['ES'] },
          { company_id: companyId, code: 'POL-006', title: 'Código Ético y Conducta', category: 'ethics', status: 'active', version: '2.0', risk_level: 'medium', effective_date: '2024-01-01', jurisdictions: ['ES', 'EU'] },
          { company_id: companyId, code: 'POL-007', title: 'Compliance Penal (Art. 31bis CP)', category: 'criminal', regulation_reference: 'Art. 31bis Código Penal', status: 'review', version: '1.5', risk_level: 'critical', effective_date: '2023-06-01', review_date: '2026-04-01', jurisdictions: ['ES'] },
          { company_id: companyId, code: 'POL-008', title: 'Regulación IA en el Trabajo', category: 'ai_regulation', regulation_reference: 'EU AI Act 2024/1689', status: 'draft', version: '0.1', risk_level: 'high', effective_date: '2026-08-01', jurisdictions: ['EU'] },
        ]);

        // Seed audits
        await adminClient.from('erp_hr_compliance_audits').insert([
          { company_id: companyId, audit_type: 'internal', title: 'Auditoría LOPDGDD Q1 2026', scope: 'Tratamiento datos empleados', status: 'completed', planned_start: '2026-01-15', planned_end: '2026-02-15', actual_start: '2026-01-15', actual_end: '2026-02-10', findings_count: 3, critical_findings: 0, overall_score: 87.5, lead_auditor: 'DPO Interno' },
          { company_id: companyId, audit_type: 'external', title: 'Auditoría PRL Anual', scope: 'Evaluación riesgos centros trabajo', status: 'in_progress', planned_start: '2026-03-01', planned_end: '2026-03-31', actual_start: '2026-03-01', lead_auditor: 'Bureau Veritas' },
          { company_id: companyId, audit_type: 'internal', title: 'Revisión Canal Denuncias', scope: 'Procedimientos y seguimiento', status: 'planned', planned_start: '2026-04-15', planned_end: '2026-05-15', lead_auditor: 'Compliance Officer' },
        ]);

        // Seed incidents
        await adminClient.from('erp_hr_compliance_incidents').insert([
          { company_id: companyId, incident_code: 'INC-2026-001', title: 'Brecha datos nóminas compartidas', category: 'data_breach', severity: 'high', status: 'resolved', description: 'Archivo de nóminas enviado a destinatario incorrecto', resolution: 'Notificación AEPD y formación reforzada', reported_at: '2026-01-20', resolved_at: '2026-01-25', affected_regulations: ['LOPDGDD', 'RGPD'] },
          { company_id: companyId, incident_code: 'INC-2026-002', title: 'Registro horario incompleto Dpto. Comercial', category: 'violation', severity: 'medium', status: 'in_progress', description: '15% empleados comerciales sin fichaje completo en febrero', affected_regulations: ['Art. 34.9 ET'], reported_at: '2026-03-01' },
          { company_id: companyId, incident_code: 'INC-2026-003', title: 'Denuncia acoso laboral', category: 'harassment', severity: 'critical', status: 'investigating', description: 'Denuncia anónima a través del canal ético', affected_regulations: ['Ley 15/2022', 'Protocolo Acoso'], reported_at: '2026-02-15' },
        ]);

        // Seed training
        await adminClient.from('erp_hr_compliance_training').insert([
          { company_id: companyId, title: 'LOPDGDD y RGPD para empleados', regulation_area: 'privacy', training_type: 'mandatory', format: 'online', duration_hours: 4, status: 'active', completion_rate: 78, total_enrolled: 50, total_completed: 39, certification_required: true, recurrence_months: 12, target_roles: ['all'] },
          { company_id: companyId, title: 'PRL: Riesgos específicos por puesto', regulation_area: 'safety', training_type: 'mandatory', format: 'hybrid', duration_hours: 8, status: 'active', completion_rate: 92, total_enrolled: 50, total_completed: 46, certification_required: true, recurrence_months: 24, target_roles: ['all'] },
          { company_id: companyId, title: 'Canal de Denuncias: Uso y garantías', regulation_area: 'whistleblower', training_type: 'mandatory', format: 'online', duration_hours: 2, status: 'active', completion_rate: 65, total_enrolled: 50, total_completed: 33, target_roles: ['all'] },
          { company_id: companyId, title: 'Compliance Penal para directivos', regulation_area: 'criminal', training_type: 'mandatory', format: 'presential', duration_hours: 6, status: 'active', completion_rate: 100, total_enrolled: 8, total_completed: 8, certification_required: true, target_roles: ['director', 'manager'] },
          { company_id: companyId, title: 'EU AI Act: Implicaciones laborales', regulation_area: 'ai_regulation', training_type: 'recommended', format: 'online', duration_hours: 3, status: 'planned', completion_rate: 0, total_enrolled: 0, total_completed: 0, deadline: '2026-08-01', target_roles: ['hr', 'tech', 'manager'] },
        ]);

        // Seed risk assessments
        await adminClient.from('erp_hr_compliance_risk_assessments').insert([
          { company_id: companyId, assessment_name: 'Evaluación Riesgos Compliance Q1 2026', assessment_type: 'periodic', status: 'completed', overall_risk_score: 35, risk_level: 'medium', assessor: 'Compliance Officer', completed_at: '2026-02-28', next_review_date: '2026-05-31',
            risk_areas: [
              { area: 'Protección de Datos', score: 25, level: 'low', controls: 12, effective: 11 },
              { area: 'Prevención Riesgos', score: 30, level: 'medium', controls: 18, effective: 15 },
              { area: 'Igualdad y No Discriminación', score: 40, level: 'medium', controls: 8, effective: 5 },
              { area: 'Compliance Penal', score: 45, level: 'medium', controls: 15, effective: 10 },
              { area: 'Canal de Denuncias', score: 20, level: 'low', controls: 6, effective: 5 },
            ],
            mitigation_plan: [
              { action: 'Reforzar formación igualdad', deadline: '2026-04-30', status: 'in_progress' },
              { action: 'Actualizar mapa riesgos penales', deadline: '2026-05-15', status: 'pending' },
            ]
          },
        ]);

        // Seed KPIs
        await adminClient.from('erp_hr_compliance_kpis').insert([
          { company_id: companyId, kpi_name: 'Tasa Cumplimiento Formación', category: 'training', current_value: 78, target_value: 95, unit: '%', trend: 'up', period: '2026-Q1' },
          { company_id: companyId, kpi_name: 'Incidentes Abiertos', category: 'incidents', current_value: 2, target_value: 0, unit: 'count', trend: 'stable', period: '2026-Q1' },
          { company_id: companyId, kpi_name: 'Score Auditoría LOPDGDD', category: 'audits', current_value: 87.5, target_value: 90, unit: '%', trend: 'up', period: '2026-Q1' },
          { company_id: companyId, kpi_name: 'Políticas Vigentes', category: 'policies', current_value: 6, target_value: 8, unit: 'count', trend: 'up', period: '2026-Q1' },
          { company_id: companyId, kpi_name: 'Nivel Riesgo Global', category: 'risk', current_value: 35, target_value: 25, unit: 'score', trend: 'down', period: '2026-Q1' },
          { company_id: companyId, kpi_name: 'Tiempo Medio Resolución Incidentes', category: 'incidents', current_value: 5, target_value: 3, unit: 'days', trend: 'stable', period: '2026-Q1' },
        ]);

        return jsonResponse({ success: true, message: 'Demo data seeded successfully' });
      }

      default:
        return jsonResponse({ success: false, error: `Unsupported action: ${action}` }, 400);
    }

  } catch (error) {
    console.error('[erp-hr-compliance-enterprise] Error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500);
  }
});
