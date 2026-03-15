# RRHH-PROD.1 — Auditoría de Readiness para Producción Real

## Fecha: 2026-03-15 | Estado: AUDITORÍA COMPLETADA

---

## RESPUESTA DIRECTA

**¿Está el módulo RRHH listo para producción real con conectores oficiales activos?**

**NO.** El sistema está en estado **PREPARATORIO / SIMULACIÓN AVANZADA**. No hay conectores oficiales reales activos. Ningún dato se transmite a SILTRA, TGSS, SEPE, AEAT ni a ningún organismo oficial. Todo el sistema de integraciones oficiales opera en modo **dry-run / sandbox** con bloqueo de producción **hardcoded** (`isRealSubmissionBlocked() === true`).

---

## A. INVENTARIO DE CONECTORES Y PROCESOS OFICIALES

### Tabla completa de componentes

| # | Componente | Archivo | Tipo | Función real | Madurez |
|---|-----------|---------|------|-------------|---------|
| 1 | `tgssPayloadBuilder` | `shared/tgssPayloadBuilder.ts` | Builder | Genera payload AFI/FAN simulado para alta/baja/variación | Alta (simulación) |
| 2 | `tgssConsistencyChecker` | `shared/tgssConsistencyChecker.ts` | Validador | 11 reglas de validación cruzada de datos | Alta |
| 3 | `tgssPreIntegrationReadiness` | `shared/tgssPreIntegrationReadiness.ts` | Engine | Evaluación de readiness pre-integración | Alta |
| 4 | `tgssPreparatoryService` | `shared/tgssPreparatoryService.ts` | Service | Orquesta payload + validación + snapshot para TGSS | Alta (preparatorio) |
| 5 | `TGSSPreIntegrationBadge` | `shared/TGSSPreIntegrationBadge.tsx` | UI | Badge visual de estado pre-integración | Alta |
| 6 | `useTGSSReadiness` | `hooks/erp/hr/useTGSSReadiness.ts` | Hook | Computa readiness combinando payload+docs+plazos | Alta |
| 7 | `contrataPayloadBuilder` | `shared/contrataPayloadBuilder.ts` | Builder | Genera payload XML simulado para Contrat@ | Alta (simulación) |
| 8 | `contrataConsistencyChecker` | `shared/contrataConsistencyChecker.ts` | Validador | 15 reglas de consistencia para contratación | Alta |
| 9 | `contrataPreIntegrationReadiness` | `shared/contrataPreIntegrationReadiness.ts` | Engine | Evaluación readiness Contrat@/SEPE | Alta |
| 10 | `contrataPreparatoryService` | `shared/contrataPreparatoryService.ts` | Service | Orquesta payload + validación para SEPE | Alta (preparatorio) |
| 11 | `aeatPreparatoryService` | `shared/aeatPreparatoryService.ts` | Service | Payload preparatorio Modelo 111/190 | Alta (preparatorio) |
| 12 | `officialReadinessEngine` | `shared/officialReadinessEngine.ts` | Engine | Evaluación unificada de todos los conectores | Alta |
| 13 | `useOfficialReadiness` | `hooks/erp/hr/useOfficialReadiness.ts` | Hook | Ejecuta evaluación contra BD real | Alta |
| 14 | `preparatorySubmissionEngine` | `shared/preparatorySubmissionEngine.ts` | Engine | Máquina de estados de 16 niveles para submissions | Alta |
| 15 | `usePreparatorySubmissions` | `hooks/erp/hr/usePreparatorySubmissions.ts` | Hook | CRUD de submissions preparatorias | Alta |
| 16 | `sandboxEnvironmentEngine` | `shared/sandboxEnvironmentEngine.ts` | Engine | Modelado de entornos sandbox/test/preprod/prod | Alta |
| 17 | `sandboxExecutionService` | `shared/sandboxExecutionService.ts` | Service | Ejecución de simulaciones en sandbox | Alta (simulación) |
| 18 | `sandboxEligibilityEngine` | `shared/sandboxEligibilityEngine.ts` | Engine | 11 checks de elegibilidad para sandbox | Alta |
| 19 | `useSandboxEnvironment` | `hooks/erp/hr/useSandboxEnvironment.ts` | Hook | Gestión de entorno sandbox | Alta |
| 20 | `preRealApprovalEngine` | `shared/preRealApprovalEngine.ts` | Engine | Workflow de aprobación interna (10 checks) | Alta |
| 21 | `usePreRealApproval` | `hooks/erp/hr/usePreRealApproval.ts` | Hook | Gestión de aprobaciones pre-real | Alta |
| 22 | `enhancedValidationEngine` | `shared/enhancedValidationEngine.ts` | Validador | Validación estructural AFI/FAN, XML, AEAT | Alta |
| 23 | `regulatoryCalendarEngine` | `shared/regulatoryCalendarEngine.ts` | Engine | Plazos legales TGSS/SEPE/AEAT con urgencia | Alta |
| 24 | `connectorHardeningEngine` | `shared/connectorHardeningEngine.ts` | Engine | Guardas de payload, bloqueos concurrencia | Alta |
| 25 | `dryRunDiffEngine` | `shared/dryRunDiffEngine.ts` | Engine | Comparativas entre simulaciones | Alta |
| 26 | `dryRunAuditEvents` | `shared/dryRunAuditEvents.ts` | Auditoría | 14 tipos de eventos de trazabilidad | Alta |
| 27 | `officialExportEngine` | `shared/officialExportEngine.ts` | Exportador | Genera PDF/Excel internos (disclaimers) | Alta |
| 28 | `evidencePackGenerator` | `shared/evidencePackGenerator.ts` | Exportador | Paquetes de evidencias PDF/Excel | Alta |
| 29 | `proactiveAlertEngine` | `shared/proactiveAlertEngine.ts` | Engine | Alertas proactivas deduplicadas | Alta |
| 30 | `multiEntityReadinessEngine` | `shared/multiEntityReadinessEngine.ts` | Engine | Readiness consolidado multi-entidad | Alta |
| 31 | `sandboxDryRunComparisonEngine` | `shared/sandboxDryRunComparisonEngine.ts` | Engine | Comparativa sandbox vs dry-run | Alta |
| 32 | `ssMonthlyExpedientEngine` | (engines/) | Engine | Expediente SS mensual, 8 estados | Alta (interno) |
| 33 | `fiscalMonthlyExpedientEngine` | (engines/) | Engine | Expediente fiscal mensual, 8 checks | Alta (interno) |
| 34 | `registrationClosureEngine` | `shared/registrationClosureEngine.ts` | Engine | Cierre operativo con snapshots inmutables | Alta |
| 35 | `contractClosureEngine` | `shared/contractClosureEngine.ts` | Engine | Cierre de contrato con evidencias | Alta |

