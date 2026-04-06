/**
 * payroll-cross-module-bridge — Edge Function Fase H
 * Orchestrates sync between HR/Payroll → Accounting/Treasury/Legal.
 * Persists bridge logs and optionally creates approval requests.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

// corsHeaders now computed per-request via getSecureCorsHeaders(req)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getSecureCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, company_id, bridge_type, source_record_id, payload } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id required" }),
        { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // S2.1: Tenant isolation
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: membership } = await adminClient
      .from('erp_user_companies')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (false) { // original company_id guard moved above
      return new Response(
        JSON.stringify({ error: "company_id required" }),
        { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (action === "sync") {
      // Determine target module
      const targetMap: Record<string, string> = {
        accounting: "accounting",
        treasury: "treasury",
        legal: "compliance",
        sepa: "treasury",
      };

      const targetModule = targetMap[bridge_type] || "unknown";

      // Create bridge log
      const { data: logRecord, error: insertErr } = await supabase
        .from("erp_hr_bridge_logs")
        .insert({
          company_id,
          bridge_type: bridge_type || "accounting",
          source_module: "payroll",
          target_module: targetModule,
          source_record_id: source_record_id || null,
          payload_snapshot: payload || {},
          status: "pending",
        } as any)
        .select()
        .single();

      if (insertErr) {
        console.error("[bridge] insert error:", insertErr);
        throw insertErr;
      }

      // For accounting/treasury — auto-process (no approval needed for now)
      // For legal — create approval request
      if (bridge_type === "legal") {
        await supabase
          .from("erp_hr_bridge_approvals")
          .insert({
            company_id,
            bridge_log_id: logRecord.id,
            approval_type: "legal_compliance",
            requested_by: userId,
            status: "pending",
          } as any);

        // Update log status
        await supabase
          .from("erp_hr_bridge_logs")
          .update({ status: "processing" } as any)
          .eq("id", logRecord.id);
      } else {
        // Simulate processing
        await supabase
          .from("erp_hr_bridge_logs")
          .update({
            status: "synced",
            processed_at: new Date().toISOString(),
          } as any)
          .eq("id", logRecord.id);
      }

      console.log(`[bridge] ${bridge_type} sync created: ${logRecord.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          log_id: logRecord.id,
          status: bridge_type === "legal" ? "pending_approval" : "synced",
          disclaimer: "Sincronización preparatoria interna",
        }),
        { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (action === "status") {
      const { data, error } = await supabase
        .from("erp_hr_bridge_logs")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Summary
      const summary = {
        total: data?.length || 0,
        synced: data?.filter((r: any) => r.status === "synced").length || 0,
        pending: data?.filter((r: any) => r.status === "pending").length || 0,
        failed: data?.filter((r: any) => r.status === "failed").length || 0,
        processing: data?.filter((r: any) => r.status === "processing").length || 0,
      };

      return new Response(
        JSON.stringify({ success: true, logs: data, summary }),
        { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("[bridge] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
