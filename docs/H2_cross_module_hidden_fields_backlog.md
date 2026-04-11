# H2.0 — Cross-Module Hidden Fields Backlog

## Propósito
Identificar campos, configuraciones y datos que existen en BD/modelo pero no están expuestos en formularios de captura/edición en módulos fuera de RRHH.

---

## 1. RRHH (Post-H2.0 — Resuelto)

| Patrón | Estado |
|---|---|
| national_id sin UI en maestro | ✅ Resuelto H2.0 |
| hr_employee_profiles sin UI | ✅ Resuelto H2.0 (pestaña Perfil) |
| Extensiones non-ES sin campos | ✅ Resuelto H2.0 (campos internacionales) |
| ss_number vs NAF duplicidad | ✅ Resuelto H2.0 (NAF = fuente de verdad) |

---

## 2. Fiscal

### Campos preparados pero no administrables desde UI

| Campo / Tabla | Descripción | Prioridad | Esfuerzo |
|---|---|---|---|
| `erp_fiscal_periods.adjustments` (JSONB) | Ajustes fiscales por periodo — solo lectura en dashboard | Medium | 2h |
| `erp_fiscal_declarations.metadata` | Metadata de declaraciones (190, 111) — no editable | Low | 1h |
| `erp_tax_withholdings.override_reason` | Motivo de override de retención — existe pero sin input | Medium | 1h |
| Configuración de modelos fiscales | Los modelos (111, 190, 390) tienen parámetros hardcoded en engines, no en BD administrable | High | 8h |

### Read-only sin edición
| Elemento | Contexto |
|---|---|
| Resumen fiscal anual | Se computa pero no permite correcciones manuales |
| Calendario fiscal | No editable por el usuario — hardcoded |

---

## 3. Auditoría

### Campos no visibles

| Campo / Tabla | Descripción | Prioridad |
|---|---|---|
| `audit_logs.old_data` / `new_data` | JSONB completo pero solo se muestra resumen | Low |
| `access_control_policies.conditions` (JSONB) | Condiciones de políticas — no administrables desde UI | Medium |
| `access_control_policies.effective_from/until` | Fechas de vigencia — existen pero sin picker | Medium |

### Configuraciones no administrables
| Elemento | Contexto |
|---|---|
| Retención de logs | No configurable — política fija |
| Alertas de auditoría | Reglas hardcoded en engine |

---

## 4. Jurídico / Legal

### Campos preparados

| Campo / Tabla | Descripción | Prioridad |
|---|---|---|
| `erp_hr_contracts.clauses` (JSONB) | Cláusulas contractuales — datos existen pero sin editor estructurado | High |
| `erp_hr_contracts.termination_reason` | Causa de extinción — campo existe pero sin selector estandarizado (ET Art. 49) | High |
| `erp_hr_contracts.severance_calculation` | Cálculo de indemnización — engine existe pero sin UI de resultado persistido | Medium |
| Convenios colectivos — condiciones específicas | Se selecciona convenio pero no se cargan sus condiciones específicas | Medium |

### Duplicidades
| Elemento | Contexto |
|---|---|
| Tipo de contrato | Se captura en extensión ES y también en erp_hr_contracts — ¿cuál prevalece? |
| Fecha fin de contrato | En erp_hr_employees.termination_date y erp_hr_contracts.end_date — fuente de verdad no explícita |

---

## 5. IA Center

### Configuraciones no administrables

| Elemento | Descripción | Prioridad |
|---|---|---|
| System prompts de agentes | Hardcoded en edge functions — no editables desde UI | Medium |
| Modelos IA por agente | Fijo en código — no seleccionable | Low |
| Contexto inyectado a agentes | Se computa automáticamente pero no se puede revisar/editar | Low |
| Umbrales de confianza | Para recomendaciones — hardcoded | Low |

---

## 6. Tesorería / Banking

### Campos ocultos

| Campo / Tabla | Descripción | Prioridad |
|---|---|---|
| Cuentas bancarias empresa | Existen en modelo pero sin CRUD completo visible | High |
| Reglas de conciliación | Engine existe pero parámetros no editables | Medium |
| SEPA mandate data | Campos preparados pero sin formulario | Medium |

---

## Resumen de Prioridades

| Módulo | Items High | Items Medium | Items Low | Esfuerzo estimado |
|---|---|---|---|---|
| RRHH | 0 (resuelto) | 0 | 0 | ✅ Completado |
| Fiscal | 1 | 2 | 1 | ~12h |
| Auditoría | 0 | 2 | 1 | ~4h |
| Jurídico | 2 | 2 | 0 | ~16h |
| IA Center | 0 | 1 | 3 | ~6h |
| Tesorería | 1 | 2 | 0 | ~12h |
| **Total** | **4** | **9** | **5** | **~50h** |

## Recomendación de próximo bloque

1. **H2.1 — Jurídico**: Resolver duplicidades contrato + causa extinción + cláusulas (16h, alto impacto legal)
2. **H2.2 — Fiscal**: Hacer administrables los parámetros de modelos fiscales (12h, alto impacto operativo)
3. **H2.3 — Tesorería**: CRUD de cuentas bancarias + SEPA mandates (12h, impacto en última milla)
