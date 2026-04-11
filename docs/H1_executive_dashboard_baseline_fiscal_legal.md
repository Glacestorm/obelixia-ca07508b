# H1.3B — Executive Dashboard & Portal Baseline (Fiscal + Jurídico)

## Fecha: 2026-04-11

## Resumen

Auditoría y hardening de dashboards ejecutivos en módulos Fiscal y Jurídico. Se añadieron badges de honestidad a todos los bloques hardcoded, se desactivaron botones cosméticos, y se corrigió el uso de `demoCompanyId` en Fiscal.

## Cambios Realizados

| Archivo | Cambio |
|---------|--------|
| `LegalExecutiveDashboard.tsx` | Badges "Datos de ejemplo" en KPIs, jurisdicciones, actividad, alertas |
| `LegalExecutiveDashboard.tsx` | Botones "Revisar ahora" / "Ver plan" → disabled + "(próximamente)" |
| `LegalModule.tsx` | Estado `usingFallback` + banner cuando edge function falla |
| `LegalCompliancePanel.tsx` | Badge "Datos de ejemplo" en cabecera de Matriz de Cumplimiento |
| `LegalRiskAssessmentPanel.tsx` | Badge "Datos de ejemplo" en cabecera de Evaluación de Riesgos |
| `LegalAuditTrailPanel.tsx` | Badge "Datos de ejemplo" en cabecera + export buttons disabled "(próx.)" |
| `FiscalModule.tsx` | `demoCompanyId` → `currentCompany?.id` desde `useOptionalERPContext` |

## BEFORE / AFTER

| Métrica | Antes | Después |
|---------|-------|---------|
| Legal KPIs etiquetados | 0/6 | 6/6 (badge "Datos de ejemplo") |
| Legal jurisdicciones etiquetadas | No | Sí (badge) |
| Legal actividad reciente etiquetada | No | Sí (badge) |
| Botones cosméticos en alertas | 2 activos sin handler | 2 disabled + "(próximamente)" |
| Audit Trail export simulado | 3 botones activos (simulado) | 3 disabled + "(próx.)" |
| LegalModule fallback stats | Sin etiqueta | Banner "Estadísticas de ejemplo" visible |
| Fiscal `demoCompanyId` | Hardcoded `demo-company-001` | Real `currentCompany?.id` con fallback |

## Legal / Fiscal Real vs Derived vs Demo Data Map

### LEGAL — Dato Real Operativo
- **Ninguno en dashboard ejecutivo.** Todo el dashboard usa arrays hardcoded.
- **LegalModule header stats**: Intenta obtener de edge function `legal-ai-advisor` → real si responde ✅

### LEGAL — Fallback Demo (etiquetado)
- **KPIs ejecutivos** (compliance 85%, risks 4, docs 23, etc.): hardcoded, badge "Datos de ejemplo" ✅
- **Jurisdicciones** (AD 92%, ES 87%, EU 84%, INT 78%): hardcoded, badge ✅
- **Actividad reciente** (4 entries): hardcoded, badge ✅
- **Alertas** (MiFID II, DORA): hardcoded, botones disabled ✅
- **Compliance matrix** (7 regulaciones): hardcoded, badge ✅
- **Risk assessment** (5 riesgos): hardcoded, badge ✅
- **Audit trail** (6 entries): hardcoded, badge ✅
- **LegalModule stats en error**: fallback 87/5/23/2/156/42, banner visible ✅

### LEGAL — Botones Cosméticos (neutralizados)
- **"Revisar ahora"**: disabled + "(próximamente)" ✅
- **"Ver plan"**: disabled + "(próximamente)" ✅
- **Export PDF/Excel/XML** (audit trail): disabled + "(próx.)" ✅

### FISCAL — Dato Real Operativo
- **SII Pendientes/Rechazados**: `useERPSII` hook → queries reales ✅
- **Intrastat Expediciones/Introducciones**: `useERPIntrastat` hook → queries reales ✅
- **Global Tax Dashboard**: `useERPTaxJurisdictions` hook → queries reales ✅

### FISCAL — Corregido
- **Company ID**: antes `demo-company-001` → ahora `currentCompany?.id` con fallback ✅

## Restricciones Mantenidas

- `isRealSubmissionBlocked === true` ✅
- No se tocó RLS ✅
- No se crearon tablas nuevas ✅
- No se rehizo ningún módulo completo ✅
- Compatible con arquitectura existente ✅
