# P2.3 — SEPA CT Generator Report

## Estado: ✅ IMPLEMENTADO

## Resumen Ejecutivo

P2.3 implementa el generador de transferencias SEPA Credit Transfer (SCT) conforme a ISO 20022 pain.001.001.03 para pagos internos de nómina y finiquito. El gap documentado en P1.3 ("SEPA CT: NOT YET IMPLEMENTED") queda cerrado.

---

## Arquitectura

### Domain Engine — `src/engines/erp/hr/sepaCtEngine.ts`

Motor puro de dominio sin dependencias externas:

| Componente | Función |
|---|---|
| `validateIBAN()` | Validación MOD-97 (ISO 13616) |
| `validateBatch()` | Validación completa de lote (IBAN, importes, duplicidades) |
| `generateSEPACTXml()` | Generador XML pain.001.001.03 |
| `canTransition()` | Máquina de estados del lote |
| `evaluateValidationReadiness()` | Guard de transición a "validado" |
| `computeBatchSummary()` | KPIs agregados del lote |

### Estados del Lote

```
draft → validated → generated → exported → paid
  ↓         ↓           ↓          ↓
  └─────────┴───────────┴──────────┘
                cancelled
```

| Estado | Descripción |
|---|---|
| `draft` | Líneas ensambladas, edición permitida |
| `validated` | Todas las líneas pasan validación |
| `generated` | XML producido y disponible |
| `exported` | Descargado / enviado a portal bancario |
| `paid` | Confirmado por tesorería |
| `cancelled` | Anulado |

### Hook — `src/hooks/erp/hr/useSEPACTBatch.ts`

Gestión del ciclo de vida del lote con integración Supabase:

- `assembleFromPeriod()` — Ensambla líneas desde registros de nómina
- `toggleLineExclusion()` — Excluir/incluir líneas individualmente
- `validateCurrentBatch()` — Ejecuta validación completa
- `generateXml()` — Genera XML + evidencia en ledger
- `downloadXml()` — Descarga del fichero
- `markExported()` / `markPaid()` / `cancelBatch()` — Transiciones de estado

### UI — `src/components/erp/hr/sepa/SEPACTWorkspace.tsx`

Workspace completo con:

- Pipeline stepper visual (5 pasos)
- KPIs: líneas activas, importe total, excluidas, errores/avisos
- Tabla de líneas con IBAN, importe, tipo, estado, acción excluir/incluir
- Panel de validación con errores y warnings
- Vista previa del XML generado
- Barra de acciones contextual según estado

---

## Validaciones Implementadas

| Validación | Severidad | Detalle |
|---|---|---|
| Empleado sin IBAN | Error | Bloquea validación |
| IBAN inválido (MOD-97) | Error | Verificación ISO 13616 |
| Importe neto ≤ 0 | Error | Bloquea línea |
| Duplicidad de pago | Error | Mismo sourceType:sourceId |
| Concepto vacío/corto | Warning | No bloquea |
| IBAN empresa inválido | Error | A nivel de lote |
| Lote sin líneas activas | Error | A nivel de lote |

---

## Integraciones

| Módulo | Integración |
|---|---|
| **Payroll** | Ensambla líneas desde `hr_payroll_records` (net_salary) |
| **Employee Master** | Lee IBAN desde `erp_hr_employees` |
| **Ledger/Evidence** | Registra generación XML como evento auditable |
| **Payment Tracking** | `usePaymentTracking.sepaReady = true` (gap cerrado) |
| **Settlement** | Soporte para `sourceType: 'settlement'` en líneas |

---

## Formato XML

Esquema: `urn:iso:std:iso:20022:tech:xsd:pain.001.001.03`

Estructura:
```
Document
└── CstmrCdtTrfInitn
    ├── GrpHdr (MsgId, CreDtTm, NbOfTxs, CtrlSum, InitgPty)
    └── PmtInf (PmtInfId, PmtMtd=TRF, SvcLvl=SEPA, ReqdExctnDt, Dbtr, DbtrAcct)
        └── CdtTrfTxInf[] (EndToEndId, InstdAmt, Cdtr, CdtrAcct/IBAN, RmtInf)
```

---

## Frontera de Automatización

| Acción | Automatizable | Nota |
|---|---|---|
| Ensamblaje de líneas | ✅ Sí | Desde registros de nómina |
| Validación | ✅ Sí | MOD-97, importes, duplicidades |
| Generación XML | ✅ Sí | Determinista, sin side-effects |
| Descarga fichero | ✅ Sí | Browser download |
| Upload a portal bancario | ❌ No | Requiere acción manual en banca online |
| Conciliación bancaria | ❌ No | Requiere fuente externa (extracto) |
| Confirmación de pago | ⚠️ Manual | Operador confirma tras verificar en banco |

---

## Ficheros Creados/Modificados

| Fichero | Acción |
|---|---|
| `src/engines/erp/hr/sepaCtEngine.ts` | Creado — domain engine |
| `src/hooks/erp/hr/useSEPACTBatch.ts` | Creado — lifecycle hook |
| `src/components/erp/hr/sepa/SEPACTWorkspace.tsx` | Creado — UI workspace |
| `src/components/erp/hr/sepa/index.ts` | Creado — barrel export |
| `src/hooks/erp/hr/usePaymentTracking.ts` | Modificado — sepaReady=true, gap doc updated |
| `docs/P2_sepa_ct_report.md` | Creado — este informe |

---

## Compatibilidad

- ✅ P1.x — Sin regresión (payment tracking extendido, no roto)
- ✅ H1.x / H2.x — Sin impacto
- ✅ G1.x / G2.x — Sin impacto
- ✅ LM1-LM4 — Compatible
- ✅ No se tocan RLS ni tablas
- ✅ No se crean tablas nuevas

---

## Siguiente Paso Recomendado

**P2.4** — Integración cruzada + hardening + tests para consolidar P2.1 (offboarding), P2.2 (IT/FDI) y P2.3 (SEPA CT).
