# V2-ES.1 — Nómina España Avanzada

**Base:** MVP v1.0 baseline congelado  
**Objetivo:** Convertir el motor de nómina España en operativo real  
**Principio:** Evolución aditiva — NO romper baseline  

---

## 1. ESTADO ACTUAL (qué ya existe)

### useESPayrollBridge
- ✅ 44 conceptos ES: salario base, 8 complementos, horas extra (3 tipos), bonus, comisiones, dietas, retrib. flexible (4 tipos), IT CC/AT, paga extra, regularización
- ✅ Cálculo completo: devengos → bases SS → cotizaciones trabajador → IRPF → deducciones → costes empresa → informativos
- ✅ Simulador ES (mock laborData)
- ✅ Validación pre-cierre (7 checks)
- ✅ Reporting (TC1, coste empresa, resumen IRPF)
- ✅ Seed de 44 concept_templates a BD

### usePayrollEngine
- ✅ CRUD períodos (8 estados: draft→locked)
- ✅ CRUD records + lines con realtime
- ✅ Pre-close validation genérica
- ✅ Simulaciones (what_if, salary_change, new_hire, promotion)
- ✅ Audit trail

### HRPayrollEngine (UI)
- ✅ 3 tabs MVP: Períodos, Nóminas, Conceptos
- ✅ 2 tabs full: Simulación, Auditoría

### ESPayrollBridge (UI)
- ✅ 4 tabs: Simulador, Conceptos, Pre-cierre, Reporting

### Gaps detectados
- ❌ No hay cálculo masivo (calcular todas las nóminas de un período)
- ❌ No hay conexión incidencias → líneas de nómina automática
- ❌ No hay comparativa entre períodos
- ❌ No hay revisión visual de nómina individual con detalle
- ❌ Pre-cierre pide ID manual (no selector de período)
- ❌ Reporting pide ID manual
- ❌ No hay trazabilidad de cálculo (qué regla generó cada línea)
- ❌ No hay retrib. flexible como plan configurable
- ❌ Simulador no permite simular con datos reales de empleado

---

## 2. MEJORAS CONCRETAS POR COMPONENTE

### 2.1 useESPayrollBridge — Mejoras al hook

| ID | Mejora | Tipo | Complejidad |
|---|---|---|---|
| H1 | `calculateBatch(periodId)` — Calcular nóminas ES para todos los empleados de un período | Nueva función | Alta |
| H2 | `injectIncidentsToPayroll(periodId)` — Leer `hr_leave_incidents` activas del período y generar líneas IT automáticas | Nueva función | Media |
| H3 | `comparePeriods(periodA, periodB)` — Comparar totales entre dos períodos, detectar variaciones >5% | Nueva función | Media |
| H4 | `calculateForEmployee(employeeId, periodId)` — Simular con datos reales de BD (laborData, contrato, beneficios) | Nueva función | Media |
| H5 | Ampliar `ESPayrollInput` con: `plusNocturnidad`, `plusFestivo`, `plusTurnicidad`, `plusPeligrosidad`, `plusTransporte` | Ampliación type | Baja |
| H6 | Añadir `calculationTrace` a cada línea: `{ rule, inputs, formula, timestamp }` | Ampliación type | Media |

### 2.2 usePayrollEngine — Mejoras al hook

| ID | Mejora | Tipo | Complejidad |
|---|---|---|---|
| H7 | `fetchRecordsWithDiff(periodId)` — Retornar records con delta vs período anterior | Nueva función | Media |
| H8 | `bulkUpdateStatus(recordIds, status)` — Aprobar/rechazar en lote | Nueva función | Baja |
| H9 | `getPreCloseReport(periodId)` — Resumen ejecutivo de validación (totales, errores, warnings) | Nueva función | Baja |

### 2.3 HRPayrollEngine (UI) — Mejoras

| ID | Mejora | Tab afectado | Complejidad |
|---|---|---|---|
| U1 | Botón "Calcular período ES" en tab Períodos → llama `calculateBatch` | Períodos | Media |
| U2 | Columna "Δ vs anterior" en lista de nóminas con color (verde/rojo/neutro) | Nóminas | Media |
| U3 | Botón "Inyectar incidencias" en tab Períodos → llama `injectIncidentsToPayroll` | Períodos | Baja |
| U4 | Selector de período real (dropdown) en pre-cierre ES en vez de input de ID | Pre-cierre | Baja |
| U5 | Panel de "Revisión pre-cierre" mejorado con resumen ejecutivo + drill-down | Pre-cierre | Media |
| U6 | Activar tabs Simulación y Auditoría para MVP (`mvpMode` → mostrar 5 tabs) | Engine | Baja |

### 2.4 ESPayrollBridge (UI) — Mejoras

| ID | Mejora | Tab afectado | Complejidad |
|---|---|---|---|
| U7 | Simulador con selector de empleado real → cargar laborData + contrato de BD | Simulador | Media |
| U8 | Nuevo tab "Incidencias" — ver incidencias activas + impacto en nómina calculado | Nuevo sub-tab | Media |
| U9 | Nuevo tab "Diferencias" — comparativa visual entre dos períodos | Nuevo sub-tab | Media |
| U10 | Selector de período real en Reporting (dropdown de períodos existentes) | Reporting | Baja |
| U11 | Añadir inputs de retrib. flexible al simulador (seguro, ticket, guardería) | Simulador | Baja |

