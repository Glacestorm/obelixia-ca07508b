
# Plan de Expansion Avanzada del Modulo RRHH

## Objetivo General
Implementar prestaciones sociales, documentacion por empleado con IA, base de datos de modelos contractuales, conexion con Academia y planes de carrera con escalado salarial.

---

## Fase 0: Correccion Error TS2589 (Inmediata)

### Descripcion
Corregir el error de tipo en HRIncidentFormDialog.tsx causado por inferencia profunda de Supabase.

### Cambio Tecnico
Refactorizar la consulta de empleados extrayendo la logica a una funcion separada con tipos explicitos para evitar la inferencia recursiva del compilador TypeScript.

---

## Fase 1: Prestaciones Sociales (Social Benefits)

### Descripcion
Nueva seccion dedicada a gestionar beneficios sociales que ofrece la empresa: guarderia, seguros medicos, tickets restaurante, gimnasio, transporte, planes de pensiones, etc.

### Tablas de Base de Datos

**erp_hr_social_benefits**
- id, company_id, benefit_code, benefit_name
- benefit_type: 'health_insurance' | 'childcare' | 'meal_vouchers' | 'transport' | 'gym' | 'pension' | 'life_insurance' | 'education' | 'remote_work_allowance' | 'other'
- provider_name, provider_contact
- monthly_cost_company, monthly_cost_employee
- is_taxable, tax_percentage
- eligibility_criteria (JSONB): antiguedad minima, categorias, departamentos
- is_active, description, terms_document_url

**erp_hr_employee_benefits**
- id, employee_id, benefit_id
- enrollment_date, end_date
- status: 'active' | 'pending' | 'cancelled' | 'suspended'
- employee_contribution, company_contribution
- beneficiaries (JSONB): familiares cubiertos
- notes

### Nuevo Componente: HRSocialBenefitsPanel.tsx
- Dashboard de beneficios disponibles con estadisticas de cobertura
- Tabla de beneficios con costo empresa/empleado
- Gestion de altas/bajas por empleado
- Calculos fiscales automaticos (retribuciones en especie)
- Integracion con Agente IA para consultas de elegibilidad

### Ideas Disruptivas Incluidas
- Beneficios flexibles ("flex benefits"): presupuesto anual para elegir
- Wellness digital: apps de meditacion, telemedicina
- Sabbaticales pagados despues de X anos
- Stock options / Phantom shares
- Coworking allowance para remotos
- Pet insurance

---

## Fase 2: Documentacion por Empleado con IA

### Descripcion
Sistema de subida de documentos en cualquier formato por empleado, con indexacion para que el Agente IA conozca y pueda consultar el contenido.

### Actualizacion de Tabla Existente

La tabla `erp_hr_employee_documents` ya existe. Anadiremos campos para IA:
- ai_indexed: boolean
- ai_summary: TEXT (resumen generado por IA)
- ai_extracted_data: JSONB (datos estructurados extraidos)
- searchable_content: TEXT (para busqueda full-text)

### Nuevo Componente: HRDocumentUploader.tsx
- Subida drag-and-drop multiformato (PDF, Word, Excel, imagenes)
- Procesamiento automatico con IA para extraer texto y datos
- Categorizacion automatica del documento
- Busqueda semantica en documentos del empleado

### Actualizacion Edge Function: erp-hr-ai-agent
- Nueva accion: `search_employee_documents`
- Nueva accion: `get_document_summary`
- Contexto enriquecido con documentos del empleado en consultas

### Storage Bucket
Uso del bucket existente `hr-employee-documents` con estructura:
```
/{company_id}/{employee_id}/{document_type}/{filename}
```

---

## Fase 3: Base de Modelos Contractuales por Jurisdiccion

### Descripcion
Biblioteca de plantillas de contratos, finiquitos, anexos y otros documentos legales segun la legislacion de cada jurisdiccion (Espana, Andorra, Portugal, Francia, UK, UAE, USA).

### Tablas de Base de Datos

