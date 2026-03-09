

## Plan: Complete Energy 360 Multi-Energy Consolidation

After thorough codebase review, the system is already well-structured. The main gaps are:

1. **Edge function `energy-client-portal` lacks `download` and `regulatory_chat` action handlers** -- the client portal UI calls these but the function only handles the default data fetch
2. **Edge function `energy-ai-recommendation` lacks `get_energy_news`, `get_regulations`, and `regulatory_chat` action handlers** -- the News and Regulations panels call these but fall back to sample data
3. **No portal link preview/open-in-new-window** from within the admin case management
4. **No document download support** in the portal edge function

### Tasks

#### Task 1: Upgrade `energy-client-portal` Edge Function
Add two new action handlers to the existing function:
- **`download` action**: Accepts `filePath`, validates it belongs to the case's token scope, generates a signed URL via Supabase Storage, returns it
- **Default (no action)**: Keep existing behavior as-is

#### Task 2: Upgrade `energy-ai-recommendation` Edge Function  
Add action handlers for the News/Regulations panels:
- **`get_energy_news`**: Use Lovable AI to generate current energy sector news based on category/search params
- **`get_regulations`**: Use Lovable AI to generate relevant regulations by scope
- **`regulatory_chat`**: Accept a question + context, return an AI-powered answer about energy regulations
- Keep existing recommendation logic untouched

#### Task 3: Add Portal Link Preview in Admin
In `ClientPortalManager.tsx`, add:
- Button to open the portal in a new tab/window with the token URL
- Inline preview iframe option for quick visualization

#### Task 4: Enhance Executive Dashboard
Add missing elements:
- **Savings evolution chart** (monthly aggregated over time from case creation dates)
- **Operational funnel** showing cases flowing through workflow stages
- Ensure `potencia` tab for power optimization recommendations link

#### Task 5: Portal Client - Add Report/Informe Tab
The portal currently shows proposals but not formal reports. Add:
- Tab for "Informe" showing report data if available from `energy_reports` or similar
- YoY/MoM comparison placeholders with the data available from invoices

### Technical Details

**Edge Function Changes:**

`supabase/functions/energy-client-portal/index.ts`:
- Parse `action` from request body alongside `portalToken`
- If `action === 'download'`: validate token, check `filePath` starts with expected prefix for the case, call `supabase.storage.from('energy-documents').createSignedUrl(filePath, 300)`, return `{ signedUrl }`
- Otherwise: existing full data fetch logic

`supabase/functions/energy-ai-recommendation/index.ts`:
- Add switch cases for `get_energy_news`, `get_regulations`, `regulatory_chat`
- Each uses the existing Lovable AI gateway pattern already in the file
- `get_energy_news`: system prompt for energy sector news generation, returns JSON array
- `get_regulations`: system prompt for Spanish energy regulation lookup, returns JSON array
- `regulatory_chat`: system prompt as energy regulation expert, accepts question + context, returns `{ answer: string }`

**Frontend Changes:**

`ClientPortalManager.tsx`: Add "Abrir portal" button that constructs URL and opens `window.open()`

`ElectricalExecutiveDashboard.tsx`: Add monthly savings evolution AreaChart using case `created_at` dates grouped by month

`ClientPortalView.tsx`: Minor - add "Informe" tab that shows report summary data from proposals or a dedicated report endpoint

### Files to Modify
1. `supabase/functions/energy-client-portal/index.ts` - Add download action
2. `supabase/functions/energy-ai-recommendation/index.ts` - Add news/regulations/chat actions  
3. `src/components/erp/electrical/ClientPortalManager.tsx` - Add portal preview/open button
4. `src/components/erp/electrical/ElectricalExecutiveDashboard.tsx` - Add savings evolution + funnel charts
5. `src/components/erp/electrical/ClientPortalView.tsx` - Add informe tab + YoY comparison

### What Becomes Fully Multi-Energy
- Executive Dashboard: All KPIs, charts, rankings, exports
- Client Portal: Contracts, invoices, gas, solar, savings, alerts, market, proposals, downloads
- News Panel: AI-powered real content instead of sample data
- Regulations Panel: AI-powered real regulatory answers

### What Remains Partial (Premium Roadmap)
- Email/WhatsApp proactive alerts (requires external integration)
- Scheduled PDF/CSV report delivery (needs cron job)
- Extended audit (section-level view tracking, read time)
- Sector benchmarking (needs external data source)

