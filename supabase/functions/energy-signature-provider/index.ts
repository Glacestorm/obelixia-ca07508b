import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Energy Signature Provider Adapter
 * 
 * Supports:
 * - internal: Simple acceptance with evidence hash (ACTIVE)
 * - signaturit: Signaturit sandbox/production API (READY when SIGNATURIT_TOKEN configured)
 * 
 * Actions:
 * - request_signature: Create signature request
 * - check_status: Poll provider for status update
 * - callback: Handle provider webhook callback
 * - download_evidence: Get signed document/evidence
 */

interface SignatureRequest {
  action: 'request_signature' | 'check_status' | 'callback' | 'download_evidence' | 'list_providers';
  signature_id?: string;
  provider?: string;
  params?: {
    proposal_id: string;
    case_id: string;
    signer_name: string;
    signer_email: string;
    signer_nif?: string;
    document_name?: string;
    document_content?: string;
    signature_type?: 'simple' | 'advanced' | 'qualified';
    expiry_days?: number;
    callback_url?: string;
  };
  callback_data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const SIGNATURIT_TOKEN = Deno.env.get('SIGNATURIT_TOKEN');
    const SIGNATURIT_ENV = SIGNATURIT_TOKEN ? 'sandbox' : 'none';
    const SIGNATURIT_BASE = SIGNATURIT_ENV === 'sandbox'
      ? 'https://api.sandbox.signaturit.com'
      : 'https://api.signaturit.com';

    const { action, signature_id, provider, params, callback_data } = await req.json() as SignatureRequest;

