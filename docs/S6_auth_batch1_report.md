# S6.3B — Auth Hardening Batch 1 Report: Payroll / Compliance / Reporting

**Date**: 2026-04-09  
**Scope**: 5 edge functions (critical payroll, compliance, and reporting)  
**Objective**: Migrate to `validateTenantAccess()` + `userClient` standard pattern

---

## Summary

| Function | Before | After | service_role data ops eliminated | adminClient after |
|---|---|---|---|---|
| erp-hr-payroll-recalculation | Manual getClaims + adminClient membership | `validateTenantAccess()` + `userClient` | 0 (was membership-only) | **0** |
| hr-compliance-automation | Manual getClaims + adminClient membership | `validateTenantAccess()` + `userClient` | 0 (AI-only, no DB ops) | **0** |
| erp-hr-accounting-bridge | Manual getClaims + service_role for ALL ops | `validateTenantAccess()` + `userClient` | **~15+ INSERT/SELECT/UPDATE** | **0** |
| hr-regulatory-reporting | Manual getUser + service_role for ALL ops | `validateTenantAccess()` + `userClient` | **~20+ SELECT/INSERT/UPDATE** | **0** |
| hr-reporting-engine | Manual getUser + service_role for ALL ops | `validateTenantAccess()` + `userClient` | **~15+ SELECT/INSERT/UPDATE/UPSERT** | **0** |

---

## Detailed Changes

### 1. erp-hr-payroll-recalculation (826→~780 lines)

**Auth pattern BEFORE**:
```
- Manual `createClient` with ANON_KEY + JWT
- Manual `getClaims(token)` for user validation
- Manual `createClient` with SERVICE_ROLE_KEY for membership check only
- Data ops already on user-scoped client
```

**Auth pattern AFTER**:
```
- `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- `userClient` from auth result for all data operations
- No createClient imports needed
```

**Changes**:
- Removed `import { createClient }` — uses shared utility
- Replaced 43-line manual auth block with 7-line standard pattern
- Renamed `supabase` variable references to `userClient`
- All data ops unchanged (already user-scoped)

**Residual adminClient**: 0  
**Risk**: None — data ops were already RLS-compliant

---

### 2. hr-compliance-automation (230→~200 lines)

**Auth pattern BEFORE**:
```
- Manual `createClient` with ANON_KEY + JWT
- Manual `getClaims(token)` for user validation
- Manual `createClient` with SERVICE_ROLE_KEY for membership check
- No database data operations (pure AI function)
```

**Auth pattern AFTER**:
```
- `validateTenantAccess(req, body.company_id)` + `isAuthError()` guard
- No data ops to migrate
```

**Changes**:
- Removed `import { createClient }` — uses shared utility
- Replaced 40-line manual auth block with 7-line standard pattern
- Removed `serviceKey` variable and manual adminClient creation

**Residual adminClient**: 0  
**Risk**: None — no database operations

---

### 3. erp-hr-accounting-bridge (947→~920 lines) — MAJOR

**Auth pattern BEFORE**:
```
- Manual `createClient` with ANON_KEY + JWT for getClaims
- `supabase = createClient(url, SERVICE_ROLE_KEY)` — used for ALL operations
- Manual membership check on service_role client
- 7 handler functions all receive service_role `supabase`
```

**Auth pattern AFTER**:
```
- `validateTenantAccess(req, companyId)` + `isAuthError()` guard
- `userClient` passed to all 7 handler functions
- All ~15+ data operations now go through RLS
```

**Operations migrated to userClient**:
| Handler | Table | Operations |
|---|---|---|
| generatePayrollEntry | erp_journal_entries | INSERT |
| generatePayrollEntry | erp_journal_entry_lines | INSERT |
| generatePayrollEntry | erp_hr_journal_entries | INSERT |
| generatePayrollEntry | erp_hr_integration_log | INSERT |
| generateSettlementEntry | erp_journal_entries | INSERT |
| generateSettlementEntry | erp_journal_entry_lines | INSERT |
| generateSettlementEntry | erp_hr_journal_entries | INSERT |
| generateSSContributionEntry | erp_journal_entries | INSERT |
| generateSSContributionEntry | erp_journal_entry_lines | INSERT |
| generateBatchPayrollEntries | erp_journal_entries | INSERT |
| generateBatchPayrollEntries | erp_journal_entry_lines | INSERT |
| generateBatchPayrollEntries | erp_hr_journal_entries | INSERT |
| reverseEntry | erp_journal_entries | SELECT, INSERT, UPDATE |
| reverseEntry | erp_journal_entry_lines | INSERT |
| validateEntry | erp_journal_entries | SELECT |
| getAccountingStatus | erp_hr_journal_entries | SELECT |

**Residual adminClient**: 0  
**Risk**: Low — tables have company-scoped RLS policies

---

### 4. hr-regulatory-reporting (581→~570 lines) — MAJOR

**Auth pattern BEFORE**:
```
- `createClient(url, SERVICE_ROLE_KEY)` as main `supabase` client
- `getUser(token)` via throwaway anon client
- Manual membership check on service_role client
- ALL ~20+ data operations on service_role client
```

**Auth pattern AFTER**:
```
- `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- `userClient` aliased as `supabase` for minimal diff
- All data operations now go through RLS
```

