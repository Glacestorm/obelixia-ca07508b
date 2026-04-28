# B4.c — Bridge + hook + UI warnings para convenios no validados

**Fase:** B4.c · **Modo:** BUILD acotado (data layer + hook + UI + tests) · **Estado:** ✅ Completado.

## 1. Qué se ha propagado

La decisión del `agreementSafetyGate` (B4.a) — ya cableada defensivamente en
el resolver (B4.b) — ahora se propaga **a través de la capa de datos, el hook
y la UI**, sin tocar la tabla operativa, RLS, edge functions ni motores.

### 1.1. Data layer — `src/lib/hr/collectiveAgreementRegistry.ts`

- `UnifiedCollectiveAgreement` añade campo opcional `safety: AgreementSafetyDecision`.
- `getCollectiveAgreementByCode` y `getCollectiveAgreementsByCnae` adjuntan
  automáticamente la decisión de seguridad en cada resultado, mapeando
  `sourceLayer` → `AgreementOrigin`:
  - `'registry'` → `'registry'`
  - `'legacy_static'` → `'legacy_ts_fallback'`
  - `'operative'` → `'operative'` (extendido para el bridge)
  - `'unknown'` / null / undefined → `'unknown'`
- Nuevas exportaciones puras:
  - `mapSourceLayerToOrigin(layer)` — mapping `sourceLayer → AgreementOrigin`.
  - `attachAgreementSafety(record, options?)` — devuelve copia con `safety`.
  - `buildBridgeSafetyContext({ agreement, sourceLayer, hasManualSalary })` —
    helper puro que produce el `safetyContext` que espera
    `resolveSalaryFromAgreement`.

### 1.2. Hook — `src/hooks/erp/hr/useCollectiveAgreementRegistry.ts`

Re-expone los nuevos helpers (`attachSafety`, `buildBridgeSafetyContext`,
`mapSourceLayerToOrigin`) sin cambiar la firma de los métodos existentes.

### 1.3. Bridge

