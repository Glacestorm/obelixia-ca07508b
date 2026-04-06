

# Plan SP4: Hardening erp-hr-total-rewards

## Estrategia

**Query indirecta**: `employee_id` → `erp_hr_employees.company_id` → `erp_user_companies` membership check.

**Punto de integración**: Entre línea 30 (parseo del body) y línea 32 (log de action). Solo las acciones que reciben `employee_id` (`analyze_compensation`, `forecast_total_package`) pasan por membership check. Las acciones sin `employee_id` (`compare_market`, `generate_recommendations`) solo requieren auth gate.

## Cambios exactos

### 1. Auth gate (después de crear el supabase client, línea 28)

```
1. Extraer Authorization header → Bearer token
2. Crear anon client con auth header
3. getClaims(token) → si error → 401
4. Extraer userId = claims.sub
```

### 2. Membership check condicional (después de parsear body, línea 30)

Solo cuando `employee_id` está presente:

```sql
SELECT company_id FROM erp_hr_employees WHERE id = :employee_id
```

Luego:

```sql
SELECT id FROM erp_user_companies WHERE user_id = :userId AND company_id = :companyId AND is_active = true
```

Si no hay resultado → 403 Forbidden.

### 3. Error sanitization (líneas 271-279)

Reemplazar `error.message` por `"Internal server error"` en la respuesta. Mantener `console.error` interno.

## Riesgo de ruptura

**Bajo**: El frontend ya envía auth headers via `supabase.functions.invoke()`. Las acciones sin `employee_id` siguen funcionando solo con auth. Las acciones con `employee_id` añaden una validación que el usuario legítimo ya satisface por pertenecer a la empresa del empleado.

## Resumen

| Aspecto | Detalle |
|---------|---------|
| Auth gate | JWT via getClaims |
| Tenant isolation | employee → company → erp_user_companies |
| Membership check | Solo cuando employee_id presente |
| Service role | Se mantiene para queries internas |
| Error sanitization | Catch devuelve "Internal server error" |
| Contrato API | Sin cambios |

