# A2 — Gap Matrix Post-P2 / Post-G1 / Post-G2 / Post-LM4

**Fecha**: 2026-04-11  
**Versión**: 2.0

---

## 1. Gaps Internos Prioritarios — CERRADOS

| # | Gap (identificado en A1) | Estado A1 | Estado A2 | Cerrado por | Evidencia |
|---|--------------------------|-----------|-----------|-------------|-----------|
| 1 | Generador SEPA CT (ISO 20022) | ❌ NOT IMPLEMENTED | ✅ Cerrado | P2.3 | `sepaCtEngine.ts`, XML pain.001.001.03, 29 tests |
| 2 | Pipeline baja unificado end-to-end | ❌ Fragmentado | ✅ Cerrado | P2.1 | `offboardingPipelineEngine.ts`, 9 estados, guards |
| 3 | Workflow IT completo + FDI | ❌ Parcial | ✅ Cerrado | P2.2 | `itWorkflowPipelineEngine.ts`, 7 estados, FDI, KPIs |

**Resultado**: 0 gaps internos prioritarios restantes.

---

## 2. Gaps Oficiales/Institucionales — ABIERTOS (dependencia externa)

| # | Gap | Organismos | Procesos afectados | Tipo | Quién lo resuelve | Estimación |
|---|-----|-----------|-------------------|------|-------------------|------------|
| 1 | Credenciales oficiales reales | TGSS, SEPE, AEAT | 2,3,6,9,10,11,12 | Externa | Cliente + organismo | 15-60 días hábiles |
| 2 | Certificado digital FNMT/DNIe | TGSS, SEPE, AEAT | 2,3,9,11,12 | Infraestructura | Cliente (FNMT / DNIe) | 5-15 días |
| 3 | Formatos binarios/posicionales nativos (spec_aligned) | TGSS (FAN/AFI), AEAT (BOE) | 2,6,9,11 | Técnico | LM5 | 10-20 días dev |
| 4 | Conectores reales SILTRA/SEPE/AEAT/Delt@ | Todos | 2,3,6,9,10,11 | Infraestructura | LM5+ | 20-40 días dev |
| 5 | WinSuite32/SILTRA software | TGSS | 2,9,10 | Infraestructura | Instalación local | 5 días |
| 6 | Sandbox/UAT organismos | Todos | 2,3,6,9,10,11,12 | Validación | Post-credenciales | 10-20 días |

**Nota**: Gaps 1-2 y 5 no requieren desarrollo — son trámites administrativos del cliente. Gaps 3-4 son scope de LM5. Gap 6 requiere gaps 1-2 resueltos primero.

---

## 3. Gaps de Expansión Futura — S9 (Compliance/Quality)

| # | Gap | Módulo | Normativa | Valor | Prioridad | Complejidad |
|---|-----|--------|-----------|-------|-----------|-------------|
| 1 | LISMI/LGD (cuota discapacidad 2%) | HR/Compliance | Art. 42 LGD + RD 364/2005 | Compliance obligatorio | Media | Media |
| 2 | VPT neutro en género | HR/Compliance | Directiva UE 2023/970 | Compliance UE | Media | Media-Alta |
| 3 | Registro Retributivo | HR/Legal | RD 902/2020 | Legal obligatorio >50 empl | Media | Media |
| 4 | Motor de convenios colectivos con IA | HR/Payroll | ET Arts. 82-92 | Diferencial alto | Alta (futuro) | Alta |
| 5 | Copiloto inspección de trabajo | HR/Compliance | LISOS | Diferencial | Media | Media |
| 6 | Desconexión digital | HR/Compliance | Art. 88 LOPDGDD | Compliance | Baja | Baja |
| 7 | Procedimiento sancionador | HR/Legal | ET Arts. 54-58 | Legal | Baja | Media |

---

## 4. Gaps AI Agents — G1.2 Backlog

| # | Item | Prioridad | Impacto | Complejidad |
|---|------|-----------|---------|-------------|
| 1 | Fiscal Supervisor (clasificador IVA/IS/retenciones→sub-agents) | P1 | Alto — diferencial | Alta (3-4 edge fn nuevas) |
| 2 | H2.0 adoption en offboarding/onboarding/compensation agents | P2 | Medio — consistencia | Baja (campos en queries) |
| 3 | Prompt refresh agents no críticos (performance, training, wellbeing, contingent) | P3 | Bajo | Baja |
| 4 | KPI/panel alignment (costes AI reales, hierarchy) | P4 | Bajo | Baja |
| 5 | CRM agent audit de seguridad | P5 | Medio — seguridad | Media |
| 6 | compliance-ia real data integration | P6 | Medio | Media |

---

## 5. Gaps Expatriados — G2.2 Backlog

| # | Item | Prioridad | Corredores nuevos |
|---|------|-----------|-------------------|
| 1 | Knowledge pack administration UI (CRUD packs) | P1 | — |
| 2 | Freshness monitoring automático (>90 días → alerta) | P1 | — |
| 3 | Packs fase 2 bilateral | P2 | CL, CO, AR, BR, JP, CN, IN, AU |
| 4 | Edge function expatriate-supervisor server-side | P3 | — |
| 5 | Pack versioning inmutable en BD | P3 | — |

---

## 6. Gaps H2 — Employee Master Backlog

| # | Item | Tabla | Prioridad |
|---|------|-------|-----------|
| 1 | Hidden fields cross-module (campos en BD sin UI en módulos downstream) | Varios | Baja |
| 2 | Validación NAF vs ss_number sync automático | erp_hr_employees ↔ hr_employee_extensions | Baja |

---

## 7. Demo Panels Residuales

| # | Panel | Badge actual | Acción requerida para datos reales |
|---|-------|-------------|-----------------------------------|
| 1 | HRNewsPanel | "Datos de ejemplo" | Motor de noticias regulatorias |
| 2 | SS Certificados | "Datos de ejemplo" | Tabla certificados SS o integración oficial |
| 3 | ComplianceMatrixPanel | "Datos de ejemplo" | compliance-ia real data (G1.2 P6) |
| 4 | ImprovementsTracker | "Datos de ejemplo" | Motor de mejora continua |
| 5 | BlockchainTrailPanel | "Datos de ejemplo" | Integración blockchain real |
| 6 | Legal Executive Dashboard | "Datos de ejemplo" | Motor legal con datos reales |
| 7 | Legal Compliance Matrix | "Datos de ejemplo" | Motor compliance legal |

---

## 8. Resumen por Categoría

| Categoría | Total gaps | Cerrados | Abiertos | Dependencia |
|-----------|-----------|----------|----------|-------------|
| Internos prioritarios | 3 | **3** | 0 | — |
| Oficiales/institucionales | 6 | 0 | 6 | Externa (cliente + organismos) |
| Expansión S9 | 7 | 0 | 7 | Decisión estratégica |
| AI agents G1.2 | 6 | 0 | 6 | Backlog normal |
| Expatriados G2.2 | 5 | 0 | 5 | Backlog normal |
| Employee master H2.x | 2 | 0 | 2 | Baja prioridad |
| Demo panels | 7 | 0 | 7 | Features nuevas (futuro) |

**Total gaps abiertos**: 33  
**Gaps que bloquean go-live oficial**: 6 (todos oficiales/institucionales)  
**Gaps que bloquean producción interna**: **0**

---

*Documento generado como gap matrix A2 del ERP RRHH unificado.*  
*Versión: 2.0 — 2026-04-11*
