# Registro Maestro de Convenios Colectivos — Schema B1

> Fase **B1** del PLAN "Registro Maestro de Convenios Colectivos de España".
> Solo schema. Sin importer. Sin activación para nómina. Sin tocar fixtures
> ni catálogo TS legacy.

## Propósito

Crear la base estructural en DB para incorporar, versionar, auditar y
consultar todos los convenios colectivos vigentes de España desde fuentes
oficiales (REGCON / BOE / BOIB / DOGC / DOGV / BOJA / BOCM / BOP) o
verificables. Sustituye progresivamente al catálogo estático
`src/data/hr/collectiveAgreementsCatalog.ts`, que se mantiene como
**fallback legacy de solo lectura** hasta la fase B10.

## Coexistencia con la tabla operativa preexistente

Ya existía en DB la tabla `erp_hr_collective_agreements` con **106 filas
reales** y un schema operativo per-empresa
(`code/name/salary_tables jsonb/company_id/legal_entity_id/work_center_id`).
Esa tabla **no se toca**. El Registro Maestro vive en paralelo con sufijo
`_registry`:

| Capa | Tabla | Naturaleza |
|------|-------|-----------|
| Operativa per-empresa | `erp_hr_collective_agreements` | Convenio aplicable a la empresa, salario en JSONB, RLS por empresa. Intacto. |
| Catálogo legal (B1) | `erp_hr_collective_agreements_registry` | Catálogo nacional, lectura pública autenticada. Nuevo. |

La unificación entre ambas capas se planifica en una fase Bx posterior y
queda **fuera de alcance de B1**.

## Tablas creadas

1. `erp_hr_collective_agreements_registry` — registro maestro.
2. `erp_hr_collective_agreements_registry_versions` — versionado por
   revisión salarial / corrección / prórroga / denuncia / sustitución.
3. `erp_hr_collective_agreements_registry_salary_tables` — tablas
   salariales por año, grupo profesional, categoría y nivel + pluses.
4. `erp_hr_collective_agreements_registry_rules` — reglas no salariales
   (jornada, vacaciones, pagas, antigüedad, IT, disciplinario, etc.).
5. `erp_hr_collective_agreements_registry_sources` — fuentes oficiales y
   secundarias con `document_hash` para detectar cambios.
6. `erp_hr_collective_agreements_registry_import_runs` — auditoría de
   ejecuciones del futuro importer (B5+).

## Invariantes legales (trigger defensivo)

`trg_erp_hr_car_enforce_ready_for_payroll` impide marcar un convenio como
apto para nómina salvo que se cumplan TODAS estas condiciones:

- `salary_tables_loaded = true`
- `requires_human_review = false`
- `source_quality = 'official'`
- `data_completeness = 'human_validated'`
- `status ∈ ('vigente', 'ultraactividad')`

Mientras `ready_for_payroll = false`, el trigger fuerza
`official_submission_blocked = true` automáticamente.

## Constraints adicionales

- Enums textuales con CHECK para `scope_type`, `status`, `source_quality`,
  `data_completeness`, `change_type`, `rule_type`, `source_type` y
  `import_runs.status`.
- `internal_code` único en el registro maestro.
- Índice único parcial: una sola versión `is_current = true` por
  convenio.
- Índices de búsqueda: GIN sobre `cnae_codes`, trigram sobre
  `official_name`, B-tree sobre `province_code`, `autonomous_region`,
  `status`, `effective_end_date`.

## RLS

- Lectura del catálogo (5 tablas): permitida a `authenticated` (los
  convenios son datos legales públicos).
- Lectura de `import_runs`: solo `superadmin` o `admin` vía
  `public.has_role`.
- Escritura: ninguna política para `authenticated`. La inserción y
  actualización quedan reservadas al `service_role` (importer y
  administradores del backend).

## Por qué no se usa TS como fuente de verdad

- Imposible mantener manualmente ~5.000 convenios estatales,
  autonómicos, provinciales, de empresa y de grupo.
- Sin versionado, sin hash de documento, sin auditoría de cambios.
- Sin estados de calidad: cualquier dato del TS se trata hoy como
  "verdad" sin diferenciar oficial vs secundario, ni completo vs
  metadatos.
- Sin bloqueo automático para nómina: un convenio incompleto en TS
  podría alimentar cálculos reales sin advertencia.

## Por qué ningún convenio incompleto puede alimentar nómina

El trigger defensivo bloquea la activación. Aunque un proceso (manual o
importer) intente marcar `ready_for_payroll = true`, la operación falla
con `check_violation` si falta cualquier invariante. Es el único punto
que controla la elevación de estado, y es a nivel DB, no aplicación.

## Fases siguientes

- **B2** — seed inicial: migrar entradas del catálogo TS a registry como
  `legacy_static · metadata_only`. Añadir Baleares (`COM-GEN-IB`,
  `PAN-PAST-IB`, `HOST-IB`).
- **B3** — data layer DB-first con fallback al catálogo TS.
- **B4** — guard `ready_for_payroll` en motores de nómina.
- **B5** — importer Fase 1 (metadata) BOE estatales.
- **B6** — clasificación CNAE/territorio (orientativa).
- **B7** — descarga + hash + parser por boletín.
- **B8** — workflow de validación humana.
- **B9** — detección de faltantes y alertas.
- **B10** — deprecación del catálogo TS legacy.

## Tests asociados

- `src/__tests__/hr/collective-agreements-registry-schema.test.ts` —
  contrato de tipos sobre las 6 tablas y verificación de coexistencia
  con la tabla operativa legacy.

## Confirmación de invariantes B1

- ✅ Sin tocar nómina.
- ✅ Sin importar convenios reales.
- ✅ Sin activar `ready_for_payroll` para ningún convenio.
- ✅ Sin tocar el catálogo TS.
- ✅ Sin tocar edge functions.
- ✅ Sin tocar fixtures Carlos Ruiz.
- ✅ Sin tocar la tabla operativa preexistente ni sus 106 filas.
- ✅ `persisted_priority_apply` OFF, `C3B3C2` BLOQUEADA, Command Center
  flag OFF (sin cambios).