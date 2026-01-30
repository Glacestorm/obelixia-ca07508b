
# Plan de Implementación: Módulo Fiscal Avanzado 100% Operativo

## Resumen Ejecutivo

El módulo Fiscal (SII + Intrastat) ya existe pero está **parcialmente integrado**. El módulo aparece como "Próximamente" en el dashboard principal y faltan:

1. **Integración del módulo Fiscal en el dashboard principal** - El tab "Fiscal" muestra "Ejercicios" en lugar del módulo FiscalModule
2. **Tablas de base de datos incompletas** - Faltan `erp_sii_records`, `erp_sii_tasks`, `erp_intrastat_*`
3. **Hooks usando datos demo** - Deben conectarse a Supabase real
4. **Módulo Multi-jurisdiccional** - Extensión para fiscalidades globales (USA LLC, Dubai, etc.)

---

## Fase 1: Base de Datos Completa

### 1.1 Crear tablas SII faltantes

```text
erp_sii_records
├── id, company_id, book (emitted/received/intra/recc_cobros/recc_pagos)
├── source_type, source_id, document_number
├── issue_date, counterparty_tax_id, counterparty_name
├── base_amount, tax_amount, total_amount, tax_rate
├── status (pending/generated/sent/accepted/accepted_with_errors/rejected)
├── csv_code, last_error, retry_count
└── timestamps

erp_sii_tasks
├── id, company_id, record_id, shipment_id
├── task_type (correction/review/resubmit)
├── priority, assigned_to_user_id
├── status (open/in_progress/done)
├── title, description, error_code
└── timestamps + due_date + completed tracking
```

### 1.2 Crear tablas Intrastat

```text
erp_intrastat_config
├── company_id (PK), enabled
├── arrivals_threshold, dispatches_threshold
├── default_transport_mode, default_nature_transaction
└── vat_number, statistical_number

erp_intrastat_declarations
├── id, company_id, period_year, period_month
├── direction (arrivals/dispatches)
├── status (draft/validated/submitted/corrected)
├── totals: lines, value, statistical_value, net_mass
├── submission_reference, file_path
└── timestamps

erp_intrastat_lines
├── id, declaration_id, line_number
├── commodity_code (CN8), country codes
├── transport_mode, nature_of_transaction, delivery_terms
├── net_mass, invoice_value, statistical_value
├── partner_vat, partner_name
├── is_triangular, is_correction
└── timestamps
```

### 1.3 Crear tabla Multi-jurisdiccional

```text
erp_tax_jurisdictions
├── id, code, name, country_code
├── type (eu_vat/us_llc/uae_vat/uk_vat/swiss_vat/singapore_gst/offshore)
├── tax_rate, tax_id_format, filing_frequency
├── reporting_requirements (JSON)
├── is_active
└── special_rules (JSON para casos como zona franca Dubai)

erp_company_jurisdictions
├── id, company_id, jurisdiction_id
├── tax_registration_number
├── registration_date, status
├── filing_calendar (JSON)
└── metadata
```

---

## Fase 2: Actualizar Hooks para Supabase Real

### 2.1 useERPSII.ts
- Reemplazar `useDemoData = true` por conexión real a `erp_sii_records`
- Añadir suscripción Realtime para cambios de estado
- Mantener datos demo como fallback cuando no hay registros reales
- Conectar `createTask` a `erp_sii_tasks` en Supabase

### 2.2 useERPIntrastat.ts
- Conectar a `erp_intrastat_declarations` y `erp_intrastat_lines`
- Implementar generación automática desde facturas intracomunitarias
- Añadir validaciones CN8 y umbrales estadísticos

### 2.3 Nuevo: useERPTaxJurisdictions.ts
- Gestión de jurisdicciones fiscales globales
- Configuración por empresa
- Calendarios de presentación

---

## Fase 3: Integración Dashboard Principal

### 3.1 ERPModularDashboard.tsx
- Añadir `'tax'` a `installedModuleIds` para activar el módulo
- Crear nuevo tab "Fiscal" con `<FiscalModule />`
- Renombrar tab actual "Ejercicios" a mantenerlo separado
- Importar `FiscalModule` desde `./fiscal`

### 3.2 Navegación mejorada
- Módulo Fiscal visible como "Instalado" (verde)
- Click en card navega a tab fiscal
- Badge con contadores de pendientes

---

## Fase 4: Jurisdicciones Globales

### 4.1 Componentes nuevos

```text
src/components/erp/fiscal/
├── GlobalTaxDashboard.tsx    # Vista multi-jurisdicción
├── JurisdictionSelector.tsx  # Selector de régimen fiscal
├── TaxCalendarPanel.tsx      # Calendario de obligaciones
├── JurisdictionConfig.tsx    # Configuración por jurisdicción
└── TaxComplianceMatrix.tsx   # Matriz de cumplimiento
```

