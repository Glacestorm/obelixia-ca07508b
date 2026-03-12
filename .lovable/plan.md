

# MVP UI Polish — Concrete Changes

## Analysis

All 8 areas already have functional, database-connected components. The work is about **consistency and MVP scoping** — hiding post-MVP tabs, ensuring the right routes are accessible, and adding `mvpMode` where missing.

### What already works (no changes needed):
- **Dashboard**: `HRExecutiveDashboard` — 817 lines, charts, KPIs, alerts, real data
- **Employees list**: `HREmployeesPanel` — 516 lines, filters (country, status, legal entity), table/grid views, CRUD
- **Contracts**: `HRContractsPanel` — 488 lines, CRUD, settlement dialog
- **Admin Portal**: `HRAdminPortal` — dashboard, list, detail, form, comments, activity timeline
- **Payroll**: `HRPayrollPanel` — 387 lines, table, status badges, dialog
- **Documents**: `DocumentExpedientModule` — already has `mvpMode` (Empleado + Nómina tabs only)
- **Tasks**: `HRTasksModule` — already has `mvpMode` (Dashboard + Mi Bandeja + Todas)
- **Navigation**: `HRNavigationMenu` — already has `mvpMode` filtering

### What needs polish (4 changes):

#### 1. Employee Expedient — Add `mvpMode` tab filtering
`HREmployeeExpedient` shows 10 tabs + country tab. MVP should show only: **Ficha, Contratos, Compensación, Tiempo, Documentos, Localización**. Hide: Trayectoria, Formación, Desempeño, Movilidad, Auditoría.

- Add `mvpMode?: boolean` prop (default `true`)
- Filter `CORE_TABS` based on mvpMode
- Pass `mvpMode` from `HRModule.tsx`

#### 2. Navigation — Add missing MVP routes
The `mvpItems` set is missing `payroll-engine` and `approval-inbox` which are needed for MVP payroll motor and basic approvals. Also `dashboard` should work (it does via the standalone button, but the `payroll-engine` route needs to be in the nav).

- Add `payroll-engine` to mvpItems and to the Payroll mega-menu
- Add `approval-inbox` to mvpItems and to the Laboral mega-menu under Gestión Operativa

#### 3. HRModule — Pass mvpMode to HREmployeeExpedient
Currently `HREmployeeExpedient` is rendered without `mvpMode`. Add it.

#### 4. Stats header — MVP simplification  
The 6-card stats header shows "Vencimientos" and "Seguridad" which are always 0. In MVP mode, reduce to 4 meaningful cards: Empleados, Contratos, Vacaciones, Nóminas.

### Files to edit:
1. `src/components/erp/hr/employee-expedient/HREmployeeExpedient.tsx` — add mvpMode prop, filter tabs
2. `src/components/erp/hr/HRNavigationMenu.tsx` — add `payroll-engine`, `approval-inbox` to mvpItems and menu items
3. `src/components/erp/hr/HRModule.tsx` — pass mvpMode to expedient, simplify stats header in MVP

