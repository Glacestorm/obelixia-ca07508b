

# Arquitectura de Navegacion y Paginas — HR Enterprise Platform

## Estado Actual

El modulo HR usa un sistema de mega-menus horizontales (8 categorias: Talento, Operaciones, Desarrollo, Enterprise, Global, Herramientas, Utilidades) con ~65 paneles renderizados condicionalmente via `activeModule` string en un unico `HRModule.tsx`. No hay rutas URL, no hay navegacion por expediente, no hay vistas por rol, y el menu "Global" solo tiene Country Registry con placeholders.

## Problema

1. Todo vive en una sola pagina sin URLs navegables — imposible deep-link, bookmarks o compartir
2. No hay concepto de "expediente de empleado" transversal (contrato + nomina + documentos + incidencias en una sola vista)
3. No hay dashboards por rol
4. No hay navegacion contextual entre entidades relacionadas (empleado → contrato → nomina → envio oficial)
5. El mega-menu "Global" esta vacio y las nuevas capas (Payroll Engine, Mobility, Integraciones Oficiales) no tienen estructura de paginas

## Propuesta: Arquitectura de Navegacion en 3 Niveles

```text
Nivel 1: Mega-Menu horizontal (ya existe, se reorganiza)
  |
Nivel 2: Sidebar contextual por area (nuevo)
  |
Nivel 3: Tabs/breadcrumbs dentro de cada pagina (nuevo)
```

### Nivel 1 — Mega-Menu Principal (reorganizado)

Se mantiene el sistema actual de popovers horizontales pero se reorganizan las 8 categorias en 7 areas funcionales alineadas con las capas:

| Menu | Contenido | Rol minimo |
|------|-----------|------------|
| **Core HR** | Empleados, Contratos, Organizacion, Documentos, Calendario | Tecnico RRHH |
| **Payroll** | Nominas, Recalculo, Finiquitos, Seg.Social, Variables | Payroll Manager |
| **Laboral** | Vacaciones, Fichaje, Incidencias, Solicitudes Admin, Tareas | Tecnico Laboral |
| **Global** | Country Registry, Localizacion ES, Mobility, Integraciones Oficiales | Admin Global |
| **Talento** | Reclutamiento, Onboarding/Off, Performance, Training, Sucesion, Marketplace | HR Manager |
| **Enterprise** | Command Center, Legal Entities, Workflows, Compliance, IA, Digital Twin | Admin Global |
| **Utilidades** | Analytics, Reporting, Auditoria, Config, Seeds, API, Ayuda | Segun area |

### Nivel 2 — Sidebar Contextual (nuevo concepto)

Cuando el usuario entra en un area, aparece una sidebar izquierda estrecha con:
- Listados (ej: lista de empleados)
- Filtros rapidos (por entidad legal, centro, departamento, pais)
- Acciones rapidas contextuales

Esto NO requiere cambiar a un layout con sidebar permanente. Se implementa como un panel colapsable dentro de cada area mayor.

### Nivel 3 — Expediente Transversal del Empleado (nuevo)

La vista mas critica. Un empleado tiene un "expediente" con tabs:

| Tab | Contenido |
|-----|-----------|
| Ficha | Datos personales, extensions por pais, foto, estado |
| Contratos | Historico contractual, contrato vigente, condiciones |
| Nominas | Historico de nominas, ultima nomina, variables |
| Tiempo | Fichajes, vacaciones, ausencias, incidencias |
| Documentos | Todos los documentos vinculados, evidencias compliance |
| Movilidad | Asignaciones internacionales (si aplica) |
| SS/Fiscal | Eventos de SS, eventos fiscales, retenciones |
| Envios Oficiales | Milena PA, Contrat@, certificados vinculados |
| Auditoria | Timeline de cambios en su expediente |

---

## Sitemap Completo

