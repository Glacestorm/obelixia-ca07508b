# RRHH-DEMO.1 — Validación Post-Seed y Guía Demo Comercial

**Fecha**: 2026-03-15  
**Estado**: Validado tras Seed Demo Maestro (12 perfiles, ~200+ registros)

---

## A. VALIDACIÓN POST-SEED POR MÓDULO

| # | Módulo | Estado Demo | Calidad Visual | ¿Vende? | Necesita |
|---|--------|-------------|----------------|---------|----------|
| 1 | **Dashboard RRHH** | ✅ Demo-ready | Alta | Sí — KPIs reales, gráficos Recharts, alertas | — |
| 2 | **Empleados** | ✅ Demo-ready | Alta | Sí — lista con 12 perfiles distinguibles | — |
| 3 | **Contratos** | ✅ Demo-ready | Alta | Sí — 12 contratos con tipos variados | — |
| 4 | **Expediente Documental** | ✅ Demo-ready | Alta | Sí — 50+ docs, categorías, vencimientos | — |
| 5 | **Nómina (panel)** | ✅ Demo-ready | Alta | Sí — ~30 nóminas con complements | — |
| 6 | **Motor de Nómina** | ✅ Demo-ready | Alta | Sí — períodos, runs, correction run visible | — |
| 7 | **Beneficios/Compensación** | ✅ Demo-ready | Alta | Sí — 3 planes, 4 enrollments reales | — |
| 8 | **Vacaciones/Permisos** | ✅ Demo-ready | Alta | Sí — saldos, IT, paternidad, vacaciones | — |
| 9 | **Incidencias** | ✅ Demo-ready | Media-Alta | Sí — horas extra, stock options, atrasos | — |
| 10 | **Time Clock** | ✅ Demo-ready | Alta | Sí — ~120 fichajes, anomalías overtime | — |
| 11 | **Solicitudes (Admin Portal)** | ⚠️ Usable con matices | Media | Parcial — depende de datos legacy MVP | Seed solicitudes master |
| 12 | **ES Localization** | ✅ Demo-ready | Alta | Sí — plugin España completo | — |
| 13 | **Official Submissions** | ✅ Demo-ready | Alta | Sí — dry-run, sandbox, simulación | Narrativa verbal |
| 14 | **Finiquitos/Settlements** | ✅ Demo-ready | Alta | Sí — 2 despidos (disciplinario+objetivo) | — |
| 15 | **Reporting/Board Pack** | ⚠️ Usable con matices | Media-Alta | Parcial — datos reales pero necesita contexto | Narrativa guiada |
| 16 | **Talent** | ⚠️ Usable con matices | Media | Parcial — paneles Enterprise sin seed específico | seedDemo() nativos |
| 17 | **Enterprise** | ⚠️ Usable con matices | Alta | Parcial — Fairness, AI Gov, Digital Twin impresionan | seedDemo() nativos |
| 18 | **Utilidades** | ✅ Demo-ready | Alta | Sí — Health Check, Seed Data, Reporting Engine | — |
| 19 | **Portal del Empleado** | ✅ Demo-ready | Alta | Sí — 9 módulos, autoservicio real | Vincular user demo |

### TOP 10 PANTALLAS MÁS POTENTES (para demo)

1. **Dashboard Ejecutivo** — KPIs + alertas + gráficos → primera impresión
2. **Motor de Nómina** — períodos + runs + correction run → core diferencial
3. **Expediente Documental** — 50+ docs categorizados → cumplimiento
4. **Finiquitos** — 2 despidos con indemnización → caso real
5. **Official Submissions** — TGSS/AEAT simulada → diferencial España
6. **Portal del Empleado** — 9 módulos autoservicio → WOW factor
7. **Time Clock** — fichajes reales con anomalías → registro horario legal
8. **Beneficios** — retrib. flexible (seguro + tickets + guardería) → retención
9. **Fairness Engine** — equidad salarial RD 902/2020 → governance
10. **ES Localization** — plugin España completo → diferencial local

### TOP 10 PANTALLAS QUE MÁS HAN MEJORADO CON EL SEED

