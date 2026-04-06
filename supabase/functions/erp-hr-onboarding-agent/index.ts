import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface OnboardingRequest {
  action: 'generate_onboarding_plan' | 'suggest_buddy' | 'generate_tasks' | 'track_progress';
  company_id?: string;
  employee_id?: string;
  cnae_code?: string;
  job_position?: string;
  department?: string;
  employee_data?: Record<string, unknown>;
  onboarding_id?: string;
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

    const { action, company_id, employee_id, cnae_code, job_position, department, employee_data, onboarding_id } = await req.json() as OnboardingRequest;

    console.log(`[erp-hr-onboarding-agent] Action: ${action}, CNAE: ${cnae_code}, Position: ${job_position}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_onboarding_plan':
        systemPrompt = `Eres un experto en gestión de RRHH especializado en procesos de onboarding adaptados por sector económico (CNAE).

Tu rol es generar planes de incorporación personalizados según:
- El código CNAE de la empresa (sector económico)
- El puesto de trabajo del nuevo empleado
- Las mejores prácticas de recursos humanos 2025-2026

ESTRUCTURA DEL PLAN:
Cada plan debe tener 4-6 fases con tareas específicas.

FORMATO DE RESPUESTA (JSON estricto):
{
  "template_name": "Plan de Onboarding - [Sector] - [Puesto]",
  "description": "Descripción breve del plan",
  "estimated_duration_days": 30,
  "phases": [
    {
      "name": "Fase 1: Bienvenida y Documentación",
      "duration_days": 5,
      "tasks": [
        {
          "task_code": "DOC001",
          "task_name": "Firma de contrato",
          "description": "Revisión y firma del contrato laboral",
          "responsible": "hr",
          "priority": "critical",
          "documents_required": ["contrato", "dni"],
          "requires_signature": true
        }
      ]
    }
  ]
}

RESPONSABLES VÁLIDOS: employee, buddy, hr, manager, it, finance
PRIORIDADES VÁLIDAS: low, medium, high, critical`;

        userPrompt = `Genera un plan de onboarding completo para:
- CNAE: ${cnae_code || 'General'}
- Puesto: ${job_position || 'Empleado general'}
- Departamento: ${department || 'No especificado'}

Incluye tareas específicas del sector y formación obligatoria según CNAE.`;
        break;

      case 'suggest_buddy':
        systemPrompt = `Eres un experto en asignación de mentores corporativos (buddies) para onboarding.

Analiza las características del nuevo empleado y sugiere el perfil ideal de mentor.

FORMATO DE RESPUESTA (JSON estricto):
{
  "buddy_profile": {
    "ideal_department": "mismo departamento o relacionado",
    "minimum_seniority_months": 12,
    "required_skills": ["skill1", "skill2"],
    "personality_traits": ["paciente", "comunicativo"],
    "availability_hours_week": 3
  },
  "matching_criteria": [
    {"criterion": "Mismo departamento", "weight": 30},
    {"criterion": "Antigüedad mínima", "weight": 25}
  ],
  "recommendations": ["Consejo 1 para el buddy", "Consejo 2"]
}`;

        userPrompt = `Sugiere el perfil de buddy ideal para:
- Nuevo empleado: ${job_position || 'Empleado'}
- Departamento: ${department || 'General'}
- CNAE empresa: ${cnae_code || 'No especificado'}`;
        break;

      case 'generate_tasks':
        systemPrompt = `Eres un experto en tareas de onboarding adaptadas por sector CNAE.

Genera una lista de tareas específicas para la fase indicada del onboarding.

FORMATO DE RESPUESTA (JSON estricto):
{
  "tasks": [
    {
      "task_code": "FASE_XXX",
      "task_name": "Nombre de la tarea",
      "description": "Descripción detallada",
      "responsible": "employee|buddy|hr|manager|it|finance",
      "priority": "low|medium|high|critical",
      "estimated_duration_hours": 2,
      "documents_required": [],
      "requires_signature": false
    }
  ]
}`;

        userPrompt = `Genera tareas de onboarding para:
- CNAE: ${cnae_code || 'General'}
- Puesto: ${job_position || 'Empleado'}
- Datos adicionales: ${JSON.stringify(employee_data || {})}`;
        break;

      case 'track_progress':
        systemPrompt = `Eres un analista de progreso de onboarding.

Analiza el estado actual del proceso de incorporación y genera recomendaciones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "analysis": {
    "overall_status": "on_track|behind|at_risk|ahead",
    "completion_percentage": 45,
    "days_remaining": 15,
    "blockers": [],
    "achievements": []
  },
  "recommendations": [
    {"priority": "high", "action": "Acción recomendada", "reason": "Razón"}
  ],
  "next_milestones": [
    {"milestone": "Nombre", "due_in_days": 5, "tasks_remaining": 3}
  ]
}`;

        userPrompt = `Analiza el progreso del onboarding:
- ID: ${onboarding_id}
- Datos: ${JSON.stringify(employee_data || {})}`;
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
      console.error('[erp-hr-onboarding-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-onboarding-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-onboarding-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
