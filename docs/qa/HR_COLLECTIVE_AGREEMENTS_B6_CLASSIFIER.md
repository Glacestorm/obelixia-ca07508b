# HR — Collective Agreements · B6 CNAE / Territory Classifier

**Phase:** B6
**Date:** 2026-04-28
**Scope:** Pure ranking engine. **No payroll, no DB writes, no automatic decision.**
**Status:** ✅ Implemented. **Not connected to payroll.**

---

## 1. Objetivo del clasificador

Dado el CNAE, territorio y características reales de la actividad de
una empresa, devolver una **lista ordenada de candidatos de convenio
colectivo** del Registro Maestro, con razones, warnings y nivel de
confianza informativo.

El clasificador es una **herramienta de soporte a decisión humana**.
No decide. No firma. No toca nómina. No activa
`ready_for_payroll`. El resultado siempre incluye
`noAutomaticDecision: true`.

Public API (`src/engines/erp/hr/collectiveAgreementClassifier.ts`):

| Función | Tipo | Pureza |
|---|---|---|
| `classifyCollectiveAgreementsForCompany(input)` | Principal | Pura |
| `scoreAgreementCandidate(agreement, input)` | Helper | Pura |
| `buildAgreementClassificationWarnings(agreement)` | Helper | Pura |
| `sortAgreementCandidates(candidates)` | Helper | Pura |

---

## 2. Por qué NO decide automáticamente

- Los seeds del Registro Maestro están en `metadata_only`, sin tablas
  salariales, sin URL oficial verificada y con
  `requires_human_review=true`.
- La selección de un convenio aplicable es una **decisión laboral
  responsable**: requiere validación humana firmada (B8) antes de
  alimentar nómina (B9).
- Casos como **pastelería con obrador + tienda + cafetería** no admiten
  decisión algorítmica segura: dependen de la actividad principal
  declarada y del criterio del asesor laboral.
- DORA/NIS2 + buen gobierno de IA exigen explainability + HITL.

Por eso el resultado lleva siempre:

```ts
{
  noAutomaticDecision: true,
  requiresHumanSelection: candidates.length > 1,
}
```

---

## 3. Reglas de scoring (deterministas)

| Señal | Peso |
|---|---|
| CNAE exacto | +50 |
| CNAE prefijo 2 dígitos | +20 |
| Misma provincia | +25 |
| Misma comunidad autónoma | +20 |
| Misma jurisdicción | +15 |
| Convenio estatal como fallback (`ES` para `ES-XX`) | +5 |
| Bonus obrador panadería + nombre coincide | +30 |
| Bonus retail genérico + nombre coincide (sin obrador) | +30 |
| Bonus hostelería con consumo en local | +25 |
| Bonus industria alimentaria amplia | +20 |
| Coincidencia por palabra clave de sector | +8 cada una |
| Calidad oficial | +5 |
| `ready_for_payroll=true` | +5 |

Desempate determinista por `internal_code` ascendente. Mismo input →
mismo output.

Un candidato se descarta si **no tiene match sustantivo** (CNAE o
actividad). Coincidir solo en jurisdicción no es suficiente para
aparecer en la lista.

---

## 4. Casos Baleares cubiertos

Seeds disponibles: `COM-GEN-IB`, `PAN-PAST-IB`, `HOST-IB`,
`IND-ALIM-IB`. Todos `metadata_only`, `ready_for_payroll=false`.

| CNAE / actividad | Primer candidato | Otros | Warning añadido |
|---|---|---|---|
| `1071` / `1072` + obrador | `PAN-PAST-IB` | `IND-ALIM-IB` | `BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION` |
| `4724` (sin señales) | `PAN-PAST-IB` ≈ `COM-GEN-IB` | — | `MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED` |
| `4724` + obrador | `PAN-PAST-IB` | `COM-GEN-IB` | `BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION` |
| `4724` + solo tienda | `COM-GEN-IB` ≥ `PAN-PAST-IB` | — | `RETAIL_WITHOUT_WORKSHOP_REVIEW` |
| `47xx` genérico | `COM-GEN-IB` | — | — |
| `47xx` + obrador | `PAN-PAST-IB` se añade | `COM-GEN-IB` | `BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION` |
| `55` / `56` o consumo en local | `HOST-IB` | — | `TAKE_AWAY_VS_ON_PREMISE_REVIEW_REQUIRED` si aplica |
| `10` + fabricación amplia | `IND-ALIM-IB` | — | — |
| Obrador + consumo en local | `PAN-PAST-IB` + `HOST-IB` | — | `MIXED_ACTIVITY_BAKERY_AND_HOSPITALITY` |

En todos los casos, cada candidato lleva además los warnings de
seguridad estructural:

