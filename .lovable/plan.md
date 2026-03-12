

# People Analytics + IA — Bloque Unificado RRHH

## Estado Actual

**Ya existe (fragmentado):**
- `HRDashboardPanel`: dashboard básico con headcount, departamentos, KPIs demo (rotación, absentismo, satisfacción)
- `HRAdvancedAnalyticsPanel`: KPIs predictivos (Time-to-Hire, Cost-per-Hire, Flight Risk, eNPS, Compa-Ratio, 9-Box) — 756 líneas
- `HRAnalyticsIntelligencePanel`: turnover prediction, workforce planning, salary benchmark, talent forecast, skills gap — via edge function `erp-hr-analytics-intelligence`
- `HRAnalyticsBIPremiumPanel`: BI cross-module para módulos premium (P1-P8)
- `HRCopilotTwinPanel`: copiloto IA conversacional + digital twin con simulaciones
- `HRAutonomousCopilotPanel`: copilotos autónomos
- Nav entries dispersas: "Analytics" y "Analytics IA" en Talento, "Analytics BI" en Utilidades, "Copilot-Twin" en Enterprise

**Lo que falta:**
- No hay un **panel unificado** que agregue todas las fuentes de datos en dashboards coherentes
- No hay **dashboard de payroll** dedicado (desviaciones, anomalías, coste laboral por período)
- No hay **dashboard de absentismo** con tendencias, Bradford Factor, patrones
- No hay **copiloto de payroll** específico (explicación de incidencias, anomalías de nómina)
- No hay **alertas predictivas unificadas** cruzando todas las fuentes
- No hay **vistas por rol** (director, HR manager, payroll specialist, compliance officer)
- No hay **sugerencias accionables** vinculadas a tareas del motor WT

---

## Diseño

### 1. No se necesita migración SQL

Toda la data ya existe en tablas: `erp_hr_employees`, `erp_hr_absences`, `erp_hr_payroll_records/lines`, `erp_hr_contracts`, `erp_hr_compensations`, `hr_tasks`, `hr_official_submissions`, `erp_hr_consents`, etc. Solo se necesitan queries de lectura agregadas.

### 2. Hook: `usePeopleAnalytics`

Nuevo hook en `src/hooks/erp/hr/usePeopleAnalytics.ts`:

**Datos agregados (queries directas a Supabase):**
- `fetchHROverview(companyId, filters)` → headcount, altas/bajas, rotación, absentismo, coste laboral
- `fetchPayrollAnalytics(companyId, period?)` → coste total, desviaciones vs período anterior, anomalías (líneas fuera de rango), distribución por concepto
- `fetchAbsenteeismAnalytics(companyId)` → tasa, Bradford Factor, por departamento/tipo, tendencia 12 meses
- `fetchComplianceRisks(companyId)` → documentos expirados, consentimientos pendientes, envíos rechazados, SLA breached en tareas
- `fetchEquityMetrics(companyId)` → brecha salarial por género/departamento, Compa-Ratio distribution
- `fetchWellbeingMetrics(companyId)` → pulse survey scores, burnout risk indicators

**IA (via edge function `erp-hr-people-analytics-ai`):**
- `getAIInsights(companyId, domain)` → insights por dominio (hr, payroll, compliance, wellbeing)
- `explainAnomaly(anomalyData)` → explicación automática de incidencia/anomalía
- `getActionableSuggestions(companyId)` → sugerencias vinculadas a tareas
- `askCopilot(question, context)` → copiloto conversacional HR/Payroll unificado

**Filtros globales:**
- Período, departamento, centro de trabajo, entidad legal, país

### 3. Edge Function: `erp-hr-people-analytics-ai`

Usando Lovable AI (Gemini 3 Flash Preview):
- Action `insights`: recibe métricas agregadas → devuelve insights priorizados con severidad
- Action `explain`: recibe anomalía → devuelve explicación en lenguaje natural + causas probables
- Action `suggest`: recibe contexto → devuelve sugerencias accionables (con `task_category` para auto-crear tareas)
- Action `copilot`: chat conversacional con contexto de métricas HR/Payroll

