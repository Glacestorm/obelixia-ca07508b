import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ESGReportingRequest {
  action: 'generate_csrd_report' | 'analyze_emissions' | 'taxonomy_alignment' | 'double_materiality' | 'sbti_pathway';
  context?: {
    companyId: string;
    fiscalYear: string;
  };
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

    const { action, context, params } = await req.json() as ESGReportingRequest;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_csrd_report':
        systemPrompt = `Eres un experto en reporting de sostenibilidad CSRD/ESRS de la Unión Europea.

MARCO NORMATIVO:
- Corporate Sustainability Reporting Directive (CSRD)
- European Sustainability Reporting Standards (ESRS)
- ESRS 1: General Requirements
- ESRS 2: General Disclosures
- ESRS E1-E5: Environmental Standards
- ESRS S1-S4: Social Standards
- ESRS G1-G2: Governance Standards

FORMATO JSON ESTRICTO:
{
  "report": {
    "report_title": "string",
    "executive_summary": "string (resumen ejecutivo 200 palabras)",
    "governance_section": {
      "board_oversight": "string",
      "management_role": "string",
      "sustainability_governance": "string"
    },
    "strategy_section": {
      "business_model_impacts": "string",
      "time_horizons": {"short": "string", "medium": "string", "long": "string"},
      "scenario_analysis": "string"
    },
    "risk_management_section": {
      "identification_process": "string",
      "assessment_process": "string",
      "management_process": "string",
      "integration": "string"
    },
    "metrics_targets_section": {
      "key_metrics": [{"name": "string", "value": "string", "unit": "string", "trend": "up|down|stable"}],
      "targets": [{"name": "string", "target_year": number, "progress_percentage": number}]
    },
    "esrs_disclosures": {
      "E1_climate": {"ghg_emissions": "string", "targets": "string", "actions": "string"},
      "E2_pollution": {"air_water_soil": "string", "substances": "string"},
      "E3_water": {"consumption": "string", "management": "string"},
      "E4_biodiversity": {"impacts": "string", "dependencies": "string"},
      "E5_circular_economy": {"resource_use": "string", "waste": "string"},
      "S1_workforce": {"conditions": "string", "diversity": "string", "training": "string"},
      "S2_value_chain": {"due_diligence": "string", "risks": "string"},
      "S3_communities": {"engagement": "string", "impacts": "string"},
      "S4_consumers": {"safety": "string", "privacy": "string"},
      "G1_business_conduct": {"ethics": "string", "anti_corruption": "string"},
      "G2_lobbying": {"political_engagement": "string", "transparency": "string"}
    },
    "materiality_assessment": {
      "process": "string",
      "material_topics": [{"topic": "string", "impact_importance": number, "financial_importance": number}]
    },
    "compliance_score": number,
    "disclosure_completeness": number,
    "recommendations": ["string"]
  }
}`;
        userPrompt = `Genera estructura de informe ${params?.reportType || 'CSRD'} para el ejercicio fiscal ${context?.fiscalYear || '2025'}.
Incluye todas las secciones ESRS requeridas.`;
        break;

      case 'analyze_emissions':
        systemPrompt = `Eres un experto en contabilidad de carbono según GHG Protocol y SBTi.

SCOPES SEGÚN GHG PROTOCOL:
- Scope 1: Emisiones directas (combustión estacionaria, móvil, procesos, fugitivas)
- Scope 2: Electricidad comprada (location-based y market-based)
- Scope 3: 15 categorías de cadena de valor

MÉTRICAS DE INTENSIDAD:
- tCO2e por millón de ingresos
- tCO2e por empleado
- tCO2e por unidad producida

FORMATO JSON ESTRICTO:
{
  "emissions_analysis": {
    "total_emissions_tco2e": number,
    "scope_breakdown": {
      "scope1": {"total": number, "percentage": number, "sources": [{"name": "string", "tco2e": number}]},
      "scope2": {"location_based": number, "market_based": number, "percentage": number},
      "scope3": {"total": number, "percentage": number, "hotspots": [{"category": "string", "tco2e": number}]}
    },
    "intensity_metrics": {
      "per_million_revenue": number,
      "per_employee": number,
      "industry_benchmark": number
    },
    "year_over_year_change": {
      "absolute_change": number,
      "percentage_change": number,
      "trend": "increasing|decreasing|stable"
    },
    "decarbonization_opportunities": [
      {"initiative": "string", "reduction_potential_tco2e": number, "investment_required": number, "payback_years": number}
    ],
    "sbti_alignment": {
      "current_trajectory": "1.5C|well_below_2C|2C|not_aligned",
      "gap_to_target": number,
      "recommended_actions": ["string"]
    }
  }
}`;
        userPrompt = `Analiza las emisiones de carbono para la empresa en el ejercicio ${context?.fiscalYear || '2025'}.`;
        break;

      case 'taxonomy_alignment':
        systemPrompt = `Eres un experto en la Taxonomía de la UE para finanzas sostenibles.

OBJETIVOS AMBIENTALES (Art. 9):
1. Mitigación del cambio climático
2. Adaptación al cambio climático
3. Uso sostenible del agua
4. Economía circular
5. Prevención de la contaminación
6. Protección de ecosistemas

CRITERIOS DE ALINEACIÓN:
- Contribución sustancial a al menos un objetivo
- DNSH (Do No Significant Harm) a otros objetivos
- Cumplimiento de salvaguardas mínimas (OECD Guidelines, UN Guiding Principles)

FORMATO JSON ESTRICTO:
{
  "taxonomy_assessment": {
    "eligibility_summary": {
      "turnover_eligible_percentage": number,
      "capex_eligible_percentage": number,
      "opex_eligible_percentage": number
    },
    "alignment_summary": {
      "turnover_aligned_percentage": number,
      "capex_aligned_percentage": number,
      "opex_aligned_percentage": number
    },
    "activities": [
      {
        "activity_name": "string",
        "nace_code": "string",
        "environmental_objective": "string",
        "substantial_contribution": boolean,
        "dnsh_compliance": {
          "climate_mitigation": boolean,
          "climate_adaptation": boolean,
          "water": boolean,
          "circular_economy": boolean,
          "pollution": boolean,
          "biodiversity": boolean
        },
        "minimum_safeguards": boolean,
        "is_aligned": boolean,
        "turnover_amount": number,
        "capex_amount": number,
        "opex_amount": number
      }
    ],
    "gaps_and_recommendations": ["string"],
    "improvement_roadmap": [{"action": "string", "timeline": "string", "impact": "string"}]
  }
}`;
        userPrompt = `Evalúa la alineación con la Taxonomía de la UE para el ejercicio ${context?.fiscalYear || '2025'}.`;
        break;

      case 'double_materiality':
        systemPrompt = `Eres un experto en evaluación de doble materialidad según ESRS.

DOBLE MATERIALIDAD:
1. Materialidad de impacto: Impactos de la empresa en personas y medio ambiente
2. Materialidad financiera: Riesgos/oportunidades que afectan la situación financiera

PROCESO DE EVALUACIÓN:
- Identificación de temas potenciales
- Evaluación de stakeholders
- Análisis de impactos y dependencias
- Priorización y umbral de materialidad

FORMATO JSON ESTRICTO:
{
  "double_materiality_assessment": {
    "methodology": "string",
    "stakeholder_engagement": {
      "groups_consulted": ["string"],
      "engagement_methods": ["string"]
    },
    "material_topics": [
      {
        "topic": "string",
        "esrs_standard": "string",
        "impact_materiality": {
          "score": number,
          "nature": "actual|potential",
          "severity": "high|medium|low",
          "affected_stakeholders": ["string"]
        },
        "financial_materiality": {
          "score": number,
          "risk_type": "transition|physical|liability",
          "time_horizon": "short|medium|long",
          "financial_magnitude": "high|medium|low"
        },
        "is_material": boolean,
        "priority_ranking": number
      }
    ],
    "materiality_matrix": {
      "x_axis": "impact_materiality",
      "y_axis": "financial_materiality",
      "threshold": {"impact": number, "financial": number}
    },
    "disclosure_requirements": [
      {"topic": "string", "esrs_disclosure": "string", "mandatory": boolean}
    ]
  }
}`;
        userPrompt = `Realiza evaluación de doble materialidad para industria: ${params?.industry || 'general'}.`;
        break;

      case 'sbti_pathway':
        systemPrompt = `Eres un consultor experto en Science Based Targets initiative (SBTi).

TRAYECTORIAS SBTi:
- 1.5°C: Reducción ~4.2% anual
- Well-below 2°C: Reducción ~2.5% anual
- Net-Zero: Neutralidad de emisiones para 2050

REQUISITOS:
- Cobertura mínima Scope 1+2: 95%
- Cobertura Scope 3 si >40% de emisiones totales
- Plazo máximo: 5-10 años

FORMATO JSON ESTRICTO:
{
  "sbti_pathway": {
    "current_state": {
      "baseline_year": number,
      "baseline_emissions_tco2e": number,
      "current_emissions_tco2e": number
    },
    "recommended_target": {
      "target_type": "1.5C|well_below_2C",
      "target_year": number,
      "target_emissions_tco2e": number,
      "reduction_percentage": number,
      "annual_reduction_rate": number
    },
    "pathway": [
      {"year": number, "emissions_target": number, "cumulative_reduction": number}
    ],
    "scope_coverage": {
      "scope1_2_coverage": number,
      "scope3_coverage": number,
      "scope3_categories_included": ["string"]
    },
    "decarbonization_levers": [
      {"lever": "string", "scope": "string", "reduction_potential": number, "timeline": "string", "investment": number}
    ],
    "net_zero_roadmap": {
      "target_year": 2050,
      "residual_emissions": number,
      "neutralization_strategy": "string"
    },
    "validation_readiness": {
      "ready": boolean,
      "gaps": ["string"],
      "next_steps": ["string"]
    }
  }
}`;
        userPrompt = `Desarrolla trayectoria SBTi para alcanzar Net-Zero.`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-esg-reporting] Processing: ${action}`);

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
        temperature: 0.6,
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
      console.error('[erp-esg-reporting] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[erp-esg-reporting] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-esg-reporting] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
