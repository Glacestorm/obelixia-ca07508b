# P2.1 — Pipeline de Baja Unificado End-to-End

## Implementation Report

**Date**: 2026-04-11
**Phase**: P2.1 (Cierre de Gaps Internos)
**Status**: ✅ Implementado

---

## BEFORE → AFTER

### BEFORE (Pre-P2.1)

| Aspecto | Estado |
|---|---|
| Pipeline de baja | Fragmentado en 3 flujos independientes |
| Estados | `draft, under_review, approved, in_progress, executed, cancelled` (6 estados UI, 9 en orchestration engine) |
| Finiquito | Calculable vía `calculateSettlement` pero sin conexión directa al pipeline |
| AFI Baja | Generada vía `afiArtifactEngine` pero no integrada en flujo |
| Certificado empresa | Generado vía `certificaArtifactEngine` pero no integrado en flujo |
| Validación de transiciones | Solo en `offboardingOrchestrationEngine` (no aplicada en UI) |
| Checklist | Existente pero no ligada a estados del pipeline |
| Timeline | No existía |
| Workspace unificado | No existía — cards dispersas |
| Impacto en nómina | No trazado |
| Evidence/Ledger | Parcial — solo en settlement |

### AFTER (P2.1)

| Aspecto | Estado |
|---|---|
| Pipeline de baja | **Unificado** en `offboardingPipelineEngine.ts` |
| Estados | `draft → in_review → approved_hr → pending_calculation → settlement_generated → certificate_prepared → pending_payment → closed (+cancelled)` (9 estados normalizados) |
| Finiquito | Integrado en pipeline con persistencia automática del snapshot |
| AFI Baja | Trazada como paso del pipeline |
| Certificado empresa | Trazado como paso del pipeline |
| Validación de transiciones | **Transition guards** con blockers explícitos |
| Checklist | **11 items** vinculados a estados del pipeline |
| Timeline | **Persistida** en `pipeline_timeline` (JSONB) |
| Workspace unificado | `OffboardingWorkspace.tsx` con 5 tabs |
| Impacto en nómina | Señalizado vía `deriveOffboardingSignals()` |
| Evidence/Ledger | Cada transición genera evento de ledger |

---

## Arquitectura

### Engine Layer (Pure Functions)

**`offboardingPipelineEngine.ts`** (~320 lines)
- `OffboardingPipelineState`: 9 estados normalizados
- `PIPELINE_VALID_TRANSITIONS`: mapa de transiciones válidas
- `evaluateTransitionGuard()`: guardas con blockers explícitos
- `computePipelineChecklist()`: 11 items vinculados a estados
- `deriveOffboardingSignals()`: señales cross-module
- `createOffboardingCase()`: factory con defaults legales
- `buildTimelineEvent()`: constructor de eventos de timeline

### Hook Layer (Data + State)

**`useOffboardingPipeline.ts`** (~270 lines)
- `fetchCases()`: lista de casos con mapeo legacy
- `loadCase()`: carga completa con settlement snapshot
- `transitionState()`: transición con guards + ledger + timeline
- `runSettlementCalculation()`: cálculo + persistencia
- `mapLegacyStatus()`: compatibilidad con datos existentes

### UI Layer

**`OffboardingWorkspace.tsx`** (~370 lines)
- Pipeline stepper visual
- Action bar contextual con next-state guidance
- 5 tabs: Resumen, Financiero, Documentos, Checklist, Timeline
- Blocker display con motivos explícitos

---

## Transition Guards

| Transición | Blockers |
|---|---|
| `draft → in_review` | Fecha efectiva requerida, tipo de extinción requerido |
| `in_review → approved_hr` | Fecha efectiva, observaciones si revisión legal |
| `approved_hr → pending_calculation` | Ninguno adicional |
| `pending_calculation → settlement_generated` | Finiquito no calculado, total no disponible |
| `settlement_generated → certificate_prepared` | Finiquito no calculado |
| `certificate_prepared → pending_payment` | Finiquito no calculado |
| `pending_payment → closed` | Finiquito no calculado, fecha efectiva requerida |
| `* → cancelled` | Siempre permitido desde estados no terminales |

