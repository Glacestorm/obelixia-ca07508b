

# Plan: Fase 0 — Resolver OOM Build

## Diagnóstico

El build OOM se produce durante la fase de **Rollup renderChunks** (RegExp string flattening) porque:

1. **`ApplicationStateAnalyzer.tsx` (4663 líneas)**: Contiene ~500 líneas de template literals con `${'═'.repeat(100)}` y `${'─'.repeat(50)}` en 3 funciones helper (`getFileIndex`, `getTechStack`, `getComplianceInfo`). Rollup intenta flatten estas `ConsString` con RegExp, agotando el heap.

2. **`DynamicTechnicalDocGenerator.tsx` (5041 líneas)**: Segundo archivo más grande del proyecto.

3. **`sourceCodeExporter.ts` (567 líneas)**: Contiene metadata estática de ~200 archivos con caracteres `═` en comentarios.

4. **`types.ts` (86643 líneas)**: Auto-generado, no modificable pero contribuye al peso total.

5. **6968 módulos** en total, con todo el `app-admin` chunk agrupado sin granularidad.

El stack trace confirma: `RegExpImpl::IrregexpExec` + `String::SlowFlatten` = los template literals con `.repeat()` son el detonante directo.

## Estrategia de Mitigación (4 acciones)

### Acción 1: Extraer template literals de ApplicationStateAnalyzer

Mover `getFileIndex()`, `getTechStack()` y `getComplianceInfo()` a un archivo separado `src/components/admin/analyzer/exportHelpers.ts`. Estas funciones generan strings estáticos para exportación TXT y no tienen dependencias del estado del componente.

- **Nuevo archivo**: `src/components/admin/analyzer/exportHelpers.ts` (~200 líneas)
- **Contenido**: Las 3 funciones helper + `getRealSourceCode()`
- **Impacto**: Reduce ApplicationStateAnalyzer en ~250 líneas y aísla los template literals problemáticos en un módulo que Rollup puede tratar como chunk independiente

### Acción 2: Extraer SystemExportTab como subcomponente

`SystemExportTab` (líneas 3598-4663) ya es una función separada dentro del archivo. Moverla a `src/components/admin/analyzer/SystemExportTab.tsx` (~1065 líneas).

- **Nuevo archivo**: `src/components/admin/analyzer/SystemExportTab.tsx`
- **Re-export**: Import desde el nuevo path en ApplicationStateAnalyzer
- **Impacto**: Reduce el archivo principal a ~3350 líneas

### Acción 3: Extraer tabs de contenido pesado (Compliance + AI)

Las TabsContent de "compliance" (líneas 2620-2997, ~377 líneas) y "ai" (líneas 3000-3571, ~571 líneas) son secciones de renderizado puro. Extraerlas como:

- `src/components/admin/analyzer/ComplianceTab.tsx` (~400 líneas)
- `src/components/admin/analyzer/AIAnalysisTab.tsx` (~580 líneas)

**Impacto acumulado**: ApplicationStateAnalyzer baja de 4663 a ~2370 líneas.

### Acción 4: Granularizar chunk `app-admin` en vite.config.ts

Añadir una regla de splitting para el subdirectorio `analyzer/`:

```typescript
if (id.includes('/components/admin/analyzer/')) return 'app-admin-analyzer';
```

Esto permite que Rollup procese los template literals en un chunk separado y más pequeño, reduciendo la presión de memoria pico.

## Archivos a crear/modificar

| Archivo | Acción | Líneas aprox |
|---|---|---|
| `src/components/admin/analyzer/exportHelpers.ts` | **Crear** | ~200 |
| `src/components/admin/analyzer/SystemExportTab.tsx` | **Crear** | ~1070 |
| `src/components/admin/analyzer/ComplianceTab.tsx` | **Crear** | ~400 |
| `src/components/admin/analyzer/AIAnalysisTab.tsx` | **Crear** | ~580 |
| `src/components/admin/ApplicationStateAnalyzer.tsx` | **Modificar** (reducir a ~2370 ln) | -2293 |
| `vite.config.ts` | **Modificar** (1 línea) | +1 |

## Archivos que NO se tocan

- `src/integrations/supabase/types.ts` (auto-generado)
- `src/integrations/supabase/client.ts` (auto-generado)
- `src/components/reports/DynamicTechnicalDocGenerator.tsx` (no es detonante directo, se aborda solo si persiste OOM)
- Ningún archivo del módulo legal

## Riesgos residuales

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Imports rotos tras extracción | Baja | Todos los consumidores usan lazy import del export principal — no cambia |
| OOM persiste por volumen total (6968 módulos) | Media | Si persiste, segundo paso sería simplificar `DynamicTechnicalDocGenerator.tsx` con la misma técnica |
| `types.ts` (86K líneas) contribuye a presión | Baja | No modificable, pero ya se procesa como módulo aislado |

## Verificación

Tras los cambios, se ejecutará `npx tsc --noEmit` y se intentará publicar para confirmar build estable.

