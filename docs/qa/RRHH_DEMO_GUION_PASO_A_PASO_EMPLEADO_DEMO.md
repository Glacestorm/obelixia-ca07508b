# RRHH — Guion de demo paso a paso · Empleado DEMO

Tipo: documentación operativa para presentación comercial.
Estado: **CERRADO** · Sin cambios funcionales · Sin envíos oficiales · `persisted_priority_apply` OFF · `isRealSubmissionBlocked() === true`.

## Cómo arrancar
1. Entrar al módulo **RRHH**.
2. Mega-menú superior → **Utilidades** → **Centro de Mando** → **▶ Recorrido demo**.
3. Se abre el `HRDemoJourneyPanel` con las 15 tarjetas. Cada tarjeta es navegable con un click.
4. Recomendado: tener activo el modo demo (`useDemoMode`) y la empresa demo seleccionada para que aparezcan los perfiles del circuito.

## Perfiles del circuito (12)
| Perfil | Uso principal en la demo |
|---|---|
| Carlos Ruiz Martín | Empleado DEMO principal (alta, contrato, nómina compleja, comunicaciones) |
| Ana Belén Torres | Permiso por nacimiento |
| Sofía Martínez Díaz | Desplazamiento internacional |
| David Moreno Ortiz | Atrasos / correction run por IT no introducida |
| Carmen Alonso Vega | Reducción de jornada por guarda legal |
| Roberto Díaz Campos | Despido disciplinario (indemnización 0) |
| Isabel Muñoz Pérez | Despido objetivo (20 d/año) |
| Elena Vidal, Javier López, otros | Refuerzo de casuísticas de nómina compleja |

---

## Paso 1 · Registro del empleado DEMO
- **Dónde:** Empleados → ficha de **Carlos Ruiz Martín** → pestaña **Ficha**.
- **Qué mostrar:**
  - Datos de identificación, NIF, IBAN, dirección.
  - Grupo de cotización, contrato, jornada, antigüedad.
  - Banner del **Perfil Legal Unificado** (interrelación contrato ↔ SS ↔ IRPF ↔ indemnización) con `ai_context` listo para los agentes.
- **Qué NO se hace:** ningún envío oficial; el alta es interna.
- **Mensaje al cliente:** "El sistema ya tiene el modelo legal del empleado computado y disponible para todos los agentes IA cross-módulo."

## Paso 2 · Comunicación de incorporación a las administraciones
- **Dónde:** Compliance → **Comunicaciones oficiales** → botón **Nueva** → tipo **Alta TGSS / RED**.
- **Qué mostrar:**
  - Formulario `SSNewCommunicationDialog` precargado desde la ficha.
  - Validación previa (NIF, NAF, CCC, fecha de alta, contrato).
  - Generación de **artefacto en preview/dry-run** con evidence pack y hash SHA-256.
- **Qué NO se hace:** no se envía a TGSS. Se muestra el banner: *"Comunicaciones oficiales desactivadas. Sustituye a la fuente oficial solo tras validación legal/manual."*
- **Mensaje:** "Generamos el artefacto exacto que iría a TGSS, lo dejamos firmado y trazable, y el envío real se libera por workflow humano cuando el cliente lo decide."

## Paso 3 · Cálculo de la nómina con casuísticas complejas
Una sola nómina mensual de Carlos Ruiz que combina **cinco casuísticas**:

1. **Horas extras**
   - Motor nómina → Periodo activo → **Incidencias** → "Añadir incidencia" → tipo **Horas extras**.
   - Mostrar: cálculo según convenio (estructurales vs. fuerza mayor) y desglose en `payslipLines`.
2. **Seguro médico como retribución flexible**
   - Beneficios sociales → **Seguro médico** asignado a Carlos.
   - Mostrar: tratamiento como retribución en especie con exención hasta el límite legal (Art. 42.3.c LIRPF) y línea automática en nómina.
3. **Compra de stock options**
   - Equity → **Stock Options** → grant activo de Carlos → simulador de ejercicio.
   - Mostrar: clasificación (`supported_production` / `supported_with_review` / `out_of_scope`), exenciones (Art. 42.3.f / Ley 28/2022), reducción Art. 18.2 LIRPF, impacto SS, todo etiquetado **(est.)**.
