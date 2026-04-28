# RRHH — Guion paso a paso de demo · Empleado DEMO

Estado: **CERRADO (documental)** · Tipo: guion comercial / QA demo · Sin cambios funcionales.

---

## Parte A — QA read-only (resultado)

| Verificación | Resultado |
|---|---|
| Acceso "Utilidades → Centro de Mando → ▶ Recorrido demo" presente | ✅ `HRNavigationMenu.tsx:442` |
| `LazyHRDemoJourneyPanel` registrado en lazy loader | ✅ `HRModuleLazy.tsx:209` |
| `HRModule.tsx` renderiza panel cuando `activeModule === 'util-demo-journey'` | ✅ `HRModule.tsx:680` |
| `onNavigate(moduleId)` cableado a `setActiveModule` | ✅ |
| `isRealSubmissionBlocked()` activo (TGSS / SEPE / AEAT / INSS / DELT@) | ✅ Sin envíos reales |
| `persisted_priority_apply` | ✅ **OFF** (`persisted_priority_preview`) |
| Comunicaciones oficiales | ✅ **dry-run / preview** |
| Cambios en motor / `simulateES` / payload / flags / RLS / BD / edge functions / CI / deps | ❌ **No tocado** |
| Generación FDI / AFI / DELT@ | ❌ **No generado** |
| Uso de `service_role` | ❌ **No usado** |

---

## 1. Preparación previa

- [ ] Usuario logado con permisos de RRHH / Admin.
- [ ] Empresa demo seleccionada en el contexto ERP.
- [ ] Empleado DEMO existente (Carlos Ruiz Martín o equivalente).
- [ ] Periodo de nómina activo (mes en curso).
- [ ] Contrato vigente del Empleado DEMO con convenio + grupo profesional + grupo cotización + salario + nº pagas.
- [ ] Modo **dry-run** activo en comunicaciones oficiales (visible en UI).
- [ ] `PAYROLL_EFFECTIVE_CASUISTICA_MODE = 'persisted_priority_preview'` (apply **OFF**).
- [ ] Navegador limpio, zoom 100%, viewport ≥ 1440px.

---

## 2. Guion paso a paso por menús

> Estados: 🟢 listo · 🔵 preview · 🟡 dry-run · 🟠 pendiente validación oficial.

### Paso 1 — Entrada al recorrido demo
- **Menú:** RRHH → Utilidades → Centro de Mando → **▶ Recorrido demo**.
- **Cliente ve:** `HRDemoJourneyPanel` con tarjetas (15 pasos / 12 perfiles).
- **Decir:** *"Este es el circuito guiado del Empleado DEMO. Desde aquí saltamos a cada módulo real del ERP."*
- **NO prometer:** envíos oficiales reales hoy.
- **Estado:** 🟢 listo.

### Paso 2 — Empleados (ficha DEMO)
- **Menú:** Recorrido demo → tarjeta "Registro empleado" · o RRHH → Empleados → DEMO.
- **Cliente ve:** ficha unificada (identificación, contacto, IRPF, situación familiar, IBAN).
- **Decir:** *"Expediente unificado, fuente única de verdad para nómina, fiscal y SS."*
- **NO prometer:** integración AEAT IRPF en tiempo real.
- **Estado:** 🟢 listo.

### Paso 3 — Contratos
- **Menú:** RRHH → Contratos → contrato vigente DEMO.
- **Cliente ve:** tipo contrato, convenio, grupo profesional, grupo cotización, salario, complementos, nº pagas, jornada.
- **Decir:** *"El contrato resuelve convenio y parametriza salario y cotización."*
- **NO prometer:** firma electrónica eIDAS hoy.
- **Estado:** 🟢 listo.

### Paso 4 — Comunicación incorporación (TGSS/RED)
- **Menú:** RRHH → Comunicaciones oficiales → Alta TGSS/RED.
- **Cliente ve:** preview AFI + evidence pack.
- **Decir:** *"El alta se prepara, valida y deja trazabilidad. El envío real a TGSS queda bloqueado hasta certificados y procedimiento oficial."*
- **NO prometer:** envío real a Sistema RED.
- **Estado:** 🟡 dry-run · 🟠 pendiente validación oficial.

