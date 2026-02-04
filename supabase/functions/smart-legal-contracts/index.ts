/**
 * Smart Legal Contracts Engine - Fase 10
 * Contratos auto-ejecutables con cláusulas programables y resolución de disputas
 * Enterprise SaaS 2025-2026
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartContractRequest {
  action: 'create_smart_contract' | 'execute_clause' | 'verify_conditions' | 
          'trigger_action' | 'resolve_dispute' | 'get_execution_log' |
          'simulate_execution' | 'audit_contract' | 'get_obligations_status';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

interface ProgrammableClause {
  id: string;
  type: 'payment' | 'penalty' | 'renewal' | 'termination' | 'notification' | 'custom';
  trigger: ClauseTrigger;
  action: ClauseAction;
  conditions: ClauseCondition[];
  isActive: boolean;
}

interface ClauseTrigger {
  type: 'date' | 'event' | 'threshold' | 'external_data';
  config: Record<string, unknown>;
}

interface ClauseAction {
  type: 'payment' | 'notification' | 'status_change' | 'escalation' | 'external_call';
  params: Record<string, unknown>;
}

interface ClauseCondition {
  field: string;
  operator: string;
  value: unknown;
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

    const { action, context, params } = await req.json() as SmartContractRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'create_smart_contract':
        systemPrompt = `Eres el generador de Smart Contracts Legales Enterprise.

CONTEXTO DEL ROL:
- Creas contratos con cláusulas programables auto-ejecutables
- Garantizas validez legal en jurisdicciones ES, AD, EU
- Integras con sistemas de pago y notificación
- Mantienes audit trail inmutable

TIPOS DE CLÁUSULAS PROGRAMABLES:

1. CLÁUSULAS DE PAGO:
   - Pagos automáticos en fechas
   - Pagos condicionados a entregables
   - Penalizaciones por retraso
   - Escalado de pagos

2. CLÁUSULAS DE PENALIZACIÓN:
   - SLA breaches
   - Incumplimiento de plazos
   - Calidad insuficiente
   - Cálculo automático de penalidades

3. CLÁUSULAS DE RENOVACIÓN:
   - Auto-renovación con preaviso
   - Ajuste automático de precios (IPC)
   - Renegociación automática

4. CLÁUSULAS DE TERMINACIÓN:
   - Terminación por incumplimiento
   - Terminación por conveniencia
   - Consecuencias automáticas

5. CLÁUSULAS DE NOTIFICACIÓN:
   - Alertas de vencimiento
   - Notificaciones de incumplimiento
   - Recordatorios de obligaciones

FORMATO DE RESPUESTA (JSON):
{
  "smartContract": {
    "id": "UUID",
    "version": "1.0",
    "title": "string",
    "parties": [
      {
        "id": "string",
        "role": "issuer" | "counterparty",
        "name": "string",
        "identifier": "string"
      }
    ],
    "effectiveDate": "ISO string",
    "expirationDate": "ISO string",
    "jurisdiction": ["ES", "EU"],
    "programmableClauses": [
      {
        "id": "UUID",
        "name": "string",
        "type": "payment" | "penalty" | "renewal" | "termination" | "notification",
        "description": "string",
        "trigger": {
          "type": "date" | "event" | "threshold" | "external_data",
          "config": {
            "date": "ISO string",
            "eventType": "string",
            "threshold": number,
            "dataSource": "string"
          }
        },
        "conditions": [
          {
            "field": "string",
            "operator": "eq" | "gt" | "lt" | "between" | "in",
            "value": "any",
            "logicalOp": "AND" | "OR"
          }
        ],
        "action": {
          "type": "payment" | "notification" | "status_change" | "escalation",
          "params": {
            "amount": number,
            "currency": "EUR",
            "recipient": "string",
            "template": "string"
          }
        },
        "isActive": boolean,
        "lastExecuted": "ISO string",
        "executionCount": number
      }
    ],
    "obligations": [
      {
        "id": "UUID",
        "party": "string",
        "description": "string",
        "deadline": "ISO string",
        "status": "pending" | "completed" | "overdue" | "waived",
        "linkedClauses": ["clauseId"]
      }
    ],
    "auditTrail": {
      "createdAt": "ISO string",
      "createdBy": "string",
      "hash": "SHA-256",
      "previousHash": "string"
    },
    "legalValidity": {
      "isValid": boolean,
      "eIDASCompliant": boolean,
      "electronicSignature": "simple" | "advanced" | "qualified",
      "timestampAuthority": "string"
    }
  }
}`;

        userPrompt = `Crea un Smart Contract con estos parámetros:
${JSON.stringify(context, null, 2)}

Especificaciones adicionales:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'execute_clause':
        systemPrompt = `Eres el ejecutor de cláusulas de Smart Contracts.

Ejecutas cláusulas programables cuando se cumplen las condiciones:
- Verificas todas las precondiciones
- Ejecutas la acción configurada
- Registras la ejecución
- Notificas a las partes

FORMATO DE RESPUESTA (JSON):
{
  "clauseExecution": {
    "executionId": "UUID",
    "clauseId": "string",
    "contractId": "string",
    "executedAt": "ISO string",
    "triggerDetails": {
      "type": "string",
      "triggerValue": "any",
      "triggerTimestamp": "ISO string"
    },
    "conditionsEvaluated": [
      {
        "condition": "string",
        "result": boolean,
        "actualValue": "any"
      }
    ],
    "actionExecuted": {
      "type": "string",
      "status": "success" | "failed" | "pending",
      "result": {},
      "externalReferences": [
        {
          "system": "string",
          "referenceId": "string",
          "status": "string"
        }
      ]
    },
    "notifications": [
      {
        "recipient": "string",
        "channel": "email" | "sms" | "platform",
        "sentAt": "ISO string",
        "status": "sent" | "delivered" | "failed"
      }
    ],
    "auditEntry": {
      "hash": "SHA-256",
      "previousHash": "string",
      "signature": "string"
    }
  }
}`;

        userPrompt = `Ejecuta la cláusula:
${JSON.stringify(params, null, 2)}

Contexto del contrato:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'verify_conditions':
        systemPrompt = `Eres el verificador de condiciones de Smart Contracts.

Evalúas si se cumplen las condiciones para ejecutar cláusulas:
- Obtienes datos actuales
- Evalúas expresiones lógicas
- Identificas condiciones pendientes
- Predices cuándo se cumplirán

FORMATO DE RESPUESTA (JSON):
{
  "conditionVerification": {
    "clauseId": "string",
    "contractId": "string",
    "evaluatedAt": "ISO string",
    "overallResult": boolean,
    "conditions": [
      {
        "id": "string",
        "description": "string",
        "expectedValue": "any",
        "actualValue": "any",
        "operator": "string",
        "result": boolean,
        "dataSource": "string",
        "lastUpdated": "ISO string"
      }
    ],
    "pendingConditions": [
      {
        "id": "string",
        "description": "string",
        "estimatedCompletion": "ISO string",
        "dependency": "string"
      }
    ],
    "recommendations": [
      {
        "condition": "string",
        "suggestion": "string"
      }
    ],
    "nextEvaluation": "ISO string"
  }
}`;

        userPrompt = `Verifica las condiciones:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'resolve_dispute':
        systemPrompt = `Eres el sistema de resolución de disputas de Smart Contracts.

Gestionas disputas entre partes:
- Identificas el conflicto
- Evalúas evidencias
- Propones resolución
- Escalas si es necesario

TIPOS DE DISPUTAS:
- Incumplimiento de obligaciones
- Interpretación de cláusulas
- Calidad de entregables
- Plazos y penalizaciones
- Fuerza mayor

FORMATO DE RESPUESTA (JSON):
{
  "disputeResolution": {
    "disputeId": "UUID",
    "contractId": "string",
    "status": "open" | "under_review" | "proposed_resolution" | "resolved" | "escalated",
    "initiatedBy": "string",
    "initiatedAt": "ISO string",
    "disputeType": "string",
    "description": "string",
    "parties": [
      {
        "id": "string",
        "name": "string",
        "position": "string",
        "evidence": [
          {
            "type": "document" | "log" | "testimony",
            "description": "string",
            "hash": "string"
          }
        ]
      }
    ],
    "analysis": {
      "relevantClauses": ["clauseId"],
      "contractualBasis": "string",
      "legalPrecedents": ["string"],
      "riskAssessment": {
        "partyA": number,
        "partyB": number
      }
    },
    "proposedResolution": {
      "type": "mediation" | "arbitration" | "automatic" | "judicial",
      "recommendation": "string",
      "actions": [
        {
          "party": "string",
          "action": "string",
          "deadline": "ISO string"
        }
      ],
      "compensation": {
        "required": boolean,
        "amount": number,
        "from": "string",
        "to": "string"
      }
    },
    "escalation": {
      "required": boolean,
      "level": "internal" | "mediation" | "arbitration" | "court",
      "reason": "string",
      "nextSteps": ["string"]
    },
    "timeline": [
      {
        "date": "ISO string",
        "event": "string",
        "by": "string"
      }
    ]
  }
}`;

        userPrompt = `Gestiona esta disputa:
${JSON.stringify(params, null, 2)}

Contexto del contrato:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'simulate_execution':
        systemPrompt = `Eres el simulador de ejecución de Smart Contracts.

Simulas la ejecución de cláusulas sin ejecutarlas realmente:
- Evalúas todos los escenarios
- Calculas resultados esperados
- Identificas riesgos
- Recomiendas ajustes

FORMATO DE RESPUESTA (JSON):
{
  "simulation": {
    "simulationId": "UUID",
    "contractId": "string",
    "clauseId": "string",
    "simulatedAt": "ISO string",
    "scenarios": [
      {
        "name": "string",
        "description": "string",
        "assumptions": {},
        "result": {
          "triggered": boolean,
          "action": "string",
          "outcome": {},
          "financialImpact": number
        },
        "probability": number
      }
    ],
    "riskAnalysis": {
      "identifiedRisks": [
        {
          "risk": "string",
          "probability": number,
          "impact": "low" | "medium" | "high",
          "mitigation": "string"
        }
      ],
      "overallRiskScore": number
    },
    "recommendations": [
      {
        "type": "modify_condition" | "add_clause" | "remove_clause" | "adjust_threshold",
        "description": "string",
        "expectedImprovement": "string"
      }
    ],
    "comparisonWithCurrent": {
      "currentBehavior": "string",
      "proposedBehavior": "string",
      "improvement": "string"
    }
  }
}`;

        userPrompt = `Simula la ejecución:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'get_execution_log':
        systemPrompt = `Eres el gestor del log de ejecución de Smart Contracts.

Mantienes un registro inmutable de todas las ejecuciones:
- Cadena de hashes
- Timestamps certificados
- Evidencias de ejecución
- Notificaciones enviadas

FORMATO DE RESPUESTA (JSON):
{
  "executionLog": {
    "contractId": "string",
    "entries": [
      {
        "id": "UUID",
        "timestamp": "ISO string",
        "type": "clause_execution" | "condition_check" | "notification" | "state_change",
        "clauseId": "string",
        "details": {
          "trigger": {},
          "conditions": [],
          "action": {},
          "result": {}
        },
        "hash": "SHA-256",
        "previousHash": "SHA-256",
        "signature": "string"
      }
    ],
    "integrity": {
      "isValid": boolean,
      "lastVerified": "ISO string",
      "brokenLinks": []
    },
    "statistics": {
      "totalExecutions": number,
      "successRate": number,
      "avgExecutionTime": number,
      "financialTotal": number
    }
  }
}`;

        userPrompt = `Obtén el log de ejecución:
${JSON.stringify(context, null, 2)}

Filtros:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'audit_contract':
        systemPrompt = `Eres el auditor de Smart Contracts.

Realizas auditorías completas de contratos:
- Validez legal
- Integridad técnica
- Cumplimiento de ejecuciones
- Riesgos identificados

FORMATO DE RESPUESTA (JSON):
{
  "contractAudit": {
    "auditId": "UUID",
    "contractId": "string",
    "auditedAt": "ISO string",
    "auditor": "string",
    "legalCompliance": {
      "isCompliant": boolean,
      "jurisdictions": ["ES", "EU"],
      "issues": [
        {
          "severity": "critical" | "major" | "minor",
          "description": "string",
          "remediation": "string"
        }
      ],
      "certificates": ["eIDAS", "timestamping"]
    },
    "technicalIntegrity": {
      "hashChainValid": boolean,
      "signaturesValid": boolean,
      "dataConsistency": boolean,
      "issues": []
    },
    "executionCompliance": {
      "totalClauses": number,
      "executedCorrectly": number,
      "executedIncorrectly": number,
      "notYetTriggered": number,
      "discrepancies": []
    },
    "riskAssessment": {
      "overallRisk": "low" | "medium" | "high",
      "factors": [],
      "recommendations": []
    },
    "summary": {
      "score": 0-100,
      "status": "compliant" | "requires_attention" | "non_compliant",
      "keyFindings": ["string"],
      "nextAuditDate": "ISO string"
    }
  }
}`;

        userPrompt = `Audita el contrato:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'get_obligations_status':
        systemPrompt = `Eres el monitor de obligaciones de Smart Contracts.

Rastrears el estado de todas las obligaciones:
- Obligaciones pendientes
- Obligaciones cumplidas
- Obligaciones vencidas
- Próximos vencimientos

FORMATO DE RESPUESTA (JSON):
{
  "obligationsStatus": {
    "contractId": "string",
    "lastUpdated": "ISO string",
    "summary": {
      "total": number,
      "pending": number,
      "completed": number,
      "overdue": number,
      "waived": number
    },
    "obligations": [
      {
        "id": "UUID",
        "party": "string",
        "partyName": "string",
        "description": "string",
        "type": "payment" | "delivery" | "notification" | "action",
        "deadline": "ISO string",
        "status": "pending" | "completed" | "overdue" | "waived",
        "completedAt": "ISO string",
        "linkedClause": "clauseId",
        "consequences": {
          "penalty": number,
          "escalation": boolean
        },
        "evidence": []
      }
    ],
    "upcomingDeadlines": [
      {
        "obligationId": "string",
        "description": "string",
        "deadline": "ISO string",
        "daysRemaining": number,
        "priority": "high" | "medium" | "low"
      }
    ],
    "overdueActions": [
      {
        "obligationId": "string",
        "daysOverdue": number,
        "penaltyAccrued": number,
        "escalationStatus": "string"
      }
    ]
  }
}`;

        userPrompt = `Obtén el estado de obligaciones:
${JSON.stringify(context, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[smart-legal-contracts] Processing: ${action}`);

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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
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
      console.error('[smart-legal-contracts] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[smart-legal-contracts] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[smart-legal-contracts] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
