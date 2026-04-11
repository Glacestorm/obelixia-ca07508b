# G1.1 — AI Agents & Supervisors Hardening Report

## Date: 2026-04-11

## Summary

Hardened 9 unprotected edge functions with auth gates, fixed JWT forwarding in obelixia-supervisor, removed mock data from compliance-ia, updated HR agent with H2.0 fields, and refreshed prompts for fiscal and HR agents.

---

## BEFORE / AFTER

### 1. Auth Hardening (9 functions)

| Function | Before | After | Pattern |
|---|---|---|---|
| `compliance-ia` | No auth | `validateTenantAccess` + company_id required | Tenant-scoped |
| `erp-fiscal-ai-agent` | `SERVICE_ROLE_KEY` only | `validateTenantAccess` + `userClient` for reads, `adminClient` for alerts/logs | Tenant-scoped |
| `erp-agent-ai` | No auth | `validateAuth` (JWT only) | Auth-only |
| `logistics-ai-agent` | No auth | `validateAuth` (JWT only) | Auth-only |
| `erp-module-agent` | No auth | `validateAuth` (JWT only) | Auth-only |
| `obelixia-compliance-audit` | No auth | `validateAuth` (JWT only) | Auth-only |
| `galia-smart-audit` | No auth | `validateAuth` (JWT only) | Auth-only |
| `security-intelligence` | No auth | `validateAuth` (JWT only) | Auth-only |
| `obelixia-supervisor` | `SERVICE_ROLE_KEY` + weak `getUser` | `validateTenantAccess` + JWT forwarding | Tenant-scoped + forwarding |

### 2. JWT Forwarding (obelixia-supervisor)

| Location | Before | After |
|---|---|---|
| HR delegation (hr_only) | `Bearer ${supabaseKey}` | `userAuthHeader` (user JWT) |
| Legal delegation (legal_only) | `Bearer ${supabaseKey}` | `userAuthHeader` (user JWT) |
| Cross-domain coordination (parallel) | `Bearer ${supabaseKey}` | `userAuthHeader` (user JWT) |
| Regulatory cross-domain (parallel) | `Bearer ${supabaseKey}` | `userAuthHeader` (user JWT) |
| Invocation logging | `supabase` (SERVICE_ROLE) | `supabase` (SERVICE_ROLE) — **kept** (legitimate: audit log) |

### 3. Mock Data Removal (compliance-ia)

| Function | Before | After |
|---|---|---|
| `generateMockComplianceSummary` | Returns hardcoded 8 regulations with fake scores | Returns `{ data: [], source: 'no_data_available', mode: 'requires_configuration' }` |
| `generateMockComplianceAlerts` | Returns 3 hardcoded alerts | Returns `{ data: [], source: 'no_data_available' }` |
| `generateMockFullReport` | Returns full fake compliance report | Returns `{ source: 'no_data_available', mode: 'requires_configuration' }` |
| `run_check` action | Routed to mock | Routed to real AI analysis |
| `update_check` action | Cosmetic stub | Returns `{ source: 'estimated', mode: 'pending_implementation' }` |
| `generate_remediation` | Cosmetic stub | Returns `{ source: 'estimated', mode: 'pending_implementation' }` |

### 4. Honest Degradation (audit agents)

| Function | Before | After |
|---|---|---|
| `obelixia-compliance-audit` audit trail | Hardcoded 3-entry array | `{ source: 'no_data_available', note: 'Requiere configuración del módulo de auditoría' }` |
| `obelixia-compliance-audit` stats | Hardcoded `{ total: 0, passed: 0 }` | Same but with `source: 'no_data_available'` marker |
| `galia-smart-audit` stats | Hardcoded zeros | `{ source: 'no_data_available' }` marker |

### 5. H2.0/H2.1 Field Adoption (erp-hr-ai-agent)

| Query | Before | After |
|---|---|---|
| `calculate_ss_contributions` employee select | `id, first_name, last_name, social_security_number` | `+ national_id, birth_date, position, weekly_hours, category, country_code` |
| Chat system prompt | No mention of employee master | Full section on H2.0 fields: DNI/NIE, birth_date, weekly_hours, category, IBAN, extensions |
| Chat prompt: movilidad internacional | Not mentioned | Dedicated section |
| Chat prompt: stock options | Not mentioned | Dedicated section |
| Chat prompt: preflight cockpit | Not mentioned | Dedicated section |
| Chat prompt: bank account privacy | Not addressed | Rule: "No exponer datos bancarios (IBAN) salvo en contexto de nómina/pagos" |

### 6. Prompt/Mission Refresh

#### erp-fiscal-ai-agent
| Element | Before | After |
|---|---|---|
| SII mention | Inline in list | Dedicated "Modelos Fiscales" section with SII books |
| Intrastat mention | Inline in list | Explicit in modelos + compliance checks |
| Modelos fiscales | Not listed | Full list: 303, 390, 111/190, 200/202, 349, 347, 180, 193, 296 |
| Jurisdictions | Listed generically | Structured: España (regímenes), UE (directivas), Internacional |
| Official filing caveat | Not mentioned | "Requiere firma electrónica y envío por sede AEAT (funcionalidad pendiente)" |

#### erp-hr-ai-agent
| Element | Before | After |
|---|---|---|
| Employee master awareness | None | Full H2.0 field listing in prompt |
| Movilidad internacional | Not mentioned | Dedicated section |
| Stock options/equity | Not mentioned | Dedicated section |
| Preflight cockpit | Not mentioned | Dedicated section |
| Capabilities list | 9 items | 10 items (+ maestro consulta) |
| IBAN privacy | Not addressed | Explicit rule |

---

## Secured / Degraded Honestly / Remaining G1.2 Backlog

### ✅ Secured (auth hardened)
- `compliance-ia` — validateTenantAccess
- `erp-fiscal-ai-agent` — validateTenantAccess + dual client
- `erp-agent-ai` — validateAuth
- `logistics-ai-agent` — validateAuth
- `erp-module-agent` — validateAuth
- `obelixia-compliance-audit` — validateAuth
- `galia-smart-audit` — validateAuth
- `security-intelligence` — validateAuth
- `obelixia-supervisor` — validateTenantAccess + JWT forwarding

### ✅ Degraded Honestly
- `compliance-ia` — all mock functions replaced with `source: 'no_data_available'`
- `obelixia-compliance-audit` — audit trail and stats marked as no_data_available
- `galia-smart-audit` — stats marked as no_data_available

### ✅ Mission Aligned
- `erp-fiscal-ai-agent` — prompt refreshed with SII, Intrastat, modelos, jurisdictions
- `erp-hr-ai-agent` — H2.0 fields adopted + prompt refreshed with movilidad, stock options, preflight
- `obelixia-supervisor` — JWT forwarding to downstream supervisors (tenant isolation preserved)

### 📋 Remaining G1.2 Backlog
See `docs/G1_ai_agents_remaining_backlog.md`
