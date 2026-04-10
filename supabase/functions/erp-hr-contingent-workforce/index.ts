/**
 * Edge Function: erp-hr-contingent-workforce
 * Fase 8: Análisis IA para gestión de fuerza laboral contingente
 * 
 * Auth: validateTenantAccess() — S6.5A hardening
 * Data ops: AI-only (zero DB reads/writes)
 * company_id: Required in request body
 * 
 * Funcionalidades:
 * - Análisis de riesgo de falso autónomo
 * - Evaluación de indicadores de laboralidad
 * - Recomendaciones de cumplimiento normativo
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface ComplianceRequest {
  action: 'analyze_compliance' | 'evaluate_contract' | 'generate_recommendations';
  company_id: string;
  worker?: any;
  contracts?: any[];
  assignments?: any[];
  time_entries?: any[];
  check_type?: 'initial' | 'periodic' | 'incident' | 'termination';
  contract_data?: any;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === PARSE BODY FIRST (need company_id for auth) ===
    const body = await req.json() as ComplianceRequest;
    const { 
      action, 
      company_id,
      worker, 
      contracts, 
      assignments, 
      time_entries,
      check_type,
      contract_data
    } = body;

    // === VALIDATE company_id ===
    if (!company_id || typeof company_id !== 'string') {
      return validationError('company_id is required', corsHeaders);
    }

    // === AUTH GATE: validateTenantAccess ===
    // Verifies JWT + active membership in erp_user_companies
    // Returns adminClient/userClient but neither is used (AI-only function)
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    console.log(`[erp-hr-contingent-workforce] Authenticated user: ${authResult.userId}, company: ${authResult.companyId}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no está configurada');
    }

    let systemPrompt = '';
    let userPrompt = '';

    // ============ ANALYZE COMPLIANCE ============
    if (action === 'analyze_compliance' && worker) {
      systemPrompt = `Eres un experto en Derecho Laboral español especializado en la determinación de la naturaleza laboral vs. mercantil de las relaciones de trabajo.

Tu rol es analizar indicadores de laboralidad para detectar posibles situaciones de "falso autónomo" según la jurisprudencia española y la normativa vigente (Estatuto de los Trabajadores, Ley 12/2024 de Riders, etc.).

INDICADORES CLAVE DE LABORALIDAD:
1. DEPENDENCIA ECONÓMICA: ¿El trabajador depende económicamente de un solo cliente (>75% ingresos)?
2. INTEGRACIÓN ORGANIZATIVA: ¿Está integrado en la estructura de la empresa cliente?
3. AUTONOMÍA: ¿Tiene libertad para organizar su trabajo, horarios y métodos?
4. AJENIDAD EN MEDIOS: ¿Usa herramientas, software o equipos proporcionados por el cliente?
5. EXCLUSIVIDAD: ¿Tiene prohibición o limitación práctica de trabajar para otros?
6. DIRECCIÓN Y CONTROL: ¿Recibe instrucciones detalladas sobre cómo realizar el trabajo?
7. RETRIBUCIÓN: ¿Es fija/periódica o variable según resultados?
8. JORNADA: ¿Tiene horario determinado por el cliente?

NIVELES DE RIESGO:
- low: Relación mercantil clara, cumple criterios de autonomía
- medium: Algunos indicadores mixtos, monitorear
- high: Múltiples indicadores de laboralidad, riesgo significativo
- critical: Alta probabilidad de considerarse relación laboral encubierta

FORMATO DE RESPUESTA (JSON estricto):
{
  "risk_assessment": "low|medium|high|critical",
  "indicators": {
    "economic_dependence": {
      "score": 0-100,
      "factors": ["factor1", "factor2"],
      "risk": "descripción del riesgo"
    },
    "organizational_integration": {
      "score": 0-100,
      "factors": ["factor1", "factor2"],
      "risk": "descripción"
    },
    "autonomy_level": {
      "score": 0-100,
      "factors": ["factor1", "factor2"],
      "risk": "descripción"
    },
    "tools_and_materials": {
      "score": 0-100,
      "factors": ["factor1", "factor2"],
      "risk": "descripción"
    }
  },
  "legal_opinion": "Opinión legal resumida sobre la relación",
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "action_items": ["Acción urgente 1", "Acción 2"],
  "regulatory_references": ["Art. 1.1 ET", "STS 805/2020"],
  "similar_cases": ["Descripción de caso similar"]
}`;

      // Calcular métricas del trabajador
      const totalContracts = contracts?.length || 0;
      const activeAssignments = assignments?.filter((a: any) => a.status === 'active').length || 0;
      const totalHours = time_entries?.reduce((sum: number, e: any) => sum + (e.hours || 0), 0) || 0;
      
      // Detectar patrones de trabajo
      const uniqueDays = new Set(time_entries?.map((e: any) => e.entry_date)).size || 0;
      const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;
      
      // Detectar regularidad (posible indicador de horario fijo)
      const hasRegularPattern = avgHoursPerDay >= 7 && avgHoursPerDay <= 9;

      userPrompt = `Analiza el siguiente perfil de trabajador contingente para detectar indicadores de "falso autónomo":

DATOS DEL TRABAJADOR:
- Tipo: ${worker.worker_type}
- Es empresa: ${worker.is_company ? 'Sí' : 'No'}
- País: ${worker.country}
- Alta de autónomo: ${worker.autonomo_registration || 'No verificado'}
- Seguro RC: ${worker.has_liability_insurance ? 'Sí' : 'No'}
- Fecha onboarding: ${worker.onboarding_date || 'No registrada'}

MÉTRICAS DE TRABAJO:
- Contratos totales: ${totalContracts}
- Asignaciones activas: ${activeAssignments}
- Horas últimos 3 meses: ${totalHours}
- Días trabajados: ${uniqueDays}
- Media horas/día: ${avgHoursPerDay.toFixed(1)}
- Patrón regular detectado: ${hasRegularPattern ? 'SÍ (alerta)' : 'No'}

TIPO DE VERIFICACIÓN: ${check_type}

${contracts && contracts.length > 0 ? `
CONTRATOS:
${contracts.map((c: any) => `- ${c.contract_type}: ${c.title} (${c.start_date} - ${c.end_date || 'indefinido'})`).join('\n')}
` : 'Sin contratos formalizados (ALERTA)'}

Proporciona un análisis detallado del riesgo de que esta relación pueda ser considerada laboral.`;
    }

    // ============ EVALUATE CONTRACT ============
    else if (action === 'evaluate_contract' && contract_data) {
      systemPrompt = `Eres un experto en redacción de contratos mercantiles para trabajadores autónomos.

Tu rol es evaluar contratos de servicios para asegurar que:
1. Reflejan una verdadera relación mercantil
2. No contienen cláusulas que indiquen subordinación
3. Protegen a ambas partes
4. Cumplen con la normativa española

CLÁUSULAS PROBLEMÁTICAS A DETECTAR:
- Horarios fijos impuestos
- Exclusividad sin justificación
- Control excesivo de métodos de trabajo
- Obligación de presencialidad sin razón operativa
- Retribución fija mensual sin variabilidad
- Penalizaciones por trabajar para competencia

FORMATO DE RESPUESTA (JSON):
{
  "overall_score": 0-100,
  "risk_clauses": [
    {
      "clause": "texto problemático",
      "issue": "por qué es problemático",
      "suggestion": "cómo reformular"
    }
  ],
  "missing_elements": ["elemento1", "elemento2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "approved": true|false
}`;

      userPrompt = `Evalúa el siguiente contrato de servicios:

TIPO: ${contract_data.contract_type}
TÍTULO: ${contract_data.title}
ALCANCE: ${contract_data.scope_of_work}
DURACIÓN: ${contract_data.start_date} - ${contract_data.end_date || 'indefinido'}
INDEFINIDO: ${contract_data.is_indefinite ? 'Sí' : 'No'}

CONDICIONES:
- Tarifa: ${contract_data.rate} ${contract_data.currency}/${contract_data.rate_type}
- Términos pago: ${contract_data.payment_terms}
- Cláusula confidencialidad: ${contract_data.confidentiality_clause ? 'Sí' : 'No'}
- Cláusula no competencia: ${contract_data.non_compete_clause ? 'Sí' : 'No'}
- Cesión IP: ${contract_data.ip_assignment ? 'Sí' : 'No'}

Evalúa si este contrato refleja una verdadera relación mercantil o presenta riesgos de ser considerado laboral.`;
    }

    // ============ GENERATE RECOMMENDATIONS ============
    else if (action === 'generate_recommendations') {
      systemPrompt = `Eres un consultor experto en gestión de fuerza laboral contingente y cumplimiento normativo.

Genera recomendaciones prácticas para:
1. Reducir riesgo legal de falsos autónomos
2. Optimizar la gestión de trabajadores externos
3. Mejorar procesos de contratación y facturación
4. Asegurar cumplimiento con normativa española

FORMATO DE RESPUESTA (JSON):
{
  "immediate_actions": ["acción1", "acción2"],
  "short_term": ["recomendación1", "recomendación2"],
  "long_term": ["estrategia1", "estrategia2"],
  "compliance_checklist": [
    {"item": "descripción", "priority": "high|medium|low", "deadline": "fecha sugerida"}
  ],
  "cost_savings_opportunities": ["oportunidad1", "oportunidad2"]
}`;

      userPrompt = `Genera recomendaciones para la gestión de la siguiente fuerza laboral contingente:

- Total trabajadores: ${worker?.total || 0}
- Freelancers: ${worker?.freelancers || 0}
- Contratistas: ${worker?.contractors || 0}
- Consultores: ${worker?.consultants || 0}

ALERTAS ACTUALES:
- Alto riesgo: ${worker?.high_risk || 0}
- Sin contrato: ${worker?.no_contract || 0}
- Sin seguro: ${worker?.no_insurance || 0}

Proporciona un plan de acción priorizado.`;
    }

    else {
      throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[erp-hr-contingent-workforce] Processing: ${action}`);

    // Llamada a IA
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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[erp-hr-contingent-workforce] Parse error:', parseError);
      result = { 
        rawContent: content, 
        parseError: true,
        risk_assessment: 'medium',
        indicators: {},
        recommendations: ['Error al parsear respuesta. Revisar manualmente.']
      };
    }

    console.log(`[erp-hr-contingent-workforce] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-contingent-workforce] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});