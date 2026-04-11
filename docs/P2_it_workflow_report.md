# P2.2 — IT Workflow Report

## Estado: BUILD COMPLETADO

## Resumen ejecutivo

P2.2 completa el workflow de Incapacidad Temporal (IT) transformándolo de un sistema parcial de registro de procesos y partes a un pipeline unificado, trazable e integrado con payroll, FDI, reporting y preflight.

---

## BEFORE (pre-P2.2)

| Componente | Estado | Cobertura |
|---|---|---|
| Registro de procesos IT | ✅ Funcional | `erp_hr_it_processes` con CRUD básico |
| Partes médicos | ✅ Funcional | `erp_hr_it_parts` con registro |
| Base reguladora | ✅ Funcional | `erp_hr_it_bases` con cálculo por contingencia |
| Motor de subsidios | ✅ Funcional | `it-engine.ts` con reglas LGSS completas |
| Hitos 365/545 | ✅ Funcional | Alertas automáticas |
| FDI artifacts | ✅ Parcial | Builder de artefactos sin ciclo de vida |
| Edge function | ✅ Parcial | 4 acciones (create, add_part, calculate_base, check_milestones) |
| Pipeline unificado | ❌ No existía | Sin estados normalizados ni transiciones |
| Checklist operativo | ❌ No existía | Sin checklist por caso |
| Timeline del expediente | ❌ No existía | Sin timeline |
| Integración payroll real | ❌ Parcial | Sin cálculo de impacto en nómina |
| FDI workflow | ❌ Parcial | Sin ciclo completo baja→confirmación→alta |
| Reporting IT | ❌ No existía | Sin KPIs agregados |
| Preflight IT | ❌ No existía | Sin substep en preflight |
| Workspace unificado | ❌ No existía | Panel existente sin visión integrada |

## AFTER (post-P2.2)

| Componente | Estado | Archivo |
|---|---|---|
| Pipeline engine | ✅ | `itWorkflowPipelineEngine.ts` (380+ líneas) |
| 7 estados normalizados | ✅ | communicated → active → review_pending → medical_discharge → closed + relapsed + cancelled |
| Transition guards | ✅ | Validaciones por estado con blockers y warnings |
| Checklist operativo | ✅ | 8 items por caso (medical, administrative, payroll, fdi, documentary) |
| Timeline del expediente | ✅ | Eventos cronológicos: partes, bases, hitos, alertas |
| Cross-module signals | ✅ | HR, Payroll, Fiscal, Compliance, Reporting |
| Payroll impact calculator | ✅ | Días IT, subsidio, complemento empresa, reducción bruto |
| FDI checklist | ✅ | Baja, confirmación, alta, recaída con estado por artefacto |
| Reporting KPIs | ✅ | activos, cerrados, recaídas, duración media, coste empresa |
| Hook unificado | ✅ | `useITWorkflowPipeline.ts` |
| Workspace UI | ✅ | `ITWorkflowWorkspace.tsx` con 5 tabs |
| Edge function extendida | ✅ | +3 acciones: resolve_process, generate_fdi, reporting_kpis |
| Preflight IT substep | ✅ | Señal automática en preflight con alertas |

---

## Arquitectura técnica

### Pipeline States

```
communicated → active → review_pending → medical_discharge → closed
                  ↕                           ↕
               relapsed                   relapsed
                  
Cualquier estado → cancelled
cancelled → communicated (reapertura)
```

### Transition Guards

| Transición | Requisitos |
|---|---|
| → active | Parte de baja registrado |
| → medical_discharge | Parte de alta registrado |
| → closed | Base calculada + fecha fin + parte alta + (FDI baja recomendado) |
| → relapsed | Vinculación a proceso original (warning) |

### Cross-Module Signals

```typescript
ITCrossModuleSignals {
  hr:         { employee_on_leave, leave_type, expected_return }
  payroll:    { days_affected, subsidy_percentage, subsidy_payer, employer_complement, base_reguladora, split_month, gross_impact_estimated }
  fiscal:     { ss_deduction_adjustment, irpf_recalculation }
  compliance: { fdi_pending, milestone_alerts, documentation_gaps, overdue_confirmations }
  reporting:  { process_count_active, average_duration_days, employer_cost_monthly }
}
```

### Edge Function Actions (7 total)

| Acción | Método | Descripción |
|---|---|---|
| `create_process` | POST | Crear proceso IT con clasificación automática |
| `add_part` | POST | Registrar parte médico con confirmación calculada |
| `calculate_base` | POST | Calcular base reguladora por contingencia |
| `check_milestones` | POST | Verificar hitos 365/545 |
| `resolve_process` | POST | **P2.2** — Cerrar proceso con alta y auditoría |
| `generate_fdi` | POST | **P2.2** — Generar artefacto FDI en artifacts table |
| `reporting_kpis` | POST | **P2.2** — KPIs agregados por empresa |

---

## Archivos creados

| Archivo | Líneas | Propósito |
|---|---|---|
| `src/engines/erp/hr/itWorkflowPipelineEngine.ts` | ~380 | Engine puro: estados, transiciones, checklist, timeline, signals, payroll impact, FDI checklist, KPIs |
| `src/hooks/erp/hr/useITWorkflowPipeline.ts` | ~130 | Hook reactivo con Supabase |
| `src/components/erp/hr/it/ITWorkflowWorkspace.tsx` | ~280 | Workspace UI con 5 tabs |
| `src/components/erp/hr/it/index.ts` | 1 | Barrel export |
| `docs/P2_it_workflow_report.md` | Este archivo | |

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `src/engines/erp/hr/payrollPreflightEngine.ts` | +`ITPreflightData` interface, +IT substep injection |
| `supabase/functions/payroll-it-engine/index.ts` | +3 acciones: resolve_process, generate_fdi, reporting_kpis |

---

## Reutilización

| Asset existente | Uso en P2.2 |
|---|---|
| `it-engine.ts` (504 líneas) | Subsidy rules, milestones, base reguladora, alerts — consumido sin modificar |
| `fdiArtifactEngine.ts` (131 líneas) | Tipos FDI — referenciado por itWorkflowPipelineEngine |
| `afiInactivityEngine.ts` | AFI Inactividad — compatible sin cambios |
| `useHRITProcesses.ts` (147 líneas) | Queries/mutations — consumido por useITWorkflowPipeline |
| `HRITProcessPanel.tsx` (1190 líneas) | Panel existente — NO modificado, coexiste |
| `erp_hr_it_processes` | Tabla existente — NO modificada |
| `erp_hr_it_parts` | Tabla existente — NO modificada |
| `erp_hr_it_bases` | Tabla existente — NO modificada |
| `erp_hr_official_artifacts` | Tabla existente — usada para almacenar FDI generados |

## Tablas nuevas: NINGUNA

---

## Restricciones respetadas

- ✅ NO RLS changes
- ✅ NO new tables
- ✅ NO module rewrites (HRITProcessPanel.tsx intacto)
- ✅ Compatible con P1.x, H1.x, H2.x, G1.x, G2.x, LM1-LM4
- ✅ Reutilización de engines/hooks/tablas existentes
- ✅ Edge function extendida, no reescrita

## Siguiente paso recomendado

**P2.3 — SEPA CT Generator** para cerrar el gap de pago con generación ISO 20022.