### Paso 5 — Registro horario
- **Menú:** RRHH → Registro horario.
- **Cliente ve:** jornada planificada vs realizada, horas extra, descansos, totales.
- **Decir:** *"Trazabilidad horaria conforme RD 8/2019, base para HE en nómina."*
- **Estado:** 🟢 listo.

### Paso 6 — Nueva nómina DEMO
- **Menú:** RRHH → Motor de nómina → Nueva nómina → DEMO.
- **Cliente ve:** simulación mensual base (devengos / deducciones / líquido).
- **Decir:** *"Motor `simulateES` con normativa 2026: IRPF, bases SS, MEI 0,90%."*
- **NO prometer:** persistencia legal ni cierre oficial todavía.
- **Estado:** 🔵 preview.

### Paso 7 — Horas extra
- **Menú:** Nómina DEMO → Incidencias → Añadir Horas Extra.
- **Cliente ve:** concepto HE con cotización adicional y recálculo.
- **Decir:** *"HE entran al motor con cotización y fiscalidad correctas."*
- **Estado:** 🟢 listo · 🔵 preview en mensual.

### Paso 8 — Seguro médico (retribución flexible / en especie)
- **Menú:** Nómina DEMO → Retribución flexible → Seguro médico.
- **Cliente ve:** exención hasta límite legal y excedente sujeto.
- **Decir:** *"Aplicación automática de la exención del seguro de salud."*
- **NO prometer:** integración con aseguradora.
- **Estado:** 🟢 listo.

### Paso 9 — Stock options
- **Menú:** Nómina DEMO → Conceptos especiales → Stock options.
- **Cliente ve:** ejercicio + Art. 42.3.f LIRPF + impacto IRPF/SS.
- **Decir:** *"Trazabilidad del lifecycle con tratamiento fiscal español."*
- **NO prometer:** ejecución real con broker.
- **Estado:** 🟢 listo · 🟠 pendiente validación caso a caso.

### Paso 10 — PNR 1 día (procesos entre fechas persistidos)
- **Menú:** RRHH → Incidencias / Procesos entre fechas → Nueva → PNR 1 día.
- **Cliente ve:** modal pulido (banner azul informativo, alerta rojo suave, asteriscos obligatoriedad).
- **Decir:** *"Persistencia con tipología y fechas; visibilidad de la fuente aplicada al cálculo."*
- **NO prometer:** apply persistido al motor (sigue OFF).
- **Estado:** 🔵 preview (`persisted_priority_preview`).

### Paso 11 — IT/AT (accidente de trabajo)
- **Menú:** RRHH → IT/AT → Nueva baja → Accidente de Trabajo.
- **Cliente ve:** alta con CCC AT, base reguladora, % por tramos, prestación.
- **Decir:** *"Motor IT por contingencia con partes baja/confirmación/alta."*
- **NO prometer:** envío Delt@ real.
- **Estado:** 🟢 cálculo · 🟡 dry-run Delt@ · 🟠 pendiente oficial.

### Paso 12 — Permiso por nacimiento
- **Menú:** RRHH → Permisos → Permiso por nacimiento.
- **Cliente ve:** suspensión 16 semanas, prestación INSS, recálculo cotización.
- **Decir:** *"El programa prepara la suspensión y prevé la prestación INSS."*
- **Estado:** 🔵 preview · 🟠 pendiente integración INSS.

### Paso 13 — Movilidad internacional
- **Menú:** RRHH → Movilidad internacional → Nuevo desplazamiento.
- **Cliente ve:** evaluación Art. 7.p LIRPF, regla 183 días, A1, convenio doble imposición.
- **Decir:** *"Motor de mobility con corredores y preparación documental A1."*
- **NO prometer:** envío TGSS A1 real.
- **Estado:** 🟢 motor · 🟡 dry-run A1.

### Paso 14 — Atrasos / corrección IT
- **Menú:** RRHH → Motor de nómina → Correction run → Atrasos por IT no introducida.
- **Cliente ve:** snapshot diff + regularización IRPF/SS.
- **Decir:** *"Recalculamos sobre snapshot inmutable y generamos atrasos auditables."*
- **Estado:** 🟢 cálculo · 🔵 preview.