**Operations migrated to userClient**:
- SELECTs on: erp_hr_employees, erp_hr_pay_equity_analyses, erp_hr_fairness_metrics, erp_hr_payrolls, erp_hr_masking_rules, erp_hr_sod_rules, erp_hr_data_access_log, erp_hr_ai_model_registry, erp_hr_ai_bias_audits, erp_hr_compliance_frameworks, erp_hr_compliance_checklist, erp_hr_legal_contracts, erp_hr_cnae_profiles, erp_hr_report_templates, erp_hr_generated_reports, erp_hr_regulatory_report_reviews, erp_hr_regulatory_report_evidence
- INSERTs on: erp_hr_generated_reports, erp_hr_regulatory_report_evidence, erp_hr_regulatory_report_reviews
- UPDATEs on: erp_hr_generated_reports
- UPSERTs on: erp_hr_report_templates

**Residual adminClient**: 0  
**Risk**: Low — all tables have company-scoped RLS

---

### 5. hr-reporting-engine (361→~350 lines) — MAJOR

**Auth pattern BEFORE**:
```
- `createClient(url, SERVICE_ROLE_KEY)` as main `supabase` client
- `getUser(token)` via throwaway anon client
- Manual membership check on service_role client
- ALL ~15+ data operations on service_role client
```

**Auth pattern AFTER**:
```
- `validateTenantAccess(req, company_id)` + `isAuthError()` guard
- `userClient` aliased as `supabase` for minimal diff
- All data operations now go through RLS
```

**Operations migrated to userClient**:
- SELECTs on: erp_hr_report_templates, erp_hr_generated_reports, erp_hr_pay_equity_analyses, erp_hr_fairness_metrics, erp_hr_workforce_plans, erp_hr_employees, erp_hr_legal_contracts, erp_hr_compliance_frameworks, erp_hr_masking_rules, erp_hr_sod_rules, erp_hr_report_schedules
- INSERTs on: erp_hr_generated_reports, erp_hr_report_schedules
- UPDATEs on: erp_hr_generated_reports, erp_hr_report_schedules
- UPSERTs on: erp_hr_report_templates

**Residual adminClient**: 0  
**Risk**: Low — all tables have company-scoped RLS

---

## Post-Batch 1 State

```text
Function                        | adminClient remaining | Status
────────────────────────────────┼───────────────────────┼─────────────────
erp-hr-payroll-recalculation    | 0                     | Clean (S6.3B)
hr-compliance-automation        | 0                     | Clean (S6.3B)
erp-hr-accounting-bridge        | 0                     | Clean (S6.3B)
hr-regulatory-reporting         | 0                     | Clean (S6.3B)
hr-reporting-engine             | 0                     | Clean (S6.3B)
```

## Totals

- **5/5 functions migrated** to `validateTenantAccess()`
- **~50+ service_role data ops eliminated** across 3 major functions
- **0 exceptions** — no residual adminClient needed
- **0 regressions expected** — all tables have existing RLS policies
- **Standard-gated functions total**: 24 (S6.2B) + 5 (S6.3B) = **29**
- **Remaining without standard gate**: 29

---

## Next Steps

- **Batch 2**: AI Agents with company data (erp-hr-ai-agent, erp-hr-analytics-agent, etc.)
- **Batch 3**: Core HR operations (erp-hr-talent-skills-agent, etc.)
- **Batch 4**: Wellbeing/ESG/sensitive data
- **Batch 5**: Orchestrators and bridges
- **Batch 6**: Specialized modules
