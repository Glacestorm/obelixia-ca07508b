/**
 * payroll-cross-module-bridge — Edge Function Fase H
 * S6.3F: Migrated to validateTenantAccess — removes manual adminClient for membership
 */

import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';
import { validateTenantAccess, isAuthError } from '../_shared/tenant-auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getSecureCorsHeaders(req) });
  }

  try {
    const body = await req.json();
    const { action, company_id, bridge_type, source_record_id, payload } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id required" }),
        { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // S6.3F: validateTenantAccess replaces manual getClaims + manual adminClient membership
    const authResult = await validateTenantAccess(req, company_id);
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify(authResult.body), {
        status: authResult.status,
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    const { userId, userClient } = authResult;

    if (action === "sync") {
      const targetMap: Record<string, string> = {
        accounting: "accounting",
        treasury: "treasury",
        legal: "compliance",
        sepa: "treasury",
      };

      const targetModule = targetMap[bridge_type] || "unknown";

      // S6.3F: userClient for data ops (RLS enforced)
      const { data: logRecord, error: insertErr } = await userClient
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

      if (bridge_type === "legal") {
        await userClient
          .from("erp_hr_bridge_approvals")
          .insert({
            company_id,
            bridge_log_id: logRecord.id,
            approval_type: "legal_compliance",
            requested_by: userId,
            status: "pending",
          } as any);

        await userClient
          .from("erp_hr_bridge_logs")
          .update({ status: "processing" } as any)
          .eq("id", logRecord.id);
      } else {
        await userClient
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
      const { data, error } = await userClient
        .from("erp_hr_bridge_logs")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
