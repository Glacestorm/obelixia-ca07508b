

# Motor de Nómina España — Diseño Funcional Completo

## Estado Actual

**Existe:**
- `useESLocalization`: IRPF calculation, SS contributions, settlement calculator (funcional)
- `usePayrollEngine`: Global motor with periods, records, lines, concepts, simulations, audit (funcional)
- `ESLocalizationPlugin` con tabs: Datos, SS, IRPF, Contratos, Permisos, Finiquito
- `hr_es_irpf_tables`, `hr_es_ss_bases`, `hr_es_contract_types`, `hr_es_employee_labor_data` (DB)
- Global: `hr_payroll_periods`, `hr_payroll_records`, `hr_payroll_record_lines`, `hr_payroll_concept_templates`, `hr_payroll_simulations`, `hr_payroll_audit_log`

**Falta:**
- `ESPayrollBridge` — planned but never created
- No hay catálogo de conceptos ES pre-cargado
- No hay lógica para calcular una nómina ES completa (inyectar líneas desde datos del empleado)
- No hay simulador ES específico (el global es genérico)
- No hay vista de revisión pre-cierre con detalle ES
- No hay reporting ES (TC1, resumen cotizaciones, coste empresa)

---

## Implementación

### 1. Seed: Catálogo de Conceptos Salariales ES

Insertar ~40 `hr_payroll_concept_templates` con `country_code = 'ES'` cubriendo todos los conceptos solicitados:

**Devengos (earnings):**
- `ES_SAL_BASE` Salario base (fixed, taxable, contributable)
- `ES_COMP_CONVENIO` Plus convenio (fixed)
- `ES_COMP_ANTIGUEDAD` Complemento antigüedad (fixed)
- `ES_COMP_PUESTO` Complemento puesto (fixed)
- `ES_COMP_NOCTURNIDAD` Plus nocturnidad (variable)
- `ES_COMP_TURNICIDAD` Plus turnicidad (variable)
- `ES_COMP_TOXICIDAD` Plus peligrosidad/toxicidad (variable)
- `ES_HORAS_EXTRA` Horas extraordinarias normales (overtime, taxable, contributable)
- `ES_HORAS_EXTRA_FEST` Horas extraordinarias festivas (overtime)
- `ES_HORAS_EXTRA_NOCT` Horas extraordinarias nocturnas (overtime)
- `ES_BONUS` Bonus / Gratificación (bonus)
- `ES_COMISION` Comisiones (commission)
- `ES_DIETAS` Dietas y gastos viaje (allowance, not taxable up to limit)
- `ES_PLUS_TRANSPORTE` Plus transporte (allowance)
- `ES_PAGA_EXTRA` Paga extraordinaria (fixed, taxable, contributable)
- `ES_VACACIONES` Vacaciones retribuidas (fixed)
- `ES_RETRIB_FLEX_SEGURO` Seguro médico empresa (flexible_remuneration, exempt up to 500€)
- `ES_RETRIB_FLEX_GUARDERIA` Cheque guardería (flexible_remuneration, exempt)
- `ES_RETRIB_FLEX_FORMACION` Formación (flexible_remuneration, exempt)
- `ES_RETRIB_FLEX_RESTAURANTE` Ticket restaurante (flexible_remuneration, exempt up to 11€/día)
- `ES_STOCK_OPTIONS` Stock options (variable, taxable)
- `ES_IT_CC_EMPRESA` Complemento IT contingencia común (variable)
- `ES_IT_AT_EMPRESA` Complemento IT accidente trabajo (variable)
- `ES_NACIMIENTO` Prestación nacimiento/cuidado (informative)
- `ES_REGULARIZACION` Regularización / atrasos (regularization)

**Deducciones (deductions):**
- `ES_IRPF` Retención IRPF (withholding, percentage)
- `ES_SS_CC_TRAB` Cotización CC trabajador (social_contribution, 4.70%)
- `ES_SS_DESEMPLEO_TRAB` Cotización desempleo trabajador (social_contribution)
- `ES_SS_FP_TRAB` Formación profesional trabajador (social_contribution)
- `ES_ANTICIPO` Anticipo a descontar (advance)
- `ES_EMBARGO` Embargo judicial (other)
- `ES_PENSION_COMPENSATORIA` Pensión compensatoria (other)
- `ES_CUOTA_SINDICAL` Cuota sindical (other)
- `ES_PERMISO_NO_RETRIBUIDO` Descuento permiso no retribuido (variable)