### Resumen de tipos

| Tipo | Cantidad | Estado |
|------|----------|--------|
| Engines de lógica | 15 | ✅ Funcionales (simulación) |
| Builders de payload | 3 | ✅ Funcionales (simulación) |
| Validadores | 3 | ✅ Funcionales |
| Hooks | 8 | ✅ Funcionales |
| Services | 4 | ✅ Funcionales (preparatorio) |
| Exportadores | 3 | ✅ Funcionales (disclaimers) |
| UI components | 2+ | ✅ Funcionales |
| **Conectores reales a organismos** | **0** | **❌ No existen** |

---

## B. VERIFICACIÓN: PRODUCCIÓN REAL VS SIMULACIÓN

### Evidencia de código

#### Bloqueo #1 — `sandboxEnvironmentEngine.ts` línea 298:
```typescript
/** Central safety invariant — MUST always return true in current phase */
export function isRealSubmissionBlocked(): boolean {
  return true; // HARDCODED — no hay bypass posible
}
```

#### Bloqueo #2 — `preparatorySubmissionEngine.ts` línea 326:
```typescript
export function isRealSubmissionBlocked(
  _mode: SubmissionMode,
  _options?: { adminOverride?: boolean },
): boolean {
  // V2-ES.8: Real submissions are ALWAYS blocked.
  return true; // HARDCODED — adminOverride ignorado
}
```

