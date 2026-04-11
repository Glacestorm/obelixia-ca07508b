

# S9.2F Micro-fix + S9.3A Plan VPT

---

## PREPASO S9.2F — Micro-fix Salary Register

### Análisis

El hook `useS9SalaryRegister` (línea 29) usa `new Date().toISOString().slice(0, 7)` como período por defecto. Si no hay nóminas cerradas en el mes actual, la UI muestra correctamente un empty state con mensaje explícito: *"No hay datos de nómina cerrada para el período {period}"* (línea 179).

El panel ya ofrece un selector de los últimos 6 meses (líneas 25-29), por lo que el usuario puede navegar manualmente a un período con datos.

### Decisión: **NO APLICAR**

- El comportamiento actual es correcto y honesto.
- El empty state es explícito y no engaña.
- El selector ya permite navegar a períodos anteriores.
- Cambiar el default a "último período con datos" requeriría una query adicional previa en el hook, añadiendo complejidad y un round-trip extra a BD para un beneficio marginal.
- Marcado como **decisión funcional deliberada**, no como deuda.

**Resultado: Diferido como mejora UX menor, no como bug.**

---

## S9.3A — PLAN COMPLETO: Motor VPT (Valoración de Puestos de Trabajo)

---

### 1. Auditoría de Reutilización Real

| Pieza existente | Estado | Decisión VPT |
|----------------|--------|-------------|
| `HRJobPositionsPanel.tsx` (1153 líneas) | Operativo. CRUD completo con responsabilidades, obligaciones, competencias, bandas salariales, niveles, evaluación | **Reutilizar como fuente de puestos**. VPT consume `erp_hr_job_positions` pero no modifica este panel |
| `erp_hr_job_positions` (24 campos) | Operativo. Incluye `responsibilities` (JSONB con weights), `obligations`, `required_competencies`, `evaluation_criteria`, `salary_band_min/max`, `job_level`, `min_experience_years` | **Reutilizar tal cual**. VPT lee estos campos como inputs para la valoración. No se añaden campos a esta tabla |
| `useHRFairnessEngine.ts` | Operativo. Pay equity analyses, fairness metrics, 4/5 rule | **No tocar**. VPT produce datos que FairnessEngine puede consumir downstream, pero son módulos independientes |
| `HRFairnessEnginePanel.tsx` (526 líneas) | Operativo | **No tocar**. Futuro: VPT scores podrían alimentar dashboards de fairness |
| `usePeopleAnalytics.ts` — `PAEquityMetrics` | Operativo. `genderPayGap`, `compaRatioDistribution`, `outliers` | **No tocar**. VPT podrá alimentar compa-ratios en fase posterior |
| `erp_hr_pay_equity_analyses` | Operativo con RLS | **No tocar**. VPT podría vincular análisis en fase posterior |
| `erp_hr_pay_equity_snapshots` | Operativo con RLS | **No tocar** |
| `erp_hr_equity_action_plans` | Operativo con RLS | **No tocar** |
| `s9ComplianceEngine.ts` | Operativo (328 líneas). LISMI, Salary Register, Disconnection, RemoteWork | **Extender** con funciones VPT puras |
| `S9ReadinessBadge.tsx` | Operativo | **Reutilizar** |
| `useHRVersionRegistry.ts` | Operativo. Versionado genérico con estados `draft→review→approved→closed→superseded` | **Reutilizar** para versionar valoraciones VPT |

**Resumen**: ~60% de la infraestructura necesaria ya existe. El trabajo nuevo es el engine de scoring con factores neutros y la UI de valoración.

---

### 2. Modelo Metodológico VPT

#### Factores y subfactores (Directiva UE 2023/970, Art. 4)

La Directiva exige que los criterios sean **objetivos y neutros en cuanto al género**. Se proponen 4 factores principales con 2-3 subfactores cada uno (sistema de puntos por factor):

| Factor | Subfactores | Peso sugerido |
|--------|-------------|---------------|
| **Cualificaciones** | Formación reglada, Experiencia profesional, Certificaciones obligatorias | 25% |
| **Responsabilidad** | Decisiones sobre personas, Decisiones económicas/presupuestarias, Impacto organizativo | 30% |
| **Esfuerzo** | Complejidad intelectual, Esfuerzo físico, Carga emocional/psicosocial | 20% |
| **Condiciones de trabajo** | Penosidad/peligrosidad, Horarios atípicos, Disponibilidad/desplazamientos | 25% |

**Total**: 4 factores × 2-3 subfactores = 11 subfactores.

#### Escala de puntuación
- Cada subfactor se puntúa de 1 a 5 (escala Likert).
- El score de cada factor = suma ponderada de subfactores normalizados.
- El score total = suma ponderada de factores × 100 (escala 0-100).

