# G2.0 — Expatriate AI & Jurisdiction Intelligence — Baseline

## 1. Resumen Ejecutivo

Este documento establece la base arquitectónica y funcional para el sistema de **Expatriate AI & Jurisdiction Intelligence** del ERP. Define la visión objetivo, la taxonomía de casos soportados, los límites honestos de automatización, y el roadmap de construcción incremental.

### Principio rector

> No se construye un "agente mágico" que pretenda aplicar automáticamente toda la legislación mundial. Se construye un sistema de **knowledge packs estructurados** por país/corredor, con **gates de revisión obligatoria**, **clasificación honesta de soporte**, y **trazabilidad de decisiones**.

### Estado actual

El ERP ya dispone de una infraestructura de movilidad internacional de grado productivo (P1.7B-RA) que clasifica 55+ países, evalúa impacto fiscal Art. 7.p, y genera checklists documentales automáticos. Sin embargo, carece de activación automática, knowledge packs estructurados, y propagación cross-module.

### Objetivo G2.0

Definir el baseline completo para que G2.1 pueda implementar:
- Un supervisor de expatriados (`ExpatriateSupervisor`)
- Los primeros knowledge packs por corredor (fase 1)
- La propagación de impacto a RRHH, Fiscal, Jurídico, Auditoría e IA Center

---

## 2. Inventario del Sistema Actual de Movilidad Internacional

### 2.1 Motores (Engines)

#### `internationalMobilityEngine.ts` — 497 líneas

| Capacidad | Detalle |
|-----------|---------|
| Clasificación SS | 3 regímenes: `eu_eea_ch`, `bilateral_agreement`, `no_agreement` |
| Knowledge Base | 55+ países: 26 UE + 3 EEA + CH + UK + AD + 23 bilaterales |
| Country Profile | `getCountryProfile(code)` → isEU, isEEA, isCH, hasBilateralSS, hasCDI |
| Checklist documental | Generado por régimen × necesidad de work permit |
| Payroll Impact | Split/shadow/tax equalization/hypothetical tax flags |
| SS Impact | Home/host/dual coverage, A1/bilateral cert, voluntary option |
| Tax Impact Summary | Residency risk, Art. 7.p potential, CDI available, double tax risk |
| Review Triggers | Por severidad (critical/high/medium/low) y categoría (ss/tax/legal/payroll/compliance) |
| Risk Score | 0-100, calculado por régimen + triggers + duración |
| Support Level | `deriveSupportLevel(regime, triggers, riskScore)` → 3 niveles |

**Tipos exportados clave:**
- `SSRegime`, `SupportLevel`, `CountryProfile`, `MobilityClassification`
- `ReviewTrigger`, `DocumentChecklistItem`, `PayrollImpact`, `SSImpact`, `TaxImpactSummary`
- `MobilityInput` (interfaz de entrada principal)

#### `internationalTaxEngine.ts` — 323 líneas

| Capacidad | Detalle |
|-----------|---------|
| Art. 7.p LIRPF | Evaluación de elegibilidad con 4 requisitos, cálculo de exención prorrateada (máx 60.100€/año) |
| Residencia fiscal | Regla 183 días + centro de intereses vitales (cónyuge, hijos, actividad económica) |
| CDI Lookup | 24 tratados con provisiones clave por país |
| Doble imposición | Clasificación de riesgo: none/low/medium/high |
| Régimen excesos | Detección de aplicabilidad Art. 9.A.3.b RIRPF (incompatible con Art. 7.p) |
| Beckham Law | Detección de elegibilidad régimen impatriados Art. 93 LIRPF |

**Tipos exportados clave:**
- `Art7pResult`, `Art7pRequirement`, `Art7pEligibility`
- `ResidencyAnalysis`, `ResidencyClassification`
- `DoubleTaxTreaty`, `InternationalTaxImpact`
- `TaxImpactInput` (interfaz de entrada principal)

