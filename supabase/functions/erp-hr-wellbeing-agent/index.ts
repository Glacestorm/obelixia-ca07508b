import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WellbeingRequest {
  action: 'analyze_wellbeing' | 'generate_survey' | 'analyze_survey_results' | 'recommend_programs' | 'predict_burnout' | 'create_wellness_plan';
  employee_id?: string;
  department_id?: string;
  survey_data?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  company_context?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, employee_id, department_id, survey_data, metrics, company_context } = await req.json() as WellbeingRequest;

    console.log(`[erp-hr-wellbeing-agent] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_wellbeing':
        systemPrompt = `Eres un experto en bienestar laboral y psicología organizacional.

Analiza los indicadores de bienestar del empleado o departamento y genera un informe detallado.

FACTORES A EVALUAR:
1. Carga de trabajo y horas extra
2. Uso de vacaciones y descansos
3. Patrones de fichaje (entrada/salida)
4. Frecuencia de bajas médicas
5. Participación en actividades de empresa
6. Feedback de evaluaciones
7. Indicadores de desconexión digital

FORMATO DE RESPUESTA (JSON estricto):
{
  "wellbeing_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "factors": [
    {
      "factor": "Nombre del factor",
      "score": 0-100,
      "status": "healthy|warning|critical",
      "details": "Descripción detallada"
    }
  ],
  "burnout_risk": {
    "probability": 0-100,
    "contributing_factors": ["factor1", "factor2"],
    "timeline": "immediate|short_term|medium_term"
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Acción recomendada",
      "expected_impact": "Impacto esperado",
      "timeline": "Plazo de implementación"
    }
  ],
  "positive_indicators": ["indicador1", "indicador2"]
}`;

        userPrompt = `Analiza el bienestar con estos datos:
- Empleado ID: ${employee_id || 'Análisis departamental'}
- Departamento: ${department_id || 'Todos'}
- Métricas: ${JSON.stringify(metrics || {})}
- Contexto empresa: ${JSON.stringify(company_context || {})}`;
        break;

      case 'generate_survey':
        systemPrompt = `Eres un experto en diseño de encuestas de clima laboral y bienestar.

Genera una encuesta personalizada según el objetivo especificado.

TIPOS DE ENCUESTAS:
- pulse: Encuesta rápida semanal (5-7 preguntas)
- climate: Encuesta de clima trimestral (15-20 preguntas)
- engagement: Encuesta de compromiso anual (25-30 preguntas)
- wellbeing: Encuesta de bienestar específica (10-15 preguntas)
- exit: Encuesta de salida (10-12 preguntas)

FORMATO DE RESPUESTA (JSON estricto):
{
  "survey_title": "Título de la encuesta",
  "survey_type": "pulse|climate|engagement|wellbeing|exit",
  "estimated_time_minutes": 5,
  "introduction": "Texto introductorio",
  "questions": [
    {
      "id": "q1",
      "category": "Categoría",
      "question": "Texto de la pregunta",
      "type": "scale_1_5|scale_1_10|multiple_choice|open_text|yes_no",
      "options": ["opción1", "opción2"],
      "is_required": true,
      "follow_up_condition": null
    }
  ],
  "closing_message": "Mensaje de cierre"
}`;

        userPrompt = `Genera una encuesta de tipo ${survey_data?.type || 'pulse'} para:
- Objetivo: ${survey_data?.objective || 'Medir bienestar general'}
- Departamento: ${department_id || 'Toda la empresa'}
- Contexto: ${JSON.stringify(company_context || {})}`;
        break;

      case 'analyze_survey_results':
        systemPrompt = `Eres un analista experto en datos de encuestas de clima laboral.

Analiza los resultados de la encuesta y genera insights accionables.

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": {
    "participation_rate": 0-100,
    "overall_score": 0-100,
    "trend": "improving|stable|declining",
    "comparison_to_benchmark": "above|at|below"
  },
  "key_findings": [
    {
      "finding": "Hallazgo principal",
      "impact": "high|medium|low",
      "sentiment": "positive|neutral|negative",
      "affected_percentage": 0-100
    }
  ],
  "category_scores": [
    {
      "category": "Nombre categoría",
      "score": 0-100,
      "previous_score": 0-100,
      "trend": "up|stable|down"
    }
  ],
  "risk_areas": [
    {
      "area": "Área de riesgo",
      "severity": "high|medium|low",
      "departments_affected": ["dept1"],
      "recommended_action": "Acción"
    }
  ],
  "action_plan": [
    {
      "priority": 1,
      "action": "Acción prioritaria",
      "owner": "Responsable sugerido",
      "timeline": "Plazo",
      "expected_impact": "Impacto"
    }
  ],
  "quotes": ["Comentario anónimo relevante 1", "Comentario 2"]
}`;

        userPrompt = `Analiza estos resultados de encuesta:
${JSON.stringify(survey_data || {})}`;
        break;

      case 'recommend_programs':
        systemPrompt = `Eres un experto en programas de bienestar corporativo y wellness empresarial.

