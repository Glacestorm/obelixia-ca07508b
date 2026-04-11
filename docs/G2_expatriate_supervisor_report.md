# G2.1 — Expatriate Supervisor Report

## Resumen Ejecutivo

G2.1 implementa la fase 1 del sistema de inteligencia para expatriados:
- **ExpatriateSupervisor**: motor orquestador que detecta triggers, resuelve corredor, carga pack, clasifica y propaga impactos
- **9 Knowledge Packs** de fase 1 como TypeScript constants
- **ReviewTriggerEngine** extendido con 4 niveles de severidad
- **MobilityImpactResolver** para propagación cross-module
- **UI integrada**: nueva tab "Corredor" + badges en clasificación + preflight enriquecido

## Archivos Creados

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `src/engines/erp/hr/corridorKnowledgePacks.ts` | ~450 | 9 packs fase 1 + registry + lookup |
| `src/engines/erp/hr/expatriateSupervisor.ts` | ~230 | Motor supervisor central |
| `src/engines/erp/hr/reviewTriggerEngine.ts` | ~170 | Motor de triggers extendido |
| `src/engines/erp/hr/mobilityImpactResolver.ts` | ~140 | Resolver de impacto cross-module |
| `src/hooks/erp/hr/useExpatriateSupervisor.ts` | ~18 | Hook reactivo para UI |
| `src/components/erp/hr/mobility/MobilityCorridorPanel.tsx` | ~260 | Panel visual de corredor |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/hooks/erp/hr/useExpatriateCase.ts` | +supervisor field, invoke evaluateExpatriateSupervisor |
| `src/components/erp/hr/mobility/MobilityAssignmentDetail.tsx` | +tab "Corredor" (8 tabs total), import MobilityCorridorPanel |
| `src/components/erp/hr/mobility/MobilityClassificationPanel.tsx` | +corridor badge, pack version, freshness indicator |
| `src/components/erp/hr/mobility/index.ts` | +export MobilityCorridorPanel |
| `src/engines/erp/hr/payrollPreflightEngine.ts` | +corridor fields en MobilityPreflightData, show corridor/confidence/stale en substep |

## Flujo del Supervisor

```
MobilityAssignment
  │
  ├─ 1. detectActivationTriggers() → 10 signals
  │
  ├─ 2. getCorridorPack(origin, dest) → pack | null
  │
  ├─ 3. classifyMobilityCase() → MobilityClassification (existing engine)
  │
  ├─ 4. evaluateInternationalTaxImpact() → InternationalTaxImpact (existing engine)
  │
  ├─ 5. buildExtendedReviewTriggers() → ExtendedReviewTrigger[] (4 severities)
  │
  ├─ 6. resolveCrossModuleImpact() → CrossModuleImpact (6 modules)
  │
  ├─ 7. deriveOverallSupportLevel() → SupportLevel
  │
  └─ 8. SupervisorResult (full classification + impacts + review gates)
```

## 10 Activation Triggers

| # | Signal | Campo |
|---|--------|-------|
| 1 | Country mismatch | `home_country_code ≠ host_country_code` |
| 2 | Assignment type international | `assignment_type ∈ {long_term, short_term, commuter, permanent_transfer, rotational}` |
| 3 | Split payroll | `split_payroll === true` |
| 4 | Shadow payroll | `shadow_payroll === true` |
| 5 | Tax residence mismatch | `tax_residence_country ≠ home_country_code` |
| 6 | SS regime mismatch | `ss_regime_country ≠ home_country_code` |
| 7 | PE risk | `pe_risk_flag === true` |
| 8 | Days in host > 30 | `days_in_host > 30` |
| 9 | Work permit signal | `metadata.work_permit_required` |
| 10 | Equity+mobility overlap | `metadata.equity_grants_active` |

## Automation Boundary

| Zona | Qué incluye | Automatización |
|------|-------------|----------------|
| 🟢 Verde | Clasificación SS, Art.7.p eligibilidad, CDI lookup, risk score, doc checklist | Automática |
| 🟡 Amarillo | Residencia fiscal limítrofe, split payroll, extensión >24m, pack stale | Asistida — requiere revisión |
| 🔴 Rojo | PE risk, cálculo fiscal local destino, equity fiscal overlap, ley laboral local | Revisión humana obligatoria |
| ⬛ Fuera alcance | Sin convenio SS + sin CDI + triggers críticos | Derivación externa |

## Estado BEFORE/AFTER

| Métrica | Antes (P1.7B-RA) | Después (G2.1) |
|---------|-------------------|----------------|
| Activación | Manual (usuario crea asignación) | Automática (10 triggers) |
| Knowledge packs | Hardcoded en constantes de engine | 9 packs estructurados con version/confidence/freshness |
| Corredor específico | ❌ No existía | ✅ ES↔FR/PT/DE/IT/AD/GB/CH/US/MX |
| Propagación cross-module | ❌ No existía | ✅ HR/Fiscal/Legal/Audit/IA Center/Preflight |
| Severidades de review | 4 (critical/high/medium/low) | 4 extendidas (critical_review_required/review_required/warning/info) |
| Tabs en detalle | 7 | 8 (+Corredor) |
| Preflight info | Resumen genérico | Corredor + freshness + confidence + CTA expediente |
| Trazabilidad | Sin snapshot | Pack version + classification snapshot + evidence list |
| Equity overlap | ❌ No detectado | ✅ Eleva revisión fiscal cuando detectado |

## Current vs Stale vs Review-Required Corridor Packs

| Corredor | Versión | Status | Confianza | Última Revisión |
|----------|---------|--------|-----------|-----------------|
| ES↔FR | 1.0.0 | `current` | 90% | 2026-04-01 |
| ES↔PT | 1.0.0 | `current` | 92% | 2026-04-01 |
| ES↔DE | 1.0.0 | `current` | 91% | 2026-04-01 |
| ES↔IT | 1.0.0 | `current` | 89% | 2026-04-01 |
| ES↔AD | 1.0.0 | `current` | 85% | 2026-04-01 |
| ES↔GB | 1.0.0 | `current` | 87% | 2026-04-01 |
| ES↔CH | 1.0.0 | `current` | 88% | 2026-04-01 |
| ES↔US | 1.0.0 | `current` | 82% | 2026-04-01 |
| ES↔MX | 1.0.0 | `current` | 80% | 2026-04-01 |

**Nota**: Todos los packs son `current` al momento de creación. El status `stale` se activa tras 90 días sin revisión.
El status `review_required` se activa cuando un cambio normativo conocido no ha sido incorporado al pack.

**Nota de fase**: Los packs en TypeScript constants son solución de fase 1. El modelo final de administración normativa
se implementará en fases posteriores con almacenamiento en base de datos, versionado inmutable, y ciclos de revisión automáticos.

## Siguiente Paso Recomendado

**G2.2** — Implementar:
1. Knowledge pack administration UI (CRUD de packs desde interfaz)
2. Freshness monitoring automático (alerta cuando pack > 90 días)
3. Packs fase 2 (bilateral restantes)
4. Edge function `expatriate-supervisor` para evaluación server-side
