#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * HR / Payroll / Legal — Edge Functions Security Audit
 * ------------------------------------------------------
 * Static, read-only auditor. Does NOT modify any function.
 *
 * Master source of truth:
 *   docs/qa/HR_CURRENT_STATE_VERIFICATION.md
 *
 * Output:
 *   docs/qa/HR_SECURITY_AUDIT_RESULT.md
 *
 * Exit codes:
 *   0  → green (no FAIL findings)
 *   1  → red   (one or more FAIL findings)
 *
 * Run:
 *   deno run --allow-read --allow-write scripts/audit/hr-edge-functions-audit.ts
 *
 * Hard guards (NOT configurable):
 *   - persisted_priority_apply must remain OFF.
 *   - C3B3C2 remains blocked.
 *   - No official TGSS/SEPE/AEAT/SILTRA/CRA/RLC/RNT/Contrat@/Certific@/DELT@
 *     output without credential + real/UAT submission + official response + archived evidence.
 */

// deno-lint-ignore-file no-explicit-any

const FUNCTIONS_DIR = "supabase/functions";
const OUTPUT_PATH = "docs/qa/HR_SECURITY_AUDIT_RESULT.md";

const SCOPE_PREFIXES = [
  "erp-hr-",
  "hr-",
  "payroll-",
  "legal-",
  "erp-legal-",
  "ai-legal-",
];

/** Documented service_role exceptions (mirror of HR_CURRENT_STATE_VERIFICATION §4.3). */
const DOCUMENTED_EXCEPTIONS: Record<string, { type: string; justification: string }> = {
  "erp-hr-agreement-updater": {
    type: "global-catalog/cron",
    justification: "BOE catalog without tenant RLS; cron path has no user JWT.",
  },
  "erp-hr-whistleblower-agent": {
    type: "anonymous-channel",
    justification: "Ley 2/2023 anonymous reporting requires no session.",
  },
  "erp-hr-seed-demo-data": {
    type: "seed/demo",
    justification: "Demo seeding; blocked in prod by environment-coexistence-strategy.",
  },
  "erp-hr-seed-demo-master": {
    type: "seed/demo",
    justification: "Demo master seeding; blocked in prod.",
  },
  "hr-labor-copilot": {
    type: "advisor-portfolio",
    justification: "Labor advisor multi-company fallback; JWT-first.",
  },
  "hr-workforce-simulation": {
    type: "controlled-chaining",
    justification: "Cross-tenant simulation snapshots after JWT validation.",
  },
  "legal-ai-advisor": {
    type: "internal-path",
    justification: "x-internal-secret dual-path; user path uses userClient.",
  },
  "erp-legal-knowledge-loader": {
    type: "global-catalog",
    justification: "Global catalog tables without tenant RLS; admin-gated.",
  },
  "legal-knowledge-sync": {
    type: "global-catalog/cron",
    justification: "Global catalog upserts; cron path has no user JWT.",
  },
};

/** Tables considered tenant-scoped. Admin-client writes against these
 *  without a documented exception are flagged. */
const TENANT_SCOPED_TABLE_PREFIXES = [
  "erp_hr_",
  "erp_payroll_",
  "payroll_",
  "erp_legal_",
];

/** Catalog tables explicitly allowed for admin client even outside exceptions. */
const GLOBAL_CATALOG_TABLES = new Set<string>([
  "erp_hr_collective_agreements_catalog",
  "erp_hr_country_registry",
  "erp_legal_knowledge_base",
  "legal_knowledge_base",
  "user_roles",
]);

type AuthCategory =
  | "validateTenantAccess"
  | "validateAuth"
  | "validateCronOrServiceAuth"
  | "documented_exception"
  | "unsafe";

interface FunctionReport {
  name: string;
  category: AuthCategory;
  hasTenantAuth: boolean;
  hasAuth: boolean;
  hasCronAuth: boolean;
  hasInternalSecret: boolean;
  serviceRoleUses: number;
  bearerServiceRoleDownstream: boolean;
  adminClientTenantTableHits: string[];
}

