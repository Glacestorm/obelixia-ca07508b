
# Plan: Ideas Estratosféricas — 5 Fases de Innovación Disruptiva

## Estado de Implementación

| Fase | Estado | Detalles |
|------|--------|----------|
| 1 - Self-Healing | ✅ Completada | Tablas DB + Edge Function + Hook + UI Panel |
| 2 - Federated Mesh | 🔲 Pendiente | Sincronización CRDT Multi-Sede |
| 3 - AI Pricing | ✅ Completada | Tablas DB + Edge Function + Hook + UI Panel |
| 4 - Marketplace | 🔲 Pendiente | Extensiones de Terceros |
| 5 - Digital Twin | 🔲 Pendiente | Réplica Virtual de Instalación |

## Implementado

### Fase 1 — Self-Healing Installations
- **Tablas**: `installation_health_checks`, `installation_incidents`
- **Columnas en `client_installations`**: `health_score`, `self_healing_enabled`, `health_thresholds`
- **Edge Function `self-healing-monitor`**: 6 acciones (analyze_health, detect_degradation, decide_action, execute_remediation, get_health_history, configure_thresholds)
- **Hook `useSelfHealing`**: auto-monitoring, análisis IA, diagnóstico, ejecución remediación
- **UI `SelfHealingPanel`**: Gauge 0-100, trends, predicciones IA, incidentes, umbrales
- **Tab "Salud"** en InstallationDetailPanel

### Fase 3 — Usage-Based AI Pricing
- **Tablas**: `ai_usage_pricing` (14 reglas predefinidas), `ai_usage_invoices`
- **Columnas extendidas en `usage_billing_events`**: `ai_model_used`, `tokens_consumed`, `decision_type`, `ai_latency_ms`, `prompt_tokens`, `completion_tokens`
- **Edge Function `ai-usage-billing`**: 6 acciones (record_decision, get_usage_summary, generate_invoice, get_pricing_rules, simulate_cost, get_invoices)
- **Hook `useAIUsagePricing`**: recordAIDecision, fetchUsageSummary, generateInvoice, simulateCost
- **UI `AIUsagePricingPanel`**: 4 tabs (Resumen con gráficos Recharts, Precios con 14 reglas, Simulador de costes interactivo, Facturas con generación)
- **Tab "IA"** en InstallationDetailPanel (8 tabs total)
- **14 tipos de decisión IA** con pricing granular: recálculo IRPF, optimización nómina, análisis competencias, sucesión, churn, forecast, anomalías, compliance, documentos, ventas, inventario, lead scoring, ESG, asistente general

## Pendiente

### Fase 2 — Federated Module Mesh
- Tablas: mesh_federations, mesh_sync_log, mesh_conflict_resolutions
- Edge Function: mesh-sync-engine
- UI: tab "Federación" con mapa de nodos, conflictos, métricas sync

### Fase 4 — Marketplace de Extensiones
- Tablas: marketplace_extensions, marketplace_developers, marketplace_purchases, marketplace_reviews
- Edge Function: marketplace-manager
- UI: catálogo, detalle, panel developer, revenue dashboard

### Fase 5 — Digital Twin
- Tablas: digital_twins, twin_snapshots, twin_simulations
- Edge Function: digital-twin-engine
- UI: vista comparativa, simulador de updates, diagnóstico remoto
