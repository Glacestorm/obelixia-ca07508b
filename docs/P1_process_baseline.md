# P1.0 — ERP RRHH Process Assurance Baseline

**Fecha**: 2026-04-10
**Versión**: 1.0
**Alcance**: ERP RRHH Unificado — Ciclo laboral español extremo a extremo
**Modo**: READ-ONLY audit — sin cambios en código, RLS ni módulos

---

## Metodología

Exploración exhaustiva del ERP RRHH unificado:

| Capa | Ubicación | Cantidad aprox. |
|------|-----------|-----------------|
| Engines | `src/engines/erp/hr/` | ~46 ficheros |
| Hooks | `src/hooks/erp/hr/` | ~68 ficheros |
| Componentes UI | `src/components/erp/hr/` | ~80 ficheros |
| Edge Functions | `supabase/functions/erp-hr-*`, `payroll-*` | ~40 funciones |
| Tablas DB | `erp_hr_*`, `hr_payroll_*` | ~20 tablas |

---

## Proceso 1 — Alta de Empleado + Datos Base

### Estado: `implemented`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `HREmployeeFormDialog` | `src/components/erp/hr/employees/HREmployeeFormDialog.tsx` | Formulario completo (1443 líneas, 5 tabs: personal, laboral, fiscal, bancario, documentación) |
| `HREmployeesPanel` | `src/components/erp/hr/employees/HREmployeesPanel.tsx` | Listado CRUD con filtros y búsqueda |
| `RegistrationProcessPanel` | `src/components/erp/hr/registration/RegistrationProcessPanel.tsx` | Panel de proceso de alta con máquina de estados |
| `RegistrationReadinessCard` | `src/components/erp/hr/registration/RegistrationReadinessCard.tsx` | Card de readiness pre-alta |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useHRRegistrationProcess` | `src/hooks/erp/hr/useHRRegistrationProcess.ts` | Máquina de estados 5 fases (694 líneas): datos → documentos → contrato → TGSS → cierre |
| `useHREmployees` | `src/hooks/erp/hr/useHREmployees.ts` | CRUD empleados con filtrado |
| `useRegistrationClosure` | `src/hooks/erp/hr/useRegistrationClosure.ts` | Evaluación de cierre del proceso de alta |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `registrationDeadlineEngine` | `src/engines/erp/hr/registrationDeadlineEngine.ts` | Plazos legales del proceso de alta (TGSS 3 días, Contrat@ 10 días) |
| `documentCatalogES` | `src/engines/erp/hr/documentCatalogES.ts` | Catálogo de documentos obligatorios por tipo de empleado |
| `employeeLegalProfileEngine` | `src/engines/erp/hr/employeeLegalProfileEngine.ts` | Perfil legal del empleado (discapacidad, familia numerosa, etc.) |

### Edge Functions

| Función | Descripción |
|---------|-------------|
| `erp-hr-seed-demo-data` | Seeding de datos demo para desarrollo |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_employees` | id, company_id, first_name, last_name, dni_nie, naf, email, department, position, cotization_group, base_salary, irpf_rate, contract_type, status |

### Evidencias / Documentos generados

- Checklist de completitud documental (verde/ámbar/rojo)
- Perfil legal del empleado
- Evaluación de readiness pre-alta

### Cobertura: **~90%**

### Gaps identificados

- No hay validación de DNI/NIE contra formato oficial (algoritmo de letra)
- No hay generación automática de número de expediente interno

---

## Proceso 2 — AFI / Alta TGSS / TA2