#### Bloqueo #3 — `sandboxExecutionService.ts` línea 157:
```typescript
if (request.environment === 'production' || !isRealSubmissionBlocked()) {
  throw new Error('SECURITY VIOLATION: Cannot execute in production environment');
}
```

#### Bloqueo #4 — `sandboxEnvironmentEngine.ts` línea 304:
```typescript
export function isEnvironmentActivatable(env: ConnectorEnvironment): boolean {
  if (env === 'production') return false; // Hard block
  return ENVIRONMENT_DEFINITIONS[env].activatable;
}
```

### Clasificación por flujo

| Flujo | Solo UI | Simulación | Preparatorio | Dry-run | Sandbox | Integrable parcial | Productivo real |
|-------|---------|-----------|-------------|---------|---------|-------------------|----------------|
| TGSS Alta/Baja | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| SS Cotización mensual | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Contrat@ comunicación | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AEAT Modelo 111 | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| AEAT Modelo 190 | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Certific@2 | ✅ | — | — | — | — | ❌ | ❌ |
| Delt@ | ✅ | — | — | — | — | ❌ | ❌ |
| Official Submissions Hub | — | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Pre-real approval | — | ✅ | ✅ | — | — | ❌ | ❌ |
| Evidence packs | — | — | ✅ | — | — | ❌ | ❌ |

**Conclusión inequívoca: NINGÚN flujo es productivo real. TODOS operan en simulación/preparatorio.**

---

## C. AUDITORÍA POR ORGANISMO

### C.1 SILTRA / TGSS

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Generación de payload AFI/FAN | ✅ Simulado | `tgssPayloadBuilder.ts` — genera estructura pero no fichero AFI real |
| Validación de formato NAF/CCC/DNI | ✅ Funcional | `tgssConsistencyChecker.ts` — 11 reglas |
| Readiness | ✅ Funcional | `tgssPreIntegrationReadiness.ts` |
| Transmisión real a SILTRA | ❌ No existe | No hay endpoint, credencial ni certificado |
| Certificado digital SILTRA | ❌ Solo modelado | `erp_hr_domain_certificates` — metadatos, sin material criptográfico |
| Respuesta de acuse TGSS | ❌ No existe | No hay parseo de respuesta oficial |
| **Veredicto** | **PREPARATORIO** | Payload y validación internos listos; sin transmisión real |

### C.2 Seguridad Social mensual

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Cálculo de bases/cuotas | ✅ Motor interno | `ssMonthlyExpedientEngine` — 8 checks de conciliación |
| Expediente mensual | ✅ Funcional | Persistido en `erp_hr_ss_contributions.metadata` (JSONB) |
| Generación fichero FAN | ✅ Simulado | `tgssPreparatoryService.ts` tipo `cotizacion_mensual` |
| Transmisión a TGSS/SILTRA | ❌ No existe | Mismo bloqueo que C.1 |
| **Veredicto** | **PREPARATORIO** | Conciliación interna lista; sin envío |

### C.3 Contrat@ / SEPE

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Payload XML comunicación | ✅ Simulado | `contrataPayloadBuilder.ts` |
| 15 reglas de consistencia | ✅ Funcional | `contrataConsistencyChecker.ts` |
| 5 tipos de comunicación | ✅ Modelados | inicial, copia, prórroga, conversión, finalización |
| Plazos legales (10 días hábiles) | ✅ Funcional | `contractDeadlineEngine.ts` con calendario real |
| Transmisión real a Contrat@ | ❌ No existe | Sin endpoint ni credenciales |
| **Veredicto** | **PREPARATORIO** | Datos y validación listos; sin transmisión |