### 2.2 Hooks

#### `useExpatriateCase.ts` — 136 líneas

Hook de consolidación que fusiona `classifyMobilityCase` + `evaluateInternationalTaxImpact` para una `MobilityAssignment` dada.

**Output: `ExpatriateCase`**
- `mobilityClassification` — resultado completo del engine de movilidad
- `taxImpact` — resultado completo del engine fiscal
- `overallSupportLevel` — peor de ambos engines
- `consolidatedRiskScore` — media ponderada (60% movilidad + 40% fiscal)
- `allReviewTriggers` — unión de triggers de ambos engines
- `documentCompleteness` — required/present/missing/percentage

#### `useGlobalMobility.ts` — ~520 líneas

CRUD completo para el módulo de movilidad:
- Asignaciones internacionales (CRUD + estados)
- Documentos de movilidad (upload, tracking)
- Proyecciones de coste
- Audit log
- Suscripciones realtime

**Tipos clave:** `MobilityAssignment`, `MobilityDocument`

### 2.3 Componentes UI

| Componente | Función |
|------------|---------|
| `MobilityAssignmentDetail.tsx` | Detalle con 7 tabs (incluye Clasificación + Impacto Fiscal) |
| `MobilityClassificationPanel.tsx` | Panel visual de clasificación SS, régimen, soporte, triggers |
| `MobilityTaxImpactPanel.tsx` | Panel de impacto fiscal: Art. 7.p, residencia, CDI, riesgo |
| `MobilityAssignmentsList.tsx` | Lista de asignaciones internacionales |
| `MobilityDashboard.tsx` | Dashboard de movilidad |
| `MobilityDocumentManager.tsx` | Gestión de documentos de movilidad |
| `MobilityCostProjection.tsx` | Proyecciones de coste |
| `MobilityComplianceChecklist.tsx` | Checklist de compliance |
| `MobilityAuditLog.tsx` | Log de auditoría |
| `index.ts` | Barrel exports |

### 2.4 Integración con Preflight

`payrollPreflightEngine.ts` incluye un substep condicional de movilidad que:
- Detecta si el empleado tiene asignación internacional activa
- Muestra semáforo basado en `overallSupportLevel`
- **NO bloquea** por defecto (informativo)

### 2.5 Documentación existente

| Documento | Contenido |
|-----------|-----------|
| `docs/P1_expatriates_report.md` | Report completo P1.7B-RA: módulos tocados, before/after, restricciones |
| `docs/P1_expatriates_case_matrix.md` | Matriz país × régimen × support level para 55+ países |

---

## 3. Límites del Sistema Actual

### 3.1 Sin activación automática

El sistema actual requiere que un usuario cree manualmente una `MobilityAssignment` para activar la clasificación. No hay detección automática basada en señales del employee master (país distinto, split payroll, etc.).

### 3.2 Knowledge hardcoded

Todo el conocimiento jurisdiccional está embebido como constantes TypeScript en los engines:
- `EU_COUNTRIES`, `EEA_NON_EU`, `BILATERAL_SS_AGREEMENTS` en `internationalMobilityEngine.ts`
- `DOUBLE_TAX_TREATIES` en `internationalTaxEngine.ts`

**Consecuencias:**
- No hay versionado del conocimiento
- No hay política de frescura/obsolescencia
- No hay nivel de confianza por jurisdicción
- Para actualizar conocimiento hay que modificar código fuente
- No hay diferenciación por corredor (ES→FR vs FR→ES)

### 3.3 Sin propagación cross-module

Los resultados de la clasificación de movilidad se muestran en el panel de clasificación y en preflight, pero:
- **Fiscal** no recibe señales automáticas de residencia fiscal o Art. 7.p
- **Jurídico** no recibe alertas de documentación legal requerida
- **Auditoría** no recibe evidencias de decisiones tomadas
- **IA Center** no tiene observabilidad sobre freshness de knowledge ni confidence
- **Última milla** no recibe documentos de movilidad en su flujo

