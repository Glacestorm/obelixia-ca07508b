import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface FunctionRequest {
  action: string;
  params?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  function jsonResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body first to extract companyId
    const { action, params, context } = await req.json() as FunctionRequest;
    const companyId = params?.companyId as string;
    if (!companyId || companyId === 'demo-company-id') {
      return new Response(JSON.stringify({ success: false, error: 'company_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === AUTH GATE — validateTenantAccess ===
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userClient } = authResult;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    console.log(`[erp-hr-esg-selfservice] Action: ${action}`);

    switch (action) {
      // ===== ESG SOCIAL =====
      case 'get_esg_metrics': {
        const { data } = await userClient
          .from('erp_hr_esg_social_metrics')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(100);
        return jsonResponse({ success: true, data });
      }

      case 'get_esg_kpis': {
        const { data } = await userClient
          .from('erp_hr_esg_social_kpis')
          .select('*')
          .eq('company_id', companyId)
          .order('category');
        return jsonResponse({ success: true, data });
      }

      case 'get_surveys': {
        const { data } = await userClient
          .from('erp_hr_esg_social_surveys')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        return jsonResponse({ success: true, data });
      }

      case 'upsert_survey': {
        const survey = params?.survey as Record<string, unknown>;
        const { data, error } = await userClient
          .from('erp_hr_esg_social_surveys')
          .upsert({ ...survey, company_id: companyId })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      // ===== SELF-SERVICE =====
      case 'get_requests': {
        const status = params?.status as string;
        let query = userClient
          .from('erp_hr_self_service_requests')
          .select('*')
          .eq('company_id', companyId)
          .order('submitted_at', { ascending: false })
          .limit(50);
        if (status && status !== 'all') query = query.eq('status', status);
        const { data } = await query;
        return jsonResponse({ success: true, data });
      }

      case 'create_request': {
        const request = params?.request as Record<string, unknown>;
        const { data, error } = await userClient
          .from('erp_hr_self_service_requests')
          .insert({ ...request, company_id: companyId })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case 'update_request': {
        const { id, ...updates } = params as Record<string, unknown>;
        const { error } = await userClient
          .from('erp_hr_self_service_requests')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case 'get_faq': {
        const { data } = await userClient
          .from('erp_hr_self_service_faq')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_published', true)
          .order('helpful_count', { ascending: false });
        return jsonResponse({ success: true, data });
      }

      case 'get_document_requests': {
        const { data } = await userClient
          .from('erp_hr_document_requests')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50);
        return jsonResponse({ success: true, data });
      }

      case 'create_document_request': {
        const docReq = params?.request as Record<string, unknown>;
        const { data, error } = await userClient
          .from('erp_hr_document_requests')
          .insert({ ...docReq, company_id: companyId })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      // ===== AI ANALYSIS =====
      case 'ai_esg_social_analysis': {
        const { data: metrics } = await userClient
          .from('erp_hr_esg_social_metrics')
          .select('*')
          .eq('company_id', companyId)
          .limit(50);

        const { data: kpis } = await userClient
          .from('erp_hr_esg_social_kpis')
          .select('*')
          .eq('company_id', companyId);

        const systemPrompt = `Eres un analista ESG Social especializado en métricas laborales y de capital humano.

CONTEXTO: Analiza los indicadores sociales de una empresa según marcos GRI 400, ESRS S1-S4, y normativa laboral española.

DIMENSIONES A EVALUAR:
- Diversidad e Inclusión (GRI 405)
- Salud y Seguridad (GRI 403)
- Formación y Desarrollo (GRI 404)
- Derechos Laborales (GRI 402)
- Igualdad Salarial (brecha de género)
- Condiciones de Trabajo
- Diálogo Social

FORMATO JSON ESTRICTO:
{
  "overallScore": 0-100,
  "rating": "A+|A|B+|B|C+|C|D",
  "dimensions": [
    {
      "name": "string",
      "score": 0-100,
      "status": "excellent|good|needs_improvement|critical",
      "gri_disclosures": ["string"],
      "findings": ["string"],
      "recommendations": ["string"]
    }
  ],
  "risks": [
    {
      "area": "string",
      "level": "high|medium|low",
      "description": "string",
      "mitigation": "string"
    }
  ],
  "strengths": ["string"],
  "actionPlan": [
    {
      "priority": "high|medium|low",
      "action": "string",
      "timeline": "string",
      "expectedImpact": "string"
    }
  ],
  "benchmarkPosition": "above_average|average|below_average",
  "esgSocialIndex": 0-100
}`;

        const userPrompt = `Analiza estos datos ESG Social:
Métricas: ${JSON.stringify(metrics || [])}
KPIs: ${JSON.stringify(kpis || [])}
Contexto adicional: ${JSON.stringify(context || {})}`;

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
          if (response.status === 429) return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
          throw new Error(`AI error: ${response.status}`);
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        let result;
        try {
          const match = content.match(/\{[\s\S]*\}/);
          result = match ? JSON.parse(match[0]) : { rawContent: content };
        } catch { result = { rawContent: content }; }

        return jsonResponse({ success: true, data: result });
      }

      case 'ai_selfservice_assist': {
        const question = params?.question as string;
        const { data: faqs } = await userClient
          .from('erp_hr_self_service_faq')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_published', true);

        const systemPrompt = `Eres un asistente virtual de RRHH para empleados. Responde preguntas de forma clara y empática.

FAQ disponibles: ${JSON.stringify(faqs || [])}

FORMATO JSON:
{
  "answer": "string",
  "relatedFaqs": ["string"],
  "suggestRequest": boolean,
  "requestType": "string|null",
  "confidence": 0-100
}`;

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
              { role: 'user', content: question }
            ],
            temperature: 0.5,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) throw new Error(`AI error: ${response.status}`);
        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        let result;
        try {
          const match = content.match(/\{[\s\S]*\}/);
          result = match ? JSON.parse(match[0]) : { rawContent: content };
        } catch { result = { rawContent: content }; }

        return jsonResponse({ success: true, data: result });
      }

      // ===== SEED DEMO =====
      case 'seed_demo': {
        // ESG Social Metrics
        const metrics = [
          { metric_name: 'Gender Pay Gap', category: 'equality', metric_value: 4.2, unit: '%', target_value: 0, trend: 'improving', period: '2026-Q1' },
          { metric_name: 'Women in Leadership', category: 'diversity', metric_value: 38, unit: '%', target_value: 45, trend: 'improving', period: '2026-Q1' },
          { metric_name: 'Employee Turnover Rate', category: 'retention', metric_value: 8.5, unit: '%', target_value: 7, trend: 'stable', period: '2026-Q1' },
          { metric_name: 'Training Hours per Employee', category: 'development', metric_value: 42, unit: 'hours', target_value: 50, trend: 'improving', period: '2026-Q1' },
          { metric_name: 'Workplace Accident Rate', category: 'safety', metric_value: 1.2, unit: 'per 1000', target_value: 0.5, trend: 'improving', period: '2026-Q1' },
          { metric_name: 'eNPS Score', category: 'engagement', metric_value: 45, unit: 'score', target_value: 60, trend: 'improving', period: '2026-Q1' },
          { metric_name: 'Diversity Index', category: 'diversity', metric_value: 72, unit: 'score', target_value: 85, trend: 'stable', period: '2026-Q1' },
          { metric_name: 'Absenteeism Rate', category: 'wellbeing', metric_value: 3.8, unit: '%', target_value: 3, trend: 'worsening', period: '2026-Q1' },
          { metric_name: 'Collective Bargaining Coverage', category: 'labor_rights', metric_value: 92, unit: '%', target_value: 100, trend: 'stable', period: '2026-Q1' },
          { metric_name: 'Temporary Contract Rate', category: 'employment', metric_value: 12, unit: '%', target_value: 8, trend: 'improving', period: '2026-Q1' },
        ].map(m => ({ ...m, company_id: companyId }));

        await userClient.from('erp_hr_esg_social_metrics').upsert(metrics as any);

        // ESG Social KPIs
        const kpis = [
          { kpi_name: 'Brecha Salarial de Género', kpi_code: 'ESG-S-001', category: 'equality', current_value: 4.2, target_value: 0, previous_value: 5.1, unit: '%', period: '2026', framework: 'GRI', gri_disclosure: 'GRI 405-2', status: 'improving' },
          { kpi_name: 'Tasa de Accidentalidad', kpi_code: 'ESG-S-002', category: 'safety', current_value: 1.2, target_value: 0.5, previous_value: 1.8, unit: '‰', period: '2026', framework: 'GRI', gri_disclosure: 'GRI 403-9', status: 'improving' },
          { kpi_name: 'Horas Formación/Empleado', kpi_code: 'ESG-S-003', category: 'development', current_value: 42, target_value: 50, previous_value: 35, unit: 'h', period: '2026', framework: 'GRI', gri_disclosure: 'GRI 404-1', status: 'on_track' },
          { kpi_name: 'Índice de Diversidad', kpi_code: 'ESG-S-004', category: 'diversity', current_value: 72, target_value: 85, previous_value: 68, unit: 'pts', period: '2026', framework: 'ESRS', gri_disclosure: 'ESRS S1-9', status: 'on_track' },
          { kpi_name: 'Rotación Voluntaria', kpi_code: 'ESG-S-005', category: 'retention', current_value: 8.5, target_value: 7, previous_value: 9.2, unit: '%', period: '2026', framework: 'SASB', gri_disclosure: 'GRI 401-1', status: 'at_risk' },
          { kpi_name: 'Cobertura Negociación Colectiva', kpi_code: 'ESG-S-006', category: 'labor_rights', current_value: 92, target_value: 100, previous_value: 90, unit: '%', period: '2026', framework: 'GRI', gri_disclosure: 'GRI 407-1', status: 'on_track' },
        ].map(k => ({ ...k, company_id: companyId }));

        await userClient.from('erp_hr_esg_social_kpis').upsert(kpis as any);

        // FAQs
        const faqs = [
          { category: 'vacaciones', question: '¿Cuántos días de vacaciones me corresponden?', answer: 'Según el Estatuto de los Trabajadores, tienes derecho a 30 días naturales (22 laborables) por año trabajado. Consulta tu convenio colectivo para posibles mejoras.', tags: ['vacaciones', 'permisos', 'derechos'] },
          { category: 'nomina', question: '¿Cuándo se paga la nómina?', answer: 'La nómina se abona el último día hábil de cada mes. Las pagas extra (junio y diciembre) se abonan el día 15 del mes correspondiente.', tags: ['nomina', 'pago', 'salario'] },
          { category: 'permisos', question: '¿Qué permisos retribuidos existen?', answer: 'Matrimonio (15 días), nacimiento hijo (16 semanas), fallecimiento familiar (2-4 días), mudanza (1 día), deber público, exámenes, y los contemplados en tu convenio.', tags: ['permisos', 'ausencias', 'derechos'] },
          { category: 'formacion', question: '¿Cómo puedo solicitar formación?', answer: 'Accede al portal de formación, selecciona el curso deseado y envía la solicitud. Tu responsable la aprobará. FUNDAE cubre hasta el 100% para formación bonificada.', tags: ['formacion', 'desarrollo', 'cursos'] },
          { category: 'teletrabajo', question: '¿Cuál es la política de teletrabajo?', answer: 'El acuerdo de trabajo a distancia permite hasta 3 días/semana en remoto. Requiere acuerdo individual según Ley 10/2021 y compensación de gastos.', tags: ['teletrabajo', 'remoto', 'flexibilidad'] },
          { category: 'documentos', question: '¿Cómo solicito un certificado de empresa?', answer: 'Desde el Portal del Empleado > Solicitar Documento > Certificado de Empresa. Se genera automáticamente en 24-48h. Para el SEPE se emite en 10 días.', tags: ['certificado', 'documentos', 'empresa'] },
        ].map(f => ({ ...f, company_id: companyId }));

        await userClient.from('erp_hr_self_service_faq').upsert(faqs as any);

        // Sample survey
        const surveys = [
          {
            title: 'Encuesta de Clima Laboral Q1 2026',
            description: 'Evaluación trimestral del clima organizacional y satisfacción',
            survey_type: 'climate',
            status: 'active',
            target_audience: 'all',
            response_count: 156,
            avg_score: 7.4,
            questions: [
              { id: '1', text: '¿Te sientes valorado/a en tu puesto?', type: 'scale', scale: 10 },
              { id: '2', text: '¿Consideras adecuada la comunicación interna?', type: 'scale', scale: 10 },
              { id: '3', text: '¿Recomendarías la empresa como lugar de trabajo?', type: 'scale', scale: 10 },
            ],
            results: {
              participation: 78,
              averageScore: 7.4,
              topStrengths: ['Flexibilidad horaria', 'Compañerismo', 'Beneficios sociales'],
              topWeaknesses: ['Oportunidades de carrera', 'Transparencia salarial']
            },
            company_id: companyId
          }
        ];

        await userClient.from('erp_hr_esg_social_surveys').upsert(surveys as any);

        return jsonResponse({ success: true, message: 'Demo data seeded' });
      }

      default:
        throw new Error(`Action not supported: ${action}`);
    }

  } catch (error) {
    console.error('[erp-hr-esg-selfservice] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});