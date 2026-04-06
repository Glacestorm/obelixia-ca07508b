import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

interface APIRequest {
  action: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;
    const { action, params } = await req.json() as APIRequest;
    const companyId = params?.company_id as string;

    console.log(`[hr-premium-api] Action: ${action}, User: ${userId}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      // === API CLIENT MANAGEMENT ===
      case 'list_api_clients': {
        const { data, error } = await supabase
          .from('erp_hr_api_clients')
          .select('id, name, description, api_key_prefix, scopes, is_active, rate_limit_per_minute, last_used_at, expires_at, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = { clients: data };
        break;
      }

      case 'create_api_client': {
        const apiKey = `hrp_${crypto.randomUUID().replace(/-/g, '')}`;
        const prefix = apiKey.substring(0, 12);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const { data, error } = await supabase
          .from('erp_hr_api_clients')
          .insert({
            company_id: companyId,
            name: params?.name || 'New API Client',
            description: params?.description || '',
            api_key_hash: hash,
            api_key_prefix: prefix,
            scopes: params?.scopes || ['read:reports'],
            created_by: userId,
            rate_limit_per_minute: params?.rate_limit || 60,
          })
          .select()
          .single();
        if (error) throw error;
        result = { client: data, api_key: apiKey, warning: 'Store this API key securely. It will not be shown again.' };
        break;
      }

      case 'revoke_api_client': {
        const { error } = await supabase
          .from('erp_hr_api_clients')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', params?.client_id)
          .eq('company_id', companyId);
        if (error) throw error;
        result = { revoked: true };
        break;
      }

      // === WEBHOOK MANAGEMENT ===
      case 'list_webhooks': {
        const { data, error } = await supabase
          .from('erp_hr_webhook_subscriptions')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = { webhooks: data };
        break;
      }

      case 'create_webhook': {
        const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
        const { data, error } = await supabase
          .from('erp_hr_webhook_subscriptions')
          .insert({
            company_id: companyId,
            name: params?.name || 'New Webhook',
            url: params?.url,
            secret,
            events: params?.events || [],
            headers: params?.headers || {},
            filters: params?.filters || {},
            retry_policy: params?.retry_policy || { max_retries: 3, backoff_ms: 1000 },
            created_by: userId,
          })
          .select()
          .single();
        if (error) throw error;
        result = { webhook: data, signing_secret: secret, warning: 'Store this secret securely.' };
        break;
      }

      case 'update_webhook': {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (params?.name) updates.name = params.name;
        if (params?.url) updates.url = params.url;
        if (params?.events) updates.events = params.events;
        if (params?.is_active !== undefined) updates.is_active = params.is_active;
        if (params?.headers) updates.headers = params.headers;
        if (params?.filters) updates.filters = params.filters;
        if (params?.retry_policy) updates.retry_policy = params.retry_policy;

        const { error } = await supabase
          .from('erp_hr_webhook_subscriptions')
          .update(updates)
          .eq('id', params?.webhook_id)
          .eq('company_id', companyId);
        if (error) throw error;
        result = { updated: true };
        break;
      }

      case 'delete_webhook': {
        const { error } = await supabase
          .from('erp_hr_webhook_subscriptions')
          .delete()
          .eq('id', params?.webhook_id)
          .eq('company_id', companyId);
        if (error) throw error;
        result = { deleted: true };
        break;
      }

      case 'test_webhook': {
        const { data: wh } = await supabase
          .from('erp_hr_webhook_subscriptions')
          .select('url, secret, headers')
          .eq('id', params?.webhook_id)
          .single();

        if (!wh) throw new Error('Webhook not found');

        const testPayload = {
          event: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: { message: 'This is a test delivery' }
        };

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(wh.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(testPayload)));
        const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

        const start = Date.now();
        try {
          const resp = await fetch(wh.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': `sha256=${sigHex}`,
              ...(wh.headers || {}),
            },
            body: JSON.stringify(testPayload),
          });
          result = {
            test_result: {
              status_code: resp.status,
              response_time_ms: Date.now() - start,
              success: resp.ok,
            }
          };
        } catch (fetchErr) {
          result = {
            test_result: {
              status_code: 0,
              response_time_ms: Date.now() - start,
              success: false,
              error: fetchErr instanceof Error ? fetchErr.message : 'Connection failed',
            }
          };
        }
        break;
      }

      // === DELIVERY LOGS ===
      case 'list_deliveries': {
        const query = supabase
          .from('erp_hr_webhook_delivery_log')
          .select('*, erp_hr_webhook_subscriptions!inner(company_id, name)')
          .order('created_at', { ascending: false })
          .limit(params?.limit as number || 50);

        if (params?.webhook_id) {
          query.eq('subscription_id', params.webhook_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        result = { deliveries: data };
        break;
      }

      case 'retry_delivery': {
        const { data: delivery } = await supabase
          .from('erp_hr_webhook_delivery_log')
          .select('*, erp_hr_webhook_subscriptions!inner(url, secret, headers, company_id)')
          .eq('id', params?.delivery_id)
          .single();

        if (!delivery) throw new Error('Delivery not found');

        // Re-deliver
        const wh = (delivery as any).erp_hr_webhook_subscriptions;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(wh.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(delivery.payload)));
        const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

        const start = Date.now();
        try {
          const resp = await fetch(wh.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': `sha256=${sigHex}`,
              ...(wh.headers || {}),
            },
            body: JSON.stringify(delivery.payload),
          });

          await supabase.from('erp_hr_webhook_delivery_log').insert({
            subscription_id: delivery.subscription_id,
            event_type: delivery.event_type,
            payload: delivery.payload,
            response_status: resp.status,
            response_time_ms: Date.now() - start,
            attempt_number: (delivery.attempt_number || 1) + 1,
            status: resp.ok ? 'success' : 'failed',
            delivered_at: new Date().toISOString(),
          });

          result = { retried: true, status: resp.ok ? 'success' : 'failed' };
        } catch {
          result = { retried: true, status: 'failed' };
        }
        break;
      }

      // === API ACCESS LOG ===
      case 'list_access_logs': {
        const { data, error } = await supabase
          .from('erp_hr_api_access_log')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(params?.limit as number || 100);
        if (error) throw error;
        result = { logs: data };
        break;
      }

      // === EVENT CATALOG ===
      case 'list_events': {
        const { data, error } = await supabase
          .from('erp_hr_api_event_catalog')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true });
        if (error) throw error;
        result = { events: data };
        break;
      }

      // === DATA ENDPOINTS (read-only summaries) ===
      case 'get_report_templates': {
        const { data, error } = await supabase
          .from('erp_hr_report_templates')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = { templates: data };
        break;
      }

      case 'get_generated_reports': {
        const { data, error } = await supabase
          .from('erp_hr_generated_reports')
          .select('id, template_id, title, format, status, review_status, data_sources, filters_applied, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(params?.limit as number || 50);
        if (error) throw error;
        result = { reports: data };
        break;
      }

      case 'get_report_schedules': {
        const { data, error } = await supabase
          .from('erp_hr_report_schedules')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = { schedules: data };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log access
    await supabase.from('erp_hr_api_access_log').insert({
      company_id: companyId,
      endpoint: action,
      method: req.method,
      status_code: 200,
      request_params: params || {},
    }).catch(() => {});

    console.log(`[hr-premium-api] Success: ${action}`);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[hr-premium-api] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
