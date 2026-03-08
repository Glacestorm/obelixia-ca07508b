# 📋 CHECKLIST DE SOPORTE OPERATIVO — Módulo RRHH

## Versión: 1.0 | Fecha: 2026-03-08

---

## Verificaciones Diarias

- [ ] Revisar panel de operaciones HR: sin errores críticos
- [ ] Verificar edge functions respondiendo (status 200)
- [ ] Revisar webhooks fallidos en las últimas 24h
- [ ] Comprobar que no haya 429 excesivos
- [ ] Verificar que reportes programados se generaron correctamente
- [ ] Revisar logs de `hr-orchestration-engine` para eventos sin procesar
- [ ] Comprobar estado de integraciones enterprise activas

## Verificaciones Semanales

- [ ] Revisar tendencia de errores en edge functions
- [ ] Auditar uso de rate limiting por empresa
- [ ] Verificar que regulatory reports pendientes estén procesados
- [ ] Revisar board packs generados vs programados
- [ ] Comprobar sincronización de integraciones enterprise
- [ ] Revisar tabla `erp_hr_api_access_log` para patrones anómalos
- [ ] Validar que RLS no haya generado tickets de soporte
- [ ] Backup de configuraciones críticas (webhooks, integraciones)

## Puntos de Salud del Sistema

| Punto | Cómo verificar | Umbral de alerta |
|---|---|---|
| Edge Functions | Curl de smoke test | Respuesta > 10s |
| Rate Limiting | Headers en respuestas | > 80% del límite consumido |
| Webhooks | `erp_hr_webhook_deliveries` | > 5 fallos/día |
| Reporting | Estado de reportes programados | Reporte no generado en 2h |
| Integraciones | `erp_hr_integration_sync_logs` | > 3 fallos de sync/día |
| Base de datos | Response time en health check | > 500ms |

## Revisión de Logs Relevantes

### Edge Function Logs
- Acceder via Lovable Cloud → Edge Function Logs
- Filtrar por función específica
- Buscar `ERROR`, `rate limit`, `timeout`

### Audit Logs
- Tabla `audit_logs` para eventos de seguridad
- Tabla `erp_hr_orchestration_logs` para eventos de workflow

### Webhook Logs
- Tabla `erp_hr_webhook_deliveries`
- Filtrar por `status != 'delivered'`

## Procedimiento de Escalación

### Nivel 1 — Soporte Operativo
- Errores 4xx puntuales
- Rate limiting alcanzado por un usuario
- Webhook fallido puntual
- Reporte con retraso menor

### Nivel 2 — Ingeniería
- Errores 500 repetidos (>3 en 10 min)
- RLS bloqueando acceso legítimo
- Integración enterprise caída >30 min
- Datos inconsistentes en reportes

### Nivel 3 — Incidencia Crítica
- Exposición de datos entre empresas
- Fallo generalizado de módulo
- Datos de nómina corruptos
- AI Gateway completamente caído