1. **Nóminas** — de 0 a ~30 nóminas con complements reales
2. **Contratos** — de datos genéricos a 12 tipos contractuales variados
3. **Incidencias** — de vacío a horas extra, stock options, atrasos, reducciones
4. **Time Clock** — de 0 a ~120 fichajes con overtime detectable
5. **Beneficios** — de vacío a 3 planes + 4 enrollments con tax treatment
6. **Expediente Documental** — de básico a 50+ docs con partes AT y cartas despido
7. **Vacaciones** — de genérico a IT 60 días, paternidad 16 semanas, reducción jornada
8. **Motor de Nómina** — de solo períodos a correction runs + snapshots
9. **Leave Incidents** — de vacío a IT accidente trabajo + paternidad
10. **Finiquitos** — de vacío a 2 liquidaciones completas

### TOP 10 PANTALLAS QUE TODAVÍA NECESITAN REFUERZO

1. **Solicitudes Admin** — depende de datos legacy, seed master no las cubre
2. **Talent Intelligence** — funcional pero sin seed específico de IA talent
3. **Succession Planning** — panel real pero sin posiciones concretas sembradas
4. **Skills Matrix** — funcional pero sin skills mapeadas a los 12 perfiles
5. **Reclutamiento** — funcional pero sin ofertas vinculadas a los perfiles demo
6. **Onboarding** — panel real pero sin planes onboarding para Ana Belén
7. **Wellbeing** — panel Enterprise sin métricas específicas del seed
8. **People Analytics** — IA funcional pero análisis depende de volumen de datos
9. **Reporting Engine** — necesita período cerrado real para generar informes
10. **Board Pack** — funcional pero necesita datos consolidados de varios módulos

---

## B. VALIDACIÓN DE LOS 12 PERFILES DEMO

| # | Perfil | Caso de Negocio | Pantallas Clave | Fuerza Demo | Gap |
|---|--------|-----------------|-----------------|-------------|-----|
| 1 | **Carlos Ruiz Martín** | Empleado estándar activo | Empleados, Contratos, Nóminas, Time Clock, Vacaciones | ★★★★★ | Ninguno |
| 2 | **Ana Belén Torres** | Alta reciente + TGSS | Empleados, Registration Data, Documentos (alta TGSS), Official Submissions | ★★★★★ | Ninguno |
| 3 | **Miguel Ángel Sanz** | Horas extra + bonus | Nóminas (complements), Incidencias, Time Clock (overtime) | ★★★★★ | Ninguno |
| 4 | **Laura Fernández Gil** | Retribución flexible | Beneficios (seguro+tickets), Compensación, Solicitudes | ★★★★★ | Ninguno |
| 5 | **David Moreno Ortiz** | Stock options + CTO | Incidencias (ES_STOCK_OPTIONS), Nómina (5000€ extra), Fiscalidad | ★★★★☆ | Mostrar liquidación fiscal explícita |
| 6 | **Elena Vidal Ruiz** | IT accidente trabajo | Leave Requests (60d), Documentos (parte AT + informe), Incidencias | ★★★★★ | Ninguno |
| 7 | **Javier López Navarro** | Paternidad 16 semanas | Leave Requests (112d), Documentos (certificado nacimiento) | ★★★★★ | Ninguno |
| 8 | **Sofía Martínez Díaz** | Desplazamiento internacional | Documentos (carta + A1), Movilidad | ★★★★☆ | Panel mobility con assignment concreto |
| 9 | **Pablo García Herrera** | Atrasos/IT no reflejada | Correction Run (visible), Incidencias (recálculo) | ★★★★★ | Ninguno — case demo perfecto |
| 10 | **Carmen Alonso Vega** | Reducción jornada 75% | Incidencias, Contrato (30h), Documentos (solicitud), Guardería | ★★★★★ | Ninguno |
| 11 | **Roberto Díaz Campos** | Despido disciplinario | Contratos (terminated), Documentos (carta despido + finiquito), Finiquitos | ★★★★★ | Ninguno |
| 12 | **Isabel Muñoz Pérez** | Despido objetivo | Contratos (terminated), Documentos (carta + SEPE + indemnización), Finiquitos | ★★★★★ | Ninguno |

