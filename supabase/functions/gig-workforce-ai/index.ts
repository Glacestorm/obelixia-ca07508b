/**
 * gig-workforce-ai - Edge Function para Gestión de Fuerza Laboral Gig/Contingent
 * Fase 11: Freelancers, Contractors, Trabajadores Externos con IA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GigWorkforceRequest {
  action: 'analyze_workforce' | 'compliance_check' | 'predict_performance' | 'generate_invoice' | 'optimize_costs' | 'match_skills';
  context?: {
    companyId: string;
    companyName?: string;
    dateRange?: { from: string; to: string };
    filters?: Record<string, unknown>;
  };
  contractorId?: string;
  projectId?: string;
  timeEntryIds?: string[];
  skillRequirements?: string[];
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

    const requestData: GigWorkforceRequest = await req.json();
    const { action, context, contractorId, projectId, timeEntryIds, skillRequirements } = requestData;

    console.log(`[gig-workforce-ai] Processing action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze_workforce':
        systemPrompt = `Eres un experto en gestión de fuerza laboral contingent/gig para empresas enterprise.

CAPACIDADES:
- Análisis de costes y eficiencia de contractors
- Evaluación de compliance y riesgos laborales
- Identificación de patrones de rendimiento
- Optimización de la mezcla de workforce (FTE vs Contingent)
- Benchmarking de tarifas por categoría

FORMATO DE RESPUESTA (JSON estricto):
{
  "analytics": {
    "totalContractors": number,
    "activeContractors": number,
    "byType": { "freelancer": number, "contractor": number, ... },
    "byStatus": { "active": number, "onboarding": number, ... },
    "complianceRate": number (0-100),
    "avgPerformanceRating": number (1-5),
    "totalMonthlySpend": number,
    "projectsInProgress": number,
    "pendingInvoices": number,
    "pendingApprovals": number,
    "topSkills": [{ "skill": string, "count": number }],
    "spendByCategory": [{ "category": string, "amount": number }]
  },
  "insights": [
    {
      "type": "risk" | "optimization" | "compliance" | "cost" | "performance",
      "severity": "low" | "medium" | "high" | "critical",
      "title": string,
      "description": string,
      "affectedContractors": [string],
      "recommendedAction": string,
      "potentialSavings": number,
      "deadline": string
    }
  ],
  "recommendations": [string],
  "riskScore": number (0-100),
  "efficiencyScore": number (0-100)
}`;
        userPrompt = `Analiza la fuerza laboral contingent para esta empresa:
${JSON.stringify(context, null, 2)}

Genera métricas realistas, insights accionables y recomendaciones de optimización.
Considera aspectos de compliance laboral español/europeo (falsos autónomos, etc.).`;
        break;

      case 'compliance_check':
        systemPrompt = `Eres un experto en compliance laboral para trabajadores externos y contingent workforce.

ÁREAS DE VERIFICACIÓN:
- Riesgo de "falso autónomo" (misclassification)
- Documentación obligatoria (NDA, seguros, certificados)
- Caducidad de documentos
- Límites de tiempo de contratación externa
- Normativa de prevención de riesgos laborales
- RGPD y protección de datos

FORMATO DE RESPUESTA (JSON estricto):
{
  "alerts": [
    {
      "type": "document_expired" | "misclassification_risk" | "missing_agreement" | "time_limit" | "insurance_gap",
      "severity": "low" | "medium" | "high" | "critical",
      "contractorId": string,
      "contractorName": string,
      "issue": string,
      "requiredAction": string,
      "deadline": string,
      "legalReference": string
    }
  ],
  "complianceScore": number (0-100),
  "criticalIssues": number,
  "pendingActions": number,
  "summary": string
}`;
        userPrompt = `Realiza una auditoría de compliance para la empresa ${context?.companyId}.
Identifica todos los riesgos legales y de cumplimiento relacionados con trabajadores externos.`;
        break;

      case 'predict_performance':
        systemPrompt = `Eres un sistema de predicción de rendimiento para contractors basado en histórico.

FACTORES DE ANÁLISIS:
- Historial de entregas a tiempo
- Calidad del trabajo (revisiones necesarias)
- Comunicación y disponibilidad
- Cumplimiento de presupuestos
- Satisfacción del cliente interno
- Tendencia de rendimiento

FORMATO DE RESPUESTA (JSON estricto):
{
  "prediction": {
    "overallScore": number (1-100),
    "reliability": number (1-100),
    "quality": number (1-100),
    "communication": number (1-100),
    "valueForMoney": number (1-100),
    "trend": "improving" | "stable" | "declining",
    "riskLevel": "low" | "medium" | "high",
    "recommendedForProjects": [string],
    "areasOfImprovement": [string],
    "strengths": [string],
    "predictedDeliverySuccess": number (0-100),
    "recommendedAction": string
  }
}`;
        userPrompt = `Predice el rendimiento futuro del contractor ${contractorId} basándote en su historial.`;
        break;

      case 'generate_invoice':
        systemPrompt = `Eres un generador de facturas para contractors que cumple con normativa fiscal española.

REQUISITOS:
- Formato factura válido fiscalmente
- Cálculo correcto de IVA/IRPF
- Desglose de conceptos por proyecto/horas
- Referencias a partes de trabajo aprobadas
- Datos fiscales completos

FORMATO DE RESPUESTA (JSON estricto):
{
  "invoice": {
    "invoiceNumber": string,
    "invoiceDate": string,
    "dueDate": string,
    "contractor": {
      "name": string,
      "taxId": string,
      "address": string
    },
    "client": {
      "name": string,
      "taxId": string,
      "address": string
    },
    "lineItems": [
      {
        "description": string,
        "quantity": number,
        "unitPrice": number,
        "amount": number,
        "projectRef": string
      }
    ],
    "subtotal": number,
    "taxRate": number,
    "taxAmount": number,
    "irpfRate": number,
    "irpfAmount": number,
    "total": number,
    "paymentTerms": string,
    "bankDetails": string,
    "notes": string
  },
  "validation": {
    "isValid": boolean,
    "warnings": [string],
    "missingFields": [string]
  }
}`;
        userPrompt = `Genera una factura para el contractor ${contractorId}, proyecto ${projectId}, 
con las entradas de tiempo: ${JSON.stringify(timeEntryIds)}.
Aplica normativa fiscal española.`;
        break;

      case 'optimize_costs':
        systemPrompt = `Eres un optimizador de costes de fuerza laboral contingent.

ESTRATEGIAS:
- Análisis de tarifas vs mercado
- Identificación de contractors infrautilizados
- Consolidación de proveedores
- Conversión FTE vs Contingent
- Negociación de tarifas por volumen
- Optimización de mix de skills

FORMATO DE RESPUESTA (JSON estricto):
{
  "currentSpend": number,
  "optimizedSpend": number,
  "potentialSavings": number,
  "savingsPercentage": number,
  "recommendations": [
    {
      "type": string,
      "description": string,
      "impact": number,
      "effort": "low" | "medium" | "high",
      "timeline": string,
      "affectedContractors": [string]
    }
  ],
  "rateAnalysis": {
    "aboveMarket": [{ "contractorId": string, "overpayment": number }],
    "belowMarket": [{ "contractorId": string, "retentionRisk": string }]
  },
  "utilizationAnalysis": {
    "underutilized": [string],
    "overutilized": [string]
  }
}`;
        userPrompt = `Optimiza los costes de fuerza laboral contingent para: ${JSON.stringify(context)}`;
        break;

      case 'match_skills':
        systemPrompt = `Eres un sistema de matching de skills para encontrar el contractor óptimo.

CRITERIOS DE MATCHING:
- Skills técnicos requeridos
- Disponibilidad y capacidad
- Histórico de rendimiento en proyectos similares
- Tarifa vs presupuesto
- Ubicación/timezone (si relevante)
- Compliance status

FORMATO DE RESPUESTA (JSON estricto):
{
  "matches": [
    {
      "contractorId": string,
      "contractorName": string,
      "matchScore": number (0-100),
      "skillMatch": number (0-100),
      "availabilityMatch": number (0-100),
      "budgetFit": number (0-100),
      "performanceHistory": number (0-100),
      "matchedSkills": [string],
      "missingSkills": [string],
      "hourlyRate": number,
      "availability": string,
      "recommendation": string
    }
  ],
  "bestMatch": string,
  "alternativeOptions": [string],
  "noMatchReason": string | null
}`;
        userPrompt = `Encuentra los mejores contractors para estos requisitos de skills:
${JSON.stringify(skillRequirements)}
Contexto: ${JSON.stringify(context)}`;
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
      console.error('[gig-workforce-ai] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[gig-workforce-ai] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[gig-workforce-ai] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
