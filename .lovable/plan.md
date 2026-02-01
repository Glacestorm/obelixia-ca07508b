
# Plan de Implementacion - Mejora Integral del Modulo RRHH

## Estado Actual

Tras el analisis exhaustivo del codigo existente, he identificado los siguientes componentes y su estado:

### Componentes Existentes Analizados

| Componente | Estado | Mejoras Requeridas |
|------------|--------|-------------------|
| `HRPayrollPanel.tsx` | Basico | Añadir dialog de entrada de nomina con conceptos |
| `HRVacationsPanel.tsx` | Basico | Añadir dialog de solicitud con validacion de conflictos |
| `HRHelpIndex.tsx` | Funcional | Añadir acciones ejecutables y voz |
| `HRAIAgentPanel.tsx` | Completo con voz | Referencia para integrar voz en HelpIndex |
| `HRTrends2026Panel.tsx` | Minimo | Expandir con tendencias innovadoras |
| `HRModule.tsx` | 14 tabs | Añadir navegacion desde HelpIndex |
| `erp-hr-ai-agent` | Funcional | Añadir acciones de vacaciones y nominas |

---

## Fase 1: Infraestructura de Base de Datos

### Migracion SQL Requerida

Crear archivo: `supabase/migrations/20260201150000_hr_vacation_rules_leave_types.sql`

**Tablas a crear:**

1. **erp_hr_vacation_rules** - Reglas de vacaciones por departamento
   - max_simultaneous_percentage (30% por defecto)
   - min_advance_days (15 dias)
   - priority_by_seniority
   - restricted_start_date / restricted_end_date
   - jurisdiction (ES, AD, FR, PT)

2. **erp_hr_leave_types** - Tipos de permiso por jurisdiccion
   - code, name, jurisdiction
   - days_entitled, is_calendar_days
   - is_paid, requires_documentation
   - legal_reference, description

3. **erp_hr_leave_requests** - Solicitudes de vacaciones/permisos
   - employee_id, leave_type_id
   - start_date, end_date, days_requested
   - status, conflict_employees, conflict_percentage
   - validation_warnings

4. **erp_hr_leave_balances** - Saldos por empleado y año
   - entitled_days, used_days, pending_days
   - carried_over_days, remaining_days (calculado)

**Datos iniciales por jurisdiccion:**

| Jurisdiccion | Vacaciones | Matrimonio | Nacimiento | Base Legal |
|--------------|------------|------------|------------|------------|
| España (ES) | 30 nat. | 15 nat. | 16 sem | ET, RDL 6/2019 |
| Andorra (AD) | 30 lab. | 5 lab. | 20 sem | Llei 31/2018 |
| Francia (FR) | 25 lab. | 4 lab. | 28 dias | Code Travail |
| Portugal (PT) | 22 lab. | 15 nat. | 28 dias | Codigo Trabalho |

---

## Fase 2: Componentes de Nominas

### Nuevo Archivo: `HRPayrollEntryDialog.tsx`

**Funcionalidades:**

- Selector de empleado con datos precargados
- Editor de conceptos salariales con 3 categorias:
  - **Devengos Fijos**: Salario base, plus convenio, antigüedad, complemento puesto, transporte
  - **Devengos Variables**: Horas extra, comisiones, bonus, nocturnidad, peligrosidad, dietas, km
  - **Deducciones**: SS (CC, desempleo, FP, MEI), IRPF, anticipos, prestamos, embargos, cuota sindical

- Tipos SS 2026:
  - CC trabajador: 4.70%
  - Desempleo: 1.55% (general) / 1.60% (temporal)
  - FP: 0.10%
  - MEI: 0.13%

- Calculo automatico de:
  - Base cotizacion SS
  - Base IRPF
  - Total deducciones
  - Salario neto
  - Coste empresa (SS empresa 29.90%)

### Modificacion: `HRPayrollPanel.tsx`

- Añadir boton "Nueva Nomina" que abre HRPayrollEntryDialog
- Conectar boton "Ver" a dialog de visualizacion
- Hacer funcional "Calcular Todas"
- Hacer funcional "Exportar" (generacion CSV/SEPA)