### 3.4 Sin inteligencia de corredor

El sistema clasifica por país destino, pero no tiene conocimiento específico del corredor origen→destino. ES↔FR tiene implicaciones distintas a ES↔US, pero ambos se tratan como "país destino" sin contexto del corredor.

### 3.5 Sin modelo de confianza

No hay `confidence_score` por jurisdicción. Un país UE bien documentado y un país bilateral con información limitada reciben el mismo tratamiento de "conocimiento disponible".

### 3.6 Sin supervisor de expatriados

No existe un `ExpatriateSupervisor` edge function que coordine la detección, clasificación, propagación y gates de revisión como un flujo orquestado.

---

## 4. Arquitectura Objetivo

### 4.1 Visión general

```
┌─────────────────────────────────────────────────────────┐
│                   ACTIVATION LAYER                       │
│  Employee Master signals → Trigger Detection Engine      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│               EXPATRIATE SUPERVISOR                      │
│  Edge function: orchestrates detection → classification  │
│  → knowledge loading → impact resolution → propagation   │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Country  │ │ Corridor │ │ Mobility │ │ Review   │
│ Knowledge│ │ Knowledge│ │ Impact   │ │ Trigger  │
│ Pack     │ │ Pack     │ │ Resolver │ │ Engine   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│            CROSS-MODULE PROPAGATION MAP                  │
│  HR │ Fiscal │ Legal │ Audit │ AI Center │ Preflight    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Componentes de la arquitectura

#### 4.2.1 `ExpatriateSupervisor` — Edge Function

**Misión:** Orquestar el flujo completo de detección, clasificación y propagación de un caso de expatriación.

**Flujo:**
1. Recibe señal de activación (trigger de employee master, creación de assignment, cambio de país)
2. Carga `CountryKnowledgePack` del país destino
3. Carga `CorridorKnowledgePack` del corredor origen→destino (si existe)
4. Ejecuta clasificación usando engines existentes (`classifyMobilityCase` + `evaluateInternationalTaxImpact`)
5. Resuelve impactos por módulo via `MobilityImpactResolver`
6. Evalúa gates de revisión via `ReviewTriggerEngine`
7. Propaga señales a módulos afectados via `CrossModulePropagationMap`
8. Registra decisiones y evidencias para auditoría

**Interfaz propuesta:**

```typescript
interface ExpatriateSupervisorInput {
  action: 'detect_and_classify' | 'reclassify' | 'check_freshness' | 'get_corridor_info';
  company_id: string;
  employee_id: string;
  assignment_id?: string;
  // Señales de activación
  signals?: ActivationSignal[];
}

