# 📘 RUNBOOK OPERATIVO — Módulo RRHH Enterprise

## Versión: 1.0 | Fecha: 2026-03-08 | Estado: Go-Live Controlado

---

## 1. Visión General del Stack RRHH

### Edge Functions Críticas

| Función | Propósito | Rate Limit (burst/día) |
|---|---|---|
| `hr-analytics-bi` | Analytics BI y dashboards premium | 5/50 |
| `hr-board-pack` | Generación de Board Packs ejecutivos | 8/30 |
| `hr-reporting-engine` | Motor de reporting general | 10/100 |
| `hr-regulatory-reporting` | Informes regulatorios (GDPR, Igualdad) | 5/30 |
| `hr-premium-api` | API REST para integraciones externas | 15/200 |
| `hr-enterprise-integrations` | Integraciones enterprise (SAP, Workday) | 8/60 |
| `hr-compliance-automation` | Automatización de cumplimiento | 5/40 |
| `hr-orchestration-engine` | Orquestación de workflows y eventos | 10/200 |

### Tablas Más Sensibles

- `erp_hr_employees` — Datos personales (PII)
- `erp_hr_payroll_records` — Nóminas y compensaciones
- `erp_hr_contracts` — Contratos laborales
- `erp_hr_compliance_frameworks` — Marcos regulatorios
- `erp_hr_board_packs` — Informes para consejo
- `erp_hr_api_clients` — Clientes API y tokens
- `erp_hr_webhooks` — Configuración webhooks
- `erp_hr_webhook_deliveries` — Histórico de entregas webhook

### Secrets Requeridos

| Secret | Uso |
|---|---|
| `LOVABLE_API_KEY` | Acceso a Lovable AI Gateway (todas las edge functions con IA) |

---

## 2. Diagnóstico de Fallos Comunes

### Error 400 — Bad Request
- **Causa**: Payload incorrecto, `action` no reconocida, `companyId` vacío
- **Acción**: Revisar body del request. Verificar que `action` esté en la lista soportada. Comprobar que `companyId` no sea `demo-company-id` en producción.

### Error 401 — Unauthorized
- **Causa**: Token JWT expirado o ausente
- **Acción**: Verificar que el usuario tenga sesión activa. Comprobar header `Authorization: Bearer <token>`. Revisar logs de auth.

### Error 403 — Forbidden
- **Causa**: Usuario sin rol requerido, RLS bloqueando acceso
- **Acción**: Verificar roles en `user_roles`. Comprobar que el `company_id` del usuario coincida con los datos solicitados. Revisar políticas RLS de la tabla involucrada.

### Error 429 — Rate Limited
- **Causa**: Límite de burst o diario excedido
- **Acción**: Revisar headers `X-RateLimit-Remaining` y `Retry-After`. Verificar si hay automatizaciones disparando requests excesivos. Ajustar límites si es necesario.

### Error 500 — Internal Server Error
- **Causa**: Fallo de IA Gateway, error de base de datos, timeout
- **Acción**: 
  1. Revisar logs de la edge function específica
  2. Comprobar que `LOVABLE_API_KEY` esté configurado
  3. Verificar conectividad con AI Gateway
  4. Comprobar que las tablas referenciadas existan y tengan datos

---

## 3. Revisión de Rate Limiting

```bash
# Verificar estado de rate limit (aparece en headers de respuesta)
# X-RateLimit-Limit: límite total
# X-RateLimit-Remaining: requests restantes
# Retry-After: segundos hasta poder reintentar

# Si un usuario reporta 429:
1. Identificar la función afectada
2. Revisar frecuencia de llamadas del usuario/empresa
3. Evaluar si el límite es apropiado
4. Ajustar en el código de la función si es necesario
```

---

## 4. Revisión de Webhooks Fallidos

1. Consultar `erp_hr_webhook_deliveries` filtrando por `status = 'failed'`
2. Revisar `response_status`, `response_body` y `error_message`
3. Verificar que la URL destino sea accesible
4. Comprobar que el webhook esté activo (`is_active = true`)
5. Si hay fallos de red: reintentar manualmente o esperar retry automático
6. Si hay fallos 4xx: revisar formato del payload enviado

---

## 5. Reporting / Regulatory / Board Packs

### Diagnóstico de fallo en generación
1. Revisar logs de `hr-reporting-engine`, `hr-regulatory-reporting` o `hr-board-pack`
2. Comprobar que existan datos para el período solicitado
3. Verificar que el `company_id` tenga empleados/contratos/nóminas
4. Comprobar respuesta del AI Gateway (timeout = posible prompt muy largo)
5. Si el reporte queda en estado `draft` sin avanzar: verificar que la acción de cambio de estado se esté ejecutando

### Reintentar generación
- Ejecutar de nuevo la acción correspondiente desde el panel UI
- No hay riesgo de duplicación si se usa el mismo `report_id`

---

## 6. Validación de RLS

Si un usuario no ve datos que debería ver:
1. Verificar su `company_id` en `profiles`
2. Verificar sus roles en `user_roles`
3. Comprobar que la tabla tenga política RLS para su rol
4. Ejecutar query de diagnóstico como service_role para comparar resultados
5. Revisar si la política usa `auth.uid()` o `company_id` correctamente

---

## 7. Integraciones Enterprise

Para validar integración:
1. Verificar configuración en `erp_hr_integration_configs`
2. Comprobar que `status = 'active'`
3. Revisar `erp_hr_integration_sync_logs` para errores recientes
4. Verificar credenciales/tokens del sistema externo
5. Comprobar conectividad de red al endpoint externo

---

## 8. Cuándo Escalar

Escalar incidencia cuando:
- Error 500 repetido en la misma función (>3 en 10 min)
- Datos de nómina corruptos o inconsistentes
- Fallo de RLS que exponga datos entre empresas
- Webhook entregando datos a destino incorrecto
- Board pack entregado con datos erróneos a consejo
- Fallo generalizado de AI Gateway (>5 min)
- Rate limiting bloqueando operaciones críticas de producción

---

## 9. Procedimiento de Reintento

Para cualquier proceso fallido:
1. Identificar el proceso y su estado actual
2. Verificar la causa raíz (logs)
3. Corregir la causa si es posible
4. Re-ejecutar desde la UI o llamar a la edge function directamente
5. Verificar que el resultado sea correcto
6. Documentar la incidencia
