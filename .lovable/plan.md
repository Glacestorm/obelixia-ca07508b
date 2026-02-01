
# Plan: Mejora Integral del Módulo RRHH - Operatividad Completa

## Resumen Ejecutivo

Este plan implementa mejoras significativas en el módulo RRHH para hacerlo completamente operativo, añadir funcionalidades innovadoras para 2026+ y garantizar que todos los elementos interactivos funcionen correctamente.

---

## 1. Funcionalidades a Implementar

### 1.1 Restaurar y Mejorar Capacidades de Voz/Micro en el Índice de Ayuda

**Estado actual**: El Agente IA tiene voz y micro, pero el HRHelpIndex no integra estas capacidades.

**Mejora propuesta**:
- Integrar botones de voz y micrófono en HRHelpIndex
- Cuando el usuario haga clic en cualquier opción del menú de ayuda, se ejecutará una consulta al Agente IA automáticamente
- Añadir capacidad de "Pregunta por voz" al índice

**Componente afectado**: `HRHelpIndex.tsx`

```text
┌────────────────────────────────────────────────────────┐
│  ÍNDICE DE AYUDA MEJORADO                              │
├────────────────────────────────────────────────────────┤
│  [🔍 Buscar...]  [🎤 Voz]  [🔊 Auto-lectura]          │
├────────────────────────────────────────────────────────┤
│  📋 Dashboard                                          │
│    └─ KPIs, alertas → [Consultar al Agente IA]        │
│  💰 Nóminas                                            │
│    ├─ Conceptos salariales → [Ver/Crear]              │
│    ├─ Cálculo automático → [Calcular ahora]           │
│    └─ Histórico → [Ver histórico]                     │
│  ...                                                   │
└────────────────────────────────────────────────────────┘
```

---

### 1.2 Botones Operativos en Todo el Módulo

**Paneles afectados y acciones a implementar**:

| Panel | Botones Actuales | Mejora |
|-------|------------------|--------|
| **HRPayrollPanel** | "Calcular Todas", "Exportar", "Ver" | Dialog modal para crear/editar nómina con conceptos |
| **HRVacationsPanel** | "Nueva Solicitud", "Aprobar", "Rechazar" | Dialog modal completo con validaciones |
| **HRHelpIndex** | Opciones del acordeón | Ejecutar consulta al Agente IA o navegar |
| **HRSocialSecurityPanel** | Generar TC, Presentar | Simulación de generación con toast |
| **HRUnionsPanel** | Registrar afiliación | Dialog modal para alta sindical |
| **HREmployeeDocumentsPanel** | Subir documento | Dialog modal de upload real |

---

### 1.3 Sistema de Entrada de Nóminas con Conceptos Completos

**Nuevo componente**: Dialog dentro de `HRPayrollPanel.tsx`

**Funcionalidades**:
- Selección de empleado
- Editor de conceptos salariales (devengos y deducciones)
- Tipos de conceptos según normativa:

```text
DEVENGOS (Conceptos positivos)
├── Fijos
│   ├── Salario base
│   ├── Plus convenio
│   ├── Plus antigüedad
│   ├── Complemento puesto
│   └── Plus transporte
├── Variables
│   ├── Horas extraordinarias
│   ├── Comisiones
│   ├── Incentivos/Bonus
│   ├── Nocturnidad
│   └── Peligrosidad/Toxicidad
└── En especie
    ├── Vehículo empresa
    ├── Seguro médico
    └── Tickets restaurante

DEDUCCIONES (Conceptos negativos)
├── Seguridad Social trabajador
│   ├── Contingencias comunes (4.70%)
│   ├── Desempleo (1.55%/1.60%)
│   ├── Formación profesional (0.10%)
│   └── MEI (0.13% en 2026)
├── IRPF (según tablas y situación personal)
├── Anticipos
├── Préstamos empresa
├── Embargos judiciales
└── Cuota sindical
```

---

### 1.4 Sistema Avanzado de Vacaciones con Reglas Multi-Jurisdicción

**Mejoras en**: `HRVacationsPanel.tsx`

**Nuevas funcionalidades**:

| Funcionalidad | Descripción |
|---------------|-------------|
| **Reglas de no coincidencia** | Configuración por departamento del % máximo de ausencias simultáneas |
| **Validación automática** | Al solicitar vacaciones, verificar conflictos con otros del mismo departamento |
| **Conceptos por jurisdicción** | Días según normativa (España: 30 naturales, Andorra: 30 laborables, Francia: 25 laborables) |
| **Tipos de ausencia** | Vacaciones, asuntos propios, permiso matrimonio, nacimiento, mudanza, etc. |
| **Calendario visual** | Vista de equipo con conflictos destacados |

**Configuración de reglas por departamento**:

```text
┌─────────────────────────────────────────────────────────────┐
│  REGLAS DE VACACIONES POR DEPARTAMENTO                      │
├─────────────────────────────────────────────────────────────┤
│  Departamento: [Producción ▼]                               │
│                                                             │
│  📊 Límite ausencias simultáneas: [30%] del equipo         │
│  📅 Periodo restricción: [15 Jul - 31 Ago] (opcional)      │
│  ⚠️ Días mínimos antelación: [15] días                      │
│  🔄 Prioridad antigüedad: [✓] Sí                           │
│                                                             │
│  CONCEPTOS SEGÚN JURISDICCIÓN:                              │
│  ┌─────────────┬─────────┬───────────────────────────────┐ │
│  │ Jurisdicción│ Días/año│ Base legal                    │ │
│  ├─────────────┼─────────┼───────────────────────────────┤ │
│  │ España      │ 30 nat. │ Art. 38.1 ET                  │ │
│  │ Andorra     │ 30 lab. │ Llei 31/2018 relacions labs.  │ │
│  │ Francia     │ 25 lab. │ Code du travail L3141-3       │ │
│  │ Portugal    │ 22 lab. │ Código do Trabalho art. 238   │ │
│  └─────────────┴─────────┴───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 1.5 Tendencias 2026+ Innovadoras

**Mejora de**: `HRTrends2026Panel.tsx`

**Nuevas funcionalidades estratosféricas**:

| Tendencia | Estado | Descripción | Acción Operativa |
|-----------|--------|-------------|------------------|
| **IA Generativa en Selección** | Coming | Análisis automático de CVs con scoring | Demo interactiva |
| **People Analytics Predictivo** | Active | Predicción de rotación y engagement | Dashboard tiempo real |
| **Bienestar Digital 360** | Coming | Monitorización de burnout y estrés | Encuestas automáticas |
| **Onboarding Inmersivo IA** | Planned | Asistente virtual para nuevos empleados | Simulador de onboarding |
| **Compensación Dinámica AI** | Planned | Ajuste salarial basado en mercado en tiempo real | Comparador salarial |
| **Blockchain Credenciales** | 2027+ | Verificación descentralizada de títulos | Simulador |
| **Gemelos Digitales RRHH** | 2027+ | Simulación de escenarios de plantilla | Sandbox |
| **Neurotech Wellness** | 2028+ | Monitorización cognitiva no invasiva | Concepto |
| **IA Autónoma HR** | 2028+ | Agente que gestiona HR sin intervención | Roadmap |
| **Metaverso Corporativo** | 2028+ | Espacios virtuales de trabajo y formación | Prototipo |

---

### 1.6 Menú de Ayuda con Acciones Ejecutables

**Mejora de**: `HRHelpIndex.tsx`

Al hacer clic en cualquier opción:
1. Si es navegación → Cambiar al tab correspondiente
2. Si es acción → Ejecutar (ej: "Calcular nómina" abre el dialog)
3. Si es consulta → Enviar pregunta al Agente IA automáticamente

**Nuevas acciones rápidas**:

```text
ACCIONES DIRECTAS DESDE EL ÍNDICE
├── 💰 Calcular nómina → Abre dialog de cálculo
├── 📋 Nuevo contrato → Abre wizard de contrato
├── 🏖️ Solicitar vacaciones → Abre formulario
├── 📄 Generar TC1/TC2 → Ejecuta generación
├── 🧮 Calcular finiquito → Abre calculadora IA
├── 📊 Ver cotizaciones SS → Navega a tab SS
└── ❓ Consultar normativa → Envía al Agente IA
```

---

## 2. Componentes a Modificar/Crear

### 2.1 Componentes a Modificar

| Archivo | Cambios |
|---------|---------|
| `HRPayrollPanel.tsx` | Añadir Dialog de creación/edición de nómina con conceptos |
| `HRVacationsPanel.tsx` | Añadir Dialog de solicitud, validación de conflictos, reglas por departamento |
| `HRHelpIndex.tsx` | Añadir acciones ejecutables, integración con Agente IA, botones de voz |
| `HRTrends2026Panel.tsx` | Expandir con tendencias innovadoras y demos interactivas |
| `HRModule.tsx` | Manejar navegación desde HRHelpIndex |
| `HRSocialSecurityPanel.tsx` | Hacer operativos los botones de generación |
| `HRUnionsPanel.tsx` | Añadir dialog de alta sindical |
| `HREmployeeDocumentsPanel.tsx` | Integrar upload real con storage |

### 2.2 Nuevos Componentes

| Archivo | Descripción |
|---------|-------------|
| `HRPayrollEntryDialog.tsx` | Dialog modal para crear/editar nómina con todos los conceptos |
| `HRVacationRequestDialog.tsx` | Dialog para solicitud de vacaciones con validaciones |
| `HRVacationRulesConfig.tsx` | Configurador de reglas por departamento |
| `HRTrendsDemo.tsx` | Componente para demos interactivas de tendencias 2026+ |

---

## 3. Lógica de Validación de Vacaciones

### 3.1 Regla de No Coincidencia

```text
ALGORITMO DE VALIDACIÓN

