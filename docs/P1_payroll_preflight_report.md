# P1.7 — Payroll Cycle Preflight / Cockpit Operativo — Report

## Problema operativo que resuelve

El ERP RRHH tenía tracking cards individuales por dominio (nómina, SS, fiscal, offboarding) pero **no existía una vista transversal** que mostrara de un vistazo:
- En qué paso del ciclo completo está el período
- Qué pasos están completados, pendientes o bloqueados
- Qué plazos legales peligran
- A qué módulo exacto ir para continuar

Los usuarios debían navegar entre 4+ paneles diferentes para reconstruir mentalmente el estado del ciclo.

## Source of truth

El preflight **no duplica lógica de negocio**. Lee estados de:
- `payrollCycleStatusEngine.ts` → fases 1-4 (incidencias → cierre)
- Metadatos de período (`metadata`) → estados SS, fiscal, archivo
- `erp_hr_incidents` → conteo de incidencias pendientes/validadas
- `erp_hr_payroll_runs` → estado del último run
- `erp_hr_employees` → detección de terminaciones activas
- Deadlines regulatorios → calendario legal español

## Pasos del ciclo modelados

### 10 pasos principales
| # | Paso | Módulo destino | Institucional |
|---|------|----------------|---------------|
| 1 | Variables e incidencias | `payroll-engine` | No |
| 2 | Cálculo de nómina | `payroll-engine` | No |
| 3 | Validación previa al cierre | `payroll-engine` | No |
| 4 | Cierre y pago | `payroll-engine` | No |
| 5 | Bases / liquidación SS | `ss` | Sí |
| 6 | Confirmación / RLC / RNT | `ss` | Sí |
| 7 | CRA | `ss` | Sí |
| 8 | IRPF / Modelo 111 | `irpf-motor` | Sí |
| 9 | Modelo 190 / certificados fiscales | `irpf-motor` | Sí |
| 10 | Archivo / evidencias | `compliance-evidence` | No |

### Subtramo de salida (condicional)
| # | Paso | Módulo destino |
|---|------|----------------|
| 11 | Baja | `offboarding` |
| 12 | AFI Baja | `official-submissions` |
| 13 | Finiquito | `settlements` |
| 14 | Certificado empresa | `official-submissions` |

## Lógica de alertas y semáforos

| Semáforo | Criterio |
|----------|----------|
| 🟢 Verde | Paso completado o sin deadline cercano |
| 🟡 Ámbar | Paso en progreso o deadline ≤ 5 días |
| 🔴 Rojo | Paso bloqueado, vencido, o deadline pasado |

**Overall status derivado:**
- `on_track` — sin bloqueos ni alertas
- `at_risk` — algún ámbar activo
- `blocked` — algún paso bloqueado
- `overdue` — deadline vencido

## Enlaces a módulos/paneles

Cada paso incluye un `targetModule` que mapea directamente a `activeModule` en `HRModule.tsx`, permitiendo navegación directa con un click desde el cockpit.

## Estado BEFORE/AFTER

| Métrica | Antes | Después |
|---------|-------|---------|
| Vista transversal del ciclo | ❌ Inexistente | ✅ 10 pasos + subtramo |
| Punto de reanudación visible | ❌ Manual | ✅ "Siguiente acción recomendada" |
| Semáforo legal por paso | ❌ Solo en regulatory calendar | ✅ Integrado en cada paso |
| Navegación directa desde cockpit | ❌ N/A | ✅ Botón "Ir al módulo" por paso |
| Score de completitud | ❌ N/A | ✅ Barra 0-100% |
| Detección de bloqueos | ❌ Dispersa | ✅ "Primer bloqueo" destacado |
| Mini-badge en Period Manager | ❌ N/A | ✅ Link "Ver cockpit completo" |
| Entrada en navegación | ❌ N/A | ✅ "Preflight Nómina" en Payroll |

## Archivos creados/modificados

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| ✅ Crear | `src/engines/erp/hr/payrollPreflightEngine.ts` | Motor puro agregador (250 líneas) |
| ✅ Crear | `src/hooks/erp/hr/usePayrollPreflight.ts` | Hook de datos agregados |
| ✅ Crear | `src/components/erp/hr/payroll-engine/PayrollPreflightCockpit.tsx` | Panel UI del cockpit |
| ✅ Modificar | `src/components/erp/hr/HRModuleLazy.tsx` | +lazy export |
| ✅ Modificar | `src/components/erp/hr/HRModule.tsx` | +import + route `preflight` |
| ✅ Modificar | `src/components/erp/hr/HRNavigationMenu.tsx` | +entrada "Preflight Nómina" |
| ✅ Modificar | `src/components/erp/hr/payroll-engine/HRPayrollPeriodManager.tsx` | +mini-banner preflight |

## Restricciones respetadas

- ✅ NO duplica lógica de negocio — lee engines existentes
- ✅ NO toca RLS
- ✅ NO rehace módulos individuales
- ✅ `isRealSubmissionBlocked === true` — banner visible en cockpit
- ✅ Navegación vía `activeModule` existente
- ✅ Lazy loading vía `HRModuleLazy`

## Residual UX / Deep-Link Gaps

| Gap | Descripción | Severidad |
|-----|-------------|-----------|
| Contexto de período en deep-link | Al navegar desde preflight a `payroll-engine`, no se pasa el `periodId` seleccionado como contexto inicial. El usuario aterriza en la vista general. | Media |
| Artefacto SS específico | Al navegar a `ss`, no se puede preseleccionar FAN vs RLC vs CRA como tab activo. | Baja |
| Deadlines dinámicos | Los deadlines regulatorios son hoy estáticos (cotización TGSS último día, Mod.111 día 20). Idealmente se conectarían con `useRegulatoryCalendar` para festivos. | Media |
| Evidencias en sidebar | El bloque "último acuse / última evidencia" no está conectado a datos reales del ledger. Requiere integración con `hr_official_submissions`. | Baja |
| Offboarding detección fina | La detección de terminaciones activas es por empleados con `status=terminated`, no filtra por período específico. | Baja |

## Recomendación: siguiente paso técnico

1. **P1.7b** — Conectar deep-links con contexto (pasar `periodId` y tab activo al navegar)
2. **P1.7c** — Integrar deadlines dinámicos desde `useRegulatoryCalendar` real
3. **P1.8** — Dashboard ejecutivo mensual que consuma el preflight como fuente de datos
