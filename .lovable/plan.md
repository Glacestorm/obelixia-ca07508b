

# Plan: Ideas Estratosféricas — 5 Fases de Innovación Disruptiva

## Infraestructura Existente Reutilizable

| Sistema | Reutilización |
|---------|---------------|
| `client_installations` + `installation_modules` | Base para Self-Healing y Digital Twin |
| `usage_billing_events` + `usage_billing_rules` | Base para AI Pricing |
| `useAICredits` + `ai_audit_logs` | Tracking de consumo IA |
| `installation-manager` Edge Function | Extensible para health checks |
| Stripe conectado | Base para Marketplace revenue sharing |
| `useRealtimeChannel` + Supabase Realtime | Base para Federated Mesh |
| `useAIOfflineMode` | Base para operación offline en Mesh |

---

## FASE 1 — Self-Healing Installations (Monitoreo IA + Auto-Rollback)

**Objetivo**: Cada instalación se auto-diagnostica y repara sin intervención humana.

### Base de datos
- Tabla `installation_health_checks`: métricas periódicas (CPU, memoria, latencia, errores, score 0-100)
- Tabla `installation_incidents`: incidentes detectados con `severity`, `auto_resolved`, `resolution_type` (rollback/hotfix/restart/escalate)
- Columna `health_score` en `client_installations` (actualizado por heartbeat)

### Edge Function `self-healing-monitor`
- Acciones: `analyze_health`, `detect_degradation`, `decide_action`, `execute_remediation`
- IA analiza métricas y decide: rollback automático, hotfix, reinicio de servicio, o escalado a humano
- Usa `installation_updates` existente para ejecutar rollback (ya tiene `rollback_version`)
- Umbrales configurables por instalación

### UI
- Dashboard de salud por instalación con gauge de score (0-100)
- Timeline de incidentes con resolución automática marcada
- Configurador de umbrales y políticas de auto-reparación
- Indicador visual: verde/amarillo/rojo con icono de "auto-healing activo"

---

## FASE 2 — Federated Module Mesh (Sincronización CRDT Multi-Sede)

**Objetivo**: Múltiples sedes de un cliente sincronizan datos offline-first con reconciliación automática.

### Base de datos
- Tabla `mesh_federations`: agrupación de instalaciones de un mismo cliente (nombre, política de sync)
- Tabla `mesh_sync_log`: registro de sincronizaciones (origin, destination, records_synced, conflicts_resolved)
- Tabla `mesh_conflict_resolutions`: conflictos detectados con estrategia aplicada (LWW, merge, manual)

### Edge Function `mesh-sync-engine`
- Acciones: `create_federation`, `sync_nodes`, `resolve_conflicts`, `get_federation_status`
- IA decide estrategia de resolución de conflictos según tipo de dato (financiero=manual, RRHH=LWW, logs=merge)
- Vector clocks para ordenación causal de eventos
- Cola de operaciones offline con reconciliación al reconectar

### UI (tab "Federación" en InstallationDetailPanel)
- Mapa visual de nodos federados con estado de conexión
- Panel de conflictos pendientes de resolución manual
- Métricas de sincronización: latencia, throughput, conflictos/día
- Configurador de políticas por tipo de dato

---

## FASE 3 — Usage-Based AI Pricing (Facturación por Decisión IA)

**Objetivo**: Cada invocación IA es una unidad facturable con pricing granular.

### Base de datos
- Tabla `ai_usage_pricing`: reglas de precio por tipo de decisión IA (recálculo IRPF, análisis competencias, predicción churn, etc.)
- Extender `usage_billing_events` con `ai_model_used`, `tokens_consumed`, `decision_type`
- Tabla `ai_usage_invoices`: facturas mensuales generadas por consumo IA

### Edge Function `ai-usage-billing`
- Intercepta todas las llamadas IA existentes y registra consumo
- Calcula coste real basado en modelo usado + tokens + tipo de decisión
- Genera resumen mensual con desglose por módulo y tipo de decisión
- Integración con Stripe para facturación automática (metered billing)

