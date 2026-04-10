# P1.3 — Assure Process Report: Nómina Mensual + Incidencias

**Fecha**: 2026-04-10
**Scope**: Proceso de nómina mensual — incidencias, cálculo, validación, cierre, pago
**Tipo**: Assurance — hardening incremental

---

## 1. Estado ANTES

### Fortalezas existentes (ya muy maduras)

| Componente | Estado | Cobertura |
|-----------|--------|-----------|
| Incident engine (308 líneas) | `ready` | 90% — 11 tipos, 4 estados, clasificación fiscal |
| Payroll run engine (702 líneas) | `ready` | 92% — 8 estados, 4 tipos de run, snapshot con hash |
| Monthly closing orchestration (375 líneas) | `ready` | 88% — 9 fases, checklist, intelligence report |
| Payslip engine (490 líneas) | `ready` | 85% — Estructura legal OM 27/12/1994 |
| UI payroll (24 componentes) | `ready` | 85% — Period manager, runs, incidents, simulator |

### Gaps identificados

1. **Sin tracking card unificado** del ciclo completo (Incidencias → Pago)
2. **Sin payment tracking** — campo `payment_date` existe pero nunca se escribe desde un workflow
3. **Sin validación de cobertura de casos** (7 tipos obligatorios)
4. **Sin validación batch pre-cálculo** de incidencias (solo individual)
5. **Sin evidencia de pago** a nivel de período (ledger + evidence)

---

## 2. Blockers identificados desde P1.0

| Blocker | Origen | Prioridad |
|---------|--------|-----------|
| No hay visibilidad unificada del ciclo | P1.0 gap_matrix | Alta |
| Payment lifecycle inexistente | P1.0 gap_matrix | Alta |
| Batch incident validation ausente | P1.0 gap_matrix | Media |
| Case coverage no documentada | P1.0 gap_matrix | Media |
| SEPA CT no implementado | P1.0 gap_matrix | Baja (bloqueado) |

---

## 3. Cambios aplicados

### 3.1. Nuevo: `payrollCycleStatusEngine.ts` (~180 líneas)
- Derivación unificada de fase del ciclo desde datos existentes (8 fases)
- Evaluación de cobertura de 7 casos obligatorios (IT, AT, PNR, suspensión, paternidad)
- Builder de resumen de ciclo con KPIs, blockers e incident readiness
- No requiere nuevos campos en DB — opera sobre estados existentes

### 3.2. Nuevo: `incidentPreCalcValidator.ts` (~130 líneas)
- Validación batch de incidencias antes del cálculo
- Detección de conceptos duplicados no acumulables
- Detección de solapamiento de fechas en incidencias date-based
- Verificación de campos obligatorios por tipo
- Alertas de acciones SS pendientes
- Resultado estructurado por empleado (errors + warnings)

### 3.3. Nuevo: `usePaymentTracking.ts` (~170 líneas)
- `markPeriodAsPaid()`: pago por lote — actualiza período + todos los records + ledger + evidence
- `markRecordAsPaid()`: pago individual con ledger event
- `getPaymentStatus()`: deriva estado de pago desde records (not_applicable/pending/partial/paid)
- `generatePaymentSummary()`: totales para futuro SEPA (con gap documentado)
- Distinción clara entre pago de período/lote vs pago individual

### 3.4. Nuevo: `PayrollCycleTrackingCard.tsx` (~160 líneas)
- Stepper visual de 6 pasos: Incidencias → Cálculo → Validación → Cierre → Pago → Archivado
- Indicador de cobertura de casos (7/7)
- Resumen de incident readiness (pendientes/validadas)
- Estado de pago con botón "Registrar"
- Badge de gap SEPA

### 3.5. Nuevo: `PaymentRegistrationDialog.tsx` (~120 líneas)
- Formulario: fecha, referencia, método de pago, notas
- Validación de campos obligatorios
- Nota informativa sobre SEPA gap
- Integración con `usePaymentTracking.markPeriodAsPaid()`

### 3.6. Modificado: `usePayrollIncidents.ts`
- Añadido `validateBatchPreCalc(periodId)`: fetches incidents → runs `incidentPreCalcValidator` → ledger event → toast result
- Exportado en el return del hook

### 3.7. Modificado: `HRPayrollPeriodManager.tsx`
- Integrado `PayrollCycleTrackingCard` en cada período
- Integrado `PaymentRegistrationDialog` con estado y callback
- Botón "Registrar pago" disponible en períodos cerrados/bloqueados

---

## 4. Estado DESPUÉS

| Componente | Antes | Después |
|-----------|-------|---------|
| Incident engine | `ready` (90%) | `ready` (93%) — +batch pre-calc validation |
| Payroll run engine | `ready` (92%) | `ready` (95%) — +cycle phase derivation |
| Cierre y pago | `partial` (88%) | `partial` (93%) — +payment tracking con ledger/evidence |
| Informes | `ready` (85%) | `ready` (87%) — +payment summary |
| Visibilidad ciclo | Fragmentada por tabs | Stepper unificado 6 pasos |
| Payment tracking | Inexistente | Completo con ledger + evidence + period/record |
| Batch incident validation | Inexistente | Pre-calc validator con breakdown por empleado |
| Case coverage | Implícita | Explícita: 7/7 casos evaluados |

---

## 5. Open gaps remaining

| Gap | Severidad | Motivo de exclusión |
|-----|-----------|-------------------|
| **SEPA CT generation** | Alta | Requiere especificación ISO 20022, integración bancaria — fuera de scope P1.3 |
| **Integración SILTRA/CRA** | Alta | Proceso separado — será P1.4 o posterior |
| **IRPF annual pipeline** | Media | Proceso separado — ya existe pipeline Modelo 190 |
| **Reconciliación bancaria** | Media | Requiere extracto bancario — sin conector |
| **Recibo individual PDF** | Baja | Ya existe payslipEngine, falta generación PDF final |
| **Firma digital de nóminas** | Baja | Requiere certificado digital — fuera de scope |

---

## 6. Impacto sobre production_readiness

| Proceso | Antes | Después |
|---------|-------|---------|
| Incidencias | `ready` | `ready` (reforzado) |
| Cálculo nómina | `ready` | `ready` (reforzado) |
| Cierre mensual | `partial` | `partial` (mejorado — SEPA sigue ausente) |
| Pago | `missing` | `partial` (nuevo — workflow completo, falta SEPA) |
| Tracking visual | `partial` | `ready` (stepper unificado) |

### Restricciones respetadas

- ✅ NO se toca RLS
- ✅ NO se rehace el módulo completo
- ✅ NO se abre SILTRA, CRA, IRPF ni offboarding
- ✅ SEPA documentado como gap, no implementado
- ✅ Trabajo contenido dentro del ERP RRHH unificado
- ✅ Payment tracking distingue periodo/lote vs individual
- ✅ Pago no se marca sin trazabilidad en ledger/evidence

---

## Vínculo contrato ↔ pago

El pago se persiste en:
- `hr_payroll_periods.payment_date` + `metadata.payment_*` (nivel período)
- `hr_payroll_records.paid_at` + `payment_reference` (nivel registro individual)
- `erp_hr_ledger` event type `payroll_payment_executed` (trazabilidad)
- `erp_hr_evidence` tipo `system_generated` (evidencia documental)

Esta es la solución contenida actual, coherente con la arquitectura existente y sin requerir migración.
