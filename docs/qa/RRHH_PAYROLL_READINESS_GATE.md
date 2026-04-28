# RRHH / Nómina — Payroll Readiness Gate

**Estado:** CERRADO (BUILD controlado).
**Modo:** Read-only / informativo. Sin impacto en motor.

## Objetivo

Mostrar dentro del diálogo "Nueva Nómina" un panel que indique si la nómina del
empleado/período está **LISTA**, requiere **REVISIÓN** o debe quedar **BLOQUEADA**,
agregando 18 verificaciones derivadas de las fuentes ya existentes.

## Componente

- `src/components/erp/hr/payroll/HRPayrollReadinessGate.tsx` (nuevo, 100% presentacional)
- Insertado en `src/components/erp/hr/HRPayrollEntryDialog.tsx` encima del
  `HRPersistedIncidentsPanel` (columna izquierda).

## 18 verificaciones

### Identidad y contrato
1. Empleado correctamente identificado.
2. Contrato vigente.
3. Convenio identificado.
4. Grupo profesional informado.
5. Grupo de cotización informado.

### Parametrización salarial
6. Salario parametrizado.
7. Unidad salarial definida (mensual / anual).
8. Número de pagas definido (12–16).

### Casuística e incidencias
9. SafeMode (activo ⇒ bloqueante).
10. Conceptos obligatorios completos.
11. Incidencias persistidas en el período.
12. Conflictos local ↔ persistido.
13. Incidencias no aplicadas al cálculo (unmapped).
14. Revisión legal requerida.

### Cálculo · guardado · oficiales
15. Comunicaciones oficiales (estado dry-run).
16. La nómina puede calcularse internamente.
17. La nómina puede guardarse.
18. La nómina debe quedar bloqueada.

## Mapeo de fuentes (read-only)

| Señal | Fuente |
|---|---|
| SafeMode | `normalizerResult.safeMode` |
| Convenio | `agreementSource`, `normalizerResult.agreementResolutionStatus`, `agreementConflictDetected` |
| Contrato | `resolvedContractId` (+ coherencia opcional vía normalizer) |
| Incidencias persistidas | `useHRPayrollIncidencias` → `payrollIncidents` |
| Conflictos local↔persistido | `buildEffectiveCasuistica` → `conflicts` |
| Unmapped | `mapping.unmapped` |
| Revisión legal | `mapping.legalReviewRequired` |
| Oficiales | `isRealSubmissionBlocked()` |

## Reglas de derivación del gate global

- **BLOCKED**: cualquier check con status `block`
  (SafeMode, convenio `missing`, contrato `incoherent`, revisión legal requerida,
  empleado/contrato no identificado, salario no parametrizado).
- **REVIEW**: cualquier check con status `warn` y sin bloqueos
  (convenio `doubtful`/`manual`, conflictos, unmapped, oficiales pendientes en dry-run).
- **READY**: en caso contrario.

## Frases seguras para cliente

- "Antes de calcular comprobamos automáticamente 18 puntos de la nómina."
- "Si algo está incompleto, el panel lo muestra y propone revisarlo."
- "Las comunicaciones oficiales siguen en modo simulación: nada se envía sin tu aprobación."

## Invariantes respetadas

- ✅ `simulateES` no modificado.
- ✅ `salaryNormalizer.ts`, `agreementSalaryResolver.ts`, `contractSalaryParametrization.ts` no modificados.
- ✅ `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`, `deltaArtifactEngine.ts` no modificados.
- ✅ `persisted_priority_apply` sigue **OFF**.
- ✅ `isRealSubmissionBlocked() === true` se respeta y se muestra al usuario.
- ✅ Sin BD, RLS, migraciones, edge functions, dependencias ni CI tocados.
- ✅ Componente puro: sin queries, sin mutations, sin efectos, sin side-effects.

## Archivos modificados

