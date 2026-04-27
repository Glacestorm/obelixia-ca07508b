# CASUISTICA-FECHAS-01 — Fase C2: hook read-only + adapter persistido → casuística legacy

## Objetivo

Implementar una capa **read-only** que lea procesos/incidencias persistidos
desde las tablas canónicas existentes y los convierta al modelo legacy
`CasuisticaState` que el motor de nómina ya consume.

No se modifica:
- motor de nómina,
- `salaryNormalizer.ts`,
- `agreementSalaryResolver.ts`,
- `contractSalaryParametrization.ts`,
- engines oficiales (`fdi`/`afi`/`delta`),
- BD / migraciones / RLS / edge functions / dependencias / CI.

## Tablas leídas (RLS multi-tenant existente)

| Tabla | Uso |
|---|---|
| `erp_hr_payroll_incidents` | PNR, reducción jornada, atrasos, desplazamiento temporal, suspensión empleo/sueldo |
| `erp_hr_it_processes` | IT EC / AT / EP / ANL |
| `erp_hr_leave_requests` | Nacimiento / cuidado menor (PAT/MAT/birth/corresponsabilidad) |

Filtros aplicados:
- `company_id` y `employee_id` siempre presentes.
- `payroll_incidents`: `deleted_at IS NULL` + (`period_year/month` exacto OR
  solape `applies_from/applies_to` con periodo).
- `it_processes`: solape `start_date <= periodEnd` AND
  (`end_date IS NULL OR end_date >= periodStart`), `status != cancelled`.
- `leave_requests`: solape de fechas + `workflow_status='approved'` o
  `status='approved'` (fallback legacy). `includePending` opcional para C3.

## Mapping definitivo

| Proceso | Fuente | Salida legacy | Notas |
|---|---|---|---|
| **PNR** | `payroll_incidents` (`incident_type='pnr'`) | `pnrDias` por **unión** de rangos en intersección con periodo, `flags.pnrActiva=true` | Evita doble conteo si hay PNRs solapados. |
| **IT EC** | `it_processes` (`process_type='EC'`) | `itAtDias`, `flags.itAtTipo='enfermedad_comun'` si no hay tipo prioritario | |
| **IT AT** | `it_processes` (`process_type='AT'`) | `itAtTipo='accidente_trabajo'` (prioridad máxima) | |
| **IT EP/ANL** | `it_processes` (`process_type='EP'`/`'ANL'`) | `itAtTipo` correspondiente, prioridad sobre EC | |
| **Reducción jornada** | `payroll_incidents` (`reduccion_jornada_guarda_legal`/`reduction`) | `reduccionJornadaPct` = % de la **dominante** (mayor solape; desempate por `applies_from` más reciente) | El resto va a `traces`. Si `legal_review_required` o `metadata.legal_guardianship` → `legalReviewRequired=true`. |
| **Atrasos** | `payroll_incidents` (`atrasos_regularizacion`) | `atrasosITImporte` = Σ `amount`; `atrasosITPeriodo` = `metadata.origin_period_from` más antiguo | No toca IRPF ni liquidación complementaria. |
| **Nacimiento / cuidado** | `leave_requests` (códigos `PAT`,`MAT`,`birth`,`PATERNIDAD`,`MATERNIDAD`,`corresponsabilidad`) aprobados | `nacimientoTipo`, `nacimientoDias` (Σ días intersección), `flags.nacimientoFechaInicio/Fin` | `nacimientoFechaHechoCausante` queda undefined en C2 (la tabla no tiene `metadata`). |
| **Desplazamiento temporal** | `payroll_incidents` | **No-op** legacy → `unmapped[]`. `legalReviewRequired=true` si `tax_review_required` o `legal_review_required`. | Motor legacy no lo entiende; queda para C3/UI. |
| **Suspensión empleo/sueldo** | `payroll_incidents` | **No-op** legacy → `unmapped[]`, `legalReviewRequired=true` siempre | Decisión deliberada: no se mapea a PNR aunque económicamente equivalga. Cambia calificación legal y efectos en cotización/desempleo. C3 ofrecerá toggle manual asistido. |

## Decisiones legales

1. **Suspensión empleo/sueldo ≠ PNR.** Equivalencia económica no implica
   equivalencia legal. C2 nunca mapea automáticamente.
