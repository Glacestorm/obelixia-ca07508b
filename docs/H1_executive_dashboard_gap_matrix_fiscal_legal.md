# H1.3B — Gap Matrix: Fiscal + Jurídico

## Fecha: 2026-04-11

## Estado: Badges aplicados, backlog priorizado para H1.3C

---

## Gap Matrix — Legal Module

| # | Componente | Elemento | Fuente Actual | Estado H1.3B | Acción Futura |
|---|-----------|----------|---------------|--------------|---------------|
| L1 | LegalExecutiveDashboard | 6 KPIs | Hardcoded | ✅ Badge aplicado | Conectar a `legal-ai-advisor` `get_dashboard_stats` |
| L2 | LegalExecutiveDashboard | Jurisdicciones (4) | Hardcoded | ✅ Badge aplicado | Conectar a `useERPTaxJurisdictions` o similar |
| L3 | LegalExecutiveDashboard | Actividad reciente (4) | Hardcoded | ✅ Badge aplicado | Conectar a `erp_legal_procedures` |
| L4 | LegalExecutiveDashboard | Alertas MiFID/DORA | Hardcoded | ✅ Buttons disabled | Conectar a sistema de alertas regulatorias |
| L5 | LegalModule | 6 header stats | Edge fn + fallback | ✅ Banner en fallback | Mejorar retry / cacheo |
| L6 | LegalCompliancePanel | 7 regulaciones | Hardcoded | ✅ Badge aplicado | Persistir resultados de `handleRunCheck` |
| L7 | LegalRiskAssessmentPanel | 5 riesgos | Hardcoded | ✅ Badge aplicado | Persistir resultados de `handleRunAssessment` |
| L8 | LegalAuditTrailPanel | 6 audit entries | Hardcoded | ✅ Badge aplicado | Conectar a `erp_legal_procedures` |
| L9 | LegalAuditTrailPanel | Export PDF/XLSX/XML | Simulado | ✅ Disabled | Implementar export real |

## Gap Matrix — Fiscal Module

| # | Componente | Elemento | Fuente Actual | Estado H1.3B | Acción Futura |
|---|-----------|----------|---------------|--------------|---------------|
| F1 | FiscalModule | 4 header cards | `useERPSII` + `useERPIntrastat` | ✅ Funcional | Ninguna |
| F2 | FiscalModule | Company ID en panels | Antes: `demo-company-001` | ✅ Corregido → real | Ninguna |
| F3 | GlobalTaxDashboard | Jurisdicciones, calendario | `useERPTaxJurisdictions` | ✅ Funcional | Ninguna |

## Backlog Priorizado para H1.3C

### Prioridad Alta (business misleading si no se aborda)
1. **L1**: Conectar Legal Dashboard KPIs a edge function (ya existe `get_dashboard_stats`)
2. **L6**: Persistir resultados de compliance check en la matriz
3. **L3**: Conectar actividad reciente a `erp_legal_procedures`

### Prioridad Media (mejora operativa)
4. **L8**: Conectar audit trail a tabla real
5. **L9**: Implementar export real PDF/XLSX
6. **L7**: Persistir evaluación de riesgos

### Prioridad Baja (mejora cosmética)
7. **L2**: Conectar jurisdicciones a datos reales
8. **L4**: Implementar handlers de alerta
9. **L5**: Mejorar retry/cache de stats
