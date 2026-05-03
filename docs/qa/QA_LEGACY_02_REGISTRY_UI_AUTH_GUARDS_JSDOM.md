# QA-LEGACY-02 — Fix `registry-ui-auth-guards` jsdom `window is not defined`

## Veredicto
**READY** — fallo `window is not defined` corregido. Sin tocar lógica funcional.

## Causa raíz
En `src/tests/hr/registry-ui-auth-guards.test.tsx`, el test
"useRegistryPilotMonitor — no session" llamaba:

```ts
renderHook(() => useRegistryPilotMonitor({ companyId: 'c-1' }));
```

El objeto literal se recreaba en cada render. Dentro del hook,
`refresh = useCallback(..., [initialFilters])` cambiaba de identidad en
cada render, lo que disparaba `useEffect(() => void refresh(), [refresh])`
otra vez, ejecutando `setAuthRequired(true)` y forzando un nuevo render →
bucle ("Maximum update depth exceeded"). React 19 + scheduler dejaba
trabajo pendiente que se ejecutaba **después** del teardown de jsdom,
aflorando como `ReferenceError: window is not defined` en
`performWorkOnRootViaSchedulerTask`.

## Cambio aplicado
Solo test. Estabilizada la referencia del filtro y `unmount()` explícito
para garantizar limpieza antes del teardown del entorno.

- Editado: `src/tests/hr/registry-ui-auth-guards.test.tsx`

No se ha modificado:
- ningún hook de runtime,
- ninguna edge function,
- `useRegistryPilotMonitor.ts` (lógica intacta),
- B13.5A engine,
- payroll/bridge/salary resolver/normalizer,
- flags ni allow-list,
- `salary_tables` ni `ready_for_payroll`.

## Resultados

| Suite | Resultado |
|-------|-----------|
| `registry-ui-auth-guards.test.tsx` aislado | 12/12 ✅, sin unhandled errors |
| `agreement-impact-engine` (+ static) | 52/52 ✅ |
| `registry-ui-flags-untouched` | 5/5 ✅ |
| `payrollEngineBackendMirror` | 4/4 ✅ |
| `ssContributionSharedCore` | 11/11 ✅ |
| HR completa (`src/tests/hr` + `src/__tests__/hr`) | 1871/1872, **0 unhandled errors** (`window is not defined` desaparece) |

El único fallo restante (`command-center-render.test.tsx` →
`findByTestId('hr-command-center')` timeout) es **flake preexistente
bajo carga de suite completa**: pasa en aislado (10/10 ✅). No relacionado
con QA-LEGACY-02. Queda documentado como deuda independiente.

## Confirmación de invariantes
- ✅ no salary_tables reales
- ✅ no `ready_for_payroll`
- ✅ no `salary_tables_loaded=true`
- ✅ no `human_validated`
- ✅ no bridge
- ✅ no nómina
- ✅ no tabla operativa legacy
- ✅ no flags
- ✅ no allow-list
- ✅ no B13.5B ejecutado
- ✅ Security 1 Error fuera de alcance