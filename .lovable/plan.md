
# Plan Estratégico: Módulo GALIA - Gestión de Ayudas LEADER con Inteligencia Artificial

## Resumen Ejecutivo

Tras analizar exhaustivamente el documento "PROYECTO GALIA V4" y la arquitectura existente del sistema, propongo crear un **nuevo módulo vertical de Administración Pública** especializado en la gestión de subvenciones que integre IA avanzada. Este módulo se ubicará como expansión del vertical de Gobierno existente (`src/components/verticals/government/`) y tendrá su propio acceso tanto desde el ERP como desde un **Portal Público Ciudadano**.

## Ubicación del Módulo

**Recomendación: Vertical independiente de Gobierno/Administración Pública**

El módulo encaja mejor como una expansión del vertical de gobierno existente por estas razones:
- Es gestión de fondos públicos (no comercial como CRM)
- Involucra procedimiento administrativo (Ley 39/2015, 40/2015)
- Requiere cumplimiento normativo específico (RGPD, transparencia, rendición de cuentas)
- Necesita un portal público para ciudadanos/beneficiarios

Sin embargo, integrará capacidades del ERP (contabilidad, tesorería, documentación) y del CRM (gestión de solicitantes, comunicaciones).

## Arquitectura de Alto Nivel

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           MÓDULO GALIA - ARQUITECTURA                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────┐    ┌────────────────────────────────────────┐   │
│  │   PORTAL PÚBLICO          │    │   PANEL DE GESTIÓN (GAL)                │   │
│  │   (Ciudadanía)            │    │                                         │   │
│  │                           │    │  ┌─────────────┐ ┌─────────────────┐    │   │
│  │  • Consulta convocatorias │    │  │ Dashboard   │ │ Expedientes     │    │   │
│  │  • Asistente Virtual IA   │    │  │ Analítico   │ │ Inteligentes    │    │   │
│  │  • Autodiagnóstico        │    │  └─────────────┘ └─────────────────┘    │   │
│  │    elegibilidad           │    │                                         │   │
│  │  • Carga documentación    │    │  ┌─────────────┐ ┌─────────────────┐    │   │
│  │  • Seguimiento estado     │    │  │ Moderación  │ │ Verificación    │    │   │
│  │  • Justificaciones        │    │  │ de Costes   │ │ Documental IA   │    │   │
│  │                           │    │  └─────────────┘ └─────────────────┘    │   │
│  └──────────────┬────────────┘    │                                         │   │
│                 │                 │  ┌─────────────┐ ┌─────────────────┐    │   │
│                 │                 │  │ Asistente   │ │ Alertas y       │    │   │
│                 │                 │  │ Técnico IA  │ │ Anomalías       │    │   │
│                 │                 │  └─────────────┘ └─────────────────┘    │   │
│                 │                 └──────────────────────┬──────────────────┘   │
│                 │                                        │                      │
│                 ▼                                        ▼                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         CAPA DE IA (Edge Functions)                       │  │
│  │                                                                           │  │
│  │  galia-assistant          galia-document-analyzer    galia-cost-moderator │  │
│  │  (Asistente Virtual)      (OCR + Clasificación)      (Detección anomalías)│  │
│  │                                                                           │  │
│  │  galia-eligibility        galia-justification        galia-predictor     │  │
│  │  (Análisis requisitos)    (Validación gastos)        (Impacto proyectos) │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                         │
│                                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         BASE DE DATOS                                     │  │
│  │                                                                           │  │
│  │  galia_convocatorias    galia_solicitudes    galia_expedientes           │  │
│  │  galia_beneficiarios    galia_documentos     galia_justificaciones       │  │
│  │  galia_costes_ref       galia_auditorias     galia_gal_config            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Funcionalidades por Fase

### FASE 1: Prueba de Concepto (MVP)