---

## Fase 3: Sistema de Vacaciones Avanzado

### Nuevo Archivo: `HRVacationRequestDialog.tsx`

**Funcionalidades:**

1. **Visualizacion de saldo** - Dias disponibles, usados, pendientes
2. **Selector de tipo de permiso** - Cargados desde erp_hr_leave_types por jurisdiccion
3. **Selector de fechas** - Con calendar picker
4. **Opcion media jornada** - Solo para dias unicos
5. **Validacion de conflictos**:
   - Consulta empleados del mismo departamento con vacaciones aprobadas
   - Calcula porcentaje de ausencia
   - Compara con max_simultaneous_percentage de reglas
   - Muestra alerta si supera limite

6. **Validaciones adicionales**:
   - Dias de antelacion minimos
   - Saldo disponible
   - Documentacion requerida segun tipo

7. **Indicador de compañeros de vacaciones**

### Nuevo Archivo: `HRVacationRulesConfig.tsx`

**Funcionalidades:**

- Configuracion de reglas por departamento
- Porcentaje maximo simultaneo
- Dias minimos de antelacion
- Periodos restringidos (blackout)
- Prioridad por antigüedad

### Modificacion: `HRVacationsPanel.tsx`

- Boton "Nueva Solicitud" abre HRVacationRequestDialog
- Botones "Aprobar/Rechazar" funcionales con confirmacion
- Vista calendario con conflictos destacados
- Añadir tab de configuracion de reglas

---

## Fase 4: Indice de Ayuda Operativo

### Modificacion: `HRHelpIndex.tsx`

**Nuevas funcionalidades:**

1. **Integracion de voz** (copiando patron de HRAIAgentPanel):
   - Boton de microfono para preguntas por voz
   - Boton de auto-lectura de respuestas
   - Uso de Web Speech API

2. **Acciones ejecutables al hacer clic**:
   - Navegacion a tabs correspondientes
   - Apertura de dialogs (calcular nomina, solicitar vacaciones)
   - Consulta automatica al Agente IA

3. **Acciones rapidas mejoradas** (badges clicables):
   - Calcular nomina -> Abre HRPayrollEntryDialog
   - Finiquito -> Consulta al Agente IA
   - Cotizaciones SS -> Navega a tab SS
   - Vacaciones -> Abre HRVacationRequestDialog
   - Contratos -> Navega a tab contratos

4. **Prop callback para navegacion**:
   - onNavigate recibe el codigo de seccion
   - HRModule escucha y cambia de tab

### Modificacion: `HRModule.tsx`

- Añadir estado para controlar dialogs abiertos
- Pasar callback onNavigate a HRHelpIndex
- Manejar cambio de tab desde ayuda

---

## Fase 5: Tendencias 2026+ Innovadoras

### Modificacion: `HRTrends2026Panel.tsx`

**Expansion de tendencias:**

| Tendencia | Estado | Descripcion | Demo |
|-----------|--------|-------------|------|
| IA Generativa Seleccion | Coming | Analisis automatico CVs | Simulador scoring |
| People Analytics Predictivo | Active | Prediccion rotacion | Dashboard metricas |
| Bienestar Digital 360 | Coming | Monitorizacion burnout | Encuesta demo |
| Onboarding Inmersivo IA | Planned | Asistente virtual | Wizard interactivo |
| Compensacion Dinamica AI | Planned | Ajuste salarial mercado | Comparador |
| Blockchain Credenciales | 2027+ | Verificacion titulos | Concepto |
| Gemelos Digitales RRHH | 2027+ | Simulacion plantilla | Sandbox |
| Neurotech Wellness | 2028+ | Monitorizacion cognitiva | Roadmap |
| IA Autonoma HR | 2028+ | Agente autogestivo | Vision |
| Metaverso Corporativo | 2028+ | Espacios virtuales | Prototipo |

**Nueva estructura:**

- Seccion "Activas" con demos funcionales
- Seccion "Proximamente" con previews
- Seccion "Roadmap 2027-2028" con vision
- Timeline visual interactivo

---

## Fase 6: Botones Operativos Generales