- ➕ `src/components/erp/hr/payroll/HRPayrollReadinessGate.tsx` (nuevo)
- ✏️ `src/components/erp/hr/HRPayrollEntryDialog.tsx` (1 import + 1 bloque JSX)
- ➕ `docs/qa/RRHH_PAYROLL_READINESS_GATE.md` (este documento)

## Próximo paso recomendado

Recoger feedback del usuario que confecciona nóminas y, si procede, abrir un
plan separado para wirear el botón Calcular/Guardar a `gate.canCalculate` /
`gate.canSave` (hoy intencionalmente desacoplado).

## RRHH/NÓMINA — Payroll Readiness Gate CERRADO

- **Fecha de cierre:** 2026-04-28
- **Modo:** BUILD documental (cierre).

### Resumen funcional

Panel read-only "Estado de preparación de la nómina" insertado en el diálogo
"Nueva Nómina" (`HRPayrollEntryDialog.tsx`). Agrega 18 verificaciones
derivadas de señales ya existentes en el dialog padre (SafeMode, convenio,
contrato, parametrización salarial, incidencias, comunicaciones oficiales) y
expone un badge global con tres estados: **READY** / **REVIEW** / **BLOCKED**.
No altera cálculo, guardado ni comunicaciones oficiales.

### Archivos creados

- ➕ `src/components/erp/hr/payroll/HRPayrollReadinessGate.tsx`
- ➕ `src/components/erp/hr/payroll/__tests__/HRPayrollReadinessGate.test.tsx`
- ➕ `docs/qa/RRHH_PAYROLL_READINESS_GATE.md`

### Archivo modificado

- ✏️ `src/components/erp/hr/HRPayrollEntryDialog.tsx` (1 import + 1 bloque JSX)

### Tests

- ✅ **8/8 tests verdes** en `HRPayrollReadinessGate.test.tsx`
  (cobertura de los 3 estados globales y de la lógica de derivación por checks).

### Confirmaciones funcionales

- ✅ El panel es **100% read-only**.
- ✅ Incluye **18 checks** agrupados en 4 secciones.
- ✅ Estados globales soportados: **READY / REVIEW / BLOCKED**.
- ✅ **Sin queries** (no usa `supabase.from(...)` ni `functions.invoke`).
- ✅ **Sin mutations** (no escribe en BD, ni dispara edge functions).
- ✅ **Sin efectos** (no `useEffect` con side-effects; componente puro).
- ✅ **Sin botones de envío**: solo informa, no actúa.

### Confirmaciones de invariantes técnicas

- ✅ No se tocó `simulateES`.
- ✅ No se tocó `salaryNormalizer.ts`.
- ✅ No se tocó `contractSalaryParametrization.ts`.
- ✅ No se tocó `agreementSalaryResolver.ts`.
- ✅ No se tocaron `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`,
  `deltaArtifactEngine.ts`.
- ✅ No se cambió `PAYROLL_EFFECTIVE_CASUISTICA_MODE`.
- ✅ `persisted_priority_apply` sigue **OFF**.
- ✅ No se tocaron BD, RLS, migraciones, edge functions, dependencias ni CI.
- ✅ No se generaron **FDI / AFI / DELT@**, ni envíos a
  **TGSS / SEPE / AEAT / INSS** (`isRealSubmissionBlocked() === true` se
  respeta y se muestra como información en el panel).

### Riesgos residuales

- ⚠️ El panel **informa pero no bloquea por sí mismo** el cálculo: la
  decisión de calcular/guardar sigue dependiendo del usuario y del resto del
  diálogo.
- ⚠️ La **guía asistida WIZ-A** (pasos 1–3) aún **no está implementada**.
- ⚠️ **C3B3C2** sigue **bloqueada** hasta validación manual/legal.

### Próximo paso recomendado

- Implementar **WIZ-A** (guía asistida pasos 1–3) que tome los checks en
  estado `warn`/`block` y proponga al usuario rutas de resolución.
- Alternativa: ejecutar el **manual validation pack C3B3C puntos 9–12** para
  desbloquear C3B3C2.

**Estado:** ✅ **CERRADO**.