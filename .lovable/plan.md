

# S6.1A — RLS Hotfix: erp_hr_doc_action_queue

## Situación

La tabla `erp_hr_doc_action_queue` tiene 3 policies completamente abiertas (`USING(true)` / `WITH CHECK(true)`). La tabla está vacía y **no tiene columna `company_id`** — el tenant se determina indirectamente via `employee_id → erp_hr_employees.company_id`.

## Políticas actuales (a eliminar)

| Policy | Operación | Problema |
|---|---|---|
| `Authenticated users can read action queue` | SELECT | `USING(true)` |
| `Authenticated users can insert action queue` | INSERT | `WITH CHECK(true)` |
| `Authenticated users can update action queue` | UPDATE | `USING(true)` + `WITH CHECK(true)` |

## Patrón de aislamiento

Lookup indirecto (mismo patrón que `erp_hr_dry_run_evidence`):

```sql
EXISTS (
  SELECT 1 FROM erp_hr_employees e
  WHERE e.id = erp_hr_doc_action_queue.employee_id
    AND user_has_erp_company_access(e.company_id)
)
```

## Migración SQL

Una única migración que:

1. **DROP** las 3 policies peligrosas por nombre exacto
2. **CREATE** 4 policies tenant-scoped:
   - **SELECT**: `USING(EXISTS(...employee lookup...))`
   - **INSERT**: `WITH CHECK(EXISTS(...))`
   - **UPDATE**: `USING(EXISTS(...))` + `WITH CHECK(EXISTS(...))`
   - **DELETE**: `USING(EXISTS(...))`

## Nomenclatura

- `Tenant isolation select on erp_hr_doc_action_queue`
- `Tenant isolation insert on erp_hr_doc_action_queue`
- `Tenant isolation update on erp_hr_doc_action_queue`
- `Tenant isolation delete on erp_hr_doc_action_queue`

## Validación post-migración

- Consulta `pg_policies` para confirmar 4 policies, ninguna con `true`
- Documento `/docs/S6_rls_fix_report.md` con el reporte

## Validación funcional (manual)

- Usuario empresa A inserta un action queue para un empleado de empresa A → permitido
- Usuario empresa A intenta SELECT/UPDATE rows vinculadas a empleados de empresa B → denegado por RLS

## Alcance estricto

- Solo `erp_hr_doc_action_queue`
- No frontend, no edge functions, no otras tablas

