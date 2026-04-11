# G2.0 — Expatriate Cross-Module Impact Matrix

## 1. Propósito

Este documento define cómo un caso de expatriación/movilidad internacional impacta en cada módulo del ERP, qué señales activan automáticamente el sistema, qué documentación se requiere por tipo de caso, y quién es responsable de cada decisión.

---

## 2. Impacto por Módulo

### 2.1 RRHH (HR)

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Ficha del empleado | Actualizar `country_code`, `ss_regime_country`, `immigration_status`, `work_permit_expiry` | ✅ Parcial (propuesta automática, confirmación manual) | HR Admin |
| Contrato | Addendum de asignación internacional, cláusulas de movilidad | ❌ Manual (template asistido) | HR Legal |
| Assignment | Crear/actualizar `MobilityAssignment` con todos los campos | ✅ Automático (CRUD existente) | HR Admin |
| Checklist onboarding | Generar checklist de movilidad: documentos, formación, logística | ✅ Automático (engine existente) | HR Admin |
| Checklist offboarding | Si mobility + offboarding overlap: repatriación, cierre SS, liquidación | ✅ Parcial (template + revisión) | HR Admin + Legal |
| Cost projection | Proyección de costes de asignación (relocation, housing, tax equalization) | ✅ Automático (módulo existente) | HR Finance |

### 2.2 Fiscal

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Residencia fiscal | Clasificación resident/non-resident/outbound/beckham | ✅ Automático (engine existente) con gate de revisión |  Fiscal |
| Art. 7.p LIRPF | Evaluación elegibilidad y cálculo exención | ✅ Automático (engine existente) con gate si `requires_review` | Fiscal |
| CDI aplicación | Lookup de tratado y artículos aplicables | ✅ Automático (24 CDI en KB) | Fiscal |
| Retenciones | Ajuste de retención IRPF por Art. 7.p o cambio de residencia | ❌ Manual (requiere cálculo fiscal preciso) | Fiscal |
| Shadow payroll | Cálculo fiscal paralelo en país destino | ❌ Manual (requiere datos fiscales locales) | Fiscal + External |
| Tax equalization | Cálculo de compensación fiscal | ❌ Manual (requiere hypothetical tax + actual tax) | Fiscal + External |
| Doble imposición | Evaluación de riesgo y estrategia de mitigación | ✅ Automático (risk level) + ❌ Manual (estrategia) | Fiscal |

### 2.3 Jurídico (Legal)

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Documentación legal | Verificación de documentos obligatorios por régimen | ✅ Automático (checklist engine) | Legal |
| Permisos de trabajo | Tracking de work permit, visa, residence permit | ✅ Parcial (tracking) + ❌ Manual (gestión) | Legal + Immigration |
| Compliance laboral local | Verificación de cumplimiento normativa laboral destino | ❌ Manual (requiere conocimiento local) | Legal External |
| Cláusulas contractuales | Addendum con cláusulas de movilidad, repatriación, etc. | ❌ Manual (template asistido) | Legal |
| PE risk assessment | Evaluación de riesgo de establecimiento permanente | ❌ Manual obligatoria | Legal + Fiscal |
| Data protection | GDPR/transferencia internacional de datos personales | ❌ Manual (requiere análisis por caso) | Legal + DPO |

### 2.4 Auditoría (Audit)

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Trazabilidad decisiones | Registro de qué knowledge pack se usó, qué versión, qué clasificación | ✅ Automático | System |
| Evidencia documental | Registro de documentos presentados vs requeridos | ✅ Automático (completeness check) | HR + Audit |
| Review gates log | Registro de quién aprobó cada gate de revisión | ✅ Automático | System |
| Versión normativa | Qué versión de la norma se aplicó en cada decisión | ✅ Automático (pack version) | System |
| Anomalías | Detección de inconsistencias (ej: A1 emitido pero >24 meses) | ✅ Automático (reglas) | Audit |
| Compliance audit trail | Trail completo de cada caso de movilidad | ✅ Automático (audit log existente) | System |

