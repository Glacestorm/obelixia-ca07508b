# CASUISTICA-FECHAS-01 — QA LEGAL/MANUAL CHECKLIST previo a C3B3C2

**Fecha de creación:** 2026-04-27
**Modo:** BUILD documental (sin código funcional)
**Estado:** Pendiente de ejecución manual

## 1. Objetivo

Validar manual y legalmente que el modo `persisted_priority_apply` puede
activarse sin provocar doble conteo ni errores en devengos, bases de
cotización, IRPF, IT/AT, PNR, reducción de jornada, atrasos,
nacimiento/cuidado menor o comunicaciones oficiales.

## 2. Estado actual

- Default actual: `persisted_priority_preview`.
- `persisted_priority_apply`: **OFF**.
- El cálculo real sigue usando datos locales.
- La UI ya muestra conflictos local vs persistido.
- No se generan comunicaciones oficiales.
- No se envía AFI, FDI, DELT@, INSS, TGSS, SEPE ni AEAT.

## 3. Reglas legales/operativas

- Una nómina debe usar **una única fuente por concepto**.
- Nunca se debe sumar local + persistido para el mismo proceso salvo
  autorización explícita futura.
- Persistido debe ser la fuente preferente **solo cuando esté validado**.
- Procesos con `legal_review_required=true` no deben cerrarse sin
  revisión.
- Procesos `unmapped` no deben afectar al cálculo.
- FDI / AFI / DELT@ son solo flags pendientes en esta fase, **no
  comunicaciones reales**.

## 4. Checklist de 12 puntos

| Nº | Caso | Preparación de datos | Resultado esperado | Evidencia requerida | Responsable | Estado | Observaciones |
|----|------|----------------------|--------------------|---------------------|-------------|--------|---------------|
| 1 | Sin persistidos | Empleado con casuística local únicamente. Tabla `erp_hr_payroll_incidents` vacía para el período. | Cálculo idéntico al histórico/local. Banner: preview sin conflictos. | Captura UI + payload `simulateES` baseline. | RRHH | ☐ Pendiente | |
| 2 | PNR solo local | Local: `pnrDias=3`. Sin persistidos. | Cálculo idéntico al comportamiento actual (3 días PNR). | Captura UI + payload `simulateES`. | RRHH | ☐ Pendiente | |
| 3 | PNR solo persistido | Local: `pnrDias=0`. Persistido: incidencia tipo `pnr` 5 días. Modo apply (override test-only). | Motor usa PNR persistido = 5 días. | Captura panel persistidos + payload con override apply. | RRHH + Legal | ☐ Pendiente | |
| 4 | PNR local + PNR persistido | Local: `pnrDias=3`. Persistido: `pnr` 5 días. | No duplica días: gana persistido (5, no 8). Conflict visible con `Local ignorado`. | Captura conflictos + payload apply override. | RRHH + Legal | ☐ Pendiente | |
| 5 | Reducción jornada local + persistida | Local: `reduccionJornadaPct=50`. Persistido: `reduccion_jornada` 50%. | No duplica %: gana persistido (50, no 100). | Captura conflictos + payload apply override. | RRHH + Legal | ☐ Pendiente | |
| 6 | Atrasos local + persistido | Local: `atrasosITImporte=300`. Persistido: `atrasos_it` 300 €. | No duplica importe: gana persistido (300, no 600). | Captura conflictos + payload apply override. | RRHH + Legal | ☐ Pendiente | |
| 7 | IT/AT local + IT/AT persistido | Local: `itAtDias=4` tipo enfermedad común. Persistido: `it_at` 7 días tipo correcto. | No duplica días (7, no 11); gana proceso persistido; tipo correcto. | Captura conflictos + payload apply override + clasificación tipo IT. | RRHH + Legal | ☐ Pendiente | |
| 8 | Nacimiento/cuidado menor local + leave persistido | Local: `nacimientoDias=16`. Persistido: leave nacimiento 16 días aprobado. | No duplica días/importes (16, no 32). Gana persistido aprobado. | Captura conflictos + payload apply override. | RRHH + Legal | ☐ Pendiente | |
| 9 | Unmapped: `desplazamiento_temporal` / `suspension_empleo_sueldo` / `otra` | Persistir incidencia de uno de estos tipos. | Visible en UI como "No aplicado al cálculo / motor". No entra en payload. | Captura panel `unmappedInformative` + payload sin esos conceptos. | RRHH | ☐ Pendiente | |
| 10 | `legal_review_required=true` | Conflict con `legalReviewRequired=true` y `resolvedSource='persisted'`. Modo apply (override). | Warning fuerte o bloqueo de Guardar/Cierre. No cierre silencioso. | Captura botón Guardar disabled + tooltip + estado `blockingForClose=true`. | Legal | ☐ Pendiente | |
| 11 | SafeMode salarial | Activar SafeMode salarial. Aplicar casuísticas variadas (PNR, reducción, IT). | SafeMode salarial **no se altera** por la casuística. Bases salariales protegidas. | Captura SafeMode + payload + comparativa antes/después de aplicar casuística. | RRHH + Legal | ☐ Pendiente | |
| 12 | Comunicaciones oficiales | Ejecutar todos los casos anteriores. Inspeccionar logs de funciones edge oficiales. | No se genera ni envía AFI, FDI, DELT@, INSS, TGSS, SEPE ni AEAT. `isRealSubmissionBlocked()===true` confirmado. | Logs edge functions + ausencia de eventos oficiales + captura banner safety. | Compliance | ☐ Pendiente | |