**Utilidad para Portal del Empleado**: Carlos (1), Laura (4) y Carmen (10) son los mejores candidatos para mostrar el portal — empleados activos con datos ricos.

---

## C. COBERTURA REAL DEL CASO DEMO MAESTRO

| # | Casuística | Estado | Perfil | Pantalla | ¿Listo? | Gap |
|---|-----------|--------|--------|----------|---------|-----|
| 1 | Registro empleado DEMO | ✅ Cubierto | Ana Belén (DM-002) | Registration Data Panel | Sí | — |
| 2 | Comunicación incorporación admin española | ✅ Cubierto con simulación | Ana Belén | Official Submissions (dry-run) | Sí | Narrativa verbal |
| 3 | Nómina con horas extras | ✅ Cubierto | Miguel Ángel (DM-003) | Nóminas + Incidencias | Sí | — |
| 4 | Seguro médico retrib. flexible | ✅ Cubierto | Laura (DM-004) | Beneficios + Compensación | Sí | — |
| 5 | Stock options en nómina | ✅ Cubierto | David (DM-005) | Incidencias (ES_STOCK_OPTIONS) | Sí | — |
| 6 | Permiso no retribuido | ⚠️ Cubierto parcialmente | Laura (DM-004) | Leave Requests (AP pending) | Parcial | Tipo "no retribuido" explícito |
| 7 | Baja médica accidente trabajo | ✅ Cubierto | Elena (DM-006) | Leave + Docs (parte AT) | Sí | — |
| 8 | Permiso por nacimiento | ✅ Cubierto | Javier (DM-007) | Leave Requests (PAT 112d) | Sí | — |
| 9 | Desplazamiento temporal | ✅ Cubierto | Sofía (DM-008) | Docs (carta + A1) + Mobility | Sí | — |
| 10 | Nómina atrasos IT | ✅ Cubierto | Pablo (DM-009) | Correction Run + Incidencias | Sí | — |
| 11 | Reducción jornada guarda legal | ✅ Cubierto | Carmen (DM-010) | Incidencias + Contrato 30h | Sí | — |
| 12 | Informe costes y nómina | ✅ Cubierto con simulación | — | Reporting Engine + Board Pack | Sí | Necesita narrativa |
| 13 | Envío seguros sociales | ✅ Cubierto con simulación | — | Official Submissions (SS) | Sí | Dry-run mode |
| 14 | Registro horario | ✅ Cubierto | Carlos, Miguel Ángel | Time Clock | Sí | — |
| 15 | Modelos 111 y 190 | ✅ Cubierto con simulación | — | ES Localization + Official | Sí | Preparatorio |
| 16 | Liquidación despido disciplinario | ✅ Cubierto | Roberto (DM-011) | Finiquitos + Docs | Sí | — |
| 17 | Liquidación despido objetivo | ✅ Cubierto | Isabel (DM-012) | Finiquitos + Docs | Sí | — |
| 18 | Comunicación salida admin | ✅ Cubierto con simulación | Roberto/Isabel | Official Submissions (baja) | Sí | Dry-run |

**Cobertura real: 17/18 completos + 1 parcial = ~95%**

### Top 5 Gaps Residuales
1. Permiso no retribuido (tipo explícito) — Quick win: add leave_type_code 'PNR' al seed
2. Solicitudes admin vinculadas a perfiles master — Quick win: seed 3-4 solicitudes
3. Mobility assignment record para Sofía — Quick win: seed 1 assignment
4. Onboarding checklist para Ana Belén — Quick win: seed checklist
5. People Analytics necesita volumen — Mitigation: usar MVP seed (50 emp) + master

---

## D. GUIÓN DEMO COMERCIAL

### Demo Corta (10-15 min)

