# RRHH / NÓMINA — PLAN: Guía asistida para nóminas con convenio dudoso

Fecha: 2026-04-28 · Estado: PLAN APROBADO · Implementación: **NO ejecutada**.

> Este documento es **solo diseño y especificación**. No se crean componentes,
> hooks ni tipos en este turno. La construcción se hará bajo prompt BUILD
> separado, en fases, y siempre respetando los invariantes de seguridad legal
> del módulo de nómina.

---

## 1. Veredicto y propósito

Cuando el cálculo de la nómina no puede ejecutarse de forma determinista
porque:
- el convenio no se identifica con seguridad,
- el convenio se identifica pero no recoge conceptos salariales suficientes,
- la tabla salarial no existe o no encaja con el contrato,
- faltan importes/pluses/complementos/tramos,
- la parametrización contractual está incompleta,
- SafeMode salarial está activo,

…el sistema **debe ofrecer una guía asistida paso a paso** que conduzca a un
operador humano a completar la nómina de forma trazable y conforme a:
- Ley aplicable.
- Convenio colectivo aplicable.
- Estatuto de los Trabajadores (ET).
- Normativa de Seguridad Social (LGSS, RD 2064/1995, Orden anual de cotización).
- Normativa IRPF (LIRPF, RIRPF, Orden HAC anual).
- Procedimientos oficiales TGSS / SEPE / AEAT / INSS / DELT@ cuando proceda.

La guía **no sustituye** ni al asesor laboral ni al criterio humano. No
ejecuta ningún cálculo automático cuando hay ambigüedad legal: pide
intervención manual.

---

## 2. Arquitectura propuesta (futura)

```text
NewPayrollDialog / Nueva nómina
  ├── selector: detectorSafeMode + detectorConvenioDudoso  (puros, no escriben)
  └── disparador UI: <Button>Abrir guía asistida</Button>  (badge contextual)
        │
        └─> HRPayrollManualGuidanceWizard  (Sheet lateral 600px o modal grande)
             ├── WizardStepIdentificacion       (Paso 1)
             ├── WizardStepConvenio             (Paso 2)
             ├── WizardStepContratoSalario      (Paso 3)
             ├── WizardStepConceptosSalariales  (Paso 4)
             ├── WizardStepIncidencias          (Paso 5 — reusa C3 panel)
             ├── WizardStepBasesSSeIRPF         (Paso 6, sólo lectura)
             ├── WizardStepCoherencia           (Paso 7, checklist)
             ├── WizardStepValidacionHumana     (Paso 8)
             ├── WizardStepResultado            (Paso 9)
             └── WizardStepTrazabilidad         (Paso 10, snapshot interno)
```

Disparador visible cuando:
- `safeModeActive === true`, o
- `agreementResolution.status ∈ {'doubtful','clear_no_table','none','requires_legal_review'}`, o
- `contractParametrization.status === 'incompleto'`.

---

## 3. Tipos TypeScript propuestos (futuros)

```ts
export type WizardStepId =
  | 'identificacion' | 'convenio' | 'contrato' | 'conceptos'
  | 'incidencias'   | 'bases'    | 'coherencia' | 'validacion'
  | 'resultado'     | 'trazabilidad';

export type WizardStepStatus =
  | 'pending' | 'in_progress' | 'complete' | 'blocked' | 'requires_legal_review';

export type AgreementClarity =
  | 'clear' | 'clear_no_table' | 'doubtful' | 'none' | 'requires_legal_review';

export type FinalReadiness =
  | 'ready_to_calculate'
  | 'ready_legal_review'
  | 'blocked_safemode'
  | 'blocked_doubtful_agreement'
  | 'blocked_missing_concepts'
  | 'blocked_critical_incidents'
  | 'ready_internal_validation'
  | 'unofficial_pending_lastmile';

export interface ManualConcept {
  code: string;
  label: string;
  origin: 'agreement' | 'contract' | 'manual';
  mandatory: boolean;
  amount: number | null;
  unit: 'monthly' | 'annual' | 'daily' | '%';
  cotizable_ss: boolean;
  tributable_irpf: boolean;
  legal_source?: string;
  status: 'ok' | 'pending' | 'requires_review';
  notes?: string;
}

export interface ManualGuidanceSnapshot {
  id: string;
  company_id: string;
  employee_id: string;
  period: { year: number; month: number };
  steps: Record<WizardStepId, WizardStepStatus>;
  concepts: ManualConcept[];
  reviewer: { user_id: string; reviewed_at: string; observations: string } | null;
  readiness: FinalReadiness;
  created_at: string;
}
```

No se persisten todavía en BD. La fase WIZ-A propuesta los mantiene
in-memory; una fase WIZ-B futura podrá añadir tabla
`erp_hr_payroll_manual_guidance_snapshots` (fuera de alcance ahora).

---

## 4. Especificación detallada de pasos

