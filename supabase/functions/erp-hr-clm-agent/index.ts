import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface CLMRequest {
  action: 'analyze_contract' | 'suggest_clauses' | 'negotiate_terms' | 'compare_versions' | 'extract_obligations' | 'risk_assessment' | 'generate_amendment';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
  company_id: string;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, context, params, company_id } = await req.json() as CLMRequest;

    if (!company_id) {
      return validationError('Missing company_id', corsHeaders);
    }

    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`[erp-hr-clm-agent] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_contract':
        systemPrompt = `Eres un experto en Contract Lifecycle Management (CLM) especializado en contratos laborales y comerciales.

ANÁLISIS CONTRACTUAL:
- Identificar tipo de contrato y jurisdicción aplicable
- Extraer términos clave y fechas críticas
- Detectar cláusulas potencialmente problemáticas
- Evaluar equilibrio entre partes
- Verificar cumplimiento normativo

FORMATO JSON:
{
  "contractType": "employment|commercial|service|nda|other",
  "jurisdiction": "ES|EU|US|other",
  "effectiveDate": "YYYY-MM-DD",
  "expirationDate": "YYYY-MM-DD|null",
  "autoRenewal": boolean,
  "keyTerms": [{"term": "string", "value": "string", "section": "string"}],
  "parties": [{"role": "string", "name": "string", "obligations": ["string"]}],
  "criticalDates": [{"date": "YYYY-MM-DD", "event": "string", "action": "string"}],
  "riskAreas": [{"area": "string", "severity": "low|medium|high", "description": "string"}],
  "complianceStatus": {"isCompliant": boolean, "issues": ["string"]},
  "summary": "string"
}`;
        userPrompt = `Analiza este contrato: ${JSON.stringify(params?.contractText || context)}`;
        break;

      case 'suggest_clauses':
        systemPrompt = `Eres un experto legal especializado en redacción de cláusulas contractuales.

TIPOS DE CLÁUSULAS:
- Confidencialidad (NDA)
- No competencia
- Propiedad intelectual
- Terminación y preaviso
- Penalizaciones
- Fuerza mayor
- Resolución de disputas
- Protección de datos (RGPD)
- Limitación de responsabilidad

FORMATO JSON:
{
  "suggestedClauses": [
    {
      "id": "string",
      "type": "string",
      "title": "string",
      "text": "string",
      "rationale": "string",
      "isRequired": boolean,
      "riskIfOmitted": "low|medium|high",
      "alternatives": [{"text": "string", "context": "string"}]
    }
  ],
  "clausesByPriority": {
    "essential": ["id"],
    "recommended": ["id"],
    "optional": ["id"]
  },
  "jurisdictionNotes": "string"
}`;
        userPrompt = `Sugiere cláusulas para: tipo=${params?.contractType}, jurisdicción=${params?.jurisdiction}, contexto=${JSON.stringify(context)}`;
        break;

      case 'negotiate_terms':
        systemPrompt = `Eres un negociador contractual experto que asesora en estrategias de negociación.

ESTRATEGIAS DE NEGOCIACIÓN:
- Identificar puntos de negociación prioritarios
- Proponer contraofertasy alternativas
- Evaluar concesiones aceptables
- Mantener equilibrio entre partes
- Proteger intereses clave

FORMATO JSON:
{
  "negotiationStrategy": {
    "priority": "high|medium|low",
    "approach": "collaborative|competitive|compromising",
    "keyObjectives": ["string"]
  },
  "proposedChanges": [
    {
      "originalClause": "string",
      "proposedClause": "string",
      "rationale": "string",
      "expectedResistance": "low|medium|high",
      "fallbackPosition": "string"
    }
  ],
  "concessions": {
    "acceptable": ["string"],
    "unacceptable": ["string"],
    "conditional": [{"concession": "string", "condition": "string"}]
  },
  "batna": "string",
  "recommendedActions": ["string"]
}`;
        userPrompt = `Estrategia de negociación para: ${JSON.stringify(params)}`;
        break;

      case 'compare_versions':
        systemPrompt = `Eres un analista legal especializado en control de versiones de contratos.

ANÁLISIS COMPARATIVO:
- Identificar cambios entre versiones
- Clasificar por impacto (menor, moderado, significativo)
- Detectar eliminaciones y adiciones
- Evaluar implicaciones legales de cambios
- Generar resumen ejecutivo

