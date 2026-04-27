# CASUISTICA-FECHAS-01 — Paquete de validación manual previo a C3B3C2

**Fecha de creación:** 2026-04-27
**Modo:** BUILD documental (sin código funcional tocado)
**Estado:** Plantilla operativa para ejecución manual por RRHH / Legal / Operaciones / Compliance.

---

## 1. Objetivo

Preparar y guiar la **validación manual y legal** de los 4 puntos pendientes del informe
`docs/qa/CASUISTICA-FECHAS-01_C3B3C_QA_EXECUTION_REPORT.md` antes de permitir
abrir la fase **C3B3C2 PLAN** (activación controlada de `persisted_priority_apply`).

Puntos cubiertos por este paquete:

- **Punto 9** — `unmapped` visible en UI y **no aplicado al cálculo**.
- **Punto 10** — `legal_review_required` con **warning fuerte y bloqueo de Guardar**.
- **Punto 11** — **SafeMode salarial no se altera** por la casuística.
- **Punto 12** — **No generación ni envío** de comunicaciones oficiales.

---

## 2. Estado actual (al crear este paquete)

- `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'persisted_priority_preview'` ✅
- `persisted_priority_apply` **OFF** ✅
- Cálculo real de nómina sigue usando casuística **local** ✅
- Tests automáticos: **62 / 62 verdes** ✅
- Puntos 1–8 → ✅ OK automáticos
- Puntos 9, 10, 11, 12 → pendientes de **evidencia + firma**
- Sin writes, sin migraciones, sin edge functions, sin RLS, sin `service_role`, sin dependencias, sin CI tocados ✅
- `simulateES` y motores oficiales (FDI / AFI / DELT@) **intactos** ✅

---

## 3. Instrucciones generales para cada punto

Cada punto debe ejecutarse en **entorno demo / test** (nunca producción) y registrar:

1. **Entorno**: demo / test (confirmado) — nunca prod.
2. **Empresa de prueba** (`company_id`).
3. **Empleado de prueba** (`employee_id` y nombre).
4. **Periodo de prueba** (mes / año de nómina).
5. **Captura UI**: Nueva Nómina abierta con el caso visible.
6. **Captura del panel de procesos persistidos / panel de conflictos** mostrando el badge o aviso correspondiente.
7. **Evidencia complementaria**:
   - payload simulado (cuando aplique),
   - logs de consola si revelan ausencia de calls oficiales,
   - estado de `isRealSubmissionBlocked()` cuando aplique.
8. **Responsable** ejecutor + rol.
9. **Firma o validación** (nombre, fecha, método de firma — interna o adjunta).
10. **Resultado**: OK / KO.
11. **Observaciones**: cualquier desviación, riesgo o nota legal.

> ⚠️ Ningún punto se puede dar por OK sin captura + firma. KO en cualquier punto bloquea C3B3C2.

---

## 4. Punto 9 — `unmapped` visible y no aplicado al cálculo

### Objetivo
Confirmar que las incidencias persistidas con tipo no mapeado
(`desplazamiento_temporal`, `suspension_empleo_sueldo`, `otra`) aparecen en la UI
como **"No aplicado al cálculo"** y **no entran en el payload del motor**.

### Pasos
1. Asegurar entorno demo/test.
2. Crear o seleccionar una incidencia persistida con tipo `desplazamiento_temporal`,
   `suspension_empleo_sueldo` u `otra` para el empleado y periodo de prueba.
3. Abrir **Nueva Nómina** del empleado para ese periodo.
4. Abrir el **panel de procesos persistidos** y el **panel de conflictos** (`HRCasuisticaConflictsPanel`).
5. Confirmar visualmente:
   - badge o etiqueta **"No aplicado al cálculo"** sobre el ítem unmapped,
   - el ítem aparece como informativo, no como sustitución ni override.
6. Confirmar que **PNR, IT/AT, reducción de jornada, atrasos y nacimiento NO se modifican**
   por la presencia del unmapped (comparar con simulación previa sin unmapped si es necesario).
7. Confirmar (devtools / preview de payload) que el `payload` que recibiría el motor
   **no incluye** la incidencia unmapped en campos efectivos.

### Capturas requeridas
- UI Nueva Nómina con panel persistidos visible.
- Detalle del badge "No aplicado al cálculo".
- Comparativa de bases / conceptos antes y después del unmapped (deben ser iguales).

### Resultado esperado
El cálculo es **idéntico** al caso sin la incidencia unmapped. La UI deja constancia visual
de que existe pero no aplica.

### Criterio OK / KO
- **OK**: badge presente + cálculo invariante + payload sin unmapped efectivo.
- **KO**: cualquier alteración numérica del cálculo o ausencia del badge.