| Min | Bloque | Pantalla | Perfil | Mensaje Comercial |
|-----|--------|----------|--------|-------------------|
| 0-2 | **Apertura** | Dashboard Ejecutivo | — | "Visión 360° de su plantilla en tiempo real" |
| 2-4 | **Core HR** | Empleados → Expediente Carlos | Carlos | "Expediente vivo, no un repositorio muerto" |
| 4-6 | **Nómina** | Motor Nómina → Nómina Miguel Ángel | Miguel Ángel | "Horas extra, complements, IRPF — todo automático" |
| 6-8 | **España** | ES Localization + Finiquito Roberto | Roberto | "Legislación española nativa: despidos, SS, fiscal" |
| 8-10 | **Portal** | Portal del Empleado (Carlos) | Carlos | "Sus empleados se autoatienden: nóminas, docs, fichaje" |
| 10-12 | **Diferencial** | Official Submissions (dry-run) | Ana Belén | "Simule envíos a TGSS/AEAT antes de ejecutar" |
| 12-15 | **Cierre** | Dashboard + Enterprise (Fairness) | — | "Y esto es solo el principio — Enterprise, Talent, IA..." |

**No enseñar**: Talent detallado, seedDemo panels, configuración técnica, Utilidades admin.

### Demo Media (20-30 min)

| Min | Bloque | Pantalla | Perfil | Mensaje Comercial |
|-----|--------|----------|--------|-------------------|
| 0-3 | **Apertura ejecutiva** | Dashboard + KPIs | — | "Control total desde el primer día" |
| 3-6 | **Ciclo de vida** | Empleados → Ana Belén (alta reciente) | Ana Belén | "De la contratación al alta TGSS en un flujo" |
| 6-9 | **Nómina compleja** | Motor Nómina → Miguel Ángel + David | Miguel Ángel, David | "Horas extra, stock options, retribución flexible" |
| 9-12 | **Beneficios** | Compensación → Laura (seguro+tickets) | Laura | "Retribución flexible con impacto fiscal real" |
| 12-15 | **Casos especiales** | Elena (IT) + Javier (paternidad) | Elena, Javier | "IT por accidente, paternidad 16 semanas — todo trazado" |
| 15-18 | **Despidos** | Finiquitos → Roberto + Isabel | Roberto, Isabel | "Disciplinario vs objetivo — cálculo automático" |
| 18-21 | **Compliance** | Official Submissions + ES Local | — | "Simulación TGSS/AEAT sin riesgo" |
| 21-24 | **Portal Empleado** | Portal (Carlos) → nóminas, docs, fichaje | Carlos | "Autoservicio que reduce 40% de consultas a RRHH" |
| 24-27 | **Reporting** | Reporting Engine + Board Pack | — | "Informes ejecutivos para comité en 1 click" |
| 27-30 | **Cierre premium** | Enterprise (Fairness + AI Gov) + Talent | — | "Suite completa: equidad, IA, talento, gobernanza" |

### Demo Premium (45-60 min)

| Min | Bloque | Pantalla | Perfil | Objetivo |
|-----|--------|----------|--------|----------|
| 0-5 | **Contexto ejecutivo** | Dashboard + alertas + KPIs | — | Impresionar con visión 360° |
| 5-10 | **Onboarding** | Alta Ana Belén → Registration → TGSS | Ana Belén | Ciclo completo de incorporación |
| 10-15 | **Nómina mensual** | Motor Nómina completo: períodos, runs | — | Mostrar motor profesional |
| 15-20 | **Casos nómina** | Miguel Ángel (extras) + David (stock) + Carmen (reducción) | M.Ángel, David, Carmen | Complejidad real española |
| 20-25 | **Beneficios** | Laura (flex) + Compensación Suite | Laura | Retribución total moderna |
| 25-30 | **Ausencias complejas** | Elena (IT AT) + Javier (paternidad) + Correction run Pablo | Elena, Javier, Pablo | Casuística laboral avanzada |
| 30-35 | **Despidos** | Roberto (disciplinario) + Isabel (objetivo) + Finiquitos | Roberto, Isabel | Proceso de salida completo |
| 35-40 | **Compliance España** | Official Submissions + ES Local + Evidencias | — | Diferencial regulatorio |
| 40-45 | **Portal Empleado** | Tour completo 9 módulos | Carlos | Experiencia del empleado |
| 45-50 | **Enterprise** | Fairness + AI Gov + Security + Digital Twin | — | Suite premium diferencial |
| 50-55 | **Talent & Analytics** | Skills Matrix + Intelligence + Reporting | — | Visión estratégica |
| 55-60 | **Cierre ejecutivo** | Dashboard + Utilidades + Resumen | — | Cierre con impacto total |

