

# Plan: S1.4 — CORS Restriction for HR Edge Functions

## Current State

- **14 functions** already use `getSecureCorsHeaders(req)` (the S1.3 batch + `payroll-cross-module-bridge`, `payroll-file-generator`, `payroll-irpf-engine`)
- **44 functions** still use hardcoded `'Access-Control-Allow-Origin': '*'`
- Total HR functions: **58**

## Allowlist (already configured in `getSecureCorsHeaders`)

| Origin | Purpose |
|--------|---------|
| `https://obelixia.lovable.app` | Published app |
| `https://app.obelixia.com` | Production domain |
| `ALLOWED_ORIGIN` env var | Custom override |
| `*.lovable.app` (regex) | Preview/sandbox domains |
| `*.lovableproject.com` (regex) | Legacy preview domains |

**Missing**: `http://localhost:*` for local development. Will add a regex match for `http://localhost:\d+` to the helper.

## Changes

### 1. Update `getSecureCorsHeaders` in `_shared/edge-function-template.ts`

Add localhost support:
```typescript
const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
```
Add to the condition so local dev is never blocked.

### 2. Migrate 44 remaining HR functions

For each function, the change is mechanical:
1. Add import: `import { getSecureCorsHeaders } from '../_shared/edge-function-template.ts';`
2. Remove the hardcoded `const corsHeaders = { ... }` block
3. Add `const corsHeaders = getSecureCorsHeaders(req);` as the first line inside `serve(async (req) => {`
4. For the OPTIONS handler: ensure it uses the same dynamic `corsHeaders`

No business logic, API contracts, or response shapes change.

### 3. Functions to migrate (44)

**erp-hr-* (32):** `accounting-bridge`, `agreement-updater`, `ai-agent`, `analytics-agent`, `analytics-intelligence`, `compensation-suite`, `compliance-enterprise`, `contingent-workforce`, `credentials-agent`, `enterprise-admin`, `esg-selfservice`, `executive-analytics`, `industry-templates`, `innovation-discovery`, `offboarding-agent`, `onboarding-agent`, `payroll-recalculation`, `people-analytics-ai`, `performance-agent`, `recruitment-agent`, `regulatory-watch`, `seed-demo-data`, `seed-demo-master`, `smart-contracts`, `talent-intelligence`, `talent-skills-agent`, `total-rewards`, `training-agent`, `wellbeing-agent`, `wellbeing-enterprise`, `whistleblower-agent`, `workflow-engine`

**hr-* (10):** `analytics-bi`, `board-pack`, `compliance-automation`, `country-registry`, `enterprise-integrations`, `labor-copilot`, `multiagent-supervisor`, `orchestration-engine`, `premium-api`, `regulatory-reporting`, `reporting-engine`, `workforce-simulation`

### What stays unchanged

- All non-HR functions (keep wildcard CORS)
- All business logic in every function
- The 14 functions already using `getSecureCorsHeaders`
- API contracts and response shapes

### Implementation approach

Process in batches of ~10 functions per edit pass. Each is a simple find-and-replace pattern. Deploy all at once after migration.

## Verification

- Test from preview domain (should work)
- Test from localhost (should work with new regex)
- Test from unauthorized origin (should be rejected or get fallback origin)

