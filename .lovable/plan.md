

# RRHH-AUDIT.2 — Plan de Ejecución Real, Priorizado y Demo-Ready

---

## A. PLAN DE ACCIÓN EJECUTIVO — TOP 20 ACCIONES PRIORIZADAS

| # | Acción | Objetivo | Impacto | Esfuerzo | Reutiliza existente | Afecta |
|---|--------|----------|---------|----------|---------------------|--------|
| 1 | **Hacer visible Utilidades para admin** | Desbloquear 17 tools ocultos | Muy alto | Mínimo (1 línea) | 100% | Demo, producto |
| 2 | **Hacer visible Talent para admin** | Desbloquear Onboarding/Offboarding/Formación | Alto | Mínimo (1 línea) | 100% | Demo |
| 3 | **Hacer visible Enterprise para admin** | Desbloquear Command Center, Workflows, Auditoría | Alto | Mínimo (1 línea) | 100% | Demo, producto |
| 4 | **Crear Seed Demo Maestro** | 12 perfiles con casuísticas complejas | Muy alto | Alto (edge function) | Parcial (seed existente) | Demo |
| 5 | **Botón "Portal Empleado" en expediente** | Acceso directo backoffice→portal | Medio | Bajo | 100% | UX, demo |
| 6 | **Añadir concepto stock_options al catálogo** | Cerrar gap demo | Medio | Mínimo | 100% (payrollConceptCatalog) | Demo |
| 7 | **Quick links en Dashboard ejecutivo** | Acceso rápido a ES Localización, Portal, Utilidades | Medio | Bajo | 100% | UX |
| 8 | **Badge Cmd+K visible en header** | Descubrir Command Palette | Bajo | Mínimo | 100% | UX |
| 9 | **Onboarding/Offboarding en Workforce como advanced** | Ciclo vida visible sin cambiar menús ocultos | Medio | Bajo | 100% | Demo |
| 10 | **Link "Mi Portal" en nav principal de RRHH** | Acceso permanente al portal | Medio | Bajo | 100% | Demo, UX |
| 11 | **Seed: incidencias IT/accidente/nacimiento** | Poblar leave_incidents | Alto | Medio | Parcial | Demo |
| 12 | **Seed: enrollment retrib. flexible** | Poblar benefits_enrollments | Medio | Medio | Parcial | Demo |
| 13 | **Seed: payroll con horas extras** | Incidencia payroll tipo horas_extra | Medio | Medio | Parcial | Demo |
| 14 | **Seed: desplazamiento internacional** | Poblar mobility_assignments | Medio | Medio | Parcial | Demo |
| 15 | **Seed: despido disciplinario + objetivo** | 2 empleados terminated con tipo | Medio | Medio | Parcial | Demo |
| 16 | **Demo mode banner** | Indicador visual de datos demo | Bajo | Bajo | No | UX |
| 17 | **Flujo reducción jornada** | Tipo solicitud + impacto contrato | Medio | Alto | Parcial (admin_requests) | Demo, funcional |
| 18 | **Nómina de atrasos/recálculo** | Flujo correction run | Medio | Alto | 100% (payroll engine) | Demo |
| 19 | **Timeline laboral en expediente** | Vista cronológica unificada | Alto | Alto | Parcial | UX, demo |
| 20 | **Validaciones post-seed** | Verificar coherencia automática | Medio | Medio | Parcial (health check) | QA |

### 5 acciones imprescindibles para 70%→95%:
1. Seed Demo Maestro (12 perfiles)
2. Visibilizar Utilidades/Talent/Enterprise
3. Concepto stock_options en catálogo
4. Seed incidencias IT/accidente + retrib. flexible
5. Seed despidos + desplazamiento

### 5 acciones que aumentan valor percibido sin construir:
1. Visibilizar Utilidades (17 herramientas ya hechas)
2. Visibilizar Talent (10 pantallas ya hechas)
3. Visibilizar Enterprise (15 pantallas ya hechas)
4. Badge Cmd+K (Command Palette ya existe)
5. Quick links en Dashboard ejecutivo

### 5 acciones que mejoran robustez:
1. Validaciones post-seed automáticas
2. Flujo reducción jornada formal
3. Nómina de atrasos como run correction
4. Demo mode banner
5. Timeline laboral unificada

