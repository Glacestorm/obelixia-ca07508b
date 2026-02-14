

# Plan: Cobertura 100% del Proyecto LEADER V4

## Resumen de brechas actuales

| Actuacion | Cobertura actual | Elementos pendientes |
|---|---|---|
| Act. 1: Analisis experiencias IA | 100% | Ninguno |
| Act. 2: Estudio normativo | 100% | Ninguno |
| Act. 3: Prueba de concepto | 90% | Formacion GAL (3.5), Feedback piloto (3.6) |
| Act. 4: Planificacion Fase 2 | 85% | Presupuestacion (4.4), Prescripciones tecnicas (4.5), Roles (4.6), Estrategia formacion (4.7) |
| Act. 5: Socios | 40% | CRM socios (5.1/5.2), Evaluacion colaboradores (5.3) |
| Act. 6: Coordinacion transversal | 65% | Contratacion publica (6.3), Difusion (6.5), Captacion socios (6.6), Formacion continua (6.7) |

---

## FASE 1: Formacion y Feedback (Act. 3 -> 100%)
**Complejidad: Media | ~2 sesiones**

### 1A. Modulo de Formacion GAL (punto 3.5)
Crear una seccion dentro del dashboard LEADER que conecte con la Academia existente, pero con contenido especifico para tecnicos GAL.

**Archivos nuevos:**
- `src/components/galia/training/GaliaTrainingCenter.tsx` - Panel con modulos formativos: uso del asistente, panel de control, moderacion de costes, flujo de tramitacion. Incluye indicador de progreso por tecnico, manuales descargables (PDF via export existente) y guias rapidas contextuales.
- `src/hooks/galia/useGaliaTraining.ts` - Hook que gestiona progreso formativo, modulos completados y certificados basicos.

**Integracion:** Nueva pestana "Formacion" en `GaliaNavigation.tsx` dentro del grupo "Herramientas".

### 1B. Sistema de Feedback Piloto (punto 3.6)
Formulario estructurado para usuarios piloto con metricas de satisfaccion.

**Archivos nuevos:**
- `src/components/galia/feedback/GaliaPilotFeedback.tsx` - Formulario con: valoracion por estrellas, tipo de incidencia (bug/mejora/consulta), area afectada (asistente/panel/docs), texto libre, NPS score.
- `src/components/galia/feedback/GaliaFeedbackDashboard.tsx` - Dashboard de metricas: tasa de satisfaccion, incidencias por categoria, tendencia temporal, consultas no resueltas del asistente.
- `supabase/functions/galia-pilot-feedback/index.ts` - Edge function que almacena feedback y genera resumen con IA.

**Base de datos:** Tabla `galia_pilot_feedback` (id, user_id, rating, category, area, comment, nps_score, created_at).

---

## FASE 2: Planificacion Fase 2 (Act. 4 -> 100%)
**Complejidad: Media | ~2 sesiones**

### 2A. Presupuestacion de Fase 2 (punto 4.4)
Herramienta de estimacion presupuestaria con desglose por herramienta.

**Archivos nuevos:**
- `src/components/galia/planning/GaliaBudgetPlanner.tsx` - Tabla interactiva con categorias predefinidas (Desarrollo IA, Integraciones, Infraestructura/Licencias, Formacion, Gestion/Soporte). Permite ajustar importes, genera totales y cronograma financiero. Exportable a PDF/Excel via el sistema de export existente.
- `src/hooks/galia/useGaliaBudgetPlanner.ts` - Hook con logica de calculo, persistencia en base de datos y generacion de plan financiero con IA.

### 2B. Prescripciones Tecnicas, Roles y Estrategia Formativa (puntos 4.5, 4.6, 4.7)
Panel de documentacion estrategica para la Fase 2.

**Archivos nuevos:**
- `src/components/galia/planning/GaliaPhase2Planner.tsx` - Panel con tres secciones en pestanas:
  - **Prescripciones tecnicas**: Generador de pliegos con plantillas predefinidas (asistente virtual, moderacion costes, dashboards). Usa IA para rellenar campos tecnicos automaticamente.
  - **Roles y responsabilidades**: Matriz RACI visual (GAL coordinador, GALs socios, asistencias tecnicas, administracion). Asignacion de responsabilidades por actuacion.
  - **Estrategia de formacion**: Diseno del programa formativo para Fase 2 con modulos, calendario y modalidad (presencial/virtual).
- `supabase/functions/galia-phase2-planner/index.ts` - Edge function que genera documentos de planificacion con IA.

---

## FASE 3: CRM de Socios (Act. 5 -> 100%)
**Complejidad: Media-Alta | ~2 sesiones**

### 3A. Gestion de Socios Potenciales (puntos 5.1 y 5.2)
CRM ligero integrado en el dashboard para gestionar la captacion de socios.

**Archivos nuevos:**
- `src/components/galia/partners/GaliaPartnerCRM.tsx` - Panel con:
  - Listado de socios potenciales con filtros por tipo (GAL, organismo publico, centro tecnologico, universidad), ambito (nacional/transnacional) y estado (identificado/contactado/interesado/comprometido).
  - Ficha de contacto: nombre, tipo, territorio, persona de contacto, email, telefono, notas, historial de interacciones, manifestacion de interes (si/no/pendiente).
  - Timeline de actividades por socio.
  - Kanban visual de pipeline de captacion.
