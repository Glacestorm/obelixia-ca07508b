

# S9.2 — Obligaciones Legales Críticas Fase 1

## Resumen

Implementar 4 submódulos de compliance legal real (LISMI, Registro Retributivo, Desconexión Digital, Teletrabajo) reutilizando la base existente de employee master, payroll, equality y time tracking. Se necesitan 2 migraciones DB, 1 engine puro, 4 hooks, 4 componentes UI y la integración en navegación/lazy-loading.

---

## Migraciones de Base de Datos

### Migración 1 — Campo `disability_percentage` en `erp_hr_employees`
```sql
ALTER TABLE erp_hr_employees 
  ADD COLUMN disability_percentage integer DEFAULT NULL;

COMMENT ON COLUMN erp_hr_employees.disability_percentage 
  IS 'Grado de discapacidad reconocida (0-100). Fuente: certificado oficial.';
```
- Nullable, additive, zero regression risk
- Rollback: `ALTER TABLE erp_hr_employees DROP COLUMN disability_percentage;`

### Migración 2 — Tabla `erp_hr_remote_work_agreements`
```sql
CREATE TABLE erp_hr_remote_work_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  employee_id uuid NOT NULL REFERENCES erp_hr_employees(id),
  agreement_date date NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'draft', -- draft | active | suspended | terminated
  remote_percentage integer NOT NULL DEFAULT 30,
  work_location jsonb DEFAULT '{}',
  equipment_inventory jsonb DEFAULT '[]',
  expense_compensation jsonb DEFAULT '{}',
  schedule_details jsonb DEFAULT '{}',
  disconnection_policy_id uuid REFERENCES erp_hr_disconnection_policies(id),
  agreement_content jsonb DEFAULT '{}', -- 13 mandatory points Ley 10/2021
  signed_at timestamptz,
  signed_by text,
  evidence_document_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE erp_hr_remote_work_agreements ENABLE ROW LEVEL SECURITY;
-- Standard tenant isolation policies
CREATE POLICY "tenant_isolation_select" ON erp_hr_remote_work_agreements
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "tenant_isolation_insert" ON erp_hr_remote_work_agreements
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE POLICY "tenant_isolation_update" ON erp_hr_remote_work_agreements
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
```
- Rollback: `DROP TABLE erp_hr_remote_work_agreements;`

**Nota**: No se necesita tabla nueva para LISMI (usa employees + computation engine), ni para Registro Retributivo (usa payroll + equality existentes), ni para Desconexión Digital (ya existe `erp_hr_disconnection_policies`).

---

## Engine Puro

### `src/engines/erp/hr/s9ComplianceEngine.ts`
Motor sin side-effects con:

1. **LISMI** — `computeLISMIQuota(totalEmployees, disabledEmployees)`: calcula ratio, umbral (2% para ≥50 empleados), cumplimiento, déficit. `classifyAlternativeMeasures()` para medidas alternativas (RD 364/2005).

2. **Registro Retributivo** — `generateSalaryRegisterData(payrollRecords, employees)`: agrupación por sexo × grupo profesional, cálculo de media/mediana por concepto retributivo, detección de brechas >25%.

3. **Desconexión Digital** — `evaluateDisconnectionCompliance(policies, timeEntries)`: métricas de incumplimiento, horas fuera de horario.

4. **Teletrabajo** — `validateRemoteWorkAgreement(agreement)`: validación de los 13 puntos obligatorios Ley 10/2021, cálculo de presencialidad.

---

## Hooks

### `src/hooks/erp/hr/useS9LISMI.ts`
- Lee `erp_hr_employees` con `disability_percentage >= 33`
- Agrupa por legal_entity / work_center
- Usa engine para cómputo de cuota
- Expone: `quotaData`, `alerts`, `alternativeMeasures`, `exportReport()`

### `src/hooks/erp/hr/useS9SalaryRegister.ts`
- Lee payroll data de `erp_hr_payrolls` + employees con gender/category
- Usa engine para generar estructura formal RD 902/2020
- Expone: `registerData`, `gapAlerts`, `generateReport()`, `versionHistory`
- Reutiliza `useHREquality` para vincular con plan de igualdad existente

### `src/hooks/erp/hr/useS9DisconnectionDigital.ts`
- Extiende `useHRTimeTracking` sin reemplazarlo
- Lee `erp_hr_disconnection_policies` + `erp_hr_time_entries`
- Expone: `policies`, `complianceMetrics`, `violations`, `acknowledgePolicy()`

### `src/hooks/erp/hr/useS9RemoteWork.ts`
- CRUD sobre `erp_hr_remote_work_agreements`
- Validación 13 puntos vía engine
- Expone: `agreements`, `createAgreement()`, `validateAgreement()`, `presencialityStats`

---

## Componentes UI (4 workspaces)

### `src/components/erp/hr/compliance/S9LISMIDashboard.tsx`
- KPIs: total plantilla, empleados con discapacidad, ratio actual vs 2%, déficit
- Tabla por entidad legal / centro de trabajo
- Sección medidas alternativas con evidencia documental
- Badge de readiness: `internal_ready`
- Botón exportar informe para inspección (CSV/PDF-ready)

