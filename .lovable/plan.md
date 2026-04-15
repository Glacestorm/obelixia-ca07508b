

## S9.18-H4 — Seguro médico ES: IRPF + SS/CRA (Plan ajustado)

### Tratamiento final decidido

| Concepto | `is_taxable` | `is_ss_contributable` | `impacts_cra` | `impacts_irpf` |
|---|---|---|---|---|
| `ES_RETRIB_FLEX_SEGURO` (exento) | false | **true** ← | **true** ← | false |
| `ES_RETRIB_FLEX_SEGURO_EXCESO` | true | **true** ← | **true** ← | true |

Ambos conceptos cotizan SS (LGSS Art. 147) y figuran en CRA, independientemente de la exención IRPF.

### Archivos y cambios

#### 1. `src/engines/erp/hr/payrollConceptCatalog.ts`

- `ES_RETRIB_FLEX_SEGURO`: `is_ss_contributable: true`, `impacts_cra: true`
- `ES_RETRIB_FLEX_SEGURO_EXCESO`: `is_ss_contributable: true`, `impacts_cra: true`

#### 2. `src/hooks/erp/hr/useESPayrollBridge.ts`

**a) Catálogo local** (líneas 143-145):
- `ES_RETRIB_FLEX_SEGURO`: `contributable: true`
- `ES_RETRIB_FLEX_SEGURO_EXCESO`: `contributable: true`

**b) addEarning calls** (líneas 336-341):
- Línea 336: `addEarning('ES_RETRIB_FLEX_SEGURO', ..., false, true, 70)` — taxable false, contributable true
- Línea 338: `addEarning('ES_RETRIB_FLEX_SEGURO', ..., false, true, 70)` — same
- Línea 341: `addEarning('ES_RETRIB_FLEX_SEGURO_EXCESO', ..., true, true, 70)` — taxable true, contributable true

**c) Trazabilidad con desglose trabajador/familiares** (bloque líneas 330-342):
Después de las addEarning, inyectar trace estructurada en las líneas generadas:

```typescript
// Trace CRA 0039/0040 alignment
const traceSeguro = {
  prima_mensual_total: input.seguroMedico,
  num_beneficiarios: nBen,
  num_beneficiarios_discapacidad: nDis,
  // Desglose por tipo de asegurado (para futura alineación CRA 0039/0040)
  desglose_asegurados: {
    trabajador: { count: 1, limite_anual: nDis > 0 ? 1500 : 500 },
    familiares: { 
      count: Math.max(nBen - 1, 0), 
      con_discapacidad: Math.max(nDis - 1, 0),
      sin_discapacidad: Math.max(nBen - 1 - Math.max(nDis - 1, 0), 0)
    },
  },
  limite_anual: limiteAnual,
  limite_mensual: limiteMensual,
  parte_exenta: Math.min(input.seguroMedico, limiteMensual),
  parte_exceso: Math.max(0, r(input.seguroMedico - limiteMensual)),
  flags: {
    exento_irpf: true, // tramo exento
    ss_contributable: true, // LGSS Art. 147
    impacts_cra: true,
    cra_nota: 'Pendiente separación CRA 0039 (trabajador) / 0040 (familiares) en líneas individuales'
  }
};
```

Esta trace se añade como `traceRule` + `traceInputs` a los addEarning del seguro, usando el mismo patrón que ya existe en IT_CC/IT_AT (líneas 352-354).

#### 3. `src/components/erp/hr/HRFlexibleRemunerationPanel.tsx`

Añadir bloque informativo compacto tras la línea de límite exento (después de línea 289), dentro del div del seguro médico:

- **IRPF**: "Exento" o "Exento + Exceso sujeto" según si hay exceso
- **SS**: "Cotiza SS (LGSS Art. 147)" — siempre, ambos tramos
- **CRA**: "CRA: pendiente separación 0039/0040"

Implementado como texto `text-[10px]` con iconos, sin cambiar inputs ni layout.

### No se toca

Payroll-calculation-engine (las bases SS se computan automáticamente al marcar `contributable: true`), S9/VPT, última milla, G1.2/G2.2, copiloto, restaurante/guardería/transporte, persistencia del plan flex, auth, RLS, edge functions.

### Verificaciones

1. Seguro dentro del límite → 1 línea exenta, cotiza SS, con CRA, trace completa
2. Seguro por encima del límite → 2 líneas: exento + exceso, ambos cotizan SS
3. Trace incluye desglose trabajador/familiares para alineación CRA 0039/0040
4. Panel flex muestra estado IRPF + SS + CRA
5. Bases SS reflejan el seguro médico (ambos tramos)
6. No regresión en plan flexible ni en cálculo general
7. TypeScript y compilación limpios

### Veredicto esperado

**"Seguro médico ES corregido con tratamiento fiscal/SS completo (ambos tramos cotizan)"**

