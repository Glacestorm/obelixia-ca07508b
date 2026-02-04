
# Plan de Implementación: Sistema de Alertas de Cumplimiento Legal y Comunicaciones Obligatorias

## Resumen Ejecutivo

Se implementará un sistema integral de alertas y automatización para:
1. **Comunicaciones obligatorias con empleados** (despidos, modificaciones contractuales, cambios de convenio)
2. **Obligaciones con administraciones públicas** (Seguridad Social, Hacienda, SEPE, inspección)
3. **Sistema de pre-alertas para evitar sanciones** (basado en LISOS - Ley de Infracciones y Sanciones del Orden Social)
4. **Comunicaciones automáticas** con formularios oficiales y checklist de cumplimiento
5. **Coordinación con Agentes IA** (RRHH y Jurídico) para seguimiento y defensa

---

## Fase 1: Infraestructura de Base de Datos

### 1.1 Nuevas Tablas

```text
┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_legal_communications                                    │
├─────────────────────────────────────────────────────────────────┤
│ - Registro de todas las comunicaciones obligatorias             │
│ - Tipos: despido, modificación sustancial, ERTE, cambio turno   │
│ - Estados: borrador, enviada, recibida, firmada, archivada      │
│ - Plazos legales y fechas límite                               │
│ - Canales: carta certificada, burofax, email certificado, mano  │
│ - Acuse de recibo y firma digital                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_admin_obligations                                       │
├─────────────────────────────────────────────────────────────────┤
│ - Obligaciones con AAPP por jurisdicción (ES, AD, EU)           │
│ - Tipos: declaración, comunicación, liquidación, certificado    │
│ - Periodicidad: mensual, trimestral, anual, puntual             │
│ - Organismo: TGSS, AEAT, SEPE, ITSS, FOGASA                     │
│ - Modelo oficial y plazos                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_obligation_deadlines                                    │
├─────────────────────────────────────────────────────────────────┤
│ - Calendario de vencimientos por empresa                        │
│ - Estado: pendiente, en_proceso, completada, vencida            │
│ - Responsable asignado                                          │
│ - Documentación adjunta                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_sanction_risks                                          │
├─────────────────────────────────────────────────────────────────┤
│ - Catálogo de infracciones LISOS y otras normativas             │
│ - Clasificación: leve, grave, muy grave                         │
│ - Cuantías de sanción (mín/máx por grado)                       │
│ - Artículos de referencia                                       │
│ - Medidas preventivas                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_sanction_alerts                                         │
├─────────────────────────────────────────────────────────────────┤
│ - Pre-alertas de riesgo de sanción                              │
│ - Nivel: prealerta, alerta, urgente, crítico                    │
│ - Días restantes para vencimiento                               │
│ - Notificación a Agente IA RRHH                                │
│ - Escalado a Agente IA Jurídico                                 │
│ - Acciones correctivas propuestas                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_communication_templates                                 │
├─────────────────────────────────────────────────────────────────┤
│ - Plantillas de comunicaciones oficiales                        │
│ - Por tipo: despido objetivo, disciplinario, ERTE, etc.         │
│ - Por jurisdicción: ES, AD, EU                                  │
│ - Campos dinámicos para autocompletado                          │
│ - Referencias legales incluidas                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  erp_hr_compliance_checklist                                    │
├─────────────────────────────────────────────────────────────────┤
│ - Checklist de cumplimiento por tipo de comunicación            │
│ - Items obligatorios vs recomendados                            │
│ - Estado: pendiente, completado, no_aplica                      │
│ - Validación automática por IA                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Funciones RPC

- `get_upcoming_deadlines(company_id, days_ahead)`: Obligaciones próximas
- `get_sanction_risk_assessment(company_id)`: Evaluación de riesgo de sanciones
- `get_communication_compliance_status(company_id)`: Estado de cumplimiento

---

## Fase 2: Catálogo de Obligaciones Legales

### 2.1 Comunicaciones a Empleados (España - Art. ET)

| Tipo | Plazo Legal | Base Legal | Consecuencia Incumplimiento |
|------|-------------|------------|----------------------------|
| Despido objetivo | 15 días preaviso | Art. 53.1.c ET | Despido improcedente |
| Despido disciplinario | Sin preaviso pero inmediato | Art. 55 ET | Caducidad 20 días |
| Modificación sustancial | 15 días preaviso | Art. 41 ET | Nulidad |
| Movilidad geográfica | 30 días preaviso | Art. 40 ET | Nulidad |
| ERTE | Según procedimiento | Art. 47 ET | Improcedencia |
| Fin contrato temporal | 15 días si >1 año | Art. 49.1.c ET | Indemnización |
| Cambio de turno/horario | Según convenio | Convenio colectivo | Sanción LISOS |

### 2.2 Obligaciones con Administraciones (España)

| Organismo | Modelo/Comunicación | Periodicidad | Plazo |
|-----------|---------------------|--------------|-------|
| **TGSS** | TC-1, TC-2 (Cotizaciones) | Mensual | Día 30 mes siguiente |
| **TGSS** | Altas/Bajas (Sistema RED) | Puntual | 3 días antes/después |
| **TGSS** | Variaciones de datos | Puntual | 6 días |
| **AEAT** | Modelo 111 (Retenciones) | Trimestral/Mensual | Día 20 mes siguiente |
| **AEAT** | Modelo 190 (Resumen anual) | Anual | Enero siguiente |
| **AEAT** | Modelo 216 (No residentes) | Mensual/Trimestral | Día 20 |
| **SEPE** | Contrat@ (Contratos) | Puntual | 10 días hábiles |
| **SEPE** | Certificado empresa | Puntual | 10 días tras baja |

### 2.3 Catálogo LISOS de Infracciones

| Tipo | Clasificación | Sanción Mínima | Sanción Máxima |
|------|---------------|----------------|----------------|
| No alta trabajador | Muy grave | 7.501€ | 225.018€ |
| Retraso cotización | Grave | 751€ | 7.500€ |
| No entregar copia contrato | Leve | 70€ | 750€ |
| Incumplir preaviso despido | Grave | 751€ | 7.500€ |
| No informar representantes | Grave | 751€ | 7.500€ |
| Transgresión jornada | Grave | 751€ | 7.500€ |
| Incumplimiento PRL | Muy grave | 49.181€ | 983.736€ |

---

## Fase 3: Panel de Control de Cumplimiento

### 3.1 Componente Principal: `HRComplianceDashboard`

```text
┌────────────────────────────────────────────────────────────────────┐
│  🎯 Panel de Cumplimiento Legal RRHH                               │
├──────────┬──────────┬──────────┬──────────┬────────────────────────┤
│ ⚠️ 3     │ 🟡 5     │ 🟢 12    │ 📋 8     │ 🔴 1 Riesgo Crítico   │
│ Urgentes │ Próximas │ Al día   │ Comunic. │                        │
│ (7 días) │ (30 días)│          │ Pendient.│                        │
└──────────┴──────────┴──────────┴──────────┴────────────────────────┘
```

### 3.2 Tabs del Panel

1. **📋 Comunicaciones Empleados**
   - Lista de comunicaciones pendientes/enviadas
   - Generador con plantillas oficiales
   - Validación de requisitos legales
   - Tracking de entrega y firma

2. **🏛️ Obligaciones AAPP**
   - Calendario de vencimientos por organismo
   - Estado de cumplimiento por modelo
   - Alertas de próximos vencimientos
   - Histórico de presentaciones

3. **⚠️ Riesgos de Sanción**
   - Evaluación automática de riesgos
   - Pre-alertas configurables (30/15/7/3 días)
   - Cuantificación de sanciones potenciales
   - Recomendaciones de mitigación

4. **📝 Checklist Cumplimiento**
   - Por tipo de comunicación
   - Items obligatorios marcados
   - Validación automática por IA
   - Exportación para auditoría

---

## Fase 4: Sistema de Alertas Inteligentes

### 4.1 Niveles de Alerta

```text
PREALERTA (30 días)  →  ALERTA (15 días)  →  URGENTE (7 días)  →  CRÍTICO (3 días)
     🔵                      🟡                    🟠                   🔴
  Informativo            Planificar           Actuar ahora        Riesgo sanción
