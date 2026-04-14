

## S9.18 — Retribución Flexible ES: Plan Final para Build

### Verificación previa completada

**Ajuste 1 — `contributable` del exceso**: Se documenta como decisión operativa pendiente. El concepto `ES_RETRIB_FLEX_SEGURO_EXCESO` se crea con `contributable: false` / `is_ss_contributable: false` pero con un comentario explícito indicando que la cotización SS del exceso depende del criterio operativo de cada empresa y debe validarse antes de activar.

**Ajuste 2 — Restaurante / guardería**: Verificado que `ticketRestaurante` y `chequeGuarderia` NO son consumidos por ningún componente UI ni demo data. Solo existen en el bridge (líneas 326-327 para cálculo, 811-812 para batch). La desactivación es segura y no rompe nada visible. Se desactivan con comentario explícito en el código.

---

### Bloques de implementación

#### Bloque 1: Migración
Añadir a `hr_es_flexible_remuneration_plans`:
- `num_beneficiarios INTEGER DEFAULT 1`
- `num_beneficiarios_discapacidad INTEGER DEFAULT 0`

#### Bloque 2: Bridge (`useESPayrollBridge.ts`)
- Línea 325: Reemplazar `addEarning('ES_RETRIB_FLEX_SEGURO', ...)` por lógica de split exento/exceso con límite dinámico
- Líneas 326-327: Comentar `ticketRestaurante` y `chequeGuarderia` forzándolos a `0` con comentario `// S9.18: Desactivado — pendiente de reglas avanzadas (Art. 45.2 RIRPF / centro autorizado)`
- Líneas 811-812: Forzar a `0` en batch, añadir `numBeneficiarios` y `numBeneficiariosDiscapacidad` desde plan
- Catálogo inline (~línea 141): Añadir `ES_RETRIB_FLEX_SEGURO_EXCESO` con `taxable: true, contributable: false`
- `ESPayrollInput`: Añadir `numBeneficiarios?: number` y `numBeneficiariosDiscapacidad?: number`

#### Bloque 3: Catálogo (`payrollConceptCatalog.ts`)
- Después de línea 116: Añadir `ES_RETRIB_FLEX_SEGURO_EXCESO` con `is_taxable: true, is_ss_contributable: false` y comentario sobre decisión pendiente de cotización

#### Bloque 4: Nuevo componente `HRFlexibleRemunerationPanel.tsx`
Card component con:
- Año selector
- Seguro médico: importe + num_beneficiarios + num_beneficiarios_discapacidad + indicador de límite + badge verde/naranja
- Restaurante/Guardería/Transporte: importe + badge ámbar "Pendiente de reglas avanzadas"
- Estado (active/suspended/cancelled)
- Upsert por `(company_id, employee_id, plan_year)`
- Toast feedback

#### Bloque 5: Integración en `HRPayrollEntryDialog.tsx`
- Después del bloque de agreement card (~línea 695) y antes de Tabs (~línea 697)
- Fetch plan flexible activo del empleado
- Card informativa colapsable "Retribución Flexible ES"
- Editor inline embebido
- NO inyectar líneas duplicadas — el bridge ya maneja seguro médico

---

### Archivos

| Archivo | Acción |
|---|---|
| `supabase/migrations/new.sql` | Crear — 2 columnas |
| `src/components/erp/hr/HRFlexibleRemunerationPanel.tsx` | Crear |
| `src/hooks/erp/hr/useESPayrollBridge.ts` | Modificar — split seguro, desactivar restaurante/guardería, concepto exceso |
| `src/engines/erp/hr/payrollConceptCatalog.ts` | Modificar — añadir exceso |
| `src/components/erp/hr/HRPayrollEntryDialog.tsx` | Modificar — card informativa + editor inline |

### No se toca
`payroll-calculation-engine.ts`, S9/VPT, última milla, G1.2/G2.2, auth, edge functions, RLS, agreement resolution, mapping engine, stock options, módulo general de beneficios

