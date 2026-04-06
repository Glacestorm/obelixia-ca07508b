

# Plan: F2 — Mover legalReferenceResolver al Shared Legal Core

## Objetivo

Reubicar `src/utils/legalReferenceResolver.ts` a `src/shared/legal/knowledge/referenceResolver.ts` y mantener re-export en la ubicación original para zero breaking changes.

## Consumidores detectados

| Archivo | Imports |
|---|---|
| `src/components/erp/legal/LegalAdvisorPanel.tsx` | `linkifyLegalReferences`, `resolveLegalReference` |

Único consumidor. El re-export en `src/utils/legalReferenceResolver.ts` cubrirá este import sin modificar el componente.

## Acciones

### Acción 1: Crear `src/shared/legal/knowledge/referenceResolver.ts`

Copiar el contenido íntegro de `src/utils/legalReferenceResolver.ts` sin modificar lógica. Añadir JSDoc `@shared-legal-core` ownership header.

### Acción 2: Convertir `src/utils/legalReferenceResolver.ts` en re-export

Reemplazar el contenido del archivo original con re-exports:

```typescript
/**
 * @deprecated Import from '@/shared/legal/knowledge/referenceResolver' instead.
 * Re-export mantenido para compatibilidad — no borrar hasta F3+ migración de consumidores.
 */
export { resolveLegalReference, linkifyLegalReferences } from '@/shared/legal/knowledge/referenceResolver';
export type { LegalLinkResult } from '@/shared/legal/knowledge/referenceResolver';
```

### Acción 3: Actualizar barrel export `src/shared/legal/index.ts`

Añadir re-exports del resolver:

```typescript
export { resolveLegalReference, linkifyLegalReferences } from './knowledge/referenceResolver';
export type { LegalLinkResult } from './knowledge/referenceResolver';
```

### Acción 4: Verificar build

`npx tsc --noEmit` para confirmar cero errores.

## Archivos

| Archivo | Acción |
|---|---|
| `src/shared/legal/knowledge/referenceResolver.ts` | Crear (contenido migrado + ownership header) |
| `src/utils/legalReferenceResolver.ts` | Reemplazar con re-exports |
| `src/shared/legal/index.ts` | Añadir exports del resolver |

## Archivos que NO se tocan

- `LegalAdvisorPanel.tsx` — sigue importando desde `@/utils/legalReferenceResolver` (funciona via re-export)
- Edge functions, tablas, hooks, state machine

## Ownership

- `src/shared/legal/knowledge/referenceResolver.ts` → **Shared Legal Core**
- `src/utils/legalReferenceResolver.ts` → **Deprecated re-export shim**
- `LegalAdvisorPanel.tsx` → **Consumidor** (migrar import directo en F3)

## Notas para F3

- Migrar `LegalAdvisorPanel.tsx` para importar directamente desde `@/shared/legal`
- Evaluar si `LegalLinkResult` debe integrarse con `LegalReference` del shared core
- Considerar mover diccionarios de leyes (SPANISH_LAWS, EU_REGULATIONS, ANDORRAN_LAWS) a un archivo de datos separado en `knowledge/`

