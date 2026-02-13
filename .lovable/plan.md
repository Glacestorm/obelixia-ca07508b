
# Plan de Implementacion: Circuito Completo de Tramitacion LEADER en GALIA

## Contexto

El modulo GALIA actual tiene un flujo simplificado de 9 estados (instruccion, evaluacion, propuesta, resolucion, concedido, denegado, renunciado, justificacion, cerrado). El flujograma del circuito de tramitacion PANT/ENT muestra un proceso real con mas de 30 pasos interconectados, bifurcaciones condicionales (renuncia/desistimiento, deteccion de irregularidades, modificacion de inversiones) y controles cruzados obligatorios.

Este plan aborda tres ejes simultaneos:
1. **Terminologia**: Sustituir "Ministerio" por "la administracion" y centrar el lenguaje en ayudas LEADER como proyecto piloto escalable.
2. **Circuito completo**: Implementar todos los pasos del flujograma como estados y sub-estados del expediente.
3. **Herramientas para tecnicos**: Crear un apartado especifico que muestre las capacidades de la plataforma para el trabajo diario.

---

## Fase 1: Terminologia y Escalabilidad (inmediata)

### 1.1 Sustitucion de referencias a "Ministerio"
- **Archivos afectados**: `supabase/functions/obelixia-grants-intelligence/index.ts` y `supabase/functions/erp-regulations-search/index.ts`
- Cambiar "Ministerio de Economia y Competitividad" por "la administracion competente"
- Cambiar "Ministerio de Hacienda" por "la administracion tributaria"
- NOTA: Los archivos de RRHH (`HRNewsPanel.tsx`) y contabilidad sectorial (`VerticalAccountingTypes.ts`) NO se modifican, ya que son de otros modulos y la referencia es correcta en su contexto.

### 1.2 Contextualizacion LEADER + Escalabilidad
- Actualizar textos en `GaliaWorkflowManager.tsx`, `GaliaDashboard.tsx`, `GaliaNavigation.tsx` para:
  - Referenciar "gestion de ayudas LEADER" explicitamente
  - Anadir indicador visual de "Proyecto piloto - Escalable a otras subvenciones"
- Actualizar `docs/INFORME_COMPARATIVO_GALIA_V4.md` con seccion de escalabilidad

---

## Fase 2: Circuito Completo de Tramitacion (nucleo)

### 2.1 Nuevo modelo de estados del expediente

Se amplia el tipo `GaliaExpediente['estado']` de 9 a ~25 estados que reflejan exactamente el flujograma:

```text
FASE SOLICITUD:
  incorporacion_solicitud
  peticion_informes_cruzados
  apertura_expediente
  especificacion_controles
  requerimiento_subsanacion (ya existe como 'subsanacion')

FASE ELEGIBILIDAD:
  control_elegibilidad_oodr
  control_administrativo_elegibilidad
  propuesta_resolucion_elegibilidad
  resolucion_elegibilidad_dg
  elegibilidad_hechos
  indicadores_expediente

FASE EVALUACION TECNICA:
  peticion_informe_tecnico_economico
  tramite_espera_junta_ct
  control_previsto_ayuda_concesion

FASE RESOLUCION:
  tramite_espera_resolucion_dg
  incorporar_resolucion_dg
  notificacion_beneficiario
  control_aceptacion_renuncia

FASE PAGO Y JUSTIFICACION:
  aceptacion_pago_anticipado
  solicitud_excepcion
  adjuntar_solicitud_pago
  peticion_informes_cruzados_pago
  especificacion_controles_pago
  requerimiento_subsanacion_pago
  informe_certificacion
  control_justificacion
  acta_verificacion_in_situ
  control_contratacion_publica
  control_certificacion_pago

FASE CIERRE:
  propuesta_ordenacion_pago
  peticion_orden_pago
  indicar_fecha_pago
  resolucion_revocacion
  notificacion_revocacion
  terminacion_expediente

ESTADOS TERMINALES:
  concedido (se mantiene)
  denegado (se mantiene)
  renunciado (se mantiene)
  desistido (se mantiene)
  cerrado (se mantiene)
```

