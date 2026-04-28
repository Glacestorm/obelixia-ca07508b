## Objetivo

Añadir un panel **read-only** dentro del diálogo "Nueva Nómina" que indique de un vistazo si la nómina del empleado/período está **lista para calcular**, **requiere revisión** o **debe quedar bloqueada**, agregando 18 verificaciones derivadas de las fuentes ya existentes (sin tocar motor, BD, edge functions, flags ni RLS).

## Auditoría previa (read-only) — fuentes confirmadas

| Señal | Fuente real ya disponible en `HRPayrollEntryDialog.tsx` |
|---|---|
| SafeMode activo | `normalizerResult.safeMode` (también `agreementResolutionStatus`) |
| Estado convenio | `agreementSource` (`employee_assignment` / `contract` / `none`), `agreementName`, `agreementConflictDetected`, `normalizerResult.agreementResolutionStatus` |
| Contrato vigente / coherencia | `resolvedContractId`, `contractSalaryParametrization` (ya leído por normalizer) |
| Grupo profesional / cotización | `agreementResolution.trace.professionalGroup`, datos del contrato en normalizer |
| Salario / unidad / pagas | `normalizerResult` (campos `salary_amount_unit`, `salary_periods_per_year`, `extra_payments_prorated`) |
| Incidencias persistidas + conflictos + unmapped + revisión legal | `_incidenciasForWiring` (`useHRPayrollIncidencias`) + `effectiveCasuisticaResult` (`buildEffectiveCasuistica`) |
| Modo apply/preview | `activeEffectiveCasuisticaMode` (`isEffectiveCasuisticaApplyEnabled`) |
| Comunicaciones oficiales bloqueadas | `isRealSubmissionBlocked()` (constante global del proyecto) |

Todo lo necesario ya está calculado en el dialog antes del render del panel derecho. **No hace falta nuevo fetch ni nuevo hook.**

## Cambios propuestos

### 1. Nuevo componente puro read-only

**Archivo:** `src/components/erp/hr/payroll/HRPayrollReadinessGate.tsx`

- 100% presentacional. Sin queries, sin mutations, sin efectos.
- Recibe por props los flags ya derivados en el dialog padre (no recalcula).
- Renderiza:
  - **Badge global**: `READY` (verde) / `REVIEW` (ámbar) / `BLOCKED` (rojo).
  - **Checklist de 18 ítems** agrupados en 4 secciones:
    1. Identidad y contrato (ítems 1–5)
    2. Parametrización salarial (ítems 6–8)
    3. Casuística e incidencias (ítems 9–14)
    4. Cálculo / guardado / oficiales (ítems 15–18)
  - Cada ítem: icono `CheckCircle` / `AlertTriangle` / `XCircle` + etiqueta + tooltip con la regla aplicada.
- Lógica de derivación interna (pura):
  - `BLOCKED` si: SafeMode activo **o** convenio `missing` **o** contrato `incoherent` **o** revisión legal requerida sin reconciliar.
  - `REVIEW` si: convenio `doubtful`/`manual`, conflictos local↔persistido, incidencias unmapped, oficiales pendientes pero bloqueadas por `isRealSubmissionBlocked()`.
  - `READY` en caso contrario.
- Sin acción. Solo informa. El botón Calcular/Guardar del dialog **no se modifica** en este build.

### 2. Inserción en el dialog (cambio mínimo de wiring)

**Archivo:** `src/components/erp/hr/HRPayrollEntryDialog.tsx`

- Importar `HRPayrollReadinessGate`.
- Renderizarlo en la columna izquierda, **encima** de `HRPersistedIncidentsPanel` (línea ~2318), pasándole props derivadas de variables ya existentes:
  ```ts
  <HRPayrollReadinessGate
    employeeId={selectedEmployeeId}
    contractId={resolvedContractId}
    companyId={companyId}
    safeModeActive={!!normalizerResult?.safeMode}
    agreementStatus={
      agreementSource === 'none' ? 'missing'
      : normalizerResult?.agreementResolutionStatus === 'doubtful' ? 'doubtful'
      : agreementConflictDetected ? 'manual'
      : 'clear'
    }
    contractStatus={
      normalizerResult?.contractCoherence ?? 'complete'
    }
    legalReviewRequired={_mappingLegalReview}
    hasPersistedIncidents={(_incidenciasForWiring.payrollIncidents?.length ?? 0) > 0}
    hasLocalPersistedConflicts={(effectiveCasuisticaResult?.conflicts?.length ?? 0) > 0}
    hasUnmappedIncidents={_mappingUnmapped.length > 0}
    hasOfficialPendingFlags={false /* placeholder informativo */}
  />
  ```
- **No** se modifica ningún cálculo ni payload. **No** se reordena el resto del DOM.

### 3. Documentación QA

**Archivo:** `docs/qa/RRHH_PAYROLL_READINESS_GATE.md`

- Objetivo, las 18 verificaciones, fuentes mapeadas, reglas de derivación de los 3 estados, frases seguras para cliente, confirmación de invariantes (no motor, no flags, no oficiales).

## Restricciones (cumplidas por diseño)

- No se toca `simulateES`, `salaryNormalizer.ts`, `contractSalaryParametrization.ts`, `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- No se toca BD, RLS, migraciones, edge functions, CI, dependencias.
- `persisted_priority_apply` permanece **OFF**.
- `isRealSubmissionBlocked() === true` se respeta y se muestra como información.
- No se generan FDI / AFI / DELT@ ni envíos TGSS / SEPE / AEAT / INSS.
- Componente puro read-only: cero side-effects.

## Archivos modificados

- ➕ `src/components/erp/hr/payroll/HRPayrollReadinessGate.tsx` (nuevo, ~250 líneas)
- ✏️ `src/components/erp/hr/HRPayrollEntryDialog.tsx` (1 import + 1 bloque JSX, ~20 líneas)
- ➕ `docs/qa/RRHH_PAYROLL_READINESS_GATE.md` (nuevo)

## Próximo paso si se aprueba

Pasar a modo BUILD y aplicar exactamente los 3 cambios anteriores, sin ampliar el alcance.