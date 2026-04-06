import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface TrainingAgentRequest {
  action: 'analyze_gaps' | 'recommend_trainings' | 'assess_competencies' | 'budget_forecast' | 'certification_alerts';
  employee_id?: string;
  company_id?: string;
  department_id?: string;
  competency_ids?: string[];
  year?: number;
  context?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { action, employee_id, company_id, department_id, competency_ids, year, context } = await req.json() as TrainingAgentRequest;

    console.log(`[erp-hr-training-agent] Action: ${action}, Company: ${company_id}, Employee: ${employee_id}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_gaps':
        systemPrompt = `Eres un experto en análisis de brechas formativas y desarrollo profesional.

CONTEXTO:
- Analizas las competencias actuales vs requeridas por el puesto
- Identificas gaps críticos que afectan al desempeño
- Priorizas por impacto en productividad y cumplimiento normativo

FORMATO DE RESPUESTA (JSON estricto):
{
  "gaps": [
    {
      "competency_name": "string",
      "current_level": 1-5,
      "required_level": 1-5,
      "gap_severity": "critical" | "high" | "medium" | "low",
      "impact_areas": ["string"],
      "estimated_training_hours": number
    }
  ],
  "priority_ranking": ["competency_name ordenadas por prioridad"],
  "total_training_hours_needed": number,
  "estimated_cost_range": { "min": number, "max": number },
  "recommendations": ["string"],
  "compliance_risks": ["string si aplica"]
}`;

        userPrompt = `Analiza gaps formativos para:
- Empleado: ${employee_id || 'análisis general'}
- Empresa: ${company_id}
- Departamento: ${department_id || 'todos'}
- Contexto adicional: ${JSON.stringify(context || {})}`;
        break;

      case 'recommend_trainings':
        systemPrompt = `Eres un especialista en recomendación de formaciones corporativas en España.

CONTEXTO:
- Conoces el catálogo de formación bonificada FUNDAE
- Priorizas formaciones con certificación oficial
- Consideras modalidad (presencial/online/blended) según perfil

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendations": [
    {
      "training_title": "string",
      "provider_type": "interno" | "externo" | "online",
      "modality": "presencial" | "online" | "blended",
      "duration_hours": number,
      "estimated_cost": number,
      "bonificable": boolean,
      "certification_name": "string o null",
      "competencies_covered": ["string"],
      "priority": 1-10,
      "roi_justification": "string"
    }
  ],
  "total_investment": number,
  "bonificable_amount": number,
  "implementation_timeline": "string",
  "success_metrics": ["string"]
}`;

        userPrompt = `Recomienda formaciones para:
- Competencias a desarrollar: ${JSON.stringify(competency_ids || [])}
- Empleado: ${employee_id || 'varios empleados'}
- Sector/CNAE: ${context?.cnae_code || 'general'}
- Presupuesto disponible: ${context?.budget || 'sin límite definido'}€`;
        break;

      case 'assess_competencies':
        systemPrompt = `Eres un evaluador experto en competencias profesionales.

CONTEXTO:
- Evalúas competencias técnicas, soft skills y liderazgo
- Usas escala 1-5 (Básico, Intermedio, Avanzado, Experto, Referente)
- Generas plan de desarrollo individual

FORMATO DE RESPUESTA (JSON estricto):
{
  "assessment": [
    {
      "competency_name": "string",
      "category": "technical" | "soft" | "leadership" | "compliance",
      "current_level": 1-5,
      "level_description": "string",
      "strengths": ["string"],
      "development_areas": ["string"],
      "suggested_actions": ["string"]
    }
  ],
  "overall_profile": {
    "primary_strengths": ["string"],
    "key_gaps": ["string"],
    "career_potential": "string",
    "ready_for_promotion": boolean
  },
  "development_plan": {
    "short_term": ["acciones 0-3 meses"],
    "medium_term": ["acciones 3-12 meses"],
    "long_term": ["acciones 12+ meses"]
  }
}`;

        userPrompt = `Evalúa competencias de empleado ${employee_id}:
- Puesto actual: ${context?.job_title || 'no especificado'}
- Antigüedad: ${context?.tenure_months || 'desconocida'} meses
- Desempeño reciente: ${context?.performance_score || 'no disponible'}
- Objetivos de carrera: ${context?.career_goals || 'no definidos'}`;
        break;

      case 'budget_forecast':
        systemPrompt = `Eres un experto en planificación presupuestaria de formación corporativa.

CONTEXTO:
- Calculas inversión óptima en formación (benchmark: 1-3% masa salarial)
- Maximizas bonificaciones FUNDAE
- Distribuyes por departamento y prioridad

FORMATO DE RESPUESTA (JSON estricto):
{
  "forecast": {
    "total_budget_recommended": number,
    "percentage_of_payroll": number,
    "fundae_credit_available": number,
    "net_investment": number
  },
  "distribution": [
    {
      "department": "string",
      "budget": number,
      "priority_trainings": ["string"],
      "expected_roi": "string"
    }
  ],
  "quarterly_breakdown": {
    "q1": number,
    "q2": number,
    "q3": number,
    "q4": number
  },
  "kpis": {
    "hours_per_employee": number,
    "cost_per_employee": number,
    "certification_target": number
  }
}`;

        userPrompt = `Proyecta presupuesto de formación ${year || new Date().getFullYear()}:
- Empresa: ${company_id}
- Total empleados: ${context?.total_employees || 'desconocido'}
- Masa salarial anual: ${context?.annual_payroll || 'no disponible'}€
- Sector CNAE: ${context?.cnae_code || 'general'}`;
        break;

      case 'certification_alerts':
        systemPrompt = `Eres un gestor de certificaciones profesionales y vencimientos.

CONTEXTO:
- Monitorizas certificaciones obligatorias por CNAE
- Alertas de vencimiento con antelación suficiente
- Gestionas renovaciones y reciclajes

FORMATO DE RESPUESTA (JSON estricto):
{
  "alerts": [
    {
      "employee_name": "string",
      "certification_name": "string",
      "expiry_date": "YYYY-MM-DD",
      "days_until_expiry": number,
      "alert_level": "critical" | "warning" | "info",
      "renewal_action": "string",
      "estimated_renewal_cost": number,
      "is_mandatory": boolean
    }
  ],
  "summary": {
    "total_expiring_30_days": number,
    "total_expiring_90_days": number,
    "total_expired": number,
    "mandatory_at_risk": number
  },
  "recommended_actions": ["string"],
  "compliance_status": "compliant" | "at_risk" | "non_compliant"
}`;

        userPrompt = `Genera alertas de certificaciones:
- Empresa: ${company_id}
- Horizonte de análisis: ${context?.days_ahead || 90} días
- Solo obligatorias: ${context?.mandatory_only || false}`;
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
      console.error('[erp-hr-training-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-training-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-training-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
