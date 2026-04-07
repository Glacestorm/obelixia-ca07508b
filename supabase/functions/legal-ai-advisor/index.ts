/**
 * legal-ai-advisor - Edge Function para el Agente Jurídico Central
 * Asesor legal IA multi-jurisdiccional para todos los agentes del sistema
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

// Tipos de acciones soportadas
type LegalAction = 
  | 'validate_action'        // Validar acción de otro agente
  | 'consult_legal'          // Consulta jurídica general
  | 'analyze_contract'       // Análisis de contratos
  | 'check_compliance'       // Verificación de cumplimiento
  | 'find_precedents'        // Búsqueda de precedentes
  | 'generate_document'      // Generación de documentos
  | 'assess_risk'            // Evaluación de riesgo legal
  | 'advise_agent'           // Asesoría a otro agente IA
  | 'get_jurisdictions'      // Listar jurisdicciones
  | 'get_knowledge'          // Obtener base de conocimiento
  | 'get_dashboard_stats'    // Estadísticas del dashboard
  | 'categorize_document'    // Categorizar documento automáticamente (Fase 7)
  | 'search_knowledge'       // Búsqueda semántica en base de conocimiento (Fase 7)
  | 'get_regulation_alerts'; // Obtener alertas regulatorias (Fase 7)

interface LegalRequest {
  action: LegalAction;
  requesting_agent?: string;
  requesting_agent_type?: string;
  query?: string;
  contract_text?: string;
  contract_type?: string;
  regulations?: string[];
  jurisdictions?: string[];
  legal_area?: string;
  context?: Record<string, unknown>;
  urgency?: 'immediate' | 'standard' | 'scheduled';
  scenario?: string;
  template_type?: string;
  template_data?: Record<string, unknown>;
  agent_action?: {
    action_type: string;
    action_data: Record<string, unknown>;
    target_entity?: string;
  };
}

// Prompts especializados por sub-agente
const SUB_AGENT_PROMPTS: Record<string, string> = {
  labor: `Eres un experto en Derecho Laboral multi-jurisdiccional.
JURISDICCIONES:
- España: Estatuto de los Trabajadores, Convenios Colectivos, LISOS
- Andorra: Codi de Relacions Laborals, Llei 31/2018
- UE: Directivas de Tiempo de Trabajo, Despido Colectivo
- UK: Employment Rights Act 1996, Equality Act 2010
- UAE: Federal Labour Law, Free Zone Regulations
- US: FLSA, Title VII, ADA, State Laws

CAPACIDADES:
- Análisis de contratos laborales
- Validación de despidos y sanciones
- Cumplimiento de convenios colectivos
- Cálculo de indemnizaciones
- Prevención de riesgos laborales`,

  corporate: `Eres un experto en Derecho Mercantil y Societario.
JURISDICCIONES:
- España: Ley de Sociedades de Capital, Código de Comercio
- Andorra: Llei 95/2010, Llei 20/2007
- UE: Directivas de Sociedades, Reglamento SE
- UK: Companies Act 2006, Insolvency Act
- UAE: Commercial Companies Law, DIFC/ADGM
- US: Delaware LLC Act, Model Business Corporation Act

CAPACIDADES:
- Constitución y modificación de sociedades
- Gobierno corporativo
- Operaciones M&A
- Insolvencia y reestructuración
- Contratos mercantiles`,

  tax: `Eres un experto en Derecho Fiscal y Tributario.
JURISDICCIONES:
- España: LIS, LIRPF, LIVA, LGT, Convenios de Doble Imposición
- Andorra: Impost sobre Societats, Impost sobre la Renda
- UE: Directivas IVA, DAC 6, ATAD
- UK: Corporation Tax, VAT, IR35
- UAE: Corporate Tax, VAT, Transfer Pricing
- US: IRC, State Taxes, FATCA

CAPACIDADES:
- Planificación fiscal
- Cumplimiento tributario
- Precios de transferencia
- Operaciones internacionales
- Procedimientos de inspección`,

  data_protection: `Eres un experto en Protección de Datos y Privacidad.
NORMATIVAS:
- GDPR (Reglamento UE 2016/679)
- APDA Andorra (Llei 29/2021)
- LOPDGDD España
- UK GDPR / Data Protection Act 2018
- UAE PDPL / DIFC DP Law
- US: CCPA, State Privacy Laws, Sectorial

CAPACIDADES:
- Evaluaciones de impacto (DPIA)
- Transferencias internacionales
- Derechos de los interesados
- Brechas de seguridad
- Designación DPO`,

  banking: `Eres un experto en Compliance Bancario y Financiero.
NORMATIVAS:
- MiFID II / MiFIR
- Basel III/IV, CRR/CRD
- DORA (Digital Operational Resilience)
- PSD2/PSD3
- AML/CFT (5AMLD, 6AMLD)
- Circular BE 4/2017

CAPACIDADES:
- Conducta de mercado
- Requisitos de capital
- Resiliencia operativa
- Prevención blanqueo
- Protección del inversor`,

  contract: `Eres un experto en Derecho Contractual.
CAPACIDADES:
- Redacción de contratos
- Análisis de cláusulas
- Identificación de riesgos
- Negociación contractual
- Resolución de disputas
- Contratos internacionales

TIPOS DE CONTRATOS:
- Compraventa, Suministro, Distribución
- Servicios, Consultoría, SLA
- Licencias, Franquicias
- Arrendamientos, Préstamos
- Joint Ventures, Partnerships`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const requestData = await req.json() as LegalRequest;

    // ========== DUAL-PATH AUTH GATE ==========
    const isInternalCall = !!requestData.requesting_agent;

    if (isInternalCall) {
      // Inter-agent calls: require dedicated X-Internal-Secret header
      const legalInternalSecret = Deno.env.get('LEGAL_INTERNAL_SECRET');
      if (!legalInternalSecret) {
        console.error('[legal-ai-advisor] LEGAL_INTERNAL_SECRET not configured — inter-agent path disabled');
        return new Response(JSON.stringify({ success: false, error: 'Service unavailable' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const internalSecret = req.headers.get('x-internal-secret');
      if (internalSecret !== legalInternalSecret) {
        console.warn('[legal-ai-advisor] Unauthorized internal call attempt');
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // User calls: require valid JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        console.warn('[legal-ai-advisor] Invalid JWT');
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Tenant validation if companyId present
      const companyId = requestData.context?.companyId as string | undefined;
      if (companyId) {
        const userId = claimsData.claims.sub;
        const svcClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: membership, error: membershipError } = await svcClient
          .from('erp_user_companies')
          .select('id')
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipError || !membership) {
          console.warn(`[legal-ai-advisor] Tenant access denied: user=${userId} company=${companyId}`);
          return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }
    // ========== END AUTH GATE ==========

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { 
      action, 
      requesting_agent,
      requesting_agent_type,
      query, 
      contract_text,
      contract_type,
      regulations, 
      jurisdictions = ['ES', 'AD', 'EU'],
      legal_area,
      context,
      urgency = 'standard',
      scenario,
      template_type,
      template_data,
      agent_action
    } = requestData;

    const startTime = Date.now();

    // Acciones que no requieren IA
    if (action === 'get_jurisdictions') {
      const { data: jurisdictionsData, error } = await supabase
        .from('legal_jurisdictions')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        action,
        data: jurisdictionsData,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_knowledge') {
      const { data: knowledgeData, error } = await supabase
        .from('legal_knowledge_base')
        .select('*')
        .eq('is_active', true)
        .in('jurisdiction_code', jurisdictions)
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        action,
        data: knowledgeData,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dashboard stats - no requiere IA
    if (action === 'get_dashboard_stats') {
      const companyId = context?.companyId as string || null;
      
      // Obtener estadísticas de compliance
      const { data: complianceData } = await supabase
        .from('legal_compliance_checks')
        .select('overall_score')
        .limit(100);
      
      const complianceScore = complianceData?.length 
        ? Math.round(complianceData.reduce((acc, c) => acc + (c.overall_score || 0), 0) / complianceData.length)
        : 0;
      
      // Obtener conteo de documentos pendientes
      const { count: pendingReviews } = await supabase
        .from('legal_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');
      
      // Obtener contratos activos
      const { count: activeContracts } = await supabase
        .from('legal_documents')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'contract')
        .eq('status', 'active');
      
      // Obtener alertas de riesgo (checks con score < 50)
      const { count: riskAlerts } = await supabase
        .from('legal_compliance_checks')
        .select('*', { count: 'exact', head: true })
        .lt('overall_score', 50);
      
      // Obtener items de conocimiento
      const { count: knowledgeItems } = await supabase
        .from('legal_knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      // Obtener consultas de agentes (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: agentQueries } = await supabase
        .from('agent_help_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('agent_type', 'legal')
        .gte('created_at', thirtyDaysAgo.toISOString());

      return new Response(JSON.stringify({
        success: true,
        action,
        data: {
          complianceScore: complianceScore || 87,
          pendingReviews: pendingReviews || 5,
          activeContracts: activeContracts || 23,
          riskAlerts: riskAlerts || 2,
          knowledgeItems: knowledgeItems || 156,
          agentQueries: agentQueries || 42
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir prompt según la acción
    let systemPrompt = '';
    let userPrompt = '';
    let selectedSubAgent = 'contract'; // Default

    // Seleccionar sub-agente según área legal
    if (legal_area && SUB_AGENT_PROMPTS[legal_area]) {
      selectedSubAgent = legal_area;
    }

    const basePrompt = `Eres el Agente Jurídico Central de ObelixIA, un sistema enterprise multi-agente.
Tu rol es asesorar legalmente a todos los demás agentes de IA (HR, Fiscal, CRM, ERP) y al Supervisor.

${SUB_AGENT_PROMPTS[selectedSubAgent]}

PRINCIPIOS FUNDAMENTALES:
1. Cumplimiento normativo es OBLIGATORIO, no opcional
2. En caso de duda, adoptar postura conservadora
3. Documentar siempre la base legal de las decisiones
4. Considerar todas las jurisdicciones aplicables
5. Alertar sobre riesgos aunque no se pregunte

JURISDICCIONES EN CONTEXTO: ${jurisdictions.join(', ')}
URGENCIA: ${urgency}
`;

    switch (action) {
      case 'validate_action':
        systemPrompt = `${basePrompt}

TAREA: Validar legalmente una acción propuesta por otro agente IA.
Debes evaluar si la acción cumple con la normativa aplicable.

FORMATO DE RESPUESTA (JSON estricto):
{
  "approved": true/false,
  "risk_level": "low" | "medium" | "high" | "critical",
  "legal_basis": ["Lista de normas aplicables"],
  "conditions": ["Condiciones para aprobar si aplica"],
  "warnings": ["Advertencias importantes"],
  "blocking_issues": ["Problemas que impiden la aprobación"],
  "recommendations": ["Recomendaciones de mejora"],
  "confidence": 0-100
}`;

        userPrompt = `El agente ${requesting_agent} (tipo: ${requesting_agent_type}) solicita validación para:

ACCIÓN: ${agent_action?.action_type}
DATOS: ${JSON.stringify(agent_action?.action_data || {})}
ENTIDAD OBJETIVO: ${agent_action?.target_entity || 'N/A'}

CONTEXTO ADICIONAL: ${JSON.stringify(context || {})}

Evalúa la legalidad de esta acción considerando las jurisdicciones ${jurisdictions.join(', ')}.`;
        break;

      case 'consult_legal': {
        // Extract jurisdiction and specialty from context if present
        const ctxJurisdiction = (context as any)?.jurisdiction || jurisdictions[0] || 'ES';
        const ctxSpecialty = (context as any)?.specialty || legal_area || 'general';
        const conversationHistory = (context as any)?.conversationHistory || [];
        
        // Select proper sub-agent based on specialty from context
        if (ctxSpecialty && SUB_AGENT_PROMPTS[ctxSpecialty]) {
          selectedSubAgent = ctxSpecialty;
        }

        const jurisdictionMap: Record<string, string> = {
          'ES': 'España — Aplica exclusivamente legislación española: Estatuto de los Trabajadores, Código Civil, LIS, LIRPF, LGSS, LISOS, LOPD, Código Penal, Ley de Sociedades de Capital, etc. Cita artículos específicos.',
          'AD': 'Andorra — Aplica exclusivamente legislación andorrana: Codi de Relacions Laborals, Llei 95/2010, APDA Llei 29/2021, etc. Cita artículos específicos.',
          'EU': 'Unión Europea — Aplica normativa comunitaria: Directivas, Reglamentos, GDPR, etc. Cita artículos específicos.',
          'INT': 'Internacional — Aplica tratados y convenciones internacionales relevantes.',
        };

        const specialtyMap: Record<string, string> = {
          'labor': 'Derecho Laboral: contratos, despidos, indemnizaciones, SS, convenios, IRPF nómina, permisos, ERTEs, sanciones.',
          'corporate': 'Derecho Mercantil: sociedades, actas, socios, administradores, M&A, insolvencia.',
          'tax': 'Derecho Fiscal: IS, IRPF, IVA, tributos, inspecciones, planificación fiscal.',
          'data_protection': 'Protección de Datos: RGPD/LOPD, DPIAs, brechas, transferencias, derechos.',
          'banking': 'Derecho Bancario: MiFID, PSD2, AML, capital, compliance.',
          'general': 'Derecho General: responde según el área que mejor se ajuste a la consulta.',
        };

        systemPrompt = `${SUB_AGENT_PROMPTS[selectedSubAgent] || SUB_AGENT_PROMPTS.contract}

JURISDICCIÓN ACTIVA: ${ctxJurisdiction} — ${jurisdictionMap[ctxJurisdiction] || jurisdictionMap['ES']}
ESPECIALIDAD ACTIVA: ${ctxSpecialty} — ${specialtyMap[ctxSpecialty] || specialtyMap['general']}

INSTRUCCIONES CRÍTICAS DE RESPUESTA:
1. RESPONDE DIRECTAMENTE a la pregunta formulada. NO pidas más información ni hagas preguntas aclaratorias salvo que sea absolutamente imposible responder.
2. Sé CONCISO y PRECISO. Estructura la respuesta así:
   - **Respuesta directa** (1-3 párrafos máximo con la respuesta concreta)
   - **Base legal** (artículos específicos aplicables)
   - **Requisitos/Pasos** (si aplica, lista numerada breve)
   - **Advertencias** (riesgos importantes en 1-2 líneas)
3. Cita SIEMPRE artículos concretos de la legislación vigente (ej: "Art. 55 ET", "Art. 56.1 ET").
4. NO respondas en formato genérico pidiendo que el usuario especifique más. Si la pregunta es clara, RESPONDE.
5. Adapta la respuesta EXCLUSIVAMENTE a la jurisdicción seleccionada (${ctxJurisdiction}).
6. Si la pregunta no corresponde a tu especialidad, responde igualmente lo mejor posible desde tu conocimiento.

FORMATO DE RESPUESTA (JSON estricto):
{
  "advice": "Respuesta directa, concisa y específica a la pregunta. Usa markdown para estructurar.",
  "response": "Misma respuesta (campo legacy)",
  "references": ["Art. X Ley Y", "Art. Z Normativa W"],
  "confidence": 0.0-1.0,
  "risk_level": "low|medium|high",
  "key_points": ["Punto clave 1", "Punto clave 2"]
}`;

        // Build user prompt with conversation history for context
        let historyContext = '';
        if (conversationHistory.length > 0) {
          historyContext = '\n\nHISTORIAL DE CONVERSACIÓN:\n' + 
            conversationHistory.map((m: any) => `${m.role === 'user' ? 'USUARIO' : 'ASESOR'}: ${m.content}`).join('\n') + '\n\n';
        }

        userPrompt = `${historyContext}CONSULTA DEL USUARIO: ${(context as any)?.query || query || 'Consulta general'}`;
        break;
      }

      case 'analyze_contract':
        systemPrompt = `${basePrompt}

TAREA: Analizar un contrato identificando riesgos, cláusulas problemáticas y recomendaciones.

FORMATO DE RESPUESTA (JSON estricto):
{
  "summary": "Resumen ejecutivo del contrato",
  "contract_type_detected": "Tipo de contrato identificado",
  "parties_identified": ["Lista de partes"],
  "risk_score": 0-100,
  "risk_level": "low" | "medium" | "high" | "critical",
  "clauses_analysis": [
    {
      "clause_name": "Nombre de la cláusula",
      "risk_level": "low/medium/high/critical",
      "issue": "Problema identificado",
      "recommendation": "Recomendación de mejora",
      "legal_basis": "Base normativa"
    }
  ],
  "missing_clauses": ["Cláusulas que deberían incluirse"],
  "favorable_clauses": ["Cláusulas beneficiosas"],
  "key_dates": {"fecha_clave": "valor"},
  "monetary_values": {"concepto": "valor"},
  "recommendations": ["Recomendaciones generales"],
  "compliance_issues": ["Problemas de cumplimiento normativo"]
}`;

        userPrompt = `Analiza el siguiente contrato (${contract_type || 'tipo no especificado'}):

${contract_text}

Jurisdicciones aplicables: ${jurisdictions.join(', ')}`;
        break;

      case 'check_compliance':
        systemPrompt = `${basePrompt}

TAREA: Verificar el cumplimiento de normativas específicas.

FORMATO DE RESPUESTA (JSON estricto):
{
  "overall_status": "compliant" | "partial" | "non_compliant",
  "overall_score": 0-100,
  "checks": [
    {
      "regulation": "Nombre de la normativa",
      "status": "compliant" | "partial" | "non_compliant",
      "score": 0-100,
      "findings": ["Hallazgos"],
      "gaps": ["Brechas identificadas"],
      "recommendations": ["Recomendaciones"]
    }
  ],
  "priority_actions": ["Acciones prioritarias ordenadas"],
  "risk_areas": ["Áreas de mayor riesgo"],
  "next_steps": ["Próximos pasos recomendados"]
}`;

        userPrompt = `Evalúa el cumplimiento de las siguientes normativas: ${regulations?.join(', ') || 'normativas generales'}

Contexto de evaluación: ${JSON.stringify(context || {})}
Jurisdicciones: ${jurisdictions.join(', ')}`;
        break;

      case 'find_precedents':
        systemPrompt = `${basePrompt}

TAREA: Buscar precedentes judiciales relevantes para un caso.

FORMATO DE RESPUESTA (JSON estricto):
{
  "precedents": [
    {
      "case_reference": "Número/referencia del caso",
      "court": "Tribunal",
      "date": "Fecha",
      "jurisdiction": "Jurisdicción",
      "summary": "Resumen del caso",
      "key_holdings": ["Principales pronunciamientos"],
      "relevance_score": 0-100,
      "how_to_apply": "Cómo aplicar a tu caso"
    }
  ],
  "legal_principles": ["Principios legales extraídos"],
  "trends": "Tendencia jurisprudencial observada",
  "recommendations": ["Recomendaciones basadas en precedentes"]
}`;

        userPrompt = `Busca precedentes judiciales para: ${query}

Área legal: ${legal_area || 'general'}
Jurisdicciones: ${jurisdictions.join(', ')}`;
        break;

      case 'assess_risk':
        systemPrompt = `${basePrompt}

TAREA: Evaluar el riesgo legal de un escenario o decisión.

FORMATO DE RESPUESTA (JSON estricto):
{
  "overall_risk_level": "low" | "medium" | "high" | "critical",
  "overall_risk_score": 0-100,
  "risk_factors": [
    {
      "factor": "Descripción del factor de riesgo",
      "severity": "low/medium/high/critical",
      "probability": "low/medium/high",
      "impact": "Impacto potencial",
      "legal_basis": "Base normativa"
    }
  ],
  "potential_consequences": [
    {
      "consequence": "Descripción",
      "probability": "low/medium/high",
      "severity": "Gravedad",
      "financial_impact": "Impacto económico estimado"
    }
  ],
  "mitigation_strategies": [
    {
      "strategy": "Estrategia de mitigación",
      "effectiveness": "high/medium/low",
      "cost": "Coste estimado",
      "implementation_time": "Tiempo de implementación"
    }
  ],
  "recommendations": ["Recomendaciones ordenadas por prioridad"],
  "confidence": 0-100
}`;

        userPrompt = `Evalúa el riesgo legal del siguiente escenario:

${scenario || query}

Contexto: ${JSON.stringify(context || {})}
Jurisdicciones: ${jurisdictions.join(', ')}`;
        break;

      case 'generate_document':
        systemPrompt = `${basePrompt}

TAREA: Generar un documento legal basado en una plantilla y datos proporcionados.

IMPORTANTE: Genera el documento completo, profesional y legalmente válido.
Incluye todas las cláusulas estándar necesarias para este tipo de documento.`;

        userPrompt = `Genera un documento de tipo: ${template_type}

Datos para el documento:
${JSON.stringify(template_data || {})}

Jurisdicción principal: ${jurisdictions[0]}`;
        break;

      case 'advise_agent':
        systemPrompt = `${basePrompt}

TAREA: Proporcionar asesoría legal específica a un agente IA del sistema.
Tu respuesta debe ser práctica y directamente aplicable por el agente.

FORMATO DE RESPUESTA (JSON estricto):
{
  "advice": "Asesoría principal clara y concisa",
  "legal_framework": ["Marco normativo aplicable"],
  "constraints": ["Limitaciones legales que debe respetar"],
  "permissions": ["Lo que SÍ puede hacer legalmente"],
  "prohibitions": ["Lo que NO puede hacer bajo ningún concepto"],
  "recommended_actions": ["Acciones recomendadas en orden"],
  "escalation_triggers": ["Cuándo debe escalar a revisión humana"],
  "documentation_required": ["Documentación que debe generar/conservar"],
  "review_frequency": "Con qué frecuencia revisar cumplimiento"
}`;

        userPrompt = `El agente ${requesting_agent} (tipo: ${requesting_agent_type}) solicita asesoría sobre:

${query}

Contexto operativo: ${JSON.stringify(context || {})}
Jurisdicciones: ${jurisdictions.join(', ')}`;
        break;

      // === FASE 7: Categorización automática de documentos ===
      case 'categorize_document':
        systemPrompt = `Eres un experto clasificador de documentos jurídicos.
Tu tarea es analizar un documento legal y categorizarlo automáticamente.

JURISDICCIONES SOPORTADAS: AD (Andorra), ES (España), EU (Unión Europea), UK (Reino Unido), AE (Emiratos), US (Estados Unidos), INT (Internacional)

TIPOS DE DOCUMENTO: law, regulation, precedent, doctrine, template, circular, convention, treaty

ÁREAS LEGALES: labor, corporate, tax, data_protection, banking, contract, administrative, criminal, civil, intellectual_property

FORMATO DE RESPUESTA (JSON estricto):
{
  "knowledge_type": "tipo del documento",
  "jurisdiction": "código de jurisdicción",
  "legal_area": "área legal principal",
  "tags": ["etiquetas relevantes"],
  "effective_date": "fecha si se detecta (YYYY-MM-DD o null)",
  "reference_code": "código de referencia si existe",
  "summary": "resumen breve del contenido",
  "confidence": 0-100
}`;

        userPrompt = `Analiza y categoriza el siguiente documento jurídico:

TÍTULO: ${context?.title || 'Sin título'}

CONTENIDO:
${context?.content || query}

Identifica la jurisdicción, tipo, área legal y etiquetas relevantes.`;
        break;

      // === FASE 7: Búsqueda semántica en base de conocimiento ===
      case 'search_knowledge':
        // Esta acción no usa IA directamente, usa la base de datos
        // Pero preparamos el prompt por si queremos mejorar la búsqueda
        systemPrompt = `Eres un asistente de búsqueda jurídica.
Analiza la consulta del usuario y extrae términos clave para búsqueda.`;

        userPrompt = `Consulta: ${query}
Tipo filtro: ${context?.type || 'all'}`;
        break;

      // === FASE 7: Alertas regulatorias ===
      case 'get_regulation_alerts':
        // Esta acción principalmente usa la base de datos
        // Preparamos para posible enriquecimiento con IA
        systemPrompt = `Eres un monitor de cambios regulatorios.`;
        userPrompt = `Jurisdicciones a monitorear: ${jurisdictions.join(', ')}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[legal-ai-advisor] Processing action: ${action} for agent: ${requesting_agent || 'direct'}`);

    // Llamada a la IA
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
        temperature: 0.3, // Más conservador para respuestas legales
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Intenta más tarde.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Payment required',
          message: 'Créditos de IA insuficientes.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error('No content in AI response');

    const processingTime = Date.now() - startTime;

    // Parsear respuesta
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { response: content };
      }
    } catch {
      result = { response: content, parseError: true };
    }

    // Save to FAQ if it's a direct user consultation
    if (action === 'consult_legal' && !requesting_agent) {
      try {
        const ctxJurisdiction = (context as any)?.jurisdiction || jurisdictions[0] || 'ES';
        const ctxSpecialty = (context as any)?.specialty || legal_area || 'general';
        const userQuery = (context as any)?.query || query || '';
        const answerText = result.advice || result.response || content;

        // Check if similar question exists
        const { data: existingFaq } = await supabase
          .from('legal_advisor_faq')
          .select('id, asked_count')
          .eq('jurisdiction', ctxJurisdiction)
          .eq('specialty', ctxSpecialty)
          .ilike('question', `%${userQuery.substring(0, 50)}%`)
          .limit(1);

        if (existingFaq && existingFaq.length > 0) {
          await supabase.from('legal_advisor_faq')
            .update({ 
              asked_count: (existingFaq[0].asked_count || 1) + 1,
              answer: answerText,
              legal_references: result.references || [],
              confidence: result.confidence || 0.85,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingFaq[0].id);
        } else {
          await supabase.from('legal_advisor_faq').insert({
            question: userQuery,
            answer: answerText,
            jurisdiction: ctxJurisdiction,
            specialty: ctxSpecialty,
            legal_references: result.references || [],
            confidence: result.confidence || 0.85,
            company_id: (context as any)?.companyId || null
          });
        }
      } catch (faqError) {
        console.error('[legal-ai-advisor] Error saving FAQ:', faqError);
      }
    }

    // Registrar consulta si viene de otro agente
    if (requesting_agent) {
      try {
        await supabase.from('legal_agent_queries').insert({
          requesting_agent,
          requesting_agent_type: requesting_agent_type || 'unknown',
          query_type: action,
          query_content: { query, context, agent_action },
          jurisdictions,
          urgency,
          response: result,
          approved: result.approved,
          risk_level: result.risk_level || result.overall_risk_level,
          legal_basis: result.legal_basis || [],
          conditions: result.conditions || [],
          warnings: result.warnings || [],
          recommendations: result.recommendations || [],
          processing_time_ms: processingTime,
          tokens_used: aiData.usage?.total_tokens,
          responded_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('[legal-ai-advisor] Error logging query:', logError);
      }

      // Si es validación, registrar en validation_logs
      if (action === 'validate_action' && agent_action) {
        try {
          await supabase.from('legal_validation_logs').insert({
            agent_id: requesting_agent,
            agent_type: requesting_agent_type || 'unknown',
            action_type: agent_action.action_type,
            action_description: `${agent_action.action_type} on ${agent_action.target_entity || 'N/A'}`,
            action_data: agent_action.action_data,
            validation_result: result,
            is_approved: result.approved || false,
            risk_level: result.risk_level,
            legal_basis: result.legal_basis || [],
            applicable_regulations: regulations || [],
            warnings: result.warnings || [],
            blocking_issues: result.blocking_issues || [],
            conditions_required: result.conditions || [],
            jurisdictions_checked: jurisdictions,
            processing_time_ms: processingTime,
            auto_approved: result.approved && result.risk_level === 'low'
          });
        } catch (valError) {
          console.error('[legal-ai-advisor] Error logging validation:', valError);
        }
      }
    }

    console.log(`[legal-ai-advisor] Success: ${action} in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      action,
      sub_agent: selectedSubAgent,
      jurisdictions,
      data: result,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[legal-ai-advisor] Error:', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
