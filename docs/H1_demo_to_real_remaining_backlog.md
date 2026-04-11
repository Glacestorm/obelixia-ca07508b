# H1.2 — Demo to Real Data Remaining Backlog

## Fecha: 2026-04-11

---

## Gaps Residuales

| # | Componente | Estado Actual | Acción Pendiente | Prioridad |
|---|-----------|---------------|------------------|-----------|
| 1 | HRSocialSecurityBridge | Demo data en `loadContributions` | Conectar a misma agregación que SSPanel | Media |
| 2 | SS Certificados | Fallback demo con badge | Crear tabla de certificados SS o integrar con oficial | Baja |
| 3 | SS Presentaciones RED | Fallback demo (artifacts vacía) | Poblar artifacts con flujo SILTRA real | Media |
| 4 | HRNewsPanel | Demo con badge | Conectar a motor de noticias regulatorias | Baja |
| 5 | HRAlertsPanel canales | localStorage | Persistencia en BD | Baja |
| 6 | IRPFMotorPanel Modelo 111 | Botón disabled | Motor generación AEAT real | Alta (futuro) |
| 7 | IRPFMotorPanel PDF certificado | Botón disabled | Generador PDF retenciones | Media (futuro) |
| 8 | PredictiveAuditPanel portal | Botón disabled | Portal auditor externo | Baja (futuro) |

## Recomendación

- Los 5 paneles principales (SS, Accounting, Treasury, Training, Certificates) ya usan datos reales
- El residual es mayoritariamente features nuevas (motores AEAT, portal auditor) que son scope de sprints futuros
- No se recomienda un H1.3 inmediato — los gaps restantes pueden absorberse en P1.8 o P2