interface Finding {
  severity: "FAIL" | "WARN" | "INFO";
  fn: string;
  rule: string;
  detail: string;
}

function inScope(name: string): boolean {
  return SCOPE_PREFIXES.some((p) => name.startsWith(p));
}

async function listFunctions(): Promise<string[]> {
  const out: string[] = [];
  for await (const entry of Deno.readDir(FUNCTIONS_DIR)) {
    if (!entry.isDirectory) continue;
    if (!inScope(entry.name)) continue;
    try {
      const stat = await Deno.stat(`${FUNCTIONS_DIR}/${entry.name}/index.ts`);
      if (stat.isFile) out.push(entry.name);
    } catch {
      /* no index.ts → skip */
    }
  }
  return out.sort();
}

async function readSrc(name: string): Promise<string> {
  return await Deno.readTextFile(`${FUNCTIONS_DIR}/${name}/index.ts`);
}

function classify(name: string, src: string): FunctionReport {
  const hasTenantAuth = /\bvalidateTenantAccess\s*\(/.test(src);
  const hasAuth = /\bvalidateAuth\s*\(/.test(src);
  const hasCronAuth = /\bvalidateCronOrServiceAuth\s*\(/.test(src);
  const hasInternalSecret = /x-internal-secret/i.test(src);

  const serviceRoleMatches = src.match(/SUPABASE_SERVICE_ROLE_KEY/g) ?? [];
  const fileBindsServiceRole = serviceRoleMatches.length > 0;

  const bearerSR =
    /Authorization[^\n]{0,80}Bearer[^\n]{0,80}SERVICE_ROLE_KEY/i.test(src) ||
    /Bearer\s*\$\{[^}]*SERVICE_ROLE_KEY[^}]*\}/i.test(src);

  // Variables bound to a service-role client *inside this file*.
  // We deliberately do NOT flag `adminClient` symbols that originate from the
  // shared `validateTenantAccess()` helper (post-validated). To stay strict,
  // we only consider `adminClient` / `supabaseAdmin` / `serviceClient` symbols
  // when the file itself references SUPABASE_SERVICE_ROLE_KEY — otherwise the
  // symbol is either unrelated or the helper-provided post-validated client.
  const adminVars = new Set<string>();
  const reAdminBind =
    /(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*createClient\s*\([^)]*SERVICE_ROLE_KEY[^)]*\)/g;
  for (const m of src.matchAll(reAdminBind)) {
    adminVars.add(m[1]);
  }
  if (fileBindsServiceRole) {
    ["adminClient", "supabaseAdmin", "serviceClient"].forEach((v) => {
      if (new RegExp(`\\b${v}\\b`).test(src)) adminVars.add(v);
    });
  }

  const adminClientHits: string[] = [];
  for (const v of adminVars) {
    const reFrom = new RegExp(`\\b${v}\\s*\\.from\\(\\s*['"\`]([a-zA-Z0-9_]+)['"\`]\\s*\\)`, "g");
    for (const m of src.matchAll(reFrom)) {
      const table = m[1];
      const isTenantScoped = TENANT_SCOPED_TABLE_PREFIXES.some((p) => table.startsWith(p));
      const isGlobalCatalog = GLOBAL_CATALOG_TABLES.has(table);
      if (isTenantScoped && !isGlobalCatalog) {
        adminClientHits.push(`${v}.from('${table}')`);
      }
    }
  }

  let category: AuthCategory;
  if (DOCUMENTED_EXCEPTIONS[name]) category = "documented_exception";
  else if (hasTenantAuth) category = "validateTenantAccess";
  else if (hasCronAuth) category = "validateCronOrServiceAuth";
  else if (hasAuth) category = "validateAuth";
  else category = "unsafe";

  return {
    name,
    category,
    hasTenantAuth,
    hasAuth,
    hasCronAuth,
    hasInternalSecret,
    serviceRoleUses: serviceRoleMatches.length,
    bearerServiceRoleDownstream: bearerSR,
    adminClientTenantTableHits: Array.from(new Set(adminClientHits)),
  };
}

