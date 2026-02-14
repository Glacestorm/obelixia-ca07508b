

# Plan: Academia Module - Plataforma Completa de Venta de Cursos

## Objetivo
Incorporar las 12 recomendaciones de la guia profesional de venta de cursos al modulo Academia existente, transformandolo en una plataforma enterprise completa comparable a Teachable/Kajabi/Maven.

---

## Fase 1: Nicho y Avatar del Alumno (Secciones 1-2 de la guia)

**Nuevos componentes:**

- **`NicheConfigPanel.tsx`** - Panel admin para definir nichos de cursos (Finanzas personales, Inversion, Excel financiero, Emprendedores, Corporativas, Certificaciones). Selector de nicho por curso con iconos y descripciones.
- **`StudentAvatarBuilder.tsx`** - Constructor de "avatar del alumno" por curso: situacion actual, dolor, objetivo, obstaculos, nivel. Formulario guiado que genera un perfil-objetivo asociado al curso.
- **`CourseValidationPanel.tsx`** - Panel de validacion pre-lanzamiento: checklist con 20 conversaciones, landing con metricas, contenido corto publicado, pre-inscripciones beta. Progreso visual con indicadores.

**Cambios en base de datos:**
- Nuevas columnas en `academia_courses`: `niche`, `target_avatar` (JSONB), `validation_status` (text), `validation_checklist` (JSONB), `beta_price`, `launch_date`.

**Integracion:** Nueva seccion "Estrategia" en el menu de navegacion con estos 3 paneles.

---

## Fase 2: Estructura Premium de Curso (Secciones 3-4)

**Nuevos componentes:**

- **`CourseStructureDesigner.tsx`** - Disenador visual de estructura de curso con plantilla de 6 modulos (Diagnostico, Sistema, Deuda, Inversion, Plan 12 meses, Capstone). Drag-and-drop de modulos, micro-lecciones (5-12 min), checkpoints, ejercicios guiados.
- **`ResourceManager.tsx`** - Gestor de recursos descargables: plantillas Excel/Sheets, calculadoras (interes compuesto, deuda, amortizacion), checklists por modulo, glosarios, mini-biblioteca de fuentes.
- **`CapstoneProjectPanel.tsx`** - Panel de proyecto final (capstone): definicion de entregable, rubrica de evaluacion, sistema de feedback, deadline tracker.
- **`QualityChecker.tsx`** - Verificador de calidad automatico con 3 criterios: "puede decir que hacer el lunes", produce output tangible, tiene sistema de feedback. Score de calidad con IA.

**Cambios en base de datos:**
- Nueva tabla `academia_course_resources`: id, course_id, module_id, type (template/calculator/checklist/glossary/reference), title, file_url, download_count, created_at.
- Nueva tabla `academia_capstone_projects`: id, course_id, enrollment_id, user_id, title, description, deliverable_url, rubric_score (JSONB), feedback, status, submitted_at.

---

## Fase 3: Produccion y Legal (Secciones 5-6)

**Nuevos componentes:**

- **`ProductionChecklist.tsx`** - Checklist de produccion profesional: setup (microfono, luz, captura pantalla), flujo (guion por leccion con Hook-Explicacion-Ejemplo-Tarea), grabacion por bloques, edicion ligera. Progreso visual por leccion.
- **`LegalCompliancePanel.tsx`** - Panel de compliance legal/financiero: disclaimer automatico configurable, verificacion de promesas (no rentabilidad garantizada), alertas CNMV cripto, aviso influencer, configuracion IVA/OSS por pais UE. Generacion automatica de textos legales con IA.
- **`TaxConfigPanel.tsx`** - Configuracion fiscal: exencion IVA educativo, OSS (One Stop Shop) UE, configuracion por pais, integracion con facturacion.

**Cambios en base de datos:**
- Nueva tabla `academia_legal_config`: id, course_id, disclaimer_text, has_financial_disclaimer, crypto_advertising, vat_exempt, vat_config (JSONB), country_rules (JSONB), created_at.
- Nuevas columnas en `academia_lessons`: `production_status`, `script_template` (JSONB con hook/explanation/example/task), `recording_batch`.

---

## Fase 4: Modelos de Negocio y Pricing (Secciones 7-8)

**Nuevos componentes:**

- **`BusinessModelSelector.tsx`** - Selector de modelo de negocio por curso: Marketplace (volumen), Marca propia (margen), Cohortes (alto ticket), Comunidad+Suscripcion (recurrente). Comparativa visual con pros/contras y metricas clave.
- **`PricingLadderDesigner.tsx`** - Disenador de escalera de precios: Lead magnet (gratis), Tripwire (9-29EUR), Curso core (99-499EUR), Premium/Cohorte (800-3000EUR), Continuidad (15-79EUR/mes). Configuracion visual con arrastrar niveles.
- **`CohortManager.tsx`** - Gestor de cohortes: crear cohortes con fechas, plazas limitadas, entregables semanales, accountability, networking. Calendario de sesiones en vivo, seguimiento grupal.
- **`SubscriptionManager.tsx`** - Gestor de suscripciones/continuidad: planes mensuales, retos mensuales, directos Q&A, contenido exclusivo. Dashboard de retencion.

