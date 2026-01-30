
# Plan de Mejora Integral del Módulo de Ayuda Fiscal Activa

## Resumen Ejecutivo

Este plan aborda la corrección visual del componente de sugerencias superpuestas, la adición de un calendario fiscal integrado, la generación y gestión de documentos fiscales oficiales, y la incorporación de tendencias 2026-2030 en fiscalidad digital.

---

## Fase 1: Corrección Visual de Sugerencias Superpuestas

**Problema identificado:** En el componente `ActiveHelpPanel.tsx`, los botones de preguntas rápidas usan una cuadrícula 2x2 que causa superposición de textos largos.

**Solución:**
- Cambiar la cuadrícula de `grid-cols-2` a un diseño de columna única (`flex flex-col`)
- Añadir `whitespace-normal` y `text-wrap` para permitir múltiples líneas
- Ajustar el padding y altura de los botones con `h-auto py-3`
- Aumentar `max-w-sm` a `max-w-lg` para dar más espacio

**Archivos a modificar:**
- `src/components/erp/fiscal/ActiveHelpPanel.tsx` (líneas 201-215)

---

## Fase 2: Calendario Fiscal Integrado en Ayuda Activa

**Objetivo:** Mostrar un calendario interactivo con las próximas citas fiscales y el grado de cumplimiento directamente en el panel de Ayuda Activa.

**Implementación:**
1. Crear nueva pestaña "Calendario" en `ActiveHelpPanel`
2. Reutilizar lógica de `useERPTaxJurisdictions` para obtener eventos del calendario
3. Mostrar:
   - Mini-calendario del mes actual con indicadores de eventos
   - Lista de próximas obligaciones (7 días)
   - Indicador de cumplimiento (% completado vs pendiente)
   - Alertas de obligaciones vencidas

**Componentes a modificar:**
- `src/components/erp/fiscal/ActiveHelpPanel.tsx` - Añadir pestaña "Calendario"
- `src/hooks/erp/useERPActiveHelp.ts` - Integrar acceso a eventos fiscales

---

## Fase 3: Cierre Fiscal y Generación de Documentación Oficial

**Objetivo:** Añadir botones de ejecución para cierre fiscal y elaboración de documentos oficiales.

### 3.1 Panel de Acciones Fiscales
Crear nuevo componente `FiscalActionsPanel.tsx` con:
- **Botón "Cierre Fiscal"**: Lanza el `FiscalClosingWizard` existente
- **Botón "Generar Modelo 303"**: Genera PDF del IVA trimestral
- **Botón "Generar Modelo 390"**: Resumen anual IVA
- **Botón "Generar Balance PGC"**: Estados financieros oficiales

### 3.2 Edge Function para Documentos Fiscales
Crear `supabase/functions/erp-fiscal-documents/index.ts`:
- Acepta tipo de documento y periodo
- Calcula datos desde tablas contables
- Genera PDF con formato oficial AEAT
- Devuelve PDF en base64 para descarga/guardado

### 3.3 Integración por Voz
Extender el agente IA para procesar comandos como:
- "Genera el Modelo 303 del tercer trimestre"
- "Ejecuta el cierre fiscal del ejercicio 2025"
- "Prepara la documentación para Hacienda"

**Archivos nuevos:**
- `src/components/erp/fiscal/FiscalActionsPanel.tsx`
- `src/components/erp/fiscal/FiscalDocumentGenerator.tsx`
- `supabase/functions/erp-fiscal-documents/index.ts`

**Archivos a modificar:**
- `src/components/erp/fiscal/FiscalModule.tsx` - Integrar panel de acciones
- `src/hooks/erp/useERPFiscalAgent.ts` - Añadir comandos de voz para documentos
- `supabase/functions/erp-fiscal-ai-agent/index.ts` - Procesar intención "generate_document"

---

## Fase 4: Impresión y Almacenamiento de Documentos

### 4.1 Tabla de Documentos Fiscales Generados
```text
Tabla: erp_fiscal_generated_documents
+------------------+----------------------------+
| Campo            | Tipo                       |
+------------------+----------------------------+
| id               | UUID (PK)                  |
| company_id       | UUID (FK)                  |
| jurisdiction_id  | UUID (FK)                  |
| document_type    | TEXT (modelo_303, etc.)    |
| period           | TEXT (Q1-2026)             |
| generated_at     | TIMESTAMP                  |
| generated_by     | UUID                       |
| file_data        | BYTEA o Storage URL        |
| file_format      | TEXT (pdf, xlsx, xbrl)     |
| status           | TEXT (draft, final, filed) |
| filed_at         | TIMESTAMP                  |
| metadata         | JSONB                      |
+------------------+----------------------------+
```

### 4.2 Funcionalidades de Exportación
- **PDF**: Formato oficial con campos AEAT
- **XLSX**: Para revisión en Excel
- **XBRL**: Para envío electrónico a AEAT

