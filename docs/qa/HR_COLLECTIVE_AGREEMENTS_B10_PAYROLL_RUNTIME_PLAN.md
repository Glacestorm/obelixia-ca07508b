# B10 — Integración runtime Registry ↔ Nómina (PLAN + B10A entregado)

## Objetivo B10A
Entregar un **resolver puro y preview-only** que evalúa si un convenio del
Registro Maestro (post-B9) es elegible para nómina y produce una
previsualización de conceptos. **No** cambia el resultado real de
nómina.

## Diferencia B10A / B10B / B10C / B10D

| Fase | Hace | NO hace |
|------|------|---------|
| **B10A** ✅ | Resolver puro + preview de conceptos. Tests + docs. | No toca nómina, ni resolver operativo, ni bridge. |
| **B10B** | Comparador puro registry vs operativo (campo a campo). | No aplica nada. |
| **B10C** | Integración en sombra en `useESPayrollBridge` con flag hardcoded `false`. | No cambia output del bridge. |
| **B10D** | Apply real con setting empresa + segunda aprobación + audit + mapping table. | (Fuera de B10A/B/C) |

## Estado de B10A
- Resolver: `src/engines/erp/hr/registryAwareAgreementResolver.ts`
- Tests: `src/__tests__/hr/registry-aware-agreement-resolver.test.ts`
- Pure: sin Supabase/fetch/React/hooks. Sin imports de payroll runtime.

## Reglas de elegibilidad (todas obligatorias)

| # | Regla | Blocker |
|---|-------|---------|
| 1 | agreement existe | `agreement_missing` |
| 2 | version existe | `version_missing` |
| 3 | source existe | `source_missing` |
| 4 | `ready_for_payroll === true` | `not_ready_for_payroll` |
| 5 | `requires_human_review === false` | `requires_human_review` |
| 6 | `data_completeness === 'human_validated'` | `not_human_validated` |
| 7 | `salary_tables_loaded === true` | `salary_tables_not_loaded` |
| 8 | `status ∈ {'vigente','ultraactividad'}` | `agreement_status_not_valid` |
| 9 | `version.is_current === true` | `version_not_current` |
| 10 | `source.source_quality === 'official'` | `source_not_official` |
| 11 | `unresolvedCriticalWarningsCount === 0` | `unresolved_critical_warnings` |
| 12 | `discardedCriticalRowsUnresolvedCount === 0` | `discarded_critical_rows_unresolved` |
| 13 | ≥1 salary table | `no_salary_tables` |
| 14 | ≥1 rule | `no_rules` |

Si cualquier regla falla, el resolver devuelve:

```ts
{ source: 'operative', canUseForPayroll: false, conceptsPreview: [], blockers: [...] }
```

## conceptsPreview generados
Solo importes numéricos `> 0` y finitos, redondeados a 2 decimales.
Source = `registry_salary_table`. Confidence = `row_confidence` si existe.

- `REGISTRY_SALARY_BASE_MONTHLY`
- `REGISTRY_SALARY_BASE_ANNUAL`
- `REGISTRY_EXTRA_PAY_AMOUNT`
- `REGISTRY_PLUS_CONVENIO`
- `REGISTRY_PLUS_TRANSPORT`
- `REGISTRY_PLUS_ANTIGUEDAD`
- `REGISTRY_PLUS_NOCTURNIDAD`
- `REGISTRY_PLUS_FESTIVO`
- `REGISTRY_PLUS_RESPONSABILIDAD`
- `REGISTRY_OTHER_PLUS:<key>` (por cada entrada numérica > 0 en `other_pluses_json`)

Las **rules** se exigen como presencia obligatoria (≥1) pero **no** se
convierten en conceptos automáticos en B10A; quedan para B10B/B10C
como warnings o validaciones cruzadas.

## Matching de salary rows
1. Filtrar por `agreement_id`, `version_id` y `targetYear` si se aporta.
2. Si se aportan `targetGroup` / `targetCategory` / `targetLevel`,
   priorizar coincidencia exacta (case-insensitive, trim).
3. Si no hay match exacto pero hay rows válidas, usar todas y emitir
   warning `no_exact_salary_row_match`.
4. Si no quedan rows, bloquear con `no_salary_tables`.

## Qué NO hace B10A
- ❌ No toca nómina final.
- ❌ No toca `agreementSalaryResolver`.
- ❌ No toca `useESPayrollBridge`.
- ❌ No toca `payslipEngine`, `payrollEngine`, `salaryNormalizer`,
  `agreementSafetyGate`.
- ❌ No toca tabla operativa `erp_hr_collective_agreements`.
- ❌ No crea migraciones, RLS ni edge functions.
- ❌ No introduce flags operativos (B10C lo hará hardcoded `false`).
- ❌ No migra contratos.
- ❌ No activa `persisted_priority_apply`.
- ❌ No desbloquea C3B3C2.

## Riesgos y mitigación
| Riesgo | Mitigación |
|--------|-----------|
| Cálculo registry diverge del operativo | B10B comparador obligatorio antes de B10D |
| Activación accidental | B10A no introduce flags; B10C usará hardcoded `false` |
| Drift de datos entre snapshot y DB real | El resolver es puro: el caller debe pasar snapshots frescos |
| Confusión "ya está en nómina" | Sin UI en B10A; preview solo para tests/B10C |

## Próximas fases
- **B10B**: `agreementResolutionComparator.ts` (puro) — diff por campo
  (salario base, plus convenio, jornada, antigüedad, complementos,
  coste mensual estimado).
- **B10C**: `useESPayrollBridge` ejecuta preview en sombra detrás de
  `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false` (hardcoded). Output
  del bridge **idéntico** al actual.
- **B10D**: tabla `erp_hr_company_agreement_registry_mappings`
  (append-only, RLS por `company_id`), setting empresa, doble
  aprobación + audit ledger.