```

### 4.2 Flujo de Notificaciones

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Detección de   │─────▶│  Agente IA      │─────▶│  Agente IA      │
│  Riesgo/Plazo   │      │  RRHH           │      │  Jurídico       │
└─────────────────┘      │  (Seguimiento)  │      │  (Análisis)     │
                         └─────────────────┘      └─────────────────┘
                                │                        │
                                ▼                        ▼
                         ┌─────────────────┐      ┌─────────────────┐
                         │  Notificación   │      │  Defensa Legal  │
                         │  Responsable HR │      │  (si procede)   │
                         └─────────────────┘      └─────────────────┘
```

### 4.3 Triggers Automáticos

- **Cron diario 08:00**: Revisar vencimientos próximos
- **Cron semanal lunes**: Informe de cumplimiento
- **Evento contrato**: Recordar comunicación Contrat@
- **Evento despido**: Iniciar checklist de requisitos
- **Evento baja SS**: Recordar certificado empresa SEPE

---

## Fase 5: Automatización de Comunicaciones

### 5.1 Generador de Comunicaciones

- Selección de tipo de comunicación
- Autocompletado con datos del empleado
- Inclusión automática de referencias legales
- Validación de requisitos por IA
- Generación de PDF oficial

### 5.2 Plantillas por Jurisdicción