- `AGREEMENT_NOT_READY_FOR_PAYROLL`
- `SALARY_TABLES_NOT_LOADED`
- `SOURCE_NOT_OFFICIALLY_VALIDATED`
- `METADATA_ONLY`

---

## 5. Catálogo de warnings

| Código | Significado |
|---|---|
| `AGREEMENT_NOT_READY_FOR_PAYROLL` | Convenio no apto para nómina automática. |
| `SALARY_TABLES_NOT_LOADED` | Faltan tablas salariales oficiales. |
| `SOURCE_NOT_OFFICIALLY_VALIDATED` | Fuente no marcada como oficial. |
| `METADATA_ONLY` | Solo metadatos, sin parseado completo. |
| `BAKERY_WORKSHOP_REQUIRES_HUMAN_VALIDATION` | Obrador detectado: validar manualmente. |
| `MIXED_ACTIVITY_BAKERY_AND_HOSPITALITY` | Obrador + consumo en local. |
| `TAKE_AWAY_VS_ON_PREMISE_REVIEW_REQUIRED` | Hostelería sin consumo declarado. |
| `RETAIL_WITHOUT_WORKSHOP_REVIEW` | Retail sin obrador: revisar comercio vs panadería. |
| `JURISDICTION_FALLBACK_NATIONAL` | Se usó convenio estatal por falta de regional. |
| `MULTIPLE_CANDIDATES_HUMAN_SELECTION_REQUIRED` | Selección humana obligatoria. |
| `NO_CNAE_MATCH` | Ningún convenio cubre el CNAE. |
| `NO_TERRITORIAL_MATCH` | Ningún convenio cubre el territorio. |
| `NO_CANDIDATES_FOUND` | Sin candidatos viables. |

---

## 6. Cómo se usará en futura UI

Pantalla de **alta de empresa / asignación de convenio**:

1. Operador introduce CNAE + provincia + características de actividad.
2. La UI llama al data layer (`getCollectiveAgreementsByCnae`) y pasa
   los resultados al clasificador.
3. La UI muestra los candidatos ordenados con razones y warnings.
4. La UI **nunca** propone "Aceptar y activar nómina" — solo
   "Asignar como propuesta para revisión humana".
5. Cualquier elevación a `ready_for_payroll` requerirá la validación
   humana firmada de B8 + parser oficial de tablas (B7).

---

## 7. Limitaciones conocidas

- Los seeds Baleares siguen sin URL oficial validada → todo cae bajo
  `pending_official_validation`.
- No hay convenios provinciales (Mallorca / Menorca / Eivissa-Formentera)
  modelados aún. Si aparecen, prevalecerían por mayor especificidad.
- El clasificador no consume `effective_start_date` /
  `effective_end_date`: la vigencia debe verificarse aguas abajo.
- No clasifica convenios de empresa (REGCON 9xxxxxxx) frente a sectoriales
  cuando ambos están presentes — pendiente de B7/B8.

---

## 8. Verificación

```bash
bunx vitest run src/__tests__/hr/collective-agreements-classifier.test.ts --pool=forks
```

Esperado: **22 passed**.

Suite completa B1-B6:

```bash
bunx vitest run \
  src/__tests__/hr/collective-agreements-classifier.test.ts \
  src/__tests__/hr/collective-agreements-data-layer.test.ts \
  src/__tests__/hr/collective-agreements-importer.test.ts \
  src/__tests__/hr/collective-agreements-registry-schema.test.ts \
  src/__tests__/hr/collective-agreements-registry-seed.test.ts \
  src/__tests__/hr/agreement-safety-gate.test.ts \
  src/__tests__/hr/agreement-salary-resolver-gate.test.ts \
  src/__tests__/hr/payroll-bridge-agreement-safety.test.ts \
  src/__tests__/hr/payroll-safe-mode-agreement-warnings.test.tsx \
  --pool=forks
```

Esperado: **126 passed**.

---

## 9. Qué NO se tocó

- ❌ `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver`.
- ❌ `useESPayrollBridge`.
- ❌ Tabla operativa `erp_hr_collective_agreements`.
- ❌ Registro Maestro DB (sin escrituras).
- ❌ RLS, migraciones, edge functions.
- ❌ Importer writer (B5B), parser tablas (B7).
- ❌ Fixtures Carlos Ruiz, flags, Command Center, navegación HR.
- ❌ Ningún seed cambió `ready_for_payroll` — sigue `false` en los 4
  convenios reforzados.

---

## 10. Próximas fases

- **B5B** — Edge function que consume el importer y persiste en
  `_registry` con upsert idempotente.
- **B7** — Parser de tablas salariales (PDF/HTML BOIB/BOE/REGCON) con
  hash + versionado.
- **B8** — Workflow de validación humana firmada (asesor laboral).
- **B9** — Integración completa: clasificador propone, humano valida,
  resolver consume registry y nómina automática se activa con todas
  las condiciones cumplidas.