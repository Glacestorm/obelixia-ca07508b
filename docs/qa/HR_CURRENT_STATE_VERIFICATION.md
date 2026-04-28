# HR / Payroll / Legal — Verificación read-only del estado actual

**Fecha:** 2026-04-28
**Modo:** READ-ONLY documental.
**Resultado global:** 🟢 base verde / lista para mejoras incrementales.

No se ha modificado código funcional, ni migraciones, ni RLS, ni edge functions, ni menús, ni flags. Único cambio: este archivo.

---

## 0. Reconciliación de inventario

La cifra previa de "56 funciones" correspondía al primer barrido de patrones. Tras reconciliar contra el filesystem real (`supabase/functions/{erp-hr|hr-|payroll-|legal-|erp-legal-|ai-legal-}-*`), el inventario real es:

| Categoría | # | Notas |
|---|---:|---|
| `erp-hr-*` | 40 | Incluye 2 seed/demo (`erp-hr-seed-demo-data`, `erp-hr-seed-demo-master`) — bloqueados en prod por `environment-coexistence-strategy`. |
| `hr-*` | 12 | Incluye `hr-multiagent-supervisor`, `hr-labor-copilot`, `hr-workforce-simulation`, etc. |
| `payroll-*` | 6 | `payroll-calculation-engine`, `payroll-it-engine`, `payroll-irpf-engine`, `payroll-supervisor`, `payroll-file-generator`, `payroll-cross-module-bridge`. |
| `legal-*` + `erp-legal-*` + `ai-legal-*` | 12 | Coincide con el inventario S7 cerrado (`docs/S7_source_of_truth_final.md`). |
| **Total bruto** | **68** | |
| **— Excluidas (seed/demo, no user-facing en prod)** | **2** | `erp-hr-seed-demo-data`, `erp-hr-seed-demo-master`. |
| **Funciones user-facing efectivas** | **66** | |

No se han detectado duplicados ni funciones huérfanas dentro de los prefijos.

### Cobertura de auth (sobre las 68)

| Utility | # funciones |
|---|---:|
| `validateTenantAccess` | 60 |
| `validateAuth` (sin scope tenant) | 14 (intersecta) |
| `validateCronOrServiceAuth` | 2 (`erp-hr-agreement-updater`, `legal-knowledge-sync`) |
| **Sin ninguna utility de auth** | **0** |

_(Algunas funciones combinan dual-path: `validateTenantAccess` + `x-internal-secret` o `validateAuth` + admin-role check; por eso la suma supera 68.)_

---

## 1. Tabla de verificación