### C.4 AEAT / Modelos 111 y 190

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Payload Modelo 111 | ✅ Simulado | `aeatPreparatoryService.ts` — trimestral y mensual |
| Payload Modelo 190 | ✅ Simulado | `aeatPreparatoryService.ts` — anual |
| Conciliación fiscal | ✅ Funcional | `fiscalMonthlyExpedientEngine` — 8 checks |
| Generación fichero .190/.111 | ❌ No genera fichero oficial | Solo estructura de datos interna |
| Transmisión a AEAT (Cl@ve/PIN) | ❌ No existe | Sin integración real |
| **Veredicto** | **PREPARATORIO** | Cálculo y consistencia internos; sin fichero ni transmisión oficial |

### C.5 Official Submissions Hub

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Máquina de estados (16 niveles) | ✅ Funcional | `preparatorySubmissionEngine.ts` |
| Tabla BD `hr_official_submissions` | ✅ Funcional | Persistencia de simulaciones |
| Dry-runs | ✅ Funcional | Con snapshots y evidencias |
| Sandbox multi-entorno | ✅ Funcional | 4 entornos modelados (sandbox/test/preprod/prod) |
| Aprobación interna pre-real | ✅ Funcional | 10 checks de elegibilidad |
| **Conectores reales detrás** | **❌ NINGUNO** | El hub orquesta simulaciones, no transmisiones |
| **Veredicto** | **HUB DE SIMULACIÓN AVANZADA** | No es un hub de integración real |

---

## D. CREDENCIALES, CERTIFICADOS Y CONFIGURACIÓN

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Certificados digitales reales | ❌ No existen | `erp_hr_domain_certificates` solo almacena metadatos (alias, expiración, impacto) — SIN material criptográfico |
| Endpoints oficiales (SILTRA, SEPE, AEAT) | ❌ No configurados | No hay URLs de organismos en código ni en variables de entorno |
| Variables de entorno específicas | ❌ No existen | No hay `SILTRA_ENDPOINT`, `SEPE_API_KEY`, `AEAT_CERT_PATH` ni similares |
| Flags de producción | ✅ Explícitamente bloqueados | `isRealSubmissionBlocked() === true` hardcoded en 2 archivos |
| `isEnvironmentActivatable('production')` | ❌ Devuelve `false` | Hard block en código |
| Protección contra envío accidental | ✅ Múltiples capas | 4 bloqueos independientes documentados en sección B |
| Edge functions de transmisión real | ❌ No existen | Las edge functions existentes son para analytics, reporting y orquestación interna |

**Conclusión: NO hay infraestructura de producción real configurada. El sistema está DISEÑADO para no enviar en real.**

---

## E. PRUEBA DE GO-LIVE LÓGICO

| Nivel | ¿Listo hoy? | Justificación |
|-------|-------------|---------------|
| **Demo-ready** | ✅ SÍ | Demo comercial completa con 12 perfiles, seed maestro, 15 pasos de circuito, narrativa comercial |
| **Sandbox-ready** | ✅ SÍ | Entorno sandbox con 11 checks de elegibilidad, ejecuciones simuladas, comparativas dry-run |
| **Preprod-ready** | ✅ SÍ | Convivencia DEMO/PREPROD/PROD implementada, guards activos, seeds bloqueados en no-demo |
| **Pilot-ready** | ⚠️ PARCIAL | Operación interna (nómina, contratos, expedientes) lista; integraciones oficiales solo simuladas |
| **Production-ready** | ❌ NO | Sin conectores reales, sin certificados, sin transmisión oficial |

### ¿Qué impide cada nivel?

**Piloto controlado (lo que falta):**
- Datos reales de al menos 1 empresa
- Vinculación `user_id` ↔ `employee_id` para Portal
- Validación con asesoría laboral real
- Nóminas reales calculadas y verificadas manualmente