1. Obtener departamento del empleado solicitante
2. Obtener reglas del departamento:
   - max_simultaneous_percentage (ej: 30%)
   - min_advance_days (ej: 15)
   - restricted_periods (ej: verano)
   
3. Para el rango de fechas solicitado:
   a. Contar empleados del departamento
   b. Contar vacaciones ya aprobadas que solapen
   c. Si (aprobadas + 1) / total > max_percentage:
      → RECHAZAR con mensaje de conflicto
      
4. Verificar días de antelación:
   - Si días_hasta_inicio < min_advance_days:
     → ADVERTIR o RECHAZAR según configuración
     
5. Verificar saldo disponible:
   - dias_solicitados <= saldo_restante
   
6. Si todas las validaciones pasan:
   → APROBAR o PENDIENTE según flujo
```

### 3.2 Conceptos por Jurisdicción

```text
JURISDICCIÓN: ESPAÑA
├── Vacaciones: 30 días naturales (Art. 38.1 ET)
├── Matrimonio: 15 días naturales (Art. 37.3.a ET)
├── Nacimiento hijo: 16 semanas (RD-Ley 6/2019)
├── Fallecimiento familiar: 2-4 días
├── Mudanza: 1 día
├── Deber inexcusable: Tiempo indispensable
└── Lactancia: 1h/día o 9 días adicionales

JURISDICCIÓN: ANDORRA
├── Vacaciones: 30 días laborables
├── Matrimonio: 5 días laborables
├── Nacimiento: 20 semanas (Llei 13/2019)
└── Fallecimiento: 2-5 días según parentesco

JURISDICCIÓN: FRANCIA
├── Vacaciones: 25 días laborables + RTT
├── Matrimonio/PACS: 4 días
├── Nacimiento: 28 días (paternité)
└── Congé parental: Hasta 3 años
```

---

## 4. Actualización del Agente IA

**Edge Function**: `erp-hr-ai-agent/index.ts`

**Nuevas acciones a añadir**:
- `get_vacation_conflicts` - Verificar conflictos de vacaciones
- `get_department_rules` - Obtener reglas de departamento
- `create_payroll_entry` - Crear entrada de nómina
- `get_help_topic` - Obtener información de un tema específico

---

## 5. Nuevas Tablas (Migración)

```sql
-- Reglas de vacaciones por departamento
CREATE TABLE IF NOT EXISTS erp_hr_vacation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES erp_hr_departments(id) ON DELETE CASCADE,
  max_simultaneous_percentage NUMERIC(5,2) DEFAULT 30.00,
  min_advance_days INTEGER DEFAULT 15,
  priority_by_seniority BOOLEAN DEFAULT true,
  restricted_start_date DATE,
  restricted_end_date DATE,
  jurisdiction TEXT DEFAULT 'ES',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conceptos de permisos por jurisdicción
