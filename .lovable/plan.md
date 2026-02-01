
# Plan Integral: Sistema Avanzado de Gestion de Talento y Evaluacion HR

## Resumen Ejecutivo

Este plan implementa un sistema completo de gestion del ciclo de vida del empleado que abarca: reclutamiento inteligente con analisis de CVs por IA, onboarding adaptativo por CNAE, evaluacion del desempeno con bonus vinculado a resultados, planes de carrera con seguimiento, gestion de salidas optimizadas y teletrabajo. Se introduciran sub-agentes especializados para distribuir la carga del Agente IA principal.

---

## FASE 1: Infraestructura Base y Responsabilidades del Puesto
**Duracion estimada: 1 sesion**

### Objetivo
Crear la estructura de datos para definir responsabilidades detalladas por puesto de trabajo.

### Base de Datos

**Tabla: erp_hr_job_positions**
- id, company_id, position_code, position_name
- department_id, reports_to_position_id (jerarquia)
- responsibilities (JSONB array con descripcion, peso, medible)
- obligations (JSONB obligaciones laborales especificas)
- required_competencies (JSONB hard/soft skills)
- required_certifications (TEXT array)
- salary_band_min, salary_band_max
- allows_remote_work, remote_work_percentage
- evaluation_criteria (JSONB criterios especificos para evaluacion)
- cnae_specific_requirements (JSONB segun sector)
- is_active, created_at, updated_at

**Tabla: erp_hr_employee_responsibilities**
- id, employee_id, position_id
- custom_responsibilities (JSONB override por empleado)
- assigned_at, assigned_by, notes

### Componentes UI

**HRJobPositionsPanel.tsx**
- CRUD de puestos con editor de responsabilidades
- Editor visual de competencias requeridas
- Configuracion de teletrabajo por puesto
- Vista jerarquica de reporting

---

## FASE 2: Sistema de Reclutamiento Inteligente con IA
**Duracion estimada: 2 sesiones**

### Objetivo
Procesar CVs automaticamente, evaluar candidatos y gestionar comunicaciones.

### Base de Datos

**Tabla: erp_hr_job_openings**
- id, company_id, position_id, title, description
- requirements (JSONB), nice_to_have (JSONB)
- salary_range_min, salary_range_max
- employment_type, location, remote_option
- status: draft/published/paused/closed
- auto_screen_cvs, max_candidates_to_interview
- interview_mode: virtual/presencial/hybrid
- published_at, closes_at

**Tabla: erp_hr_candidates**
- id, company_id, job_opening_id
- first_name, last_name, email, phone
- cv_file_url, cv_parsed_data (JSONB - OCR/parsed)
- ai_analysis (JSONB: score, cultural_fit, strengths, gaps)
- ai_recommendation: hire/consider/reject
- status: new/screening/shortlisted/interviewing/offer/hired/rejected
- rejection_reason, rejection_email_sent_at
- source: email/portal/linkedin/referral
- created_at

**Tabla: erp_hr_interviews**
- id, candidate_id, job_opening_id
- interview_type: screening/technical/cultural/final
- mode: virtual/presencial
- scheduled_at, duration_minutes
- location_or_link
- interviewers (UUID array)
- status: scheduled/completed/cancelled/no_show
- feedback (JSONB), score, recommendation
- calendar_invite_sent

**Tabla: erp_hr_candidate_communications**
- id, candidate_id, communication_type
- subject, body, sent_at, sent_by
- template_used, auto_generated

### Edge Function: erp-hr-recruitment-agent

Sub-agente especializado con acciones:
- `parse_cv`: Extrae datos estructurados de CV (cualquier formato)
- `score_candidate`: Puntua candidato vs requisitos del puesto
- `cultural_fit_analysis`: Analiza encaje cultural
- `generate_rejection_email`: Redacta email de agradecimiento personalizado
- `generate_interview_invite`: Crea invitacion a entrevista
- `suggest_interview_questions`: Genera preguntas basadas en CV y puesto
- `rank_candidates`: Ordena candidatos por idoneidad

### Componentes UI

