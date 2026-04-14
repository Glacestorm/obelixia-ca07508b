

## S9.19 — Corregir desalineación UI ↔ BD en ficha de empleado

### Causa raíz

La BD tiene CHECK constraints que restringen valores de `gender` y `status` en `erp_hr_employees`:

- **gender**: `CHECK (gender IN ('M', 'F', 'other'))` — UI envía `masculino`, `femenino`, `no_binario`, `no_especificado`
- **status**: `CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated'))` — UI ofrece 7 valores (`candidate`, `onboarding`, `temporary_leave`, `excedencia`, `offboarding` no existen en BD)

No hay constraints en `work_schedule`, `category` ni `nationality` — esos campos son `text` libre sin CHECK.

### Solución

#### 1. Gender — Mapping bidireccional (sin tocar BD)

En `HREmployeeFormDialog.tsx`:

**Constantes de mapping:**
```typescript
const GENDER_TO_DB: Record<string, string> = {
  masculino: 'M', femenino: 'F', no_binario: 'other', no_especificado: 'other'
};
const GENDER_FROM_DB: Record<string, string> = {
  M: 'masculino', F: 'femenino', other: 'no_binario'
};
```

**En `handleSave` (línea ~736):** mapear antes de enviar:
```typescript
gender: formData.gender ? (GENDER_TO_DB[formData.gender] || formData.gender) : null,
```

**Al cargar empleado existente:** reverse map del valor de BD a valor UI.

#### 2. Status — Ampliar CHECK constraint en BD (migración)

La UI modela una máquina de estados real de RRHH que la BD no soporta. La solución correcta es ampliar el constraint:

```sql
ALTER TABLE erp_hr_employees DROP CONSTRAINT erp_hr_employees_status_check;
ALTER TABLE erp_hr_employees ADD CONSTRAINT erp_hr_employees_status_check 
  CHECK (status = ANY (ARRAY[
    'candidate', 'onboarding', 'active', 'inactive',
    'on_leave', 'temporary_leave', 'excedencia',
    'offboarding', 'terminated'
  ]));
```

Esto es preferible a mapping porque:
- Los estados UI tienen semántica operativa real (onboarding ≠ active, excedencia ≠ on_leave genérico)
- Un mapping perdería información de negocio
- No rompe datos existentes (los 3 valores actuales en BD — `active`, `on_leave`, `terminated` — están incluidos)

#### 3. Otros campos verificados — Sin conflicto

`work_schedule`, `category`, `nationality`, `bank_account`, `national_id`: todos `text` sin CHECK constraint. No hay riesgo.

`fiscal_jurisdiction` tiene CHECK pero no se envía desde el formulario de empleado.

### Archivos

| Archivo | Acción |
|---|---|
| `src/components/erp/hr/HREmployeeFormDialog.tsx` | Modificar — mapping gender (save + load) |
| `supabase/migrations/new.sql` | Crear — ampliar CHECK de status |

### Verificaciones

1. Guardar empleado con cualquier género → no falla
2. Reabrir empleado → género correcto en UI
3. Guardar con cualquier status de la UI → no falla
4. Datos existentes (`active`, `on_leave`, `terminated`) siguen válidos
5. TypeScript limpio, compilación limpia

### No se toca

Payroll, bridge, S9/VPT, última milla, G1.2/G2.2, RLS, auth, edge functions.

