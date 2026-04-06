import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface TalentRequest {
  action: 'analyze_skills_gap' | 'recommend_development' | 'match_opportunity' | 
          'analyze_succession' | 'evaluate_readiness' | 'suggest_career_path';
  company_id?: string;
  employee_id?: string;
  department_id?: string;
  position_id?: string;
  skills_data?: Record<string, unknown>;
  opportunity_data?: Record<string, unknown>;
  career_data?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth gate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, company_id, employee_id, department_id, position_id, skills_data, opportunity_data, career_data } = await req.json() as TalentRequest;

    console.log(`[erp-hr-talent-skills-agent] Action: ${action}, Employee: ${employee_id}`);

    // Tenant isolation
    if (company_id) {
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: membership } = await adminClient
        .from('erp_user_companies').select('id')
        .eq('user_id', userId).eq('company_id', company_id)
        .eq('is_active', true).maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_skills_gap':
        systemPrompt = `Eres un experto en gestión de competencias y desarrollo del talento corporativo.

Tu rol es analizar las competencias actuales de empleados vs las requeridas por su puesto/carrera.

CATEGORÍAS DE COMPETENCIAS:
- Technical Skills (hard skills específicas del rol)
- Soft Skills (comunicación, liderazgo, trabajo en equipo)
- Digital Skills (herramientas, tecnologías, IA)
- Industry Knowledge (conocimiento sectorial, regulatorio)
- Management Skills (gestión de equipos, proyectos)

FORMATO DE RESPUESTA (JSON estricto):
{
  "employee_summary": {
    "total_skills": 15,
    "proficient_count": 8,
    "developing_count": 4,
    "gap_count": 3,
    "overall_readiness": 75
  },
  "skill_gaps": [
    {
      "skill_name": "Python Programming",
      "category": "technical",
      "current_level": 2,
      "required_level": 4,
      "gap_severity": "high",
      "priority": 1,
      "estimated_time_months": 6,
      "recommended_actions": ["Curso avanzado", "Proyecto práctico"]
    }
  ],
  "strengths": [
    {
      "skill_name": "Leadership",
      "category": "soft",
      "current_level": 5,
      "exceeds_by": 1,
      "leverage_opportunities": ["Mentor junior", "Lead projects"]
    }
  ],
  "development_priority": "high|medium|low",
  "career_impact_score": 85
}`;

        userPrompt = `Analiza los gaps de competencias para:
- Empleado ID: ${employee_id || 'general'}
- Datos de competencias: ${JSON.stringify(skills_data || {})}
- Puesto: ${position_id || 'no especificado'}

Identifica gaps críticos y prioriza acciones de desarrollo.`;
        break;

      case 'recommend_development':
        systemPrompt = `Eres un consultor de desarrollo profesional especializado en planes de formación personalizados.

Genera recomendaciones de desarrollo basadas en:
- Gaps de competencias identificados
- Objetivos de carrera del empleado
- Recursos disponibles de la empresa
- Tendencias del sector

FORMATO DE RESPUESTA (JSON estricto):
{
  "development_plan": {
    "title": "Plan de Desarrollo - [Nombre]",
    "duration_months": 12,
    "total_hours": 120,
    "investment_estimate": 3500
  },
  "recommendations": [
    {
      "skill_target": "Data Analysis",
      "priority": 1,
      "actions": [
        {
          "type": "course|mentoring|project|certification|workshop",
          "title": "Certificación Google Data Analytics",
          "provider": "Coursera",
          "duration_hours": 40,
          "cost_estimate": 299,
          "timeline": "Q1 2026",
          "expected_outcome": "Nivel 4 en análisis de datos"
        }
      ],
      "success_metrics": ["Completar certificación", "Aplicar en 2 proyectos"]
    }
  ],
  "quick_wins": [
    {"action": "Tutorial interno Excel avanzado", "impact": "immediate", "effort": "low"}
  ],
  "long_term_goals": [
    {"goal": "Promoción a Senior Analyst", "timeline": "18 meses", "dependencies": ["Certificación", "2 proyectos lead"]}
  ]
}`;

        userPrompt = `Genera recomendaciones de desarrollo para:
- Empleado: ${employee_id}
- Gaps identificados: ${JSON.stringify(skills_data || {})}
- Objetivos de carrera: ${JSON.stringify(career_data || {})}

Incluye opciones de formación interna y externa.`;
        break;

      case 'match_opportunity':
        systemPrompt = `Eres un experto en matching de talento interno y gestión de marketplace de oportunidades.

Evalúa la compatibilidad entre empleados y oportunidades internas:
- Proyectos especiales
- Rotaciones de puesto
- Mentorías
- Comités y grupos de trabajo
- Stretch assignments

FORMATO DE RESPUESTA (JSON estricto):
{
  "match_score": 87,
  "compatibility_breakdown": {
    "skills_match": 90,
    "availability_match": 80,
    "interest_alignment": 85,
    "growth_potential": 95
  },
  "recommended_opportunities": [
    {
      "opportunity_id": "opp_123",
      "opportunity_type": "project|rotation|mentoring|committee",
      "title": "Proyecto Digital Transformation",
      "match_score": 92,
      "skills_utilized": ["Python", "Analytics", "Leadership"],
      "skills_developed": ["Cloud Architecture", "Stakeholder Management"],
      "time_commitment": "20%",
      "duration": "6 meses",
      "career_benefit": "Exposición a C-level, habilidades cross-functional",
      "recommendation_reason": "Alto match técnico + oportunidad de desarrollo en áreas gap"
    }
  ],
  "growth_opportunities": ["Visibilidad ejecutiva", "Networking cross-departamental"],
  "risks_to_consider": ["Carga de trabajo adicional", "Posible conflicto con proyecto actual"]
}`;

        userPrompt = `Evalúa el matching para:
- Empleado: ${employee_id}
- Competencias: ${JSON.stringify(skills_data || {})}
- Oportunidades disponibles: ${JSON.stringify(opportunity_data || {})}

Prioriza oportunidades que desarrollen gaps identificados.`;
        break;

      case 'analyze_succession':
        systemPrompt = `Eres un experto en planificación de sucesión y continuidad organizacional.

Analiza candidatos potenciales para sucesión en puestos críticos utilizando:
- 9-Box Grid (Performance vs Potential)
- Readiness assessment
- Gap analysis específico del puesto objetivo
- Risk analysis

FORMATO DE RESPUESTA (JSON estricto):
{
  "position_analysis": {
    "position_name": "Director de Operaciones",
    "criticality": "high",
    "vacancy_risk": "medium",
    "current_incumbent_tenure_years": 8,
    "succession_urgency": "planning"
  },
  "succession_candidates": [
    {
      "employee_id": "emp_456",
      "employee_name": "María García",
      "current_position": "Manager de Operaciones",
      "nine_box_position": {"performance": 4, "potential": 5},
      "overall_readiness": 78,
      "readiness_level": "ready_in_1_year|ready_now|ready_in_2_years|development_needed",
      "strengths_for_role": ["Conocimiento operativo", "Liderazgo de equipos"],
      "gaps_for_role": ["Experiencia presupuestaria", "Visión estratégica"],
      "development_actions": [
        {"action": "Participación en comité ejecutivo", "timeline": "inmediato"},
        {"action": "Curso executive MBA", "timeline": "12 meses"}
      ],
      "flight_risk": "low",
      "recommendation_priority": 1
    }
  ],
  "bench_strength": "adequate|weak|strong",
  "pipeline_health_score": 72,
  "critical_gaps": ["No hay candidato inmediato con experiencia P&L"],
  "recommendations": [
    "Acelerar desarrollo de María García con exposure ejecutiva",
    "Considerar contratación externa como backup"
  ]
}`;

        userPrompt = `Analiza sucesión para:
- Puesto: ${position_id}
- Departamento: ${department_id}
- Candidatos potenciales: ${JSON.stringify(skills_data || {})}

Evalúa readiness y genera plan de desarrollo para sucesores.`;
        break;

      case 'evaluate_readiness':
        systemPrompt = `Eres un evaluador de preparación para promoción (Promotion Readiness).

Evalúa la preparación integral de un empleado para asumir un nuevo rol:
- Competencias técnicas vs requeridas
- Competencias de liderazgo
- Track record de desempeño
- Potencial de crecimiento
- Cultural fit con el nuevo nivel

FORMATO DE RESPUESTA (JSON estricto):
{
  "readiness_assessment": {
    "employee_name": "Juan Pérez",
    "target_position": "Senior Manager",
    "overall_readiness_score": 82,
    "readiness_level": "ready_now|ready_in_6_months|ready_in_1_year|not_ready",
    "confidence": 85
  },
  "dimension_scores": {
    "technical_competence": 90,
    "leadership_capability": 75,
    "strategic_thinking": 70,
    "stakeholder_management": 80,
    "business_acumen": 85,
    "cultural_alignment": 90
  },
  "strengths": [
    {"dimension": "Technical", "evidence": "Líder técnico en 3 proyectos exitosos"}
  ],
  "development_areas": [
    {"dimension": "Strategic Thinking", "gap": "Limitada exposición a decisiones estratégicas", "action": "Shadow ejecutivo mensual"}
  ],
  "promotion_recommendation": {
    "recommend": true,
    "conditions": ["Completar programa de liderazgo", "6 meses mentoring con Director"],
    "timeline": "Q2 2026",
    "salary_band_target": "Band 7 - €65,000-€80,000"
  },
  "risk_factors": ["Transición de IC a people manager"],
  "success_indicators": ["Retención del equipo", "Delivery de Q3 targets"]
}`;

        userPrompt = `Evalúa readiness de promoción para:
- Empleado: ${employee_id}
- Puesto objetivo: ${position_id}
- Historial de desempeño: ${JSON.stringify(skills_data || {})}
- Datos de carrera: ${JSON.stringify(career_data || {})}`;
        break;

      case 'suggest_career_path':
        systemPrompt = `Eres un career coach experto en diseño de rutas de carrera personalizadas.

Diseña caminos de carrera basados en:
- Competencias actuales y potencial
- Intereses del empleado
- Oportunidades organizacionales
- Tendencias del mercado laboral

FORMATO DE RESPUESTA (JSON estricto):
{
  "current_position": {
    "title": "Analista de Datos",
    "level": 3,
    "tenure_months": 24,
    "performance_trend": "ascending"
  },
  "career_paths": [
    {
      "path_name": "Technical Leadership",
      "path_type": "technical|management|hybrid|specialist",
      "probability_of_success": 85,
      "alignment_with_interests": 90,
      "milestones": [
        {
          "position": "Senior Data Analyst",
          "level": 4,
          "timeline": "12 meses",
          "salary_increase": "15-20%",
          "key_requirements": ["Certificación avanzada", "Liderar proyecto end-to-end"],
          "skills_to_develop": ["Machine Learning", "Stakeholder Presentation"]
        },
        {
          "position": "Lead Data Scientist",
          "level": 5,
          "timeline": "24-30 meses",
          "salary_increase": "25-35%",
          "key_requirements": ["Gestión de equipo 3-5", "Impacto P&L demostrable"]
        }
      ],
      "end_goal": {
        "position": "Director of Data & Analytics",
        "timeline": "5-7 años",
        "salary_range": "€90,000-€120,000"
      }
    }
  ],
  "recommended_path": "Technical Leadership",
  "alternative_paths": ["Management Track", "Specialist/Expert Track"],
  "immediate_actions": [
    {"action": "Iniciar certificación Google Cloud ML", "deadline": "Q1 2026"},
    {"action": "Solicitar proyecto cross-functional", "deadline": "inmediato"}
  ],
  "market_outlook": "Demanda alta para perfiles Data/AI en próximos 5 años"
}`;

        userPrompt = `Sugiere rutas de carrera para:
- Empleado: ${employee_id}
- Competencias actuales: ${JSON.stringify(skills_data || {})}
- Intereses y preferencias: ${JSON.stringify(career_data || {})}
- Estructura organizacional: ${JSON.stringify(opportunity_data || {})}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: 'Demasiadas solicitudes. Intenta más tarde.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required', 
          message: 'Créditos de IA insuficientes.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('[erp-hr-talent-skills-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-talent-skills-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-talent-skills-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