```text
/erp → ERPPage (ya existe)
  └── HRModule (modulo embebido, sin rutas propias)

PAGINAS PRINCIPALES (dentro de HRModule via activeModule):

CORE HR
├── employees              → Lista + busqueda + filtros (entidad, centro, pais, estado)
│   └── employee/:id       → Expediente transversal (tabs arriba descritos)
├── contracts              → Lista contratos con filtros
│   └── contract/:id       → Detalle contrato + empleado vinculado
├── departments            → Arbol organizativo
├── documents              → Gestor documental con categorias
├── org-structure          → Organigrama visual
├── legal-entities         → CRUD entidades legales
├── work-centers           → CRUD centros de trabajo
└── work-calendars         → Calendarios por jurisdiccion

PAYROLL
├── payroll                → Dashboard + procesamiento mensual
│   └── payroll-run/:id    → Detalle de proceso de nomina
├── payroll-recalc         → Recalculos retroactivos
├── settlements            → Finiquitos/liquidaciones
├── ss                     → Seg. Social (cotizaciones, eventos)
├── payroll-periods        → Gestion de periodos (nuevo)
└── payroll-variables      → Variables por empleado/periodo (nuevo)

ADMINISTRACION LABORAL
├── vacations              → Solicitudes + calendario
├── time-clock             → Control de fichaje
├── leave-incidents        → Incidencias de ausencia (nuevo)
├── admin-requests         → Solicitudes administrativas (nuevo)
├── hr-tasks               → Tareas RRHH asignables (nuevo)
└── regulatory-watch       → Vigilancia normativa

PORTAL ADMINISTRATIVO (tipo Milena PA)
├── official-submissions   → Listado de envios oficiales (nuevo)
│   └── submission/:id     → Detalle + acuses de recibo
├── milena-pa              → Formulario altas/bajas/variaciones (nuevo)
├── contrata               → Comunicacion de contratos (nuevo)
├── certifica2             → Certificados empresa (nuevo)
└── integration-hub        → Dashboard estado adaptadores (nuevo)

LOCALIZACION ESPANA
├── country-registry       → Paises habilitados (ya existe)
├── es-tax-rules           → Tramos IRPF, retenciones (nuevo)
├── es-social-security     → Bases, tipos, grupos cotizacion (nuevo)
├── es-contract-types      → Tipos de contrato RD (nuevo)
├── es-leave-policies      → Permisos ET/convenio (nuevo)
├── es-collective-agreements → Convenios colectivos (existe, se reubica)
└── es-labor-calendar      → Festivos nacionales+CCAA+locales (nuevo)

GLOBAL MOBILITY
├── mobility-assignments   → Lista asignaciones internacionales (nuevo)
│   └── assignment/:id     → Detalle con tabs (paquete, immigration, tax eq)
├── immigration-tracker    → Visados y permisos con alertas (nuevo)
├── tax-equalization       → Calculos ecualizacion fiscal (nuevo)
├── split-payroll          → Config nomina dividida (nuevo)
└── mobility-dashboard     → KPIs de movilidad (nuevo)

TALENTO (ya existe, se mantiene)
├── recruitment, onboarding, offboarding
├── performance, training, skills-matrix
├── marketplace, succession
└── talent-intelligence

ENTERPRISE (ya existe, se mantiene)
├── enterprise-dashboard, sla-dashboard, approval-inbox
├── enterprise-roles, audit-trail, workflow-designer
├── compliance-enterprise, compensation-suite
├── wellbeing, fairness-engine, digital-twin
├── copilot-twin, workforce-planning
├── ai-governance, security-governance
├── legal-engine, cnae-intelligence
└── role-experience, esg-selfservice

ANALYTICS & IA
├── analytics, analytics-intelligence
├── util-analytics-bi, util-reporting
└── util-board-pack

CONFIGURACION & COMPLIANCE
├── compliance-enterprise (existe)
├── compliance-evidence    → Evidencias documentales (nuevo)
├── compliance-requirements → Requisitos por pais (nuevo)
├── legal-compliance (existe)
└── util-compliance (existe)

UTILIDADES (existe, se mantiene)
├── util-premium-dash, util-orchestration, util-alerts
├── util-feed, util-settings, util-health
├── util-export, util-seed, util-help
├── util-api-webhooks, util-integrations
└── util-audit, util-ai-hybrid
```

---

## Dashboards por Rol

| Rol | Dashboard por defecto | Acceso |
|-----|----------------------|--------|
| **Admin Global** | Enterprise Command Center + metricas multi-pais | Todo |
| **Tecnico RRHH** | Core HR dashboard con KPIs de plantilla | Core HR + Laboral + Documentos |
| **Tecnico Laboral** | Vista de incidencias + tareas + solicitudes pendientes | Laboral + Parte de Payroll |
| **Payroll Manager** | Dashboard nominas + periodos abiertos + alertas SS | Payroll completo + SS |
| **Manager (linea)** | Mi equipo: vacaciones, evaluaciones, solicitudes pendientes | Su equipo via scope |
| **Empleado** | Mi expediente: nominas, vacaciones, documentos, solicitudes | Solo sus datos |
| **Cliente Asesoria** | Portal externo: nominas procesadas, documentos, envios | Solo lectura limitada |
| **Auditor/Compliance** | Dashboard compliance + evidencias + audit trail | Lectura transversal |

---

## Navegacion Transversal

