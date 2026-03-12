

# Arquitectura Funcional Global — HR Enterprise Platform

## Situacion Actual

El modulo HR actual tiene ~65 paneles organizados en 6 mega-menus (Talento, Operaciones, Desarrollo, Enterprise, Herramientas, Utilidades). Incluye nominas, contratos, compliance, IA, digital twin, fairness engine, legal engine, CNAE intelligence, y mas. Todo esta orientado a Espana (IRPF, Seguridad Social, PGC, convenios colectivos espanoles).

**Problema**: la logica de pais esta mezclada en el core (tramos IRPF hardcoded, bases TGSS, tipos de contrato espanoles). No hay abstraccion por jurisdiccion ni soporte real multi-pais.

---

## Las 5 Capas — Definicion Funcional

```text
+================================================================+
|                    CAPA 5: INTEGRATIONS HUB                     |
|  SILTRA | RED/TGSS | AEAT | SEPE | Datadis | Signaturit | ...  |
+================================================================+
|                 CAPA 4: GLOBAL MOBILITY                         |
|  Expatriados | Asignaciones | Tax Equalization | Immigration    |
+================================================================+
|              CAPA 3: PAYROLL & COMPLIANCE ENGINE                |
|  Motor Calculo | Reglas Fiscales | Cotizaciones | Reporting     |
+================================================================+
|         CAPA 2: COUNTRY LOCALIZATIONS (plugins)                 |
|  ES: IRPF/TGSS/ET | FR: URSSAF | PT: SS | DE: SV | ...        |
+================================================================+
|                  CAPA 1: GLOBAL HR CORE                         |
|  Employee Master | Contracts | Time | Leave | Talent | Org     |
|  Workflows | Documents | Compliance | Analytics | IA           |
+================================================================+
```

---

### CAPA 1 — Global HR Core

Nucleo independiente de pais. Todo lo que hoy existe y es universal se mantiene aqui, pero se refactoriza para eliminar referencias a legislacion espanola del core.

**Submodulos existentes que se mantienen (sin cambios significativos):**
- Employee Master Data (ficha con campos globales + extension por pais)
- Organizational Structure (legal entities, work centers, org units) — ya existe
- Recruitment & Onboarding/Offboarding — ya existe
- Performance & Training — ya existe
- Time & Attendance (fichaje) — ya existe
- Leave Management (vacaciones/ausencias) — ya existe, se abstrae el calendario
- Document Management — ya existe
- Workflow Engine — ya existe
- Compliance Framework — ya existe
- Analytics & BI — ya existe
- AI Copilot & Digital Twin — ya existe
- Security, Audit, Fairness — ya existe

**Cambios en Core:**
- El modelo de empleado gana un campo `country_code` y `tax_jurisdiction` generico
- Los contratos pasan a tener un `contract_template_id` que apunta a plantillas por pais en lugar de tipos hardcoded
- Las ausencias usan un `leave_policy_id` vinculado al pais/entidad legal
- El calendario laboral se vincula a jurisdiccion, no a Espana directamente

**Nuevo en Core:**
- **Country Registry** — tabla maestra de paises habilitados con su configuracion (moneda, idioma, zona horaria, formato fecha, formato NIF)
- **Policy Engine** — motor de politicas que resuelve que regla aplicar segun pais + entidad legal + centro de trabajo
- **Employee Extensions** — sistema de campos extendidos por pais (ej: ES necesita NAF, grupo cotizacion; FR necesita numero securite sociale)

**Principio**: si una funcionalidad aplica a todos los paises, va en Core. Si depende de legislacion local, va en Capa 2.

---

### CAPA 2 — Country Localizations (Plugin Architecture)

Cada pais es un "plugin" que registra sus reglas en el sistema. No se hardcodea nada en el core.

**Estructura por pais:**

```text
localization/
  es/    -- Espana
    tax-rules.ts        (IRPF tramos, deducciones)
    social-security.ts  (TGSS bases, tipos, MEI, IT/IMS)
    contract-types.ts   (indefinido, temporal, practicas...)
    leave-policies.ts   (22 dias laborables, permisos ET)
    labor-calendar.ts   (festivos nacionales + CCAA)
    collective-agreements.ts (convenios colectivos)
    document-templates.ts (nomina SII, certificado empresa...)
    official-forms.ts   (Milena PA, modelo 111, 190...)
  fr/    -- Francia (futuro)
  pt/    -- Portugal (futuro)
  de/    -- Alemania (futuro)
```

**Espana (ES) — plugin inicial completo:**

| Area | Contenido |
|------|-----------|
| Fiscal | IRPF 2026 (tramos estatales + CCAA), modelo 111/190/296 |
| Seguridad Social | Bases min/max, tipos AT/EP, MEI, grupos cotizacion 1-11 |
| Contratos | 40+ tipos segun RD, conversion, subrogacion |
| Permisos | Estatuto Trabajadores art.37, LOIMH, convenio |
| Calendario | Festivos nacionales + 17 CCAA + locales |
| Formularios | Milena PA (altas/bajas/variaciones), Certific@2, Contrat@ |
| Convenios | Vinculacion CNAE -> convenio -> tablas salariales |
| Nomina | Estructura propia (devengos/deducciones espanoles) |

