import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    document_base64?: string; // PDF as base64
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
              : 'Requiere SIGNATURIT_TOKEN.',
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
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[energy-signature] Creating Signaturit ${SIGNATURIT_ENV} signature for ${params.signer_email}`);

        const docName = params.document_name || `Propuesta-${params.case_id}`;

        // Generate PDF bytes
        let pdfBytes: Uint8Array;
        if (params.document_base64) {
          pdfBytes = base64Decode(params.document_base64);
        } else {
          pdfBytes = generateMinimalPDF(docName, params.signer_name, params.case_id, params.proposal_id);
        }

        // Use FormData API (supported in Deno)
        const formData = new FormData();
        formData.append('recipients[0][name]', params.signer_name);
        formData.append('recipients[0][email]', params.signer_email);
        formData.append('delivery_type', 'email');
        formData.append('name', docName);
        formData.append('expire_time', String(params.expiry_days || 30));
        formData.append('data[proposal_id]', params.proposal_id);
        formData.append('data[case_id]', params.case_id);
        formData.append('data[source]', 'energia-360');

        // Attach PDF file
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        formData.append('files[0]', pdfBlob, `${docName}.pdf`);

        const response = await fetch(`${SIGNATURIT_BASE}/v3/signatures.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SIGNATURIT_TOKEN}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`[energy-signature] Signaturit error ${response.status}: ${errBody}`);
          throw new Error(`Signaturit API error: ${response.status} - ${errBody}`);
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
              signaturit_status: sigData.status || 'queued',
              created_via: 'energy-signature-provider',
            },
          }])
          .select()
          .single();

        if (dbErr) console.warn('[energy-signature] DB persist warning:', dbErr);

        // Audit log
        try {
          await supabase.from('energy_audit_log').insert([{
            case_id: params.case_id,
            company_id: 'system',
            action: 'signature_requested_signaturit',
            entity_type: 'energy_signatures',
            entity_id: dbSig?.id || sigData.id,
            details: {
              provider: 'signaturit',
              env: SIGNATURIT_ENV,
              signer_email: params.signer_email,
              signaturit_id: sigData.id,
            },
            performed_by: null,
            performed_at: new Date().toISOString(),
          }]);
        } catch (auditErr) {
          console.warn('[energy-signature] audit log warning:', auditErr);
        }

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

      if (sigRecord.provider === 'signaturit' && SIGNATURIT_TOKEN && sigRecord.provider_reference) {
        try {
          const response = await fetch(
            `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}.json`,
            { headers: { 'Authorization': `Bearer ${SIGNATURIT_TOKEN}` } }
          );

          if (response.ok) {
            const providerData = await response.json();
            const providerStatus = providerData.status;

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

              // Audit the status change
              try {
                await supabase.from('energy_audit_log').insert([{
                  case_id: sigRecord.case_id,
                  company_id: 'system',
                  action: 'signature_status_changed',
                  entity_type: 'energy_signatures',
                  entity_id: signature_id,
                  details: {
                    from: sigRecord.status,
                    to: mappedStatus,
                    provider_status: providerStatus,
                  },
                  performed_by: null,
                  performed_at: new Date().toISOString(),
                }]);
              } catch (_) { /* non-critical */ }
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
          } else {
            await response.text(); // consume body
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

          const { data: updated } = await supabase.from('energy_signatures')
            .update({
              status: newStatus,
              ...timestampField,
              metadata: {
                last_callback_event: eventType,
                last_callback_at: new Date().toISOString(),
                callback_data,
              },
            })
            .eq('provider_reference', sigId)
            .select()
            .single();

          // Audit
          if (updated) {
            try {
              await supabase.from('energy_audit_log').insert([{
                case_id: (updated as any).case_id,
                company_id: 'system',
                action: `signature_callback_${eventType}`,
                entity_type: 'energy_signatures',
                entity_id: (updated as any).id,
                details: { event: eventType, new_status: newStatus, callback_data },
                performed_by: null,
                performed_at: new Date().toISOString(),
              }]);
            } catch (_) { /* non-critical */ }
          }
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
          // First get the signature to find document IDs
          const sigResp = await fetch(
            `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}.json`,
            { headers: { 'Authorization': `Bearer ${SIGNATURIT_TOKEN}` } }
          );

          if (sigResp.ok) {
            const sigDetails = await sigResp.json();
            const docId = sigDetails.documents?.[0]?.id;

            if (docId) {
              // Download signed document
              const dlResp = await fetch(
                `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}/documents/${docId}/download/signed`,
                { headers: { 'Authorization': `Bearer ${SIGNATURIT_TOKEN}` } }
              );

              if (dlResp.ok) {
                const pdfBuffer = await dlResp.arrayBuffer();
                const pdfBase64 = base64Encode(new Uint8Array(pdfBuffer));

                return new Response(JSON.stringify({
                  success: true,
                  has_document: true,
                  document_base64: pdfBase64,
                  content_type: 'application/pdf',
                  filename: `signed-${sigRecord.provider_reference}.pdf`,
                  message: 'Documento firmado descargado',
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              } else {
                await dlResp.text();
              }
            }

            // Try audit trail
            const auditResp = await fetch(
              `${SIGNATURIT_BASE}/v3/signatures/${sigRecord.provider_reference}/documents/${docId || 'unknown'}/download/audit_trail`,
              { headers: { 'Authorization': `Bearer ${SIGNATURIT_TOKEN}` } }
            );

            if (auditResp.ok) {
              const auditBuffer = await auditResp.arrayBuffer();
              const auditBase64 = base64Encode(new Uint8Array(auditBuffer));

              return new Response(JSON.stringify({
                success: true,
                has_document: true,
                document_base64: auditBase64,
                content_type: 'application/pdf',
                filename: `audit-trail-${sigRecord.provider_reference}.pdf`,
                is_audit_trail: true,
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } else {
              await auditResp.text();
            }
          } else {
            await sigResp.text();
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

/**
 * Generate a minimal valid PDF with proposal information.
 * This is used when no PDF is provided by the client.
 */
function generateMinimalPDF(title: string, signerName: string, caseId: string, proposalId: string): Uint8Array {
  const now = new Date().toISOString().slice(0, 10);
  const content = [
    `PROPUESTA COMERCIAL ENERGETICA`,
    ``,
    `Documento: ${title}`,
    `Fecha: ${now}`,
    `Expediente: ${caseId}`,
    `Referencia: ${proposalId}`,
    `Firmante: ${signerName}`,
    ``,
    `Este documento requiere su firma electronica.`,
    `Al firmar, acepta las condiciones de la propuesta energetica.`,
  ].join('\n');

  // Build a minimal valid PDF manually
  const textEncoder = new TextEncoder();

  const streamContent = `BT /F1 12 Tf 50 750 Td (${escPdf(title)}) Tj ET\n` +
    `BT /F1 10 Tf 50 720 Td (Fecha: ${now}) Tj ET\n` +
    `BT /F1 10 Tf 50 700 Td (Expediente: ${escPdf(caseId)}) Tj ET\n` +
    `BT /F1 10 Tf 50 680 Td (Referencia: ${escPdf(proposalId)}) Tj ET\n` +
    `BT /F1 10 Tf 50 660 Td (Firmante: ${escPdf(signerName)}) Tj ET\n` +
    `BT /F1 10 Tf 50 620 Td (Este documento requiere su firma electronica.) Tj ET\n` +
    `BT /F1 10 Tf 50 600 Td (Al firmar, acepta las condiciones de la propuesta.) Tj ET\n`;

  const objects = [
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj`,
    `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj`,
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj`,
    `4 0 obj<</Length ${streamContent.length}>>stream\n${streamContent}endstream\nendobj`,
    `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`;

  return textEncoder.encode(pdf);
}

function escPdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
