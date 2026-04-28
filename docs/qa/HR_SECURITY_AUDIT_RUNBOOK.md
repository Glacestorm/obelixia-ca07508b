# HR / Payroll / Legal — Security Audit Runbook

**Purpose:** prevent security regressions in the HR / Payroll / Legal domain via a
repeatable, automated check that runs locally and in CI.

**Source of truth:** [`HR_CURRENT_STATE_VERIFICATION.md`](./HR_CURRENT_STATE_VERIFICATION.md)

**Scope:** `supabase/functions/{erp-hr-,hr-,payroll-,legal-,erp-legal-,ai-legal-}*`
plus RLS policies on `erp_hr_*`, `payroll_*`, `erp_payroll_*`, `erp_legal_*`.

---

## 1. What it checks

| # | Check | Where | Result on failure |
|---|---|---|---|
| 1 | Inventory all in-scope edge functions | `hr-edge-functions-audit.ts` | n/a (informational) |
| 2 | Classify each function (`tenant` / `auth` / `cron-service` / `documented_exception` / `unsafe`) | `hr-edge-functions-audit.ts` | `unsafe` → **FAIL** |
| 3 | User-facing function without auth | `hr-edge-functions-audit.ts` | rule `no-auth` → **FAIL** |
| 4 | `SERVICE_ROLE_KEY` forwarded as `Authorization: Bearer` downstream | `hr-edge-functions-audit.ts` | rule `sr-bearer-downstream` → **FAIL** |
| 5 | `adminClient` / `supabaseAdmin` / service-role client used against tenant-scoped tables outside documented exceptions | `hr-edge-functions-audit.ts` | rule `admin-client-tenant-table` → **FAIL** |
| 6 | INSERT/UPDATE/DELETE policies with `USING(true)` or `WITH CHECK(true)` on `erp_hr_*` (and broader) | `hr-rls-policy-audit.sql` § A & B | row(s) returned → **FAIL** |
| 7 | `erp_hr_doc_action_queue` uses tenant isolation by `employee_id → company_id` | `hr-rls-policy-audit.sql` § C | not exactly 4 tenant-isolated policies → **FAIL** |
| 8 | RLS-enabled tables in scope without any policy | `hr-rls-policy-audit.sql` § E | row(s) returned → **FAIL** |

Output (Markdown): `docs/qa/HR_SECURITY_AUDIT_RESULT.md` — overwritten on every run.

---

## 2. How to run

### 2.1 Static (edge functions) — local

```bash
deno run --allow-read --allow-write scripts/audit/hr-edge-functions-audit.ts
```

- Exit code `0` → green.
- Exit code `1` → at least one **FAIL** finding; details printed to stderr and to
  `docs/qa/HR_SECURITY_AUDIT_RESULT.md` § 3.

### 2.2 RLS (database) — against live DB

```bash
psql "$DATABASE_URL" -f scripts/audit/hr-rls-policy-audit.sql
```

Sections **A**, **B**, **D**, **E** must be **empty**. Section **C** must show
**exactly 4 rows** (SELECT / INSERT / UPDATE / DELETE), all using
`EXISTS … user_has_erp_company_access(e.company_id)`.

### 2.3 CI integration (recommended)

Add a job that runs the static audit on every PR touching
`supabase/functions/**`:

```yaml
- name: HR security audit (static)
  run: deno run --allow-read --allow-write scripts/audit/hr-edge-functions-audit.ts
```

The RLS portion runs only in environments with DB access and should be
gated on `main` merges or scheduled nightly:

```yaml
- name: HR security audit (RLS)
  if: github.ref == 'refs/heads/main'
  run: psql "${{ secrets.DATABASE_URL_RO }}" -f scripts/audit/hr-rls-policy-audit.sql
```

Use a **read-only** DB role for this step.

---

## 3. Documented exceptions

Mirror of `HR_CURRENT_STATE_VERIFICATION.md` § 4.3. Any function that uses
`SUPABASE_SERVICE_ROLE_KEY` MUST appear in the `DOCUMENTED_EXCEPTIONS` map of
`scripts/audit/hr-edge-functions-audit.ts` AND in the source of truth.

