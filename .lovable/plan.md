
# Plan: Módulo de Instalación ERP — Sistema Completo de Distribución, Licenciamiento y Monetización

## Estado de Implementación

| Fase | Estado | Detalles |
|------|--------|----------|
| 1 | ✅ Completada | Tablas DB + Edge Function + UI Wizard |
| 2 | ✅ Completada | Hot-add módulos, resolución dependencias, compatibilidad |
| 3 | ✅ Completada | Canales stable/beta/canary, timeline updates, rollback |
| 4 | ✅ Completada | Vinculación licencias, entitlements por módulo |
| 5 | 📋 Pendiente | Monetización pay-per-use |
| 6 | 📋 Pendiente | Generador de artefactos por plataforma |

## Implementado

### Fase 1 — Infraestructura
- Tablas: `client_installations` (extendida), `installation_modules`, `installation_updates`, `usage_billing_rules`
- Edge Function: `installation-manager` (8 acciones)
- UI: Wizard 4 pasos en `/store/installation`

### Fase 2 — Instalación Modular Incremental
- `resolveDependencies()` — resolución transitiva de dependencias
- `getDependents()` — detecta módulos que dependen de uno dado
- `checkCompatibility()` — verifica versión core y dependencias
- Panel "Añadir Módulo" con verificación de compatibilidad en tiempo real
- Botón deshabilitar módulo con protección de dependencias
- Hot-add de módulos sin reinstalación

### Fase 3 — Control de Versiones
- 3 canales: stable (producción), beta (pre-release), canary (experimental)
- Timeline visual de actualizaciones con iconos de estado
- Botón "Actualizar" por módulo con versión target
- `applyUpdate()` con registro from→to y rollback_version
- Selector de canal por instalación
- Historial completo con changelog

### Fase 4 — Integración Licencias
- Vinculación license→installation via `linkLicense()`
- Panel de licencias disponibles con botón vincular/desvincular
- Vista de entitlements por módulo (licenciado/sin licencia)
- Integración con tabla `licenses` existente
- Badge de licencia en listado de instalaciones

## Pendiente

### FASE 5 — Monetización Pay-per-Use
- `usage_billing_rules` ya creada
- Edge Function `usage-billing`
- Dashboard de consumo
- Stripe integration

### FASE 6 — Artefactos por Plataforma
- Docker Compose, Helm charts, CloudFormation, etc.
- Edge Function `generate-installation-artifact`
