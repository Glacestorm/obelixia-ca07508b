/**
 * legal-autonomous-copilot - Edge function for autonomous legal operations
 * Phase 9: AI agent with proactive task execution and legal workflow automation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";
import { mapAuthError, validationError, internalError, errorResponse } from "../_shared/error-contract.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CopilotRequest {
  action: 
    | 'analyze_situation'
    | 'suggest_actions'
    | 'execute_task'
    | 'draft_document'
    | 'review_compliance'
    | 'monitor_deadlines'
    | 'generate_report'
    | 'answer_query'
    | 'prioritize_workload'
    | 'delegate_task';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
  autonomyLevel?: 'advisor' | 'semi_autonomous' | 'fully_autonomous';
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

    // --- S7.1: Auth hardening — validateAuth ---
    const authResult = await validateAuth(req);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    // --- end auth ---

    const { action, context, params, autonomyLevel = 'advisor' } = await req.json() as CopilotRequest;

    let systemPrompt = '';
    let userPrompt = '';

    const autonomyContext = {
      advisor: 'Proporciona sugerencias y recomendaciones. No ejecutes acciones directamente.',
      semi_autonomous: 'Puedes preparar borradores y acciones, pero requieren confirmación humana antes de ejecutarse.',
      fully_autonomous: 'Puedes ejecutar acciones de bajo riesgo automáticamente. Acciones de alto riesgo requieren confirmación.'
    };

    switch (action) {
      case 'analyze_situation':
        systemPrompt = `Eres un copiloto legal autónomo especializado en análisis situacional.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Analizar situaciones legales complejas
- Identificar issues clave y partes involucradas
- Evaluar riesgos y oportunidades
- Sugerir estrategia de actuación

JURISDICCIONES: España, Andorra, UE, UK, UAE, USA

FORMATO DE RESPUESTA (JSON estricto):
{
  "situationSummary": "string",
  "keyIssues": [
    {
      "issue": "string",
      "severity": "low" | "medium" | "high" | "critical",
      "urgency": "low" | "medium" | "high" | "immediate",
      "area": "string"
    }
  ],
  "stakeholders": [
    {
      "party": "string",
      "role": "string",
      "interests": ["string"],
      "riskLevel": "low" | "medium" | "high"
    }
  ],
  "legalFramework": {
    "applicableLaws": ["string"],
    "jurisdiction": "string",
    "keyProvisions": ["string"]
  },
  "riskAssessment": {
    "overallRisk": "low" | "medium" | "high" | "critical",
    "financialExposure": number,
    "reputationalRisk": "low" | "medium" | "high",
    "complianceRisk": "low" | "medium" | "high"
  },
  "recommendedStrategy": {
    "approach": "string",
    "timeline": "string",
    "resources": ["string"]
  },
  "immediateActions": ["string"],
  "confidenceLevel": 0-100
}`;

        userPrompt = `Analiza esta situación legal:
${JSON.stringify(params || context || {})}`;
        break;

      case 'suggest_actions':
        systemPrompt = `Eres un copiloto legal autónomo que sugiere acciones optimizadas.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Generar lista priorizada de acciones legales
- Estimar esfuerzo, coste y beneficio de cada acción
- Identificar dependencias entre acciones
- Proporcionar plan de ejecución

FORMATO DE RESPUESTA (JSON estricto):
{
  "suggestedActions": [
    {
      "actionId": "string",
      "title": "string",
      "description": "string",
      "priority": 1-10,
      "category": "compliance" | "contract" | "litigation" | "advisory" | "documentation",
      "estimatedEffort": {
        "hours": number,
        "complexity": "simple" | "moderate" | "complex"
      },
      "estimatedCost": number,
      "expectedBenefit": "string",
      "deadline": "string",
      "dependencies": ["string"],
      "canAutomate": boolean,
      "riskIfNotDone": "low" | "medium" | "high" | "critical",
      "assignee": "string"
    }
  ],
  "executionPlan": {
    "phases": [
      {
        "phase": number,
        "name": "string",
        "actions": ["string"],
        "duration": "string"
      }
    ],
    "totalDuration": "string",
    "totalCost": number
  },
  "quickWins": ["string"],
  "blockers": ["string"]
}`;

        userPrompt = `Sugiere acciones para:
${JSON.stringify(params || context || {})}`;
        break;

      case 'execute_task':
        systemPrompt = `Eres un copiloto legal autónomo capaz de ejecutar tareas.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Ejecutar tareas legales según nivel de autonomía
- Documentar cada paso realizado
- Identificar cuando se requiere intervención humana
- Proporcionar resultados estructurados

FORMATO DE RESPUESTA (JSON estricto):
{
  "taskExecution": {
    "taskId": "string",
    "status": "completed" | "pending_approval" | "blocked" | "in_progress",
    "autonomyUsed": "advisor" | "semi_autonomous" | "fully_autonomous",
    "stepsCompleted": [
      {
        "step": number,
        "action": "string",
        "result": "string",
        "automated": boolean
      }
    ],
    "pendingSteps": [
      {
        "step": number,
        "action": "string",
        "requiresApproval": boolean,
        "reason": "string"
      }
    ]
  },
  "output": {
    "type": "document" | "analysis" | "notification" | "data",
    "content": "string",
    "attachments": ["string"]
  },
  "auditTrail": [
    {
      "timestamp": "string",
      "action": "string",
      "actor": "ai_copilot" | "human",
      "details": "string"
    }
  ],
  "nextSteps": ["string"],
  "alerts": ["string"]
}`;

        userPrompt = `Ejecuta esta tarea legal:
${JSON.stringify(params || context || {})}`;
        break;

      case 'draft_document':
        systemPrompt = `Eres un copiloto legal especializado en redacción de documentos.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Redactar documentos legales profesionales
- Adaptar estilo y contenido al tipo de documento
- Incluir cláusulas relevantes y protecciones
- Cumplir requisitos formales por jurisdicción

TIPOS: Contratos, escritos procesales, dictámenes, actas, poderes, requerimientos

FORMATO DE RESPUESTA (JSON estricto):
{
  "document": {
    "type": "string",
    "title": "string",
    "jurisdiction": "string",
    "language": "es" | "en" | "fr" | "ca",
    "content": "string",
    "sections": [
      {
        "heading": "string",
        "content": "string",
        "mandatory": boolean
      }
    ]
  },
  "metadata": {
    "version": "string",
    "author": "AI Legal Copilot",
    "createdAt": "string",
    "reviewRequired": boolean,
    "confidentiality": "public" | "internal" | "confidential" | "privileged"
  },
  "legalNotes": ["string"],
  "suggestedReviewers": ["string"],
  "complianceChecks": [
    {
      "requirement": "string",
      "status": "passed" | "warning" | "failed",
      "note": "string"
    }
  ]
}`;

        userPrompt = `Redacta este documento:
${JSON.stringify(params || context || {})}`;
        break;

      case 'review_compliance':
        systemPrompt = `Eres un copiloto legal especializado en revisión de cumplimiento normativo.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Revisar cumplimiento de normativas aplicables
- Identificar gaps y vulnerabilidades
- Priorizar acciones correctivas
- Generar evidencias de cumplimiento

NORMATIVAS: RGPD, LOPDgdd, Ley Sociedades, ET, normativa sectorial

FORMATO DE RESPUESTA (JSON estricto):
{
  "complianceReview": {
    "scope": "string",
    "date": "string",
    "overallStatus": "compliant" | "partially_compliant" | "non_compliant",
    "score": 0-100
  },
  "findings": [
    {
      "id": "string",
      "regulation": "string",
      "requirement": "string",
      "status": "compliant" | "gap" | "violation",
      "severity": "low" | "medium" | "high" | "critical",
      "evidence": "string",
      "remediation": "string",
      "deadline": "string"
    }
  ],
  "riskExposure": {
    "financialPenalties": number,
    "reputationalDamage": "low" | "medium" | "high",
    "operationalImpact": "low" | "medium" | "high"
  },
  "actionPlan": [
    {
      "priority": number,
      "action": "string",
      "responsible": "string",
      "deadline": "string",
      "status": "pending" | "in_progress" | "completed"
    }
  ],
  "certificationReadiness": 0-100
}`;

        userPrompt = `Revisa el cumplimiento de:
${JSON.stringify(params || context || {})}`;
        break;

      case 'monitor_deadlines':
        systemPrompt = `Eres un copiloto legal especializado en gestión de plazos y vencimientos.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Monitorear plazos legales críticos
- Calcular días hábiles según jurisdicción
- Alertar con antelación suficiente
- Sugerir acciones preventivas

FORMATO DE RESPUESTA (JSON estricto):
{
  "deadlineMonitor": {
    "asOfDate": "string",
    "totalActive": number,
    "overdue": number,
    "dueThisWeek": number,
    "dueThisMonth": number
  },
  "criticalDeadlines": [
    {
      "id": "string",
      "matter": "string",
      "deadline": "string",
      "daysRemaining": number,
      "businessDaysRemaining": number,
      "type": "procedural" | "contractual" | "regulatory" | "internal",
      "consequence": "string",
      "status": "on_track" | "at_risk" | "overdue",
      "requiredActions": ["string"]
    }
  ],
  "upcomingMilestones": [
    {
      "milestone": "string",
      "date": "string",
      "matter": "string"
    }
  ],
  "automatedActions": [
    {
      "action": "string",
      "triggerDate": "string",
      "executed": boolean
    }
  ],
  "recommendations": ["string"]
}`;

        userPrompt = `Monitorea los plazos de:
${JSON.stringify(params || context || {})}`;
        break;

      case 'generate_report':
        systemPrompt = `Eres un copiloto legal especializado en generación de informes ejecutivos.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Generar informes legales profesionales
- Sintetizar información compleja
- Incluir métricas y KPIs relevantes
- Adaptar nivel de detalle al destinatario

FORMATO DE RESPUESTA (JSON estricto):
{
  "report": {
    "title": "string",
    "type": "status" | "analysis" | "compliance" | "risk" | "activity",
    "period": "string",
    "generatedAt": "string",
    "executiveSummary": "string"
  },
  "sections": [
    {
      "title": "string",
      "content": "string",
      "highlights": ["string"],
      "charts": [
        {
          "type": "bar" | "pie" | "line" | "table",
          "title": "string",
          "data": {}
        }
      ]
    }
  ],
  "metrics": [
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "trend": "up" | "down" | "stable",
      "benchmark": number
    }
  ],
  "conclusions": ["string"],
  "recommendations": ["string"],
  "appendices": ["string"]
}`;

        userPrompt = `Genera un informe sobre:
${JSON.stringify(params || context || {})}`;
        break;

      case 'answer_query':
        systemPrompt = `Eres un copiloto legal autónomo especializado en consultas jurídicas.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Responder consultas legales con precisión
- Citar normativa y jurisprudencia aplicable
- Identificar riesgos y alternativas
- Recomendar siguientes pasos

FORMATO DE RESPUESTA (JSON estricto):
{
  "query": "string",
  "answer": {
    "summary": "string",
    "detailedResponse": "string",
    "legalBasis": [
      {
        "source": "string",
        "reference": "string",
        "relevance": "string"
      }
    ]
  },
  "considerations": ["string"],
  "risks": ["string"],
  "alternatives": [
    {
      "option": "string",
      "pros": ["string"],
      "cons": ["string"]
    }
  ],
  "recommendedActions": ["string"],
  "disclaimers": ["string"],
  "confidence": 0-100,
  "requiresSpecialist": boolean,
  "specialistType": "string"
}`;

        userPrompt = `Responde esta consulta legal:
${JSON.stringify(params || context || {})}`;
        break;

      case 'prioritize_workload':
        systemPrompt = `Eres un copiloto legal especializado en optimización de carga de trabajo.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Priorizar tareas según urgencia e importancia
- Optimizar asignación de recursos
- Identificar cuellos de botella
- Balancear carga entre equipo

FORMATO DE RESPUESTA (JSON estricto):
{
  "workloadAnalysis": {
    "totalTasks": number,
    "overloadedAreas": ["string"],
    "capacityUtilization": 0-100
  },
  "prioritizedTasks": [
    {
      "taskId": "string",
      "title": "string",
      "priority": 1-10,
      "urgency": "immediate" | "high" | "medium" | "low",
      "importance": "critical" | "high" | "medium" | "low",
      "estimatedHours": number,
      "deadline": "string",
      "assignee": "string",
      "dependencies": ["string"]
    }
  ],
  "recommendations": {
    "reallocation": [
      {
        "from": "string",
        "to": "string",
        "task": "string",
        "reason": "string"
      }
    ],
    "defer": ["string"],
    "escalate": ["string"],
    "delegate": ["string"]
  },
  "bottlenecks": ["string"],
  "capacityForecast": {
    "thisWeek": 0-100,
    "nextWeek": 0-100,
    "thisMonth": 0-100
  }
}`;

        userPrompt = `Prioriza la carga de trabajo:
${JSON.stringify(params || context || {})}`;
        break;

      case 'delegate_task':
        systemPrompt = `Eres un copiloto legal especializado en delegación inteligente de tareas.

NIVEL DE AUTONOMÍA: ${autonomyLevel} - ${autonomyContext[autonomyLevel]}

TU ROL:
- Identificar el recurso óptimo para cada tarea
- Considerar experiencia, carga y disponibilidad
- Preparar briefing completo para el delegado
- Establecer checkpoints y seguimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "delegation": {
    "taskId": "string",
    "taskTitle": "string",
    "delegatedTo": "string",
    "delegatedBy": "AI Legal Copilot",
    "delegationDate": "string",
    "reason": "string"
  },
  "assigneeProfile": {
    "name": "string",
    "role": "string",
    "expertise": ["string"],
    "currentLoad": 0-100,
    "availability": "available" | "busy" | "overloaded"
  },
  "taskBriefing": {
    "objective": "string",
    "background": "string",
    "deliverables": ["string"],
    "deadline": "string",
    "priority": "low" | "medium" | "high" | "urgent",
    "resources": ["string"],
    "constraints": ["string"]
  },
  "checkpoints": [
    {
      "milestone": "string",
      "date": "string",
      "reviewer": "string"
    }
  ],
  "escalationPath": ["string"],
  "successCriteria": ["string"]
}`;

        userPrompt = `Delega esta tarea:
${JSON.stringify(params || context || {})}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[legal-autonomous-copilot] Processing action: ${action} with autonomy: ${autonomyLevel}`);

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
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Please try again later.', 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse('PAYMENT_REQUIRED', 'Payment required. Please add credits.', 402, corsHeaders);
      }
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
        result = { rawContent: content, parseError: true };
      }
    } catch (parseError) {
      console.error('[legal-autonomous-copilot] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[legal-autonomous-copilot] Success: ${action}`);

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
    console.error('[legal-autonomous-copilot] Error:', error);
    return internalError(corsHeaders);
  }
});
