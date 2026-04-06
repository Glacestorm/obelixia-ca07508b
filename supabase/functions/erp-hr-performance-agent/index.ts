import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface PerformanceRequest {
  action: 'analyze_employee' | 'suggest_objectives' | 'calculate_bonus' | 'predict_flight_risk' | 'generate_9box';
  company_id: string;
  employee_id?: string;
  cycle_id?: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, company_id, employee_id, cycle_id, params } = await req.json() as PerformanceRequest;

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
    const supabase = createClient(supabaseUrl, anonKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Tenant isolation
    if (company_id) {
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: membership } = await adminClient
        .from('erp_user_companies')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', company_id)
        .eq('is_active', true)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`[erp-hr-performance-agent] Action: ${action}, Company: ${company_id}, User: ${userId}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_employee':
        systemPrompt = `Eres un experto en gestión del desempeño y desarrollo de talento para empresas españolas.
Analiza el rendimiento del empleado basándote en sus objetivos, evaluaciones previas y métricas.

RESPONDE EN JSON:
{
  "overall_assessment": {
    "score": 0-100,
    "rating": "exceptional|exceeds_expectations|meets_expectations|needs_improvement|unsatisfactory",
    "summary": "resumen ejecutivo"
  },
  "strengths": ["fortaleza1", "fortaleza2"],
  "improvement_areas": ["area1", "area2"],
  "development_recommendations": ["recomendación1", "recomendación2"],
  "competency_analysis": {
    "technical": 0-100,
    "leadership": 0-100,
    "communication": 0-100,
    "teamwork": 0-100,
    "innovation": 0-100
  },
  "trend": "improving|stable|declining",
  "risk_factors": ["factor1"]
}`;
        userPrompt = `Analiza el desempeño del empleado ${employee_id} para el ciclo ${cycle_id}.
Contexto adicional: ${JSON.stringify(params || {})}`;
        break;

      case 'suggest_objectives':
        systemPrompt = `Eres un consultor de RRHH especializado en definición de objetivos SMART.
Genera objetivos personalizados basados en el rol, departamento y sector (CNAE) del empleado.

RESPONDE EN JSON:
{
  "suggested_objectives": [
    {
      "title": "título del objetivo",
      "description": "descripción detallada",
      "objective_type": "quantitative|qualitative|project|competency|development",
      "target_value": número o null,
      "target_unit": "unidad o null",
      "weight_percentage": 10-30,
      "due_date_offset_months": 3-12,
      "smart_criteria": {
        "specific": true,
        "measurable": true,
        "achievable": true,
        "relevant": true,
        "time_bound": true
      },
      "kpis": ["indicador1", "indicador2"],
      "alignment": "estrategia empresarial relacionada"
    }
  ],
  "total_weight": 100,
  "balance_analysis": {
    "quantitative_pct": 40,
    "qualitative_pct": 30,
    "development_pct": 30
  },
  "sector_benchmarks": ["práctica1 del sector"]
}`;
        userPrompt = `Genera objetivos para un empleado en el puesto: ${params?.job_title || 'no especificado'}.
Departamento: ${params?.department || 'no especificado'}
CNAE: ${params?.cnae || 'genérico'}
Período: ${params?.period || 'anual'}
Objetivos previos: ${JSON.stringify(params?.previous_objectives || [])}`;
        break;

      case 'calculate_bonus':
        systemPrompt = `Eres un experto en compensación variable y sistemas de bonus.
Calcula el bonus individual basándote en rendimiento, antigüedad y configuración de la empresa.

RESPONDE EN JSON:
{
  "calculation_breakdown": {
    "base_amount": número,
    "performance_multiplier": 0.5-1.5,
    "tenure_bonus": número,
    "department_adjustment": número,
    "total_bonus": número
  },
  "performance_contribution": {
    "score": 0-100,
    "ranking_percentile": 0-100,
    "weight_applied": porcentaje
  },
  "tenure_contribution": {
    "months": número,
    "factor": 0-1,
    "weight_applied": porcentaje
  },
  "comparison": {
    "vs_department_avg": "+X% o -X%",
    "vs_company_avg": "+X% o -X%"
  },
  "recommendations": ["ajuste1"],
  "tax_impact_estimate": {
    "gross": número,
    "estimated_net": número,
    "irpf_rate": porcentaje
  }
}`;
        userPrompt = `Calcula el bonus para empleado ${employee_id}.
Salario base: ${params?.base_salary || 0}€
Score de desempeño: ${params?.performance_score || 0}
Antigüedad: ${params?.tenure_months || 0} meses
Configuración bonus: ${JSON.stringify(params?.bonus_config || {})}`;
        break;

      case 'predict_flight_risk':
        systemPrompt = `Eres un especialista en retención de talento y análisis predictivo de RRHH.
Evalúa el riesgo de fuga del empleado basándote en indicadores clave.

RESPONDE EN JSON:
{
  "flight_risk_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "risk_factors": [
    {
      "factor": "nombre del factor",
      "weight": 0-100,
      "description": "explicación",
      "mitigable": true|false
    }
  ],
  "warning_signals": ["señal1", "señal2"],
  "retention_recommendations": [
    {
      "action": "acción recomendada",
      "priority": "high|medium|low",
      "estimated_impact": "alto|medio|bajo",
      "timeline": "inmediato|corto_plazo|medio_plazo"
    }
  ],
  "engagement_indicators": {
    "performance_trend": "up|stable|down",
    "tenure_risk_zone": true|false,
    "compensation_competitiveness": 0-100,
    "growth_opportunities": 0-100
  },
  "market_factors": {
    "sector_demand": "alta|media|baja",
    "role_scarcity": "alta|media|baja"
  }
}`;
        userPrompt = `Evalúa riesgo de fuga para empleado ${employee_id}.
Datos del empleado: ${JSON.stringify(params?.employee_data || {})}
Histórico de evaluaciones: ${JSON.stringify(params?.evaluation_history || [])}
Sector CNAE: ${params?.cnae || 'genérico'}`;
        break;

      case 'generate_9box':
        systemPrompt = `Eres un experto en gestión del talento y desarrollo organizacional.
Genera el posicionamiento en la matriz 9-Box basándote en rendimiento y potencial.

RESPONDE EN JSON:
{
  "performance_axis": 1-3,
  "potential_axis": 1-3,
  "grid_position": "star|high_performer|solid_performer|high_potential|core_player|effective|inconsistent|dilemma|underperformer",
  "position_description": "descripción del cuadrante",
  "assessment_rationale": {
    "performance_justification": "explicación",
    "potential_justification": "explicación"
  },
  "development_path": {
    "current_state": "descripción",
    "target_state": "descripción",
    "timeline_months": 12-24,
    "key_milestones": ["hito1", "hito2"]
  },
  "succession_potential": {
    "ready_now": false,
    "ready_in_1_year": true|false,
    "ready_in_2_years": true|false,
    "target_roles": ["rol1", "rol2"]
  },
  "recommended_actions": [
    {
      "action": "acción",
      "category": "development|retention|promotion|coaching",
      "priority": 1-5
    }
  ]
}`;
        userPrompt = `Genera posicionamiento 9-Box para empleado ${employee_id}.
Evaluaciones del ciclo: ${JSON.stringify(params?.evaluations || [])}
Objetivos y logros: ${JSON.stringify(params?.objectives || [])}
Datos de carrera: ${JSON.stringify(params?.career_data || {})}`;
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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded' 
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
      console.error('[erp-hr-performance-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-performance-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-performance-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
