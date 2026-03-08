# 📊 POST GO-LIVE MONITORING — Módulo RRHH Enterprise

## Versión: 1.0 | Fecha: 2026-03-08 | Período: Primeros 14 días tras go-live

---

## 1. CHECKLIST DE REVISIÓN DIARIA (Días 1-14)

### Cada mañana (antes de las 10:00)

- [ ] Abrir panel `HROperationalHealthPanel` → verificar estado general
- [ ] Revisar tab **Errores** → ¿hay errores nuevos en las últimas 24h?
- [ ] Revisar tab **Webhooks** → ¿webhooks fallidos sin resolver?
- [ ] Revisar tab **Rate Limits** → ¿alguna función >60% del límite diario?
- [ ] Revisar tab **Reportes** → ¿reportes/board packs/regulatory fallidos?
- [ ] Verificar integraciones enterprise activas → ¿sync exitoso?
- [ ] Revisar logs de `hr-orchestration-engine` → ¿eventos sin procesar?
- [ ] Confirmar que reportes programados del día anterior se generaron

### Cada tarde (antes de las 18:00)

- [ ] Segunda revisión rápida del panel operativo
- [ ] Anotar cualquier incidencia en el reporte diario
- [ ] Escalar incidencias pendientes si aplica

### Días 1-3 (Fase Crítica)

- [ ] Revisión cada 4 horas del panel
- [ ] Verificar que el primer cliente piloto opera sin errores
- [ ] Confirmar que RLS aísla correctamente los datos entre empresas
- [ ] Validar que rate limiting no bloquea uso legítimo

### Días 4-7 (Estabilización)

- [ ] Reducir a 2 revisiones diarias
- [ ] Revisar tendencia de errores (¿bajan, estables, suben?)
- [ ] Identificar patrones de uso por empresa/rol

### Días 8-14 (Consolidación)

- [ ] 1 revisión diaria es suficiente si no hay incidencias
- [ ] Preparar reporte semanal consolidado
- [ ] Decidir si se mantiene monitoreo intensivo o se relaja

---

## 2. MÉTRICAS CLAVE A VIGILAR

### 2.1 Errores por Edge Function

| Función | Umbral OK | Umbral Warning | Umbral Crítico |
|---|---|---|---|
| hr-analytics-bi | 0-2/día | 3-5/día | >5/día |
| hr-board-pack | 0/día | 1-2/día | >2/día |
| hr-reporting-engine | 0-3/día | 4-8/día | >8/día |
| hr-regulatory-reporting | 0/día | 1/día | >1/día |
| hr-premium-api | 0-5/día | 6-15/día | >15/día |
| hr-enterprise-integrations | 0-2/día | 3-5/día | >5/día |
| hr-compliance-automation | 0/día | 1-2/día | >2/día |
| hr-orchestration-engine | 0-3/día | 4-8/día | >8/día |

### 2.2 Rate Limiting (429)

| Métrica | OK | Warning | Crítico |
|---|---|---|---|
| % límite diario consumido | <50% | 50-80% | >80% |
| 429 por empresa/día | 0 | 1-3 | >3 |
| 429 en función crítica | 0 | 1 | >1 |

### 2.3 Webhooks Fallidos

| Métrica | OK | Warning | Crítico |
|---|---|---|---|
| Fallos totales/día | 0-2 | 3-5 | >5 |
| Mismo webhook fallando | 0 | 2 consecutivos | 3+ consecutivos |
| Fallos sin resolver >24h | 0 | 1-2 | >2 |

### 2.4 Reporting / Regulatory / Board Packs

| Métrica | OK | Warning | Crítico |
|---|---|---|---|
| Reportes fallidos/día | 0 | 1 | >1 |
| Board packs fallidos/semana | 0 | 1 | >1 |
| Regulatory reports fallidos | 0 | 0 | 1+ (siempre crítico) |
| Reportes pendientes >2h | 0 | 1-2 | >2 |

### 2.5 Integraciones Enterprise

| Métrica | OK | Warning | Crítico |
|---|---|---|---|
| Syncs fallidos/día | 0 | 1-2 | >2 |
| Integración caída >30min | 0 | 0 | 1+ |
| Error de mapeo de campos | 0 | 1-3 | >3 |

### 2.6 Uso por Rol

| Rol | Métricas a observar |
|---|---|
| admin/superadmin | Accesos a panel operativo, generación de board packs |
| hr_manager | Uso de reporting, compliance, nóminas |
| employee | Acceso a portal self-service, solicitudes |
| api_client | Volumen de requests, endpoints más usados |

---

## 3. CLASIFICACIÓN DE INCIDENCIAS

### 🔴 CRÍTICA (Respuesta: <1 hora)

- Exposición de datos entre empresas (fallo de RLS)
- Datos de nómina corruptos o incorrectos
- Edge function principal completamente caída
- Board pack entregado con datos erróneos a consejo
- Integración enterprise enviando datos incorrectos al sistema externo
- Fallo generalizado de autenticación

