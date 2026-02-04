
# Plan de Integración: RRHH ↔ Tesorería ↔ Contabilidad

## Contexto Legal y Normativo

La vinculación entre estos módulos debe cumplir con:

- **Plan General Contable (PGC 2007)**: Grupo 64 para gastos de personal
- **Ley General Tributaria (LGT)**: Obligaciones de retención IRPF
- **Ley General de Seguridad Social (LGSS)**: Cotizaciones y liquidaciones
- **Ley 15/2010**: Plazos de pago y gestión de tesorería
- **Estatuto de los Trabajadores (ET)**: Art. 29 sobre pago de salarios

---

## Arquitectura Propuesta

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE INTEGRACIÓN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐  │
│  │   RRHH      │────▶│   TESORERÍA      │────▶│    CONTABILIDAD         │  │
│  │             │     │                  │     │                         │  │
│  │ • Nóminas   │     │ • Pagos SEPA     │     │ • Asientos automáticos  │  │
│  │ • Finiquitos│     │ • Vencimientos   │     │ • Grupo 64 PGC          │  │
│  │ • Seg.Social│     │ • Conciliación   │     │ • Modelo 111/190        │  │
│  │ • Contratos │     │ • Cash Flow      │     │ • Cierre mensual        │  │
│  └─────────────┘     └──────────────────┘     └─────────────────────────┘  │
│        │                      │                          │                  │
│        └──────────────────────┴──────────────────────────┘                  │
│                               │                                             │
│                    ┌──────────▼──────────┐                                  │
│                    │  TABLAS PUENTE      │                                  │
│                    │  erp_hr_accounting_ │                                  │
│                    │  integration        │                                  │
│                    └─────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Infraestructura de Base de Datos (Semana 1)

### Objetivo
Crear las tablas de vinculación y las funciones de mapeo contable.

### Entregables

**1.1 Nueva tabla `erp_hr_accounting_mapping`**
- Mapeo de conceptos de nómina a cuentas PGC
- Campos: `concept_code`, `account_code`, `account_name`, `debit_credit`, `jurisdiction`
- Datos maestros precargados:
  - 640 - Sueldos y salarios
  - 641 - Indemnizaciones
  - 642 - Seguridad Social empresa
  - 4751 - HP Acreedora IRPF
  - 476 - Organismos SS acreedores
  - 465 - Remuneraciones pendientes de pago
  - 572 - Bancos (contrapartida pago)

**1.2 Nueva tabla `erp_hr_treasury_integration`**
- Vínculo entre nóminas/finiquitos y vencimientos de tesorería
- Campos: `source_type` (payroll/settlement/ss_contribution), `source_id`, `payable_id`, `amount`, `due_date`, `status`

**1.3 Nueva tabla `erp_hr_journal_entries`**
- Registro de asientos generados desde RRHH
- Campos: `source_type`, `source_id`, `journal_entry_id`, `entry_date`, `auto_generated`, `validation_status`

**1.4 Funciones SQL**
- `fn_map_payroll_to_accounts()`: Descompone nómina en líneas contables
- `fn_create_payroll_payable()`: Genera vencimiento en tesorería
- `fn_payroll_to_journal_entry()`: Genera asiento contable

---

## FASE 2: Contabilización Automática de Nóminas (Semana 2)

### Objetivo
Generar asientos contables automáticos cuando se calculan/confirman nóminas.

### Entregables

**2.1 Hook `useHRAccountingIntegration`**
```typescript
// Funciones principales:
- generatePayrollJournalEntry(payrollId)
- generateSettlementJournalEntry(settlementId)  
- generateSSContributionEntry(periodId)
- validateAccountingEntry(entryId)
- reverseAccountingEntry(entryId)
```

**2.2 Plantillas de Asientos PGC**

