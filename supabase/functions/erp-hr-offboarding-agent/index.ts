import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, validateAuth, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface OffboardingRequest {
  action: 'analyze_termination' | 'suggest_optimal_dates' | 'calculate_costs' | 
          'generate_documents' | 'generate_tasks' | 'coordinate_legal' | 'get_offboarding_status';
  employeeId?: string;
  terminationId?: string;
  terminationType?: string;
  terminationDate?: string;
  companyId?: string;
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

    const { action, employeeId, terminationId, terminationType, terminationDate, companyId, context } = await req.json() as OffboardingRequest;

    // S4.1: Auth + tenant isolation via shared utility
    let userId: string;
    if (companyId) {
      const tenantResult = await validateTenantAccess(req, companyId);
      if (isAuthError(tenantResult)) {
        return mapAuthError(tenantResult, corsHeaders);
      }
      userId = tenantResult.userId;
    } else {
      const authResult = await validateAuth(req);
      if (isAuthError(authResult)) {
        return mapAuthError(authResult, corsHeaders);
      }
      userId = authResult.userId;
    }

    // userClient for RLS-protected data queries
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log(`[erp-hr-offboarding-agent] Action: ${action}, Employee: ${employeeId}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_termination':
        systemPrompt = `Eres un experto en relaciones laborales y recursos humanos especializado en procesos de desvinculación en España.

CONTEXTO DEL ROL:
- Análisis completo de situación del empleado antes de la desvinculación
- Evaluación de riesgos legales según normativa laboral española
- Identificación de mejores prácticas para proteger intereses de la empresa
- Consideración de antigüedad, tipo de contrato, y circunstancias específicas

NORMATIVA APLICABLE:
- Estatuto de los Trabajadores (ET)
- Ley de Procedimiento Laboral
- Convenios colectivos aplicables
- Doctrina del Tribunal Supremo

FORMATO DE RESPUESTA (JSON estricto):
{
  "analysis": {
    "employee_profile": {
      "tenure_years": number,
      "contract_type": string,
      "risk_factors": string[]
    },
    "termination_assessment": {
      "recommended_type": string,
      "justification": string,
      "documentation_required": string[]
    },
    "legal_risks": [
      {
        "risk": string,
        "probability": "low" | "medium" | "high",
        "mitigation": string
      }
    ]
  },
  "recommendations": string[],
  "estimated_timeline_days": number,
  "complexity_score": 1-10
}`;

        // Fetch employee data
        let employeeData = null;
        if (employeeId) {
          const { data: emp } = await supabase
            .from('erp_hr_employees')
            .select('*, contracts:erp_hr_contracts(*)')
            .eq('id', employeeId)
            .single();
          employeeData = emp;
        }

        userPrompt = `Analiza la situación de desvinculación para el siguiente empleado:

Datos del empleado: ${JSON.stringify(employeeData || context?.employee || {})}
Tipo de desvinculación propuesto: ${terminationType || 'No especificado'}
Fecha propuesta: ${terminationDate || 'No especificada'}
Contexto adicional: ${JSON.stringify(context || {})}

Proporciona un análisis completo con riesgos y recomendaciones.`;
        break;

      case 'suggest_optimal_dates':
        systemPrompt = `Eres un experto en optimización de procesos de desvinculación laboral en España.

FACTORES A CONSIDERAR:
- Fin de mes (cotizaciones SS completas)
- Fin de trimestre (bonus, comisiones)
- Periodos de preaviso legal
- Vacaciones pendientes
- Festivos y puentes
- Proyectos en curso
- Impacto fiscal

FORMATO DE RESPUESTA (JSON estricto):
{
  "optimal_dates": [
    {
      "date": "YYYY-MM-DD",
      "score": 1-100,
      "reasons": string[],
      "estimated_cost_impact": number,
      "risks": string[]
    }
  ],
  "notice_period_required": number,
  "vacation_days_pending": number,
  "recommendation": string
}`;

        userPrompt = `Sugiere las mejores fechas de terminación considerando:

Fecha propuesta inicial: ${terminationDate || 'No especificada'}
Tipo de desvinculación: ${terminationType || 'objective'}
Datos del empleado: ${JSON.stringify(context?.employee || {})}
Contrato actual: ${JSON.stringify(context?.contract || {})}

Analiza los próximos 90 días y sugiere las 3 mejores fechas.`;
        break;

      case 'calculate_costs':
        systemPrompt = `Eres un experto en cálculo de indemnizaciones y finiquitos según la legislación laboral española.

CONCEPTOS A CALCULAR:
1. Indemnización por despido (según tipo):
   - Objetivo: 20 días/año (máx 12 meses)
   - Improcedente: 33 días/año (máx 24 meses) o 45/42 días pre-2012
   - Disciplinario procedente: 0
   - Voluntario: 0

2. Finiquito:
   - Salario pendiente
   - Vacaciones no disfrutadas
   - Parte proporcional pagas extras
   - Bonus/comisiones devengados

3. Otros:
   - Cláusulas de no competencia
   - Compensación por pactos específicos

FORMATO DE RESPUESTA (JSON estricto):
{
  "cost_breakdown": {
    "indemnity": {
      "calculation_base": number,
      "days_per_year": number,
      "years_service": number,
      "amount": number,
      "legal_reference": string
    },
    "severance": {
      "pending_salary": number,
      "pending_vacation": number,
      "proportional_extras": number,
      "bonus_commission": number,
      "total": number
    },
    "other_costs": {
      "non_compete": number,
      "special_agreements": number,
      "legal_fees_provision": number
    }
  },
  "total_min": number,
  "total_max": number,
  "tax_implications": string,
  "payment_timeline": string
}`;

        userPrompt = `Calcula los costes de terminación para:

Tipo de desvinculación: ${terminationType || 'objective'}
Datos del empleado: ${JSON.stringify(context?.employee || {})}
Datos salariales: ${JSON.stringify(context?.salary || {})}
Contrato: ${JSON.stringify(context?.contract || {})}

Proporciona cálculo detallado con referencias legales.`;
        break;

      case 'generate_documents':
        systemPrompt = `Eres un experto en documentación laboral española para procesos de desvinculación.

DOCUMENTOS TÍPICOS:
- Carta de despido (con causas según tipo)
- Comunicación de preaviso
- Propuesta de finiquito
- Certificado de empresa
- Vida laboral
- Acuerdo de confidencialidad post-empleo

FORMATO DE RESPUESTA (JSON estricto):
{
  "documents_required": [
    {
      "document_type": string,
      "template_code": string,
      "priority": "required" | "recommended" | "optional",
      "deadline": string,
      "variables_needed": string[]
    }
  ],
  "checklist": string[],
  "legal_warnings": string[]
}`;

        userPrompt = `Lista los documentos necesarios para:

Tipo de desvinculación: ${terminationType}
Datos del empleado: ${JSON.stringify(context?.employee || {})}
Fecha prevista: ${terminationDate}`;
        break;

      case 'generate_tasks':
        systemPrompt = `Eres un experto en gestión de procesos de offboarding empresarial.

FASES DEL OFFBOARDING:
1. Pre-terminación (antes de comunicar)
2. Día de terminación
3. Post-terminación (hasta 15 días después)

ÁREAS RESPONSABLES:
- RRHH: documentación, comunicación, finiquito
- IT: revocación accesos, recuperación equipos
- Manager: transferencia conocimiento
- Legal: revisión documentos, riesgos
- Finance: pagos finales, provisiones

FORMATO DE RESPUESTA (JSON estricto):
{
  "tasks": [
    {
      "task_code": string,
      "task_name": string,
      "description": string,
      "task_type": "documentation" | "access_revocation" | "knowledge_transfer" | "exit_interview" | "equipment_return" | "final_payment" | "certificate_issuance" | "notification" | "compliance",
      "phase": "pre_termination" | "termination_day" | "post_termination",
      "responsible_type": "employee" | "hr" | "manager" | "it" | "legal" | "finance",
      "order_in_phase": number,
      "days_before_termination": number,
      "critical": boolean
    }
  ],
  "timeline_summary": string,
  "risk_points": string[]
}`;

        userPrompt = `Genera las tareas de offboarding para:

Tipo de desvinculación: ${terminationType}
Fecha terminación: ${terminationDate}
Datos empleado: ${JSON.stringify(context?.employee || {})}
Puesto: ${context?.position || 'No especificado'}`;
        break;

      case 'coordinate_legal':
        systemPrompt = `Eres un coordinador entre RRHH y el departamento jurídico para procesos de desvinculación.

ROL:
- Preparar informe resumen para revisión legal
- Identificar puntos que requieren validación jurídica
- Proponer timeline de coordinación
- Alertar sobre riesgos que requieren intervención legal

FORMATO DE RESPUESTA (JSON estricto):
{
  "legal_review_summary": {
    "case_complexity": "low" | "medium" | "high",
    "estimated_review_hours": number,
    "urgent_points": string[],
    "documents_for_review": string[]
  },
  "risk_assessment": {
    "litigation_probability": "low" | "medium" | "high",
    "estimated_exposure": number,
    "mitigation_recommendations": string[]
  },
  "coordination_timeline": [
    {
      "milestone": string,
      "deadline": string,
      "responsible": string
    }
  ],
  "legal_questions": string[]
}`;

        userPrompt = `Prepara informe de coordinación legal para:

Caso: ${JSON.stringify(context || {})}
Tipo: ${terminationType}
Riesgos identificados: ${JSON.stringify(context?.risks || [])}`;
        break;

      case 'get_offboarding_status':
        // Fetch real data from database
        if (terminationId) {
          const { data: termination } = await supabase
            .from('erp_hr_termination_analysis')
            .select(`
              *,
              employee:erp_hr_employees(*),
              tasks:erp_hr_offboarding_tasks(*)
            `)
            .eq('id', terminationId)
            .single();

          if (termination) {
            const totalTasks = termination.tasks?.length || 0;
            const completedTasks = termination.tasks?.filter((t: any) => t.status === 'completed').length || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return new Response(JSON.stringify({
              success: true,
              action,
              data: {
                termination,
                progress,
                stats: {
                  total_tasks: totalTasks,
                  completed: completedTasks,
                  pending: totalTasks - completedTasks,
                  by_phase: {
                    pre_termination: termination.tasks?.filter((t: any) => t.phase === 'pre_termination') || [],
                    termination_day: termination.tasks?.filter((t: any) => t.phase === 'termination_day') || [],
                    post_termination: termination.tasks?.filter((t: any) => t.phase === 'post_termination') || []
                  }
                }
              },
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // List all active terminations for company
        const { data: terminations } = await supabase
          .from('erp_hr_termination_analysis')
          .select(`
            *,
            employee:erp_hr_employees(id, first_name, last_name, position)
          `)
          .eq('company_id', companyId)
          .in('status', ['draft', 'under_review', 'approved', 'in_progress'])
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({
          success: true,
          action,
          data: {
            active_terminations: terminations || [],
            count: terminations?.length || 0
          },
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // Call AI for analysis actions
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

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

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
      console.error('[erp-hr-offboarding-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-offboarding-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-offboarding-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});