### Estado: `preparatory`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `ContractDataPanel` | `src/components/erp/hr/contracts/ContractDataPanel.tsx` | Panel de datos contractuales con readiness TGSS |
| `ContrataPreIntegrationBadge` | `src/components/erp/hr/shared/ContrataPreIntegrationBadge.tsx` | Badge de estado pre-integración |
| `P4ArtifactsPanel` | `src/components/erp/hr/official/P4ArtifactsPanel.tsx` | Panel de artefactos oficiales (incluye AFI) |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useTGSSReadiness` | `src/hooks/erp/hr/useTGSSReadiness.ts` | Evaluación de readiness para comunicación TGSS |
| `useOfficialArtifacts` | `src/hooks/erp/hr/useOfficialArtifacts.ts` | CRUD de artefactos oficiales con cadena de estados |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `afiArtifactEngine` | `src/engines/erp/hr/afiArtifactEngine.ts` | Generación de payload AFI (494 líneas) — alta, baja, variación |
| `officialArtifactValidationEngine` | `src/engines/erp/hr/officialArtifactValidationEngine.ts` | Validación cruzada de artefactos oficiales |

### Edge Functions

| Función | Descripción |
|---------|-------------|
| `payroll-file-generator` | Generación de ficheros para SILTRA (AFI incluido) |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_official_artifacts` | id, company_id, employee_id, artifact_type, circuit, status, payload, file_name, generated_at |

### Evidencias / Documentos generados

- Payload AFI en formato JSON (estructura SILTRA)
- Evidence pack de dry-run
- Cadena de estados: `generated → validated → dry_run_ready`

### Cobertura: **~85%**

### Gaps identificados

- `isRealSubmissionBlocked === true` — no hay envío real a SILTRA
- No hay generación de fichero binario AFI en formato SILTRA nativo
- No hay gate de firma digital electrónica
- No hay conector real con SILTRA/RED

---

## Proceso 3 — CONTRAT@

### Estado: `preparatory`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `ContractDataPanel` | `src/components/erp/hr/contracts/ContractDataPanel.tsx` | Datos contractuales y readiness Contrat@ |
| `ContrataPreIntegrationBadge` | `src/components/erp/hr/shared/ContrataPreIntegrationBadge.tsx` | Estado de pre-integración con SEPE |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useContrataReadiness` | `src/hooks/erp/hr/useContrataReadiness.ts` | Evaluación de readiness (81 líneas) |
| `useHRContractProcess` | `src/hooks/erp/hr/useHRContractProcess.ts` | Gestión del proceso contractual |
| `useContractClosure` | `src/hooks/erp/hr/useContractClosure.ts` | Cierre operacional del contrato |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `contractDeadlineEngine` | `src/engines/erp/hr/contractDeadlineEngine.ts` | Plazos legales de comunicación (10 días hábiles) |
| `contractTypeEngine` | `src/engines/erp/hr/contractTypeEngine.ts` | Catálogo de tipos de contrato español |
| `contractExpiryAlertEngine` | `src/engines/erp/hr/contractExpiryAlertEngine.ts` | Alertas de vencimiento de contratos temporales |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_contracts` | id, employee_id, contract_type, start_date, end_date, salary, contrata_code, status |

### Evidencias / Documentos generados

- Evaluación de readiness Contrat@
- Payload de datos contractuales

### Cobertura: **~80%**

### Gaps identificados

- No hay generación de XML en formato Contrat@ oficial
- No hay comunicación real con el portal SEPE
- No hay tratamiento de prórrogas como comunicación independiente
- Falta builder de documento de contrato con cláusulas legales automáticas

---

## Proceso 4 — Recogida de Incidencias

