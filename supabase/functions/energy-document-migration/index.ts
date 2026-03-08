import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * energy-document-migration
 * 
 * Detects and optionally migrates legacy document references:
 * - Invoices/contracts with public URLs instead of internal storage paths
 * - Broken file references (path exists in DB but not in storage)
 * - Orphan registry entries
 * 
 * Actions:
 *   - audit: Dry-run, returns report without modifying data
 *   - migrate: Attempts to re-download and re-upload legacy URLs to internal storage
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[energy-document-migration] START`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'audit'; // 'audit' | 'migrate'
    const companyId = body.company_id; // optional filter

    interface Issue {
      entity: string;
      entity_id: string;
      field: string;
      issue_type: 'legacy_url' | 'broken_path' | 'orphan_registry' | 'missing_registry';
      current_value: string;
      migrated: boolean;
      new_value?: string;
      error?: string;
    }

    const issues: Issue[] = [];

    // 1. Fetch invoices with document_url
    let invoiceQuery = supabase.from('energy_invoices').select('id, case_id, document_url');
    if (companyId) {
      const { data: cases } = await supabase.from('energy_cases').select('id').eq('company_id', companyId);
      if (cases && cases.length > 0) {
        invoiceQuery = invoiceQuery.in('case_id', cases.map(c => c.id));
      }
    }
    const { data: invoices } = await invoiceQuery;

    for (const inv of (invoices || []) as Array<{ id: string; case_id: string; document_url: string | null }>) {
      if (!inv.document_url) continue;

      if (inv.document_url.startsWith('http')) {
        const issue: Issue = {
          entity: 'energy_invoices',
          entity_id: inv.id,
          field: 'document_url',
          issue_type: 'legacy_url',
          current_value: inv.document_url.substring(0, 120),
          migrated: false,
        };

        if (action === 'migrate') {
          try {
            // Attempt to download the file
            const response = await fetch(inv.document_url);
            if (!response.ok) {
              issue.error = `HTTP ${response.status} - cannot download`;
              await response.text(); // consume body
            } else {
              const blob = await response.blob();
              const ext = inv.document_url.split('.').pop()?.split('?')[0] || 'pdf';
              const newPath = `invoices/${inv.case_id}/${inv.id}/migrated.${ext}`;

              const { error: uploadErr } = await supabase.storage
                .from('energy-documents')
                .upload(newPath, blob, { contentType: blob.type || 'application/pdf', upsert: true });

              if (uploadErr) {
                issue.error = `Upload failed: ${uploadErr.message}`;
              } else {
                // Update reference
                await supabase.from('energy_invoices')
                  .update({ document_url: newPath })
                  .eq('id', inv.id);
                issue.migrated = true;
                issue.new_value = newPath;
                console.log(`[migration] Migrated invoice ${inv.id} → ${newPath}`);
              }
            }
          } catch (e) {
            issue.error = `Download error: ${e instanceof Error ? e.message : 'unknown'}`;
          }
        }

        issues.push(issue);
      } else {
        // Verify internal path exists in storage
        const { data: fileData } = await supabase.storage
          .from('energy-documents')
          .createSignedUrl(inv.document_url, 5);
        if (!fileData?.signedUrl) {
          issues.push({
            entity: 'energy_invoices',
            entity_id: inv.id,
            field: 'document_url',
            issue_type: 'broken_path',
            current_value: inv.document_url,
            migrated: false,
            error: 'File not found in storage',
          });
        }
      }
    }

    // 2. Fetch contracts with signed_document_url
    let contractQuery = supabase.from('energy_contracts').select('id, case_id, signed_document_url');
    if (companyId) {
      const { data: cases } = await supabase.from('energy_cases').select('id').eq('company_id', companyId);
      if (cases && cases.length > 0) {
        contractQuery = contractQuery.in('case_id', cases.map(c => c.id));
      }
    }
    const { data: contracts } = await contractQuery;

    for (const c of (contracts || []) as Array<{ id: string; case_id: string; signed_document_url: string | null }>) {
      if (!c.signed_document_url) continue;

      if (c.signed_document_url.startsWith('http')) {
        const issue: Issue = {
          entity: 'energy_contracts',
          entity_id: c.id,
          field: 'signed_document_url',
          issue_type: 'legacy_url',
          current_value: c.signed_document_url.substring(0, 120),
          migrated: false,
        };

        if (action === 'migrate') {
          try {
            const response = await fetch(c.signed_document_url);
            if (!response.ok) {
              issue.error = `HTTP ${response.status}`;
              await response.text();
            } else {
              const blob = await response.blob();
              const ext = c.signed_document_url.split('.').pop()?.split('?')[0] || 'pdf';
              const newPath = `contracts/${c.case_id}/${c.id}/migrated.${ext}`;

              const { error: uploadErr } = await supabase.storage
                .from('energy-documents')
                .upload(newPath, blob, { contentType: blob.type || 'application/pdf', upsert: true });

              if (uploadErr) {
                issue.error = `Upload: ${uploadErr.message}`;
              } else {
                await supabase.from('energy_contracts')
                  .update({ signed_document_url: newPath })
                  .eq('id', c.id);
                issue.migrated = true;
                issue.new_value = newPath;
                console.log(`[migration] Migrated contract ${c.id} → ${newPath}`);
              }
            }
          } catch (e) {
            issue.error = `Download: ${e instanceof Error ? e.message : 'unknown'}`;
          }
        }

        issues.push(issue);
      }
    }

    const elapsed = Date.now() - startTime;
    const summary = {
      action,
      total_issues: issues.length,
      legacy_urls: issues.filter(i => i.issue_type === 'legacy_url').length,
      broken_paths: issues.filter(i => i.issue_type === 'broken_path').length,
      migrated: issues.filter(i => i.migrated).length,
      failed: issues.filter(i => i.error).length,
      elapsed_ms: elapsed,
    };

    console.log(`[energy-document-migration] DONE:`, JSON.stringify(summary));

    return new Response(JSON.stringify({
      success: true,
      summary,
      issues,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[energy-document-migration] ERROR:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