---

## B. QUICK WINS REALES

### B.1 Menú / Navegación

| Quick Win | Archivo | Cambio | Riesgo | Impacto |
|-----------|---------|--------|--------|---------|
| Visibilizar Utilidades | `HRNavigationMenu.tsx:75` | Añadir `'utilities'` a `mvpCategories` condicionado a `isAdmin` | Nulo | 17 herramientas desbloqueadas |
| Visibilizar Talent | `HRNavigationMenu.tsx:75` | Añadir `'talent'` a `mvpCategories` condicionado a `isAdmin` | Nulo | 10 pantallas desbloqueadas |
| Visibilizar Enterprise | `HRNavigationMenu.tsx:75` | Añadir `'enterprise'` a `mvpCategories` condicionado a `isAdmin` | Nulo | 15 pantallas desbloqueadas |
| Onboarding/Offboarding en Workforce | `HRNavigationMenu.tsx:96-110` | Añadir `'onboarding'`, `'offboarding'` a `advancedItems` + items en subGroup Workforce | Bajo | Ciclo vida visible |

**Implementación concreta para visibilidad:**
En `HRNavigationMenu.tsx` línea 75, cambiar la lógica de `mvpCategories` para que cuando `isAdmin`, incluya también `'utilities'`, `'talent'`, `'enterprise'`. Esto se resuelve cambiando el filtrado en línea 450-459 para que admin vea todos los menús.

### B.2 Visibilidad / Accesos rápidos

| Quick Win | Archivo | Cambio |
|-----------|---------|--------|
| Badge Cmd+K | `HRModule.tsx` header area | Añadir `<Badge>⌘K</Badge>` junto al título, clickable para abrir command palette |
| Link "Portal Empleado" | `HRNavigationMenu.tsx` | Añadir botón directo junto a Dashboard que abre `/mi-portal` en nueva pestaña |
| Quick links Dashboard | `HRExecutiveDashboard.tsx` | Añadir row de acceso rápido: España, Portal, Utilidades, Reporting |

### B.3 Portal del Empleado desde backoffice

| Quick Win | Archivo | Cambio |
|-----------|---------|--------|
| Botón en expediente | `HREmployeeExpedient.tsx` | Añadir `<Button>` "Abrir Portal" que abre `/mi-portal` en nueva pestaña |
| Botón en tabla empleados | `HREmployeesPanel.tsx` | Añadir opción "Ver como empleado" en DropdownMenu (línea ~400) |

### B.4 Concepto stock_options

| Quick Win | Archivo | Cambio |
|-----------|---------|--------|
| Nuevo concepto | `src/engines/erp/hr/payrollConceptCatalog.ts` | Añadir entrada `{ code: 'STOCK_OPTIONS', ...}` con clasificación fiscal correcta |

---

## C. REDISEÑO DE MENÚ — PROPUESTA CONCRETA

### Menú actual (mvpMode=true, admin)

```text
Dashboard | People(10) | Payroll(9) | Workforce(8) | Global(5)
[OCULTOS: Talent(10) | Enterprise(15) | Utilidades(17)]
```

### Menú recomendado (admin)

```text
Dashboard | People(10) | Payroll(9) | Workforce(10*) | Global(5) | Talent(10) | Enterprise(15) | Utilidades(17) | [Portal ↗]
```

*Workforce +2: Onboarding y Offboarding movidos desde Talent como `advancedItems`

**Cambios específicos:**

1. **mvpCategories para admin**: incluir `talent`, `enterprise`, `utilities` cuando `isAdmin=true`
2. **Workforce**: añadir `onboarding` y `offboarding` como items advanced en subGroup "Ciclo de Vida" (duplicados de Talent, con misma referencia)
3. **Botón "Portal"**: junto a Dashboard, icono de puerta/usuario, abre `/mi-portal` en nueva pestaña
4. **Dashboard**: añadir 4 cards de acceso rápido → España, Utilidades, Reporting, Portal

**Justificación:** El 60% del producto está oculto. El admin (que hace demos y gestiona) necesita ver todo. Los usuarios normales siguen viendo solo MVP. Sin riesgo de regresión.

---

## D. UTILIDADES — PLAN DE EXPLOTACIÓN

### Categorización por uso

