

# Plan: Módulo de Instalación ERP — Sistema Completo de Distribución, Licenciamiento y Monetización

## Estado de Implementación

| Fase | Estado | Detalles |
|------|--------|----------|
| 1 | ✅ Completada | Tablas DB + Edge Function + UI Wizard |
| 2 | 📋 Pendiente | Instalación modular incremental |
| 3 | 📋 Pendiente | Control de versiones y actualizaciones |
| 4 | 📋 Pendiente | Integración sistema de licencias |
| 5 | 📋 Pendiente | Monetización pay-per-use |
| 6 | 📋 Pendiente | Generador de artefactos por plataforma |

## Fase 1 — Implementado

### Base de datos
- `client_installations` — extendida con campos: platform, deployment_type, core_version, status, update_channel, license_id, etc.
- `installation_modules` — relación N:N instalación-módulo con versionado individual y health_status
- `installation_updates` — historial de actualizaciones con rollback support
- `usage_billing_rules` — reglas de facturación por uso (preparado para Fase 5)

### Edge Function: `installation-manager`
- Acciones: register_instance, add_module, remove_module, check_updates, apply_update, get_installation_status, generate_script, heartbeat
- Generación de scripts para: Docker, Windows, Linux, macOS, Proxmox, Kubernetes, AWS, Azure, GCP

### UI: `/store/installation`
- Wizard de 4 pasos: Plataforma → Módulos → Configuración → Script generado
- 10 plataformas soportadas (Docker, K8s, Windows, Linux, macOS, Proxmox, AWS, Azure, GCP, Bare Metal)
- 14 módulos ERP seleccionables con resolución automática de dependencias
- Panel "Mis Instalaciones" con estado en tiempo real
- Acceso desde StoreNavbar → Productos → Plataforma → Instalación

---

## Fases Pendientes (2-6)

### FASE 2 — Instalación Modular Incremental
- module_manifest.json por módulo
- Motor de dependencias
- Hot-add sin downtime

### FASE 3 — Control de Versiones
- Canales: stable, beta, canary
- Differential updates
- Auto-rollback

### FASE 4 — Integración Licencias
- Vincular licenses → client_installations
- Licencia per_module
- Entitlements por módulo ERP

### FASE 5 — Monetización Pay-per-Use
- usage_billing_rules ya creada
- Edge Function usage-billing
- Stripe integration

### FASE 6 — Artefactos por Plataforma
- Docker Compose, Helm charts, CloudFormation, etc.
- Edge Function generate-installation-artifact