**HRRecruitmentPanel.tsx**
- Dashboard de ofertas activas
- Pipeline visual de candidatos (Kanban)
- Vista de CV con analisis IA superpuesto
- Acciones masivas: rechazar con email, agendar entrevista

**HRCandidateDetailDialog.tsx**
- Vista completa del candidato
- Timeline de comunicaciones
- Feedback de entrevistadores
- Boton "Convertir a Empleado" (trigger onboarding)

---

## FASE 3: Proceso de Onboarding Adaptativo por CNAE
**Duracion estimada: 1 sesion**

### Objetivo
Guiar al nuevo empleado en su incorporacion con tareas adaptadas al sector.

### Base de Datos

**Tabla: erp_hr_onboarding_templates**
- id, company_id, cnae_code, template_name
- phases (JSONB array con nombre, duracion_dias, tareas)
- is_default, is_active

**Tabla: erp_hr_employee_onboarding**
- id, employee_id, template_id
- status: not_started/in_progress/completed/paused
- started_at, target_completion_date, completed_at
- current_phase, progress_percentage
- assigned_buddy_id (mentor empleado)
- tasks_completed (JSONB tracking)

**Tabla: erp_hr_onboarding_tasks**
- id, onboarding_id, task_code, task_name
- description, phase, order_in_phase
- responsible: employee/buddy/hr/manager
- due_date, completed_at, completed_by
- requires_signature, signature_url
- documents_required (TEXT array)
- ai_generated

### Edge Function Update: erp-hr-ai-agent

Nuevas acciones:
- `generate_onboarding_plan`: Crea plan personalizado segun CNAE y puesto
- `track_onboarding_progress`: Reporta estado del onboarding
- `suggest_buddy`: Recomienda mentor basado en departamento y skills

### Componentes UI

**HROnboardingPanel.tsx**
- Vista de empleados en onboarding activo
- Progreso por fases con checklist visual
- Asignacion de buddies
- Generador de planes por CNAE

---

## FASE 4: Sistema de Evaluacion del Desempeno
**Duracion estimada: 2 sesiones**

### Objetivo
Implementar evaluaciones periodicas con criterios objetivos y subjetivos, rankings y vinculacion a bonus.

### Base de Datos

**Tabla: erp_hr_evaluation_templates**
- id, company_id, template_name, template_code
- cnae_codes (TEXT array aplicables)
- evaluation_type: annual/biannual/quarterly/monthly
- criteria (JSONB array: nombre, tipo, peso, descripcion, escala)
- requires_self_assessment
- requires_peer_review, peer_count
- requires_manager_approval
- requires_hr_approval
- based_on_best_practices (JSONB fuentes consultadas)
- jurisdiction_compliance (JSONB por pais)
- is_active

**Tabla: erp_hr_evaluation_cycles**
- id, company_id, template_id, cycle_name
- period_start, period_end
- evaluation_deadline
- status: draft/active/closed/archived
- participants_count, completed_count
- created_by

**Tabla: erp_hr_employee_evaluations**
- id, employee_id, cycle_id, evaluator_id
- evaluation_type: self/peer/manager/360
- scores (JSONB por criterio)
- total_score, weighted_score
- ranking_in_department, ranking_in_company
- strengths (TEXT array), improvement_areas (TEXT array)
- goals_achievement_percentage
- comments, private_notes
- status: draft/submitted/reviewed/approved/contested
- submitted_at, reviewed_at, approved_at
- approved_by

**Tabla: erp_hr_evaluation_goals**
- id, employee_id, evaluation_cycle_id
- goal_type: numeric/qualitative/milestone
- goal_description, target_value, achieved_value
- weight, score
- evidence_url, verified_by
- status: pending/in_progress/achieved/missed

**Tabla: erp_hr_bonus_configuration**
- id, company_id, config_name
- evaluation_cycle_id
- bonus_pool_percentage (% de beneficios)
- min_company_profit (umbral minimo beneficios)
- distribution_method: linear/exponential/tiered
- tiers (JSONB: ranking_range, bonus_multiplier)
- frequency: monthly/quarterly/biannual/annual
- is_active

