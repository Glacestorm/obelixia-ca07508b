

# Plan: Flujograma Visual Completo del Circuito LEADER (~49 pasos)

## Problema Actual

El componente `GaliaCircuitoTramitacion.tsx` muestra los pasos como tarjetas en una cuadricula (grid), no como un flujograma real con nodos conectados por flechas. Ademas, solo muestra 35 nodos cuando el circuito completo tiene aproximadamente 49 pasos incluyendo estados terminales y bifurcaciones.

## Lo que se va a implementar

Un flujograma visual real con nodos, flechas y bifurcaciones, similar a un diagrama BPMN/flowchart, donde:
- Cada paso es un **nodo visual** (rectangulo, rombo para decisiones, circulo para inicio/fin)
- Las conexiones entre pasos se muestran como **flechas SVG** que siguen las transiciones definidas
- Los nodos se **colorean segun su estado**: verde (completado), azul pulsante (actual), amarillo (siguiente disponible), gris (pendiente), rojo (terminal/denegado)
- Se puede hacer **click en un nodo disponible** para ejecutar la transicion
- Se puede hacer **zoom y scroll** para navegar el diagrama completo

## Ampliacion a ~49 pasos

Se anaden los nodos que faltan para reflejar el circuito completo:
- Estados terminales como nodos visuales: `concedido`, `denegado`, `renunciado`, `desistido`, `cerrado`
- Bifurcaciones intermedias: `renuncia_beneficiario`, `vencimiento_sin_pronunciamiento`, `incorporacion_aceptacion_pago`, `desistimiento_beneficiario`
- Nodos de decision/gateway: `decision_elegibilidad`, `decision_subsanacion`, `decision_aceptacion`, `decision_certificacion`, `decision_pago`
- Nodos de control paralelo: `control_administrativo_previo`, `revision_tecnica_final`

## Como funciona la interaccion

1. **Ver el circuito**: Al abrir la pestana "Circuito LEADER", se muestra el flujograma completo con scroll horizontal/vertical
2. **Identificar el estado actual**: El nodo actual parpadea en azul con un badge "Actual"
3. **Ver pasos completados**: Los nodos ya superados aparecen en verde con check
4. **Avanzar un paso**: Los nodos siguientes disponibles aparecen en amarillo; al hacer click se ejecuta la transicion (solo si hay un expediente seleccionado)
5. **Ver bifurcaciones**: Los nodos de decision (rombos) muestran las ramas posibles con etiquetas TER=FAV/TER=DES
6. **Modo solo lectura**: Sin expediente seleccionado, se ve el circuito completo pero sin poder ejecutar transiciones

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/verticals/galia/dashboard/GaliaCircuitoTramitacion.tsx` | Reescribir completamente: de grid de tarjetas a flujograma SVG con nodos posicionados, flechas entre ellos, zoom/pan, interaccion click |
| `src/hooks/galia/useGaliaCircuitoTramitacion.ts` | Ampliar NODOS, TRANSICIONES y ESTADO_LABELS para cubrir los ~49 pasos del circuito completo |
| `src/components/verticals/galia/portal/types.ts` | Actualizar `estadoProgreso` y `estadoProximoPaso` con los nuevos estados |
| `src/components/verticals/galia/dashboard/GaliaNavigation.tsx` | Actualizar badge de "35" a "49" |

## Detalle tecnico del flujograma

El flujograma se renderiza usando SVG nativo dentro de un contenedor con scroll:
- Cada nodo tiene coordenadas X/Y predefinidas segun su fase y posicion en el flujo
- Las flechas se dibujan como paths SVG curvos entre nodos conectados
- Los nodos de decision (rombos) representan bifurcaciones condicionales
- Las etiquetas en las flechas indican la condicion (TER=FAV, TER=DES, Renuncia, etc.)
- Leyenda de colores visible en la cabecera
- Contador de progreso: "X/49 completados"

No se requieren cambios en la base de datos ni nuevas Edge Functions.
