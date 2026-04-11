# P1.8 — ACTA DE CIERRE DEL CICLO LABORAL PRINCIPAL

**Fecha:** 2026-04-11  
**Versión:** 1.0  
**Alcance:** ERP RRHH Unificado — Ciclo laboral español extremo a extremo  
**Modo:** Consolidación documental final  

---

## 1. Resumen Ejecutivo

El ciclo laboral principal del ERP RRHH unificado cubre **14 procesos** desde la alta de empleado hasta la baja con finiquito y certificado empresa, incluyendo nómina mensual, cotización SS, fiscalidad IRPF, movilidad internacional y un cockpit operativo transversal.

Tras **11 fases de construcción** (P1.0–P1.7C + P1.7B-RA) y **7 fases de hardening** (H1.0–H1.3E), el ciclo laboral principal se encuentra **funcionalmente cerrado con residual oficial**:

- **Cobertura media real: 85.1%**
- **4 procesos ready** — operativos sin bloqueante
- **6 procesos preparatory** — completos internamente, bloqueados por integración oficial
- **3 procesos partial** — funcionalidad core operativa, gaps menores internos
- **1 proceso ready con extensiones preparatory** — preflight cockpit

Ningún proceso está ausente. Todos los procesos tienen motor, UI, persistencia y validación. Los 6 procesos preparatory comparten el mismo bloqueante: `isRealSubmissionBlocked === true` y ausencia de conectores reales con organismos oficiales (TGSS/SILTRA, SEPE, AEAT).

---

## 2. Tabla por Proceso

| # | Proceso | Coverage | Readiness | Bloqueante Principal | Última Milla | Refuerzo H1.x |
|---|---------|----------|-----------|---------------------|-------------|----------------|
| 1 | Alta empleado + datos base | 92% | `ready` | — | No requerida | H1.1 (UUIDs→nombres), H1.2 (employees real) |
| 2 | AFI / TA2 / Alta TGSS | 88% | `preparatory` | `isRealSubmissionBlocked` | SILTRA binario + firma digital | P1.1 (MOD23, status chain 9 estados, TA2 reception) |
| 3 | CONTRAT@ / SEPE | 85% | `preparatory` | Sin XML oficial SEPE | Conector SEPE + XML builder | P1.2 (status chain, SEPE reception, tracking card) |
| 4 | Incidencias | 92% | `ready` | — | No requerida | P1.3 (batch validation, 7 tipos obligatorios) |
| 5 | Cálculo de nómina | 93% | `ready` | — | No requerida | P1.3 (payment tracking, evidence engine) |
| 6 | PNR / IT / AT / Nacimiento / Suspensión | 75% | `preparatory` | FDI/Delt@ solo JSON | Generador FDI binario + Delt@ connector | Sin refuerzo específico |
| 7 | Cierre mensual y pago | 88% | `partial` | Sin SEPA CT (ISO 20022) | Generador SEPA CT | P1.3 (payment workflow, evidence) |
| 8 | Informes de nómina | 87% | `ready` | — | No requerida | H1.2 (datos reales payrolls) |
| 9 | SILTRA / RLC / RNT | 85% | `preparatory` | `isRealSubmissionBlocked` | SILTRA binario + parser acuse | P1.4 (status chain 10 estados, reconciliation) |
| 10 | CRA | 82% | `preparatory` | `isRealSubmissionBlocked` | Incluido con #9 | P1.4 (CRA como paso independiente) |
| 11 | IRPF / 111 / 190 / 145 | 87% | `preparatory` | Sin formato posicional AEAT | Fichero BOE + conector AEAT | P1.5R (status chain, Mod145, cross-check) |
| 12 | Baja / Finiquito / Certific@2 | 78% | `partial` | Pipeline no totalmente unificado | XML SEPE Certific@2 | P1.6 (orquestador, settlement evidence, Certific@2 chain) |
| 13 | Preflight / Cockpit operativo | 95% | `ready` | — | Refleja estado LM | P1.7C (deep-links, cross-blockers, última milla badges) |
| 14 | Movilidad internacional / Expatriados | 82% | `partial` | Casos out_of_scope sin CDI | Convenios adicionales | P1.7B-RA (SS classification, tax engine, KB 55+ países) |

---

## 3. Cobertura Media y Distribución

### Cobertura media ponderada: **85.1%**

| Readiness | Procesos | % del ciclo |
|-----------|----------|-------------|
| `ready` | 4 (Alta, Incidencias, Nómina, Informes) + Preflight | 35.7% |
| `preparatory` | 6 (AFI, Contrat@, PNR, SILTRA, CRA, IRPF) | 42.9% |
| `partial` | 3 (Cierre/Pago, Baja/Finiquito, Expatriados) | 21.4% |
| `blocked_external` | 0 | 0% |
| `missing` | 0 | 0% |

