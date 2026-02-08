
# PLAN ESTRATÉGICO GALIA 2.0 - EXCELENCIA DIGITAL EN GESTIÓN DE AYUDAS PÚBLICAS

## Resumen Ejecutivo

Este plan transforma el módulo GALIA en una plataforma de referencia europea para la gestión de ayudas públicas, superando los modelos de Estonia (e-Governance) y Dinamarca (Digital First). Se estructura en **10 Fases** que cubren desde la corrección del error de memoria hasta la implementación de un ecosistema completo de automatización UE-Estado-GAL-Ciudadano.

---

## ANÁLISIS COMPARATIVO: ESTADO ACTUAL vs PROYECTO GALIA V4

### Requisitos del Documento vs Implementación Actual

| Requisito Proyecto GALIA V4 | Estado Actual | Gap |
|---|---|---|
| **ACTUACIÓN 1**: Análisis experiencias IA | No existe base de conocimiento estructurada | Crear módulo de Knowledge Base |
| **ACTUACIÓN 2**: Estudio normativo RGPD/Ley 39-40/2015 | Parcial (transparencia) | Integrar validación legal en cada acción |
| **ACTUACIÓN 3.1**: Asistente virtual | ✅ Implementado (GaliaAsistenteVirtualMejorado) | Ampliar base de conocimiento |
| **ACTUACIÓN 3.2**: Base de conocimiento | Tabla `galia_faq` básica | Expandir con RAG y normativa |
| **ACTUACIÓN 3.3**: Panel de control | ✅ Dashboard implementado | Añadir más KPIs |
| **ACTUACIÓN 3.4**: Entrenar modelo | ✅ Usa Gemini 2.5 Flash | Añadir fine-tuning contextual |
| **ACTUACIÓN 3.5**: Formación equipos GAL | No existe | Crear módulo de onboarding |
| **ACTUACIÓN 3.6**: Pruebas piloto | No existe sistema de testing | Implementar sandbox |
| **ACTUACIÓN 4**: Plan Fase 2 | Parcialmente (Fases 4-8) | Completar roadmap |
| **ACTUACIÓN 5**: Búsqueda socios | No existe | Portal federación nacional |
| **ACTUACIÓN 6**: Coordinación transversal | No existe | Dashboard coordinador |

### Funcionalidades Pendientes del Circuito UE-Ciudadano

| Fase del Circuito | Implementación Actual | Pendiente |
|---|---|---|
| UE → España (Reglamentos) | No automatizado | Scraping BOE/DOUE + alertas |
| España → CCAA (Distribución) | No existe | Integración BDNS automática |
| Convocatoria → BDNS | Manual | Publicación automática |
| Solicitud ciudadano | Básico | Formularios dinámicos + Cl@ve |
| Evaluación IA | ✅ Auto-approval básico | Scoring multicriteria |
| Resolución → Notificación | No automatizada | Notific@ + e-mail oficial |
| Justificación | ✅ Plantillas básicas | OCR + validación 3 ofertas |
| Auditoría/Reintegro | ✅ Smart Audit | Ampliar con IA predictiva |

---

## FASE 0: CORRECCIÓN CRÍTICA - ERROR DE MEMORIA

**Problema**: `JavaScript heap out of memory` durante el build de Vite.

**Causa raíz**: El componente `GaliaDashboard.tsx` carga 16+ tabs con lazy loading pero el archivo tiene 547 líneas con múltiples imports estáticos.

**Solución técnica**:
1. Dividir `GaliaDashboard.tsx` en componentes más pequeños
2. Mover la lógica de tabs a un subdirectorio `dashboard/tabs/`
3. Implementar code-splitting más agresivo
4. Reducir imports estáticos de lucide-react (usar dynamic imports)

**Archivos a modificar**:
- `src/components/verticals/galia/GaliaDashboard.tsx` → Refactorizar
- Crear `src/components/verticals/galia/dashboard/tabs/` con componentes individuales

---

## FASE 1: SISTEMA DE CONOCIMIENTO NORMATIVO (Base RAG)

**Objetivo**: Crear una base de conocimiento exhaustiva para el Agente GALIA Experto.

### 1.1 Infraestructura de Conocimiento

**Nueva tabla**: `galia_knowledge_base`
```
- id, categoria (UE/Nacional/Autonómico/Local)
- tipo (reglamento/ley/orden/convocatoria/guia/faq)
- titulo, contenido_texto, contenido_embeddings
- fuente_url, boe_referencia, doue_referencia
- fecha_publicacion, fecha_vigencia_inicio, fecha_vigencia_fin
- ambito_territorial, sectores_aplicables
- created_at, updated_at
```

