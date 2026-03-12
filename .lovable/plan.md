

# Global Mobility / Expatriates — Submódulo Especializado

## Estado Actual

- `HRMobilityDashboard`: solo demo data estática (4 asignaciones hardcoded, stats fijos)
- `ExpedientMovilidadTab`: placeholder vacío con botón "Ver movilidad"
- Nav: 2 entradas (`mobility-assignments`, `mobility-dashboard`) que apuntan al mismo componente demo
- `HRStatusBadge`: ya soporta `mobility:planned|active|transition|completed`
- No hay tablas, hook ni lógica real

## Diseño

### 1. Tablas (migración)

**`hr_mobility_assignments`** — Asignación internacional (entidad principal)

| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | FK | |
| `employee_id` | FK | Empleado asignado |
| `assignment_type` | TEXT | `long_term`, `short_term`, `commuter`, `permanent_transfer`, `business_travel_extended`, `rotational` |
| `status` | TEXT | `draft`, `planned`, `pre_assignment`, `active`, `extending`, `repatriating`, `completed`, `cancelled` |
| `home_country_code` | TEXT | País de origen |
| `host_country_code` | TEXT | País de destino |
| `home_legal_entity_id` | UUID FK nullable | Empleador legal origen |
| `host_legal_entity_id` | UUID FK nullable | Empleador legal/funcional destino |
| `payroll_country_code` | TEXT | País donde se procesa nómina principal |
| `tax_residence_country` | TEXT | País de residencia fiscal |
| `ss_regime_country` | TEXT | País de régimen SS aplicable |
| `start_date` | DATE | Inicio asignación |
| `end_date` | DATE nullable | Fin previsto |
| `actual_end_date` | DATE nullable | Fin real |
| `currency_code` | TEXT | Divisa de referencia (paquete) |
| `compensation_approach` | TEXT | `tax_equalization`, `tax_protection`, `laissez_faire`, `ad_hoc` |
| `split_payroll` | BOOL | ¿Nómina dividida entre países? |
| `shadow_payroll` | BOOL | ¿Shadow payroll en origen? |
| `hypothetical_tax` | NUMERIC nullable | Impuesto hipotético (tax eq.) |
| `allowance_package` | JSONB | Housing, COLA, hardship, education, relocation, home_leave, etc. |
| `total_monthly_cost` | NUMERIC nullable | Coste empresa mensual total |
| `risk_level` | TEXT | `low`, `medium`, `high`, `critical` |
| `notes` | TEXT nullable | |
| `metadata` | JSONB | |
| `created_by` | UUID | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`hr_mobility_documents`** — Documentos de movilidad (visados, permisos, A1, etc.)

| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `assignment_id` | FK | |
| `document_type` | TEXT | `visa`, `work_permit`, `residence_permit`, `a1_certificate`, `tax_residency_cert`, `assignment_letter`, `cost_projection`, `repatriation_agreement`, `social_security_cert`, `medical_clearance`, `relocation_contract` |
| `document_name` | TEXT | |
| `country_code` | TEXT | País emisor |
| `issue_date` | DATE nullable | |
| `expiry_date` | DATE nullable | |
| `status` | TEXT | `pending`, `applied`, `approved`, `active`, `expiring_soon`, `expired`, `renewed`, `rejected` |
| `file_url` | TEXT nullable | |
| `reference_number` | TEXT nullable | |
| `alert_days_before` | INT | Días antes de expiración para alerta (default 60) |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

**`hr_mobility_cost_projections`** — Proyecciones de coste expatriado

| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `assignment_id` | FK | |
| `projection_year` | INT | |
| `base_salary_home` | NUMERIC | Salario base país origen |
| `base_salary_host` | NUMERIC | Equivalente destino |
| `housing_allowance` | NUMERIC | |
| `cola_allowance` | NUMERIC | Cost of living adjustment |
| `hardship_allowance` | NUMERIC | |
| `education_allowance` | NUMERIC | |
| `relocation_cost` | NUMERIC | |
| `home_leave_flights` | NUMERIC | |
| `tax_equalization_cost` | NUMERIC | |
| `ss_cost_home` | NUMERIC | |
| `ss_cost_host` | NUMERIC | |
| `medical_insurance` | NUMERIC | |
| `other_benefits` | NUMERIC | |
| `total_annual_cost` | NUMERIC | |
| `currency_code` | TEXT | |
| `exchange_rate` | NUMERIC | |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

**`hr_mobility_audit_log`** — Trazabilidad de cambios

