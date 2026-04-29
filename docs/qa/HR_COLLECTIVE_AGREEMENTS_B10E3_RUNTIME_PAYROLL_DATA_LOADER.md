# B10E.3 — Registry Runtime Payroll Data Loader (READ-ONLY)

## Objetivo
Capa única autorizada en B10E para leer DB. Carga el snapshot mínimo necesario para que B10E.4 pueda intentar resolver nómina via Registry, **sin** escrituras y usando el cliente Supabase del usuario (RLS).

## Tablas leídas
1. `erp_hr_company_agreement_registry_runtime_settings` — filtro `company_id`, `is_current=true`, `use_registry_for_payroll=true`. Carga los 4 scopes (company / +employee / +contract / +ambos); B10E.1 resuelve prioridad.
2. `erp_hr_company_agreement_registry_mappings` — por `id IN (mapping_ids)`.
3. `erp_hr_collective_agreements_registry` — por `id IN (registry_agreement_ids)`.
4. `erp_hr_collective_agreements_registry_versions` — por `id IN (registry_version_ids)`.
5. `erp_hr_collective_agreements_registry_sources` — por `agreement_id IN (...)`.
6. `erp_hr_collective_agreements_registry_salary_tables` — por `agreement_id IN (...)` y `year`.
7. `erp_hr_collective_agreements_registry_rules` — por `agreement_id IN (...)`.

## Output
`RegistryRuntimePayrollSnapshotResult`:
- `ok: true` → `snapshot { runtimeSettings, mappings, agreements, versions, sources, salaryTables, rules }` + `warnings[]`.
- `ok: false` → `error` canónico + `reason` (saneado, ≤300 chars).

## Error handling
- Nunca lanza. Cualquier excepción/`error` de Supabase se traduce a un error canónico `<query>_failed`.
- `sanitizeError` extrae `message`/`code`, colapsa whitespace y trunca a 300 chars. No expone stack ni JSON completo.
- Sin runtime settings → `ok: true` con warning `no_runtime_settings`.
- Mapping/agreement/version ausentes para un setting cargado → warnings `missing_mapping_for_setting`, `missing_registry_agreement`, `missing_registry_version`. B10E.4 decidirá fallback.

## Garantías read-only
- Sólo `.select(...)` + filtros `.eq/.in/.is/.order/.limit`.
- Cero `insert/update/upsert/delete/rpc`.
- Cero `service_role`/`SUPABASE_SERVICE_ROLE_KEY`/`createClient`.
- Cliente Supabase recibido por parámetro; nunca instancia uno nuevo ni admin client.
- Cero `functions.invoke`.

## Qué NO hace
- No toca `useESPayrollBridge`.
- No toca payroll/payslip engine.
- No activa `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- No escribe en DB.
- No usa `service_role`.
- No invoca edge functions.
- No referencia tabla operativa `erp_hr_collective_agreements`.
- No escribe `ready_for_payroll`.

## Próxima fase
B10E.4 — Integración condicionada en `useESPayrollBridge` (flag OFF + fallback obligatorio + audit trace).