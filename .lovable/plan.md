

# S6.2B — SERVICE_ROLE / adminClient Hardening Phase 2

## Step 0: Real Count Post-S6.2A

```text
Function                        | adminClient data ops | Classification       | Action
────────────────────────────────┼──────────────────────┼──────────────────────┼────────────────────
erp-hr-compliance-enterprise    | ~14 (seed_demo only) | SEED action          | Document as exception
erp-hr-enterprise-admin         | ~12 (seed only)      | SEED action          | Document as exception
erp-hr-industry-templates       | 4 (runtime data ops) | RUNTIME — migrable   | Migrate to userClient
erp-hr-recruitment-agent        | 1 (candidate update) | RUNTIME — migrable   | Migrate to userClient
erp-hr-seed-demo-data           | ALL (service_role)   | SEED-only function   | Document as exception
erp-hr-seed-demo-master         | ALL (service_role)   | SEED-only function   | Document as exception
send-hr-alert                   | 2 (documented S6.2A) | EXCEPTION            | Already documented
erp-hr-innovation-discovery     | 2 (documented S6.2A) | EXCEPTION            | Already documented
```

**S6.2A exceptions already documented**: send-hr-alert (2), erp-hr-innovation-discovery (2) — not in scope.

## Detailed Analysis of 4 Target Functions

### 1. erp-hr-compliance-enterprise
- Uses `validateTenantAccess` — already correct auth pattern
- Destructures `adminClient` but only uses it in `seed_demo` action
- ALL runtime actions (get_dashboard, list_*, upsert_*, ai_*) already use `userClient`
- **Change**: Remove `adminClient` from destructuring. Keep it only for `seed_demo`. Restructure so `seed_demo` gets `adminClient` from `authResult` only when needed, and add `S6.2B SEED EXCEPTION` comment.

### 2. erp-hr-enterprise-admin
- Uses `validateTenantAccess` — already correct auth pattern
- Destructures `adminClient` but only uses it in `seed_enterprise_data` action
- ALL runtime actions (list_*, upsert_*, delete_*, query_audit_log, etc.) already use `userClient`
- **Change**: Same pattern — document seed exception with `S6.2B SEED EXCEPTION` comment. The `erp_hr_enterprise_permissions` upsert legitimately needs `adminClient` (no write RLS — global catalog).

### 3. erp-hr-industry-templates — MAJOR REFACTOR
- Does NOT use `validateTenantAccess` — has manual auth + manual adminClient
- 4 runtime data ops on `adminClient`:
  - `apply_template`: SELECT from `erp_hr_industry_templates`, INSERT into `erp_hr_template_applications`, UPDATE `erp_hr_industry_templates` (usage_count)
  - `validate_compliance`: SELECT from `erp_hr_industry_templates`
- 1 membership check on `adminClient` (tenant isolation)
- **Change**:
  1. Replace manual auth with `validateTenantAccess(req, company_id)`
  2. Migrate all 4 data ops to `userClient`
  3. Remove manual `createClient` import

### 4. erp-hr-recruitment-agent — MINOR REFACTOR
- Does NOT use `validateTenantAccess` — has manual auth + manual adminClient
- 1 runtime data op: `adminClient.from('erp_hr_candidates').update(...)` (line 370)
- 1 membership check on `adminClient`
- **Change**:
  1. Replace manual auth with `validateTenantAccess(req, companyId)`
  2. Migrate the candidate update to `userClient`
  3. Remove manual `createClient` import

### 5-6. erp-hr-seed-demo-data / erp-hr-seed-demo-master — DOCUMENT ONLY
- Entire functions use `SERVICE_ROLE_KEY` client for all ops
- These are seed/demo-only functions, not part of runtime multi-tenant flows
- **Change**: Add `S6.2B SEED EXCEPTION` header comment. No functional changes.

## Deliverables

1. **erp-hr-industry-templates/index.ts** — Full refactor to `validateTenantAccess` + `userClient`
2. **erp-hr-recruitment-agent/index.ts** — Refactor to `validateTenantAccess` + `userClient`
3. **erp-hr-compliance-enterprise/index.ts** — Add seed exception comment (adminClient already confined to seed_demo)
4. **erp-hr-enterprise-admin/index.ts** — Add seed exception comment (adminClient already confined to seed_enterprise_data)
5. **erp-hr-seed-demo-data/index.ts** — Add seed exception header comment
6. **erp-hr-seed-demo-master/index.ts** — Add seed exception header comment
7. **`/docs/S6_service_role_phase2.md`** — Full report

## Post-S6.2B Source of Truth

```text
Function                        | adminClient remaining | Classification
────────────────────────────────┼───────────────────────┼──────────────────────────────
payroll-calculation-engine      | 0                     | Clean (S6.2A)
payroll-supervisor              | 0                     | Clean (S6.2A)
send-hr-alert                   | 2                     | S6.2A Exception (cross-user + S2S)
hr-country-registry             | 0                     | Clean (S6.2A)
erp-hr-innovation-discovery     | 2                     | S6.2A Exception (setTimeout)
erp-hr-compliance-enterprise    | ~14 (seed only)       | S6.2B Seed Exception
erp-hr-enterprise-admin         | ~12 (seed only)       | S6.2B Seed Exception
erp-hr-industry-templates       | 0                     | Clean (S6.2B)
erp-hr-recruitment-agent        | 0                     | Clean (S6.2B)
erp-hr-seed-demo-data           | ALL                   | S6.2B Seed-Only Function
erp-hr-seed-demo-master         | ALL                   | S6.2B Seed-Only Function
```

**Runtime adminClient data ops**: 4 (all documented S6.2A exceptions in send-hr-alert + innovation-discovery)
**Seed-only adminClient**: Confined to seed actions and seed-only functions — not part of normal tenant runtime.