**Cambios en base de datos:**
- Nueva tabla `academia_pricing_tiers`: id, course_id, tier_name, tier_type (lead_magnet/tripwire/core/premium/subscription), price, currency, description, features (JSONB), is_active, max_students, created_at.
- Nueva tabla `academia_cohorts`: id, course_id, name, start_date, end_date, max_participants, current_participants, status, schedule (JSONB), deliverables (JSONB), created_at.
- Nueva tabla `academia_subscriptions`: id, user_id, plan_id, status, started_at, expires_at, amount, currency, created_at.

---

## Fase 5: Funnel de Marketing y KPIs de Ventas (Secciones 9-10-11)

**Nuevos componentes:**

- **`SalesFunnelDesigner.tsx`** - Disenador visual de funnel de ventas: Contenido (YouTube/LinkedIn) -> Captacion (lead magnet) -> Email (7-12 correos) -> Evento (webinar) -> Oferta (bonus+garantia+urgencia). Cada etapa con metricas.
- **`LeadMagnetBuilder.tsx`** - Constructor de lead magnets: plantillas descargables, calculadoras interactivas, mini-cursos gratis. Landing page generator con formulario de captura.
- **`SalesKPIDashboard.tsx`** - Dashboard de KPIs de ventas: conversion landing (25-45%), conversion webinar->venta (3-12%), tasa reembolso, LTV, CAC. Graficas en tiempo real con Recharts.
- **`BestPracticesPanel.tsx`** - Panel de mejores practicas (Seccion 10): checklist de "lo que hacen los mejores" - resultados medibles, casos reales, plantillas excelentes, onboarding brutal, actualizaciones, testimonios especificos, etica+compliance.
- **`StrategyRecommender.tsx`** - Recomendador de estrategia con IA (Seccion 11-12): segun nicho, publico y modelo de precio, genera plan personalizado con temario, estructura, pricing ladder, funnel completo y checklist de produccion.

**Cambios en base de datos:**
- Nueva tabla `academia_sales_funnels`: id, course_id, name, stages (JSONB), conversion_rates (JSONB), status, created_at.
- Nueva tabla `academia_leads`: id, funnel_id, email, name, source, stage, lead_magnet_downloaded, webinar_attended, converted, created_at.

---

## Fase 6: Integracion en Navegacion y Dashboard

**Cambios en `AcademiaNavigation.tsx`:**
- Nueva categoria "Estrategia y Nicho" con: Nichos, Avatar Alumno, Validacion.
- Nueva categoria "Estructura y Recursos" con: Disenador de Curso, Recursos, Capstone, Calidad.
- Nueva categoria "Produccion y Legal" con: Checklist Produccion, Compliance Legal, Config. Fiscal.
- Nueva categoria "Negocio y Ventas" con: Modelo de Negocio, Pricing Ladder, Cohortes, Suscripciones.
- Nueva categoria "Marketing y Funnel" con: Funnel de Ventas, Lead Magnets, KPIs Ventas, Mejores Practicas, Recomendador IA.

**Cambios en `AcademiaModuleDashboard.tsx`:**
- Registrar todos los nuevos tabs/componentes en `renderTabContent()`.
- Actualizar las tarjetas del resumen para incluir los nuevos modulos.
- Anadir widgets de KPIs de ventas al panel principal.

---

## Resumen Tecnico

| Elemento | Cantidad |
|---|---|
| Nuevos componentes UI | 15 |
| Nuevas tablas DB | 7 |
| Columnas anadidas a tablas existentes | ~8 |
| Nuevas categorias de navegacion | 5 |
| Edge function (IA estrategia) | 1 |

## Secuencia de implementacion

1. Migracion de base de datos (todas las tablas y columnas nuevas)
2. Fase 1: Nicho + Avatar + Validacion
3. Fase 2: Estructura premium + Recursos + Capstone
4. Fase 3: Produccion + Legal
5. Fase 4: Modelos de negocio + Pricing + Cohortes
6. Fase 5: Funnel + Lead magnets + KPIs ventas + Recomendador IA
7. Fase 6: Integracion completa en navegacion y dashboard

Todas las funcionalidades existentes del modulo Academia se preservan integramente. Los nuevos paneles se anaden como secciones adicionales sin modificar los componentes actuales.