**1.1 Asistente Virtual para Ciudadanos**
- Chatbot conversacional entrenado con normativa LEADER
- RAG (Retrieval Augmented Generation) sobre base de conocimiento
- Respuestas a consultas frecuentes (plazos, documentación, elegibilidad)
- Derivación automática a técnico cuando supera umbral de complejidad
- Métricas: tasa de resolución sin intervención humana

**1.2 Panel de Control (Dashboard) para GAL**
- Visualización en tiempo real del estado de expedientes
- Alertas de plazos críticos (vencimientos, hitos)
- Extracción automática de datos de informes (OCR inteligente)
- Filtros por estado, beneficiario, tipo de proyecto, comarca
- Exportación de informes para reporting

**1.3 Base de Conocimiento Estructurada**
- Importación de normativa (PDFs, BOE, BOPA)
- Catálogo de costes de referencia
- FAQs categorizadas
- Histórico de interpretaciones y criterios

### FASE 2: Despliegue Completo

**2.1 Portal Público de Autoservicio**
- Registro de beneficiarios potenciales
- Autodiagnóstico de elegibilidad con IA
- Carga y seguimiento de documentación
- Firma electrónica integrada
- Notificaciones automáticas de estado
- Acceso a histórico de solicitudes

**2.2 Gestión Inteligente de Expedientes**
- Workflow automatizado con estados configurables
- Clasificación automática de documentos entrantes
- Extracción de datos estructurados (NIF, importes, fechas)
- Asignación automática a técnicos por carga de trabajo
- Control de versiones de documentación

**2.3 Sistema de Moderación de Costes**
- Comparación automática con catálogos de referencia
- Detección de sobrecostes (desviación > umbral configurable)
- Alertas de inconsistencias (duplicidades, errores)
- Justificación requerida para desviaciones
- Histórico de precios para análisis de tendencias

**2.4 Verificación Documental con IA**
- Análisis de facturas y justificantes
- Validación de proveedores
- Detección de documentos alterados
- Verificación de requisitos formales
- Scoring de riesgo por expediente

**2.5 Asistente Técnico Interno**
- Copiloto para técnicos del GAL
- Consultas sobre normativa en contexto del expediente
- Sugerencias de resolución basadas en histórico
- Generación de borradores de informes

### FASE 3: Funcionalidades Avanzadas

**3.1 Predicción de Impacto Socioeconómico**
- Modelos ML entrenados con proyectos históricos
- Scoring de viabilidad del proyecto
- Estimación de empleo generado
- Predicción de cumplimiento de objetivos

**3.2 Integración con Sistemas Externos**
- Conexión con gestor de expedientes regional (si existe)
- Sincronización con registro de subvenciones BDNS
- Consulta de datos fiscales (AEAT)
- Integración con catastro para verificaciones

**3.3 Reporting Automatizado**
- Generación automática de memorias
- Informes de seguimiento periódicos
- Cuadros de mando para auditorías
- Exportación a formatos requeridos (FEDER, etc.)

**3.4 Sistema de Transparencia**
- Publicación automática en portal de transparencia
- Trazabilidad completa de actuaciones
- Explicabilidad de decisiones IA
- Mecanismo de reclamación para beneficiarios

### FASE 4: Mejoras Avanzadas ✅ COMPLETADO

**4.1 Aprobación Semi-Automática** ✅
- Pre-aprobación de solicitudes que cumplen 100% criterios objetivos
- Validación humana requerida en ventana de 24h
- Edge Function: `galia-auto-approval`
- Hook: `useGaliaAutoApproval.ts`

**4.2 Asistente Proactivo** ✅
- Notificaciones push de plazos críticos
- Alertas de documentos faltantes
- Avisos de cambios normativos (BOE/BOPA)
- Digest diario para técnicos
- Edge Function: `galia-proactive-assistant`
- Hook: `useGaliaProactiveAssistant.ts`

**4.3 Interoperabilidad BDNS** ✅
- Sincronización con Base de Datos Nacional de Subvenciones
- Búsqueda de convocatorias por código/CIF
- Validación de beneficiarios (NIF, límites de minimis)
- Publicación automática de resoluciones
- Edge Function: `galia-bdns-sync`
- Hook: `useGaliaBDNS.ts`

