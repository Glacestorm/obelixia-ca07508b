

# S8.5b — Absorción de Simuladores Exclusivos (Puntos 4 y 6)

## Diagnóstico

### Punto 4: `GarnishmentSimulator` (Art. 607-608 LEC)
- **Estado actual**: El componente existe en `src/components/hr/garnishments/GarnishmentSimulator.tsx` (~194 líneas)
- **¿Está en el ERP?**: **NO**. El panel `LazyHRSettlementsPanel` gestiona **finiquitos** (liquidaciones por cese), no embargos. Son conceptos completamente diferentes
- **Motor de cálculo**: Usa `calculateGarnishment()` de `src/lib/hr/garnishmentEngine.ts` — engine determinista con tramos Art. 607 LEC, Art. 608 alimentos, SMI 2026, cargas familiares y pluripercepción
- **Valor**: **Alto** — obligatorio en cualquier ERP de nómina español. Sin él no se puede calcular la retención judicial sobre salarios

### Punto 6: Composición combinada Multi-Empleo
- **Estado actual**: Los 3 componentes existen en `src/components/hr/multi-employment/`:
  - `HRMultiEmploymentPanel` (panel principal)
  - `BaseDistributionPanel` (~120 líneas) — distribución de bases por coeficiente horario
  - `SolidaritySimulator` (~100 líneas) — cotización solidaridad 2026
- **¿Están en el ERP?**: **Parcialmente**. El `ESLocalizationPlugin` (🇪🇸 España) tiene tabs de SS, IRPF, contratos, permisos, finiquitos... pero **NO incluye pluriempleo, distribución de bases ni solidaridad**
- **Valor**: **Alto** — la Orden PJC/297/2026 obliga a gestionar topes CAS en pluriempleo. Sin estos simuladores no hay compliance

## Recomendación: SÍ, implementar ambos

Ambos son funcionalidad legal obligatoria en España. No tenerlos accesibles desde el cockpit ERP es un gap de compliance.

## Plan de implementación

### Fase 1 — Integrar GarnishmentSimulator en el mega-menu

1. **Registrar en `HRModuleLazy.tsx`**: Nuevo lazy import del `GarnishmentSimulator` existente (de `src/components/hr/garnishments/`)
2. **Añadir ruta en `HRModule.tsx`**: `activeModule === 'garnishment-simulator'` renderiza el componente
3. **Añadir entrada en `HRNavigationMenu.tsx`**: En la sección Payroll > Nómina Mensual, junto a "Finiquitos", añadir "Embargos Art. 607"

### Fase 2 — Integrar simuladores Multi-Empleo en ESLocalizationPlugin

1. **Añadir tab "Pluriempleo" al `ESLocalizationPlugin.tsx`**: Nueva tab que compone los 3 componentes (`HRMultiEmploymentPanel`, `BaseDistributionPanel`, `SolidaritySimulator`) en un layout combinado
2. **Importar los componentes** desde `src/components/hr/multi-employment/`
3. No hace falta lazy load adicional porque ya están dentro del `ESLocalizationPlugin` que ya es lazy

### Fase 3 — Verificación

- Confirmar accesibilidad visual desde mega-menu
- Confirmar que `companyId` se propaga correctamente

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/erp/hr/HRModuleLazy.tsx` | +1 lazy import (GarnishmentSimulator) |
| `src/components/erp/hr/HRModule.tsx` | +1 ruta `garnishment-simulator` |
| `src/components/erp/hr/HRNavigationMenu.tsx` | +1 entrada mega-menu "Embargos Art. 607" |
| `src/components/erp/hr/localization/es/ESLocalizationPlugin.tsx` | +1 tab "Pluriempleo" con los 3 componentes combinados |

**Backend**: 0 cambios. **Componentes nuevos**: 0 (se reutilizan los existentes). **Riesgo de rotura**: mínimo — solo se añaden entradas de navegación y una tab.