### 2.2 Migracion de base de datos
- Crear migracion SQL para ampliar el ENUM/CHECK del campo `estado` en `galia_expedientes`
- Anadir columnas de sub-estado y metadata para cada paso del circuito:
  - `sub_estado` (text): paso actual dentro de la fase
  - `fase_actual` (text): fase macro del circuito (solicitud, elegibilidad, evaluacion, resolucion, pago, cierre)
  - `resultado_control` (jsonb): resultados de controles (TER=favorable, TER=desfavorable, etc.)
  - `fecha_notificacion` (timestamptz)
  - `fecha_aceptacion` (timestamptz)
  - `tipo_pago` (text): anticipado, certificacion, normal
  - `verificacion_in_situ` (boolean)
  - `control_contratacion_publica` (boolean)
- Mantener compatibilidad con los 9 estados originales como "fases macro"

### 2.3 Actualizacion del hook `useGaliaExpedientes`
- Ampliar la interfaz `GaliaExpediente` con los nuevos campos
- Anadir funciones para transiciones de estado con validacion:
  - `avanzarExpediente(id, siguienteEstado, resultado)`: valida transiciones legales segun flujograma
  - `retrocederExpediente(id, motivo)`: para requerimientos de subsanacion
  - `bifurcarExpediente(id, tipo)`: para renuncia/desistimiento/revocacion
- Crear mapa de transiciones validas como constante exportable

### 2.4 Nuevo componente `GaliaCircuitoTramitacion`
- Componente visual que muestra el flujograma completo con:
  - Nodos coloreados por fase (verde=completado, azul=actual, gris=pendiente)
  - Bifurcaciones visibles (renuncia, desistimiento, irregularidades)
  - Indicadores TER=FAV / TER=DES en cada decision
  - Click en cada nodo para ver detalle/acciones disponibles
- Sustituye/complementa el `GaliaWorkflowManager` actual

---

## Fase 3: Panel de Herramientas para Tecnicos (apartado especifico)

### 3.1 Nuevo componente `GaliaTecnicoToolkit`
Panel dedicado que agrupa y presenta visualmente todas las capacidades que ayudan al tecnico en su dia a dia:

**Seccion 1: Moderacion de Costes**
- Ya implementado en `GaliaModeradorCostes.tsx`
- Verificacion automatica de presupuestos contra catalogos de referencia
- Deteccion de desviaciones >15% con alerta automatica
- Comparacion con precios de mercado

**Seccion 2: Analisis de Empresas Vinculadas**
- NUEVO: Componente `GaliaEmpresasVinculadasPanel`
- Cruce automatico de NIF/CIF del beneficiario contra:
  - Base de datos de beneficiarios existentes
  - Registro Mercantil (via `galia-admin-integrations`)
  - Deteccion de administradores comunes, misma direccion fiscal, mismas cuentas bancarias
- Alerta de posibles conflictos de interes o concentracion de ayudas

**Seccion 3: Deteccion de Indicios de Fraude**
- Ya implementado parcialmente en `galia-smart-audit`
- AMPLIAR con patron de deteccion de:
  - Facturas entre empresas vinculadas
  - Proveedores ficticios (NIF inexistentes o inactivos)
  - Facturas duplicadas entre convocatorias
  - Patrones de splitting para evitar umbrales de contratacion
  - Desproporcion entre presupuesto y capacidad del solicitante

**Seccion 4: Reconocimiento y Clasificacion de Documentacion**
- Ya implementado en `GaliaDocumentAnalyzer.tsx` con OCR
- MEJORAR presentacion para el tecnico: mostrar checklist automatico de documentos requeridos vs. presentados
- Clasificacion automatica: DNI, escrituras, licencias, facturas, nominas, presupuestos, memorias

**Seccion 5: Analisis de Cumplimiento de Requisitos**
- Ya implementado parcialmente en `galia-decision-support` y `galia-compliance-predictor`
- NUEVO panel unificado que muestra de un vistazo:
  - Requisitos de la convocatoria vs. documentacion presentada
  - Semaforo verde/amarillo/rojo por requisito
  - Sugerencias automaticas de subsanacion

