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
| 3c | Stock options | Equity · Payroll | sí | sí | sí | parcial | sí (engine + E2E) | PARTIAL | PASS_INTERNAL · HUMAN_REVIEW_REQUIRED (C3: catálogo marca ES_STOCK_OPTIONS como `pending_review` con `modelo190_review_required=true`; pipeline 190 emite `requires_human_review`+`official_submission_blocked`+`clave_is_fallback` cuando aparece SO; `laborCostReportEngine` real separa `stockOptionsCost` con bucket `stock`; `computeIRPF` real invocado con contexto Carlos Ruiz; startup/RSU/phantom siguen `supported_with_review`) | no | sí | línea SO + acumulado 190 + cost report | C3: 4 tests verdes (modelo190-key, cost-report, real-irpf, pass-internal-status). Sin envío oficial. |
| 3d | PNR 1 día | Payroll · Incidencias | sí | sí | sí | sí | sí | PASS | PARTIAL (C1: descuento proporcional determinista; sin engine real E2E) | no | no | descuento proporcional | — |
| 3e | IT por AT | Payroll · IT | sí | sí | sí | DRYRUN FDI/Delt@ | sí | PARTIAL | PARTIAL (C1: IT/AT presente como concepto; complemento convenio y FDI/Delt@ pendientes en C1) | sí (Delt@/INSS) | no | FDI + Delt@ + payslip | 75% Mutua + complemento convenio |
| 4 | Permiso por nacimiento | INSS · Payroll | sí | sí | sí | preview INSS | no | PARTIAL | PENDING_VALIDATION | sí (INSS) | no | comunicación INSS preparatoria | suspensión con reserva de puesto |
| 5 | Desplazamiento temporal fuera de España | Movilidad internacional | sí | sí | sí | A1 + anexos | sí (fiscalSupervisor) | PARTIAL | PASS_INTERNAL · HUMAN_REVIEW_REQUIRED (C4: 6 variantes A-F sobre `evaluateExpatriateSupervisor` real — triggers, corredor, crossModuleImpact, residencia, 7p flag, CDI, PE risk, equity overlap. Sin pack ES→JP queda con review obligatorio. Cero envío oficial. Ver tests `expatriate-*.test.ts`) | sí (SS internacional) | sí (7p / 216) | A1 + impacto payslip | nunca auto-aplicar 7p; 7p sólo flag de revisión |
| 5a | Mobility → Payslip bridge | Movilidad → Payroll | no | n/a | n/a | n/a | no | GAP | PARTIAL · HUMAN_REVIEW_REQUIRED (C4: `payslipEngine` no importa mobility/expatriate/corridor — `missingCapability: mobility_to_payslip_bridge`. Sin auto-aplicación de impactos en payslip) | no | no | bridge inexistente — bloqueo explícito | C4: expatriate-payroll-impact.test.ts |
| 5b | Mobility → IRPF bridge | Movilidad → IRPF | no | n/a | n/a | n/a | no | GAP | PARTIAL · HUMAN_REVIEW_REQUIRED (C4: `irpfEngine` no consume mobility/tax internacional — `missingCapability: mobility_to_irpf_engine_bridge`. 7p NO se autoaplica) | no | sí (revisión 7p) | flag de revisión, sin reducción automática | C4: expatriate-irpf-impact.test.ts |
| 5c | A1 / certificado cobertura | Documentos preparatorios | sí (checklist) | n/a | n/a | checklist + requiredDocuments | no | GAP | PARTIAL · BLOCKED_EXTERNAL (C4: `mobilityClassification.documentChecklist` y `corridorPack.requiredDocuments` cubren preparación; no existe artifact engine A1 dedicado — `missingCapability: a1_certificate_artifact_engine`. Emisión real es competencia TGSS/INSS) | sí (TGSS/INSS) | sí | preparatory + dryRun + isRealSubmissionBlocked | C4: expatriate-documents-dryrun.test.ts |
| 6 | Atrasos por IT no introducida | Payroll · Correction | sí | sí | sí (run `correction`) | snapshot diff | parcial | PARTIAL | PENDING_VALIDATION | no | no | nómina original vs corregida | L03 si procede |
| 7 | Reducción jornada guarda legal | Localización ES | sí | sí | sí | sí | parcial | PASS | PENDING_VALIDATION | no | no | modificación contractual + impacto | Art. 37.6 ET |
| 8a | Informe de costes | Reporting | sí | sí | sí | PDF/CSV | parcial | PASS | PENDING_VALIDATION | no | no | reporte ejecutivo | — |
| 8b | Resumen / recibo individual | Reporting | sí | sí | sí | PDF | parcial | PASS | PENDING_VALIDATION | no | no | render model + labels | — |
| 8c | Registro de nómina | Reporting | sí | sí | sí | sí | parcial | PASS | PENDING_VALIDATION | no | no | export legal | — |
| 8d | Informe de incidencias | Reporting | sí | sí | sí | sí | parcial | PASS | PENDING_VALIDATION | no | no | listado de incidencias | — |
| 8e | Informe de horas | Time clock | sí | sí | sí | sí (RDL 8/2019) | sí | PASS | PENDING_VALIDATION | no | no | export horas | — |
| 8f | Informe SS (RLC/RNT/CRA) | SS · Reporting | sí | sí | sí | DRYRUN | parcial | PARTIAL | PENDING_VALIDATION | sí (SILTRA) | no | RLC + RNT + CRA + cuadre | `SS_emp+SS_trab−prest=RLC` |
| 8g | Informe fiscal 111/190 | Fiscal · Reporting | sí | sí | sí | DRYRUN AEAT | parcial | PARTIAL | PASS_INTERNAL · HUMAN_REVIEW_REQUIRED (C3 SO: pipeline 190 rechaza A/01 silencioso para SO; C4 expatriado: sin clave/subclave dedicada — `missingCapability: mobility_to_modelo190_key_mapping`, `requires_human_review=true`, `official_submission_blocked=true`. Decisión humana documentada) | sí (AEAT) | sí (clasificación SO + expatriado) | acumulados + claves + review flag | C3+C4: stock-options-modelo190-key.test.ts, expatriate-modelo111-190-impact.test.ts |
| 9 | Seguros sociales BASES/SOLCON/RLC/RNT/CRA | SS · Expediente | parcial | sí | sí | DRYRUN SILTRA | parcial | PARTIAL | PENDING_VALIDATION | sí (SILTRA) | no | expediente SS mensual | cuadre numérico |
| 10 | Registro horario | Time clock | sí | sí | sí | sí | sí | PASS | PENDING_VALIDATION | no | no | fichajes + balance | — |
| 11 | Modelos 111/190 con SO y flex | Fiscal | parcial | sí | sí | DRYRUN | parcial | PARTIAL | PASS_INTERNAL · HUMAN_REVIEW_REQUIRED (C3 SO + C4 expatriado: SO bloquea oficial vía `official_submission_blocked=true`; foral PV/Navarra eleva `limitations` en `computeIRPF`; expatriado sin mapping específico → review obligatorio) | sí (AEAT) | sí (SO + foral + expatriado) | acumulados + claves + review flag | C3+C4: stock-options-real-irpf.test.ts, expatriate-modelo111-190-impact.test.ts |
| 12a | Liquidación despido disciplinario | Offboarding | sí | sí | sí | carta + finiquito | sí | PASS | PENDING_VALIDATION | no | sí (riesgo improcedencia) | finiquito (indemnización 0) | — |
| 12b | Liquidación despido objetivo | Offboarding | sí | sí | sí | 20 d/año, tope 12 mens. | parcial | PASS | PENDING_VALIDATION | no | no | finiquito + preaviso | Art. 53 ET |
| 12c | L13 vacaciones no disfrutadas | Offboarding | parcial | sí | sí | parcial | no | PARTIAL | PENDING_VALIDATION | sí (TGSS) | no | L13 si procede | — |
| 12d | Transferencia / SEPA CT del finiquito | Tesorería | sí | sí | sí | XML 20022 | sí | PASS | PENDING_VALIDATION | no | no | fichero SEPA CT | MOD-97 IBAN |
| 13 | Comunicaciones de salida (AFI baja, TA2 baja, Certific@2) | SS + SEPE | sí | sí | sí | DRYRUN | parcial | PARTIAL | PENDING_VALIDATION | sí (TGSS/SEPE) | no | artefactos baja + hash | — |
| 14 | Recibo final imprimible | Payroll · Render | sí | sí | sí | render model + PDF | parcial | PARTIAL | PARTIAL (C2: buildPayslipRenderModel expone ES_STOCK_OPTIONS desde catálogo real; PDF binario pendiente. C4: movilidad NO impacta payslip por ausencia de `mobility_to_payslip_bridge` — sin alteración del recibo) | no | no | totales coherentes + conceptos | C1/C2 estructura; C4 confirma sin impacto mobility |

---

## Notas

- Cualquier cambio futuro en `salaryNormalizer`, `simulateES`, `payrollRunEngine`, `payslipEngine`, `ssContributionEngine`, `irpfEngine`, `rlcRntCraArtifactEngine` o `modelo190PipelineEngine` debe re-ejecutar esta matriz.
- La columna "Estado real" se mantiene en `PENDING_VALIDATION` hasta Fase C.
- No se desbloquea ningún flag, ni se altera el comportamiento de producción.