| Campo | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | |
| `assignment_id` | FK | |
| `action` | TEXT | `created`, `status_changed`, `extended`, `document_added`, `cost_updated`, `repatriation_started`, `completed`, `cancelled` |
| `actor_id` | UUID | |
| `old_value` / `new_value` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

RLS: all tables filtered by `company_id`, authenticated users only.

### 2. Hook: `useGlobalMobility`

`src/hooks/erp/hr/useGlobalMobility.ts`

Functions:
- `fetchAssignments(filters?)` — list with status/country filters
- `getAssignment(id)` — full detail with documents + cost projections
- `createAssignment(data)` / `updateAssignment(id, data)`
- `updateStatus(id, newStatus)` — with audit log
- `fetchDocuments(assignmentId)` / `addDocument` / `updateDocument`
- `fetchCostProjection(assignmentId, year?)` / `upsertCostProjection`
- `getStats()` — dashboard KPIs
- `getExpiringDocuments(days)` — alertas
- `fetchAuditLog(assignmentId)`

Realtime subscription on `hr_mobility_assignments`.

### 3. Components

All under `src/components/erp/hr/mobility/`:

**`GlobalMobilityModule`** — Main panel (replaces `HRMobilityDashboard`)
- Tabs: Dashboard | Asignaciones | Documentos | Costes | Compliance

**`MobilityDashboard`** — KPIs reales
- Stats cards: activas, países, docs expiring, coste mensual total
- Charts: assignments by country, by type, cost trend
- Alertas: visados/permisos próximos a expirar

**`MobilityAssignmentsList`** — Listado con filtros
- Filtros: status, type, home/host country
- Columns: employee, home→host, type, dates, compensation approach, risk, status
- Actions: view detail, change status

**`MobilityAssignmentForm`** — Formulario crear/editar asignación
- 5 secciones:
  1. **Datos básicos**: empleado, tipo, fechas
  2. **Jurisdicciones**: home country, host country, legal entities, payroll country, tax residence, SS regime (los 5 campos diferenciados)
  3. **Compensación**: approach (tax eq/protection/etc), split payroll, shadow payroll, currency, hypothetical tax
  4. **Beneficios**: housing, COLA, hardship, education, relocation, home leave (JSONB allowance_package)
  5. **Riesgo y notas**: risk level, compliance notes

**`MobilityAssignmentDetail`** — Vista completa de una asignación
- Header: employee + home→host + status badge + dates
- Tabs: Resumen | Documentos | Costes | Nómina | Auditoría
- Panel lateral: key dates timeline, risk indicator

**`MobilityDocumentsPanel`** — Gestión de documentos por asignación
- CRUD documentos con type, dates, status, expiry alerts
- Filter by status (expiring_soon highlighted)
- Upload file support

**`MobilityCostProjectionPanel`** — Proyecciones de coste
- Yearly breakdown: base, allowances, tax eq, SS, medical, total
- Comparison: home cost vs expatriate cost (multiplier)
- Currency conversion

**`MobilityCompliancePanel`** — Riesgos y cumplimiento
- Checklist: A1/certificate SS, work permit valid, tax registration, PE risk, 183-day rule tracker
- Risk matrix by assignment
- Expiring documents alerts

### 4. Integration

| Point | Change |
|---|---|
| `HRModule.tsx` | Replace `HRMobilityDashboard` → `GlobalMobilityModule` for both `mobility-assignments` and `mobility-dashboard` |
| `ExpedientMovilidadTab` | Show employee's assignments from `hr_mobility_assignments` with status, links to detail |
| `HRNavigationMenu` | Keep existing nav items, point to new component |
| Barrel exports | `src/components/erp/hr/mobility/index.ts` |

### 5. States (assignment lifecycle)

```text
draft → planned → pre_assignment → active → extending → repatriating → completed
                                         → cancelled (from any state)
```

- `pre_assignment`: visa/permit in process, not yet relocated
- `extending`: extension approved, new end date
- `repatriating`: return process initiated

### 6. Implementation Order

| Phase | Content |
|---|---|
| **GM1** | Migration: 4 tables + RLS |
| **GM2** | `useGlobalMobility` hook |
| **GM3** | `GlobalMobilityModule` + `MobilityDashboard` + `MobilityAssignmentsList` |
| **GM4** | `MobilityAssignmentForm` + `MobilityAssignmentDetail` (with 5-jurisdiction form) |
| **GM5** | `MobilityDocumentsPanel` + `MobilityCostProjectionPanel` + `MobilityCompliancePanel` |
| **GM6** | Integration: HRModule, ExpedientMovilidadTab, nav wiring |

