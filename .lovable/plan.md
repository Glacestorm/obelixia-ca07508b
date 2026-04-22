# S9.22 — Cierre total Nómina ES + Portal del Empleado (final)

## 0. Ajustes incorporados

1. **Conservación (texto canónico final):**
   *"Conservación documental obligatoria durante 4 años conforme a la normativa laboral y de Seguridad Social aplicable, con referencia sancionadora en el art. 21 LISOS y a la conservación reglamentaria de documentación justificativa en el RD 84/1996."*
2. **Acuse (canónico):**
   *"La firma o acuse acredita la recepción del recibo, no la conformidad con los conceptos ni la renuncia a reclamación."*
3. **Reclamación (canónico):**
   *"Plazo general de reclamación de cantidades: 1 año (art. 59.2 ET)."*
4. **PDF on-demand** se diferencia visualmente del PDF oficial (watermark + banner + hash SHA-256).
5. **Revisión interna ≠ impugnación jurídica** (aviso explícito persistente).
6. **Fuente única real** vía `buildPayslipRenderModel` consumido por todos los renderizadores.

## 1. Entregables

### A. Render model único + generador PDF
- **Nuevo** `src/engines/erp/hr/payslipRenderModel.ts` — `buildPayslipRenderModel(calculationDetails, employee, company)` puro. Único punto de proyección. Devuelve estructura tipada con cabecera, devengos, deducciones, bases, coste empresa, líquido, notas de tope, casuística.
- **Nuevo** `src/engines/erp/hr/payslipPdfGenerator.ts` — `generatePayslipPDF(model, { variant: 'official' | 'system_generated' })` con jsPDF + jspdf-autotable. Variante `system_generated`:
  - Watermark diagonal "GENERADO POR EL SISTEMA · NO FIRMADO ELECTRÓNICAMENTE"
  - Banner superior ámbar "Recibo provisional · Pendiente de documento oficial firmado por la empresa"
  - Footer con hash SHA-256 de `calculation_details` (Web Crypto API)
- Helpers: `downloadPayslipPDF(model, fileName, variant)`, `printPayslipPDF(model, variant)` (reusan `src/lib/pdfPrint.ts`).

### B. Recibo interno RRHH
- `ESPayrollSlipDetail.tsx`: sustituir TXT por `downloadPayslipPDF(model, fileName, 'official')`. Botón **"Descargar PDF"** + dropdown "Imprimir".
- `HRPayrollEntryDialog.tsx`: botón "Descargar PDF" en footer (paralelo a "Vista previa") usando `liveBridgeCalc.calculation_details`.
- `HRPayrollPreviewDialog.tsx`: botón "Descargar PDF" + reescritura del bloque de acuse para reflejar honestamente que el flujo persistido vive en el portal del empleado (no en el preview RRHH).

### C. Portal del Empleado · `EmployeePayslipsSection.tsx`
- Botón **"Descargar PDF"**:
  - Si existe `storage_path` → descarga PDF oficial subido (variante `official`, sin watermark).
  - Si no existe → genera on-demand desde `calculation_details` con variante `system_generated`.
- Botón **"Ver recibo formal"** abre vista reutilizada del slip (mismo modelo).
- Etiqueta clara del estado: *"Documento oficial de la empresa"* vs *"Recibo provisional generado por el sistema"*.
- Log en `erp_hr_document_access_log` con `action='generated_pdf_ondemand' | 'downloaded_official'`.

### D. Acuse de recibo persistido
- **Migración:** tabla `hr_payroll_acknowledgments`
  - Columnas: `id uuid PK`, `payroll_record_id uuid FK`, `employee_id uuid FK`, `company_id uuid`, `acknowledged_at timestamptz`, `acknowledged_by uuid` (auth.uid), `user_agent text`, `ip_hash text`, `notes text`, `created_at timestamptz`.
  - `UNIQUE (payroll_record_id, employee_id)`.
  - RLS: SELECT/INSERT propio empleado + SELECT admin/RRHH. UPDATE/DELETE solo admin.
- **Nuevo** `src/hooks/erp/hr/usePayrollAcknowledgments.ts`.
- **Nuevo** `src/components/erp/hr/employee-portal/EmployeePayrollAckBlock.tsx`:
  - Sin acuse: botón **"Confirmar recepción del recibo"** + texto fijo `ACK_MEANING` + `CLAIM_TERM`.
  - Con acuse: badge verde con fecha/hora + nombre del usuario.

### E. Reportar incidencia / Solicitar revisión interna
- **Migración:** tablas `hr_payroll_objections` + `hr_payroll_objection_events`
  - `hr_payroll_objections`: `id`, `payroll_record_id`, `employee_id`, `company_id`, `category text`, `subject`, `description`, `status text` DEFAULT 'open', `reference_number text UNIQUE` (autogen `REV-YYYYMM-NNNN` vía trigger), `attachments jsonb`, `hr_response`, `hr_responded_by`, `hr_responded_at`, `closed_at`, `created_by`, `created_at`, `updated_at`.
  - `hr_payroll_objection_events`: timeline.
  - RLS: SELECT/INSERT propio empleado + SELECT/UPDATE RRHH/admin. INSERT empleado fuerza `employee_id = self` y `status='open'`.
- **Nuevo** `src/hooks/erp/hr/usePayrollObjections.ts`.
- **Nuevo** `EmployeePayrollObjectionDialog.tsx` y `EmployeePayrollObjectionsList.tsx`:
  - Botón en sheet: **"Reportar incidencia / Solicitar revisión interna"**.
  - Aviso persistente `INTERNAL_REVIEW_SCOPE`.
  - Adjuntos opcionales en `hr-documents/objections/`.
  - "Reabrir" si cerrada < 30d.

