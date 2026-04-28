# HR / Payroll / Legal — Security Audit Result

**Generated:** 2026-04-28 09:48:46 UTC  
**Source of truth:** `docs/qa/HR_CURRENT_STATE_VERIFICATION.md`  
**Status:** 🟢 GREEN

> Read-only static auditor. No edge function was modified by this run.
> Hard guards: `persisted_priority_apply` remains **OFF**, C3B3C2 remains **BLOCKED**.
> No TGSS/SEPE/AEAT/SILTRA/CRA/RLC/RNT/Contrat@/Certific@/DELT@ output is treated as official without credential + real/UAT submission + official response + archived evidence.

## 1. Summary

| Metric | Value |
|---|---:|
| In-scope functions | 68 |
| validateTenantAccess | 51 |
| validateAuth | 5 |
| validateCronOrServiceAuth | 0 |
| documented_exception | 12 |
| 🔴 unsafe | 0 |
| FAIL findings | 0 |
| WARN findings | 3 |

## 2. Per-function classification

| Function | Category | SR uses | Bearer SR downstream | Admin→tenant tables |
|---|---|---:|:---:|---|
| `ai-legal-validator` | 🟢 auth | 0 | — | — |
| `erp-hr-accounting-bridge` | 🟢 tenant | 0 | — | — |
| `erp-hr-agreement-updater` | 🟡 exception | 5 | — | supabase.from('erp_hr_collective_agreements'), supabase.from('erp_hr_agreement_salary_tables') |
| `erp-hr-ai-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-analytics-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-analytics-intelligence` | 🟢 tenant | 0 | — | — |
| `erp-hr-autonomous-copilot` | 🟢 tenant | 0 | — | — |
| `erp-hr-clm-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-compensation-suite` | 🟢 tenant | 0 | — | — |
| `erp-hr-compliance-enterprise` | 🟡 exception | 0 | — | adminClient.from('erp_hr_compliance_policies'), adminClient.from('erp_hr_compliance_audits'), adminClient.from('erp_hr_compliance_incidents'), adminClient.from('erp_hr_compliance_training'), adminClient.from('erp_hr_compliance_risk_assessments'), adminClient.from('erp_hr_compliance_kpis') |
| `erp-hr-compliance-monitor` | 🟢 tenant | 0 | — | — |
| `erp-hr-contingent-workforce` | 🟢 tenant | 0 | — | — |
| `erp-hr-copilot-twin` | 🟢 tenant | 0 | — | — |
| `erp-hr-credentials-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-enterprise-admin` | 🟡 exception | 0 | — | adminClient.from('erp_hr_legal_entities'), adminClient.from('erp_hr_work_centers'), adminClient.from('erp_hr_org_units'), adminClient.from('erp_hr_work_calendars'), adminClient.from('erp_hr_calendar_entries'), adminClient.from('erp_hr_enterprise_roles'), adminClient.from('erp_hr_enterprise_permissions'), adminClient.from('erp_hr_role_permissions') |
| `erp-hr-esg-selfservice` | 🟢 tenant | 0 | — | — |
| `erp-hr-executive-analytics` | 🟢 tenant | 0 | — | — |
| `erp-hr-industry-templates` | 🟢 tenant | 0 | — | — |
| `erp-hr-innovation-discovery` | 🟡 exception | 0 | — | adminClient.from('erp_hr_innovation_features'), adminClient.from('erp_hr_innovation_logs') |
| `erp-hr-offboarding-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-onboarding-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-payroll-recalculation` | 🟢 tenant | 0 | — | — |
| `erp-hr-people-analytics-ai` | 🟢 tenant | 0 | — | — |
| `erp-hr-performance-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-premium-intelligence` | 🟢 tenant | 0 | — | — |
| `erp-hr-recruitment-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-regulatory-watch` | 🟢 tenant | 0 | — | — |
| `erp-hr-security-governance` | 🟢 tenant | 0 | — | — |
| `erp-hr-seed-demo-data` | 🟡 exception | 1 | — | — |
| `erp-hr-seed-demo-master` | 🟡 exception | 1 | — | — |
| `erp-hr-smart-contracts` | 🟢 tenant | 0 | — | — |
| `erp-hr-strategic-planning` | 🟢 tenant | 0 | — | — |
| `erp-hr-talent-intelligence` | 🟢 tenant | 0 | — | — |
| `erp-hr-talent-skills-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-total-rewards` | 🟢 tenant | 0 | — | — |
| `erp-hr-training-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-wellbeing-agent` | 🟢 tenant | 0 | — | — |
| `erp-hr-wellbeing-enterprise` | 🟢 tenant | 0 | — | — |
| `erp-hr-whistleblower-agent` | 🟡 exception | 1 | — | adminClient.from('erp_hr_whistleblower_reports') |
| `erp-hr-workflow-engine` | 🟢 tenant | 0 | — | — |
| `erp-legal-knowledge-loader` | 🟡 exception | 1 | — | — |
| `erp-legal-spend` | 🟢 tenant | 0 | — | — |
| `hr-analytics-bi` | 🟢 tenant | 0 | — | — |
| `hr-board-pack` | 🟢 tenant | 0 | — | — |
| `hr-compliance-automation` | 🟢 tenant | 0 | — | — |
| `hr-country-registry` | 🟢 tenant | 0 | — | — |
| `hr-enterprise-integrations` | 🟢 tenant | 0 | — | — |
| `hr-labor-copilot` | 🟡 exception | 1 | — | adminClient.from('erp_hr_advisory_assignments') |
| `hr-multiagent-supervisor` | 🟢 tenant | 0 | — | — |
| `hr-orchestration-engine` | 🟢 tenant | 0 | — | — |
| `hr-premium-api` | 🟢 tenant | 0 | — | — |
| `hr-regulatory-reporting` | 🟢 tenant | 0 | — | — |
| `hr-reporting-engine` | 🟢 tenant | 0 | — | — |
| `hr-workforce-simulation` | 🟡 exception | 1 | — | adminClient.from('erp_hr_advisor_assignments') |
| `legal-action-router` | 🟢 tenant | 0 | — | — |
| `legal-ai-advisor` | 🟡 exception | 1 | — | — |
| `legal-autonomous-copilot` | 🟢 auth | 0 | — | — |
| `legal-entity-management` | 🟢 auth | 0 | — | — |
| `legal-knowledge-sync` | 🟡 exception | 1 | — | — |
| `legal-multiagent-supervisor` | 🟢 tenant | 0 | — | — |
| `legal-predictive-analytics` | 🟢 auth | 0 | — | — |
| `legal-validation-gateway-enhanced` | 🟢 auth | 0 | — | — |
| `payroll-calculation-engine` | 🟢 tenant | 0 | — | — |
| `payroll-cross-module-bridge` | 🟢 tenant | 0 | — | — |
| `payroll-file-generator` | 🟢 tenant | 0 | — | — |
| `payroll-irpf-engine` | 🟢 tenant | 0 | — | — |
| `payroll-it-engine` | 🟢 tenant | 0 | — | — |
| `payroll-supervisor` | 🟢 tenant | 0 | — | — |

