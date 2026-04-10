import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { mapAuthError, validationError, internalError, errorResponse } from '../_shared/error-contract.ts';

interface WhistleblowerRequest {
  action: 'submit_report' | 'get_reports' | 'get_report_detail' | 'update_investigation' | 
          'acknowledge_report' | 'close_investigation' | 'analyze_report';
  company_id?: string;
  report_id?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as WhistleblowerRequest;
    const { action, company_id, report_id, data } = body;

    // =========================================================================
    // PATH 1: ANONYMOUS SUBMIT_REPORT — EU Directive 2019/1937
    // This is the ONLY documented exception in this batch.
    // Anonymous reporters have no JWT, so we must use adminClient (service_role)
    // for the INSERT. No tenant membership check is possible or required.
    // =========================================================================
    if (action === 'submit_report') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceKey);

      // Optionally resolve userId if auth header is present (non-anonymous report)
      let userId: string | null = null;
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const tempClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: claimsData } = await tempClient.auth.getClaims(token);
        userId = (claimsData?.claims?.sub as string) || null;
      }

      const reportData = data as {
        category: string;
        title: string;
        description: string;
        is_anonymous: boolean;
        contact_method?: string;
        contact_details?: string;
        evidence_urls?: string[];
      };

      const reportCode = `WB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // adminClient INSERT — anonymous reporters cannot use userClient (no JWT/RLS)
      const { data: report, error } = await adminClient
        .from('erp_hr_whistleblower_reports')
        .insert({
          company_id,
          report_code: reportCode,
          category: reportData.category,
          title: reportData.title,
          description_encrypted: reportData.description,
          is_anonymous: reportData.is_anonymous,
          reporter_id: reportData.is_anonymous ? null : userId,
          contact_method: reportData.contact_method,
          contact_details_encrypted: reportData.contact_details,
          evidence_urls: reportData.evidence_urls,
          status: 'received',
          submission_channel: 'web_portal',
        })
        .select()
        .single();

      if (error) throw error;

      const acknowledgmentDeadline = new Date();
      acknowledgmentDeadline.setDate(acknowledgmentDeadline.getDate() + 7);

      await adminClient
        .from('erp_hr_whistleblower_reports')
        .update({ acknowledgment_deadline: acknowledgmentDeadline.toISOString() })
        .eq('id', report.id);

      return new Response(JSON.stringify({
        success: true,
        report_code: reportCode,
        message: 'Denuncia recibida correctamente. Guarde el código para seguimiento.',
        acknowledgment_deadline: acknowledgmentDeadline.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // PATH 2: ALL OTHER ACTIONS — Full validateTenantAccess required
    // =========================================================================
    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing company_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userId, userClient } = authResult;

    console.log(`[erp-hr-whistleblower-agent] Action: ${action}, Company: ${company_id}`);

    switch (action) {
      case 'get_reports': {
        const { data: reports, error } = await userClient
          .from('erp_hr_whistleblower_reports')
          .select(`
            id, report_code, category, title, status, priority_level,
            created_at, acknowledgment_deadline, resolution_deadline,
            acknowledged_at, is_anonymous
          `)
          .eq('company_id', company_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const reportIds = reports?.map(r => r.id) || [];
        let reportsWithInvestigations = reports;
        if (reportIds.length > 0) {
          const { data: investigations } = await userClient
            .from('erp_hr_whistleblower_investigations')
            .select('report_id, status, investigator_id')
            .in('report_id', reportIds);

          reportsWithInvestigations = reports?.map(report => ({
            ...report,
            investigation: investigations?.find(i => i.report_id === report.id),
          }));
        }

        return new Response(JSON.stringify({
          success: true,
          reports: reportsWithInvestigations,
          stats: {
            total: reports?.length || 0,
            pending: reports?.filter(r => r.status === 'received' || r.status === 'under_review').length || 0,
            urgent: reports?.filter(r => r.priority_level === 'critical' || r.priority_level === 'high').length || 0,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_report_detail': {
        if (!report_id) throw new Error('report_id is required');

        const { data: report, error } = await userClient
          .from('erp_hr_whistleblower_reports')
          .select('*')
          .eq('id', report_id)
          .single();

        if (error) throw error;

        const { data: investigations } = await userClient
          .from('erp_hr_whistleblower_investigations')
          .select('*')
          .eq('report_id', report_id)
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({
          success: true,
          report,
          investigations,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'acknowledge_report': {
        if (!report_id) throw new Error('report_id is required');

        const { error } = await userClient
          .from('erp_hr_whistleblower_reports')
          .update({
            status: 'under_review',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: userId,
          })
          .eq('id', report_id);

        if (error) throw error;

        const resolutionDeadline = new Date();
        resolutionDeadline.setMonth(resolutionDeadline.getMonth() + 3);

        await userClient
          .from('erp_hr_whistleblower_reports')
          .update({ resolution_deadline: resolutionDeadline.toISOString() })
          .eq('id', report_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Denuncia acusada. Plazo de resolución: 3 meses.',
          resolution_deadline: resolutionDeadline.toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_investigation': {
        if (!report_id) throw new Error('report_id is required');

        const investigationData = data as {
          findings?: string;
          status?: string;
          recommended_actions?: string[];
        };

        const { error } = await userClient
          .from('erp_hr_whistleblower_investigations')
          .insert({
            report_id,
            investigator_id: userId,
            findings: investigationData.findings,
            status: investigationData.status || 'in_progress',
            recommended_actions: investigationData.recommended_actions,
          });

        if (error) throw error;

        if (investigationData.status === 'completed') {
          await userClient
            .from('erp_hr_whistleblower_reports')
            .update({ status: 'resolved' })
            .eq('id', report_id);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Investigación actualizada.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'analyze_report': {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        if (!report_id) throw new Error('report_id is required');

        const { data: report } = await userClient
          .from('erp_hr_whistleblower_reports')
          .select('*')
          .eq('id', report_id)
          .single();

        if (!report) throw new Error('Report not found');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `Eres un experto en compliance y análisis de denuncias según la Directiva EU 2019/1937.
                
Analiza la denuncia y proporciona:
1. Nivel de prioridad (critical/high/medium/low)
2. Categorías adicionales aplicables
3. Áreas de riesgo identificadas
4. Recomendaciones iniciales para la investigación
5. Posibles implicaciones legales

Responde en JSON:
{
  "priority_level": "critical|high|medium|low",
  "risk_areas": ["..."],
  "legal_implications": ["..."],
  "investigation_recommendations": ["..."],
  "estimated_complexity": "simple|moderate|complex",
  "requires_external_counsel": true|false
}`
              },
              {
                role: 'user',
                content: `Categoría: ${report.category}
Título: ${report.title}
Descripción: ${report.description_encrypted}
Canal: ${report.submission_channel}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) throw new Error(`AI API error: ${response.status}`);

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;

        let analysis;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parse failed' };
        } catch {
          analysis = { rawContent: content };
        }

        // Update report with AI analysis via userClient
        await userClient
          .from('erp_hr_whistleblower_reports')
          .update({
            priority_level: analysis.priority_level || 'medium',
            ai_analysis: analysis,
          })
          .eq('id', report_id);

        return new Response(JSON.stringify({
          success: true,
          analysis,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[erp-hr-whistleblower-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});