**Cada plugin registra:**
- Reglas fiscales (interfaz `TaxRule`)
- Reglas de cotizacion (interfaz `SocialContributionRule`)
- Tipos de contrato permitidos
- Politicas de ausencias
- Plantillas documentales
- Formularios oficiales
- Validaciones especificas

---

### CAPA 3 — Payroll & Compliance Engine

Motor de calculo de nomina que consume las reglas de Capa 2.

**Submodulos:**

| Submodulo | Funcion |
|-----------|---------|
| Payroll Calculator | Motor que aplica reglas fiscales + SS del pais para generar nomina |
| Payroll Run Manager | Procesamiento masivo mensual con validaciones |
| Retroactive Engine | Recalculos retroactivos (ya existe, se generaliza) |
| Settlement Engine | Finiquitos/liquidaciones (ya existe, se generaliza) |
| Compliance Reporter | Generacion de modelos fiscales por pais (111, 190 para ES) |
| Payslip Generator | Generacion de recibos de salario en formato legal del pais |
| Cost Simulation | Simulacion de costes salariales multi-pais |

**Principio**: el motor es generico. Las formulas vienen del plugin de pais. El motor solo ejecuta:
1. Obtener reglas del pais del empleado
2. Calcular base imponible
3. Aplicar deducciones fiscales
4. Aplicar cotizaciones sociales
5. Generar resultado con trazabilidad

**Lo que cambia respecto a hoy**: la logica de IRPF y TGSS que esta en la edge function `erp-hr-ai-agent` y en `HRPayrollPanel` se extrae al plugin ES y el motor la consume via interfaz.

---

### CAPA 4 — Global Mobility / Expatriates

Modulo completamente nuevo. Gestiona empleados que trabajan en un pais distinto al de su entidad legal de origen.

**Submodulos:**

| Submodulo | Funcion |
|-----------|---------|
| Assignment Management | Asignaciones internacionales (corta/larga duracion, commuter) |
| Tax Equalization | Calculo de ecualizacion fiscal (home vs host country) |
| Immigration Tracker | Visados, permisos trabajo, fechas vencimiento, alertas |
| Relocation Manager | Paquetes de relocalizacion, allowances, housing |
| Split Payroll | Nomina dividida entre pais origen y destino |
| Cost Projection | Proyeccion de costes de expatriacion |
| Compliance Checker | 183 dias, permanent establishment risk, social security certificates (A1/E101) |
| Repatriation | Proceso de retorno, reintegracion |

**Modelo de datos clave:**
- `hr_global_assignments` — asignacion con home_country, host_country, tipo, fechas
- `hr_immigration_documents` — visados y permisos con alertas de vencimiento
- `hr_tax_equalization` — calculos de ecualizacion fiscal
- `hr_relocation_packages` — paquetes de relocalizacion
- `hr_split_payroll_config` — configuracion de nomina dividida

**Roles especificos:**
- Global Mobility Manager
- Immigration Specialist
- Tax Equalization Analyst

---

### CAPA 5 — Official Integrations Hub

Conectores con sistemas oficiales y terceros. Algunos ya existen parcialmente.

| Integracion | Pais | Estado | Tipo |
|-------------|------|--------|------|
| SILTRA (Seg. Social) | ES | Nuevo | Ficheros XML/envio |
| RED/TGSS | ES | Parcial | API/fichero |
| AEAT (mod. 111/190) | ES | Nuevo | Generacion + envio |
| Contrat@ | ES | Nuevo | Comunicacion contratos |
| Certific@2 | ES | Nuevo | Certificados empresa |
| SEPE | ES | Nuevo | Prestaciones desempleo |
| Milena PA | ES | Nuevo | Altas/bajas/variaciones |
| Signaturit | Global | Existe | Firma electronica |
| Datadis | ES | Existe | Consumos energeticos |

**Arquitectura del hub:**
- Cada conector implementa una interfaz `OfficialIntegrationAdapter`
- Metodos estandar: `validate()`, `generate()`, `submit()`, `checkStatus()`
- Estado de cada envio persistido con trazabilidad
- Dashboard unificado de estado de integraciones

---

## Arbol de Modulos Resultante

