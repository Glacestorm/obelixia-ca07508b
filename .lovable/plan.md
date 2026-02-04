
# Plan de Implementación: Sistema Inteligente de Recálculo de Nóminas con Cumplimiento de Convenios

## Resumen Ejecutivo
Este plan implementa un sistema integral de recálculo salarial que garantiza el cumplimiento de los convenios colectivos por sector (CNAE), validación automática por IA, coordinación con el Agente Jurídico para revisión legal, y aprobación final por el Responsable de RRHH.

---

## Fase 1: Base de Datos - Convenios Colectivos y Conceptos Salariales

### 1.1 Tabla de Convenios Colectivos
Crear tabla `erp_hr_collective_agreements` para almacenar los convenios por sector:

```text
┌─────────────────────────────────────────────────────────────────┐
│ erp_hr_collective_agreements                                    │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ code (text) - Código oficial del convenio                       │
│ name (text) - Nombre completo                                   │
│ cnae_codes (text[]) - Sectores CNAE aplicables                  │
│ jurisdiction_code (text) - ES, AD, EU, etc.                     │
│ effective_date / expiration_date (date)                         │
│ salary_tables (jsonb) - Tablas salariales por categoría         │
│ annual_updates (jsonb) - Histórico de actualizaciones           │
│ extra_payments (integer) - Número de pagas extra (12, 14, 15)   │
│ working_hours_week (numeric) - Jornada semanal                  │
│ vacation_days (integer) - Días de vacaciones                    │
│ seniority_rules (jsonb) - Reglas de antigüedad                  │
│ night_shift_bonus (jsonb) - Plus nocturnidad                    │
│ other_concepts (jsonb) - Otros conceptos obligatorios           │
│ union_obligations (jsonb) - Obligaciones sindicales             │
│ source_url (text) - URL BOE/BOPA/publicación                    │
│ is_active (boolean)                                             │
│ created_at / updated_at (timestamptz)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Campo Convenio en Contratos (Obligatorio por Art. 8.5 ET)
Añadir columna obligatoria `collective_agreement_id` a `erp_hr_contracts`:
- **Verificación legal**: El Art. 8.5 del Estatuto de los Trabajadores (RD 2/2015) establece que el empresario debe informar por escrito al trabajador sobre el convenio colectivo aplicable. Por tanto, es un dato obligatorio en el contrato.

### 1.3 Catálogo de Conceptos Salariales por Convenio
Crear tabla `erp_hr_agreement_salary_concepts` para los conceptos específicos:

```text
┌─────────────────────────────────────────────────────────────────┐
│ erp_hr_agreement_salary_concepts                                │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ agreement_id (uuid, FK)                                         │
│ concept_code (text) - PLUS_CONV, PLUS_TRANS, PLUS_TOXIC, etc.   │
│ concept_name (text) - Nombre descriptivo                        │
│ concept_type (text) - earning / deduction                       │
│ is_mandatory (boolean) - Obligatorio por convenio               │
│ calculation_type (text) - fixed, percentage, formula            │
│ base_amount (numeric)                                           │
│ percentage (numeric)                                            │
│ formula (text) - Fórmula de cálculo si aplica                   │
│ applies_to_categories (text[]) - Categorías profesionales       │
│ cotiza_ss (boolean) - Cotiza Seguridad Social                   │
│ tributa_irpf (boolean) - Tributa IRPF                           │
│ frequency (text) - monthly, annual, per_day                     │
│ conditions (jsonb) - Condiciones de aplicación                  │
│ is_active (boolean)                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Histórico de Recálculos y Validaciones
Crear tabla `erp_hr_payroll_recalculations` para auditoría:

```text
┌─────────────────────────────────────────────────────────────────┐
│ erp_hr_payroll_recalculations                                   │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ payroll_id (uuid, FK)                                           │
│ employee_id (uuid, FK)                                          │
│ company_id (uuid, FK)                                           │
│ period (text) - YYYY-MM                                         │
│ original_values (jsonb) - Valores originales                    │
│ recalculated_values (jsonb) - Valores recalculados              │
│ differences (jsonb) - Diferencias detectadas                    │
│ compliance_issues (jsonb) - Incumplimientos detectados          │
│ ai_validation (jsonb) - Resultado validación IA RRHH            │
│ legal_validation (jsonb) - Resultado validación Agente Jurídico │
│ legal_validation_status (text) - pending, approved, rejected    │
│ hr_approval (jsonb) - Aprobación Responsable Humano             │
│ hr_approval_status (text) - pending, approved, rejected         │
│ hr_approver_id (uuid) - Usuario que aprueba                     │
│ status (text) - draft, ai_reviewed, legal_reviewed, approved    │
│ notes (text)                                                    │
│ created_at / approved_at (timestamptz)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 2: Selector de Convenio Colectivo en Contratos

### 2.1 Componente HRCollectiveAgreementSelect
Crear un componente de búsqueda similar a `HRCNOSelect`:
- Búsqueda por nombre o código de convenio
- Filtrado automático por CNAE de la empresa
- Información resumida (pagas extra, jornada, vacaciones)
- Alerta si el convenio está próximo a expirar

### 2.2 Integración en HRContractFormDialog
- Añadir campo **obligatorio** "Convenio Colectivo Aplicable"
- Validación: No permitir guardar contrato sin convenio seleccionado
- Auto-sugerencia basada en el CNAE de la empresa
- Mostrar resumen del convenio seleccionado

### 2.3 Actualización de HREmployeeFormDialog
- Mostrar convenio aplicable del contrato activo
- Información de categoría según tablas salariales del convenio

---

## Fase 3: Motor de Recálculo de Nóminas

### 3.1 Edge Function `erp-hr-payroll-recalculation`
Crear función que realice:

**Entradas:**
- employee_id o lista de empleados
- period (YYYY-MM)
- company_id

**Proceso de Recálculo:**
1. **Obtener datos del empleado y contrato activo**
2. **Cargar convenio colectivo aplicable**
3. **Validar salario base vs. tablas salariales del convenio**
4. **Aplicar conceptos obligatorios del convenio:**
   - Plus de convenio
   - Plus de antigüedad (según reglas del convenio)
   - Plus de nocturnidad (si aplica)
   - Plus de transporte
   - Plus de toxicidad/peligrosidad (según CNAE)
   - Complementos personales
5. **Verificar pagas extraordinarias (14, 15 pagas)**
6. **Calcular cotizaciones SS actualizadas:**
   - Contingencias comunes (23.60% empresa / 4.70% trabajador)
   - Desempleo (según tipo contrato)
   - FOGASA (0.20%)
   - Formación Profesional (0.60% / 0.10%)
   - MEI (0.13%)
7. **Calcular IRPF según situación personal**
8. **Verificar cumplimiento de jornada laboral máxima**
9. **Detectar posibles incumplimientos**

**Salida:**
```json
{
  "recalculated_payroll": {...},
  "differences": [...],
  "compliance_issues": [...],
  "recommendations": [...],
  "requires_legal_review": true/false
}
```

### 3.2 Casuísticas Contempladas (Problemas comunes en RRHH)

| Casuística | Verificación |
|------------|--------------|
| Salario mínimo por categoría | Validar vs. tablas convenio |
| Antigüedad no aplicada | Detectar años y calcular plus |
| Horas extra no compensadas | Verificar registro horario |
| Plus convenio no pagado | Comparar con conceptos obligatorios |
| Pagas extra prorrateadas incorrectamente | Validar cálculo 12/14/15 pagas |
| Jornada parcial mal calculada | Proporcionalidad correcta |
| Nocturnidad sin compensar | Detectar horarios nocturnos |
| Festivos trabajados | Verificar compensación |
| Vacaciones no disfrutadas | Alertar y calcular finiquito |
| IRPF desactualizado | Recalcular según situación |
| Cuotas sindicales | Verificar descuentos si procede |
| Permisos retribuidos | Verificar no descuento |
| Bajas IT | Verificar complementos convenio |
| Teletrabajo | Compensación gastos (Ley 10/2021) |

---

## Fase 4: Validación por IA y Flujo de Aprobación

### 4.1 Revisión Automática por Agente IA RRHH
Extender `erp-hr-ai-agent` con nueva acción `validate_payroll_recalculation`:

```text
Flujo:
1. Recibir recálculo propuesto
2. Analizar coherencia de datos
3. Verificar contra normativa vigente
4. Identificar riesgos de incumplimiento
5. Generar informe de validación
6. Decidir si requiere revisión legal
```

### 4.2 Coordinación con Agente Jurídico
Extender `legal-ai-advisor` para recibir validaciones de nóminas:

```text
Tipos de revisión legal:
- ALTO RIESGO: Salario bajo mínimo convenio
- MEDIO RIESGO: Conceptos obligatorios no incluidos
- BAJO RIESGO: Diferencias menores en cálculos
```

La función `validate_action` del agente jurídico recibirá:
- Datos del recálculo
- Informe del agente RRHH
- Convenio colectivo aplicable
- Jurisdicción

### 4.3 Panel de Aprobación para Responsable RRHH
Crear componente `HRPayrollRecalculationApprovalPanel`:
- Lista de recálculos pendientes de aprobación
- Detalle de diferencias detectadas
- Validación IA visible
- Validación legal visible
- Botones: Aprobar / Rechazar / Solicitar más info
- Comentarios y notas

---

## Fase 5: Interfaz de Usuario

### 5.1 HRPayrollRecalculationPanel (Nuevo Panel Principal)
- Selector de período
- Botón "Recalcular Todas las Nóminas"
- Botón "Recalcular Empleado Específico"
- Tabla con estado de cada recálculo:
  - Empleado | Diferencia | Estado IA | Estado Legal | Estado HR
- Filtros por estado, departamento, tipo de incidencia

### 5.2 HRPayrollRecalculationDialog
- Vista detallada de un recálculo
- Comparativa lado a lado (Original vs. Recalculado)
- Lista de incumplimientos con severidad
- Recomendaciones de la IA
- Opinión del Agente Jurídico
- Formulario de aprobación

### 5.3 HRSalaryConceptsManagerDialog
- CRUD de conceptos salariales personalizados por empresa
- Importar conceptos desde convenio
- Activar/desactivar conceptos por categoría

### 5.4 HRCollectiveAgreementsPanel
- Listado de convenios cargados
- Importador de convenios (manual o desde BOE)
- Alertas de expiración de convenios
- Visor de tablas salariales

---

## Fase 6: Notificaciones y Alertas

### 6.1 Alertas Automáticas
- **Convenio próximo a expirar**: 30, 15, 7 días antes
- **Nuevo convenio publicado**: Según CNAE de la empresa
- **Incumplimiento detectado**: Notificación inmediata
- **Recálculo pendiente de aprobación**: Notificación a Responsable HR

### 6.2 Integración con Panel de Alertas HR
Añadir tipos de alerta:
- `payroll_compliance_issue`
- `agreement_expiring`
- `recalculation_pending_approval`

---

## Fase 7: Base de Conocimiento Jurídico Complementaria

### 7.1 Actualización de Knowledge Base Legal
Añadir documentación específica para nóminas:
- Estatuto de los Trabajadores (Arts. 26-31 sobre salarios)
- Ley General de la Seguridad Social
- Principales convenios colectivos por CNAE
- Doctrina DGT sobre retribuciones
- Jurisprudencia sobre salarios (CENDOJ)

### 7.2 Sincronización Automática
- Detectar actualizaciones de convenios en BOE/BOPA
- Notificar cambios en tipos de cotización SS
- Alertar sobre sentencias relevantes

---

## Arquitectura del Flujo

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE RECÁLCULO DE NÓMINAS                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. INICIO                                                           │
│     └─► Usuario solicita recálculo (manual o automático mensual)     │
│                                                                      │
│  2. MOTOR DE RECÁLCULO (Edge Function)                               │
│     ├─► Cargar datos empleado + contrato + convenio                  │
│     ├─► Aplicar tablas salariales del convenio                       │
│     ├─► Calcular todos los conceptos obligatorios                    │
│     ├─► Verificar SS + IRPF actualizados                             │
│     └─► Detectar diferencias e incumplimientos                       │
│                                                                      │
│  3. VALIDACIÓN IA RRHH                                               │
│     ├─► Analizar coherencia del recálculo                            │
│     ├─► Clasificar riesgo de incumplimiento                          │
│     └─► Decidir si requiere revisión legal                           │
│                                                                      │
│  4. REVISIÓN AGENTE JURÍDICO (si riesgo medio/alto)                  │
│     ├─► Verificar cumplimiento normativo                             │
│     ├─► Evaluar riesgo legal                                         │
│     └─► Emitir dictamen (aprobar/rechazar/modificar)                 │
│                                                                      │
│  5. APROBACIÓN RESPONSABLE HUMANO HR                                 │
│     ├─► Revisar informe completo                                     │
│     ├─► Aprobar / Rechazar / Solicitar cambios                       │
│     └─► Firmar digitalmente la aprobación                            │
│                                                                      │
│  6. APLICACIÓN                                                       │
│     ├─► Actualizar nómina con valores aprobados                      │
│     ├─► Registrar en auditoría                                       │
│     └─► Notificar al empleado si procede                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Crear/Modificar

### Nuevos Archivos
| Archivo | Descripción |
|---------|-------------|
| `src/data/hr/collectiveAgreementsCatalog.ts` | Catálogo inicial de convenios |
| `src/components/erp/hr/shared/HRCollectiveAgreementSelect.tsx` | Selector de convenios |
| `src/components/erp/hr/HRPayrollRecalculationPanel.tsx` | Panel principal de recálculo |
| `src/components/erp/hr/dialogs/HRPayrollRecalculationDialog.tsx` | Detalle de recálculo |
| `src/components/erp/hr/dialogs/HRSalaryConceptsManagerDialog.tsx` | Gestión de conceptos |
| `src/components/erp/hr/HRCollectiveAgreementsPanel.tsx` | Gestión de convenios |
| `src/components/erp/hr/dialogs/HRPayrollApprovalDialog.tsx` | Dialog de aprobación |
| `supabase/functions/erp-hr-payroll-recalculation/index.ts` | Motor de recálculo |
| `src/data/legal/payrollComplianceDocs.ts` | Documentación legal nóminas |

### Archivos a Modificar
| Archivo | Cambios |
|---------|---------|
| `HRContractFormDialog.tsx` | Añadir selector de convenio obligatorio |
| `HRPayrollPanel.tsx` | Integrar acceso a recálculo |
| `HRPayrollEntryDialog.tsx` | Cargar conceptos desde convenio |
| `erp-hr-ai-agent/index.ts` | Nueva acción validate_payroll_recalculation |
| `legal-ai-advisor/index.ts` | Soporte para validación de nóminas |
| `src/components/erp/hr/index.ts` | Exportar nuevos componentes |

---

## Estimación de Esfuerzo

| Fase | Complejidad | Componentes |
|------|-------------|-------------|
| Fase 1 - Base de Datos | Media | 4 migraciones |
| Fase 2 - Selector Convenio | Baja | 2 componentes |
| Fase 3 - Motor Recálculo | Alta | 1 edge function compleja |
| Fase 4 - Validación IA | Alta | 2 edge functions |
| Fase 5 - Interfaz Usuario | Media | 6 componentes |
| Fase 6 - Notificaciones | Baja | Triggers + alertas |
| Fase 7 - Knowledge Base | Baja | Datos estáticos |

---

## Consideraciones Técnicas

1. **Rendimiento**: El recálculo masivo se ejecutará en batch con límite de 50 empleados por llamada
2. **Auditoría**: Todas las operaciones quedarán registradas en `erp_hr_payroll_recalculations`
3. **Seguridad**: RLS restringirá acceso por empresa y rol (solo HR Managers pueden aprobar)
4. **Internacionalización**: Soporte para convenios de España, Andorra y otros países
5. **Escalabilidad**: Arquitectura preparada para múltiples empresas y convenios simultáneos