**4.4 PWA Modo Offline** ✅
- Aplicación instalable desde navegador
- Soporte para zonas rurales con conectividad limitada
- Service Worker con estrategias de caché (NetworkFirst para API, CacheFirst para assets)
- Sincronización automática al recuperar conexión
- Página de instalación: `/install`
- Manifest y meta tags PWA en index.html
- Configuración vite-plugin-pwa

## Estructura de Archivos Propuesta

```text
src/
├── components/verticals/galia/
│   ├── index.ts
│   ├── GaliaDashboard.tsx                 # Dashboard principal GAL
│   ├── GaliaPublicPortal.tsx              # Portal ciudadano
│   ├── GaliaConvocatoriasPanel.tsx        # Gestión convocatorias
│   ├── GaliaExpedientesGrid.tsx           # Lista de expedientes
│   ├── GaliaExpedienteDetail.tsx          # Detalle expediente
│   ├── GaliaSolicitudWizard.tsx           # Wizard de solicitud
│   ├── GaliaJustificacionPanel.tsx        # Panel justificaciones
│   ├── GaliaCostesModeradorPanel.tsx      # Moderación de costes
│   ├── GaliaDocumentViewer.tsx            # Visor documentos IA
│   ├── GaliaAsistenteVirtual.tsx          # Chatbot ciudadano
│   ├── GaliaAsistenteTecnico.tsx          # Copiloto técnicos
│   ├── GaliaAuditTrail.tsx                # Trazabilidad
│   ├── GaliaAnalyticsPanel.tsx            # Analíticas
│   ├── GaliaConfigPanel.tsx               # Configuración GAL
│   └── shared/
│       ├── GaliaStatusBadge.tsx
│       ├── GaliaTimelineView.tsx
│       ├── GaliaKPICards.tsx
│       └── GaliaAlertsList.tsx
│
├── hooks/galia/
│   ├── index.ts
│   ├── useGaliaConvocatorias.ts           # CRUD convocatorias
│   ├── useGaliaExpedientes.ts             # Gestión expedientes
│   ├── useGaliaSolicitudes.ts             # Solicitudes ciudadanos
│   ├── useGaliaJustificaciones.ts         # Justificaciones
│   ├── useGaliaCostesReferencia.ts        # Catálogo costes
│   ├── useGaliaDocumentos.ts              # Gestión documental
│   ├── useGaliaAsistenteIA.ts             # Asistente virtual
│   ├── useGaliaModeradorCostes.ts         # Análisis costes
│   ├── useGaliaElegibilidad.ts            # Verificación requisitos
│   └── useGaliaAnalytics.ts               # Métricas y KPIs
│
├── pages/galia/
│   ├── GaliaPage.tsx                      # Página principal admin
│   └── GaliaPublicPage.tsx                # Portal público

supabase/functions/
├── galia-assistant/index.ts               # Asistente virtual IA
├── galia-document-analyzer/index.ts       # OCR + Clasificación
├── galia-cost-moderator/index.ts          # Detección anomalías
├── galia-eligibility-checker/index.ts     # Análisis requisitos
├── galia-justification-validator/index.ts # Validación gastos
└── galia-impact-predictor/index.ts        # Predicción impacto
```

## Modelo de Datos (Esquema Simplificado)

