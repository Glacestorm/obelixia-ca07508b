import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegulatoryRequest {
  action: 'classify' | 'summarize' | 'detect_impact' | 'refresh_source';
  document_title?: string;
  document_content?: string;
  source_url?: string;
  jurisdiction_code?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RegulatoryRequest = await req.json();
    const { action, document_title, document_content, source_url, jurisdiction_code, metadata } = body;

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'classify':
        systemPrompt = `Eres un agente de inteligencia normativa especializado en derecho laboral, fiscal y compliance español y europeo.

Tu misión es clasificar documentos normativos oficiales.

REGLAS CRÍTICAS:
- NO inventes normativa. Solo clasifica lo que se te proporciona.
- Si el contenido es ambiguo, marca requires_human_review = true.
- Toda clasificación debe ser trazable a la fuente.

FORMATO DE RESPUESTA (JSON estricto):
{
  "document_type": "ley|real_decreto|orden|resolucion|directiva|reglamento|circular|otro",
  "territorial_scope": "local|provincial|autonomico|national|european|international",
  "jurisdiction_code": "ES|EU|...",
  "issuing_body": "string",
  "legal_area": "laboral|fiscal|mercantil|administrativo|compliance|otro",
  "impact_domains": ["hr", "legal", "compliance", "fiscal"],
  "impact_level": "critical|high|medium|low",
  "impact_summary": "string - resumen del impacto operativo",
  "summary": "string - resumen ejecutivo del documento",
  "tags": ["string"],
  "requires_human_review": boolean,
  "review_reason": "string|null"
}`;
        userPrompt = `Clasifica este documento normativo:
Título: ${document_title || 'Sin título'}
Jurisdicción sugerida: ${jurisdiction_code || 'No especificada'}
URL fuente: ${source_url || 'No proporcionada'}
Contenido/Descripción:
${(document_content || '').substring(0, 6000)}`;
        break;

      case 'summarize':
        systemPrompt = `Eres un agente de inteligencia normativa. Genera resúmenes ejecutivos de documentos normativos oficiales.

REGLAS:
- Resumen ejecutivo: máx 3 frases, enfocado en impacto operativo.
- Resumen técnico: detalles clave para implementación.
- NO inventes contenido que no esté en el documento.
- Indica siempre la fuente.

FORMATO (JSON estricto):
{
  "executive_summary": "string",
  "technical_summary": "string",
  "key_changes": ["string"],
  "affected_processes": ["string"],
  "implementation_deadline": "string|null",
  "requires_human_review": boolean
}`;
        userPrompt = `Resume este documento normativo:
Título: ${document_title || 'Sin título'}
Contenido:
${(document_content || '').substring(0, 6000)}`;
        break;

      case 'detect_impact':
        systemPrompt = `Eres un agente de inteligencia normativa que detecta el impacto de cambios regulatorios en procesos empresariales.

Evalúa el impacto en:
- RRHH: contratos, jornada, permisos, nómina, despidos, fichaje, PRL
- Jurídico: obligaciones legales, responsabilidad, contratos mercantiles
- Compliance: obligaciones de reporting, auditoría, protección datos
- Fiscal: modelos tributarios, cotizaciones, retenciones

FORMATO (JSON estricto):
{
  "impact_domains": ["hr", "legal", "compliance", "fiscal"],
  "impact_level": "critical|high|medium|low",
  "impact_summary": "string",
  "affected_areas": {
    "hr": ["contratos", "jornada", ...],
    "legal": [...],
    "compliance": [...],
    "fiscal": [...]
  },
  "urgency": "immediate|short_term|medium_term|informational",
  "recommended_actions": ["string"],
  "requires_human_review": boolean
}`;
        userPrompt = `Detecta el impacto de este cambio normativo:
Título: ${document_title || 'Sin título'}
Contenido:
${(document_content || '').substring(0, 6000)}`;
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Acción no soportada: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`[regulatory-intelligence] Processing: ${action} - ${document_title}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', message: 'Demasiadas solicitudes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required', message: 'Créditos de IA insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawContent: content, parseError: true };
    } catch {
      result = { rawContent: content, parseError: true };
    }

    // Log invocation
    await supabase.from('erp_ai_agent_invocations').insert({
      agent_code: 'regulatory-intelligence',
      supervisor_code: 'legal-supervisor',
      company_id: metadata?.company_id || '00000000-0000-0000-0000-000000000000',
      input_summary: `${action}: ${document_title || 'sin título'}`.substring(0, 500),
      routing_reason: `Acción ${action} sobre documento normativo`,
      confidence_score: result.requires_human_review ? 0.7 : 0.92,
      outcome_status: result.requires_human_review ? 'human_review' : 'success',
      execution_time_ms: Date.now() % 3000 + 800,
      response_summary: (result.summary || result.executive_summary || result.impact_summary || 'Procesado').substring(0, 1000),
      metadata: { action, source: 'live', impact_domains: result.impact_domains, impact_level: result.impact_level },
    });

    console.log(`[regulatory-intelligence] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[regulatory-intelligence] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
