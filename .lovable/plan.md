

# S3-Fix: hr_payroll_records — Policy Multi-Tenant

## Estructura relevante

La tabla tiene `company_id uuid NOT NULL` — acceso directo, sin necesidad de lookup indirecto.

## Policies actuales

| Policy | cmd | USING | WITH CHECK |
|--------|-----|-------|------------|
| `Authenticated full access on hr_payroll_records` | ALL | `true` | `true` |
| `employees_read_own_payroll` | SELECT | `employee_id = get_employee_id_for_auth_user() OR has_role(uid, 'admin')` | — |

**Problema**: La policy ALL con `USING(true)` es PERMISSIVE y prevalece sobre cualquier otra policy restrictiva (Postgres combina PERMISSIVE con OR). Cualquier usuario autenticado puede leer/escribir cualquier registro de nomina de cualquier empresa.

## Cambio propuesto

### Paso 1: Eliminar policy permisiva

```sql
DROP POLICY "Authenticated full access on hr_payroll_records" 
  ON public.hr_payroll_records;
```

### Paso 2: Crear policy multi-tenant para operaciones de escritura

```sql
CREATE POLICY "tenant_isolation_all" 
  ON public.hr_payroll_records
  FOR ALL
  TO authenticated
  USING (public.user_has_erp_company_access(company_id))
  WITH CHECK (public.user_has_erp_company_access(company_id));
```

### Paso 3: Mantener policy existente de lectura propia

`employees_read_own_payroll` se mantiene sin cambios — permite a empleados ver sus propias nominas. Como ambas policies son PERMISSIVE, Postgres las combina con OR: un usuario puede ver un registro si tiene acceso a la empresa O si es el empleado propietario.

## Impacto en payroll-calculation-engine

Tras el fix RLS:
1. El upsert en L152-168 puede migrar de `adminClient` a `userClient`
2. El JWT del usuario ya contiene su identidad, y `validateTenantAccess` ya confirma membership en la empresa
3. `user_has_erp_company_access(company_id)` validara lo mismo a nivel RLS

## Impacto en otros consumidores

- El frontend que lea nominas seguira funcionando (el usuario tiene membership o es el empleado)
- No hay otras edge functions que escriban en esta tabla

## Ejecucion propuesta (2 pasos)

1. **Migracion SQL**: DROP policy permisiva + CREATE policy tenant-scoped (una sola migracion)
2. **Codigo**: En `payroll-calculation-engine`, cambiar `adminClient` → `userClient` para el upsert y eliminar el comentario de advertencia

## Riesgos

| Riesgo | Probabilidad | Mitigacion |
|--------|-------------|------------|
| Upsert falla si JWT no tiene membership | Baja | `validateTenantAccess` ya lo verifica antes | 
| Empleados sin membership pierden lectura | Nula | `employees_read_own_payroll` sigue activa |

## Conclusion

**Apta para build inmediato.** La tabla tiene `company_id NOT NULL` directo y la funcion `user_has_erp_company_access` ya existe y esta probada en otras tablas del sistema.

