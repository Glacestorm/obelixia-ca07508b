

# [RRHH-LEGAL-AI.2] Plan — Fase 1A Arquitectura Multiagente

## Resumen

Implementar el núcleo mínimo serio: tabla de registro de agentes, 2 supervisores reales (HR + Legal), 3 agentes formalizados (HR-Ops, HR-Compliance, Legal-Labor), protocolo cross-module y trazabilidad. ~80% reutilización de código existente.

---

## 1. Tabla `erp_ai_agents_registry` + `erp_ai_agent_invocations`

**Migración SQL** con dos tablas:

### `erp_ai_agents_registry`
- `id`, `code` (unique), `name`, `module_domain` (hr/legal/cross), `specialization`, `agent_type` (specialist/supervisor), `execution_type` (edge_function/panel/hybrid), `backend_handler` (nombre edge function), `ui_entrypoint`, `status` (active/beta/disabled), `supervisor_code` (FK lógico al supervisor), `confidence_threshold` (default 0.7), `requires_human_review` (bool), `description`, `metadata` (jsonb), `created_at`, `updated_at`

### `erp_ai_agent_invocations`
- `id`, `agent_code`, `supervisor_code`, `company_id`, `user_id`, `input_summary` (text, truncado), `routing_reason`, `confidence_score`, `escalated_to` (code del agente al que se escaló), `escalation_reason`, `outcome_status` (success/failed/escalated/human_review), `execution_time_ms`, `response_summary`, `metadata` (jsonb), `created_at`

RLS: authenticated + `user_has_erp_premium_access(company_id)` en invocations. Registry es lectura pública para authenticated.

**Seed** (via insert tool): 5 registros iniciales — `hr-ops`, `hr-compliance`, `hr-supervisor`, `legal-labor`, `legal-supervisor`.

---

## 2. Edge Function: `hr-multiagent-supervisor`

**Nueva edge function** (~250 líneas). Este es el HR-Supervisor real.

**Flujo:**
1. Recibe `{ action: 'route_query' | 'get_status', company_id, query, context, session_id }`
2. **Routing IA**: Usa Lovable AI Gateway (gemini-2.5-flash) con un prompt classifier que analiza la query y determina:
   - `domain`: `ops` | `compliance` | `legal_escalation`
   - `confidence`: 0-1
   - `reasoning`: texto corto
3. **Despacho**:
   - `ops` → invoca `erp-hr-ai-agent` (ya existente, 1285 líneas)
   - `compliance` → invoca `erp-hr-compliance-monitor` (ya existente, 299 líneas)
   - `legal_escalation` → invoca `legal-multiagent-supervisor` (nuevo, ver punto 3)
4. **Logging**: Inserta en `erp_ai_agent_invocations` con routing_reason, confidence, escalation info
5. **Respuesta**: Devuelve respuesta del agente elegido + metadata de routing

**Prompt classifier** (system prompt ~15 líneas):
```
Clasifica esta consulta RRHH en una de estas categorías:
- ops: nóminas, contratos, vacaciones, fichajes, expediente, SS, administración laboral
- compliance: vencimientos, alertas legales, documentación obligatoria, sanciones, auditoría
- legal_escalation: despidos, riesgos legales, permisos protegidos, movilidad internacional, validación jurídica
Responde JSON: { "domain": "...", "confidence": 0.X, "reasoning": "..." }
```

**Fallback**: Si confidence < 0.5, usa `ops` por defecto. Si `legal_escalation`, siempre registra escalado.

---

## 3. Edge Function: `legal-multiagent-supervisor`

**Nueva edge function** (~200 líneas). Legal-Supervisor backend.

