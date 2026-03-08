

# FASE 1 — Plan de Implementación Completa

## Alcance

7 tareas principales que transforman el módulo de mockup a herramienta operativa.

---

## 1. CONECTAR LOS 9 PANELES PLACEHOLDER A DATOS REALES

### ElectricalClientesPanel
- Extraer clientes únicos de `energy_cases` (agrupando por `customer_id`, `current_supplier`, `address`)
- Mostrar tabla con nombre/razón social, nº expedientes, nº suministros, acciones
- Filtro de búsqueda funcional
- Empty state real

### ElectricalSuministrosPanel
- Consultar `energy_supplies` JOIN `energy_cases` (filtrado por `company_id`)
- Tabla con CUPS, expediente, distribuidora, tarifa acceso, potencias P1/P2
- Búsqueda por CUPS o dirección

### ElectricalFacturasPanel (global)
- Consultar `energy_invoices` JOIN `energy_cases` (filtrado por `company_id`)
- Tabla con expediente, periodo, kWh, costes, total, validación
- Búsqueda y filtro por expediente/periodo

### ElectricalContratosPanel (global)
- Consultar `energy_contracts` JOIN `energy_cases` (filtrado por `company_id`)
- Tabla con expediente, comercializadora, tarifa, fechas, permanencia, documento

### ElectricalConsumoPanel
- Consultar `energy_invoices` JOIN `energy_cases` para gráficos reales
- Gráfico de distribución P1/P2/P3 (PieChart con recharts)
- Gráfico de evolución mensual (BarChart)
- Tabla de facturas con desglose

### ElectricalPotenciaPanel
- Consultar `energy_supplies` + `energy_invoices` por company
- Gráfico comparativo potencia contratada vs máxima demandada
- Tabla de excesos (donde max_demand > contracted_power)

### ElectricalRecomendacionesPanel
- Consultar `energy_recommendations` JOIN `energy_cases` (filtrado por company)
- Tabla con expediente, comercializadora rec., tarifa, potencias, ahorro, riesgo, confianza

### ElectricalInformesPanel
- Consultar `energy_reports` JOIN `energy_cases` (filtrado por company)
- Tabla con expediente, tipo, versión, resumen, fecha, acciones (descargar PDF)

### ElectricalAjustesPanel
- Convertir las 4 cards en accesos directos funcionales:
  - "Catálogo de tarifas" → navegar al módulo `catalogo`
  - "Parámetros generales" → formulario con campos: IVA default (21%), impuesto eléctrico default (5.11%), alquiler contador default — guardados en localStorage o config
  - Las otras 2 cards con información descriptiva real en lugar de placeholder

---

## 2. ELIMINAR HARDCODES

### Header del ConsultingModule (líneas 56-63)
- Reemplazar con consultas reales:
  - `expedientesActivos`: COUNT de `energy_cases` WHERE status NOT IN ('completed','cancelled')
  - `suministrosGestionados`: COUNT de `energy_supplies` via cases
  - `facturasAnalizadas`: COUNT de `energy_invoices` via cases
  - `ahorroEstimado`: SUM de `estimated_annual_savings` de `energy_cases`
  - `informesPendientes`: COUNT de cases en status 'analysis'/'proposal' sin report
  - `seguimientosActivos`: COUNT de `energy_tracking` WHERE closure_status = 'open'

### ElectricalSeguimientoPanel (línea 76)
- Reemplazar `avgPrecision: 92` con cálculo real: para cada tracking con `observed_real_savings` y caso con `estimated_monthly_savings`, calcular ratio medio de precisión

---

## 3. APLICAR PERMISOS FRONTEND

### Estrategia
- Crear componente helper `PermissionGate` que envuelve acciones condicionalmente
- Importar `useElectricalPermissions` en los componentes clave

### Componentes a proteger
- **ElectricalExpedientesPanel**: botón "Nuevo expediente" → `edit_cases`; botón eliminar → `edit_cases`
- **ElectricalCaseDetail**: acciones de edición → `edit_cases`
- **CaseContractsTab**: crear/editar/eliminar → `edit_cases`; botón "Analizar IA" → `ai_analysis`
- **CaseInvoicesTab**: CRUD → `edit_cases`; upload → `edit_cases`
- **CaseRecommendationTab**: guardar/generar → `approve_recommendation`; IA → `ai_analysis`
- **CaseReportTab**: generar informe → `generate_report`
- **CaseTrackingTab**: editar seguimiento → `close_case`
- **ElectricalTariffCatalogPanel**: CRUD → `edit_tariff_catalog`
- **ElectricalComparadorPanel**: crear simulación → `edit_cases`

### Implementación
- Los botones se renderizan condicionalmente con `can('action')` 
- Los usuarios sin permiso ven la UI en modo lectura