**Producción real parcial (lo que falta):**
- Todo lo anterior +
- Certificados digitales reales (SILTRA, AEAT)
- Endpoints oficiales configurados
- Eliminación del bloqueo `isRealSubmissionBlocked()`
- Fase de desarrollo V2-ES.10+ para transmisión real
- Homologación con organismos

**Producción real completa (lo que falta):**
- Todo lo anterior +
- Firma electrónica integrada
- Parsing de respuestas oficiales (acuses, errores)
- Retry/reconciliación de envíos fallidos reales
- Certificación SILTRA si aplica
- Auditoría de cumplimiento por tercero

---

## F. SEGURIDAD OPERATIVA

| Elemento | Estado | Detalle |
|----------|--------|---------|
| Separación DEMO/PREPROD/PROD | ✅ Implementado | `HREnvironmentContext` con 3 modos |
| Bloqueo de seeds en producción | ✅ Implementado | Guard en `HRDemoSeedPanel` |
| Control de utilidades peligrosas | ✅ Implementado | `demoToolsVisible: false` en PREPROD/PROD |
| Trazabilidad de envíos | ✅ Implementado | 14 tipos de eventos audit en `dryRunAuditEvents` |
| Auditoría de acciones críticas | ✅ Implementado | Triggers inmutables en tablas sensibles |
| RLS multi-tenant | ✅ Implementado | 41+ tablas con aislamiento por `company_id` |
| Roles y permisos | ✅ Implementado | admin, superadmin, hr_manager, employee |
| Logs suficientes | ✅ Implementado | Console logs + audit log BD |
| Manejo de errores | ✅ Implementado | Try/catch + fallbacks en hooks |
| Rollback/estrategia ante fallos | ⚠️ Parcial | Snapshots inmutables permiten auditoría; sin rollback automático de envíos (no aplica sin envío real) |
| Confirmación doble en PROD | ✅ Implementado | `requireDoubleConfirm: true` en config |

**Falta obligatorio antes de go-live real:**
- Certificados digitales reales y gestión de renovación
- Endpoints oficiales con credenciales productivas
- Fase de desarrollo para transmisión real (V2-ES.10+)

---

## G. ESTADO DE OPERATIVIDAD POR PASO

| # | Paso | Demo | Sandbox | Piloto | Producción real | Qué falta para subir |
|---|------|------|---------|--------|----------------|---------------------|
| 1 | Alta del empleado | ✅ | ✅ | ✅ | ✅ | — (operación interna) |
| 2 | Comunicación incorporación | ✅ | ✅ | ⚠️ Simulado | ❌ | Conector TGSS/SILTRA real |
| 3 | Nómina con casuísticas | ✅ | ✅ | ✅ | ✅ | Validación manual con asesor |
| 4 | Permiso nacimiento | ✅ | ✅ | ✅ | ✅ | — |
| 5 | Desplazamiento internacional | ✅ | ✅ | ✅ | ⚠️ | Conector A1/TGSS para desplazados |
| 6 | Nómina de atrasos | ✅ | ✅ | ✅ | ✅ | Validación manual |
| 7 | Reducción jornada | ✅ | ✅ | ✅ | ✅ | — |
| 8 | Informe costes y nómina | ✅ | ✅ | ✅ | ✅ | — |
| 9 | Seguros sociales | ✅ | ✅ | ⚠️ Simulado | ❌ | Conector SILTRA + certificado |
| 10 | Registro horario | ✅ | ✅ | ✅ | ✅ | — |
| 11 | Modelos 111/190 | ✅ | ✅ | ⚠️ Simulado | ❌ | Generación fichero + Cl@ve/PIN AEAT |
| 12 | Despido disciplinario | ✅ | ✅ | ✅ | ✅ | Validación legal |
| 13 | Despido objetivo | ✅ | ✅ | ✅ | ✅ | Validación legal |
| 14 | Comunicación salida | ✅ | ✅ | ⚠️ Simulado | ❌ | Conector TGSS real |

