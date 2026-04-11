# H1.3 — Executive Dashboard & Portal Hardening Report

## Fecha: 2026-04-11

## Resumen

4 archivos modificados para conectar el dashboard ejecutivo RRHH a datos reales del hook `useHRExecutiveData`, eliminar valores hardcoded y corregir botones Quick Access no funcionales.

## Cambios Realizados

| Archivo | Cambio |
|---------|--------|
| `HRModule.tsx` | Pasar `onNavigate={setActiveModule}` al dashboard |
| `HRExecutiveDashboard.tsx` | Reemplazar 6 bloques hardcoded por datos reales del hook |
| `HRExecutiveDashboard.tsx` | Corregir Quick Access buttons (España, Reporting, Utilidades) |
| `HRExecutiveDashboard.tsx` | Portal Empleado apunta a ruta existente `/mi-portal` |

## BEFORE / AFTER

| Métrica | Antes | Después |
|---------|-------|---------|
| Botones Quick Access funcionales | 0/4 | 4/4 |
| Portal Empleado accesible | Ruta existía pero botón no conectaba | Funcional |
| KPIs con datos reales | 3/6 | 6/6 (2 etiquetados como est.) |
| Quick Stats hardcoded (Altas/Bajas/Vacaciones/Antigüedad) | 4 valores fijos | 4 valores desde `workforceStats` |
| laborCostBreakdown | Array con €124,500 fijos | Derivado de `laborCosts` del hook |
| criticalAlerts | 4 alertas estáticas hardcoded | Alertas reales desde BD |
| monthlyEvolution | 6 meses hardcoded | Derivado del estado actual (etiquetado estimado) |
| departmentDistribution | 6 departamentos fijos | Desde `departments` del hook (real) |
| Cost summary cards (€186.5K, €3,968, €2.24M) | Hardcoded | Desde `laborCosts` del hook |
| Benchmark sector | Valores fijos | Valores reales + benchmark referencia (etiquetado) |

## RRHH Dashboard Residual Demo / Derived / Real Data Map

### Dato Real Operativo
- **Plantilla Total**: query real a `erp_hr_employees` ✅
- **Altas/Bajas mes**: calculado desde `hire_date`/`termination_date` ✅
- **De vacaciones**: query real a `erp_hr_leave_requests` ✅
- **Antigüedad media**: calculado desde `hire_date` ✅
- **Alertas**: queries reales a contratos, incidentes, documentos ✅
- **Departamentos**: query real a `erp_hr_departments` + count ✅

### Dato Derivado (etiquetado)
- **Coste Laboral Mensual**: SUM `base_salary` × ratios españoles (SS 30%, complementos 5%, etc.) — etiquetado "Derivado de contratos activos"
- **Coste/empleado**: totalMonthly / activeEmployees
- **Proyección anual**: totalMonthly × 14 pagas — etiquetado "(×14 pagas)"
- **laborCostBreakdown**: desglose con ratios constantes
- **Rotación anual**: `(bajas_mes × 12 / total)` — aproximación

### Dato Estimado (etiquetado con badge)
- **Evolución Mensual**: serie retropolada desde valores actuales — badge "Estimado"
- **Cumplimiento PRL**: fallback 94% si no hay dato — label "(est.)"
- **Formación h/emp**: fallback 24h si no hay dato — label "(est.)"
- **Benchmark sector**: valores de referencia fijos (12%, 4%, €4,200, 30h) — badge "Referencia estimada"

### Demo Residual
- Ninguno. Todos los bloques usan datos reales, derivados o estimados claramente etiquetados.

## Restricciones Mantenidas

- `isRealSubmissionBlocked === true` ✅
- No se tocó RLS ✅
- No se crearon tablas nuevas ✅
- No se rehizo ningún módulo completo ✅
- Compatible con P1.x, LM1/LM2/LM3 y preflight ✅
- Ruta `/mi-portal` ya existía en routes.ts ✅