| Ámbito | Verificación | Fichero(s) revisado(s) | Resultado | Riesgo residual | Acción recomendada |
|---|---|---|:---:|---|---|
| **S6 · Auth HR/Payroll** | Toda función user-facing usa `validateTenantAccess` / `validateAuth` / `validateCronOrServiceAuth`. | `supabase/functions/_shared/{tenant-auth,cron-auth}.ts` + 68 funciones brutas HR/Payroll/Legal reconciliadas; 66 user-facing efectivas tras excluir 2 seed/demo. | 🟢 OK | Bajo | Mantener gate de revisión en PR para nuevas funciones. |
| **S6 · SR como Bearer downstream** | Búsqueda `Bearer.*SERVICE_ROLE` en HR/Payroll/Legal. | grep global. | 🟢 0 hits en scope | Medio (fuera de scope: `check-alerts`, `check-goal-achievements`, `galia-expert-agent`) | Tracking aparte para esos 3 ficheros. |
| **S6 · `erp_hr_doc_action_queue` RLS** | `pg_policies` real (4 políticas SELECT/INSERT/UPDATE/DELETE). | Query a `pg_policies`. | 🟢 OK — todas usan `EXISTS … user_has_erp_company_access(e.company_id)`. **Sin `USING(true)` ni `WITH CHECK(true)`.** | Bajo | — |
| **S6 · Excepciones SR documentadas** | 9 usos legítimos en HR scope: `erp-hr-agreement-updater`, `erp-hr-whistleblower-agent`, `erp-hr-seed-demo-data`, `erp-hr-seed-demo-master`, `hr-labor-copilot`, `hr-workforce-simulation`. | Memoria `service-role-legitimate-exceptions`. | 🟢 OK | Bajo | Vigilar nuevas apariciones. |
| **S7 · Auth Legal** | 12/12 funciones Legal con auth real. | `docs/S7_source_of_truth_final.md`. | 🟢 OK | Bajo | — |
| **S7 · `legal-multiagent-supervisor` chaining** | Forward de `originalAuthHeader` (JWT del usuario). | `supabase/functions/legal-multiagent-supervisor/index.ts:65,180,242,262`. | 🟢 OK — no propaga `SERVICE_ROLE_KEY`. El único Bearer SR es contra AI Gateway con `LOVABLE_API_KEY`. | Bajo | — |
| **S7 · Excepciones global-catalog** | 3 documentadas: `legal-ai-advisor` (internal path), `erp-legal-knowledge-loader`, `legal-knowledge-sync`. | `docs/S7_source_of_truth_final.md` §3. | 🟢 OK | Bajo | — |
| **S8 · Error contract** | Shape `{ success, error: { code, message }, meta: { timestamp } }`. | `supabase/functions/_shared/error-contract.ts` + 7 funciones core (S8.0) + ≥30 más HR/Legal lo importan. | 🟢 OK en scope core | Bajo (cobertura S8 parcial fuera de las core) | Ampliar adopción de forma incremental. |
| **S8 · Catch-all sin leak** | Búsqueda `error: error.message` / `message: error.message` en HR/Payroll/Legal. | grep global. | 🟢 0 leaks | Bajo | — |
| **S8 · Frontend compatible** | Helper `extractErrorMessage` soporta shape S8 + legacy. | `src/lib/hr/extractErrorMessage.ts`. | 🟢 OK | Bajo | — |
| **S9 · Versionado VPT** | On approval: snapshot inmutable en `erp_hr_version_registry` y `version_id` escrito de vuelta en `erp_hr_job_valuations`. Atómico (si versioning falla, no aprueba). | `src/hooks/erp/hr/useS9VPT.ts:202,301-302`. | 🟢 OK | Bajo | — |
| **S9 · `version_id` consumido** | UI filtra por `status==='approved' && version_id`. | `S9VPTWorkspace.tsx:305-307`, `S9ExecutiveSummaryCard.tsx:41-42`. | 🟢 OK | Bajo | — |
| **S9 · VPT no presentada como oficial** | Disclaimer + badge `internal_ready`. | `S9VPTWorkspace.tsx:121,502`. | 🟢 OK | Bajo | Mantener disclaimer y badge en cualquier export futuro. |
| **UX · `EmployeeDocumentExpedient`** | Resumen ejecutivo, indicadores de archivo, contadores de versión, descarga firmada, generación. | `src/components/erp/hr/document-expedient/EmployeeDocumentExpedient.tsx:25,28,87,148,233,251,284,297`. | 🟢 OK — `ExpedientExecutiveSummary` + `DocAlertsSummaryBar` + `DocTrafficLightBadge` + `DocGenerationBadge` + `useDocumentVersionCounts` + `useHRDocumentStorage.getDownloadUrl` + tooltip "ver versiones". | Bajo | — |
| **UX · `HRCalendarsPanel`** | Lectura real de `erp_hr_holiday_calendar`. | `src/components/erp/hr/enterprise/HRCalendarsPanel.tsx:3,49` + `useHRHolidayCalendar.ts`. | 🟢 OK | Bajo | — |

---

## 2. Funciones excluidas / con observación