**Resumen:** 14/14 demo-ready, 14/14 sandbox-ready, 10/14 piloto-ready (4 simulados), 10/14 producción interna, 0/4 conectores oficiales reales.

---

## H. GAP ANALYSIS

### H.1 De demo/sandbox → piloto

| Gap | Severidad | Tipo | Esfuerzo | Bloquea go-live |
|-----|-----------|------|----------|----------------|
| Datos reales de 1 empresa piloto | Alta | Operativo | Medio | ✅ Sí |
| Vinculación user_id ↔ employee_id | Media | Técnico | Bajo | ⚠️ Para portal |
| Validación nómina con asesor laboral | Alta | Funcional | Medio | ✅ Sí |
| Test con convenio colectivo real | Alta | Funcional | Medio | ✅ Sí |

### H.2 De piloto → producción parcial

| Gap | Severidad | Tipo | Esfuerzo | Bloquea go-live |
|-----|-----------|------|----------|----------------|
| Certificados digitales reales | Crítica | Técnico/Legal | Alto | ✅ Sí |
| Endpoints SILTRA/SEPE/AEAT reales | Crítica | Técnico | Alto | ✅ Sí |
| Desarrollo V2-ES.10: transmisión real | Crítica | Técnico | Muy alto | ✅ Sí |
| Eliminación controlada de `isRealSubmissionBlocked` | Crítica | Seguridad | Medio | ✅ Sí |
| Parsing de respuestas oficiales | Alta | Técnico | Alto | ✅ Sí |
| Firma electrónica | Crítica | Técnico/Legal | Alto | ✅ Sí |

### H.3 De producción parcial → producción completa

| Gap | Severidad | Tipo | Esfuerzo | Bloquea |
|-----|-----------|------|----------|---------|
| Homologación SILTRA | Alta | Legal | Variable | ✅ |
| Retry/reconciliación de envíos fallidos | Alta | Técnico | Medio | ✅ |
| Monitoreo 24/7 de transmisiones | Media | Operativo | Medio | ⚠️ |
| SLA con soporte técnico | Media | Operativo | — | ⚠️ |
| Auditoría externa de cumplimiento | Alta | Legal | Variable | ✅ |

### Top 10 gaps para go-live real

1. **No hay conectores reales** — Solo simulación
2. **No hay certificados digitales** — Solo metadatos
3. **No hay endpoints oficiales** — Sin URLs de organismos
4. **`isRealSubmissionBlocked()` hardcoded a `true`** — Bloqueo intencionado
5. **No hay generación de ficheros oficiales** — Solo estructuras internas
6. **No hay firma electrónica** — Sin PKI integrada
7. **No hay parsing de respuestas oficiales** — Sin gestión de acuses
8. **No hay datos reales validados** — Solo datos demo
9. **No hay validación con asesoría laboral** — Cálculos sin homologar
10. **No hay retry de envíos reales** — Sin gestión de fallos de transmisión

---

## I. ROADMAP DE PRODUCCIÓN REAL

### Etapa 1: Preproducción / Validación (4-8 semanas)

| Aspecto | Detalle |
|---------|---------|
| **Objetivos** | Validar operación interna con datos reales |
| **Entregables** | 1 empresa piloto cargada, nóminas verificadas, convenio validado |
| **Validaciones** | Comparación manual nómina vs asesoría, test de todos los flujos con datos reales |
| **Riesgos** | Discrepancias en cálculos vs software de referencia |
| **Criterio de salida** | 3 meses de nómina calculada correctamente vs referencia |
| **Responsables** | Equipo técnico + asesoría laboral |

### Etapa 2: Piloto controlado (8-16 semanas)

