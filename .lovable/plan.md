

# S3 RLS Tanda 1 — Hardening de 3 Tablas HR

## Estado Actual

| Tabla | Políticas actuales | company_id | Datos existentes |
|-------|-------------------|------------|-----------------|
| `erp_hr_registration_data` | 3× `USING(true)` (SELECT/INSERT/UPDATE) | NOT NULL | — |
| `erp_hr_employee_custom_concepts` | 2× `USING(true)` ALL | Nullable (pero 0 rows con NULL) | 0 rows total |
| `erp_hr_garnishments` | 1× `USING(true)` ALL | **No existe** (solo `employee_id`) | — |

Helper existente: `user_has_erp_company_access(p_company_id)` consulta `erp_user_roles` con `auth.uid()`.

---

## Paso 1 — erp_hr_registration_data (riesgo bajo)

**Antes**: 3 políticas permisivas con `true`.

**Después**: 3 políticas con `user_has_erp_company_access(company_id)`.

```sql
-- Drop existentes
DROP POLICY "Authenticated users can read registration data" ON erp_hr_registration_data;
DROP POLICY "Authenticated users can insert registration data" ON erp_hr_registration_data;
DROP POLICY "Authenticated users can update registration data" ON erp_hr_registration_data;

-- Nuevas
CREATE POLICY "tenant_select" ON erp_hr_registration_data
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_insert" ON erp_hr_registration_data
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(company_id));

CREATE POLICY "tenant_update" ON erp_hr_registration_data
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(company_id))
  WITH CHECK (user_has_erp_company_access(company_id));
```

**Impacto**: Directo, sin complejidad. `company_id` es NOT NULL. Frontend ya filtra por company.

---

## Paso 2 — erp_hr_employee_custom_concepts (riesgo medio)

**Problema**: `company_id` es nullable. Aunque hay 0 rows con NULL ahora, el código permite insertar sin company_id.

**Estrategia**: Usar COALESCE con fallback a employee mapping via función SECURITY DEFINER.

```sql
-- Función helper para resolver company via employee
CREATE OR REPLACE FUNCTION get_company_for_employee(p_employee_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM erp_hr_employees WHERE id = p_employee_id LIMIT 1;
$$;

-- Drop existentes
DROP POLICY "Authenticated users can manage custom concepts" ON erp_hr_employee_custom_concepts;
DROP POLICY "erp_hr_employee_custom_concepts_company_isolation" ON erp_hr_employee_custom_concepts;

-- Nuevas con lógica dual
CREATE POLICY "tenant_select" ON erp_hr_employee_custom_concepts
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

CREATE POLICY "tenant_insert" ON erp_hr_employee_custom_concepts
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

CREATE POLICY "tenant_update" ON erp_hr_employee_custom_concepts
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))))
  WITH CHECK (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));

CREATE POLICY "tenant_delete" ON erp_hr_employee_custom_concepts
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(COALESCE(company_id, get_company_for_employee(employee_id))));
```

**Compatibilidad**: Rows con `company_id` usan acceso directo. Rows con NULL resuelven via employee. Sin bloqueo de datos existentes.

---

## Paso 3 — erp_hr_garnishments (riesgo más alto)

**Problema**: No tiene columna `company_id`. Solo `employee_id`.

**Estrategia**: Reutilizar `get_company_for_employee()` creada en paso 2.

```sql
-- Drop existente
DROP POLICY "Authenticated users can manage garnishments" ON erp_hr_garnishments;

-- Nuevas
CREATE POLICY "tenant_select" ON erp_hr_garnishments
  FOR SELECT TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_insert" ON erp_hr_garnishments
  FOR INSERT TO authenticated
  WITH CHECK (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_update" ON erp_hr_garnishments
  FOR UPDATE TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)))
  WITH CHECK (user_has_erp_company_access(get_company_for_employee(employee_id)));

CREATE POLICY "tenant_delete" ON erp_hr_garnishments
  FOR DELETE TO authenticated
  USING (user_has_erp_company_access(get_company_for_employee(employee_id)));
```

---

## Resumen de cambios

| Archivo/Recurso | Acción |
|-----------------|--------|
| Función `get_company_for_employee` | Crear (SECURITY DEFINER) |
| `erp_hr_registration_data` — 3 policies | Drop + crear 3 nuevas |
| `erp_hr_employee_custom_concepts` — 2 policies | Drop + crear 4 nuevas |
| `erp_hr_garnishments` — 1 policy | Drop + crear 4 nuevas |

**Total**: 1 función nueva, 6 policies eliminadas, 11 policies creadas.

**Código frontend/edge functions**: Sin cambios. Las queries ya filtran por employee/company. RLS solo añade enforcement server-side.

## Riesgos

- **Bajo**: Si un employee no existe en `erp_hr_employees`, `get_company_for_employee` retorna NULL y el acceso se deniega (seguro por defecto)
- **Bajo**: Edge functions usan `service_role` (bypasses RLS) — sin impacto
- **Ninguno en frontend**: `useHRGarnishments`, `useEmployeeCustomConcepts`, `useHRRegistrationProcess` ya filtran por `employee_id` del contexto del usuario

## Validación post-migración

Tras cada tabla se ejecutará una query de verificación para confirmar que el aislamiento funciona correctamente.

