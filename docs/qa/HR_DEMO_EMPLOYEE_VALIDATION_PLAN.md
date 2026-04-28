# HR — Validation Pack Empleado DEMO · Plan

**Estado:** Fase A+B (documentación + fixture + helpers).
**Modo:** READ-ONLY sobre producción · Solo se crean docs y tests.
**Invariantes duras:**
- `isRealSubmissionBlocked() === true` en todo el pack.
- `persisted_priority_apply` OFF.
- C3B3C2 BLOQUEADA.
- Cero envíos reales a TGSS / SEPE / AEAT / SILTRA / DELT@ / INSS.
- Ningún artefacto se marca como `official_ready`, `submitted` o `accepted` sin evidencia real.
- Stock options con clasificación no cerrada → `HUMAN_REVIEW_REQUIRED`.
- Expatriados / desplazados con posible 7p / 216 → `HUMAN_REVIEW_REQUIRED`, jamás auto-aplicado.

---

## 1. Objetivo

Verificar de forma reproducible y honesta el ciclo completo del empleado DEMO en RRHH / Nómina España, sin tocar producción y sin enviar nada real a las administraciones, dejando trazado:

- Qué partes del ciclo **ya funcionan** end-to-end.
- Qué partes están **parciales** (solo UI, solo motor, sin cuadre).
- Qué partes son **GAP**.
- Qué partes son **BLOQUEADAS** por dependencia externa (credenciales / UAT).
- Qué partes exigen **revisión humana** legal/fiscal antes de marcar oficial.
- Si la **nómina imprimible final** suma correctamente devengos, deducciones, bases, IRPF, SS trabajador, SS empresa, líquido y coste empresa.
- Si **stock options** y **expatriados/desplazados** impactan realmente en payslip + 111/190 + RLC/RNT/CRA, o si solo aparecen como entidad/dashboard.

---

## 2. Alcance — Empleado DEMO

Empleado base: **Carlos Ruiz Martín** (alineado con `RRHH_DEMO_GUION_PASO_A_PASO_EMPLEADO_DEMO.md`).
Compañía DEMO determinista. Sin red, sin DB. Fixture in-memory.

Casos auxiliares (mismos perfiles del guion existente) reutilizables si el motor los exige.

---

## 3. Casos a validar

| # | Caso |
|---|---|
| 1 | Registro del empleado DEMO |
| 2 | AFI alta TGSS (DRYRUN) |
| 2b | TA2 alta (DRYRUN) |
| 2c | IDC si aplica (DRYRUN) |
| 2d | Contrat@ SEPE (DRYRUN) |
| 3 | Nómina mensual compleja (HE + flex + SO + PNR + AT) |
| 3a | Horas extras |
| 3b | Seguro médico como retribución flexible |
| 3c | Stock options |
| 3d | 1 día de permiso no retribuido |
| 3e | Baja médica por accidente de trabajo (IT-AT) |
| 4 | Permiso por nacimiento (INSS preparatorio, FDI si aplica) |
| 5 | Desplazamiento temporal fuera de España (entre fechas) |
| 6 | Nómina de atrasos por IT no introducida (correction run, L03 si procede) |
| 7 | Reducción de jornada por guarda legal |
| 8 | Informes (costes, resumen, recibo, registro, incidencias, horas, SS, fiscal 111/190) |
| 9 | Seguros sociales (BASES, SOLCON, RLC, RNT, CRA en DRYRUN; cuadre `SS_emp + SS_trab − prestaciones = RLC`) |
| 10 | Registro horario |
| 11 | Modelos 111 / 190 (acumulados, claves/subclaves, SO y flex incluidos) |
| 12a | Liquidación por despido disciplinario (indemnización 0; finiquito) |
| 12b | Liquidación por despido objetivo (20 d/año; tope 12 mensualidades) |
| 12c | Vacaciones pendientes / L13 si procede |
| 12d | Transferencia / SEPA CT del finiquito |
| 13 | Comunicaciones de salida (AFI baja, TA2 baja, Certific@2 SEPE — DRYRUN) |
| 14 | Recibo final imprimible con todos los conceptos sumando |

---