interface ExpatriateSupervisorOutput {
  case_id: string;
  classification: MobilityClassification;
  tax_impact: InternationalTaxImpact;
  overall_support_level: SupportLevel;
  corridor_pack_used: string | null;
  country_pack_used: string;
  pack_version: string;
  pack_freshness: 'current' | 'stale' | 'expired';
  impacts_by_module: ModuleImpact[];
  review_gates: ReviewGate[];
  propagation_log: PropagationEntry[];
  confidence_score: number;
  timestamp: string;
}
```

**Auth:** JWT forwarding (patrón G1.1), `validateTenantAccess` con `company_id`.

#### 4.2.2 `CountryKnowledgePack`

**Misión:** Encapsular todo el conocimiento jurisdiccional de un país en una estructura versionada y auditable.

**Detalle completo en:** `docs/G2_expatriate_knowledge_pack_model.md`

**Resumen:**
- Estructura JSON inmutable por versión
- Campos: SS regime, CDI status, tax rules, immigration, documents, triggers, confidence
- Política de frescura: 90 días current → stale → expired
- Fuentes legales con nivel de confianza

#### 4.2.3 `CorridorKnowledgePack`

**Misión:** Encapsular conocimiento específico del corredor origen→destino que no existe a nivel de país individual.

**Ejemplos de conocimiento corredor-específico:**
- ES→FR: Reglamento CE 883/2004, A1 automático, CDI Art. 15 específico
- ES→US: Bilateral SS España-EEUU, certificado de cobertura, CDI Art. 15 servicios personales
- ES→AD: Bilateral post-2015, CDI con intercambio automático de información

#### 4.2.4 `MobilityImpactResolver`

**Misión:** Derivar impactos concretos por módulo a partir de la clasificación + knowledge pack + assignment.

```typescript
interface ModuleImpact {
  module: 'hr' | 'fiscal' | 'legal' | 'audit' | 'ai_center' | 'preflight' | 'last_mile';
  impact_type: 'alert' | 'checklist' | 'review_required' | 'document_required' | 'flag' | 'block';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action_required?: string;
  auto_resolvable: boolean;
  owner_domain: string;
}
```

#### 4.2.5 `ReviewTriggerEngine` (extensión)

**Misión:** Extender el engine actual de review triggers con:
- Gates de revisión obligatoria (bloquean avance si no se resuelven)
- Clasificación por dominio responsable
- Escalación automática si gate no se resuelve en plazo

```typescript
interface ReviewGate {
  id: string;
  trigger_id: string;
  gate_type: 'mandatory_review' | 'specialist_referral' | 'document_verification' | 'management_approval';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'escalated';
  owner_domain: string;
  owner_role: string;
  deadline_days: number;
  escalation_target?: string;
  evidence_required: string[];
}
```

#### 4.2.6 `KnowledgeFreshnessPolicy`

**Misión:** Definir cuándo un knowledge pack es `current`, `stale` o `expired`.

| Estado | Criterio | Comportamiento |
|--------|----------|----------------|
| `current` | Última revisión < 90 días | Uso automático sin advertencia |
| `stale` | Última revisión 90-180 días | Uso con advertencia visual, flag en IA Center |
| `expired` | Última revisión > 180 días | No usar automáticamente, requiere revisión previa |

**Confidence decay:**
- Base confidence del pack (0-100)
- Decay: -1 punto por cada 10 días sin revisión (después de los primeros 90)
- Mínimo: 30 (nunca llega a 0 para packs con fuentes oficiales)

#### 4.2.7 `CrossModulePropagationMap`

**Misión:** Definir qué módulo recibe qué señal cuando se detecta/clasifica un caso de expatriación.

**Detalle completo en:** `docs/G2_expatriate_cross_module_impact_matrix.md`

---

## 5. Taxonomía de Casos Soportados

### 5.1 Los 12 tipos de caso

| # | Tipo de caso | Support Level Base | Revisión obligatoria | Módulos afectados | Docs mínimos | Riesgo base |
|---|---|---|---|---|---|---|
| 1 | Outbound standard assignment (UE) | `supported_production` | No | HR, Fiscal, Preflight | A1, carta asignación, TSE | Bajo (0-20) |
| 2 | Outbound standard assignment (bilateral) | `supported_with_review` | Sí (SS) | HR, Fiscal, Legal, Preflight | Cert. bilateral, carta, cert. residencia | Medio (20-40) |
| 3 | Outbound standard assignment (sin convenio) | `supported_with_review` / `out_of_scope` | Sí (SS + Fiscal + Legal) | HR, Fiscal, Legal, Audit, Preflight | Seguro privado, cert. residencia, work permit | Alto (40-70) |
| 4 | Inbound employee (UE) | `supported_production` | No | HR, Fiscal, Preflight | A1 inverso, contrato local | Bajo (0-20) |
| 5 | Inbound employee (bilateral/sin convenio) | `supported_with_review` | Sí (SS + Legal) | HR, Fiscal, Legal, Preflight | Work permit, visa, cert. cobertura | Medio-Alto (30-60) |
| 6 | Short-term secondment (<6 meses) | `supported_production` | No (si UE) | HR, Fiscal, Preflight | A1, carta | Bajo (0-15) |
| 7 | Long-term relocation (>24 meses) | `supported_with_review` | Sí (residencia fiscal) | HR, Fiscal, Legal, Audit, Preflight | Cambio de residencia, nuevo contrato | Alto (40-70) |
| 8 | Split payroll case | `supported_with_review` | Sí (payroll + fiscal) | HR, Fiscal, Legal, Preflight | Acuerdo split, retenciones ambos países | Medio-Alto (35-60) |
| 9 | Shadow payroll case | `supported_with_review` | Sí (fiscal) | HR, Fiscal, Preflight | Cálculo shadow, hypothetical tax | Medio (25-45) |
| 10 | PE-risk case | `out_of_scope` (si crítico) | Sí (obligatoria) | Fiscal, Legal, Audit | Análisis PE, reestructuración | Muy Alto (60-100) |
| 11 | Mobility + equity overlap | `supported_with_review` | Sí (fiscal + legal) | HR, Fiscal, Legal, Audit | Vesting schedule internacional, tax equalization | Alto (45-75) |
| 12 | Mobility + offboarding overlap | `supported_with_review` | Sí (legal + SS) | HR, Legal, Última milla | Liquidación, cobertura SS post-salida, repatriación | Medio-Alto (35-65) |

### 5.2 Reglas de escalación

#### De `supported_production` a `supported_with_review`

Un caso UE/EEE/CH escala si:
- Duración > 24 meses (pérdida cobertura A1)
- PE risk flag activado
- Split payroll activo
- Residencia fiscal limítrofe (>183 días fuera)
- Equity compensation internacional activa

#### De `supported_with_review` a `out_of_scope`

Un caso bilateral/sin convenio escala si:
- Sin CDI + trigger crítico (PE risk)
- Cadena multi-país (A → B → C)
- Derivados financieros internacionales
- Sin convenio SS + sin CDI + >36 meses

---

## 6. Reglas de Support Level

### 6.1 Lógica actual (engine existente)

```typescript
function deriveSupportLevel(regime: SSRegime, triggers: ReviewTrigger[], riskScore: number): SupportLevel {
  if (regime === 'no_agreement' && triggers.some(t => t.severity === 'critical')) return 'out_of_scope';
  if (regime === 'no_agreement') return 'supported_with_review';
  if (triggers.some(t => t.severity === 'critical' || t.severity === 'high')) return 'supported_with_review';
  if (riskScore > 50) return 'supported_with_review';
  return 'supported_production';
}
```

### 6.2 Extensiones propuestas para G2.1

| Factor adicional | Efecto en support level |
|---|---|
| Knowledge pack `stale` | Escala a `supported_with_review` |
| Knowledge pack `expired` | Escala a `out_of_scope` |
| Confidence score < 50 | Escala a `supported_with_review` |
| Confidence score < 30 | Escala a `out_of_scope` |
| Equity overlap detectado | Escala a `supported_with_review` |
| Multi-country chain | Escala a `out_of_scope` |
| Offboarding + mobility activa | Escala a `supported_with_review` |

### 6.3 Consolidación (hook existente)

`useExpatriateCase` ya consolida:
- `overallSupportLevel = worstSupportLevel(mobility.supportLevel, tax.supportLevel)`
- `consolidatedRiskScore = mobility.riskScore * 0.6 + taxRiskFactor * 0.4`

**Extensión propuesta:** Añadir factor de confidence del knowledge pack como tercer input.

---

## 7. Frontera Honesta de Automatización

### 7.1 Automatización segura (sin revisión humana)

| Capacidad | Condición |
|-----------|-----------|
| Clasificación SS régimen | Cualquier país en KB (55+) |
| Generación checklist documental | Por régimen × tipo assignment |
| Cálculo risk score | Determinístico basado en factores |
| Determinación support level | Basado en régimen + triggers + risk |
| Art. 7.p elegibilidad | Si todos los requisitos tienen valor (no null) |
| CDI lookup | Si país está en DOUBLE_TAX_TREATIES (24+) |
| Regla 183 días | Cálculo aritmético puro |
| Flag de alertas en preflight | Informativo, no bloqueante |

### 7.2 Automatización asistida (con revisión recomendada)

| Capacidad | Razón de revisión |
|-----------|-------------------|
| Art. 7.p con requisito `null` | Paraíso fiscal necesita verificación manual |
| Residencia fiscal por centro vital | Interpretativa, depende de circunstancias |
| CDI aplicación efectiva | Provisiones específicas pueden variar |
| Shadow payroll cálculo | Requiere datos de retención del país destino |
| Tax equalization | Requiere datos fiscales precisos de ambos países |
| Estimación exención Art. 7.p | Prorrateado, pero puede haber excepciones |

### 7.3 Revisión humana obligatoria

| Capacidad | Razón |
|-----------|-------|
| Establecimiento permanente (PE) | Implicaciones legales y fiscales graves |
| Split payroll inter-jurisdicción | Coordinación fiscal compleja |
| Cambio de residencia fiscal | Decisión con consecuencias multi-año |
| Régimen Beckham (impatriados) | Requisitos estrictos de elegibilidad |
| Equity compensation + movilidad | Timing de vesting × residencia fiscal |
| Offboarding + movilidad activa | Liquidación + repatriación + SS |
| Caso sin CDI ni convenio SS | Sin framework bilateral, riesgo alto |

### 7.4 Fuera de alcance del sistema

| Capacidad | Razón |
|-----------|-------|
| Cadenas multi-país (A → B → C) | Complejidad exponencial, cada jurisdicción interactúa |
| Cálculo exacto de retenciones en país destino | Requiere conocimiento fiscal local detallado |
| Phantom shares / derivados internacionales | Tratamiento fiscal altamente especializado |
| Asesoría jurídica laboral local | Requiere abogado del país destino |
| Inmigración / visados | Requiere especialista de inmigración |
| Planificación fiscal agresiva | Fuera del scope ético y legal del ERP |

---

## 8. Corredores Fase 1

### 8.1 Corredores prioritarios (G2.1)

| Corredor | Régimen SS | CDI | Complejidad | Prioridad |
|----------|-----------|-----|-------------|-----------|
| ES ↔ FR | UE (CE 883/2004) | ✅ Art. 15 + 24 | Baja | 🔴 P1 |
| ES ↔ PT | UE (CE 883/2004) | ✅ Art. 15 + 23 | Baja | 🔴 P1 |
| ES ↔ DE | UE (CE 883/2004) | ✅ Art. 15 + 24 | Baja | 🔴 P1 |
| ES ↔ IT | UE (CE 883/2004) | ✅ Art. 15 + 23 | Baja | 🔴 P1 |
| ES ↔ AD | Bilateral | ✅ Art. 14 + 21 | Baja-Media | 🔴 P1 |
| ES ↔ GB | Bilateral post-Brexit | ✅ Art. 15 + 23 | Media | 🔴 P1 |
| ES ↔ CH | UE-extensión bilateral | ✅ Art. 15 + 23 | Baja-Media | 🔴 P1 |
| ES ↔ US | Bilateral | ✅ Art. 15 + 23 | Media-Alta | 🟡 P1 (review) |
| ES ↔ MX | Bilateral | ✅ Art. 15 + 23 | Media | 🟡 P1 (review) |

### 8.2 Corredores fase 2

Resto de países bilaterales: CA, CL, CO, AR, UY, BR, PE, JP, KR, AU, CN, IN, MA, y otros con CDI.

### 8.3 Fuera de alcance inicial

Países sin convenio SS ni CDI con España. Se clasifican como `out_of_scope` y se derivan a especialista.

---

## 9. Recomendación: G2.1 — Siguiente Build

### 9.1 Scope propuesto

| Componente | Acción |
|------------|--------|
| `ExpatriateSupervisor` edge function | Crear (orquestación básica) |
| `CountryKnowledgePack` modelo | Implementar como TypeScript constants (fase 1, sin tabla) |
| `CorridorKnowledgePack` modelo | Implementar para 9 corredores fase 1 |
| `MobilityImpactResolver` | Crear (derivación de impactos por módulo) |
| Activation triggers | Implementar detección automática en employee master |
| Preflight integration | Extender substep con confidence + freshness |
| IA Center observability | Flag de knowledge pack status |

### 9.2 Lo que NO incluye G2.1

- No tabla de knowledge packs en DB (se mantienen como constants hasta G2.2)
- No propagación real a Fiscal/Legal/Audit (solo interfaces definidas)
- No UI nueva (solo extensiones de paneles existentes)
- No edge function desplegada en producción (solo estructura y tests)

### 9.3 Criterio de éxito G2.1

- ExpatriateSupervisor puede recibir un `employee_id` + señales y devolver clasificación completa
- 9 corridor packs documentados y funcionales
- Activation triggers detectan automáticamente al menos 5 señales
- Preflight muestra freshness del knowledge pack
- Documento de validación con 3+ casos reales probados

---

## 10. Compatibilidad

### 10.1 Módulos existentes preservados

| Módulo | Compatibilidad |
|--------|---------------|
| P1.x ciclo laboral | ✅ Sin cambios |
| P1.7B-RA movilidad | ✅ Se extiende, no se reescribe |
| P1.7B-RB stock options | ✅ Se referencia en caso tipo 11 (equity overlap) |
| H1.x hardening UI | ✅ Sin cambios |
| H2.0/H2.1 employee master | ✅ Se consume para activation triggers |
| G1.0/G1.1 agent alignment | ✅ ExpatriateSupervisor sigue patrón G1.1 (JWT forwarding, validateTenantAccess) |
| LM1-LM4 última milla | ✅ Se referencia en caso tipo 12 (offboarding overlap) |

### 10.2 Patrón de auth

ExpatriateSupervisor seguirá el patrón establecido en G1.1:
- JWT forwarding del usuario a downstream
- `validateTenantAccess` con `company_id`
- `adminClient` solo para logging de invocaciones (excepción legítima documentada)

---

## Apéndice A — Glosario

| Término | Definición |
|---------|-----------|
| **A1** | Certificado PD A1 según Reglamento CE 883/2004, acredita legislación SS aplicable |
| **Art. 7.p** | Art. 7.p LIRPF, exención de rentas del trabajo efectivo en el extranjero (máx 60.100€/año) |
| **CDI** | Convenio de Doble Imposición, tratado bilateral para evitar doble tributación |
| **PE** | Establecimiento Permanente, presencia fiscal fija en país destino |
| **SS** | Seguridad Social |
| **Split payroll** | Nómina dividida entre país origen y destino |
| **Shadow payroll** | Cálculo fiscal paralelo en país destino sin pago efectivo |
| **Tax equalization** | Compensación al empleado para que pague lo mismo que en país origen |
| **Beckham Law** | Art. 93 LIRPF, régimen especial de impatriados |
| **Knowledge pack** | Estructura versionada de conocimiento jurisdiccional por país o corredor |
| **Corridor** | Par origen→destino con reglas específicas (ej: ES↔FR) |
| **Review gate** | Punto de control que requiere aprobación humana antes de continuar |
| **Freshness** | Estado de actualización de un knowledge pack (current/stale/expired) |

---

*Documento generado: G2.0 — Expatriate AI & Jurisdiction Intelligence Baseline*
*Fecha: 2026-04-11*
*Compatible con: P1.x, H1.x, H2.x, G1.x, LM1-LM4*