### Estado: `implemented`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `HRPayrollIncidentsPanel` | `src/components/erp/hr/payroll/HRPayrollIncidentsPanel.tsx` | Panel de incidencias con filtros período/empleado |
| `HRIncidentFormDialog` | `src/components/erp/hr/payroll/HRIncidentFormDialog.tsx` | Formulario de alta de incidencia |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `usePayrollIncidents` | `src/hooks/erp/hr/usePayrollIncidents.ts` | CRUD con guards de período (326 líneas) |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `payrollIncidentEngine` | `src/engines/erp/hr/payrollIncidentEngine.ts` | Tipos: IT, AT, HE, permisos, vacaciones, maternidad, paternidad, ERE |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_payroll_incidents` | id, employee_id, period_id, incident_type, start_date, end_date, amount, status |

### Evidencias / Documentos generados

- Registro de incidencia con trazabilidad a solicitudes de ausencia
- Filtrado por período abierto

### Cobertura: **~90%**

### Gaps identificados

- No hay workflow de aprobación multinivel para incidencias
- No hay importación masiva de incidencias desde fichero externo

---

## Proceso 5 — Cálculo de Nómina

### Estado: `implemented`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `HRPayrollEngine` | `src/components/erp/hr/payroll/HRPayrollEngine.tsx` | Barrel de exportación del motor |
| `HRPayrollRunsPanel` | `src/components/erp/hr/payroll/HRPayrollRunsPanel.tsx` | Listado y ejecución de payroll runs |
| `HRPayrollSimulator` | `src/components/erp/hr/payroll/HRPayrollSimulator.tsx` | Simulador de nómina what-if |
| `PayrollRunDiffCard` | `src/components/erp/hr/payroll/PayrollRunDiffCard.tsx` | Comparación entre runs (correction) |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `usePayrollEngine` | `src/hooks/erp/hr/usePayrollEngine.ts` | Motor principal (876 líneas) |
| `usePayrollRuns` | `src/hooks/erp/hr/usePayrollRuns.ts` | Gestión de ejecuciones |
| `usePayrollLegalCalculation` | `src/hooks/erp/hr/usePayrollLegalCalculation.ts` | Cálculos legales SS + IRPF |
| `useESPayrollBridge` | `src/hooks/erp/hr/useESPayrollBridge.ts` | Bridge de localización ES |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `payrollRunEngine` | `src/engines/erp/hr/payrollRunEngine.ts` | Orquestación del cálculo |
| `payrollConceptCatalog` | `src/engines/erp/hr/payrollConceptCatalog.ts` | Catálogo de conceptos retributivos |
| `ssContributionEngine` | `src/engines/erp/hr/ssContributionEngine.ts` | Motor de cotizaciones SS 2026 (bases, tipos, topes) |
| `irpfEngine` | `src/engines/erp/hr/irpfEngine.ts` | Motor de retenciones IRPF progresivo |
| `payslipEngine` | `src/engines/erp/hr/payslipEngine.ts` | Generación de recibo de salario |

### Edge Functions

| Función | Descripción |
|---------|-------------|
| `payroll-calculation-engine` | Cálculo de nómina server-side |
| `payroll-irpf-engine` | Cálculo IRPF server-side |
| `payroll-supervisor` | Supervisión y validación de runs |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_payroll_runs` | id, company_id, period_id, run_type, status, snapshot_hash |
| `erp_hr_payroll_periods` | id, company_id, year, month, status |
| `hr_payroll_records` | id, employee_id, run_id, gross, net, ss_employee, ss_company, irpf |

### Evidencias / Documentos generados

- Payslip con formato OM 27/12/1994
- Snapshot hash inmutable por run
- Diff entre run inicial y correction

### Cobertura: **~92%**

### Gaps identificados

- No hay validación contra nómina real de referencia (benchmark)
- No hay exportación a formato A3/SAGE para interoperabilidad
- No hay tratamiento de pagas extra prorrateadas vs concentradas como configuración

---

## Proceso 6 — PNR / Suspensión / IT / AT / Paternidad

### Estado: `preparatory`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `ESNacimientoINSSPanel` | `src/components/erp/hr/localization/es/ESNacimientoINSSPanel.tsx` | Flujo de nacimiento/adopción con comunicación INSS |
| `HRSafetyPanel` | `src/components/erp/hr/safety/HRSafetyPanel.tsx` | Panel de seguridad y accidentes laborales |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `usePayrollIncidents` | `src/hooks/erp/hr/usePayrollIncidents.ts` | Tipos IT, AT, MAT, PAT, ERE |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `afiInactivityEngine` | `src/engines/erp/hr/afiInactivityEngine.ts` | AFI Inactividad: PNR, suspensión, excedencia, huelga |
| `fdiArtifactEngine` | `src/engines/erp/hr/fdiArtifactEngine.ts` | Partes FDI para IT/AT → INSS vía SILTRA |
| `deltaArtifactEngine` | `src/engines/erp/hr/deltaArtifactEngine.ts` | Partes de accidente Delt@ → MITES |

### Edge Functions