```text
HR Enterprise Platform
|
+-- [CORE] Global HR Core
|   +-- Employee Master (+ country extensions)
|   +-- Org Structure (entities, centers, units)
|   +-- Contracts (template-based, multi-country)
|   +-- Time & Attendance
|   +-- Leave Management (policy-based)
|   +-- Recruitment
|   +-- Onboarding / Offboarding
|   +-- Performance & OKRs
|   +-- Training & Development
|   +-- Talent Intelligence
|   +-- Compensation Suite
|   +-- Wellbeing
|   +-- Document Management
|   +-- Workflow Engine
|   +-- Compliance Framework
|   +-- Analytics & BI
|   +-- AI Copilot & Digital Twin
|   +-- Security & Audit
|   +-- Fairness Engine
|   +-- Country Registry  [NUEVO]
|   +-- Policy Engine      [NUEVO]
|
+-- [LOC] Country Localizations
|   +-- ES - Spain (plugin completo)
|   |   +-- Tax Rules (IRPF)
|   |   +-- Social Security (TGSS)
|   |   +-- Contract Types
|   |   +-- Leave Policies
|   |   +-- Labor Calendar
|   |   +-- Collective Agreements
|   |   +-- Official Forms
|   |   +-- Document Templates
|   +-- (FR, PT, DE... futuros)
|
+-- [PAY] Payroll & Compliance Engine
|   +-- Calculator (generic, rule-driven)
|   +-- Run Manager
|   +-- Retroactive Engine
|   +-- Settlement Engine
|   +-- Compliance Reporter
|   +-- Payslip Generator
|   +-- Cost Simulation
|
+-- [MOB] Global Mobility
|   +-- Assignment Management
|   +-- Tax Equalization
|   +-- Immigration Tracker
|   +-- Relocation Manager
|   +-- Split Payroll
|   +-- Compliance Checker (183d, A1)
|
+-- [INT] Integrations Hub
    +-- SILTRA / RED / TGSS
    +-- AEAT (111, 190)
    +-- Contrata / Certifica2 / SEPE
    +-- Milena PA
    +-- Signaturit
    +-- Datadis
```

---

## Roles del Sistema

| Rol | Alcance |
|-----|---------|
| HR Admin | Acceso total, configuracion global |
| HR Manager | Gestion de su ambito (entity/center/department) |
| Payroll Specialist | Nominas, SS, fiscal |
| Compliance Officer | Cumplimiento normativo, auditorias |
| Global Mobility Manager | Expatriados, asignaciones, immigration |
| Employee (Self-Service) | Su ficha, nominas, solicitudes |
| Manager (Line) | Su equipo, aprobaciones |
| Country Admin | Configuracion de localizacion de su pais |

---

## Principios de Diseno

1. **Core agnostico de pais** — ninguna referencia a legislacion concreta en el nucleo
2. **Plugin por jurisdiccion** — cada pais aporta sus reglas via interfaces tipadas
3. **Policy resolution** — el sistema resuelve automaticamente que regla aplicar: pais > entidad legal > centro > empleado
4. **Multi-entity nativo** — ya existe, se refuerza con el country_code
5. **Trazabilidad total** — cada calculo, decision y cambio queda en audit log
6. **Workflow-driven** — procesos criticos pasan por el motor de aprobaciones existente
7. **AI-augmented** — el copilot existente se extiende con conocimiento multi-jurisdiccion
8. **Retrocompatible** — los datos actuales de Espana migran al plugin ES sin perdida

---

## Dependencias entre Capas

```text
Capa 5 (Integrations) --> Capa 3 (Payroll) : genera ficheros para enviar
Capa 5 (Integrations) --> Capa 2 (Localization) : usa formatos del pais
Capa 4 (Mobility) --> Capa 3 (Payroll) : split payroll, tax eq
Capa 4 (Mobility) --> Capa 2 (Localization) : reglas home + host
Capa 3 (Payroll) --> Capa 2 (Localization) : consume reglas fiscales/SS
Capa 3 (Payroll) --> Capa 1 (Core) : datos empleado, contrato, tiempo
Capa 2 (Localization) --> Capa 1 (Core) : se registra via Country Registry
Capa 1 (Core) : autonomo, sin dependencias ascendentes
```

---

## Impacto en Navegacion UI

Se anade un nuevo mega-menu **"Global"** entre Enterprise y Herramientas:

| Grupo | Items |
|-------|-------|
| Localizacion | Country Registry, Plugin ES Config, Calendarios por Pais |
| Payroll Engine | Motor de Nomina, Simulador Multi-Pais, Compliance Reports |
| Global Mobility | Asignaciones, Immigration, Tax Equalization, Split Payroll |
| Integraciones Oficiales | SILTRA, AEAT, Contrata, Milena PA, Hub Status |

---

## Plan de Implementacion (fases sugeridas)

| Fase | Contenido | Prioridad |
|------|-----------|-----------|
| G1 | Country Registry + Policy Engine + Employee Extensions | Alta |
| G2 | Extraer logica ES a plugin (IRPF, TGSS, contratos) | Alta |
| G3 | Payroll Engine generico (refactor del actual) | Alta |
| G4 | Integraciones oficiales ES (Milena PA, SILTRA, Contrata) | Alta |
| G5 | Global Mobility (assignments, immigration, tax eq) | Media |
| G6 | Plugins adicionales (FR, PT) | Baja |

Cada fase se implementa incrementalmente sin romper lo existente. G1 y G2 son prerequisitos para todo lo demas.

---

## Resumen Ejecutivo

- **No se crea modulo nuevo**: se reorganiza el existente en 5 capas logicas
- **La logica de Espana se extrae a un plugin**: el core queda limpio
- **Global Mobility es el unico bloque completamente nuevo**
- **El motor de nomina se generaliza**: hoy calcula solo para ES, manana para cualquier pais
- **Las integraciones oficiales se formalizan**: con adaptadores tipados y trazabilidad
- **Todo retrocompatible**: los datos actuales se preservan, solo se anade la capa de abstraccion

