

## S9.18-H4 — Seguro médico ES: tratamiento fiscal/SS completo ✅

### Causa raíz

Ambos conceptos de seguro médico (`ES_RETRIB_FLEX_SEGURO` y `ES_RETRIB_FLEX_SEGURO_EXCESO`) tenían `is_ss_contributable: false` y `impacts_cra: false`, lo que incumplía LGSS Art. 147 (la retribución en especie del seguro médico forma parte de la base de cotización SS).

### Tratamiento final

| Concepto | `is_taxable` | `is_ss_contributable` | `impacts_cra` | `impacts_irpf` |
|---|---|---|---|---|
| `ES_RETRIB_FLEX_SEGURO` (exento) | false | **true** | **true** | false |
| `ES_RETRIB_FLEX_SEGURO_EXCESO` | true | **true** | **true** | true |

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/engines/erp/hr/payrollConceptCatalog.ts` | `is_ss_contributable: true`, `impacts_cra: true` en ambos conceptos |
| `src/hooks/erp/hr/useESPayrollBridge.ts` | Catálogo local `contributable: true` + addEarning con SS + trace CRA con desglose trabajador/familiares |
| `src/components/erp/hr/HRFlexibleRemunerationPanel.tsx` | Indicadores IRPF/SS/CRA compactos |

### Trazabilidad CRA

Cada línea de seguro médico incluye `traceInputs` con:
- prima mensual, nº beneficiarios, nº con discapacidad
- desglose_asegurados: trabajador (con límite) + familiares (con/sin discapacidad)
- límite anual/mensual, parte exenta, parte exceso
- flags: exento_irpf, ss_contributable, impacts_cra
- cra_nota: pendiente separación 0039/0040

### Verificaciones

- ✅ TypeScript limpio (tsc --noEmit = 0 errores)
- ✅ Ambos tramos cotizan SS (`contributable: true` en catálogo + addEarning)
- ✅ Ambos tramos impactan CRA (`impacts_cra: true`)
- ✅ Split exento/exceso mantenido sin regresión
- ✅ Trace con desglose trabajador/familiares para CRA 0039/0040
- ✅ Panel flex muestra estado IRPF + SS + CRA

### Veredicto

**"Seguro médico ES corregido con tratamiento fiscal/SS completo (ambos tramos cotizan)"**

## S9.18-H5 — Seguro médico ES: importe anual total + split visible ✅

### Cambios

- **Entrada principal:** importe anual total (€/año), mensual derivado automáticamente (anual/12)
- **Backward compat:** si solo existe `seguro_medico_mensual` (datos antiguos), se sigue calculando anual = mensual × 12
- **Persistencia:** `seguro_medico_mensual` en columna (compat con bridge), `seguro_medico_anual_total` + `seguro_medico_source` en `metadata` jsonb (sin migración SQL)
- **UI desglose:** mensual / límite/mes / exento/mes / no exento/mes con colores semánticos (emerald = exento, amber = exceso)
- **Fuente del dato:** badge visible — `Manual empresa` / `Desde convenio` / `Manual sobreescribe convenio`
- **Convenio:** confirmado que NO existe fuente real en convenio/mapping para seguro médico — UI preparada, lógica honesta (sin invención)

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/components/erp/hr/HRFlexibleRemunerationPanel.tsx` | Input anual total, derivación mensual, desglose visible, badge fuente, persistencia metadata |
| `src/hooks/erp/hr/useESPayrollBridge.ts` | Trace ampliada con `prima_anual_total_derivada` + `fuente_dato` |

### Prioridad de fuente (lógica final)

1. Si existe convenio (no aplica hoy) y manual = 0 → `Desde convenio`
2. Si existe convenio y manual ≠ convenio → `Manual sobreescribe convenio` (manual prevalece)
3. Resto → `Manual empresa`

No se suman dos fuentes. Convenio es siempre placeholder honesto en esta fase.

### Veredicto

**"Seguro médico ES ampliado con anual total + split visible y repercusión correcta en nómina"**

## S9.20 — Retribución Flexible ES: Modelo A + B por concepto ✅

### Tratamiento por concepto

