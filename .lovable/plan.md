
# Plan: Expansión Integral del Módulo de RRHH

## Resumen Ejecutivo

Este plan implementa una expansión completa del módulo de RRHH con **7 nuevos servicios y mejoras** que convertirán el módulo en una solución enterprise completa para la gestión de personal.

---

## 1. Nuevos Servicios a Implementar

### 1.1 Sistema de Nóminas Completo con Todos los Conceptos

**Estado actual**: Panel básico con datos demo y campos limitados (bruto, IRPF, SS, extras)

**Mejoras propuestas**:

```text
┌────────────────────────────────────────────────────────────────────┐
│                    CONCEPTOS SALARIALES COMPLETOS                   │
├────────────────────────────────────────────────────────────────────┤
│ DEVENGOS                          │ DEDUCCIONES                    │
├───────────────────────────────────┼────────────────────────────────┤
│ • Salario base                    │ • Contingencias comunes (4.70%)│
│ • Complementos personales         │ • Desempleo (1.55/1.60%)       │
│ • Plus antigüedad                 │ • Formación profesional (0.10%)│
│ • Plus convenio                   │ • IRPF (según tablas)          │
│ • Horas extraordinarias           │ • Anticipos                    │
│ • Nocturnidad                     │ • Embargos judiciales          │
│ • Peligrosidad/toxicidad          │ • Préstamos empresa            │
│ • Plus transporte                 │ • Cuota sindical               │
│ • Plus productividad              │ • Otros legales                │
│ • Dietas/Kilometraje              │                                │
│ • Comisiones/Incentivos           │                                │
│ • Pagas extraordinarias           │                                │
│ • Complementos en especie         │                                │
│ • Horas complementarias (parcial) │                                │
└───────────────────────────────────┴────────────────────────────────┘
```

**Nuevos componentes**:
- `HRPayrollConceptsEditor.tsx` - Editor de conceptos salariales personalizados
- `HRPayrollCalculator.tsx` - Calculadora automática de nóminas
- `HRPayrollHistory.tsx` - Histórico de nóminas por empleado

---

### 1.2 Servicio de Seguridad Social

**Nuevo componente**: `HRSocialSecurityPanel.tsx`

**Funcionalidades**:

| Función | Descripción |
|---------|-------------|
| **Cotizaciones** | Cálculo de bases y tipos (CC, AT/EP, Desempleo, FOGASA, FP) |
| **Boletines TC1/TC2** | Generación y presentación electrónica via TGSS |
| **Altas/Bajas** | Gestión de afiliación vía Sistema RED |
| **Variaciones** | Comunicación de cambios contractuales |
| **Certificados** | Solicitud de vida laboral, bases cotización |
| **SILTRA** | Integración con remesas de liquidación |
| **Aplazamientos** | Gestión de fraccionamientos de deuda |

**Tablas de base de datos a crear**:
- `erp_hr_ss_contributions` - Cotizaciones calculadas
- `erp_hr_ss_filings` - Presentaciones electrónicas
- `erp_hr_ss_certificates` - Certificados solicitados

---

### 1.3 Servicio de Sindicatos y Representación Laboral

**Nuevo componente**: `HRUnionsPanel.tsx`

**Funcionalidades**:
- Registro de afiliación sindical por empleado
- Retención de cuota sindical en nómina
- Gestión de delegados sindicales y comité de empresa
- Horas sindicales (crédito horario art. 68 ET)
- Tablón sindical virtual
- Elecciones sindicales
- Convenios y negociación colectiva
- Permisos retribuidos por funciones sindicales

---

### 1.4 Documentación Contractual por Empleado

**Nuevo componente**: `HREmployeeDocumentsPanel.tsx`

**Funcionalidades**:
- Upload de documentos por empleado (cualquier formato)
- Categorías: contrato, anexos, certificados, títulos, DNI, vida laboral, etc.
- Versionado de documentos
- Fechas de caducidad y alertas
- Firma digital integrada
- Historial de visualizaciones (auditoría)
- Integración con el Agente IA para consultas

**Nueva tabla**: `erp_hr_employee_documents`
**Nuevo bucket de storage**: `hr-employee-documents`

---

### 1.5 Sistema de Ayuda con Índice Completo

**Mejora de**: `HRHelpPanel.tsx`

**Nuevo índice estructurado de servicios**:

```text
📋 ÍNDICE DE SERVICIOS DEL MÓDULO RRHH
├── 1. Dashboard
│   └── Resumen, KPIs, alertas
├── 2. Nóminas
│   ├── 2.1 Generación de nóminas
│   ├── 2.2 Conceptos salariales
│   ├── 2.3 Histórico
│   └── 2.4 Exportación/Remesas bancarias
├── 3. Seguridad Social
│   ├── 3.1 Cotizaciones
│   ├── 3.2 Presentaciones RED/SILTRA
│   ├── 3.3 Certificados
│   └── 3.4 Aplazamientos
├── 4. Sindicatos
│   ├── 4.1 Afiliación
│   ├── 4.2 Representantes
│   ├── 4.3 Elecciones
│   └── 4.4 Crédito horario
├── 5. Contratos
│   ├── 5.1 Tipos de contrato
│   ├── 5.2 Finiquitos
│   └── 5.3 Indemnizaciones
├── 6. Documentación
│   └── 6.1 Subida por empleado
├── 7. Organigrama
│   ├── 7.1 Estructura
│   ├── 7.2 Asignación empleados
│   └── 7.3 Categorías/Salarios
├── 8. Vacaciones
├── 9. Seguridad (PRL)
├── 10. Agente IA
└── 11. Normativa
```

---

### 1.6 Organigrama Personalizable con Empleados

**Mejora de**: `HRDepartmentsPanel.tsx`

**Nuevas funcionalidades**:

| Función | Descripción |
|---------|-------------|
| **Edición visual** | Arrastrar y soltar empleados entre departamentos |
| **Perfiles de empleado** | Nombre, categoría, salario, fecha incorporación |
| **Atribuciones salariales** | Asignar complementos por puesto/departamento |
| **Niveles jerárquicos** | Director → Manager → Supervisor → Empleado |
| **Líneas de reporte** | Definir jefes directos |
| **Exportar organigrama** | PDF/PNG del organigrama visual |

**Nueva tabla**: `erp_hr_employees` (ficha completa del empleado)
**Nueva tabla**: `erp_hr_employee_positions` (asignación a departamento/posición)

---

### 1.7 Actualización del Agente IA

**Mejora de**: `HRAIAgentPanel.tsx` y Edge Function `erp-hr-ai-agent`

**Nuevas capacidades a añadir**:
- Consultar documentación contractual de empleados
- Asesorar sobre cotizaciones SS
- Gestionar afiliación sindical
- Conocer toda la estructura organizativa
- Responder sobre cualquier servicio del índice de ayuda

---

## 2. Esquema de Base de Datos

### Nuevas Tablas