Desde cualquier entidad se puede navegar a las relacionadas:

```text
Empleado ←→ Contrato ←→ Nomina ←→ Variables
    ↕            ↕          ↕
Documentos   SS Events   Tax Events
    ↕            ↕
Incidencias  Envios Oficiales
    ↕
Asignacion Mobility ←→ Immigration ←→ Tax Equalization
```

Implementacion: cada panel de detalle incluye una barra lateral de "entidades relacionadas" con links directos. Por ejemplo, en el expediente del empleado, el tab "Envios Oficiales" muestra los Milena PA enviados para ese empleado.

---

## Acciones Rapidas (Command Palette / Quick Actions)

Disponibles desde cualquier vista via atajo de teclado (Cmd+K):

| Accion | Contexto |
|--------|----------|
| Nueva nomina | Payroll |
| Solicitar vacaciones | Empleado/Manager |
| Alta empleado | Core HR |
| Nuevo contrato | Core HR |
| Enviar Milena PA | Portal Admin |
| Registrar incidencia | Laboral |
| Crear tarea RRHH | Admin |
| Buscar empleado | Global |

---

## Estados Visuales

Cada entidad principal tiene estados con indicadores de color:

| Entidad | Estados |
|---------|---------|
| Empleado | Activo (green), Baja temporal (amber), Baja definitiva (red), Excedencia (blue) |
| Contrato | Vigente (green), Proximo vencimiento (amber), Finalizado (gray), En tramite (blue) |
| Nomina | Borrador (gray), Calculada (blue), Aprobada (green), Pagada (emerald), Error (red) |
| Envio Oficial | Pendiente (amber), Enviado (blue), Aceptado (green), Rechazado (red), Error (red) |
| Incidencia | Abierta (amber), En proceso (blue), Resuelta (green), Escalada (red) |
| Asignacion Mobility | Planificada (gray), Activa (green), En transicion (amber), Finalizada (blue) |
| Solicitud Admin | Pendiente (amber), En revision (blue), Aprobada (green), Denegada (red) |
| Compliance Evidence | Vigente (green), Proximo vencimiento (amber), Expirada (red), Pendiente (gray) |

---

## Componentes UI Nuevos Necesarios

| Componente | Proposito |
|------------|-----------|
| `HREmployeeExpedient` | Vista de expediente transversal con tabs |
| `HREntityBreadcrumb` | Breadcrumb contextual (Empresa > Entidad Legal > Centro > Departamento > Empleado) |
| `HRRelatedEntities` | Panel lateral con links a entidades relacionadas |
| `HRStatusBadge` | Badge unificado con colores por estado |
| `HROfficialSubmissionsPanel` | CRUD de envios oficiales |
| `HRMilenaPA` | Formulario de altas/bajas/variaciones |
| `HRLeaveIncidentsPanel` | Gestion de incidencias de ausencia |
| `HRAdminRequestsPanel` | Solicitudes administrativas |
| `HRTasksPanel` | Tareas RRHH |
| `HRMobilityDashboard` | Dashboard de movilidad internacional |
| `HRMobilityAssignmentDetail` | Detalle de asignacion con tabs |
| `HRImmigrationTracker` | Tracker de visados y permisos |
| `HRTaxEqualizationPanel` | Calculos de ecualizacion fiscal |
| `HRComplianceEvidencePanel` | Gestion de evidencias |
| `HRPayrollPeriodsPanel` | Gestion de periodos de nomina |
| `HRESLocalizationPanel` | Config del plugin Espana |
| `HRCommandPalette` | Busqueda global y acciones rapidas (Cmd+K) |

---

## Plan de Implementacion

| Fase | Que se construye | Impacto |
|------|-----------------|---------|
| **N1** | Reorganizar mega-menu (7 areas), anadir items nuevos al Global menu | Solo navegacion |
| **N2** | Expediente transversal del empleado (`HREmployeeExpedient`) | Vista critica |
| **N3** | Paneles nuevos: Leave Incidents, Admin Requests, Tasks, Payroll Periods | Operativa laboral |
| **N4** | Portal Administrativo: Official Submissions, Milena PA, Contrat@ | Integraciones ES |
| **N5** | Global Mobility: Dashboard, Assignment Detail, Immigration, Tax Eq | Capa 4 |
| **N6** | Compliance Evidence + Requirements | Trazabilidad |
| **N7** | Dashboards por rol + Command Palette | UX enterprise |
| **N8** | Localizacion ES panels (tax rules, SS, contract types, leave policies) | Plugin ES UI |

Recomiendo empezar por **N1 + N2** (reorganizar menu + expediente empleado) como base para todo lo demas.

