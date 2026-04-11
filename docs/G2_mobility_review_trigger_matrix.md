# G2.1 — Mobility Review Trigger Matrix

## Severidades

| Severidad | Código | Acción Requerida |
|-----------|--------|------------------|
| 🔵 Info | `info` | Informativo, sin acción obligatoria |
| 🟡 Warning | `warning` | Verificar antes de proceder |
| 🟠 Review Required | `review_required` | Revisión especialista obligatoria antes de producción |
| 🔴 Critical Review | `critical_review_required` | Derivación a asesor externo, bloquea automatización |

## Triggers por Fuente

### Fuente: Mobility Engine (`mobility_engine`)

| ID | Severidad Original | Severidad Extendida | Categoría | Módulo Afectado |
|----|-------------------|---------------------|-----------|-----------------|
| Duración >24m | critical | critical_review_required | ss | hr |
| PE risk flag | critical | critical_review_required | legal | legal |
| Sin convenio SS | high | review_required | ss | hr |
| Split payroll inter-jurisdicción | high | review_required | payroll | fiscal |
| Sin CDI | medium | warning | tax | fiscal |
| Shadow payroll activo | medium | warning | payroll | fiscal |

### Fuente: Tax Engine (`tax_engine`)

| ID | Severidad | Categoría | Módulo Afectado |
|----|-----------|-----------|-----------------|
| Doble imposición riesgo alto | critical_review_required | tax | fiscal |
| Mandatory review points | review_required | tax | fiscal |
| Art.7.p requiere verificación | review_required | tax | fiscal |
| Residencia fiscal indeterminada | review_required | tax | fiscal |

### Fuente: Corridor Pack (`corridor_pack`)

| ID | Corredor | Severidad | Razón |
|----|----------|-----------|-------|
| FR-01 | ES↔FR | info | Exit tax francés |
| FR-02 | ES↔FR | warning | A1 expira >24m |
| PT-01 | ES↔PT | warning | NHR en revisión |
| DE-01 | ES↔DE | warning | Lohnsteuer local |
| IT-01 | ES↔IT | info | Régimen impatriados |
| AD-01 | ES↔AD | review_required | Anti-paraíso |
| AD-02 | ES↔AD | warning | Permiso con cupo |
| GB-01 | ES↔GB | review_required | Visa post-Brexit |
| GB-02 | ES↔GB | warning | PAYE UK |
| CH-01 | ES↔CH | warning | Fiscalidad cantonal |
| CH-02 | ES↔CH | info | Quellensteuer |
| US-01 | ES↔US | critical_review_required | US tax compliance |
| US-02 | ES↔US | review_required | PE risk US |
| US-03 | ES↔US | warning | Visa category |
| MX-01 | ES↔MX | review_required | ISR + PTU |
| MX-02 | ES↔MX | warning | Ley Federal Trabajo |
| cor-pack-stale | Cualquiera | warning | Pack obsoleto/stale |

### Fuente: Supervisor (`supervisor`)

| ID | Severidad | Razón | Evidencia |
|----|-----------|-------|-----------|
| sup-equity-overlap | review_required | Overlap movilidad + equity → impacto fiscal | ✅ |
| sup-duration-24m | review_required | Duración >24 meses → cambio cobertura SS | ✅ |
| sup-split-payroll | warning | Split payroll → coordinación inter-jurisdicción | ❌ |
| sup-pe-risk | critical_review_required | PE risk → establecimiento permanente | ✅ |

## Triggers por Módulo Afectado

| Módulo | Triggers Posibles | Peor Severidad |
|--------|-------------------|----------------|
| HR | Duración >24m, permiso trabajo, A1 expira, visa | review_required |
| Fiscal | Doble imposición, Art.7.p, split payroll, shadow, ISR, PAYE, cantonal, equity overlap | critical_review_required |
| Legal | PE risk, contrato annexo, LFT, data protection | critical_review_required |
| Audit | Evidence required per trigger | review_required |
| IA Center | Pack freshness, confidence | warning |
| Preflight | Corridor active, stale warning | warning |

## Reglas de Escalado

1. Si algún trigger es `critical_review_required` → support level ≠ `supported_production`
2. Si no hay pack → support level ≥ `supported_with_review`
3. Si equity + mobility overlap → fiscal review obligatoria
4. Si pack status = `stale` → warning automático en preflight
5. Si pack status = `review_required` → review_required en IA Center
