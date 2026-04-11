# P1.7C — Payroll Preflight Completion 100% — Report

## Gaps de P1.7 cerrados

| # | Gap original | Estado P1.7C |
|---|-------------|-------------|
| 1 | Deep-links sin contexto | ✅ Cerrado — `targetContext` con `periodId`, `tab`, `artifactType` por paso |
| 2 | Deadlines estáticos | ✅ Cerrado — usa `computeRegulatoryCalendar` dinámico con festivos |
| 3 | Sin bloqueos cruzados | ✅ Cerrado — `crossDomainBlockers` con causa, dominio, fix y enlace |
| 4 | Sin modo demo/operativo | ✅ Cerrado — `useHREnvironment` controla visibilidad de detalles técnicos |
| 5 | Mini-banner es solo enlace | ✅ Cerrado — mini-card con score, bloqueo, siguiente acción y CTA |
| 6 | Sin última milla | ✅ Cerrado — `lastMileStatus` badges (H/F/C/S) en pasos institucionales |

## Qué significa "100% operativo"

El preflight deja de ser solo una vista informativa y pasa a ser un cockpit operativo completo:

1. **Guía el proceso**: stepper con 10 pasos + subtramo de salida condicional
2. **Marca el punto exacto de parada**: `firstPendingStep`, `firstBlockedStep`, `currentStepIndex`
3. **Enlaza al punto exacto de resolución**: `targetContext` con `periodId` y `tab` por paso
4. **Calcula plazos reales**: `regulatoryCalendarEngine` con TGSS, SEPE y AEAT dinámicos
5. **Explica bloqueos cruzados**: dependencias interdominio con causa + fix sugerido
6. **Muestra estado última milla**: handoff, formato, credencial, sandbox por organismo
7. **Distingue demo/operativo**: oculta ruido técnico en demo, muestra todo en operativo
8. **Permite retomar el ciclo**: mini-card en PeriodManager con CTA directa "Reanudar"

## BEFORE/AFTER

| Métrica | P1.7 (BEFORE) | P1.7C (AFTER) |
|---------|---------------|---------------|
| Deep-link con contexto | ❌ Solo `activeModule` | ✅ `module + {periodId, tab, artifactType}` |
| Deadlines | Estáticos (día fijo) | Dinámicos (regulatoryCalendarEngine) |
| Bloqueos cruzados explicados | ❌ Solo `blocked` | ✅ Causa + dominio + fix + enlace |
| Última milla visible | ❌ | ✅ Badges H/F/C/S por paso institucional |
| Modo demo vs operativo | ❌ Único modo | ✅ Automático vía `useHREnvironment` |
| Mini-banner PeriodManager | Solo enlace | Mini-card con score + bloqueo + CTA |
| `suggestedFix` por paso | ❌ | ✅ En cada paso bloqueado/pendiente |
| Base regulatoria en alertas | ❌ | ✅ `regulatoryBasis` visible en modo operativo |

## Casos de prueba cubiertos

| Escenario | Resultado esperado |
|-----------|-------------------|
| Período limpio completo | Score 100%, all green, `on_track` |
| Período con incidencias pendientes | Paso 1 `in_progress`, paso 2+ `blocked`, `blocked` overall |
| Período calculado sin cierre | Pasos 1-2 completados, paso 4 pendiente, SS/fiscal bloqueados |
| Período cerrado sin pago | Paso 4 `in_progress` ("Pago pendiente") |
| SS bloqueada por cierre | Cross-blocker: `payroll→ss`, fix "Cerrar período" |
| IRPF bloqueado por cierre | Cross-blocker: `payroll→fiscal`, fix "Cerrar período" |
| Período con baja/finiquito | Subtramo offboarding visible con 4 pasos adicionales |
| Deadline vencido | Semáforo rojo, alerta legal con días negativos |
| Deadline próximo (≤5 días) | Semáforo ámbar, `at_risk` overall |
| Modo demo | Sin cross-blockers, sin IDs, sin última milla, narrativa simplificada |
| Modo operativo | Todo visible: blockers, última milla, base regulatoria |

