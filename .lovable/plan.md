

# Plan: Validación legal inteligente de fechas de contrato

## Problema actual
El formulario muestra un aviso de "incoherencia" cuando un empleado activo tiene fecha de baja futura informada. Esto es incorrecto: un contrato temporal de 6 meses con fecha de baja futura dentro del periodo legal es perfectamente válido. El empleado está activo y trabajando.

## Cambios en `src/components/erp/hr/HREmployeeFormDialog.tsx`

### 1. Eliminar el aviso de incoherencia estado activo + fecha de baja (líneas 779-785)
Reemplazar por una validación inteligente basada en la fecha del sistema:
- Si `termination_date` es **futura** y el estado es `active` → sin aviso (situación legal correcta)
- Si `termination_date` es **pasada** y el estado sigue `active` → aviso administrativo: "La fecha de baja ya ha vencido, actualice el estado del empleado"

### 2. Añadir validación de duración legal vs. tipo de contrato
Usar `contractProfile.duracionMaximaMeses` (ya disponible vía `resolveContractType`) para validar que la duración entre `hire_date` y `termination_date` (o `endDate` de prórroga) no exceda el máximo legal del tipo de contrato RD seleccionado.

Cuando la duración **exceda** el máximo legal:
- Mostrar un bloque lateral (dentro del mismo campo) con:
  - Aviso: "La duración (X meses) excede el máximo legal de Y meses para contrato Z"
  - Fecha máxima correcta calculada: `hire_date + duracionMaximaMeses`
  - Referencia normativa (ET Art. 15, RDL 32/2021, etc.)
  - Consecuencia legal: "Superado el límite, el contrato se convierte en indefinido (ET Art. 15.5)"

Cuando la duración sea **válida**:
- Mostrar confirmación discreta: "Duración dentro del periodo legal (X/Y meses)"

### 3. Misma validación para prórroga
Aplicar la misma lógica al bloque de prórroga: si `startDate` + nueva `endDate` superan `duracionMaximaMeses`, mostrar las fechas correctas y el aviso legal.

### 4. Validación de fecha de baja vs. fin de contrato
Si hay `endDate` en el contrato activo y `termination_date` informada:
- Si `termination_date > endDate` → aviso: la baja no puede ser posterior al fin de contrato (salvo conversión)
- Si `termination_date < endDate` → info: baja anticipada, verificar causa (ET Art. 49)

## Detalle técnico

Se añade un `useMemo` que calcula:
```text
maxLegalEndDate = hire_date + contractProfile.duracionMaximaMeses meses
actualDurationMonths = diff(hire_date, termination_date || endDate)
isWithinLegalLimit = actualDurationMonths <= duracionMaximaMeses
```

Solo aplica cuando `contractProfile.duracionMaximaMeses !== null` (contratos con límite temporal). Contratos indefinidos y sustitución (sin límite) no generan este aviso.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/erp/hr/HREmployeeFormDialog.tsx` | Reemplazar aviso incoherencia + añadir validación duración legal + fechas sugeridas |

0 migraciones. 0 archivos nuevos. Solo lógica de presentación y validación client-side.

