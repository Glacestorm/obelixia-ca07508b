# B13.1 — ObelixIA Convenios Curados · Source Watcher

**Build:** B13.1
**Fase:** 1 de 5 (Source Watcher → Intake → Extraction → Review → Impact)
**Estado:** ✅ Cerrado · 36/36 tests verdes
**Riesgo:** Aislado · cero impacto en nómina, bridge ni flags

---

## 1. Objetivo del Source Watcher

Detectar de forma automatizada (y permitir registro manual) la **publicación o actualización de convenios colectivos** en fuentes oficiales (BOE, REGCON, boletines autonómicos y provinciales) y dejarlos en una **cola de descubrimiento** para que el equipo decida si se procesan en fases posteriores (Intake → Extraction → Review → Impact).

El Source Watcher es **solo descubrimiento**. No extrae texto, no parsea tablas, no normaliza importes, no toca convenios operativos. Es la primera capa del servicio "convenios curados" estilo a3convenios construido encima de la arquitectura segura B10/B11.

---

## 2. Tablas creadas

### `public.erp_hr_collective_agreement_source_watch_queue`

Cola única de hits descubiertos por el watcher.

Campos relevantes:

- `id uuid PK`
- `source` (BOE, REGCON, BOIB, BOCM, DOGC, DOGV, BOJA, BOPV, DOG, BOC, BOR, BON, BOPA, BOCYL, DOE, DOCM, BOP, MANUAL, OTHER)
- `source_url`, `document_url`
- `jurisdiction`, `publication_date`
- `document_hash` (SHA-256 del documento original — clave de dedupe)
- `detected_agreement_name`, `detected_regcon`, `detected_cnae[]`
- `confidence` (0–1, opcional)
- `status` (ver §6)
- `notes`
- `discovered_at`, `dismissed_by`, `dismissed_at`, `dismissed_reason`
- `created_at`, `updated_at`

**RLS:** habilitada. Lectura/escritura solo a roles autorizados (§5) vía la edge.

**Trigger defensivo:** `b13_1_source_watch_queue_anti_activation_guard` bloquea cualquier intento de mutar campos críticos de payroll o flags piloto desde esta tabla.

No se han creado más tablas en B13.1. La tabla `erp_hr_collective_agreement_document_intake` corresponde a B13.2 y **no existe todavía**.

---

## 3. Edge creada

### `supabase/functions/erp-hr-agreement-source-watcher/index.ts`

- `verify_jwt = true` (declarado en `supabase/config.toml` y en docblock).
- Usa `getClaims()` para validar sesión; rechaza con `AUTH_REQUIRED` si no hay token.
- RBAC contra `user_roles` (§5).
- Sólo opera sobre `T_QUEUE = 'erp_hr_collective_agreement_source_watch_queue'` y lectura de `user_roles`. No accede a ninguna otra tabla.
- `FORBIDDEN_PAYLOAD_KEYS` rechaza payloads que intenten colar: `ready_for_payroll`, `salary_tables_loaded`, `data_completeness`, `requires_human_review`, `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST`, `service_role`.

---

## 4. Acciones disponibles

| Acción | Descripción | Mutación |
|---|---|---|
| `scan_now` | Stub seguro. Devuelve `adapters_status: 'WATCHER_ADAPTERS_PENDING'`. **No escribe nada** (los adapters BOE/REGCON/etc. se enchufan en builds posteriores). | Ninguna |
| `list_hits` | Lista hits filtrables por `status`, `source`, `limit`. | Solo lectura |
| `dismiss_hit` | Marca un hit como `dismissed` con `reason` (≥5 chars). | UPDATE en queue |
| `add_manual_source` | Permite registrar manualmente una fuente oficial (URL BOE/REGCON/etc.) con dedupe por `document_hash`. | INSERT en queue (o no-op si duplicado) |

Todas se invocan desde el frontend mediante `useAgreementSourceWatch` → `authSafeInvoke('erp-hr-agreement-source-watcher', …)`. El hook **nunca** llama `.from(...).insert/update/delete/upsert`.

---

## 5. Roles autorizados

`ALLOWED_ROLES` en la edge:

- `superadmin`
- `admin`
- `legal_manager`
- `hr_manager`
- `payroll_supervisor`

Cualquier otro rol recibe `FORBIDDEN`. La verificación se hace contra `user_roles` con el JWT del usuario (no `service_role`).

---

## 6. Estados de la cola (`status`)

- `pending_intake` — hit recién descubierto, pendiente de pasar a B13.2.
- `duplicate_candidate` — `document_hash` colisiona con otro hit ya conocido.
- `official_source_found` — el hit confirma fuente oficial válida (BOE/REGCON/boletín autonómico).
- `needs_human_classification` — el watcher no puede clasificarlo por sí solo.
- `blocked_no_source` — sin URL/hash oficial → no puede progresar.
- `dismissed` — descartado manualmente con motivo registrado.

Ningún estado de esta cola implica activación de nada en payroll.

---

## 7. Dedupe por `document_hash`