| Función | Descripción |
|---------|-------------|
| `payroll-it-engine` | Motor de IT server-side |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_safety_incidents` | id, employee_id, incident_type, severity, date, status |
| `erp_hr_payroll_incidents` | (reutilizada para tipos IT/AT/MAT/PAT) |

### Evidencias / Documentos generados

- Artefacto FDI (baja, confirmación, alta IT)
- Artefacto Delt@ (parte accidente XML)
- Par AFI Inactividad (informar + eliminar)

### Cobertura: **~75%**

### Gaps identificados

- FDI y Delt@ solo generan payload JSON, no fichero binario SILTRA/Delt@ nativo
- No hay workflow end-to-end de IT (baja → confirmaciones periódicas → alta)
- No hay tracking de duración estimada vs real de IT
- No hay comunicación real con INSS ni MITES
- Falta cálculo de prestación por IT (base reguladora × porcentaje según días)

---

## Proceso 7 — Cierre Mensual y Pago

### Estado: `implemented` (parcial en pago)

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `MonthlyClosingSummaryCard` | `src/components/erp/hr/closing/MonthlyClosingSummaryCard.tsx` | Resumen de cierre mensual |
| `ClosingIntelligenceCard` | `src/components/erp/hr/closing/ClosingIntelligenceCard.tsx` | Inteligencia de cierre (alertas, anomalías) |
| `SSMonthlyExpedientTab` | `src/components/erp/hr/closing/SSMonthlyExpedientTab.tsx` | Expediente mensual SS |
| `FiscalExpedientPeriodBadge` | `src/components/erp/hr/closing/FiscalExpedientPeriodBadge.tsx` | Badge de estado fiscal del período |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useMonthlyClosing` | `src/hooks/erp/hr/useMonthlyClosing.ts` | Orquestación de cierre (451 líneas) |
| `useSSMonthlyExpedient` | `src/hooks/erp/hr/useSSMonthlyExpedient.ts` | Expediente SS mensual |
| `useFiscalMonthlyExpedient` | `src/hooks/erp/hr/useFiscalMonthlyExpedient.ts` | Expediente fiscal mensual |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `monthlyClosingOrchestrationEngine` | `src/engines/erp/hr/monthlyClosingOrchestrationEngine.ts` | Orquestación 9 fases |
| `closingIntelligenceEngine` | `src/engines/erp/hr/closingIntelligenceEngine.ts` | Detección de anomalías y alertas pre-cierre |
| `monthlyExecutiveReportEngine` | `src/engines/erp/hr/monthlyExecutiveReportEngine.ts` | Generación de informe ejecutivo mensual |

### Tablas DB

- Cierre persiste `closure_package` snapshot inmutable vía ledger
- Utiliza `erp_hr_payroll_periods` (campo status → closed)

### Evidencias / Documentos generados

- Snapshot inmutable del cierre (closure_package)
- Informe ejecutivo mensual
- Checklist de 9 fases completadas

### Cobertura: **~88%**

### Gaps identificados

- **No hay generación de fichero SEPA CT (ISO 20022)** para pago bancario de nóminas
- No hay reconciliación bancaria post-pago
- No hay generación de remesa de transferencias

---

## Proceso 8 — Informes de Nómina

### Estado: `implemented`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `HRPayrollRecordsList` | `src/components/erp/hr/payroll/HRPayrollRecordsList.tsx` | Listado de registros de nómina |
| Reports varios | `src/components/erp/hr/reports/` | Informes específicos |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `usePayrollEngine` | `src/hooks/erp/hr/usePayrollEngine.ts` | fetchRecords |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `payslipEngine` | `src/engines/erp/hr/payslipEngine.ts` | buildPayslip, validateLegalPreClose |

### Edge Functions

| Función | Descripción |
|---------|-------------|
| `hr-reporting-engine` | Motor de informes server-side |
| `payroll-file-generator` | Generación de ficheros de nómina |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `hr_payroll_records` | Registros individuales de nómina |

### Evidencias / Documentos generados

- Payslip con formato OM 27/12/1994
- Exportación de listados

### Cobertura: **~85%**

### Gaps identificados

- No hay PDF del payslip con formato visual oficial completo (cabecera empresa, datos trabajador, desglose)
- No hay informe agregado TC2 (resumen de cotizaciones por empresa)
- No hay exportación masiva de nóminas en batch

