

# Hardening Final de Todo RRHH — Plan de Implementación

---

## 1. RLS Wave 2 — Tablas Afectadas

Tablas HR con `USING(true)` que necesitan hardening (NO incluidas en P9.2 fix):

### Grupo A: Compensación Core (7 tablas, referencia `companies(id)`)
- `erp_hr_salary_bands` — company_id UUID
- `erp_hr_compensation` — company_id UUID
- `erp_hr_benefits_plans` — company_id UUID
- `erp_hr_benefits_enrollments` — company_id UUID
- `erp_hr_recognition` — company_id UUID
- `erp_hr_compensation_components` — company_id UUID (ref `companies`)
- `erp_hr_employee_compensation` — NO company_id directo (via component_id)
- `erp_hr_rewards_statements` — NO company_id directo (via employee_id)
- `erp_hr_benefit_valuations` — company_id UUID (ref `companies`)
- `erp_hr_market_benchmarks` — company_id UUID (ref `companies`)
- `erp_hr_recognition_programs` — company_id UUID

### Grupo B: Board Pack (5 tablas)
- `erp_hr_board_pack_templates` — company_id UUID
- `erp_hr_board_packs` — company_id UUID
- `erp_hr_board_pack_sections` — pack_id FK
- `erp_hr_board_pack_distribution` — pack_id FK
- `erp_hr_board_pack_reviews` — company_id UUID

### Grupo C: Wellbeing (7 tablas, referencia `entity_id` en lugar de `company_id`)
- `erp_hr_wellbeing_assessments` — entity_id (legal_entities)
- `erp_hr_wellbeing_surveys` — entity_id
- `erp_hr_wellbeing_survey_responses` — survey_id FK
- `erp_hr_wellness_programs` — entity_id
- `erp_hr_wellness_enrollments` — program_id FK
- `erp_hr_burnout_alerts` — entity_id
- `erp_hr_wellbeing_kpis` — entity_id

### Grupo D: Digital Twin Sub-Tables (4 tablas, policies perdidas por CASCADE)
- `erp_hr_twin_module_snapshots` — twin_id FK
- `erp_hr_twin_metrics_history` — twin_id FK
- `erp_hr_twin_experiments` — twin_id FK
- `erp_hr_twin_alerts` — twin_id FK

### Grupo E: Legal Engine (5 tablas, post-P9.2 migration created with USING(true))
- `erp_hr_legal_templates` — ya hardened in P9.2 fix ✓
- Verificar si las políticas "Allow all for authenticated" de la migration original fueron reemplazadas

### Grupo F: API/Webhooks (1 policy issue)
- `erp_hr_api_access_log` — policy USING `company_id IN (SELECT id FROM erp_companies)` — no filtra por usuario, solo verifica que la empresa existe
- `erp_hr_api_event_catalog` — `USING(true)` acceptable (catálogo público)

### Grupo G: Opportunities/Succession
- `erp_hr_opportunities` — company_id, USING(true)
- `erp_hr_succession_positions` — company_id, USING(true)

---

## 2. Migración SQL — Estrategia

Una única migración que:

1. **Drop** todas las políticas permisivas de las tablas listadas
2. **Crear función helper** `user_has_erp_wellbeing_access(entity_id UUID)` que verifique acceso vía `erp_hr_legal_entities → company_id → erp_user_roles`
3. **Crear función helper** `user_has_erp_twin_sub_access(twin_id UUID)` que verifique acceso vía `erp_hr_twin_instances.company_id`
4. **Crear función helper** `user_has_erp_board_pack_access(pack_id UUID)` para sub-tablas sin company_id directo
5. **Apply** políticas correctas por grupo:
   - Grupo A: `user_has_erp_company_access(company_id)` o `user_has_erp_premium_access(company_id)` según aplique
   - Grupo B: `user_has_erp_premium_access(company_id)` y helpers para sub-tablas
   - Grupo C: `user_has_erp_wellbeing_access(entity_id)` 
   - Grupo D: `user_has_erp_twin_sub_access(twin_id)`
   - Grupo F: Fix `erp_hr_api_access_log` para usar `user_has_erp_premium_access(company_id)`
   - Grupo G: `user_has_erp_company_access(company_id)`

---

## 3. Fallbacks `demo-company-id` — Eliminación

4 archivos a modificar:

| Archivo | Cambio |
|---------|--------|
| `src/components/erp/hr/HRModule.tsx` | Replace `demoCompanyId` fallback con guard clause + empty state |
| `src/components/erp/legal/LegalModule.tsx` | Mismo patrón |
| `src/components/erp/hr/HRTrends2026Panel.tsx` | Usar `currentCompany?.id` con guard |
| `supabase/functions/erp-hr-copilot-twin/index.ts` | Rechazar con 400 si no hay companyId |
| `supabase/functions/erp-hr-esg-selfservice/index.ts` | Rechazar con 400 si no hay companyId |

Patrón: Si `!currentCompany?.id`, mostrar componente de "Selecciona una empresa" y no ejecutar queries.

---

## 4. Edge Functions — Validación company_id

Revisar las edge functions HR principales para añadir validación explícita:

- `erp-hr-copilot-twin` — eliminar default `demo-company-id`, return 400
- `erp-hr-esg-selfservice` — eliminar default, return 400
- `hr-board-pack` — verificar que recibe y valida company_id
- `hr-enterprise-integrations` — verificar
- `hr-premium-api` — verificar
- `hr-compliance-automation` — verificar que company_id se pasa
- `hr-reporting-engine` — verificar
- `hr-regulatory-reporting` — verificar
- `hr-orchestration-engine` — verificar
- `hr-analytics-bi` — verificar

Patrón: Al inicio de cada función, si `!companyId || companyId === 'demo-company-id'`, retornar `{ success: false, error: 'company_id is required' }` con status 400.

---

## 5. Should Have

### 5a. Audit Trail Consolidado
Crear un componente `HRUnifiedAuditPanel.tsx` que consulte en paralelo las tablas de logs existentes:
- `erp_hr_data_access_log`
- `erp_hr_api_access_log`
- `erp_hr_ext_integration_log`
- `erp_hr_board_pack_reviews`
- `erp_hr_board_pack_distribution`
- `erp_hr_orchestration_log`
- `erp_hr_fairness_audit_trail`
- `erp_hr_legal_audit_trail`
- `erp_hr_cnae_intelligence_log`

No nueva tabla — solo un panel de consulta unificada con filtros por tipo, fecha, empresa y usuario.

### 5b. Field-Level Masking Enforcement
Crear un hook `useHRDataMasking.ts` que:
- Consulte `erp_hr_masking_rules` para la empresa activa
- Aplique masking a campos sensibles (salario → `***`, IBAN → `****1234`)
- Se use en componentes de compensación, nóminas, rewards

### 5c. Robustez Operativa
- Añadir `ErrorBoundary` wrapper en paneles Premium clave
- Mejorar manejo de errores de IA en hooks (toast descriptivo, estado de error limpio)
- Timeout en llamadas a edge functions costosas (board pack, analytics BI)

---

## 6. Resumen de Entregables

| # | Entregable | Tipo |
|---|-----------|------|
| 1 | Migración RLS Wave 2 (~28 tablas) | SQL migration |
| 2 | Security definer functions (3 nuevas) | SQL migration |
| 3 | Eliminación fallbacks demo-company-id (5 archivos) | Code edit |
| 4 | Validación company_id en edge functions (~10 funciones) | Code edit |
| 5 | Panel unificado de auditoría | New component |
| 6 | Hook de data masking | New hook |
| 7 | Error boundaries en paneles premium | Code edit |

