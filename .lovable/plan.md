

# Plan: F6 — Integrar State Machine en HR Settlements

## Punto de integración exacto

**Archivo**: `src/hooks/admin/useSettlements.ts`, líneas 406-440
**Función**: `submitLegalValidation(settlementId, approved, notes?, checks?)`

Hoy esta función escribe directamente `'approved'` o `'rejected'` en `legal_validation_status` sin validar la transición desde el estado actual. Esto significa que:
- No hay guard contra transiciones inválidas (ej: re-aprobar algo ya aprobado)
- No hay trazabilidad del estado previo

## Cambio mínimo

### Acción 1: Modificar `submitLegalValidation` en `useSettlements.ts`

Añadir import:
```typescript
import { 
  mapLegacyStatus, 
  toLegacyStatus, 
  tryTransition,
  type LegalValidationEvent 
} from '@/shared/legal';
```

Modificar la función para:
1. Obtener el settlement actual del state local (ya disponible en `settlements[]`)
2. Mapear su `legal_validation_status` actual al estado canónico con `mapLegacyStatus()`
3. Determinar el evento: `approved ? 'APPROVE' : 'REJECT'`
4. Llamar `tryTransition(currentState, event)`
5. Si la transición es inválida, mostrar toast de error y retornar `false` (guard)
6. Si es válida, escribir `toLegacyStatus(result.to)` en la DB (en vez del string hardcoded)

```typescript
const submitLegalValidation = useCallback(async (
  settlementId: string,
  approved: boolean,
  notes?: string,
  checks?: Array<{ check: string; passed: boolean; notes?: string }>
): Promise<boolean> => {
  if (!user?.id) return false;

  // 1. Get current state from local data
  const current = settlements.find(s => s.id === settlementId);
  const currentState = mapLegacyStatus(current?.legal_validation_status);
  
  // 2. Validate transition
  const event: LegalValidationEvent = approved ? 'APPROVE' : 'REJECT';
  const result = tryTransition(currentState, event);
  
  if (!result.success) {
    toast.error(`Transición no permitida: ${result.reason}`);
    console.warn('[useSettlements] Invalid transition:', result);
    return false;
  }

  setIsLoading(true);
  try {
    const { error: updateError } = await supabase
      .from('erp_hr_settlements')
      .update({
        legal_validation_status: toLegacyStatus(result.to!) ?? 'pending',
        legal_validation_at: new Date().toISOString(),
        legal_validated_by: user.id,
        legal_validation_notes: notes,
        legal_compliance_checks: checks || [],
        status: approved ? 'pending_hr_approval' : 'rejected',
      })
      .eq('id', settlementId);

    if (updateError) throw updateError;
    toast.success(approved ? 'Validación legal aprobada' : 'Finiquito rechazado');
    await loadSettlements();
    return true;
  } catch (err) {
    console.error('[useSettlements] submitLegalValidation error:', err);
    toast.error('Error en validación legal');
    return false;
  } finally {
    setIsLoading(false);
  }
}, [user?.id, loadSettlements, settlements]);
```

**Nota clave**: Se añade `settlements` al array de dependencias del `useCallback` para acceder al estado actual.

### Acción 2: Tests unitarios

Crear `src/__tests__/hooks/useSettlementsLegalTransition.test.ts` con tests de la lógica de transición (sin mocking de Supabase, solo validando que `tryTransition` + `mapLegacyStatus` producen los resultados correctos para los escenarios de Settlements):

- `null` (nuevo finiquito) → APPROVE → `approved` ✓
- `null` → REJECT → `rejected` ✓  
- `'pending'` → APPROVE → `approved` ✓
- `'approved'` → APPROVE → blocked (transición inválida) ✓
- `'rejected'` → APPROVE → blocked (necesita RESET primero) ✓
- Round-trip: `mapLegacyStatus(null)` = `'not_required'`, `tryTransition('not_required', 'APPROVE')` = invalid ✓

**Problema detectado**: Un settlement con `legal_validation_status: null` mapea a `'not_required'` via `mapLegacyStatus`. Desde `'not_required'`, solo `REQUEST_REVIEW` es válido — ni APPROVE ni REJECT lo son. Esto bloquearía el flujo actual.

### Acción 2b: Resolver el caso `null` → approve/reject

El flujo actual permite aprobar/rechazar un settlement que nunca pasó por revisión (`legal_validation_status: null`). Para mantener compatibilidad:

- Tratar `null` como `'pending'` específicamente en el contexto de Settlements (ya que un settlement creado está implícitamente pendiente de validación legal)
- Implementar esto con un helper local mínimo:

```typescript
function getSettlementLegalState(status: string | null): LegalValidationState {
  // Settlements treat null as 'pending' (implicitly awaiting legal review)
  if (!status) return 'pending';
  return mapLegacyStatus(status);
}
```

Esto resuelve el caso sin modificar la state machine global.

### Acción 3: Actualizar barrel (NO necesario)

No se necesitan cambios en `src/shared/legal/index.ts` — ya exporta todo lo necesario.

## Estrategia de compatibilidad

| Aspecto | Estrategia |
|---|---|
| `legal_validation_status` en DB | Sin cambios. Los valores `'approved'`/`'rejected'`/`'pending'` siguen siendo los mismos strings |
| Panel UI (`HRSettlementsPanel`) | Sin cambios. Sigue leyendo `settlement.legal_validation_status` directamente |
| `ValidationStatus` type | Sin cambios. Sigue siendo `'pending' | 'approved' | 'warning' | 'rejected'` |
| Flujo funcional visible | Idéntico para approve/reject. Nuevo: guard contra re-aprobación |

## Archivos

| Archivo | Acción |
|---|---|
| `src/hooks/admin/useSettlements.ts` | Modificar (import shared + guard en submitLegalValidation) |
| `src/__tests__/hooks/useSettlementsLegalTransition.test.ts` | Crear (6-8 tests de transición) |

## Archivos que NO se tocan

- `HRSettlementsPanel.tsx` — sin cambios UI
- `validationStateMachine.ts` — sin modificaciones
- Edge functions — fuera de alcance
- Tablas / migraciones — sin cambios
- Payroll Recalculation — fase posterior

## Riesgo residual

| Riesgo | Nivel | Mitigación |
|---|---|---|
| `settlements` en useCallback deps causa re-renders | Bajo | Array ref cambia solo tras `loadSettlements()`, que ya causa re-render |
| Guard bloquea flujo edge-case no previsto | Bajo | El helper `getSettlementLegalState` cubre el caso `null` → `pending` |
| `'warning'` status (en `ValidationStatus`) no tiene mapping en SM | Nulo | `'warning'` es un status de AI validation, no de legal validation — no pasa por `submitLegalValidation` |