### 2.5 IA Center

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Knowledge freshness | Monitorización de estado de knowledge packs (current/stale/expired) | ✅ Automático | System |
| Confidence tracking | Tracking de confidence score por jurisdicción | ✅ Automático | System |
| Agent invocations | Registro de invocaciones al ExpatriateSupervisor | ✅ Automático (erp_ai_agent_invocations) | System |
| Review gate status | Dashboard de gates pendientes de revisión | ✅ Automático | System |
| Anomaly detection | Alertas de casos con clasificación inconsistente | ✅ Automático (reglas) | System |

### 2.6 Preflight / Cockpit

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Substep movilidad | Semáforo basado en support level + document completeness | ✅ Automático (existente) | System |
| Knowledge freshness alert | Badge si knowledge pack es stale/expired | ✅ Automático | System |
| Review gate blocker | Si hay gates obligatorios sin resolver, flag en preflight | ✅ Automático | System |
| Document completeness | Porcentaje de documentos requeridos vs presentados | ✅ Automático (existente) | System |

### 2.7 Última Milla

| Área de impacto | Descripción | Automatizable | Owner |
|----------------|-------------|---------------|-------|
| Documentos de movilidad | Si el trámite de última milla incluye docs de movilidad (ej: baja SS) | ✅ Parcial (detección) + ❌ Manual (gestión) | HR + Legal |
| Repatriación | Si offboarding + mobility: incluir trámites de repatriación | ❌ Manual (complejo) | HR + Legal |
| Liquidación internacional | Si offboarding + mobility: liquidación multi-jurisdicción | ❌ Manual obligatoria | Fiscal + Legal |

---

## 3. Triggers de Activación Automática

### 3.1 Los 10 triggers

| # | Señal | Campo/fuente | Condición | Severidad | Acción |
|---|-------|-------------|-----------|-----------|--------|
| 1 | País origen ≠ país destino | `employee.country_code` ≠ `assignment.host_country_code` | Siempre | 🔴 Activación obligatoria | Cargar knowledge pack, clasificar |
| 2 | Split payroll activo | `assignment.split_payroll === true` | Siempre | 🟡 Review trigger | Añadir flag fiscal + payroll |
| 3 | Shadow payroll activo | `assignment.shadow_payroll === true` | Siempre | 🟡 Review trigger | Añadir flag fiscal |
| 4 | Tax residence ≠ home country | `employee.tax_residence_country` ≠ `employee.country_code` | Siempre | 🔴 Activación obligatoria | Clasificar residencia fiscal |
| 5 | SS regime country ≠ home | `employee.ss_regime_country` ≠ `employee.country_code` | Siempre | 🔴 Activación obligatoria | Clasificar régimen SS |
| 6 | Work permit requerido | `assignment.host_country` no es UE/EEE/CH | Automático | 🟡 Checklist trigger | Añadir docs de inmigración |
| 7 | Assignment type internacional | `assignment.assignment_type` ∈ ['international', 'secondment', 'expatriate'] | Siempre | 🔴 Activación obligatoria | Flujo completo |
| 8 | Immigration status presente | `employee.immigration_status` ≠ null | Siempre | 🟡 Review trigger | Verificar vigencia |
| 9 | Local ID number extranjero | `employee.local_id_number` indica nacionalidad distinta | Heurístico | 🟢 Info trigger | Flag informativo |
| 10 | Equity + mobility overlap | `employee` tiene stock options activas + assignment internacional | Cruce de datos | 🟡 Review obligatoria | Caso tipo 11 |

### 3.2 Lógica de activación