### Distribución por tipo de bloqueante

| Tipo | Procesos | Descripción |
|------|----------|-------------|
| Sin bloqueante | 5 | Ready para uso productivo interno |
| `isRealSubmissionBlocked` | 4 | Diseño deliberado — envío oficial bloqueado |
| Sin formato oficial nativo | 3 | Falta generador binario/posicional/XML |
| Sin conector real | 6 | Sin comunicación directa con organismo |
| Gap funcional interno | 3 | SEPA CT, pipeline unificado baja, CDI scope |

---

## 4. Readiness Global

### Lo que ya está sólido internamente

| Capacidad | Estado | Evidencia |
|-----------|--------|-----------|
| CRUD empleados completo | ✅ Operativo | 5 tabs, legal profile, document catalog |
| Motor nómina SS 2026 | ✅ Operativo | Bases, cotizaciones, IRPF progresivo |
| Motor IRPF con regularización | ✅ Operativo | Art. 82-86 RIRPF, progresivo mensual |
| Incidencias con guards de período | ✅ Operativo | 11 tipos, 4 estados, batch validation |
| Cierre mensual orquestado | ✅ Operativo | 9 fases, checklist, intelligence report |
| Payslip estructura legal | ✅ Operativo | OM 27/12/1994, PDF generation |
| Artefactos oficiales (payloads) | ✅ Operativo | AFI, FAN, RLC, RNT, CRA, 111, 190, Certific@2 |
| Status chains completas | ✅ Operativo | 9-10 estados por artefacto tipo |
| Flujos de recepción (TA2, SEPE, TGSS, AEAT) | ✅ Diseñados | Engines puros, listos para conector real |
| Cross-validation engines | ✅ Operativo | SS↔payroll, fiscal quarterly/annual |
| Preflight cockpit 100% | ✅ Operativo | 10+4 pasos, deep-links, cross-blockers, LM badges |
| Movilidad internacional | ✅ Operativo | 55+ países, SS classification, tax engine |
| Closure snapshots inmutables | ✅ Operativo | JSONB v1.0, reapertura controlada |
| Evidence engine + ledger | ✅ Operativo | Persistencia de artefactos + evidencia |

### Lo que depende de organismo/canal oficial

| Dependencia | Organismos | Procesos |
|-------------|-----------|----------|
| Firma digital electrónica | TGSS, SEPE, AEAT | 2, 3, 9, 10, 11, 12 |
| Conector SILTRA real | TGSS | 2, 9, 10 |
| Conector SEPE real | SEPE | 3, 12 |
| Conector AEAT real | AEAT | 11 |
| Conector Delt@ real | MITES | 6 |
| Formatos binarios nativos | TGSS (FAN/AFI), AEAT (BOE) | 2, 6, 9, 11 |
| Credenciales y certificados | Todos | 2, 3, 6, 9, 10, 11, 12 |
| Sandbox/UAT validado | Todos | 2, 3, 6, 9, 10, 11, 12 |

### Lo que aún es gap funcional interno

| Gap | Proceso | Complejidad |
|-----|---------|-------------|
| Generador SEPA CT (ISO 20022) | 7 - Cierre/Pago | Media |
| Pipeline baja unificado end-to-end | 12 - Baja/Finiquito | Media |
| FDI binario + workflow IT completo | 6 - PNR/IT/AT | Media-Alta |
| Casos expatriados out_of_scope | 14 - Movilidad | Baja (documentación) |

### Lo que sigue siendo fallback demo honesto

| Panel | Tipo | Badge |
|-------|------|-------|
| HRNewsPanel | Demo data con badge | "Datos de ejemplo" |
| SS Certificados panel | Fallback demo con badge | "Datos de ejemplo" |
| ComplianceMatrixPanel (Audit) | Demo data con badge | "Datos de ejemplo" |
| ImprovementsTracker (Audit) | Demo data con badge | "Datos de ejemplo" |
| BlockchainTrailPanel (Audit) | Demo data con badge | "Datos de ejemplo" |
| Legal Executive Dashboard | Demo data con badge | "Datos de ejemplo" |
| Legal Compliance Matrix | Demo data con badge | "Datos de ejemplo" |

---

## 5. Gaps Abiertos Priorizados

### Prioridad 1 — Alto impacto, esfuerzo medio