**Acción**: Aislar inmediatamente. Escalar a Nivel 3. Aplicar rollback si es necesario.

### 🟠 ALTA (Respuesta: <4 horas)

- Edge function con errores repetidos (>5 en 1 hora)
- Regulatory report fallido o bloqueado
- Integración enterprise caída >30 minutos
- Rate limiting bloqueando operaciones legítimas de producción
- Webhook entregando datos a destino incorrecto
- Fallo de generación de reportes programados

**Acción**: Diagnosticar causa raíz. Aplicar fix o workaround. Notificar al cliente si impacta.

### 🟡 MEDIA (Respuesta: <24 horas)

- Webhook fallido puntual (no repetitivo)
- Reporte ejecutivo con retraso <2h
- Rate limiting alcanzado por automatización mal configurada
- Error puntual en edge function (no repetitivo)
- Integración con sync retrasado pero sin pérdida de datos

**Acción**: Registrar. Investigar en la siguiente ventana de soporte. Corregir si hay fix rápido.

### 🟢 BAJA (Respuesta: <72 horas)

- Warning en logs sin impacto funcional
- Rendimiento ligeramente degradado (no afecta usuario)
- Solicitud de ajuste de rate limiting
- Mejora menor de UX detectada
- Documentación a actualizar

**Acción**: Registrar en backlog. Incluir en el próximo sprint de mantenimiento.

---

## 4. PROPUESTA DE MINI SPRINT POST GO-LIVE

### Sprint: "Estabilización Post Go-Live" (5-7 días hábiles)

Basado en los riesgos más probables tras un go-live controlado:

| # | Riesgo probable | Tarea preventiva | Prioridad |
|---|---|---|---|
| 1 | Rate limits demasiado restrictivos | Ajustar límites según uso real observado | Alta |
| 2 | Webhooks fallando por URLs mal configuradas | Validación de URLs + health check de endpoints | Alta |
| 3 | Reportes programados sin datos suficientes | Verificar datos mínimos antes de generar | Media |
| 4 | RLS bloqueando consultas legítimas | Audit de queries fallidas por RLS en logs | Alta |
| 5 | Integraciones con mapeo incorrecto | Validación de campo-a-campo en primera sync | Media |
| 6 | Cold starts lentos en funciones con IA | Cache de respuestas frecuentes | Baja |
| 7 | Usuarios confundidos con errores poco claros | Mejorar mensajes de error en UI | Media |

### Criterio de cierre del sprint:
- 0 incidencias críticas en los últimos 3 días
- <2 incidencias altas sin resolver
- Rate limits ajustados según datos reales
- Reporte semanal limpio

---

## 5. FORMATO DE REPORTE DE SEGUIMIENTO

### 📋 Reporte Diario (Días 1-7)

```
REPORTE DIARIO — RRHH Post Go-Live
Fecha: [YYYY-MM-DD]
Día de monitoreo: [X/14]
Responsable: [nombre]

ESTADO GENERAL: [🟢 Saludable | 🟡 Degradado | 🔴 Crítico]

MÉTRICAS DEL DÍA:
- Errores edge functions: [N] (desglose por función si >0)
- 429 rate limit: [N]
- Webhooks fallidos: [N]
- Reportes fallidos: [N]
- Board packs fallidos: [N]
- Regulatory reports fallidos: [N]
- Integraciones con error: [N]

INCIDENCIAS:
| ID | Severidad | Descripción | Estado | Acción |
|---|---|---|---|---|
| INC-001 | Alta | [descripción] | Resuelto/Pendiente | [acción tomada] |

OBSERVACIONES:
- [notas relevantes del día]

TENDENCIA (vs día anterior):
- Errores: [↑ ↓ →]
- Rate limits: [↑ ↓ →]
- Webhooks: [↑ ↓ →]
```

### 📊 Reporte Semanal (Semanas 1-2)

```
REPORTE SEMANAL — RRHH Post Go-Live
Semana: [1 | 2]
Período: [fecha inicio] - [fecha fin]
Responsable: [nombre]

RESUMEN EJECUTIVO:
[1-2 frases sobre el estado general de la semana]

MÉTRICAS ACUMULADAS:
| Métrica | Lun | Mar | Mié | Jue | Vie | Total | Tendencia |
|---|---|---|---|---|---|---|---|
| Errores EF | | | | | | | |
| 429 | | | | | | | |
| Webhooks fail | | | | | | | |
| Reportes fail | | | | | | | |

INCIDENCIAS DE LA SEMANA:
| ID | Severidad | Descripción | Resolución | Tiempo resolución |
|---|---|---|---|---|

TOP 3 HALLAZGOS:
1. [hallazgo más relevante]
2. [segundo hallazgo]
3. [tercer hallazgo]

AJUSTES APLICADOS:
- [cambios de rate limiting, fixes, mejoras]

RECOMENDACIÓN PARA SIGUIENTE SEMANA:
- [ ] Mantener monitoreo intensivo
- [ ] Reducir a monitoreo estándar
- [ ] Escalar a sprint de estabilización
```
