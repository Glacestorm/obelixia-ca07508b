# P1.7B-RB — Stock Options / Equity Compensation Report

## Resumen Ejecutivo

Se ha implementado un motor completo de stock options / equity compensation para el ERP RRHH, cubriendo el ciclo completo grant → vesting → exercise con tratamiento fiscal español.

## Archivos Creados

| Archivo | Tipo | Líneas | Propósito |
|---------|------|--------|-----------|
| `src/engines/erp/hr/stockOptionsEngine.ts` | Engine | ~340 | Motor puro: lifecycle, fiscalidad, clasificación |
| `src/hooks/erp/hr/useStockOptions.ts` | Hook | ~200 | Estado, CRUD, simulación, preflight |
| `src/components/erp/hr/equity/StockOptionsPanel.tsx` | UI | ~380 | Dashboard con planes, grants, simulador |
| `src/components/erp/hr/equity/index.ts` | Barrel | 3 | Export |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `HRModuleLazy.tsx` | + `LazyStockOptionsPanel` |
| `HRModule.tsx` | + ruta `stock-options` |
| `HRNavigationMenu.tsx` | + ítem en sección Global → "Movilidad & Equity" |
| `payrollPreflightEngine.ts` | + `EquityPreflightData` interface + substep condicional |

## Motor de Clasificación (stockOptionsEngine.ts)

### Tipos de Plan Soportados

| Tipo | Nivel Soporte | Notas |
|------|---------------|-------|
| `standard_stock_options` | `supported_production` | Tratamiento fiscal establecido, exención Art. 42.3.f |
| `startup_stock_options` | `supported_with_review` | Exención Ley 28/2022 hasta 50.000€, verificar requisitos |
| `restricted_stock_units` | `supported_with_review` | Momento tributación requiere verificación |
| `phantom_shares` | `out_of_scope` | Valoración contable especializada |

### Tratamiento Fiscal Español

1. **Exención general (Art. 42.3.f LIRPF)**: Hasta 12.000€/año
   - Requisitos: oferta generalizada, mantenimiento 3 años, participación ≤ 5%
   - Nivel: `supported_production` (verificación parcial automática)

2. **Exención startup (Ley 28/2022)**: Hasta 50.000€
   - Requisitos: empresa emergente, antigüedad < 5-7 años, facturación < 10M€
   - Nivel: `supported_with_review` (verificación manual requerida)

3. **Renta irregular (Art. 18.2 LIRPF)**: Reducción 30%
   - Requisitos: generación > 2 años, máximo 300.000€
   - Nivel: `supported_production` (cálculo automático)

4. **Cotización SS**: Sobre beneficio bruto en mes de ejercicio
   - Nivel: `supported_production`

### Simulador de Ejercicio

El simulador calcula:
- Beneficio bruto = (precio mercado - strike) × acciones
- Exenciones aplicables (general / startup)
- Reducción por renta irregular
- IRPF estimado (tipo marginal 45%)
- Cotización SS trabajador
- Beneficio neto estimado

**Disclaimer**: Todos los resultados marcados como `(est.)` — tipo real depende de situación personal.

## Integración con Preflight

Se añade substep condicional "Stock Options / Equity" en el cockpit de preflight:
- **Verde**: sin grants activos o todos `supported_production`
- **Ámbar**: algún grant `supported_with_review`
- **Rojo**: algún grant `out_of_scope`
- No bloquea por defecto, solo en `out_of_scope`

## Integración con Payroll

El concepto `ES_STOCK_OPTIONS` ya existía en `payrollConceptCatalog.ts`.
La función `computePayrollImpact()` genera la línea de nómina correspondiente al ejercicio.

## BEFORE / AFTER

| Elemento | Antes | Después |
|----------|-------|---------|
| Motor de equity | Solo concepto `ES_STOCK_OPTIONS` en catálogo | Engine completo: lifecycle, fiscalidad, clasificación |
| UI dedicada | Inexistente | Panel con planes, grants, simulador, reglas |
| Tratamiento fiscal | Sin modelar | Art. 42.3.f, Ley 28/2022, Art. 18.2, SS |
| Clasificación soporte | Inexistente | 3 niveles por plan/grant |
| Preflight | Sin equity | Substep condicional con semáforo |
| Navegación | Sin entrada | "Stock Options / Equity" en Global |
| Demo | Mención en seed | Plans demo + grants añadibles |

## Supported / Review / Out-of-Scope Equity Rules

### supported_production
- Stock options estándar con exención general
- Reducción por renta irregular automática
- Cotización SS en ejercicio
- Concepto de nómina `ES_STOCK_OPTIONS`

### supported_with_review
- Stock options startup (verificar Ley 28/2022)
- RSU (verificar momento tributación)
- Cualquier plan donde requisitos de exención no verificables automáticamente
- Grants con generación < 2 años donde no aplica Art. 18.2

### out_of_scope
- Phantom shares (requiere valoración contable especializada)
- Planes con derivados financieros complejos
- Equity con componente internacional (combinar con P1.7B-RA)
- Planes con condiciones de rendimiento no estándar
