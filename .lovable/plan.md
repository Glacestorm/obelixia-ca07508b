

# Plan: F5 — Extraer Reglas Legales Reutilizables al Shared Legal Core

## Objetivo

Centralizar las constantes legales reutilizables (topes SS, tipos cotización, reglas IRPF) que hoy están duplicadas entre `employeeLegalProfileEngine` y `ss-contributions.ts`, creando un single source of truth en el Shared Legal Core. El engine y el payroll rules pasan a ser consumidores.

## Análisis de duplicación actual

Hay **duplicación real** de constantes entre dos archivos:

| Constante | `employeeLegalProfileEngine.ts` | `ss-contributions.ts` | Diferencias |
|---|---|---|---|
| SS Group Bases | `SS_GROUP_BASES_2026` (con label + max) | `SS_GROUP_MIN_BASES_2026` (solo min) | Estructura diferente, valores iguales |
| SS Base Max | Embebido en `SS_GROUP_BASES_2026[*].maxMensual` | `SS_BASE_MAX_2026 = 5101.20` | Mismo valor |
| SS Rates | `SS_RATES_2026` (español keys) | `SS_RATES_2026` (english keys) | Mismos valores, keys diferentes |

Además, `contractTypeEngine.ts` contiene el catálogo de contratos RD — este NO se mueve (es HR-specific, no reutilizable por Fiscal/Treasury).

## Reglas a extraer

### 1. Topes SS por grupo de cotización (LGSS Art. 148 / RDL 3/2026)
- Bases mínimas y máximas por grupo 1-11
- Base máxima general
- Labels de grupo

### 2. Tipos de cotización SS (RDL 3/2026)
- CC, desempleo (indefinido/temporal), FP, FOGASA, MEI
- Con desglose empresa/trabajador/total

### 3. Reglas IRPF reutilizables
- Tipo mínimo 2% contrato < 1 año (RIRPF Art. 86.2)
- Regla Art. 88.5 (tipo voluntario ≥ legal)

Estas son constantes normativas puras, sin lógica de negocio HR.

## Acciones

### Accion 1: Crear `src/shared/legal/rules/ssRules2026.ts`

Constantes canónicas de SS 2026:

```typescript
/** Topes de bases de cotización por grupo (LGSS Art. 148, RDL 3/2026) */
export const SS_GROUP_BASES_2026: Record<number, {
  minMensual: number;
  maxMensual: number;
  label: string;
  isDailyBase: boolean;
}>

/** Base máxima general 2026 */
export const SS_BASE_MAX_2026 = 5101.20;

/** Tipos de cotización SS 2026 (RDL 3/2026) */
export const SS_CONTRIBUTION_RATES_2026: {
  contingenciasComunes: { empresa: number; trabajador: number; total: number };
  desempleoIndefinido: ...;
  desempleoTemporal: ...;
  formacionProfesional: ...;
  fogasa: ...;
  mei: ...;
}
```

### Accion 2: Crear `src/shared/legal/rules/irpfRules.ts`

Constantes IRPF reutilizables:

```typescript
/** Tipo mínimo IRPF contrato < 1 año (RIRPF Art. 86.2) */
export const IRPF_MINIMUM_RATE_SHORT_CONTRACT = 2;

/** Aplica regla Art. 88.5: tipo efectivo = max(legal, solicitado) */
export function computeEffectiveIRPF(legalRate: number, requestedRate: number): number
```

### Accion 3: Adaptar `employeeLegalProfileEngine.ts`

- Eliminar `SS_GROUP_BASES_2026` y `SS_RATES_2026` locales
- Importar desde `@/shared/legal/rules/ssRules2026`
- Adaptar acceso (el shared usa keys numéricas vs strings actuales — mapear internamente)
- Importar `IRPF_MINIMUM_RATE_SHORT_CONTRACT` donde hoy hay `2` hardcoded

### Accion 4: Adaptar `ss-contributions.ts`

- Eliminar `SS_BASE_MAX_2026`, `SS_GROUP_MIN_BASES_2026`, `SS_RATES_2026` locales
- Importar desde `@/shared/legal/rules/ssRules2026`
- Mantener la interfaz pública idéntica (`calculateSSContributions`, `SSInput`, `SSResult`)

### Accion 5: Actualizar barrel `src/shared/legal/index.ts`

Añadir exports de las rules.

### Accion 6: Actualizar tests existentes

Los tests en `ssContributions.test.ts` deben seguir pasando sin cambios (importan desde `ss-contributions.ts` que re-exportará o usará los shared values). Verificar que los 3 test suites (SS, IT, Garnishment) siguen verdes.

### Accion 7: Verificar build

`npx tsc --noEmit` + `npx vitest run` para confirmar cero regresiones.

## Archivos

| Archivo | Acción |
|---|---|
| `src/shared/legal/rules/ssRules2026.ts` | Crear |
| `src/shared/legal/rules/irpfRules.ts` | Crear |
| `src/engines/erp/hr/employeeLegalProfileEngine.ts` | Modificar (eliminar constantes locales, importar shared) |
| `src/lib/hr/payroll/rules/ss-contributions.ts` | Modificar (eliminar constantes locales, importar shared) |
| `src/shared/legal/index.ts` | Añadir exports |

## Archivos que NO se tocan

- `contractTypeEngine.ts` — catálogo HR-specific, no reutilizable
- `useEmployeeLegalProfile.ts` — hook de persistencia, sin cambios
- `useAgentEmployeeContext.ts` — consumidor AI, sin cambios
- Edge functions — fuera de alcance
- Tablas / migraciones — sin cambios
- Tests existentes — deben pasar sin modificación (misma interfaz pública)

## Ownership

- `src/shared/legal/rules/ssRules2026.ts` → **Shared Legal Core**
- `src/shared/legal/rules/irpfRules.ts` → **Shared Legal Core**
- `employeeLegalProfileEngine.ts` → **HR Engine** (consumidor)
- `ss-contributions.ts` → **HR Payroll** (consumidor)
- `contractTypeEngine.ts` → **HR Engine** (no se mueve)

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Keys string (`'1'`) vs numeric (`1`) en SS_GROUP_BASES | Shared usa numeric (correcto); engine adapta con `parseInt` o `String()` — cambio aislado |
| Tests rompen por cambio de import source | Los tests importan desde `ss-contributions.ts` que sigue exportando los mismos symbols |
| Engine pierde exports que alguien importa directamente | `SS_GROUP_BASES_2026` y `SS_RATES_2026` se re-exportan desde el engine para backward compat |

## Notas para F6

- Evaluar si `contractTypeEngine` debería migrar parcialmente (catálogo de indemnizaciones es cross-module para Legal/Fiscal)
- Considerar versionado de reglas (2026 → 2027) con pattern `ssRules{YEAR}.ts`
- Integrar reglas shared en edge function `erp-hr-compliance-monitor` cuando se refactorice