| Categoría | Utilidades | Visibilidad | Usuario |
|-----------|-----------|-------------|---------|
| **Operación RRHH** | Dashboard Premium, Orquestación, Alertas, Actividad | Admin siempre | RRHH Manager |
| **Demo / preventa** | Seed Data, Health Check, Audit Generator | Admin siempre | Comercial, consultor |
| **Reporting / dirección** | Reporting Engine, Board Pack, People Analytics, Analytics BI | Admin siempre | Director RRHH, CFO |
| **Compliance** | Compliance Regulatorio, Cumplimiento Auto | Admin siempre | Legal, compliance |
| **Integraciones** | API & Webhooks, Integraciones Enterprise | Admin solo | IT, integrador |
| **Administración** | Config, Export, Centro de Ayuda | Admin siempre | Admin |
| **QA / testing** | Health Check, Seed Data | Admin solo | QA, desarrollo |

### Utilidades a hacer visibles ya:
Todas — el menú Utilidades completo debe ser visible para admin. Las 17 utilidades ya están implementadas y funcionales.

### Utilidades que faltan (futuro):
1. **Simulador de nómina interactivo** — Prioridad alta, impacto demo extremo
2. **Checklist cierre mensual** — Prioridad alta, valor operativo
3. **Generador caso demo maestro** — Prioridad alta, valor preventa

---

## E. SEED DEMO MAESTRO — BLUEPRINT

### Diseño general
- **Edge function**: `erp-hr-seed-demo-master` (nueva)
- **Acción**: `seed_master_demo`
- **Entrada**: `{ company_id, reset_previous?: boolean }`
- **12 perfiles demo**, cada uno con nombre, situación y datos completos

### Perfiles Demo

| # | Nombre | Rol | Situación | Tablas | Cubre |
|---|--------|-----|-----------|--------|-------|
| 1 | **Carlos Ruiz Martín** | Desarrollador Senior | Estándar, activo, nómina normal | employees, contracts, payroll_records, time_clock, leave_balances | Baseline, fichaje, vacaciones |
| 2 | **Ana Belén Torres** | Analista Junior | Alta reciente (hace 5 días) | employees, contracts, registration_data, contract_process_data | Alta, TGSS, Contrat@ |
| 3 | **Miguel Ángel Sanz** | Director Comercial | Horas extras + bonus | employees, payroll_records, payroll_incidents (horas_extra) | Nómina variables |
| 4 | **Laura Fernández Gil** | Product Manager | Retrib. flexible (seguro médico + tickets) | employees, benefits_plans, benefits_enrollments, payroll_records | Beneficios, compensación |
| 5 | **David Moreno Ortiz** | CTO | Stock options + salario alto | employees, payroll_records, payroll_incidents (stock_options) | Retrib. especial, fiscalidad |
| 6 | **Elena Vidal Ruiz** | Diseñadora UX | IT por accidente de trabajo (activa) | employees, leave_incidents (work_accident), leave_requests, payroll_records | IT, incidencias, impacto nómina |
| 7 | **Javier López Navarro** | Ingeniero DevOps | Permiso nacimiento (paternidad activa) | employees, leave_requests (paternity), leave_balances | Permisos especiales |
| 8 | **Sofía Martínez Díaz** | Country Manager LATAM | Desplazamiento temporal a México | employees, mobility_assignments, contracts | Movilidad internacional |
| 9 | **Pablo García Herrera** | Técnico de Soporte | Atrasos por IT no reflejada | employees, payroll_records, payroll_runs (correction) | Atrasos, recálculo |
| 10 | **Carmen Alonso Vega** | Contable Senior | Reducción jornada guarda legal | employees, contracts (jornada parcial), admin_requests | Reducción, modificación contractual |
| 11 | **Roberto Díaz Campos** | Comercial | Despido disciplinario | employees (terminated), contracts, payroll_records | Finiquito disciplinario |
| 12 | **Isabel Muñoz Pérez** | Marketing Manager | Despido objetivo | employees (terminated), contracts, payroll_records | Finiquito objetivo, indemnización |

