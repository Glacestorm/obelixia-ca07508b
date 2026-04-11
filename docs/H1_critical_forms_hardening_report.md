# H1.1 — Critical Forms & Buttons Hardening Report

## Fecha: 2026-04-11
## Estado: COMPLETADO

---

## Dominios tocados

| # | Dominio | Archivos modificados |
|---|---------|---------------------|
| 1 | Fiscal / IRPF | `IRPFMotorPanel.tsx` |
| 2 | Tasks | `TaskDetail.tsx` |
| 3 | Official Integrations | `SubmissionDetail.tsx` |
| 4 | Analytics | `PredictiveAuditPanel.tsx` |
| 5 | People / Departamentos | `HRDepartmentsPanel.tsx` |
| 6 | Contracts / Finiquitos | `HRContractsPanel.tsx` |
| 7 | Social Security | `HRSocialSecurityPanel.tsx` |
| 8 | Alerts | `HRAlertsPanel.tsx` |

---

## Controles corregidos

### Oleada A — IRPFMotorPanel (Fiscal)
| Control | Before | After |
|---------|--------|-------|
| "Generar Modelo 111" button | `toast.info()` — cosmetic | **Disabled** con tooltip "Requiere motor de generación AEAT — en desarrollo" |
| "PDF certificado" per employee | `toast.success()` — fake confirmation | **Disabled** con tooltip "Generación PDF próximamente" |

### Oleada B — TaskDetail (Tasks)
| Control | Before | After |
|---------|--------|-------|
| `assigned_to` field | UUID truncado `{id.slice(0,8)}…` | **Name lookup** desde `profiles` table |
| `employee_id` field | UUID truncado | **Name lookup** desde `erp_hr_employees` |
| `related_entity_id` | UUID truncado | UUID + **botón Copy ID** |
| `workflow_instance_id` | UUID truncado | UUID + **botón Copy ID** |
| `source_id` | UUID truncado | UUID + **botón Copy ID** |
| `contract_id` | UUID truncado | UUID + **botón Copy ID** |
| `payroll_record_id` | UUID truncado | UUID + **botón Copy ID** |

### Oleada C — SubmissionDetail (Official)
| Control | Before | After |
|---------|--------|-------|
| Conector field | `adapter_id?.slice(0,8)` | `adapter_name` si existe, fallback a truncated ID |

### Oleada D — PredictiveAuditPanel (Analytics)
| Control | Before | After |
|---------|--------|-------|
| "Configurar acceso auditor" | `toast.info('próximamente')` | **Disabled** con label "(próximamente)" visible |

### Oleada E — HRDepartmentsPanel (People)
| Control | Before | After |
|---------|--------|-------|
| Department list | 100% hardcoded demo array | **Query real a `erp_hr_departments`** con fallback demo etiquetado |
| Stats (empleados, presupuesto) | Hardcoded numbers | **Conteo real** desde `erp_hr_employees` |
| Manager names | Hardcoded strings | **Lookup real** desde `erp_hr_employees` |
| Edit button | No-op (no handler) | **Abre HRDepartmentFormDialog** con dept seleccionado |
| Demo fallback | Sin etiquetar | **Banner visible**: "Datos de ejemplo — No hay departamentos reales configurados" |

### Oleada F — HRContractsPanel (Contracts)
| Control | Before | After |
|---------|--------|-------|
| Finiquitos tab | Hardcoded `settlements` array | **Query real a `erp_hr_settlements`** con demo fallback |
| Employee names in settlements | Hardcoded strings | **Lookup real** desde `erp_hr_employees` |
| Demo fallback | Sin etiquetar | **Badge visible**: "Datos de ejemplo" |

### Oleada G — HRSocialSecurityPanel (SS)
| Control | Before | After |
|---------|--------|-------|
| Cotizaciones section | Demo sin label | **Badge "Datos de ejemplo"** visible |
| Presentaciones RED section | Demo sin label | **Badge "Datos de ejemplo"** visible |
| Certificados section | Demo sin label | **Badge "Datos de ejemplo"** visible |

### Oleada H — HRAlertsPanel (Alerts)
| Control | Before | After |
|---------|--------|-------|
| Channel toggles | `toast.info()` sin persistencia | Mantiene toast (quick win) |
| Preference save button | `toast.success('Preferencias guardadas')` — no persistence | **localStorage** con nota visible: "Las preferencias se guardan localmente en este navegador" |

---

## Métricas BEFORE / AFTER

| Métrica | Before | After |
|---------|--------|-------|
| Botones cosmetic-only | 3 | **0** |
| UUIDs truncados visibles en TaskDetail | 7 campos | **0** (name o copyable ID) |
| Departments panel | 100% demo | **Real DB** con demo fallback etiquetado |
| Finiquitos tab | Array hardcoded | **Query DB** o demo etiquetado |
| SS demo data sin etiquetar | 3 secciones | **0** (todas etiquetadas) |
| Edit buttons sin handler | 2+ | **0** |
| Preferencias sin persistencia | 1 dialog | **localStorage** con label honesto |

---

## Nivel de confianza funcional

- **Mobility**: ✅ Totalmente funcional (H1.0)
- **Fiscal/IRPF**: ✅ Botones honestos, motor real pendiente
- **Tasks**: ✅ Lookups humanos funcionando
- **Official Integrations**: ✅ Adapter name resuelto
- **Departments**: ✅ Real DB con fallback claro
- **Contracts/Finiquitos**: ✅ Real DB con fallback claro
- **Social Security**: ⚠️ Demo etiquetado, pendiente conexión real (H1.2)
- **Alerts**: ✅ Persistencia local honesta

---

## Honest UI vs Real Data — Residual Gaps

| Componente | Estado actual | Acción pendiente |
|------------|--------------|-----------------|
| `HRSocialSecurityPanel` cotizaciones | Demo etiquetado | Conectar a tabla real de cotizaciones |
| `HRSocialSecurityPanel` presentaciones RED | Demo etiquetado | Conectar a `erp_hr_official_submissions` |
| `HRSocialSecurityPanel` certificados | Demo etiquetado | Conectar a tabla real de certificados |
| `HRAccountingBridge` | 100% demo | Etiquetar + conectar a nóminas reales |
| `HRTreasurySync` | 100% demo | Etiquetar + conectar |
| `HRTrainingEnrollDialog` | 3 empleados demo | Conectar a `erp_hr_employees` |
| `SSCertificateRequestDialog` | `DEMO_WORKERS` hardcoded | Conectar a `erp_hr_employees` |
| `HRNewsPanel` | 100% demo | Etiquetar |
| IRPFMotorPanel "Generar 111" | Disabled | Implementar motor AEAT real |
| IRPFMotorPanel "PDF certificado" | Disabled | Implementar generación PDF |
