import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PortalRequestBody {
  portalToken?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PortalRequestBody;
    const portalToken = typeof body.portalToken === "string" ? body.portalToken.trim() : "";

    if (!portalToken || portalToken.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: "Token de acceso no válido", errorCode: "INVALID_TOKEN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: tokenData, error: tokenError } = await supabase
      .from("energy_client_portal_tokens")
      .select("id, case_id, company_id, client_name, expires_at, is_active, created_at, last_accessed_at")
      .eq("token", portalToken)
      .limit(1)
      .maybeSingle();

    if (tokenError || !tokenData || !tokenData.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Enlace inválido o revocado", errorCode: "INVALID_OR_REVOKED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nowIso = new Date().toISOString();
    const expired = new Date(tokenData.expires_at) < new Date();

    if (expired) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            expired: true,
            clientName: tokenData.client_name,
            tokenTrace: {
              created_at: tokenData.created_at,
              expires_at: tokenData.expires_at,
              last_accessed_at: tokenData.last_accessed_at,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("energy_client_portal_tokens")
      .update({ last_accessed_at: nowIso })
      .eq("id", tokenData.id);

    const { data: caseData, error: caseError } = await supabase
      .from("energy_cases")
      .select(
        "id, title, status, cups, address, current_supplier, contract_end_date, energy_type, estimated_annual_savings, estimated_gas_savings, estimated_solar_savings, validated_annual_savings, validated_gas_savings, validated_solar_savings",
      )
      .eq("id", tokenData.case_id)
      .maybeSingle();

    if (caseError || !caseData) {
      return new Response(
        JSON.stringify({ success: false, error: "Expediente no disponible", errorCode: "CASE_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const marketApplicable = ["electricity", "mixed", "solar"].includes(caseData.energy_type ?? "");
    const marketStart = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

    const [proposalsRes, workflowRes, solarRes, contractsRes, invoicesRes, alertsRes, marketRes] = await Promise.all([
      supabase
        .from("energy_proposals")
        .select("id, version, status, recommended_tariff, recommended_supplier, estimated_annual_cost, estimated_annual_savings, gas_savings, accepted_at, issued_at, valid_until, energy_type")
        .eq("case_id", tokenData.case_id)
        .in("status", ["issued", "sent", "accepted"])
        .order("version", { ascending: false }),
      supabase
        .from("energy_workflow_states")
        .select("status, changed_at")
        .eq("case_id", tokenData.case_id)
        .order("changed_at", { ascending: false })
        .limit(1),
      supabase
        .from("energy_solar_installations")
        .select("installed_power_kwp, modality, has_battery, annual_self_consumption_kwh, annual_surplus_kwh, annual_compensation_eur, grid_dependency_pct, monthly_estimated_savings, monthly_real_savings")
        .eq("case_id", tokenData.case_id),
      supabase
        .from("energy_contracts")
        .select("id, supplier, tariff_name, start_date, end_date, has_renewal, has_permanence, early_exit_penalty_text, notes, energy_type, gas_tariff, gas_annual_consumption_kwh, distributor, updated_at")
        .eq("case_id", tokenData.case_id)
        .order("start_date", { ascending: false }),
      supabase
        .from("energy_invoices")
        .select("id, billing_start, billing_end, days, consumption_total_kwh, energy_cost, power_cost, total_amount, is_validated, energy_type, gas_consumption_kwh, gas_fixed_cost, gas_variable_cost, created_at")
        .eq("case_id", tokenData.case_id)
        .order("billing_start", { ascending: false })
        .limit(120),
      supabase
        .from("energy_notifications")
        .select("id, type, severity, title, message, created_at, energy_type")
        .eq("case_id", tokenData.case_id)
        .order("created_at", { ascending: false })
        .limit(20),
      marketApplicable
        ? supabase
            .from("energy_market_prices")
            .select("id, price_date, hour, price_eur_mwh, price_eur_kwh, market_source")
            .eq("energy_type", "electricity")
            .gte("price_date", marketStart)
            .order("price_date", { ascending: true })
            .order("hour", { ascending: true })
            .limit(14 * 24)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const contracts = contractsRes.data || [];
    const invoices = invoicesRes.data || [];

    const gasContracts = contracts.filter((c: any) => c.energy_type === "gas");
    const gasInvoices = invoices.filter(
      (i: any) => i.energy_type === "gas" || i.gas_consumption_kwh != null || i.gas_fixed_cost != null || i.gas_variable_cost != null,
    );

    const totalGasConsumption = gasInvoices.reduce((sum: number, i: any) => sum + (Number(i.gas_consumption_kwh) || 0), 0);
    const totalGasCost = gasInvoices.reduce((sum: number, i: any) => sum + (Number(i.total_amount) || 0), 0);

    const savingsLines = [
      {
        line: "electricidad",
        estimated: Number(caseData.estimated_annual_savings) || 0,
        validated: Number(caseData.validated_annual_savings) || 0,
      },
      {
        line: "gas",
        estimated: Number(caseData.estimated_gas_savings) || 0,
        validated: Number(caseData.validated_gas_savings) || 0,
      },
      {
        line: "solar",
        estimated: Number(caseData.estimated_solar_savings) || 0,
        validated: Number(caseData.validated_solar_savings) || 0,
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          expired: false,
          clientName: tokenData.client_name,
          case: caseData,
          proposals: proposalsRes.data || [],
          workflowStatus: workflowRes.data?.[0]?.status || null,
          workflowChangedAt: workflowRes.data?.[0]?.changed_at || null,
          solarInstallations: solarRes.data || [],
          contracts,
          invoices,
          alerts: alertsRes.data || [],
          marketPrices: marketRes.data || [],
          gasSummary: {
            contracts_count: gasContracts.length,
            invoices_count: gasInvoices.length,
            total_consumption_kwh: Math.round(totalGasConsumption * 100) / 100,
            total_cost_eur: Math.round(totalGasCost * 100) / 100,
            avg_cost_eur_kwh: totalGasConsumption > 0 ? Math.round((totalGasCost / totalGasConsumption) * 10000) / 10000 : null,
          },
          savingsLines,
          tokenTrace: {
            created_at: tokenData.created_at,
            expires_at: tokenData.expires_at,
            last_accessed_at: nowIso,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[energy-client-portal] error", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error interno del portal",
        errorCode: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