### F. Mejoras UX en scope
- **Nuevo** `src/engines/erp/hr/payrollConceptGlossary.ts`: diccionario estático → tooltip en slip + portal.
- Comparador mes a mes: top-3 deltas por concepto desde `calculation_details` previo y actual.
- Notificación "nueva nómina disponible": **verificar primero** existencia de `erp_hr_notifications`. Si no existe → fuera de scope.

### G. Aviso legal canónico
- **Nuevo** `src/lib/hr/payroll/legalNotices.ts`:
  ```ts
  export const PAYROLL_LEGAL_NOTICES = {
    RECEIPT_DELIVERY: "La empresa debe entregar el recibo (físico o digital). El trabajador debe recibirlo y, si la empresa lo solicita, firmarlo o acusarlo recibo.",
    ACK_MEANING: "La firma o acuse acredita la recepción del recibo, no la conformidad con los conceptos ni la renuncia a reclamación.",
    CLAIM_TERM: "Plazo general de reclamación de cantidades: 1 año (art. 59.2 ET).",
    RETENTION: "Conservación documental obligatoria durante 4 años conforme a la normativa laboral y de Seguridad Social aplicable, con referencia sancionadora en el art. 21 LISOS y a la conservación reglamentaria de documentación justificativa en el RD 84/1996.",
    INTERNAL_REVIEW_SCOPE: "Canal interno de revisión por RRHH. No constituye impugnación jurídica formal ni sustituye la reclamación previa administrativa o judicial. Los plazos legales corren con independencia de este flujo.",
    SYSTEM_GENERATED_PDF: "Recibo provisional generado por el sistema. No firmado electrónicamente. Pendiente de documento oficial firmado por la empresa.",
  } as const;
  ```
- Importado por: preview, slip, PDF generator, portal ack block, portal objection dialog. Única fuente.

## 2. Archivos

**Nuevos**
- `src/lib/hr/payroll/legalNotices.ts`
- `src/engines/erp/hr/payslipRenderModel.ts`
- `src/engines/erp/hr/payslipPdfGenerator.ts`
- `src/engines/erp/hr/payrollConceptGlossary.ts`
- `src/hooks/erp/hr/usePayrollAcknowledgments.ts`
- `src/hooks/erp/hr/usePayrollObjections.ts`
- `src/components/erp/hr/employee-portal/EmployeePayrollAckBlock.tsx`
- `src/components/erp/hr/employee-portal/EmployeePayrollObjectionDialog.tsx`
- `src/components/erp/hr/employee-portal/EmployeePayrollObjectionsList.tsx`
- 2 migraciones SQL (acks + objections + events + RLS + trigger refnum)

**Editados**
- `src/components/erp/hr/localization/es/ESPayrollSlipDetail.tsx`
- `src/components/erp/hr/employee-portal/EmployeePayslipsSection.tsx`
- `src/components/erp/hr/HRPayrollPreviewDialog.tsx`
- `src/components/erp/hr/HRPayrollEntryDialog.tsx`

## 3. Guardrails

- ✗ No tocar `payroll-calculation-engine`, `useESPayrollBridge`, bases SS, grupo SS, convenio, mapping, tablas salariales.
- ✗ No autoaplicar normativa. No "aprobación" del empleado. No "PDF firmado".
- ✗ Prohibido usar referencia errónea "LGSS Art. 21" para conservación.
- ✓ Backward compatibility con PDFs oficiales ya subidos.
- ✓ Misma fuente de datos (`calculation_details`) en todos los renderizadores.
- ✓ Watermark + banner + hash obligatorios en PDF on-demand.
- ✓ Textos legales **solo** desde `legalNotices.ts`.

## 4. Pendientes clasificados

| Pendiente | Tras S9.22 |
|---|---|
| PDF formal recibo | **Cerrado** (oficial sin firma electrónica + on-demand con watermark) |
| Descarga portal sin upload manual | **Cerrado** |
| Acuse persistido | **Cerrado** |
| Revisión interna sobre nómina | **Cerrado** |
| Comparador top-3 deltas conceptos | **Cerrado** |
| Glosario conceptos | **Cerrado** |
| Notificación nueva nómina | **Condicional** a existencia de `erp_hr_notifications` |
| Timeline retributivo multi-año | **Fuera de scope** |
| Firma electrónica eIDAS | **Fuera de scope** |
| SEPA CT wiring al recibo | **Fuera de scope** |

## 5. Checklist de no regresión

- [ ] PDF oficial subido → descarga sin watermark, sin banner.
- [ ] PDF on-demand → watermark diagonal + banner ámbar + hash SHA-256 en footer.
- [ ] Slip RRHH y portal empleado renderizan **idéntico modelo** desde `calculation_details`.
- [ ] Acuse persistido único por (payroll_record_id, employee_id); RLS verificada.
- [ ] Texto del acuse: "Confirmar recepción del recibo" + aclaración no-conformidad.
- [ ] Flujo de revisión: "Reportar incidencia / Solicitar revisión interna" + `INTERNAL_REVIEW_SCOPE`.
- [ ] Conservación cita art. 21 LISOS + RD 84/1996; nunca "LGSS Art. 21".
- [ ] `legalNotices.ts` es la única fuente de los textos legales (verificable por grep).
- [ ] Sin regresiones S9.21k/l/m/n (bases SS, grupo SS, source of truth).
- [ ] TypeScript y build limpios.

## 6. Veredicto

> "Portal del Empleado y Nómina ES reforzados para entrega, visualización, descarga y gestión seria del recibo salarial — con fuente única real, PDF diferenciado y referencias legales correctas."