**Flujo:**
1. Recibe `{ action: 'route_query' | 'validate_hr_action' | 'get_status', company_id, query, context, source_agent }`
2. Para `route_query`: Invoca `legal-ai-advisor` con `legal_area: 'labor'` (sub-agente labor ya existente internamente)
3. Para `validate_hr_action`: Invoca `legal-validation-gateway-enhanced` con `action: 'validate_operation'` para validación pre-acción
4. **Logging**: Inserta en `erp_ai_agent_invocations` con `agent_code: 'legal-labor'`, `supervisor_code: 'legal-supervisor'`
5. **Respuesta**: Incluye `validation_result`, `risk_level`, `recommendations`, `requires_human_review`

**No duplica lógica**: Actúa como wrapper/router sobre las 2 edge functions legales ya existentes.

---

## 4. Protocolo Cross-Module HR→Legal

Implementado directamente en `hr-multiagent-supervisor`:
- Cuando el classifier devuelve `domain: 'legal_escalation'`, el HR-Supervisor:
  1. Invoca `legal-multiagent-supervisor` con `action: 'validate_hr_action'`
  2. Recibe respuesta con `risk_level` y `recommendations`
  3. Compone respuesta final combinando contexto HR + validación legal
  4. Registra en `erp_ai_agent_invocations` con `escalated_to: 'legal-supervisor'`

No se necesita bus ni sistema de mensajes. Es invocación directa función→función usando `fetch()` interno.

---

## 5. UI: Panel de Supervisión Multiagente

**Nuevo componente** `MultiAgentSupervisorPanel.tsx` (~300 líneas) en `src/components/erp/hr/`.

Contenido:
- **Catálogo de agentes**: Lee `erp_ai_agents_registry`, muestra cards con status, tipo, supervisor
- **Chat supervisor**: Input de consulta → invoca `hr-multiagent-supervisor` → muestra respuesta + metadata de routing (qué agente respondió, confidence, si hubo escalado legal)
- **Log reciente**: Últimas 20 invocaciones de `erp_ai_agent_invocations` con filtro por agente
- **Indicador de escalados**: Badge visible cuando un caso fue escalado a Legal

**Integración**: Añadir como tab en el módulo RRHH (Utilidades o sección IA existente).

---

## 6. Hook: `useMultiAgentSupervisor.ts`

Hook que encapsula:
- `routeQuery(query, context)` → invoca `hr-multiagent-supervisor`
- `getAgentRegistry()` → lee `erp_ai_agents_registry`
- `getRecentInvocations(limit)` → lee `erp_ai_agent_invocations`
- Estados de loading, error, respuesta

---

## 7. Actualizar `LegalAgentSupervisorPanel`

Conectar el panel existente con el nuevo backend:
- Añadir lectura de `erp_ai_agent_invocations` filtrada por `module_domain = 'legal'`
- Mostrar escalados recibidos desde RRHH
- Mantener toda la UI existente intacta

---

## Archivos a crear/modificar

| Acción | Archivo |
|--------|---------|
| **Crear** | Migración SQL: `erp_ai_agents_registry` + `erp_ai_agent_invocations` |
| **Seed** | 5 registros en registry (insert tool) |
| **Crear** | `supabase/functions/hr-multiagent-supervisor/index.ts` |
| **Crear** | `supabase/functions/legal-multiagent-supervisor/index.ts` |
| **Crear** | `src/hooks/erp/hr/useMultiAgentSupervisor.ts` |
| **Crear** | `src/components/erp/hr/MultiAgentSupervisorPanel.tsx` |
| **Editar** | `supabase/config.toml` — NO (auto-managed) |
| **Editar** | `LegalAgentSupervisorPanel.tsx` — conectar con invocations |
| **Editar** | Barrel exports para exponer nuevos componentes |

**No se modifica**: Ninguna edge function existente. Ningún panel existente se elimina. Sin regresiones.

---

## Riesgos y mitigaciones

- **Latencia doble en escalados** (HR→Legal = 2 llamadas IA): Mitigado con gemini-2.5-flash (rápido) y logging de execution_time_ms
- **Classifier impreciso**: Fallback a `ops` + confidence threshold. Se puede afinar el prompt iterativamente
- **Costes IA**: El classifier es un prompt corto (~100 tokens). Coste marginal vs valor de routing correcto