```typescript
interface ActivationSignal {
  trigger_id: number;           // 1-10
  trigger_name: string;
  severity: 'mandatory' | 'review' | 'info';
  source_field: string;
  current_value: unknown;
  expected_value: unknown;
  detected_at: string;          // ISO 8601
}

function detectActivationSignals(
  employee: EmployeeMasterRecord,
  assignment?: MobilityAssignment,
  equityPlans?: StockOptionPlan[],
): ActivationSignal[] {
  const signals: ActivationSignal[] = [];

  // Trigger 1: País mismatch
  if (assignment && employee.country_code !== assignment.host_country_code) {
    signals.push({
      trigger_id: 1,
      trigger_name: 'country_mismatch',
      severity: 'mandatory',
      source_field: 'country_code vs host_country_code',
      current_value: employee.country_code,
      expected_value: assignment.host_country_code,
      detected_at: new Date().toISOString(),
    });
  }

  // Trigger 4: Tax residence mismatch
  if (employee.tax_residence_country && employee.tax_residence_country !== employee.country_code) {
    signals.push({
      trigger_id: 4,
      trigger_name: 'tax_residence_mismatch',
      severity: 'mandatory',
      source_field: 'tax_residence_country',
      current_value: employee.tax_residence_country,
      expected_value: employee.country_code,
      detected_at: new Date().toISOString(),
    });
  }

  // Trigger 10: Equity + mobility overlap
  if (assignment && equityPlans?.some(p => p.status === 'active')) {
    signals.push({
      trigger_id: 10,
      trigger_name: 'equity_mobility_overlap',
      severity: 'review',
      source_field: 'stock_options + assignment',
      current_value: 'active_equity + active_assignment',
      expected_value: 'no_overlap',
      detected_at: new Date().toISOString(),
    });
  }

  // ... (triggers 2, 3, 5-9 similar)
  return signals;
}
```

### 3.3 Puntos de integración para detección

| Punto | Cuándo se ejecuta | Triggers evaluados |
|-------|-------------------|-------------------|
| Creación de `MobilityAssignment` | Al guardar nueva asignación | 1, 2, 3, 6, 7 |
| Actualización de `MobilityAssignment` | Al modificar asignación | 1, 2, 3, 6, 7 |
| Actualización de ficha empleado | Al cambiar `country_code`, `tax_residence_country`, `ss_regime_country` | 4, 5, 8, 9 |
| Creación/activación stock option plan | Al activar equity para empleado con assignment | 10 |
| Preflight de nómina | Al ejecutar preflight mensual | Todos (verificación) |

---

## 4. Checklist Documental por Caso × Régimen

### 4.1 Documentos por régimen SS

| Documento | UE/EEE/CH | Bilateral | Sin convenio |
|-----------|-----------|-----------|-------------|
| Carta de asignación | ✅ Obligatorio | ✅ Obligatorio | ✅ Obligatorio |
| Certificado médico | ✅ Obligatorio | ✅ Obligatorio | ✅ Obligatorio |
| Certificado A1 (PD A1) | ✅ Obligatorio | ❌ N/A | ❌ N/A |
| TSE (Tarjeta Sanitaria Europea) | ✅ Obligatorio | ❌ N/A | ❌ N/A |
| Certificado cobertura bilateral | ❌ N/A | ✅ Obligatorio | ❌ N/A |
| Certificado residencia fiscal | ⚪ Condicional | ✅ Obligatorio | ✅ Obligatorio |
| Convenio especial SS (voluntario) | ❌ N/A | ❌ N/A | ⚪ Recomendado |
| Seguro médico privado internacional | ❌ N/A | ❌ N/A | ✅ Obligatorio |
| Permiso de trabajo | ❌ N/A (libre circ.) | ✅ Si fuera UE | ✅ Obligatorio |
| Visado | ❌ N/A | ✅ Si fuera UE | ✅ Obligatorio |
| Permiso de residencia | ❌ N/A (>3m: registro) | ⚪ Según país | ⚪ Según país |

### 4.2 Documentos adicionales por tipo de caso

