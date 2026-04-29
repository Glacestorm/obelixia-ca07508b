# HR — Collective Agreements B10C: Shadow Bridge Registry Preview (flag OFF)

## Objetivo

Integrar en `useESPayrollBridge` un canal de **shadow preview** que, bajo
un flag hardcoded apagado, podría calcular en paralelo el preview registry
(B10A) y el comparador operativo-vs-registry (B10B), sin alterar el
resultado final de nómina.

B10C **no** aplica registry, **no** modifica conceptos, **no** escribe en
base de datos, **no** crea mapping, **no** desbloquea persisted priority y
**no** toca C3B3C2.

## Punto de integración

Archivo: `src/hooks/erp/hr/useESPayrollBridge.ts`.

- **Imports**: `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` y
  `buildRegistryAgreementShadowPreview` añadidos como imports estáticos.
- **Bloque shadow**: insertado **inmediatamente después** de la resolución
  operativa de convenio (`salaryResolution` + `__agreement_trace`) y
  **antes** del bloque "Build flex remuneration".
- Todo el bloque vive dentro de:

  ```ts
  if ((HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL as unknown as boolean) === true) { ... }
  ```

- Como la constante es `false` y la comparación es estricta, el bloque es
  **dead code en runtime** y el motor jamás lo evalúa.

## Flag hardcoded

`src/engines/erp/hr/registryShadowFlag.ts`:

```ts
export const HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL = false;
```

- Sin `process.env`, `import.meta.env`, `localStorage`.
- Sin Supabase, sin fetch, sin DB, sin CMS, sin remote flag.
- Cambiar el valor exige PR explícito + revisión.

## Helper shadow puro

`src/engines/erp/hr/registryShadowPreview.ts`:

- Pure: sin Supabase, sin fetch, sin React, sin hooks, sin DB.
- Solo importa B10A (`resolveRegistryAgreementPreview`) y B10B
  (`compareOperativeVsRegistryAgreementResolution`) y la flag.
- Firma:

  ```ts
  buildRegistryAgreementShadowPreview(
    inputs: RegistryShadowInputs,
    options?: { enabledOverrideForTests?: boolean },
  ): RegistryShadowResult
  ```

- Comportamiento:
  - flag real `false` y sin override → `{ enabled:false, reason:'flag_off' }`,
    **sin** invocar B10A ni B10B.
  - flag real `false` + `enabledOverrideForTests:true` y sin inputs registry
    mínimos → `{ enabled:false, reason:'no_registry_input' }`.
  - habilitado con inputs válidos → `{ enabled:true, reason:'computed',
    preview, comparison }`.
- Nunca hace lookup, nunca infiere por CNAE ni nombre, nunca escribe.

## Qué se adjunta en `__registry_shadow`

Cuando (y solo cuando) el flag se activase, el bridge adjunta el resultado
como **metadata oculta** en `salaryResolution`:

```ts
(salaryResolution as any).__registry_shadow = shadow;
```

- Es **metadata-only**: el motor de nómina (`calculateESPayroll`,
  construcción de `lines`/`summary`/`validations`) **no lee** esta
  propiedad.
- Verificado por test estático: la única ocurrencia textual de
  `__registry_shadow` en el bridge es la asignación dentro del bloque
  guardado.
- Como el flag está en `false`, el campo nunca se asigna en producción.

## Qué NO hace B10C

- ❌ No usa registry como fuente final de nómina.
- ❌ No cambia salary base, plus convenio, mejora voluntaria, conceptos,
  `lines`, `summary`, `validations` ni persistencia.
- ❌ No escribe en base de datos (sin `.insert`, `.update`, `.delete`,
  `.from` nuevos en el bridge dentro del bloque B10C).
- ❌ No crea tablas, ni RLS, ni edge functions, ni migraciones.
- ❌ No crea mapping empresa↔convenio_registry (queda para B10D).
- ❌ No infiere convenio por CNAE ni por nombre.
- ❌ No toca `ready_for_payroll` ni el resolver operativo.
- ❌ No toca la tabla operativa `erp_hr_collective_agreements`.
- ❌ No activa `persisted_priority_apply` ni desbloquea C3B3C2.
- ❌ No activa B10D.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Coste runtime aunque flag=false | Guard con const literal `false` ⇒ dead code; tree-shaking lo elimina o, en su defecto, evaluación O(1). |
| Lectura accidental de `__registry_shadow` | Test estático limita la ocurrencia textual a la única asignación; los reads de la propiedad no existen en otras partes del archivo. |
| Drift de output al cambiar el flag | Helper es puro y `salaryResolution` operativo no se modifica; metadata-only por contrato. |
| Mapping accidental | Sin mapping en B10C: helper retorna `no_registry_input` mientras los registry inputs no se inyecten. |
| Override de tests filtrándose a producción | `enabledOverrideForTests` no modifica el flag exportado; solo afecta a la llamada del helper en la que se pasa explícitamente. |

## Próxima fase

- **B10C.2 (opcional)**: introducir un `registryAgreementMappingResolver`
  puro y de solo lectura que, en modo demo / con consentimiento explícito,
  intente seleccionar un convenio del registry por `internal_code` o
  `agreement_id` proporcionado externamente, **sin** lookup heurístico.
- **B10D**: activación efectiva por empresa con doble confirmación humana,
  apply real al runtime de nómina y observabilidad completa.