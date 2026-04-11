# G1.1 — AI Agents Remaining Backlog for G1.2

## Date: 2026-04-11

## Summary

After G1.1 hardening, the following items remain as backlog for future phases.

---

## Priority 1 — Fiscal Supervisor (Deferred)

| Item | Current State | Rationale for Deferral |
|---|---|---|
| Fiscal Supervisor | No supervisor; single `erp-fiscal-ai-agent` | Requires designing domain classification (IVA vs IS vs retenciones vs internacional), sub-agent routing, escalation paths. Disproportionate for G1.1. |
| Recommended approach | — | Model after `hr-multiagent-supervisor`: classifier prompt → route to specialized sub-agents (vat-agent, corporate-tax-agent, retention-agent). Requires 3-4 new edge functions. |

## Priority 2 — H2.0 Adoption in Other HR Agents

| Agent | Current State | Action Needed |
|---|---|---|
| `erp-hr-offboarding-agent` | Selects `id, first_name, last_name, position` | Add `national_id, birth_date, weekly_hours, category, country_code` |
| `erp-hr-onboarding-agent` | AI-only, no employee DB reads | Should consume master for onboarding plan generation |
| `erp-hr-recruitment-agent` | No employee master consumption | Could use category/position for matching |
| `erp-hr-compensation-suite` | Uses salary data only | Should consume `weekly_hours`, `category`, `contribution_group` |

## Priority 3 — Prompt Refresh for Non-Critical Agents

| Agent | Missing References |
|---|---|
| `erp-hr-performance-agent` | Stock options vesting in performance context |
| `erp-hr-training-agent` | Movilidad internacional training requirements |
| `erp-hr-wellbeing-agent` | Expatriate wellbeing considerations |
| `erp-hr-contingent-workforce` | International contractor regulations |

## Priority 4 — KPI/Panel Alignment

| Panel/Dashboard | Current Issue | Fix Needed |
|---|---|---|
| AI Center cost panel | Uses hardcoded cost constants | Calibrate per actual model pricing (see H1.3E backlog) |
| Audit Center agent hierarchy | Shows generic counts | Could show real supervisor→agent tree from registry |
| Fiscal dashboard AI metrics | No AI metrics shown | Add fiscal agent invocation stats |

## Priority 5 — Additional Auth Patterns

| Agent | Current Pattern | Consideration |
|---|---|---|
| CRM agents (`crm-agent-ai`, `crm-module-agent`) | Not audited in G1.1 | Should be audited in CRM hardening phase |
| Academia agents (10+) | Not audited | Lower priority — different domain |
| Revenue/Pipeline agents (4) | Not audited | Should follow CRM hardening |

## Priority 6 — compliance-ia Real Data Integration

| Item | Current State | Required |
|---|---|---|
| `get_summary` | Returns empty + `no_data_available` | Real compliance engine or table with per-regulation scores |
| `get_alerts` | Returns empty + `no_data_available` | Real compliance alert generation from audit data |
| Full report | Returns empty + `no_data_available` | Real compliance reporting engine |

---

## Completed in G1.1

| Category | Count | Details |
|---|---|---|
| Auth hardening | 9 functions | All 9 unprotected functions now gated |
| JWT forwarding | 1 supervisor | obelixia-supervisor forwards user JWT |
| Mock removal | 1 function | compliance-ia honestly degraded |
| H2.0 adoption | 1 function | erp-hr-ai-agent (SS contributions query + chat prompt) |
| Prompt refresh | 2 functions | erp-fiscal-ai-agent + erp-hr-ai-agent |
| Honest degradation | 2 functions | obelixia-compliance-audit + galia-smart-audit |

## Decision Point

G1.1 covers all critical security gaps. G1.2 should prioritize:
1. Fiscal supervisor design (if fiscal module is actively used)
2. H2.0 adoption in offboarding/onboarding agents (quick wins)
3. CRM agent audit (separate track)
