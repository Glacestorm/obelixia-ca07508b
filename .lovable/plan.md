

# Plan S2R: Quick Fixes — Error Leak + CORS

## 1. hr-workforce-simulation — Error Sanitization

**Archivo**: `supabase/functions/hr-workforce-simulation/index.ts`

**Cambio** (líneas 204-212): Reemplazar `error.message` por mensaje genérico en el catch.

```typescript
// ANTES
error: error instanceof Error ? error.message : 'Unknown error',

// DESPUÉS
error: 'Internal server error',
```

Se mantiene `console.error` interno intacto.

## 2. send-hr-alert — CORS Allowlist + Error Sanitization

**Archivo**: `supabase/functions/send-hr-alert/index.ts`

**No es público**: Solo se invoca desde `HRIncidentFormDialog.tsx` via `supabase.functions.invoke()` (usuario autenticado). No necesita `Access-Control-Allow-Origin: '*'`.

### Cambios:

1. **Importar** `getSecureCorsHeaders` desde `_shared/edge-function-template.ts`
2. **Eliminar** la constante `corsHeaders` estática (líneas 10-13)
3. **Reemplazar** todos los usos de `corsHeaders` por `getSecureCorsHeaders(req)` — guardar en variable local al inicio del handler
4. **Sanitizar error** en catch (línea 299): reemplazar `error.message` por `'Internal server error'`

### Impacto:
- CORS restringido a allowlist (localhost, lovable.app, obelixia.lovable.app, app.obelixia.com)
- Sin cambio en contrato API ni lógica de negocio
- Frontend sigue funcionando porque las preview URLs están en la allowlist

## Resumen

| Función | Cambio | Riesgo |
|---------|--------|--------|
| hr-workforce-simulation | Sanitizar error.message → genérico | Ninguno |
| send-hr-alert | CORS allowlist + sanitizar error | Bajo — allowlist cubre todos los orígenes válidos |