**erp_hr_document_templates**
- id, company_id (null para globales), template_code
- document_type: 'contract' | 'annex' | 'severance' | 'termination' | 'warning' | 'certificate' | 'letter'
- template_name, description
- jurisdiction: 'ES' | 'AD' | 'PT' | 'FR' | 'UK' | 'AE' | 'US' | 'GLOBAL'
- language_code
- template_content: TEXT (con variables {{employee_name}}, {{start_date}}, etc.)
- variables_schema: JSONB (definicion de variables requeridas)
- applicable_contract_types: TEXT[] (indefinido, temporal, etc.)
- legal_references: TEXT (articulos de ley aplicables)
- version, is_active, last_updated_by, updated_at

**erp_hr_generated_documents**
- id, company_id, employee_id, template_id
- document_type, document_name
- generated_content: TEXT
- variables_used: JSONB
- document_url (PDF generado)
- status: 'draft' | 'pending_signature' | 'signed' | 'archived'
- generated_by, generated_at, signed_at

### Nuevo Componente: HRDocumentTemplatesPanel.tsx
- Biblioteca de plantillas por jurisdiccion
- Editor de plantillas con variables
- Generador de documentos rellenando variables
- Previsualizacion PDF
- Firma electronica (integracion futura)

### Actualizacion Edge Function: erp-hr-ai-agent
- Nueva accion: `get_applicable_template`
- Nueva accion: `fill_template`
- Conocimiento de todos los modelos para sugerencias

### Plantillas Seed por Jurisdiccion (Espana)
- Contrato indefinido ordinario
- Contrato temporal por circunstancias de la produccion
- Contrato formativo en alternancia
- Contrato en practicas
- Anexo de modificacion de condiciones
- Carta de despido objetivo (art. 52 ET)
- Carta de despido disciplinario (art. 54 ET)
- Finiquito y liquidacion
- Certificado de empresa
- Carta de amonestacion

---

## Fase 4: Conexion con Modulo Academia

### Descripcion
Preparar la integracion bidireccional entre RRHH y el futuro modulo de Academia, incluyendo coordinacion de Agentes IA y sincronizacion de formacion obligatoria por puesto/CNAE.

### Tablas de Base de Datos

**erp_hr_training_requirements**
- id, company_id, position_id, department_id
- cnae_code (formacion obligatoria por sector)
- training_type: 'mandatory' | 'recommended' | 'optional'
- training_code, training_name, description
- required_hours, validity_months
- legal_reference (ley que lo exige)
- is_active

**erp_hr_employee_training_history**
- id, employee_id, training_code
- training_name, provider
- start_date, end_date, hours_completed
- status: 'pending' | 'in_progress' | 'completed' | 'expired'
- certificate_url, certificate_expiry
- academy_course_id (FK al modulo academia)
- verified_by, notes

### Nuevo Componente: HRTrainingPanel.tsx
- Dashboard de formacion por empleado
- Matriz de cumplimiento formativo por departamento
- Alertas de certificaciones por vencer
- Conexion con Academia para inscribir empleados
- Historico de toda la formacion recibida

### Integracion de Agentes IA
- El Agente HR consulta formacion completada/pendiente
- El Agente Academia (futuro) recibe requisitos de HR
- Sincronizacion bidireccional de datos de formacion
- Recomendaciones cruzadas de cursos segun perfil

### API de Integracion
Nueva Edge Function: `erp-hr-academy-sync`
- Acciones: `get_training_requirements`, `sync_completed_training`, `enroll_employee`, `get_recommendations`
- Protocolo de comunicacion entre agentes

---

## Fase 5: Planes de Carrera y Promocion

### Descripcion
Sistema completo de gestion de planes de carrera con rutas de ascenso, criterios de promocion y escalado salarial transparente.

### Tablas de Base de Datos

**erp_hr_career_paths**
- id, company_id, path_code, path_name
- description, applicable_departments
- is_active

**erp_hr_career_path_levels**
- id, career_path_id, level_order
- level_code, level_name, level_description
- position_id (FK a posiciones)
- salary_range_min, salary_range_max
- typical_duration_months (tiempo esperado en nivel)
- required_competencies: JSONB
- required_certifications: TEXT[]
- required_experience_months

**erp_hr_career_promotions**
- id, employee_id, from_level_id, to_level_id
- promotion_date, effective_date
- new_salary, salary_increase_percentage
- promotion_reason, promoted_by
- evaluation_score, notes