| Concepto | Estado | Modelo A | Modelo B | Notas |
|---|---|---|---|---|
| Seguro médico | ✅ Automatizado (S9.18 + A/B) | ✓ | ✓ | Mantiene split exento/exceso, IRPF + SS + CRA |
| Ticket restaurante | ✅ Automatizado **si** datos completos | ✓ | ✓ | Tope 11€/día (RIRPF Art. 45.2). Genera `ES_RETRIB_FLEX_RESTAURANTE` (exento) + `ES_RETRIB_FLEX_RESTAURANTE_EXCESO` (gravado, cotiza SS) |
| Cheque guardería | 🟡 Persistido + visible | ✓ | ✓ | NO automatizado en esta fase |
| Transporte | 🟡 Persistido + visible | ✓ | ✓ | NO automatizado en esta fase |

### Modelo A (benefit_additional) — default
- Suma como beneficio adicional, aumenta coste empresa
- No toca dinerario base

### Modelo B (salary_sacrifice)
- Consume **exclusivamente** `ES_MEJORA_VOLUNTARIA`
- **Nunca** toca `ES_SAL_BASE` ni `ES_COMP_CONVENIO`
- Si mejora voluntaria insuficiente → degrada a Modelo A automáticamente con trace + línea informativa `ES_FLEX_MODELO_B_INFO`
- Mínimo de convenio garantizado

### Fuente convenio

Confirmada **inexistente** para flex. UI mantiene badges honestos (`Manual empresa` / `Desde convenio` / `Manual sobreescribe convenio`) y queda preparada para futuro origen convenio.

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/engines/erp/hr/payrollConceptCatalog.ts` | + `ES_RETRIB_FLEX_RESTAURANTE_EXCESO` (taxable, SS, IRPF, CRA) |
| `src/hooks/erp/hr/useESPayrollBridge.ts` | + `ESFlexConceptConfig`, automatización ticket restaurante con tope diario, lógica salary_sacrifice sobre mejora voluntaria con degradación segura, línea informativa Modelo B |
| `src/components/erp/hr/HRFlexibleRemunerationPanel.tsx` | + `concept_config` en metadata, `ModelToggle`, `RestauranteCard` (€/día + días + modalidad), `SimpleFlexCard` (guardería + transporte) con Modelo A/B visible |

### Persistencia

Nueva configuración `concept_config` guardada en `metadata` jsonb existente (sin migración SQL). Backward compatible: si no existe, se asume `benefit_additional` para todo.

### Guardrails respetados

- ✅ Sin tocar `payroll-calculation-engine.ts`
- ✅ Sin tocar S9/VPT, última milla oficial, G1.2/G2.2
- ✅ Sin tocar convenio/mapping/tablas salariales
- ✅ Sin migración SQL (todo en `metadata` jsonb)
- ✅ Mínimo convenio nunca violado
- ✅ Sin duplicidad de importes
- ✅ Sin invención de fuente convenio

### Veredicto

**"Retribución Flexible ES ampliada con modelo A+B y automatización prudente por concepto"**

## S9.21d — Bloque A: Guardrails legales Modelo B (30% especie + SMI 2026) ✅

### Cambios

- **Import SMI single source:** `useESPayrollBridge.ts` importa `SMI_MENSUAL_2026` (1.221€) desde `@/shared/legal/rules/smiRules`
- **Set `ESPECIE_CODES`:** identifica retribución en especie a efectos del Art. 26.1 ET (flex seguro/restaurante/guardería/formación + stock options)
- **Pre-cálculo:** `dinerarioBase` y `especieBase` antes de evaluar sacrificios
- **`tryApplySacrifice` reforzado** con tres guardrails secuenciales:
  1. **Mejora voluntaria suficiente** (existente)
  2. **ET Art. 26.1:** especie ≤ 30% del total salarial → si excede, degrada con motivo
  3. **RD Ley SMI 2026:** dinerario final ≥ 1.221€ → si bajaría del SMI, degrada con motivo
- **Trace ampliada:** cada sacrificio degradado lleva `motivo_degradacion` legible
- **Resumen Modelo B (`ES_FLEX_MODELO_B_INFO`)** ahora incluye `guardrails_aplicados` con SMI vigente, % especie actual, base legal y bases dinerario/especie
- **UI:** `ModelToggle` advierte explícitamente "degrada si especie > 30% o dinerario < SMI"

### Garantías

- ✅ Modelo B nunca toca `ES_SAL_BASE` ni `ES_COMP_CONVENIO` (sólo `ES_MEJORA_VOLUNTARIA`)
- ✅ Si cualquier guardrail falla → degradación automática a Modelo A con aviso visible y trace completa
- ✅ Backward compat: planes sin flex o sin Modelo B siguen calculando idéntico
- ✅ TypeScript limpio
- ✅ Sin tocar `payroll-calculation-engine.ts`

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/hooks/erp/hr/useESPayrollBridge.ts` | Import SMI + set ESPECIE_CODES + 3 guardrails en tryApplySacrifice + trace ampliada |
| `src/components/erp/hr/HRFlexibleRemunerationPanel.tsx` | Tooltip ModelToggle con condiciones de degradación |