4. **1 día de permiso no retribuido**
   - Casuística → "Añadir proceso persistido" → tipo **Permiso no retribuido** (1 día) → confirmar.
   - Mostrar: descuento proporcional al día y banda informativa "Preview persistido · Solo lectura".
5. **Baja médica por accidente de trabajo (IT-AT)**
   - Casuística → tipo **IT por AT** → fechas → causa.
   - Mostrar: prestación al 75% desde el día siguiente al hecho causante a cargo de Mutua, complemento empresa según convenio si aplica.

- **Resultado en pantalla:** payslip con conceptos devengo / deducción correctamente clasificados, base CC, base CP, MEI 0,90 %, IRPF efectivo, líquido a percibir.
- **Mensaje:** "Una sola nómina con cinco casuísticas reales, todo trazable, todo explicable, todo recalculable."

## Paso 4 · Permiso por nacimiento (Empleado DEMO)
- **Dónde:** Localización ES → **Nacimiento INSS** (`ESNacimientoINSSPanel`) sobre Carlos.
- **Qué mostrar:**
  - Solicitud de permiso con fechas (16 semanas, distribución).
  - Generación de **comunicación INSS preparatoria** (preview).
  - Impacto en nómina: suspensión con reserva de puesto, sin devengo salarial mientras dura la prestación.
- **Mensaje:** "El programa orquesta INSS + nómina + ausencias en un solo flujo, con artefactos firmados y bloqueados hasta validación humana."

## Paso 5 · Desplazamiento temporal fuera de España
- **Dónde:** Empleado → **Movilidad internacional** (`ExpedientMovilidadTab`).
- **Qué mostrar:**
  - Asignación a otro país (ej. México) con duración.
  - Motor `internationalMobility` aplicando **regla de los 183 días** y posible exención **Art. 7.p LIRPF**.
  - Documentos generados: A1/Certificado de Cobertura, anexo al contrato, aviso a Convenio Bilateral.
  - Etiquetas **(est.)** en cualquier estimación fiscal.
- **Mensaje:** "Cubrimos el ciclo completo del expatriado: contrato, fiscalidad, SS internacional, evidencias y trazabilidad legal."

## Paso 6 · Nómina de atrasos para regularizar IT no introducida
- **Dónde:** Motor nómina → **Nueva ejecución** → tipo **`correction` / atrasos** sobre periodo cerrado.
- **Qué mostrar:**
  - Selección del periodo origen y del concepto omitido (la IT).
  - **Snapshot diff** entre nómina original y nómina recalculada (`PayrollDiffPanel`).
  - Línea de atrasos resultante en la nómina del periodo en curso, con regularización IRPF.
- **Mensaje:** "Los errores no se borran: se regularizan con atrasos trazables y con snapshot inmutable del antes/después."

## Paso 7 · Reducción de jornada por guarda legal
- **Dónde:** Localización ES → **Guarda legal** (`ESGuardaLegalPanel`).
- **Qué mostrar:**
  - Solicitud Art. 37.6 ET (porcentaje de reducción, hijo/familiar a cargo).
  - Modificación contractual generada en preview, impacto en bases SS y en cuota IRPF.
  - Aviso de protección frente a despido (nulidad objetiva).
- **Mensaje:** "El sistema entiende que la guarda legal toca contrato, nómina, SS y compliance, y orquesta los cuatro a la vez."

## Paso 8 · Informe de costes y nómina
- **Dónde:** Reporting → **Costes mensuales** / Reporting Engine.
- **Qué mostrar:**
  - Coste empresa total, coste por centro de trabajo / CCC, KPI de variación intermensual.
  - Export PDF y CSV listos para Dirección.
  - Indicador de fuentes (deterministas vs. AI estimation).
- **Mensaje:** "Reporte ejecutivo en menos de un click, con honestidad sobre qué es cálculo legal y qué es estimación IA."

## Paso 9 · Envío de seguros sociales
- **Dónde:** Seguridad Social → **Expediente mensual** (`SSMonthlyExpedientTab`).
- **Qué mostrar:**
  - Generación de **FAN/TC2 en dry-run SILTRA** con evidence pack.
  - Validaciones cruzadas (cuadre RNT/RLC vs. payroll records).
  - Estado del envío bloqueado hasta liberación humana (`isRealSubmissionBlocked() === true`).
- **Mensaje:** "Generamos el FAN exacto, lo validamos contra el motor, lo dejamos firmado y trazable. El cliente decide cuándo se libera el envío real."