| Aspecto | Detalle |
|---------|---------|
| **Objetivos** | Operación interna completa + preparación de envíos en paralelo (dual-run) |
| **Entregables** | Empresa operando internamente, envíos oficiales verificados en paralelo con sistema actual |
| **Validaciones** | Dual-run: comparar payloads generados vs lo enviado por el sistema actual |
| **Riesgos** | Diferencias en formateo de ficheros oficiales |
| **Criterio de salida** | 3 meses de dual-run sin discrepancias |
| **Responsables** | Equipo técnico + RRHH cliente + asesoría |

### Etapa 3: Producción real (12-24 semanas de desarrollo previo)

| Aspecto | Detalle |
|---------|---------|
| **Objetivos** | Transmisión real a SILTRA/SEPE/AEAT |
| **Entregables** | V2-ES.10: conectores reales, firma, parsing, retry |
| **Validaciones** | Envíos reales a entornos de pruebas de organismos (si existen) |
| **Riesgos** | Cambios regulatorios, compatibilidad de certificados |
| **Criterio de salida** | 1 mes de envíos reales exitosos sin incidencias |
| **Responsables** | Equipo técnico + legal + compliance |

---

## J. RESULTADO FINAL

### 1. Resumen ejecutivo

El módulo RRHH es un sistema **maduro en operación interna** y **avanzado en simulación de integraciones oficiales**, pero **NO tiene conectores reales activos** con ningún organismo español. Todo el sistema de integraciones oficiales (SILTRA, SEPE, AEAT) opera exclusivamente en modo preparatorio/dry-run con bloqueos de seguridad hardcoded.

### 2. Tabla de conectores con estado real

| Conector | Estado REAL | Transmisión oficial |
|----------|------------|-------------------|
| TGSS/SILTRA | **SIMULACIÓN** | ❌ No |
| SEPE/Contrat@ | **SIMULACIÓN** | ❌ No |
| AEAT 111 | **SIMULACIÓN** | ❌ No |
| AEAT 190 | **SIMULACIÓN** | ❌ No |
| Certific@2 | **SOLO UI** | ❌ No |
| Delt@ | **SOLO UI** | ❌ No |

### 3. Confirmación explícita

- **Solo simulado:** Toda transmisión a organismos oficiales
- **Preparado (validación interna):** Payloads, consistencia, readiness, plazos, evidencias
- **Productivo real (operación interna):** Nómina, contratos, expedientes, permisos, fichajes, settlements

### 4. Respuestas directas

- **¿Está activado SILTRA/TGSS en real?** → **NO.** Solo simulación.
- **¿Se puede trabajar ya en producción?** → **SÍ para operación interna** (nómina, contratos, expedientes). **NO para envíos oficiales.**

### 5. Nivel de readiness

| Nivel | Estado |
|-------|--------|
| Demo | ✅ Completo |
| Sandbox | ✅ Completo |
| Preprod | ✅ Viable |
| Piloto (operación interna) | ✅ Viable con datos reales |
| Piloto (envíos oficiales) | ❌ No viable hoy |
| Producción (interna) | ⚠️ Viable con monitoreo |
| Producción (conectores reales) | ❌ No viable — requiere desarrollo V2-ES.10+ |

### 6. Top 10 gaps (ver sección H)

### 7. Roadmap (ver sección I)

### 8. Recomendación final

**El módulo puede entrar HOY en piloto controlado de operación interna** (nómina, contratos, expedientes, permisos, fichajes, settlements) con datos reales de una empresa piloto y validación de asesoría laboral.

**NO puede entrar en producción de envíos oficiales** sin una fase de desarrollo significativa (V2-ES.10+) que implemente conectores reales, certificados digitales, firma electrónica y parsing de respuestas oficiales.

**Recomendación:** Proceder con **Etapa 1 (Preproducción)** del roadmap usando operación interna, manteniendo el sistema de simulación avanzada como herramienta de validación y preparación para la futura integración real.
