# H1.3E — Audit + AI Center Remaining Backlog

## Date: 2026-04-11

## Summary
After H1.3E hardening, the following items remain as backlog for future phases.

---

## Priority 1 — Connect to Real Data (when source is built)

| Item | Current State | Required |
|------|--------------|----------|
| ComplianceMatrixPanel | Hardcoded 8 regulations with fake scores | Real compliance engine or table `erp_compliance_checks` with per-regulation scores |
| ImprovementsTracker | Hardcoded 5 sample improvements | Real findings/actions table (e.g., `erp_audit_findings` or `erp_audit_improvements`) |
| BlockchainTrailPanel | Static zeros, no anchoring | Real blockchain anchoring service + `erp_blockchain_entries` table |
| pendingReviews KPI | Formula estimate | Real reviews queue table |
| complianceScore KPI | Formula estimate | Real compliance scoring engine |
| riskScore KPI | Formula estimate | Real risk assessment engine |

## Priority 2 — Calibrate Constants (AI Center)

| Item | Current Value | Action Needed |
|------|--------------|---------------|
| `COST_PER_1K_TOKENS` | 0.002€ | Calibrate per actual model pricing |
| `ESTIMATED_TOKENS_PER_CALL` | 800 | Replace with real token tracking from invocations metadata |
| `MANUAL_COST_PER_TASK` | 12€ | Validate against actual operational costs |
| `monthlyBudget` | 500€ | Make configurable per company/admin settings |

## Priority 3 — Enable Disabled Buttons

| Button | Panel | Condition to Enable |
|--------|-------|-------------------|
| "Verificar integridad" | BlockchainTrailPanel | Blockchain anchoring service operational |
| "Nuevo Envío" | ExternalAuditPanel | Submission workflow + form implemented |

## Priority 4 — Enhanced Transparency

| Item | Suggestion |
|------|-----------|
| Risk Map domains | Currently uses fixed list `['ERP', 'RRHH', 'IA', 'Compliance', 'General']` — could pull from real module registry |
| Agent hierarchy visualization | Could show real supervisor→agent tree from agent registry relationships |
| Cost trend chart | Invocation counts are real; cost overlay is estimated — could add visual indicator |

---

## Modules Fully Audited (H1.3 series)

| Module | Phase | Status |
|--------|-------|--------|
| RRHH | H1.3 | ✅ Hardened |
| Fiscal | H1.3B | ✅ Hardened |
| Legal/Jurídico | H1.3B | ✅ Hardened |
| Audit Center | H1.3E | ✅ Hardened |
| AI Center | H1.3E | ✅ Hardened |

## Decision Point
All 5 major modules have been audited and hardened. A transversal H1.3F could cover remaining modules (Treasury, Banking, Procurement, etc.) or the focus can shift to building real data sources for the estimated/demo elements identified across all modules.
