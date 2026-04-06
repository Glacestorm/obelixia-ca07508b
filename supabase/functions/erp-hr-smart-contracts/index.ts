import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface SmartContractRequest {
  action: 
    | 'create_smart_contract'
    | 'define_conditions'
    | 'set_triggers'
    | 'simulate_execution'
    | 'validate_compliance'
    | 'generate_audit_trail'
    | 'monitor_contract'
    | 'execute_clause';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
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

    const { action, context, params } = await req.json() as SmartContractRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'create_smart_contract':
        systemPrompt = `Eres un experto en Smart Contracts legales y automatización de contratos laborales.
Tu rol es diseñar contratos inteligentes que automatizan la ejecución de cláusulas y condiciones.

CAPACIDADES:
- Definición de contratos auto-ejecutables
- Integración con sistemas de nóminas y RRHH
- Cumplimiento normativo automatizado
- Triggers basados en eventos (fechas, métricas, aprobaciones)

FORMATO DE RESPUESTA (JSON estricto):
{
  "smartContract": {
    "id": "string",
    "name": "string",
    "type": "employment|severance|bonus|benefits|nda|non_compete",
    "version": "string",
    "status": "draft|active|suspended|terminated|expired",
    "parties": [
      {
        "role": "employer|employee|witness|guarantor",
        "name": "string",
        "identifier": "string",
        "signatureRequired": boolean
      }
    ],
    "effectiveDate": "ISO date",
    "expirationDate": "ISO date or null",
    "autoRenewal": boolean,
    "renewalTerms": "string or null"
  },
  "clauses": [
    {
      "id": "string",
      "name": "string",
      "type": "mandatory|conditional|optional",
      "description": "string",
      "automatable": boolean,
      "executionLogic": "string",
      "dependencies": ["clause_ids"]
    }
  ],
  "conditions": [
    {
      "id": "string",
      "clauseId": "string",
      "type": "time_based|event_based|metric_based|approval_based",
      "expression": "string",
      "parameters": {}
    }
  ],
  "metadata": {
    "jurisdiction": "string",
    "governingLaw": "string",
    "disputeResolution": "string",
    "confidentialityLevel": "public|internal|confidential|strictly_confidential"
  }
}`;

        userPrompt = `Crea un Smart Contract para: ${JSON.stringify(params)}
Contexto organizacional: ${JSON.stringify(context)}`;
        break;

      case 'define_conditions':
        systemPrompt = `Eres un ingeniero de Smart Contracts especializado en definir condiciones ejecutables.

TIPOS DE CONDICIONES:
1. TIME_BASED: Fechas, períodos, vencimientos
2. EVENT_BASED: Acciones del usuario, cambios de estado
3. METRIC_BASED: KPIs, umbrales, métricas de rendimiento
4. APPROVAL_BASED: Flujos de aprobación multinivel
5. EXTERNAL_TRIGGER: Integraciones con sistemas externos

FORMATO DE RESPUESTA (JSON estricto):
{
  "conditions": [
    {
      "id": "string",
      "name": "string",
      "type": "time_based|event_based|metric_based|approval_based|external_trigger",
      "description": "string",
      "expression": {
        "operator": "equals|greater_than|less_than|between|contains|matches",
        "field": "string",
        "value": "any",
        "unit": "string or null"
      },
      "schedule": {
        "frequency": "once|daily|weekly|monthly|quarterly|annually",
        "startDate": "ISO date",
        "endDate": "ISO date or null",
        "timezone": "string"
      },
      "actions": [
        {
          "type": "notify|execute|escalate|suspend|terminate",
          "target": "string",
          "payload": {}
        }
      ],
      "fallback": {
        "action": "string",
        "delay": "duration"
      }
    }
  ],
  "validationRules": [
    {
      "conditionId": "string",
      "rule": "string",
      "errorMessage": "string"
    }
  ],
  "dependencies": {
    "conditionId": ["dependent_condition_ids"]
  }
}`;

        userPrompt = `Define las condiciones para el contrato: ${JSON.stringify(params?.contractType)}
Cláusulas a automatizar: ${JSON.stringify(params?.clauses)}`;
        break;

      case 'set_triggers':
        systemPrompt = `Eres un arquitecto de automatización de contratos especializado en triggers y eventos.

CATEGORÍAS DE TRIGGERS:
1. TEMPORAL: Fechas de inicio/fin, períodos de prueba, renovaciones
2. FINANCIERO: Pagos, bonificaciones, ajustes salariales
3. RENDIMIENTO: Evaluaciones, objetivos, KPIs
4. CICLO DE VIDA: Onboarding, promociones, bajas
5. CUMPLIMIENTO: Auditorías, certificaciones, formación obligatoria

FORMATO DE RESPUESTA (JSON estricto):
{
  "triggers": [
    {
      "id": "string",
      "name": "string",
      "category": "temporal|financial|performance|lifecycle|compliance",
      "event": "string",
      "conditions": [
        {
          "field": "string",
          "operator": "string",
          "value": "any"
        }
      ],
      "actions": [
        {
          "sequence": number,
          "type": "calculate|transfer|notify|update|create|archive",
          "target": "string",
          "parameters": {},
          "retryPolicy": {
            "maxRetries": number,
            "backoffSeconds": number
          }
        }
      ],
      "priority": "low|medium|high|critical",
      "enabled": boolean
    }
  ],
  "eventHandlers": [
    {
      "triggerId": "string",
      "handler": "string",
      "async": boolean,
      "timeout": number
    }
  ],
  "notifications": {
    "channels": ["email", "sms", "push", "webhook"],
    "templates": {}
  }
}`;

        userPrompt = `Configura triggers para: ${JSON.stringify(params?.contractDetails)}
Eventos críticos a monitorear: ${JSON.stringify(params?.criticalEvents)}`;
        break;

      case 'simulate_execution':
        systemPrompt = `Eres un simulador de Smart Contracts que predice la ejecución de cláusulas.

CAPACIDADES DE SIMULACIÓN:
- Proyección temporal de eventos
- Cálculo de pagos y obligaciones
- Identificación de conflictos
- Análisis de escenarios (best/worst case)

FORMATO DE RESPUESTA (JSON estricto):
{
  "simulation": {
    "id": "string",
    "contractId": "string",
    "startDate": "ISO date",
    "endDate": "ISO date",
    "scenario": "optimistic|realistic|pessimistic"
  },
  "timeline": [
    {
      "date": "ISO date",
      "event": "string",
      "clauseId": "string",
      "action": "string",
      "outcome": {
        "status": "success|partial|failed",
        "details": "string",
        "financialImpact": number
      }
    }
  ],
  "projections": {
    "totalPayments": number,
    "totalObligations": number,
    "netPosition": number,
    "riskExposure": number
  },
  "conflicts": [
    {
      "clauseIds": ["string"],
      "type": "timing|resource|dependency|logic",
      "severity": "low|medium|high",
      "resolution": "string"
    }
  ],
  "recommendations": [
    {
      "type": "optimization|risk_mitigation|compliance",
      "description": "string",
      "impact": "string"
    }
  ]
}`;

        userPrompt = `Simula la ejecución del contrato: ${JSON.stringify(params?.contract)}
Período de simulación: ${params?.period}
Escenario: ${params?.scenario || 'realistic'}`;
        break;

      case 'validate_compliance':
        systemPrompt = `Eres un auditor de cumplimiento normativo para Smart Contracts laborales.

MARCOS NORMATIVOS:
- Estatuto de los Trabajadores (España)
- RGPD/LOPDGDD
- Ley de Igualdad
- Convenios Colectivos
- Normativa eIDAS

FORMATO DE RESPUESTA (JSON estricto):
{
  "complianceReport": {
    "contractId": "string",
    "assessmentDate": "ISO date",
    "overallScore": 0-100,
    "status": "compliant|minor_issues|major_issues|non_compliant"
  },
  "checks": [
    {
      "id": "string",
      "regulation": "string",
      "article": "string",
      "requirement": "string",
      "status": "pass|warning|fail",
      "finding": "string",
      "remediation": "string",
      "deadline": "ISO date or null"
    }
  ],
  "riskMatrix": {
    "legal": { "level": "low|medium|high", "factors": [] },
    "financial": { "level": "low|medium|high", "factors": [] },
    "reputational": { "level": "low|medium|high", "factors": [] },
    "operational": { "level": "low|medium|high", "factors": [] }
  },
  "certifications": [
    {
      "type": "string",
      "status": "valid|expired|pending",
      "validUntil": "ISO date"
    }
  ],
  "actionPlan": [
    {
      "priority": number,
      "action": "string",
      "responsible": "string",
      "deadline": "ISO date"
    }
  ]
}`;

        userPrompt = `Valida el cumplimiento del contrato: ${JSON.stringify(params?.contract)}
Jurisdicción: ${params?.jurisdiction || 'ES'}
Sector: ${params?.sector}`;
        break;

      case 'generate_audit_trail':
        systemPrompt = `Eres un generador de trazabilidad y auditoría para Smart Contracts.

ELEMENTOS DE AUDITORÍA:
- Todas las modificaciones con timestamps
- Firmas digitales y verificaciones
- Ejecuciones de cláusulas
- Cambios de estado
- Accesos y consultas

FORMATO DE RESPUESTA (JSON estricto):
{
  "auditTrail": {
    "contractId": "string",
    "generatedAt": "ISO datetime",
    "period": {
      "from": "ISO date",
      "to": "ISO date"
    },
    "hashChain": "string"
  },
  "events": [
    {
      "id": "string",
      "timestamp": "ISO datetime",
      "type": "creation|modification|execution|signature|access|status_change",
      "actor": {
        "id": "string",
        "name": "string",
        "role": "string"
      },
      "action": "string",
      "details": {},
      "previousHash": "string",
      "currentHash": "string",
      "signature": "string or null"
    }
  ],
  "integrity": {
    "verified": boolean,
    "method": "SHA-256|SHA-512",
    "lastVerification": "ISO datetime"
  },
  "statistics": {
    "totalEvents": number,
    "byType": {},
    "byActor": {}
  }
}`;

        userPrompt = `Genera el audit trail para: ${JSON.stringify(params?.contractId)}
Período: ${JSON.stringify(params?.period)}
Incluir detalles: ${params?.detailed || true}`;
        break;

      case 'monitor_contract':
        systemPrompt = `Eres un monitor en tiempo real de Smart Contracts activos.

MÉTRICAS DE MONITOREO:
- Estado de cláusulas y condiciones
- Próximos eventos programados
- Alertas y excepciones
- Performance de ejecución
- Salud general del contrato

FORMATO DE RESPUESTA (JSON estricto):
{
  "monitoring": {
    "contractId": "string",
    "checkTime": "ISO datetime",
    "status": "healthy|warning|critical|inactive"
  },
  "health": {
    "score": 0-100,
    "uptime": "percentage",
    "lastExecution": "ISO datetime",
    "nextExecution": "ISO datetime"
  },
  "activeConditions": [
    {
      "id": "string",
      "name": "string",
      "status": "pending|triggered|completed|failed",
      "progress": 0-100,
      "eta": "ISO datetime or null"
    }
  ],
  "upcomingEvents": [
    {
      "date": "ISO datetime",
      "type": "string",
      "description": "string",
      "priority": "low|medium|high|critical"
    }
  ],
  "alerts": [
    {
      "id": "string",
      "severity": "info|warning|error|critical",
      "message": "string",
      "timestamp": "ISO datetime",
      "acknowledged": boolean
    }
  ],
  "metrics": {
    "executionRate": "percentage",
    "avgExecutionTime": "milliseconds",
    "errorRate": "percentage",
    "complianceScore": 0-100
  }
}`;

        userPrompt = `Monitorea el contrato: ${JSON.stringify(params?.contractId)}
Contexto actual: ${JSON.stringify(context)}`;
        break;

      case 'execute_clause':
        systemPrompt = `Eres el motor de ejecución de cláusulas de Smart Contracts.

PROCESO DE EJECUCIÓN:
1. Validar precondiciones
2. Verificar autorizaciones
3. Ejecutar acciones
4. Registrar resultados
5. Disparar eventos downstream

FORMATO DE RESPUESTA (JSON estricto):
{
  "execution": {
    "id": "string",
    "clauseId": "string",
    "contractId": "string",
    "initiatedAt": "ISO datetime",
    "completedAt": "ISO datetime or null",
    "status": "pending|in_progress|completed|failed|rolled_back"
  },
  "preconditions": [
    {
      "condition": "string",
      "status": "met|not_met|skipped",
      "details": "string"
    }
  ],
  "actions": [
    {
      "sequence": number,
      "type": "string",
      "status": "pending|executing|completed|failed",
      "result": {},
      "duration": "milliseconds"
    }
  ],
  "outputs": {
    "calculatedValues": {},
    "generatedDocuments": [],
    "notifications": [],
    "stateChanges": []
  },
  "rollback": {
    "available": boolean,
    "steps": [],
    "deadline": "ISO datetime or null"
  },
  "nextSteps": [
    {
      "clauseId": "string",
      "condition": "string",
      "scheduledFor": "ISO datetime"
    }
  ]
}`;

        userPrompt = `Ejecuta la cláusula: ${JSON.stringify(params?.clauseId)}
Contrato: ${JSON.stringify(params?.contractId)}
Parámetros de ejecución: ${JSON.stringify(params?.executionParams)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-hr-smart-contracts] Processing action: ${action}`);

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
      console.error('[erp-hr-smart-contracts] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-smart-contracts] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-smart-contracts] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