#### Garantías de neutralidad
- Los pesos son configurables por empresa pero se ofrecen defaults basados en la Directiva.
- La metodología queda grabada en cada valoración (snapshot de pesos usados).
- La IA solo puede **sugerir** puntuaciones iniciales basándose en las `responsibilities`, `obligations` y `required_competencies` del puesto — nunca decide.
- Toda puntuación final la confirma un humano.
- El histórico de cambios queda versionado via `useHRVersionRegistry`.

#### Sesgos a evitar
- No usar "disponibilidad horaria" como proxy de compromiso (sesgo género).
- No sobrevalorar esfuerzo físico vs intelectual sin justificación.
- Subfactores como "carga emocional" evitan infravalorar puestos feminizados.
- Audit trail completo: quién puntuó, cuándo, qué versión de pesos se usó.

---

### 3. Diseño Funcional

#### Flujo de extremo a extremo
```text
Seleccionar puesto → Crear valoración (draft)
  → Puntuar subfactores (manual o con sugerencia IA)
  → Revisar coherencia (auto-checks)
  → Enviar a revisión (under_review)
  → Aprobar (approved) → Activar (active)
  → Comparar entre puestos
  → Detectar incoherencias vs banda salarial
  → Archivar versión anterior (archived)
```

#### Estados de la valoración
```text
draft → under_review → approved → active → archived
                    ↘ rejected → draft (corrección)
```

Estos estados son compatibles con `useHRVersionRegistry` que ya soporta `draft → review → approved → closed → superseded`.

#### Detección de incoherencias
- Score VPT alto + banda salarial baja = alerta.
- Score VPT muy diferente entre puestos del mismo `job_level` = alerta.
- Dos puestos con responsabilidades similares pero scores divergentes = alerta.

---

### 4. Modelo de Datos

#### Opción elegida: 1 tabla nueva + JSONB para subfactores

No hace falta tabla separada de factores/pesos porque los factores son un catálogo estático (11 subfactores) que se configura por empresa como JSONB. Esto simplifica el modelo sin perder auditabilidad.

**Tabla nueva: `erp_hr_job_valuations`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `company_id` | uuid FK → companies | Multi-tenant |
| `position_id` | uuid FK → erp_hr_job_positions | Puesto valorado |
| `version_id` | uuid FK → erp_hr_version_registry (nullable) | Vínculo versionado |
| `status` | text | `draft`, `under_review`, `approved`, `active`, `archived` |
| `methodology_snapshot` | jsonb | Pesos de factores/subfactores usados (inmutable por versión) |
| `factor_scores` | jsonb | `{ qualifications: { formal_education: 3, experience: 4, certifications: 2 }, ... }` |
| `total_score` | numeric | Score final calculado (0-100) |
| `equivalent_band_min` | numeric nullable | Banda salarial sugerida por VPT |
| `equivalent_band_max` | numeric nullable | |
| `notes` | text nullable | Justificación/observaciones |
| `scored_by` | uuid nullable | Quién puntuó |
| `reviewed_by` | uuid nullable | Quién revisó |
| `approved_by` | uuid nullable | Quién aprobó |
| `approved_at` | timestamptz nullable | |
| `ai_suggestions` | jsonb nullable | Sugerencias IA (solo referencia, no decisión) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS**: Tenant isolation via `erp_user_companies` (mismo patrón S9.2).

**Versionado**: Usa `useHRVersionRegistry` existente con `entity_type = 'job_valuation'`.

**Rollback**: `DROP TABLE erp_hr_job_valuations;`

---

### 5. Integraciones

| Dirección | Módulo | Cómo |
|-----------|--------|------|
| **VPT consume** | `erp_hr_job_positions` | Lee responsabilidades, competencias, nivel, bandas como input |
| **VPT produce** | Score total + band sugerida | Disponible para downstream |
| **S9.3 Registro Retributivo consume VPT** | Agrupación por grupo profesional + score VPT para clasificar comparativas | Fase posterior (S9.4+) |
| **Auditoría Retributiva consume VPT** | Contraste score vs salario real para detectar brechas injustificadas | Fase posterior |
| **FairnessEngine consume VPT** | Score VPT como variable de control en análisis pay equity | Fase posterior |
| **PeopleAnalytics consume VPT** | Compa-ratio ajustado por VPT score | Fase posterior |
| **CompensationSuite consume VPT** | Benchmark para merit cycles | Fase posterior |

**En S9.3B se construye**: engine + tabla + hook + UI + tests.
**Se pospone a S9.4+**: integraciones downstream con Registro Retributivo, Fairness, Analytics y Compensación.

---

### 6. UX y Navegación