```sql
-- Empleados (ficha maestra)
CREATE TABLE erp_hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id),
  user_id UUID REFERENCES auth.users(id),
  employee_code TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  national_id TEXT, -- DNI/NIE/Pasaporte
  ss_number TEXT, -- Número Seguridad Social
  birth_date DATE,
  gender TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  bank_account TEXT, -- IBAN
  hire_date DATE NOT NULL,
  termination_date DATE,
  status TEXT DEFAULT 'active',
  department_id UUID,
  position_id UUID,
  category TEXT,
  job_title TEXT,
  base_salary NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos de empleado
CREATE TABLE erp_hr_employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id),
  document_type TEXT NOT NULL, -- contrato, anexo, dni, titulo, certificado...
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  expiry_date DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cotizaciones SS
CREATE TABLE erp_hr_ss_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_workers INTEGER,
  base_cc NUMERIC(12,2), -- Base contingencias comunes
  base_at NUMERIC(12,2), -- Base accidentes trabajo
  cc_company NUMERIC(12,2),
  cc_worker NUMERIC(12,2),
  unemployment_company NUMERIC(12,2),
  unemployment_worker NUMERIC(12,2),
  fogasa NUMERIC(12,2),
  fp_company NUMERIC(12,2),
  fp_worker NUMERIC(12,2),
  at_ep NUMERIC(12,2),
  total_company NUMERIC(12,2),
  total_worker NUMERIC(12,2),
  total NUMERIC(12,2),
  status TEXT DEFAULT 'calculated',
  filing_id TEXT, -- Referencia presentación TGSS
  filed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Afiliación sindical
CREATE TABLE erp_hr_union_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES erp_hr_employees(id),
  union_name TEXT NOT NULL,
  union_code TEXT,
  membership_date DATE NOT NULL,
  end_date DATE,
  monthly_fee NUMERIC(8,2),
  payroll_deduction BOOLEAN DEFAULT true,
  is_representative BOOLEAN DEFAULT false,
  representative_type TEXT, -- delegado, comite_empresa, seccion_sindical
  credit_hours_monthly INTEGER, -- horas sindicales
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conceptos salariales personalizados
CREATE TABLE erp_hr_payroll_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES erp_companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  concept_type TEXT NOT NULL, -- devengo, deduccion
  category TEXT, -- fijo, variable, en_especie
  default_amount NUMERIC(12,2),
  is_percentage BOOLEAN DEFAULT false,
  percentage_base TEXT, -- salario_base, bruto, etc
  cotiza_ss BOOLEAN DEFAULT true,
  tributa_irpf BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Nuevos Componentes UI

| Archivo | Descripción |
|---------|-------------|
| `HRSocialSecurityPanel.tsx` | Gestión completa de SS |
| `HRUnionsPanel.tsx` | Afiliación y representación sindical |
| `HREmployeeDocumentsPanel.tsx` | Documentación por empleado |
| `HRPayrollConceptsEditor.tsx` | Editor de conceptos salariales |
| `HREmployeeProfile.tsx` | Ficha completa del empleado |
| `HROrgChartEditor.tsx` | Editor visual de organigrama |
| `HRHelpIndex.tsx` | Índice interactivo de servicios |

---

## 4. Actualización de Navegación

**Archivo**: `HRModule.tsx`

Añadir nuevas pestañas:
- **Empleados** (fichas completas)
- **Seguridad Social** (cotizaciones, RED)
- **Sindicatos** (afiliación, representantes)
- **Documentos** (por empleado)

Nueva estructura de tabs (14 pestañas):

```
Dashboard | Empleados | Nóminas | Seg.Social | Vacaciones | Contratos | 
Sindicatos | Documentos | Organización | Seguridad | Agente IA | 
Noticias | Normativa | Ayuda
```

---

## 5. Actualización del Agente IA

**Edge Function**: `erp-hr-ai-agent/index.ts`

Nuevas acciones:
- `get_employee_documents` - Consultar documentos de empleado
- `calculate_ss_contribution` - Calcular cotizaciones SS
- `manage_union_membership` - Gestionar afiliación sindical
- `query_help_index` - Consultar índice de ayuda

---

## 6. Storage Bucket

Crear bucket `hr-employee-documents` con:
- RLS para acceso por empresa
- Políticas de lectura/escritura según rol
- Límite de tamaño por archivo

---

## 7. Secuencia de Implementación

```text
FASE 1 (Infraestructura)
├── Migración SQL: nuevas tablas
├── Bucket storage: hr-employee-documents
└── RLS policies

FASE 2 (Empleados y Documentos)
├── HREmployeeProfile.tsx
├── HREmployeeDocumentsPanel.tsx
└── Integración con Agente IA

FASE 3 (Nóminas Avanzadas)
├── HRPayrollConceptsEditor.tsx
├── Actualización HRPayrollPanel.tsx
└── Nuevas acciones Edge Function

FASE 4 (Seguridad Social)
├── HRSocialSecurityPanel.tsx
└── Generación TC1/TC2

FASE 5 (Sindicatos)
├── HRUnionsPanel.tsx
├── Retención cuota en nómina
└── Crédito horario

FASE 6 (Organigrama)
├── HROrgChartEditor.tsx
├── Asignación empleados visual
└── Exportación PDF

FASE 7 (Ayuda)
├── HRHelpIndex.tsx (índice completo)
└── Actualización HRHelpPanel.tsx

FASE 8 (Integración)
├── Actualización HRModule.tsx (nueva navegación)
├── Actualización erp-hr-ai-agent
└── Testing integral
```

---

## 8. Tiempo Estimado

| Fase | Componentes | Tiempo |
|------|-------------|--------|
| 1 | Infraestructura DB | 15 min |
| 2 | Empleados + Docs | 25 min |
| 3 | Nóminas avanzadas | 20 min |
| 4 | Seguridad Social | 20 min |
| 5 | Sindicatos | 15 min |
| 6 | Organigrama | 20 min |
| 7 | Ayuda | 10 min |
| 8 | Integración | 15 min |
| **TOTAL** | | **~2-2.5 horas** |

---

## 9. Cumplimiento Normativo

Todas las funcionalidades cumplirán con:
- Estatuto de los Trabajadores (RDL 2/2015)
- Ley General de Seguridad Social (RDL 8/2015)
- Ley Orgánica de Libertad Sindical (11/1985)
- RGPD/LOPDGDD para datos de empleados
- Convenios colectivos aplicables según CNAE