**Tabla: erp_hr_employee_bonuses**
- id, employee_id, bonus_config_id, evaluation_id
- base_amount, multiplier, final_amount
- payment_status: pending/approved/paid
- payment_date, approved_by

### Edge Function: erp-hr-performance-agent

Sub-agente especializado con acciones:
- `discover_best_practices`: Busca modelos de evaluacion innovadores por CNAE
- `generate_evaluation_criteria`: Crea criterios segun puesto y sector
- `calculate_ranking`: Genera ranking por departamento/empresa
- `calculate_bonus`: Calcula bonus segun configuracion
- `analyze_performance_trends`: Analiza evolucion del empleado
- `suggest_development_areas`: Recomienda areas de mejora

### Componentes UI

**HRPerformancePanel.tsx**
- Dashboard de ciclos de evaluacion
- Vista de templates por sector
- Rankings visuales (anonimizables)
- Comparativas departamentales

**HREvaluationDialog.tsx**
- Formulario de evaluacion dinamico
- Criterios numericos con sliders
- Criterios cualitativos con texto enriquecido
- Vista previa de puntuacion

**HRBonusConfigPanel.tsx**
- Configurador de pools de bonus
- Vinculacion a beneficios empresa
- Simulador de distribucion
- Historico de pagos

---

## FASE 5: Gestion Optimizada de Salidas (Offboarding)
**Duracion estimada: 1 sesion**

### Objetivo
Proporcionar analisis IA para optimizar desvinculaciones y coordinar con modulo juridico.

### Base de Datos

**Tabla: erp_hr_termination_analysis**
- id, employee_id, requested_by, requested_at
- termination_type: voluntary/objective/disciplinary/collective/mutual
- ai_analysis (JSONB completo)
- optimal_dates (JSONB array con fecha, motivo, coste)
- legal_risks (JSONB)
- recommended_approach
- estimated_cost_min, estimated_cost_max
- coordination_legal_module_id (FK futuro)
- status: draft/under_review/approved/executed

**Tabla: erp_hr_offboarding_tasks**
- id, termination_id, task_name
- responsible, due_date, completed_at
- task_type: documentation/access_revocation/knowledge_transfer/exit_interview

### Edge Function Update: erp-hr-ai-agent

Nuevas acciones:
- `analyze_termination`: Estudio completo de situacion del empleado
- `suggest_optimal_dates`: Propone mejores fechas de finiquito
- `calculate_termination_costs`: Calcula todos los costes
- `generate_termination_documents`: Genera carta despido, finiquito
- `coordinate_with_legal`: Prepara informe para modulo juridico

### Componentes UI

**HRTerminationWizard.tsx**
- Wizard paso a paso para desvinculaciones
- Analisis IA con recomendaciones
- Calendario de fechas optimas
- Checklist de offboarding
- Integracion con documentos legales

---

## FASE 6: Teletrabajo y Trabajo Remoto
**Duracion estimada: 1 sesion**

### Objetivo
Gestionar empleados con modalidad de teletrabajo y reflejar en todas las funcionalidades afectadas.

### Base de Datos

**Tabla: erp_hr_remote_work_policies**
- id, company_id, policy_name
- max_remote_days_week, requires_approval
- equipment_provided (JSONB)
- expense_allowance, expense_frequency
- eligible_positions (UUID array)
- eligible_departments (UUID array)
- is_active

**Tabla: erp_hr_employee_remote_work**
- id, employee_id, policy_id
- status: pending/approved/active/suspended/ended
- remote_percentage, remote_days_week
- home_office_certified
- equipment_assigned (JSONB)
- agreement_signed_at, agreement_url
- start_date, end_date
- approved_by, approved_at

### Integraciones Afectadas

- **Vacaciones**: Considerar dias remotos en planificacion
- **Evaluacion**: Criterios especificos para remotos
- **Onboarding**: Tareas de setup remoto
- **PRL**: Evaluacion puesto trabajo en casa
- **Costes**: Asignaciones de teletrabajo