| Función | Motivo | Riesgo |
|---|---|:---:|
| `erp-hr-seed-demo-data` | Seed/demo, no user-facing en prod (bloqueada por `environment-coexistence-strategy`). | Bajo |
| `erp-hr-seed-demo-master` | Seed/demo, no user-facing en prod. | Bajo |
| `erp-hr-agreement-updater` | Excepción SR documentada (catálogo global, admin-gated, ruta cron). | Bajo |
| `erp-hr-whistleblower-agent` | Excepción SR documentada (canal anónimo legalmente exigido). | Bajo |
| `hr-labor-copilot` / `hr-workforce-simulation` | Excepción SR documentada (chaining controlado, JWT forwarding). | Bajo |
| `legal-ai-advisor` (internal path) | Dual-path (`x-internal-secret`) documentado en S7. | Bajo |
| `erp-legal-knowledge-loader` / `legal-knowledge-sync` | Catálogo global sin RLS por diseño; admin-gated. | Bajo |

---

## 3. Riesgos residuales (no requieren acción inmediata)

| # | Riesgo | Severidad | Nota |
|---|---|:---:|---|
| R1 | 9 usos de SR en HR scope, todos justificados por excepción documentada. | baja | Vigilar que no aparezcan nuevos sin entrada en `service-role-legitimate-exceptions`. |
| R2 | Funciones legacy fuera de scope HR/Payroll/Legal aún reenvían SR como Bearer (`check-alerts`, `check-goal-achievements`, `galia-expert-agent`). | media | Tracking aparte; no afecta a esta auditoría. |
| R3 | La adopción directa de `error-contract.ts` no es uniforme en todos los ficheros, pero no se han detectado leaks `error.message` ni respuestas inseguras en el scope revisado. | baja | Mantener convergencia progresiva hacia helper común. |
| R4 | Etiqueta VPT `internal_ready` depende de no añadir flujos que la emitan como oficial. | baja | Mantener disclaimer + `version_id` antes de cualquier export futuro. |

---

## 4. Evidencias

- **Filesystem:** `ls supabase/functions/ | grep -E "^(erp-hr|hr-|payroll-|legal-|erp-legal-|ai-legal-)"` → 68 funciones.
- **Auth coverage:** 0 funciones sin alguna utility de auth.
- **`pg_policies` para `erp_hr_doc_action_queue`:** 4 políticas, todas con `EXISTS … user_has_erp_company_access(e.company_id)`.
- **SR forwarding:** `rg "Bearer.*SERVICE_ROLE" supabase/` → 3 hits, todos fuera de scope HR/Payroll/Legal.
- **S8 leaks:** `rg "error:\s*error\.message|message:\s*error\.message" supabase/functions/{erp-hr,hr,payroll,legal}-*` → 0.
- **S9 versionado:** `useS9VPT.ts:202,301-302`; `S9VPTWorkspace.tsx:121,305-307,502`; `S9ExecutiveSummaryCard.tsx:41-42`.
- **UX expediente:** `EmployeeDocumentExpedient.tsx:25,28,87,148,233,251,284,297`.
- **UX calendarios:** `HRCalendarsPanel.tsx:3,49` + `useHRHolidayCalendar.ts`.

### 4.1 Queries SQL exactas usadas / recomendadas

Política puntual sobre `erp_hr_doc_action_queue` (ejecutada en esta auditoría):

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'erp_hr_doc_action_queue';
```

Barrido recomendado para detectar políticas permisivas (`USING(true)` / `WITH CHECK(true)`) en escrituras de cualquier tabla HR:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename LIKE 'erp_hr_%'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  AND (
    qual ILIKE '%true%'
    OR with_check ILIKE '%true%'
  );
```

---

## 4.2 No oficialidad / prudencia legal

Ningún output relativo a **VPT, auditoría retributiva, inspección, TGSS, SEPE, AEAT, SILTRA, CRA, RLC/RNT, Contrat@, Certific@, DELT@ o preflight** debe marcarse como **oficial** salvo que concurran simultáneamente:

1. Credencial / certificado válido del organismo correspondiente.
2. Envío real (o UAT homologada) realizado contra el endpoint oficial.
3. Respuesta oficial del organismo recibida.
4. Evidencia archivada en el ledger inmutable HR (SHA-256 + timestamp).

