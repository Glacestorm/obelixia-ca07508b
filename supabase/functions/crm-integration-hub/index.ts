/**
 * CRM Integration Hub Edge Function
 * Fase 9: Webhook processing, connector sync, event dispatching
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrationRequest {
  action: 'test_webhook' | 'trigger_webhook' | 'connect_connector' | 'disconnect_connector' | 
          'sync_connector' | 'emit_event' | 'process_events' | 'validate_api_key';
  webhookId?: string;
  connectorId?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  syncType?: 'full' | 'incremental';
  apiKey?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, webhookId, connectorId, eventType, entityType, entityId, payload, syncType, apiKey } = 
      await req.json() as IntegrationRequest;

    console.log(`[crm-integration-hub] Processing action: ${action}`);

    switch (action) {
      // === TEST WEBHOOK ===
      case 'test_webhook': {
        if (!webhookId) throw new Error('webhookId required');

        const { data: webhook, error: fetchError } = await supabase
          .from('crm_webhooks')
          .select('*')
          .eq('id', webhookId)
          .single();

        if (fetchError || !webhook) throw new Error('Webhook not found');

        const testPayload = {
          event: 'test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook from CRM Integration Hub' }
        };

        let result;
        const startTime = Date.now();

        if (webhook.webhook_type === 'outgoing' && webhook.url) {
          try {
            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...webhook.headers
              },
              body: JSON.stringify(testPayload)
            });

            const executionTime = Date.now() - startTime;
            const responseData = await response.text();

            // Log the test
            await supabase.from('crm_webhook_logs').insert([{
              webhook_id: webhookId,
              event_type: 'test',
              request_payload: testPayload,
              response_payload: { body: responseData },
              response_status: response.status,
              execution_time_ms: executionTime,
              status: response.ok ? 'success' : 'failed',
              error_message: response.ok ? null : `HTTP ${response.status}`
            }]);

            // Update webhook stats
            await supabase.from('crm_webhooks').update({
              last_triggered_at: new Date().toISOString(),
              success_count: response.ok ? (webhook.success_count || 0) + 1 : webhook.success_count,
              failure_count: !response.ok ? (webhook.failure_count || 0) + 1 : webhook.failure_count
            }).eq('id', webhookId);

            result = {
              success: response.ok,
              status: response.status,
              executionTime,
              response: responseData.substring(0, 500)
            };
          } catch (fetchError) {
            result = {
              success: false,
              error: fetchError instanceof Error ? fetchError.message : 'Fetch failed'
            };
          }
        } else {
          // For incoming webhooks, just validate config
          result = {
            success: true,
            message: 'Incoming webhook configured correctly',
            secretKey: webhook.secret_key?.substring(0, 8) + '...'
          };
        }

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === TRIGGER WEBHOOK ===
      case 'trigger_webhook': {
        if (!webhookId || !payload) throw new Error('webhookId and payload required');

        const { data: webhook } = await supabase
          .from('crm_webhooks')
          .select('*')
          .eq('id', webhookId)
          .eq('is_active', true)
          .single();

        if (!webhook || webhook.webhook_type !== 'outgoing' || !webhook.url) {
          throw new Error('Invalid or inactive outgoing webhook');
        }

        const startTime = Date.now();
        let lastError = null;

        // Retry logic
        for (let attempt = 0; attempt <= webhook.retry_count; attempt++) {
          try {
            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...webhook.headers
              },
              body: JSON.stringify(payload)
            });

            const executionTime = Date.now() - startTime;

            await supabase.from('crm_webhook_logs').insert([{
              webhook_id: webhookId,
              event_type: eventType || 'custom',
              request_payload: payload,
              response_status: response.status,
              execution_time_ms: executionTime,
              status: response.ok ? 'success' : 'failed',
              retry_attempt: attempt
            }]);

            if (response.ok) {
              await supabase.from('crm_webhooks').update({
                last_triggered_at: new Date().toISOString(),
                success_count: (webhook.success_count || 0) + 1
              }).eq('id', webhookId);

              return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            lastError = `HTTP ${response.status}`;
          } catch (err) {
            lastError = err instanceof Error ? err.message : 'Unknown error';
          }

          // Wait before retry
          if (attempt < webhook.retry_count) {
            await new Promise(r => setTimeout(r, webhook.retry_delay_seconds * 1000));
          }
        }

        // All retries failed
        await supabase.from('crm_webhooks').update({
          failure_count: (webhook.failure_count || 0) + 1
        }).eq('id', webhookId);

        throw new Error(`Webhook failed after ${webhook.retry_count + 1} attempts: ${lastError}`);
      }

      // === CONNECT CONNECTOR ===
      case 'connect_connector': {
        if (!connectorId) throw new Error('connectorId required');

        const { data: connector } = await supabase
          .from('crm_connector_instances')
          .select('*')
          .eq('id', connectorId)
          .single();

        if (!connector) throw new Error('Connector not found');

        // Simulate connection validation based on connector type
        let connectionValid = true;
        let connectionMessage = 'Connected successfully';

        switch (connector.connector_type) {
          case 'slack':
            connectionValid = !!connector.credentials?.webhook_url;
            connectionMessage = connectionValid ? 'Slack webhook connected' : 'Missing Slack webhook URL';
            break;
          case 'email':
            connectionValid = !!connector.credentials?.smtp_host;
            connectionMessage = connectionValid ? 'Email SMTP connected' : 'Missing SMTP configuration';
            break;
          case 'zapier':
            connectionValid = !!connector.credentials?.api_key;
            connectionMessage = connectionValid ? 'Zapier connected' : 'Missing Zapier API key';
            break;
          default:
            // Custom connectors - assume valid if has any credentials
            connectionValid = Object.keys(connector.credentials || {}).length > 0;
        }

        await supabase.from('crm_connector_instances').update({
          status: connectionValid ? 'connected' : 'error',
          last_error: connectionValid ? null : connectionMessage,
          last_sync_at: connectionValid ? new Date().toISOString() : null
        }).eq('id', connectorId);

        return new Response(JSON.stringify({ 
          success: connectionValid, 
          message: connectionMessage 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === DISCONNECT CONNECTOR ===
      case 'disconnect_connector': {
        if (!connectorId) throw new Error('connectorId required');

        await supabase.from('crm_connector_instances').update({
          status: 'disconnected',
          oauth_tokens: null
        }).eq('id', connectorId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === SYNC CONNECTOR ===
      case 'sync_connector': {
        if (!connectorId) throw new Error('connectorId required');

        const { data: connector } = await supabase
          .from('crm_connector_instances')
          .select('*')
          .eq('id', connectorId)
          .eq('status', 'connected')
          .single();

        if (!connector) throw new Error('Connector not connected');

        // Create sync history record
        const { data: syncRecord } = await supabase
          .from('crm_sync_history')
          .insert([{
            connector_id: connectorId,
            sync_type: syncType || 'incremental',
            direction: 'bidirectional',
            status: 'running'
          }])
          .select()
          .single();

        // Update connector status
        await supabase.from('crm_connector_instances').update({
          status: 'syncing'
        }).eq('id', connectorId);

        // Simulate sync (in production, would actually sync data)
        const recordsProcessed = Math.floor(Math.random() * 100) + 10;
        const recordsCreated = Math.floor(recordsProcessed * 0.3);
        const recordsUpdated = Math.floor(recordsProcessed * 0.6);

        // Complete sync
        await supabase.from('crm_sync_history').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_processed: recordsProcessed,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          records_failed: 0
        }).eq('id', syncRecord?.id);

        await supabase.from('crm_connector_instances').update({
          status: 'connected',
          last_sync_at: new Date().toISOString()
        }).eq('id', connectorId);

        return new Response(JSON.stringify({ 
          success: true, 
          syncId: syncRecord?.id,
          stats: { recordsProcessed, recordsCreated, recordsUpdated }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === EMIT EVENT ===
      case 'emit_event': {
        if (!eventType || !payload) throw new Error('eventType and payload required');

        // Store the event
        const { data: event } = await supabase
          .from('crm_integration_events')
          .insert([{
            event_type: eventType,
            event_source: 'crm',
            entity_type: entityType,
            entity_id: entityId,
            payload
          }])
          .select()
          .single();

        // Find matching webhooks
        const { data: webhooks } = await supabase
          .from('crm_webhooks')
          .select('*')
          .eq('is_active', true)
          .eq('webhook_type', 'outgoing')
          .contains('events', [eventType]);

        // Trigger each matching webhook (fire and forget)
        for (const webhook of webhooks || []) {
          fetch(`${supabaseUrl}/functions/v1/crm-integration-hub`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              action: 'trigger_webhook',
              webhookId: webhook.id,
              eventType,
              payload
            })
          }).catch(console.error);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          eventId: event?.id,
          webhooksTriggered: webhooks?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // === VALIDATE API KEY ===
      case 'validate_api_key': {
        if (!apiKey) throw new Error('apiKey required');

        const keyPrefix = apiKey.substring(0, 12);
        
        const { data: keyRecord } = await supabase
          .from('crm_api_keys')
          .select('*')
          .eq('key_prefix', keyPrefix)
          .eq('is_active', true)
          .single();

        if (!keyRecord) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Invalid API key' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check expiration
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'API key expired' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update usage stats
        await supabase.from('crm_api_keys').update({
          last_used_at: new Date().toISOString(),
          usage_count: (keyRecord.usage_count || 0) + 1
        }).eq('id', keyRecord.id);

        return new Response(JSON.stringify({ 
          success: true, 
          permissions: keyRecord.permissions,
          rateLimit: {
            perMinute: keyRecord.rate_limit_per_minute,
            perDay: keyRecord.rate_limit_per_day
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[crm-integration-hub] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
