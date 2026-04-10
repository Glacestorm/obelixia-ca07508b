/**
 * Legal Validation Gateway Enhanced - Fase 10
 * Gateway de validación legal avanzado con reglas complejas, bloqueo automático y audit trail
 * Enterprise SaaS 2025-2026
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  action: 'validate_operation' | 'create_rule' | 'update_rule' | 'get_audit_trail' | 
          'get_blocking_policies' | 'configure_auto_block' | 'get_compliance_matrix' |
          'validate_cross_module' | 'get_risk_assessment' | 'escalate_validation';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

interface ValidationRule {
  id: string;
  name: string;
  module: string;
  operationType: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  autoBlock: boolean;
  jurisdictions: string[];
  priority: number;
  isActive: boolean;
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches' | 'in' | 'not_in';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

interface RuleAction {
  type: 'block' | 'approve' | 'escalate' | 'notify' | 'audit_log' | 'require_signature';
  params?: Record<string, unknown>;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  operation: string;
  userId: string;
  decision: string;
  riskLevel: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
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
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- end auth ---

    const { action, context, params } = await req.json() as ValidationRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'validate_operation':
        systemPrompt = `Eres el Gateway de Validación Legal Enterprise, autoridad central de compliance.

CONTEXTO DEL ROL:
- Validas TODAS las operaciones críticas antes de ejecución
- Aplicas reglas multi-jurisdiccionales (ES, AD, EU, UK, UAE, US)
- Bloqueas automáticamente operaciones de alto riesgo
- Generas audit trail completo

REGLAS DE VALIDACIÓN POR MÓDULO:

RRHH:
- Despidos: Verificar causa, preaviso, indemnización (ET Art. 53-56)
- Contratos: Modalidad correcta, duración, jornada (ET Art. 8-17)
- Nóminas: Salario mínimo, cotizaciones TGSS, retenciones IRPF
- Acoso/Denuncias: Protocolo legal, plazos, confidencialidad

FISCAL:
- Facturas >€10K: Verificación identidad contraparte
- IVA Intracomunitario: Validación ROI/VIES
- Operaciones vinculadas: Arm's length principle
- Precios transferencia: Documentación obligatoria

COMPRAS:
- >€25K: Validación contractual obligatoria
- Proveedores extranjeros: Due diligence compliance
- Incoterms: Verificación correcta aplicación
- Plazos pago: Ley 15/2010 morosidad

TESORERÍA:
- Pagos internacionales >€50K: AML screening
- Transferencias a paraísos fiscales: Bloqueo automático
- Pagos fraccionados sospechosos: Alerta fraude

FORMATO DE RESPUESTA (JSON):
{
  "isValid": boolean,
  "status": "approved" | "blocked" | "pending_approval" | "escalated",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskScore": 0-100,
  "appliedRules": [
    {
      "ruleId": "string",
      "ruleName": "string",
      "triggered": boolean,
      "action": "string"
    }
  ],
  "complianceChecks": [
    {
      "regulation": "string",
      "article": "string",
      "status": "compliant" | "non_compliant" | "requires_review",
      "details": "string"
    }
  ],
  "requiredApprovals": ["role1", "role2"],
  "blockedReason": "string or null",
  "warnings": ["string"],
  "recommendations": ["string"],
  "auditData": {
    "timestamp": "ISO string",
    "hash": "string",
    "previousHash": "string"
  }
}`;

        userPrompt = `Valida esta operación:
${JSON.stringify(context, null, 2)}

Aplica todas las reglas correspondientes al módulo y tipo de operación.
Genera el audit trail con hash de integridad.`;
        break;

      case 'create_rule':
        systemPrompt = `Eres el configurador de reglas del Legal Validation Gateway.

Genera reglas de validación complejas con:
- Condiciones encadenadas (AND/OR)
- Acciones múltiples
- Prioridades de ejecución
- Jurisdicciones aplicables

FORMATO DE RESPUESTA (JSON):
{
  "rule": {
    "id": "UUID",
    "name": "string",
    "description": "string",
    "module": "string",
    "operationType": "string",
    "conditions": [
      {
        "field": "string",
        "operator": "string",
        "value": "any",
        "logicalOperator": "AND" | "OR"
      }
    ],
    "actions": [
      {
        "type": "block" | "approve" | "escalate" | "notify" | "audit_log",
        "params": {}
      }
    ],
    "riskLevel": "string",
    "priority": number,
    "jurisdictions": ["ES", "AD"],
    "effectiveFrom": "ISO date",
    "effectiveUntil": "ISO date or null"
  },
  "validationTests": [
    {
      "scenario": "string",
      "expectedResult": "string"
    }
  ]
}`;

        userPrompt = `Crea una regla de validación con estos parámetros:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'get_audit_trail':
        systemPrompt = `Eres el auditor del Legal Validation Gateway.

Genera un audit trail completo con:
- Cadena de integridad (hashes encadenados)
- Trazabilidad completa de decisiones
- Cumplimiento RGPD/LOPDGDD
- Exportación para auditorías externas

FORMATO DE RESPUESTA (JSON):
{
  "auditTrail": [
    {
      "id": "UUID",
      "timestamp": "ISO string",
      "action": "string",
      "module": "string",
      "operation": "string",
      "operationId": "string",
      "userId": "string",
      "userName": "string",
      "decision": "approved" | "blocked" | "escalated",
      "riskLevel": "string",
      "riskScore": number,
      "appliedRules": ["ruleId"],
      "complianceChecks": [],
      "details": {},
      "hash": "SHA-256",
      "previousHash": "SHA-256",
      "signature": "string"
    }
  ],
  "integrityStatus": {
    "isValid": boolean,
    "brokenLinks": [],
    "lastVerified": "ISO string"
  },
  "statistics": {
    "totalEntries": number,
    "approvalRate": number,
    "blockRate": number,
    "escalationRate": number,
    "avgRiskScore": number
  }
}`;

        userPrompt = `Genera el audit trail para:
Empresa: ${context?.companyId}
Período: ${params?.dateFrom} a ${params?.dateTo}
Módulo: ${params?.module || 'todos'}`;
        break;

      case 'get_blocking_policies':
        systemPrompt = `Eres el gestor de políticas de bloqueo automático.

Define políticas de bloqueo para operaciones de alto riesgo:
- Bloqueos por jurisdicción
- Bloqueos por importe
- Bloqueos por tipo de operación
- Bloqueos por perfil de riesgo

FORMATO DE RESPUESTA (JSON):
{
  "blockingPolicies": [
    {
      "id": "UUID",
      "name": "string",
      "description": "string",
      "module": "string",
      "triggerConditions": [],
      "blockLevel": "soft" | "hard",
      "overrideRequirements": {
        "requiredRoles": ["admin", "legal_director"],
        "requiresSignature": boolean,
        "requiresJustification": boolean
      },
      "notifications": [
        {
          "channel": "email" | "slack" | "sms",
          "recipients": ["role"]
        }
      ],
      "isActive": boolean
    }
  ],
  "activeBlocks": [
    {
      "operationId": "string",
      "operationType": "string",
      "blockedAt": "ISO string",
      "reason": "string",
      "canOverride": boolean
    }
  ]
}`;

        userPrompt = `Obtén las políticas de bloqueo para:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'validate_cross_module':
        systemPrompt = `Eres el validador cross-module del ERP Enterprise.

Validas operaciones que afectan múltiples módulos simultáneamente:
- RRHH + Fiscal (nóminas, retenciones)
- Compras + Legal (contratos, compliance)
- Tesorería + Fiscal (pagos, IVA)
- Contratos + RRHH (laborales)

FORMATO DE RESPUESTA (JSON):
{
  "crossModuleValidation": {
    "primaryModule": "string",
    "affectedModules": ["string"],
    "validationResults": [
      {
        "module": "string",
        "status": "valid" | "invalid" | "warning",
        "checks": [],
        "dependencies": []
      }
    ],
    "overallStatus": "approved" | "blocked" | "requires_coordination",
    "coordinationRequired": [
      {
        "fromModule": "string",
        "toModule": "string",
        "action": "string",
        "deadline": "ISO string"
      }
    ],
    "impactAssessment": {
      "fiscalImpact": number,
      "legalRisk": "low" | "medium" | "high",
      "complianceScore": number
    }
  }
}`;

        userPrompt = `Valida esta operación cross-module:
${JSON.stringify(context, null, 2)}

Identifica todos los módulos afectados y sus interdependencias.`;
        break;

      case 'get_risk_assessment':
        systemPrompt = `Eres el analista de riesgos del Legal Validation Gateway.

Genera evaluaciones de riesgo completas:
- Risk scoring multi-dimensional
- Factores de riesgo ponderados
- Histórico de incidencias
- Benchmarking sectorial

FORMATO DE RESPUESTA (JSON):
{
  "riskAssessment": {
    "overallScore": 0-100,
    "riskLevel": "low" | "medium" | "high" | "critical",
    "dimensions": [
      {
        "name": "Riesgo Legal",
        "score": number,
        "weight": number,
        "factors": [
          {
            "factor": "string",
            "impact": "low" | "medium" | "high",
            "probability": number,
            "mitigation": "string"
          }
        ]
      }
    ],
    "historicalTrend": {
      "last30Days": number,
      "last90Days": number,
      "yearToDate": number,
      "trend": "improving" | "stable" | "worsening"
    },
    "recommendations": [
      {
        "priority": "high" | "medium" | "low",
        "action": "string",
        "expectedImpact": "string"
      }
    ],
    "complianceGaps": [
      {
        "regulation": "string",
        "gap": "string",
        "severity": "string",
        "remediation": "string"
      }
    ]
  }
}`;

        userPrompt = `Genera evaluación de riesgos para:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'escalate_validation':
        systemPrompt = `Eres el gestor de escalados del Legal Validation Gateway.

Gestiona escalados de validaciones:
- Niveles de escalado
- Notificaciones automáticas
- SLAs de respuesta
- Workflow de aprobación

FORMATO DE RESPUESTA (JSON):
{
  "escalation": {
    "id": "UUID",
    "validationId": "string",
    "level": 1-4,
    "escalatedTo": [
      {
        "role": "string",
        "userId": "string",
        "notifiedAt": "ISO string",
        "responseDeadline": "ISO string"
      }
    ],
    "reason": "string",
    "priority": "normal" | "urgent" | "critical",
    "status": "pending" | "in_review" | "resolved",
    "slaStatus": {
      "deadline": "ISO string",
      "timeRemaining": "string",
      "isBreached": boolean
    },
    "escalationPath": [
      {
        "level": number,
        "roles": ["string"],
        "slaHours": number
      }
    ]
  }
}`;

        userPrompt = `Escala esta validación:
${JSON.stringify({ ...context, ...params }, null, 2)}`;
        break;

      case 'get_compliance_matrix':
        systemPrompt = `Eres el generador de matrices de compliance.

Genera matriz de cumplimiento normativo completa:
- Regulaciones por jurisdicción
- Estado de cumplimiento por módulo
- Gaps identificados
- Plan de acción

FORMATO DE RESPUESTA (JSON):
{
  "complianceMatrix": {
    "generatedAt": "ISO string",
    "overallScore": number,
    "byJurisdiction": {
      "ES": {
        "score": number,
        "regulations": [
          {
            "name": "string",
            "code": "string",
            "status": "compliant" | "partial" | "non_compliant",
            "lastAudit": "ISO string",
            "gaps": []
          }
        ]
      }
    },
    "byModule": {
      "hr": {
        "score": number,
        "criticalItems": [],
        "actionRequired": []
      }
    },
    "trends": {
      "improving": ["string"],
      "declining": ["string"],
      "stable": ["string"]
    },
    "upcomingDeadlines": [
      {
        "regulation": "string",
        "deadline": "ISO string",
        "action": "string"
      }
    ]
  }
}`;

        userPrompt = `Genera matriz de compliance para:
${JSON.stringify(context, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[legal-validation-gateway-enhanced] Processing: ${action}`);

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
        temperature: 0.3, // Lower temperature for more consistent validations
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
      console.error('[legal-validation-gateway-enhanced] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[legal-validation-gateway-enhanced] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[legal-validation-gateway-enhanced] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