**Costes empresa (employer_cost):**
- `ES_SS_CC_EMP` Cotización CC empresa (23.60%)
- `ES_SS_DESEMPLEO_EMP` Desempleo empresa
- `ES_SS_FOGASA` FOGASA
- `ES_SS_FP_EMP` FP empresa
- `ES_SS_MEI` MEI
- `ES_SS_AT_EP` AT/EP empresa

**Informativos:**
- `ES_BASE_CC` Base cotización contingencias comunes
- `ES_BASE_AT` Base cotización AT/EP
- `ES_BASE_IRPF` Base sujeta a IRPF
- `ES_COSTE_EMPRESA_TOTAL` Coste total empresa

### 2. Hook: `useESPayrollBridge`

Nuevo hook en `src/hooks/erp/hr/useESPayrollBridge.ts`:

- **`calculateESPayroll(employeeId, periodId)`**: Dado un empleado y un período:
  1. Fetch `hr_es_employee_labor_data` (grupo, contrato, situación IRPF)
  2. Fetch employee contract data (salario base, complementos)
  3. Fetch `hr_es_ss_bases` for grupo
  4. Fetch `hr_es_irpf_tables` for year
  5. Fetch pending incidents (horas extra, dietas, bonus, IT, permisos)
  6. Generate `hr_payroll_record_lines`:
     - Fixed earnings from contract
     - Variable earnings from incidents
     - Calculate SS bases (apply min/max caps)
     - Calculate SS deductions worker (CC 4.70%, desempleo, FP)
     - Calculate IRPF retention using `calculateIRPFRetention`
     - Calculate employer costs (CC 23.60%, desempleo, FOGASA, FP, MEI, AT)
     - Add informative lines (bases)
  7. Insert lines + update record totals
  8. Log audit

- **`calculateESBatch(periodId)`**: Iterate all employees for period, call `calculateESPayroll` each

- **`simulateES(params)`**: Same logic but stores in `hr_payroll_simulations`, not records

- **`validateESPreClose(periodId)`**: ES-specific validations:
  - All employees have grupo_cotizacion assigned
  - IRPF % > 0 for salaries above minimum
  - SS bases within min/max range
  - Paga extra included if applicable
  - No IT incidents without complemento

- **`generateESReport(periodId, type)`**: Generate summary data for:
  - TC1 (employer SS summary)
  - Coste empresa breakdown
  - IRPF retention summary

### 3. Component: `ESPayrollBridge`

New component at `src/components/erp/hr/localization/es/ESPayrollBridge.tsx`:

Main panel with 4 sub-tabs:
- **Cálculo**: Select period → Calculate batch / individual. Progress indicator. Shows calculated vs pending.
- **Simulador ES**: Employee selector + editable params (salary, group, family situation) → Full ES payslip simulation with SS + IRPF breakdown
- **Revisión Pre-cierre**: ES-specific validation checklist + summary totals (total CC, total desempleo, total FOGASA, total IRPF, total coste empresa)
- **Reporting**: TC1 summary view, coste empresa by department, IRPF retention distribution

### 4. Component: `ESPayrollSlipDetail`

Enhanced payslip view at `src/components/erp/hr/localization/es/ESPayrollSlipDetail.tsx`:

Renders a Spanish payslip format:
- Header: empresa, CIF, CCC, trabajador, NAF, grupo, categoría, período
- Section I: Devengos (percepciones salariales + no salariales)
- Section II: Deducciones (IRPF + SS worker)
- Section III: Bases de cotización (BC CC, BC AT, BC desempleo, con topes)
- Section IV: Coste empresa (CC emp, desempleo, FOGASA, FP, MEI, AT)
- Footer: Líquido a percibir, firma
- Export to PDF button

### 5. Integration

- Add `ESPayrollBridge` as new tab "Nómina ES" in `ESLocalizationPlugin`
- Add `ESPayrollSlipDetail` as optional renderer when viewing a record with `country_code = 'ES'` in `HRPayrollRecordsList`
- Update `ESLocalizationPlugin` barrel exports

### 6. Implementation Order

| Task | Content |
|---|---|
| **ESP1** | Seed ~40 concept templates via insert |
| **ESP2** | `useESPayrollBridge` hook with calculate, simulate, validate, report |
| **ESP3** | `ESPayrollBridge` component (4 tabs: cálculo, simulador, revisión, reporting) |
| **ESP4** | `ESPayrollSlipDetail` component (Spanish payslip format + PDF) |
| **ESP5** | Integration into ESLocalizationPlugin + HRPayrollRecordsList |

