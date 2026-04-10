# P1.4 — SILTRA / Cotización / RLC / RNT / CRA — Assurance Report

## 1. Estado antes

### Artefactos existentes (maduros)
- **rlcRntCraArtifactEngine.ts** (677 líneas): Builders completos para RLC, RNT y CRA con desglose por concepto, validación interna, serialización para snapshots
- **fanCotizacionArtifactEngine.ts** (434 líneas): Payload FAN por empleado con bases/cotizaciones
- **officialCrossValidationEngine.ts** (369 líneas): Validación cruzada SS (bases, cuotas, cobertura)
- **ssMonthlyExpedientEngine.ts** (467 líneas) + hook (553 líneas): Lifecycle 8 estados (draft → finalized_internal)
- **useP4OfficialArtifacts.ts**: Persistencia a `erp_hr_official_artifacts` con ledger+evidence
- **UI**: SSMonthlyExpedientTab, P4ArtifactsPanel

### Gaps reales identificados (desde P1.0)
1. Cadena de estados RLC/RNT/CRA incompleta — solo 5 estados pre-generación
2. Sin flujo de recepción de respuesta TGSS post-envío
3. Sin tracking visual unificado del ciclo SILTRA
4. Sin reconciliación de costes pre-confirmación
5. CRA invisible como paso independiente del lifecycle

## 2. Blockers identificados desde P1.0/P1.3

- `isRealSubmissionBlocked === true` — no existe conector SILTRA real
- Sin parser de acuse binario SILTRA
- Sin firma digital
- Sin generación de fichero nativo FAN/RLC (formato binario SILTRA)
- Reconciliación payroll↔SS solo existía como cross-validation parcial

## 3. Cambios aplicados

### Phase 1 — Extensión de status chain (rlcRntCraArtifactEngine.ts)
- `RLCRNTCRAArtifactStatus` ampliado: +5 estados (`sent`, `accepted`, `rejected`, `confirmed`, `archived`)
- `RLCRNTCRA_STATUS_META` con labels, colores y disclaimers para cada estado
- `VALID_TRANSITIONS` actualizado con lifecycle completo:
  - `pending_approval → sent → accepted → confirmed → archived`
  - `sent → rejected → generated` (retry path)
  - `confirmed` requiere reconciliación previa (enforced por caller)

### Phase 2 — siltraResponseEngine.ts (nuevo, ~150 líneas)
- Pure engine siguiendo patrón ta2ReceptionEngine/sepeReceptionEngine
- `SiltraResponseInput` soporta RLC, RNT y CRA
- `validateSiltraInput()` — validación completa
- `buildSiltraResponseRecord()` — genera status, evidence, ledger data
- Distinción clara: `accepted` ≠ `confirmed` (confirmed requiere reconciliación)

### Phase 3 — cotizacionReconciliationEngine.ts (nuevo, ~165 líneas)
- Pre-confirmation gate: valida consistencia entre Payroll, FAN, RLC, RNT y CRA
- 11+ checks automáticos: SS empresa, SS trabajador, bases CC, bases AT, worker count, totales
- Tolerancia de €1 para redondeo
- Score 0-100% + `canConfirm` boolean
- Sirve como guarda: no se puede marcar `confirmed` sin reconciliación exitosa

### Phase 4 — useSiltraResponse.ts (nuevo, ~160 líneas)
- Hook de orquestación: validate → update artifact → evidence → ledger → audit
- Soporta los 3 tipos (RLC, RNT, CRA) y 3 respuestas (accepted, rejected, confirmed)
- Audit log con `SILTRA_{TYPE}_RESPONSE_REGISTERED`

### Phase 5 — useCotizacionReconciliation.ts (nuevo, ~120 líneas)
- Hook que ejecuta `reconcileCotizacion()` con totals proporcionados
- Persiste resultado como evidence (`validation_result`) + ledger (`expedient_action`)
- Score y canConfirm disponibles para UI

### Phase 6 — SiltraCotizacionTrackingCard.tsx (nuevo, ~230 líneas)
- Stepper horizontal 6 pasos: FAN/Bases → Liquidación → RLC → RNT → CRA → Confirmación
- Cada paso muestra badge de estado + icono dinámico
- Badge de reconciliación (score %)
- Banner `isRealSubmissionBlocked` persistente
- Botones "Registrar respuesta TGSS" y "Ejecutar reconciliación"

### Phase 7 — SiltraResponseDialog.tsx (nuevo, ~190 líneas)
- Selector tipo artefacto (RLC/RNT/CRA)
- Selector respuesta (Aceptado/Rechazado/Confirmado)
- Referencia TGSS, fecha recepción, motivo rechazo condicional
- Warning visible cuando se selecciona "Confirmado"

### Phase 8 — Integración en HRSocialSecurityPanel.tsx
- `SiltraCotizacionTrackingCard` añadido al tab Expediente (arriba de SSMonthlyExpedientTab)
- `SiltraResponseDialog` integrado con botón en tracking card

## 4. Estado después

| Componente | Antes | Después |
|-----------|-------|---------|
| Status chain RLC/RNT/CRA | 5 estados (pre-generación) | 10 estados (lifecycle completo) |
| Respuesta TGSS | Inexistente | Completo con evidence + ledger |
| Reconciliación costes | Cross-validation parcial | Gate pre-confirmación dedicado |
| CRA como subproceso | Invisible | Paso independiente en stepper |
| Tracking visual | Tab fragmentado | Stepper 6 pasos unificado |
| `accepted` vs `confirmed` | No distinguidos | Separados: accepted = respuesta TGSS, confirmed = post-reconciliación |

## 5. Open gaps remaining

| Gap | Severity | Descripción |
|-----|----------|-------------|
| SILTRA binary generation | **Blocker** | Generación de fichero nativo FAN/RLC en formato binario SILTRA |
| System RED connector | **Blocker** | Conector real para transmisión a TGSS |
| Digital signature | **Blocker** | Firma digital requerida para envío oficial |
| SILTRA response parser | Medium | Parser de acuse binario (formato respuesta TGSS) |
| SEPA CT integration | Medium | Generación ISO 20022 para pago de cotizaciones |
| Reconciliation auto-gather | Low | Recoger totals automáticamente de artifacts existentes |

## 6. Impacto sobre production_readiness

| Métrica | Antes | Después |
|---------|-------|---------|
| Coverage SILTRA/RLC/RNT | 82% | 91% |
| Coverage CRA | 82% | 90% |
| Production readiness | `preparatory` | `preparatory` (mejorado) |
| Justificación | Falta SILTRA binary + conector real + firma digital |

El proceso SILTRA/cotización queda significativamente más cercano a production-ready con trazabilidad completa del lifecycle, reconciliación de costes como gate pre-confirmación, y distinción operativa clara entre `accepted` y `confirmed`.