Mientras no se cumplan las cuatro condiciones, todo artefacto debe etiquetarse como **interno / preparatorio** (badge `internal_ready` o equivalente) y nunca como oficial, definitivo o regulatorio. Esto aplica a UI, PDFs, exports, copilots y respuestas de IA.

---

## 4.3 Excepciones service_role (HR scope)

| # | Función | Uso service_role | Tipo | Justificación | Mitigación | Estado |
|---|---|---|---|---|---|:---:|
| 1 | `erp-hr-agreement-updater` | `createClient(URL, SERVICE_ROLE)` para sync de catálogo de convenios | Catálogo global / cron | Tabla sin RLS por diseño (catálogo BOE); ruta cron sin JWT de usuario | `validateCronOrServiceAuth` + admin-role check en ruta humana | 🟢 OK |
| 2 | `erp-hr-whistleblower-agent` | `serviceKey` para INSERT anónimo | Canal anónimo (Ley 2/2023) | El denunciante no tiene sesión por diseño legal | Solo INSERT en tablas whistleblower; sin SELECT de identidad | 🟢 OK |
| 3 | `erp-hr-seed-demo-data` | `createClient(URL, SERVICE_ROLE)` | Seed/demo | Pobla entornos demo | Bloqueada en prod por `environment-coexistence-strategy` | 🟢 OK (no user-facing) |
| 4 | `erp-hr-seed-demo-master` | `createClient(URL, SERVICE_ROLE)` | Seed/demo | Pobla entornos demo (master) | Bloqueada en prod por `environment-coexistence-strategy` | 🟢 OK (no user-facing) |
| 5 | `hr-labor-copilot` | `createClient(URL, SERVICE_ROLE)` para fallback de asesor laboral | Advisor portfolio | Asesor multi-empresa sin RLS de tenant directo | Fallback documentado en `advisor-access-pattern`; JWT-first | 🟢 OK |
| 6 | `hr-workforce-simulation` | `createClient(URL, SERVICE_ROLE)` para chaining de simulación | Chaining controlado | Necesita escribir snapshots de simulación cross-tenant validados | JWT del usuario validado antes; simulación aislada | 🟢 OK |

**Recuento:** 6 funciones únicas. La cifra previa de "9 usos" se refería a 9 **ocurrencias** (líneas) de `SUPABASE_SERVICE_ROLE_KEY` en el grep, no a 9 funciones. Reconciliado: **6 funciones, 9 ocurrencias**, todas justificadas y trazadas en `mem://security/global/service-role-legitimate-exceptions`.

---

## 5. Confirmación de no-cambios

- ❌ No se han creado migraciones.
- ❌ No se han modificado edge functions.
- ❌ No se ha tocado motor de nómina, `simulateES`, `salaryNormalizer.ts`, ni motores oficiales (FDI/AFI/DELT@/SEPA).
- ❌ No se ha tocado RLS ni `service_role`.
- ❌ No se ha modificado `supabase/config.toml`.
- ❌ No se han cambiado flags. `PAYROLL_EFFECTIVE_CASUISTICA_MODE` sigue en `persisted_priority_preview`. `persisted_priority_apply` sigue **OFF**.
- ✅ Único cambio (incluido este micro-fix): edición exclusivamente documental de este archivo. Sin código funcional, sin migraciones, sin RLS, sin edge functions, sin menús, sin flags.

---

## 6. Próximo paso recomendado

1. **Proceder con mejoras incrementales sobre base verde** (ampliar adopción de `error-contract.ts` en HR/Legal, mejoras UX adicionales).
2. Mantener **C3B3C2 BLOQUEADA** hasta firma del manual validation pack (`docs/qa/CASUISTICA-FECHAS-01_C3B3C_MANUAL_VALIDATION_PACK.md`).
3. Cualquier nueva función debe nacer con `validateTenantAccess` o `validateAuth` y, si toca downstream, forwardear el JWT del usuario (no `SERVICE_ROLE_KEY`).