## 3. Findings

| Severity | Function | Rule | Detail |
|---|---|---|---|
| WARN | `erp-hr-compliance-enterprise` | exception-without-sr | Listed as documented exception but no SERVICE_ROLE_KEY usage detected. Consider removing from exceptions list. |
| WARN | `erp-hr-enterprise-admin` | exception-without-sr | Listed as documented exception but no SERVICE_ROLE_KEY usage detected. Consider removing from exceptions list. |
| WARN | `erp-hr-innovation-discovery` | exception-without-sr | Listed as documented exception but no SERVICE_ROLE_KEY usage detected. Consider removing from exceptions list. |

## 4. RLS — companion check

Permissive policies (`USING(true)` / `WITH CHECK(true)`) on `erp_hr_*` write operations are NOT covered by this static script.
Run the SQL companion against the live database:

```bash
psql "$DATABASE_URL" -f scripts/audit/hr-rls-policy-audit.sql
```

Specifically verify that `erp_hr_doc_action_queue` policies isolate by `employee_id → company_id` (no `true`).

## 5. Hard guards confirmed

- ❌ Script does NOT toggle `PAYROLL_EFFECTIVE_CASUISTICA_MODE` (must remain `persisted_priority_preview`).
- ❌ Script does NOT activate `persisted_priority_apply` (must remain **OFF**).
- ❌ C3B3C2 remains **BLOCKED** until manual validation pack is signed.
- ❌ No HR/Payroll/Legal artifact is "official" without credential + real/UAT submission + official response + evidence archived in HR immutable ledger.