| Function | Type | Justification |
|---|---|---|
| `erp-hr-agreement-updater` | global-catalog/cron | BOE catalog without tenant RLS; cron path has no JWT. |
| `erp-hr-whistleblower-agent` | anonymous-channel | Ley 2/2023 anonymous reporting. |
| `erp-hr-seed-demo-data` | seed/demo | Blocked in prod by `environment-coexistence-strategy`. |
| `erp-hr-seed-demo-master` | seed/demo | Blocked in prod. |
| `hr-labor-copilot` | advisor-portfolio | Multi-company advisor fallback; JWT-first. |
| `hr-workforce-simulation` | controlled-chaining | Cross-tenant snapshots after JWT validation. |
| `legal-ai-advisor` | internal-path | `x-internal-secret` dual-path. |
| `erp-legal-knowledge-loader` | global-catalog | Admin-gated catalog loader. |
| `legal-knowledge-sync` | global-catalog/cron | Cron upserts; admin-gated user path. |

Adding a new function with `SERVICE_ROLE_KEY` requires:

1. PR description with explicit justification.
2. Entry in `DOCUMENTED_EXCEPTIONS` in `hr-edge-functions-audit.ts`.
3. Update of `HR_CURRENT_STATE_VERIFICATION.md` § 4.3 in the same PR.
4. Memory update under `mem://security/global/service-role-legitimate-exceptions`.

---

## 4. Hard guards (must remain TRUE on every run)

- `PAYROLL_EFFECTIVE_CASUISTICA_MODE` is `persisted_priority_preview`.
- `persisted_priority_apply` is **OFF**.
- C3B3C2 remains **BLOCKED** until manual validation pack is signed
  (`CASUISTICA-FECHAS-01_C3B3C_MANUAL_VALIDATION_PACK.md`).
- No artifact related to **TGSS / SEPE / AEAT / SILTRA / CRA / RLC / RNT /
  Contrat@ / Certific@ / DELT@ / preflight** is treated as **official**
  unless ALL four conditions are met:
  1. Valid credential for the target authority.
  2. Real submission (or homologated UAT) against the official endpoint.
  3. Official response received.
  4. Evidence archived in the HR immutable ledger (SHA-256 + timestamp).

The audit script does **not** verify these guards at runtime — they are
documented invariants that the team must preserve across changes.

---

## 5. Triage of findings

| Rule | Triage |
|---|---|
| `no-auth` | Add `validateTenantAccess` (preferred) or `validateAuth` from `_shared/tenant-auth.ts`. Never deploy without it. |
| `sr-bearer-downstream` | Forward `req.headers.get('Authorization')` to downstream calls instead of `SERVICE_ROLE_KEY`. See `legal-multiagent-supervisor` as reference. |
| `admin-client-tenant-table` | Either (a) replace admin client with `userClient` for that table, or (b) document the function as an exception with explicit justification. |
| `exception-without-sr` (WARN) | Function listed as exception but no SR usage detected. Consider removing it from the exceptions list to keep the surface minimal. |
| RLS § A/B rows | Replace `USING(true)` / `WITH CHECK(true)` with `user_has_erp_company_access(company_id)` (or equivalent). |
| RLS § C ≠ 4 rows | `erp_hr_doc_action_queue` policies have drifted. Restore tenant isolation by `employee_id → company_id`. |
| RLS § D rows | Tables in scope with RLS disabled. Enable RLS and add tenant policies. |
| RLS § E rows | RLS enabled but no policies → table is unreachable; either add policies or drop the table. |

---

## 6. Out of scope

- Functions outside the HR/Payroll/Legal prefixes (`check-alerts`,
  `galia-expert-agent`, etc.) are tracked in their own audits.
- This runbook does **not** cover application-level authorization beyond RLS
  and edge-function auth (e.g., role-based UI gates).
- Performance, cost and observability are out of scope.

---

## 7. Changelog

- **2026-04-28** — Initial version. Implements static + RLS audits and CI guidance.
