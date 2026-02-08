
# Plan: Mapa Nacional Interactivo de Subvenciones con Drill-Down Jerárquico

## Visión General
Implementar un mapa SVG interactivo de España que permita navegar desde el nivel nacional hasta el detalle de expedientes individuales, con zoom progresivo y superposición de datos de subvenciones en cada nivel.

## Arquitectura del Sistema

```text
+--------------------------------------------------+
|              MAPA NACIONAL ESPAÑA                 |
|  +--------------------------------------------+  |
|  | CCAA con totales superpuestos (SVG paths)  |  |
|  | Click -> Zoom + Transición animada         |  |
|  +--------------------------------------------+  |
|                       |                          |
|                       v                          |
|  +--------------------------------------------+  |
|  |          MAPA COMUNIDAD AUTÓNOMA           |  |
|  | Provincias + KPIs regionales               |  |
|  | Click -> Zoom provincial                   |  |
|  +--------------------------------------------+  |
|                       |                          |
|                       v                          |
|  +--------------------------------------------+  |
|  |          MAPA PROVINCIA/COMARCA            |  |
|  | Municipios + Markers de ayudas             |  |
|  | Click -> Lista de expedientes              |  |
|  +--------------------------------------------+  |
|                       |                          |
|                       v                          |
|  +--------------------------------------------+  |
|  |          DETALLE DE EXPEDIENTE             |  |
|  | Información completa + documentos          |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

---

## FASE 1: Corrección del Error de Build (Crítico)
**Objetivo:** Resolver el error "JavaScript heap out of memory" antes de añadir más componentes.

### Acciones:
1. Optimizar imports en `GaliaMainTabs.tsx` usando webpack magic comments
2. Revisar y reducir dependencias circulares
3. Implementar dynamic imports más granulares con `/* webpackChunkName */`
4. Añadir lazy loading para todos los componentes pesados del dashboard

---

## FASE 2: Mapa SVG de España (Nivel 1 - Nacional)
**Objetivo:** Crear un mapa SVG interactivo de las 17 Comunidades Autónomas + Ceuta + Melilla.

### Componentes:
- `GaliaSpainMap.tsx` - Componente principal del mapa SVG
- SVG paths para cada CCAA (polígonos optimizados)
- Capa de datos superpuestos (totales de ayudas por región)

### Funcionalidades:
- Visualización de métricas por CCAA (color/opacidad según volumen)
- Tooltips con resumen: N ayudas, Presupuesto total, Tasa ejecución
- Animación de hover con destacado de la región
- Click para drill-down a nivel regional

### Datos superpuestos:
- Número total de ayudas y subvenciones
- Presupuesto gestionado (formato compacto: 12.5M EUR)
- Indicador de estado (verde/amarillo/rojo)

---

## FASE 3: Mapa Regional (Nivel 2 - CCAA)
**Objetivo:** Mostrar detalle provincial cuando se hace click en una CCAA.

### Componentes:
- `GaliaRegionMap.tsx` - Mapa de la CCAA seleccionada
- Transición animada desde el mapa nacional
- Breadcrumb de navegación (España > [CCAA])

### Funcionalidades:
- Provincias coloreadas según actividad de subvenciones
- Lista lateral de GALs en la región
- KPIs regionales expandidos
- Click en provincia para zoom adicional

### Datos mostrados:
- Desglose por provincia
- Top 5 sectores por inversión
- Tendencias interanuales
- Alertas y expedientes prioritarios

---

## FASE 4: Mapa Provincial con Markers (Nivel 3)
**Objetivo:** Mostrar municipios/comarcas con markers de ayudas individuales.

### Componentes:
- `GaliaProvinceMap.tsx` - Mapa detallado con Mapbox
- Markers agrupados (clustering) para zonas con muchas ayudas
- Panel lateral con listado de expedientes

### Funcionalidades:
- Clustering inteligente según zoom
- Filtros por: estado, sector, importe, beneficiario
- Búsqueda por municipio o beneficiario
- Click en marker -> Panel de detalle

### Integración con Mapbox:
- Usar el componente LazyMapContainer existente
- Añadir capa de subvenciones personalizada
- Popup con resumen del expediente

---

## FASE 5: Panel de Detalle de Expediente (Nivel 4)
**Objetivo:** Mostrar información completa del expediente seleccionado.

### Componentes:
- `GaliaExpedienteMapDetail.tsx` - Panel deslizante con detalle
- Integración con componentes existentes de GALIA

### Información mostrada:
- Datos del beneficiario
- Historial del expediente
- Documentos asociados
- Mapa de ubicación exacta
- Acciones disponibles (según rol)

---

## FASE 6: Edge Function y Hook de Datos
**Objetivo:** Backend para obtener datos agregados por nivel geográfico.

### Edge Function: `galia-territorial-map`
- `get_ccaa_summary` - Totales por CCAA
- `get_region_detail` - Detalle de una CCAA
- `get_province_grants` - Expedientes de una provincia
- `get_municipality_detail` - Detalle de un municipio

### Hook: `useGaliaTerritorialMap.ts`
- Estado de navegación (nivel actual, selección)
- Cache de datos por nivel
- Funciones de navegación (drill-down, drill-up)

---

## FASE 7: Animaciones y UX
**Objetivo:** Transiciones fluidas entre niveles y feedback visual.

### Implementaciones:
- Transición zoom suave entre niveles (Framer Motion)
- Breadcrumb interactivo para navegar atrás
- Indicadores de carga durante transiciones
- Atajos de teclado (Escape = volver atrás)
- Modo pantalla completa

---

## FASE 8: Integración en Dashboard
**Objetivo:** Añadir el mapa al menú de navegación de GALIA.

### Acciones:
1. Nuevo item en `galiaNavCategories` (Federación > Mapa Territorial)
2. Lazy load del componente completo
3. Entrada en `renderTabContent()` del dashboard
4. Tests de rendimiento y memoria

---

## Detalle Técnico

### Estructura de Archivos:
```text
src/
├── components/galia/territorial-map/
│   ├── GaliaTerritorialMapPanel.tsx  (Componente principal)
│   ├── GaliaSpainMap.tsx             (SVG España)
│   ├── GaliaRegionMap.tsx            (Mapa CCAA)
│   ├── GaliaProvinceMap.tsx          (Mapa Provincia)
│   ├── GaliaMapBreadcrumb.tsx        (Navegación)
│   ├── GaliaMapTooltip.tsx           (Tooltips)
│   ├── GaliaMapLegend.tsx            (Leyenda)
│   ├── spain-paths.ts                (SVG paths CCAA)
│   └── index.ts
├── hooks/galia/
│   └── useGaliaTerritorialMap.ts
└── supabase/functions/
    └── galia-territorial-map/
        └── index.ts
```

### Dependencias:
- SVG paths de España (sin dependencias externas)
- Framer Motion (ya instalado)
- Mapbox GL (ya configurado)
- Componentes existentes de GALIA

### Optimizaciones de Memoria:
- Lazy loading agresivo de cada nivel de mapa
- Descarga de datos de niveles no visibles
- SVG optimizados (paths simplificados)
- Debounce en interacciones de hover

---

## Cronograma Estimado

| Fase | Descripción | Prioridad |
|------|-------------|-----------|
| 1 | Fix error de build | Crítica |
| 2 | Mapa SVG España | Alta |
| 3 | Mapa Regional | Alta |
| 4 | Mapa Provincial | Media |
| 5 | Panel Detalle | Media |
| 6 | Edge Function | Alta |
| 7 | Animaciones | Baja |
| 8 | Integración | Alta |

---

## Resultado Esperado
Un sistema de visualización geográfica completo que permita:
1. Ver el panorama nacional de un vistazo
2. Explorar regiones con detalle progresivo
3. Llegar hasta el expediente individual sin cambiar de página
4. Navegación fluida e intuitiva con breadcrumbs
5. Rendimiento optimizado sin errores de memoria