### 4.3 Diálogo de Impresión/Guardado
Crear `FiscalDocumentExportDialog.tsx`:
- Selector de formato (PDF/XLSX/XBRL)
- Opción "Guardar en base de datos"
- Opción "Imprimir directamente"
- Vista previa del documento

---

## Fase 5: Tendencias Fiscales 2026-2030 (Disruptivas)

### 5.1 Facturación Electrónica Obligatoria B2B (España 2026)
- Sistema de factura electrónica estructurada
- Integración con Facturae 3.x
- Validación de formato y contenido antes de envío

### 5.2 ViDA (VAT in the Digital Age) - UE 2028
- Reporte en tiempo real de transacciones transfronterizas
- Integración con sistema único de IVA europeo
- Certificado digital de transacciones

### 5.3 Tax API - Conexión Directa con Administraciones
- API REST hacia AEAT para envío automático
- Webhook para recibir notificaciones de Hacienda
- Firma electrónica integrada

### 5.4 IA Predictiva Fiscal
- Predicción de obligaciones futuras
- Alertas de cambios normativos automáticos
- Optimización fiscal asistida por IA

### 5.5 Blockchain para Auditoría Fiscal
- Hash inmutable de documentos fiscales
- Trazabilidad de modificaciones
- Prueba de presentación en plazo

**Componentes nuevos:**
- `src/components/erp/fiscal/FiscalTrends2026Panel.tsx`
- `src/components/erp/fiscal/EInvoiceManager.tsx`
- `src/components/erp/fiscal/TaxAPIConnector.tsx`

---

## Secuencia de Implementación

```text
FASE 1 (Inmediata)
+---------------------------+
| Fix visual sugerencias    |-----> 30 minutos
| ActiveHelpPanel.tsx       |
+---------------------------+

FASE 2 (Corto plazo)
+---------------------------+
| Calendario integrado      |-----> 2 horas
| + Indicadores cumplimiento|
+---------------------------+

FASE 3 (Medio plazo)
+---------------------------+
| Panel acciones fiscales   |-----> 3 horas
| Edge function documentos  |
| Comandos de voz           |
+---------------------------+

FASE 4 (Medio plazo)
+---------------------------+
| Tabla documentos DB       |-----> 2 horas
| Diálogo exportación       |
| Formatos múltiples        |
+---------------------------+

FASE 5 (Largo plazo / Innovación)
+---------------------------+
| Factura electrónica B2B   |-----> Planificación
| ViDA / Tax API            |       para futuras
| IA Predictiva + Blockchain|       versiones
+---------------------------+
```

---

## Resumen de Cambios por Archivo

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `ActiveHelpPanel.tsx` | Modificar | Fix visual + nueva pestaña Calendario |
| `FiscalActionsPanel.tsx` | Crear | Panel con botones de cierre y generación |
| `FiscalDocumentGenerator.tsx` | Crear | Lógica de generación de documentos |
| `FiscalDocumentExportDialog.tsx` | Crear | Diálogo para imprimir/guardar |
| `erp-fiscal-documents/index.ts` | Crear | Edge function para documentos |
| `erp-fiscal-ai-agent/index.ts` | Modificar | Nuevas intenciones de voz |
| `useERPFiscalAgent.ts` | Modificar | Método `generateDocument()` |
| Migración SQL | Crear | Tabla `erp_fiscal_generated_documents` |
| `FiscalModule.tsx` | Modificar | Integrar nuevos componentes |
| `index.ts` (barrel) | Modificar | Exportar nuevos componentes |

---

## Sección Técnica Detallada

### Fix CSS para Sugerencias (Fase 1)
```tsx
// Antes (problemático)
<div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
  <Button variant="outline" size="sm" className="text-xs h-auto py-2 text-left">
    {q}
  </Button>
</div>

// Después (corregido)
<div className="flex flex-col gap-2 max-w-lg mx-auto w-full">
  <Button
    variant="outline"
    size="sm"
    className="text-xs h-auto py-3 px-4 text-left justify-start whitespace-normal"
  >
    {q}
  </Button>
</div>
```

### Edge Function `erp-fiscal-documents`
- Endpoint único para todos los modelos fiscales
- Parámetros: `{ document_type, period, company_id, format }`
- Usa jsPDF para generación de PDFs
- Calcula totales desde `erp_journal_entries` y `erp_account_balances`
- Almacena en `erp_fiscal_generated_documents`

### Comandos de Voz Fiscales
Extensión del prompt del agente para reconocer:
- `"genera/prepara/crea"` + `"modelo X"` / `"balance"` / `"cierre"`
- Intent: `generate_fiscal_document`
- Entidades: `document_type`, `period`, `format`

### Storage de Documentos
- Opción 1: Supabase Storage (archivos grandes)
- Opción 2: Campo BYTEA en PostgreSQL (documentos pequeños)
- Recomendación: Supabase Storage con URL firmada temporal

