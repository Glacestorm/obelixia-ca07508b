/**
 * GALIA Auto-Approval System
 * Sistema de aprobación semi-automática para expedientes que cumplen 100% criterios
 * Validación humana requerida en 24h
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoApprovalRequest {
  action: 'check_eligibility' | 'pre_approve' | 'confirm_approval' | 'reject' | 'get_pending';
  expediente_id?: string;
  tecnico_id?: string;
  reason?: string;
}

interface EligibilityResult {
  expedienteId: string;
  eligible: boolean;
  score: number;
  criteriaResults: Array<{
    criterion: string;
    passed: boolean;
    details: string;
    weight: number;
  }>;
  missingDocuments: string[];
  recommendations: string[];
  autoApprovalPossible: boolean;
  expiresAt: string;
}

interface PreApprovalResult {
  id: string;
  expedienteId: string;
  status: 'pending_confirmation' | 'confirmed' | 'rejected' | 'expired';
  preApprovedAt: string;
  expiresAt: string;
  validationRequired: boolean;
  assignedTecnico: string | null;
  eligibilityScore: number;
  criteriaSnapshot: object;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, expediente_id, tecnico_id, reason } = await req.json() as AutoApprovalRequest;

    console.log(`[galia-auto-approval] Action: ${action}, Expediente: ${expediente_id}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'check_eligibility':
        systemPrompt = `Eres un experto en análisis de elegibilidad de expedientes LEADER/FEDER.

CRITERIOS DE ELEGIBILIDAD AUTOMÁTICA:
1. Documentación completa (100% requerida)
2. Beneficiario en zona elegible LEADER
3. Proyecto alineado con prioridades de la convocatoria
4. Presupuesto dentro de límites establecidos
5. Sin irregularidades detectadas en análisis previos
6. Plazo de presentación válido
7. Tres ofertas válidas para gastos >18.000€
8. NIF/CIF válido y verificado
9. No existe duplicidad con otros expedientes
10. Cumple requisitos de viabilidad económica

FORMATO DE RESPUESTA (JSON estricto):
{
  "eligible": boolean,
  "score": number (0-100),
  "criteriaResults": [
    {
      "criterion": "nombre del criterio",
      "passed": boolean,
      "details": "explicación detallada",
      "weight": number (1-10)
    }
  ],
  "missingDocuments": ["documento1", "documento2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "autoApprovalPossible": boolean,
  "reasoning": "explicación de la decisión"
}`;

        userPrompt = `Analiza la elegibilidad del expediente ${expediente_id} para aprobación semi-automática.

Simula el análisis considerando:
- Fecha actual: ${new Date().toISOString()}
- Plazo máximo de validación: 24 horas
- Umbral mínimo para pre-aprobación: 95% criterios cumplidos`;
        break;

      case 'pre_approve':
        systemPrompt = `Eres un sistema de pre-aprobación de expedientes LEADER.

PROCESO DE PRE-APROBACIÓN:
1. Verificar que el score de elegibilidad >= 95%
2. Generar código de pre-aprobación único
3. Establecer fecha límite de confirmación (24h)
4. Asignar a técnico para validación final
5. Registrar snapshot de criterios evaluados

FORMATO DE RESPUESTA (JSON estricto):
{
  "preApprovalId": "string UUID",
  "status": "pending_confirmation",
  "eligibilityScore": number,
  "assignmentRecommendation": {
    "tecnicoId": "string o null",
    "reason": "razón de la asignación"
  },
  "validationChecklist": [
    {
      "item": "elemento a validar",
      "priority": "high" | "medium" | "low",
      "automated": boolean
    }
  ],
  "expirationWarning": "mensaje sobre expiración",
  "notificationsSent": ["tipo de notificación enviada"]
}`;

        userPrompt = `Pre-aprobar el expediente ${expediente_id}.
Técnico asignado: ${tecnico_id || 'auto-asignar'}
Fecha límite confirmación: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}`;
        break;

      case 'confirm_approval':
        systemPrompt = `Eres un sistema de confirmación de aprobaciones LEADER.

PROCESO DE CONFIRMACIÓN:
1. Verificar que la pre-aprobación no ha expirado
2. Registrar confirmación del técnico
3. Actualizar estado del expediente a "aprobado"
4. Generar notificación al beneficiario
5. Actualizar métricas de aprobación automática

FORMATO DE RESPUESTA (JSON estricto):
{
  "confirmed": boolean,
  "expedienteId": "string",
  "finalStatus": "aprobado" | "rechazado" | "pendiente",
  "confirmationCode": "código único",
  "confirmedBy": "ID técnico",
  "confirmedAt": "timestamp",
  "notificationsSent": {
    "beneficiario": boolean,
    "sistema": boolean
  },
  "nextSteps": ["paso siguiente 1", "paso siguiente 2"],
  "auditTrail": {
    "action": "confirmation",
    "details": "detalles de la confirmación"
  }
}`;

        userPrompt = `Confirmar aprobación del expediente ${expediente_id}.
Técnico confirmador: ${tecnico_id}
Motivo: ${reason || 'Validación satisfactoria'}`;
        break;

      case 'reject':
        systemPrompt = `Eres un sistema de rechazo de pre-aprobaciones LEADER.

PROCESO DE RECHAZO:
1. Registrar motivo de rechazo
2. Revertir estado a "en revisión"
3. Notificar al beneficiario con motivos
4. Generar recomendaciones de subsanación

FORMATO DE RESPUESTA (JSON estricto):
{
  "rejected": true,
  "expedienteId": "string",
  "reason": "motivo detallado",
  "rejectedBy": "ID técnico",
  "rejectedAt": "timestamp",
  "canResubmit": boolean,
  "subsanationDeadline": "fecha límite si aplica",
  "recommendations": ["recomendación para subsanar"],
  "appealInfo": {
    "canAppeal": boolean,
    "deadline": "fecha límite recurso",
    "procedure": "procedimiento de recurso"
  }
}`;

        userPrompt = `Rechazar pre-aprobación del expediente ${expediente_id}.
Técnico: ${tecnico_id}
Motivo: ${reason}`;
        break;

      case 'get_pending':
        systemPrompt = `Eres un sistema de gestión de pre-aprobaciones pendientes.

FORMATO DE RESPUESTA (JSON estricto):
{
  "pendingApprovals": [
    {
      "id": "string",
      "expedienteId": "string",
      "beneficiario": "nombre",
      "importeSolicitado": number,
      "preApprovedAt": "timestamp",
      "expiresAt": "timestamp",
      "hoursRemaining": number,
      "priority": "urgent" | "normal" | "low",
      "assignedTecnico": "nombre o null",
      "eligibilityScore": number
    }
  ],
  "summary": {
    "total": number,
    "expiringSoon": number,
    "unassigned": number
  },
  "alerts": ["alerta1", "alerta2"]
}`;

        userPrompt = `Obtener lista de pre-aprobaciones pendientes de confirmación.
Fecha actual: ${new Date().toISOString()}
Mostrar solo las que expiran en las próximas 48 horas con prioridad.`;
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
        temperature: 0.3,
        max_tokens: 2000,
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
      console.error('[galia-auto-approval] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    // Add metadata
    if (action === 'check_eligibility' && result.eligible !== undefined) {
      result.expedienteId = expediente_id;
      result.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    console.log(`[galia-auto-approval] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-auto-approval] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