#### Ubicación
- **Enterprise > Gobernanza & Compliance > VPT** (item `s9-vpt` ya previsto en S9.1).
- Workspace propio, NO extensión de `HRJobPositionsPanel` (ese panel gestiona el CRUD del puesto; VPT es un proceso analítico diferente).
- Desde `HRJobPositionsPanel` se podrá navegar al VPT de un puesto concreto (link cruzado, sin duplicar).

#### Vistas
1. **Dashboard VPT** — KPIs: puestos valorados / total, score medio, alertas de incoherencia, cobertura %.
2. **Lista de valoraciones** — Tabla filtrable por departamento, status, nivel, con score y banda.
3. **Detalle de valoración** — Formulario de subfactores con escala visual, resumen de score, comparativa con banda real, historial de versiones.
4. **Comparador** — Seleccionar 2-4 puestos y ver radar/spider chart de factores.

#### KPIs con sentido
- Cobertura VPT (% puestos activos con valoración active).
- Score medio por departamento.
- Desviación score vs banda salarial (correlación).
- Puestos sin valorar.

#### KPIs que NO se muestran (evitar humo)
- "Índice de equidad VPT" genérico sin base estadística.
- Rankings de puestos "mejor/peor" valorados.

---

### 7. Riesgos y Mitigaciones

| Riesgo | Nivel | Mitigación |
|--------|-------|-----------|
| **Técnico**: tabla nueva con FK a job_positions | Bajo | Additive, FK nullable no rompe nada |
| **Metodológico**: pesos arbitrarios | Medio | Defaults basados en Directiva UE; snapshot inmutable por valoración; audit trail |
| **UX**: sobrecarga de subfactores | Bajo | 11 subfactores es manejable; escala 1-5 simple |
| **Legal**: VPT no homologado oficialmente | Bajo | Badge `internal_ready`; no se presenta como certificación |
| **Payroll**: regresión | Nulo | VPT no toca payroll; solo lee bandas de job_positions |
| **Igualdad**: regresión | Nulo | VPT no modifica tablas de equality/fairness |
| **Falsa objetividad**: score numérico confundido con verdad absoluta | Medio | Documentar que VPT es herramienta de soporte, no sentencia; badge `internal_ready`; disclaimer en UI |

---

### 8. Orden de Implementación (S9.3B)

1. **Types** — Extender `s9-compliance.ts` con tipos VPT (factors, scores, valuation)
2. **Migración** — Crear `erp_hr_job_valuations` con RLS
3. **Engine** — Extender `s9ComplianceEngine.ts` con `computeVPTScore()`, `detectVPTIncoherences()`, `suggestVPTScores()`
4. **Tests** — Engine tests (scoring, neutralidad, incoherencias)
5. **Hook** — `useS9VPT.ts` (CRUD + scoring + comparador)
6. **UI** — `S9VPTWorkspace.tsx` (dashboard + lista + detalle + comparador)
7. **Navegación** — Wiring en HRNavigationMenu, HRModule, HRModuleLazy

---

### 9. Tests Obligatorios S9.3B

| Test | Qué valida |
|------|-----------|
| Score con todos subfactores = 5 produce score 100 | Normalización |
| Score con todos subfactores = 1 produce score mínimo | Floor |
| Cambiar pesos redistribuye score correctamente | Ponderación |
| Subfactor "esfuerzo físico" no sesga vs "carga emocional" con pesos default | Neutralidad |
| Dos puestos con mismos inputs producen mismo score | Determinismo |
| Detección de incoherencia: score alto + banda baja | Alertas |
| Detección de incoherencia: mismo level, scores divergentes | Coherencia |
| Methodology snapshot es inmutable tras cambio de pesos | Auditabilidad |
| Integración: lee correctamente de erp_hr_job_positions | Data bridge |
| Regresión: S9.2 engine tests siguen al 100% | Anti-regresión |
| ~12-15 tests totales | |

---

### 10. Veredicto S9.3A

**S9.3 puede construirse de forma segura sobre la base actual.** La tabla `erp_hr_job_positions` ya tiene la riqueza de datos necesaria (responsabilidades con weights, competencias, nivel, bandas). El `useHRVersionRegistry` ya provee versionado. El engine S9 ya es extensible.

**Alcance S9.3B**:
- 1 migración (tabla `erp_hr_job_valuations`)
- Extensión del engine con ~3 funciones puras
- 1 hook (`useS9VPT`)
- 1 workspace UI con 4 vistas
- ~12-15 tests
- Wiring en navegación

**Fuera de S9.3B (pospuesto a S9.4+)**:
- Integración downstream con Registro Retributivo
- Alimentación de FairnessEngine con scores VPT
- Sugerencias IA de puntuación (puede quedar como `preparatory`)
- Comparativa VPT en PeopleAnalytics dashboard
- Exportación formal del informe VPT para inspección

**Archivos nuevos estimados**: ~4 | **Archivos modificados**: ~4 (engine, types, navigation, module)

