

## S9.19b — Alinear campos select/closed-value del formulario de empleado ✅

### Causa raíz

El query de `HREmployeesPanel.tsx` no seleccionaba los campos H2.0 (`gender`, `nationality`, `secondary_nationality`, `national_id`, `birth_date`, `bank_account`, `category`, `work_schedule`, `weekly_hours`, `address`, `ss_number`). El mapping de gender (S9.19) era correcto pero `emp.gender` llegaba como `undefined`.

### Solución aplicada

#### 1. `HREmployeesPanel.tsx` — Query SELECT ampliado
Añadidos 11 campos H2.0 al SELECT. El `onSave()` callback ya dispara `fetchEmployees()` → los datos se refrescan al cerrar el diálogo.

#### 2. `HREmployeeFormDialog.tsx` — `normalizeCountryCode()`
Función de normalización para `nationality` y `secondary_nationality`:
- Código ISO válido → lo usa
- Nombre de país legacy → convierte a ISO
- Valor desconocido → devuelve `''` + `console.warn` (no muestra valor fantasma en Select)

### Inventario de campos Select revisados

| Campo | Tipo UI | Tipo BD | ¿Desalineación? | Corrección |
|---|---|---|---|---|
| `gender` | Select (4 opciones UI) | CHECK (M/F/other) | Sí — mapping S9.19 | Faltaba en query → añadido |
| `nationality` | Select (COUNTRIES.code) | text libre | Posible legacy | Query + normalizeCountryCode() |
| `secondary_nationality` | Select (COUNTRIES.code) | text libre | Posible legacy | Query + normalizeCountryCode() |
| `status` | Select (7 estados) | CHECK (9 post-S9.19) | No | OK |
| `country_code` | Select (COUNTRIES.code) | text libre | No | Ya estaba en query |
| `work_schedule` | Select (3 opciones) | text libre | No | Faltaba en query → añadido |
| `category` | Select | text libre | No | Faltaba en query → añadido |

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/components/erp/hr/HREmployeesPanel.tsx` | +11 campos en SELECT |
| `src/components/erp/hr/HREmployeeFormDialog.tsx` | +`normalizeCountryCode()` + aplicada en carga de nationality/secondary_nationality |

### Verificaciones

- ✅ TypeScript limpio (tsc --noEmit = 0 errores)
- ✅ Gender: mapping S9.19 + dato ahora llega al formulario
- ✅ Nationality: normalizada con fallback seguro
- ✅ Status: sin cambios, alineado post-S9.19
- ✅ Refresh post-save: `onSave()` → `fetchEmployees()` ya existente

### Veredicto

**"Formulario empleado alineado en campos select — causa raíz: query incompleto en panel padre"**