### Datos transversales por perfil
Cada perfil incluirá:
- `erp_hr_employees` (datos completos)
- `erp_hr_contracts` (al menos 1 contrato)
- `erp_hr_payroll_records` (3 meses: ene-mar 2026)
- `erp_hr_leave_balances` (saldos vacaciones)
- `erp_hr_employee_documents` (mínimo 3 documentos)
- `erp_hr_time_clock` (registros de fichaje)

### Orden de siembra
1. Employees → 2. Contracts → 3. Leave balances → 4. Payroll records → 5. Payroll incidents → 6. Leave incidents/requests → 7. Benefits → 8. Mobility → 9. Time clock → 10. Documents → 11. Registration/contract data → 12. Admin requests

### Validaciones post-seed
- Count de empleados = 12
- Count de contratos >= 12
- Count de payroll_records >= 36
- Verificar que terminated employees tienen contratos inactivos
- Verificar leave_balances para todos los activos
- Verificar al menos 1 documento por empleado

### Modo reseed seguro
- Marcar empleados demo con `metadata.is_demo_master = true`
- Antes de reseed, borrar solo los marcados
- No tocar empleados existentes de seed anterior

---

## F. PLAN PARA DEMO 100%

### Top 5 gaps críticos (bloquean demo)

| Gap | Solución | Esfuerzo |
|-----|----------|----------|
| Sin perfiles con casuísticas complejas | Seed Demo Maestro | Alto |
| Menús Talent/Enterprise/Utilidades ocultos | Visibilizar para admin | Mínimo |
| Sin concepto stock_options | Añadir al catálogo | Mínimo |
| Sin flujo explícito reducción jornada | Tipo solicitud admin_request | Medio |
| Nómina de atrasos sin run correction demo | Seed con run tipo correction | Medio |

### Top 5 gaps fáciles de cerrar

| Gap | Solución | Esfuerzo |
|-----|----------|----------|
| Menús ocultos | 3 líneas en mvpCategories | 5 min |
| Concepto stock_options | 1 entrada en catálogo | 10 min |
| Acceso portal desde backoffice | 1 botón en expediente | 15 min |
| Badge Cmd+K | 1 componente small | 10 min |
| Quick links en Dashboard | 4 cards con onClick | 20 min |

### Plan por fases

**Fase 1 (1 sesión):** Visibilizar menús + concepto stock_options + botón portal + quick links = pasa a ~80%
**Fase 2 (2-3 sesiones):** Seed Demo Maestro completo = pasa a ~95%
**Fase 3 (1-2 sesiones):** Flujo reducción jornada + nómina atrasos + validaciones = pasa a ~98%

---

## G. ACCESO BACKOFFICE ↔ PORTAL

### Quick win (implementar ya)
**Botón "Abrir Portal Empleado" en expediente + tabla empleados**
- Abre `/mi-portal` en nueva pestaña
- Solo funciona si el admin tiene un employee vinculado a su auth user
- Pro: 0 riesgo, 5 minutos
- Contra: requiere vinculación admin↔employee

### Solución media
**Preview read-only desde expediente**
- Renderizar `EmployeePortalHome` dentro del expediente con datos del empleado seleccionado
- Usar query directa (no RLS, sino admin query) para cargar datos
- Pro: ve el portal sin cambiar de contexto
- Contra: no es el portal real, es simulación

### Solución premium (futuro)
**Impersonation temporal segura**
- Edge function genera token temporal read-only para employee_id
- Audit log obligatorio
- Expiración 15 min
- Pro: experiencia real completa
- Contra: complejidad, riesgo seguridad

**Recomendación:** Implementar quick win ahora. La solución media si hay tiempo. Premium para futuro.

---

## H. GUIÓN DEMO COMERCIAL

### Versión corta (10-15 min)

| Min | Bloque | Pantalla | Narrativa |
|-----|--------|----------|-----------|
| 0-2 | Apertura | Dashboard ejecutivo | "Visión 360 de toda la plantilla en tiempo real" |
| 2-4 | Empleados | People → Empleados → Expediente | "Expediente digital completo con documentos, contratos, historial" |
| 4-6 | Nómina | Payroll → Motor de Nómina | "Cálculo masivo con 44 conceptos españoles, trazabilidad total" |
| 6-8 | España | Global → 🇪🇸 España | "IRPF, SS, contratos, permisos — todo según normativa española" |
| 8-10 | Portal | Portal del Empleado | "El empleado ve sus nóminas, documentos, vacaciones, fichajes" |
| 10-12 | Reporting | Utilidades → Reporting Engine | "Informes ejecutivos automatizados, board packs, compliance" |
| 12-15 | Cierre | Dashboard + Utilidades | "Suite completa: 74 pantallas, compliance, IA, multi-tenant" |