### Veredicto parcial

**"Modelo B con guardrails legales (ET 26.1 + SMI 2026) operativos y trazables"**

---

## S9.21d Bloque C — Conceptos avanzados (AT/Nacimiento/Atrasos IT/Reducción jornada) ✅

### Objetivo

Cubrir casuística avanzada del PDF de "procesos entre fechas":
- Tramos de nacimiento/paternidad/maternidad/corresponsabilidad (LGSS Art. 177-183)
- Atrasos por IT no reflejada como concepto separado y trazable (LGSS Art. 109)
- Reducción de jornada por guarda legal (ET Art. 37.6)
- AT 75% (ya existía, mantenido)

### Cambios técnicos en `useESPayrollBridge.ts`

1. **`ESPayrollInput` ampliado (backward compatible)** con tres campos opcionales:
   - `nacimientoTramos: Array<{ tipo, fechaDesde, fechaHasta, importe, obligatorio?, descripcion? }>`
   - `atrasosIT: { importe, periodoOrigen, motivo, descripcion? }`
   - `reduccionJornadaPct: number` (1-99)

2. **Catálogo de conceptos ampliado** (5 nuevos):
   - `ES_NACIMIENTO_MATERNIDAD` (sort 92)
   - `ES_NACIMIENTO_PATERNIDAD` (sort 93)
   - `ES_NACIMIENTO_CORRESPONSABILIDAD` (sort 94)
   - `ES_ATRASOS_IT` (sort 96)
   - `ES_RED_JORNADA_INFO` (sort 306, informativo)

3. **Factor de prorrateo combinado:**
   - `factorPeriodo` (Bloque B) × `factorReduccion` (Bloque C) = `factorProrrateo` final
   - Reducción jornada se compone multiplicativamente y se refleja en trace
   - Si sólo hay reducción (sin periodCoverage), la trace incluye motivo "reduccion_jornada_guarda_legal"

4. **Procesamiento de tramos nacimiento:**
   - Cada tramo genera línea separada con código específico por tipo
   - Marcadas como prestación INSS: `taxable=false`, `contributable=false`
   - Trace incluye fechas, obligatoriedad y descripción

5. **Atrasos IT separados de regularización genérica:**
   - `ES_ATRASOS_IT` con trace de período origen y motivo (`IT_no_reflejada` | `IT_recalculo` | `IT_correccion`)
   - Sujeto IRPF + cotiza SS según LGSS Art. 109

6. **Línea informativa reducción jornada:**
   - `ES_RED_JORNADA_INFO` con amount=0 y trace completa
   - Útil para recibo y auditoría aunque no sume al líquido

### Garantías

- ✅ Backward compat: sin estos campos, comportamiento idéntico (factor=1, sin nuevas líneas)
- ✅ Conceptos opcionales se ocultan si no se proporcionan o importe=0 (regla `if (amount === 0) return`)
- ✅ TypeScript limpio (`tsc --noEmit` exit 0)
- ✅ Sin tocar `payroll-calculation-engine.ts`
- ✅ Sin romper Bloques A/B previos

### Veredicto parcial

**"Casuística avanzada (nacimiento por tramos, atrasos IT trazables, reducción jornada combinable con período) operativa y prudente"**
