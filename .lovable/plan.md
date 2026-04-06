

# Plan SP6: Hardening erp-hr-agreement-updater

## Análisis de invocación actual

- **Cron**: pg_cron via `net.http_post` con `Authorization: Bearer ANON_KEY` en headers. No hay JWT de usuario, solo el anon key.
- **Manual**: No hay caller en el frontend (`src/`). Potencialmente invocable manualmente vía API directa.
- **Naturaleza**: Operación administrativa cross-tenant sobre datos de sistema (`is_system = true`).

## Bug existente

`jsonResponse()` (línea 452) referencia `corsHeaders` que es variable local del handler `serve()`. Esto causa un `ReferenceError` en runtime. Se corregirá pasando `corsHeaders` como parámetro.

## Patrón dual-path elegido

### Señal de discriminación: `Authorization` header

```text
Request llega
  ├─ Tiene Authorization: Bearer <token>?
  │   ├─ SÍ → Es invocación manual
  │   │   ├─ getClaims(token) → 401 si inválido
  │   │   ├─ Check user_roles (admin/superadmin) → 403 si no admin
  │   │   └─ Proceder
  │   └─ NO → Es invocación cron/system
  │       ├─ Verificar X-Cron-Secret header == SUPABASE_SERVICE_ROLE_KEY
  │       │   (pg_cron envía este header en la config del job)
  │       ├─ Si no coincide → 401 Unauthorized
  │       └─ Proceder
```

**Seguridad de la ruta cron**: pg_cron puede enviar headers custom. Se validará que el request incluya un header `X-Cron-Secret` cuyo valor sea el `SUPABASE_SERVICE_ROLE_KEY`. Esto evita que cualquier request sin auth acceda a la función.

**Alternativa más simple** (recomendada): Dado que pg_cron ya envía `Authorization: Bearer ANON_KEY`, y la función no tiene `verify_jwt` forzado, podemos usar un approach más directo:

- Si hay `Authorization` header con un JWT válido de usuario → validar admin role
- Si hay `Authorization` header con el anon key (no es JWT de usuario) → verificar que el body contenga un campo `_cron_secret` que coincida con un secret configurado, O simplemente confiar en que el anon key + la acción `daily_scan` es suficiente, dado que `daily_scan` no es destructiva

**Approach final elegido**: Dado que NO queremos dejar puerta abierta pública:

1. Si `Authorization` contiene un JWT de usuario válido → admin role check
2. Si no hay Authorization o no es JWT válido → verificar header `X-Cron-Secret` contra `SUPABASE_SERVICE_ROLE_KEY`
3. Si ninguno → 401

Este approach requiere actualizar el cron job para enviar `X-Cron-Secret` header.

## Cambios exactos

### 1. Auth dual-path (después de crear supabase client, línea 41)

```
1. Leer Authorization header
2. Si presente y es Bearer token:
   a. Crear anon client, getClaims(token)
   b. Si claims válidos → check user_roles admin/superadmin → 403 si no
   c. Si claims inválidos → siguiente check
3. Si no se autenticó via JWT:
   a. Leer X-Cron-Secret header
   b. Comparar con SUPABASE_SERVICE_ROLE_KEY
   c. Si no coincide → 401
```

### 2. Error sanitization (líneas 191-200)

Reemplazar `error.message` por `"Internal server error"` en la respuesta.

### 3. Fix jsonResponse (línea 452-456)

Pasar `corsHeaders` como parámetro a `jsonResponse`, o redefinir como closure dentro del handler.

### 4. Actualizar cron job

Ejecutar SQL para recrear el cron job con el header `X-Cron-Secret` que contenga el service role key.

## Archivos a modificar

1. `supabase/functions/erp-hr-agreement-updater/index.ts` — dual-path auth, error sanitization, fix jsonResponse

## Riesgos

- **Bajo**: El cron job necesita actualizarse para enviar `X-Cron-Secret`. Se hará via SQL insert.
- **Bajo**: No hay frontend caller, así que no hay riesgo de ruptura en UI.
- **Residual**: Si el cron job no se actualiza, las ejecuciones programadas fallarán con 401 hasta que se aplique el SQL.

## Resumen

| Aspecto | Detalle |
|---------|---------|
| Path manual | JWT + admin role check (admin/superadmin) |
| Path cron | X-Cron-Secret == SERVICE_ROLE_KEY |
| Sin auth | 401 Unauthorized |
| Error sanitization | Catch devuelve "Internal server error" |
| Bug fix | jsonResponse corsHeaders scoping |
| Frontend | Sin cambios (no hay caller) |