### Firma
- Responsable: RRHH / Legal
- Nombre / fecha / firma: ____________________
- Resultado: ☐ OK ☐ KO

---

## 5. Punto 10 — `legal_review_required` warning + bloqueo Guardar

### Objetivo
Verificar que una incidencia con `legal_review_required = true` muestra un **warning fuerte**
en la UI y que, en modo `apply` activado en test (override puntual), **no permite guardar / cerrar
la nómina silenciosamente**.

### Pasos
1. Asegurar entorno demo/test.
2. Localizar / crear una incidencia persistida con `legal_review_required = true`
   para el empleado y periodo de prueba.
3. Abrir **Nueva Nómina** del empleado.
4. Confirmar warning visible en panel de procesos persistidos / panel de conflictos.
5. Confirmar que el botón **Guardar** aparece **deshabilitado** o con bloqueo,
   y muestra el motivo (tooltip/aviso) "revisión legal pendiente".
6. Aplicar override puntual del modo a `persisted_priority_apply` **solo en test**
   (no persistir el flag, no desplegar). Repetir intento de Guardar.
7. Confirmar que **no se generan comunicaciones oficiales** (revisar UI, logs y network).
8. Confirmar que `Guardar` **no queda permitido silenciosamente** con apply activo
   mientras `legal_review_required` siga true.
9. Restaurar el modo a `persisted_priority_preview` al terminar la prueba.

### Capturas requeridas
- Warning visible junto a la incidencia.
- Botón Guardar deshabilitado + tooltip / motivo.
- Logs/Network mostrando ausencia de llamadas a engines oficiales.

### Resultado esperado
El usuario **no puede cerrar** la nómina con una incidencia en revisión legal pendiente
sin acción explícita. **Cero** comunicaciones oficiales generadas.

### Criterio OK / KO
- **OK**: warning visible + Guardar bloqueado + sin calls oficiales.
- **KO**: Guardar permitido silenciosamente, ausencia de warning o cualquier call oficial.

### Firma
- Responsable: Legal / Operaciones
- Nombre / fecha / firma: ____________________
- Resultado: ☐ OK ☐ KO
- Observaciones (incluir propuesta de confirmación reforzada para C3B3C2): ____________________

---

## 6. Punto 11 — SafeMode salarial no se altera por casuística

### Objetivo
Verificar que el **SafeMode salarial** (caso típico: Carlos Ruiz u otro empleado con contrato
incoherente o salario fuera de banda de convenio) **no se desactiva ni altera** por la
presencia de procesos persistidos o casuística local.

### Pasos
1. Asegurar entorno demo/test.
2. Seleccionar empleado con SafeMode salarial activo (contrato incoherente / salario sin parametrizar).
3. Confirmar **estado inicial** del SafeMode (activo, motivo, tarjeta de referencia de convenio informativa).
4. Añadir / activar procesos persistidos y casuística local relevantes (PNR, reducción, IT, atrasos).
5. Re-abrir Nueva Nómina y verificar:
   - SafeMode **sigue activo** mientras el contrato siga incoherente,
   - la tarjeta de **referencia de convenio sigue siendo informativa** (no fuerza cálculo),
   - **no se desbloquea** el cálculo salarial automático por las incidencias,
   - bases salariales antes/después de la casuística son consistentes con SafeMode.
6. Aplicar override puntual `persisted_priority_apply` en test y repetir verificación.
7. Restaurar modo a `persisted_priority_preview`.

### Capturas requeridas
- Estado SafeMode activo (banner / aviso).
- Tarjeta convenio en modo informativo.
- Bases salariales antes y después de casuística (deben respetar SafeMode).

### Resultado esperado
SafeMode salarial **invariante** frente a la casuística (local o persistida, preview o apply).

### Criterio OK / KO
- **OK**: SafeMode permanece activo, no hay cálculo salarial automático nuevo, tarjeta convenio sigue informativa.
- **KO**: SafeMode se desactiva, se desbloquea cálculo salarial, o tarjeta convenio pasa a impositiva.

### Firma
- Responsable: RRHH / Legal
- Nombre / fecha / firma: ____________________
- Resultado: ☐ OK ☐ KO
- Observaciones (recomendado: solicitar test cruzado automatizable en C3B3C2-precheck): ____________________

---

## 7. Punto 12 — Cero comunicaciones oficiales

### Objetivo
Confirmar que el flujo de casuística **no genera ni envía** ningún artefacto / comunicación
oficial: AFI, FDI, DELT@, INSS, TGSS, SEPE, AEAT.

