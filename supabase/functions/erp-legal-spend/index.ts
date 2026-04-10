import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateTenantAccess, isAuthError } from "../_shared/tenant-auth.ts";
import { mapAuthError, validationError, internalError, errorResponse } from "../_shared/error-contract.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalSpendRequest {
  action: 'analyze_spend' | 'generate_ledes' | 'analyze_invoice' | 'benchmark_rates' | 'optimize_costs';
  context?: {
    companyId: string;
    matterId?: string;
    period?: { start: string; end: string };
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

    const { action, context, params } = await req.json() as LegalSpendRequest;

    // --- S7.1: Auth hardening — validateTenantAccess with mandatory companyId ---
    const companyId = context?.companyId || (params?.companyId as string);
    if (!companyId) {
      return validationError('company_id is required', corsHeaders);
    }

    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    // --- end auth ---

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_spend':
        systemPrompt = `Eres un experto en Legal Spend Management y análisis de gastos legales.

ÁREAS DE ANÁLISIS:
- Gasto total por período, área de práctica y tipo de asunto
- Comparación interno vs externo (in-house vs outside counsel)
- Análisis de tarifas y utilización
- Identificación de anomalías y oportunidades de ahorro
- Predicción de gastos futuros

FORMATO JSON ESTRICTO:
{
  "spend_analysis": {
    "total_spend": number,
    "period_comparison": {
      "current": number,
      "previous": number,
      "variance_percentage": number
    },
    "breakdown": {
      "by_practice_area": [{"area": "string", "amount": number, "percentage": number}],
      "by_matter_type": [{"type": "string", "amount": number, "percentage": number}],
      "by_vendor": [{"vendor": "string", "amount": number, "matter_count": number}]
    },
    "internal_vs_external": {
      "internal_percentage": number,
      "external_percentage": number,
      "recommendation": "string"
    },
    "kpis": {
      "average_matter_cost": number,
      "average_hourly_rate": number,
      "budget_utilization": number,
      "accrual_accuracy": number
    },
    "anomalies": [
      {"type": "string", "description": "string", "impact": number, "severity": "low|medium|high"}
    ],
    "optimization_opportunities": [
      {"opportunity": "string", "potential_savings": number, "effort": "low|medium|high"}
    ],
    "forecast": {
      "next_quarter": number,
      "confidence": number
    }
  }
}`;
        userPrompt = `Analiza gastos legales para empresa ${context?.companyId || 'N/A'}
Período: ${context?.period ? `${context.period.start} a ${context.period.end}` : 'último año'}
Asunto específico: ${context?.matterId || 'todos'}`;
        break;

      case 'generate_ledes':
        systemPrompt = `Eres un experto en facturación electrónica legal y estándares LEDES.

FORMATOS SOPORTADOS:
- LEDES98B: Formato delimitado por pipes más común
- LEDES2000: XML estructurado
- LEDES_XML: Versión XML moderna

CÓDIGOS UTBMS:
- Actividades (A): A101-A106 (Research, Drafting, Review, etc.)
- Tareas (L): L110-L500 (Case Assessment, Discovery, Trial, etc.)
- Gastos (E): E101-E111 (Court Fees, Copies, Travel, etc.)

FORMATO JSON ESTRICTO:
{
  "ledes_invoice": {
    "format": "LEDES98B|LEDES2000|LEDES_XML",
    "header": {
      "invoice_number": "string",
      "invoice_date": "string",
      "client_id": "string",
      "law_firm_id": "string",
      "matter_id": "string"
    },
    "line_items": [
      {
        "line_type": "FE|EX", 
        "date": "string",
        "timekeeper_id": "string",
        "task_code": "string",
        "activity_code": "string",
        "description": "string",
        "hours": number,
        "rate": number,
        "amount": number
      }
    ],
    "summary": {
      "total_fees": number,
      "total_expenses": number,
      "total_amount": number,
      "tax_amount": number
    },
    "validation": {
      "is_valid": boolean,
      "errors": ["string"],
      "warnings": ["string"]
    }
  }
}`;
        userPrompt = `Genera factura LEDES formato ${params?.format || 'LEDES98B'} para asunto ${params?.matterId}`;
        break;

      case 'analyze_invoice':
        systemPrompt = `Eres un auditor especializado en facturas legales.

DETECCIONES:
- Block billing (múltiples tareas en una entrada)
- Tarifas fuera de rango acordado
- Duplicados potenciales
- Descripciones vagas o insuficientes
- Tiempo excesivo para tareas simples
- Gastos no acordados o excesivos

FORMATO JSON ESTRICTO:
{
  "invoice_analysis": {
    "invoice_id": "string",
    "total_amount": number,
    "flags": [
      {
        "type": "block_billing|excessive_time|rate_variance|vague_description|duplicate|unapproved_expense",
        "severity": "info|warning|error",
        "line_item_id": "string",
        "description": "string",
        "suggested_adjustment": number,
        "recommendation": "string"
      }
    ],
    "summary": {
      "total_flags": number,
      "potential_savings": number,
      "approval_recommendation": "approve|review|reject"
    },
    "compliance_score": number,
    "billing_guidelines_adherence": number
  }
}`;
        userPrompt = `Analiza factura ${params?.invoiceId} para detectar anomalías y oportunidades de ahorro`;
        break;

      case 'benchmark_rates':
        systemPrompt = `Eres un analista de benchmarking de tarifas legales en España y Europa.

DATOS DE REFERENCIA (España 2024-2025):
- Partner Senior: 350-600 EUR/hora
- Partner: 250-450 EUR/hora
- Associate Senior: 180-300 EUR/hora
- Associate: 120-200 EUR/hora
- Paralegal: 80-120 EUR/hora

FACTORES DE AJUSTE:
- Madrid/Barcelona: +15-20%
- Big Four: +10-15%
- Boutique especializada: +5-10%
- Volumen alto: -10-15%

FORMATO JSON ESTRICTO:
{
  "rate_benchmark": {
    "market_data": {
      "currency": "EUR",
      "region": "Spain",
      "data_year": 2025
    },
    "by_role": [
      {
        "role": "string",
        "market_low": number,
        "market_median": number,
        "market_high": number,
        "your_rate": number,
        "percentile": number,
        "variance": number
      }
    ],
    "by_practice_area": [
      {
        "area": "string",
        "median_rate": number,
        "premium_factor": number
      }
    ],
    "recommendations": [
      {"vendor": "string", "current_rate": number, "suggested_rate": number, "negotiation_leverage": "string"}
    ],
    "potential_savings": {
      "annual": number,
      "per_matter": number
    }
  }
}`;
        userPrompt = `Benchmark de tarifas para empresa ${params?.companyId}
Área de práctica: ${params?.practiceArea || 'todas'}`;
        break;

      case 'optimize_costs':
        systemPrompt = `Eres un consultor de optimización de costos legales.

ESTRATEGIAS:
- Alternative Fee Arrangements (AFAs)
- Legal Operations improvement
- Technology leverage (CLM, AI review)
- Panel rationalization
- Insourcing/outsourcing balance
- Process standardization

FORMATO JSON ESTRICTO:
{
  "optimization_plan": {
    "current_state": {
      "annual_spend": number,
      "efficiency_score": number,
      "areas_of_concern": ["string"]
    },
    "recommendations": [
      {
        "initiative": "string",
        "category": "AFA|technology|process|panel|insource",
        "description": "string",
        "estimated_savings": number,
        "implementation_effort": "low|medium|high",
        "timeline_months": number,
        "roi_percentage": number,
        "priority": "high|medium|low"
      }
    ],
    "quick_wins": [
      {"action": "string", "savings": number, "timeline_days": number}
    ],
    "three_year_projection": {
      "year1_savings": number,
      "year2_savings": number,
      "year3_savings": number,
      "total_savings": number
    }
  }
}`;
        userPrompt = `Genera plan de optimización de costos legales para empresa ${params?.companyId}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-legal-spend] Processing: ${action}`);

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
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded', 429, corsHeaders);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content };
    } catch {
      result = { rawContent: content };
    }

    console.log(`[erp-legal-spend] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-legal-spend] Error:', error);
    return internalError(corsHeaders);
  }
});