### Modificacion: `HRSocialSecurityPanel.tsx`

- Boton "Generar TC1/TC2" -> Toast de simulacion con datos
- Boton "Presentar RED" -> Confirmacion y estado
- Boton "Solicitar Certificado" -> Dialog de tipo de certificado

### Modificacion: `HRUnionsPanel.tsx`

- Boton "Registrar Afiliacion" -> Dialog de alta sindical
- Gestion de cuota sindical en nomina
- Credito horario editable

### Modificacion: `HREmployeeDocumentsPanel.tsx`

- Upload real al bucket hr-employee-documents (si existe)
- Previsualizacion de documentos
- Alertas de caducidad funcionales

---

## Archivos a Crear/Modificar

### Nuevos Archivos (6)

1. `supabase/migrations/20260201150000_hr_vacation_rules_leave_types.sql`
2. `src/components/erp/hr/HRPayrollEntryDialog.tsx`
3. `src/components/erp/hr/HRVacationRequestDialog.tsx`
4. `src/components/erp/hr/HRVacationRulesConfig.tsx`
5. `src/components/erp/hr/HRTrendsDemo.tsx`
6. Actualizacion de `src/components/erp/hr/index.ts`

### Archivos a Modificar (8)

1. `src/components/erp/hr/HRPayrollPanel.tsx` - Integracion dialog
2. `src/components/erp/hr/HRVacationsPanel.tsx` - Integracion dialog + reglas
3. `src/components/erp/hr/HRHelpIndex.tsx` - Voz + acciones ejecutables
4. `src/components/erp/hr/HRTrends2026Panel.tsx` - Expansion innovadora
5. `src/components/erp/hr/HRModule.tsx` - Navegacion desde ayuda
6. `src/components/erp/hr/HRSocialSecurityPanel.tsx` - Botones operativos
7. `src/components/erp/hr/HRUnionsPanel.tsx` - Botones operativos
8. `src/components/erp/hr/HREmployeeDocumentsPanel.tsx` - Upload real

---

## Secuencia de Implementacion

```
FASE 1 (15 min)
├── Crear migracion SQL
├── Tablas: vacation_rules, leave_types, leave_requests, leave_balances
├── RLS policies
└── Seed data por jurisdiccion (ES, AD, FR, PT)

FASE 2 (25 min)
├── Crear HRPayrollEntryDialog.tsx
├── Modificar HRPayrollPanel.tsx
├── Integrar conceptos salariales completos
└── Calculos SS e IRPF automaticos

FASE 3 (25 min)
├── Crear HRVacationRequestDialog.tsx
├── Crear HRVacationRulesConfig.tsx
├── Modificar HRVacationsPanel.tsx
└── Logica de validacion de conflictos

FASE 4 (15 min)
├── Modificar HRHelpIndex.tsx (voz + acciones)
├── Modificar HRModule.tsx (navegacion)
└── Integrar callbacks

FASE 5 (20 min)
├── Expandir HRTrends2026Panel.tsx
├── Crear HRTrendsDemo.tsx
└── Añadir demos interactivas

FASE 6 (15 min)
├── Modificar HRSocialSecurityPanel.tsx
├── Modificar HRUnionsPanel.tsx
├── Modificar HREmployeeDocumentsPanel.tsx
└── Testing integral
```

---

## Tiempo Total Estimado

| Fase | Tiempo |
|------|--------|
| 1 - Infraestructura DB | 15 min |
| 2 - Nominas operativas | 25 min |
| 3 - Vacaciones avanzadas | 25 min |
| 4 - Indice ayuda operativo | 15 min |
| 5 - Tendencias 2026+ | 20 min |
| 6 - Botones operativos | 15 min |
| **TOTAL** | **~2 horas** |

---

## Cumplimiento Normativo

Todas las funcionalidades cumplen con:

- Estatuto de los Trabajadores (RDL 2/2015)
- Ley General de Seguridad Social (RDL 8/2015)
- RGPD/LOPDGDD para datos de empleados
- Llei 31/2018 (Andorra)
- Code du Travail (Francia)
- Codigo do Trabalho (Portugal)