### Hook `useAIUsagePricing`
- Wrapper sobre `useAICredits` existente que añade facturación
- `recordAIDecision(type, model, tokens)` — registra cada uso
- `getMonthlyInvoice(installationId)` — genera factura proforma

### UI (tab "Consumo IA" en panel de instalación)
- Gráfico de barras: decisiones IA por módulo/día
- Tabla de precios configurables por tipo de decisión
- Simulador de costes: "si usas X nóminas/mes con IA, costaría Y€"
- Alertas de umbral de gasto IA

---

## FASE 4 — Marketplace de Extensiones de Terceros

**Objetivo**: Ecosistema de plugins con revenue sharing automático.

### Base de datos
- Tabla `marketplace_extensions`: catálogo de extensiones (nombre, autor, módulo_target, versión, precio, rating, downloads)
- Tabla `marketplace_developers`: partners registrados con Stripe Connect account_id
- Tabla `marketplace_purchases`: compras/suscripciones de extensiones por instalación
- Tabla `marketplace_reviews`: reseñas y ratings

### Edge Function `marketplace-manager`
- Acciones: `list_extensions`, `install_extension`, `uninstall_extension`, `publish_extension`, `process_payment`
- Verificación de compatibilidad con módulos instalados (usa `checkCompatibility` existente)
- Revenue split automático via Stripe Connect (ej: 70% developer / 30% plataforma)

### UI (nueva sección "Marketplace" en Store)
- Catálogo tipo app store con filtros por módulo, categoría, precio
- Página de detalle con screenshots, changelog, reviews
- Panel de developer para publicar extensiones
- Dashboard de ingresos para developers (revenue sharing)
- Botón "Instalar" que verifica compatibilidad antes de añadir

---

## FASE 5 — Digital Twin de Instalación

**Objetivo**: Réplica virtual en cloud para diagnóstico y testing sin tocar producción.

### Base de datos
- Tabla `digital_twins`: réplica virtual vinculada a `client_installations` (status, last_sync, snapshot_at)
- Tabla `twin_snapshots`: snapshots periódicos del estado de la instalación (config, módulos, métricas)
- Tabla `twin_simulations`: simulaciones ejecutadas (update testing, stress test, etc.) con resultados

### Edge Function `digital-twin-engine`
- Acciones: `create_twin`, `sync_twin`, `simulate_update`, `run_diagnostic`, `compare_states`
- IA analiza divergencias entre twin y producción
- Simula aplicación de updates antes de desplegar en real
- Genera informe de riesgo pre-deployment

### UI (tab "Digital Twin" en InstallationDetailPanel)
- Vista comparativa lado-a-lado: Twin vs Producción
- Botón "Simular Update" que ejecuta en twin y muestra resultado
- Panel de diagnóstico remoto sin acceso al sistema cliente
- Timeline de snapshots con posibilidad de "viajar en el tiempo"
- Indicador de divergencia twin↔producción

---

## Resumen Técnico

| Fase | Tablas | Edge Functions | Componentes UI | Reutiliza |
|------|--------|----------------|----------------|-----------|
| 1 - Self-Healing | 2 | 1 | 3 | installation_updates, rollback |
| 2 - Federated Mesh | 3 | 1 | 4 | useRealtimeChannel, useAIOfflineMode |
| 3 - AI Pricing | 2 (+extend 1) | 1 | 3 | useAICredits, usage_billing_events, Stripe |
| 4 - Marketplace | 4 | 1 | 5 | checkCompatibility, Stripe Connect |
| 5 - Digital Twin | 3 | 1 | 4 | installation_health_checks (F1) |
| **Total** | **14** | **5** | **19** | — |

## Orden Recomendado
1. **Self-Healing** primero (valor inmediato, reduce soporte)
2. **AI Pricing** segundo (monetización rápida sobre infraestructura existente)
3. **Digital Twin** tercero (complementa Self-Healing)
4. **Marketplace** cuarto (requiere ecosistema maduro)
5. **Federated Mesh** último (mayor complejidad técnica, CRDT)