    // ========== LIST PROVIDERS ==========
    if (action === 'list_providers') {
      return new Response(JSON.stringify({
        success: true,
        providers: [
          {
            id: 'internal',
            name: 'Firma interna (aceptación simple)',
            status: 'active',
            signature_types: ['simple'],
            description: 'Aceptación con registro de IP, timestamp y hash de evidencia.',
          },
          {
            id: 'signaturit',
            name: 'Signaturit',
            status: SIGNATURIT_TOKEN ? 'active' : 'not_configured',
            env: SIGNATURIT_ENV,
            signature_types: ['simple', 'advanced', 'qualified'],
            description: SIGNATURIT_TOKEN
              ? `Signaturit ${SIGNATURIT_ENV} activo. Firma electrónica avanzada/cualificada eIDAS.`
              : 'Requiere SIGNATURIT_TOKEN. Soporta firma avanzada y cualificada eIDAS.',
            activation_steps: SIGNATURIT_TOKEN ? [] : [
              '1. Crear cuenta en https://app.sandbox.signaturit.com',
              '2. Obtener API Token en Settings → API',
              '3. Configurar secret SIGNATURIT_TOKEN en el backend',
              '4. Probar con firma sandbox antes de producción',
            ],
          },
        ],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== REQUEST SIGNATURE ==========
    if (action === 'request_signature' && params) {
      const selectedProvider = provider || 'internal';

      if (selectedProvider === 'signaturit') {
        if (!SIGNATURIT_TOKEN) {
          return new Response(JSON.stringify({
            success: false,
            error: 'SIGNATURIT_TOKEN no configurado',
            activation_required: true,
            steps: [
              '1. Registrarse en https://app.sandbox.signaturit.com',
              '2. Obtener token API en Settings → API',
              '3. Añadir secret SIGNATURIT_TOKEN al backend',
            ],
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Signaturit API: Create signature request
        console.log(`[energy-signature] Creating Signaturit ${SIGNATURIT_ENV} signature for ${params.signer_email}`);

        const signaturitBody: Record<string, unknown> = {
          recipients: [{
            name: params.signer_name,
            email: params.signer_email,
            ...(params.signer_nif ? { widgets: [{ type: 'text', name: 'nif', default: params.signer_nif }] } : {}),
          }],
          name: params.document_name || `Propuesta energética - ${params.case_id}`,
          delivery_type: 'email',
          branding_id: null,
          expire_time: params.expiry_days || 30,
          data: {
            proposal_id: params.proposal_id,
            case_id: params.case_id,
            source: 'energia-360',
          },
        };

        // If we have document content, send as file; otherwise create from template
        const response = await fetch(`${SIGNATURIT_BASE}/v3/signatures.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SIGNATURIT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signaturitBody),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`[energy-signature] Signaturit error ${response.status}: ${errBody}`);
          throw new Error(`Signaturit API error: ${response.status}`);
        }

        const sigData = await response.json();
        console.log(`[energy-signature] Signaturit signature created: ${sigData.id}`);

        // Persist to energy_signatures
        const { data: dbSig, error: dbErr } = await supabase
          .from('energy_signatures')
          .insert([{
            proposal_id: params.proposal_id,
            case_id: params.case_id,
            signer_name: params.signer_name,
            signer_email: params.signer_email,
            signer_nif: params.signer_nif || null,
            signature_type: params.signature_type || 'advanced',
            status: 'sent',
            provider: 'signaturit',
            provider_reference: sigData.id,
            provider_envelope_id: sigData.id,
            expiry_date: new Date(Date.now() + (params.expiry_days || 30) * 86400000).toISOString(),
            metadata: {
              signaturit_env: SIGNATURIT_ENV,
              signaturit_id: sigData.id,
              signaturit_status: sigData.status,
              created_via: 'energy-signature-provider',
            },
          }])
          .select()
          .single();

        if (dbErr) console.warn('[energy-signature] DB persist warning:', dbErr);

        return new Response(JSON.stringify({
          success: true,
          provider: 'signaturit',
          env: SIGNATURIT_ENV,
          signature_id: dbSig?.id || sigData.id,
          provider_reference: sigData.id,
          status: 'sent',
          message: `Firma enviada a ${params.signer_email} vía Signaturit (${SIGNATURIT_ENV})`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ===== INTERNAL provider =====
      const evidenceHash = await generateHash(`${params.proposal_id}-${params.signer_email}-${Date.now()}`);

      const { data: dbSig, error: dbErr } = await supabase
        .from('energy_signatures')
        .insert([{
          proposal_id: params.proposal_id,
          case_id: params.case_id,
          signer_name: params.signer_name,
          signer_email: params.signer_email,
          signer_nif: params.signer_nif || null,
          signature_type: 'simple',
          status: 'pending',
          provider: 'internal',
          expiry_date: new Date(Date.now() + (params.expiry_days || 30) * 86400000).toISOString(),
          evidence_hash: evidenceHash,
          metadata: {
            method: 'internal_acceptance',
            created_via: 'energy-signature-provider',
          },
        }])
        .select()
        .single();

      if (dbErr) throw dbErr;

      return new Response(JSON.stringify({
        success: true,
        provider: 'internal',
        signature_id: dbSig.id,
        status: 'pending',
        message: 'Solicitud de firma interna creada. Pendiente de aceptación.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== CHECK STATUS ==========
    if (action === 'check_status' && signature_id) {
      const { data: sig, error: sigErr } = await supabase
        .from('energy_signatures')
        .select('*')
        .eq('id', signature_id)
        .single();

      if (sigErr || !sig) throw new Error('Firma no encontrada');

      const sigRecord = sig as any;

      // If Signaturit, poll the API
      if (sigRecord.provider === 'signaturit' && SIGNATURIT_TOKEN && sigRecord.provider_reference) {
        try {
          const response = await fetch(
            `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}.json`,
            {
              headers: { 'Authorization': `Bearer ${SIGNATURIT_TOKEN}` },
            }
          );

          if (response.ok) {
            const providerData = await response.json();
            const providerStatus = providerData.status;

            // Map Signaturit status to our status
            const statusMap: Record<string, string> = {
              'ready': 'sent',
              'signing': 'viewed',
              'completed': 'signed',
              'canceled': 'cancelled',
              'expired': 'expired',
              'declined': 'rejected',
            };
            const mappedStatus = statusMap[providerStatus] || sigRecord.status;

            if (mappedStatus !== sigRecord.status) {
              const timestampField = mappedStatus === 'signed' ? { signed_at: new Date().toISOString() }
                : mappedStatus === 'rejected' ? { rejected_at: new Date().toISOString() }
                : mappedStatus === 'expired' ? { expired_at: new Date().toISOString() }
                : {};

              await supabase.from('energy_signatures')
                .update({
                  status: mappedStatus,
                  ...timestampField,
                  metadata: {
                    ...sigRecord.metadata,
                    last_provider_status: providerStatus,
                    last_checked: new Date().toISOString(),
                  },
                })
                .eq('id', signature_id);
            }

            return new Response(JSON.stringify({
              success: true,
              signature_id,
              status: mappedStatus,
              provider_status: providerStatus,
              updated: mappedStatus !== sigRecord.status,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (pollErr) {
          console.warn('[energy-signature] Provider poll error:', pollErr);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        signature_id,
        status: sigRecord.status,
        provider: sigRecord.provider,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== CALLBACK (webhook from Signaturit) ==========
    if (action === 'callback' && callback_data) {
      const eventType = callback_data.type as string;
      const sigId = callback_data.signature_id as string;

      console.log(`[energy-signature] Callback: ${eventType} for ${sigId}`);

      if (sigId) {
        const statusMap: Record<string, string> = {
          'signature_completed': 'signed',
          'signature_declined': 'rejected',
          'signature_expired': 'expired',
          'signature_canceled': 'cancelled',
          'email_processed': 'sent',
          'email_delivered': 'sent',
          'email_opened': 'viewed',
          'document_opened': 'viewed',
        };

        const newStatus = statusMap[eventType];
        if (newStatus) {
          const timestampField = newStatus === 'signed' ? { signed_at: new Date().toISOString() }
            : newStatus === 'rejected' ? { rejected_at: new Date().toISOString() }
            : newStatus === 'expired' ? { expired_at: new Date().toISOString() }
            : {};

          await supabase.from('energy_signatures')
            .update({
              status: newStatus,
              ...timestampField,
              metadata: {
                last_callback_event: eventType,
                last_callback_at: new Date().toISOString(),
                callback_data,
              },
            })
            .eq('provider_reference', sigId);
        }
      }

      return new Response(JSON.stringify({ success: true, processed: eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== DOWNLOAD EVIDENCE ==========
    if (action === 'download_evidence' && signature_id) {
      const { data: sig } = await supabase
        .from('energy_signatures')
        .select('*')
        .eq('id', signature_id)
        .single();

      if (!sig) throw new Error('Firma no encontrada');
      const sigRecord = sig as any;

      if (sigRecord.provider === 'signaturit' && SIGNATURIT_TOKEN && sigRecord.provider_reference) {
        try {
          const response = await fetch(
            `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}/documents/download/signed`,
            {
              headers: { 'Authorization': `Bearer ${SIGNATURIT_TOKEN}` },
            }
          );

          if (response.ok) {
            return new Response(JSON.stringify({
              success: true,
              has_document: true,
              message: 'Documento firmado disponible',
              download_url: `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}/documents/download/signed`,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (dlErr) {
          console.warn('[energy-signature] Download error:', dlErr);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        has_document: false,
        evidence: {
          hash: sigRecord.evidence_hash,
          signed_at: sigRecord.signed_at,
          ip_address: sigRecord.ip_address,
          provider: sigRecord.provider,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Acción no soportada: ${action}`);
  } catch (error) {
    console.error('[energy-signature-provider] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