### Pasos
1. Asegurar entorno demo/test.
2. Ejecutar el flujo completo de Nueva Nómina con casuística persistida + local.
3. Revisar la **UI**: solo deben aparecer flags visuales / informativos.
4. Revisar **logs** (consola del navegador y, si procede, edge function logs):
   no debe aparecer invocación a `fdiArtifactEngine`, `afiInactivityEngine`,
   `deltaArtifactEngine`, ni a endpoints de TGSS / SEPE / AEAT / INSS.
5. Confirmar que `isRealSubmissionBlocked()` sigue retornando `true` (invariante global).
6. Confirmar visualmente que no se ha disparado ningún job de filing oficial.

### Capturas / evidencias requeridas
- Logs de consola del flujo completo (sin invocaciones a engines oficiales).
- Captura/registro del estado `isRealSubmissionBlocked() === true`.
- Confirmación de que UI no ofrece botones de envío oficial en este flujo.

### Resultado esperado
**Cero** comunicaciones oficiales emitidas o intentadas.

### Criterio OK / KO
- **OK**: ningún engine oficial invocado, `isRealSubmissionBlocked() === true` y UI sin botones de envío.
- **KO**: cualquier invocación, intento, o exposición de envío oficial.

### Firma
- Responsable: Compliance
- Nombre / fecha / firma: ____________________
- Resultado: ☐ OK ☐ KO

---

## 8. Tabla de firmas

| Punto | Responsable | Fecha | Estado | Evidencia adjunta | Firma / validación | Observaciones |
|-------|-------------|-------|--------|-------------------|--------------------|---------------|
| 9 — Unmapped | RRHH / Legal | | ☐ OK ☐ KO | | | |
| 10 — Legal review required | Legal / Operaciones | | ☐ OK ☐ KO | | | |
| 11 — SafeMode salarial | RRHH / Legal | | ☐ OK ☐ KO | | | |
| 12 — Comunicaciones oficiales | Compliance | | ☐ OK ☐ KO | | | |

---

## 9. Criterio de avance a C3B3C2

Solo se puede solicitar **C3B3C2 PLAN** si **TODAS** estas condiciones se cumplen:

- Punto 9 → **OK** con evidencia y firma.
- Punto 10 → **OK** con evidencia y firma.
- Punto 11 → **OK** con evidencia y firma.
- Punto 12 → **OK** con evidencia y firma.
- **No** se ha detectado doble conteo en ningún caso.
- **No** se ha generado ninguna comunicación oficial.
- **SafeMode salarial** se mantiene invariante frente a la casuística.
- Procesos `unmapped` **no afectan** al cálculo bajo ninguna circunstancia.

---

## 10. Criterio de bloqueo

**No** se debe avanzar a C3B3C2 si se cumple **cualquiera** de estas condiciones:

- Cualquier punto 9–12 queda en **KO**.
- Falta evidencia (captura, payload, log) en cualquier punto.
- Falta firma / validación responsable en cualquier punto.
- Se detecta cualquier **write no esperado** durante la prueba.
- Se genera o intenta generar cualquier **comunicación oficial**.
- Se altera el **SafeMode salarial** por casuística.
- Cualquier proceso **unmapped** afecta el cálculo.

En cualquier KO: revertir override de modo si se aplicó, dejar sistema en
`persisted_priority_preview` con apply OFF, y abrir incidencia técnica antes de re-intentar.

---

## 11. Trazabilidad

- Documento padre: `docs/qa/CASUISTICA-FECHAS-01_C3B3C_QA_LEGAL_MANUAL_CHECKLIST.md`
- Informe de ejecución: `docs/qa/CASUISTICA-FECHAS-01_C3B3C_QA_EXECUTION_REPORT.md`
- Cierre fase previa: `docs/qa/CASUISTICA-FECHAS-01_C3B3C1_preview_default.md`
- Flag controlado: `src/lib/hr/payrollEffectiveCasuisticaFlag.ts`
- Invariante global: `isRealSubmissionBlocked() === true`

---

## 12. Confirmaciones

- ✅ No se ha modificado código funcional al crear este paquete.
- ✅ No se han cambiado flags (`PAYROLL_EFFECTIVE_CASUISTICA_MODE` sigue en `persisted_priority_preview`).
- ✅ `persisted_priority_apply` continúa **OFF**.
- ✅ No se han tocado motor de nómina, `simulateES`, payload, BD, migraciones, RLS, edge functions, dependencias ni CI.
- ✅ No se ha usado `service_role` ni se han realizado writes.
- ✅ No se ha generado ni intentado generar FDI / AFI / DELT@ / INSS / TGSS / SEPE / AEAT.

**Recomendación final:** **NO** abrir C3B3C2 PLAN hasta que esta plantilla quede completada,
firmada y archivada con evidencias para los 4 puntos pendientes.