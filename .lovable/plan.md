

# Informe Comparativo: Modulo LEADER (GALIA) vs. Proyecto V4

## Objetivo
Crear un documento Notion detallado que compare punto por punto lo que exige el proyecto GALIA V4 (PDF) con lo que esta implementado en la plataforma, siguiendo el orden cronologico del documento original (Actuaciones 1-6), con un apartado especifico sobre como la herramienta ayuda al personal tecnico, y una comparativa internacional con Estonia y Dinamarca.

---

## Estructura del Documento

### 1. Portada y Contexto
- Titulo: "Informe Comparativo GALIA - Modulo LEADER: Cumplimiento del Proyecto V4"
- Subtitulo: Gestion de Ayudas LEADER e Inteligencia Artificial
- Nota: Proyecto piloto con ayudas LEADER, escalable a otras subvenciones de diferentes administraciones.

### 2. Indice de Cumplimiento por Actuacion (orden cronologico del PDF)

Se detallara cada accion del PDF y su correspondencia con funcionalidades implementadas:

**ACTUACION 1: Analisis de experiencias de IA en subvenciones**
- 1.1 Identificar experiencias: Implementado via `galia-compliance-auditor` (benchmarking internacional), base de conocimiento RAG
- 1.2 Trabajo de campo: Implementado via CRM Socios con enlaces a READER, REDR, RRN, ENRD, ELARD
- 1.3 Sistematizar aprendizajes: Implementado via Knowledge Graph semantico, Decision Support Panel

**ACTUACION 2: Estudio normativo y legislativo**
- 2.1 Proteccion de datos (RGPD): Implementado via Hybrid AI con routing local para datos sensibles, EUDI Wallet
- 2.2 Procedimiento administrativo electronico (Ley 39/2015): Circuito de 49 pasos, documentos con CSV
- 2.3 Transparencia (Ley 19/2013): Portal de Transparencia, API Publica
- 2.4 Fiscalizacion y control: Blockchain Audit Trail, Smart Audit
- 2.5 Normativa de ayudas e IA: Compliance Auditor, auto-aprobacion con ventana 24h humana

**ACTUACION 3: Prueba de concepto (Asistente Virtual + Panel de Control)**
- 3.1 Alcance y objetivos: Dashboard con 8 grupos de navegacion, metricas KPI
- 3.2 Base de conocimiento: Knowledge Base RAG con normativa LEADER, FAQs
- 3.3 Tecnologia y arquitectura: React + Edge Functions + Gemini 2.5, multi-tenant
- 3.4 Desarrollo y entrenamiento: Asistente Virtual con PLN, panel de control con 50+ hooks
- 3.5 Formacion equipos: Modulo Training con 10 modulos formativos y tracking de progreso
- 3.6 Pruebas piloto: Sistema Pilot Feedback con NPS, formularios de retroalimentacion

**ACTUACION 4: Planificacion Fase 2**
- 4.1 Prioridades: Strategic Planner con generacion de especificaciones tecnicas y matrices RACI
- 4.2 Escalabilidad: Arquitectura multi-tenant, Federation para 300+ GALs
- 4.3 Otras herramientas IA: 7 herramientas del Toolkit Tecnico ya implementadas (no solo planificadas)
- 4.4 Presupuesto: Budget Planner con planificacion de fases futuras

**ACTUACION 5: Busqueda y contacto de socios**
- 5.1 Perfil de socios: CRM Socios con criterios de evaluacion ponderados
- 5.2 Identificar socios: Pipeline Kanban con estados, enlaces a redes LEADER
- 5.3 Evaluar colaboradores: Sistema de scoring con 6 criterios (Afinidad, Capacidad Tecnica, etc.)

**ACTUACION 6: Coordinacion transversal**
- 6.1 Gestion administrativa: Procurement Manager (LCSP), checklist documental
- 6.2 Coordinacion y seguimiento: Dashboard ejecutivo, alertas proactivas
- 6.3 Contratacion publica: GaliaProcurementManager con pipeline de contratos
- 6.4 Mantenimiento asistente: Knowledge Base actualizable, ciclo de retroalimentacion
- 6.5 Difusion: GaliaDiffusionManager con calendario, metricas de alcance
- 6.6 Captacion socios: CRM integrado con materiales promocionales
- 6.7 Formacion continua: Training con progreso por modulo, certificados

### 3. Apartado Especifico: Como GALIA Ayuda al Personal Tecnico en el Dia a Dia