### Paso 1 — Identificación del empleado
Campos obligatorios (todos con `*`): Empleado, Empresa, Centro de trabajo,
Periodo de nómina, Tipo de contrato, Grupo profesional, Grupo de cotización,
Jornada, Fecha alta. Opcional: Fecha baja.

Validaciones: empleado activo en el periodo, empresa accesible por RLS,
contrato vigente, grupo profesional y grupo de cotización informados.
Bloqueante: empleado inactivo o contrato no vigente.

### Paso 2 — Identificación del convenio
Campos obligatorios: Convenio aplicable, Fuente del convenio (empleado /
contrato / empresa / centro / manual), Fecha de vigencia, Grupo / nivel /
categoría profesional. Opcional: Tabla salarial aplicable.

Estados: `clear`, `clear_no_table`, `doubtful`, `none`, `requires_legal_review`.
Si el convenio no trae conceptos suficientes, **no se inventan importes**:
pasa al Paso 4 con conceptos en estado `pending`.

### Paso 3 — Revisión del contrato y salario pactado
Campos obligatorios: Salario base contractual, Unidad salarial (mensual /
anual), Nº pagas, Pagas extra prorrateadas (sí/no), Fecha efecto salarial.
Opcional: Jornada %, Observaciones.

Validaciones: si `salario_anual === salario_mensual` y `pagas > 1`, mostrar
helper de interpretación; si falta unidad o nº pagas, activar SafeMode; si
salario pactado no cuadra con convenio, marcar revisión.

### Paso 4 — Conceptos salariales mínimos
Tabla guiada con columnas: Concepto, Origen, Obligatorio, Importe, Unidad,
Cotiza SS, Tributa IRPF, Fuente legal/convenio, Estado, Observaciones.

Conceptos típicos: Salario base *, Plus convenio (si aplica), Antigüedad,
Complemento de puesto, Plus transporte, Mejora voluntaria, Prorrata pagas
extra, Retribución flexible, Especies.

Reglas estrictas:
- No inventar conceptos.
- Si el convenio no especifica importe, pedir entrada manual.
- Si el concepto es obligatorio por convenio, marcarlo con `*` rojo.
- Marcar claramente si cotiza SS y si tributa IRPF.
- Si hay duda, marcar `requires_review`.

### Paso 5 — Incidencias del periodo
Reusa el panel C3 (`HRPersistedIncidentsPanel` + dialog C3C).
Tipos:
- PNR → `payroll_incidents` (queda persistida, no aplicada).
- IT/AT/EP → módulo canónico (no se gestiona aquí).
- Nacimiento / cuidado menor → módulo permisos (no aquí).
- Reducción jornada, Atrasos, Desplazamiento, Suspensión empleo y sueldo,
  Otras → quedan como persistidas no aplicadas hasta revisión legal.

No genera FDI/AFI/DELT@ automáticamente.

### Paso 6 — Bases SS e IRPF
Sólo lectura: muestra devengos cotizables / no cotizables, base CC, base CP,
base IRPF, tipo IRPF, deducciones del trabajador y coste empresa **si están
calculables**.

No permite validar si:
- faltan conceptos obligatorios (Paso 4 incompleto),
- SafeMode sigue activo,
- hay revisión legal crítica pendiente.

No inventa bases.

### Paso 7 — Comprobaciones de coherencia
Checklist automático (12 ítems): salario base > 0, unidad informada, pagas
informadas, convenio revisado, conceptos obligatorios revisados, incidencias
revisadas, bases SS calculables, IRPF calculable, sin doble conteo
local/persistido, sin unmapped aplicado al cálculo, sin comunicación oficial
generada, SafeMode desactivado o justificado.

### Paso 8 — Validación humana
Resumen previo + confirmación humana obligatoria si: convenio dudoso,
conceptos manuales, revisión legal, atrasos, IT/AT, reducción jornada,
salario fuera de convenio o SafeMode previo.

Campos obligatorios: Responsable RRHH, Fecha de revisión, Motivo /
observaciones, Confirmación de que se ha revisado Ley / Convenio / ET /
normativa aplicable.

### Paso 9 — Resultado final
Estado calculado (`FinalReadiness`):
`ready_to_calculate`, `ready_legal_review`, `blocked_safemode`,
`blocked_doubtful_agreement`, `blocked_missing_concepts`,
`blocked_critical_incidents`, `ready_internal_validation`,
`unofficial_pending_lastmile`.

### Paso 10 — Documentación / trazabilidad
Genera **resumen interno** (snapshot JSON) con: decisiones, fuente de
importes, conceptos manuales, incidencias, warnings, responsable, fecha,
estado.

**Prohibido**: PDF oficial, FDI, AFI, DELT@, TGSS, SEPE, AEAT, INSS hasta
fase oficial validada (última milla).

---

## 5. UI propuesta

