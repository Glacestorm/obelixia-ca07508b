

# Plan: F3 — Validation State Machine Compartida

## Objetivo

Crear `src/shared/legal/compliance/validationStateMachine.ts` con una state machine tipada que centralice la semántica de validación legal dispersa en Settlements, Payroll Recalculation y Offboarding, sin alterar comportamiento actual.

## Análisis de estados actuales

### Tabla `erp_hr_settlements`
- `legal_validation_status`: `null` → `'pending'` → `'approved'` | `'rejected'`
- `status` (settlement): `'draft'` → `'calculated'` → `'pending_legal_validation'` → `'pending_hr_approval'` → `'approved'` → `'paid'` | `'rejected'` | `'cancelled'`

### Tabla `erp_hr_payroll_recalculations`
- `legal_validation_status`: `null` | `'pending'` → `'approved'`
- `status`: `'pending'` → `'ai_validated'` → `'legal_reviewed'` → `'legal_validated'` → `'approved'` | `'rejected'`

### Tabla `erp_hr_terminations` (Offboarding)
- `legal_review_required`: `boolean`
- `legal_review_status`: `null` | `'pending'` → `'approved'`

### Patrón común extraído
Todos siguen: `null/pending → approved | rejected`, con variantes menores. La state machine debe modelar este flujo base más las transiciones específicas.

## Acciones

### Acción 1: Crear `src/shared/legal/compliance/validationStateMachine.ts`

Define:

```typescript
// Estados canónicos de validación legal
export type LegalValidationState = 
  | 'not_required' | 'pending' | 'in_review' 
  | 'approved' | 'rejected' | 'escalated';

// Eventos que disparan transiciones
export type LegalValidationEvent = 
  | 'REQUEST_REVIEW' | 'START_REVIEW' | 'APPROVE' 
  | 'REJECT' | 'ESCALATE' | 'RESET';

// Mapa de transiciones válidas
const TRANSITIONS: Record<LegalValidationState, Partial<Record<LegalValidationEvent, LegalValidationState>>>

// Funciones puras:
// - transition(current, event) → next | null
// - canTransition(current, event) → boolean
// - getAvailableEvents(current) → LegalValidationEvent[]
// - mapLegacyStatus(raw: string | null) → LegalValidationState
// - toLegacyStatus(state: LegalValidationState) → string | null
```

Incluye `mapLegacyStatus` para traducir valores existentes en DB (`null`, `'pending'`, `'approved'`, `'rejected'`) al estado canónico, y `toLegacyStatus` para el camino inverso. Esto garantiza compatibilidad con las tablas actuales sin migraciones.

### Acción 2: Crear test `src/__tests__/shared/legal/validationStateMachine.test.ts`

Tests unitarios cubriendo:
- Todas las transiciones válidas
- Transiciones inválidas retornan `null`
- `mapLegacyStatus` mapea correctamente todos los valores existentes en DB
- `toLegacyStatus` round-trip consistency
- `getAvailableEvents` retorna eventos correctos por estado
- Edge cases: `null`, `undefined`, strings vacíos

### Acción 3: Actualizar barrel `src/shared/legal/index.ts`

Añadir re-exports de la state machine.

### Acción 4: Verificar build

`npx tsc --noEmit` + `npx vitest run` para los tests.

## Archivos

| Archivo | Acción |
|---|---|
| `src/shared/legal/compliance/validationStateMachine.ts` | Crear |
| `src/__tests__/shared/legal/validationStateMachine.test.ts` | Crear |
| `src/shared/legal/index.ts` | Añadir exports |

## Archivos que NO se tocan

- **Hooks HR** (`useSettlements`, `usePayrollRecalculation`) — No se integran en esta fase. La state machine queda disponible para consumo futuro.
- **Componentes UI** — Sin cambios.
- **Edge functions** — Sin cambios.
- **Tablas/migraciones** — Sin cambios.
- `obligationEngine`, `employeeLegalProfileEngine` — Fuera de alcance.

## Decisión: NO integrar consumidores en F3

La regla 5 del usuario exige tests antes de integrar. La integración en hooks HR se hará en F4, donde `useSettlements.submitLegalValidation` y `usePayrollRecalculation` usarán `transition()` para validar cambios de estado antes de escribir en DB. En F3 solo se crea la state machine + tests.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Valores legacy no mapeados | `mapLegacyStatus` tiene fallback a `'pending'` para valores desconocidos |
| State machine no cubre variantes futuras | Diseño extensible: añadir estados/eventos no rompe el contrato |
| Drift entre DB values y state machine | Round-trip test `toLegacyStatus(mapLegacyStatus(x)) === x` lo detecta |

## Garantía de compatibilidad

- Zero cambios en archivos existentes (salvo barrel export).
- Funciones puras sin side effects.
- Legacy mapping bidireccional testado.
- No se altera ningún flujo de escritura a DB.

## Notas para F4

- Integrar `transition()` en `useSettlements.submitLegalValidation` como guard antes del `.update()`
- Integrar en `usePayrollRecalculation` para validar cambio de `legal_validation_status`
- Evaluar si `HROffboardingPanel` debe usar la state machine para `legal_review_status`
- Considerar feature flag `LEGAL_SM_ENABLED` para rollback seguro