2. **Prioridad IT:** AT > EP/ANL > EC. El motor legacy soporta un único
   `itAtTipo`; se elige el más prioritario presente en el periodo.
3. **Días IT:** se usa **unión** de rangos para evitar doble conteo cuando
   varios procesos solapan.
4. **Leave aprobados:** sólo `approved` por defecto; `includePending` queda
   reservado para preview en C3.
5. **`isRealSubmissionBlocked()` invariante respetado:** ningún flujo de C2
   genera FDI/AFI/DELT@ ni marca `applied_at`.

## Archivos creados / modificados

Creados:
- `src/lib/hr/casuisticaTypes.ts` — `CasuisticaState`, `CasuisticaDatesExtension`, `CasuisticaActiveFlags`.
- `src/lib/hr/casuisticaDates.ts` — `calculateInclusiveDays`, `isInvertedRange`, `getPeriodBounds`, `getDateIntersectionDays`.
- `src/lib/hr/incidenciasTypes.ts` — `PayrollIncidentRow`, `ITProcessRow`, `LeaveRequestRow`, `IncidenciasFetchParams`, `MappingTrace`, `MappingResult`.
- `src/lib/hr/incidenciasMapper.ts` — `mapIncidenciasToLegacyCasuistica()`.
- `src/hooks/erp/hr/useHRPayrollIncidencias.ts` — hook read-only con React Query.
- `src/lib/hr/__tests__/casuisticaDates.test.ts` — 18 tests.
- `src/lib/hr/__tests__/incidenciasMapper.test.ts` — 14 tests.
- `docs/qa/CASUISTICA-FECHAS-01_C2_hook_adapter.md` — este documento.

Modificado mínimamente:
- `src/components/erp/hr/HRPayrollEntryDialog.tsx` — sólo se eliminó la
  implementación inline de `calculateInclusiveDays`/`isInvertedRange` y se
  añadió `import` + `export { ... } from '@/lib/hr/casuisticaDates'` para
  preservar el contrato consumido por los tests existentes. **Sin cambios
  de UI, payload, motor, SafeMode ni cálculos.**

## Tests ejecutados

Comando: `bunx vitest run src/lib/hr/__tests__/casuisticaDates.test.ts src/lib/hr/__tests__/incidenciasMapper.test.ts src/components/erp/hr/__tests__/HRPayrollEntryDialog.casuisticaDates.test.ts`

Resultado: **44/44 verdes** (3 archivos).

- `casuisticaDates.test.ts`: 18 ✓
- `incidenciasMapper.test.ts`: 14 ✓
- `HRPayrollEntryDialog.casuisticaDates.test.ts` (legacy Fase B, ahora resuelve por re-export): 12 ✓

## Qué queda fuera de C2 (→ C3 y posteriores)

- CRUD UI de incidencias persistentes.
- Bloque "Procesos persistentes" en `HRPayrollEntryDialog`.
- Consumo del hook desde la UI.
- Tramos múltiples de nacimiento.
- Inferencia de `nacimientoFechaHechoCausante` desde documentos/otra tabla.
- Comunicaciones oficiales (FDI/AFI/DELT@) — siguen bloqueadas por SafeMode.
- Recálculo y aplicación a nómina.
- Mocks/tests del hook (sin patrón consolidado de mock de Supabase en repo).

## Riesgos residuales

- **Adapter no testea el hook end-to-end** (sin mock Supabase). El adapter
  sí está cubierto al 100% en su lógica determinista.
- **`nacimientoFechaHechoCausante` queda vacío** hasta C3 (la tabla
  `erp_hr_leave_requests` no expone `metadata`).
- **Reducción dominante por mayor solape:** decisión documentada; UI en C3
  podrá permitir override manual.
- **`includePending=false` por defecto**: si la nómina se cierra antes de
  aprobar un leave, no se contabilizará. Este es el comportamiento deseado
  para nómina final.

## Próxima fase

**C3 — UI integrada y CRUD**:
1. Bloque "Procesos persistentes" en `HRPayrollEntryDialog` (coexistiendo
   con los inputs Fase B).
2. CRUD de `erp_hr_payroll_incidents` (alta/edición/soft-delete).
3. Banderas visuales de `legalReviewRequired` y `unmapped[]`.
4. Toggle de `includePending` para preview.
5. Mocks de Supabase para tests del hook.