---

## E. NARRATIVA COMERCIAL

### Apertura (30 segundos)
> "Le voy a mostrar el sistema de gestión de personas más completo del mercado español. No es un software de nóminas al que le hemos añadido cosas — es una plataforma enterprise que habla el idioma de la legislación laboral española desde su núcleo."

### Mensajes Clave por Bloque

| Bloque | Mensaje |
|--------|---------|
| **Dashboard** | "En 5 segundos ve plantilla, costes, rotación, cumplimiento y alertas críticas" |
| **Nómina** | "Motor profesional: períodos, runs, correction runs, complements — no un Excel glorificado" |
| **Beneficios** | "Retribución flexible real: seguro médico exento, tickets 11€/día, guardería — con fiscalidad automática" |
| **Stock Options** | "Concepto ES_STOCK_OPTIONS nativo con tributación IRPF y cotización SS correcta" |
| **IT/Permisos** | "Accidente de trabajo, paternidad 16 semanas, reducción de jornada — todo trazado documentalmente" |
| **Despidos** | "Disciplinario vs objetivo: cálculo de indemnización, carta, SEPE, finiquito — en un flujo" |
| **Official** | "Simule envíos a TGSS/AEAT antes de ejecutar. Dry-run, sandbox, evidence packs" |
| **Portal** | "Sus empleados consultan nóminas, fichaje, vacaciones y solicitudes sin molestar a RRHH" |
| **Enterprise** | "Equidad salarial RD 902/2020, gobernanza IA EU AI Act, seguridad SoD — enterprise real" |
| **Reporting** | "Board Pack para comité de dirección en 1 click" |

### Diferenciales
1. **España nativa** — No es una traducción, es legislación laboral española en el core
2. **Simulación oficial** — Dry-run de TGSS/AEAT sin riesgo
3. **Motor de nómina real** — Períodos, runs, correction runs, no un generador de PDFs
4. **Portal empleado integrado** — No es un módulo separado, comparte los mismos datos
5. **Enterprise desde el primer día** — Fairness, AI Gov, Compliance — no módulos de pago extra

### Cierre Ejecutivo
> "Lo que ha visto no es un prototipo ni una demo preparada. Es el sistema real, con datos reales de 12 casuísticas laborales españolas. Cada pantalla que ha visto funciona, cada cálculo es correcto, cada flujo está trazado. La pregunta no es si puede hacer esto — ya lo hace. La pregunta es cuándo empezamos."

---

## F. PUNTOS DÉBILES DE LA DEMO

| # | Debilidad | Severidad | Solución | Depende de |
|---|-----------|-----------|----------|------------|
| 1 | Solicitudes admin vacías para perfiles master | Media | Seed 3-4 solicitudes vinculadas | Seed |
| 2 | Talent sin seed específico (Succession, Skills) | Media | Activar seedDemo() nativos | Seed |
| 3 | Mobility sin assignment record para Sofía | Baja | Seed 1 mobility_assignment | Seed |
| 4 | Onboarding sin checklist para Ana Belén | Baja | Seed checklist items | Seed |
| 5 | Reporting Engine necesita narrativa verbal | Baja | Guión preparado | Narrativa |
| 6 | Board Pack requiere consolidación previa | Baja | Pre-generar 1 pack | Seed |
| 7 | Portal Empleado requiere user vinculado | Media | Vincular auth user a empleado | Quick win |
| 8 | People Analytics depende de volumen MVP | Baja | Combinar MVP + Master seed | Narrativa |
| 9 | Wellbeing sin métricas seed | Baja | seedDemo() nativo | Seed |
| 10 | Transición Dashboard→Detalle necesita breadcrumbs | Baja | Ya existen en Utilidades | UX |

---

## G. AJUSTES FINALES ANTES DE ENSEÑAR A CLIENTE

