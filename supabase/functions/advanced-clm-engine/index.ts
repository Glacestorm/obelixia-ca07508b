/**
 * Advanced CLM Engine - Fase 10
 * Contract Lifecycle Management completo con negociación, firma electrónica y clause library
 * Enterprise SaaS 2025-2026
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CLMRequest {
  action: 'create_contract' | 'analyze_contract' | 'negotiate_clause' | 
          'manage_versions' | 'get_clause_library' | 'suggest_clauses' |
          'create_playbook' | 'track_approval' | 'prepare_signature' |
          'extract_obligations' | 'compare_versions' | 'get_risk_analysis';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

interface ContractVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  changes: VersionChange[];
  status: 'draft' | 'review' | 'approved' | 'rejected';
}

interface VersionChange {
  type: 'added' | 'removed' | 'modified';
  section: string;
  oldValue?: string;
  newValue?: string;
}

interface Clause {
  id: string;
  name: string;
  category: string;
  text: string;
  riskLevel: 'low' | 'medium' | 'high';
  isStandard: boolean;
  alternatives: string[];
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

    const { action, context, params } = await req.json() as CLMRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'create_contract':
        systemPrompt = `Eres el generador de contratos del CLM Enterprise.

CONTEXTO DEL ROL:
- Generas contratos profesionales multi-jurisdiccionales
- Aplicas templates dinámicos por tipo de contrato
- Incluyes cláusulas estándar y personalizadas
- Garantizas validez legal

TIPOS DE CONTRATOS SOPORTADOS:
- Laborales (indefinido, temporal, formación, prácticas)
- Mercantiles (compraventa, distribución, agencia)
- Servicios (consulting, outsourcing, SaaS)
- Arrendamiento (local, equipo, vehículos)
- Confidencialidad (NDA, NCA)
- Proveedores (suministro, mantenimiento)
- Financieros (préstamo, leasing, factoring)

FORMATO DE RESPUESTA (JSON):
{
  "contract": {
    "id": "UUID",
    "type": "string",
    "title": "string",
    "version": "1.0",
    "status": "draft",
    "parties": [
      {
        "role": "issuer" | "counterparty",
        "type": "company" | "individual",
        "name": "string",
        "identifier": "CIF/NIF",
        "address": "string",
        "representative": {
          "name": "string",
          "position": "string",
          "powers": "string"
        }
      }
    ],
    "terms": {
      "effectiveDate": "ISO string",
      "duration": "string",
      "renewalTerms": "string",
      "terminationNotice": number,
      "jurisdiction": "string",
      "governingLaw": "string"
    },
    "sections": [
      {
        "id": "UUID",
        "title": "string",
        "order": number,
        "content": "string (markdown)",
        "clauses": [
          {
            "id": "UUID",
            "clauseLibraryId": "string",
            "name": "string",
            "text": "string",
            "type": "standard" | "custom" | "negotiable",
            "riskLevel": "low" | "medium" | "high",
            "isRequired": boolean,
            "alternatives": []
          }
        ]
      }
    ],
    "annexes": [
      {
        "id": "UUID",
        "title": "string",
        "type": "schedule" | "exhibit" | "appendix",
        "content": "string"
      }
    ],
    "metadata": {
      "createdAt": "ISO string",
      "createdBy": "string",
      "language": "es" | "en" | "ca",
      "template": "string",
      "tags": ["string"]
    }
  }
}`;

        userPrompt = `Genera un contrato con estos parámetros:
${JSON.stringify(context, null, 2)}

Especificaciones adicionales:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'negotiate_clause':
        systemPrompt = `Eres el negociador de cláusulas del CLM.

Gestionas la negociación de cláusulas contractuales:
- Analizas posiciones de las partes
- Propones alternativas equilibradas
- Evalúas riesgos de cada posición
- Recomiendas líneas rojas

FORMATO DE RESPUESTA (JSON):
{
  "negotiation": {
    "clauseId": "string",
    "clauseName": "string",
    "currentText": "string",
    "negotiationRound": number,
    "positions": [
      {
        "party": "string",
        "proposedText": "string",
        "rationale": "string",
        "redLines": ["string"],
        "flexibility": "low" | "medium" | "high"
      }
    ],
    "analysis": {
      "keyDifferences": ["string"],
      "riskComparison": {
        "partyA": { "current": number, "proposed": number },
        "partyB": { "current": number, "proposed": number }
      },
      "marketBenchmark": "string"
    },
    "recommendations": [
      {
        "option": number,
        "text": "string",
        "acceptability": {
          "partyA": number,
          "partyB": number
        },
        "riskBalance": "balanced" | "favors_a" | "favors_b",
        "rationale": "string"
      }
    ],
    "fallbackPositions": [
      {
        "level": number,
        "text": "string",
        "conditions": "string"
      }
    ],
    "deadlockResolution": {
      "suggestedMediation": boolean,
      "alternativeApproaches": ["string"]
    }
  }
}`;

        userPrompt = `Negocia esta cláusula:
${JSON.stringify(params, null, 2)}

Contexto del contrato:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'get_clause_library':
        systemPrompt = `Eres el gestor de la biblioteca de cláusulas.

Mantienes una biblioteca de cláusulas pre-aprobadas:
- Cláusulas por tipo de contrato
- Cláusulas por jurisdicción
- Cláusulas estándar vs. premium
- Alternativas y variaciones

FORMATO DE RESPUESTA (JSON):
{
  "clauseLibrary": {
    "categories": [
      {
        "name": "string",
        "description": "string",
        "clauseCount": number
      }
    ],
    "clauses": [
      {
        "id": "UUID",
        "name": "string",
        "category": "string",
        "subcategory": "string",
        "contractTypes": ["string"],
        "jurisdictions": ["ES", "EU"],
        "text": "string",
        "variables": [
          {
            "name": "string",
            "type": "text" | "number" | "date" | "select",
            "options": [],
            "default": "any"
          }
        ],
        "riskLevel": "low" | "medium" | "high",
        "isStandard": boolean,
        "isNegotiable": boolean,
        "alternatives": [
          {
            "id": "string",
            "name": "string",
            "text": "string",
            "difference": "string",
            "riskChange": "increase" | "decrease" | "neutral"
          }
        ],
        "legalBasis": "string",
        "lastUpdated": "ISO string",
        "usageCount": number,
        "approvalStatus": "approved" | "pending" | "deprecated"
      }
    ],
    "recentlyUsed": ["clauseId"],
    "recommended": ["clauseId"]
  }
}`;

        userPrompt = `Obtén la biblioteca de cláusulas:
Categoría: ${params?.category || 'todas'}
Tipo de contrato: ${params?.contractType || 'todos'}
Jurisdicción: ${params?.jurisdiction || 'ES'}`;
        break;

      case 'suggest_clauses':
        systemPrompt = `Eres el recomendador de cláusulas del CLM.

Sugieres cláusulas óptimas basándote en:
- Tipo de contrato
- Perfil de riesgo deseado
- Historial de negociaciones
- Mejores prácticas del sector

FORMATO DE RESPUESTA (JSON):
{
  "suggestions": {
    "contractType": "string",
    "riskProfile": "conservative" | "balanced" | "aggressive",
    "essential": [
      {
        "clauseId": "string",
        "name": "string",
        "category": "string",
        "reason": "string",
        "priority": "required" | "highly_recommended"
      }
    ],
    "recommended": [
      {
        "clauseId": "string",
        "name": "string",
        "category": "string",
        "reason": "string",
        "riskWithout": "string"
      }
    ],
    "optional": [
      {
        "clauseId": "string",
        "name": "string",
        "benefit": "string",
        "considerIf": "string"
      }
    ],
    "avoid": [
      {
        "clauseId": "string",
        "name": "string",
        "reason": "string"
      }
    ],
    "sectorBenchmark": {
      "commonClauses": ["string"],
      "differentiators": ["string"]
    }
  }
}`;

        userPrompt = `Sugiere cláusulas para:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'create_playbook':
        systemPrompt = `Eres el creador de playbooks de negociación.

Creas playbooks que guían la negociación:
- Posiciones iniciales
- Líneas rojas
- Posiciones de fallback
- Tácticas de negociación

FORMATO DE RESPUESTA (JSON):
{
  "playbook": {
    "id": "UUID",
    "name": "string",
    "contractType": "string",
    "version": "1.0",
    "createdAt": "ISO string",
    "overview": {
      "objective": "string",
      "riskTolerance": "conservative" | "balanced" | "aggressive",
      "priorityClauses": ["string"],
      "dealBreakers": ["string"]
    },
    "clauseStrategies": [
      {
        "clauseId": "string",
        "clauseName": "string",
        "importance": "critical" | "high" | "medium" | "low",
        "initialPosition": {
          "text": "string",
          "rationale": "string"
        },
        "acceptableRange": {
          "minimum": "string",
          "maximum": "string"
        },
        "fallbackPositions": [
          {
            "level": 1,
            "text": "string",
            "conditions": "string"
          }
        ],
        "redLines": ["string"],
        "tradingChips": ["string"],
        "negotiationTips": ["string"]
      }
    ],
    "overallStrategy": {
      "approach": "collaborative" | "competitive" | "mixed",
      "priorityOrder": ["clauseId"],
      "tradingMatrix": [
        {
          "give": "string",
          "get": "string"
        }
      ]
    },
    "escalationPath": [
      {
        "level": number,
        "trigger": "string",
        "action": "string",
        "approver": "string"
      }
    ]
  }
}`;

        userPrompt = `Crea un playbook de negociación:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'track_approval':
        systemPrompt = `Eres el gestor del workflow de aprobación de contratos.

Gestionas el flujo de aprobaciones:
- Aprobadores por tipo/importe
- Estados de aprobación
- Recordatorios y escalados
- SLAs de aprobación

FORMATO DE RESPUESTA (JSON):
{
  "approvalWorkflow": {
    "contractId": "string",
    "contractTitle": "string",
    "currentStatus": "pending" | "in_review" | "approved" | "rejected" | "expired",
    "submittedAt": "ISO string",
    "submittedBy": "string",
    "approvalSteps": [
      {
        "stepId": "string",
        "stepName": "string",
        "order": number,
        "type": "sequential" | "parallel",
        "approvers": [
          {
            "userId": "string",
            "userName": "string",
            "role": "string",
            "status": "pending" | "approved" | "rejected" | "delegated",
            "decidedAt": "ISO string",
            "comments": "string",
            "signature": "string"
          }
        ],
        "requiredApprovals": "all" | "any" | number,
        "deadline": "ISO string",
        "slaStatus": "on_track" | "at_risk" | "breached"
      }
    ],
    "currentStep": number,
    "pendingApprovers": ["userId"],
    "timeline": [
      {
        "timestamp": "ISO string",
        "event": "string",
        "by": "string",
        "details": "string"
      }
    ],
    "notifications": {
      "remindersSent": number,
      "nextReminder": "ISO string",
      "escalationTriggered": boolean
    },
    "delegations": [
      {
        "from": "string",
        "to": "string",
        "reason": "string",
        "validUntil": "ISO string"
      }
    ]
  }
}`;

        userPrompt = `Gestiona la aprobación:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'prepare_signature':
        systemPrompt = `Eres el preparador de firma electrónica de contratos.

Preparas documentos para firma electrónica:
- Validación eIDAS
- Campos de firma
- Orden de firmantes
- Certificados requeridos

FORMATO DE RESPUESTA (JSON):
{
  "signaturePreparation": {
    "contractId": "string",
    "documentId": "UUID",
    "signatureType": "simple" | "advanced" | "qualified",
    "eIDASLevel": "string",
    "status": "preparing" | "ready" | "in_progress" | "completed",
    "signatories": [
      {
        "order": number,
        "party": "string",
        "signerName": "string",
        "signerEmail": "string",
        "signerRole": "string",
        "signatureFields": [
          {
            "fieldId": "string",
            "page": number,
            "position": { "x": number, "y": number },
            "type": "signature" | "initials" | "date" | "text"
          }
        ],
        "authentication": {
          "method": "email" | "sms" | "id_document" | "certificate",
          "verified": boolean
        },
        "status": "pending" | "notified" | "viewed" | "signed" | "declined",
        "signedAt": "ISO string"
      }
    ],
    "document": {
      "title": "string",
      "pages": number,
      "hash": "SHA-256",
      "format": "PDF/A",
      "size": number
    },
    "legalRequirements": {
      "witnessRequired": boolean,
      "notarizationRequired": boolean,
      "timestampRequired": boolean,
      "archivalPeriod": number
    },
    "signatureProvider": {
      "name": "DocuSign" | "Adobe Sign" | "Internal",
      "envelopeId": "string",
      "status": "string"
    },
    "completionEstimate": "ISO string"
  }
}`;

        userPrompt = `Prepara la firma electrónica:
${JSON.stringify({ context, params }, null, 2)}`;
        break;

      case 'compare_versions':
        systemPrompt = `Eres el comparador de versiones de contratos.

Comparas versiones de contratos identificando:
- Cambios añadidos
- Cambios eliminados
- Cambios modificados
- Impacto de los cambios

FORMATO DE RESPUESTA (JSON):
{
  "versionComparison": {
    "contractId": "string",
    "version1": {
      "version": "string",
      "date": "ISO string",
      "author": "string"
    },
    "version2": {
      "version": "string",
      "date": "ISO string",
      "author": "string"
    },
    "summary": {
      "totalChanges": number,
      "additions": number,
      "deletions": number,
      "modifications": number,
      "significantChanges": number
    },
    "changes": [
      {
        "id": "UUID",
        "type": "added" | "deleted" | "modified",
        "section": "string",
        "clause": "string",
        "originalText": "string",
        "newText": "string",
        "significance": "minor" | "moderate" | "major",
        "riskImpact": {
          "direction": "increase" | "decrease" | "neutral",
          "magnitude": "low" | "medium" | "high"
        },
        "legalImplication": "string",
        "requiresReview": boolean
      }
    ],
    "riskAnalysis": {
      "overallRiskChange": number,
      "criticalChanges": ["changeId"],
      "recommendations": ["string"]
    },
    "approvalRequired": {
      "required": boolean,
      "reason": "string",
      "suggestedApprovers": ["string"]
    }
  }
}`;

        userPrompt = `Compara estas versiones:
${JSON.stringify(params, null, 2)}`;
        break;

      case 'extract_obligations':
        systemPrompt = `Eres el extractor de obligaciones contractuales.

Extraes y categorizas obligaciones de contratos:
- Obligaciones de cada parte
- Plazos y deadlines
- Condiciones y triggers
- Consecuencias de incumplimiento

FORMATO DE RESPUESTA (JSON):
{
  "obligationsExtraction": {
    "contractId": "string",
    "extractedAt": "ISO string",
    "parties": ["string"],
    "obligations": [
      {
        "id": "UUID",
        "party": "string",
        "type": "payment" | "delivery" | "service" | "notification" | "compliance" | "other",
        "description": "string",
        "sourceClause": "string",
        "sourceSection": "string",
        "deadline": {
          "type": "fixed_date" | "relative" | "recurring" | "on_demand",
          "date": "ISO string",
          "reference": "string",
          "frequency": "string"
        },
        "conditions": [
          {
            "type": "precedent" | "subsequent",
            "description": "string"
          }
        ],
        "value": {
          "amount": number,
          "currency": "EUR",
          "calculation": "string"
        },
        "consequences": {
          "penalty": "string",
          "termination": boolean,
          "other": "string"
        },
        "status": "pending" | "active" | "completed" | "overdue",
        "priority": "critical" | "high" | "medium" | "low"
      }
    ],
    "calendar": [
      {
        "date": "ISO string",
        "obligations": ["obligationId"],
        "type": "deadline" | "milestone" | "review"
      }
    ],
    "riskAssessment": {
      "highRiskObligations": ["obligationId"],
      "totalExposure": number,
      "recommendations": ["string"]
    }
  }
}`;

        userPrompt = `Extrae las obligaciones del contrato:
${JSON.stringify(context, null, 2)}`;
        break;

      case 'get_risk_analysis':
        systemPrompt = `Eres el analizador de riesgos contractuales.

Evalúas riesgos en contratos:
- Riesgos por cláusula
- Riesgos por contraparte
- Riesgos jurisdiccionales
- Mitigaciones recomendadas

FORMATO DE RESPUESTA (JSON):
{
  "riskAnalysis": {
    "contractId": "string",
    "analyzedAt": "ISO string",
    "overallRiskScore": 0-100,
    "riskLevel": "low" | "medium" | "high" | "critical",
    "risksByCategory": {
      "legal": {
        "score": number,
        "risks": [
          {
            "id": "UUID",
            "description": "string",
            "clause": "string",
            "probability": number,
            "impact": "low" | "medium" | "high",
            "mitigation": "string"
          }
        ]
      },
      "financial": {},
      "operational": {},
      "reputational": {},
      "compliance": {}
    },
    "clauseRisks": [
      {
        "clauseId": "string",
        "clauseName": "string",
        "riskScore": number,
        "issues": ["string"],
        "recommendations": ["string"]
      }
    ],
    "counterpartyRisk": {
      "score": number,
      "factors": ["string"],
      "dueDiligence": {
        "completed": boolean,
        "findings": ["string"]
      }
    },
    "complianceRisks": {
      "regulations": ["string"],
      "gaps": ["string"],
      "remediation": ["string"]
    },
    "recommendations": [
      {
        "priority": "high" | "medium" | "low",
        "action": "string",
        "expectedRiskReduction": number
      }
    ]
  }
}`;

        userPrompt = `Analiza los riesgos del contrato:
${JSON.stringify(context, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[advanced-clm-engine] Processing: ${action}`);

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
        max_tokens: 4000,
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
      console.error('[advanced-clm-engine] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[advanced-clm-engine] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[advanced-clm-engine] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
