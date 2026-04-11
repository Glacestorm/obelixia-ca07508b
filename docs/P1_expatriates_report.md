# P1.7B-RA — Expatriados / Movilidad Internacional — Report

## Problema operativo que resuelve

El ERP RRHH tenía un módulo de movilidad internacional robusto en CRUD (asignaciones, documentos, costes, compliance básico) pero **carecía de**:
- Clasificación automática del régimen SS aplicable
- Motor fiscal internacional (Art. 7.p, CDI, residencia)
- Knowledge base estructurada de convenios y tratados
- Clasificación honesta de nivel de soporte por caso
- Integración con el preflight de nómina

## Taxonomía de casos soportados

### Por régimen SS

| Régimen | Países | Cobertura |
|---------|--------|-----------|
| UE/EEE/Suiza | 30 países (27 UE + IS, LI, NO + CH) | Reglamento CE 883/2004, certificado A1 |
| Bilateral | 23 países (US, CA, MX, CL, CO, AR, UY, BR, PE, VE, PY, DO, EC, PH, MA, TN, UA, JP, KR, AU, RU, CN, IN) + UK + AD | Convenio bilateral SS específico |
| Sin convenio | Resto del mundo | Riesgo doble cotización, convenio especial voluntario |

### Por nivel de soporte

| Nivel | Criterio | Ejemplo |
|-------|----------|---------|
| `supported_production` | UE/EEE/CH + Andorra + UK, sin triggers críticos, riesgo ≤50 | Desplazamiento temporal a Francia, 6 meses |
| `supported_with_review` | Bilateral, split payroll, >24 meses, PE risk, sin CDI, residencia limítrofe | Asignación a EEUU 18 meses con split payroll |
| `out_of_scope` | Sin convenio + triggers críticos | Destino sin CDI ni SS + PE risk + >36 meses |

## Módulos tocados

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| ✅ Crear | `src/engines/erp/hr/internationalMobilityEngine.ts` | Motor clasificación SS + KB países (~300 líneas) |
| ✅ Crear | `src/engines/erp/hr/internationalTaxEngine.ts` | Motor fiscal Art. 7.p + CDI + residencia (~220 líneas) |
| ✅ Crear | `src/hooks/erp/hr/useExpatriateCase.ts` | Hook consolidación caso expatriado (~140 líneas) |
| ✅ Crear | `src/components/erp/hr/mobility/MobilityClassificationPanel.tsx` | Panel clasificación visual (~200 líneas) |
| ✅ Crear | `src/components/erp/hr/mobility/MobilityTaxImpactPanel.tsx` | Panel impacto fiscal (~180 líneas) |
| ✅ Modificar | `src/components/erp/hr/mobility/MobilityAssignmentDetail.tsx` | +tabs Clasificación/Tax, +badge soporte |
| ✅ Modificar | `src/components/erp/hr/mobility/index.ts` | +exports nuevos paneles |
| ✅ Modificar | `src/engines/erp/hr/payrollPreflightEngine.ts` | +substep movilidad condicional |

## Qué es realmente productivo

1. **Clasificación SS**: Determinística, basada en KB de 55+ países con datos de convenios reales
2. **Checklist documental**: Generado automáticamente por régimen × tipo de asignación
3. **Impacto payroll/SS/fiscal**: Flags de recomendación (split, shadow, tax equalization)
4. **Risk score**: 0-100 calculado por factores objetivos
5. **Art. 7.p**: Cálculo de elegibilidad y exención prorrateada con checklist de requisitos
6. **CDI lookup**: 24+ tratados con provisiones clave
7. **Residencia fiscal**: Clasificación por regla 183d + centro vital + presunciones Art. 9 LIRPF

## Qué requiere revisión obligatoria

- Casos con PE risk (establecimiento permanente)
- Split payroll inter-jurisdicción
- Asignaciones >24 meses con cambio de residencia
- Países sin CDI
- Residencia fiscal limítrofe (centro vital indeterminado)
- Art. 7.p con requisito de paraíso fiscal pendiente de verificar
- Régimen de Beckham (impatriados)

## Qué queda fuera de alcance

- Cadenas multi-país (A → B → C)
- Casos sin convenio SS + sin CDI + triggers críticos
- Cálculo fiscal exacto de retenciones en país destino
- Phantom shares / derivados financieros internacionales
- Asesoría jurídica sobre legislación laboral local del país destino

## Estado BEFORE/AFTER

| Métrica | Antes | Después |
|---------|-------|---------|
| Clasificación régimen SS | ❌ Inexistente | ✅ 55+ países clasificados |
| Art. 7.p LIRPF | ❌ Inexistente | ✅ Elegibilidad + cálculo + requisitos |
| CDI lookup | ❌ Inexistente | ✅ 24+ tratados con provisiones |
| Residencia fiscal | ❌ Campo manual | ✅ Motor clasificación 183d + centro vital |
| Checklist documental | ❌ Manual | ✅ Auto-generado por régimen |
| Risk score | ❌ Campo manual | ✅ Calculado 0-100 por factores |
| Support level por caso | ❌ Inexistente | ✅ 3 niveles con review triggers |
| Review triggers | ❌ Inexistentes | ✅ Por categoría y severidad |
| Preflight awareness | ❌ Sin conexión | ✅ Substep condicional con semáforo |
| Tabs en detalle | 5 tabs | 7 tabs (+Clasificación, +Impacto Fiscal) |

## Restricciones respetadas

- ✅ NO toca RLS
- ✅ NO reescribe CRUD base (reutiliza useGlobalMobility)
- ✅ NO finge cálculo universal — cada caso lleva supportLevel + reviewTriggers
- ✅ `isRealSubmissionBlocked === true` mantenido
- ✅ Compatible con P1.x, LM1/2/3 y preflight
- ✅ El substep de movilidad en preflight NO bloquea por defecto

## Supported / Review / Out-of-Scope Decision Rules

### supported_production
- Régimen `eu_eea_ch` (UE/EEE/Suiza)
- Sin triggers de severidad `critical` o `high`
- Risk score ≤ 50
- Incluye: UK, Andorra (tratamiento bilateral con cobertura amplia)

### supported_with_review
- Cualquier régimen `bilateral_agreement`
- Cualquier trigger de severidad `high` o `critical`
- Risk score > 50
- Casos con split payroll, PE risk, >24 meses, sin CDI
- Régimen `no_agreement` sin triggers críticos

### out_of_scope
- Régimen `no_agreement` + al menos un trigger `critical`
- Cadenas multi-jurisdicción no modeladas
- Derivados financieros internacionales

## Recomendación: siguiente paso

1. **P1.7B-RB** — Stock Options / Equity Compensation engine + UI
2. **P1.7B-RC** — Yellow-to-Green demo matrix recalculation
3. **P1.7B-RD** — Conectar clasificación a payroll engine (impacto en cálculo real de nómina)
