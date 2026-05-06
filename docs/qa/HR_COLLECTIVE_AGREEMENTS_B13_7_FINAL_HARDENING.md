# B13.7 — Final Hardening & Cross-Audit · Convenios Curados

**Status:** READY  
**Scope:** Closure-only audit. No new features, no migrations, no edges, no hooks, no UI.

## 1. Objetivo
Auditoría técnica, funcional y de seguridad de todo el módulo Convenios Curados (B13.1 → B13.6).

## 2. Estado de subfases
| Fase | Estado |
|---|---|
| B13.1 Source Watcher | READY |
| B13.2 Document Intake | READY |
| B13.3A Extraction Runner | READY |
| B13.3B.1 Findings → staging pending | READY |
| B13.4 Candidate Review / Promotion Gate | READY |
| B13.5A Impact Engine puro | READY |
| B13.5B Impact persistencia + edge + hook | READY |
| B13.5C Impact UI | READY |
| B13.6 Shell + navegación segura | READY |

## 3. Arquitectura final
Pipeline: **Watcher → Intake → Extraction → Human Review → Impact Preview → Controlled Apply (links a B10C/B10D)**.  
Shell único en `RRHH → Oficial & Compliance → Convenios Curados`.

## 4. Edges
| Edge | verify_jwt | FORBIDDEN_PAYLOAD_KEYS | mapError | DELETE |
|---|---|---|---|---|
| erp-hr-agreement-source-watcher | true | ✅ | ✅ (`err`) | ❌ |
| erp-hr-agreement-document-intake | true | ✅ | ✅ | ❌ |
| erp-hr-agreement-extraction-runner | true | ✅ | ✅ | ❌ |
| erp-hr-agreement-impact-engine | true | ✅ | ✅ | ❌ |

## 5. Hooks
`useAgreementSourceWatch`, `useAgreementDocumentIntake`, `useAgreementExtractionRunner`, `useAgreementImpactPreviews` — todos delegan en `authSafeInvoke`. Cero `.from().insert/update/delete/upsert`. Cero `service_role`.

## 6. UI / Paneles
`CuratedAgreementsPanel` con 6 tabs + `CuratedAgreementsNoAutoApplyBanner`. Pestaña "Aplicación controlada" solo navega (callback `onNavigate`), no invoca edges.

## 7. RLS / Triggers
Tablas B13.5B con FORCE RLS y triggers anti-activación (forbidden keys) creados en migración previa B13.5B. Sin cambios en B13.7.

## 8. Tests nuevos B13.7
- `curated-agreements-b13-hardening-static.test.ts` — 41 checks globales.
- `curated-agreements-b13-edge-hardening.test.ts` — 36 checks (9×4 edges).
- `curated-agreements-b13-routing.test.tsx` — wiring + render.
- `curated-agreements-ready-for-payroll-gate.test.ts` — gate engine + no-mutation.
- `curated-agreements-staging-writer-boundary.test.ts` — no `human_approved_*` writes.
- `curated-agreements-impact-no-apply.test.ts` — sin llamadas a B10C/B10D/payroll.

## 9. Regresión
**2097/2097 ✅** (suite HR completa + payroll crítico + engines).

## 10. Invariantes confirmados
- ❌ No nómina aplicada · ❌ No bridge · ❌ No flags mutados · ❌ No `salary_tables` reales tocadas
- ❌ No `ready_for_payroll = true` escrito en B13 · ❌ No `salary_tables_loaded = true` · ❌ No `data_completeness = 'human_validated'`
- ❌ No mapping/runtime automático · ❌ No CRA/SILTRA/SEPA/accounting · ❌ No `service_role` en frontend

## 11. Límites actuales
- B11.3B writer sigue bloqueado hasta filas `human_approved_*`.
- OCR real/controlado pendiente (B13.3C diferido).
- Posible flake `command-center-render` bajo carga: PREEXISTING, no causado por B13.
- Security 1 Error CRM: fuera de alcance.

## 12. Criterios para próximos builds prácticos
Cargar fuente real → intake → extraction → staging → revisión humana → writer B11.3B → B8/B9 → mapping/runtime.

**Veredicto B13.7:** READY · Módulo Convenios Curados cerrado como seguro.