**España:**
- Carta de despido objetivo (Art. 52/53 ET)
- Carta de despido disciplinario (Art. 54/55 ET)
- Comunicación modificación sustancial (Art. 41 ET)
- Comunicación a representantes sindicales (Art. 68 ET)
- Comunicación ERTE (Art. 47 ET)

**Andorra:**
- Preavís de cessament (Codi Relacions Laborals)
- Comunicació modificació contracte

### 5.3 Checklist Automático

Ejemplo para despido objetivo:
```text
☐ Carta por escrito con causa clara
☐ Preaviso 15 días
☐ Indemnización puesta a disposición (20 días/año)
☐ Comunicación a representantes (si >50 empleados)
☐ Acuse de recibo firmado
☐ Baja en Seguridad Social (3 días)
☐ Certificado empresa SEPE (10 días)
☐ Finiquito calculado y firmado
```

---

## Fase 6: Edge Function de Cumplimiento

### 6.1 Nueva Edge Function: `erp-hr-compliance-monitor`

**Acciones:**
- `check_deadlines`: Revisar vencimientos próximos
- `evaluate_sanction_risk`: Evaluar riesgo de sanciones
- `generate_communication`: Generar comunicación con plantilla
- `validate_checklist`: Validar cumplimiento de requisitos
- `notify_agents`: Notificar a Agentes IA (RRHH y Jurídico)
- `get_obligation_calendar`: Calendario de obligaciones
- `escalate_to_legal`: Escalar a revisión jurídica

### 6.2 Integración con Agentes

```text
erp-hr-compliance-monitor
         │
         ├──▶ erp-hr-ai-agent (seguimiento operativo)
         │
         └──▶ legal-ai-advisor (análisis jurídico y defensa)
```

---

## Fase 7: Cron Jobs Automáticos

### 7.1 Tareas Programadas

| Tarea | Frecuencia | Hora | Descripción |
|-------|------------|------|-------------|
| `check_compliance_deadlines` | Diario | 08:00 | Revisar vencimientos |
| `generate_sanction_alerts` | Diario | 09:00 | Generar pre-alertas |
| `weekly_compliance_report` | Lunes | 08:00 | Informe semanal |
| `monthly_admin_obligations` | Día 1 | 09:00 | Recordatorio mensual |
| `notify_ai_agents` | Diario | 10:00 | Sincronizar con agentes |

---

## Fase 8: Integración UI Completa

### 8.1 Nuevos Componentes

1. `HRComplianceDashboard.tsx` - Panel principal
2. `HRCommunicationGeneratorDialog.tsx` - Generador comunicaciones
3. `HRAdminObligationsPanel.tsx` - Obligaciones AAPP
4. `HRSanctionRisksPanel.tsx` - Panel de riesgos
5. `HRComplianceChecklistDialog.tsx` - Validador checklist
6. `HRComplianceCalendar.tsx` - Calendario visual

### 8.2 Integración en Navegación

Añadir en `HRNavigationMenu.tsx`:
```text
Herramientas
├── Vigilancia Normativa ✓ (existente)
├── Cumplimiento Legal ← NUEVO
│   ├── Comunicaciones Empleados
│   ├── Obligaciones AAPP
│   ├── Riesgos de Sanción
│   └── Checklist
└── ...
```

---

## Resumen de Entregables

| Fase | Componentes | Estimación |
|------|-------------|------------|
| **Fase 1** | 7 tablas + 3 funciones RPC | Base de datos |
| **Fase 2** | Catálogos de obligaciones pre-poblados | Datos maestros |
| **Fase 3** | Panel de control principal | 1 componente |
| **Fase 4** | Sistema de alertas multinivel | 1 hook + triggers |
| **Fase 5** | Generador automático + plantillas | 2 componentes |
| **Fase 6** | Edge function de monitoreo | 1 función |
| **Fase 7** | Cron jobs automáticos | Configuración |
| **Fase 8** | Integración UI completa | 5 componentes |

---

## Sección Técnica

### Estructura de Tablas (SQL)

