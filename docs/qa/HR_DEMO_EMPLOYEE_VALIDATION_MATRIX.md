# HR — Validation Pack Empleado DEMO · Matriz

**Estado del documento:** preliminar (Fase A+B). El campo "Estado real" se actualizará en Fase C tras ejecutar los validadores contra los motores reales.

## Leyenda

| Código | Significado |
|---|---|
| `PASS` | Funciona end-to-end con datos reales del fixture y el motor produce los importes esperados. |
| `PARTIAL` | Existe parte del flujo (UI sin motor, motor sin UI, falta cuadre, falta evidencia). |
| `GAP` | No existe o solo placeholder. |
| `BLOCKED_EXTERNAL` | Depende de credenciales / UAT / respuesta oficial externa. |
| `HUMAN_REVIEW_REQUIRED` | Exige revisión legal o fiscal humana antes de marcarlo oficial. |
| `PENDING_VALIDATION` | Aún no validado por la Fase C. |

---

## Matriz

| id | caso | área | UI | modelo de datos | cálculo | documento/fichero | test | estado preliminar | estado real | bloqueo externo | revisión humana | evidencia esperada | observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Registro empleado DEMO | RRHH · Maestro | sí | sí | n/a | perfil legal | parcial | PASS | PENDING_VALIDATION | no | no | ficha empleado + perfil legal unificado | Carlos Ruiz Martín |
| 2 | AFI alta TGSS | SS · Comunicaciones | sí | sí | sí | DRYRUN AFI | parcial | PARTIAL | PENDING_VALIDATION | sí (TGSS) | no | artefacto AFI + hash | nunca envío real |
| 2b | TA2 alta | SS · Comunicaciones | sí | sí | sí | DRYRUN TA2 | parcial | PARTIAL | PENDING_VALIDATION | sí (TGSS) | no | artefacto TA2 + hash | DRYRUN |
| 2c | IDC | SS · Comunicaciones | parcial | sí | parcial | parcial | no | PARTIAL | PENDING_VALIDATION | sí | no | si aplica | dependiente del régimen |
| 2d | Contrat@ SEPE | SEPE · Contratación | sí | sí | sí | DRYRUN Contrat@ | parcial | PARTIAL | PENDING_VALIDATION | sí (SEPE) | no | artefacto Contrat@ + hash | DRYRUN |
| 3 | Nómina mensual compleja | Payroll | sí | sí | sí | PDF | parcial | PARTIAL | PARTIAL (C1: cuadre determinista OK; integración E2E con buildPayslip+SS+IRPF pendiente) | no | no | payslip + render model | C1 verifica coherencia interna y conceptos presentes |
| 3a | Horas extras | Payroll · Incidencias | sí | sí | sí | sí | sí | PASS | PARTIAL (C1: HE entra como devengo determinista; sin engine real ejecutado E2E) | no | no | línea HE + base CC | convenio aplicable |
| 3b | Seguro médico flexible | Payroll · Beneficios | sí | sí | sí | sí | parcial | PASS | PARTIAL (C1: exención bajo cap modelada; sin payslip real) · HUMAN_REVIEW_REQUIRED (tope 500/1500€) | no | sí (tope 500/1500€) | línea RE en especie | Art. 42.3.c LIRPF |
| 3c | Stock options | Equity · Payroll | sí | sí | sí | parcial | sí (engine) | PARTIAL | PARTIAL · HUMAN_REVIEW_REQUIRED (C1: motor puro PASS; integración payslip E2E + clave/subclave 190 dedicada pendientes; startup/RSU/phantom marcados supported_with_review/out_of_scope) | no | sí | línea SO + acumulado 190 | C1 verifica ES_STOCK_OPTIONS, isTaxable, isContributable, includesStockOptions en 190 |
| 3d | PNR 1 día | Payroll · Incidencias | sí | sí | sí | sí | sí | PASS | PARTIAL (C1: descuento proporcional determinista; sin engine real E2E) | no | no | descuento proporcional | — |
| 3e | IT por AT | Payroll · IT | sí | sí | sí | DRYRUN FDI/Delt@ | sí | PARTIAL | PARTIAL (C1: IT/AT presente como concepto; complemento convenio y FDI/Delt@ pendientes en C1) | sí (Delt@/INSS) | no | FDI + Delt@ + payslip | 75% Mutua + complemento convenio |
| 4 | Permiso por nacimiento | INSS · Payroll | sí | sí | sí | preview INSS | no | PARTIAL | PENDING_VALIDATION | sí (INSS) | no | comunicación INSS preparatoria | suspensión con reserva de puesto |
| 5 | Desplazamiento temporal fuera de España | Movilidad internacional | sí | sí | sí | A1 + anexos | sí (fiscalSupervisor) | PARTIAL | PENDING_VALIDATION | sí (SS internacional) | sí (7p / 216) | A1 + impacto payslip | nunca auto-aplicar 7p |
| 6 | Atrasos por IT no introducida | Payroll · Correction | sí | sí | sí (run `correction`) | snapshot diff | parcial | PARTIAL | PENDING_VALIDATION | no | no | nómina original vs corregida | L03 si procede |
| 7 | Reducción jornada guarda legal | Localización ES | sí | sí | sí | sí | parcial | PASS | PENDING_VALIDATION | no | no | modificación contractual + impacto | Art. 37.6 ET |
| 8a | Informe de costes | Reporting | sí | sí | sí | PDF/CSV | parcial | PASS | PENDING_VALIDATION | no | no | reporte ejecutivo | — |
| 8b | Resumen / recibo individual | Reporting | sí | sí | sí | PDF | parcial | PASS | PENDING_VALIDATION | no | no | render model + labels | — |
| 8c | Registro de nómina | Reporting | sí | sí | sí | sí | parcial | PASS | PENDING_VALIDATION | no | no | export legal | — |
| 8d | Informe de incidencias | Reporting | sí | sí | sí | sí | parcial | PASS | PENDING_VALIDATION | no | no | listado de incidencias | — |
| 8e | Informe de horas | Time clock | sí | sí | sí | sí (RDL 8/2019) | sí | PASS | PENDING_VALIDATION | no | no | export horas | — |
| 8f | Informe SS (RLC/RNT/CRA) | SS · Reporting | sí | sí | sí | DRYRUN | parcial | PARTIAL | PENDING_VALIDATION | sí (SILTRA) | no | RLC + RNT + CRA + cuadre | `SS_emp+SS_trab−prest=RLC` |
| 8g | Informe fiscal 111/190 | Fiscal · Reporting | sí | sí | sí | DRYRUN AEAT | parcial | PARTIAL | PARTIAL · HUMAN_REVIEW_REQUIRED (C1: coherencia bases/retenciones verificada; clave/subclave SO específica no expuesta por engine) | sí (AEAT) | sí (clasificación SO) | acumulados + claves | — |
| 9 | Seguros sociales BASES/SOLCON/RLC/RNT/CRA | SS · Expediente | parcial | sí | sí | DRYRUN SILTRA | parcial | PARTIAL | PENDING_VALIDATION | sí (SILTRA) | no | expediente SS mensual | cuadre numérico |
| 10 | Registro horario | Time clock | sí | sí | sí | sí | sí | PASS | PENDING_VALIDATION | no | no | fichajes + balance | — |
| 11 | Modelos 111/190 con SO y flex | Fiscal | parcial | sí | sí | DRYRUN | parcial | PARTIAL | PARTIAL · HUMAN_REVIEW_REQUIRED (C1: includesStockOptions/includesFlexibleBenefits modelados en helper; pipeline engine no expone clave dedicada SO) | sí (AEAT) | sí (SO) | acumulados + claves/subclaves | — |
| 12a | Liquidación despido disciplinario | Offboarding | sí | sí | sí | carta + finiquito | sí | PASS | PENDING_VALIDATION | no | sí (riesgo improcedencia) | finiquito (indemnización 0) | — |
| 12b | Liquidación despido objetivo | Offboarding | sí | sí | sí | 20 d/año, tope 12 mens. | parcial | PASS | PENDING_VALIDATION | no | no | finiquito + preaviso | Art. 53 ET |
| 12c | L13 vacaciones no disfrutadas | Offboarding | parcial | sí | sí | parcial | no | PARTIAL | PENDING_VALIDATION | sí (TGSS) | no | L13 si procede | — |
| 12d | Transferencia / SEPA CT del finiquito | Tesorería | sí | sí | sí | XML 20022 | sí | PASS | PENDING_VALIDATION | no | no | fichero SEPA CT | MOD-97 IBAN |
| 13 | Comunicaciones de salida (AFI baja, TA2 baja, Certific@2) | SS + SEPE | sí | sí | sí | DRYRUN | parcial | PARTIAL | PENDING_VALIDATION | sí (TGSS/SEPE) | no | artefactos baja + hash | — |
| 14 | Recibo final imprimible | Payroll · Render | sí | sí | sí | render model + PDF | parcial | PARTIAL | PARTIAL (C1: render model con secciones obligatorias y conceptos especiales verificado; PDF binario no generado en C1) | no | no | totales coherentes + conceptos | C1 valida render model only |

---

## Notas

- Cualquier cambio futuro en `salaryNormalizer`, `simulateES`, `payrollRunEngine`, `payslipEngine`, `ssContributionEngine`, `irpfEngine`, `rlcRntCraArtifactEngine` o `modelo190PipelineEngine` debe re-ejecutar esta matriz.
- La columna "Estado real" se mantiene en `PENDING_VALIDATION` hasta Fase C.
- No se desbloquea ningún flag, ni se altera el comportamiento de producción.