CREATE TABLE IF NOT EXISTS erp_hr_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  days_entitled INTEGER,
  is_paid BOOLEAN DEFAULT true,
  legal_reference TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(code, jurisdiction)
);

-- Insertar tipos de permiso por jurisdicción
INSERT INTO erp_hr_leave_types (code, name, jurisdiction, days_entitled, is_paid, legal_reference) VALUES
-- España
('vacation', 'Vacaciones anuales', 'ES', 30, true, 'Art. 38.1 ET'),
('marriage', 'Matrimonio', 'ES', 15, true, 'Art. 37.3.a ET'),
('birth', 'Nacimiento/adopción', 'ES', 112, true, 'RD-Ley 6/2019'),
('death_1st', 'Fallecimiento 1º grado', 'ES', 4, true, 'Art. 37.3.b ET'),
('death_2nd', 'Fallecimiento 2º grado', 'ES', 2, true, 'Art. 37.3.b ET'),
('moving', 'Traslado domicilio', 'ES', 1, true, 'Art. 37.3.c ET'),
-- Andorra
('vacation', 'Vacances anuals', 'AD', 30, true, 'Llei 31/2018 art. 36'),
('marriage', 'Matrimoni', 'AD', 5, true, 'Llei 31/2018 art. 37'),
('birth', 'Naixement/adopció', 'AD', 140, true, 'Llei 13/2019'),
-- Francia
('vacation', 'Congés payés', 'FR', 25, true, 'Code travail L3141-3'),
('marriage', 'Mariage/PACS', 'FR', 4, true, 'Code travail L3142-1'),
('birth_father', 'Congé paternité', 'FR', 28, true, 'L1225-35');
```

---

## 6. Secuencia de Implementación

```text
FASE 1 - Infraestructura (15 min)
├── Migración SQL: erp_hr_vacation_rules, erp_hr_leave_types
└── RLS policies

FASE 2 - Nóminas Operativas (25 min)
├── HRPayrollEntryDialog.tsx (dialog con conceptos)
├── Actualizar HRPayrollPanel.tsx
└── Conectar con DB

FASE 3 - Vacaciones Avanzadas (25 min)
├── HRVacationRequestDialog.tsx
├── HRVacationRulesConfig.tsx
├── Lógica de validación de conflictos
└── Actualizar HRVacationsPanel.tsx

FASE 4 - Índice de Ayuda Operativo (15 min)
├── Añadir acciones ejecutables a HRHelpIndex.tsx
├── Integrar con Agente IA (voz)
└── Navegación entre tabs

FASE 5 - Tendencias 2026+ (20 min)
├── Expandir HRTrends2026Panel.tsx
├── Añadir demos interactivas
└── Roadmap visual

FASE 6 - Botones Operativos Generales (15 min)
├── HRSocialSecurityPanel.tsx (generar TC)
├── HRUnionsPanel.tsx (alta sindical)
├── HREmployeeDocumentsPanel.tsx (upload real)
└── Testing integral
```

---

## 7. Tiempo Estimado

| Fase | Componentes | Tiempo |
|------|-------------|--------|
| 1 | Infraestructura DB | 15 min |
| 2 | Nóminas operativas | 25 min |
| 3 | Vacaciones avanzadas | 25 min |
| 4 | Índice ayuda operativo | 15 min |
| 5 | Tendencias 2026+ | 20 min |
| 6 | Botones operativos | 15 min |
| **TOTAL** | | **~2 horas** |

---

## 8. Cumplimiento Normativo

Todas las funcionalidades cumplirán con:

| Normativa | Aplicación |
|-----------|------------|
| Estatuto de los Trabajadores (RDL 2/2015) | Vacaciones, permisos, contratos |
| Ley General de Seguridad Social (RDL 8/2015) | Cotizaciones, bases |
| RGPD/LOPDGDD | Protección datos empleados |
| Llei 31/2018 (Andorra) | Vacaciones y permisos Andorra |
| Code du Travail (Francia) | Vacaciones y permisos Francia |
| Código do Trabalho (Portugal) | Vacaciones y permisos Portugal |