## 5. Evidencias obligatorias por caso

Cada caso debe exigir:

- Captura de la UI del diálogo de nómina (`HRPayrollEntryDialog`).
- Captura del panel de conflictos (`HRCasuisticaConflictsPanel`).
- Captura de la fuente aplicada / propuesta y de los badges de modo.
- Payload o log de `simulateES` si está disponible.
- Resultado esperado vs resultado obtenido (tabla comparativa).
- Firma o validación del responsable de RRHH / Legal / Operaciones.

## 6. Criterio de aprobación

C3B3C2 solo puede plantearse si:

- **12 / 12 casos están OK**.
- No hay duplicidades.
- No hay procesos `unmapped` aplicados al cálculo.
- No hay comunicaciones oficiales generadas.
- SafeMode salarial no se ve afectado.
- Los casos con revisión legal están claramente bloqueados o advertidos.
- Existe responsable identificado que **firma** la activación.

## 7. Criterio de bloqueo

No avanzar a C3B3C2 si:

- Cualquier caso está KO.
- Falta evidencia documental.
- Se observa doble conteo en cualquier escenario.
- Se genera comunicación oficial.
- Se modifica una base / IRPF sin trazabilidad.
- Se aplica un proceso `unmapped` al cálculo.
- Se permite guardar con `legal_review_required=true` sin control reforzado.

## 8. Rollback

Procedimiento de rollback (sin BD, sin migraciones, sin edge functions):

1. Editar `src/lib/hr/payrollEffectiveCasuisticaFlag.ts`:
   `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'local_only'`.
2. Desplegar.
3. Resultado:
   - Cálculo vuelve a usar la casuística local.
   - Las incidencias persistidas **no se borran**.
   - El panel de procesos persistidos sigue visible (informativo).
   - No se requieren migraciones.
   - No se requiere RLS.
   - No se requiere edge function.
   - No hay datos a revertir (`applied_at` / `applied_to_record_id` no se
     escriben en C3B3C1).

## 9. Próximo paso

Solo si el checklist queda aprobado **12/12 con firma**:

- **CASUISTICA-FECHAS-01 — Fase C3B3C2 PLAN**: activación controlada de
  `persisted_priority_apply`, con confirmación explícita robusta para el
  bloqueo de Guardar y documentación de rollback firmada.

Si cualquier caso queda KO o sin evidencia, **NO** abrir C3B3C2 PLAN y
abrir incidencia técnica/legal con la evidencia recogida.

---

## Confirmaciones de este BUILD documental

- ❎ No se ha modificado código funcional.
- ❎ No se han cambiado flags (`PAYROLL_EFFECTIVE_CASUISTICA_MODE` sigue
  en `persisted_priority_preview`).
- ❎ Apply sigue **OFF**.
- ❎ Sin cambios en motor, `simulateES`, payload, BD, migraciones, RLS,
  edge functions, dependencias ni CI.
- ❎ Sin generación ni envío de FDI / AFI / DELT@ / INSS / TGSS / SEPE / AEAT.
- ❎ Sin `service_role`, sin writes.
- ✅ Checklist listo para ejecución manual por RRHH / Legal / Operaciones.