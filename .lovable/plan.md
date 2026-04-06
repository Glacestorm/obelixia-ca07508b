

# Plan: F1 — Crear `src/shared/legal/types.ts`

## Análisis de tipos existentes

Tras inspección exhaustiva, hay **3 categorías claras** de tipos repetidos across the codebase:

### Tipos que se repiten idénticamente (candidatos a Shared Core)

| Tipo | Repetido en | Veces |
|---|---|---|
| `RiskLevel = 'low' \| 'medium' \| 'high' \| 'critical'` | 12+ hooks (legal, HR, support, compliance, churn) | 12 |
| `ModuleType = 'hr' \| 'fiscal' \| 'treasury' \| ...` | `useLegalValidationGateway`, `Enhanced`, barrel exports | 3 |
| `ValidationStatus` (pending/approved/rejected/blocked) | `useSettlements`, `Gateway`, `GatewayEnhanced` | 3 (variantes) |
| `LegalContext` (entityId, jurisdictions, etc.) | `useLegalAdvisor`, `useLegalMatters` | 2 (distintas) |
| `LegalJurisdiction` (code, name, country) | `useLegalAdvisor` | 1 pero universal |

### Tipos que deben quedarse en su módulo (NO shared)
- `LegalCommunication`, `LegalContract`, `LegalClause` → HR-specific
- `LegalTemplate` (HR) → HR document generation
- `SmartContract`, `CLMContract` → Legal UI workflows
- `LegalEntity`, `IPAsset`, `Dispute` → Legal Entity Management UI
- `LegalValidation`, `LegalValidationContext` → AI Hybrid specific

### Tipos ambiguos (re-export en F2+)
- `LegalProcedure` → Workflow, no core
- `ComplianceReport` → Could be shared later
- `RiskAssessment` → 2 variantes (legal vs generic)

## Acciones

### Acción 1: Crear directorio y tipos base

**Archivo**: `src/shared/legal/types.ts`

Contenido:
- `LegalRiskLevel` — tipo unión reutilizable (actualmente repetido 12+ veces como inline literal)
- `LegalValidationStatus` — máquina de estados canónica (superset de las 3 variantes existentes)
- `LegalModuleType` — enum de módulos ERP que interactúan con legal
- `LegalJurisdiction` — jurisdicción base reutilizable
- `LegalReference` — referencia a artículo/ley (base legal citations)
- `LegalContext` — contexto mínimo compartido (entityId, entityType, jurisdictions)
- `LegalValidationResult` — resultado de validación genérico

Cada tipo llevará JSDoc con ownership (`@shared-legal-core`) y referencia a los consumidores actuales.

### Acción 2: Crear barrel export

**Archivo**: `src/shared/legal/index.ts`

Simple re-export de `types.ts` para facilitar imports futuros.

### Acción 3: NO se modifican consumidores existentes

En F1 los tipos son **additive-only**. Los hooks existentes siguen usando sus propios tipos inline. La migración de imports se hará en F2+ de forma incremental con re-exports.

## Ownership de tipos

| Tipo en `shared/legal/types.ts` | Ownership | Consumidores futuros |
|---|---|---|
| `LegalRiskLevel` | Shared Core | Todos los módulos con risk_level |
| `LegalValidationStatus` | Shared Core | Settlements, Payroll, Offboarding, Gateway |
| `LegalModuleType` | Shared Core | Gateway, Orchestrator, Procedures |
| `LegalJurisdiction` | Shared Core | Advisor, Gateway, Procedures |
| `LegalReference` | Shared Core | Knowledge, Advisor, bridgeEngine |
| `LegalContext` | Shared Core | Advisor, Matters, Agent context |
| `LegalValidationResult` | Shared Core | Gateway, AI validator, HR compliance |

## Garantía de no ruptura

- **Zero imports modificados** — ningún archivo existente cambia
- **Zero re-exports** en F1 — solo se crean tipos nuevos
- **Zero edge functions tocadas**
- **Zero tablas modificadas**
- Los tipos existentes en hooks seguirán funcionando tal cual

## Notas para F2

F2 debería:
1. Migrar `legalReferenceResolver.ts` a `src/shared/legal/knowledge/`
2. Hacer que `useLegalAdvisor` re-exporte `LegalJurisdiction` desde shared
3. Hacer que `useLegalValidationGateway` re-exporte `ValidationRiskLevel` y `ModuleType` desde shared
4. Cada migración: cambiar la fuente, añadir re-export en ubicación original

## Archivos a crear

| Archivo | Acción |
|---|---|
| `src/shared/legal/types.ts` | Crear (~120 líneas) |
| `src/shared/legal/index.ts` | Crear (~5 líneas) |

## Archivos que NO se tocan

Todo lo existente permanece intacto.

