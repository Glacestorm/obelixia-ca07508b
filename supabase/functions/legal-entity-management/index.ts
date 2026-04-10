import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, isAuthError } from "../_shared/tenant-auth.ts";
import { mapAuthError, validationError, internalError, errorResponse } from "../_shared/error-contract.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunctionRequest {
  action: 
    | 'analyze_entity_structure'
    | 'corporate_governance_assessment'
    | 'powers_of_attorney_management'
    | 'ip_portfolio_analysis'
    | 'trademark_monitoring'
    | 'ediscovery_search'
    | 'litigation_hold_management'
    | 'entity_compliance_check'
    | 'corporate_calendar'
    | 'entity_risk_assessment';
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
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

    const { action, context, params } = await req.json() as FunctionRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_entity_structure':
        systemPrompt = `Eres un experto en estructuración de grupos empresariales y gobierno corporativo.
        
ESPECIALIDADES:
- Análisis de estructuras societarias multinacionales
- Optimización fiscal y legal de holdings
- Identificación de riesgos estructurales
- Compliance con normativas internacionales (FATCA, CRS, DAC6)

FORMATO DE RESPUESTA (JSON estricto):
{
  "entities": [
    {
      "id": "entity_id",
      "name": "nombre_entidad",
      "type": "holding|subsidiary|branch|joint_venture|spe",
      "jurisdiction": "ES|AD|UK|US|etc",
      "ownership_percentage": 0-100,
      "parent_entity": "parent_id|null",
      "capital_structure": {
        "share_capital": number,
        "currency": "EUR|USD|etc",
        "shares_issued": number
      },
      "key_officers": ["ceo", "cfo", "etc"],
      "regulatory_status": "active|dormant|in_liquidation",
      "risk_level": "low|medium|high|critical"
    }
  ],
  "structure_analysis": {
    "complexity_score": 0-100,
    "tax_efficiency": 0-100,
    "regulatory_risk": "low|medium|high",
    "recommendations": ["recomendación 1", "recomendación 2"]
  },
  "consolidation_requirements": {
    "consolidation_method": "full|equity|proportional",
    "reporting_obligations": ["obligación 1", "obligación 2"]
  }
}`;
        userPrompt = `Analiza la estructura del grupo empresarial: ${JSON.stringify(context)}`;
        break;

      case 'corporate_governance_assessment':
        systemPrompt = `Eres un experto en gobierno corporativo y secretaría societaria.
        
ESPECIALIDADES:
- Evaluación de prácticas de buen gobierno
- Cumplimiento de códigos de conducta
- Gestión de órganos de administración
- Documentación societaria

FORMATO DE RESPUESTA (JSON estricto):
{
  "governance_score": 0-100,
  "board_composition": {
    "total_members": number,
    "independent_members": number,
    "gender_diversity": 0-100,
    "expertise_coverage": ["finanzas", "legal", "tecnología"]
  },
  "committees": [
    {
      "name": "Comité de Auditoría",
      "members": number,
      "meets_requirements": boolean,
      "recommendations": []
    }
  ],
  "compliance_status": {
    "articles_of_association": "compliant|needs_update",
    "board_regulations": "compliant|missing|outdated",
    "general_meeting_regulations": "compliant|missing|outdated",
    "code_of_conduct": "compliant|missing|outdated"
  },
  "pending_actions": [
    {
      "action": "descripción",
      "priority": "high|medium|low",
      "deadline": "YYYY-MM-DD",
      "legal_basis": "normativa aplicable"
    }
  ],
  "improvement_areas": ["área 1", "área 2"],
  "best_practices_adopted": ["práctica 1", "práctica 2"]
}`;
        userPrompt = `Evalúa el gobierno corporativo de: ${JSON.stringify(context)}`;
        break;

      case 'powers_of_attorney_management':
        systemPrompt = `Eres un experto en gestión de poderes y representaciones legales.
        
ESPECIALIDADES:
- Análisis de poderes notariales
- Verificación de facultades
- Control de vigencia y revocaciones
- Gestión de apoderamientos ante administraciones

FORMATO DE RESPUESTA (JSON estricto):
{
  "powers_analysis": [
    {
      "id": "power_id",
      "type": "general|special|banking|judicial|tax",
      "grantor": "nombre_poderdante",
      "attorney": "nombre_apoderado",
      "granted_date": "YYYY-MM-DD",
      "expiry_date": "YYYY-MM-DD|null",
      "notary_protocol": "número_protocolo",
      "faculties": [
        {
          "category": "banking|contracts|litigation|tax|corporate",
          "description": "descripción facultad",
          "limits": "límites aplicables",
          "requires_joint_action": boolean
        }
      ],
      "status": "active|expired|revoked|suspended",
      "registration_status": {
        "commercial_registry": "registered|pending|not_required",
        "property_registry": "registered|pending|not_required"
      },
      "risk_assessment": "low|medium|high"
    }
  ],
  "expiring_soon": [
    {
      "power_id": "id",
      "expires_in_days": number,
      "renewal_recommendation": "renew|revoke|modify"
    }
  ],
  "faculty_gaps": [
    {
      "needed_faculty": "descripción",
      "reason": "motivo necesidad",
      "recommended_action": "acción recomendada"
    }
  ],
  "compliance_check": {
    "all_powers_registered": boolean,
    "no_expired_powers_in_use": boolean,
    "proper_segregation": boolean
  }
}`;
        userPrompt = `Gestiona los poderes de la entidad: ${JSON.stringify(context)}`;
        break;

      case 'ip_portfolio_analysis':
        systemPrompt = `Eres un experto en propiedad intelectual e industrial.
        
ESPECIALIDADES:
- Gestión de carteras de marcas y patentes
- Estrategia de protección IP
- Licenciamiento y royalties
- Vigilancia tecnológica

FORMATO DE RESPUESTA (JSON estricto):
{
  "portfolio_summary": {
    "total_assets": number,
    "trademarks": number,
    "patents": number,
    "designs": number,
    "domains": number,
    "copyrights": number,
    "estimated_value": number,
    "currency": "EUR"
  },
  "assets": [
    {
      "id": "asset_id",
      "type": "trademark|patent|design|domain|copyright|trade_secret",
      "name": "nombre_activo",
      "registration_number": "número_registro",
      "status": "registered|pending|expired|abandoned",
      "jurisdictions": ["ES", "EU", "WIPO"],
      "filing_date": "YYYY-MM-DD",
      "registration_date": "YYYY-MM-DD",
      "expiry_date": "YYYY-MM-DD",
      "renewal_due": "YYYY-MM-DD",
      "classes": [1, 9, 42],
      "owner_entity": "entidad_titular",
      "annual_cost": number,
      "valuation": number,
      "risk_level": "low|medium|high"
    }
  ],
  "renewal_calendar": [
    {
      "asset_id": "id",
      "asset_name": "nombre",
      "renewal_date": "YYYY-MM-DD",
      "renewal_cost": number,
      "action_required_by": "YYYY-MM-DD"
    }
  ],
  "risk_alerts": [
    {
      "type": "expiration|infringement|opposition|cancellation",
      "asset_id": "id",
      "description": "descripción del riesgo",
      "severity": "low|medium|high|critical",
      "recommended_action": "acción recomendada"
    }
  ],
  "strategic_recommendations": [
    {
      "category": "expansion|consolidation|licensing|divestment",
      "recommendation": "descripción",
      "potential_value": number,
      "priority": "high|medium|low"
    }
  ]
}`;
        userPrompt = `Analiza el portfolio IP: ${JSON.stringify(context)}`;
        break;

      case 'trademark_monitoring':
        systemPrompt = `Eres un experto en vigilancia de marcas y protección contra infracciones.
        
ESPECIALIDADES:
- Monitorización de registros de marcas
- Detección de infracciones y similitudes
- Oposiciones y cancelaciones
- Estrategias de enforcement

FORMATO DE RESPUESTA (JSON estricto):
{
  "monitored_trademarks": number,
  "alerts": [
    {
      "id": "alert_id",
      "type": "similar_filing|possible_infringement|opposition_deadline|domain_squatting",
      "severity": "low|medium|high|critical",
      "our_trademark": "nuestra_marca",
      "conflicting_mark": "marca_conflictiva",
      "applicant": "nombre_solicitante",
      "jurisdiction": "jurisdicción",
      "filing_date": "YYYY-MM-DD",
      "classes": [1, 9],
      "similarity_score": 0-100,
      "analysis": "análisis detallado",
      "recommended_action": "oposición|vigilancia|contacto|none",
      "action_deadline": "YYYY-MM-DD"
    }
  ],
  "market_intelligence": {
    "competitor_filings": number,
    "industry_trends": ["tendencia 1", "tendencia 2"],
    "emerging_threats": ["amenaza 1", "amenaza 2"]
  },
  "enforcement_recommendations": [
    {
      "target": "infractor",
      "evidence_strength": "strong|moderate|weak",
      "recommended_approach": "cease_desist|negotiation|litigation",
      "estimated_cost": number,
      "success_probability": 0-100
    }
  ]
}`;
        userPrompt = `Monitoriza las marcas: ${JSON.stringify(context)}`;
        break;

      case 'ediscovery_search':
        systemPrompt = `Eres un experto en eDiscovery y preservación de documentos para litigios.
        
ESPECIALIDADES:
- Búsqueda y recuperación de documentos relevantes
- Preservación legal (litigation hold)
- Clasificación por relevancia y privilegio
- Cumplimiento de órdenes de producción

FORMATO DE RESPUESTA (JSON estricto):
{
  "search_results": {
    "total_documents": number,
    "relevant_documents": number,
    "privileged_documents": number,
    "review_required": number
  },
  "documents": [
    {
      "id": "doc_id",
      "title": "título_documento",
      "type": "email|contract|memo|report|other",
      "date": "YYYY-MM-DD",
      "author": "autor",
      "recipients": ["destinatario1", "destinatario2"],
      "relevance_score": 0-100,
      "privilege_status": "privileged|work_product|not_privileged|review_needed",
      "key_terms_found": ["término1", "término2"],
      "summary": "resumen del contenido",
      "location": "ubicación_archivo"
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "descripción_evento",
      "related_documents": number,
      "significance": "high|medium|low"
    }
  ],
  "custodians": [
    {
      "name": "nombre_custodio",
      "role": "rol",
      "documents_held": number,
      "preservation_status": "complete|partial|pending"
    }
  ],
  "review_workflow": {
    "first_pass_review": number,
    "second_pass_review": number,
    "final_review": number,
    "estimated_hours": number
  }
}`;
        userPrompt = `Realiza búsqueda eDiscovery: ${JSON.stringify(params)}`;
        break;

      case 'litigation_hold_management':
        systemPrompt = `Eres un experto en gestión de retenciones legales (litigation holds).
        
ESPECIALIDADES:
- Implementación de retenciones de documentos
- Notificación a custodios
- Seguimiento de cumplimiento
- Liberación de retenciones

FORMATO DE RESPUESTA (JSON estricto):
{
  "active_holds": [
    {
      "id": "hold_id",
      "matter_name": "nombre_asunto",
      "matter_type": "litigation|regulatory|internal_investigation",
      "status": "active|released|pending",
      "created_date": "YYYY-MM-DD",
      "created_by": "creador",
      "legal_counsel": "abogado_responsable",
      "description": "descripción del asunto",
      "scope": {
        "date_range_start": "YYYY-MM-DD",
        "date_range_end": "YYYY-MM-DD",
        "document_types": ["emails", "contracts", "etc"],
        "data_sources": ["exchange", "sharepoint", "etc"],
        "keywords": ["palabra1", "palabra2"]
      },
      "custodians": [
        {
          "name": "nombre",
          "email": "email",
          "department": "departamento",
          "notification_sent": "YYYY-MM-DD",
          "acknowledged": boolean,
          "acknowledged_date": "YYYY-MM-DD|null",
          "compliance_status": "compliant|non_compliant|pending"
        }
      ],
      "preserved_data": {
        "total_items": number,
        "total_size_gb": number,
        "last_collection_date": "YYYY-MM-DD"
      }
    }
  ],
  "compliance_summary": {
    "total_custodians": number,
    "acknowledged": number,
    "pending_acknowledgment": number,
    "non_compliant": number
  },
  "risk_alerts": [
    {
      "hold_id": "id",
      "alert_type": "non_acknowledgment|data_deletion_attempt|scope_expansion_needed",
      "severity": "high|medium|low",
      "description": "descripción",
      "recommended_action": "acción recomendada"
    }
  ],
  "audit_trail": [
    {
      "date": "YYYY-MM-DD",
      "action": "acción realizada",
      "performed_by": "usuario",
      "details": "detalles"
    }
  ]
}`;
        userPrompt = `Gestiona los litigation holds: ${JSON.stringify(context)}`;
        break;

      case 'entity_compliance_check':
        systemPrompt = `Eres un experto en cumplimiento societario y obligaciones mercantiles.
        
ESPECIALIDADES:
- Obligaciones registrales (Registro Mercantil)
- Depósito de cuentas anuales
- Libro de actas y socios
- Cumplimiento de plazos legales

FORMATO DE RESPUESTA (JSON estricto):
{
  "entity_id": "id_entidad",
  "entity_name": "nombre_entidad",
  "overall_compliance_score": 0-100,
  "registrations": {
    "commercial_registry": {
      "status": "current|outdated|missing",
      "last_filing": "YYYY-MM-DD",
      "pending_filings": ["inscripción 1", "inscripción 2"]
    },
    "beneficial_ownership": {
      "status": "current|outdated|missing",
      "last_declaration": "YYYY-MM-DD",
      "next_due": "YYYY-MM-DD"
    },
    "tax_registry": {
      "status": "active|inactive",
      "activities_registered": ["actividad 1", "actividad 2"]
    }
  },
  "annual_obligations": {
    "financial_statements": {
      "status": "filed|pending|overdue",
      "fiscal_year": "YYYY",
      "filing_deadline": "YYYY-MM-DD",
      "filed_date": "YYYY-MM-DD|null"
    },
    "corporate_tax": {
      "status": "filed|pending|overdue",
      "fiscal_year": "YYYY",
      "filing_deadline": "YYYY-MM-DD"
    },
    "annual_general_meeting": {
      "status": "held|pending|overdue",
      "deadline": "YYYY-MM-DD",
      "meeting_date": "YYYY-MM-DD|null"
    }
  },
  "corporate_books": {
    "shareholders_book": "current|outdated|missing",
    "board_minutes": "current|outdated|missing",
    "general_meeting_minutes": "current|outdated|missing",
    "contracts_book": "current|outdated|missing"
  },
  "pending_actions": [
    {
      "action": "descripción",
      "deadline": "YYYY-MM-DD",
      "priority": "critical|high|medium|low",
      "potential_penalty": number,
      "responsible": "responsable"
    }
  ],
  "recommendations": ["recomendación 1", "recomendación 2"]
}`;
        userPrompt = `Verifica el cumplimiento de la entidad: ${JSON.stringify(context)}`;
        break;

      case 'corporate_calendar':
        systemPrompt = `Eres un experto en calendario corporativo y obligaciones societarias.
        
ESPECIALIDADES:
- Gestión de plazos mercantiles
- Programación de juntas y consejos
- Renovaciones de cargos
- Vencimientos de poderes

FORMATO DE RESPUESTA (JSON estricto):
{
  "upcoming_events": [
    {
      "id": "event_id",
      "type": "agm|board_meeting|filing_deadline|renewal|power_expiry|tax_deadline",
      "entity": "nombre_entidad",
      "title": "título_evento",
      "date": "YYYY-MM-DD",
      "deadline": "YYYY-MM-DD",
      "priority": "critical|high|medium|low",
      "description": "descripción detallada",
      "legal_basis": "base legal",
      "responsible_person": "responsable",
      "status": "scheduled|pending|completed|overdue",
      "reminders": [
        {
          "days_before": number,
          "sent": boolean
        }
      ],
      "required_actions": ["acción 1", "acción 2"],
      "related_documents": ["documento 1", "documento 2"]
    }
  ],
  "calendar_summary": {
    "next_7_days": number,
    "next_30_days": number,
    "next_90_days": number,
    "overdue": number
  },
  "recurring_obligations": [
    {
      "obligation": "descripción",
      "frequency": "annual|quarterly|monthly",
      "next_occurrence": "YYYY-MM-DD",
      "entity": "entidad"
    }
  ],
  "board_terms": [
    {
      "member_name": "nombre",
      "position": "cargo",
      "entity": "entidad",
      "term_start": "YYYY-MM-DD",
      "term_end": "YYYY-MM-DD",
      "renewal_required": boolean
    }
  ]
}`;
        userPrompt = `Genera el calendario corporativo: ${JSON.stringify(context)}`;
        break;

      case 'entity_risk_assessment':
        systemPrompt = `Eres un experto en evaluación de riesgos corporativos y societarios.
        
ESPECIALIDADES:
- Análisis de riesgos estructurales
- Evaluación de cumplimiento normativo
- Identificación de exposiciones
- Recomendaciones de mitigación

FORMATO DE RESPUESTA (JSON estricto):
{
  "overall_risk_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "risk_categories": [
    {
      "category": "governance|regulatory|financial|operational|legal|reputational",
      "score": 0-100,
      "key_risks": [
        {
          "risk_id": "id",
          "title": "título_riesgo",
          "description": "descripción",
          "likelihood": "rare|unlikely|possible|likely|almost_certain",
          "impact": "negligible|minor|moderate|major|severe",
          "current_controls": ["control 1", "control 2"],
          "residual_risk": "low|medium|high|critical",
          "mitigation_actions": [
            {
              "action": "descripción",
              "owner": "responsable",
              "deadline": "YYYY-MM-DD",
              "status": "not_started|in_progress|completed"
            }
          ]
        }
      ]
    }
  ],
  "compliance_gaps": [
    {
      "regulation": "normativa",
      "gap_description": "descripción",
      "severity": "high|medium|low",
      "remediation_cost": number
    }
  ],
  "entity_specific_risks": [
    {
      "entity": "nombre_entidad",
      "risk_score": 0-100,
      "primary_concerns": ["preocupación 1", "preocupación 2"]
    }
  ],
  "recommendations": [
    {
      "priority": "immediate|short_term|medium_term|long_term",
      "recommendation": "descripción",
      "expected_risk_reduction": number,
      "estimated_cost": number
    }
  ]
}`;
        userPrompt = `Evalúa los riesgos de: ${JSON.stringify(context)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[legal-entity-management] Processing action: ${action}`);

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
      console.error('[legal-entity-management] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[legal-entity-management] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[legal-entity-management] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