function evaluate(r: FunctionReport): Finding[] {
  const out: Finding[] = [];

  if (r.category === "unsafe") {
    out.push({
      severity: "FAIL",
      fn: r.name,
      rule: "no-auth",
      detail:
        "Function has no validateTenantAccess / validateAuth / validateCronOrServiceAuth and is not in documented exceptions.",
    });
  }

  if (r.bearerServiceRoleDownstream) {
    out.push({
      severity: "FAIL",
      fn: r.name,
      rule: "sr-bearer-downstream",
      detail:
        "SERVICE_ROLE_KEY forwarded as Authorization: Bearer downstream. Forward the user JWT instead.",
    });
  }

  if (
    r.adminClientTenantTableHits.length > 0 &&
    r.category !== "documented_exception"
  ) {
    out.push({
      severity: "FAIL",
      fn: r.name,
      rule: "admin-client-tenant-table",
      detail: `Admin/service-role client used against tenant-scoped tables without documented exception: ${r.adminClientTenantTableHits.join(", ")}`,
    });
  }

  if (
    r.category === "documented_exception" &&
    r.serviceRoleUses === 0 &&
    !r.hasInternalSecret
  ) {
    out.push({
      severity: "WARN",
      fn: r.name,
      rule: "exception-without-sr",
      detail:
        "Listed as documented exception but no SERVICE_ROLE_KEY usage detected. Consider removing from exceptions list.",
    });
  }

  return out;
}

function badge(c: AuthCategory): string {
  switch (c) {
    case "validateTenantAccess": return "🟢 tenant";
    case "validateAuth": return "🟢 auth";
    case "validateCronOrServiceAuth": return "🟢 cron/service";
    case "documented_exception": return "🟡 exception";
    case "unsafe": return "🔴 unsafe";
  }
}