```sql
-- Comunicaciones legales a empleados
CREATE TABLE erp_hr_legal_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  communication_type TEXT NOT NULL, -- despido_objetivo, despido_disciplinario, etc.
  jurisdiction TEXT DEFAULT 'ES',
  title TEXT NOT NULL,
  content TEXT,
  legal_references TEXT[],
  required_notice_days INTEGER,
  notice_date DATE,
  effective_date DATE,
  deadline_date DATE,
  delivery_method TEXT, -- burofax, carta_certificada, email_certificado, mano
  delivery_status TEXT DEFAULT 'draft',
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_document_url TEXT,
  union_notification_required BOOLEAN DEFAULT false,
  union_notified_at TIMESTAMPTZ,
  checklist_status JSONB DEFAULT '{}',
  ai_validated BOOLEAN DEFAULT false,
  ai_validation_notes TEXT,
  legal_reviewed BOOLEAN DEFAULT false,
  legal_review_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Obligaciones con administraciones públicas
CREATE TABLE erp_hr_admin_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL, -- ES, AD, EU
  organism TEXT NOT NULL, -- TGSS, AEAT, SEPE, ITSS, FOGASA
  model_code TEXT, -- 111, 190, TC-1
  obligation_name TEXT NOT NULL,
  obligation_type TEXT NOT NULL, -- declaracion, comunicacion, liquidacion
  periodicity TEXT NOT NULL, -- mensual, trimestral, anual, puntual
  deadline_day INTEGER, -- día del mes
  deadline_month INTEGER, -- mes (para anuales)
  deadline_description TEXT,
  legal_reference TEXT,
  sanction_type TEXT, -- leve, grave, muy_grave
  sanction_min DECIMAL(12,2),
  sanction_max DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vencimientos por empresa
CREATE TABLE erp_hr_obligation_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  obligation_id UUID REFERENCES erp_hr_admin_obligations(id),
  period_start DATE,
  period_end DATE,
  deadline_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, overdue
  responsible_id UUID,
  completed_at TIMESTAMPTZ,
  document_url TEXT,
  notes TEXT,
  ai_reminded BOOLEAN DEFAULT false,
  legal_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Catálogo de riesgos de sanción
CREATE TABLE erp_hr_sanction_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  legal_reference TEXT NOT NULL, -- Art. X LISOS
  infraction_type TEXT NOT NULL,
  classification TEXT NOT NULL, -- leve, grave, muy_grave
  description TEXT NOT NULL,
  sanction_min_minor DECIMAL(12,2),
  sanction_max_minor DECIMAL(12,2),
  sanction_min_medium DECIMAL(12,2),
  sanction_max_medium DECIMAL(12,2),
  sanction_min_major DECIMAL(12,2),
  sanction_max_major DECIMAL(12,2),
  preventive_measures TEXT[],
  detection_triggers TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas de riesgo de sanción
CREATE TABLE erp_hr_sanction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  risk_id UUID REFERENCES erp_hr_sanction_risks(id),
  obligation_deadline_id UUID,
  communication_id UUID,
  alert_level TEXT DEFAULT 'prealert', -- prealert, alert, urgent, critical
  days_remaining INTEGER,
  potential_sanction_min DECIMAL(12,2),
  potential_sanction_max DECIMAL(12,2),
  title TEXT NOT NULL,
  description TEXT,
  recommended_actions TEXT[],
  hr_agent_notified BOOLEAN DEFAULT false,
  hr_agent_notified_at TIMESTAMPTZ,
  legal_agent_notified BOOLEAN DEFAULT false,
  legal_agent_notified_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plantillas de comunicaciones
CREATE TABLE erp_hr_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL,
  communication_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  dynamic_fields JSONB DEFAULT '[]',
  legal_references TEXT[],
  checklist_items JSONB DEFAULT '[]',
  is_official BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist de cumplimiento
CREATE TABLE erp_hr_compliance_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID REFERENCES erp_hr_legal_communications(id),
  item_order INTEGER,
  item_text TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending', -- pending, completed, not_applicable
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Patrones de Hook

```typescript
// useComplianceMonitor.ts
export function useComplianceMonitor(companyId: string) {
  // Estado: deadlines, alerts, communications, risks
  // Acciones: checkDeadlines, evaluateRisks, generateCommunication
  // Notificaciones: notifyHRAgent, notifyLegalAgent
}
```

### Edge Function Pattern

```typescript
// erp-hr-compliance-monitor/index.ts
interface ComplianceRequest {
  action: 'check_deadlines' | 'evaluate_risk' | 'generate_communication' | 
          'validate_checklist' | 'notify_agents' | 'escalate_to_legal';
  company_id: string;
  // ...params específicos
}
```

---

¿Deseas que proceda con la implementación de este plan?