---

## Proceso 9 — SILTRA Cotización / RLC / RNT

### Estado: `preparatory`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `P4ArtifactsPanel` | `src/components/erp/hr/official/P4ArtifactsPanel.tsx` | Panel de artefactos oficiales P4 |
| `SSMonthlyExpedientTab` | `src/components/erp/hr/closing/SSMonthlyExpedientTab.tsx` | Expediente SS mensual integrado en cierre |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useP4OfficialArtifacts` | `src/hooks/erp/hr/useP4OfficialArtifacts.ts` | Gestión de artefactos P4 |
| `useMonthlyOfficialPackage` | `src/hooks/erp/hr/useMonthlyOfficialPackage.ts` | Paquete oficial mensual |
| `useOfficialReadinessMatrix` | `src/hooks/erp/hr/useOfficialReadinessMatrix.ts` | Matriz de readiness por artefacto |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `rlcRntCraArtifactEngine` | `src/engines/erp/hr/rlcRntCraArtifactEngine.ts` | Generación de RLC, RNT, CRA (677 líneas) |
| `fanCotizacionArtifactEngine` | `src/engines/erp/hr/fanCotizacionArtifactEngine.ts` | Fichero FAN de cotización |
| `officialCrossValidationEngine` | `src/engines/erp/hr/officialCrossValidationEngine.ts` | Validación cruzada entre artefactos |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_official_artifacts` | Status chain: generated → validated → dry_run_ready |

### Evidencias / Documentos generados

- RLC (Relación de Liquidación de Cotizaciones)
- RNT (Relación Nominal de Trabajadores)
- CRA (Conceptos Retributivos Abonados)
- FAN de cotización
- Evidence pack de cross-validation

### Cobertura: **~82%**

### Gaps identificados

- `isRealSubmissionBlocked === true` — sin envío real a SILTRA
- No hay generación de fichero binario en formato SILTRA nativo (FAN, RLC)
- No hay recepción de respuesta SILTRA (acuses, errores)
- No hay conector real con Sistema RED

---

## Proceso 10 — CRA

### Estado: `preparatory`

Cubierto dentro del Proceso 9. La función `buildCRA()` está exportada desde `rlcRntCraArtifactEngine.ts`.

### Cobertura: **~82%**

### Gaps

- Mismos que Proceso 9
- No hay mapeo completo del catálogo CRA oficial de la TGSS

---

## Proceso 11 — IRPF 111 / 190 / 145

