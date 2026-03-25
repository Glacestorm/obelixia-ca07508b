

# Plan: Consolidación del AI Command Center — Módulo Unificado de IA

## Problema Actual

Existen **dos sistemas paralelos** para gestionar agentes de IA, con funcionalidades duplicadas:

| Funcionalidad | AIAgentsPage (`/admin/ai-agents`) | IA Center (ERP ai-center) |
|---|---|---|
| Centro de Control / Dashboard | AdvancedAgentsDashboard (1339 líneas) | LiveOperationsHub |
| Agentes por módulo ERP | ERPModuleAgentsPanel (784 líneas) | AgentCatalogPanel |
| Agentes Autónomos | AutonomousAgentsPanel (308 líneas) | — |
| Copiloto Predictivo | PredictiveCopilotPanel (259 líneas) | — |
| Interfaz de Voz | VoiceInterfacePanel (248 líneas) | — |
| Agentes Específicos (Sales, CS...) | SpecificAgentsPanel (509 líneas) | — |
| Observabilidad / Métricas | ERPRealTimeMetrics | ObservabilityPanel |
| Ranking / Leaderboard | ERPAgentLeaderboard | — |
| Workflows | ERPAgentWorkflows | OrchestrationPanel |
| Decisiones autónomas | ERPAutonomousDecisionHistory | ApprovalQueue |
| Costes / Economía IA | — | AICostEconomicsPanel |
| Gobernanza (GDPR/EU AI Act) | — | AIGovernancePanel |
| Alertas | — | AIAlertsPanel |
| Chat / Conversaciones | ERPAgentConversationHistory | — |

**Conclusión**: Hay solapamiento en ~5 áreas y ~6 funcionalidades únicas en cada lado. La fusión es necesaria.

---

## Plan por Fases

### Fase 1 — Reestructuración de Tabs del IA Center (pestañas unificadas)

**Objetivo**: Ampliar las 7 pestañas actuales del `AICommandCenterModule.tsx` para absorber las 6 categorías de `AIAgentsPage`.

**Nueva estructura de tabs**:

```text
┌─────────────────────────────────────────────────────────────┐
│  Live Hub │ Catálogo │ Autónomos │ Copilot │ Voz │          │
│  Observabilidad │ Ranking │ Economía │ Gobernanza │         │
│  Orquestación │ Decisiones │ Chat │ Alertas                 │
└─────────────────────────────────────────────────────────────┘
```

**Cambios**:
- Añadir tabs: `Autónomos`, `Copilot`, `Voz`, `Ranking`, `Decisiones`, `Chat`
- Reubicar `AutonomousAgentsPanel`, `PredictiveCopilotPanel`, `VoiceInterfacePanel` como contenido de sus nuevas pestañas
- Integrar `ERPAgentLeaderboard`, `ERPAutonomousDecisionHistory`, `ERPAgentConversationHistory` como pestañas adicionales

**Archivos a editar**: `AICommandCenterModule.tsx`

---

### Fase 2 — Fusión del Catálogo de Agentes (eliminar duplicidad)

**Objetivo**: Unificar `ERPModuleAgentsPanel` + `SpecificAgentsPanel` + `AgentCatalogPanel` en un único catálogo enriquecido.

**Cambios**:
- Ampliar `AgentCatalogPanel` para incluir las vistas por dominio (Supervisor → Dominios → Módulos) de `ERPModuleAgentsPanel`
- Incorporar los agentes específicos (Sales, CS, Finance, Operations) de `SpecificAgentsPanel` como filtro por dominio
- Mantener la vista dual Grid/List existente y añadir la vista jerárquica

**Archivos a editar**: `AgentCatalogPanel.tsx`

---

### Fase 3 — Fusión de Observabilidad y Métricas

**Objetivo**: Enriquecer `ObservabilityPanel` con las métricas real-time de `ERPRealTimeMetrics`.

**Cambios**:
- Integrar gráficos de latencia, throughput y distribución de tareas de `ERPRealTimeMetrics` dentro de `ObservabilityPanel`
- Añadir sub-tabs internas: "KPIs", "Latencia", "Escalaciones", "Timeline"
- Eliminar la duplicidad de cálculos de métricas

**Archivos a editar**: `ObservabilityPanel.tsx`

---

### Fase 4 — Fusión de Orquestación y Workflows

**Objetivo**: Combinar `OrchestrationPanel` + `ERPAgentWorkflows` en una vista unificada.

**Cambios**:
- Integrar las cadenas de workflows de `ERPAgentWorkflows` en la pestaña de Orquestación existente
- Mantener el Simulation Sandbox del IA Center
- Añadir la visualización de pipelines activos de workflows

**Archivos a editar**: `OrchestrationPanel.tsx`

---

### Fase 5 — Integración del AdvancedAgentsDashboard en LiveOperationsHub

**Objetivo**: Absorber las capacidades del `AdvancedAgentsDashboard` (1339 líneas — tendencias 2025-2027, MCP, Agent Memory) en el Live Hub.

**Cambios**:
- Añadir widgets de tendencias y estado del supervisor general al `LiveOperationsHub`
- Integrar la funcionalidad de "Orquestar Todo" y estado del supervisor
- Preservar los KPIs existentes del Live Hub y enriquecerlos con los del Advanced Dashboard

**Archivos a editar**: `LiveOperationsHub.tsx`

---

### Fase 6 — Redirección y Limpieza

**Objetivo**: Eliminar duplicidades y redirigir rutas antiguas.

**Cambios**:
- Redirigir `/admin/ai-agents` → `/obelixia-admin/erp` (tab IA Center)
- Actualizar el enlace en `ObelixiaTeamAdmin.tsx` (tab `ai-agents-specific`) para que apunte al módulo ERP unificado
- Actualizar `AdminGlobalSearch.tsx` para redirigir al nuevo módulo
- Marcar como deprecated (no eliminar aún) los componentes originales en `src/components/admin/agents/` y `src/components/admin/ai-agents/`

**Archivos a editar**: Rutas, `ObelixiaTeamAdmin.tsx`, `AdminGlobalSearch.tsx`, `Admin.tsx`

---

## Resumen de Impacto

| Fase | Esfuerzo | Archivos principales |
|---|---|---|
| F1 — Tabs unificadas | Medio | `AICommandCenterModule.tsx` |
| F2 — Catálogo fusionado | Alto | `AgentCatalogPanel.tsx` |
| F3 — Observabilidad enriquecida | Medio | `ObservabilityPanel.tsx` |
| F4 — Orquestación + Workflows | Medio | `OrchestrationPanel.tsx` |
| F5 — LiveHub + Advanced Dashboard | Alto | `LiveOperationsHub.tsx` |
| F6 — Redirección y limpieza | Bajo | Rutas, sidebar, search |

**Resultado**: Un único módulo **IA Center** en el ERP con ~13 pestañas que consolida toda la gestión de agentes IA sin perder ninguna funcionalidad existente.