**Nueva tabla**: `galia_knowledge_sources`
```
- id, nombre (BOE/BOPA/DOUE/BDNS/etc)
- url_base, frecuencia_sync
- ultimo_sync, estado_sync
```

### 1.2 Descarga Automática de Normativa

**Nueva Edge Function**: `galia-knowledge-sync`
- Conexión a APIs oficiales: BOE.es, BOPA.es, BDNS, EUR-Lex
- Parsing de PDFs normativos con OCR
- Generación de embeddings para búsqueda semántica
- Actualización diaria automática (cron)

### 1.3 Agente GALIA Experto

**Nueva Edge Function**: `galia-expert-agent`
- Arquitectura RAG con Gemini 2.5 Pro
- Consulta vectorial sobre base de conocimiento
- Citación de fuentes normativas
- Especialización por rol: ciudadano/técnico/auditor/gestor

**Nuevo componente**: `GaliaKnowledgeExplorer.tsx`
- Navegador de normativa por categorías
- Buscador semántico
- Vista de árbol jerárquico (UE→España→Asturias→Municipio)
- Descarga de documentos originales

---

## FASE 2: AUTOMATIZACIÓN DEL CIRCUITO UE → CIUDADANO

### 2.1 Monitor de Nuevas Dotaciones (UE/Estado)

**Nueva Edge Function**: `galia-eu-funding-monitor`
- Scraping de convocatorias del Plan de Recuperación
- Detección de nuevos programas FEDER/LEADER
- Alertas a administradores cuando hay nuevo funding

### 2.2 Sincronización BDNS Bidireccional

**Mejora de**: `galia-bdns-sync`
- Publicación automática de convocatorias al crear en GALIA
- Descarga de convocatorias de otros GAL/CCAA
- Validación de beneficiarios contra BDNS (consulta de minimis)

### 2.3 Creación Automática de Convocatorias

**Mejora del formulario "Nueva Convocatoria"**:
- Campos adicionales: documentos adjuntos, requisitos BDNS, tipos beneficiario
- Upload de bases reguladoras (PDF)
- Generación automática de extracto para BOE/BOPA
- Pre-validación de cumplimiento normativo

---

## FASE 3: PORTAL CIUDADANO AVANZADO

### 3.1 Autenticación Cl@ve/DNIe

**Mejora de**: `useGaliaClaveAuth`
- Integración real con Cl@ve PIN/Permanente
- Firma electrónica de solicitudes
- Verificación de identidad para expedientes

### 3.2 Formularios de Solicitud Dinámicos

**Nuevo componente**: `GaliaSolicitudWizard.tsx`
- Wizard paso a paso adaptado a cada convocatoria
- Campos dinámicos según tipo de beneficiario
- Validación en tiempo real
- Guardado de borrador
- Anexo de documentos con verificación

### 3.3 Comunicaciones Oficiales Automatizadas

**Nueva Edge Function**: `galia-official-notifications`
- Integración con Notific@ (sistema nacional de notificaciones)
- Generación de documentos oficiales (resoluciones, requerimientos)
- Envío por e-mail con acuse de recibo
- Registro en expediente automático

---

## FASE 4: VINCULACIÓN CON MÓDULO JURÍDICO

### 4.1 Asistencia Legal Integrada

**Nueva integración**:
- Conexión con `legal-ai-advisor` existente
- Consultas sobre recursos administrativos
- Plazos legales y prescripciones
- Generación de alegaciones/recursos

### 4.2 Validación Legal en Tiempo Real

**Nuevo componente**: `GaliaLegalValidationBadge.tsx`
- Verificación automática de cumplimiento Ley 38/2003
- Alertas de plazos administrativos
- Sugerencias de corrección antes de resolución

### 4.3 Recursos y Reclamaciones

**Nuevo componente**: `GaliaRecursosPanel.tsx`
- Gestión de recursos alzada/reposición
- Calendario de plazos con alertas
- Plantillas de respuesta a recursos

---

## FASE 5: VINCULACIÓN CON MÓDULOS CONTABLE Y TESORERÍA

### 5.1 Integración Contable

**Conexiones con ERP existente**:
- Registro automático de compromisos en contabilidad
- Generación de asientos por pagos de subvenciones
- Reconciliación de justificaciones con facturas

### 5.2 Gestión de Tesorería

**Nuevas funcionalidades**:
- Previsión de pagos a beneficiarios
- Control de cash-flow por convocatoria
- Alertas de fondos insuficientes