Detalle exhaustivo de las 7 herramientas del Toolkit Tecnico + Flujograma:

1. **Moderacion de Costes** (`galia-moderador-costes`): Verificacion automatica contra catalogos de referencia, alertas por desviaciones >15%, exigencia de 3 ofertas para >18.000EUR, informe pre-generado
2. **Analisis de Empresas Vinculadas** (`galia-vinculacion-analysis`): Deteccion de administradores comunes, coincidencia de direcciones/cuentas, verificacion de minimis (300.000EUR/3 anos), cruce con Registro Mercantil
3. **Deteccion de Indicios de Fraude** (`galia-fraud-detection`): Facturas entre vinculadas, proveedores ficticios (NIF inactivos), splitting de contratos, facturas duplicadas entre convocatorias
4. **Clasificacion Automatica de Documentacion** (`galia-doc-classification`): OCR+IA para DNI/escrituras/licencias/facturas, checklist automatico, extraccion de datos clave, deteccion de caducados
5. **Analisis de Cumplimiento de Requisitos** (`GaliaCumplimientoRequisitosPanel`): Semaforo verde/amarillo/rojo, sugerencias de subsanacion, verificacion cruzada con bases publicas
6. **Elaboracion de Requerimientos e Informes** (`galia-report-generator`): Requerimiento de subsanacion, informe tecnico-economico, propuesta de resolucion, acta de verificacion in situ
7. **Reconocimiento Automatico de Gastos** (`galia-gasto-recognition`): Extraccion de proveedor/NIF/fecha/concepto/IVA, clasificacion en partidas LEADER, deteccion de gastos no elegibles
8. **Flujograma Interactivo de 49 Pasos** (`GaliaCircuitoTramitacion`): 6 fases macro (Solicitud a Cierre), transiciones ejecutables, bifurcaciones condicionales, zoom/pan, estados visuales

### 4. Funcionalidades que Exceden el Proyecto V4 (Valor Anadido)
- Portal del Beneficiario 360 con gestion de pagos y comunicaciones
- Simulador de Convocatorias con evaluacion de elegibilidad
- Motor BPMN No-code para diseno visual de flujos
- Integraciones con AEAT, TGSS, Registro Mercantil, Catastro/SIGPAC
- Gamificacion para tecnicos ("Maestro LEADER")
- Prediccion de impacto ML (empleo, viabilidad)
- IA Multimodal con soporte de voz (Gemini 2.5)
- Blockchain Audit Trail con SHA-256
- EUDI Wallet (eIDAS 2.0)
- GIS territorial con mapas interactivos
- Federacion Nacional para 300+ GALs

### 5. Comparativa Internacional: Estonia y Dinamarca

**Estonia (e-Estonia, X-Road)**:
- Administracion 100% digital, identidad digital universal
- X-Road: plataforma de interoperabilidad entre organismos
- GALIA supera en: IA aplicada especificamente a subvenciones rurales, toolkit tecnico especializado, circuito de 49 pasos, deteccion de fraude con IA
- Estonia aventaja en: madurez de infraestructura digital nacional, adopcion ciudadana universal

**Dinamarca (Borger.dk, NemID/MitID)**:
- Borger.dk: portal unico ciudadano, autoservicio digital
- MitID: identidad digital nacional
- GALIA supera en: especializacion en gestion de ayudas rurales, herramientas de analisis predictivo, IA conversacional entrenada en normativa LEADER, transparencia con API publica
- Dinamarca aventaja en: estandarizacion nacional de servicios, experiencia de usuario ciudadana unificada

**Conclusion comparativa**: GALIA va mas alla del estado del arte europeo en la aplicacion vertical de IA a la gestion de subvenciones publicas, con herramientas que ni Estonia ni Dinamarca han implementado en el ambito especifico de fondos rurales. La ventaja competitiva reside en la especializacion sectorial y la adaptabilidad a diferentes niveles de la administracion.

### 6. Escalabilidad a Otras Subvenciones
- Arquitectura multi-tenant adaptable a cualquier administracion
- Herramientas genericas (moderacion de costes, fraude, clasificacion) aplicables a FEDER, FSE, PRTR
- Modelo replicable en otras comunidades autonomas o paises UE

---

## Implementacion Tecnica

Se creara una pagina Notion con todo el contenido estructurado en secciones, usando el formato de markdown enriquecido de Notion, con tablas de cumplimiento (Punto del PDF | Estado | Funcionalidad implementada | Detalle).

El documento se generara directamente en el workspace de Notion del usuario.