### Versión media (20-30 min)
Añadir: Alta de empleado (Ana Belén) → Comunicación TGSS (dry-run) → Incidencia IT (Elena) → Liquidación (Roberto) → People Analytics

### Versión premium (45-60 min)
Añadir: Todo el caso demo maestro punto por punto, mostrando cada casuística con su perfil demo correspondiente. Incluir Enterprise (Command Center, Workflows, Auditoría), Talent (Onboarding, Formación), y demostración de sandbox con dry-run TGSS/SEPE.

---

## I. ROADMAP EN 3 HORIZONTES

### Horizonte 1 — Inmediato (1-2 sesiones)

**Objetivo:** Desbloquear visibilidad y accesos
**Entregables:**
1. Visibilizar Utilidades + Talent + Enterprise para admin
2. Concepto stock_options en catálogo
3. Botón Portal en expediente
4. Quick links en Dashboard
5. Badge Cmd+K

**Impacto:** 70% → 80% demo. 42 pantallas desbloqueadas.

### Horizonte 2 — Corto plazo (3-6 sesiones)

**Objetivo:** Seed Demo Maestro + gaps funcionales
**Entregables:**
1. Edge function `erp-hr-seed-demo-master` con 12 perfiles
2. Onboarding/Offboarding visible en Workforce
3. Flujo reducción jornada (tipo solicitud)
4. Run correction demo para atrasos
5. Preview Portal desde expediente

**Impacto:** 80% → 95% demo.

### Horizonte 3 — Premium (5-10 sesiones)

**Objetivo:** Demo espectacular + features premium
**Entregables:**
1. Simulador nómina interactivo
2. Timeline laboral en expediente
3. Dashboard cierre mensual interactivo
4. Wizard alta empleado guiado
5. Impersonation segura para portal

**Impacto:** 95% → 100% demo + valor comercial diferencial.

---

## J. RESULTADO FINAL

### Resumen ejecutivo
El módulo RRHH tiene un **88% de funcionalidad real** pero solo muestra un **40% al usuario admin** por restricciones de `mvpMode`. La acción de mayor impacto/esfuerzo es desbloquear los 3 mega-menús ocultos (1 línea de código = 42 pantallas visibles). El segundo mayor impacto es el Seed Demo Maestro (12 perfiles = demo 95%).

### Top 10 acciones inmediatas
1. Visibilizar Utilidades/Talent/Enterprise para admin
2. Añadir stock_options al payrollConceptCatalog
3. Botón "Portal Empleado" en expediente
4. Quick links en Dashboard ejecutivo
5. Badge Cmd+K visible
6. Onboarding/Offboarding como advanced en Workforce
7. Crear edge function seed-demo-master (diseño)
8. Link "Mi Portal" junto a Dashboard en nav
9. Demo mode banner
10. Validación post-seed en Health Check

### Recomendación final — qué hacer mañana, en orden exacto

**Sesión 1 (ahora mismo):**
1. `HRNavigationMenu.tsx`: modificar filtrado para que admin vea todos los menús
2. `payrollConceptCatalog.ts`: añadir STOCK_OPTIONS
3. `HREmployeeExpedient.tsx`: añadir botón "Abrir Portal"
4. `HRExecutiveDashboard.tsx`: añadir quick links (España, Portal, Utilidades)
5. `HRModule.tsx`: badge Cmd+K en header

**Sesión 2:**
6. Crear edge function `erp-hr-seed-demo-master` con los 12 perfiles
7. Ejecutar seed y validar

**Sesión 3:**
8. Flujo reducción jornada como tipo admin_request
9. Nómina atrasos como run correction en seed
10. Preview Portal desde expediente

**¿Por qué este orden?** Porque las 5 primeras acciones cuestan <30 min y desbloquean el 60% oculto del producto. El seed maestro es el siguiente paso lógico porque convierte las pantallas visibles en pantallas con datos reales. Los ajustes funcionales son el cierre fino.

