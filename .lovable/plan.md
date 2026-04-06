

# Plan: F7 — Integrar State Machine en Payroll Recalculation

## Puntos de integración identificados

**Archivo**: `src/hooks/admin/usePayrollRecalculation.ts`

Hay **2 funciones** que modifican `legal_validation_status`:

1. **`requestLegalValidation`** (líneas 272-305): Llama a edge function y luego escribe localmente `legal_validation_status: 'validated'`, `status: 'legal_validated'`. No valida estado previo.

2. **`approveRecalculation`** (líneas 308-347): Escribe `hr_approval_status: 'approved'|'rejected'` y `status: 'approved'|'rejected'`. No toca `legal_validation_status` directamente pero cambia el status general.

El punto de integración principal es **`requestLegalValidation`**, que es el análogo a `submitLegalValidation` de Settlements.

## Diferencia clave vs Settlements

En Settlements, la validación legal es una decisión humana (approve/reject). En Payroll Recalculation, `requestLegalValidation` invoca una edge function que retorna un resultado — el hook luego actualiza el estado local. El edge function no se toca (regla #6), así que la guarda se aplica **antes** de llamar a la edge function y **al actualizar el estado local** tras la respuesta.

Además, el valor legacy aquí es `'validated'` (no `'approved'`), que `mapLegacyStatus` ya mapea a `'approved'`.

## Cambio mínimo

### Acción 1: Añadir import y helper en `usePayrollRecalculation.ts`

```typescript
import {
  mapLegacyStatus,
  toLegacyStatus,
  tryTransition,
  type LegalValidationState,
  type LegalValidationEvent,
} from '@/shared/legal';

/** Recalculations treat null/pending as 'pending' (awaiting legal validation) */
function getRecalcLegalState(status: string | null | undefined): LegalValidationState {
  if (!status || status === 'pending') return 'pending';
  return mapLegacyStatus(status);
}
```

### Acción 2: Añadir guarda en `requestLegalValidation`

Antes de invocar la edge function, verificar que la transición es válida:

```typescript
const requestLegalValidation = useCallback(async (recalculationId: string) => {
  // 1. Get current state
  const current = results.find(r => r.id === recalculationId);
  const currentState = getRecalcLegalState(current?.legal_validation_status);

  // 2. Validate transition (request_legal_validation = START_REVIEW → APPROVE flow)
  // The edge function performs the review, so we check START_REVIEW first
  const reviewResult = tryTransition(currentState, 'START_REVIEW');
  if (!reviewResult.success && currentState !== 'in_review') {
    // If we can't start review and we're not already in review, block
    const approveResult = tryTransition(currentState, 'APPROVE');
    if (!approveResult.success) {
      toast.error(`Validación legal no permitida desde estado '${currentState}'`);
      console.warn('[usePayrollRecalculation] Invalid legal transition:', { currentState, recalculationId });
      return null;
    }
  }

  try {
    const { data, error: fnError } = await supabase.functions.invoke(
      'erp-hr-payroll-recalculation',
      { body: { action: 'request_legal_validation', recalculation_id: recalculationId } }
    );

    if (fnError) throw fnError;

    if (data?.success) {
      toast.success('Validación jurídica completada');

      // 3. Transition to approved via state machine
      const finalState = getRecalcLegalState(current?.legal_validation_status);
      const approveResult = tryTransition(
        finalState === 'pending' ? 'pending' : 'in_review',
        'APPROVE'
      );
      const newLegalStatus = approveResult.success
        ? (toLegacyStatus(approveResult.to!) ?? 'approved')
        : 'validated'; // Fallback to legacy value if SM fails

      setResults(prev => prev.map(r =>
        r.id === recalculationId
          ? { ...r, legal_validation_status: newLegalStatus, status: 'legal_validated' }
          : r
      ));

      return data.legal_validation;
    }
    return null;
  } catch (err) {
    console.error('[usePayrollRecalculation] requestLegalValidation error:', err);
    toast.error('Error en la validación jurídica');
    return null;
  }
}, [results]);
```

Key design decisions:
- **Pre-guard**: Blocks calling the edge function if the recalculation is already approved/rejected (prevents re-validation)
- **Post-update**: Uses `toLegacyStatus` for the new state, with fallback to `'validated'` if SM fails
- **`results` added to deps**: Same pattern as Settlements with `settlements`
- **No edge function changes**: All guards are client-side

### Acción 3: Tests

Create `src/__tests__/hooks/usePayrollRecalcLegalTransition.test.ts`:

```typescript
// Tests:
// 1. pending → APPROVE → approved ✓
// 2. null/undefined → treated as pending → APPROVE → approved ✓  
// 3. 'validated' (legacy) → maps to approved → APPROVE blocked ✓
// 4. approved → APPROVE blocked (no re-validation) ✓
// 5. rejected → needs RESET first → APPROVE blocked ✓
// 6. Round-trip: toLegacyStatus after transition preserves DB values ✓
```

## Archivos

| Archivo | Acción |
|---|---|
| `src/hooks/admin/usePayrollRecalculation.ts` | Modificar (import shared + guard en requestLegalValidation) |
| `src/__tests__/hooks/usePayrollRecalcLegalTransition.test.ts` | Crear (6 tests) |

## Archivos que NO se tocan

- `HRPayrollRecalculationPanel.tsx` — sigue leyendo `legal_validation_status` sin cambios
- `usePayrollRuns.ts` — tiene su propio `updateRecalculation` pero no toca legal_validation_status
- Edge functions — fuera de alcance
- Tablas — sin cambios

## Compatibilidad

| Aspecto | Garantía |
|---|---|
| `legal_validation_status` en DB | Sin cambios. Edge function sigue escribiendo lo que escribía |
| Estado local `'validated'` | `mapLegacyStatus('validated')` = `'approved'` — ya mapeado |
| Panel UI | Lee `legal_validation_status` directamente, sin ruptura |
| `approveRecalculation` | No toca `legal_validation_status`, no necesita guarda SM |

## Riesgos residuales

| Riesgo | Nivel | Mitigación |
|---|---|---|
| Edge function escribe `'validated'` en DB pero SM produce `'approved'` vía `toLegacyStatus` | Bajo | El estado local usa el valor SM; al re-fetch desde DB, `'validated'` mapea a `'approved'` igualmente |
| `results` en deps de `useCallback` | Bajo | Mismo patrón validado en F6 Settlements |

