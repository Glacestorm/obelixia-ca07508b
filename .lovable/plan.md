

# Plan: F2 — Migración Incremental de Imports hacia Shared Legal Core

## Objetivo

Hacer que los 3 hooks principales del módulo legal (`useLegalValidationGateway`, `useLegalValidationGatewayEnhanced`, `useCrossModuleOrchestrator`) y `useLegalAdvisor` consuman tipos desde `src/shared/legal/` en lugar de definirlos inline. Mantener re-exports en ubicaciones originales para zero-breaking-change.

## Estrategia

Cada hook migrado sigue este patrón:
1. Importar tipo canónico desde `@/shared/legal`
2. Eliminar la definición inline del tipo duplicado
3. Re-exportar el tipo canónico con el alias original para mantener compatibilidad de barrel exports

## Acciones

### Acción 1: Migrar `useLegalValidationGateway.ts`

**Tipos a migrar:**
- `ValidationRiskLevel` → importar `LegalRiskLevel`, re-exportar como `ValidationRiskLevel`
- `ModuleType` → importar `LegalModuleType`, re-exportar como `ModuleType`

`ValidationStatus` en este hook incluye `'auto_approved'` que NO está en el shared core, por lo que se queda local (o se añade al superset).

```typescript
import type { LegalRiskLevel, LegalModuleType } from '@/shared/legal';
export type ValidationRiskLevel = LegalRiskLevel;
export type ModuleType = LegalModuleType; // nota: shared tiene más valores, superset compatible
```

### Acción 2: Migrar `useLegalValidationGatewayEnhanced.ts`

**Tipos a migrar:**
- `RiskLevel` → `LegalRiskLevel`
- `ModuleType` → `LegalModuleType`

```typescript
import type { LegalRiskLevel, LegalModuleType } from '@/shared/legal';
export type RiskLevel = LegalRiskLevel;
export type ModuleType = LegalModuleType;
```

### Acción 3: Migrar `useCrossModuleOrchestrator.ts`

**Tipos a migrar:**
- `ModuleType` → `LegalModuleType`

```typescript
import type { LegalModuleType } from '@/shared/legal';
export type ModuleType = LegalModuleType;
```

### Acción 4: Migrar `useLegalAdvisor.ts`

**Tipos a migrar (parcial):**
- `risk_level: 'low' | 'medium' | 'high' | 'critical'` en `LegalAdvice`, `ValidationResult`, `RiskAssessment` → reemplazar inline literal por `LegalRiskLevel`

`LegalJurisdiction` en Advisor tiene campos extra (`id`, `legal_system`, `is_active`) que no están en `LegalJurisdictionInfo`, así que se queda local. `LegalContext` del Advisor tiene `urgency` y campos opcionales distintos, también se queda local.

```typescript
import type { LegalRiskLevel } from '@/shared/legal';
// Usar LegalRiskLevel en lugar de inline 'low' | 'medium' | 'high' | 'critical'
```

### Acción 5: Ampliar `LegalValidationStatus` en shared core

Añadir `'auto_approved'` y `'escalated'` al superset canónico para cubrir las variantes de Gateway y Enhanced:

```typescript
export type LegalValidationStatus =
  | 'pending' | 'pending_validation' | 'pending_approval'
  | 'review_required' | 'approved' | 'auto_approved'
  | 'validated' | 'rejected' | 'blocked' | 'escalated';
```

### Acción 6: Verificar build

`npx tsc --noEmit` para confirmar cero errores.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/shared/legal/types.ts` | Añadir `auto_approved`, `escalated`, `pending_approval` a `LegalValidationStatus` |
| `src/hooks/admin/legal/useLegalValidationGateway.ts` | Import + re-export `ValidationRiskLevel`, `ModuleType` |
| `src/hooks/admin/legal/useLegalValidationGatewayEnhanced.ts` | Import + re-export `RiskLevel`, `ModuleType` |
| `src/hooks/admin/legal/useCrossModuleOrchestrator.ts` | Import + re-export `ModuleType` |
| `src/hooks/admin/legal/useLegalAdvisor.ts` | Import `LegalRiskLevel`, usar en interfaces inline |

## Archivos que NO se tocan

- Edge functions
- Tablas / migraciones
- Barrel exports (`src/hooks/admin/legal/index.ts`) — los re-exports en hooks mantienen nombres existentes
- Hooks fuera del módulo legal (HR, support, security) — se migrarán en F3+

## Garantía de no ruptura

- Todos los tipos re-exportados mantienen su nombre original
- Barrel exports en `index.ts` siguen funcionando sin cambios
- Componentes que importan desde barrels no se tocan
- Build verificado con TypeScript

## Notas para F3

- Migrar hooks HR que usan `'low' | 'medium' | 'high' | 'critical'` inline
- Migrar `usePredictiveLegalAnalytics` risk levels
- Evaluar si `LegalJurisdiction` del Advisor debe extender `LegalJurisdictionInfo`