## Paso 10 · Gestión del registro horario
- **Dónde:** Compliance → **Registro horario** (`HRTimeTrackingPanel`).
- **Qué mostrar:**
  - Fichajes diarios, balance de horas, alertas de exceso o defecto.
  - Conexión con horas extras del Paso 3.
  - Export legal exigido por Inspección de Trabajo (RDL 8/2019).
- **Mensaje:** "El registro horario no es un Excel, es la fuente de verdad legal del empleado, conectada al motor de nómina."

## Paso 11 · Modelos 111 y 190 de Hacienda
- **Dónde:** Motor IRPF (`IRPFMotorPanel`) → **Modelos fiscales** → **111** (mensual/trimestral) y **190** (anual).
- **Qué mostrar:**
  - Generación en **dry-run AEAT** con validación estructural completa.
  - Cuadre IRPF retenido en nóminas vs. importe a ingresar.
  - Evidence pack con hash, sin envío real.
- **Mensaje:** "El cliente ve el 111 y el 190 que presentaría, perfectamente cuadrados, antes de tomar la decisión de presentarlos."

## Paso 12 · Liquidación por despido disciplinario
- **Dónde:** Liquidaciones → **Nueva** → tipo **Despido disciplinario** sobre Roberto Díaz Campos.
- **Qué mostrar:**
  - Carta de despido generada por el `labor-document-engine`.
  - Finiquito con **indemnización = 0** (procedente), salarios pendientes, vacaciones no disfrutadas, parte proporcional de pagas extra.
  - Aviso de riesgos si la jurisdicción declara improcedente (33 d/año hasta 2012 + 20 d/año posterior).
- **Mensaje:** "Aquí no se equivoca el cálculo: el motor lo hace por ti y te avisa del riesgo."

## Paso 13 · Liquidación por despido objetivo
- **Dónde:** mismo panel → tipo **Despido objetivo** sobre Isabel Muñoz Pérez.
- **Qué mostrar:**
  - Indemnización **20 días/año** con tope **12 mensualidades** (Art. 53 ET).
  - Preaviso 15 días o compensación equivalente.
  - Comunicación al SEPE preparatoria.
- **Mensaje:** "Cumplimos plazos, importes y formalidades. El abogado solo tiene que validar."

## Paso 14 · Comunicación de salida a la administración
- **Dónde:** Comunicaciones oficiales → **Baja TGSS** + **Certific@2 SEPE**.
- **Qué mostrar:**
  - Generación de los dos artefactos en preview/dry-run.
  - Cuadre con el finiquito calculado en pasos 12 y 13.
  - Cierre del expediente del empleado en estado **offboarded** con snapshot inmutable.
- **Mensaje:** "El cierre del empleado deja un expediente legalmente trazable a 4 años (LGSS) y auditable por el portal del auditor externo."

---

## Mensajes transversales para el cliente
- **Honestidad de datos:** todo lo estimado por IA aparece etiquetado **(est.)**, todo lo legal es determinista.
- **Seguridad operativa:** ningún botón de la demo dispara un envío real a TGSS, SEPE, AEAT, INSS o DELT@.
- **Trazabilidad:** cada paso genera evidencia firmada (SHA-256) en el ledger inmutable de RRHH.
- **Multi-empresa:** todo está aislado por `company_id`, queries con JWT del usuario, sin `service_role`.
- **Gobernanza IA:** decisiones explicables, con human-in-the-loop, JWT forwardeado a todos los agentes.

## Restricciones aplicadas en este BUILD documental
- No se ha tocado: `simulateES`, `salaryNormalizer`, `contractSalaryParametrization`, `agreementSalaryResolver`, `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`.
- No se ha cambiado: `PAYROLL_EFFECTIVE_CASUISTICA_MODE`, `persisted_priority_apply` (sigue OFF), flags, BD, RLS, edge functions, dependencias, CI.
- No se ha generado: ningún FDI, AFI, DELT@, ni se ha enviado nada a TGSS / SEPE / AEAT / INSS.
- No se ha modificado: la guía asistida WIZ-A (sigue diseñada y NO implementada).

## Próximos pasos sugeridos (no incluidos)
- WIZ-A PLAN/BUILD (guía asistida convenio dudoso) cuando se apruebe.
- Grabación screencast del recorrido para enablement comercial.
- Plantilla de hand-off del Paso 11 (111/190) para asesoría fiscal.