**erp_hr_employee_career**
- id, employee_id, career_path_id
- current_level_id, entered_level_at
- target_level_id, expected_promotion_date
- mentor_employee_id
- development_plan: JSONB (objetivos y acciones)
- status: 'on_track' | 'accelerated' | 'needs_improvement' | 'blocked'

### Nuevo Componente: HRCareerPathsPanel.tsx
- Editor visual de rutas de carrera (arbol/grafo)
- Asignacion de empleados a rutas
- Dashboard de progreso por empleado
- Proyeccion salarial segun promociones
- Alertas de empleados listos para promocion

### Nuevo Componente: HRCareerEmployeeView.tsx
- Vista individual del empleado con su ruta
- Requisitos cumplidos vs pendientes
- Plan de desarrollo personalizado
- Historico de promociones
- Comparativa salarial en el tiempo

### Actualizacion Edge Function: erp-hr-ai-agent
- Nueva accion: `analyze_promotion_readiness`
- Nueva accion: `suggest_development_plan`
- Nueva accion: `calculate_salary_projection`
- Conocimiento de todas las rutas para asesoramiento

---

## Fase 6: Integracion Completa con Agente IA

### Descripcion
El Agente IA de HR conocera toda la nueva informacion y podra responder consultas sobre beneficios, documentos, plantillas, formacion y carrera.

### Actualizaciones del Agente
- Contexto enriquecido con: beneficios del empleado, documentos indexados, formacion historica, nivel de carrera
- Nuevas capacidades: generar documentos, recomendar formacion, evaluar promocion
- Coordinacion con Agente Academia (cuando exista)

### Funciones del Agente Ampliadas
- "¿Que beneficios tiene disponibles Maria Garcia?"
- "Genera un contrato temporal para nuevo empleado"
- "¿Que formacion le falta a Juan para promocionar?"
- "Calcula la proyeccion salarial de Ana en 3 anos"
- "¿Quien esta listo para promocion en Ventas?"

---

## Resumen de Archivos

### Nuevos Archivos (por fase)
**Fase 1:** HRSocialBenefitsPanel.tsx, HRBenefitEnrollmentDialog.tsx
**Fase 2:** HRDocumentUploader.tsx (o actualizar HREmployeeDocumentsPanel)
**Fase 3:** HRDocumentTemplatesPanel.tsx, HRDocumentGeneratorDialog.tsx
**Fase 4:** HRTrainingPanel.tsx, erp-hr-academy-sync/index.ts
**Fase 5:** HRCareerPathsPanel.tsx, HRCareerEmployeeView.tsx, HRPromotionDialog.tsx

### Archivos a Modificar
- HRModule.tsx: anadir tabs para nuevas secciones
- HREmployeeDocumentsPanel.tsx: integracion IA
- erp-hr-ai-agent/index.ts: nuevas acciones y contexto
- index.ts: exports de nuevos componentes

### Migraciones de Base de Datos
- Fase 1: erp_hr_social_benefits, erp_hr_employee_benefits
- Fase 2: campos adicionales en erp_hr_employee_documents
- Fase 3: erp_hr_document_templates, erp_hr_generated_documents
- Fase 4: erp_hr_training_requirements, erp_hr_employee_training_history
- Fase 5: erp_hr_career_paths, career_path_levels, career_promotions, employee_career

---

## Orden de Ejecucion Recomendado

1. **Fase 0** - Correccion error TS2589 (inmediato)
2. **Fase 1** - Prestaciones sociales (alto valor para empleados)
3. **Fase 2** - Documentacion con IA (fundacional para otras fases)
4. **Fase 3** - Modelos contractuales (eficiencia operativa)
5. **Fase 5** - Planes de carrera (retencion de talento)
6. **Fase 4** - Conexion Academia (requiere modulo externo)
7. **Fase 6** - Integracion IA completa (consolidacion)

---

## Notas Tecnicas

### Seguridad
- RLS en todas las tablas con user_has_erp_company_access
- Documentos confidenciales con permisos adicionales
- Control de acceso del Agente IA segun jerarquia (ya implementado)

### Almacenamiento
- Bucket existente hr-employee-documents para documentos
- Nuevo bucket hr-document-templates para plantillas
- Limite de tamano por documento: 20MB

### Rendimiento
- Indexacion full-text para busqueda en documentos
- Cache de plantillas frecuentes
- Paginacion en listados grandes