```text
TABLAS PRINCIPALES:

galia_gal_config
├── id, nombre, codigo_leader, region, contacto, logo_url
└── RLS: solo técnicos del GAL pueden ver/editar su config

galia_convocatorias
├── id, gal_id, nombre, descripcion, presupuesto_total
├── fecha_inicio, fecha_fin, estado, requisitos_json
└── RLS: públicas para lectura, solo técnicos para edición

galia_beneficiarios
├── id, tipo (empresa|ayuntamiento|asociacion), nif, nombre
├── representante, email, telefono, direccion, sector_cnae
└── RLS: beneficiario ve su perfil, técnicos ven todos de su GAL

galia_solicitudes
├── id, convocatoria_id, beneficiario_id, fecha_solicitud
├── estado, puntuacion_elegibilidad, asignado_tecnico_id
└── RLS: beneficiario ve las suyas, técnicos del GAL ven todas

galia_expedientes
├── id, solicitud_id, numero_expediente, estado_workflow
├── importe_solicitado, importe_concedido, fecha_resolucion
└── RLS: beneficiario ve los suyos, técnicos del GAL gestionan

galia_documentos
├── id, expediente_id, tipo, nombre_archivo, storage_path
├── fecha_subida, validado, resultado_ia_json, requiere_revision
└── RLS: beneficiario sube/ve los suyos, técnicos validan

galia_justificaciones
├── id, expediente_id, tipo_gasto, proveedor, importe
├── fecha_factura, doc_factura_id, doc_pago_id, validado
├── desviacion_coste_ref, alerta_anomalia
└── RLS: beneficiario sube, técnicos validan

galia_costes_referencia
├── id, categoria, descripcion, precio_min, precio_max
├── precio_medio, unidad, fecha_actualizacion, fuente
└── RLS: lectura pública, solo admins editan

galia_interacciones_ia
├── id, tipo (asistente|moderador|clasificador), usuario_id
├── expediente_id, pregunta, respuesta, confianza
├── derivado_tecnico, feedback_usuario
└── RLS: auditoría completa para cumplimiento
```

## Edge Functions de IA

### 1. galia-assistant (Asistente Virtual)
```text
Acciones:
- chat: Conversación con ciudadanos sobre LEADER
- search_faq: Búsqueda semántica en base de conocimiento
- check_eligibility_quick: Pre-evaluación rápida de elegibilidad
- explain_procedure: Explicación paso a paso de trámites

Tecnología:
- RAG sobre base de conocimiento vectorizada
- Modelo: google/gemini-2.5-flash (rápido, económico)
- Historial de conversación por sesión
- Detección de intención para derivación
```

### 2. galia-document-analyzer (Análisis Documental)
```text
Acciones:
- classify: Clasificar tipo de documento
- extract_data: Extraer campos estructurados (OCR + NLP)
- validate_format: Verificar requisitos formales
- detect_alterations: Análisis de integridad

Tecnología:
- OCR con corrección contextual
- Extracción de entidades (NIF, importes, fechas)
- Modelo: google/gemini-2.5-pro (precisión en documentos)
```

### 3. galia-cost-moderator (Moderación Costes)
```text
Acciones:
- compare_prices: Comparar con catálogo referencia
- detect_anomalies: Identificar patrones sospechosos
- flag_duplicates: Detectar duplicidades
- calculate_deviation: Calcular desviación porcentual

Tecnología:
- Comparación con embeddings de descripciones
- Reglas configurables de umbrales
- Scoring de riesgo ponderado
```

### 4. galia-eligibility-checker (Verificación Elegibilidad)
```text
Acciones:
- full_check: Análisis completo contra requisitos
- partial_check: Verificación de criterio específico
- generate_report: Informe de elegibilidad
- suggest_improvements: Recomendaciones para cumplir

Tecnología:
- Matching semántico contra criterios
- Verificación de umbrales numéricos
- Generación de explicaciones
```

## Cumplimiento Normativo Integrado

El módulo incluirá controles para:

1. **RGPD / LOPDGDD**
   - Consentimiento explícito para tratamiento
   - Art. 22: Supervisión humana en decisiones automatizadas
   - Derecho de acceso y rectificación
   - Anonimización para analytics

2. **Ley 39/2015 (Procedimiento Administrativo)**
   - Registro de entrada/salida
   - Plazos legales configurables
   - Notificaciones electrónicas
   - Firma electrónica válida