function fmtDate(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

async function main() {
  const fns = await listFunctions();
  const reports: FunctionReport[] = [];
  const findings: Finding[] = [];

  for (const name of fns) {
    const src = await readSrc(name);
    const r = classify(name, src);
    reports.push(r);
    findings.push(...evaluate(r));
  }

  const counts = {
    total: reports.length,
    tenant: reports.filter((r) => r.category === "validateTenantAccess").length,
    auth: reports.filter((r) => r.category === "validateAuth").length,
    cron: reports.filter((r) => r.category === "validateCronOrServiceAuth").length,
    exception: reports.filter((r) => r.category === "documented_exception").length,
    unsafe: reports.filter((r) => r.category === "unsafe").length,
  };

  // Cross-cutting metric: cron/service auth detected, regardless of primary
  // classification (e.g. an exception may also wire a cron path).
  const cronOrServiceDetected = reports.filter((r) => r.hasCronAuth).length;
  const internalSecretDetected = reports.filter((r) => r.hasInternalSecret).length;

  const fails = findings.filter((f) => f.severity === "FAIL");
  const warns = findings.filter((f) => f.severity === "WARN");
  const status = fails.length === 0 ? "🟢 GREEN" : "🔴 RED";

  let md = "";
  md += `# HR / Payroll / Legal — Security Audit Result\n\n`;
  md += `**Generated:** ${fmtDate()}  \n`;
  md += `**Source of truth:** \`docs/qa/HR_CURRENT_STATE_VERIFICATION.md\`  \n`;
  md += `**Status:** ${status}\n\n`;
  md += `> Read-only static auditor. No edge function was modified by this run.\n`;
  md += `> Hard guards: \`persisted_priority_apply\` remains **OFF**, C3B3C2 remains **BLOCKED**.\n`;
  md += `> No TGSS/SEPE/AEAT/SILTRA/CRA/RLC/RNT/Contrat@/Certific@/DELT@ output is treated as official without credential + real/UAT submission + official response + archived evidence.\n\n`;

  md += `## 1. Summary\n\n`;
  md += `| Metric | Value |\n|---|---:|\n`;
  md += `| In-scope functions | ${counts.total} |\n`;
  md += `| validateTenantAccess | ${counts.tenant} |\n`;
  md += `| validateAuth | ${counts.auth} |\n`;
  md += `| validateCronOrServiceAuth | ${counts.cron} |\n`;
  md += `| documented_exception | ${counts.exception} |\n`;
  md += `| 🔴 unsafe | ${counts.unsafe} |\n`;
  md += `| cron/service detected (any path) | ${cronOrServiceDetected} |\n`;
  md += `| x-internal-secret detected (any path) | ${internalSecretDetected} |\n`;
  md += `| FAIL findings | ${fails.length} |\n`;
  md += `| WARN findings | ${warns.length} |\n\n`;

  md += `## 2. Per-function classification\n\n`;
  md += `| Function | Category | SR uses | Cron/Service | Bearer SR downstream | Admin→tenant tables |\n`;
  md += `|---|---|---:|:---:|:---:|---|\n`;
  for (const r of reports) {
    md += `| \`${r.name}\` | ${badge(r.category)} | ${r.serviceRoleUses} | ${r.hasCronAuth ? "✓" : "—"} | ${r.bearerServiceRoleDownstream ? "❌" : "—"} | ${r.adminClientTenantTableHits.join(", ") || "—"} |\n`;
  }
  md += `\n`;

  md += `## 3. Findings\n\n`;
  if (findings.length === 0) {
    md += `_No findings. All in-scope functions pass the static checks._\n\n`;
  } else {
    md += `| Severity | Function | Rule | Detail |\n|---|---|---|---|\n`;
    for (const f of findings) {
      md += `| ${f.severity} | \`${f.fn}\` | ${f.rule} | ${f.detail} |\n`;
    }
    md += `\n`;
  }

  md += `## 4. RLS — companion check\n\n`;
  md += `Permissive policies (\`USING(true)\` / \`WITH CHECK(true)\`) on \`erp_hr_*\` write operations are NOT covered by this static script.\n`;
  md += `Run the SQL companion against the live database:\n\n`;
  md += "```bash\n";
  md += `psql "$DATABASE_URL" -f scripts/audit/hr-rls-policy-audit.sql\n`;
  md += "```\n\n";
  md += `Specifically verify that \`erp_hr_doc_action_queue\` policies isolate by \`employee_id → company_id\` (no \`true\`).\n\n`;

  md += `## 5. Hard guards confirmed\n\n`;
  md += `- ❌ Script does NOT toggle \`PAYROLL_EFFECTIVE_CASUISTICA_MODE\` (must remain \`persisted_priority_preview\`).\n`;
  md += `- ❌ Script does NOT activate \`persisted_priority_apply\` (must remain **OFF**).\n`;
  md += `- ❌ C3B3C2 remains **BLOCKED** until manual validation pack is signed.\n`;
  md += `- ❌ No HR/Payroll/Legal artifact is "official" without credential + real/UAT submission + official response + evidence archived in HR immutable ledger.\n`;

  await Deno.mkdir("docs/qa", { recursive: true });
  await Deno.writeTextFile(OUTPUT_PATH, md);

  console.log(`[hr-audit] wrote ${OUTPUT_PATH}`);
  console.log(`[hr-audit] status: ${status}  fails=${fails.length} warns=${warns.length}`);

  if (fails.length > 0) {
    for (const f of fails) {
      console.error(`[FAIL] ${f.fn} :: ${f.rule} :: ${f.detail}`);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
