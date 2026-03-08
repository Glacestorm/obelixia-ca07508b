

# Plan: Módulo de Instalación ERP — Sistema Completo de Distribución, Licenciamiento y Monetización

## Contexto Actual

Tu proyecto **ya tiene** una infraestructura sólida que reutilizaremos:

- **Sistema de Licencias completo** (`license-manager` Edge Function, 7 tablas: `licenses`, `license_plans`, `device_activations`, `license_entitlements`, `license_usage_logs`, `license_validations`, `license_anomaly_alerts`)
- **Versionado de módulos** (`module_versions` table + `useModuleVersioning` hook)
- **Página de Deployment** (`StoreDeployment` con opciones SaaS/On-Premise/Híbrido)
- **Device Fingerprinting** (`useDeviceFingerprint` hook con Ed25519)
- **ERP Multi-empresa** confirmado (todo filtrado por `company_id`)

---

## FASE 1 — Infraestructura de Instalación y Registro de Instancias
**Objetivo**: Base de datos y backend para gestionar instalaciones cliente.

### Base de datos (migración SQL)
- Tabla `client_installations`: registro de cada instancia desplegada (OS, tipo de despliegue, módulos instalados, versión, estado, `license_id` FK)
- Tabla `installation_modules`: relación N:N entre instalación y módulos ERP con versión individual por módulo
- Tabla `installation_updates`: historial de actualizaciones aplicadas (from_version, to_version, status, applied_at)

### Edge Function `installation-manager`
- Acciones: `register_instance`, `add_module`, `remove_module`, `check_updates`, `apply_update`, `get_installation_status`
- Genera artefactos de instalación (scripts/configs) según plataforma destino

### UI: Pestaña "Instalación" en Store
- Wizard de instalación paso a paso
- Selector de plataforma: Windows, macOS, Linux, Docker, Proxmox VM, Kubernetes, AWS/Azure/GCP
- Selector de módulos (checkboxes): RRHH, Contabilidad, Tesorería, Compras, Inventario, Fiscal, Legal, ESG, Logística, etc.
- Generador de scripts de instalación personalizados por plataforma
- Panel de estado de instalaciones existentes

---

## FASE 2 — Instalación Modular Incremental
**Objetivo**: Instalar un módulo hoy, añadir otro mañana sin romper nada.

### Arquitectura modular
- Cada módulo ERP tiene un `module_manifest.json` con dependencias, versión mínima de core, y requisitos de sistema
- Motor de resolución de dependencias (si instalo Nóminas, requiere RRHH core)
- Proceso de "hot-add": añadir módulo a instalación existente sin downtime
- Migración automática de BD al añadir módulo (scripts delta por módulo)

### UI
- Panel "Mis Instalaciones" mostrando módulos activos por instancia
- Botón "Añadir Módulo" que verifica compatibilidad y dependencias antes de instalar
- Indicador visual de dependencias resueltas/pendientes

---

## FASE 3 — Sistema de Control de Versiones y Actualizaciones
**Objetivo**: OTA updates con rollback automático.

### Reutilización
- Se reutiliza `module_versions` (ya existe) y `useModuleVersioning` hook
- Se extiende con canales de actualización: `stable`, `beta`, `canary`

### Nuevas funcionalidades
- **Update channels** por instalación (producción=stable, staging=beta)
- **Differential updates**: solo descargar cambios, no el módulo completo
- **Pre-flight checks**: verificar compatibilidad antes de aplicar
- **Auto-rollback**: si health-check falla post-update, revertir automáticamente
- **Update policies**: actualizaciones automáticas vs. aprobación manual (configurable por cliente)

### UI
- Dashboard de versiones con timeline visual
- Comparador de versiones (changelog entre v1.2 → v1.5)
- Botón "Actualizar" / "Programar actualización" con ventana de mantenimiento

---

## FASE 4 — Integración del Sistema de Licencias Existente
**Objetivo**: Vincular licencias a instalaciones y módulos.

### Reutilización completa
- `license-manager` Edge Function ya soporta: activar, validar, heartbeat, revocar, device fingerprint
- `license_plans` ya define planes con features y límites
- `license_entitlements` ya tiene `usage_limit` y `usage_current` con `reset_period`

