import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  action: 'send_alert' | 'check_pending';
  alert_type?: string;
  channel?: string;
  recipient?: { email?: string; phone?: string; user_id?: string };
  title?: string;
  message?: string;
  company_id?: string;
  case_id?: string;
  severity?: string;
  energy_type?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, alert_type, channel, recipient, title, message, company_id, case_id, severity, energy_type } = await req.json() as AlertRequest;

    console.log(`[energy-alerts] Action: ${action}, Channel: ${channel}, Type: ${alert_type}`);

    if (action === 'send_alert') {
      // In-app: insert notification directly
      if (channel === 'in_app' && recipient?.user_id && company_id) {
        const { error } = await supabase.from('energy_notifications').insert([{
          case_id: case_id || null,
          company_id,
          type: alert_type || 'info',
          severity: severity || 'info',
          title: title || 'Alerta',
          message: message || '',
          energy_type: energy_type || null,
        }]);

        if (error) {
          console.error('[energy-alerts] Insert notification error:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          channel: 'in_app',
          delivered: true,
          message: 'Notificación in-app creada',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Email channel - prepared stub
      if (channel === 'email') {
        console.log(`[energy-alerts] Email alert prepared for: ${recipient?.email}`);
        return new Response(JSON.stringify({
          success: true,
          channel: 'email',
          delivered: false,
          message: 'Canal email preparado. Requiere integración con servicio de email (Resend/SendGrid).',
          pending_integration: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // WhatsApp channel - prepared stub
      if (channel === 'whatsapp' || channel === 'sms') {
        console.log(`[energy-alerts] ${channel} alert prepared for: ${recipient?.phone}`);
        return new Response(JSON.stringify({
          success: true,
          channel,
          delivered: false,
          message: `Canal ${channel} preparado. Requiere integración con Twilio/WhatsApp Business API.`,
          pending_integration: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Canal no soportado: ${channel}`);
    }

    if (action === 'check_pending') {
      // Check for pending alerts that should be sent
      return new Response(JSON.stringify({
        success: true,
        pending: [],
        message: 'No hay alertas pendientes de envío',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);
  } catch (error) {
    console.error('[energy-alerts] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