### 5.3 Reporting Unificado

**Nuevo componente**: `GaliaFinancialBridgePanel.tsx`
- Vista consolidada subvención + contabilidad
- Exportación a formatos oficiales (cuenta justificativa)
- Cruce automático con extractos bancarios

---

## FASE 6: TRANSPARENCIA TOTAL Y COMUNICACIÓN CIUDADANA

### 6.1 Portal de Transparencia Mejorado

**Mejora de**: `GaliaTransparencyPortal.tsx`
- Publicación automática de beneficiarios (Ley 19/2013)
- Explicabilidad IA (Art. 22 RGPD)
- Estadísticas públicas en tiempo real

### 6.2 Notificaciones Proactivas al Ciudadano

**Nuevo sistema**:
- SMS/Email cuando cambia estado de expediente
- Recordatorio de plazos de justificación
- Alertas de nuevas convocatorias según perfil

### 6.3 Encuestas de Satisfacción

**Nuevo componente**: `GaliaSatisfactionSurvey.tsx`
- Encuesta post-resolución
- NPS del servicio
- Sugerencias de mejora

---

## FASE 7: IMPRESIÓN Y EXPORTACIÓN UNIVERSAL

### 7.1 Sistema de Impresión de Expedientes

**Nuevo componente**: `GaliaExpedientePrint.tsx`
- Vista de impresión optimizada
- Selección de secciones a imprimir
- Generación de PDF con firma electrónica

### 7.2 Exportación Multiformato

**Nueva funcionalidad en todos los paneles**:
- Export a PDF, Excel, Word, CSV
- Envío por email integrado
- Compartir enlace temporal (documento público)

### 7.3 Generación de Documentos Oficiales

**Mejora de**: `GaliaDocumentGeneratorPanel`
- Plantillas de resoluciones según normativa
- Requerimientos de subsanación
- Actas de verificación
- Memorias FEDER

---

## FASE 8: BOTÓN COMPARATIVO DE CUMPLIMIENTO

### 8.1 Auditor de Cumplimiento GALIA V4

**Nuevo componente**: `GaliaComplianceAuditor.tsx`
- Análisis punto por punto del documento V4
- Indicador visual de implementación (%)
- Detalle de gaps pendientes
- Recomendaciones de mejora

### 8.2 Dashboard de Estado del Proyecto

**Nuevo componente**: `GaliaProjectStatusDashboard.tsx`
- Roadmap visual de fases
- Progreso por actuación
- Comparativa con Estonia/Dinamarca

---

## FASE 9: AUTOMATIZACIÓN EXTREMA (IA LOCAL + CLOUD)

### 9.1 Integración IA Híbrida

**Conexión con sistema existente**:
- Uso de Ollama local para datos sensibles
- Gemini/GPT para análisis generales
- Routing inteligente por tipo de consulta

### 9.2 Procesamiento Automático de Expedientes

**Nuevo workflow**:
- Recepción → OCR → Validación → Scoring → Pre-resolución
- Todo sin intervención humana para casos simples
- Derivación a técnico solo cuando necesario

### 9.3 Detección de Anomalías en Tiempo Real

**Mejora de Smart Audit**:
- Alertas inmediatas por desviaciones
- Bloqueo preventivo de operaciones sospechosas
- Recomendaciones de acción

---

## FASE 10: FEDERACIÓN NACIONAL E INTERNACIONAL

### 10.1 Portal Multi-GAL Nacional

**Mejora de**: `GaliaFederationDashboard`
- Conexión con los 300+ GAL de España
- Benchmarking automático
- Compartición de buenas prácticas

### 10.2 Interoperabilidad Europea

**Nuevas integraciones**:
- ENRD (European Network for Rural Development)
- eIDAS 2.0 para ciudadanos UE
- Reporte automático a Comisión Europea

### 10.3 Modelo de Referencia

**Documentación**:
- API pública documentada (OpenAPI 3.0)
- SDK para otros GAL
- Manual de implementación

---

## CRONOGRAMA ESTIMADO

| Fase | Duración | Prioridad |
|---|---|---|
| Fase 0 (Error memoria) | 1 día | CRÍTICA |
| Fase 1 (Knowledge Base) | 2 semanas | ALTA |
| Fase 2 (Circuito UE) | 2 semanas | ALTA |
| Fase 3 (Portal ciudadano) | 2 semanas | ALTA |
| Fase 4 (Jurídico) | 1 semana | MEDIA |
| Fase 5 (Contable/Tesorería) | 1 semana | MEDIA |
| Fase 6 (Transparencia) | 1 semana | MEDIA |
| Fase 7 (Impresión/Export) | 3 días | MEDIA |
| Fase 8 (Comparativo) | 2 días | MEDIA |
| Fase 9 (IA extrema) | 2 semanas | BAJA |
| Fase 10 (Federación) | 2 semanas | BAJA |

