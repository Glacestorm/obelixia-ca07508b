

# Plan: Generacion Masiva de Datos Demo para RRHH (500 Nominas + Ejemplos Completos)

## Estado Actual
- **0 empleados**, **0 nominas**, **0 departamentos** en la base de datos
- 4 empresas activas (2x Productora Electrica Urgelense, 1x Sociedad Urgelense Fruiticola, 1 duplicada)
- 110+ tablas HR disponibles pero completamente vacias
- Empresa principal: `2cbd8718` (Productora Electrica Urgelense, S.L.)

## Arquitectura de la Solucion

Se creara una **Edge Function `erp-hr-seed-demo-data`** que genera todos los datos de forma transaccional, con un campo `metadata->is_demo: true` en cada registro para permitir anulacion masiva posterior. Un boton en el panel de admin permitira ejecutar el seed y otro para purgar todos los datos demo.

---

## FASE 1: Infraestructura Base (Departamentos, Puestos, Convenios)
**Edge Function action: `seed_infrastructure`**

- **8 departamentos** jerarquicos: Direccion General, Administracion/Finanzas, RRHH, Comercial, Produccion, Logistica, IT, Calidad
- **25 puestos de trabajo** (`erp_hr_job_positions`): Director General, CFO, Responsable RRHH, Jefe Produccion, Tecnico IT, Comercial, Operario, etc.
- **3 convenios colectivos** (`erp_hr_collective_agreements`): Metal, Oficinas, Industria Electrica con sus conceptos salariales
- **Tipos de ausencia** (`erp_hr_leave_types`): Vacaciones, IT, Maternidad/Paternidad, Asuntos propios, Permiso retribuido
- **Politicas horarias** (`erp_hr_time_policies`): Jornada continua, partida, turnos rotativos

## FASE 2: Plantilla de Empleados (50 empleados)
**Edge Function action: `seed_employees`**

- **50 empleados** con datos realistas espanoles (DNI, NSS, cuentas bancarias IBAN)
- Distribucion por departamento, genero equilibrado, distintas antigüedades (2018-2025)
- Salarios base entre 18.000EUR y 85.000EUR segun puesto
- **50 contratos** (`erp_hr_contracts`): indefinidos, temporales, en practicas, de formacion
- **50 registros de compensacion** (`erp_hr_employee_compensation`)
- Relaciones jerarquicas (reports_to) configuradas

## FASE 3: Nominas Masivas (500 nominas)
**Edge Function action: `seed_payrolls`**

- **500 nominas** distribuidas en 10 meses (Ene 2025 - Oct 2025), 50 empleados x 10 meses
- Cada nomina con:
  - `base_salary`, `gross_salary`, `net_salary` calculados realisticamente
  - `irpf_percentage` (8%-35% segun tramo), `irpf_amount`
  - `ss_worker` (6.35%), `ss_company` (30.5%)
  - `complements` JSON: antiguedad, transporte, plus convenio, productividad
  - `other_deductions` JSON: anticipo, IRPF, embargos
  - `payroll_type`: ordinaria (mayoría), extra junio, extra diciembre
  - `status`: draft, calculated, approved, paid (variado)
  - `metadata`: `{ "is_demo": true }`
- Nominas extra de junio y diciembre para quienes aplique

## FASE 4: Registro Horario y Ausencias
**Edge Function action: `seed_time_and_absences`**

- **~2000 registros horarios** (`erp_hr_time_entries`): ultimos 2 meses, entradas/salidas realistas
- **80 solicitudes de ausencia** (`erp_hr_leave_requests`): vacaciones, IT, permisos
- **50 saldos de vacaciones** (`erp_hr_leave_balances`): dias consumidos/disponibles
- Politicas de desconexion digital (`erp_hr_disconnection_policies`)

## FASE 5: Formacion, Evaluaciones y Reclutamiento
**Edge Function action: `seed_talent`**

- **15 cursos** en catalogo de formacion (`erp_hr_training_catalog`)
- **60 inscripciones** (`erp_hr_training_enrollments`) con estados variados
- **3 ciclos de evaluacion** (`erp_hr_evaluation_cycles`)
- **50 evaluaciones** de desempeño (`erp_hr_performance_evaluations`)
- **5 ofertas de empleo** (`erp_hr_job_openings`) con **20 candidatos** (`erp_hr_candidates`)
- **10 entrevistas** (`erp_hr_interviews`)

## FASE 6: Seguridad, Beneficios y Documentos
**Edge Function action: `seed_compliance`**

- **8 incidentes de seguridad** (`erp_hr_safety_incidents`): accidentes leves, casi-accidentes
- **5 planes de beneficios** (`erp_hr_benefits_plans`): seguro medico, guarderia, formacion, ticket restaurant, plan pensiones
- **30 inscripciones a beneficios** (`erp_hr_benefits_enrollments`)
- **100 documentos de empleado** (`erp_hr_employee_documents`): contratos, nominas firmadas, certificados
- **3 plantillas de documentos** (`erp_hr_document_templates`): contrato, certificado, carta

## FASE 7: Cumplimiento Legal y Canal Etico
**Edge Function action: `seed_legal`**

- **1 plan de igualdad** (`erp_hr_equality_plans`) con auditoria salarial
- **3 denuncias anonimas** (`erp_hr_whistleblower_reports`) con investigaciones
- **5 alertas de sancion** (`erp_hr_sanction_alerts`)
- **10 comunicaciones legales** (`erp_hr_legal_communications`)
- **Checklist de cumplimiento** (`erp_hr_compliance_checklist`)

## FASE 8: Onboarding/Offboarding y Reconocimiento
**Edge Function action: `seed_experience`**

- **5 procesos de onboarding** activos (`erp_hr_employee_onboarding`) con tareas
- **2 procesos de offboarding** (`erp_hr_offboarding_history`)
- **20 reconocimientos** (`erp_hr_recognition`): empleado del mes, innovacion
- **2 programas de reconocimiento** (`erp_hr_recognition_programs`)
- **Cotizaciones SS** (`erp_hr_ss_contributions`) para los 50 empleados

## FASE 9: UI - Boton Seed/Purge en Admin
**Componente React**

- Boton "Generar datos demo" en el panel HR que invoca la Edge Function fase por fase con barra de progreso
- Boton "Anular datos demo" que ejecuta `DELETE FROM tabla WHERE metadata->>'is_demo' = 'true'` en todas las tablas
- Confirmacion con dialogo antes de anular
- Log de operaciones visibles al usuario

---

## Detalles Tecnicos

- **Edge Function**: `supabase/functions/erp-hr-seed-demo-data/index.ts` con acciones por fase
- **Marcado demo**: Todas las filas con `metadata: { is_demo: true }` para purga selectiva
- **Empresa target**: `2cbd8718-7a8b-42ce-af61-bef193da32df`
- **Volumen total**: ~3,500+ registros across 30+ tablas
- **Anulacion**: Una accion `purge_demo` en la misma Edge Function que borra en cascada respetando foreign keys (orden inverso de creacion)