### Paso 15 — Guarda legal (reducción de jornada)
- **Menú:** RRHH → Conciliación → Reducción jornada Art. 37.6 ET.
- **Cliente ve:** % reducción, recálculo salario y bases, derechos preservados.
- **Decir:** *"Reducción con recálculo proporcional y respeto a bases reguladoras."*
- **Estado:** 🟢 listo.

### Paso 16 — Reporting de costes y nómina
- **Menú:** RRHH → Reporting → Informe de costes.
- **Cliente ve:** coste total empresa (bruto + cuota patronal + provisiones), por centro / dpto / proyecto.
- **Decir:** *"Coste empresa real, no solo bruto, listo para finanzas."*
- **Estado:** 🟢 listo.

### Paso 17 — Seguros sociales (FAN/TC2 SILTRA)
- **Menú:** RRHH → Seguridad Social → Expediente mensual → Generar FAN.
- **Cliente ve:** fichero CRA/FAN, totales y validaciones.
- **Decir:** *"Generación SILTRA-ready en dry-run con validación previa."*
- **NO prometer:** envío SILTRA real.
- **Estado:** 🟡 dry-run · 🟠 pendiente UAT TGSS.

### Paso 18 — Modelos 111 y 190 (AEAT)
- **Menú:** RRHH → Fiscal → Modelos 111 / 190 → Generar borrador.
- **Cliente ve:** borrador con perceptores, retenciones, claves IRPF, totales.
- **Decir:** *"Borrador AEAT-ready; el envío real queda separado por seguridad jurídica."*
- **Estado:** 🟡 dry-run · 🟠 pendiente certificado AEAT.

### Paso 19 — Liquidación · Despido disciplinario
- **Menú:** RRHH → Liquidaciones → Nueva → Despido disciplinario.
- **Cliente ve:** finiquito sin indemnización (procedente), pagas extra prorrateadas, vacaciones.
- **Decir:** *"Finiquito disciplinario procedente: indemnización 0, desglose auditable."*
- **Estado:** 🟢 listo.

### Paso 20 — Liquidación · Despido objetivo
- **Menú:** RRHH → Liquidaciones → Nueva → Despido objetivo.
- **Cliente ve:** indemnización 20 d/año (tope 12 mensualidades) + finiquito + preaviso.
- **Decir:** *"Cálculo Art. 53 ET con tope legal aplicado automáticamente."*
- **Estado:** 🟢 listo.

### Paso 21 — Comunicación de salida (baja TGSS + Certific@2 SEPE)
- **Menú:** RRHH → Comunicaciones oficiales → Baja TGSS + Certific@2.
- **Cliente ve:** preview baja TGSS y Certificado de empresa SEPE con evidence pack.
- **Decir:** *"Cierre administrativo preparado y trazado; envío real bloqueado hasta certificados."*
- **Estado:** 🟡 dry-run · 🟠 pendiente validación oficial.

---

## 4. Frases seguras para cliente

- *"El sistema prepara, valida y deja trazabilidad del proceso. Los envíos oficiales a TGSS, SEPE, AEAT, INSS o DELT@ permanecen bloqueados hasta validación legal, certificados y procedimiento oficial."*
- *"El flujo interno está preparado para revisión y auditoría. La última milla oficial está separada deliberadamente por seguridad jurídica."*
- *"Lo que ve es cálculo determinista con normativa 2026, no estimación de IA."*
- *"Cualquier dato marcado como `(est.)` es estimación informativa, no compromiso legal."*
- *"El motor no envía nada a producción oficial en esta sesión."*

### Frases prohibidas
- ❌ "Esto ya envía a Hacienda / TGSS / SEPE."
- ❌ "El alta queda hecha en RED."
- ❌ "El modelo 190 ya está presentado."
- ❌ "El Delt@ ya está cursado."

---

## 5. Tabla de cobertura