### 4. Componentes UI

Todos bajo `src/components/erp/hr/people-analytics/`:

**`PeopleAnalyticsModule`** — Panel principal unificado
- Header con filtros globales (período, departamento, entidad legal, país)
- Selector de vista por rol: Director | HR Manager | Payroll | Compliance
- Tabs: Overview | Payroll | Absentismo | Rotación | Equity | Compliance | Copiloto IA

**`PAOverviewDashboard`** — Vista general
- KPI cards: headcount, rotación %, absentismo %, coste laboral, satisfacción
- Gráficos: tendencia headcount 12m, distribución por departamento, altas vs bajas
- Alertas activas (documentos expirados, contratos por vencer, SLA breached)
- AI Insights card (3-5 insights priorizados con acción)

**`PAPayrollDashboard`** — Analytics de nómina
- KPIs: coste bruto total, coste empresa, desviación vs mes anterior, anomalías detectadas
- Gráfico: evolución coste laboral 12 meses
- Tabla: anomalías de nómina (líneas fuera de rango, desviaciones >10%)
- AI: explicación automática de cada anomalía + sugerencia

**`PAAbsenteeismDashboard`** — Absentismo
- KPIs: tasa absentismo, Bradford Factor medio, días perdidos
- Gráfico: tendencia mensual, por departamento, por tipo (IT, enfermedad, accidente)
- Heatmap: absentismo por día de la semana
- Alertas: empleados con Bradford Factor alto

**`PAEquityDashboard`** — Equidad salarial
- Brecha salarial por género (global + por departamento)
- Compa-Ratio distribution chart
- Tabla de outliers (empleados por debajo/encima de banda)

**`PAComplianceDashboard`** — Riesgos de cumplimiento
- Scorecards: documentos expirados, consentimientos pendientes, envíos rechazados
- Timeline: próximos vencimientos
- Alertas de compliance con severidad

**`PACopilotChat`** — Copiloto IA unificado HR/Payroll
- Chat conversacional con contexto de métricas
- Streaming response (SSE via edge function)
- Sugerencias rápidas: "¿Por qué subió el absentismo?", "Explica la desviación de nómina", "¿Qué empleados tienen riesgo de fuga?"
- Cada respuesta puede incluir acción sugerida → botón para crear tarea en WT

**`PAAlertsFeed`** — Feed de alertas predictivas
- Alertas cruzadas de todas las fuentes ordenadas por severidad
- Filtrable por dominio (HR, payroll, compliance, mobility)
- Acción directa: crear tarea, ver expediente, ir a envío

### 5. Integración

| Punto | Cambio |
|---|---|
| `HRModule.tsx` | `people-analytics` → `PeopleAnalyticsModule` |
| `HRNavigationMenu` | Nuevo mega-menu "Analytics & IA" con items: Overview, Payroll, Absentismo, Equidad, Compliance, Copiloto |
| Existing panels | Mantener `HRAnalyticsIntelligencePanel`, `HRAdvancedAnalyticsPanel`, etc. como están — el nuevo módulo agrega, no reemplaza |
| `useHRTasksEngine` | Desde sugerencias IA → auto-crear tareas con `source_type: 'system'` |

### 6. Implementation Order

| Phase | Content |
|---|---|
| **PA1** | `usePeopleAnalytics` hook (queries agregadas sobre tablas existentes) |
| **PA2** | Edge function `erp-hr-people-analytics-ai` (insights, explain, suggest, copilot) |
| **PA3** | `PeopleAnalyticsModule` + `PAOverviewDashboard` + `PAPayrollDashboard` |
| **PA4** | `PAAbsenteeismDashboard` + `PAEquityDashboard` + `PAComplianceDashboard` |
| **PA5** | `PACopilotChat` + `PAAlertsFeed` + integration (HRModule, nav, task creation) |

