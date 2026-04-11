# H1.3E — Audit + AI Center Hardening Report

## Date: 2026-04-11

## Summary
Applied honesty badges, KPI labels, one real DB fix, and cosmetic button disabling across 7 files in Audit Center and AI Center.

---

## BEFORE / AFTER

| Element | File | Before | After |
|---------|------|--------|-------|
| ComplianceMatrixPanel | `ComplianceMatrixPanel.tsx` | 8 regulations with scores appear operational | Badge "Datos de ejemplo" + "(demo)" on score label |
| ImprovementsTracker | `ImprovementsTracker.tsx` | 5 sample improvements appear operational | Badge "Datos de ejemplo" on header |
| BlockchainTrailPanel | `BlockchainTrailPanel.tsx` | Shows "100% integrity" green checkmark, active "Verificar integridad" button | N/A + "Sin verificaciones reales", button disabled "(próximamente)" |
| KPI: Revisiones pendientes | `AuditDashboardHub.tsx` | Unlabeled estimate | Label "(est.)" |
| KPI: Score compliance | `AuditDashboardHub.tsx` | Unlabeled estimate | Label "(est.)" |
| KPI: Score riesgo | `AuditDashboardHub.tsx` | Unlabeled estimate | Label "(est.)" |
| KPI: Blockchain entries | `AuditDashboardHub.tsx` | Unlabeled hardcoded 0 | Label "(est.)" |
| KPI: activeAgents | `useUnifiedAudit.ts` | Hardcoded `8` | **Real count** from `erp_ai_agents_registry` WHERE status='active' |
| Agent hierarchy "5 agentes" | `AuditDashboardHub.tsx` | Hardcoded "5 agentes" | Real count from agents array filtered by code prefix |
| Agent hierarchy "3 agentes" | `AuditDashboardHub.tsx` | Hardcoded "3 agentes" | Real count from agents array filtered by code prefix |
| "Nuevo Envío" button | `ExternalAuditPanel.tsx` | Cosmetic (no handler) | Disabled + "(próximamente)" |
| AI Cost: Gasto Total | `AICostEconomicsPanel.tsx` | Unlabeled estimate | "(est.)" label |
| AI Cost: Ahorro vs Manual | `AICostEconomicsPanel.tsx` | Unlabeled estimate | "(est.)" label |
| AI Cost: Coste/Llamada | `AICostEconomicsPanel.tsx` | Unlabeled estimate | "(est.)" label |
| AI Cost: Presupuesto Mensual | `AICostEconomicsPanel.tsx` | Unlabeled hardcoded | "(est.)" + "Estimado" badge + italic disclaimer |
| AI Cost: ROI badges | `AICostEconomicsPanel.tsx` | "ROI Xx" | "ROI Xx (est.)" |
| AI Cost: Header | `AICostEconomicsPanel.tsx` | No estimation indicator | Badge "Estimado" |

---

## Elements Corrected

### Passed to Real Data
- `activeAgents` KPI → real count from `erp_ai_agents_registry`
- Agent hierarchy counts → real from agents array (filtered by code prefix)

### Labeled as Estimated (est.)
- `pendingReviews` — formula: `criticalCount - 30%`
- `complianceScore` — formula: `100 - criticalCount * 2`
- `riskScore` — formula: `20 + criticalCount * 5`
- `blockchainEntries` — always 0
- AI Cost: all cost KPIs (use hardcoded constants: `COST_PER_1K_TOKENS`, `ESTIMATED_TOKENS_PER_CALL`, `MANUAL_COST_PER_TASK`)
- AI Budget: monthly budget hardcoded at 500€

### Labeled as Demo (Datos de ejemplo)
- ComplianceMatrixPanel — 8 hardcoded regulations
- ImprovementsTracker — 5 hardcoded improvements
- BlockchainTrailPanel — static zeros, no real blockchain integration

### Cosmetic Buttons Disabled
- "Verificar integridad" → disabled + "(próximamente)"
- "Nuevo Envío" → disabled + "(próximamente)"

---

## Audit/AI Real vs Derived vs Estimated vs Demo Map

### Audit Center

| Element | Classification | Source |
|---------|---------------|--------|
| totalEvents | **Real** | Aggregated from 6 audit tables |
| criticalAlerts | **Real** | Filtered from real events |
| resolvedToday | **Real** | Filtered from real events |
| activeAgents | **Real** | `erp_ai_agents_registry` count |
| pendingReviews | **Estimated** | Formula from criticalAlerts |
| complianceScore | **Estimated** | Formula from criticalAlerts |
| riskScore | **Estimated** | Formula from criticalAlerts |
| blockchainEntries | **Estimated** | Always 0, no blockchain |
| ComplianceMatrix | **Demo** | Hardcoded array |
| ImprovementsTracker | **Demo** | Hardcoded array |
| BlockchainTrail | **Demo** | Static values |
| InternalAuditPanel | **Real** | Unified events + sessions |
| ExternalAuditPanel | **Real** | `audit_regulatory_submissions` |
| Risk Map | **Derived** | Computed from real events |
| Agent hierarchy counts | **Real** | From agents array |
| Agent stats (success rate, etc.) | **Real** | From `useAuditAgents` hook |

### AI Center

| Element | Classification | Source |
|---------|---------------|--------|
| Agent registry | **Real** | `erp_ai_agents_registry` |
| Agent invocations | **Real** | `erp_ai_agent_invocations` |
| Approval queue | **Real** | `erp_ai_approval_queue` |
| Observability metrics | **Derived** | Computed from real invocations |
| Cost per agent | **Estimated** | Real invocations × hardcoded constants |
| Monthly budget | **Estimated** | Hardcoded 500€ |
| ROI | **Estimated** | Estimated cost vs manual equivalent |
| Governance profiles | **Derived** | From real agent config |
| Alerts | **Derived** | Rules applied to real data |
| Orchestration | **Real** | From real agent data |