### Estado: `preparatory`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `IRPFMotorPanel` | `src/components/erp/hr/irpf/IRPFMotorPanel.tsx` | Panel motor IRPF (absorbido en S8.5) |
| `P4ArtifactsPanel` | `src/components/erp/hr/official/P4ArtifactsPanel.tsx` | Artefactos oficiales 111/190 |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useModelo190Pipeline` | `src/hooks/erp/hr/useModelo190Pipeline.ts` | Pipeline de generación del 190 anual |
| `useP4OfficialArtifacts` | `src/hooks/erp/hr/useP4OfficialArtifacts.ts` | CRUD artefactos oficiales |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `aeatArtifactEngine` | `src/engines/erp/hr/aeatArtifactEngine.ts` | buildModelo111, buildModelo190 |
| `modelo190PipelineEngine` | `src/engines/erp/hr/modelo190PipelineEngine.ts` | Pipeline completo 190 anual |
| `irpfEngine` | `src/engines/erp/hr/irpfEngine.ts` | Motor de cálculo IRPF |

### Edge Functions

| Función | Descripción |
|---------|-------------|
| `payroll-irpf-engine` | Cálculo IRPF server-side |

### Tablas DB

| Tabla | Campos clave |
|-------|-------------|
| `erp_hr_official_artifacts` | artifact_type: modelo_111, modelo_190 |
| `erp_hr_modelo190_perceptors` | Datos de perceptores para el 190 |

### Evidencias / Documentos generados

- Payload Modelo 111 trimestral (JSON)
- Payload Modelo 190 anual con pipeline de perceptores
- Formulario 145 en ficha de empleado

### Cobertura: **~85%**

### Gaps identificados

- No hay generación de fichero en formato BOE/AEAT oficial (texto posicional)
- No hay exportación para presentación telemática en Sede Electrónica AEAT
- No hay cálculo de regularización anual de IRPF (diciembre)
- Modelo 145 no genera PDF firmable para el empleado

---

## Proceso 12 — Baja / Despido / Finiquito / Certificado de Empresa

### Estado: `partial`

### UI / Pantallas

| Componente | Path | Descripción |
|------------|------|-------------|
| `HRSettlementsPanel` | `src/components/erp/hr/settlements/HRSettlementsPanel.tsx` | Panel de finiquitos (496 líneas) |
| `HRSeveranceCalculatorDialog` | `src/components/erp/hr/settlements/HRSeveranceCalculatorDialog.tsx` | Calculadora de indemnización (472 líneas) |
| `HRIndemnizationCalculatorDialog` | `src/components/erp/hr/settlements/HRIndemnizationCalculatorDialog.tsx` | Calculadora alternativa |
| `HROffboardingPanel` | `src/components/erp/hr/offboarding/HROffboardingPanel.tsx` | Panel de offboarding |

### Hooks

| Hook | Path | Función |
|------|------|---------|
| `useContractClosure` | `src/hooks/erp/hr/useContractClosure.ts` | Cierre operacional del contrato |
| `useOfficialArtifacts` | `src/hooks/erp/hr/useOfficialArtifacts.ts` | Para AFI de baja |

### Engines / Motores

| Engine | Path | Función |
|--------|------|---------|
| `certificaArtifactEngine` | `src/engines/erp/hr/certificaArtifactEngine.ts` | Certific@2 para SEPE |
| `afiArtifactEngine` | `src/engines/erp/hr/afiArtifactEngine.ts` | AFI de baja (reutilizado del Proceso 2) |

### Tablas DB

- Settlements persistence vía `erp_hr_official_artifacts`
- Offboarding workflow data

### Evidencias / Documentos generados

- Cálculo de indemnización (días/año según tipo despido)
- Cálculo de finiquito (vacaciones, pagas extra, preaviso)
- Payload Certific@2 para SEPE
- AFI de baja

### Cobertura: **~72%**

### Gaps identificados

- **No hay pipeline end-to-end unificado** (baja → finiquito → AFI baja → Certific@2 → cierre expediente)
- No hay generación del documento de comunicación de despido con requisitos legales
- No hay carta de saldo y finiquito con desglose legal completo
- No hay tracking de plazos legales de baja (10 días Certific@2, 3 días AFI baja)
- No hay integración con el proceso de cierre mensual cuando la baja ocurre mid-month
- Certific@2 solo genera payload JSON, no XML oficial SEPE

---

## Resumen de Cobertura Global

| # | Proceso | Estado | Cobertura |
|---|---------|--------|-----------|
| 1 | Alta empleado | `implemented` | 90% |
| 2 | AFI / TGSS / TA2 | `preparatory` | 85% |
| 3 | CONTRAT@ | `preparatory` | 80% |
| 4 | Incidencias | `implemented` | 90% |
| 5 | Cálculo nómina | `implemented` | 92% |
| 6 | PNR/IT/AT/Paternidad | `preparatory` | 75% |
| 7 | Cierre y pago | `implemented` (parcial pago) | 88% |
| 8 | Informes nómina | `implemented` | 85% |
| 9 | SILTRA RLC/RNT | `preparatory` | 82% |
| 10 | CRA | `preparatory` | 82% |
| 11 | IRPF 111/190/145 | `preparatory` | 85% |
| 12 | Baja/Finiquito/Certifica | `partial` | 72% |

**Media ponderada de cobertura: ~83.8%**

---

## Notas de Seguridad

- Todos los datos están particionados por `company_id`
- Las acciones sensibles se registran en audit log inmutable
- Las integraciones oficiales mantienen `isRealSubmissionBlocked() === true`
- En modo PROD, seeds y purge están deshabilitados
- RLS activo en todas las tablas del módulo HR
