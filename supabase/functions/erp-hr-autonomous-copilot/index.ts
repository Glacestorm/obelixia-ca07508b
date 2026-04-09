/**
 * erp-hr-autonomous-copilot - Autonomous HR Copilot
 * 
 * S6.3C: Migrated to validateTenantAccess + userClient
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

interface CopilotRequest {
  action: 'autonomous_review' | 'proactive_alert' | 'auto_schedule' | 
          'smart_delegation' | 'predictive_action' | 'continuous_optimization';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
  autonomyLevel?: 'advisory' | 'semi-autonomous' | 'fully-autonomous';
  company_id?: string;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, context, params, autonomyLevel = 'advisory', company_id } = 
      await req.json() as CopilotRequest;

    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'company_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- AUTH + TENANT VALIDATION (S6.3C) ---
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- END AUTH + TENANT VALIDATION ---

    let systemPrompt = '';
    let userPrompt = '';

    const baseContext = `
NIVEL DE AUTONOMÍA: ${autonomyLevel}
- advisory: Solo sugerencias, requiere aprobación humana
- semi-autonomous: Ejecuta acciones de bajo riesgo automáticamente
- fully-autonomous: Ejecuta todas las acciones con supervisión posterior

PRINCIPIOS DEL COPILOTO AUTÓNOMO:
1. Priorizar siempre el cumplimiento legal
2. Proteger la privacidad de los empleados
3. Documentar todas las decisiones
4. Escalar incertidumbres a humanos
5. Aprender de las correcciones
`;

    switch (action) {
      case 'autonomous_review':
        systemPrompt = `Eres un Copiloto IA Autónomo especializado en revisión de documentos y procesos de RRHH.
${baseContext}

CAPACIDADES DE REVISIÓN:
- Contratos laborales (cláusulas, plazos, conformidad)
- Solicitudes de vacaciones (disponibilidad, políticas)
- Evaluaciones de desempeño (sesgos, consistencia)
- Nóminas (cálculos, deducciones)
- Documentación de compliance

FORMATO DE RESPUESTA (JSON estricto):
{
  "review": {
    "documentType": "tipo",
    "status": "approved" | "needs_revision" | "rejected",
    "confidence": 0-100,
    "findings": [
      {
        "type": "info" | "warning" | "error",
        "field": "campo_afectado",
        "issue": "descripción",
        "suggestion": "recomendación",
        "autoFixable": true/false
      }
    ],
    "autoActions": [
      {
        "action": "descripción",
        "executed": true/false,
        "reason": "justificación"
      }
    ]
  },
  "humanReviewRequired": true/false,
  "escalationReason": "si aplica",
  "nextSteps": ["..."]
}`;
        userPrompt = `Revisa automáticamente el siguiente documento/proceso:
${JSON.stringify(context)}

Parámetros adicionales: ${JSON.stringify(params)}
Aplica el nivel de autonomía: ${autonomyLevel}`;
        break;

      case 'proactive_alert':
        systemPrompt = `Eres un Copiloto IA que genera alertas proactivas para prevenir problemas de RRHH.
${baseContext}

TIPOS DE ALERTAS PROACTIVAS:
- Vencimientos próximos (contratos, certificaciones, permisos)
- Riesgos de rotación detectados
- Anomalías en patrones de trabajo
- Incumplimientos potenciales
- Oportunidades de mejora

FORMATO DE RESPUESTA (JSON estricto):
{
  "alerts": [
    {
      "id": "uuid",
      "type": "warning" | "critical" | "opportunity",
      "category": "compliance" | "retention" | "performance" | "wellbeing",
      "title": "título_corto",
      "description": "descripción_detallada",
      "affectedEmployees": ["ids"],
      "deadline": "ISO-8601 o null",
      "suggestedActions": [
        {
          "action": "descripción",
          "priority": "high" | "medium" | "low",
          "canAutoExecute": true/false
        }
      ],
      "estimatedImpact": {
        "financial": "€X",
        "legal": "descripción",
        "reputational": "descripción"
      }
    }
  ],
  "summary": {
    "critical": number,
    "warning": number,
    "opportunity": number
  },
  "autoActionsAvailable": number
}`;
        userPrompt = `Analiza el contexto actual de RRHH y genera alertas proactivas:
${JSON.stringify(context)}

Detecta problemas potenciales antes de que ocurran.`;
        break;

      case 'auto_schedule':
        systemPrompt = `Eres un Copiloto IA que gestiona automáticamente la programación de RRHH.
${baseContext}

CAPACIDADES DE PROGRAMACIÓN:
- Entrevistas de selección
- Reuniones de feedback
- Formaciones obligatorias
- Revisiones de desempeño
- Onboarding de nuevos empleados
- Recordatorios de cumplimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "scheduledEvents": [
    {
      "id": "uuid",
      "type": "tipo_evento",
      "title": "título",
      "participants": ["ids"],
      "proposedSlots": [
        {
          "start": "ISO-8601",
          "end": "ISO-8601",
          "availability": 0-100,
          "conflicts": []
        }
      ],
      "selectedSlot": 0,
      "autoScheduled": true/false,
      "notifications": {
        "sent": true/false,
        "channels": ["email", "calendar"]
      }
    }
  ],
  "conflicts": [...],
  "optimizations": ["sugerencias_de_mejora"]
}`;
        userPrompt = `Programa automáticamente las siguientes actividades:
${JSON.stringify(params)}

Contexto de disponibilidad: ${JSON.stringify(context)}
Optimiza para minimizar conflictos y maximizar productividad.`;
        break;

      case 'smart_delegation':
        systemPrompt = `Eres un Copiloto IA que optimiza la delegación de tareas de RRHH.
${baseContext}

CRITERIOS DE DELEGACIÓN INTELIGENTE:
- Carga de trabajo actual
- Competencias y experiencia
- Historial de desempeño en tareas similares
- Disponibilidad y preferencias
- Desarrollo profesional

FORMATO DE RESPUESTA (JSON estricto):
{
  "delegations": [
    {
      "taskId": "uuid",
      "taskDescription": "...",
      "assignedTo": {
        "id": "employee_id",
        "name": "nombre",
        "matchScore": 0-100,
        "reasons": ["..."]
      },
      "alternatives": [
        {
          "id": "...",
          "name": "...",
          "matchScore": number
        }
      ],
      "deadline": "ISO-8601",
      "priority": "high" | "medium" | "low",
      "autoAssigned": true/false
    }
  ],
  "workloadBalance": {
    "before": {...},
    "after": {...},
    "improvement": "X%"
  }
}`;
        userPrompt = `Delega inteligentemente las siguientes tareas:
${JSON.stringify(params?.tasks)}

Equipo disponible: ${JSON.stringify(context?.team)}
Optimiza para equilibrio de carga y desarrollo profesional.`;
        break;

      case 'predictive_action':
        systemPrompt = `Eres un Copiloto IA predictivo que anticipa necesidades de RRHH.
${baseContext}

PREDICCIONES DISPONIBLES:
- Necesidades de contratación (próximos 3-6 meses)
- Riesgos de baja voluntaria
- Necesidades de formación
- Conflictos potenciales
- Picos de carga de trabajo
- Requerimientos de compliance

FORMATO DE RESPUESTA (JSON estricto):
{
  "predictions": [
    {
      "type": "tipo_prediccion",
      "timeframe": "periodo",
      "probability": 0-100,
      "confidence": 0-100,
      "description": "...",
      "dataPoints": ["factores_considerados"],
      "recommendedActions": [
        {
          "action": "...",
          "timing": "cuando_ejecutar",
          "expectedOutcome": "...",
          "canAutoExecute": true/false
        }
      ],
      "costOfInaction": {
        "financial": "€X",
        "operational": "...",
        "risk": "alto/medio/bajo"
      }
    }
  ],
  "accuracy": {
    "historicalAccuracy": "X%",
    "modelVersion": "v1.0",
    "lastUpdated": "ISO-8601"
  }
}`;
        userPrompt = `Genera predicciones para el contexto actual de RRHH:
${JSON.stringify(context)}

Horizonte temporal: ${params?.timeframe || '3 meses'}
Incluye acciones preventivas recomendadas.`;
        break;

      case 'continuous_optimization':
        systemPrompt = `Eres un Copiloto IA de optimización continua de procesos de RRHH.
${baseContext}

ÁREAS DE OPTIMIZACIÓN:
- Tiempos de proceso (reclutamiento, onboarding, aprobaciones)
- Costes operativos
- Satisfacción del empleado
- Cumplimiento normativo
- Eficiencia administrativa

FORMATO DE RESPUESTA (JSON estricto):
{
  "optimizations": [
    {
      "area": "área_optimizada",
      "currentState": {
        "metric": "nombre_métrica",
        "value": number,
        "benchmark": number
      },
      "proposedChanges": [
        {
          "change": "descripción",
          "impact": "alto" | "medio" | "bajo",
          "effort": "alto" | "medio" | "bajo",
          "roi": "X%",
          "autoImplementable": true/false
        }
      ],
      "projectedImprovement": "X%",
      "implementationSteps": ["..."]
    }
  ],
  "quickWins": [...],
  "longTermInitiatives": [...],
  "kpiDashboard": {
    "efficiency": number,
    "quality": number,
    "compliance": number,
    "satisfaction": number
  }
}`;
        userPrompt = `Analiza y optimiza los procesos de RRHH:
${JSON.stringify(context)}

Identifica mejoras de alto impacto y bajo esfuerzo (quick wins).
Propón también iniciativas estratégicas a largo plazo.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-hr-autonomous-copilot] Processing: ${action} (${autonomyLevel})`);

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
        temperature: 0.4,
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
      console.error('[erp-hr-autonomous-copilot] Parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-autonomous-copilot] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      autonomyLevel,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-autonomous-copilot] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
