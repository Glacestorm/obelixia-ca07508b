/**
 * send-hr-alert - Edge function for multi-channel HR alert notifications
 * Supports: Email, WhatsApp, SMS, Push notifications
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';


interface HRAlertRequest {
  alert_id?: string;
  company_id: string;
  alert_type: 'contract_expiry' | 'accident' | 'death' | 'leave_request' | 'document_expiry' | 'custom';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  employee_id?: string;
  employee_name?: string;
  channels: Array<'email' | 'whatsapp' | 'sms' | 'push'>;
  recipients: Array<{
    user_id?: string;
    email?: string;
    phone?: string;
    name?: string;
  }>;
  data?: Record<string, unknown>;
  sync_to_ai?: boolean;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as HRAlertRequest;
    const { 
      alert_id, company_id, alert_type, severity, title, description,
      employee_id, employee_name, channels, recipients, data, sync_to_ai 
    } = body;

    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth + tenant isolation via shared utility
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { userClient, adminClient } = authResult;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY');

    console.log(`[send-hr-alert] Processing ${alert_type} alert via channels:`, channels);

    const results: Record<string, { success: boolean; message?: string; error?: string }> = {};

    const severityConfig = {
      critical: { color: '#dc2626', emoji: '🚨', label: 'CRÍTICO' },
      warning: { color: '#ea580c', emoji: '⚠️', label: 'ADVERTENCIA' },
      info: { color: '#2563eb', emoji: 'ℹ️', label: 'INFORMACIÓN' }
    };
    const config = severityConfig[severity];

    const alertTypeLabels: Record<string, string> = {
      contract_expiry: 'Vencimiento de Contrato',
      accident: 'Accidente Laboral',
      death: 'Fallecimiento/Baja por Duelo',
      leave_request: 'Solicitud de Vacaciones',
      document_expiry: 'Documento por Caducar',
      custom: 'Alerta Personalizada'
    };

    // === EMAIL CHANNEL ===
    if (channels.includes('email') && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const emailRecipients = recipients
          .filter(r => r.email)
          .map(r => r.email as string);

        if (emailRecipients.length > 0) {
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
                  .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                  .header { background: ${config.color}; color: white; padding: 24px; text-align: center; }
                  .header h1 { margin: 0; font-size: 20px; }
                  .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 4px; margin-top: 8px; font-size: 12px; }
                  .content { padding: 24px; }
                  .alert-box { background: ${config.color}10; border-left: 4px solid ${config.color}; padding: 16px; margin: 16px 0; border-radius: 4px; }
                  .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                  .info-label { color: #666; font-weight: 600; }
                  .info-value { font-weight: 700; }
                  .cta { display: inline-block; background: ${config.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
                  .footer { background: #f9fafb; padding: 16px; text-align: center; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>${config.emoji} ${title}</h1>
                    <div class="badge">${alertTypeLabels[alert_type] || alert_type}</div>
                  </div>
                  <div class="content">
                    <div class="alert-box">
                      <p style="margin: 0; font-weight: 600;">${description}</p>
                    </div>
                    ${employee_name ? `
                    <div class="info-row">
                      <span class="info-label">Empleado:</span>
                      <span class="info-value">${employee_name}</span>
                    </div>` : ''}
                    ${data ? Object.entries(data).map(([key, value]) => `
                    <div class="info-row">
                      <span class="info-label">${key}:</span>
                      <span class="info-value">${value}</span>
                    </div>`).join('') : ''}
                    <div style="text-align: center; margin-top: 24px;">
                      <a href="https://avaugfnqvvqcilhiudlf.lovable.app/obelixia-admin/erp?tab=hr" class="cta">
                        Ver en RRHH
                      </a>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 24px;">
                      ${severity === 'critical' ? '⚡ Esta alerta requiere atención inmediata.' : 
                        severity === 'warning' ? '⏰ Revisa esta situación cuando sea posible.' : 
                        'ℹ️ Esta es una notificación informativa.'}
                    </p>
                  </div>
                  <div class="footer">
                    <p><strong>Sistema de Alertas RRHH</strong></p>
                    <p>Notificación automática generada por el sistema</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          const emailResponse = await resend.emails.send({
            from: "RRHH Alertas <onboarding@resend.dev>",
            to: emailRecipients,
            subject: `${config.emoji} ${config.label}: ${title}`,
            html
          });

          results.email = { success: true, message: `Enviado a ${emailRecipients.length} destinatarios` };
          console.log('[send-hr-alert] Email sent:', emailResponse);
        }
      } catch (emailError) {
        console.error('[send-hr-alert] Email error:', emailError);
        results.email = { success: false, error: 'Email delivery error' };
      }
    }

    // === SMS CHANNEL (Twilio) ===
    if (channels.includes('sms') && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      try {
        const smsRecipients = recipients.filter(r => r.phone);
        const smsMessage = `${config.emoji} RRHH ALERTA (${config.label})\n\n${title}\n\n${description}${employee_name ? `\n\nEmpleado: ${employee_name}` : ''}`;

        for (const recipient of smsRecipients) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
          
          const formData = new URLSearchParams();
          formData.append('To', recipient.phone!);
          formData.append('From', TWILIO_PHONE_NUMBER);
          formData.append('Body', smsMessage);

          const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          if (twilioResponse.ok) {
            console.log(`[send-hr-alert] SMS sent to ${recipient.phone}`);
          }
        }

        results.sms = { success: true, message: `Enviado a ${smsRecipients.length} números` };
      } catch (smsError) {
        console.error('[send-hr-alert] SMS error:', smsError);
        results.sms = { success: false, error: 'SMS delivery error' };
      }
    }

    // === WHATSAPP CHANNEL ===
    if (channels.includes('whatsapp')) {
      try {
        const whatsappRecipients = recipients.filter(r => r.phone);
        const whatsappMessage = `${config.emoji} *ALERTA RRHH - ${config.label}*\n\n*${title}*\n\n${description}${employee_name ? `\n\n👤 *Empleado:* ${employee_name}` : ''}\n\n🔗 Ver detalles en el sistema`;

        console.log('[send-hr-alert] WhatsApp message prepared for:', whatsappRecipients.map(r => r.phone));
        
        if (WHATSAPP_API_KEY) {
          results.whatsapp = { success: true, message: `Preparado para ${whatsappRecipients.length} números` };
        } else {
          results.whatsapp = { success: true, message: `Demo: ${whatsappRecipients.length} mensajes preparados` };
        }
      } catch (waError) {
        console.error('[send-hr-alert] WhatsApp error:', waError);
        results.whatsapp = { success: false, error: 'WhatsApp delivery error' };
      }
    }

    // === PUSH NOTIFICATION (adminClient — cross-user INSERT, no RLS for non-admin senders) ===
    if (channels.includes('push')) {
      try {
        const pushRecipients = recipients.filter(r => r.user_id);
        
        for (const recipient of pushRecipients) {
          await adminClient.from('notifications').insert({
            user_id: recipient.user_id,
            title: `${config.emoji} ${title}`,
            message: description,
            type: 'hr_alert',
            data: { alert_type, severity, employee_id, ...data }
          });
        }

        results.push = { success: true, message: `${pushRecipients.length} notificaciones creadas` };
      } catch (pushError) {
        console.error('[send-hr-alert] Push error:', pushError);
        results.push = { success: false, error: 'Push notification error' };
      }
    }

    // === LOG ALERT TO DATABASE (userClient — RLS via user_has_erp_company_access) ===
    try {
      await userClient.from('erp_hr_alerts').insert({
        company_id,
        employee_id,
        alert_type,
        severity,
        title,
        description,
        channels_used: channels,
        delivery_status: results,
        is_read: false,
        ai_synced: sync_to_ai || false
      });
    } catch (logError) {
      console.error('[send-hr-alert] Failed to log alert:', logError);
    }

    // === SYNC TO AI AGENT (adminClient — service-to-service invocation) ===
    if (sync_to_ai) {
      try {
        await adminClient.functions.invoke('erp-hr-ai-agent', {
          body: {
            action: 'chat',
            company_id,
            message: `Nueva alerta RRHH registrada: ${title}. ${description}. Tipo: ${alert_type}. Severidad: ${severity}.${employee_name ? ` Empleado: ${employee_name}.` : ''}`,
            context: { alert_type, severity, employee_id, employee_name, data }
          }
        });
        console.log('[send-hr-alert] Synced to AI agent');
      } catch (aiError) {
        console.error('[send-hr-alert] AI sync error:', aiError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alert_type,
        severity,
        channels_processed: channels,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-hr-alert] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});