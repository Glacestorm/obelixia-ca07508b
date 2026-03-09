import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IntegrationRequest {
  action: 'save_credentials' | 'get_status' | 'test_connection' | 'delete_credentials';
  provider: string;
  company_id?: string;
  credentials?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { action, provider, company_id, credentials } = await req.json() as IntegrationRequest;
    const companyId = company_id || 'default';

    console.log(`[external-integrations] Action: ${action}, provider: ${provider}`);

    // ========== SAVE CREDENTIALS ==========
    if (action === 'save_credentials' && provider && credentials) {
      // Store credentials in DB (encrypted at rest by Supabase)
      // We store a masked version for display and full version for use
      const maskedCredentials: Record<string, string> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (key === 'password' || key.includes('secret') || key.includes('token')) {
          maskedCredentials[key] = value ? '••••••••' : '';
        } else {
          maskedCredentials[key] = value;
        }
      }

      const { data, error } = await supabase
        .from('integration_credentials')
        .upsert({
          provider,
          company_id: companyId,
          status: 'configured',
          credentials_encrypted: credentials, // Full credentials
          last_validated_at: null,
          health_status: 'unknown',
          metadata: {
            masked: maskedCredentials,
            fields_count: Object.keys(credentials).length,
            saved_at: new Date().toISOString(),
          },
          created_by: userId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'provider,company_id',
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[external-integrations] Credentials saved for ${provider}`);

      return new Response(JSON.stringify({
        success: true,
        provider,
        status: 'configured',
        saved_at: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== GET STATUS ==========
    if (action === 'get_status') {
      const query = provider
        ? supabase.from('integration_credentials').select('*').eq('provider', provider).eq('company_id', companyId)
        : supabase.from('integration_credentials').select('*').eq('company_id', companyId);

      const { data, error } = await query;

      if (error) throw error;

      const integrations = (data || []).map((row: any) => ({
        provider: row.provider,
        status: row.status,
        health_status: row.health_status,
        last_validated_at: row.last_validated_at,
        last_sync_at: row.last_sync_at,
        masked_credentials: row.metadata?.masked || {},
        configured_at: row.metadata?.saved_at || row.created_at,
        fields_count: row.metadata?.fields_count || 0,
      }));

      return new Response(JSON.stringify({
        success: true,
        integrations,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== TEST CONNECTION ==========
    if (action === 'test_connection' && provider) {
      const { data: cred, error: credErr } = await supabase
        .from('integration_credentials')
        .select('*')
        .eq('provider', provider)
        .eq('company_id', companyId)
        .single();

      if (credErr || !cred) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Credenciales no configuradas para este proveedor',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const credentials_data = (cred as any).credentials_encrypted as Record<string, string>;

      // Provider-specific test
      let testResult = { ok: false, latency_ms: 0, message: '' };

      if (provider === 'datadis') {
        const start = Date.now();
        try {
          // Try Datadis login endpoint
          const loginResp = await fetch('https://datadis.es/nikola-auth/tokens/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              username: credentials_data.username || '',
              password: credentials_data.password || '',
            }),
          });
          testResult.latency_ms = Date.now() - start;
          if (loginResp.ok) {
            testResult.ok = true;
            testResult.message = 'Conexión a Datadis verificada correctamente';
          } else {
            const errText = await loginResp.text();
            testResult.message = `Datadis respondió con error ${loginResp.status}: ${errText.slice(0, 200)}`;
          }
        } catch (e) {
          testResult.latency_ms = Date.now() - start;
          testResult.message = `Error de conexión a Datadis: ${e instanceof Error ? e.message : 'unknown'}`;
        }
      } else {
        // Generic test: just verify credentials exist
        testResult = {
          ok: Object.keys(credentials_data).length > 0,
          latency_ms: 1,
          message: Object.keys(credentials_data).length > 0
            ? 'Credenciales configuradas correctamente'
            : 'Sin credenciales',
        };
      }

      // Update health status
      await supabase
        .from('integration_credentials')
        .update({
          health_status: testResult.ok ? 'healthy' : 'error',
          last_validated_at: new Date().toISOString(),
          metadata: {
            ...(cred as any).metadata,
            last_test: {
              ok: testResult.ok,
              latency_ms: testResult.latency_ms,
              message: testResult.message,
              tested_at: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', (cred as any).id);

      return new Response(JSON.stringify({
        success: true,
        test_result: testResult,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== DELETE CREDENTIALS ==========
    if (action === 'delete_credentials' && provider) {
      const { error } = await supabase
        .from('integration_credentials')
        .delete()
        .eq('provider', provider)
        .eq('company_id', companyId);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        deleted: true,
        provider,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('[external-integrations] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