## 4. Reglas duras

- Todo en **DRYRUN** / preview / `internal_ready`.
- Cero envíos reales.
- No marcar `official_ready` / `submitted` / `accepted` sin (a) credencial vigente, (b) UAT homologada o envío real, (c) respuesta oficial recibida, (d) evidencia archivada en ledger inmutable HR.
- Stock options:
  - Si `classification ∈ { 'supported_with_review', 'out_of_scope' }` o `requiresHumanReview === true` → bloquear marcado oficial.
  - Nunca silenciar SO; si el motor no las refleja, marcar GAP / PARTIAL.
- Expatriados / desplazados:
  - Posible exención **Art. 7.p LIRPF** o **Modelo 216** → siempre `HUMAN_REVIEW_REQUIRED`, nunca aplicación automática.
  - Si solo aparece "mobility dashboard" sin impacto en payslip + 111/190 → PARTIAL, no PASS.
- Honestidad de datos: cualquier estimación IA debe ir etiquetada `(est.)`.
- Si algo no impacta payslip + informes, marcar PARTIAL.

---

## 5. Estrategia de tests

### 5.1 Unitarios (engines puros, sin red ni DB)
- Cálculo de payslip con casuística completa.
- Clasificación de stock options.
- Cuadre RLC/RNT/CRA.
- Coherencia 111 / 190.
- Settlement disciplinario y objetivo.
- `payrollRunEngine` modo `correction` para atrasos.

### 5.2 Integración mockeada (sin DB real)
- Pipeline payslip → render model → labels mínimos.
- Generación AFI/TA2/Contrat@/Certific@2/FAN/RLC/RNT en DRYRUN → assert sobre estructura, nunca envío.

### 5.3 Fixture in-memory determinista
- `src/__tests__/hr/demo-employee/fixtures/carlos-ruiz.ts`.
- Importes simples, redondeo a 2 decimales.
- Snapshots esperados de payslip / atrasos / settlement disciplinario / settlement objetivo.

### 5.4 Comparadores reutilizables
- `expectPayslipTotals` — totales y coherencia interna del payslip.
- `expectArtifactDryRun` — defensivo, valida que no hay envío real.
- `expectSSReconciliation` — `SS_emp + SS_trab − prestaciones = RLC` (±0.01).
- `expect111190Coherence` — bases y retenciones acumuladas vs modelo.
- `expectPrintablePayslip` — render model contiene secciones y conceptos especiales.

### 5.5 Matriz final
- `HR_DEMO_EMPLOYEE_VALIDATION_MATRIX.md`.
- Estado real arranca en `PENDING_VALIDATION`. Solo Fase C lo cambia a PASS/PARTIAL/GAP/BLOCKED_EXTERNAL/HUMAN_REVIEW_REQUIRED.

---

## 6. Lo que NO se hace en esta fase

- No se ejecutan motores reales contra el fixture.
- No se cambia ningún engine, hook ni componente de producción.
- No se modifican RLS, migraciones, edge functions, `supabase/config.toml`, flags.
- No se desbloquea C3B3C2 ni se activa `persisted_priority_apply`.
- No se generan PDFs binarios; solo render model.

---

## 7. Entregables

- `docs/qa/HR_DEMO_EMPLOYEE_VALIDATION_PLAN.md` (este archivo).
- `docs/qa/HR_DEMO_EMPLOYEE_VALIDATION_MATRIX.md`.
- `src/__tests__/hr/demo-employee/fixtures/carlos-ruiz.ts`.
- `src/__tests__/hr/demo-employee/helpers/{expectPayslipTotals,expectArtifactDryRun,expectSSReconciliation,expect111190Coherence,expectPrintablePayslip}.ts`.
- `src/__tests__/hr/demo-employee/demo-validation-pack-smoke.test.ts`.

---

## 8. Criterio de aceptación de Fase A+B

- Solo se crean documentos y tests/helpers/fixtures.
- Suite HR completa verde.
- Matriz queda en `PENDING_VALIDATION`.
- Helpers reutilizables por la Fase C.
- Stock options y expatriados tratados como casos sensibles con revisión humana cuando aplique.