| # | Punto solicitado | Módulo | Estado | Qué se demuestra | Pendiente | Riesgo | Frase segura |
|---|---|---|---|---|---|---|---|
| 1 | Registro empleado DEMO | Empleados | 🟢 | Ficha unificada | — | Bajo | "Fuente única de verdad" |
| 2 | Comunicación incorporación | Comms oficiales | 🟡 | AFI preview + evidence | Certificados RED | Medio | "Preparado, no enviado" |
| 3 | Horas extra | Nómina | 🟢 | HE con cotización correcta | — | Bajo | "Cálculo conforme convenio" |
| 4 | Seguro médico flex | Nómina | 🟢 | Exención + excedente | — | Bajo | "Exención automática" |
| 5 | Stock options | Nómina | 🟢 | Art. 42.3.f LIRPF | Caso fiscal | Medio | "Trazabilidad lifecycle" |
| 6 | PNR 1 día | Procesos entre fechas | 🔵 | Persistencia + visibilidad fuente | Apply OFF | Bajo | "Visible, no aplicado" |
| 7 | Baja IT/AT | IT/AT | 🟢/🟡 | Cálculo + Delt@ preview | Envío Delt@ | Medio | "Preparado, no cursado" |
| 8 | Permiso nacimiento | Permisos | 🔵 | Suspensión + INSS | Integración INSS | Medio | "Prevé prestación" |
| 9 | Desplazamiento internacional | Mobility | 🟢/🟡 | 7.p + A1 dry-run | Envío A1 | Medio | "Documentación lista" |
| 10 | Nómina atrasos IT | Correction run | 🟢/🔵 | Snapshot diff | Cierre oficial | Bajo | "Atrasos auditables" |
| 11 | Reducción guarda legal | Conciliación | 🟢 | Recálculo proporcional | — | Bajo | "Art. 37.6 ET" |
| 12 | Informe costes y nómina | Reporting | 🟢 | Coste empresa real | — | Bajo | "Coste total, no solo bruto" |
| 13 | Envío seguros sociales | SS / SILTRA | 🟡 | FAN/TC2 borrador | UAT TGSS | Alto | "SILTRA-ready, no enviado" |
| 14 | Registro horario | Time tracking | 🟢 | RD 8/2019 | — | Bajo | "Trazabilidad horaria" |
| 15 | Modelos 111 y 190 | Fiscal | 🟡 | Borrador AEAT | Certificado AEAT | Alto | "Borrador AEAT-ready" |
| 16 | Despido disciplinario | Liquidaciones | 🟢 | Finiquito sin indemnización | — | Bajo | "Procedente: indemnización 0" |
| 17 | Despido objetivo | Liquidaciones | 🟢 | 20 d/año, tope 12 mens. | — | Bajo | "Art. 53 ET con tope" |
| 18 | Comunicación de salida | Comms oficiales | 🟡 | Baja TGSS + Certific@2 | Certificados oficiales | Medio | "Cierre preparado" |

---

## 6. Checklist final antes de la demo

- [ ] Empleado DEMO existe y se abre sin errores.
- [ ] Contrato DEMO vigente con convenio + grupo cotización + salario.
- [ ] Periodo de nómina activo (mes en curso).
- [ ] Botón **▶ Recorrido demo** visible en Utilidades → Centro de Mando.
- [ ] No hay envíos oficiales reales habilitados (`isRealSubmissionBlocked() === true`).
- [ ] Modo **dry-run** visible en comunicaciones oficiales.
- [ ] Informe de costes carga sin errores.
- [ ] Modelos 111 y 190 generan borrador.
- [ ] FAN / TC2 generan borrador SILTRA-ready.
- [ ] Liquidaciones (disciplinario y objetivo) en modo simulación / revisión.
- [ ] `persisted_priority_apply` confirmado **OFF**.
- [ ] Sin `service_role` en flujos visibles al cliente.
- [ ] No se generan FDI / AFI / DELT@ reales durante la demo.

---

## Resultado

- ✅ QA read-only del Circuito Demo Maestro completada.
- ✅ Documento creado en `docs/demo/RRHH_DEMO_EMPLEADO_DEMO_CLICK_SCRIPT.md`.
- ✅ Sin código funcional tocado.
- ✅ Sin flags cambiados; `persisted_priority_apply` sigue **OFF**.
- ✅ Comunicaciones oficiales siguen bloqueadas (dry-run).
- ✅ Sin BD, RLS, edge functions, dependencias ni CI tocados.
