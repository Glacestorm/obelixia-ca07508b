/**
 * Edge Function: hr-regulatory-reporting
 * Regulatory report generation with AI content and evidence collection.
 *
 * S6.3B: Migrated to validateTenantAccess + userClient. adminClient: 0.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

const REGULATORY_TEMPLATES = [
  { template_key: 'reg_equality_plan', template_name: 'Plan de Igualdad', regulatory_framework: 'equality_plan', legal_basis: ['RD 901/2020', 'Ley Orgánica 3/2007', 'RD 902/2020'], sections: ['executive_summary', 'legal_framework', 'workforce_diagnosis', 'gender_pay_gap', 'job_classification', 'recruitment_analysis', 'training_access', 'promotion_equality', 'work_life_balance', 'prevention_harassment', 'action_plan', 'monitoring_indicators'], kpi_definitions: ['gender_ratio', 'pay_gap_percentage', 'promotion_gap', 'training_hours_gap', 'part_time_gender_ratio', 'management_gender_ratio'], target_module: 'fairness' },
  { template_key: 'reg_salary_audit', template_name: 'Auditoría Retributiva', regulatory_framework: 'salary_audit', legal_basis: ['RD 902/2020', 'Art. 28.2 ET'], sections: ['executive_summary', 'legal_framework', 'salary_system_evaluation', 'job_valuation', 'pay_gap_analysis_by_category', 'pay_gap_analysis_by_level', 'base_salary_comparison', 'complements_analysis', 'variable_pay_analysis', 'risk_findings', 'action_plan', 'monitoring'], kpi_definitions: ['overall_pay_gap', 'base_salary_gap', 'total_compensation_gap', 'gap_by_category', 'gap_by_level', 'affected_employees'], target_module: 'fairness' },
  { template_key: 'reg_pay_gap_report', template_name: 'Informe de Brecha Salarial', regulatory_framework: 'pay_gap', legal_basis: ['RD 902/2020', 'Directiva (UE) 2023/970'], sections: ['executive_summary', 'methodology', 'overall_gap', 'gap_by_department', 'gap_by_role', 'gap_by_seniority', 'intersectional_analysis', 'trend_comparison', 'benchmarks', 'recommendations'], kpi_definitions: ['mean_pay_gap', 'median_pay_gap', 'gap_by_quartile', 'bonus_gap'], target_module: 'fairness' },
  { template_key: 'reg_gdpr_lopdgdd', template_name: 'GDPR / LOPDGDD Compliance Report', regulatory_framework: 'gdpr_lopdgdd', legal_basis: ['RGPD (UE) 2016/679', 'LOPDGDD 3/2018'], sections: ['executive_summary', 'legal_framework', 'data_inventory', 'lawful_basis', 'data_protection_measures', 'access_controls', 'data_masking_coverage', 'consent_management', 'data_breach_procedures', 'dpo_designation', 'international_transfers', 'data_subject_rights', 'findings', 'action_plan'], kpi_definitions: ['data_masking_coverage', 'access_log_events', 'sensitive_fields_protected', 'consent_coverage'], target_module: 'security' },
  { template_key: 'reg_dpia', template_name: 'DPIA — Evaluación de Impacto', regulatory_framework: 'dpia', legal_basis: ['Art. 35 RGPD', 'LOPDGDD'], sections: ['executive_summary', 'processing_description', 'necessity_assessment', 'risk_identification', 'risk_evaluation', 'ai_systems_impact', 'mitigation_measures', 'residual_risk', 'dpo_opinion', 'monitoring_plan'], kpi_definitions: ['risk_score', 'high_risk_processes', 'mitigated_risks', 'residual_risk_level'], target_module: 'security' },
  { template_key: 'reg_eu_ai_act', template_name: 'EU AI Act — Conformity Summary', regulatory_framework: 'eu_ai_act', legal_basis: ['Reglamento (UE) 2024/1689'], sections: ['executive_summary', 'legal_framework', 'ai_systems_inventory', 'risk_classification', 'high_risk_assessment', 'transparency_obligations', 'human_oversight', 'data_governance', 'bias_audits', 'technical_documentation', 'conformity_declaration', 'monitoring_plan'], kpi_definitions: ['ai_models_count', 'high_risk_models', 'bias_alerts', 'compliance_score', 'human_oversight_coverage'], target_module: 'ai_governance' },
  { template_key: 'reg_security_sod', template_name: 'Informe de Security & SoD', regulatory_framework: 'security_sod', legal_basis: ['ISO 27001', 'SOX', 'RGPD Art. 32'], sections: ['executive_summary', 'security_posture', 'access_control_review', 'sod_matrix', 'sod_violations', 'data_masking_status', 'privileged_access', 'audit_trail_review', 'incident_summary', 'recommendations'], kpi_definitions: ['sod_rules_count', 'sod_violations', 'masking_coverage', 'access_events', 'privileged_users'], target_module: 'security' },
  { template_key: 'reg_labor_compliance', template_name: 'Informe de Compliance Laboral', regulatory_framework: 'labor_compliance', legal_basis: ['ET', 'LPRL 31/1995', 'LISOS'], sections: ['executive_summary', 'legal_framework', 'frameworks_status', 'checklist_completion', 'audit_findings', 'critical_gaps', 'remediation_status', 'training_compliance', 'health_safety', 'working_time', 'recommendations'], kpi_definitions: ['compliance_score', 'frameworks_count', 'critical_findings', 'overdue_items', 'remediation_rate'], target_module: 'compliance' },
  { template_key: 'reg_cnae_sector', template_name: 'Informe Sectorial CNAE', regulatory_framework: 'cnae_sector', legal_basis: ['Normativa sectorial aplicable'], sections: ['executive_summary', 'sector_profile', 'regulatory_obligations', 'sector_benchmarks', 'risk_map', 'compliance_gaps', 'market_trends', 'recommendations'], kpi_definitions: ['sector_risk_score', 'obligations_count', 'compliance_gaps', 'benchmark_position'], target_module: 'cnae' },
  { template_key: 'reg_internal_audit', template_name: 'Auditoría Interna HR Premium', regulatory_framework: 'internal_audit', legal_basis: ['Política interna', 'ISO 19011'], sections: ['executive_summary', 'audit_scope', 'methodology', 'modules_reviewed', 'data_quality_assessment', 'security_review', 'compliance_review', 'fairness_review', 'ai_governance_review', 'findings_summary', 'risk_matrix', 'action_plan', 'follow_up'], kpi_definitions: ['modules_audited', 'findings_count', 'critical_findings', 'data_coverage', 'overall_score'], target_module: 'analytics' },
];

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const { action, company_id, params } = await req.json();

    // S6.3B: Standard auth gate
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userId, userClient: supabase } = authResult;

    // Rate limit expensive generation actions
    if (action === 'generate_regulatory_report') {
      const burstResult = checkBurstLimit(company_id || userId, { burstPerMinute: 5, perDay: 30, functionName: 'hr-regulatory-reporting' });
      if (!burstResult.allowed) {
        return rateLimitResponse(burstResult, corsHeaders);
      }
    }

    switch (action) {
      // === SEED REGULATORY TEMPLATES ===
      case 'seed_regulatory_templates': {
        let seeded = 0;
        for (const tpl of REGULATORY_TEMPLATES) {
          const { error } = await supabase.from('erp_hr_report_templates').upsert({
            company_id,
            template_key: tpl.template_key,
            template_name: tpl.template_name,
            description: `Informe regulatorio: ${tpl.template_name}`,
            category: 'regulatory',
            target_module: tpl.target_module,
            sections: tpl.sections,
            kpi_definitions: tpl.kpi_definitions,
            supported_formats: ['pdf', 'excel', 'csv'],
            is_regulatory: true,
            regulatory_framework: tpl.regulatory_framework,
            legal_basis: tpl.legal_basis,
            is_active: true,
            version: 1,
          }, { onConflict: 'id' });
          if (!error) seeded++;
        }
        return jsonResponse({ success: true, data: { seeded } });
      }

      // === LIST REGULATORY TEMPLATES ===
      case 'list_regulatory_templates': {
        const { data } = await supabase
          .from('erp_hr_report_templates')
          .select('*')
          .or(`company_id.eq.${company_id},company_id.is.null`)
          .eq('is_regulatory', true)
          .eq('is_active', true)
          .order('template_name');
        return jsonResponse({ success: true, data: data || [] });
      }

      // === GENERATE REGULATORY REPORT ===
      case 'generate_regulatory_report': {
        const startTime = Date.now();
        const { template_id, report_name, format, filters, period } = params || {};

        const { data: template } = await supabase
          .from('erp_hr_report_templates')
          .select('*')
          .eq('id', template_id)
          .single();

        if (!template) throw new Error('Template not found');

        const { data: report, error: insertErr } = await supabase
          .from('erp_hr_generated_reports')
          .insert({
            company_id,
            template_id,
            report_name: report_name || template.template_name,
            report_type: 'regulatory',
            format: format || 'pdf',
            status: 'generating',
            review_status: 'draft',
            regulatory_framework: template.regulatory_framework,
            report_category: 'regulatory',
            generated_by: userId,
            filters_applied: { ...filters, period },
            modules_included: [template.target_module],
            data_sources: {},
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        const dataSources: Record<string, { source: string; count: number; timestamp: string }> = {};
        const reportData: Record<string, unknown> = {};
        const evidenceItems: Array<{ evidence_type: string; source_module: string; title: string; data_snapshot: unknown; data_source_type: string }> = [];
        const now = new Date().toISOString();

        // Employees (always needed)
        const { data: empData, count: empCount } = await supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name, department, job_title, base_salary, gender, employment_status, hire_date, employee_category, seniority_level', { count: 'exact' })
          .eq('company_id', company_id)
          .eq('employment_status', 'active');
        reportData.employees = { data: empData || [], count: empCount };
        dataSources.employees = { source: (empCount || 0) > 0 ? 'real' : 'demo', count: empCount || 0, timestamp: now };

        const targetModule = template.target_module;

        if (targetModule === 'fairness' || targetModule === 'analytics') {
          const { data: eqData, count: eqCount } = await supabase
            .from('erp_hr_pay_equity_analyses')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id)
            .order('created_at', { ascending: false })
            .limit(20);
          reportData.pay_equity = { data: eqData || [], count: eqCount };
          dataSources.fairness = { source: (eqCount || 0) > 0 ? 'real' : 'demo', count: eqCount || 0, timestamp: now };

          const { data: metricsData, count: mCount } = await supabase
            .from('erp_hr_fairness_metrics')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.fairness_metrics = { data: metricsData || [], count: mCount };

          const { data: payrollData, count: pCount } = await supabase
            .from('erp_hr_payrolls')
            .select('employee_id, base_salary, gross_salary, net_salary, period_start, period_end', { count: 'exact' })
            .eq('company_id', company_id)
            .order('period_start', { ascending: false })
            .limit(500);
          reportData.payroll = { data: payrollData || [], count: pCount };
          dataSources.payroll = { source: (pCount || 0) > 0 ? 'real' : 'demo', count: pCount || 0, timestamp: now };

          evidenceItems.push({
            evidence_type: 'data_snapshot', source_module: 'fairness',
            title: 'Datos de equidad salarial',
            data_snapshot: { analyses: eqCount, metrics: mCount, payrolls: pCount },
            data_source_type: (eqCount || 0) > 0 ? 'real' : 'demo',
          });
        }

        if (targetModule === 'security' || targetModule === 'analytics') {
          const { data: maskData, count: maskCount } = await supabase
            .from('erp_hr_masking_rules')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.masking_rules = { data: maskData || [], count: maskCount };
          dataSources.security_masking = { source: (maskCount || 0) > 0 ? 'real' : 'demo', count: maskCount || 0, timestamp: now };

          const { data: sodData, count: sodCount } = await supabase
            .from('erp_hr_sod_rules')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.sod_rules = { data: sodData || [], count: sodCount };
          dataSources.security_sod = { source: (sodCount || 0) > 0 ? 'real' : 'demo', count: sodCount || 0, timestamp: now };

          const { count: accessCount } = await supabase
            .from('erp_hr_data_access_log')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', company_id);
          reportData.access_log_count = accessCount || 0;
          dataSources.access_log = { source: (accessCount || 0) > 0 ? 'real' : 'demo', count: accessCount || 0, timestamp: now };

          evidenceItems.push({
            evidence_type: 'data_snapshot', source_module: 'security',
            title: 'Datos de seguridad y control de accesos',
            data_snapshot: { masking_rules: maskCount, sod_rules: sodCount, access_events: accessCount },
            data_source_type: (maskCount || 0) > 0 ? 'real' : 'demo',
          });
        }

        if (targetModule === 'ai_governance' || targetModule === 'analytics') {
          const { data: modelsData, count: modelsCount } = await supabase
            .from('erp_hr_ai_model_registry')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.ai_models = { data: modelsData || [], count: modelsCount };
          dataSources.ai_governance = { source: (modelsCount || 0) > 0 ? 'real' : 'demo', count: modelsCount || 0, timestamp: now };

          const { data: biasData, count: biasCount } = await supabase
            .from('erp_hr_ai_bias_audits')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.bias_audits = { data: biasData || [], count: biasCount };

          evidenceItems.push({
            evidence_type: 'data_snapshot', source_module: 'ai_governance',
            title: 'Inventario de modelos IA y auditorías de sesgo',
            data_snapshot: { models: modelsCount, bias_audits: biasCount },
            data_source_type: (modelsCount || 0) > 0 ? 'real' : 'demo',
          });
        }

        if (targetModule === 'compliance' || targetModule === 'analytics') {
          const { data: fwData, count: fwCount } = await supabase
            .from('erp_hr_compliance_frameworks')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.compliance_frameworks = { data: fwData || [], count: fwCount };
          dataSources.compliance = { source: (fwCount || 0) > 0 ? 'real' : 'demo', count: fwCount || 0, timestamp: now };

          const { data: checkData, count: checkCount } = await supabase
            .from('erp_hr_compliance_checklist')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.compliance_checklist = { data: checkData || [], count: checkCount };

          evidenceItems.push({
            evidence_type: 'data_snapshot', source_module: 'compliance',
            title: 'Estado de marcos de cumplimiento',
            data_snapshot: { frameworks: fwCount, checklist_items: checkCount },
            data_source_type: (fwCount || 0) > 0 ? 'real' : 'demo',
          });
        }

        if (targetModule === 'legal' || targetModule === 'analytics') {
          const { data: contractsData, count: cCount } = await supabase
            .from('erp_hr_legal_contracts')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id)
            .limit(100);
          reportData.legal_contracts = { data: contractsData || [], count: cCount };
          dataSources.legal = { source: (cCount || 0) > 0 ? 'real' : 'demo', count: cCount || 0, timestamp: now };
        }

        if (targetModule === 'cnae') {
          const { data: cnaeData, count: cnaeCount } = await supabase
            .from('erp_hr_cnae_profiles')
            .select('*', { count: 'exact' })
            .eq('company_id', company_id);
          reportData.cnae_profiles = { data: cnaeData || [], count: cnaeCount };
          dataSources.cnae = { source: (cnaeCount || 0) > 0 ? 'real' : 'demo', count: cnaeCount || 0, timestamp: now };
        }

        // === Generate AI regulatory content ===
        let aiContent: Record<string, string> = {};
        const hasNonRealData = Object.values(dataSources).some(ds => ds.source !== 'real');
        const disclaimer = hasNonRealData
          ? 'AVISO: Este informe contiene secciones basadas en datos de demostración o derivados. Las secciones con datos no reales están identificadas con su origen. Para un informe regulatorio oficial, asegúrese de que todos los datos sean reales y estén verificados.'
          : null;

        if (LOVABLE_API_KEY) {
          try {
            const fw = template.regulatory_framework;
            const legalBasis = (template.legal_basis || []).join(', ');
            const dataOverview = Object.entries(dataSources).map(([k, v]) => `${k}: ${v.count} registros (${v.source})`).join('; ');

            const prompt = `Genera un informe regulatorio profesional en español para: "${template.template_name}".

BASE LEGAL: ${legalBasis}
MARCO REGULATORIO: ${fw}
DATOS DISPONIBLES: ${dataOverview}
EMPLEADOS ACTIVOS: ${empCount || 0}
EMPRESA: ID ${company_id}
PERIODO: ${(params?.period) || 'Último ejercicio'}

SECCIONES REQUERIDAS: ${template.sections.join(', ')}

INSTRUCCIONES:
- Genera contenido profesional y ejecutivo para cada sección
- Usa los datos reales proporcionados cuando estén disponibles
- Indica claramente cuando una sección se basa en datos demo/estimados
- Incluye hallazgos concretos, riesgos y recomendaciones
- Formato formal apto para presentación a dirección, auditoría o regulador
- Incluye métricas cuantitativas cuando los datos lo permitan

FORMATO DE RESPUESTA (JSON estricto):
{
  "executive_summary": "string (3-5 párrafos)",
  "sections": [
    {
      "id": "string",
      "title": "string",
      "content": "string (1-3 párrafos por sección)",
      "data_source": "real | demo | derived",
      "metrics": [{"label": "string", "value": "string"}]
    }
  ],
  "findings": [
    {"severity": "critical | high | medium | low", "description": "string", "recommendation": "string"}
  ],
  "overall_risk_level": "low | medium | high | critical",
  "compliance_score": 0-100
}`;

            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 4000,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const raw = aiData.choices?.[0]?.message?.content || '';
              try {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (jsonMatch) aiContent = JSON.parse(jsonMatch[0]);
              } catch { aiContent = { executive_summary: raw }; }
            }
          } catch (e) {
            console.error('AI regulatory content error:', e);
          }
        }

        const generationTime = Date.now() - startTime;

        // Save evidence
        for (const ev of evidenceItems) {
          await supabase.from('erp_hr_regulatory_report_evidence').insert({
            report_id: report!.id,
            company_id,
            ...ev,
          });
        }

        // Update report
        await supabase
          .from('erp_hr_generated_reports')
          .update({
            status: 'completed',
            review_status: 'draft',
            data_sources: dataSources,
            content_snapshot: {
              ...reportData,
              ai_content: aiContent,
              legal_basis: template.legal_basis,
              regulatory_framework: template.regulatory_framework,
              template_version: template.version,
            },
            disclaimer,
            generation_time_ms: generationTime,
            completed_at: now,
            metadata: {
              template_version: template.version,
              ai_generated: Object.keys(aiContent).length > 0,
              evidence_count: evidenceItems.length,
              has_disclaimer: !!disclaimer,
            },
          })
          .eq('id', report!.id);

        // Audit trail
        await supabase.from('erp_hr_regulatory_report_reviews').insert({
          report_id: report!.id,
          company_id,
          reviewer_id: userId,
          action: 'generate',
          new_status: 'draft',
          comments: `Informe generado automáticamente. ${evidenceItems.length} evidencias. ${generationTime}ms.`,
        });

        return jsonResponse({
          success: true,
          data: {
            report_id: report!.id,
            status: 'completed',
            review_status: 'draft',
            data_sources: dataSources,
            generation_time_ms: generationTime,
            evidence_count: evidenceItems.length,
            has_disclaimer: !!disclaimer,
          },
        });
      }

      // === UPDATE REVIEW STATUS ===
      case 'update_review_status': {
        const { report_id, new_status, comments } = params || {};
        const validStatuses = ['draft', 'generated', 'reviewed', 'approved', 'rejected', 'archived'];
        if (!validStatuses.includes(new_status)) throw new Error(`Invalid status: ${new_status}`);

        const { data: currentReport } = await supabase
          .from('erp_hr_generated_reports')
          .select('review_status')
          .eq('id', report_id)
          .eq('company_id', company_id)
          .single();

        const updateFields: Record<string, unknown> = { review_status: new_status };
        if (new_status === 'reviewed') { updateFields.reviewed_by = userId; updateFields.reviewed_at = new Date().toISOString(); }
        if (new_status === 'approved') { updateFields.approved_by = userId; updateFields.approved_at = new Date().toISOString(); }

        await supabase.from('erp_hr_generated_reports').update(updateFields).eq('id', report_id).eq('company_id', company_id);

        await supabase.from('erp_hr_regulatory_report_reviews').insert({
          report_id,
          company_id,
          reviewer_id: userId,
          action: new_status === 'approved' ? 'approve' : new_status === 'rejected' ? 'reject' : new_status === 'archived' ? 'archive' : 'review',
          previous_status: currentReport?.review_status || 'draft',
          new_status,
          comments: comments || null,
        });

        return jsonResponse({ success: true });
      }

      // === GET REVIEW HISTORY ===
      case 'get_review_history': {
        const { data } = await supabase
          .from('erp_hr_regulatory_report_reviews')
          .select('*')
          .eq('report_id', params?.report_id)
          .eq('company_id', company_id)
          .order('created_at', { ascending: false });
        return jsonResponse({ success: true, data: data || [] });
      }

      // === GET EVIDENCE ===
      case 'get_evidence': {
        const { data } = await supabase
          .from('erp_hr_regulatory_report_evidence')
          .select('*')
          .eq('report_id', params?.report_id)
          .eq('company_id', company_id)
          .order('created_at');
        return jsonResponse({ success: true, data: data || [] });
      }

      // === LIST REGULATORY REPORTS ===
      case 'list_regulatory_reports': {
        const { data } = await supabase
          .from('erp_hr_generated_reports')
          .select('id, report_name, report_type, format, status, review_status, regulatory_framework, disclaimer, generated_by, modules_included, data_sources, generation_time_ms, created_at, completed_at, reviewed_at, approved_at')
          .eq('company_id', company_id)
          .eq('report_category', 'regulatory')
          .order('created_at', { ascending: false })
          .limit(50);
        return jsonResponse({ success: true, data: data || [] });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[hr-regulatory-reporting] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  function jsonResponse(data: unknown) {
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
