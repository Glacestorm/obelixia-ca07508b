import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper scoped to have access to corsHeaders
  function json(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse body first to extract company_id
    const { action, params } = await req.json();
    const companyId = params?.company_id as string;

    if (!companyId) {
      return json({ error: 'company_id is required' }, 400);
    }

    // === AUTH GATE — validateTenantAccess ===
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userId, userClient } = authResult;

    console.log(`[wellbeing-enterprise] Action: ${action}, userId: ${userId}`);

    // ============ SEED_DEMO → ADMIN ROLE CHECK (uses userClient — RLS allows reading own roles) ============
    if (action === 'seed_demo') {
      const { data: roleData } = await userClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'superadmin']);
      if (!roleData || roleData.length === 0) {
        return json({ error: 'Forbidden: admin role required' }, 403);
      }
      // Proceed to seed (handled in switch below)
    }

    // ============ RESOLVE ENTITY IDS ============
    let entityIds: string[] = [];
    const { data: entities } = await userClient
      .from('erp_hr_legal_entities')
      .select('id')
      .eq('company_id', companyId);
    entityIds = entities?.map((e: any) => e.id) || [];

    switch (action) {
      // ============ ASSESSMENTS ============
      case 'list_assessments': {
        let query = userClient
          .from('erp_hr_wellbeing_assessments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(params?.limit || 50);
        if (entityIds.length > 0) {
          query = query.in('entity_id', entityIds);
        } else {
          return json({ success: true, data: [] });
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'create_assessment': {
        if (params.entity_id && !entityIds.includes(params.entity_id)) {
          return json({ error: 'Forbidden: entity not accessible' }, 403);
        }
        const { company_id: _c, ...insertParams } = params;
        const { data, error } = await userClient
          .from('erp_hr_wellbeing_assessments')
          .insert([insertParams])
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      // ============ SURVEYS ============
      case 'list_surveys': {
        let query = userClient
          .from('erp_hr_wellbeing_surveys')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (entityIds.length > 0) {
          query = query.in('entity_id', entityIds);
        } else {
          return json({ success: true, data: [] });
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'upsert_survey': {
        if (params.entity_id && !entityIds.includes(params.entity_id)) {
          return json({ error: 'Forbidden: entity not accessible' }, 403);
        }
        const { company_id: _c, ...upsertParams } = params;
        const { data, error } = await userClient
          .from('erp_hr_wellbeing_surveys')
          .upsert([upsertParams])
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'submit_response': {
        if (entityIds.length > 0) {
          const { data: survey } = await userClient
            .from('erp_hr_wellbeing_surveys')
            .select('id')
            .eq('id', params.survey_id)
            .in('entity_id', entityIds)
            .single();
          if (!survey) {
            return json({ error: 'Forbidden: survey not accessible' }, 403);
          }
        }
        const { company_id: _c, ...responseParams } = params;
        const { data, error } = await userClient
          .from('erp_hr_wellbeing_survey_responses')
          .insert([responseParams])
          .select()
          .single();
        if (error) throw error;
        await userClient.rpc('increment_survey_responses', { survey_id_param: params.survey_id }).catch(() => {});
        return json({ success: true, data });
      }

      // ============ PROGRAMS ============
      case 'list_programs': {
        let query = userClient
          .from('erp_hr_wellness_programs')
          .select('*')
          .order('created_at', { ascending: false });
        if (entityIds.length > 0) {
          query = query.in('entity_id', entityIds);
        } else {
          return json({ success: true, data: [] });
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'upsert_program': {
        if (params.entity_id && !entityIds.includes(params.entity_id)) {
          return json({ error: 'Forbidden: entity not accessible' }, 403);
        }
        const { company_id: _c, ...programParams } = params;
        const { data, error } = await userClient
          .from('erp_hr_wellness_programs')
          .upsert([programParams])
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'enroll_program': {
        if (entityIds.length > 0) {
          const { data: program } = await userClient
            .from('erp_hr_wellness_programs')
            .select('id')
            .eq('id', params.program_id)
            .in('entity_id', entityIds)
            .single();
          if (!program) {
            return json({ error: 'Forbidden: program not accessible' }, 403);
          }
        }
        const { company_id: _c, ...enrollParams } = params;
        const { data, error } = await userClient
          .from('erp_hr_wellness_enrollments')
          .insert([enrollParams])
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      // ============ BURNOUT ALERTS ============
      case 'list_burnout_alerts': {
        let query = userClient
          .from('erp_hr_burnout_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (entityIds.length > 0) {
          query = query.in('entity_id', entityIds);
        } else {
          return json({ success: true, data: [] });
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'acknowledge_alert': {
        if (entityIds.length > 0) {
          const { data: alert } = await userClient
            .from('erp_hr_burnout_alerts')
            .select('id')
            .eq('id', params.id)
            .in('entity_id', entityIds)
            .single();
          if (!alert) {
            return json({ error: 'Forbidden: alert not accessible' }, 403);
          }
        }
        const { data, error } = await userClient
          .from('erp_hr_burnout_alerts')
          .update({
            status: 'acknowledged',
            acknowledged_by: params.acknowledged_by,
            acknowledged_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'resolve_alert': {
        if (entityIds.length > 0) {
          const { data: alert } = await userClient
            .from('erp_hr_burnout_alerts')
            .select('id')
            .eq('id', params.id)
            .in('entity_id', entityIds)
            .single();
          if (!alert) {
            return json({ error: 'Forbidden: alert not accessible' }, 403);
          }
        }
        const { data, error } = await userClient
          .from('erp_hr_burnout_alerts')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_notes: params.resolution_notes,
          })
          .eq('id', params.id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      // ============ KPIs ============
      case 'get_kpis': {
        let query = userClient
          .from('erp_hr_wellbeing_kpis')
          .select('*')
          .order('calculated_at', { ascending: false })
          .limit(12);
        if (entityIds.length > 0) {
          query = query.in('entity_id', entityIds);
        } else {
          return json({ success: true, data: [] });
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ success: true, data });
      }

      case 'calculate_kpis': {
        const entityFilter = entityIds.length > 0 ? entityIds : [];
        if (entityFilter.length === 0) {
          return json({ success: true, data: null, message: 'No entities found for company' });
        }

        const [assessments, alerts, programs, surveys] = await Promise.all([
          userClient.from('erp_hr_wellbeing_assessments').select('*').in('entity_id', entityFilter).order('created_at', { ascending: false }).limit(200),
          userClient.from('erp_hr_burnout_alerts').select('*').in('entity_id', entityFilter).eq('status', 'active'),
          userClient.from('erp_hr_wellness_programs').select('*').in('entity_id', entityFilter).eq('status', 'active'),
          userClient.from('erp_hr_wellbeing_surveys').select('*').in('entity_id', entityFilter).eq('status', 'closed').order('created_at', { ascending: false }).limit(5),
        ]);

        const assessmentData = assessments.data || [];
        const alertData = alerts.data || [];
        const programData = programs.data || [];

        const avgSatisfaction = assessmentData.length > 0
          ? assessmentData.reduce((s, a) => s + (Number(a.satisfaction_level) || 0), 0) / assessmentData.length
          : 0;
        const avgStress = assessmentData.length > 0
          ? assessmentData.reduce((s, a) => s + (Number(a.stress_level) || 0), 0) / assessmentData.length
          : 0;
        const avgBalance = assessmentData.length > 0
          ? assessmentData.reduce((s, a) => s + (Number(a.work_life_balance) || 0), 0) / assessmentData.length
          : 0;
        const burnoutRate = assessmentData.length > 0
          ? (assessmentData.filter(a => a.burnout_risk === 'high' || a.burnout_risk === 'critical').length / assessmentData.length) * 100
          : 0;
        const engagementIndex = assessmentData.length > 0
          ? assessmentData.reduce((s, a) => s + (Number(a.engagement_level) || 0), 0) / assessmentData.length
          : 0;

        const period = new Date().toISOString().slice(0, 7);
        const kpi = {
          period,
          entity_id: entityFilter[0],
          enps_score: Math.round((avgSatisfaction - 5) * 20),
          engagement_index: Number(engagementIndex.toFixed(2)),
          burnout_rate: Number(burnoutRate.toFixed(2)),
          avg_satisfaction: Number(avgSatisfaction.toFixed(2)),
          avg_stress: Number(avgStress.toFixed(2)),
          avg_work_life_balance: Number(avgBalance.toFixed(2)),
          wellness_adoption: programData.reduce((s, p) => s + (p.current_participants || 0), 0),
          top_concerns: alertData.slice(0, 5).map(a => ({
            factor: (a.contributing_factors as any)?.[0] || 'Unknown',
            level: a.risk_level,
          })),
        };

        const { data, error } = await userClient
          .from('erp_hr_wellbeing_kpis')
          .insert([kpi])
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }

      // ============ AI ANALYSIS ============
      case 'ai_wellbeing_analysis': {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const entityFilter = entityIds.length > 0 ? entityIds : [];
        if (entityFilter.length === 0) {
          return json({ success: true, data: { overallHealth: 'unknown', healthScore: 0, keyFindings: [], recommendations: [] } });
        }

        const [assessments, alerts, programs] = await Promise.all([
          userClient.from('erp_hr_wellbeing_assessments').select('*').in('entity_id', entityFilter).order('created_at', { ascending: false }).limit(100),
          userClient.from('erp_hr_burnout_alerts').select('*').in('entity_id', entityFilter).eq('status', 'active'),
          userClient.from('erp_hr_wellness_programs').select('*').in('entity_id', entityFilter).eq('status', 'active'),
        ]);

        const context = {
          totalAssessments: assessments.data?.length || 0,
          activeAlerts: alerts.data?.length || 0,
          activePrograms: programs.data?.length || 0,
          riskDistribution: {
            critical: assessments.data?.filter(a => a.burnout_risk === 'critical').length || 0,
            high: assessments.data?.filter(a => a.burnout_risk === 'high').length || 0,
            medium: assessments.data?.filter(a => a.burnout_risk === 'medium').length || 0,
            low: assessments.data?.filter(a => a.burnout_risk === 'low').length || 0,
          },
          programCategories: programs.data?.map(p => p.category) || [],
        };

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un experto en bienestar organizacional y employee experience.

CONTEXTO: ${JSON.stringify(context)}

FORMATO DE RESPUESTA (JSON estricto):
{
  "overallHealth": "healthy" | "at_risk" | "critical",
  "healthScore": 0-100,
  "keyFindings": [{"area": "string", "finding": "string", "impact": "high|medium|low"}],
  "burnoutRiskAnalysis": {"trend": "improving|stable|worsening", "hotspots": ["string"], "rootCauses": ["string"]},
  "recommendations": [{"priority": 1-5, "action": "string", "expectedImpact": "string", "timeframe": "string"}],
  "programGaps": ["string"],
  "engagementDrivers": [{"driver": "string", "score": 0-10, "trend": "up|down|stable"}],
  "predictedTurnoverRisk": 0-100,
  "wellnessROI": {"estimated": "string", "factors": ["string"]}
}`
              },
              { role: 'user', content: `Analiza el estado de bienestar organizacional y genera recomendaciones estratégicas. Contexto adicional: ${JSON.stringify(params?.context || {})}` }
            ],
            temperature: 0.7,
            max_tokens: 2500,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) return json({ error: 'Rate limit', message: 'Demasiadas solicitudes' }, 429);
          if (response.status === 402) return json({ error: 'Payment required' }, 402);
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;
        let result;
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
        } catch {
          result = { rawContent: content };
        }

        return json({ success: true, data: result });
      }

      // ============ SEED DATA ============
      case 'seed_demo': {
        // Admin role already validated above
        const assessments = Array.from({ length: 20 }, (_, i) => ({
          employee_id: crypto.randomUUID(),
          assessment_type: ['pulse', 'quarterly', 'annual'][i % 3],
          overall_score: 5 + Math.random() * 5,
          burnout_risk: ['none', 'low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 5)],
          engagement_level: 4 + Math.random() * 6,
          stress_level: 2 + Math.random() * 7,
          satisfaction_level: 5 + Math.random() * 5,
          work_life_balance: 4 + Math.random() * 6,
          assessed_by: 'self',
          dimensions: {
            autonomy: 5 + Math.random() * 5,
            purpose: 5 + Math.random() * 5,
            relationships: 5 + Math.random() * 5,
            growth: 4 + Math.random() * 6,
            recognition: 3 + Math.random() * 7,
          },
        }));
        await userClient.from('erp_hr_wellbeing_assessments').insert(assessments);

        const surveys = [
          { title: 'Pulse Semanal - Semana 10', survey_type: 'pulse', status: 'active', anonymized: true, frequency: 'weekly', total_responses: 45, response_rate: 78.5, questions: [
            { id: '1', text: '¿Cómo te sientes esta semana?', type: 'scale', min: 1, max: 10 },
            { id: '2', text: '¿Tu carga de trabajo es manejable?', type: 'scale', min: 1, max: 10 },
            { id: '3', text: '¿Te sientes apoyado por tu equipo?', type: 'yes_no' },
          ]},
          { title: 'eNPS Q1 2026', survey_type: 'enps', status: 'closed', anonymized: true, frequency: 'quarterly', total_responses: 112, response_rate: 89.2, results_summary: { promoters: 45, passives: 38, detractors: 29, score: 14 } },
          { title: 'Clima Organizacional 2026', survey_type: 'climate', status: 'draft', anonymized: true, frequency: 'annual', questions: [
            { id: '1', text: '¿Recomendarías esta empresa?', type: 'nps' },
            { id: '2', text: '¿Te sientes valorado?', type: 'scale', min: 1, max: 5 },
            { id: '3', text: '¿Qué mejorarías?', type: 'text' },
          ]},
        ];
        await userClient.from('erp_hr_wellbeing_surveys').insert(surveys);

        const programs = [
          { name: 'Mindfulness & Meditación', category: 'mental', status: 'active', provider: 'Calm Business', budget: 15000, max_participants: 100, current_participants: 67, satisfaction_score: 8.7, benefits: ['Reducción estrés 30%', 'Mejor foco', 'Mejor sueño'] },
          { name: 'Gimnasio Corporativo', category: 'physical', status: 'active', provider: 'GymPass', budget: 45000, max_participants: 200, current_participants: 134, satisfaction_score: 9.1, benefits: ['Salud cardiovascular', 'Energía', 'Team building'] },
          { name: 'Asesoría Financiera', category: 'financial', status: 'active', provider: 'FinWell', budget: 8000, max_participants: 50, current_participants: 23, satisfaction_score: 8.2, benefits: ['Planificación', 'Reducción ansiedad financiera'] },
          { name: 'Club Social & Eventos', category: 'social', status: 'active', budget: 12000, max_participants: 150, current_participants: 89, satisfaction_score: 9.3, benefits: ['Cohesión', 'Networking', 'Diversión'] },
          { name: 'Terapia Psicológica Online', category: 'mental', status: 'active', provider: 'TherapyChat', budget: 30000, max_participants: 80, current_participants: 41, satisfaction_score: 9.5, benefits: ['Apoyo emocional', 'Gestión ansiedad', 'Confidencialidad'] },
          { name: 'Programa Ergonomía', category: 'physical', status: 'active', budget: 5000, max_participants: 200, current_participants: 156, satisfaction_score: 7.8, benefits: ['Prevención lesiones', 'Confort', 'Productividad'] },
        ];
        await userClient.from('erp_hr_wellness_programs').insert(programs);

        const burnoutAlerts = [
          { employee_id: crypto.randomUUID(), risk_level: 'critical', risk_score: 92, status: 'active', contributing_factors: ['Horas extra sostenidas', 'Sin vacaciones 8 meses', 'Equipo subdimensionado'], recommended_actions: ['Vacaciones inmediatas', 'Redistribución carga', 'Sesión con psicólogo'] },
          { employee_id: crypto.randomUUID(), risk_level: 'high', risk_score: 78, status: 'active', contributing_factors: ['Conflicto con manager', 'Objetivos irrealistas', 'Aislamiento remoto'], recommended_actions: ['Mediación', 'Revisión OKRs', 'Plan social'] },
          { employee_id: crypto.randomUUID(), risk_level: 'high', risk_score: 75, status: 'acknowledged', contributing_factors: ['Monotonía tareas', 'Sin desarrollo profesional'], recommended_actions: ['Rotación proyecto', 'Plan formación', 'Mentoring'] },
          { employee_id: crypto.randomUUID(), risk_level: 'medium', risk_score: 55, status: 'active', contributing_factors: ['Nuevo rol', 'Curva aprendizaje', 'Presión resultados'], recommended_actions: ['Buddy asignado', 'Check-ins semanales', 'Expectativas claras'] },
        ];
        await userClient.from('erp_hr_burnout_alerts').insert(burnoutAlerts);

        const kpis = [
          { period: '2026-01', enps_score: 12, engagement_index: 7.2, burnout_rate: 8.5, avg_satisfaction: 7.4, avg_stress: 4.8, avg_work_life_balance: 6.9, wellness_adoption: 65, absenteeism_rate: 3.2, survey_participation: 82 },
          { period: '2026-02', enps_score: 18, engagement_index: 7.5, burnout_rate: 7.2, avg_satisfaction: 7.8, avg_stress: 4.3, avg_work_life_balance: 7.2, wellness_adoption: 71, absenteeism_rate: 2.8, survey_participation: 85 },
          { period: '2026-03', enps_score: 22, engagement_index: 7.8, burnout_rate: 6.1, avg_satisfaction: 8.1, avg_stress: 3.9, avg_work_life_balance: 7.5, wellness_adoption: 78, absenteeism_rate: 2.5, survey_participation: 89 },
        ];
        await userClient.from('erp_hr_wellbeing_kpis').insert(kpis);

        return json({ success: true, message: 'Demo data seeded' });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[wellbeing-enterprise] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});