/**
 * payroll-file-generator — Edge Function Fase G
 * Genera ficheros TGSS/AEAT (FAN, FDI, AFI, SILTRA, modelos fiscales)
 * La lógica de generación vive aquí; el frontend solo dispara y consulta estado.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';

// corsHeaders now computed per-request via getSecureCorsHeaders(req)

// ── File format specs (simplified structural generators) ─────────────

interface FileGeneratorInput {
  company_id: string;
  file_type: string;
  period_month: number;
  period_year: number;
  employees?: EmployeePayrollData[];
}

interface EmployeePayrollData {
  naf: string;
  nif: string;
  full_name: string;
  ss_group: number;
  base_cc: number;
  base_cp: number;
  base_irpf: number;
  irpf_rate: number;
  irpf_amount: number;
  gross_salary: number;
  net_salary: number;
  contract_type_code?: string;
  start_date?: string;
  end_date?: string;
}

interface GeneratedFileResult {
  file_name: string;
  content: string;
  mime_type: string;
  records_count: number;
  metadata: Record<string, unknown>;
}

// ── FAN (Fichero de Afiliación de Nóminas) ───────────────────────────
function generateFAN(input: FileGeneratorInput): GeneratedFileResult {
  const { company_id, period_month, period_year, employees = [] } = input;
  const period = `${period_year}${String(period_month).padStart(2, "0")}`;
  const lines: string[] = [];

  // Header
  lines.push(`0|FAN|${company_id}|${period}|${employees.length}|${new Date().toISOString()}`);

  // Detail records
  employees.forEach((emp, idx) => {
    lines.push(
      `1|${String(idx + 1).padStart(6, "0")}|${emp.naf}|${emp.nif}|${emp.full_name}|${emp.ss_group}|${emp.base_cc.toFixed(2)}|${emp.contract_type_code || "100"}|${emp.start_date || ""}|${emp.end_date || ""}`
    );
  });

  // Footer
  const totalBases = employees.reduce((s, e) => s + e.base_cc, 0);
  lines.push(`9|${employees.length}|${totalBases.toFixed(2)}`);

  return {
    file_name: `FAN_${company_id}_${period}.txt`,
    content: lines.join("\n"),
    mime_type: "text/plain",
    records_count: employees.length,
    metadata: { format: "FAN", period, total_bases_cc: totalBases },
  };
}

// ── FDI (Fichero de Datos de Identificación) ─────────────────────────
function generateFDI(input: FileGeneratorInput): GeneratedFileResult {
  const { company_id, period_month, period_year, employees = [] } = input;
  const period = `${period_year}${String(period_month).padStart(2, "0")}`;
  const lines: string[] = [];

  lines.push(`0|FDI|${company_id}|${period}|${employees.length}`);

  employees.forEach((emp, idx) => {
    lines.push(
      `1|${String(idx + 1).padStart(6, "0")}|${emp.naf}|${emp.nif}|${emp.full_name}|${emp.ss_group}`
    );
  });

  lines.push(`9|${employees.length}`);

  return {
    file_name: `FDI_${company_id}_${period}.txt`,
    content: lines.join("\n"),
    mime_type: "text/plain",
    records_count: employees.length,
    metadata: { format: "FDI", period },
  };
}

// ── AFI (Afiliación) ─────────────────────────────────────────────────
function generateAFI(input: FileGeneratorInput): GeneratedFileResult {
  const { company_id, period_month, period_year, employees = [] } = input;
  const period = `${period_year}${String(period_month).padStart(2, "0")}`;
  const lines: string[] = [];

  lines.push(`0|AFI|${company_id}|${period}|${employees.length}`);

  employees.forEach((emp, idx) => {
    lines.push(
      `1|${String(idx + 1).padStart(6, "0")}|${emp.naf}|${emp.nif}|${emp.full_name}|${emp.contract_type_code || "100"}|${emp.start_date || ""}|${emp.end_date || ""}`
    );
  });

  lines.push(`9|${employees.length}`);

  return {
    file_name: `AFI_${company_id}_${period}.txt`,
    content: lines.join("\n"),
    mime_type: "text/plain",
    records_count: employees.length,
    metadata: { format: "AFI", period },
  };
}

// ── Modelo 111 (Retenciones IRPF trimestrales) ──────────────────────
function generateModelo111(input: FileGeneratorInput): GeneratedFileResult {
  const { company_id, period_month, period_year, employees = [] } = input;
  const quarter = Math.ceil(period_month / 3);
  const period = `${period_year}T${quarter}`;

  const uniqueNifs = new Set(employees.map((e) => e.nif));
  const totalPerceptores = uniqueNifs.size;
  const totalBase = employees.reduce((s, e) => s + e.base_irpf, 0);
  const totalRetenciones = employees.reduce((s, e) => s + e.irpf_amount, 0);

  const content = JSON.stringify(
    {
      modelo: "111",
      periodo: period,
      empresa_nif: company_id,
      casilla_01_perceptores: totalPerceptores,
      casilla_02_base: Math.round(totalBase * 100) / 100,
      casilla_03_retenciones: Math.round(totalRetenciones * 100) / 100,
      casilla_04_ingresos_cuenta: Math.round(totalRetenciones * 100) / 100,
      generado_en: new Date().toISOString(),
      disclaimer:
        "Documento preparatorio interno — requiere validación antes de presentación oficial",
    },
    null,
    2
  );

  return {
    file_name: `MODELO111_${company_id}_${period}.json`,
    content,
    mime_type: "application/json",
    records_count: totalPerceptores,
    metadata: {
      format: "MODELO_111",
      period,
      total_perceptores: totalPerceptores,
      total_base: totalBase,
      total_retenciones: totalRetenciones,
    },
  };
}

// ── Router ───────────────────────────────────────────────────────────
const GENERATORS: Record<string, (input: FileGeneratorInput) => GeneratedFileResult> = {
  FAN: generateFAN,
  FDI: generateFDI,
  AFI: generateAFI,
  MODELO_111: generateModelo111,
};

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
    const { action, company_id, file_type, period_month, period_year, employees } = body;

    if (action === "generate") {
      if (!company_id || !file_type || !period_month || !period_year) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: company_id, file_type, period_month, period_year" }),
          { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const generator = GENERATORS[file_type];
      if (!generator) {
        return new Response(
          JSON.stringify({ error: `Unsupported file_type: ${file_type}. Supported: ${Object.keys(GENERATORS).join(", ")}` }),
          { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const result = generator({ company_id, file_type, period_month, period_year, employees: employees || [] });

      // Persist record
      const { data: record, error: insertError } = await supabase
        .from("erp_hr_generated_files")
        .insert({
          company_id,
          file_type,
          file_name: result.file_name,
          period_month,
          period_year,
          status: "generated",
          records_count: result.records_count,
          metadata: result.metadata,
          generated_by_agent: `user:${userId}`,
        } as any)
        .select()
        .single();

      if (insertError) {
        console.error("[payroll-file-generator] insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to persist file record", detail: insertError.message }),
          { status: 500, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          file: { ...record, content: result.content, mime_type: result.mime_type },
        }),
        { headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (action === "list") {
      let query = supabase
        .from("erp_hr_generated_files")
        .select("*")
        .eq("company_id", company_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (file_type) query = query.eq("file_type", file_type);
      if (period_year) query = query.eq("period_year", period_year);
      if (period_month) query = query.eq("period_month", period_month);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, files: data }), {
        headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("[payroll-file-generator] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...getSecureCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