- `document_hash` es **SHA-256** del documento original (PDF / HTML / payload oficial).
- En `add_manual_source`, si ya existe una fila con el mismo `document_hash`, la edge devuelve `{ hit: { duplicate_race: true } }` y **no inserta** una segunda fila.
- En `scan_now` (cuando los adapters reales se conecten), los hits que choquen contra un hash existente se marcarán como `duplicate_candidate` en lugar de duplicar la fila.
- Esto evita ruido en la cola y garantiza que el operador humano vea cada documento oficial **una sola vez**.

---

## 8. Modo manual `add_manual_source`

Pensado para cuando un operador (legal/HR/payroll) localiza una publicación oficial antes que el watcher automático, o para boletines no cubiertos todavía por adapter:

Input mínimo:

- `source` (enum oficial)
- `source_url`
- (opcional pero recomendado) `document_url`, `document_hash`, `jurisdiction`, `publication_date`, `detected_agreement_name`, `detected_regcon`, `detected_cnae[]`, `confidence`, `notes`

La edge:

1. Valida sesión + rol.
2. Rechaza `FORBIDDEN_PAYLOAD_KEYS`.
3. Aplica dedupe por `document_hash` si viene.
4. Inserta en la cola con `status` apropiado.
5. La fila queda visible en `list_hits`. **No** dispara extracción ni mapping.

---

## 9. Qué NO hace B13.1

- ❌ **No** ejecuta nómina ni la modifica.
- ❌ **No** toca `useESPayrollBridge` ni `payrollEngine` ni `payslipEngine`.
- ❌ **No** toca `salaryNormalizer` ni `agreementSalaryResolver`.
- ❌ **No** escribe en `salary_tables` reales ni en `erp_hr_collective_agreements` (legacy operativa).
- ❌ **No** activa `ready_for_payroll`.
- ❌ **No** pone `salary_tables_loaded = true`.
- ❌ **No** pone `data_completeness = 'human_validated'`.
- ❌ **No** modifica `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` (sigue `false`).
- ❌ **No** modifica `HR_REGISTRY_PILOT_MODE` (sigue `false`).
- ❌ **No** modifica `REGISTRY_PILOT_SCOPE_ALLOWLIST` (sigue `[]`).
- ❌ **No** ejecuta mapping, runtime apply ni runtime resolver.
- ❌ **No** ejecuta OCR.
- ❌ **No** extrae texto, tablas ni importes.
- ❌ **No** usa `service_role` desde el frontend.

Es **descubrimiento puro**. Todo lo demás vive en builds posteriores y bajo control humano explícito.

---

## 10. Relación con B13.2 — Document Intake Queue

B13.1 deja hits en `..._source_watch_queue` con `status = pending_intake | official_source_found | needs_human_classification`.

B13.2 (próximo build, **no ejecutado**) creará `erp_hr_collective_agreement_document_intake` y una edge que:

1. Tomará hits aprobados desde la cola del watcher.
2. Descargará el documento oficial usando el `document_url`.
3. Recalculará/verificará `document_hash` para dedupe global.
4. Clasificará tipo de documento (nuevo convenio, prórroga, tabla salarial, revisión IPC, etc.).
5. Dejará la pieza lista para B13.3 (Extraction/OCR).

B13.1 **no ejecuta** ninguno de esos pasos. La transición watcher→intake será una acción explícita en B13.2 con su propia edge y sus propios tests.

---

## 11. Tests ejecutados

- `src/__tests__/hr/agreement-source-watcher-static.test.ts` — guards estáticos sobre la edge y el hook (sin imports prohibidos, sin `service_role`, sin `.insert/.update/.delete/.upsert` en frontend, sólo `T_QUEUE` y `user_roles`, `verify_jwt=true`, `FORBIDDEN_PAYLOAD_KEYS` completo, `ALLOWED_ROLES` correcto, `scan_now` no escribe).
- `src/__tests__/hr/registry-ui-flags-untouched.test.ts` — flags piloto y bridge intactos.
- Suites B10/B11 relevantes (staging TIC-NAC, payroll crítico, bridge, normalizer).

**Resultado: 36/36 verde.**

---

## 12. Confirmación de no activación

- ✅ `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL` = `false`.
- ✅ `HR_REGISTRY_PILOT_MODE` = `false`.
- ✅ `REGISTRY_PILOT_SCOPE_ALLOWLIST` = `[]`.
- ✅ `useESPayrollBridge` no editado.
- ✅ `payrollEngine`, `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver` no editados.
- ✅ `erp_hr_collective_agreements` (legacy operativa) no editada.
- ✅ Sin `service_role` en frontend.
- ✅ Sin escritura de `ready_for_payroll`, `salary_tables_loaded=true`, `data_completeness='human_validated'`.
- ✅ **B11.3B writer sigue bloqueado** hasta que existan filas `human_approved_single` o `human_approved_second` en la staging TIC-NAC. B13.1 no las produce.

---

**Próximo build sugerido (NO ejecutado en este turno):** B13.2 — Document Intake Queue.