3. **Ley 40/2015 (Actuación Administrativa Automatizada)**
   - Trazabilidad completa de decisiones IA
   - Intervención humana en resoluciones
   - Motivación de actos administrativos

4. **Ley 19/2013 (Transparencia)**
   - Publicación automática en portal
   - Explicabilidad de algoritmos
   - Acceso a información pública

5. **Normativa LEADER / FEDER**
   - Control de elegibilidad de gastos
   - Verificaciones sobre el terreno
   - Pista de auditoría europea

## Innovaciones Respecto a Experiencias Internacionales

Basándome en la investigación de mejores prácticas:

1. **Modelo Estonia (e-Estonia / Kratt AI)**
   - Servicios 100% digitales con IA proactiva
   - Notificaciones push personalizadas
   - Once-only principle (no pedir datos ya disponibles)

2. **Modelo Dinamarca (borger.dk / cBrain)**
   - 67% aprobación automática en minutos
   - Self-service obligatorio
   - Integración con identidad digital

3. **Mejoras propuestas para GALIA:**
   - **Aprobación semi-automática**: Para solicitudes que cumplen 100% criterios objetivos, pre-aprobar con validación humana en 24h
   - **Asistente proactivo**: Notificar plazos, documentos faltantes, cambios normativos
   - **Integración Cl@ve**: Autenticación con DNIe/Cl@ve
   - **Interoperabilidad BDNS**: Sincronización con Base de Datos Nacional de Subvenciones
   - **Modo offline**: PWA para zonas rurales con conectividad limitada

## Cronograma Estimado de Implementación

```text
FASE 1 - MVP (8-10 semanas)
├── Semana 1-2:  Modelo de datos + migraciones + RLS
├── Semana 3-4:  Hooks base + Edge Functions (assistant, analyzer)
├── Semana 5-6:  Dashboard GAL + Panel expedientes
├── Semana 7-8:  Asistente Virtual ciudadano
├── Semana 9-10: Testing + ajustes + documentación

FASE 2 - Despliegue (12-16 semanas)
├── Semana 1-4:  Portal público completo
├── Semana 5-8:  Moderador costes + Verificación documental
├── Semana 9-12: Workflows + Integraciones
├── Semana 13-16: Testing extensivo + Formación

FASE 3 - Avanzado (8-12 semanas)
├── Predicción impacto
├── Integraciones externas
├── Reporting automatizado
└── Optimizaciones basadas en feedback
```

## Métricas de Éxito

- **Tasa de resolución automática del asistente**: Objetivo 70%+
- **Reducción tiempo medio de tramitación**: Objetivo -30%
- **Detección de anomalías en costes**: Objetivo 95% precisión
- **Satisfacción ciudadana**: Objetivo 4.5/5
- **Expedientes sin intervención humana** (pre-evaluación): Objetivo 40%

## Próximos Pasos Inmediatos

1. **Crear estructura de carpetas** del módulo GALIA
2. **Diseñar migraciones** para las tablas principales
3. **Implementar Edge Function** `galia-assistant` como primera PoC
4. **Crear componente** `GaliaDashboard` con KPIs básicos
5. **Desarrollar hook** `useGaliaConvocatorias` para gestión de convocatorias

## Detalles Técnicos

### Patrones de Implementación
El módulo seguirá los patrones establecidos en el custom knowledge:
- Hooks con auto-refresh y manejo de errores
- Edge Functions con prompts dinámicos
- Componentes UI con Radix/shadcn
- RLS policies con funciones security definer

### Integración con Sistema Existente
- Aprovechará `useAICopilot` para el asistente técnico
- Usará `useDocumentIntelligence` como base para el analizador
- Se integrará con el módulo de compliance existente
- Compartirá la infraestructura de auditoría de IA

### Escalabilidad
El diseño permite:
- Multi-tenant: Cada GAL es un tenant aislado
- Escalado horizontal: Edge Functions stateless
- Caché inteligente: Base de conocimiento vectorizada
- Federación: Portal nacional con datos agregados
