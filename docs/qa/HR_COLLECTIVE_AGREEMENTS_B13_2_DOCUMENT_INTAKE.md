# HR — Collective Agreements — B13.2 Document Intake Queue

## 1. Objetivo

Crear la **segunda capa** del servicio interno de Convenios Curados (ObelixIA):
una **cola de intake documental** que recibe los hits detectados por el
B13.1 Source Watcher (o entradas manuales) y los convierte en **documentos
oficiales clasificados, dedupados y revisados por un humano**, listos para
que B13.3 los procese más adelante.

B13.2 **NO** extrae tablas, **NO** ejecuta OCR, **NO** escribe staging salarial,
**NO** toca `salary_tables` reales y **NO** activa nómina.

## 2. Diferencia entre Watcher (B13.1) e Intake (B13.2)

| Capa | Tabla | Rol |
| --- | --- | --- |
| **B13.1 Watcher** | `erp_hr_collective_agreement_source_watch_queue` | Detección automática + entrada manual de hits desde fuentes oficiales (BOE, REGCON, BOPs, etc.). |
| **B13.2 Intake** | `erp_hr_collective_agreement_document_intake` | Triaje humano: clasificación, dedupe, bloqueo, promoción a extracción. |

El Watcher **descubre**. El Intake **clasifica**. Ninguno **extrae**.

## 3. Estados del intake

| Estado | Significado |
| --- | --- |
| `pending_review` | Recién entrado en la cola, sin revisor asignado. |
| `claimed_for_review` | Reclamado por un revisor humano (`human_reviewer`, `claimed_at`). |
| `classified` | Revisado y etiquetado con una `classification`. |
| `duplicate` | Marcado como copia de otro intake (`duplicate_of`). |
| `blocked` | Bloqueado con motivo (`block_reason`, `blocked_by`, `blocked_at`). |
| `ready_for_extraction` | Listo para que B13.3 lo procese. **No** dispara extracción. |
| `dismissed` | Descartado con motivo. **No** se borra físicamente. |

## 4. Clasificación

Valores admitidos en `classification`:

- `new_agreement`
- `salary_revision` (requiere `candidate_registry_agreement_id`)
- `errata`
- `paritaria_act`
- `scope_clarification`
- `unknown`

## 5. Dedupe por `document_hash`

- Índice único parcial `uq_document_intake_document_hash` (sólo cuando
  `document_hash` no es null y `status <> 'duplicate'`).
- Trigger `b13_2_document_intake_anti_activation_guard` ejecuta dedupe
  server-side: si en INSERT ya existe otra fila con el mismo hash y no es
  duplicada, la nueva fila se inserta directamente como `status='duplicate'`
  y `duplicate_of=<id existente>`.
- En carrera de inserciones simultáneas con mismo hash, el edge devuelve
  `{ duplicate_race: true }` sin propagar errores 5xx.

## 6. Promote_to_extraction sin extracción

`promote_to_extraction` es **solo un cambio de estado** (`classified` →
`ready_for_extraction`). No dispara OCR, no llama a B13.3, no escribe
staging y no toca `salary_tables`. Esto está cubierto por:

- Test `agreement-document-intake-edge-static.test.ts` (puntos 14, 15).
- Test `agreement-document-intake-panel.test.tsx` (punto 6).

Precondiciones del edge antes de promover:

- `status = 'classified'`.
- `classification` ∈ `{new_agreement, salary_revision, errata, paritaria_act, scope_clarification}`.
- Existe `source_url` o `document_url`.
- Existe `document_hash` o las `notes` documentan su ausencia.

## 7. Roles autorizados

RLS y edge restringen acciones a:

- `superadmin`
- `admin`
- `legal_manager`
- `hr_manager`
- `payroll_supervisor`

No existe policy `DELETE` sobre la tabla. Ninguna acción borra filas.

## 8. Qué NO hace B13.2

