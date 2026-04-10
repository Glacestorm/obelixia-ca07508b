import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkBurstLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

const RATE_LIMIT_CONFIG = {
  burstPerMinute: 8,
  perDay: 30,
  functionName: 'hr-board-pack',
};

interface BoardPackRequest {
  action: 'generate_pack' | 'generate_narrative' | 'list_templates' | 'list_packs' | 'update_status' | 'seed_templates';
  companyId?: string;
  templateId?: string;
  packId?: string;
  period?: { start: string; end: string };
  status?: string;
  comments?: string;
  reviewerName?: string;
}

// ... keep existing code (SECTION_LABELS, AUDIENCE_LABELS)

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { action, companyId, templateId, packId, period, status, comments, reviewerName } = await req.json() as BoardPackRequest;

    if (!companyId || companyId === 'demo-company-id') {
      return validationError('company_id is required', corsHeaders);
    }

    // Auth + tenant isolation via shared utility
    const authResult = await validateTenantAccess(req, companyId);
    if (isAuthError(authResult)) {
      return mapAuthError(authResult, corsHeaders);
    }
    const { userId, userClient } = authResult;

    // Rate limit for expensive actions (generate_pack)
    if (action === 'generate_pack') {
      const burstResult = checkBurstLimit(companyId, RATE_LIMIT_CONFIG);
      if (!burstResult.allowed) {
        console.warn(`[hr-board-pack] Rate limited: company=${companyId}`);
        return rateLimitResponse(burstResult, corsHeaders);
      }
    }

    console.log(`[hr-board-pack] action=${action} company=${companyId} user=${userId}`);

    switch (action) {
      case 'list_templates': {
        const { data, error } = await userClient
          .from('erp_hr_board_pack_templates')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        return json({ success: true, templates: data });
      }

      case 'list_packs': {
        const { data, error } = await userClient
          .from('erp_hr_board_packs')
          .select('*, erp_hr_board_pack_sections(*)')
          .eq('company_id', companyId)
          .order('generated_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return json({ success: true, packs: data });
      }

      case 'update_status': {
        if (!packId || !status) throw new Error('packId and status required');

        // Get current pack
        const { data: pack } = await userClient
          .from('erp_hr_board_packs')
          .select('status')
          .eq('id', packId)
          .single();

        const previousStatus = pack?.status || 'unknown';

        const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
        if (status === 'approved') {
          updates.approved_at = new Date().toISOString();
        }

        const { error } = await userClient
          .from('erp_hr_board_packs')
          .update(updates)
          .eq('id', packId);

        if (error) throw error;

        // Log review
        await userClient.from('erp_hr_board_pack_reviews').insert({
          board_pack_id: packId,
          action: status === 'approved' ? 'approve' : status === 'reviewed' ? 'review' : 'comment',
          reviewer_name: reviewerName || 'Sistema',
          comments: comments || `Estado cambiado a ${status}`,
          previous_status: previousStatus,
          new_status: status,
        });

        return json({ success: true });
      }

      case 'generate_pack': {
        if (!templateId || !companyId || !period) throw new Error('templateId, companyId, period required');

        // Fetch template
        const { data: template, error: tplErr } = await userClient
          .from('erp_hr_board_pack_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (tplErr || !template) throw new Error('Template not found');

        const sectionKeys = (template.sections as string[]) || [];
        const audienceLabel = AUDIENCE_LABELS[template.audience] || template.audience;

        // Build AI prompt for executive narrative
        const systemPrompt = `Eres un redactor ejecutivo premium de board packs para ${audienceLabel}.
Generas narrativa ejecutiva sobria, clara y accionable para comités de dirección y consejos de administración.

AUDIENCIA: ${audienceLabel}
PERIODO: ${period.start} a ${period.end}
SECCIONES: ${sectionKeys.map(k => SECTION_LABELS[k] || k).join(', ')}

FORMATO DE RESPUESTA (JSON estricto):
{
  "executive_summary": "Resumen ejecutivo de 3-5 párrafos sobrio y profesional",
  "key_metrics": [
    {"label":"str","value":"str","change":number,"trend":"up|down|flat","severity":"success|warning|danger|info"}
  ],
  "sections": [
    {
      "key": "str",
      "title": "str",
      "narrative": "Narrativa ejecutiva de 2-3 párrafos por sección",
      "metrics": [{"label":"str","value":"str","change":number}],
      "alerts": [{"level":"info|warning|critical","message":"str"}],
      "recommendations": ["str"],
      "data_source": "real|synced|demo|derived"
    }
  ],
  "risks": [{"title":"str","level":"low|medium|high|critical","description":"str","mitigation":"str"}],
  "decisions_suggested": [{"title":"str","description":"str","urgency":"low|medium|high","owner":"str"}],
  "disclaimers": ["str"]
}

REGLAS:
- Lenguaje sobrio, profesional, sin tecnicismos innecesarios
- Cada sección debe ser autosuficiente
- Indicar claramente si los datos son reales, sincronizados, demo o derivados
- Las decisiones sugeridas deben ser concretas y accionables
- Los riesgos deben incluir mitigación
- Añadir disclaimers si hay secciones sin dato real`;

        const userPrompt = `Genera el board pack completo para ${audienceLabel}.
Periodo: ${period.start} a ${period.end}.
Empresa ID: ${companyId}.
Secciones requeridas: ${JSON.stringify(sectionKeys)}.
Contexto: Suite HR Premium con módulos de Fairness, Workforce Planning, Legal Engine, Compliance, Security, AI Governance, CNAE Intelligence, Digital Twin.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
            max_tokens: 6000,
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Try again later.', 429, corsHeaders);
          if (aiResponse.status === 402) return errorResponse('PAYMENT_REQUIRED', 'AI credits exhausted.', 402, corsHeaders);
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) throw new Error('No AI content');

        let result;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) result = JSON.parse(jsonMatch[0]);
          else throw new Error('No JSON');
        } catch {
          result = {
            executive_summary: content,
            key_metrics: [],
            sections: sectionKeys.map(k => ({
              key: k, title: SECTION_LABELS[k] || k,
              narrative: 'Narrativa no disponible', metrics: [], alerts: [], recommendations: [], data_source: 'demo'
            })),
            risks: [], decisions_suggested: [], disclaimers: ['Narrativa generada por IA — verificar datos']
          };
        }

        // Insert board pack
        const { data: pack, error: packErr } = await userClient
          .from('erp_hr_board_packs')
          .insert({
            company_id: companyId,
            template_id: templateId,
            title: `${template.name} — ${period.start} a ${period.end}`,
            audience: template.audience,
            period_start: period.start,
            period_end: period.end,
            status: 'draft',
            executive_summary: result.executive_summary,
            ai_narrative: result,
            key_metrics: result.key_metrics || [],
            data_sources: (result.sections || []).map((s: any) => ({ section: s.key, source: s.data_source })),
            disclaimers: result.disclaimers || [],
            template_version: '1.0',
            modules_included: sectionKeys,
          })
          .select()
          .single();

        if (packErr) throw packErr;

        // Insert sections
        const sections = (result.sections || []).map((s: any, i: number) => ({
          board_pack_id: pack.id,
          section_key: s.key,
          title: s.title || SECTION_LABELS[s.key] || s.key,
          order_index: i,
          content: { charts: [], tables: [] },
          narrative: s.narrative,
          data_source: s.data_source || 'demo',
          metrics: s.metrics || [],
          alerts: s.alerts || [],
          recommendations: s.recommendations || [],
        }));

        if (sections.length > 0) {
          await userClient.from('erp_hr_board_pack_sections').insert(sections);
        }

        // Log review creation
        await userClient.from('erp_hr_board_pack_reviews').insert({
          board_pack_id: pack.id,
          action: 'created',
          reviewer_name: 'Sistema',
          comments: `Board pack generado para ${audienceLabel}`,
          previous_status: null,
          new_status: 'draft',
        });

        console.log(`[hr-board-pack] Pack generated: ${pack.id}`);

        return json({
          success: true,
          pack: { ...pack, sections },
          narrative: result,
        });
      }

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }
  } catch (error) {
    console.error('[hr-board-pack] Error:', error);
    return internalError(corsHeaders);
  }
});