---

## 4. CORREGIR FLUJO IA DE CONTRATOS

### Problema actual
La función `handleAiAnalysis` en `CaseContractsTab` construye un string de texto con metadatos del contrato pero NO extrae texto del PDF. Envía la URL del PDF como parte del texto, pero la IA no puede acceder a URLs.

### Solución
- Modificar el flujo para que, al analizar, se descargue el PDF del bucket, se extraiga texto usando una Edge Function con un parser PDF básico
- Alternativa pragmática (Fase 1): mejorar el prompt enviando todos los datos estructurados disponibles del contrato + notas manuales, y añadir un campo `contract_text` textarea donde el analista puede pegar el texto del contrato manualmente antes de analizar
- Mostrar advertencia clara si no hay texto suficiente para análisis
- Deshabilitar botón "Analizar" si el contrato no tiene datos ni texto

### Implementación concreta
- Añadir textarea "Texto del contrato (pegar aquí)" en el formulario de contrato
- Al hacer click en "Analizar", usar el texto pegado + metadatos estructurados
- Si no hay texto pegado, mostrar toast de error explicativo
- Actualizar la Edge Function para manejar mejor el caso de texto estructurado vs libre

---

## 5. VINCULAR SIMULADOR ↔ EXPEDIENTE

### Cambios en ElectricalComparadorPanel
- Aceptar prop opcional `caseId` y `onNavigateToCase`
- Si se recibe `caseId`, pre-cargar automáticamente datos del expediente:
  - Consumos desde `energy_invoices` (última factura o media)
  - Potencias desde `energy_supplies`
  - Coste actual desde última factura `total_amount`
  - Peaje desde `energy_supplies.tariff_access`
- Guardar `case_id` en la simulación creada

### Cambios en ElectricalCaseDetail
- Añadir botón "Simular tarifas" en tab Recomendación que navega al simulador con datos del expediente
- O abrir el simulador inline dentro del expediente

### Cambios en ElectricalConsultingModule
- Pasar `caseId` al comparador cuando se navega desde un expediente
- Añadir mecanismo para navegar de expediente → simulador y viceversa

---

## 6. REVISIÓN DE COHERENCIA

- Verificar que todos los hooks usan los mismos nombres de campos que la BD
- Asegurar loading states en todos los paneles
- Empty states descriptivos y coherentes
- Mensajes de error con toast consistentes
- Navegación fluida entre lista global → detalle de expediente

---

## 7. ARCHIVOS A CREAR/MODIFICAR

### Archivos a modificar (13):
1. `ElectricalConsultingModule.tsx` — stats reales + paso de caseId al comparador
2. `ElectricalClientesPanel.tsx` — reescribir con datos reales
3. `ElectricalSuministrosPanel.tsx` — reescribir con datos reales
4. `ElectricalFacturasPanel.tsx` — reescribir con datos reales
5. `ElectricalContratosPanel.tsx` — reescribir con datos reales
6. `ElectricalConsumoPanel.tsx` — reescribir con gráficos reales
7. `ElectricalPotenciaPanel.tsx` — reescribir con datos reales
8. `ElectricalRecomendacionesPanel.tsx` — reescribir con datos reales
9. `ElectricalInformesPanel.tsx` — reescribir con datos reales
10. `ElectricalAjustesPanel.tsx` — reescribir con accesos funcionales
11. `ElectricalSeguimientoPanel.tsx` — fix precisión hardcoded
12. `CaseContractsTab.tsx` — fix flujo IA + campo texto contrato
13. `ElectricalComparadorPanel.tsx` — aceptar caseId, precargar datos

### Archivos a crear (1):
1. `src/components/erp/electrical/PermissionGate.tsx` — componente wrapper de permisos

### Archivos a modificar para permisos (6 adicionales):
- `ElectricalExpedientesPanel.tsx`
- `CaseInvoicesTab.tsx`
- `CaseRecommendationTab.tsx`
- `CaseReportTab.tsx`
- `CaseTrackingTab.tsx`
- `ElectricalTariffCatalogPanel.tsx`

### Sin cambios en BD
No se necesitan migraciones. Todas las tablas ya existen y tienen los campos necesarios. Los paneles globales consultarán las mismas tablas que los tabs del expediente pero con filtro por `company_id` en lugar de `case_id`.

---

## Limitaciones que quedarán tras Fase 1
- No hay entidad "Cliente Energético" propia en BD (se extraen de `energy_cases`)
- No hay OCR/parser de facturas
- No hay integración Datadis/OMIE
- No hay workflow de cambio de comercializadora
- No hay alertas automáticas de vencimiento
- No hay firma digital de propuestas
- Motor de recomendación básico (no compara contra catálogo)