- Botón disparador en cabecera de "Nueva nómina":
  `<Button variant="outline">Abrir guía asistida</Button>`
  con badge contextual ("SafeMode" / "Convenio dudoso").
- Panel lateral derecho (`Sheet` 600px) con stepper vertical numerado.
- Cada paso: cabecera + descripción + formulario + footer con
  "Atrás / Siguiente / Marcar revisión legal".
- Asteriscos rojos accesibles en obligatorios (helper `<Req/>` reutilizado
  de la Fase C3C).
- Banners ámbar / sky / red con la misma paleta accesible que C3C.
- Indicador de estado del wizard (chip con `WizardStepStatus`).

---

## 6. Tests futuros propuestos

- La guía aparece cuando SafeMode está activo.
- La guía aparece cuando `agreementResolution.status === 'doubtful'`.
- Los campos obligatorios de cada paso muestran asterisco rojo.
- No permite avanzar si falta un campo obligatorio.
- 0 llamadas a `fdiArtifactEngine`, `afiInactivityEngine`, `deltaArtifactEngine`.
- 0 cambios en el payload entregado a `simulateES`.
- `PAYROLL_EFFECTIVE_CASUISTICA_MODE` no se importa ni se modifica.
- Genera resumen interno serializable y consistente con `ManualGuidanceSnapshot`.
- Marca `requires_legal_review` cuando aplique.
- El snapshot es inmutable tras el Paso 8 (no se permite UPDATE posterior).

---

## 7. Riesgos legales y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Inducir cálculo automático con convenio dudoso | Paso 4 exige entrada manual; Paso 6 no calcula si Paso 4 incompleto |
| Falsa sensación de cumplimiento | Paso 8 firma humana obligatoria con confirmación explícita Ley/CC/ET |
| Generación de comunicaciones oficiales no validadas | Paso 10 prohíbe artefactos oficiales; Pasos 5/9 no llaman a engines FDI/AFI/DELT@ |
| Doble conteo local/persistido | Paso 7 incluye chequeo explícito |
| SafeMode "olvidado" | Paso 9 lo muestra como estado bloqueante (`blocked_safemode`) |
| Edición a posteriori del snapshot | Snapshot inmutable tras validación humana |

---

## 8. Qué queda fuera de la guía

- Generación de PDF oficial de nómina.
- Envío a TGSS / SEPE / AEAT / INSS / DELT@.
- Actualización automática de tablas salariales del convenio.
- Aprendizaje IA sobre conceptos manuales (fase posterior).
- Integración directa con asesor laboral externo.
- Cualquier modificación de motores legales o del payload del motor.

---

## 9. Invariantes inmutables (siempre vigentes)

- No se toca motor de nómina ni `simulateES` ni payload del motor.
- No se toca `salaryNormalizer.ts`, `contractSalaryParametrization.ts`,
  `agreementSalaryResolver.ts`, `fdiArtifactEngine.ts`,
  `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- `PAYROLL_EFFECTIVE_CASUISTICA_MODE` permanece `'persisted_priority_preview'`.
- `persisted_priority_apply` permanece OFF.
- Sin `service_role`. Sin BD, RLS, migraciones, edge functions, dependencias
  o CI nuevos.
- Sin FDI, AFI, DELT@ ni comunicaciones oficiales generadas por la guía.
- `isRealSubmissionBlocked() === true` continúa estrictamente en vigor.

---

## 10. Fases de implementación recomendadas (futuro)

- **WIZ-A**: Pasos 1–3 + esqueleto de wizard + disparador. Snapshot in-memory.
  Tests por paso. Sin tabla en BD.
- **WIZ-B**: Pasos 4–5 (conceptos manuales + reuso C3 incidencias).
- **WIZ-C**: Pasos 6–7 (bases sólo lectura + checklist coherencia).
- **WIZ-D**: Paso 8 (validación humana) y Paso 9 (resultado final).
- **WIZ-E**: Paso 10 (snapshot persistente — requiere migración separada,
  fuera de alcance hasta aprobación).

---

## 11. Prompt BUILD recomendado (futuro)

> "Implementar **WIZ-A** de `HRPayrollManualGuidanceWizard` siguiendo
> `docs/qa/RRHH_NOMINA_GUIA_ASISTIDA_CONVENIO_DUDOSO_PLAN.md`. Sólo Pasos
> 1–3 + esqueleto del Sheet lateral + disparador en NewPayrollDialog. Sin
> tocar engines, sin tocar `PAYROLL_EFFECTIVE_CASUISTICA_MODE`, sin tabla
> en BD (snapshot in-memory). Tests por paso (asteriscos rojos, no avance
> sin obligatorios, 0 llamadas a engines). Reusar el helper `<Req/>` de la
> Fase C3C."

---

## 12. Estado
📋 **PLAN APROBADO — implementación pendiente de prompt BUILD separado.**