- ❌ No ejecuta extracción (B13.3 sigue sin existir).
- ❌ No ejecuta OCR.
- ❌ No escribe en staging salarial (`*_staging`).
- ❌ No escribe en `salary_tables` reales.
- ❌ No pone `ready_for_payroll = true`.
- ❌ No pone `salary_tables_loaded = true`.
- ❌ No pone `data_completeness = 'human_validated'`.
- ❌ No ejecuta B8A / B8B / B9.
- ❌ No ejecuta B11.3B writer.
- ❌ No toca `useESPayrollBridge`, `payrollEngine`, `payslipEngine`,
  `salaryNormalizer`, `agreementSalaryResolver`.
- ❌ No toca la tabla operativa legacy `erp_hr_collective_agreements`.
- ❌ No toca `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ No toca `HR_REGISTRY_PILOT_MODE`.
- ❌ No toca `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ No crea mapping ni runtime setting.
- ❌ No usa `service_role` en el frontend.
- ❌ No inventa importes.
- ❌ No desactiva `verify_jwt`.

El trigger anti-activation rechaza cualquier intento de smuggling de estos
tokens vía `notes`, `block_reason` o `payload_json`.

## 9. Relación con B13.3 Extraction Pipeline

B13.3 será el siguiente build y operará **sólo** sobre filas con
`status = 'ready_for_extraction'`. B13.3 **leerá**, no modificará, los datos
de B13.2 salvo para anotar resultado de extracción. La activación efectiva
en nómina seguirá pasando por B8A/B8B/B9 y la activación staging→real por
B11.3B (todavía bloqueada).

## 10. Tests ejecutados

- `src/__tests__/hr/agreement-document-intake-schema.test.ts` — estructura
  de la migración, índices, RLS, FORCE RLS, ausencia de DELETE, triggers,
  tokens prohibidos en el guard, ausencia de modificaciones a
  `salary_tables` o a `erp_hr_collective_agreements` operativa.
- `src/__tests__/hr/agreement-document-intake-edge-static.test.ts` —
  `verify_jwt=true`, Zod strict en cada acción, `FORBIDDEN_PAYLOAD_KEYS`,
  `mapError` sanitizado, ausencia de stack/raw error.message, ausencia de
  importaciones a engines/bridge/normalizer/resolver,
  `promote_to_extraction` sin OCR ni extracción, `dismiss` sin DELETE.
- `src/__tests__/hr/agreement-document-intake-hook-static.test.ts` —
  hook sólo usa `authSafeInvoke`, sin `.from().insert/update/delete/upsert`,
  sin `service_role`, gestiona `authRequired`, sin imports prohibidos,
  flags y allow-list intactos.
- `src/__tests__/hr/agreement-document-intake-panel.test.tsx` — banner
  visible, tabla de documentos visible, ausencia de CTAs prohibidos,
  manejo de no-sesión, mutaciones a través del hook,
  `Promover a extracción` no contiene "Ejecutar OCR" / "Extraer tablas".
- Re-ejecutados: B13.1 watcher tests, `registry-ui-flags-untouched`,
  B11.2C tests relevantes y payroll crítico.

## 11. Confirmación de no activación

- ✅ `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` sigue `false`.
- ✅ `HR_REGISTRY_PILOT_MODE` sigue `false`.
- ✅ `REGISTRY_PILOT_SCOPE_ALLOWLIST` sigue `[]`.
- ✅ `useESPayrollBridge` no modificado.
- ✅ `payrollEngine`, `payslipEngine`, `salaryNormalizer`,
  `agreementSalaryResolver` no modificados.
- ✅ `salary_tables` reales no escritas.
- ✅ `ready_for_payroll`, `salary_tables_loaded`, `data_completeness`
  no modificados desde B13.2.
- ✅ Tabla operativa legacy `erp_hr_collective_agreements` no tocada.
- ✅ B11.3B writer **sigue bloqueado** (no existen filas
  `human_approved_single` ni `human_approved_second` introducidas por B13.2).
- ✅ B8A/B8B/B9 no ejecutados desde B13.2.
- ✅ B13.3 Extraction Pipeline **no implementado**.