| Tipo de caso | Documentos adicionales |
|---|---|
| Split payroll | Acuerdo inter-company, cálculo de distribución, certificados de retención ambos países |
| Shadow payroll | Cálculo shadow, hypothetical tax, acuerdo de compensación |
| Tax equalization | Hypothetical tax calculation, equalization agreement, reconciliación anual |
| PE risk | Análisis PE por especialista, reestructuración propuesta, opinión legal |
| Equity + mobility | Vesting schedule con mapping jurisdiccional, tax treatment por país, acuerdo equity internacional |
| Offboarding + mobility | Liquidación multi-jurisdicción, baja SS, certificado de servicios, repatriación |
| Beckham / impatriado | Solicitud régimen especial, certificado no-residencia 5 años previos, modelo 149 |

---

## 5. Review Triggers por Severidad y Dominio

### 5.1 Triggers críticos (bloquean avance)

| Trigger | Dominio | Condición | Acción requerida |
|---------|---------|-----------|------------------|
| PE risk detectado | Fiscal + Legal | `assignment.pe_risk_flag === true` | Análisis obligatorio por especialista fiscal-legal |
| Sin CDI + sin convenio SS | Fiscal + Legal | `!hasCDI && regime === 'no_agreement'` | Derivar a especialista externo. Caso `out_of_scope` |
| Knowledge pack expired | System | `pack.status === 'expired'` | Revisar pack antes de clasificar |

### 5.2 Triggers altos (requieren revisión antes de continuar)

| Trigger | Dominio | Condición | Acción requerida |
|---------|---------|-----------|------------------|
| Residencia fiscal limítrofe | Fiscal | `residency.centerVitalInterests === 'indeterminate'` | Análisis con asesor fiscal especializado |
| Sin CDI (con convenio SS) | Fiscal | `!hasCDI && regime !== 'no_agreement'` | Análisis fiscal específico |
| Duración >24 meses | HR + SS | `assignment.duration_months > 24` | Revisar extensión A1/bilateral, cambio de residencia |
| Riesgo cambio residencia | Fiscal | `assignment.days_in_host > 183` | Determinar residencia fiscal y planificar |

### 5.3 Triggers medios (revisión recomendada)

| Trigger | Dominio | Condición | Acción requerida |
|---------|---------|-----------|------------------|
| Split payroll activo | Payroll + Fiscal | `assignment.split_payroll === true` | Verificar retenciones ambos países |
| Transferencia permanente | HR + Legal | `assignment.assignment_type === 'permanent_transfer'` | Revisar cambio de contrato, SS, residencia |
| Art. 7.p parcialmente elegible | Fiscal | `art7p.eligibility === 'partially_eligible'` | Verificar requisito de paraíso fiscal |
| Knowledge pack stale | System | `pack.status === 'stale'` | Programar revisión del pack |

### 5.4 Triggers informativos (sin bloqueo)

| Trigger | Dominio | Condición | Acción requerida |
|---------|---------|-----------|------------------|
| Régimen de excesos aplicable | Fiscal | `excessRegimeApplicable === true` | Informar al empleado de la opción |
| CDI con provisiones especiales | Fiscal | CDI con artículos no estándar | Informar para planificación |
| Local ID extranjero detectado | HR | Heurística sobre `local_id_number` | Verificar nacionalidad |

---

## 6. Preflight / Alertas — Puntos de Integración

### 6.1 Substep de movilidad en preflight (existente)

```typescript
// payrollPreflightEngine.ts — substep condicional existente
{
  id: 'mobility_check',
  label: 'Movilidad Internacional',
  status: overallSupportLevel === 'out_of_scope' ? 'warning' 
        : overallSupportLevel === 'supported_with_review' ? 'info' 
        : 'ok',
  blocking: false, // informativo, no bloquea nómina
  details: `${supportLevelLabel} — ${documentCompleteness.percentage}% docs`
}
```

### 6.2 Extensiones propuestas para G2.1

