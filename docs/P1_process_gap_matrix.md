# P1.0 — Process Gap Matrix

**Fecha**: 2026-04-10
**Versión**: 1.0
**Alcance**: ERP RRHH Unificado — 12 procesos del ciclo laboral español

---

## Matriz de Gaps

| # | Proceso | Coverage | Prod Readiness | Blockers | Next Fix |
|---|---------|----------|----------------|----------|----------|
| 1 | Alta empleado + datos base | 90% | `ready` | — | Validación formato DNI/NIE |
| 2 | AFI / TGSS / TA2 | 85% | `preparatory` | `isRealSubmissionBlocked`; sin fichero binario SILTRA | Gate firma digital + generador binario AFI |
| 3 | CONTRAT@ | 80% | `preparatory` | Sin generación XML Contrat@; sin comunicación SEPE | Builder XML oficial + conector SEPE |
| 4 | Recogida incidencias | 90% | `ready` | — | Workflow aprobación multinivel (opcional) |
| 5 | Cálculo nómina | 92% | `ready` | — | Validación con nómina real de referencia |
| 6 | PNR / IT / AT / Paternidad | 75% | `preparatory` | FDI/Delt@ solo payload JSON; sin workflow IT end-to-end | Generador binario FDI + conector Delt@ + flujo IT completo |
| 7 | Cierre mensual y pago | 88% | `partial` | Sin generación SEPA CT (ISO 20022) para pago bancario | Generador SEPA CT + remesa transferencias |
| 8 | Informes nómina | 85% | `ready` | — | PDF payslip formato OM oficial completo |
| 9 | SILTRA RLC / RNT | 82% | `preparatory` | `isRealSubmissionBlocked`; sin binario SILTRA nativo | Conector SILTRA real + generador binario |
| 10 | CRA | 82% | `preparatory` | `isRealSubmissionBlocked` | Incluido con #9 + catálogo CRA completo |
| 11 | IRPF 111 / 190 / 145 | 85% | `preparatory` | Sin fichero formato BOE/AEAT posicional | Generador fichero 111/190 formato AEAT + regularización dic |
| 12 | Baja / Finiquito / Certific@2 | 72% | `partial` | Pipeline end-to-end no unificado; Certific@2 solo JSON | Orquestador de baja con checklist normativo + XML SEPE |

---

## Resumen por Production Readiness

### Ready (4 procesos)

| # | Proceso | Coverage | Nota |
|---|---------|----------|------|
| 1 | Alta empleado | 90% | Operativo completo, gaps menores |
| 4 | Incidencias | 90% | CRUD completo con guards de período |
| 5 | Cálculo nómina | 92% | Motor SS 2026 + IRPF progresivo funcional |
| 8 | Informes nómina | 85% | Payslip funcional, mejora visual pendiente |

### Preparatory (6 procesos)

| # | Proceso | Coverage | Bloqueante principal |
|---|---------|----------|---------------------|
| 2 | AFI / TGSS | 85% | `isRealSubmissionBlocked` — diseño deliberado |
| 3 | CONTRAT@ | 80% | Sin builder XML formato oficial |
| 6 | PNR/IT/AT | 75% | Solo payload, sin fichero binario ni workflow completo |
| 9 | SILTRA RLC/RNT | 82% | `isRealSubmissionBlocked` |
| 10 | CRA | 82% | Dependiente de #9 |
| 11 | IRPF 111/190 | 85% | Sin formato posicional AEAT |

### Partial (2 procesos)

| # | Proceso | Coverage | Bloqueante principal |
|---|---------|----------|---------------------|
| 7 | Cierre y pago | 88% | Cierre operativo OK; pago bancario SEPA ausente |
| 12 | Baja/Finiquito | 72% | Componentes existen pero pipeline no unificado |

### Missing (0 procesos)

Ningún proceso del ciclo laboral está completamente ausente.

---

## Blockers Transversales

| Blocker | Procesos afectados | Tipo | Impacto |
|---------|-------------------|------|---------|
| `isRealSubmissionBlocked === true` | 2, 3, 6, 9, 10, 11 | Diseño deliberado | Todas las integraciones oficiales están en modo preparatory/dry-run |
| Sin firma digital electrónica | 2, 3, 9, 11, 12 | Infraestructura | Requisito legal para envío real a organismos |
| Sin conectores reales (SILTRA, SEPE, AEAT, Delt@) | 2, 3, 6, 9, 10, 11 | Infraestructura | Sin comunicación real con la administración |
| Formatos binarios/posicionales no generados | 2, 6, 9, 11 | Técnico | Payloads JSON pero sin ficheros nativos |

---

## Priorización de Next Fixes

### Prioridad 1 — Alto impacto, baja complejidad

| Fix | Proceso | Complejidad | Impacto |
|-----|---------|-------------|---------|
| Generador SEPA CT (ISO 20022) | 7 | Media | Desbloquea pago bancario real |
| PDF payslip formato OM oficial | 8 | Baja | Mejora entregable al empleado |
| Validación formato DNI/NIE | 1 | Baja | Calidad de datos de entrada |

### Prioridad 2 — Alto impacto, media complejidad

| Fix | Proceso | Complejidad | Impacto |
|-----|---------|-------------|---------|
| Orquestador pipeline de baja | 12 | Media | Unifica flujo end-to-end de offboarding |
| Generador fichero 111/190 formato AEAT | 11 | Media | Habilita presentación telemática |
| Workflow IT end-to-end | 6 | Media | Tracking completo baja → confirmaciones → alta |

### Prioridad 3 — Infraestructura (pre-requisito para producción real)

| Fix | Proceso | Complejidad | Impacto |
|-----|---------|-------------|---------|
| Gate firma digital | 2, 3, 9, 11 | Alta | Pre-requisito para envío real |
| Generador binario AFI/FDI/FAN SILTRA | 2, 6, 9 | Alta | Formato nativo para SILTRA |
| Builder XML Contrat@ | 3 | Media | Formato oficial SEPE |
| Builder XML Certific@2 | 12 | Media | Formato oficial SEPE |

### Prioridad 4 — Conectores reales (última milla)

| Fix | Proceso | Complejidad | Impacto |
|-----|---------|-------------|---------|
| Conector SILTRA/RED | 2, 9, 10 | Muy alta | Comunicación real con TGSS |
| Conector Delt@ MITES | 6 | Alta | Comunicación real partes accidente |
| Conector Sede Electrónica AEAT | 11 | Muy alta | Presentación telemática modelos |
| Conector Certific@2 SEPE | 12 | Alta | Envío real certificado empresa |

---

## Métricas Globales

| Métrica | Valor |
|---------|-------|
| Procesos auditados | 12 |
| Procesos `ready` | 4 (33%) |
| Procesos `preparatory` | 6 (50%) |
| Procesos `partial` | 2 (17%) |
| Procesos `missing` | 0 (0%) |
| Cobertura media ponderada | **83.8%** |
| Blockers transversales | 4 |
| Next fixes identificados | 14 |

---

## Conclusión

El ERP RRHH unificado cubre el **100% de los procesos** del ciclo laboral español con una media de cobertura del **83.8%**. Los 4 procesos core (alta, incidencias, cálculo nómina, informes) están en estado `ready`. Los 6 procesos de integración oficial están en `preparatory` por diseño (`isRealSubmissionBlocked`). Los 2 procesos `partial` (cierre/pago y baja/finiquito) requieren trabajo de unificación de pipeline y generación de formatos específicos (SEPA, XML).

**No hay ningún proceso missing.** La foto del ciclo laboral está completa en modelado y parcialmente implementada en producción real.