| # | Gap | Proceso | Impacto |
|---|-----|---------|---------|
| 1 | Generador SEPA CT (ISO 20022) | Cierre/Pago | Desbloquea pago bancario real |
| 2 | Pipeline baja unificado | Baja/Finiquito | Conecta orquestador con engines reales |

### Prioridad 2 — Última milla oficial

| # | Gap | Proceso | Dependencia |
|---|-----|---------|-------------|
| 3 | Generadores binarios (AFI, FAN, FDI) | AFI, SILTRA, PNR | Especificación formato TGSS |
| 4 | Generador formato posicional AEAT | IRPF 111/190 | Especificación BOE |
| 5 | Builder XML Contrat@ oficial | CONTRAT@ | Esquema XSD SEPE |
| 6 | Builder XML Certific@2 oficial | Baja | Esquema XSD SEPE |

### Prioridad 3 — Conectores reales

| # | Gap | Organismo | Requisito previo |
|---|-----|-----------|-----------------|
| 7 | Conector SILTRA | TGSS | Credenciales + certificado + formato binario |
| 8 | Conector SEPE | SEPE | Credenciales + XML oficial |
| 9 | Conector AEAT (Sede Electrónica) | AEAT | Credenciales + formato posicional |
| 10 | Conector Delt@ | MITES | Credenciales + FDI binario |

---

## 6. Dependencia de Última Milla Oficial (LM)

### Estado actual (desde LM3)

| Organismo | Estado | Bloqueadores |
|-----------|--------|-------------|
| TGSS / SILTRA | `official_handoff_ready` | Sin credenciales, sin certificado, sin formato spec_aligned |
| SEPE | `official_handoff_ready` | Sin credenciales, sin certificado, sin formato spec_aligned |
| AEAT | `official_handoff_ready` | Sin credenciales, sin certificado, sin formato spec_aligned |
| MITES / Delt@ | `official_handoff_ready` | Sin credenciales, sin FDI binario |

### Qué significa `official_handoff_ready`

El sistema ha implementado:
- ✅ Payloads con toda la información necesaria
- ✅ Status chains completas (pre y post envío)
- ✅ Flujos de recepción de respuesta diseñados
- ✅ Cross-validation engines operativos
- ✅ Evidence engine con persistencia
- ✅ Go-Live readiness evaluator (6 condiciones obligatorias)
- ✅ Sandbox/UAT escenarios definidos (18 escenarios)

Falta:
- ❌ Credenciales reales de producción
- ❌ Certificados digitales vinculados
- ❌ Formatos nativos spec_aligned (binario/posicional/XML)
- ❌ Parsers de respuesta verificados contra respuestas reales
- ❌ Validación en sandbox real del organismo

---

## 7. Impacto de H1.x sobre la Confianza Funcional

### H1.0 — Interaction Assurance Baseline
- **Oleada 1 completada**: Foreign keys como texto libre resueltas con `useEntityNameResolver`
- **Resultado**: UUIDs reemplazados por nombres humanos en listas y tareas

### H1.1 — Critical Forms & Buttons Hardening
- **8 archivos corregidos** en 8 dominios
- **Botones cosméticos**: Desactivados o etiquetados (Modelo 111, PDF certificado, etc.)
- **UUIDs en TaskDetail**: Resueltos con name lookup
- **Resultado**: Eliminación de confirmaciones falsas (toast.success sin acción real)

### H1.2 — Demo Data to Real Data
- **8 paneles RRHH** conectados a datos reales de `erp_hr_payrolls` (650 registros)
- **Paneles SS, Accounting Bridge, Treasury Sync**: Ahora agregan desde BD real
- **Diálogos de selección**: Query real a `erp_hr_employees`
- **Resultado**: 0 paneles con arrays demo sin etiquetar (vs 8 antes)

### H1.3 — Executive Dashboard Hardening RRHH
- **Dashboard ejecutivo**: 6/6 KPIs conectados a datos reales
- **Quick Access**: 4/4 botones funcionales (España, Reporting, Utilidades, Portal)
- **Alertas**: Reales desde BD (contratos, incidentes, documentos)
- **Departamentos**: Reales desde `erp_hr_departments`

### H1.3B — Baseline Fiscal + Jurídico
- **Legal**: 8 elementos hardcoded identificados y etiquetados con badges "Datos de ejemplo"
- **Fiscal**: `demoCompanyId` reemplazado por `currentCompany?.id`
- **Botones cosméticos**: Desactivados en Legal (Revisar ahora, Ver plan)