**Seccion 6: Elaboracion de Requerimientos e Informes**
- Ya implementado en `galia-report-generator` y `galia-document-print`
- MEJORAR con plantillas especificas del circuito de tramitacion:
  - Requerimiento de subsanacion (con campos auto-rellenados)
  - Informe tecnico-economico
  - Propuesta de resolucion
  - Informe de certificacion
  - Acta de verificacion in situ

**Seccion 7: Reconocimiento Automatico de Gastos Justificados**
- Ya implementado parcialmente en `GaliaPlantillasJustificacion.tsx`
- NUEVO: Edge Function `galia-gasto-recognition` que:
  - Lee facturas con OCR y extrae: proveedor, NIF, fecha, concepto, base, IVA, total
  - Clasifica automaticamente en partidas presupuestarias
  - Detecta gastos no elegibles (efectivo >1.000EUR, falta 3 ofertas >18.000EUR)
  - Genera tabla de justificacion pre-rellenada

### 3.2 Integracion en navegacion
- Anadir nueva categoria "Toolkit Tecnico" en `GaliaNavigation.tsx` entre "Inteligencia Artificial" y "Herramientas"
- Items: Moderacion Costes, Empresas Vinculadas, Deteccion Fraude, Clasificacion Docs, Cumplimiento, Informes, Gastos Automaticos

---

## Fase 4: Edge Function para Analisis de Vinculaciones

### 4.1 Nueva Edge Function `galia-vinculacion-analysis`
- Accion `detect_vinculaciones`: recibe NIF del beneficiario, cruza con base de datos de beneficiarios y Registro Mercantil
- Accion `check_concentracion`: verifica si el beneficiario o empresas vinculadas superan limites de minimis
- Accion `flag_conflictos`: detecta conflictos de interes entre tecnicos y beneficiarios

### 4.2 Nueva Edge Function `galia-gasto-recognition`
- Accion `extract_factura`: OCR + IA para extraer campos de factura
- Accion `classify_partida`: clasificacion automatica en partidas presupuestarias LEADER
- Accion `validate_gasto`: verificacion de elegibilidad (medios de pago, ofertas competitivas, coherencia con proyecto)

---

## Fase 5: Actualizacion del Informe Comparativo

### 5.1 Actualizar `docs/INFORME_COMPARATIVO_GALIA_V4.md`
- Anadir seccion "Ventaja competitiva: Escalabilidad a otras subvenciones"
- Anadir seccion "Como GALIA ayuda al personal tecnico: 7 herramientas clave"
- Anadir seccion "Circuito de tramitacion completo LEADER implementado"
- Sustituir todas las referencias a "Ministerio" por "la administracion"

---

## Resumen de archivos a crear/modificar

| Archivo | Accion |
|---|---|
| `src/hooks/galia/useGaliaExpedientes.ts` | MODIFICAR: ampliar estados, transiciones, nuevos campos |
| `src/components/verticals/galia/dashboard/GaliaWorkflowManager.tsx` | MODIFICAR: reflejar circuito completo con ~25 pasos |
| `src/components/verticals/galia/dashboard/GaliaCircuitoTramitacion.tsx` | CREAR: visualizacion del flujograma completo |
| `src/components/verticals/galia/dashboard/GaliaTecnicoToolkit.tsx` | CREAR: panel unificado de herramientas para tecnicos |
| `src/components/verticals/galia/dashboard/GaliaEmpresasVinculadasPanel.tsx` | CREAR: deteccion de empresas vinculadas |
| `src/components/verticals/galia/dashboard/GaliaCumplimientoRequisitosPanel.tsx` | CREAR: semaforo de requisitos |
| `src/components/verticals/galia/dashboard/GaliaGastoRecognitionPanel.tsx` | CREAR: reconocimiento automatico de facturas |
| `src/hooks/galia/useGaliaVinculaciones.ts` | CREAR: hook para analisis de vinculaciones |
| `src/hooks/galia/useGaliaGastoRecognition.ts` | CREAR: hook para reconocimiento de gastos |
| `src/hooks/galia/useGaliaCircuitoTramitacion.ts` | CREAR: hook para transiciones del circuito |
| `supabase/functions/galia-vinculacion-analysis/index.ts` | CREAR: Edge Function analisis vinculaciones |
| `supabase/functions/galia-gasto-recognition/index.ts` | CREAR: Edge Function reconocimiento gastos |
| `src/components/verticals/galia/dashboard/GaliaNavigation.tsx` | MODIFICAR: anadir categoria Toolkit Tecnico |
| `src/components/verticals/galia/portal/types.ts` | MODIFICAR: anadir nuevos estados del circuito |
| `supabase/functions/obelixia-grants-intelligence/index.ts` | MODIFICAR: sustituir "Ministerio" por "administracion" |
| `supabase/functions/erp-regulations-search/index.ts` | MODIFICAR: sustituir "Ministerio" por "administracion" |
| `docs/INFORME_COMPARATIVO_GALIA_V4.md` | MODIFICAR: anadir secciones de escalabilidad y toolkit |
| Migracion SQL | CREAR: ampliar esquema de `galia_expedientes` |