| Concepto | Debe | Haber |
|----------|------|-------|
| Sueldos brutos | 640 | - |
| Retención IRPF | - | 4751 |
| SS Trabajador | - | 476 |
| Neto a pagar | - | 465 |
| SS Empresa | 642 | 476 |
| Pago nómina | 465 | 572 |

**2.3 Edge Function `erp-hr-accounting-bridge`**
- Acciones: `generate_payroll_entry`, `generate_settlement_entry`, `generate_ss_entry`, `reverse_entry`
- Validación de partida doble
- Integración con módulo de auditoría

---

## FASE 3: Integración con Tesorería (Semana 3)

### Objetivo
Crear automáticamente vencimientos de pago en tesorería al confirmar nóminas.

### Entregables

**3.1 Flujo de Vencimientos**
```text
Nómina Calculada
      │
      ▼
┌─────────────────┐
│ Crear Payable   │
│ en erp_payables │
│                 │
│ - Tipo: NOMINA  │
│ - Fecha: día 30 │
│ - Proveedor:    │
│   EMPLEADOS     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Remesa SEPA    │
│ (opcional)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Conciliación   │
│ Bancaria       │
└─────────────────┘
```

**3.2 Actualización `HRPayrollPanel`**
- Botón "Generar Vencimiento Tesorería"
- Estado de sincronización con tesorería
- Enlace directo al vencimiento en TreasuryDashboard

**3.3 Actualización `TreasuryDashboard`**
- Filtro por tipo "Nóminas" en PayablesManager
- Widget resumen gastos de personal en CashFlowForecast
- Indicador de nóminas pendientes de pago

**3.4 Hooks Compartidos**
- `useHRTreasuryIntegration`: Sincroniza nóminas ↔ vencimientos
- `usePayrollPayables`: Gestiona pagos de nómina

---

## FASE 4: Integración Seguridad Social (Semana 4)

### Objetivo
Vincular liquidaciones de SS con tesorería y contabilidad.

### Entregables

**4.1 Flujo SS Completo**
```text
Cálculo Cotizaciones (HRSocialSecurityPanel)
      │
      ├──────────────────────────────────┐
      ▼                                  ▼
┌─────────────────┐           ┌─────────────────┐
│ Asiento Contable│           │ Vencimiento TGSS│
│                 │           │ en erp_payables │
│ 642 / 476       │           │                 │
│ (SS Empresa)    │           │ Fecha: día 30   │
└─────────────────┘           └─────────────────┘
```

**4.2 Actualización `HRSocialSecurityPanel`**
- Botón "Contabilizar Período"
- Estado de contabilización por período
- Exportación datos para Modelo 111

**4.3 Conexión con Declaraciones Fiscales**
- Modelo 111: Retenciones trimestrales IRPF
- Modelo 190: Resumen anual retenciones
- Datos automáticos desde nóminas contabilizadas

---

## FASE 5: Finiquitos y Liquidaciones (Semana 5)

### Objetivo
Contabilización especial de finiquitos según tipo de despido.

### Entregables

**5.1 Plantillas por Tipo de Baja**

| Tipo | Cuentas |
|------|---------|
| Baja voluntaria | 640, 465 |
| Despido objetivo | 640, 641, 465 |
| Despido improcedente | 640, 641, 465, 678 |
| ERE | 640, 641, 1410 |

**5.2 Actualización `HRSettlementsPanel`**
- Paso adicional en workflow: "Contabilizar"
- Vista previa del asiento antes de confirmar
- Validación legal → contable integrada

**5.3 Provisiones (Art. 104 PGC)**
- Cuenta 1410: Provisión para reestructuraciones
- Dotación automática en EREs
- Reversión al efectuar pagos

---

## FASE 6: Dashboard Unificado y Reporting (Semana 6)

### Objetivo
Panel ejecutivo que muestre la visión integrada RRHH-Tesorería-Contabilidad.

### Entregables

**6.1 Componente `HRAccountingDashboard`**
- KPIs:
  - Coste de personal mensual/anual
  - Ratio gastos personal / ingresos
  - Deuda pendiente SS/IRPF
  - Provisiones activas
