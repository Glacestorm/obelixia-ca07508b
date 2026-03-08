

## Plan: Integrar Utilidades RRHH dentro del módulo HRModule

### Problema actual

Las ~18 utilidades HR-specific (Dashboard Premium, Orquestación, Analytics BI, Reporting Engine, Regulatory Reporting, Board Packs, API/Webhooks, Integraciones Enterprise, Compliance Automation, etc.) viven en una pestaña "Utilidades" a nivel del **ERP general** (`ERPModularDashboard.tsx`, líneas 656-726). No son accesibles desde dentro del módulo RRHH (`HRModule.tsx`), lo cual es inconsistente: un usuario dentro de RRHH tiene que salir al nivel ERP para acceder a herramientas que son exclusivamente de RRHH.

### Propuesta por fases

---

**Fase 1 — Mover la navegación y el rendering al HRModule**

- Añadir una nueva categoría en `HRNavigationMenu.tsx` (mega-menu) llamada **"Utilidades"** o **"Premium & Operaciones"** que contenga los 3 grupos ya definidos en `HRUtilitiesNavigation`: Centro de Mando, Inteligencia & Análisis, Administración.
- Registrar todas las `UtilitySection` como módulos válidos dentro de `HRModule.tsx` (añadir los renderizados condicionales que hoy están en `ERPModularDashboard`).
- Mover los imports de los componentes de utilidad (HRPremiumExecutiveDashboard, HROrchestrationPanel, HRAnalyticsBIPremiumPanel, HRReportingEnginePanel, ComplianceReportingPanel, HRBoardPackPanel, PremiumAPIWebhooksPanel, EnterpriseIntegrationsPanel, etc.) desde `ERPModularDashboard.tsx` a `HRModule.tsx`.
- Mantener `HRUtilitiesNavigation` como componente reutilizable para la vista de grid cuando el usuario entra en la categoría "Utilidades" desde el mega-menu.

**Resultado:** Todas las utilidades HR son accesibles directamente dentro del módulo RRHH.

---

**Fase 2 — Limpiar ERPModularDashboard**

- Eliminar la pestaña `utilities` del `TabsList` y su `TabsContent` completo en `ERPModularDashboard.tsx`.
- Eliminar los imports de componentes HR premium/utility que ya no se usan a nivel ERP.
- Eliminar el state `utilitySection` y el componente `PremiumReseedPanel` si solo se usa ahí (o moverlo también al HRModule).
- Reducir el acoplamiento: `ERPModularDashboard` deja de conocer los internos de RRHH.

**Resultado:** ERPModularDashboard queda más limpio, sin lógica HR-specific.

---

**Fase 3 — Filtrar utilidades no-HR (si aplica)**

- Revisar si alguna de las 18 utilidades es realmente cross-módulo (ej: "IA Híbrida" / `AIUnifiedDashboard`, "Auditorías" / `UnifiedAuditGenerator`). Estas podrían quedarse a nivel ERP o duplicar acceso.
- Las que son puramente HR (Reporting Engine, Regulatory Reporting, Board Packs, API/Webhooks, Enterprise Integrations, Compliance Automation, Analytics BI, Orchestration, Alerts, Feed, Health Check, Export, Seed, Settings, Help) se integran exclusivamente en HRModule.
- Las cross-módulo (IA Híbrida, Auditoría unificada) se mantienen accesibles desde ambos niveles o solo desde ERP.

**Resultado:** Separación limpia entre utilidades HR-only y utilidades ERP-wide.

---

**Fase 4 — Ajuste de UX y breadcrumbs**

- Adaptar `HRUtilitiesNavigation` para que funcione correctamente dentro del contexto de `HRModule` (breadcrumbs coherentes, botón "volver" apunte a la categoría correcta dentro del mega-menu HR).
- Verificar que la navegación del mega-menu refleje el estado activo cuando se está en una utilidad.
- Test manual de flujos de navegación dentro del módulo.

**Resultado:** Experiencia de usuario coherente sin saltos de contexto.

---

### Resumen de cambios por archivo

| Archivo | Acción |
|---|---|
| `HRNavigationMenu.tsx` | Añadir categoría "Utilidades" con los 3 sub-grupos |
| `HRModule.tsx` | Añadir ~18 renderizados condicionales + imports |
| `ERPModularDashboard.tsx` | Eliminar tab "utilities", imports, state `utilitySection`, `PremiumReseedPanel` |
| `HRUtilitiesNavigation.tsx` | Ajustar breadcrumbs para contexto intra-módulo |

### Riesgos

- Componentes cross-módulo (IA Híbrida, Auditoría) necesitan decisión explícita sobre dónde viven.
- `HRModule.tsx` ya tiene ~70 módulos renderizados; añadir 18 más lo hace más grande pero sigue el patrón existente.