---

## ARQUITECTURA TÉCNICA PROPUESTA

```text
+------------------------------------------------------------------+
|                        FRONTEND (React/Vite)                      |
|  +------------+  +------------+  +------------+  +------------+   |
|  |  Portal    |  | Dashboard  |  | Knowledge  |  | Compliance |   |
|  | Ciudadano  |  |  Técnico   |  |  Explorer  |  |   Auditor  |   |
|  +------------+  +------------+  +------------+  +------------+   |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                      EDGE FUNCTIONS (Deno)                        |
|  +------------------+  +------------------+  +------------------+ |
|  | galia-expert     |  | galia-knowledge  |  | galia-official   | |
|  |     -agent       |  |      -sync       |  |  -notifications  | |
|  +------------------+  +------------------+  +------------------+ |
|  +------------------+  +------------------+  +------------------+ |
|  | galia-eu-funding |  | galia-legal      |  | galia-financial  | |
|  |    -monitor      |  |   -bridge        |  |    -bridge       | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                    SUPABASE DATABASE                              |
|  galia_knowledge_base | galia_sources | galia_convocatorias       |
|  galia_expedientes    | galia_audit   | galia_notifications       |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                   INTEGRACIONES EXTERNAS                          |
|  +-------+  +------+  +------+  +--------+  +-------+  +-------+  |
|  | BDNS  |  | BOE  |  | BOPA |  | Notific@|  | AEAT  |  | TGSS  | |
|  +-------+  +------+  +------+  +--------+  +-------+  +-------+  |
+------------------------------------------------------------------+
```

---

## RESUMEN DE NUEVOS COMPONENTES Y ARCHIVOS

### Hooks (9 nuevos):
- `useGaliaKnowledgeBase.ts`
- `useGaliaEUFundingMonitor.ts`
- `useGaliaSolicitudWizard.ts`
- `useGaliaLegalBridge.ts`
- `useGaliaFinancialBridge.ts`
- `useGaliaOfficialNotifications.ts`
- `useGaliaComplianceAuditor.ts`
- `useGaliaExportPrint.ts`
- `useGaliaProjectStatus.ts`

### Componentes UI (12 nuevos):
- `GaliaKnowledgeExplorer.tsx`
- `GaliaSolicitudWizard.tsx`
- `GaliaLegalValidationBadge.tsx`
- `GaliaRecursosPanel.tsx`
- `GaliaFinancialBridgePanel.tsx`
- `GaliaSatisfactionSurvey.tsx`
- `GaliaExpedientePrint.tsx`
- `GaliaComplianceAuditor.tsx`
- `GaliaProjectStatusDashboard.tsx`
- `GaliaEUFundingAlerts.tsx`
- `GaliaNotificacionesOficiales.tsx`
- `GaliaExportToolbar.tsx`

### Edge Functions (8 nuevas):
- `galia-expert-agent` (RAG con knowledge base)
- `galia-knowledge-sync` (sincronización normativa)
- `galia-eu-funding-monitor` (monitor UE)
- `galia-official-notifications` (Notific@)
- `galia-legal-bridge` (conexión módulo jurídico)
- `galia-financial-bridge` (conexión ERP)
- `galia-compliance-auditor` (verificación V4)
- `galia-document-print` (generación PDFs)

### Tablas Supabase (4 nuevas):
- `galia_knowledge_base`
- `galia_knowledge_sources`
- `galia_communications_log`
- `galia_compliance_status`

---

## CONCLUSIÓN

Este plan posiciona a GALIA como la plataforma de referencia para gestión de ayudas públicas en Europa, superando los modelos de Estonia y Dinamarca mediante:

1. **Automatización extrema**: Desde la publicación UE hasta el pago al ciudadano
2. **Transparencia total**: Cumplimiento Ley 19/2013 y Art. 22 RGPD
3. **Interoperabilidad**: BDNS, Cl@ve, Notific@, AEAT, TGSS
4. **IA Especializada**: Agente experto con base de conocimiento normativo
5. **Modularidad**: Integración con Jurídico, Contable y Tesorería
6. **Escalabilidad**: Preparado para 300+ GAL nacionales

**¿Apruebas este plan para comenzar la implementación por Fase 0 (error de memoria) y Fase 1 (Knowledge Base)?**
