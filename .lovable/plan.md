

# Plan: Fase 0 Continuación — Reducir ApplicationStateAnalyzer a ~1,200 líneas

## Estado actual

El archivo ya se redujo de 4,663 a **2,660 líneas** tras extraer ComplianceTab, AIAnalysisTab y SystemExportTab. Los `.repeat()` problemáticos fueron eliminados. Sin embargo, 2,660 líneas sigue siendo excesivo y contribuye a presión de memoria con los 6,968 módulos del proyecto.

## Secciones restantes por extraer

| Sección | Líneas | Contenido |
|---|---|---|
| `generatePDF()` | 580-1476 (~900 ln) | Generación de PDF de informe de estado |
| `generateSalesPDF()` | 1477-1897 (~420 ln) | Generación de PDF comercial/ventas |
| Static lists (components, hooks, functions) | 315-491 (~175 ln) | Arrays hardcoded para análisis |

## Acciones

### Acción 1: Extraer generadores PDF
Crear `src/components/admin/analyzer/pdfGenerators.ts` con las funciones `generatePDF` y `generateSalesPDF`. Estas son funciones async puras que solo necesan recibir `codebaseAnalysis`, `improvementsAnalysis` y `aiAnalysis` como parámetros. No dependen de estado React interno.

- Nuevo archivo: `src/components/admin/analyzer/pdfGenerators.ts` (~1,320 líneas)
- Impacto: Reduce ApplicationStateAnalyzer en ~1,320 líneas

### Acción 2: Extraer listas estáticas de inventario
Crear `src/components/admin/analyzer/projectInventory.ts` con `componentsList`, `hooksList`, `edgeFunctions`, `pagesList` y `securityFeatures`.

- Nuevo archivo: `src/components/admin/analyzer/projectInventory.ts` (~180 líneas)
- Impacto: Reduce ~175 líneas adicionales

### Acción 3: Extraer ImprovementsTab
La TabsContent "improvements" (líneas ~2000-2620, ~620 líneas) es renderizado puro con datos de `improvementsAnalysis`. Extraer a `src/components/admin/analyzer/ImprovementsTab.tsx`.

- Nuevo archivo: `src/components/admin/analyzer/ImprovementsTab.tsx` (~630 líneas)
- Impacto: Reduce ~620 líneas del render

## Resultado esperado

| Archivo | Líneas |
|---|---|
| ApplicationStateAnalyzer.tsx (principal) | ~550 |
| pdfGenerators.ts | ~1,320 |
| projectInventory.ts | ~180 |
| ImprovementsTab.tsx | ~630 |
| (existentes: SystemExportTab, ComplianceTab, AIAnalysisTab) | sin cambio |

## Verificación

- `npx tsc --noEmit` para confirmar compilación limpia
- Sin cambios funcionales — solo reorganización de código
- Re-exports y imports mantienen compatibilidad total

