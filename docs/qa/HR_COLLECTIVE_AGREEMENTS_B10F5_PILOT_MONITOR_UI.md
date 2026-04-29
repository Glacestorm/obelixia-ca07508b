# B10F.5 — Pilot monitor UI (read-only)

## Objetivo

Proveer una **UI interna read-only** para auditar el estado del piloto
Registry antes de cualquier activación global. Permite ver:

- el estado de los gates (`HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`,
  `HR_REGISTRY_PILOT_MODE`, longitud de `REGISTRY_PILOT_SCOPE_ALLOWLIST`);
- los scopes en allow-list y su veredicto a través de
  `isPilotEnabledForScope`;
- las últimas decisiones piloto persistidas en
  `erp_hr_company_agreement_registry_pilot_decision_logs` (B10F.4),
  resumidas como `applied / blocked / fallback`;
- información textual de rollback (sin botón de ejecución).

## Componentes

Directorio `src/components/erp/hr/collective-agreements/pilot-monitor/`:

- `RegistryPilotMonitorPanel.tsx` — contenedor principal con banner.
- `RegistryPilotGateStatusCard.tsx` — flags y longitud allow-list.
- `RegistryPilotScopeCard.tsx` — un scope con veredicto del gate puro.
- `RegistryPilotSummaryCard.tsx` — applied/blocked/fallback + reciente.
- `RegistryPilotDecisionLogTable.tsx` — tabla de logs B10F.4.
- `RegistryPilotRollbackInfoCard.tsx` — texto informativo, sin botones.

## Hook

`src/hooks/erp/hr/useRegistryPilotMonitor.ts`:

- Lee `HR_REGISTRY_PILOT_MODE` y `REGISTRY_PILOT_SCOPE_ALLOWLIST` desde
  `registryPilotGate` (constantes hardcoded).
- Invoca **solo** la edge `erp-hr-pilot-runtime-decision-log` con
  `action: 'list_decisions'`.
- No invoca `log_decision`. No usa `.from(`, `.insert(`, `.update(`,
  `.upsert(`, `.delete(`. No service-role.

## Datos mostrados

- Banner: `Modo piloto Registry — solo lectura`.
- Subtexto: la activación global sigue desactivada y el rollback
  funcional se gestiona desde B10D.
- Gate status card: valores literales de los tres flags.
- Scopes: si la allow-list está vacía → mensaje
  `No hay scopes piloto activos.`
- Decisión log: `decided_at`, `decision_outcome`, `decision_reason`,
  scope completo, `mapping_id`, `registry_agreement_id`,
  `registry_version_id`, `comparison_summary_json`, `blockers_json`,
  `warnings_json`, `signature_hash`.
- Resumen: `applied / blocked / fallback` + decisión más reciente.

## Read-only guarantees

- Cero `<button>` en el panel del monitor (verificado en test).
- Cero CTAs de activación, ejecución, rollback o mutación de
  allow-list/flag.
- Hook acepta solo `list_decisions` y nunca emite `log_decision`.
- Sin imports de bridge / resolver / normalizer / payroll engine /
  payslip engine / safety gate.
- Sin escrituras a DB ni acceso a la tabla operativa
  `erp_hr_collective_agreements`.

## CTAs prohibidos (verificado por test estático)

`Activar piloto`, `Activar nómina`, `Ejecutar nómina`,
`Aplicar registry`, `Activar flag`, `Añadir scope`, `Quitar scope`,
`Rollback ahora`, `Log decision`, `log_decision`.

## Relación con B10D rollback

El monitor **referencia** B10D Runtime Apply como mecanismo oficial de
rollback funcional. No expone botones de rollback. El rollback piloto
por scope se realiza vía PR de código (modificación de la allow-list o
de `HR_REGISTRY_PILOT_MODE`).

## Qué NO hace B10F.5

- ❌ No toca `useESPayrollBridge`.
- ❌ No ejecuta nómina ni dispara cálculos.
- ❌ No muta `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`.
- ❌ No muta `HR_REGISTRY_PILOT_MODE`.
- ❌ No muta `REGISTRY_PILOT_SCOPE_ALLOWLIST`.
- ❌ No escribe en DB.
- ❌ No usa `service_role`.
- ❌ No toca tabla operativa `erp_hr_collective_agreements`.
- ❌ No modifica `ready_for_payroll` ni `persisted_priority_apply`.
- ❌ No desbloquea C3B3C2.

## Estado de la cadena B10F

- [x] B10F.1 Pilot gate puro
- [x] B10F.2 Parity preflight wrapper
- [x] B10F.3 Bridge integration (doble gate, ambos OFF)
- [x] B10F.4 Pilot decision log append-only
- [x] B10F.5 UI monitor read-only

## Próxima fase

**B10G / B10F.6** — Activación real de un primer scope piloto mediante
PR explícito que modifique `REGISTRY_PILOT_SCOPE_ALLOWLIST` y
`HR_REGISTRY_PILOT_MODE = true`, con doble aprobación humana,
observación del monitor B10F.5 y rollback inmediato vía B10D.