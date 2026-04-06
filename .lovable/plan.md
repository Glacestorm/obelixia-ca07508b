

# Plan SP4: Hardening erp-hr-total-rewards — Gaps Residuales

## Estado Actual

La función **ya tiene** auth gate (JWT/getClaims), membership check (employee_id → company_id → erp_user_companies), y error sanitization. Sin embargo, tiene **3 gaps de tenant isolation**:

## Gaps Identificados

| Gap | Ubicación | Riesgo |
|-----|-----------|--------|
| `compare_market` no requiere employee_id → salta membership check | línea 169 | Medio — lee salary_bands sin filtro tenant |
| `generate_recommendations` no requiere employee_id → salta membership check | línea 203 | Bajo — no lee datos, solo genera prompt genérico |
| `erp_hr_salary_bands` queries sin filtro company_id | líneas 108-111, 170-174 | Medio — leak cross-tenant de bandas salariales |

## Estrategia Mínima

1. **Añadir `company_id` al request interface** — campo opcional que el frontend ya puede proveer
2. **Para acciones sin employee_id** (`compare_market`, `generate_recommendations`): requerir `company_id` en params → validar membership → filtrar salary_bands por company_id
3. **Para acciones con employee_id**: tras resolver company_id del employee (ya implementado), usarlo para filtrar salary_bands también
4. **Frontend**: pasar `company_id` en las invocaciones desde `useHRTotalRewards.ts`

## Cambios Exactos

### Edge Function (`supabase/functions/erp-hr-total-rewards/index.ts`)

1. Añadir `company_id?: string` al interface `TotalRewardsRequest` (línea 5-12)
2. Después del membership check actual (línea 83), resolver `companyId` unificado:
   - Si employee_id presente → ya tenemos `empData.company_id` del check existente
   - Si no → usar `company_id` del request → validar membership
   - Si ninguno → 400 Bad Request
3. Filtrar salary_bands con `.eq('company_id', companyId)` en líneas 108-111 y 170-174

### Frontend (`src/hooks/erp/hr/useHRTotalRewards.ts`)

4. Añadir `companyId` como parámetro o extraerlo del contexto existente, incluirlo en body de las invocaciones AI

## Archivos a Modificar

1. `supabase/functions/erp-hr-total-rewards/index.ts` — tenant filtering para salary_bands + company_id fallback
2. `src/hooks/erp/hr/useHRTotalRewards.ts` — pasar company_id en invocaciones

## Riesgos

- **Bajo**: Cambio aditivo, no rompe calls existentes que ya pasan employee_id
- **Bajo**: salary_bands tiene company_id confirmado en schema

