

# Localización España (Fase G2) — Plugin País para Global HR Core + Payroll Engine

## Estado Actual

**Ya existe pero como placeholders o lógica hardcoded dispersa:**
- `HRESLocalizationPanel`: solo tabs vacíos con tramos IRPF estáticos
- `HRSocialSecurityPanel` (686 líneas): SS_RATES hardcoded, lógica RED/SILTRA 100% española mezclada en core
- `HRPayrollEntryDialog` (433 líneas): SS_RATES hardcoded, conceptos `cotizaSS`/`tributaIRPF` 
- `HRSettlementsPanel` (496 líneas): finiquito con lógica ES implícita
- `erp_hr_ss_contributions`: tabla 100% española (CC, AT/EP, FOGASA, FP, desempleo)
- `ExpedientLocalizacionTab`: placeholder "Plugin ES — Fase G2"
- `HREmployeeFormDialog`: sección ES con campos disabled "Plugin ES"
- `HRPayrollEngine` (nuevo): motor global listo para recibir plugins

**Objetivo:** Crear el plugin `localization/es/` completo que implementa el ciclo laboral español de punta a punta, enchufado al Global Core sin contaminarlo.

---

## 1. Migración SQL — 4 tablas nuevas

### `hr_es_employee_labor_data`
Datos laborales específicos de España por empleado. Campos: `employee_id` (FK), `company_id`, `naf` (nº afiliación SS), `grupo_cotizacion` (1-11), `cno_code`, `convenio_colectivo_id`, `tipo_contrato_rd` (código RD), `comunidad_autonoma`, `provincia`, `regimen_ss` (general/autonomo/agrario/mar/hogar), `categoria_profesional`, `coeficiente_parcialidad`, `fecha_alta_ss`, `fecha_baja_ss`, `codigo_contrato_red`, `epígrafe_at`, `situacion_familiar_irpf` (1-3), `hijos_menores_25`, `hijos_menores_3`, `discapacidad_hijos`, `ascendientes_cargo`, `reduccion_movilidad_geografica`, `pension_compensatoria`, `anualidad_alimentos`, `prolongacion_laboral`, `contrato_inferior_anual`, `metadata` JSONB.

### `hr_es_irpf_tables`
Tramos IRPF configurables por año y CCAA. Campos: `id`, `company_id`, `tax_year` (INT), `ccaa_code` (TEXT, null=estatal), `tramo_desde` (NUMERIC), `tramo_hasta` (NUMERIC nullable), `tipo_estatal` (%), `tipo_autonomico` (%), `tipo_total` (%), `is_active`, `created_at`.

### `hr_es_ss_bases`
Bases y tipos de cotización por grupo y año. Campos: `id`, `company_id`, `year` (INT), `grupo_cotizacion` (INT 1-11), `base_minima_mensual`, `base_maxima_mensual`, `base_minima_diaria`, `base_maxima_diaria`, `tipo_cc_empresa` (%), `tipo_cc_trabajador` (%), `tipo_desempleo_empresa_gi` (%), `tipo_desempleo_trabajador_gi` (%), `tipo_desempleo_empresa_td` (%), `tipo_desempleo_trabajador_td` (%), `tipo_fogasa` (%), `tipo_fp_empresa` (%), `tipo_fp_trabajador` (%), `tipo_mei` (%), `tipo_at_empresa` (% según CNAE), `is_active`.

### `hr_es_contract_types`
Tipos de contrato según RD español. Campos: `id`, `company_id`, `code` (ej: "100", "401", "501"), `name`, `category` (indefinido/temporal/formacion/practicas), `subcategory`, `jornada_default` (completa/parcial), `duracion_maxima_meses` (nullable), `periodo_prueba_max_meses`, `indemnizacion_dias_anyo` (NUMERIC), `conversion_indefinido` (BOOL), `normativa_referencia`, `is_active`, `metadata`.

Seed data: Tramos IRPF 2026 (estatal + CCAA), bases SS 2026 por grupo (1-11), tipos de contrato RD vigentes (~20 códigos principales).

---

## 2. Componentes del Plugin España

Todo bajo `src/components/erp/hr/localization/es/`:

### 2.1 `ESLocalizationPlugin` — Panel principal (reemplaza `HRESLocalizationPanel`)
Tabs: Datos laborales | Seg. Social | IRPF | Contratos | Permisos | Convenios | Documentos

### 2.2 `ESEmployeeLaborDataForm` — Formulario datos laborales ES
Campos: NAF, grupo cotización (select 1-11), CNO, convenio, tipo contrato RD, CCAA, régimen SS, situación familiar IRPF, hijos, ascendientes. Se usa desde el `ExpedientLocalizacionTab` y desde `HREmployeeFormDialog`.

### 2.3 `ESSocialSecurityPanel` — Seg. Social refactorizada
Migra la lógica de `HRSocialSecurityPanel` (686 líneas) aquí. Tabs: Cotizaciones | Bases | Comunicaciones RED | CRA | Certificados.
- **Cotizaciones**: Calcula CC, desempleo, FOGASA, FP, MEI, AT desde `hr_es_ss_bases`
- **Bases**: Admin de bases min/max por grupo y año
- **CRA**: Código de Cuenta de Cotización, altas/bajas/variaciones
- **RED**: Preparación de ficheros AFI, FDI, FAN (no envío real todavía)

### 2.4 `ESIRPFPanel` — Gestión IRPF
- Tramos configurables por año y CCAA desde `hr_es_irpf_tables`
- Calculadora de retención: situación familiar + salario → % retención
- Modelo 111 (retenciones trimestrales) — vista preparatoria
- Modelo 190 (resumen anual) — vista preparatoria
- Regularización IRPF