### 2.5 Datos requeridos (migraciones)

| ID | Tabla | Cambio | Tipo |
|---|---|---|---|
| D1 | `hr_payroll_record_lines` | ADD COLUMN `calculation_trace jsonb DEFAULT '{}'` | ALTER |
| D2 | `hr_payroll_record_lines` | ADD COLUMN `incident_ref text NULL` | ALTER |
| D3 | `hr_payroll_records` | ADD COLUMN `diff_vs_previous jsonb NULL` | ALTER |
| D4 | `hr_payroll_records` | ADD COLUMN `review_status text DEFAULT 'pending'` | ALTER |
| D5 | `hr_payroll_records` | ADD COLUMN `review_notes text NULL` | ALTER |
| D6 | `hr_payroll_records` | ADD COLUMN `reviewed_by uuid NULL` | ALTER |
| D7 | `hr_payroll_records` | ADD COLUMN `reviewed_at timestamptz NULL` | ALTER |
| D8 | Nueva tabla `hr_es_flexible_remuneration_plans` | Plan retrib. flexible por empleado | CREATE |

### 2.6 Tabla `hr_es_flexible_remuneration_plans`

```sql
CREATE TABLE hr_es_flexible_remuneration_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  plan_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  seguro_medico_mensual numeric(10,2) DEFAULT 0,
  ticket_restaurante_mensual numeric(10,2) DEFAULT 0,
  cheque_guarderia_mensual numeric(10,2) DEFAULT 0,
  formacion_anual numeric(10,2) DEFAULT 0,
  transporte_mensual numeric(10,2) DEFAULT 0,
  total_mensual_exento numeric(10,2) GENERATED ALWAYS AS (
    seguro_medico_mensual + ticket_restaurante_mensual + cheque_guarderia_mensual + transporte_mensual + (formacion_anual / 12)
  ) STORED,
  max_porcentaje_salario numeric(5,2) DEFAULT 30.00,
  status text DEFAULT 'active',
  approved_at timestamptz,
  approved_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 3. PLAN POR PASOS

### Paso 1 — Migraciones (D1-D8)
- ALTER `hr_payroll_record_lines` (D1, D2)
- ALTER `hr_payroll_records` (D3-D7)
- CREATE `hr_es_flexible_remuneration_plans` (D8)
- **No rompe nada** — solo ADD COLUMN con defaults null/empty

### Paso 2 — Hook: cálculo masivo + incidencias (H1, H2, H6)
- `calculateBatch`: iterar empleados del período, fetch laborData + contrato, calcular, insertar records+lines
- `injectIncidentsToPayroll`: leer `hr_leave_incidents` activas, generar líneas IT_CC/IT_AT
- Añadir `calculationTrace` a cada línea generada

### Paso 3 — Hook: comparativa + revisión (H3, H7, H8, H9)
- `comparePeriods`: query dos períodos, calcular deltas por empleado y totales
- `fetchRecordsWithDiff`: JOIN con período anterior
- `bulkUpdateStatus` + `getPreCloseReport`

### Paso 4 — Hook: simulador con datos reales + retrib. flexible (H4, H5)
- `calculateForEmployee`: fetch de BD → llamar `calculateESPayroll` con datos reales
- Ampliar `ESPayrollInput` con plus nocturnidad, festivos, etc.

### Paso 5 — UI: Mejoras al motor de nómina (U1-U6)
- Botón "Calcular período ES" en PeriodManager
- Columna delta en RecordsList
- Botón "Inyectar incidencias"
- Activar tabs Simulación + Auditoría

### Paso 6 — UI: Mejoras al bridge ES (U7-U11)
- Simulador con selector de empleado real
- Tab Incidencias + Tab Diferencias
- Selectores de período reales (dropdown)
- Inputs retrib. flexible en simulador

---

## 4. COMPONENTES AFECTADOS

| Componente | Cambio | Riesgo |
|---|---|---|
| `useESPayrollBridge` | +4 funciones, ampliar types | Bajo — aditivo |
| `usePayrollEngine` | +3 funciones | Bajo — aditivo |
| `HRPayrollEngine` | Activar 2 tabs, botones en Períodos | Bajo — UI |
| `HRPayrollPeriodManager` | +2 botones (calcular, incidencias) | Bajo |
| `HRPayrollRecordsList` | +columna delta, +bulk actions | Medio |
| `ESPayrollBridge` | +2 tabs, mejorar simulador | Medio |
| `ESPayrollSlipDetail` | +sección trazabilidad | Bajo |
| `HRPayrollSimulator` | Selector empleado real | Medio |

**Componentes NO tocados:** HRNavigationMenu, HRModule, HREmployeeExpedient, dashboard

---

## 5. RESUMEN EJECUTIVO

| Dimensión | Valor |
|---|---|
| Features nuevas | 15 (H1-H9 + U1-U6) |
| Migraciones | 8 (7 ALTER + 1 CREATE) |
| Hooks modificados | 2 (useESPayrollBridge + usePayrollEngine) |
| Componentes UI modificados | 6 |
| Componentes UI nuevos | 2 sub-tabs (Incidencias, Diferencias) |
| Items de menú nuevos | 0 |
| Edge functions nuevas | 0 |
| Riesgo sobre baseline | BAJO — todo aditivo |

---

*Documento generado: 2026-03-12*  
*Dependencia: ninguna — se ejecuta sobre MVP baseline*
