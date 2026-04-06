

# Plan: F4 — Obligation Engine en Shared Legal Core

## Objetivo

Extraer tipos e interfaces de obligaciones, plazos y sanciones desde `useHRLegalCompliance` hacia `src/shared/legal/compliance/obligationEngine.ts`, creando funciones puras de dominio (cálculo de plazos, evaluación de riesgo sancionador) que hoy no existen como lógica centralizada. El hook HR sigue funcionando sin cambios en su interfaz pública.

## Análisis del hook actual

`useHRLegalCompliance` (763 líneas) es fundamentalmente una capa de acceso a datos (CRUD Supabase) con helpers UI. No contiene lógica pura de negocio — toda la inteligencia está en la edge function `erp-hr-compliance-monitor` o en RPCs.

### Clasificación de interfaces

| Interfaz | Destino | Razón |
|---|---|---|
| `AdminObligation` | **Shared** → `ObligationRule` | Estructura genérica de obligación legal, reutilizable por Fiscal/Treasury |
| `ObligationDeadline` | **Shared** → `ObligationDeadline` | Plazo de cumplimiento genérico |
| `SanctionRisk` | **Shared** → `SanctionRule` | Tipificación de infracción, no HR-specific |
| `UpcomingDeadline` | **Shared** → `ComputedDeadline` | Resultado de cálculo de proximidad |
| `LegalCommunication` | **HR** | Comunicaciones laborales específicas |
| `CommunicationTemplate` | **HR** | Templates HR |
| `ComplianceChecklist` | **HR** | Checklists HR |
| `SanctionAlert` | **HR** | Alertas con company_id, agents HR/Legal |
| `RiskAssessment` | **HR** | Dashboard summary HR |

### Consumidores detectados (5 componentes)

Todos importan desde `@/hooks/admin/useHRLegalCompliance`:
- `HRLegalComplianceDashboard.tsx`
- `HRObligationsPanel.tsx` (importa `ObligationDeadline`)
- `HRCommunicationsPanel.tsx` (importa `LegalCommunication`)
- `HRSanctionRisksPanel.tsx`
- `HRComplianceChecklistPanel.tsx`

## Acciones

### Accion 1: Crear `src/shared/legal/compliance/obligationEngine.ts`

Tipos reutilizables extraídos + funciones puras nuevas:

```typescript
/** @shared-legal-core — Regla de obligación legal */
export interface ObligationRule {
  id: string;
  jurisdiction: string;
  organism: string;
  modelCode?: string;
  name: string;
  type: string;           // 'declaracion', 'cotizacion', 'informativa', etc.
  periodicity: string;    // 'mensual', 'trimestral', 'anual'
  deadlineDay?: number;
  deadlineMonth?: number;
  deadlineDescription?: string;
  legalReference?: string;
  sanctionType?: string;
  sanctionMin?: number;
  sanctionMax?: number;
  isActive: boolean;
}

/** @shared-legal-core — Plazo de cumplimiento */
export interface ObligationDeadlineInfo {
  obligationId: string;
  periodStart?: string;
  periodEnd?: string;
  deadlineDate: string;
  status: string;
  completedAt?: string;
  notes?: string;
}

/** @shared-legal-core — Regla de sanción */
export interface SanctionRule { ... }

/** @shared-legal-core — Plazo calculado con urgencia */
export interface ComputedDeadline { ... }

// === FUNCIONES PURAS ===

/** Calcula días restantes y nivel de urgencia */
export function computeDeadlineUrgency(deadlineDate: string, referenceDate?: Date): ComputedDeadline

/** Evalúa riesgo sancionador basado en clasificación e importe */
export function evaluateSanctionRisk(rule: SanctionRule, classification: string): { min: number; max: number; severity: LegalRiskLevel }

/** Filtra obligaciones por jurisdicción y tipo */
export function filterObligationsByScope(rules: ObligationRule[], jurisdiction?: string, type?: string): ObligationRule[]

/** Ordena deadlines por urgencia (más próximos primero) */
export function sortDeadlinesByUrgency(deadlines: ComputedDeadline[]): ComputedDeadline[]
```

### Accion 2: Crear `src/shared/legal/compliance/complianceRules.ts`

Constantes de dominio reutilizables:

```typescript
/** Niveles de alerta por días restantes */
export const ALERT_THRESHOLDS = {
  critical: 3,
  urgent: 7,
  alert: 15,
  prealert: 30,
} as const;

/** Mapeo de clasificación LISOS → severity */
export const CLASSIFICATION_SEVERITY: Record<string, LegalRiskLevel> = {
  leve: 'low',
  grave: 'high',
  muy_grave: 'critical',
};
```

### Accion 3: Adaptar `useHRLegalCompliance.ts`

- Importar tipos shared y crear type aliases para backward compatibility:
  ```typescript
  import type { ObligationRule, ObligationDeadlineInfo, SanctionRule } from '@/shared/legal';
  /** @migrated-to-shared — Re-export for backward compatibility */
  export type AdminObligation = ObligationRule & { /* HR-specific DB fields */ };
  ```
- Importar `computeDeadlineUrgency` y `ALERT_THRESHOLDS` para uso interno donde aplique
- **No cambiar** la interfaz pública del hook (return object idéntico)
- **No cambiar** las funciones de fetch/CRUD (siguen usando tablas HR directamente)

### Accion 4: Actualizar barrel `src/shared/legal/index.ts`

Añadir exports del obligation engine y compliance rules.

### Accion 5: Verificar build

`npx tsc --noEmit` para confirmar cero errores.

## Archivos

| Archivo | Acción |
|---|---|
| `src/shared/legal/compliance/obligationEngine.ts` | Crear |
| `src/shared/legal/compliance/complianceRules.ts` | Crear |
| `src/hooks/admin/useHRLegalCompliance.ts` | Modificar (imports + type aliases, sin cambio de interfaz pública) |
| `src/shared/legal/index.ts` | Añadir exports |

## Archivos que NO se tocan

- Los 5 componentes HR consumers — siguen importando desde el hook
- Edge functions (`erp-hr-compliance-monitor`)
- Tablas / migraciones
- `employeeLegalProfileEngine`, topes SS/IRPF
- `validationStateMachine.ts` (ya completado en F3)

## Ownership

- `src/shared/legal/compliance/obligationEngine.ts` → **Shared Legal Core**
- `src/shared/legal/compliance/complianceRules.ts` → **Shared Legal Core**
- `useHRLegalCompliance.ts` → **HR Module** (consumidor del engine)
- Componentes `HR*Panel.tsx` → **HR UI** (sin cambios)

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Type aliases rompen imports de consumidores | Re-exports mantienen nombres originales (`AdminObligation`, `ObligationDeadline`, `SanctionRisk`) |
| Campos DB (`is_active`, `deadline_day`) vs camelCase en shared | Shared usa camelCase; el hook mapea internamente al recibir de Supabase (ya lo hace con `as` casts) |
| Funciones puras no usadas aún por el hook | Son additive; disponibles para F5 y otros módulos (Fiscal/Treasury) |

## Notas para F5

- Integrar `computeDeadlineUrgency` en `fetchUpcomingDeadlines` para enriquecer datos client-side
- Evaluar si `useLegalCompliance` (módulo Jurídico) debe consumir `ObligationRule` en lugar de su propio `ComplianceCheck`
- Migrar `employeeLegalProfileEngine` como siguiente paso del Shared Legal Core
- Considerar si `SanctionAlert` (HR) debería tener una versión shared para alertas cross-module

