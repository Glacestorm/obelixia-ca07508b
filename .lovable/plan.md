

# Auditoría: 15 Prompts del Plan de Gaps RRHH — Estado Actual

## Resumen Ejecutivo

De los 15 prompts del documento, **13 estan implementados** (algunos con diferencias menores respecto a la especificacion exacta) y **2 tienen gaps significativos**.

---

## Estado por Prompt

### FASE 1 — Edge Functions (P01-P04): COMPLETADA

| Prompt | Estado | Evidencia |
|--------|--------|-----------|
| P01 — payroll-it-engine | **Implementado** | `supabase/functions/payroll-it-engine/index.ts` existe |
| P02 — payroll-calculation-engine | **Implementado** | `supabase/functions/payroll-calculation-engine/index.ts` existe |
| P03 — payroll-irpf-engine | **Implementado** | `supabase/functions/payroll-irpf-engine/index.ts` existe |
| P04 — payroll-supervisor + tabla ciclos | **Implementado** | `supabase/functions/payroll-supervisor/index.ts` + tabla `erp_audit_nomina_cycles` creada |

### FASE 2 — Componentes UI + KPIs (P05-P07): COMPLETADA

| Prompt | Estado | Evidencia |
|--------|--------|-----------|
| P05 — HREmployeeConceptsSection + tabla | **Implementado** | `src/components/hr/payroll/HREmployeeConceptsSection.tsx` + hook + tabla `erp_hr_employee_custom_concepts` |
| P06 — PayslipTextManager + tabla | **Implementado** | `src/components/hr/payroll/PayslipTextManager.tsx` + hook + tabla `erp_hr_payslip_texts` |
| P07 — Dashboard 12 KPIs compliance | **Implementado** | `src/components/hr/compliance/HRComplianceKPIsDashboard.tsx` con 12 KPIs y queries reales a Supabase |

### FASE 3 — Logica Legal Profunda (P08-P10): COMPLETADA CON 1 GAP

| Prompt | Estado | Detalle |
|--------|--------|---------|
| P08 — it-engine: formulas LGSS + hitos | **Implementado** | `calculateBaseReguladoraByType`, `calculateMilestones` con 9 hitos detallados, `getProcessAlerts` con alertas 365/545 |
| P09 — garnishmentEngine: pagas extras + pluripercepcion | **GAP PARCIAL** | Pagas extras (hasExtraPay → doble SMI) ya implementado. **FALTA**: campo `otherIncomes` para pluripercepcion (art. 607.3 parrafo 2), campo `embargableAt100` para indemnizaciones embargables sin limite, constantes `SMI_2026_12_PAGAS` |
| P10 — 9 agentes en AI Registry | **Implementado** | Los 9 agentes verificados en BD: PAYROLL-SUP-001, PAY-AGT-001 a 006, AGT-GDPR-001, AGT-AUDIT-001 |

### FASE 4 — Conexion Edge Functions a UI (P11-P13): COMPLETADA

| Prompt | Estado | Evidencia |
|--------|--------|-----------|
| P11 — useITEngineActions | **Implementado** | `src/hooks/hr/useITEngineActions.ts` con 4 mutations |
| P12 — usePayrollSupervisor | **Implementado** | `src/hooks/hr/usePayrollSupervisor.ts` con queries y mutations |
| P13 — usePayrollValidation | **Implementado** | `src/hooks/hr/usePayrollValidation.ts` |

### FASE 5 — Funcionalidades Avanzadas (P14-P15): COMPLETADA CON 1 GAP

| Prompt | Estado | Detalle |
|--------|--------|---------|
| P14 — crossValidationEngine + HRPredictivePage | **Implementado** | `src/lib/hr/crossValidationEngine.ts` con 6 reglas, `useCrossValidation.ts`, `useHRPredictiveAI.ts` |
| P15 — laborDocumentEngine + HRLaborDocumentsPanel | **PARCIAL** | Engine (344 lineas) y panel existen. **FALTA**: Portal auditor externo (boton "Preparar paquete para auditor externo" con Dialog de seleccion periodo + checkboxes + INSERT en `erp_audit_document_exports`) |

---

## Gaps Pendientes de Implementacion

### Gap 1: garnishmentEngine — Pluripercepcion y Embargables al 100% (P09)
- Anadir campo `otherIncomes?: number` al tipo `GarnishmentInput`
- Logica: `const totalIncome = input.netSalary + (input.otherIncomes ?? 0)` y aplicar tramos sobre totalIncome
- Anadir campo `embargableAt100?: number` para indemnizaciones sin limite LEC
- Anadir constantes `SMI_2026_14_PAGAS = 1221` y `SMI_2026_12_PAGAS = 1381.33`
- Verificacion cap absoluto con `otherGarnishmentsThisMonth`

### Gap 2: Portal Auditor Externo (P15 — PASO 4)
- Boton "Preparar paquete para auditor externo" en pagina de auditoria
- Dialog con: selector periodo (desde/hasta), checkboxes (nominas, IT, embargos, contratos, ficheros TGSS, modelos fiscales)
- INSERT en `erp_audit_document_exports` con `status='generating'`, `tipo='external_audit'`
- Lista de paquetes anteriores con estados (generating/ready/delivered)
- Nota legal: LGSS Art. 21 (4 anos) y LGT Art. 66 (4 anos)

---

## Plan de Implementacion

1. **Enriquecer garnishmentEngine.ts** — Anadir los 3 campos faltantes (otherIncomes, embargableAt100, otherGarnishmentsThisMonth) y la logica de pluripercepcion + cap absoluto. Solo aditivo.
2. **Crear Portal Auditor Externo** — Anadir seccion en HRAuditPage con Dialog de exportacion, gestion de paquetes, y trazabilidad.

Ambos cambios son estrictamente aditivos y no modifican ningun componente existente.

