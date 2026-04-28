# CASUISTICA-FECHAS-01 — Fase C3C (visual polish del modal persistido)

Fecha: 2026-04-28 · Estado: CERRADA · Alcance: estrictamente UI/JSX/clases.

## Objetivo
Corregir problemas visuales y de accesibilidad del modal `HRPayrollIncidentFormDialog`
("Añadir / Editar proceso persistido") sin tocar lógica funcional, motor de
nómina, mutaciones, validaciones, flags ni payload.

## Archivos modificados
- `src/components/erp/hr/casuistica/HRPayrollIncidentFormDialog.tsx`
- `src/components/erp/hr/casuistica/__tests__/HRPayrollIncidentFormDialog.test.tsx`

## Cambios visuales

### 1. Cabecera y layout
- `DialogContent`: `max-w-2xl max-h-[90vh] overflow-y-auto p-0`.
- Header `sticky top-0` con `bg-background border-b px-6 pt-6 pb-4` y `pr-8`
  para no colisionar con el botón ✕.
- Footer `sticky bottom-0 border-t px-6 py-4` separado del contenido.
- Contenido principal envuelto en `px-6 py-4 space-y-4`.
- Resultado: el título "Añadir proceso persistido" / "Editar proceso persistido"
  ya no se corta y se mantiene visible al hacer scroll.

### 2. Banner legal permanente (ámbar accesible)
Antes: `border-warning/30 bg-warning/5 text-warning-foreground` (texto blanco
sobre beige → ilegible).
Ahora:
```
border-amber-300 bg-amber-50 text-amber-900
dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100
```
Icono `ShieldOff` con `text-amber-700 dark:text-amber-300`.
Contraste WCAG AA verificado (~11:1 en modo claro).

Texto canónico (sin cambios):
> Este registro no envía comunicaciones oficiales, no recalcula nóminas y no
> modifica el resultado de la nómina actual. Solo crea una incidencia
> persistida pendiente para revisión y fases posteriores.

### 3. Banner informativo por tipo (sky accesible)
Antes: `border-info/30 bg-info/5 text-foreground`.
Ahora: `border-sky-300 bg-sky-50 text-sky-900` + dark mode.

### 4. Aviso de tipo excluido (red accesible)
Antes: `border-destructive/40 bg-destructive/5 text-destructive`.
Ahora: `border-red-300 bg-red-50 text-red-900` + dark mode.

### 5. Bloque "edición bloqueada" (incidencia ya aplicada)
Migrado a paleta red accesible coherente con el aviso de excluidos.

### 6. Asterisco rojo accesible en obligatorios
Helper local:
```tsx
function Req() {
  return <span aria-hidden="true" className="ml-0.5 text-red-600">*</span>;
}
```
Aplicado a:
- Tipo de proceso *
- Fecha inicio *
- Fecha fin *
- Importe (€) * — solo si `type === 'atrasos_regularizacion'`
- Porcentaje (%) * — solo si `type === 'reduccion_jornada_guarda_legal'`
- Motivo * — solo si `type ∈ {'desplazamiento_temporal','suspension_empleo_sueldo'}`

Inputs correspondientes reciben `aria-required="true"` (o condicional).

### 7. Errores agrupados
La lista de errores se reagrupa en una caja roja accesible con cabecera
"Revisa los siguientes campos:", justo encima del footer. Sigue siendo
`role="alert"` y `aria-label="Errores de validación"`.

## Confirmaciones de invariantes
- No se toca `handleSubmit`, validaciones, mutaciones, defaults, metadata, flags ni tipos.
- No se toca `usePayrollIncidentMutations`.
- No se toca motor de nómina, `simulateES`, `salaryNormalizer.ts`,
  `contractSalaryParametrization.ts`, `agreementSalaryResolver.ts`,
  `fdiArtifactEngine.ts`, `afiInactivityEngine.ts`, `deltaArtifactEngine.ts`.
- `PAYROLL_EFFECTIVE_CASUISTICA_MODE` permanece `'persisted_priority_preview'`.
- `persisted_priority_apply` sigue OFF.
- Sin BD, RLS, migraciones, edge functions, dependencias ni CI.
- Sin `service_role`. Sin FDI/AFI/DELT@. Sin comunicaciones oficiales.

## Tests añadidos (suite C3C)
1. Renderiza el título completo "Añadir proceso persistido".
2. Banner legal usa `bg-amber-50 / text-amber-900 / border-amber-300` y NO
   `text-warning-foreground`.
3. Label "Tipo de proceso" muestra `*` con `text-red-600`.
4. Labels "Fecha inicio" y "Fecha fin" muestran `*` rojo y `aria-required="true"`.
5. Porcentaje muestra `*` cuando `defaultType='reduccion_jornada_guarda_legal'`.
6. Importe muestra `*` cuando `defaultType='atrasos_regularizacion'`.
7. Bloque de errores aparece con cabecera "Revisa los siguientes campos:".

## Riesgos residuales
- Tokens semánticos del design system (`--warning`, `--info`, `--destructive`)
  no se modifican aquí; se prefieren clases Tailwind de paleta cromática
  directa para garantizar contraste accesible inmediato. Una migración futura
  a tokens HSL del design system puede unificar todos los banners (fuera de
  alcance de C3C).
- Modo oscuro: clases `dark:` añadidas; verificación visual pendiente cuando
  el theme switcher esté disponible en este flujo.

## Estado
✅ CERRADA — pulido visual aplicado, tests verdes, sin impacto funcional.