### Componentes UI

**HRRemoteWorkPanel.tsx**
- Dashboard de empleados remotos
- Gestion de politicas
- Aprobacion de solicitudes
- Tracking de equipamiento

---

## FASE 7: Sub-Agentes Especializados HR
**Duracion estimada: 1 sesion**

### Objetivo
Distribuir la carga del Agente IA principal en sub-agentes especializados.

### Arquitectura de Sub-Agentes

```text
+---------------------------+
|   HR SUPERVISOR AGENT     |
|  (Orquestador Principal)  |
+------------+--------------+
             |
   +---------+---------+
   |         |         |
   v         v         v
+------+ +-------+ +-------+
|PAYROLL| |RECRUIT| |PERFORM|
|AGENT  | |AGENT  | |AGENT  |
+------+ +-------+ +-------+
   |         |         |
   v         v         v
+------+ +-------+ +-------+
|LEGAL | |ONBOARD| |OFFBOARD|
|COORD | |AGENT  | |AGENT   |
+------+ +-------+ +-------+
```

### Edge Function: erp-hr-agent-orchestrator

Nuevo orquestador que:
- Recibe todas las consultas HR
- Clasifica y rutea a sub-agente apropiado
- Combina respuestas si es necesario
- Mantiene contexto compartido
- Coordina con agente juridico (futuro)

### Base de Datos

**Tabla: erp_hr_agent_sessions**
- id, company_id, user_id
- primary_agent, delegated_agents (TEXT array)
- context (JSONB acumulativo)
- messages (JSONB historial)
- started_at, last_activity_at

---

## FASE 8: Metricas Avanzadas de RRHH
**Duracion estimada: 1 sesion**

### Objetivo
Implementar KPIs avanzados segun mejores practicas internacionales.

### Nuevas Metricas

**Reclutamiento**
- Time to Hire, Cost per Hire
- Quality of Hire (rendimiento primeros 12 meses)
- Offer Acceptance Rate
- Source Effectiveness

**Retencion**
- Voluntary Turnover Rate
- Regrettable Turnover
- Retention Rate by Tenure
- Flight Risk Score (predictivo)

**Desempeno**
- 9-Box Grid Distribution
- High Performer Ratio
- Promotion Rate
- Internal Mobility Rate

**Engagement**
- eNPS (Employee Net Promoter Score)
- Absenteeism Rate
- Training ROI
- Manager Effectiveness Score

**Compensacion**
- Compa-Ratio
- Pay Equity Index
- Benefits Utilization
- Total Rewards Competitiveness

### Componentes UI

**HRAdvancedMetricsPanel.tsx**
- Dashboard con todas las metricas
- Benchmarks por sector (CNAE)
- Tendencias temporales
- Alertas automaticas

---

## Resumen de Entregables por Fase

| Fase | Tablas | Edge Functions | Componentes | Sesiones |
|------|--------|----------------|-------------|----------|
| 1 | 2 | - | 1 | 1 |
| 2 | 4 | 1 nueva | 2 | 2 |
| 3 | 3 | update | 1 | 1 |
| 4 | 6 | 1 nueva | 3 | 2 |
| 5 | 2 | update | 1 | 1 |
| 6 | 2 | - | 1 | 1 |
| 7 | 1 | 1 nueva | update | 1 |
| 8 | - | - | 1 | 1 |
| **TOTAL** | **20** | **3 nuevas** | **11** | **10** |

---

## Consideraciones Tecnicas

### Seguridad y RBAC
- Todas las tablas con RLS por company_id
- Acceso a evaluaciones restringido por jerarquia
- Datos de bonus solo visibles para HR y direccion
- Logs de auditoria en todas las operaciones sensibles

### Integracion con Modulo Juridico
- Interface preparada para coordinar con futuro modulo legal
- Tabla de coordinacion con campos FK reservados
- Acciones del agente que generan informes para revision legal

### Internacionalizacion
- Criterios de evaluacion por jurisdiccion
- Normativa de teletrabajo por pais
- Calculo de bonus segun legislacion local