| Extensión | Descripción |
|-----------|-------------|
| Knowledge freshness badge | Mostrar si el pack es `current` ✅ / `stale` ⚠️ / `expired` 🔴 |
| Confidence score | Mostrar confidence del pack usado para la clasificación |
| Review gates pendientes | Contar gates sin resolver y mostrar como alerta |
| Document completeness detallado | Desglose por categoría: SS, fiscal, legal, inmigración |
| Equity overlap flag | Si hay equity + mobility activos, flag específico |

### 6.3 Alertas por módulo

| Módulo | Tipo de alerta | Cuándo se dispara |
|--------|---------------|-------------------|
| HR | Banner en ficha empleado | Cuando hay assignment activo con review triggers |
| Fiscal | Alerta en panel fiscal | Cuando Art. 7.p requiere revisión o doble imposición |
| Legal | Item en bandeja de pendientes | Cuando hay documentos legales pendientes |
| Audit | Entrada en log | En cada clasificación o cambio de estado |
| IA Center | Badge de freshness | Cuando pack es stale/expired |
| Preflight | Substep con semáforo | En cada ejecución de preflight |

---

## 7. Ownership por Dominio

### 7.1 Matriz de responsabilidad (RACI)

| Decisión / Acción | HR | Fiscal | Legal | Audit | IA Center | Employee |
|---|---|---|---|---|---|---|
| Crear assignment internacional | **R** | C | C | I | I | I |
| Clasificar régimen SS | **A** (sistema) | I | I | I | I | I |
| Evaluar residencia fiscal | C | **R** | C | I | I | I |
| Aplicar Art. 7.p | I | **R** | C | I | I | C |
| Solicitar A1/cert bilateral | **R** | I | I | I | I | I |
| Gestionar work permit/visa | C | I | **R** | I | I | I |
| Evaluar PE risk | I | **R** | **R** | I | I | I |
| Aprobar review gate SS | **R** | I | I | **A** | I | I |
| Aprobar review gate fiscal | I | **R** | I | **A** | I | I |
| Aprobar review gate legal | I | I | **R** | **A** | I | I |
| Monitorizar knowledge freshness | I | I | I | I | **R** | I |
| Actualizar knowledge pack | I | C | C | I | **R** | I |

**R** = Responsible (ejecuta), **A** = Accountable (aprueba), **C** = Consulted, **I** = Informed

---

## 8. Flujo de Propagación

### 8.1 Diagrama de flujo (texto)

```
                    ┌───────────────────────┐
                    │   SEÑAL DETECTADA     │
                    │  (trigger 1-10)       │
                    └──────────┬────────────┘
                               │
                               ▼
                    ┌───────────────────────┐
                    │  EXPATRIATE           │
                    │  SUPERVISOR           │
                    │  (edge function)      │
                    └──────────┬────────────┘
                               │
                    ┌──────────┴────────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐    ┌─────────────────┐
          │ Country Pack    │    │ Corridor Pack   │
          │ (CKP-XX-vN)    │    │ (CRP-ES-XX-vN)  │
          └────────┬────────┘    └────────┬────────┘
                   │                      │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ CLASSIFICATION       │
                   │ classifyMobilityCase │
                   │ evaluateIntlTax      │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ IMPACT RESOLVER      │
                   │ → ModuleImpact[]     │
                   └──────────┬───────────┘
                              │
              ┌───────┬───────┼───────┬───────┬───────┐
              │       │       │       │       │       │
              ▼       ▼       ▼       ▼       ▼       ▼
           ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
           │ HR  │ │Fiscal│ │Legal│ │Audit│ │ IA  │ │Pre- │
           │     │ │     │ │     │ │     │ │Center│ │flight│
           └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
              │       │       │       │       │       │
              ▼       ▼       ▼       ▼       ▼       ▼
           Ficha  Residencia  Docs   Trail  Freshness Substep
           Contrato Art.7p   Permits  Gates  Confidence Semáforo
           Checklist CDI     PE eval  Version Anomaly  Docs%
```

### 8.2 Secuencia temporal

