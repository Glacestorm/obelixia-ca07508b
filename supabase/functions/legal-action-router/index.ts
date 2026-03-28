/**
 * legal-action-router - Edge Function
 * Classifies user intent, routes to supervisor/agent, creates tracked procedures
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionRequest {
  action: 'classify_intent' | 'execute_action' | 'get_procedures' | 'update_procedure';
  company_id: string;
  user_id?: string;
  session_id?: string;
  query?: string;
  jurisdiction?: string;
  specialty?: string;
  conversation_history?: Array<{ role: string; content: string }>;
  procedure_id?: string;
  procedure_update?: Record<string, unknown>;
}

// Module deep links mapping
const MODULE_DEEP_LINKS: Record<string, string> = {
  'despido': '/obelixia-admin/erp?tab=hr&domain=contract-lifecycle',
  'contrato': '/obelixia-admin/erp?tab=hr&domain=contract-lifecycle',
  'sancion': '/obelixia-admin/erp?tab=hr&domain=compliance',
  'permiso': '/obelixia-admin/erp?tab=hr&domain=people-core',
  'modificacion_jornada': '/obelixia-admin/erp?tab=hr&domain=contract-lifecycle',
  'excedencia': '/obelixia-admin/erp?tab=hr&domain=contract-lifecycle',
  'nomina': '/obelixia-admin/erp?tab=hr&domain=payroll',
  'convenio': '/obelixia-admin/erp?tab=hr&domain=compliance',
  'prevencion_riesgos': '/obelixia-admin/erp?tab=hr&domain=compliance',
  'inspeccion_trabajo': '/obelixia-admin/erp?tab=hr&domain=compliance',
  'negociacion_colectiva': '/obelixia-admin/erp?tab=hr&domain=compliance',
  'ere_erte': '/obelixia-admin/erp?tab=hr&domain=contract-lifecycle',
  'alta_empleado': '/obelixia-admin/erp?tab=hr&domain=people-core',
  'baja_empleado': '/obelixia-admin/erp?tab=hr&domain=people-core',
  'compliance_fiscal': '/obelixia-admin/erp?tab=fiscal',
  'contrato_mercantil': '/obelixia-admin/erp?tab=legal',
  'proteccion_datos': '/obelixia-admin/erp?tab=legal&module=compliance',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ActionRequest = await req.json();
    const { action } = body;

    // ============= CLASSIFY INTENT =============
    if (action === 'classify_intent') {
      const { query, jurisdiction = 'ES', specialty = 'labor', conversation_history = [], company_id, session_id } = body;
      if (!query) throw new Error('Query required');

      const classifyPrompt = `Eres un clasificador de intenciones jurídico-laborales enterprise. Analiza la consulta del usuario y determina:

1. Si es una CONSULTA INFORMATIVA (solo quiere información legal) o una ACCIÓN EJECUTABLE (quiere iniciar un procedimiento/trámite)
2. Si es acción ejecutable, clasifica el tipo de procedimiento
3. Determina el módulo ERP afectado y el agente/supervisor apropiado

TIPOS DE PROCEDIMIENTO RECONOCIDOS:
- despido: Despido disciplinario, objetivo, colectivo, etc.
- contrato: Creación, modificación, extensión, conversión de contratos
- sancion: Sanciones disciplinarias, amonestaciones
- permiso: Permisos retribuidos, no retribuidos, vacaciones
- modificacion_jornada: Reducción, ampliación, cambio horario
- excedencia: Voluntaria, forzosa, cuidado familiar
- nomina: Incidencias, recálculos, extras
- convenio: Consultas sobre convenio colectivo aplicable
- prevencion_riesgos: PRL, accidentes, evaluaciones
- inspeccion_trabajo: Preparación ante inspecciones
- negociacion_colectiva: Negociación con representantes
- ere_erte: Expedientes de regulación de empleo
- alta_empleado: Alta de nuevo trabajador
- baja_empleado: Baja por IT, maternidad, etc.
- compliance_fiscal: Cumplimiento fiscal/tributario
- contrato_mercantil: Contratos mercantiles/comerciales
- proteccion_datos: GDPR/LOPDGDD

MÓDULOS Y AGENTES:
- HR Module: hr-supervisor → erp-hr-ai-agent (operaciones), erp-hr-compliance-monitor (compliance), erp-hr-offboarding-agent (despidos/bajas)
- Legal Module: legal-supervisor → legal-ai-advisor (asesoría), legal-validation-gateway-enhanced (validación)
- Fiscal Module: fiscal-supervisor → erp-fiscal-ai-agent
- Accounting Module: accounting-supervisor → erp-accounting-chatbot

RESPONDE EN JSON ESTRICTO:
{
  "intent_type": "informative" | "actionable",
  "procedure_type": "string (uno de los tipos listados o null)",
  "title": "string (título corto del procedimiento)",
  "description": "string (descripción del trámite a realizar)",
  "priority": "low" | "normal" | "high" | "critical",
  "target_module": "hr" | "legal" | "fiscal" | "accounting",
  "target_agent": "string (código del agente)",
  "target_supervisor": "string (código del supervisor o null)",
  "legal_basis": ["array de artículos/leyes aplicables"],
  "steps": [{"step": 1, "description": "string", "status": "pending"}],
  "risk_assessment": "string (evaluación de riesgo breve)",
  "requires_human_review": true/false,
  "confidence": 0.0-1.0,
  "legal_analysis": "string (análisis legal completo con base normativa)",
  "manual_action_hint": "string (instrucciones si el usuario quiere hacerlo manualmente)"
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: classifyPrompt },
            ...conversation_history.slice(-6),
            { role: 'user', content: `Jurisdicción: ${jurisdiction}\nEspecialidad: ${specialty}\nConsulta: ${query}` }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit', message: 'Demasiadas solicitudes' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI error: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');

      let classification;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        classification = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        classification = { intent_type: 'informative', procedure_type: null, confidence: 0.5 };
      }

      // If actionable, create procedure in DB
      if (classification?.intent_type === 'actionable' && classification.procedure_type) {
        const deepLink = MODULE_DEEP_LINKS[classification.procedure_type] || '/obelixia-admin/erp';

        const authHeader = req.headers.get('Authorization');
        let userId = body.user_id;
        if (authHeader && !userId) {
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
          userId = user?.id;
        }

        const { data: procedure, error: insertError } = await supabase
          .from('erp_legal_procedures')
          .insert({
            company_id,
            user_id: userId,
            session_id: session_id || crypto.randomUUID(),
            procedure_type: classification.procedure_type,
            title: classification.title || 'Procedimiento legal',
            description: classification.description,
            status: classification.requires_human_review ? 'pending_review' : 'initiated',
            priority: classification.priority || 'normal',
            routed_to_module: classification.target_module,
            routed_to_agent: classification.target_agent,
            routed_to_supervisor: classification.target_supervisor,
            routing_confidence: classification.confidence || 0,
            routing_reasoning: classification.risk_assessment,
            jurisdiction,
            specialty,
            legal_basis: classification.legal_basis || [],
            ai_analysis: classification.legal_analysis,
            steps: classification.steps || [],
            current_step: 0,
            total_steps: (classification.steps || []).length,
            module_deep_link: deepLink,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[legal-action-router] Insert error:', insertError);
        }

        classification.procedure_id = procedure?.id;
        classification.module_deep_link = deepLink;
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'classify_intent',
        data: classification,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============= GET PROCEDURES =============
    if (action === 'get_procedures') {
      const { company_id, session_id } = body;

      let query = supabase
        .from('erp_legal_procedures')
        .select('*')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (session_id) {
        query = query.eq('session_id', session_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============= UPDATE PROCEDURE =============
    if (action === 'update_procedure') {
      const { procedure_id, procedure_update } = body;
      if (!procedure_id) throw new Error('procedure_id required');

      const { data, error } = await supabase
        .from('erp_legal_procedures')
        .update({ ...procedure_update, updated_at: new Date().toISOString() })
        .eq('id', procedure_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unsupported action: ${action}`);
  } catch (error) {
    console.error('[legal-action-router] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