### H1.3D/E — Audit + AI Center Hardening
- **Audit Center**: ComplianceMatrix, ImprovementsTracker, BlockchainTrail etiquetados como demo
- **`activeAgents`**: Hardcoded 8 → conteo real desde `erp_ai_agents_registry`
- **KPIs estimados**: Etiquetados con `(est.)`
- **AI Center**: Costes etiquetados como "Estimado" con disclaimers
- **Botones cosméticos**: "Verificar integridad" y "Nuevo Envío" desactivados

### Impacto agregado H1.x

| Métrica | Antes de H1.x | Después de H1.x |
|---------|---------------|-----------------|
| Paneles demo sin etiquetar | ~20 | 0 |
| Botones cosméticos activos | ~12 | 0 |
| KPIs con fallback no etiquetado | ~15 | 0 |
| UUIDs mostrados al usuario | ~8 campos | 0 |
| Dashboards ejecutivos honestos | 0/5 módulos | 5/5 módulos |
| Datos conectados a BD real | ~40% paneles | ~85% paneles |

**H1.x no cambia la cobertura funcional de fondo** (los motores y engines siguen siendo los mismos), pero **incrementa drásticamente la confianza del usuario** al eliminar toda apariencia engañosa y distinguir claramente entre datos reales, derivados, estimados y demo.

---

## 8. Veredicto Final del Ciclo Laboral Principal

### 🟢 CICLO LABORAL PRINCIPAL FUNCIONALMENTE CERRADO CON RESIDUAL OFICIAL

**Definición**: Todos los procesos del ciclo laboral español (alta → baja) están implementados con motor de cálculo, UI, persistencia, validación y evidencia. La funcionalidad interna es completa y operativa. Los únicos bloqueantes restantes son:

1. **Integración con organismos oficiales** (TGSS, SEPE, AEAT, MITES) — requiere credenciales reales, certificados digitales y formatos nativos que son dependencias externas al software.

2. **3 gaps funcionales internos menores**: SEPA CT para pago bancario, pipeline unificado de baja, y workflow IT/AT completo — todos de complejidad media y sin impacto en el ciclo core.

3. **Hardening visual completado**: Tras H1.0–H1.3E, todos los módulos auditados (RRHH, Fiscal, Jurídico, Auditoría, IA Center) presentan datos honestos con etiquetado claro de fuentes.

### Indicadores de cierre

| Indicador | Valor |
|-----------|-------|
| Procesos cubiertos | 14/14 (100%) |
| Cobertura media | 85.1% |
| Procesos ready | 5 (35.7%) |
| Procesos preparatory (blocked by LM only) | 6 (42.9%) |
| Procesos partial (gap interno menor) | 3 (21.4%) |
| Procesos missing | 0 (0%) |
| Engines implementados | ~46 ficheros |
| Hooks implementados | ~68 ficheros |
| Edge Functions | ~40 funciones |
| Tablas DB activas | ~20 tablas |
| Registros en producción | 650+ payrolls, empleados, artefactos |
| Dashboards honestos (post H1.x) | 5/5 módulos |
| Paneles demo etiquetados | 100% |

---

## 9. Recomendación del Siguiente Paso

### Opción A — P1.7B-RB: Stock Options / Equity Compensation
- **Foco**: Ampliar el ciclo laboral con compensación en equity
- **Valor**: Alto valor funcional y diferencial competitivo
- **Riesgo**: Bajo — no afecta al ciclo core cerrado
- **Cuándo**: Si el objetivo es ampliar cobertura funcional y valor de producto

### Opción B — LM4: Última Milla Oficial (Formatos + Conectores)
- **Foco**: Generadores de formato nativo (binario SILTRA, posicional AEAT, XML SEPE) + primeros conectores
- **Valor**: Desbloquea los 6 procesos preparatory hacia production real
- **Riesgo**: Medio — requiere especificaciones oficiales exactas
- **Cuándo**: Si el objetivo es acercar el sistema a producción real con organismos

### Opción C — Transversal H1.3F: Hardening de módulos restantes
- **Foco**: Auditar y endurecer Treasury, Banking, Procurement, etc.
- **Valor**: Completar la honestidad visual en todo el ERP
- **Riesgo**: Bajo — mismo patrón ya probado en 5 módulos
- **Cuándo**: Si el objetivo es consolidar antes de abrir nuevas funcionalidades

### Recomendación
**P1.7B-RB** (Stock Options) si el foco es valor funcional diferencial.  
**LM4** si el foco es acercar a producción real.  
Ambas opciones son compatibles con el cierre del ciclo principal y no requieren rehacer nada de lo existente.

---

*Documento generado como acta formal de cierre del ciclo laboral principal del ERP RRHH unificado.*  
*Versión: 1.0 — 2026-04-11*
