# H1.1 — Remaining Backlog for H1.2

## Fecha: 2026-04-11

---

## Prioridad: ALTA (Business Impact)

| # | Componente | Gap | Tipo | Esfuerzo est. |
|---|-----------|-----|------|---------------|
| 1 | `HRAccountingBridge.tsx` | 100% demo data, sin etiquetar | Demo→Real | Medio |
| 2 | `HRTreasurySync.tsx` | 100% demo data, sin etiquetar | Demo→Real | Medio |
| 3 | `HRSocialSecurityPanel.tsx` cotizaciones | Demo etiquetado → conectar a tabla real | Demo→Real | Alto |
| 4 | `HRSocialSecurityPanel.tsx` RED | Demo etiquetado → conectar a submissions | Demo→Real | Medio |
| 5 | `HRSocialSecurityPanel.tsx` certificados | Demo etiquetado → conectar | Demo→Real | Bajo |

## Prioridad: MEDIA (Operational Polish)

| # | Componente | Gap | Tipo | Esfuerzo est. |
|---|-----------|-----|------|---------------|
| 6 | `HRTrainingEnrollDialog.tsx` | 3 empleados hardcoded | Demo→Real | Bajo |
| 7 | `SSCertificateRequestDialog.tsx` | `DEMO_WORKERS` hardcoded | Demo→Real | Bajo |
| 8 | `HRNewsPanel.tsx` | 100% demo data | Demo→Real/Etiquetar | Bajo |
| 9 | `HRSocialSecurityBridge.tsx` | Demo data con fallback | Etiquetar | Bajo |
| 10 | `HRAlertsPanel.tsx` canales | localStorage → persistencia BD | Upgrade | Medio |

## Prioridad: BAJA (Future Enhancement)

| # | Componente | Gap | Tipo | Esfuerzo est. |
|---|-----------|-----|------|---------------|
| 11 | `IRPFMotorPanel.tsx` Modelo 111 | Motor AEAT real pendiente | New Engine | Alto |
| 12 | `IRPFMotorPanel.tsx` PDF certificado | Generador PDF real | New Feature | Medio |
| 13 | `PredictiveAuditPanel.tsx` portal auditor | Implementación completa pendiente | New Module | Alto |
| 14 | `SandboxControlPanel.tsx` UUIDs | Truncated IDs (aceptable para técnicos) | Polish | Bajo |

---

## Deferred Quick Wins and Demo-Data Backlog

### Quick Wins inmediatos (< 30 min cada uno)
1. **HRTrainingEnrollDialog**: Reemplazar array de 3 empleados por query a `erp_hr_employees`
2. **SSCertificateRequestDialog**: Reemplazar `DEMO_WORKERS` por query real
3. **HRNewsPanel**: Añadir badge "Datos de ejemplo"
4. **HRSocialSecurityBridge**: Añadir badge "Datos de ejemplo"

### Demo→Real Data (requiere validación de esquema)
1. Cotizaciones SS → tabla dedicada o cálculo desde nóminas reales
2. Presentaciones RED → `erp_hr_official_submissions` filtradas por tipo
3. Certificados SS → tabla dedicada
4. Accounting Bridge → datos de `erp_hr_payroll_records`
5. Treasury Sync → datos de `erp_hr_payroll_records`

### New Engines (scope > H1.2)
1. Motor generación Modelo 111 AEAT
2. Motor generación PDF certificados retenciones
3. Portal auditor externo completo

---

## Criterio para H1.2

- Conectar al menos 3 de los 5 gaps de prioridad alta
- Etiquetar explícitamente todos los gaps de prioridad media
- Completar todos los quick wins
- No crear nuevos controles cosméticos
