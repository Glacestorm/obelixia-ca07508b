

# Plan: Fix MEI Bridge — Corregir valor MEI y eliminar hardcode

## Cambio

Un solo archivo: `src/components/erp/hr/integration/HRSocialSecurityBridge.tsx`

### Acción 1: Añadir import del Shared Legal Core

Añadir al bloque de imports (después de línea ~20):

```typescript
import { SS_CONTRIBUTION_RATES_2026 } from '@/shared/legal/rules/ssRules2026';
```

### Acción 2: Reemplazar constante local por derivada de shared

Reemplazar el bloque `SS_RATES_2026` (líneas 81-94) por:

```typescript
// Tasas SS España 2026 — derivadas del Shared Legal Core (single source of truth)
const SS_RATES_2026 = {
  cc_company: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.empresa,
  cc_worker: SS_CONTRIBUTION_RATES_2026.contingenciasComunes.trabajador,
  unemployment_indefinido_company: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.empresa,
  unemployment_indefinido_worker: SS_CONTRIBUTION_RATES_2026.desempleoIndefinido.trabajador,
  unemployment_temporal_company: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.empresa,
  unemployment_temporal_worker: SS_CONTRIBUTION_RATES_2026.desempleoTemporal.trabajador,
  fogasa: SS_CONTRIBUTION_RATES_2026.fogasa.empresa,
  fp_company: SS_CONTRIBUTION_RATES_2026.formacionProfesional.empresa,
  fp_worker: SS_CONTRIBUTION_RATES_2026.formacionProfesional.trabajador,
  mei: SS_CONTRIBUTION_RATES_2026.mei.total,           // 0.90 (was 0.70 ← CORREGIDO)
  at_ep_avg: SS_CONTRIBUTION_RATES_2026.atepReferencia.empresa,
};
```

Esto:
- Corrige MEI de 0.70 → 0.90 (valor canónico 2026)
- Elimina el hardcode manteniendo la misma estructura de objeto (`SS_RATES_2026` con las mismas keys)
- Los ~843 líneas restantes del componente no se tocan — siguen consumiendo `SS_RATES_2026.mei`, etc. sin cambios

### Verificación

- `npx tsc --noEmit` para confirmar tipado correcto
- La estructura del objeto local `SS_RATES_2026` es idéntica (mismas keys, mismos tipos `number`), así que todos los usos internos del componente siguen funcionando

## Archivos

| Archivo | Cambio |
|---|---|
| `src/components/erp/hr/integration/HRSocialSecurityBridge.tsx` | Import shared + reemplazar hardcode |

## Riesgo

Mínimo. Se mantiene la misma interfaz interna (`SS_RATES_2026.mei` sigue siendo `number`). El único cambio de valor es MEI 0.70 → 0.90, que es la corrección deseada.

