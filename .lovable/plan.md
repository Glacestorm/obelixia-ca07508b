

# Plan SP5: Hardening erp-hr-wellbeing-enterprise

## Schema Review

| Tabla | `entity_id` | `employee_id` | `company_id` |
|-------|-------------|---------------|--------------|
| erp_hr_wellbeing_assessments | ✅ uuid | ✅ uuid | ❌ |
| erp_hr_wellbeing_surveys | ✅ uuid | ❌ | ❌ |
| erp_hr_wellness_programs | ✅ uuid | ❌ | ❌ |
| erp_hr_burnout_alerts | ✅ uuid | ✅ uuid | ❌ |
| erp_hr_wellbeing_kpis | ✅ uuid | ❌ | ❌ |
| erp_hr_wellbeing_survey_responses | ❌ | ❌ | ❌ |
| erp_hr_wellness_enrollments | ❌ | ✅ uuid | ❌ |

**Hallazgo clave**: Todas las tablas principales usan `entity_id` que referencia `erp_hr_legal_entities`, la cual tiene `company_id`. No hay FK formal pero el campo existe en todas las tablas relevantes.

**Cadena de tenant isolation**: `entity_id` → `erp_hr_legal_entities.company_id` → `erp_user_companies` membership check.

El frontend pasa `companyId` al componente `HRWellbeingEnterprisePanel`, pero la función actual **no recibe ni filtra por entity_id/company_id** — todas las queries son globales sin filtro de tenant. Esto confirma el riesgo cross-tenant.

## Estrategia Elegida

### 1. Auth gate (después de crear el service-role client, línea 14)

```
1. Extraer Authorization header → Bearer token → 401 si ausente
2. getClaims(token) → 401 si inválido
3. Extraer userId = claims.sub
```

### 2. Company-based membership check (después de parsear body, línea 16)

Dado que el frontend tiene `companyId` disponible, la función recibirá `params.company_id` del frontend.

```
1. Requerir params.company_id en todas las acciones (excepto seed_demo que requiere admin role check)
2. Verificar membership: erp_user_companies WHERE user_id = userId AND company_id = params.company_id AND is_active = true
3. Si no hay membership → 403
4. Resolver entity_ids: SELECT id FROM erp_hr_legal_entities WHERE company_id = params.company_id
5. Aplicar filtro .in('entity_id', entityIds) a todas las queries de lectura
6. Validar entity_id en inserts/updates contra entityIds permitidos
```

### 3. Seed action → admin role check (como SP3)

La acción `seed_demo` es administrativa. Se aplica admin role check via `user_roles` (roles `admin`/`superadmin`) en vez de membership check.

### 4. Error sanitization (línea 363)

Reemplazar `error.message` por `"Internal server error"`.

### 5. Helper `json` (línea 367-372)

Se mantiene, pero necesita acceso a `corsHeaders` — ya lo tiene por closure. Sin cambios.

## Cambios en el Frontend

Modificar `useHRWellbeingEnterprise.ts` para incluir `company_id` en el body de cada invocación. El hook ya recibe `companyId` como parámetro o puede obtenerlo del contexto.

## Resumen de Cambios

| Aspecto | Detalle |
|---------|---------|
| Auth gate | JWT via getClaims |
| Tenant isolation | company_id → erp_hr_legal_entities → entity_ids → filtro queries |
| Seed action | Admin role check (admin/superadmin) |
| Error sanitization | Catch devuelve "Internal server error" |
| Frontend | Añadir company_id a params en invoke |
| Contrato API | Añade company_id requerido en params (cambio aditivo) |
| Service role | Se mantiene para operaciones internas |

## Riesgos

- **Bajo**: El frontend ya tiene `companyId` disponible. Añadir `company_id` a params es un cambio aditivo.
- **Medio**: Si no existen `erp_hr_legal_entities` para un `company_id`, las queries devolverán arrays vacíos (comportamiento correcto, no error).
- **Residual**: `erp_hr_wellbeing_survey_responses` y `erp_hr_wellness_enrollments` no tienen `entity_id`. Se filtran indirectamente via join con sus tablas padre (survey_id → surveys filtrados, program_id → programs filtrados).

## Archivos a modificar

1. `supabase/functions/erp-hr-wellbeing-enterprise/index.ts` — auth gate, membership, entity filtering, error sanitization
2. `src/hooks/admin/hr/useHRWellbeingEnterprise.ts` — añadir company_id a params

