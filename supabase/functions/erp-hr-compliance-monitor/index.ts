import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComplianceRequest {
  action: 'check_deadlines' | 'evaluate_risk' | 'generate_communication' | 
          'validate_checklist' | 'notify_agents' | 'escalate_to_legal' |
          'get_dashboard_summary' | 'create_alert';
  company_id?: string;
  communication_type?: string;
  employee_id?: string;
  days_ahead?: number;
  alert_data?: Record<string, unknown>;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, company_id, communication_type, employee_id, days_ahead = 30, alert_data } = await req.json() as ComplianceRequest;

    console.log(`[erp-hr-compliance-monitor] Processing action: ${action}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'check_deadlines': {
        // Obtener vencimientos próximos usando RPC
        const { data: deadlines, error } = await supabase
          .rpc('get_upcoming_deadlines', { 
            p_company_id: company_id, 
            p_days_ahead: days_ahead 
          });

        if (error) throw error;

        // Generar alertas para vencimientos críticos
        const criticalDeadlines = (deadlines || []).filter((d: { days_remaining: number }) => d.days_remaining <= 7);
        
        result = {
          deadlines: deadlines || [],
          critical_count: criticalDeadlines.length,
          total_pending: (deadlines || []).length
        };
        break;
      }

      case 'evaluate_risk': {
        // Evaluación de riesgo de sanciones usando RPC
        const { data: assessment, error } = await supabase
          .rpc('get_sanction_risk_assessment', { p_company_id: company_id });

        if (error) throw error;

        result = {
          assessment: assessment || [],
          high_risk_count: (assessment || []).filter((a: { alert_level: string }) => 
            a.alert_level === 'critical' || a.alert_level === 'urgent'
          ).length
        };
        break;
      }

      case 'generate_communication': {
        // Usar IA para generar comunicación legal
        const systemPrompt = `Eres un experto en derecho laboral español y andorrano. 
Genera una comunicación legal formal para RRHH.
El formato debe ser profesional, con:
- Encabezado con datos de la empresa y empleado
- Cuerpo con fundamentación legal clara (artículos ET, convenio)
- Pie con lugar, fecha y espacio para firma

FORMATO DE RESPUESTA (JSON estricto):
{
  "title": "título del documento",
  "content": "contenido completo en texto",
  "legal_references": ["Art. X ET", "Art. Y Convenio"],
  "checklist": ["item 1", "item 2"],
  "warnings": ["advertencia si aplica"]
}`;

        const userPrompt = `Genera una carta de ${communication_type} para el empleado con ID ${employee_id}.
Incluye todas las referencias legales aplicables según la normativa española vigente.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 3000,
          }),
        });

        if (!response.ok) throw new Error(`AI API error: ${response.status}`);

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) result = JSON.parse(jsonMatch[0]);
          else result = { rawContent: content, parseError: true };
        } catch {
          result = { rawContent: content, parseError: true };
        }
        break;
      }

      case 'validate_checklist': {
        // Validar checklist de cumplimiento con IA
        const systemPrompt = `Eres un auditor de cumplimiento laboral.
Valida si una comunicación o proceso cumple todos los requisitos legales.

FORMATO DE RESPUESTA (JSON estricto):
{
  "is_compliant": true/false,
  "score": 0-100,
  "passed_items": ["item 1", "item 2"],
  "failed_items": ["item fallido"],
  "recommendations": ["recomendación"]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Valida el checklist para: ${communication_type}` }
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) throw new Error(`AI API error: ${response.status}`);

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        try {
          const jsonMatch = content?.match(/\{[\s\S]*\}/);
          if (jsonMatch) result = JSON.parse(jsonMatch[0]);
          else result = { is_compliant: false, parseError: true };
        } catch {
          result = { is_compliant: false, parseError: true };
        }
        break;
      }

      case 'notify_agents': {
        // Notificar a agentes IA (RRHH y Jurídico)
        // Registrar en tabla de alertas
        const { error } = await supabase
          .from('erp_hr_sanction_alerts')
          .update({ 
            hr_agent_notified: true, 
            hr_agent_notified_at: new Date().toISOString() 
          })
          .eq('company_id', company_id)
          .eq('is_resolved', false);

        if (error) console.error('Error notifying agents:', error);

        result = { 
          notified: true, 
          timestamp: new Date().toISOString(),
          agents: ['erp-hr-ai-agent', 'legal-ai-advisor']
        };
        break;
      }

      case 'escalate_to_legal': {
        // Escalar a revisión jurídica
        const { error } = await supabase
          .from('erp_hr_sanction_alerts')
          .update({ 
            legal_agent_notified: true, 
            legal_agent_notified_at: new Date().toISOString(),
            alert_level: 'critical'
          })
          .eq('company_id', company_id)
          .eq('is_resolved', false)
          .in('alert_level', ['urgent', 'critical']);

        if (error) console.error('Error escalating to legal:', error);

        result = { 
          escalated: true, 
          timestamp: new Date().toISOString(),
          target_agent: 'legal-ai-advisor'
        };
        break;
      }

      case 'get_dashboard_summary': {
        // Obtener resumen para dashboard
        const [deadlinesRes, risksRes, alertsRes] = await Promise.all([
          supabase.rpc('get_upcoming_deadlines', { p_company_id: company_id, p_days_ahead: 30 }),
          supabase.rpc('get_sanction_risk_assessment', { p_company_id: company_id }),
          supabase.from('erp_hr_sanction_alerts')
            .select('*')
            .eq('company_id', company_id)
            .eq('is_resolved', false)
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        const deadlines = deadlinesRes.data || [];
        const risks = risksRes.data || [];
        const alerts = alertsRes.data || [];

        result = {
          summary: {
            pending_deadlines: deadlines.length,
            urgent_deadlines: deadlines.filter((d: { days_remaining: number }) => d.days_remaining <= 7).length,
            active_alerts: alerts.length,
            critical_alerts: alerts.filter((a: { alert_level: string }) => a.alert_level === 'critical').length,
            high_risk_count: risks.filter((r: { alert_level: string }) => r.alert_level === 'critical' || r.alert_level === 'urgent').length
          },
          recent_deadlines: deadlines.slice(0, 5),
          recent_alerts: alerts.slice(0, 5)
        };
        break;
      }

      case 'create_alert': {
        // Crear nueva alerta de sanción
        if (!alert_data) throw new Error('alert_data is required');

        const { error } = await supabase
          .from('erp_hr_sanction_alerts')
          .insert([{
            company_id,
            ...alert_data
          }]);

        if (error) throw error;

        result = { 
          created: true, 
          timestamp: new Date().toISOString() 
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Acción no soportada: ${action}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`[erp-hr-compliance-monitor] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-compliance-monitor] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
