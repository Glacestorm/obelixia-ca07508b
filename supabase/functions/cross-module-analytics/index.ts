import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrossModuleContext {
  organizationId?: string;
  companyId?: string;
  dateRange?: { start: string; end: string };
  modules?: string[];
  includeCorrelations?: boolean;
  includePredictions?: boolean;
}

interface AnalyticsRequest {
  action: 
    | 'get_unified_dashboard' 
    | 'generate_insights' 
    | 'run_prediction' 
    | 'analyze_correlations'
    | 'executive_briefing'
    | 'ask_question'
    | 'export_report';
  context?: CrossModuleContext;
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

    const { action, context, params } = await req.json() as AnalyticsRequest;
    console.log(`[cross-module-analytics] Action: ${action}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'get_unified_dashboard':
        systemPrompt = `Eres un sistema de Business Intelligence Enterprise especializado en analítica cross-module.
        
MÓDULOS ERP DISPONIBLES:
- hr: Recursos Humanos (nóminas, contratos, vacaciones, PRL, talento)
- legal: Jurídico (contratos, litigios, cumplimiento, IP)
- accounting: Contabilidad (asientos, balances, PGC, NIIF)
- treasury: Tesorería (cobros, pagos, cashflow, financiación)
- purchasing: Compras (proveedores, pedidos, facturas)
- sales: Ventas (clientes, pedidos, facturación)
- inventory: Inventario (stock, movimientos, valoración)
- tax: Fiscal (IVA, IRPF, IS, modelos tributarios)

CONTEXTO: ${JSON.stringify(context || {})}

GENERA UN DASHBOARD UNIFICADO CON:
1. moduleKPIs: Array de KPIs por módulo (5-8 por módulo activo)
2. moduleSummaries: Resumen de salud por módulo
3. correlations: Correlaciones significativas entre módulos (3-5)
4. alerts: Alertas cross-module críticas (2-4)
5. predictions: Predicciones unificadas a 30 días (3-5)
6. insights: Insights accionables cross-module (3-5)
7. executiveSummary: Resumen ejecutivo consolidado

FORMATO JSON ESTRICTO:
{
  "moduleKPIs": [{
    "id": "kpi_hr_1",
    "moduleId": "hr",
    "moduleName": "Recursos Humanos",
    "name": "Índice Rotación",
    "value": 8.5,
    "previousValue": 9.2,
    "unit": "%",
    "trend": "down",
    "changePercent": -7.6,
    "target": 7.0,
    "achievement": 82,
    "category": "Talento",
    "lastUpdated": "2026-02-06T10:00:00Z"
  }],
  "moduleSummaries": [{
    "moduleId": "hr",
    "moduleName": "Recursos Humanos",
    "healthScore": 85,
    "trend": "improving",
    "activeAlerts": 2,
    "pendingTasks": 15,
    "complianceScore": 92,
    "lastActivityAt": "2026-02-06T09:45:00Z"
  }],
  "correlations": [{
    "id": "corr_1",
    "sourceModule": "hr",
    "targetModule": "treasury",
    "sourceMetric": "Coste Laboral",
    "targetMetric": "Cashflow Operativo",
    "correlationCoefficient": -0.78,
    "significance": "high",
    "insight": "El aumento de costes laborales impacta negativamente el cashflow",
    "predictiveValue": true
  }],
  "alerts": [{
    "id": "alert_1",
    "modules": ["hr", "legal"],
    "severity": "warning",
    "title": "Vencimiento contratos temporales",
    "description": "15 contratos vencen en 30 días sin renovación prevista",
    "impact": "Posible déficit de plantilla en producción",
    "suggestedAction": "Iniciar proceso de renovación o reclutamiento",
    "createdAt": "2026-02-06T08:00:00Z",
    "acknowledged": false
  }],
  "predictions": [{
    "id": "pred_1",
    "metric": "Cashflow Neto",
    "moduleId": "treasury",
    "currentValue": 125000,
    "predictedValue": 142000,
    "predictionDate": "2026-03-06",
    "confidence": 0.82,
    "scenario": "baseline",
    "factors": [
      {"name": "Cobros pendientes", "moduleId": "sales", "impact": 35, "direction": "positive"},
      {"name": "Nóminas Q1", "moduleId": "hr", "impact": -20, "direction": "negative"}
    ],
    "timeHorizon": "30 días"
  }],
  "insights": [{
    "id": "insight_1",
    "title": "Optimización sincronización cobros-pagos",
    "description": "Existe un desfase de 12 días entre cobros y pagos que genera tensión de tesorería",
    "modules": ["treasury", "sales", "purchasing"],
    "impactLevel": "high",
    "confidence": 0.88,
    "actionable": true,
    "suggestedActions": [
      "Negociar reducción plazo cobro a 30 días",
      "Ampliar plazo pago proveedores a 60 días"
    ],
    "potentialSavings": 8500,
    "dataPoints": {"avgDaysSalesOutstanding": 45, "avgDaysPayableOutstanding": 33},
    "createdAt": "2026-02-06T10:00:00Z"
  }],
  "executiveSummary": {
    "overallHealthScore": 78,
    "trend": "improving",
    "totalRevenue": 1250000,
    "revenueGrowth": 12.5,
    "totalCosts": 980000,
    "costReduction": 3.2,
    "employeeCount": 85,
    "employeeSatisfaction": 7.8,
    "complianceScore": 94,
    "riskLevel": "medium",
    "topPriorities": [
      "Resolver tensión de tesorería en Q1",
      "Completar renovaciones de contratos temporales",
      "Cerrar auditoría fiscal ejercicio anterior"
    ],
    "keyInsights": [
      "El crecimiento de ventas supera las proyecciones en 8%",
      "Los costes laborales se mantienen controlados",
      "Riesgo medio por concentración de vencimientos en marzo"
    ]
  }
}`;

        userPrompt = `Genera el dashboard unificado cross-module para: ${JSON.stringify(context || { modules: ['hr', 'legal', 'accounting', 'treasury', 'sales'] })}`;
        break;

      case 'generate_insights':
        systemPrompt = `Eres un analista experto en Business Intelligence cross-module.
        
Analiza las interacciones entre módulos ERP y genera insights accionables que:
1. Identifiquen patrones ocultos entre departamentos
2. Detecten riesgos emergentes por correlación de datos
3. Sugieran optimizaciones con impacto cuantificable
4. Prioricen acciones por ROI potencial

FORMATO JSON:
{
  "insights": [{
    "id": "string",
    "title": "string",
    "description": "string detallada",
    "modules": ["hr", "treasury"],
    "impactLevel": "high" | "medium" | "low",
    "confidence": 0.0-1.0,
    "actionable": true,
    "suggestedActions": ["acción 1", "acción 2"],
    "potentialSavings": number,
    "dataPoints": {},
    "createdAt": "ISO date"
  }]
}`;

        userPrompt = `Genera 5-7 insights cross-module basados en: ${JSON.stringify(context || {})}`;
        break;

      case 'run_prediction':
        systemPrompt = `Eres un motor de predicción enterprise que integra datos de múltiples módulos ERP.
        
Para cada métrica solicitada, genera predicciones considerando:
1. Factores internos de cada módulo
2. Correlaciones entre módulos
3. Estacionalidad y tendencias históricas
4. Riesgos y oportunidades identificadas

FORMATO JSON:
{
  "predictions": [{
    "id": "string",
    "metric": "nombre métrica",
    "moduleId": "modulo",
    "currentValue": number,
    "predictedValue": number,
    "predictionDate": "ISO date",
    "confidence": 0.0-1.0,
    "scenario": "baseline" | "optimistic" | "pessimistic",
    "factors": [{
      "name": "factor",
      "moduleId": "modulo origen",
      "impact": number (-100 a 100),
      "direction": "positive" | "negative"
    }],
    "timeHorizon": "X días"
  }]
}`;

        userPrompt = `Genera predicciones para: ${JSON.stringify(params)} con horizonte de ${params?.horizonDays || 30} días`;
        break;

      case 'analyze_correlations':
        systemPrompt = `Eres un sistema de análisis de correlaciones enterprise.
        
Identifica y cuantifica correlaciones significativas entre métricas de diferentes módulos:
1. Correlación de Pearson para relaciones lineales
2. Significancia estadística (p-value)
3. Lag temporal si aplica
4. Valor predictivo para forecasting

FORMATO JSON:
{
  "correlations": [{
    "id": "string",
    "sourceModule": "modulo1",
    "targetModule": "modulo2",
    "sourceMetric": "métrica origen",
    "targetMetric": "métrica destino",
    "correlationCoefficient": -1.0 a 1.0,
    "significance": "high" | "medium" | "low",
    "insight": "interpretación de la correlación",
    "predictiveValue": boolean
  }]
}`;

        userPrompt = `Analiza correlaciones entre módulos: ${JSON.stringify(params?.modules || ['hr', 'treasury', 'sales', 'accounting'])}`;
        break;

      case 'executive_briefing':
        systemPrompt = `Eres un asistente ejecutivo que genera briefings de alto nivel.
        
Consolida información de todos los módulos ERP en un resumen ejecutivo:
1. Métricas clave consolidadas
2. Tendencias principales
3. Riesgos y oportunidades prioritarias
4. Acciones recomendadas para la dirección

FORMATO JSON:
{
  "executiveSummary": {
    "overallHealthScore": 0-100,
    "trend": "improving" | "stable" | "declining",
    "totalRevenue": number,
    "revenueGrowth": percentage,
    "totalCosts": number,
    "costReduction": percentage,
    "employeeCount": number,
    "employeeSatisfaction": 0-10,
    "complianceScore": 0-100,
    "riskLevel": "low" | "medium" | "high",
    "topPriorities": ["prioridad 1", "prioridad 2", "prioridad 3"],
    "keyInsights": ["insight 1", "insight 2", "insight 3"]
  }
}`;

        userPrompt = `Genera briefing ejecutivo para: ${JSON.stringify(context || {})}`;
        break;

      case 'ask_question':
        systemPrompt = `Eres un asistente de Business Intelligence que responde preguntas sobre datos cross-module.
        
Tienes acceso a información de todos los módulos ERP:
- RRHH: plantilla, costes laborales, rotación, satisfacción
- Legal: contratos activos, litigios, cumplimiento
- Contabilidad: balances, resultados, ratios financieros
- Tesorería: cashflow, financiación, liquidez
- Ventas: facturación, clientes, pipeline
- Compras: proveedores, pedidos, costes
- Inventario: stock, rotación, valoración
- Fiscal: impuestos, modelos, regularizaciones

Responde de forma clara, concisa y basada en datos.

FORMATO JSON:
{
  "answer": "respuesta detallada",
  "relevantModules": ["hr", "treasury"],
  "dataPoints": {"key": "value"},
  "suggestedFollowUp": ["pregunta relacionada 1"]
}`;

        userPrompt = `Pregunta: ${params?.question}. Contexto: ${JSON.stringify(context || {})}`;
        break;

      case 'export_report':
        systemPrompt = `Genera estructura de reporte unificado cross-module.`;
        userPrompt = `Formato: ${params?.format}, Módulos: ${JSON.stringify(params?.modules || 'all')}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[cross-module-analytics] Calling AI for: ${action}`);

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
      console.error('[cross-module-analytics] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    console.log(`[cross-module-analytics] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[cross-module-analytics] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