| Paso | Acción | Latencia esperada | Resultado |
|------|--------|-------------------|-----------|
| T+0 | Señal detectada (creación assignment, cambio ficha) | Instantáneo | `ActivationSignal[]` |
| T+1 | ExpatriateSupervisor invocado | <2s | Carga packs |
| T+2 | Clasificación ejecutada | <1s | `MobilityClassification` + `InternationalTaxImpact` |
| T+3 | Impactos resueltos | <1s | `ModuleImpact[]` |
| T+4 | Propagación a módulos | <2s | Alerts, flags, checklists |
| T+5 | Registro en auditoría | <1s | Audit trail entry |
| T+6 | Review gates creados (si aplica) | <1s | `ReviewGate[]` |
| **Total** | | **<8s** | Caso clasificado y propagado |

---

## 9. Resumen Final

### 9.1 Corredores Fase 1 (G2.1)

| # | Corredor | Régimen | Complejidad | Confidence estimado |
|---|----------|---------|-------------|---------------------|
| 1 | ES ↔ FR | UE | Baja | 85-90 |
| 2 | ES ↔ PT | UE | Baja | 85-90 |
| 3 | ES ↔ DE | UE | Baja | 85-90 |
| 4 | ES ↔ IT | UE | Baja | 85-90 |
| 5 | ES ↔ AD | Bilateral | Baja-Media | 80-85 |
| 6 | ES ↔ GB | Bilateral post-Brexit | Media | 75-80 |
| 7 | ES ↔ CH | UE-extensión | Baja-Media | 80-85 |
| 8 | ES ↔ US | Bilateral | Media-Alta | 70-75 |
| 9 | ES ↔ MX | Bilateral | Media | 70-75 |

### 9.2 Automation Boundary

| Zona | Qué incluye | Intervención humana |
|------|------------|---------------------|
| 🟢 **Automatización segura** | Clasificación SS, checklist documental, risk score, support level, CDI lookup, Art. 7.p (si requisitos completos), regla 183d, preflight flags | Ninguna |
| 🟡 **Asistida** | Art. 7.p parcial, residencia por centro vital, shadow payroll setup, CDI aplicación detallada | Revisión recomendada |
| 🔴 **Revisión obligatoria** | PE risk, split payroll, cambio de residencia, Beckham, equity+mobility, offboarding+mobility, sin CDI | Aprobación humana requerida |
| ⚫ **Fuera de alcance** | Multi-país, retenciones locales exactas, phantom shares, asesoría laboral local, inmigración, planificación fiscal agresiva | Derivar a especialista externo |

### 9.3 Siguiente Paso: G2.1

**Scope recomendado:**
1. Implementar `ExpatriateSupervisor` edge function (orquestación básica)
2. Crear 9 country packs fase 1 como TypeScript constants
3. Crear 9 corridor packs fase 1 como TypeScript constants
4. Implementar `detectActivationSignals` en hooks de employee master y assignment
5. Extender preflight con freshness badge y confidence score
6. Registrar cada clasificación con referencia al pack usado (auditoría)

**Lo que NO incluye G2.1:**
- Tabla de knowledge packs en DB (diferido a G2.2)
- Propagación real a Fiscal/Legal/Audit (solo interfaces)
- UI nueva (solo extensiones de paneles existentes)
- Review gates funcionales (solo estructura, sin workflow)

---

## 10. Restricciones Respetadas

| Restricción | Estado |
|-------------|--------|
| NO tocar RLS | ✅ |
| NO crear tablas nuevas | ✅ |
| NO cambios de código funcional | ✅ |
| NO rehacer módulos completos | ✅ |
| Compatible P1.x, H1.x, H2.x, G1.x, LM1-LM4 | ✅ |
| No fingir automatización universal | ✅ |
| Knowledge-first approach | ✅ |
| Honest automation boundary | ✅ |

---

*Documento generado: G2.0 — Expatriate Cross-Module Impact Matrix*
*Fecha: 2026-04-11*
*Compatible con: P1.x, H1.x, H2.x, G1.x, LM1-LM4*