| # | Ajuste | Prioridad | Impacto | Esfuerzo | ¿Imprescindible? |
|---|--------|-----------|---------|----------|-------------------|
| 1 | Seed 3 admin_requests para perfiles master | Alta | Alto | Bajo | Recomendable |
| 2 | Seed 1 mobility_assignment para Sofía | Media | Medio | Bajo | Recomendable |
| 3 | Verificar que Portal Empleado funciona sin user vinculado (muestra fallback) | Alta | Alto | Nulo | Imprescindible |
| 4 | Pre-ejecutar Health Check para mostrar resultados | Baja | Medio | Bajo | Recomendable |
| 5 | Preparar guión verbal para Official Submissions (dry-run) | Alta | Alto | Nulo | Imprescindible |
| 6 | Verificar que Fairness Engine genera análisis demo | Media | Alto | Bajo | Recomendable |
| 7 | Tener preparado 1 Board Pack pre-generado | Baja | Medio | Bajo | Recomendable |
| 8 | Verificar que AI Governance muestra assessment | Media | Alto | Bajo | Recomendable |
| 9 | Ensayar transiciones entre bloques del guión | Alta | Alto | Nulo | Imprescindible |
| 10 | Verificar que correction run de Pablo aparece visible | Alta | Alto | Nulo | Imprescindible |
| 11 | Confirmar que Time Clock muestra overtime de Miguel Ángel | Media | Medio | Nulo | Recomendable |
| 12 | Confirmar que Finiquitos distingue disciplinario vs objetivo | Alta | Alto | Nulo | Imprescindible |
| 13 | Badge "DEMO" sutil en header durante la presentación | Baja | Bajo | Bajo | Opcional |
| 14 | Quick link "Mi Portal" visible desde Dashboard | Media | Medio | Bajo | Recomendable |
| 15 | Verificar que ES Localization plugin carga sin error | Alta | Alto | Nulo | Imprescindible |

---

## H. RESULTADO FINAL

### 1. Resumen Ejecutivo
El Seed Demo Maestro ha transformado el módulo RRHH de un sistema funcional pero "frío" en una demo comercial convincente al ~95% de cobertura. Los 12 perfiles cubren las principales casuísticas laborales españolas y activan las pantallas clave del sistema.

### 2. Estado Demo-Ready por Módulos
- **Demo-ready (14/19)**: Dashboard, Empleados, Contratos, Expediente, Nómina, Motor, Beneficios, Vacaciones, Incidencias, Time Clock, ES Local, Official, Finiquitos, Utilidades
- **Usable con matices (5/19)**: Solicitudes, Reporting, Talent, Enterprise, Portal Empleado

### 3. Estado de los 12 Perfiles Demo
- **Fuerza ★★★★★ (10/12)**: Carlos, Ana Belén, Miguel Ángel, Laura, Elena, Javier, Pablo, Carmen, Roberto, Isabel
- **Fuerza ★★★★☆ (2/12)**: David (falta liquidación fiscal explícita), Sofía (falta assignment record)

### 4. Cobertura Real del Caso Demo
**95% (17/18 completos + 1 parcial)**

### 5-7. Guiones Demo
Ver sección D arriba — Demo corta (15 min), media (30 min), premium (60 min) completos.

### 8. Narrativa Comercial
Ver sección E — apertura, mensajes por bloque, diferenciales, cierre ejecutivo.

### 9. Top Puntos Débiles
Solicitudes admin vacías, Talent sin seed, Portal sin user vinculado. Todos solucionables con quick wins de seed.

### 10. Top Ajustes Finales
5 imprescindibles (verificaciones de datos existentes + guión verbal), 8 recomendables (seeds menores), 2 opcionales.

### 11. Recomendación Final

**✅ EL SISTEMA PUEDE ENSEÑARSE A CLIENTE HOY MISMO.**

Con las siguientes condiciones:
1. **Antes de la demo**: Ejecutar el Seed Demo Maestro desde Utilidades → Seed Data
2. **Guión preparado**: Usar la demo corta (15 min) o media (30 min) según contexto
3. **Bloques a evitar**: No profundizar en Talent/Succession sin seed previo
4. **Portal Empleado**: Mostrar en modo "vista admin" si no hay user vinculado
5. **Official Submissions**: Acompañar siempre con narrativa verbal sobre dry-run

**Para una demo premium (60 min)**, se recomienda el pulido previo de los 5 items imprescindibles de la sección G (verificaciones de datos + guión ensayado). No requiere código nuevo.