### `src/components/erp/hr/compliance/S9SalaryRegisterPanel.tsx`
- Generador formal con estructura operativa
- Tabla comparativa: sexo × grupo profesional × concepto
- Media y mediana por celda
- Alertas visuales cuando brecha >25%
- Historial de versiones emitidas
- Badge: `internal_ready`

### `src/components/erp/hr/compliance/S9DisconnectionPanel.tsx`
- Lista de políticas activas con reglas horarias
- Métricas de incumplimiento (fichajes fuera de horario)
- Acuse de recibo por empleado (fecha comunicación)
- Badge: `internal_ready`

### `src/components/erp/hr/compliance/S9RemoteWorkPanel.tsx`
- Tabla de acuerdos vigentes
- Generador de acuerdo individual (13 puntos)
- Inventario de equipos (JSONB)
- Stats de presencialidad vs teletrabajo
- Gastos y compensaciones
- Badge: `internal_ready`

---

## Integración en Navegación y Lazy-Loading

### `HRNavigationMenu.tsx` — 4 items nuevos
- **Global > Oficial & Compliance**: `s9-lismi` (LISMI/LGD), `s9-salary-register` (Registro Retributivo)
- **Workforce > Tiempo & Ausencias**: `s9-disconnection` (Desconexión Digital), `s9-remote-work` (Teletrabajo)

### `HRModuleLazy.tsx` — 4 lazy exports
```
LazyS9LISMIDashboard
LazyS9SalaryRegisterPanel
LazyS9DisconnectionPanel
LazyS9RemoteWorkPanel
```

### `HRModule.tsx` — 4 switch cases
```
{activeModule === 's9-lismi' && <LazyS9LISMIDashboard companyId={companyId} />}
{activeModule === 's9-salary-register' && <LazyS9SalaryRegisterPanel companyId={companyId} />}
{activeModule === 's9-disconnection' && <LazyS9DisconnectionPanel companyId={companyId} />}
{activeModule === 's9-remote-work' && <LazyS9RemoteWorkPanel companyId={companyId} />}
```

### `mvpItems` set — añadir los 4 IDs para visibilidad

---

## Tipos Compartidos

### `src/types/s9-compliance.ts`
- `S9ModuleReadiness` type (`ready | internal_ready | preparatory | pending_external | partial_controlled`)
- `LISMIQuotaResult`, `SalaryRegisterEntry`, `RemoteWorkAgreement`, `DisconnectionViolation`

### `src/components/erp/hr/shared/S9ReadinessBadge.tsx`
- Badge visual con color-coding honesto por estado

---

## Estados Honestos por Submódulo

| Submódulo | Estado | Justificación |
|-----------|--------|---------------|
| LISMI | `internal_ready` | Cómputo real sobre datos de plantilla, sin validación oficial |
| Registro Retributivo | `internal_ready` | Genera estructura RD 902/2020, sin depósito REGCON |
| Desconexión Digital | `internal_ready` | Políticas y métricas reales, sin integración con mail/calendar |
| Teletrabajo | `internal_ready` | Acuerdo y validación 13 puntos, sin firma digital certificada |

---

## Tests Mínimos

### `src/engines/erp/hr/__tests__/s9ComplianceEngine.test.ts`
- LISMI: cuota para <50 empleados (no aplica), exactamente 50, 200 con 3 discapacitados
- Registro Retributivo: media/mediana correctas, detección brecha >25%
- Desconexión: fichaje fuera de horario detectado
- Teletrabajo: validación 13 puntos (completo vs incompleto)
- ~15-20 tests unitarios

---

## Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|-----------|
| Campo nuevo en `erp_hr_employees` | Bajo | Nullable, no rompe queries existentes |
| Tabla nueva `remote_work_agreements` | Bajo | Independiente, con RLS estándar |
| Lectura masiva de payroll para registro retributivo | Medio | Limitar a último período cerrado, paginación |
| Regresión en HRNavigationMenu | Bajo | Solo additive (4 items nuevos en subGroups existentes) |

---

## Qué Queda Resuelto vs Preparado

**Resuelto (internal_ready)**:
- Cómputo LISMI con alertas y export
- Registro Retributivo con media/mediana/brechas
- Políticas desconexión con métricas
- Acuerdos teletrabajo con 13 puntos

**Solo preparado (futura fase)**:
- Depósito REGCON del registro retributivo → `pending_external`
- Firma digital certificada de acuerdos → `pending_external`
- Integración real con calendarios/email para desconexión → backlog
- Medidas alternativas LISMI con validación inspección → extensible

---

## Orden de Implementación

1. Migraciones DB (2)
2. Types + ReadinessBadge
3. Engine puro (`s9ComplianceEngine.ts`)
4. Tests del engine
5. Hooks (4)
6. Componentes UI (4)
7. Navegación + lazy-loading + switch cases

**Archivos nuevos**: ~12 | **Archivos modificados**: 3 (HRNavigationMenu, HRModule, HRModuleLazy)