FORMATO JSON:
{
  "comparison": {
    "version1": "string",
    "version2": "string",
    "comparedAt": "ISO timestamp"
  },
  "changes": [
    {
      "id": "string",
      "type": "addition|deletion|modification",
      "section": "string",
      "originalText": "string|null",
      "newText": "string|null",
      "impact": "minor|moderate|significant",
      "legalImplication": "string"
    }
  ],
  "summary": {
    "totalChanges": number,
    "byImpact": {"minor": number, "moderate": number, "significant": number},
    "criticalChanges": ["string"],
    "recommendation": "approve|review|reject"
  },
  "redlineDocument": "string"
}`;
        userPrompt = `Compara versiones: v1=${params?.version1Text}, v2=${params?.version2Text}`;
        break;

      case 'extract_obligations':
        systemPrompt = `Eres un experto en extracción y seguimiento de obligaciones contractuales.

EXTRACCIÓN DE OBLIGACIONES:
- Identificar todas las obligaciones por parte
- Clasificar por tipo y urgencia
- Extraer fechas límite y condiciones
- Detectar penalizaciones por incumplimiento
- Crear calendario de obligaciones

FORMATO JSON:
{
  "obligations": [
    {
      "id": "string",
      "party": "string",
      "description": "string",
      "type": "payment|delivery|reporting|compliance|other",
      "dueDate": "YYYY-MM-DD|null",
      "isRecurring": boolean,
      "frequency": "daily|weekly|monthly|quarterly|annual|null",
      "condition": "string|null",
      "penalty": "string|null",
      "status": "pending|completed|overdue",
      "priority": "low|medium|high|critical"
    }
  ],
  "obligationsByParty": Record<string, string[]>,
  "timeline": [{"date": "YYYY-MM-DD", "obligations": ["id"]}],
  "criticalDeadlines": [{"date": "YYYY-MM-DD", "obligation": "string", "penalty": "string"}],
  "complianceChecklist": [{"item": "string", "responsible": "string", "deadline": "string"}]
}`;
        userPrompt = `Extrae obligaciones de: ${JSON.stringify(params?.contractText || context)}`;
        break;

      case 'risk_assessment':
        systemPrompt = `Eres un analista de riesgos contractuales con experiencia en due diligence.

EVALUACIÓN DE RIESGOS:
- Riesgos legales y regulatorios
- Riesgos financieros
- Riesgos operacionales
- Riesgos reputacionales
- Riesgos de incumplimiento

FORMATO JSON:
{
  "overallRisk": "low|medium|high|critical",
  "riskScore": number,
  "risks": [
    {
      "id": "string",
      "category": "legal|financial|operational|reputational|compliance",
      "description": "string",
      "likelihood": "unlikely|possible|likely|certain",
      "impact": "minor|moderate|major|severe",
      "riskLevel": "low|medium|high|critical",
      "mitigationStrategy": "string",
      "residualRisk": "low|medium|high"
    }
  ],
  "riskMatrix": {
    "highLikelihoodHighImpact": ["id"],
    "highLikelihoodLowImpact": ["id"],
    "lowLikelihoodHighImpact": ["id"],
    "lowLikelihoodLowImpact": ["id"]
  },
  "recommendations": [
    {
      "priority": number,
      "action": "string",
      "expectedOutcome": "string",
      "resources": "string"
    }
  ],
  "approvalRecommendation": "approve|conditionalApprove|reject",
  "conditions": ["string"]
}`;
        userPrompt = `Evalúa riesgos de: ${JSON.stringify(params?.contractData || context)}`;
        break;

      case 'generate_amendment':
        systemPrompt = `Eres un redactor legal especializado en enmiendas y adendas contractuales.

GENERACIÓN DE ENMIENDAS:
- Referenciar contrato original correctamente
- Especificar cláusulas modificadas
- Mantener coherencia legal
- Incluir consideraciones necesarias
- Formato formal y ejecutable

FORMATO JSON:
{
  "amendment": {
    "title": "string",
    "effectiveDate": "YYYY-MM-DD",
    "referenceContract": "string",
    "parties": [{"name": "string", "role": "string"}],
    "recitals": ["string"],
    "modifications": [
      {
        "section": "string",
        "originalText": "string",
        "amendedText": "string",
        "rationale": "string"
      }
    ],
    "newClauses": [{"title": "string", "text": "string"}],
    "deletedClauses": [{"section": "string", "reason": "string"}],
    "generalProvisions": ["string"],
    "signatureBlock": "string"
  },
  "documentText": "string",
  "validationChecklist": [{"item": "string", "status": "pass|fail|warning"}]
}`;
        userPrompt = `Genera enmienda para: contrato=${params?.originalContractId}, cambios=${JSON.stringify(params?.requestedChanges)}`;
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
        temperature: 0.4,
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
      console.error('[erp-hr-clm-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-hr-clm-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-clm-agent] Error:', error);
    return internalError(corsHeaders);
  }
});
