# QA-LEGACY-01 — Fix mocks `authSafeInvoke` en tests UI preexistentes

**Status: READY**

## 1. Objetivo
Limpiar la deuda preexistente de tests UI HR que dejaba 11 fallos en la suite completa por mocks desactualizados de `authSafeInvoke` / `getAccessToken` / `getSession`. Sin tocar lógica funcional.

## 2. Causa raíz
Varios hooks de UI (mapping, validation, runtime-apply, pilot monitor) fueron migrados al invocador auth-safe `src/hooks/erp/hr/_authSafeInvoke.ts`, que:
1. lee `supabase.auth.getSession()`,
2. si no hay token devuelve `auth_required` y NO llama a la edge,
3. en otro caso, invoca `supabase.functions.invoke(fn, { body, headers: { Authorization: 'Bearer ...' } })`.

Los tests legacy:
- mockeaban únicamente `supabase.functions.invoke`, dejando `auth.getSession` sin definir → `authSafeInvoke` cortocircuitaba a `auth_required` y la edge nunca se llamaba (fallos behavioral).
- los tests estáticos seguían exigiendo cadenas como `supabase.functions.invoke`, `supabase.auth.getSession` o `Authorization: Bearer ${accessToken}` directamente en los hooks, cuando esa lógica está ahora centralizada en `_authSafeInvoke.ts`.

## 3. Lista de los 11 fallos (clasificados)

### Behavioral (faltaba mock `auth.getSession`)
1. `collective-agreement-mapping-ui.test.tsx` — `approve calls edge with action=approve`
2. `collective-agreement-mapping-ui.test.tsx` — `reject calls edge with action=reject and reason`
3. `collective-agreement-mapping-ui.test.tsx` — `supersede calls edge with action=supersede and reason`
4. `collective-agreement-mapping-ui.test.tsx` — `hook strips forbidden payload keys before invoking edge`
5. `collective-agreements-b8a3-validation-ui.test.tsx` — `approve calls functions.invoke with action=approve`
6. `registry-pilot-monitor-ui.test.tsx` — `renders summary applied/blocked/fallback`
7. `registry-pilot-monitor-ui.test.tsx` — `renders decision log table with signature_hash`
8. `registry-pilot-monitor-ui.test.tsx` — `hook calls edge with action list_decisions and never log_decision`

### Static (asserts obsoletos sobre el código de los hooks)
9. `collective-agreement-mapping-ui-static.test.ts` — `Hook routes all writes through the edge function`
10. `collective-agreements-b8a3-ui-static.test.ts` — `actions hook routes writes through edge function`
11. `collective-agreement-runtime-apply-ui-static.test.ts` — `Hook routes all writes through the runtime-apply edge function`

## 4. Cambios aplicados

### Helper común (test-only)
- `src/__tests__/helpers/mockAuthSafeInvoke.ts` — builder reutilizable de mock Supabase compatible con `authSafeInvoke` (sesión autenticada o ausente, invoke configurable). Pure test utility, no se importa desde runtime.

### Tests behavioral (añadido `auth.getSession` y `refreshSession` al mock)
- `src/__tests__/hr/collective-agreement-mapping-ui.test.tsx`
- `src/__tests__/hr/collective-agreements-b8a3-validation-ui.test.tsx`
- `src/__tests__/hr/registry-pilot-monitor-ui.test.tsx` (también ajustado el shape de `data` a `{ success: true, data: { decisions } }` que es lo que `authSafeInvoke` desempaqueta).

### Tests estáticos (asserts alineados al contrato actual)
- `src/__tests__/hr/collective-agreement-mapping-ui-static.test.ts` — sustituye el match de `supabase.functions.invoke` por `authSafeInvoke`.
- `src/__tests__/hr/collective-agreements-b8a3-ui-static.test.ts` — sustituye `functions.invoke(` por `authSafeInvoke`.
- `src/__tests__/hr/collective-agreement-runtime-apply-ui-static.test.ts` — elimina los asserts directos de `getSession` y `Bearer ${accessToken}` y exige `authSafeInvoke`.

## 5. Lo que NO se ha tocado
- Ningún hook productivo ni edge function.
- Ningún componente UI.
- `useESPayrollBridge`, `payrollEngine`, `payslipEngine`, `salaryNormalizer`, `agreementSalaryResolver` — intactos.
- `HR_USE_REGISTRY_AGREEMENTS_FOR_PAYROLL`, `HR_REGISTRY_PILOT_MODE`, `REGISTRY_PILOT_SCOPE_ALLOWLIST` — intactos.
- Tablas operativas, `ready_for_payroll`, `salary_tables_loaded`, `data_completeness` — intactos.
- B13.4 no se ha tocado.
- B13.5 no se ha ejecutado.
- Security 1 Error de `erp_customers` queda **fuera de alcance** de este build.

## 6. Resultados de tests
- 11/11 fallos previos: ✅ verdes.
- Suite HR completa: **137 archivos / 1784 tests, 100% verde** (`bunx vitest run src/__tests__/hr`).
- B13.4 focalizado: sigue verde.
- Guards de seguridad (no service_role, no `.from().insert/update`, CTAs prohibidos, flags off) preservados.

## 7. Veredicto
**READY**. Cero cambios funcionales. Solo helper de test + alineación de mocks/asserts al contrato auth-safe ya vigente.