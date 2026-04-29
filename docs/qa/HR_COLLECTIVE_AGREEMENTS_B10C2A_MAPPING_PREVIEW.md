# HR — Collective Agreements B10C.2A: Pure Mapping Preview Helper

## Objetivo

Helper puro y determinista que, dado un snapshot de empresa (opcionalmente
contrato/empleado) y una lista de candidatos del Registro Maestro, devuelve
una previsualización de mapping con candidatos puntuados, blockers,
warnings y, como mucho, una recomendación sujeta a confirmación humana.

B10C.2A no aplica nómina, no persiste, no activa flag, no toca el bridge
ni el resolver operativo.

## Diferencia entre B10C.2A / B10C.2B / B10D

| Fase | Qué hace | Qué NO hace |
|---|---|---|
| B10C.2A (esta) | Helper puro de scoring + preview. | No DB, no bridge, no apply, no flag. |
| B10C.2B (futura) | Tabla erp_hr_company_agreement_registry_mappings read-only para registrar propuestas y aprobaciones internas. | No consumida por nómina ni por el bridge. |
| B10D (futura) | Apply real con doble confirmación humana, activación de flag por empresa y observabilidad. | Único punto autorizado a alterar nómina. |

## Inputs

- company.cnae_codes, province_code, autonomous_region, sector,
  legacy_operative_agreement_code (opcional).
- contract.work_center_province y contract.work_center_region prevalecen
  sobre los del company snapshot si están definidos.
- Cada candidate aporta agreement + version + source (tipos importados de
  B10A) y metadatos territoriales.

## Ranking (pesos)

| Señal | Peso | Tipo |
|---|---|---|
| CNAE exacto | 25 | hard |
| Provincia | 15 | hard |
| CCAA | 10 | hard |
| Sector | 8 | soft |
| Legacy operative code | 12 | soft (no decide solo) |
| ready_for_payroll | 10 | hard, blocker si false |
| version current | 8 | hard, blocker si false |
| source official | 7 | hard, blocker si distinto |
| human_validated | 5 | hard, blocker si distinto |
| in force (effective_end_date) | 5 | hard, blocker si vencido |
| name-only match | 0 | warning, no suma |

## Blockers

- not_payroll_ready
- version_not_current
- source_not_official
- not_human_validated
- expired
- requires_human_review
- A nivel global: no_candidates, no_payroll_ready_candidate.

## Warnings

- Por candidato: name_only_match_not_decisive.
- A nivel global: ambiguous_candidates_require_human_selection,
  name_only_match_present.

## payroll_ready

payroll_ready = true exige TODAS las condiciones:

- agreement.ready_for_payroll === true
- agreement.requires_human_review === false
- agreement.data_completeness === 'human_validated'
- version definido y version.is_current === true
- source definido y source.source_quality === 'official'
- No vencido (effective_end_date >= today).

## Recomendación

recommendedCandidateId solo se emite si:

- existen candidatos payroll_ready con blockers.length === 0,
- el top supera al segundo en >= 20 puntos.

En caso contrario:
- recommendedCandidateId undefined,
- warning global ambiguous_candidates_require_human_selection,
- confidence reducido a la mitad (proxy honesto).

## Por qué requiresHumanSelection siempre true

Aun cuando el helper identifique un único candidato dominante, B10C.2A no
sustituye la decisión humana. La activación efectiva de un convenio del
Registry para nómina exige:

1. Aprobación humana registrada (B10C.2B).
2. Doble confirmación + activación de flag por empresa (B10D).

Por contrato, el tipo de retorno fija requiresHumanSelection: true como
literal: ningún consumidor puede asumir auto-selección.

## Determinismo

- Comparaciones textuales normalizadas (trim().toLowerCase()).
- Comparación de fechas ISO yyyy-mm-dd (lexicográfica).
- Orden estable: score desc → blockers asc → registry_agreement_id asc.
- Mismo input ⇒ output deep-equal.

## Qué NO hace B10C.2A

- No toca useESPayrollBridge.
- No toca registryShadowFlag ni registryShadowPreview.
- No toca resolver operativo, salary normalizer, payroll engine, payslip
  engine ni safety gate.
- No toca la tabla operativa erp_hr_collective_agreements.
- No crea tabla mapping (eso es B10C.2B).
- No crea migraciones, RLS ni edge functions.
- No activa HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL.
- No escribe ready_for_payroll.
- No infiere convenio por nombre como verdad jurídica.
- No hace lookup: el caller pasa la lista de candidatos.

## Próxima fase

- B10C.2B: tabla erp_hr_company_agreement_registry_mappings con estados
  draft / pending_review / approved_internal / rejected / superseded,
  append-only, RLS por company_id, trigger que valida invariantes del
  registry en transición a approved_internal. Sin consumo desde nómina.
- B10D: apply real al runtime usando mapping aprobado, con doble
  confirmación humana y activación de flag por empresa.

## Tests asociados

- src/__tests__/hr/registry-agreement-mapping-preview.test.ts
  - Comportamiento: ranking, blockers, warnings, recomendación,
    determinismo, prevalencia work_center_*.
  - Estáticos: ausencia de Supabase / React / hooks / payroll / bridge /
    resolver operativo / DB writes / writes a ready_for_payroll.
