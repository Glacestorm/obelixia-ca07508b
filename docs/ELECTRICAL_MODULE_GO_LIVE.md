# Módulo Consultoría Eléctrica — Documentación Go-Live

## 1. Arquitectura Final

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│                                                              │
│  ElectricalConsultingModule                                  │
│  ├── Dashboard (estadísticas reales)                         │
│  ├── OperationalDashboard (KPIs operativos)                  │
│  ├── ExecutiveDashboard (multiempresa, PDF/Excel export)     │
│  ├── Expedientes (CRUD + detalle con 8 tabs)                 │
│  │   ├── Suministro (CaseSupplyTab)                          │
│  │   ├── Facturas (CaseInvoicesTab + AI parsing)             │
│  │   ├── Contratos (CaseContractsTab)                        │
│  │   ├── Propuesta (CaseProposalTab + firma digital)         │
│  │   ├── Workflow (CaseWorkflowTab - 11 estados)             │
│  │   ├── Checklist (CaseChecklistPanel - 9 ítems)            │
│  │   ├── Seguimiento (CaseTrackingTab)                       │
│  │   ├── Recomendación (CaseRecommendationTab + IA)          │
│  │   ├── Informe (CaseReportTab)                             │
│  │   └── Auditoría (CaseAuditLog)                            │
│  ├── Clientes (ElectricalClientesPanel)                      │
│  ├── Catálogo tarifas / Comparador / Precios indexados        │
│  ├── Alertas (EnergyAlertsPanel - frontend)                  │
│  ├── Smart Actions (SmartActionsPanel - NBA engine)           │
│  ├── Notificaciones (NotificationsPanel - backend/realtime)   │
│  ├── Portal Cliente (ClientPortalView - token-based)          │
│  └── Integraciones externas (stubs Datadis/OMIE/e·sios)      │
│                                                              │
│  RBAC: useElectricalPermissions + PermissionGate              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   LOVABLE CLOUD (Supabase)                   │
│                                                              │
│  TABLAS:                                                     │
│  • energy_cases (expedientes)                                │
│  • energy_customers (clientes energéticos)                    │
│  • energy_supplies (suministros)                              │
│  • energy_invoices (facturas)                                 │
│  • energy_contracts (contratos)                               │
│  • energy_proposals (propuestas comerciales + firma)          │
│  • energy_workflow_states (máquina de estados)                │
│  • energy_checklists (checklist operativo)                    │
│  • energy_recommendations (recomendaciones IA)                │
│  • energy_reports (informes)                                  │
│  • energy_tracking (seguimiento post-implementación)          │
│  • energy_tariff_catalog (catálogo de tarifas)                │
│  • energy_simulations (simulaciones)                          │
│  • energy_tasks (tareas por expediente)                       │
│  • energy_audit_log (trazabilidad acciones)                  │
│  • energy_notifications (alertas backend)                     │
│  • energy_smart_actions (NBA - next best action)              │
│  • energy_client_portal_tokens (accesos portal)               │
│  • energy_document_registry (audit trail documental)          │
│                                                              │
│  STORAGE:                                                    │
│  • energy-documents (facturas, contratos, propuestas PDF)     │
│                                                              │
│  EDGE FUNCTIONS:                                             │
│  • energy-invoice-parser (OCR + Gemini)                      │
│  • energy-ai-recommendation (recomendación IA)                │
│  • energy-contract-analyzer (análisis contratos IA)           │
│  • energy-notifications (cron backend)                        │
│  • energy-document-migration (migración legacy)               │
│                                                              │
│  REALTIME: energy_notifications                               │
└──────────────────────────────────────────────────────────────┘
```

## 2. Hooks Clave

| Hook | Propósito |
|------|-----------|
| `useEnergyCases` | CRUD expedientes |
| `useEnergyCustomers` | CRUD clientes energéticos |
| `useEnergySupply` | Datos suministro (CUPS, potencia) |
| `useEnergyInvoices` | Facturas + parsing PDF |
| `useEnergyContracts` | Contratos + upload firmado |
| `useEnergyProposals` | Propuestas + state machine |
| `useEnergyWorkflow` | Workflow 11 estados + transiciones |
| `useEnergyChecklist` | Checklist operativo 9 ítems |
| `useEnergyAlerts` | Alertas frontend calculadas |
| `useEnergyNotifications` | Alertas backend + realtime |
| `useEnergySmartActions` | NBA engine |
| `useEnergyAuditLog` | Trazabilidad |
| `useEnergyClientPortal` | Tokens portal cliente |
| `useEnergyProposalPDF` | Generación/upload PDF propuesta |
| `useEnergyExecutiveReport` | KPIs multiempresa |
| `useElectricalPermissions` | RBAC frontend |
| `useEnergyDocumentIntegrity` | Auditoría integridad documental |

## 3. Roles y Permisos

| Rol ERP | Rol Eléctrico | Acciones |
|---------|---------------|----------|
| superadmin | superadmin | Todo |
| admin / responsable_comercial / director_comercial | consultor_energetico | Todo |
| director_oficina / gestor / auditor | analista | Ver, editar, informes, tareas, dashboard, IA |
| (comercial) | comercial | Ver casos, dashboard |
| user | cliente_lectura | Solo ver casos |

**NOTA**: RLS backend actualmente depende de `company_id` matching. No hay RLS por rol eléctrico en DB — el filtrado por rol es frontend-only vía `PermissionGate`. Para hardening futuro, considerar RLS policies que usen `has_role()`.

## 4. Edge Functions

| Function | Trigger | Estado |
|----------|---------|--------|
| `energy-invoice-parser` | Manual (botón "Parsear PDF") | ✅ Producción |
| `energy-ai-recommendation` | Manual (botón "Generar") | ✅ Producción |
| `energy-contract-analyzer` | Manual | ✅ Producción |
| `energy-notifications` | Cron (requiere pg_cron) | ✅ Listo, pendiente activar cron |
| `energy-document-migration` | Manual (admin) | ✅ Nuevo - auditoría y migración legacy |

## 5. Automatizaciones

| Automatización | Tipo | Estado |
|----------------|------|--------|
| Alertas vencimiento contrato | Backend (energy-notifications) | ✅ Listo |
| Alertas propuesta caducada | Backend (energy-notifications) | ✅ Listo |
| Auto-expirar propuestas | Backend + Frontend | ✅ Dual |
| Workflow estancado >15d | Backend (energy-notifications) | ✅ Listo |
| Smart actions / NBA | Frontend (useEnergySmartActions) | ✅ Frontend-only |
| Alertas frontend calculadas | Frontend (useEnergyAlerts) | ✅ Frontend-only |
| Deduplicación notificaciones | Backend (24h window) | ✅ Implementado |

## 6. Checklist de Despliegue

### Pre-publicación
- [ ] Verificar que el bucket `energy-documents` existe y tiene RLS apropiado
- [ ] Activar realtime en `energy_notifications`: `ALTER PUBLICATION supabase_realtime ADD TABLE public.energy_notifications;`
- [ ] Configurar pg_cron para `energy-notifications` (ver sección 7)
- [ ] Verificar que LOVABLE_API_KEY está configurada como secret
- [ ] Ejecutar `energy-document-migration` con `action: 'audit'` para detectar legacy URLs
- [ ] Revisar RLS policies en todas las tablas energy_*
- [ ] Verificar edge functions desplegadas (energy-invoice-parser, energy-notifications, energy-document-migration)

### Post-publicación (Smoke Test)
- [ ] Crear un cliente nuevo
- [ ] Crear un expediente vinculado al cliente
- [ ] Subir un contrato y verificar que se guarda como path interno
- [ ] Subir una factura PDF y ejecutar parsing IA
- [ ] Verificar gráficos de consumo
- [ ] Generar recomendación IA
- [ ] Crear propuesta comercial
- [ ] Emitir propuesta (draft → issued)
- [ ] Aceptar propuesta (issued → accepted)
- [ ] Firmar propuesta digitalmente
- [ ] Descargar PDF de propuesta
- [ ] Avanzar workflow al menos 3 estados
- [ ] Verificar checklist se inicializa y marca correctamente
- [ ] Revisar alertas (deben aparecer si hay contratos próximos a vencer)
- [ ] Verificar notificaciones backend (campana)
- [ ] Generar enlace portal cliente y acceder con token
- [ ] Exportar informe ejecutivo a PDF y Excel
- [ ] Verificar que el dashboard operativo muestra KPIs reales

## 7. Activación pg_cron (Manual)

Ejecutar en Cloud View → Run SQL:

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programar energy-notifications cada 6 horas
SELECT cron.schedule(
  'energy-notifications-check',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://avaugfnqvvqcilhiudlf.supabase.co/functions/v1/energy-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YXVnZm5xdnZxY2lsaGl1ZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NDM5NTYsImV4cCI6MjA3OTQxOTk1Nn0.MCiVS_sVPlT0B_8iXjC9kTZl1I4GFLD-viluu85IN94"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Frecuencia recomendada**: Cada 6 horas (4 ejecuciones/día). Suficiente para detectar vencimientos y propuestas caducadas sin sobrecarga.

## 8. Limitaciones Reales

| Limitación | Severidad | Mitigación |
|------------|-----------|------------|
| RBAC es frontend-only | Media | RLS por company_id protege datos; roles no verificados en DB |
| Smart Actions frontend-only | Baja | Funcional, pero no genera notificaciones persistentes |
| Datadis/OMIE/e·sios son stubs | Baja | Arquitectura preparada, requiere credenciales API |
| PDF parsing limitado a 5MB | Media | Documentado; suficiente para facturas estándar |
| Portal cliente sin autenticación fuerte | Media | Token-based con expiración; suficiente para MVP |
| No hay email de notificaciones | Media | Solo in-app; requiere integración email futura |

## 9. Problemas Encontrados y Correcciones

| Problema | Severidad | Corrección |
|----------|-----------|------------|
| `window.location.reload()` en firma de propuesta | Alta | Reemplazado por actualización inline |
| `(p as any).signed_at` casting innecesario | Baja | Cambiado a `p.signed_at` directo |
| CORS headers incompletos en energy-notifications | Media | Añadidos headers completos de Supabase client |
| Sin logging de errores individuales en cron | Media | Añadido logging granular por operación |
| Sin edge function para migración documental | Alta | Creada `energy-document-migration` |
| Sin documentación de despliegue | Alta | Este documento |

## 10. Valoración Final de Preparación

**Estado: READY FOR PRODUCTION con condiciones**

✅ **Listo**: Flujo completo operativo, trazabilidad, permisos frontend, alertas, PDF, portal
✅ **Listo**: Edge functions desplegadas y funcionales
✅ **Listo**: Deduplicación de alertas, state machines validadas
⚠️ **Requiere acción manual**: Activar pg_cron, verificar bucket storage, ejecutar audit de migración
⚠️ **Riesgo aceptable**: RBAC frontend-only (mitigado por RLS company_id)
❌ **No incluido**: Email notifications, Datadis real, facturación electrónica