- Gráficos:
  - Evolución gastos personal (grupo 64)
  - Comparativa presupuesto vs real
  - Aging de pagos a empleados

**6.2 Informes Integrados**
- Libro Mayor cuenta 640-649
- Extracto movimientos por empleado
- Conciliación nóminas-bancos
- Informe para auditoría

**6.3 Alertas Cruzadas**
- Nómina sin contabilizar > 5 días
- Vencimiento TGSS próximo (7 días)
- Desviación presupuesto > 10%
- Falta pago empleado > fecha legal

---

## FASE 7: Automatización Avanzada con IA (Semana 7-8)

### Objetivo
Orquestación inteligente del flujo completo.

### Entregables

**7.1 Edge Function `erp-hr-treasury-accounting-orchestrator`**
- Flujo automático: Nómina → Asiento → Vencimiento → Remesa
- Validación multinivel (IA + Legal + Contable)
- Rollback automático si falla algún paso

**7.2 Actualización Agente IA RRHH**
- Nuevas acciones:
  - `generate_accounting_entries`
  - `sync_treasury`
  - `validate_fiscal_compliance`
- Contexto contable en respuestas

**7.3 Trigger Automático**
```text
ON payroll.status = 'approved'
  → generate_journal_entry()
  → create_treasury_payable()
  → notify_accounting_module()
```

**7.4 Reconciliación Inteligente**
- Match automático: Pago banco ↔ Nómina
- Sugerencias de asientos correctivos
- Detección anomalías (pagos duplicados, importes incorrectos)

---

## Sección Técnica

### Nuevas Tablas de Base de Datos

```sql
-- Mapeo conceptos nómina → cuentas PGC
CREATE TABLE erp_hr_accounting_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_code TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_credit TEXT CHECK (debit_credit IN ('D', 'C')),
  jurisdiction TEXT DEFAULT 'spain',
  is_active BOOLEAN DEFAULT true
);

-- Integración RRHH → Tesorería
CREATE TABLE erp_hr_treasury_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  source_type TEXT NOT NULL, -- 'payroll', 'settlement', 'ss_contribution'
  source_id UUID NOT NULL,
  payable_id UUID REFERENCES erp_payables(id),
  amount NUMERIC(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asientos generados desde RRHH
CREATE TABLE erp_hr_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES erp_companies(id),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  journal_entry_id UUID REFERENCES erp_journal_entries(id),
  entry_date DATE NOT NULL,
  auto_generated BOOLEAN DEFAULT true,
  validation_status TEXT DEFAULT 'pending',
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Estructura de Archivos Nuevos

```text
src/hooks/admin/
  └── useHRAccountingIntegration.ts
  └── useHRTreasuryIntegration.ts

src/components/erp/hr/
  └── integration/
      └── HRAccountingBridge.tsx
      └── HRTreasurySync.tsx
      └── HRAccountingDashboard.tsx

supabase/functions/
  └── erp-hr-accounting-bridge/index.ts
  └── erp-hr-treasury-accounting-orchestrator/index.ts
```

### Dependencias entre Fases

| Fase | Depende de |
|------|------------|
| 1 | - |
| 2 | Fase 1 |
| 3 | Fases 1, 2 |
| 4 | Fases 1, 2, 3 |
| 5 | Fases 1, 2 |
| 6 | Fases 1-5 |
| 7 | Todas las anteriores |

---

## Estimación de Tiempo

| Fase | Duración | Complejidad |
|------|----------|-------------|
| Fase 1 | 3-4 días | Media |
| Fase 2 | 4-5 días | Alta |
| Fase 3 | 3-4 días | Media |
| Fase 4 | 3-4 días | Media |
| Fase 5 | 2-3 días | Media |
| Fase 6 | 3-4 días | Media |
| Fase 7 | 5-6 días | Alta |
| **Total** | **~6-8 semanas** | |
