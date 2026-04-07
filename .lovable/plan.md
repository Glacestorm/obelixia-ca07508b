

# S3 RLS Tanda 2 — Hardening de Tablas HR con USING(true) en Writes

## Hallazgos

### Tablas ya correctamente protegidas (NO tocar)
| Tabla | Estado |
|-------|--------|
| `erp_hr_registration_data` | Hardened en Tanda 1 |
| `erp_hr_employee_custom_concepts` | Hardened en Tanda 1 |
| `erp_hr_garnishments` | Hardened en Tanda 1 |
| `erp_hr_settlements` | Ya tiene `user_has_erp_company_access(company_id)` |
| `erp_hr_payroll_recalculations` | Ya tiene políticas role-scoped |

### Tablas con USING(true) en operaciones de escritura (riesgo real)

| Tabla | Sensibilidad | company_id | employee_id | Política actual |
|-------|-------------|------------|-------------|----------------|
| `erp_hr_garnishment_calculations` | **ALTA** (importes embargados) | No | Sí (NOT NULL) | ALL `USING(true)` |
| `erp_hr_contract_process_data` | **ALTA** (datos contractuales) | Sí (NOT NULL) | Sí (NOT NULL) | SELECT/INSERT/UPDATE `USING(true)` |
| `erp_hr_payslip_texts` | **MEDIA** (textos nómina) | Sí (nullable) | No | 2× ALL `USING(true)` |
| `erp_hr_bridge_approvals` | **MEDIA** (aprobaciones) | Sí (NOT NULL) | No | ALL `USING(true)` |
| `erp_hr_bridge_logs` | **BAJA** (logs integración) | Sí (NOT NULL) | No | ALL `USING(true)` |
| `erp_hr_bridge_mappings` | **BAJA** (mappings integración) | Sí (NOT NULL) | No | ALL `USING(true)` |

### Seleccionadas para Tanda 2 (top 3 por riesgo)

1. **`erp_hr_garnishment_calculations`** — Importes de embargo calculados, cross-tenant expuesto
2. **`erp_hr_contract_process_data`** — Datos de procesos contractuales sensibles
3. **`erp_hr_payslip_texts`** — Textos de nómina con company_id nullable

Las tablas bridge (approvals/logs/mappings) quedan para Tanda 3.

---

## Paso 1 — erp_hr_garnishment_calculations (riesgo alto)

No tiene `company_id`, solo `employee_id`. Reutiliza `get_company_for_employee()` de Tanda 1.

```sql
DROP POLICY "Authenticated users can manage garnishment calculations" ON erp_hr_garnishment_calculations;

CREATE POLICY "tenant_select" ... USING(user_has_erp_company_access(get_company_for_employee(employee_id)));
CREATE POLICY "tenant_insert" ... WITH CHECK(...);
CREATE POLICY "tenant_update" ... USING(...) WITH CHECK(...);
CREATE POLICY "tenant_delete" ... USING(...);
```

## Paso 2 — erp_hr_contract_process_data (riesgo alto)

Tiene `company_id NOT NULL`. Directo con `user_has_erp_company_access(company_id)`.

```sql
DROP POLICY "Authenticated users can read contract process data" ON ...;
DROP POLICY "Authenticated users can insert contract process data" ON ...;
DROP POLICY "Authenticated users can update contract process data" ON ...;

CREATE POLICY "tenant_select" ... USING(user_has_erp_company_access(company_id));
CREATE POLICY "tenant_insert" ... WITH CHECK(user_has_erp_company_access(company_id));
CREATE POLICY "tenant_update" ... USING(...) WITH CHECK(...);
```

## Paso 3 — erp_hr_payslip_texts (riesgo medio)

`company_id` nullable. Usa COALESCE pero no tiene `employee_id` directo. Rows sin company_id se denegarán (seguro por defecto ya que son textos globales que solo deberían insertarse via service_role).

```sql
DROP POLICY "Authenticated users can manage payslip texts" ON ...;
DROP POLICY "erp_hr_payslip_texts_company_isolation" ON ...;

CREATE POLICY "tenant_select" ... USING(company_id IS NULL OR user_has_erp_company_access(company_id));
CREATE POLICY "tenant_insert" ... WITH CHECK(user_has_erp_company_access(company_id));
CREATE POLICY "tenant_update" ... USING(user_has_erp_company_access(company_id)) WITH CHECK(...);
CREATE POLICY "tenant_delete" ... USING(user_has_erp_company_access(company_id));
```

Nota: SELECT permite leer rows con `company_id IS NULL` (textos globales/plantilla). Writes requieren company_id válido.

---

## Resumen de cambios

| Recurso | Accion |
|---------|--------|
| `erp_hr_garnishment_calculations` — 1 policy | Drop + crear 4 nuevas |
| `erp_hr_contract_process_data` — 3 policies | Drop + crear 3 nuevas |
| `erp_hr_payslip_texts` — 2 policies | Drop + crear 4 nuevas |

**Total**: 6 policies eliminadas, 11 policies creadas. 0 funciones nuevas (reutiliza `get_company_for_employee`).

**Frontend/Edge Functions**: Sin cambios. Las queries ya operan dentro del contexto de company/employee.

## Riesgos

- **Bajo**: `erp_hr_payslip_texts` con `company_id IS NULL` en SELECT — permite lectura de plantillas globales, pero bloquea writes sin company
- **Bajo**: `erp_hr_garnishment_calculations` depende de `get_company_for_employee` — misma función validada en Tanda 1
- **Ninguno en frontend**: hooks ya filtran por employee_id o company_id del contexto