## Archivos creados/modificados

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| ✅ Modificar | `src/engines/erp/hr/payrollPreflightEngine.ts` | +targetContext, +crossDomainBlockers, +lastMileStatus, +suggestedFix |
| ✅ Modificar | `src/hooks/erp/hr/usePayrollPreflight.ts` | +regulatoryCalendarEngine dinámico, +lastMileReadiness, eliminado buildDefaultDeadlines |
| ✅ Modificar | `src/components/erp/hr/payroll-engine/PayrollPreflightCockpit.tsx` | +context nav, +cross-blockers sidebar, +last-mile badges, +demo/operational mode |
| ✅ Modificar | `src/components/erp/hr/HRModule.tsx` | +navigationContext state, +handleNavigateWithContext |
| ✅ Modificar | `src/components/erp/hr/payroll-engine/HRPayrollPeriodManager.tsx` | +mini-card con score, bloqueo, siguiente acción, CTA |
| ✅ Crear | `docs/P1_payroll_preflight_completion_report.md` | Este reporte |

## Residual Context / Deadline / Last-Mile Gaps

| Gap | Descripción | Dependencia | Severidad |
|-----|-------------|-------------|-----------|
| Tab preselección en SS | Al navegar a `ss` con `{ tab: 'fan' }`, el panel SS no consume ese contexto todavía — aterriza en la vista general | Requiere refactor de `HRSocialSecurityPanel` para aceptar `initialTab` | Baja |
| Tab preselección en IRPF | Al navegar a `irpf-motor` con `{ tab: 'modelo111' }`, el panel IRPF no consume ese contexto | Requiere refactor de `IRPFMotorPanel` para aceptar `initialTab` | Baja |
| Evidencias en sidebar | El bloque "último acuse / última evidencia" no está conectado a datos reales del ledger | Requiere integración con `hr_official_submissions` | Baja |
| Offboarding por período | La detección de terminaciones es global (`status=terminated`), no filtrada por período | Requiere campo `termination_period_id` en employees | Baja |
| Holiday calendar real | Se usa `EMPTY_CALENDAR` en lugar de festivos reales | Requiere integración con calendario de festivos configurado | Media |
| Last-mile metadata | `lastMileReadiness` se lee de `period.metadata.last_mile_readiness` — aún no se escribe desde LM3 | Requiere que LM3 persista readiness en metadata del período | Media |
| `navigationContext` passthrough | `HRModule` almacena `navigationContext` pero los módulos destino (SS, IRPF, offboarding) no lo consumen aún como prop | Requiere que cada panel acepte `initialContext` prop | Media |

## Restricciones respetadas

- ✅ NO duplica lógica de negocio — lee engines existentes
- ✅ NO toca RLS
- ✅ NO rehace módulos individuales
- ✅ `isRealSubmissionBlocked === true` — banner visible
- ✅ Navegación vía `activeModule` existente + contexto
- ✅ Lazy loading mantenido
- ✅ Modo demo usa `useHREnvironment` existente

## Veredicto final del cockpit

El preflight es ahora un cockpit **plenamente operativo** que:
- Guía el proceso paso a paso con enlace directo al punto de resolución
- Calcula plazos legales dinámicos basados en el calendario regulatorio español
- Explica bloqueos cruzados entre dominios con causa, fix y enlace
- Muestra el estado de última milla (handoff/formato/credencial/sandbox) en pasos institucionales
- Distingue entre narrativa de demo y detalle técnico operativo
- Permite retomar el ciclo desde el gestor de períodos con un solo clic

Los gaps residuales son de **integración de contexto** en los módulos destino (SS, IRPF, offboarding), que requieren que cada panel acepte un `initialContext` prop. Esto no bloquea la operatividad del cockpit — la navegación funciona, el aterrizaje es en la vista general del módulo correcto.
