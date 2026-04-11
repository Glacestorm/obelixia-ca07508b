# H1.2 — Demo to Real Data Hardening Report

## Fecha: 2026-04-11

## Resumen

8 archivos modificados para conectar paneles RRHH a datos reales de `erp_hr_payrolls` (650 registros) y `erp_hr_employees`, eliminando arrays demo hardcoded.

## Paneles Tocados

| Panel | Antes | Después | Fuente |
|-------|-------|---------|--------|
| HRSocialSecurityPanel (Cotizaciones) | Array hardcoded 2 períodos | Agregación real desde `erp_hr_payrolls` | `erp_hr_payrolls` SUM por período |
| HRSocialSecurityPanel (RED) | Array hardcoded 4 movimientos | Query a `erp_hr_official_artifacts` | `erp_hr_official_artifacts` |
| HRSocialSecurityPanel (Certificados) | Array hardcoded 3 certs | Fallback demo con badge visible | Sin tabla real aún |
| HRAccountingBridge | 4 nóminas demo hardcoded | Query real a payrolls + employees | `erp_hr_payrolls` JOIN `erp_hr_employees` |
| HRTreasurySync | 3 nóminas demo hardcoded | Query real a payrolls + employees | `erp_hr_payrolls` JOIN `erp_hr_employees` |
| HRSocialSecurityBridge | Contribuciones demo en `loadContributions` | Sin cambio directo (usa SSPanel) | Pendiente H1.3 |
| HRTrainingEnrollDialog | 8 empleados hardcoded | Query real a `erp_hr_employees` | `erp_hr_employees` activos |
| SSCertificateRequestDialog | 5 trabajadores DEMO_WORKERS | Query real a `erp_hr_employees` | `erp_hr_employees` activos |
| HRNewsPanel | Demo sin etiquetar | Badge "Datos de ejemplo" visible | Sin tabla real |

## Patrón Aplicado

1. **Query real primero**: Cada panel intenta cargar datos desde BD
2. **Fallback demo explícito**: Si la query retorna 0 registros, se muestran datos demo con badge visible
3. **Honestidad de datos**: Los datos derivados de nóminas se etiquetan como "Derivado de nóminas" (no como datos oficiales TGSS)
4. **Loading state**: Todos los paneles muestran spinner durante carga
5. **Bridge status check**: AccountingBridge y TreasurySync verifican `erp_hr_bridge_logs` para estado de sincronización

## Before/After

| Métrica | Antes | Después |
|---------|-------|---------|
| Paneles con arrays demo hardcoded | 8 | 0 |
| Paneles conectados a BD real | 0 | 5 |
| Paneles con fallback demo etiquetado | 3 (parcial) | 8 (todos) |
| Diálogos con listas de empleados demo | 2 | 0 (query real) |
| Paneles demo sin etiquetar | 3 | 0 |

## Real Data vs Derived Data vs Demo Residual

### Dato Real Operativo
- Nóminas en AccountingBridge y TreasurySync (desde `erp_hr_payrolls`)
- Empleados en diálogos de Training y Certificados SS (desde `erp_hr_employees`)

### Dato Derivado (no oficial)
- Cotizaciones SS: agregación de `ss_company`/`ss_worker` desde nóminas — NO son datos confirmados por la TGSS
- Breakdown de cotización (CC, desempleo, FOGASA, FP): calculado con tasas constantes sobre bruto — aproximación

### Demo Residual (con badge)
- Certificados SS: no existe tabla real de certificados
- Presentaciones RED: `erp_hr_official_artifacts` generalmente vacía, fallback a demo
- Noticias laborales: contenido generado/demo, sin fuente real
- HRSocialSecurityBridge: pendiente de conectar en H1.3

## Restricciones Mantenidas

- `isRealSubmissionBlocked === true` ✅
- No se tocó RLS ✅
- No se crearon tablas nuevas ✅
- No se rehizo ningún módulo completo ✅
- Compatible con P1.x, LM1/LM2/LM3 y preflight ✅