Recomienda programas de bienestar personalizados según las necesidades detectadas.

CATEGORÍAS DE PROGRAMAS:
- Salud física (gimnasio, fisio, nutrición)
- Salud mental (mindfulness, coaching, terapia)
- Conciliación (flexibilidad, teletrabajo, guarderías)
- Desarrollo personal (formación, mentoring)
- Social (team building, voluntariado)
- Financiero (educación financiera, beneficios)

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommended_programs": [
    {
      "program_name": "Nombre del programa",
      "category": "Categoría",
      "description": "Descripción detallada",
      "target_audience": "A quién va dirigido",
      "expected_benefits": ["beneficio1", "beneficio2"],
      "estimated_cost_per_employee": 0,
      "implementation_complexity": "low|medium|high",
      "roi_estimate": "Estimación de retorno",
      "priority": "high|medium|low",
      "providers": ["Proveedor sugerido 1"]
    }
  ],
  "budget_recommendation": {
    "minimum": 0,
    "optimal": 0,
    "premium": 0,
    "per_employee_annual": 0
  },
  "implementation_roadmap": [
    {
      "phase": 1,
      "programs": ["programa1"],
      "timeline": "Q1 2026",
      "focus": "Enfoque de la fase"
    }
  ]
}`;

        userPrompt = `Recomienda programas de bienestar para:
- Necesidades detectadas: ${JSON.stringify(metrics || {})}
- Contexto empresa: ${JSON.stringify(company_context || {})}
- Presupuesto disponible: ${survey_data?.budget || 'No especificado'}`;
        break;

      case 'predict_burnout':
        systemPrompt = `Eres un experto en prevención del burnout y salud ocupacional.

Analiza los indicadores de riesgo de burnout para un empleado o equipo.

INDICADORES DE BURNOUT (Maslach):
1. Agotamiento emocional
2. Despersonalización
3. Reducción de realización personal

FORMATO DE RESPUESTA (JSON estricto):
{
  "burnout_analysis": {
    "overall_risk": "low|moderate|high|critical",
    "risk_score": 0-100,
    "stage": "none|honeymoon|onset|chronic|habitual|burnout",
    "dimensions": {
      "emotional_exhaustion": 0-100,
      "depersonalization": 0-100,
      "reduced_accomplishment": 0-100
    }
  },
  "warning_signs": [
    {
      "sign": "Señal de alerta",
      "severity": "mild|moderate|severe",
      "observed_frequency": "occasional|frequent|constant",
      "data_source": "Fuente del dato"
    }
  ],
  "protective_factors": ["factor1", "factor2"],
  "intervention_plan": {
    "immediate_actions": ["acción1"],
    "short_term_actions": ["acción2"],
    "long_term_prevention": ["acción3"],
    "manager_guidance": "Orientación para el manager"
  },
  "recovery_timeline": "Tiempo estimado de recuperación si se interviene"
}`;

        userPrompt = `Analiza riesgo de burnout para:
- Empleado: ${employee_id || 'Análisis grupal'}
- Métricas: ${JSON.stringify(metrics || {})}
- Historial: ${JSON.stringify(survey_data || {})}`;
        break;

      case 'create_wellness_plan':
        systemPrompt = `Eres un experto en diseño de planes de bienestar personalizados.

Crea un plan de wellness integral para el empleado basado en sus necesidades.

FORMATO DE RESPUESTA (JSON estricto):
{
  "plan_name": "Nombre del plan personalizado",
  "duration_weeks": 12,
  "goals": [
    {
      "goal": "Objetivo",
      "metric": "Cómo se mide",
      "target": "Meta específica"
    }
  ],
  "weekly_activities": [
    {
      "week": 1,
      "focus_area": "Área de enfoque",
      "activities": [
        {
          "activity": "Nombre actividad",
          "frequency": "Frecuencia",
          "duration_minutes": 30,
          "type": "physical|mental|social|professional"
        }
      ],
      "check_in_questions": ["pregunta1"]
    }
  ],
  "resources": [
    {
      "resource": "Recurso disponible",
      "type": "app|service|content|professional",
      "access": "Cómo acceder"
    }
  ],
  "milestones": [
    {
      "week": 4,
      "milestone": "Hito a alcanzar",
      "reward": "Reconocimiento"
    }
  ],
  "support_network": {
    "hr_contact": true,
    "manager_involvement": "Nivel de involucración",
    "peer_support": "Tipo de apoyo entre compañeros",
    "professional_support": "Recursos profesionales si necesario"
  }
}`;

        userPrompt = `Crea un plan de wellness para:
- Empleado: ${employee_id}
- Necesidades: ${JSON.stringify(metrics || {})}
- Preferencias: ${JSON.stringify(survey_data || {})}
- Contexto: ${JSON.stringify(company_context || {})}`;
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
      console.error('[erp-hr-wellbeing-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-wellbeing-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-wellbeing-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
