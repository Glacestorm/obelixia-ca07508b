

# Plan SP3: Hardening Seeders Admin — erp-hr-seed-demo-data + erp-hr-seed-demo-master

## Mecanismo de Role Check

**Tabla**: `public.user_roles` (ya existente)
- Columnas: `id`, `user_id`, `role` (enum `app_role`), `created_at`
- Roles válidos para admin: `admin`, `superadmin`

**Método**: Tras validar JWT con `getClaims(token)`, consultar `user_roles` con el service-role client para verificar que el usuario tiene rol `admin` o `superadmin`. Devolver 403 si no.

## Compatibilidad con Panel Admin

El panel admin HR invoca estas funciones vía `supabase.functions.invoke()`, que ya incluye el JWT del usuario autenticado en el header `Authorization`. No hay cambio de contrato — solo se añade validación server-side que el frontend ya satisface si el usuario es admin.

## Cambios por Función

### Patrón idéntico para ambas funciones:

**Ubicación**: Dentro del `serve(async (req) => { ... })`, justo después de crear el service-role client y antes de parsear el body.

```
1. Extraer Authorization header
2. Si no hay Bearer token → 401
3. Crear un anon-client con el auth header
4. getClaims(token) → si error → 401
5. Extraer userId = claims.sub
6. Con el service-role client: SELECT FROM user_roles WHERE user_id = userId AND role IN ('admin', 'superadmin')
7. Si no hay resultado → 403 Forbidden
8. Continuar con lógica existente sin cambios
```

**Error sanitization**: En el catch final, reemplazar `error.message` por `"Internal server error"`.

### erp-hr-seed-demo-data (líneas ~1344-1412)

Insertar auth gate entre línea 1348 (crear supabase client) y línea 1350 (parsear body). El service-role client se mantiene para las operaciones de seed.

### erp-hr-seed-demo-master (líneas ~988-1133)

Insertar auth gate entre línea 997 (crear supabase client) y línea 999 (parsear body). Mismo patrón exacto.

## Resumen de Cambios

| Aspecto | Detalle |
|---------|---------|
| Auth gate | JWT validation via `getClaims` |
| Role check | `user_roles` tabla, roles `admin` o `superadmin` |
| Service role | Se mantiene para operaciones internas |
| Error sanitization | Catch devuelve `"Internal server error"` |
| Contrato API | Sin cambios |
| Funciones tocadas | Solo las 2 objetivo |

## Riesgos

- **Bajo**: El panel admin ya envía auth headers. Usuarios sin rol admin recibirán 403, que es el comportamiento deseado.
- **Ninguno** en lógica de seed: no se modifica ninguna función de fase ni cleanup.