### 4.2 Jurisdicciones soportadas

| Región | Código | Tipo | Características |
|--------|--------|------|-----------------|
| España | ES_SII | EU VAT | SII, Modelo 303/390 |
| UE | EU_INTRA | EU VAT | Intrastat, OSS |
| USA | US_LLC | US Tax | Form 1065, Schedule K-1 |
| Delaware | US_DE_LLC | US Tax | Sin impuesto estatal |
| Wyoming | US_WY_LLC | US Tax | Sin impuesto estatal |
| Dubai | AE_FZ | UAE VAT | 5% VAT o zona franca |
| Andorra | AD_IGI | Andorra | IGI 4.5% |
| UK | GB_VAT | UK VAT | MTD, Brexit rules |
| Suiza | CH_VAT | Swiss VAT | 7.7% estándar |
| Singapur | SG_GST | Singapore | 8% GST |

### 4.3 Ejemplos por jurisdicción (borrables)

Cada jurisdicción incluirá:
- 3-5 registros de ejemplo
- Configuración tipo
- Calendario de obligaciones demo
- Alertas de vencimiento simuladas

---

## Fase 5: Mejoras UX/UI

### 5.1 FiscalModule.tsx ampliado
- Añadir tercera pestaña "Jurisdicciones"
- KPIs globales multi-jurisdicción
- Alertas de próximos vencimientos

### 5.2 Workflows automáticos
- Factura contabilizada → SII record `pending`
- SII `rejected` → Task automática
- Vencimiento próximo → Notificación
- Umbral Intrastat superado → Alerta

---

## Archivos a Crear/Modificar

### Nuevos archivos
1. `src/hooks/erp/useERPTaxJurisdictions.ts`
2. `src/components/erp/fiscal/GlobalTaxDashboard.tsx`
3. `src/components/erp/fiscal/JurisdictionSelector.tsx`
4. `src/components/erp/fiscal/TaxCalendarPanel.tsx`
5. `src/components/erp/fiscal/TaxComplianceMatrix.tsx`

### Archivos a modificar
1. `src/components/erp/ERPModularDashboard.tsx` - Integrar tab Fiscal
2. `src/hooks/erp/useERPSII.ts` - Conexión Supabase + ejemplos
3. `src/hooks/erp/useERPIntrastat.ts` - Conexión Supabase + ejemplos
4. `src/components/erp/fiscal/FiscalModule.tsx` - Añadir tab jurisdicciones
5. `src/components/erp/fiscal/index.ts` - Exports nuevos componentes
6. `src/hooks/erp/index.ts` - Export nuevo hook

### Migración SQL
- Crear `erp_sii_records`, `erp_sii_tasks`
- Crear `erp_intrastat_config`, `erp_intrastat_declarations`, `erp_intrastat_lines`
- Crear `erp_tax_jurisdictions`, `erp_company_jurisdictions`
- RLS policies para multi-tenant
- Realtime habilitado para records y tasks
- Insertar datos demo para cada jurisdicción

---

## Datos de Ejemplo (Borrables)

### SII España
- 8 facturas emitidas (varios estados)
- 4 facturas recibidas
- 2 operaciones intracomunitarias
- 3 tareas de corrección

### Intrastat UE
- Declaración expediciones Enero 2025 (5 líneas)
- Declaración introducciones Enero 2025 (8 líneas)
- Declaración Diciembre 2024 presentada

### USA LLC (Delaware)
- Ejemplo Form 1065 simulado
- Schedule K-1 demo
- Calendario fiscal US

### Dubai Free Zone
- Configuración zona franca
- Exención VAT demo
- Economic Substance requirements

---

## Resultado Final

El módulo Fiscal quedará 100% operativo con:

```text
✅ SII conectado a Supabase (cola operativa)
✅ Intrastat con generación y exportación
✅ 10+ jurisdicciones fiscales globales
✅ Calendario de obligaciones
✅ Alertas automáticas
✅ Datos demo eliminables
✅ Tab "Fiscal" visible y activo en ERP
✅ Badge de pendientes en navegación
```

---

## Sección Técnica

### Dependencias
- Sin nuevas dependencias npm
- Usa componentes UI existentes (shadcn/ui)

### RLS Policies
- Todas las tablas con policies por `company_id`
- Funciones `security definer` para evitar recursión

### Realtime
- `erp_sii_records` y `erp_sii_tasks` con replicación
- Actualización inmediata de estados en UI

### Tipos TypeScript
- Extender `src/types/erp.ts` con nuevos tipos
- Interfaces para jurisdicciones y calendarios

