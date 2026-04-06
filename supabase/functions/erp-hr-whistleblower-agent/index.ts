import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { action, company_id, report_id, data } = await req.json() as WhistleblowerRequest;

    console.log(`[erp-hr-whistleblower-agent] Action: ${action}, Company: ${company_id}`);

    switch (action) {
      case 'submit_report': {
        // Anonymous report submission - no auth required
        const reportData = data as {
          category: string;
          title: string;
          description: string;
          is_anonymous: boolean;
          contact_method?: string;
          contact_details?: string;
          evidence_urls?: string[];
        };

        // Generate unique report code
        const reportCode = `WB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const { data: report, error } = await supabase
          .from('erp_hr_whistleblower_reports')
          .insert({
            company_id,
            report_code: reportCode,
            category: reportData.category,
            title: reportData.title,
            description_encrypted: reportData.description, // In production, encrypt this
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

        // Calculate acknowledgment deadline (7 days per EU Directive)
        const acknowledgmentDeadline = new Date();
        acknowledgmentDeadline.setDate(acknowledgmentDeadline.getDate() + 7);

        await supabase
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

      case 'get_reports': {
        if (!userId || !company_id) {
          throw new Error('Authentication required');
        }

        const { data: reports, error } = await supabase
          .from('erp_hr_whistleblower_reports')
          .select(`
            id, report_code, category, title, status, priority_level,
            created_at, acknowledgment_deadline, resolution_deadline,
            acknowledged_at, is_anonymous
          `)
          .eq('company_id', company_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get investigation summary
        const reportIds = reports?.map(r => r.id) || [];
        const { data: investigations } = await supabase
          .from('erp_hr_whistleblower_investigations')
          .select('report_id, status, investigator_id')
          .in('report_id', reportIds);

        const reportsWithInvestigations = reports?.map(report => ({
          ...report,
          investigation: investigations?.find(i => i.report_id === report.id),
        }));

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
        if (!userId || !report_id) {
          throw new Error('Authentication required');
        }

        const { data: report, error } = await supabase
          .from('erp_hr_whistleblower_reports')
          .select('*')
          .eq('id', report_id)
          .single();

        if (error) throw error;

        const { data: investigations } = await supabase
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
        if (!userId || !report_id) {
          throw new Error('Authentication required');
        }

        const { error } = await supabase
          .from('erp_hr_whistleblower_reports')
          .update({
            status: 'under_review',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: userId,
          })
          .eq('id', report_id);

        if (error) throw error;

        // Calculate resolution deadline (3 months per EU Directive)
        const resolutionDeadline = new Date();
        resolutionDeadline.setMonth(resolutionDeadline.getMonth() + 3);

        await supabase
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
        if (!userId || !report_id) {
          throw new Error('Authentication required');
        }

        const investigationData = data as {
          findings?: string;
          status?: string;
          recommended_actions?: string[];
        };

        const { error } = await supabase
          .from('erp_hr_whistleblower_investigations')
          .insert({
            report_id,
            investigator_id: userId,
            findings: investigationData.findings,
            status: investigationData.status || 'in_progress',
            recommended_actions: investigationData.recommended_actions,
          });

        if (error) throw error;

        // Update report status
        if (investigationData.status === 'completed') {
          await supabase
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
        // AI analysis of report for priority and categorization
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          throw new Error('LOVABLE_API_KEY not configured');
        }

        const { data: report } = await supabase
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

        if (!response.ok) {
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content;

        let analysis;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parse failed' };
        } catch {
          analysis = { rawContent: content };
        }

        // Update report with AI analysis
        await supabase
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
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
