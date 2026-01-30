/**
 * erp-fiscal-ai-agent - Agente IA Fiscal ultraespecializado
 * Coordina con agente supervisor, genera asientos, verifica cumplimiento,
 * consulta normativa y emite alertas
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRequest {
  action: 'chat' | 'check_compliance' | 'suggest_entry' | 'query_regulation' | 'monitor_updates';
  company_id?: string;
  session_id?: string;
  message?: string;
  context?: Record<string, unknown>;
  history?: Array<{ role: string; content: string }>;
  jurisdiction_id?: string;
  jurisdiction_ids?: string[];
  description?: string;
  amount?: number;
  question?: string;
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json() as AgentRequest;
    const { action, company_id, session_id, message, context, history, jurisdiction_id, jurisdiction_ids, description, amount, question } = body;

    console.log(`[erp-fiscal-ai-agent] Processing action: ${action}`);

    // Fetch relevant knowledge base content
    const fetchKnowledge = async (jurisdictionId?: string, limit = 10) => {
      let query = supabase
        .from('erp_fiscal_knowledge_base')
        .select('title, content, knowledge_type, tags')
        .eq('is_active', true)
        .limit(limit);

      if (jurisdictionId) {
        query = query.eq('jurisdiction_id', jurisdictionId);
      }

      const { data } = await query;
      return data || [];
    };

    // Fetch form templates
    const fetchForms = async (jurisdictionId?: string) => {
      let query = supabase
        .from('erp_fiscal_form_templates')
        .select('form_code, form_name, form_type, filing_frequency, due_day_rule, template_fields')
        .eq('is_active', true);

      if (jurisdictionId) {
        query = query.eq('jurisdiction_id', jurisdictionId);
      }

      const { data } = await query.limit(20);
      return data || [];
    };

    // Create compliance alert
    const createAlert = async (
      companyId: string,
      alertType: string,
      severity: string,
      title: string,
      description: string,
      recommendedAction?: string,
      jurisdictionId?: string
    ) => {
      await supabase.from('erp_fiscal_compliance_alerts').insert([{
        company_id: companyId,
        jurisdiction_id: jurisdictionId,
        alert_type: alertType,
        severity,
        title,
        description,
        recommended_action: recommendedAction,
        auto_generated: true
      }]);
    };

    // Log agent action
    const logAction = async (
      sessionId: string,
      companyId: string,
      actionType: string,
      actionDescription: string,
      inputData: unknown,
      outputData: unknown,
      confidenceScore?: number
    ) => {
      await supabase.from('erp_fiscal_agent_actions').insert([{
        session_id: sessionId,
        company_id: companyId,
        action_type: actionType,
        action_description: actionDescription,
        input_data: inputData,
        output_data: outputData,
        confidence_score: confidenceScore
      }]);
    };

    let systemPrompt = '';
    let userPrompt = '';
    let result: Record<string, unknown> = {};

    switch (action) {
      case 'chat': {
        const knowledgeBase = await fetchKnowledge(jurisdiction_id, 15);
        const forms = await fetchForms(jurisdiction_id);

        systemPrompt = `Eres un Agente IA Fiscal ultraespecializado con expertise en normativa fiscal internacional.

TU ROL:
- Asesor fiscal experto para empresas multinacionales
- Especialista en IVA/VAT, SII, Intrastat, LLCs estadounidenses, Free Zones de UAE, IGI andorrano
- Generador de asientos contables conformes a normativa
- Auditor de cumplimiento fiscal en tiempo real
- Monitor de cambios regulatorios

NORMATIVAS QUE DOMINAS:
${knowledgeBase.map(k => `- ${k.title}: ${k.content.substring(0, 200)}...`).join('\n')}

FORMULARIOS DISPONIBLES:
${forms.map(f => `- ${f.form_code} (${f.form_name}): ${f.form_type}, ${f.filing_frequency}`).join('\n')}

CAPACIDADES:
1. Generar asientos contables conformes a normativa específica de cada jurisdicción
2. Verificar cumplimiento fiscal y emitir alertas preventivas
3. Responder consultas sobre normativa fiscal con citas precisas
4. Sugerir optimizaciones fiscales legales
5. Alertar sobre próximos vencimientos y cambios regulatorios

REGLAS ESTRICTAS:
- SIEMPRE citar la normativa específica aplicable
- NUNCA sugerir prácticas de elusión fiscal agresiva
- Priorizar cumplimiento sobre optimización
- Alertar inmediatamente sobre riesgos de incumplimiento
- Usar terminología técnica fiscal precisa

CONTEXTO ACTUAL:
${context ? JSON.stringify(context) : 'Sin contexto adicional'}

FORMATO DE RESPUESTA:
Responde de forma clara y estructurada. Si detectas incidencias de cumplimiento, indícalas claramente.
Si sugieres asientos contables, usa formato:
- Cuenta: [código] [nombre]
- Debe/Haber: [importe]
- Concepto: [descripción]
- Base normativa: [referencia]`;

        userPrompt = message || 'Consulta general';
        break;
      }

      case 'check_compliance': {
        const jurisdictions = jurisdiction_ids || [];
        const knowledgeBase = await fetchKnowledge(undefined, 30);
        const forms = await fetchForms();

        systemPrompt = `Eres un auditor de cumplimiento fiscal automatizado.

TU TAREA:
Realizar una verificación exhaustiva de cumplimiento fiscal para las jurisdicciones: ${jurisdictions.length > 0 ? jurisdictions.join(', ') : 'TODAS'}

NORMATIVA APLICABLE:
${knowledgeBase.map(k => `${k.title}: ${k.content.substring(0, 150)}`).join('\n')}

FORMULARIOS Y PLAZOS:
${forms.map(f => `${f.form_code}: ${f.form_name} - ${f.filing_frequency} - Regla: ${JSON.stringify(f.due_day_rule)}`).join('\n')}

VERIFICACIONES A REALIZAR:
1. Plazos de presentación de declaraciones
2. Registros SII pendientes o rechazados
3. Operaciones intracomunitarias sin declarar
4. Inconsistencias en tipos impositivos aplicados
5. Obligaciones formales pendientes
6. Retenciones no practicadas
7. Requisitos de facturación incumplidos

FORMATO DE RESPUESTA (JSON estricto):
{
  "compliance_status": "ok" | "issues_found" | "critical",
  "issues": [
    {
      "jurisdiction": "string",
      "type": "deadline" | "registration" | "rate" | "documentation" | "retention",
      "severity": "info" | "warning" | "error" | "critical",
      "title": "string",
      "description": "string",
      "recommended_action": "string",
      "deadline": "ISO date if applicable"
    }
  ],
  "upcoming_deadlines": [
    {
      "form": "string",
      "jurisdiction": "string",
      "due_date": "ISO date",
      "days_remaining": number
    }
  ],
  "recommendations": ["string"]
}`;

        userPrompt = `Realiza verificación de cumplimiento fiscal para empresa ${company_id}. Fecha actual: ${new Date().toISOString().split('T')[0]}`;
        break;
      }

      case 'suggest_entry': {
        const knowledgeBase = await fetchKnowledge(jurisdiction_id, 10);

        systemPrompt = `Eres un experto contable especializado en asientos fiscales.

TU TAREA:
Generar el asiento contable correcto para la operación descrita, aplicando la normativa fiscal correspondiente.

NORMATIVA APLICABLE:
${knowledgeBase.map(k => `${k.title}: ${k.content.substring(0, 200)}`).join('\n')}

PRINCIPIOS:
- Aplicar PGC español o normativa local según jurisdicción
- Calcular correctamente bases imponibles y cuotas
- Incluir retenciones si aplican
- Considerar regímenes especiales

FORMATO DE RESPUESTA (JSON estricto):
{
  "entry_suggestion": {
    "description": "string",
    "date": "ISO date",
    "lines": [
      {
        "account_code": "string",
        "account_name": "string",
        "debit": number,
        "credit": number,
        "description": "string"
      }
    ],
    "total_debit": number,
    "total_credit": number,
    "tax_details": {
      "base_amount": number,
      "tax_rate": number,
      "tax_amount": number,
      "tax_type": "string"
    },
    "regulatory_basis": "string",
    "confidence": 0-100,
    "warnings": ["string"],
    "requires_approval": boolean
  }
}`;

        userPrompt = `Operación: ${description || 'Sin descripción'}
Importe: ${amount || 0}€
Jurisdicción: ${jurisdiction_id || 'España'}`;
        break;
      }

      case 'query_regulation': {
        const knowledgeBase = await fetchKnowledge(jurisdiction_id, 20);

        systemPrompt = `Eres un consultor de normativa fiscal con acceso a toda la legislación vigente.

BASE DE CONOCIMIENTO DISPONIBLE:
${knowledgeBase.map(k => `### ${k.title}\n${k.content}\nFuente: ${k.tags?.join(', ')}`).join('\n\n')}

TU ROL:
- Responder consultas sobre normativa fiscal
- Citar artículos y normas específicas
- Proporcionar ejemplos prácticos
- Indicar implicaciones y riesgos

RESPONDE de forma clara, citando siempre la normativa aplicable.`;

        userPrompt = question || 'Consulta general sobre normativa fiscal';
        break;
      }

      case 'monitor_updates': {
        systemPrompt = `Eres un monitor de actualizaciones normativas fiscales.

TU TAREA:
Analizar las últimas novedades fiscales y determinar:
1. Qué jurisdicciones están afectadas
2. Qué formularios o procedimientos cambian
3. Fechas de entrada en vigor
4. Impacto en empresas

FORMATO DE RESPUESTA (JSON):
{
  "updates_found": [
    {
      "jurisdiction": "string",
      "update_type": "new_regulation" | "amendment" | "rate_change" | "deadline_change",
      "title": "string",
      "summary": "string",
      "effective_date": "ISO date",
      "impact_level": "low" | "medium" | "high" | "critical",
      "affected_forms": ["string"],
      "affected_taxes": ["string"]
    }
  ]
}`;

        userPrompt = 'Busca las últimas actualizaciones normativas fiscales relevantes.';
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    // Call AI
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
          ...(history || []).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Payment required' 
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

    // Parse response based on action
    if (action === 'chat' || action === 'query_regulation') {
      result = { response: content };
    } else {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { rawContent: content };
        }
      } catch {
        result = { rawContent: content };
      }
    }

    // Process compliance check results - create alerts
    if (action === 'check_compliance' && company_id && result.issues) {
      const issues = result.issues as Array<{
        jurisdiction: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        recommended_action: string;
      }>;
      
      for (const issue of issues) {
        await createAlert(
          company_id,
          issue.type,
          issue.severity,
          issue.title,
          issue.description,
          issue.recommended_action
        );
      }
      result.alerts_generated = issues.length;
      result.issues_found = issues.length;
    }

    // Log action if session exists
    if (session_id && company_id) {
      await logAction(
        session_id,
        company_id,
        action,
        `Executed ${action}`,
        { message, context },
        result,
        (result as any).confidence || 85
      );
    }

    console.log(`[erp-fiscal-ai-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      ...result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-fiscal-ai-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