---

## Cross-Module Signals

```typescript
interface OffboardingSignals {
  employeeStatusChange: 'active' | 'leaving' | 'terminated';
  contractEndRequired: boolean;
  finalPayrollRequired: boolean;
  extraPayProration: boolean;
  vacationLiquidation: boolean;
  irpfRegularization: boolean;
  afiBajaRequired: boolean;
  certificaRequired: boolean;
  sepeNotificationRequired: boolean;
  evidenceSnapshotRequired: boolean;
  ledgerEventRequired: boolean;
}
```

---

## DB Changes

Migration: `ALTER TABLE erp_hr_termination_analysis ADD COLUMN ...`
- `pipeline_state text DEFAULT 'draft'`
- `pipeline_timeline jsonb DEFAULT '[]'`
- `settlement_snapshot jsonb DEFAULT NULL`
- `closed_at timestamptz DEFAULT NULL`
- Index: `idx_erp_hr_termination_pipeline_state`

**No new tables created.** Reused existing `erp_hr_termination_analysis`.

---

## Reuse Matrix

| Asset existente | Reutilizado en P2.1 | Cambios |
|---|---|---|
| `offboardingOrchestrationEngine.ts` | ✅ Types, mappings | Ninguno — importado |
| `settlementEvidenceEngine.ts` | ✅ Snapshot types | Ninguno — importado |
| `certificaArtifactEngine.ts` | ✅ Status types | Ninguno — importado |
| `afiArtifactEngine.ts` | ✅ Baja subtypes | Ninguno — importado |
| `useOffboardingOrchestration.ts` | ✅ calculateSettlement | Ninguno — delegado |
| `useHRLedgerWriter.ts` | ✅ writeLedger | Ninguno — usado directamente |
| `laborDocumentEngine.ts` | ✅ FiniquitoInput/Result | Ninguno — importado |
| `erp_hr_termination_analysis` | ✅ Pipeline state storage | +4 columnas |

---

## Files Created

| File | Lines | Purpose |
|---|---|---|
| `src/engines/erp/hr/offboardingPipelineEngine.ts` | ~320 | Engine puro con estados, guards, checklist, signals |
| `src/hooks/erp/hr/useOffboardingPipeline.ts` | ~270 | Hook reactivo con persistencia |
| `src/components/erp/hr/offboarding/OffboardingWorkspace.tsx` | ~370 | Workspace unificado |
| `src/components/erp/hr/offboarding/index.ts` | 1 | Barrel export |
| `docs/P2_offboarding_unified_pipeline_report.md` | Este archivo |

## Files NOT Modified

Los siguientes engines y hooks existentes NO fueron modificados:
- `offboardingOrchestrationEngine.ts` (reutilizado sin cambios)
- `settlementEvidenceEngine.ts` (reutilizado sin cambios)
- `certificaArtifactEngine.ts` (reutilizado sin cambios)
- `afiArtifactEngine.ts` (reutilizado sin cambios)
- `useOffboardingOrchestration.ts` (reutilizado sin cambios)
- `HROffboardingPanel.tsx` (funcional independiente, workspace se añade como alternativa)

---

## Compatibilidad

- ✅ P1.x — Sin regresión (engines no modificados)
- ✅ H1.x — Employee master no tocado
- ✅ H2.x — Propagación compatible
- ✅ G1.x — AI agents no afectados
- ✅ G2.x — Mobility no afectada
- ✅ LM1-LM4 — Última milla no afectada
- ✅ Legacy status — Mapeo bidireccional implementado

---

## Limitaciones Honestas

1. **AFI Baja y Certificado**: el pipeline los traza como pasos pero no genera automáticamente los artefactos — eso requiere invocación explícita de los engines existentes
2. **Pago**: el pipeline gestiona el estado `pending_payment → closed` pero no ejecuta el pago SEPA (gap P2.3)
3. **Impacto en nómina**: señalizado pero no ejecuta automáticamente ajustes en payroll (requiere coordinación manual)
4. **isRealSubmissionBlocked**: sigue activo para AFI y Certifica — envío real requiere credenciales reales
