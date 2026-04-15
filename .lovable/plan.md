

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