---

## Detalle tecnico: Mapa de transiciones del circuito

Las transiciones validas seguiran exactamente el flujograma:

```text
incorporacion_solicitud
  -> peticion_informes_cruzados [TER]
  -> apertura_expediente [TER]
  
apertura_expediente
  -> especificacion_controles [TER+REV]

especificacion_controles
  -> requerimiento_subsanacion [TER=DES]
  -> control_elegibilidad_oodr [TER=FAV]
  -> resolucion (terminal) [TER=DES final]

requerimiento_subsanacion
  -> especificacion_controles [tras subsanacion]
  -> terminacion_expediente [sin respuesta]

control_elegibilidad_oodr
  -> control_administrativo_elegibilidad [TER]

control_administrativo_elegibilidad
  -> propuesta_resolucion_elegibilidad [TER]
  -> terminacion_expediente [TER=DES]

propuesta_resolucion_elegibilidad
  -> resolucion_elegibilidad_dg [TER]

resolucion_elegibilidad_dg
  -> elegibilidad_hechos [TER]

elegibilidad_hechos
  -> indicadores_expediente [TER=FAV]

indicadores_expediente
  -> peticion_informe_tecnico_economico [TER]

peticion_informe_tecnico_economico
  -> tramite_espera_junta_ct [TER+REV]

tramite_espera_junta_ct
  -> control_previsto_ayuda_concesion [concurrencia]

control_previsto_ayuda_concesion
  -> tramite_espera_resolucion_dg [TER]

tramite_espera_resolucion_dg
  -> incorporar_resolucion_dg [TER]

incorporar_resolucion_dg
  -> notificacion_beneficiario [TER]

notificacion_beneficiario
  -> control_aceptacion_renuncia [TER=FAV (notificado)]
  -> renuncia [TER=DES (no notificado)]

control_aceptacion_renuncia
  -> aceptacion_pago_anticipado [acepta + solicita anticipo]
  -> solicitud_excepcion [solicita excepcion]
  -> incorporacion_aceptacion_pago [acepta normal]
  -> renuncia [renuncia]
  -> vencimiento_sin_pronunciamiento [sin respuesta]
  -> terminacion_expediente [desiste]

adjuntar_solicitud_pago
  -> peticion_informes_cruzados_pago [TER]

peticion_informes_cruzados_pago
  -> especificacion_controles_pago [TER+REV]

especificacion_controles_pago
  -> requerimiento_subsanacion_pago [TER=FAV parcial]
  -> informe_certificacion [TER=FAV]
  -> control_justificacion [TER=FAV]
  -> acta_verificacion_in_situ [TER]

informe_certificacion + control_justificacion + acta_verificacion_in_situ
  -> control_contratacion_publica [si procede]
  -> control_certificacion_pago [TER]

control_certificacion_pago
  -> especificacion_controles_pago [TER=DES -> revocacion]
  -> propuesta_ordenacion_pago [TER=FAV]

propuesta_ordenacion_pago
  -> peticion_orden_pago [TER=FAV]
  -> resolucion_revocacion [TER=DES]

peticion_orden_pago
  -> indicar_fecha_pago [TER+REV]

indicar_fecha_pago
  -> terminacion_expediente [TER]

resolucion_revocacion
  -> notificacion_revocacion [TER]
  -> terminacion_expediente [TER]
```

Cada transicion registra: usuario, timestamp, resultado (TER=FAV/DES/REV), observaciones, y queda en el audit trail blockchain.
