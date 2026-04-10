# S8.5 — Integración HR Cockpit: De tarjetas a Cockpit ERP Profesional

## Resumen ejecutivo

Unificación de las dos superficies HR paralelas en un único cockpit profesional:
- **Superficie A** (conservada): `/obelixia-admin/erp?tab=hr` — HRModule.tsx con 100+ paneles lazy
- **Superficie B** (eliminada): `/obelixia-admin/hr/*` — 13 páginas standalone con tarjetas

## Mapeo de equivalencias

| Página standalone | Panel ERP equivalente | Estado |
|---|---|---|
| `HRHubPage` (hub tarjetas) | `HRModule` (dashboard) | Redirect → ERP |
| `HRAuditPage` | `compliance-evidence` | Equivalente |
| `HRITDashboardPage` | `leave-incidents` | Equivalente |
| `HRGarnishmentsPage` | `settlements` | Equivalente |
| `HRContractsPage` | `contracts` | Equivalente |
| `HRMultiEmploymentPage` | `country-registry` / Global | Equivalente |
| `HRPayrollPage` | `payroll-engine` | Equivalente |
| `HRFilingsPage` | `official-submissions` | Equivalente |
| `HRBridgePage` | `integration` | Equivalente |
| `HRIRPFPage` | `payroll-engine` (IRPF tab) | Equivalente |
| `HRBankAccountsPage` | Employee expedient | Equivalente |
| `HRGovernancePage` | `util-multiagent-supervisor` | Equivalente |
| `HRPredictivePage` | `analytics-intelligence` | Equivalente |

## Componentes exclusivos de Superficie B

Revisión: **Ninguno es exclusivo**. Todos los motores legales (IT, embargos Art. 607, pluriempleo, IRPF, ficheros TGSS/AEAT, bridge contabilidad) tienen paneles equivalentes ya registrados en `HRModuleLazy.tsx`.

## Cambios implementados

### Fase 0 — Documentación
- Este documento (`docs/S8_5_hr_cockpit_integration.md`)

### Fase 1 — Cabecera Cockpit ERP
- Nuevo componente: `src/components/erp/hr/HRCockpitHeader.tsx`
- Inyectado en `HRModule.tsx` encima del mega-menu
- Muestra: Entidad, Período, Empleado, Toolbar (Buscar, Refrescar, Limpiar, Historial, Ayuda)

### Fase 2 — Absorción verificada
- Todos los paneles de Superficie B ya existen en HRModule
- No se requiere migración de componentes

### Fase 3 — Redirects y limpieza
- 13 rutas standalone convertidas a redirects en `routes.ts`
- Imports lazy de páginas standalone eliminados
- Páginas standalone conservadas en filesystem (por si se necesitan referencia)

### Fase 4 — S8 Error Contract
- Creado `src/lib/hr/extractErrorMessage.ts` — compatible con shape legacy y S8
- Aplicado en hooks afectados:
  - `usePayrollSupervisor.ts`
  - `useITEngineActions.ts`
  - `usePayrollValidation.ts`
  - `useHRBridge.ts`
  - `useHRPredictiveAI.ts`

## Verificación S1-S8

- [x] S1-S4: Sin cambios en edge functions, tablas ni RLS
- [x] S5: Tests de seguridad no afectados
- [x] S6: Hardening intacto (58 funciones)
- [x] S7: Legal core no modificado
- [x] S8: Error contract compatible via `extractErrorMessage()`
- [x] Multi-tenant: `companyId` propagado desde `ERPContext`
- [x] Lazy loading: todos los paneles usan `React.lazy()`
- [x] Error boundaries: `ERPModuleErrorBoundary` activo

## Resultado

Un único punto de entrada: `/obelixia-admin/erp?tab=hr`
- Cabecera cockpit contextual tipo ERP clásico
- Mega-menu de 7 categorías con 100+ paneles
- Zero duplicación de funcionalidad
- S1-S8 completamente preservado