### 2.5 `ESContractTypesPanel` — Tipos de contrato RD
CRUD de `hr_es_contract_types`. Filtros por categoría. Info de duración máxima, período prueba, indemnización.

### 2.6 `ESPermisosPanel` — Permisos retribuidos ET + convenio
Tabla estática configurable: matrimonio (15d), nacimiento (16 sem), fallecimiento (2-4d), mudanza (1d), deber inexcusable, exámenes, etc. Vinculado a `hr_country_policies`.

### 2.7 `ESSettlementCalculator` — Finiquito español
Calcula: vacaciones pendientes, pagas extras prorrateadas, indemnización por tipo de extinción, preaviso. Genera documento PDF con formato legal.

### 2.8 `ESCertificadoEmpresa` — Certificado de empresa
Genera documento con datos: bases de cotización últimos 180 días, tipo contrato, causa extinción, datos empresa/trabajador.

### 2.9 `ESPayrollBridge` — Puente con Payroll Engine
Inyecta conceptos españoles como `hr_payroll_record_lines`:
- Earnings: salario base, plus convenio, plus antigüedad, horas extra
- Deductions: IRPF (%), CC trabajador (4.70%), desempleo trabajador, FP trabajador, MEI
- Employer costs: CC empresa (23.60%), desempleo empresa, FOGASA, FP empresa, AT/EP
Calcula bases de cotización (BC CC, BC AT/EP, BC desempleo) y aplica topes min/max del grupo.

---

## 3. Hook: `useESLocalization`

Centraliza toda la lógica del plugin España:
- `fetchLaborData(employeeId)` / `saveLaborData(data)` — CRUD `hr_es_employee_labor_data`
- `fetchIRPFTables(year, ccaa?)` — tramos IRPF
- `calculateIRPFRetention(params)` — cálculo retención según situación familiar
- `fetchSSBases(year, grupo)` — bases y tipos por grupo
- `calculateSSContributions(baseCotizacion, grupo, tipoContrato)` — desglose SS
- `fetchContractTypes(filters?)` — catálogo contratos RD
- `calculateSettlement(params)` — finiquito con prrorrateo pagas extras + vacaciones + indemnización
- `generateCertificadoEmpresa(employeeId)` — datos para certificado
- `injectPayrollConcepts(payrollId, employeeId)` — inyectar líneas ES al motor global

---

## 4. Integración con Módulos Existentes

| Punto de integración | Cambio |
|---|---|
| `ExpedientLocalizacionTab` | Si `countryCode === 'ES'` → renderiza `ESEmployeeLaborDataForm` (reemplaza placeholder) |
| `HREmployeeFormDialog` | Si país=ES → renderiza campos del plugin (NAF, grupo, convenio, CCAA) con datos reales |
| `HRPayrollEngine` → Conceptos | `ESPayrollBridge` inyecta conceptos ES como líneas del motor global |
| `HRAdminPortal` → tipos solicitud | Los tipos `sick_leave`, `work_accident`, `birth_leave`, `termination` → triggers que crean/actualizan `hr_es_employee_labor_data` |
| `HRModule` nav | Reemplazar `es-localization` → nuevo `ESLocalizationPlugin` |
| `HRSocialSecurityPanel` | Se marca como deprecated; su lógica migra a `ESSocialSecurityPanel` |

---

## 5. Ciclo Completo del Empleado en España

| Paso | Componente Plugin ES | Datos |
|---|---|---|
| **1. Alta** | `ESEmployeeLaborDataForm` | NAF, grupo, régimen, tipo contrato, convenio, alta SS |
| **2. Contrato** | `ESContractTypesPanel` + Form | Código RD, duración, período prueba, jornada |
| **3. Incidencias** | Admin Portal → `ESPayrollBridge` | Horas extra, dietas, comisiones → líneas nómina |
| **4. Nómina** | `ESPayrollBridge` | Base cotización + topes → CC/desempleo/FOGASA/FP/MEI/IRPF |
| **5. IT/AT** | Admin Portal + `ESSocialSecurityPanel` | Parte baja, complemento IT, CRA variación |
| **6. Permisos** | `ESPermisosPanel` | Días según ET + convenio |
| **7. Seg. Social** | `ESSocialSecurityPanel` | TC1/TC2, comunicaciones RED, CRA |
| **8. CRA** | `ESSocialSecurityPanel` → CRA tab | Altas/bajas/variaciones en cuenta cotización |
| **9. IRPF** | `ESIRPFPanel` | Retención mensual, modelo 111, modelo 190 |
| **10. Baja** | Admin Portal → Form | Tipo extinción, fecha efecto, causa |
| **11. Finiquito** | `ESSettlementCalculator` | Vacaciones + pagas extras + indemnización |
| **12. Cert. empresa** | `ESCertificadoEmpresa` | Bases 180d, tipo contrato, causa extinción |

---

## 6. Plan de Implementación

| Fase | Contenido |
|---|---|
| **ES1** | Migración SQL: 4 tablas + seed data (IRPF 2026, SS bases, contratos RD) |
| **ES2** | Hook `useESLocalization` con CRUD + cálculos |
| **ES3** | `ESLocalizationPlugin` con tabs + `ESEmployeeLaborDataForm` + `ESContractTypesPanel` |
| **ES4** | `ESSocialSecurityPanel` (cotizaciones, bases, CRA) + `ESIRPFPanel` (tramos, retención, modelos) |
| **ES5** | `ESPayrollBridge` + `ESSettlementCalculator` + `ESCertificadoEmpresa` |
| **ES6** | Integración: ExpedientLocalizacionTab, HREmployeeFormDialog, HRModule nav, deprecar HRSocialSecurityPanel |

Prioridad: ES1 → ES2 → ES3 (datos + hook + UI base), luego ES4 → ES5 → ES6 (cálculos + integración).