- `src/hooks/galia/useGaliaPartnerCRM.ts` - Hook CRUD con Supabase.

**Base de datos:** Tabla `galia_partners` (id, name, type, territory, scope, contact_person, email, phone, status, interest_declaration, notes, created_at, updated_at). Tabla `galia_partner_interactions` (id, partner_id, interaction_type, description, date, performed_by).

### 3B. Evaluacion y Seleccion de Colaboradores (punto 5.3)
Sistema de scoring para evaluar y comparar socios candidatos.

**Incluido en GaliaPartnerCRM.tsx:**
- Formulario de evaluacion con criterios ponderados: afinidad de objetivos (25%), capacidad tecnica (20%), experiencia relevante (20%), compromiso financiero (15%), cobertura territorial (10%), complementariedad (10%).
- Puntuacion automatica con radar chart comparativo.
- Generacion de informe de seleccion exportable.

---

## FASE 4: Coordinacion Transversal (Act. 6 -> 100%)
**Complejidad: Media | ~2 sesiones**

### 4A. Gestion de Contratacion Publica (punto 6.3)
Modulo basico de seguimiento de contratos conforme a LCSP.

**Archivos nuevos:**
- `src/components/galia/procurement/GaliaProcurementManager.tsx` - Panel con:
  - Registro de contratos: objeto, tipo (menor/abierto/negociado), presupuesto base, adjudicatario, fechas clave, estado (preparacion/licitacion/valoracion/adjudicacion/ejecucion/finalizado).
  - Checklist de documentacion por contrato (pliego tecnico, pliego administrativo, informe valoracion, resolucion adjudicacion, contrato formalizado).
  - Seguimiento de entregables vinculados a cada contrato.
  - Alertas de plazos.
- `src/hooks/galia/useGaliaProcurement.ts` - Hook con CRUD y alertas.

**Base de datos:** Tabla `galia_procurement` (id, title, type, budget, contractor, status, start_date, end_date, deliverables, documents_checklist, created_at).

### 4B. Difusion y Contenidos (punto 6.5)
Panel de gestion de materiales de comunicacion del proyecto.

**Archivos nuevos:**
- `src/components/galia/diffusion/GaliaDiffusionManager.tsx` - Panel con:
  - Registro de actividades de difusion (publicaciones web, eventos, foros, jornadas).
  - Biblioteca de materiales (presentaciones, infografias, videos) con subida a Storage.
  - Calendario de eventos planificados.
  - Metricas basicas: n actividades realizadas, alcance estimado.

### 4C. Herramientas de Captacion de Socios (punto 6.6)
Integrado con el CRM de Fase 3.

**Anadido a GaliaPartnerCRM.tsx:**
- Seccion "Eventos de captacion": registro de encuentros, foros y jornadas con asistentes vinculados.
- Generacion automatica de materiales promocionales (resumen del proyecto) para enviar a candidatos, usando IA.
- Enlace a redes: READER, REDR, RRN, ENRD, ELARD.

### 4D. Formacion Interna Continua (punto 6.7)
Extension del modulo de Fase 1A con seguimiento continuo.

**Anadido a GaliaTrainingCenter.tsx:**
- Seccion "Necesidades formativas": formulario para que tecnicos reporten gaps de conocimiento.
- Dashboard de capacitacion: mapa de competencias por tecnico, horas de formacion acumuladas, areas cubiertas vs. pendientes.
- Integracion con calendario de sesiones formativas (presenciales/virtuales).

---

## Integracion en el Dashboard

Todas las nuevas funcionalidades se integran en la navegacion existente del dashboard LEADER:

| Grupo de navegacion | Nuevas pestanas |
|---|---|
| Herramientas | Formacion, Feedback Piloto |
| Automatizacion | Plan Fase 2, Presupuestacion |
| Federacion | CRM Socios, Contratacion |
| Transparencia | Difusion |

Cada componente se carga con `React.lazy()` siguiendo el patron existente en `GaliaMainTabs.tsx`.

---

## Resultado esperado por actuacion

| Actuacion | Antes | Despues |
|---|---|---|
| Act. 1 | 100% | 100% |
| Act. 2 | 100% | 100% |
| Act. 3 | 90% | 100% |
| Act. 4 | 85% | 100% |
| Act. 5 | 40% | 100% |
| Act. 6 | 65% | 100% |
| **TOTAL** | **~82%** | **100%** |

---

## Orden de implementacion recomendado

1. **Fase 1** (Act. 3): Formacion + Feedback - Son requisitos basicos del documento V4 y los mas sencillos de implementar.
2. **Fase 2** (Act. 4): Planificacion Fase 2 - Depende solo de IA generativa ya disponible.
3. **Fase 3** (Act. 5): CRM Socios - Requiere nuevas tablas y es la actuacion con menor cobertura (40%).
4. **Fase 4** (Act. 6): Transversal - Se beneficia de lo construido en fases anteriores (CRM, formacion).