`useESPayrollBridge.ts` **NO se ha modificado**. La integración se realiza
mediante el helper puro `buildBridgeSafetyContext`, que el bridge u otros
callers pueden invocar cuando estén listos para pasar `safetyContext` al
resolver. Esto evita riesgo en un fichero de 2.031 líneas y respeta el
acuerdo del prompt ("Si useESPayrollBridge es difícil de montar: testear
helper interno o extraer función pura mínima").

El comportamiento por defecto del bridge (sin `safetyContext`) sigue
exactamente igual gracias a B4.b (resolver retro-compatible).

### 1.4. UI — `PayrollSafeModeBlock.tsx`

Nuevas props opcionales:

```ts
agreementSafetyDecision?: AgreementSafetyDecision | null;
agreementSafetyWarnings?: AgreementSafetyCode[] | null;
```

Si llega cualquier bloqueo o warning, se renderiza una nueva tarjeta
**estrictamente informativa** con:

- Cabecera "Convenio no validado para cálculo automático" (o "Avisos de
  convenio" si `allowed === true`).
- Badge "Pendiente de validación humana" cuando `allowed === false`.
- Lista legible de mensajes (uno por código).
- Lista de campos faltantes (`missing[]`) cuando aplica.
- Recordatorio de que la validación se gestiona en
  *HR → Compliance → Convenios Colectivos*.
- **NO** se ofrece CTA "Activar convenio" ni "Marcar ready".

## 2. Qué warnings ve el usuario

| Código | Mensaje |
|---|---|
| `AGREEMENT_NOT_READY_FOR_PAYROLL` | El convenio seleccionado aún no está validado para cálculo automático de nómina. |
| `AGREEMENT_MISSING_SALARY_TABLES` | Faltan tablas salariales oficiales del convenio. |
| `AGREEMENT_REQUIRES_HUMAN_REVIEW` | El convenio requiere revisión humana antes de aplicarse a nómina. |
| `AGREEMENT_NON_OFFICIAL_SOURCE` | La fuente del convenio no está verificada como oficial. |
| `AGREEMENT_STATUS_NOT_VIGENTE` | El convenio no está en estado vigente; no puede alimentar nómina automática. |
| `LEGACY_STATIC_FALLBACK_REQUIRES_REVIEW` | El convenio procede del catálogo legacy y debe revisarse antes de uso real. |
| `MANUAL_SALARY_WITH_UNVALIDATED_AGREEMENT` | Se usará el salario manual informado; el convenio no validado no alimentará conceptos automáticos. |
| `OPERATIVE_TABLE_AGREEMENT_NOT_MIRRORED` | El convenio operativo no está espejado en el Registro Maestro; pendiente de validación. |
| `AGREEMENT_CONFLICT_EMPLOYEE_VS_CONTRACT` | Se ha detectado un conflicto de convenio entre empleado y contrato. |

## 3. Por qué NO cambia importes actuales

- `useESPayrollBridge.ts` no se ha tocado.
- El resolver (B4.b) sólo evalúa el gate cuando el caller pasa `safetyContext`.
  Las llamadas existentes siguen entrando en la rama `'operative'` por
  default y devuelven los mismos importes.
- Los nuevos componentes UI son aditivos: si el caller no pasa
  `agreementSafetyDecision`/`agreementSafetyWarnings`, no se renderiza nada
  nuevo.

## 4. Por qué NO se activan convenios del registry

- La tabla `erp_hr_collective_agreements_registry` mantiene
  `ready_for_payroll = false` para todos los seeds (B2 invariante).
- La UI no expone ningún botón para escribir en la tabla.
- `attachAgreementSafety` es **puro** (no DB, no fetch).
- Cualquier convenio del registry retorna `allowed: false` hasta superar
  todos los checks (B4.a).

## 5. Tests

Suite específica B4.c:
- ✅ `src/__tests__/hr/collective-agreements-data-layer.test.ts` — extendido
  con 4 tests adicionales para verificar `safety` adjunto.
- ✅ `src/__tests__/hr/payroll-bridge-agreement-safety.test.ts` — 9 tests:
  mapping puro, context builder, integración con resolver, no DB writes.
- ✅ `src/__tests__/hr/payroll-safe-mode-agreement-warnings.test.tsx` —
  6 tests UI: cada mensaje + ausencia de CTA + render condicional.

Suite agregada B1+B2+B3+B4.a+B4.b+B4.c + UI safeMode original:
**96/96 verdes** (8 ficheros, 3.5 s).

Regresión nómina (sin tocar):
**21/21 verdes** (`payroll-positive-path`, `ssContributions`, `itEngine`,
`garnishmentEngine`).

## 6. Qué NO se ha hecho (siguientes fases)

- ❌ B5 — Importer metadata masivo de convenios reales (REGCON / BOE / boletines).
- ❌ B6 — Clasificación CNAE/territorio automatizada con propuestas humanas.
- ❌ B7 — Parser de tablas salariales oficiales.
- ❌ B8 — Workflow de validación humana + activación controlada de
  `ready_for_payroll`.

## 7. Confirmación de aislamiento

- ✅ Tabla operativa `erp_hr_collective_agreements` intacta (no tocada).
- ✅ Registro Maestro DB intacto (todos los seeds siguen
  `ready_for_payroll = false`).
- ✅ RLS / migraciones / edge functions sin cambios.
- ✅ `payslipEngine`, `salaryNormalizer`, `ssContributionEngine`,
  `irpfEngine` sin cambios.
- ✅ `useESPayrollBridge.ts` sin cambios.
- ✅ Fixtures Carlos Ruiz, Command Center, HRModule, flags,
  `persisted_priority_apply`, C3B3C2 sin cambios.
- ✅ Payroll actual preservado (regresión 21/21 verde).