### Extensiones
- Vincular `licenses.id` → `client_installations.license_id`
- Añadir tipo de licencia `per_module` a los planes existentes (licencia por módulo individual)
- Ampliar `license_entitlements` para mapear features a módulos ERP específicos (ej: `feature_key = 'erp.hr'`, `'erp.accounting'`)
- Panel de activación de licencia integrado en el wizard de instalación

---

## FASE 5 — Monetización por Uso (Pay-per-Use)
**Objetivo**: Cobrar X€ por nómina/mes/empleado.

### Modelo de negocio
- Usar `license_usage_logs` (ya existe) para registrar cada nómina generada
- Usar `license_entitlements` con `reset_period = 'monthly'` para controlar cuotas
- Crear `usage_billing_rules`: tabla con reglas de facturación (ej: "0.50€/nómina/empleado/mes", "primeras 50 gratis", tier pricing)

### Edge Function `usage-billing`
- Calcula coste mensual por instalación según uso real
- Genera factura proforma automática
- Integra con Stripe para cobro automático (ya tienes Stripe conectado)

### UI
- Dashboard de consumo: gráfico de nóminas generadas por mes, coste acumulado
- Alertas de umbral (80%, 90%, 100% de cuota)
- Configurador de pricing por módulo para admin

---

## FASE 6 — Generador de Artefactos por Plataforma
**Objetivo**: Scripts reales de instalación.

### Plantillas de instalación
- **Docker**: `docker-compose.yml` + `Dockerfile` personalizados con solo los módulos seleccionados
- **Windows**: Script PowerShell con instalador `.msi`
- **macOS**: Script shell con `.dmg` builder
- **Linux**: Scripts `.sh` con soporte apt/yum/pacman
- **Proxmox VM**: Template de VM con imagen preconfigurada (`.ova`/`.qcow2`)
- **Kubernetes**: Helm charts con valores dinámicos por módulo
- **AWS/Azure/GCP**: Templates CloudFormation/ARM/Terraform

### Edge Function `generate-installation-artifact`
- Genera configuración personalizada según plataforma + módulos seleccionados
- Incluye license key embebida en el artefacto

---

## Ideas Estratosféricas

1. **Self-Healing Installations**: Monitoreo con IA que detecta degradación de rendimiento post-update y ejecuta rollback o hotfix automático sin intervención humana.

2. **Federated Module Mesh**: Múltiples instalaciones de un mismo cliente (ej: oficina Madrid + Barcelona) se sincronizan en tiempo real via CRDT, funcionando offline y reconciliando al reconectar.

3. **Usage-Based AI Pricing**: No solo cobrar por nómina, sino por "decisión IA asistida" — cada vez que el sistema usa IA para recalcular IRPF, sugerir sucesión, o analizar competencias, se registra como unidad de consumo facturable.

4. **Marketplace de Extensiones de Terceros**: Permitir que partners desarrollen plugins/extensiones para módulos específicos, con revenue sharing automático vía Stripe Connect.

5. **Digital Twin de Instalación**: Réplica virtual de cada instalación cliente en tu cloud para diagnóstico remoto, testing de updates antes de desplegar, y soporte técnico sin acceso directo al sistema del cliente.

---

## Resumen Técnico

| Fase | Tablas nuevas | Edge Functions | Componentes UI | Reutiliza |
|------|--------------|----------------|----------------|-----------|
| 1 | 3 | 1 | 3 | — |
| 2 | 0 | 0 (extiende F1) | 2 | module_versions |
| 3 | 0 (extiende) | 0 (extiende F1) | 3 | useModuleVersioning |
| 4 | 0 | 0 (extiende license-manager) | 2 | Todo el sistema de licencias |
| 5 | 1 | 1 | 3 | license_usage_logs, Stripe |
| 6 | 0 | 1 | 1 | — |

**Total**: ~4 tablas nuevas, ~3 Edge Functions, ~14 componentes UI, reutilización masiva de infraestructura existente.

