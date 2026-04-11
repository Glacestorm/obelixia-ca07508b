# LM4 — Real Readiness Report

## Fecha: 2026-04-11

---

## Resumen Ejecutivo

LM4 transforma el sistema de readiness por organismo de **efímero/read-only** a **persistido/interactivo**:

1. **Estado persistido en DB** — `hr_domain_certificates.metadata` con namespace `credential_onboarding_v1`
2. **Panel interactivo** — operadores pueden registrar credenciales, marcar escenarios, adjuntar evidencia
3. **Go-live dinámico** — `canGoLive` se calcula dinámicamente según 6 condiciones duras
4. **Validadores endurecidos** — checks más profundos (NIF, NAF, catálogo contratos, causas SEPE, claves 190)
5. **Nivel `uat_confirmed`** — nuevo nivel de validación que requiere evidencia real de organismo

---

## BEFORE / AFTER por Organismo

| Organismo | BEFORE (LM3) | AFTER (LM4) | Cambio |
|-----------|-------------|-------------|--------|
| TGSS / RED / SILTRA | `official_handoff_ready` (efímero, read-only) | `official_handoff_ready` (persistido, interactivo, `canGoLive` dinámico) | +persistencia, +controles operador, +validación NAF/IPF/acción |
| SEPE / Contrat@ | `official_handoff_ready` (efímero) | `official_handoff_ready` (persistido, interactivo) | +persistencia, +validación catálogo contratos, +formato fecha |
| SEPE / Certific@2 | `official_handoff_ready` (efímero) | `official_handoff_ready` (persistido, interactivo) | +persistencia, +validación causas SEPE oficiales, +bases ≥6 meses |
| AEAT / Modelo 111 | `official_handoff_ready` (efímero) | `official_handoff_ready` (persistido, interactivo) | +persistencia, +validación NIF declarante, +ejercicio 4 dígitos, +longitud registro 250 |
| AEAT / Modelo 190 | `official_handoff_ready` (efímero) | `official_handoff_ready` (persistido, interactivo) | +persistencia, +validación claves percepción oficiales, +subclave formato |

**Nota**: El readiness sigue en `official_handoff_ready` porque no existen credenciales reales. Esto es honesto y correcto.

---

## Credencial Evidence Status

| Organismo | Credenciales requeridas | Estado DB | Evidencia adjunta |
|-----------|------------------------|-----------|-------------------|
| TGSS | Autorización RED, Certificado, WinSuite32 | Persistido (not_configured) | 0 |
| Contrat@ | Autorización Contrat@, Certificado | Persistido (not_configured) | 0 |
| Certific@2 | Autorización Contrat@, Certificado | Persistido (not_configured) | 0 |
| AEAT 111 | Certificado (+ Cl@ve opt.) | Persistido (not_configured) | 0 |
| AEAT 190 | Certificado (+ Cl@ve opt.) | Persistido (not_configured) | 0 |

---

## Sandbox/UAT Execution Status

| Organismo | Sandbox definidos | Sandbox ejecutados | UAT definidos | UAT ejecutados |
|-----------|-------------------|-------------------|---------------|----------------|
| TGSS | 3 | 0 | 1 | 0 |
| Contrat@ | 4 | 0 | 1 | 0 |
| Certific@2 | 2 | 0 | 1 | 0 |
| AEAT 111 | 2 | 0 | 1 | 0 |
| AEAT 190 | 2 | 0 | 1 | 0 |

**Total**: 13 sandbox + 5 UAT = 18 escenarios | 0 ejecutados

---

## Format Validation Depth Improvements

| Formato | BEFORE (LM3) | AFTER (LM4) | Checks añadidos |
|---------|-------------|-------------|-----------------|
| FAN / TGSS | 5 checks básicos | 10 checks | +NIF formato, +NAF 12 dígitos, +IPF, +código acción A/B/V |
| XML Contrat@ | 6 checks | 11 checks | +NIF formato empresa/trabajador, +catálogo contratos SEPE (28 códigos), +fecha YYYY-MM-DD |
| BOE 111 | 5 checks | 8 checks | +NIF declarante formato, +ejercicio 4 dígitos, +longitud registro 250 chars |
| BOE 190 | 5 checks | 10 checks | +NIF declarante formato, +catálogo claves percepción (18 valores), +subclave 2 dígitos, +ejercicio año |
| Certific@2 | 5 checks | 10 checks | +causas baja oficiales SEPE (34 códigos), +bases ≥6 meses, +NIF formato empresa/trabajador, +fecha formato |

---

## Decisión Honesta de Go-Live

| Organismo | canGoLive | Decisión | Razón |
|-----------|-----------|----------|-------|
| TGSS | `false` | `not_ready` | 0/6 condiciones cumplidas — sin credenciales |
| Contrat@ | `false` | `not_ready` | 0/6 condiciones cumplidas |
| Certific@2 | `false` | `not_ready` | 0/6 condiciones cumplidas |
| AEAT 111 | `false` | `not_ready` | 0/6 condiciones cumplidas |
| AEAT 190 | `false` | `not_ready` | 0/6 condiciones cumplidas |

---

## Impacto en la Auditoría General

1. **Persistencia real** — el estado ya no se pierde al recargar la página
2. **Controles de operador** — el panel ya no es read-only
3. **canGoLive dinámico** — ya no está hardcoded como `false`, sino computado (sigue siendo `false` porque no hay credenciales, pero ahora es computable)
4. **Evidencia estructurada** — cada credencial y escenario puede tener documentos adjuntos referenciados
5. **Validación más profunda** — los formatos se validan con catálogos oficiales reales

---

## Persisted vs Validated vs UAT-Confirmed State Model

| Estado | Significado | Quién lo marca | Evidencia requerida |
|--------|-------------|----------------|---------------------|
| **Persisted** (`not_configured` → `configured`) | Estado guardado en DB, sobrevive recargas | Operador via panel | Ninguna mínima |
| **Validated** (`configured` → `validated`) | Credencial verificada por el operador | Operador con revisión | Documento de autorización / captura |
| **spec_aligned** | Formato pasa checks estructurales profundos | Motor de validación automático | N/A (automático) |
| **sandbox_validated** | Formato aceptado en entorno sandbox del organismo | Operador tras prueba sandbox | Acuse/respuesta del organismo |
| **uat_confirmed** | Formato confirmado en UAT con datos reales | Operador tras UAT exitoso | Justificante oficial del organismo |
| **go_live_ready** | 6/6 condiciones duras cumplidas | Cálculo dinámico automático | Todas las anteriores |

**Regla dura invariante**: `canGoLive === true` solo si las 6 condiciones se cumplen simultáneamente. No existe bypass manual.
