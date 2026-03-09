

## Plan: Premium Roadmap Implementation + Fixes

### Current State
- **ExternalIntegrationsPanel**: Credential buttons are `disabled` -- need to make them functional with a configuration dialog
- **Portal access**: Already has "open in new tab" via Eye icon per token, but no dedicated tab in the energy navigation
- **Audit log**: Basic action-level logging exists (`useEnergyAuditLog`), needs extension for section views, read time, portal access tracking
- **Notifications**: Exist but only in-app, no email/WhatsApp

### Implementation Plan (5 tasks)

#### Task 1: Fix Integration Credentials Configuration
Make the "Configurar credenciales" buttons functional in `ExternalIntegrationsPanel.tsx`:
- Add a Dialog for each integration (Datadis, e-sios REE) with fields for API key, username, NIF
- On save, store credentials via `supabase.functions.invoke('external-integrations', { action: 'save_credentials', ... })`
- Update status badge to reflect configured state
- Add "Test connection" button per integration

#### Task 2: Add Portal Tab in Navigation + Portal Preview Page
- Add a new nav item "Portal Cliente" under a new category or existing "Gestión" in `ElectricalNavigationMenu.tsx`
- Create `EnergyPortalTab.tsx` component that:
  - Lists all portal tokens across cases (reuse `useEnergyClientPortal`)
  - Shows portal link with copy/open buttons
  - Embeds an iframe preview of the portal (sandboxed)
  - Allows generating new tokens from here

#### Task 3: Premium Alertas Proactivas (Prepared)
- Create `EnergyAlertPreferencesPanel.tsx` with UI for:
  - Per-client alert channel selection (email, WhatsApp, in-app)
  - Alert types: contract expiry, price spike, savings opportunity, regulation change
  - Frequency: immediate, daily digest, weekly
- Create DB table `energy_alert_preferences` via migration
- Create edge function `energy-alerts` stub that:
  - Accepts `send_alert` action
  - Logs the alert attempt
  - Returns "integration pending" for email/WhatsApp channels
  - In-app channel works immediately via `energy_notifications` table

#### Task 4: Extended Audit (Section-level tracking)
- Extend `useEnergyAuditLog` with new actions: `portal_section_viewed`, `portal_document_downloaded`, `portal_time_spent`
- Add `AUDIT_ACTIONS` entries for new event types
- In `ClientPortalView.tsx`, add `useEffect` hooks per tab that log section views and track time on each tab
- Add a new "Auditoría Portal" sub-section in the admin case detail showing portal access analytics

#### Task 5: Scheduled Reports (Prepared) + Benchmarking Placeholder
- Create `EnergyScheduledReportsPanel.tsx` with UI for:
  - Report type selection (executive summary, savings report, contract status)
  - Format (PDF/CSV)
  - Schedule (weekly, monthly, quarterly)
  - Recipients list
- Store config in `energy_report_schedules` table
- Create edge function `energy-scheduled-reports` stub that generates and stores reports (cron trigger TBD)
- Add benchmarking placeholder card in Executive Dashboard showing "Sector benchmark coming soon" with mock comparison data

### Files to Create
1. `src/components/erp/electrical/EnergyPortalTab.tsx` - Portal management tab
2. `src/components/erp/electrical/EnergyAlertPreferencesPanel.tsx` - Alert preferences UI
3. `src/components/erp/electrical/EnergyScheduledReportsPanel.tsx` - Scheduled reports UI
4. `supabase/functions/energy-alerts/index.ts` - Alert dispatch stub

### Files to Modify
1. `src/components/erp/electrical/ExternalIntegrationsPanel.tsx` - Add credential config dialogs
2. `src/components/erp/electrical/ElectricalNavigationMenu.tsx` - Add Portal + Premium tabs
3. `src/components/erp/electrical/ElectricalConsultingModule.tsx` - Wire new components
4. `src/components/erp/electrical/ClientPortalView.tsx` - Add section-level audit tracking
5. `src/hooks/erp/useEnergyAuditLog.ts` - Add new audit action types
6. `src/components/erp/electrical/ElectricalExecutiveDashboard.tsx` - Add benchmark placeholder

### DB Migrations
1. `energy_alert_preferences` table (user_id, company_id, channel, alert_types, frequency)
2. `energy_report_schedules` table (company_id, report_type, format, schedule, recipients)

### What Becomes Fully Functional
- Integration credential configuration (Datadis, e-sios)
- Portal tab with preview iframe and token management
- Extended audit with portal section tracking
- Alert preferences UI (in-app channel works, email/WhatsApp prepared)
- Scheduled reports UI (configuration works, actual dispatch prepared)

### What Remains External-Dependent
- Email delivery: needs SendGrid/Resend connector
- WhatsApp: needs Twilio/WhatsApp Business API
- Cron jobs: needs pg_cron or external scheduler for report dispatch
- Sector benchmarking: needs external data source (CNMC, REE)

